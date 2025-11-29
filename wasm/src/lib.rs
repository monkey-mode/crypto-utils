use hex;
use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn hash_string(input: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input);
    hasher.update(salt);
    format!("{:x}", hasher.finalize())
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
