//! Tink-compatible AEAD (AES-GCM) encrypt/decrypt.
//!
//! Wire-compatible with tink-go AEAD using a base64-encoded, cleartext,
//! binary-serialized Tink keyset (`insecurecleartextkeyset` + `keyset.NewBinaryReader`).
//!
//! Ciphertext format (per key output prefix type):
//!   TINK:            0x01 || key_id (4 bytes BE) || IV (12) || ciphertext || tag (16)
//!   LEGACY/CRUNCHY:  0x00 || key_id (4 bytes BE) || IV (12) || ciphertext || tag (16)
//!   RAW:             IV (12) || ciphertext || tag (16)
//!
//! Only the minimal protobuf subset needed to read/write a keyset is implemented,
//! to keep the WASM binary small.

use aes_gcm::aead::{Aead, Payload};
use aes_gcm::{Aes128Gcm, Aes256Gcm, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use rand::RngCore;

pub const AES_GCM_TYPE_URL: &str = "type.googleapis.com/google.crypto.tink.AesGcmKey";

const IV_SIZE: usize = 12;
const TAG_SIZE: usize = 16;
const PREFIX_SIZE: usize = 5;

const STATUS_ENABLED: u64 = 1;
const KEY_MATERIAL_SYMMETRIC: u64 = 1;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum OutputPrefixType {
    Tink,
    Legacy,
    Raw,
    Crunchy,
}

impl OutputPrefixType {
    fn from_proto(v: u64) -> Result<Self, String> {
        match v {
            1 => Ok(Self::Tink),
            2 => Ok(Self::Legacy),
            3 => Ok(Self::Raw),
            4 => Ok(Self::Crunchy),
            _ => Err(format!("unsupported output prefix type: {}", v)),
        }
    }

    fn prefix(self, key_id: u32) -> Vec<u8> {
        let id = key_id.to_be_bytes();
        match self {
            Self::Tink => [&[0x01u8][..], &id[..]].concat(),
            Self::Legacy | Self::Crunchy => [&[0x00u8][..], &id[..]].concat(),
            Self::Raw => Vec::new(),
        }
    }
}

#[derive(Debug, Clone)]
pub struct AeadKey {
    pub key_id: u32,
    pub prefix_type: OutputPrefixType,
    pub key_value: Vec<u8>,
}

#[derive(Debug, Clone)]
pub struct Keyset {
    pub primary_key_id: u32,
    pub keys: Vec<AeadKey>,
}

// ---------------------------------------------------------------------------
// Minimal protobuf reader / writer
// ---------------------------------------------------------------------------

enum Field<'a> {
    Varint(u64),
    Bytes(&'a [u8]),
    Other,
}

struct ProtoReader<'a> {
    buf: &'a [u8],
    pos: usize,
}

impl<'a> ProtoReader<'a> {
    fn new(buf: &'a [u8]) -> Self {
        Self { buf, pos: 0 }
    }

    fn read_varint(&mut self) -> Result<u64, String> {
        let mut result: u64 = 0;
        for shift in (0..64).step_by(7) {
            let b = *self.buf.get(self.pos).ok_or("truncated varint")?;
            self.pos += 1;
            result |= ((b & 0x7f) as u64) << shift;
            if b & 0x80 == 0 {
                return Ok(result);
            }
        }
        Err("varint too long".into())
    }

    fn take(&mut self, n: usize) -> Result<&'a [u8], String> {
        let end = self.pos.checked_add(n).ok_or("length overflow")?;
        let s = self.buf.get(self.pos..end).ok_or("truncated field")?;
        self.pos = end;
        Ok(s)
    }

    fn next_field(&mut self) -> Result<Option<(u64, Field<'a>)>, String> {
        if self.pos >= self.buf.len() {
            return Ok(None);
        }
        let tag = self.read_varint()?;
        let field_no = tag >> 3;
        let field = match tag & 0x7 {
            0 => Field::Varint(self.read_varint()?),
            1 => {
                self.take(8)?;
                Field::Other
            }
            2 => {
                let len = self.read_varint()? as usize;
                Field::Bytes(self.take(len)?)
            }
            5 => {
                self.take(4)?;
                Field::Other
            }
            wt => return Err(format!("unsupported wire type {}", wt)),
        };
        Ok(Some((field_no, field)))
    }
}

