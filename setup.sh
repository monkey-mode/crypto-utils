#!/bin/bash

# Setup script for the entire project

set -e

echo "Setting up MFOA Utils project..."

# Install Rust if not available
if ! command -v rustc &> /dev/null; then
    echo "Rust not found. Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
    echo "Rust installed successfully!"
else
    echo "Rust is already installed: $(rustc --version)"
fi

# Install wasm-pack if not available
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack not found. Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    echo "wasm-pack installed successfully!"
else
    echo "wasm-pack is already installed: $(wasm-pack --version)"
fi

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend
if command -v bun &> /dev/null; then
    bun install
else
    npm install
fi
cd ..

# Build WASM module (outputs directly to frontend/wasm/pkg)
echo "Building WASM module..."
cd wasm
chmod +x build.sh
./build.sh
cd ..

echo "Setup complete!"
echo ""
echo "To start development:"
echo "  cd frontend"
echo "  bun run dev"
echo ""
echo "Or with npm:"
echo "  cd frontend"
echo "  npm run dev"

