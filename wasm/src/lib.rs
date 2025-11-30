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
    // Generate 32 random bytes, return as base64 for easy transport
    // The encryption functions will use key.as_bytes() which treats the base64 string as raw bytes
    // This matches the Go implementation: []byte(key) where key is base64 string
    let mut key_bytes = [0u8; AES_KEY_LENGTH];
    rand::thread_rng().fill_bytes(&mut key_bytes);
    BASE64.encode(&key_bytes)
}

#[wasm_bindgen]
pub fn encrypt_file(key_str: &str, file_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let key_bytes = key_str.as_bytes();
    if key_bytes.len() != AES_KEY_LENGTH {
        return Err(JsValue::from_str(&format!(
            "Key must be {} bytes, got {}",
            AES_KEY_LENGTH,
            key_bytes.len()
        )));
    }
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let mut nonce_bytes = [0u8; GCM_STANDARD_NONCE_SIZE];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext_with_tag = cipher
        .encrypt(nonce, file_data)
        .map_err(|e| JsValue::from_str(&format!("Encryption error: {:?}", e)))?;

    let mut result = nonce_bytes.to_vec();
    result.extend_from_slice(&ciphertext_with_tag);

    Ok(result)
}

#[wasm_bindgen]
pub fn encrypt_file_with_nonce(
    key_str: &str,
    nonce_str: &str,
    file_data: &[u8],
) -> Result<Vec<u8>, JsValue> {
    let key_bytes = key_str.as_bytes();
    if key_bytes.len() != AES_KEY_LENGTH {
        return Err(JsValue::from_str(&format!(
            "Key must be {} bytes, got {}",
            AES_KEY_LENGTH,
            key_bytes.len()
        )));
    }
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let nonce_bytes = nonce_str.as_bytes();
    if nonce_bytes.len() != GCM_STANDARD_NONCE_SIZE {
        return Err(JsValue::from_str(&format!(
            "Nonce must be {} bytes, got {}",
            GCM_STANDARD_NONCE_SIZE,
            nonce_bytes.len()
        )));
    }
    let nonce = Nonce::from_slice(nonce_bytes);

    let result = cipher
        .encrypt(nonce, file_data)
        .map_err(|e| JsValue::from_str(&format!("Encryption error: {:?}", e)))?;
    Ok(result)
}

#[wasm_bindgen]
pub fn decrypt_file(key_str: &str, file_data: &[u8]) -> Result<Vec<u8>, JsValue> {
    let key_bytes = key_str.as_bytes();
    if key_bytes.len() != AES_KEY_LENGTH {
        return Err(JsValue::from_str(&format!(
            "Key must be {} bytes, got {}",
            AES_KEY_LENGTH,
            key_bytes.len()
        )));
    }
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    if file_data.len() < GCM_STANDARD_NONCE_SIZE {
        return Err(JsValue::from_str(&format!(
            "File data too short to contain nonce: need at least {} bytes, got {}",
            GCM_STANDARD_NONCE_SIZE,
            file_data.len()
        )));
    }

    let (nonce_bytes, ciphertext_with_tag) = file_data.split_at(GCM_STANDARD_NONCE_SIZE);
    let nonce = Nonce::from_slice(nonce_bytes);

    let result = cipher
        .decrypt(nonce, ciphertext_with_tag)
        .map_err(|e| JsValue::from_str(&format!("Decryption error: {:?}", e)))?;
    Ok(result)
}

#[wasm_bindgen]
pub fn decrypt_file_with_nonce(
    key_str: &str,
    nonce_str: &str,
    file_data: &[u8],
) -> Result<Vec<u8>, JsValue> {
    let key_bytes = key_str.as_bytes();
    if key_bytes.len() != AES_KEY_LENGTH {
        return Err(JsValue::from_str(&format!(
            "Key must be {} bytes, got {}",
            AES_KEY_LENGTH,
            key_bytes.len()
        )));
    }
    let key = Key::<Aes256Gcm>::from_slice(key_bytes);
    let cipher = Aes256Gcm::new(key);

    let nonce_bytes = nonce_str.as_bytes();
    if nonce_bytes.len() != GCM_STANDARD_NONCE_SIZE {
        return Err(JsValue::from_str(&format!(
            "Nonce must be {} bytes, got {}",
            GCM_STANDARD_NONCE_SIZE,
            nonce_bytes.len()
        )));
    }
    let nonce = Nonce::from_slice(nonce_bytes);

    let result = cipher
        .decrypt(nonce, file_data)
        .map_err(|e| JsValue::from_str(&format!("Decryption error: {:?}", e)))?;
    Ok(result)
}