fn write_varint(out: &mut Vec<u8>, mut v: u64) {
    while v >= 0x80 {
        out.push((v as u8) | 0x80);
        v >>= 7;
    }
    out.push(v as u8);
}

fn write_varint_field(out: &mut Vec<u8>, field_no: u64, v: u64) {
    write_varint(out, field_no << 3);
    write_varint(out, v);
}

fn write_bytes_field(out: &mut Vec<u8>, field_no: u64, b: &[u8]) {
    write_varint(out, (field_no << 3) | 2);
    write_varint(out, b.len() as u64);
    out.extend_from_slice(b);
}

// ---------------------------------------------------------------------------
// Keyset parsing / serialization
// ---------------------------------------------------------------------------

/// AesGcmKey { uint32 version = 1; AesGcmParams params = 2; bytes key_value = 3; }
fn parse_aes_gcm_key(buf: &[u8]) -> Result<Vec<u8>, String> {
    let mut r = ProtoReader::new(buf);
    let mut key_value = None;
    while let Some((no, f)) = r.next_field()? {
        match (no, f) {
            (1, Field::Varint(v)) if v != 0 => {
                return Err(format!("unsupported AesGcmKey version {}", v))
            }
            (3, Field::Bytes(b)) => key_value = Some(b.to_vec()),
            _ => {}
        }
    }
    let kv = key_value.ok_or("AesGcmKey missing key_value")?;
    if kv.len() != 16 && kv.len() != 32 {
        return Err(format!("invalid AES-GCM key size {} (expected 16 or 32)", kv.len()));
    }
    Ok(kv)
}

/// Keyset.Key { KeyData key_data = 1; KeyStatusType status = 2; uint32 key_id = 3; OutputPrefixType output_prefix_type = 4; }
/// KeyData { string type_url = 1; bytes value = 2; KeyMaterialType key_material_type = 3; }
/// Returns None for keys that are not ENABLED.
fn parse_key(buf: &[u8]) -> Result<Option<AeadKey>, String> {
    let mut r = ProtoReader::new(buf);
    let (mut key_data, mut status, mut key_id, mut prefix) = (None, 0u64, 0u64, 0u64);
    while let Some((no, f)) = r.next_field()? {
        match (no, f) {
            (1, Field::Bytes(b)) => key_data = Some(b),
            (2, Field::Varint(v)) => status = v,
            (3, Field::Varint(v)) => key_id = v,
            (4, Field::Varint(v)) => prefix = v,
            _ => {}
        }
    }
    if status != STATUS_ENABLED {
        return Ok(None);
    }
    let key_data = key_data.ok_or("key missing key_data")?;

    let mut r = ProtoReader::new(key_data);
    let (mut type_url, mut value) = (None, None);
    while let Some((no, f)) = r.next_field()? {
        match (no, f) {
            (1, Field::Bytes(b)) => type_url = Some(String::from_utf8_lossy(b).to_string()),
            (2, Field::Bytes(b)) => value = Some(b),
            _ => {}
        }
    }
    let type_url = type_url.unwrap_or_default();
    if type_url != AES_GCM_TYPE_URL {
        return Err(format!("unsupported key type '{}' (only AesGcmKey is supported)", type_url));
    }

    Ok(Some(AeadKey {
        key_id: key_id as u32,
        prefix_type: OutputPrefixType::from_proto(prefix)?,
        key_value: parse_aes_gcm_key(value.ok_or("key_data missing value")?)?,
    }))
}

