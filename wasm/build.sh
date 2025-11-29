#!/bin/bash

# Build script for Rust WASM module

set -e

echo "Building Rust WASM module..."

# Check if wasm-pack is installed
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack is not installed. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build the WASM module and output to frontend/wasm/pkg
wasm-pack build --target web --out-dir ../frontend/wasm/pkg

echo "WASM module built successfully!"
echo "Output directory: ../frontend/wasm/pkg/"

