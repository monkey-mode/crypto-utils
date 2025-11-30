# MFOA Utils - Frontend

Next.js frontend application for MFOA Utils, providing cryptographic utilities powered by Rust WebAssembly.

## Prerequisites

- Node.js (v18 or higher)
- Bun (or npm/yarn/pnpm) for package management
- Built WASM module (see `../wasm/README.md`)

## Getting Started

1. **Install dependencies:**
   ```bash
   bun install
   # or
   npm install
   ```

2. **Build the WASM module** (if not already built):
   ```bash
   npm run build:wasm
   # or from the wasm directory:
   cd ../wasm
   ./build.sh
   ```

3. **Start the development server:**
   ```bash
   bun run dev
   # or
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
frontend/
├── app/
│   ├── components/         # React components
│   │   ├── HashForm.tsx              # Hash feature (single/multiple)
│   │   ├── EncryptDecryptForm.tsx     # Text encrypt/decrypt
│   │   ├── EncryptDecryptFileForm.tsx # File encrypt/decrypt
│   │   └── CopyIconButton.tsx         # Reusable copy button
│   ├── contexts/
│   │   └── WasmContext.tsx            # WASM module context provider
│   ├── utils/
│   │   └── wasm-loader.ts             # WASM module loader
│   ├── page.tsx                       # Main page with feature tabs
│   └── layout.tsx                     # Root layout with WASM provider
├── wasm/
│   └── pkg/                           # Built WASM package (generated)
└── package.json
```

## Features

- **Hash**: Single or multiple string hashing with salt (SHA-256)
- **Encrypt/Decrypt Text**: AES-256-GCM encryption for text
- **Encrypt/Decrypt File**: AES-256-GCM encryption for files
- Dark mode support
- Local storage persistence for user preferences
- Responsive design

## Building for Production

```bash
# Build WASM module
npm run build:wasm

# Build Next.js app
bun run build

# Start production server
bun run start
```

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Next.js Deployment](https://nextjs.org/docs/app/building-your-application/deploying)
