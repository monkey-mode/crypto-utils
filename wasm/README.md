# WASM Cryptographic Module

This directory contains the Rust WebAssembly module providing cryptographic utilities for MFOA Utils.

## Prerequisites

- Rust (install from https://rustup.rs/)
- wasm-pack (will be installed automatically by build script, or install manually: `curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh`)

## Building

Run the build script:

```bash
chmod +x build.sh
./build.sh
```

Or manually:

```bash
wasm-pack build --target web --out-dir ../frontend/wasm/pkg
```

This will create a `pkg/` directory in `../frontend/wasm/pkg/` with the compiled WASM module and JavaScript bindings.

## Usage

The built module will be imported in the Next.js frontend at `frontend/app/utils/wasm-loader.ts` and provided globally via `WasmContext`.

## Functions

### Hash Functions
- `hash_string(input: &str, salt: &str) -> String`: Hashes a string with salt using SHA-256, returns hex-encoded hash

### Encryption/Decryption Functions (Text)
- `encrypt(key: &str, data: &str) -> String`: Encrypts text using AES-256-GCM with auto-generated nonce, returns base64-encoded ciphertext (nonce prepended)
- `encrypt_with_nonce(key: &str, nonce: &str, data: &str) -> String`: Encrypts text with custom nonce, returns base64-encoded ciphertext
- `decrypt(key: &str, nonce_ciphertext: &str) -> String`: Decrypts text (nonce included in ciphertext), returns plaintext
- `decrypt_with_nonce(key: &str, nonce: &str, ciphertext: &str) -> String`: Decrypts text with separate nonce, returns plaintext
- `generate_key() -> String`: Generates a random 32-byte key, returns base64-encoded string

### Encryption/Decryption Functions (Files)
- `encrypt_file(key_str: &str, file_data: &[u8]) -> Result<Vec<u8>, JsValue>`: Encrypts file with auto-generated nonce
- `encrypt_file_with_nonce(key_str: &str, nonce_str: &str, file_data: &[u8]) -> Result<Vec<u8>, JsValue>`: Encrypts file with custom nonce
- `decrypt_file(key_str: &str, file_data: &[u8]) -> Result<Vec<u8>, JsValue>`: Decrypts file (nonce included)
- `decrypt_file_with_nonce(key_str: &str, nonce_str: &str, file_data: &[u8]) -> Result<Vec<u8>, JsValue>`: Decrypts file with separate nonce

## Dependencies

- `sha2`: SHA-256 hashing
- `hex`: Hexadecimal encoding
- `aes-gcm`: AES-256-GCM encryption
- `base64`: Base64 encoding/decoding
- `rand` + `getrandom`: Random number generation for WASM
- `wasm-bindgen`: WebAssembly bindings

## Notes

- Key and nonce are treated as raw bytes (using `as_bytes()`), not base64-decoded
- Nonce size is 12 bytes (GCM standard)
- Key size is 32 bytes (AES-256)
- The `generate_key()` function returns a base64 string, but it's treated as raw bytes when used