/// Keyset { uint32 primary_key_id = 1; repeated Key key = 2; }
pub fn parse_keyset(keyset_b64: &str) -> Result<Keyset, String> {
    let cleaned: String = keyset_b64.chars().filter(|c| !c.is_whitespace()).collect();
    let raw = BASE64
        .decode(cleaned)
        .map_err(|e| format!("keyset is not valid base64: {}", e))?;

    let mut r = ProtoReader::new(&raw);
    let mut primary_key_id = 0u64;
    let mut keys = Vec::new();
    while let Some((no, f)) = r.next_field()? {
        match (no, f) {
            (1, Field::Varint(v)) => primary_key_id = v,
            (2, Field::Bytes(b)) => {
                if let Some(k) = parse_key(b)? {
                    keys.push(k);
                }
            }
            _ => {}
        }
    }
    if keys.is_empty() {
        return Err("keyset contains no enabled keys".into());
    }
    Ok(Keyset {
        primary_key_id: primary_key_id as u32,
        keys,
    })
}

/// Generates a new keyset with a single AES-256-GCM key (TINK prefix),
/// serialized the same way as tink-go's `insecurecleartextkeyset.Write` + base64.
pub fn generate_keyset() -> String {
    let mut rng = rand::thread_rng();
    let mut key_value = [0u8; 32];
    rng.fill_bytes(&mut key_value);
    let key_id = loop {
        let id = rng.next_u32();
        if id != 0 {
            break id;
        }
    };

    let mut aes_gcm_key = Vec::new();
    write_bytes_field(&mut aes_gcm_key, 3, &key_value);

    let mut key_data = Vec::new();
    write_bytes_field(&mut key_data, 1, AES_GCM_TYPE_URL.as_bytes());
    write_bytes_field(&mut key_data, 2, &aes_gcm_key);
    write_varint_field(&mut key_data, 3, KEY_MATERIAL_SYMMETRIC);

    let mut key = Vec::new();
    write_bytes_field(&mut key, 1, &key_data);
    write_varint_field(&mut key, 2, STATUS_ENABLED);
    write_varint_field(&mut key, 3, key_id as u64);
    write_varint_field(&mut key, 4, 1); // TINK

    let mut keyset = Vec::new();
    write_varint_field(&mut keyset, 1, key_id as u64);
    write_bytes_field(&mut keyset, 2, &key);

    BASE64.encode(keyset)
}

// ---------------------------------------------------------------------------
// AEAD
// ---------------------------------------------------------------------------

fn gcm_encrypt(key: &[u8], iv: &[u8], msg: &[u8], aad: &[u8]) -> Result<Vec<u8>, String> {
    let nonce = Nonce::from_slice(iv);
    let payload = Payload { msg, aad };
    match key.len() {
        16 => Aes128Gcm::new_from_slice(key).unwrap().encrypt(nonce, payload),
        _ => Aes256Gcm::new_from_slice(key).unwrap().encrypt(nonce, payload),
    }
    .map_err(|_| "encryption failed".to_string())
}

fn gcm_decrypt(key: &[u8], iv: &[u8], ct: &[u8], aad: &[u8]) -> Option<Vec<u8>> {
    let nonce = Nonce::from_slice(iv);
    let payload = Payload { msg: ct, aad };
    match key.len() {
        16 => Aes128Gcm::new_from_slice(key).ok()?.decrypt(nonce, payload),
        _ => Aes256Gcm::new_from_slice(key).ok()?.decrypt(nonce, payload),
    }
    .ok()
}

impl Keyset {
    fn primary(&self) -> Result<&AeadKey, String> {
        self.keys
            .iter()
            .find(|k| k.key_id == self.primary_key_id)
            .ok_or_else(|| "keyset has no enabled primary key".to_string())
    }

    /// Encrypts with the primary key: prefix || IV || ciphertext || tag.
    pub fn encrypt(&self, plaintext: &[u8], aad: &[u8]) -> Result<Vec<u8>, String> {
        let key = self.primary()?;
        let mut iv = [0u8; IV_SIZE];
        rand::thread_rng().fill_bytes(&mut iv);

        let ct = gcm_encrypt(&key.key_value, &iv, plaintext, aad)?;
        let mut out = key.prefix_type.prefix(key.key_id);
        out.extend_from_slice(&iv);
        out.extend_from_slice(&ct);
        Ok(out)
    }

