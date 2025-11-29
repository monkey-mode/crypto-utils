# MFOA Utils - String Hasher with Salt

A Next.js web application that hashes strings with salt using Rust WebAssembly (WASM).

## Features

- Hash strings with salt using SHA-256
- Powered by Rust compiled to WebAssembly for high performance
- Modern, responsive UI with dark mode support
- Real-time hashing with instant results

## Project Structure

```
.
├── frontend/          # Next.js frontend application
│   ├── app/          # Next.js app directory
│   │   ├── components/  # React components
│   │   └── utils/      # Utility functions
│   └── package.json
└── wasm/              # Rust WASM module
    ├── src/          # Rust source code
    └── Cargo.toml    # Rust dependencies
```

## Prerequisites

- Node.js (v18 or higher)
- Bun (or npm/yarn) for package management
- Rust (install from https://rustup.rs/)
- wasm-pack (will be installed automatically, or install manually)

## Setup

1. **Install frontend dependencies:**
   ```bash
   cd frontend
   bun install
   ```

2. **Build the WASM module:**
   ```bash
   cd wasm
   chmod +x build.sh
   ./build.sh
   ```

   The WASM module will be built directly into `frontend/wasm/pkg/`.

   Or use the npm script from the frontend directory:
   ```bash
   cd frontend
   npm run build:wasm
   ```

## Development

1. **Start the development server:**
   ```bash
   cd frontend
   bun run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

1. **Build the WASM module:**
   ```bash
   npm run build:wasm
   ```

2. **Build the Next.js application:**
   ```bash
   cd frontend
   bun run build
   ```

3. **Start the production server:**
   ```bash
   bun run start
   ```

## How It Works

1. The Rust code in `wasm/src/lib.rs` defines a `hash_string` function that:
   - Takes an input string and salt
   - Combines them
   - Hashes using SHA-256
   - Returns a hex-encoded hash string

2. The Rust code is compiled to WebAssembly using `wasm-pack`

3. The Next.js frontend loads the WASM module and provides a UI to:
   - Input a string to hash
   - Input a salt value
   - Display the resulting hash
   - Copy the hash to clipboard

## Troubleshooting

- **WASM module not found**: Make sure you've built the WASM module and it's accessible at `frontend/wasm/pkg/`. The build script outputs directly to this location.
- **Build errors**: Ensure Rust and wasm-pack are properly installed
- **Import errors**: Check that the WASM package path is correct in `frontend/app/utils/wasm-loader.ts` (should be `../../wasm/pkg/mfoa_hash_wasm`)

