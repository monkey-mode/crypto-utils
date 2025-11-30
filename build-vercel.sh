#!/bin/bash

# Build script for Vercel deployment
# This script builds the WASM module and then the Next.js app

set -e

echo "Building for Vercel..."

# Install Rust if not available (Vercel should have it, but just in case)
if ! command -v rustc &> /dev/null; then
    echo "Rust not found. Installing..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Install wasm-pack if not available
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack not found. Installing..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
fi

# Build WASM module
echo "Building WASM module..."
cd wasm
chmod +x build.sh
./build.sh
cd ..

# Build Next.js app
echo "Building Next.js app..."
cd frontend
npm run build
cd ..

echo "Build complete!"

