#!/bin/bash

# Build script for Rust WASM module

set -e

echo "Building Rust WASM module..."

# Check if wasm-pack is installed
if ! command -v rustc &> /dev/null; then
    echo "Rust not found. Installing Rust..."
    # Fix HOME directory issue in Vercel/CI environments
    # Use /tmp for cargo/rustup in CI environments to avoid HOME issues
    if [ -n "$VERCEL" ] || [ "$HOME" = "/vercel" ]; then
        export CARGO_HOME="/tmp/.cargo"
        export RUSTUP_HOME="/tmp/.rustup"
        export PATH="/tmp/.cargo/bin:$PATH"
    else
        export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
        export RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}"
        export PATH="$CARGO_HOME/bin:$PATH"
    fi
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y --default-toolchain stable --profile minimal
    # Source cargo env to make Rust available immediately
    if [ -f "$CARGO_HOME/env" ]; then
        source "$CARGO_HOME/env"
    fi
    echo "Rust installed successfully!"
else
    echo "Rust is already installed: $(rustc --version)"
    export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"
fi

# Install wasm-pack if not available
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack not found. Installing wasm-pack..."
    # Ensure PATH includes cargo bin
    export PATH="${CARGO_HOME:-/tmp/.cargo}/bin:$PATH"
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    echo "wasm-pack installed successfully!"
else
    echo "wasm-pack is already installed: $(wasm-pack --version)"
fi

# Build the WASM module and output to frontend/wasm/pkg
wasm-pack build --target web --out-dir ../frontend/wasm/pkg

echo "WASM module built successfully!"
echo "Output directory: ../frontend/wasm/pkg/"

