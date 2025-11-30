use aes_gcm::aead::Aead;
use aes_gcm::{Aes256Gcm, Key, KeyInit, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine as _};
use hex;
use rand::RngCore;
use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

const GCM_STANDARD_NONCE_SIZE: usize = 12;
const AES_KEY_LENGTH: usize = 32;

#[wasm_bindgen]
pub fn hash_string(input: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input);
    hasher.update(salt);
    hex::encode(hasher.finalize())
}

#[wasm_bindgen]
pub fn encrypt(key: &str, data: &str) -> String {
    let key_bytes = key.as_bytes();
    if key_bytes.len() != AES_KEY_LENGTH {
        return String::from("Error: key must be 32 bytes");
    }

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    // Generate random nonce
    let mut nonce_bytes = [0u8; GCM_STANDARD_NONCE_SIZE];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt
    let ciphertext = match cipher.encrypt(nonce, data.as_bytes()) {
        Ok(ct) => ct,
        Err(_) => return String::from("Error: encryption failed"),
    };

    // Prepend nonce to ciphertext
    let mut result = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
    result.extend_from_slice(&nonce_bytes);
    result.extend_from_slice(&ciphertext);

    // Return base64 encoded
    BASE64.encode(&result)
}

#[wasm_bindgen]
pub fn encrypt_with_nonce(key: &str, nonce: &str, data: &str) -> String {
    let key_bytes = key.as_bytes();
    if key_bytes.len() != AES_KEY_LENGTH {
        return String::from("Error: key must be 32 bytes");
    }

    let nonce_bytes = nonce.as_bytes();
    if nonce_bytes.len() != GCM_STANDARD_NONCE_SIZE {
        return String::from("Error: nonce must be 12 bytes");
    }

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    // Encrypt
    let ciphertext = match cipher.encrypt(nonce, data.as_bytes()) {
        Ok(ct) => ct,
        Err(_) => return String::from("Error: encryption failed"),
    };

    // Return base64 encoded (without nonce prepended)
    BASE64.encode(&ciphertext)
}

#[wasm_bindgen]
pub fn decrypt(key: &str, nonce_ciphertext: &str) -> String {
    let key_bytes = key.as_bytes();
    if key_bytes.len() != AES_KEY_LENGTH {
        return String::from("Error: key must be 32 bytes");
    }

    // Decode base64
    let decoded = match BASE64.decode(nonce_ciphertext) {
        Ok(d) => d,
        Err(_) => return String::from("Error: invalid base64 ciphertext"),
    };

    if decoded.len() <= GCM_STANDARD_NONCE_SIZE {
        return String::from("Error: ciphertext too short");
    }

    // Extract nonce and ciphertext
    let nonce_bytes = &decoded[..GCM_STANDARD_NONCE_SIZE];
    let ciphertext = decoded[GCM_STANDARD_NONCE_SIZE..].to_vec();

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    // Decrypt
    match cipher.decrypt(nonce, ciphertext.as_ref()) {
        Ok(plaintext) => String::from_utf8_lossy(&plaintext).to_string(),
        Err(_) => String::from("Error: decryption failed"),
    }
}

#[wasm_bindgen]
pub fn decrypt_with_nonce(key: &str, nonce: &str, ciphertext: &str) -> String {
    let key_bytes = key.as_bytes();
    if key_bytes.len() != AES_KEY_LENGTH {
        return String::from("Error: key must be 32 bytes");
    }

    let nonce_bytes = nonce.as_bytes();
    if nonce_bytes.len() != GCM_STANDARD_NONCE_SIZE {
        return String::from("Error: nonce must be 12 bytes");
    }

    // Decode base64
    let decoded = match BASE64.decode(ciphertext) {
        Ok(d) => d,
        Err(_) => return String::from("Error: invalid base64 ciphertext"),
    };

    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    // Decrypt
    match cipher.decrypt(nonce, decoded.as_slice()) {
        Ok(plaintext) => String::from_utf8_lossy(&plaintext).to_string(),
        Err(_) => String::from("Error: decryption failed"),
    }
}

#[wasm_bindgen]
pub fn generate_key() -> String {
    // Generate 24 random bytes, then base64 encode (which gives 32 bytes when decoded)
    let mut key_bytes = [0u8; 24];
    rand::thread_rng().fill_bytes(&mut key_bytes);
    BASE64.encode(&key_bytes)
}
