"use client";

import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { loadWasmModule } from "../utils/wasm-loader";

interface WasmModule {
  hash_string: (input: string, salt: string) => string;
  encrypt: (key: string, data: string) => string;
  encrypt_with_nonce: (key: string, nonce: string, data: string) => string;
  decrypt: (key: string, nonce_ciphertext: string) => string;
  decrypt_with_nonce: (key: string, nonce: string, ciphertext: string) => string;
  generate_key: () => string;
}

interface WasmContextType {
  wasmReady: boolean;
  wasmModule: WasmModule | null;
  error: string | null;
}

const WasmContext = createContext<WasmContextType>({
  wasmReady: false,
  wasmModule: null,
  error: null
});

export function WasmProvider({ children }: { children: ReactNode }) {
  const [wasmReady, setWasmReady] = useState(false);
  const [wasmModule, setWasmModule] = useState<WasmModule | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWasmModule()
      .then((module) => {
        setWasmModule(module);
        setWasmReady(true);
        setError(null);
      })
      .catch((err) => {
        setError("Failed to load WASM module. Please build the WASM module first.");
        console.error(err);
      });
  }, []);

  return <WasmContext.Provider value={{ wasmReady, wasmModule, error }}>{children}</WasmContext.Provider>;
}

export function useWasm() {
  return useContext(WasmContext);
}