    /// Decrypts following tink-go's primitive-set semantics: first try keys whose
    /// prefix matches the ciphertext's first 5 bytes, then fall back to RAW keys.
    pub fn decrypt(&self, ciphertext: &[u8], aad: &[u8]) -> Result<Vec<u8>, String> {
        if ciphertext.len() > PREFIX_SIZE {
            let (prefix, rest) = ciphertext.split_at(PREFIX_SIZE);
            for k in self
                .keys
                .iter()
                .filter(|k| k.prefix_type != OutputPrefixType::Raw && k.prefix_type.prefix(k.key_id) == prefix)
            {
                if let Some(pt) = try_decrypt(&k.key_value, rest, aad) {
                    return Ok(pt);
                }
            }
        }
        for k in self.keys.iter().filter(|k| k.prefix_type == OutputPrefixType::Raw) {
            if let Some(pt) = try_decrypt(&k.key_value, ciphertext, aad) {
                return Ok(pt);
            }
        }
        Err("decryption failed: no matching key or ciphertext/associated data is invalid".into())
    }
}

fn try_decrypt(key: &[u8], data: &[u8], aad: &[u8]) -> Option<Vec<u8>> {
    if data.len() < IV_SIZE + TAG_SIZE {
        return None;
    }
    let (iv, ct) = data.split_at(IV_SIZE);
    gcm_decrypt(key, iv, ct, aad)
}

#[cfg(test)]
mod tests {
    use super::*;

    // Test vector produced by tink-go (aead.AES256GCMKeyTemplate, AEAD.Encrypt with nil associated data).
    const TEST_KEY: &str = "CJWm6vMFEmQKWAowdHlwZS5nb29nbGVhcGlzLmNvbS9nb29nbGUuY3J5cHRvLnRpbmsuQWVzR2NtS2V5EiIaIEcKJE4VVo1Gfqrzz9UOhYdPUowGmWJ4+YTDsN/p3f93GAEQARiVpurzBSAB";
    const TEST_CT: &str = "AV56kxW/MmWKIskhZAV3nxkx4Ptd+dp+jPx2wmY/j5AUSURnfhE9Kuid2dxfOal19IYD9k+/VB8D/+s=";
    const TEST_PT: &str = "hello tink\nline 2|foo|bar\n";

    #[test]
    fn decrypts_tink_go_vector() {
        let ks = parse_keyset(TEST_KEY).unwrap();
        assert_eq!(ks.primary_key_id, 0x5e7a9315);
        let pt = ks.decrypt(&BASE64.decode(TEST_CT).unwrap(), b"").unwrap();
        assert_eq!(String::from_utf8(pt).unwrap(), TEST_PT);
    }

    #[test]
    fn roundtrip_with_aad() {
        let ks = parse_keyset(TEST_KEY).unwrap();
        let ct = ks.encrypt(b"hello", b"ctx").unwrap();
        assert_eq!(&ct[..5], &[0x01, 0x5e, 0x7a, 0x93, 0x15]);
        assert_eq!(ks.decrypt(&ct, b"ctx").unwrap(), b"hello");
        assert!(ks.decrypt(&ct, b"other").is_err());
    }

    #[test]
    fn generated_keyset_roundtrip() {
        let ks = parse_keyset(&generate_keyset()).unwrap();
        assert_eq!(ks.keys.len(), 1);
        assert_eq!(ks.keys[0].key_value.len(), 32);
        let ct = ks.encrypt(b"data", b"").unwrap();
        assert_eq!(ks.decrypt(&ct, b"").unwrap(), b"data");
    }

    #[test]
    fn rejects_bad_keyset() {
        assert!(parse_keyset("not base64!").is_err());
        assert!(parse_keyset("").is_err());
    }
}
