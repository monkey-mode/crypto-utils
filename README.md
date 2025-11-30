# MFOA Utils

A Next.js web application providing cryptographic utilities powered by Rust WebAssembly (WASM).

## Features

### 🔐 Hash
- Hash strings with salt using SHA-256
- Single hash mode with textarea support (supports newlines)
- Multiple hash mode for batch processing
- Real-time hashing with instant results

### 🔒 Encrypt/Decrypt Text
- Encrypt and decrypt text using AES-256-GCM
- Automatic nonce generation or custom nonce support
- Key generation utility
- Base64-encoded output

### 📁 Encrypt/Decrypt Files
- Encrypt and decrypt files using AES-256-GCM
- Automatic nonce generation or custom nonce support
- Custom output filename support
- Manual download with download button

### 🎨 UI Features
- Modern, responsive UI with dark mode support
- Feature tabs for easy navigation
- Local storage persistence for user preferences
- Smooth transitions and loading states

## Project Structure

```
.
├── frontend/                    # Next.js frontend application
│   ├── app/
│   │   ├── components/         # React components
│   │   │   ├── HashForm.tsx              # Hash feature component
│   │   │   ├── EncryptDecryptForm.tsx     # Text encrypt/decrypt component
│   │   │   ├── EncryptDecryptFileForm.tsx # File encrypt/decrypt component
│   │   │   └── ...                       # Other UI components
│   │   ├── contexts/
│   │   │   └── WasmContext.tsx            # WASM module context provider
│   │   ├── utils/
│   │   │   └── wasm-loader.ts            # WASM module loader
│   │   ├── page.tsx                      # Main page with feature tabs
│   │   └── layout.tsx                    # Root layout
│   ├── wasm/
│   │   └── pkg/                          # Built WASM package (generated)
│   └── package.json
└── wasm/                       # Rust WASM module source
    ├── src/
    │   └── lib.rs              # Rust source with hash, encrypt, decrypt functions
    ├── Cargo.toml              # Rust dependencies
    └── build.sh                # Build script
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

1. **Rust WASM Module** (`wasm/src/lib.rs`):
   - `hash_string`: Hashes strings with salt using SHA-256
   - `encrypt`/`decrypt`: Encrypts/decrypts text using AES-256-GCM
   - `encrypt_file`/`decrypt_file`: Encrypts/decrypts files using AES-256-GCM
   - `generate_key`: Generates random 32-byte encryption keys
   - All functions are compiled to WebAssembly using `wasm-pack`

2. **Next.js Frontend**:
   - Loads the WASM module once at the page level for optimal performance
   - Provides three feature tabs:
     - **Hash**: Single or multiple string hashing with salt
     - **Encrypt/Decrypt**: Text encryption and decryption
     - **Encrypt/Decrypt File**: File encryption and decryption
   - Uses React Context for global WASM module access
   - Persists user preferences (active feature, mode) in localStorage

3. **State Management**:
   - Each feature maintains its own state
   - Inputs and results are preserved when switching between features
   - File uploads persist when switching between encrypt/decrypt modes

## Troubleshooting

- **WASM module not found**: Make sure you've built the WASM module and it's accessible at `frontend/wasm/pkg/`. The build script outputs directly to this location.
- **Build errors**: Ensure Rust and wasm-pack are properly installed
- **Import errors**: Check that the WASM package path is correct in `frontend/app/utils/wasm-loader.ts` (should be `../../wasm/pkg/mfoa_hash_wasm`)

