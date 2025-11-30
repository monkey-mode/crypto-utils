"use client";

import { startTransition, useEffect, useLayoutEffect, useState } from "react";
import { useWasm } from "../contexts/WasmContext";

type EncryptMode = "encrypt" | "decrypt";

const STORAGE_KEY_ENCRYPT_FILE_MODE = "mfoa-utils-encrypt-file-mode";

export default function EncryptDecryptFileForm() {
  const { wasmReady, wasmModule, error: wasmError } = useWasm();
  const [mode, setMode] = useState<EncryptMode>("encrypt");
  const [encryptFile, setEncryptFile] = useState<File | null>(null);
  const [decryptFileState, setDecryptFileState] = useState<File | null>(null);
  const [encryptFileName, setEncryptFileName] = useState("");
  const [decryptFileName, setDecryptFileName] = useState("");
  const [encryptOutputName, setEncryptOutputName] = useState("");
  const [decryptOutputName, setDecryptOutputName] = useState("");
  const [key, setKey] = useState("");
  const [encryptNonce, setEncryptNonce] = useState("");
  const [decryptNonce, setDecryptNonce] = useState("");
  const [encryptUseNonce, setEncryptUseNonce] = useState(false);
  const [decryptUseNonce, setDecryptUseNonce] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [encryptResult, setEncryptResult] = useState<Uint8Array | null>(null);
  const [decryptResult, setDecryptResult] = useState<Uint8Array | null>(null);

  // Load saved mode from localStorage and mark as mounted
  useLayoutEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY_ENCRYPT_FILE_MODE);
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
      localStorage.setItem(STORAGE_KEY_ENCRYPT_FILE_MODE, mode);
    }
  }, [mode, mounted]);

  useEffect(() => {
    if (wasmError) {
      setError(wasmError);
    }
  }, [wasmError]);

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
    // Clear results when switching modes
    setEncryptResult(null);
    setDecryptResult(null);
  };

  const handleDownload = () => {
    const result = mode === "encrypt" ? encryptResult : decryptResult;
    if (!result) return;

    const outputName = mode === "encrypt" ? encryptOutputName : decryptOutputName;
    const fileName = outputName || (mode === "encrypt" ? `${encryptFileName}.enc` : `${decryptFileName.replace(/\.enc$/, "")}.txt`);

    const resultArray = Array.from(result);
    const blob = new Blob([new Uint8Array(resultArray)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleEncryptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEncryptFile(file);
      setEncryptFileName(file.name);
      // Auto-generate output name: remove extension and add .enc
      const baseName = file.name.includes(".") ? file.name.substring(0, file.name.lastIndexOf(".")) : file.name;
      setEncryptOutputName(`${baseName}.enc`);
      // Clear previous result when new file is selected
      setEncryptResult(null);
    }
  };

  const handleDecryptFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDecryptFileState(file);
      setDecryptFileName(file.name);
      // Auto-generate output name: remove .enc extension and add .txt
      let baseName = file.name;
      if (file.name.endsWith(".enc")) {
        baseName = file.name.substring(0, file.name.length - 4);
      } else if (file.name.includes(".")) {
        baseName = file.name.substring(0, file.name.lastIndexOf("."));
      }
      setDecryptOutputName(`${baseName}.txt`);
      // Clear previous result when new file is selected
      setDecryptResult(null);
    }
  };

  const handleFileEncryptDecrypt = async () => {
    if (!key.trim()) {
      setError("Please enter a key");
      return;
    }

    const currentFile = mode === "encrypt" ? encryptFile : decryptFileState;
    const currentUseNonce = mode === "encrypt" ? encryptUseNonce : decryptUseNonce;
    const currentNonce = mode === "encrypt" ? encryptNonce : decryptNonce;

    if (!currentFile) {
      setError(`Please select a file to ${mode}`);
      return;
    }

    if (currentUseNonce && !currentNonce.trim()) {
      setError("Please enter a nonce");
      return;
    }

    if (!wasmReady || !wasmModule) {
      setError("WASM module is not ready yet");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await currentFile.arrayBuffer();
      const fileData = new Uint8Array(arrayBuffer);

      let result: Uint8Array;
      if (mode === "encrypt") {
        if (encryptUseNonce) {
          result = wasmModule.encrypt_file_with_nonce(key, encryptNonce, fileData);
        } else {
          result = wasmModule.encrypt_file(key, fileData);
        }
        setEncryptResult(result);
      } else {
        if (decryptUseNonce) {
          result = wasmModule.decrypt_file_with_nonce(key, decryptNonce, fileData);
        } else {
          result = wasmModule.decrypt_file(key, fileData);
        }
        setDecryptResult(result);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(`File ${mode} failed: ${errorMessage}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5">
      <div className="text-center mb-3 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-1.5">{mode === "encrypt" ? "Encrypt" : "Decrypt"} File</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{mode === "encrypt" ? "Encrypt" : "Decrypt"} files using AES-256-GCM</p>
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

      {mounted && (
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
              <input type="checkbox" id="useNonce" checked={mode === "encrypt" ? encryptUseNonce : decryptUseNonce} onChange={(e) => (mode === "encrypt" ? setEncryptUseNonce(e.target.checked) : setDecryptUseNonce(e.target.checked))} className="w-4 h-4 rounded border-zinc-300 dark:border-zinc-700" />
              <label htmlFor="useNonce" className="text-xs font-medium text-black dark:text-zinc-50">
                Use custom nonce (12 bytes)
              </label>
            </div>
            {(mode === "encrypt" ? encryptUseNonce : decryptUseNonce) && (
              <input
                type="text"
                value={mode === "encrypt" ? encryptNonce : decryptNonce}
                onChange={(e) => (mode === "encrypt" ? setEncryptNonce(e.target.value) : setDecryptNonce(e.target.value))}
                placeholder="Enter 12-byte nonce"
                className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            )}
          </div>

          {mode === "encrypt" && (
            <>
              <div className="max-w-2xl mx-auto">
                <label htmlFor="encrypt-file-input" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
                  File to Encrypt
                </label>
                <input id="encrypt-file-input" type="file" onChange={handleEncryptFileUpload} className="w-full text-xs text-zinc-600 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30 cursor-pointer" />
                {encryptFileName && (
                  <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    Selected: <span className="font-medium text-black dark:text-zinc-50">{encryptFileName}</span>
                  </p>
                )}
              </div>
              {encryptFile && (
                <div className="max-w-2xl mx-auto">
                  <label htmlFor="encrypt-output-name" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
                    Output File Name (optional)
                  </label>
                  <input id="encrypt-output-name" type="text" value={encryptOutputName} onChange={(e) => setEncryptOutputName(e.target.value)} placeholder="e.g., test.enc" className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
                </div>
              )}
            </>
          )}

          {mode === "decrypt" && (
            <>
              <div className="max-w-2xl mx-auto">
                <label htmlFor="decrypt-file-input" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
                  File to Decrypt
                </label>
                <input id="decrypt-file-input" type="file" onChange={handleDecryptFileUpload} className="w-full text-xs text-zinc-600 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30 cursor-pointer" />
                {decryptFileName && (
                  <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    Selected: <span className="font-medium text-black dark:text-zinc-50">{decryptFileName}</span>
                  </p>
                )}
              </div>
              {decryptFileState && (
                <div className="max-w-2xl mx-auto">
                  <label htmlFor="decrypt-output-name" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
                    Output File Name (optional)
                  </label>
                  <input id="decrypt-output-name" type="text" value={decryptOutputName} onChange={(e) => setDecryptOutputName(e.target.value)} placeholder="e.g., test.txt" className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
                </div>
              )}
            </>
          )}

          <div className="max-w-2xl mx-auto space-y-2">
            <button onClick={handleFileEncryptDecrypt} disabled={loading || !wasmReady || !(mode === "encrypt" ? encryptFile : decryptFileState)} className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all active:scale-98 active:bg-blue-800 disabled:active:scale-100">
              {loading ? (mode === "encrypt" ? "Encrypting File..." : "Decrypting File...") : mode === "encrypt" ? "Encrypt File" : "Decrypt File"}
            </button>
            {((mode === "encrypt" && encryptResult) || (mode === "decrypt" && decryptResult)) && (
              <button onClick={handleDownload} className="w-full px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all active:scale-98 active:bg-green-800">
                Download {mode === "encrypt" ? "Encrypted" : "Decrypted"} File
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
