# WASM Hash Module

This directory contains the Rust WebAssembly module for hashing strings with salt.

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

The built module will be imported in the Next.js frontend at `frontend/app/utils/wasm-loader.ts`.

## Functions

- `hash_string(input: &str, salt: &str) -> String`: Hashes a string with salt using SHA-256
- `hash_string_with_algorithm(input: &str, salt: &str, algorithm: &str) -> String`: Hashes with a specified algorithm (currently only SHA-256 is supported)

