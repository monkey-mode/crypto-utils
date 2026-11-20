#!/bin/bash

# Build script for Rust WASM module

set -e

WASM_TARGET="wasm32-unknown-unknown"

echo "Building Rust WASM module..."

export PATH="${CARGO_HOME:-$HOME/.cargo}/bin:$PATH"

# True when the rustc on PATH can compile for the wasm target
has_wasm_target() {
    command -v rustc &> /dev/null || return 1
    local sysroot
    sysroot="$(rustc --print sysroot 2> /dev/null)" || return 1
    [ -d "$sysroot/lib/rustlib/$WASM_TARGET" ]
}

if has_wasm_target; then
    echo "Rust with $WASM_TARGET target found: $(rustc --version)"
elif command -v rustup &> /dev/null && rustup target add "$WASM_TARGET" && has_wasm_target; then
    echo "Added $WASM_TARGET target via rustup: $(rustc --version)"
else
    if command -v rustc &> /dev/null; then
        echo "Found $(command -v rustc) without $WASM_TARGET target and no usable rustup. Installing a rustup toolchain..."
    else
        echo "Rust not found. Installing Rust..."
    fi
    # Use /tmp for cargo/rustup in Vercel/CI environments to avoid HOME issues
    if [ -n "$VERCEL" ] || [ "$HOME" = "/vercel" ]; then
        export CARGO_HOME="/tmp/.cargo"
        export RUSTUP_HOME="/tmp/.rustup"
    else
        export CARGO_HOME="${CARGO_HOME:-$HOME/.cargo}"
        export RUSTUP_HOME="${RUSTUP_HOME:-$HOME/.rustup}"
    fi
    # Put the new toolchain first so it wins over any preinstalled standalone Rust
    # (e.g. Vercel's /rust/bin, which has no wasm target)
    export PATH="$CARGO_HOME/bin:$PATH"
    # Skip the "existing Rust installation" check: a standalone rustc on PATH is expected here
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | RUSTUP_INIT_SKIP_PATH_CHECK=yes sh -s -- -y --no-modify-path --default-toolchain stable --profile minimal --target "$WASM_TARGET"
    hash -r
    if ! has_wasm_target; then
        echo "Error: $WASM_TARGET target still unavailable (rustc: $(command -v rustc))" >&2
        exit 1
    fi
    echo "Rust installed successfully: $(rustc --version)"
fi

# Install wasm-pack if not available
if ! command -v wasm-pack &> /dev/null; then
    echo "wasm-pack not found. Installing wasm-pack..."
    curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
    hash -r
    echo "wasm-pack installed successfully!"
else
    echo "wasm-pack is already installed: $(wasm-pack --version)"
fi

# Build the WASM module and output to frontend/wasm/pkg
wasm-pack build --target web --out-dir ../frontend/wasm/pkg

echo "WASM module built successfully!"
echo "Output directory: ../frontend/wasm/pkg/"
