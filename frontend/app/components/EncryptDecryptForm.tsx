"use client";

import { startTransition, useEffect, useLayoutEffect, useState } from "react";
import { useWasm } from "../contexts/WasmContext";

type EncryptMode = "encrypt" | "decrypt";

const STORAGE_KEY_ENCRYPT_MODE = "mfoa-utils-encrypt-mode";

export default function EncryptDecryptForm() {
  const { wasmReady, wasmModule, error: wasmError } = useWasm();
  const [mode, setMode] = useState<EncryptMode>("encrypt");
  const [encryptInput, setEncryptInput] = useState("");
  const [decryptInput, setDecryptInput] = useState("");
  const [encryptResult, setEncryptResult] = useState("");
  const [decryptResult, setDecryptResult] = useState("");
  const [key, setKey] = useState("");
  const [encryptNonce, setEncryptNonce] = useState("");
  const [decryptNonce, setDecryptNonce] = useState("");
  const [encryptUseNonce, setEncryptUseNonce] = useState(false);
  const [decryptUseNonce, setDecryptUseNonce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load saved mode from localStorage and mark as mounted
  // Using useLayoutEffect to synchronously update before paint to avoid hydration mismatch
  useLayoutEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY_ENCRYPT_MODE);
    startTransition(() => {
      if (savedMode === "encrypt" || savedMode === "decrypt") {
        setMode(savedMode);
      }
      setMounted(true);
    });
  }, []);

  // Save mode to localStorage when it changes (only after mount)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY_ENCRYPT_MODE, mode);
    }
  }, [mode, mounted]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (wasmError) {
      setError(wasmError);
    }
  }, [wasmError]);

  const handleEncryptDecrypt = async () => {
    if (!key.trim()) {
      setError("Please enter a key");
      return;
    }

    const currentInput = mode === "encrypt" ? encryptInput : decryptInput;
    const currentUseNonce = mode === "encrypt" ? encryptUseNonce : decryptUseNonce;
    const currentNonce = mode === "encrypt" ? encryptNonce : decryptNonce;

    if (currentUseNonce && !currentNonce.trim()) {
      setError("Please enter a nonce");
      return;
    }

    if (!currentInput.trim()) {
      setError(`Please enter ${mode === "encrypt" ? "data to encrypt" : "ciphertext to decrypt"}`);
      return;
    }

    if (!wasmReady || !wasmModule) {
      setError("WASM module is not ready yet");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (mode === "encrypt") {
        let encrypted: string;
        if (encryptUseNonce) {
          encrypted = wasmModule.encrypt_with_nonce(key, encryptNonce, encryptInput);
        } else {
          encrypted = wasmModule.encrypt(key, encryptInput);
        }
        setEncryptResult(encrypted);
      } else {
        let decrypted: string;
        if (decryptUseNonce) {
          decrypted = wasmModule.decrypt_with_nonce(key, decryptNonce, decryptInput);
        } else {
          decrypted = wasmModule.decrypt(key, decryptInput);
        }
        setDecryptResult(decrypted);
      }
    } catch (err) {
      setError("Operation failed. Please check the console for details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateKey = () => {
    if (!wasmReady || !wasmModule) {
      setError("WASM module is not ready yet");
      return;
    }

    try {
      const generatedKey = wasmModule.generate_key();
      setKey(generatedKey);
      setError(null);
    } catch (err) {
      setError("Failed to generate key. Please check the console for details.");
      console.error(err);
    }
  };

  const handleModeChange = (newMode: EncryptMode): void => {
    setMode(newMode);
    setError(null);
    // Keep all inputs and results when switching modes
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
  };

  return (
    <div className="w-full space-y-5">
      <div className="text-center mb-3 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-1.5">{mode === "encrypt" ? "Encrypt" : "Decrypt"} Data</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{mode === "encrypt" ? "Encrypt" : "Decrypt"} data using AES-256-GCM</p>
      </div>

      {mounted && !wasmReady && !wasmError && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-2xl mx-auto">
          <p className="text-sm text-blue-800 dark:text-blue-200">Loading WASM module...</p>
        </div>
      )}

      {(error || wasmError) && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-w-2xl mx-auto">
          <p className="text-sm text-red-800 dark:text-red-200">{error || wasmError}</p>
        </div>
      )}

      <div className="space-y-3 mx-auto">
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg max-w-2xl mx-auto">
          <button onClick={() => handleModeChange("encrypt")} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${mode === "encrypt" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
            Encrypt
          </button>
          <button onClick={() => handleModeChange("decrypt")} className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${mode === "decrypt" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
            Decrypt
          </button>
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="key" className="block text-xs font-medium text-black dark:text-zinc-50">
              Key (32 bytes)
            </label>
            <button onClick={handleGenerateKey} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium active:opacity-70 transition-opacity">
              Generate Key
            </button>
          </div>
          <input id="key" type="text" value={key} onChange={(e) => setKey(e.target.value)} placeholder="Enter 32-byte key or generate one" className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
        </div>

        <div className="max-w-2xl mx-auto">
          <div className="flex items-center gap-2 mb-1.5">
            <input
              type="checkbox"
              id="useNonce"
              checked={mode === "encrypt" ? encryptUseNonce : decryptUseNonce}
              onChange={(e) => {
                if (mode === "encrypt") {
                  setEncryptUseNonce(e.target.checked);
                } else {
                  setDecryptUseNonce(e.target.checked);
                }
              }}
              className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700"
            />
            <label htmlFor="useNonce" className="text-xs font-medium text-black dark:text-zinc-50">
              Use custom nonce (12 bytes)
            </label>
          </div>
          {(mode === "encrypt" ? encryptUseNonce : decryptUseNonce) && (
            <input
              type="text"
              value={mode === "encrypt" ? encryptNonce : decryptNonce}
              onChange={(e) => {
                if (mode === "encrypt") {
                  setEncryptNonce(e.target.value);
                } else {
                  setDecryptNonce(e.target.value);
                }
              }}
              placeholder="Enter 12-byte nonce"
              className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          )}
        </div>

        <div className="max-w-2xl mx-auto">
          <label htmlFor="input" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
            {mode === "encrypt" ? "Data to Encrypt" : "Ciphertext to Decrypt"}
          </label>
          <textarea
            id="input"
            value={mode === "encrypt" ? encryptInput : decryptInput}
            onChange={(e) => {
              if (mode === "encrypt") {
                setEncryptInput(e.target.value);
              } else {
                setDecryptInput(e.target.value);
              }
            }}
            placeholder={mode === "encrypt" ? "Enter data to encrypt" : "Enter base64-encoded ciphertext"}
            rows={4}
            className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-y"
          />
        </div>

        <div className="max-w-2xl mx-auto">
          <button onClick={handleEncryptDecrypt} disabled={loading || !wasmReady} className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all active:scale-98 active:bg-blue-800 disabled:active:scale-100">
            {loading ? (mode === "encrypt" ? "Encrypting..." : "Decrypting...") : mode === "encrypt" ? "Encrypt" : "Decrypt"}
          </button>
        </div>
      </div>

      {mode === "encrypt" && encryptResult && (
        <div className="mt-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-black dark:text-zinc-50">Encrypted Result</label>
            <button onClick={() => handleCopy(encryptResult)} className="text-blue-600 dark:text-blue-400 hover:opacity-80 active:opacity-60 active:scale-95 transition-all" title="Copy result">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
            <code className="text-xs text-black dark:text-zinc-50 break-all font-mono">{encryptResult}</code>
          </div>
        </div>
      )}

      {mode === "decrypt" && decryptResult && (
        <div className="mt-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-black dark:text-zinc-50">Decrypted Result</label>
            <button onClick={() => handleCopy(decryptResult)} className="text-blue-600 dark:text-blue-400 hover:opacity-80 active:opacity-60 active:scale-95 transition-all" title="Copy result">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
            <code className="text-xs text-black dark:text-zinc-50 break-all font-mono">{decryptResult}</code>
          </div>
        </div>
      )}
    </div>
  );
}
