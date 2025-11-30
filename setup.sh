#!/bin/bash

# Setup script for the entire project

set -e

echo "Setting up MFOA Utils project..."

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

