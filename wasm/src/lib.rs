use hex;
use sha2::{Digest, Sha256};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn hash_string(input: &str, salt: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input);
    hasher.update(salt);
    hex::encode(hasher.finalize())
}
