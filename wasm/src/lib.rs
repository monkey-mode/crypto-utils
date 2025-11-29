use hex;
use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn hash_string(input: &str, salt: &str) -> String {
    // Combine input and salt (matching Go: cardId + salt)
    let combined = format!("{}{}", input, salt);

    // Hash using SHA-256 (matching Go: sha256.Sum256([]byte(encryptedCardId)))
    let hash = Sha256::digest(combined.as_bytes());

    // Convert to hex string (matching Go: hex.EncodeToString(sum[:]))
    // Convert GenericArray to &[u8] slice explicitly
    hex::encode(&hash[..])
}

#[wasm_bindgen]
pub fn hash_string_with_algorithm(input: &str, salt: &str, algorithm: &str) -> String {
    let combined = format!("{}{}", input, salt);

    match algorithm {
        "sha256" => {
            let hash = Sha256::digest(combined.as_bytes());
            hex::encode(&hash[..])
        }
        _ => {
            // Default to SHA-256
            let hash = Sha256::digest(combined.as_bytes());
            hex::encode(&hash[..])
        }
    }
}
