"use client";

import { startTransition, useEffect, useLayoutEffect, useState } from "react";
import { useWasm } from "../contexts/WasmContext";
import CopyIconButton from "./CopyIconButton";

type EncryptMode = "encrypt" | "decrypt";
type InputType = "text" | "file";

const STORAGE_KEY_TINKER_MODE = "mfoa-utils-tinker-mode";
const STORAGE_KEY_TINKER_INPUT_TYPE = "mfoa-utils-tinker-input-type";

const inputClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400";
const fileInputClass =
  "w-full text-xs text-zinc-600 dark:text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 dark:file:bg-blue-900/20 file:text-blue-700 dark:file:text-blue-300 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/30 cursor-pointer";

const toggleClass = (active: boolean) =>
  `flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-all active:scale-95 ${active ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`;

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  if (err && typeof err === "object" && "message" in err) return String(err.message);
  return "Unknown error";
}

function baseName(name: string): string {
  return name.includes(".") ? name.substring(0, name.lastIndexOf(".")) : name;
}

export default function TinkerForm() {
  const { wasmReady, wasmModule, error: wasmError } = useWasm();
  const [mode, setMode] = useState<EncryptMode>("encrypt");
  const [inputType, setInputType] = useState<InputType>("text");
  const [keyset, setKeyset] = useState("");
  const [associatedData, setAssociatedData] = useState("");
  const [textInput, setTextInput] = useState<Record<EncryptMode, string>>({ encrypt: "", decrypt: "" });
  const [textResult, setTextResult] = useState<Record<EncryptMode, string>>({ encrypt: "", decrypt: "" });
  const [file, setFile] = useState<Record<EncryptMode, File | null>>({ encrypt: null, decrypt: null });
  const [outputName, setOutputName] = useState<Record<EncryptMode, string>>({ encrypt: "", decrypt: "" });
  const [fileResult, setFileResult] = useState<Record<EncryptMode, Uint8Array | null>>({ encrypt: null, decrypt: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY_TINKER_MODE);
    const savedInputType = localStorage.getItem(STORAGE_KEY_TINKER_INPUT_TYPE);
    startTransition(() => {
      if (savedMode === "encrypt" || savedMode === "decrypt") setMode(savedMode);
      if (savedInputType === "text" || savedInputType === "file") setInputType(savedInputType);
      setMounted(true);
    });
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY_TINKER_MODE, mode);
      localStorage.setItem(STORAGE_KEY_TINKER_INPUT_TYPE, inputType);
    }
  }, [mode, inputType, mounted]);

  const handleGenerateKeyset = () => {
    if (!wasmReady || !wasmModule) {
      setError("WASM module is not ready yet");
      return;
    }
    try {
      setKeyset(wasmModule.tinker_generate_keyset());
      setError(null);
    } catch (err) {
      setError(`Failed to generate keyset: ${errorMessage(err)}`);
      console.error(err);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0] ?? null;
    setFile((prev) => ({ ...prev, [mode]: selected }));
    setFileResult((prev) => ({ ...prev, [mode]: null }));
    if (selected) {
      const name = mode === "encrypt" ? `${baseName(selected.name)}.enc` : `${selected.name.endsWith(".enc") ? selected.name.slice(0, -4) : baseName(selected.name)}.txt`;
      setOutputName((prev) => ({ ...prev, [mode]: name }));
    }
  };

  const handleRun = async () => {
    if (!keyset.trim()) {
      setError("Please enter a keyset");
      return;
    }
    if (!wasmReady || !wasmModule) {
      setError("WASM module is not ready yet");
      return;
    }

    if (inputType === "text" && !textInput[mode].trim()) {
      setError(`Please enter ${mode === "encrypt" ? "data to encrypt" : "ciphertext to decrypt"}`);
      return;
    }
    const currentFile = file[mode];
    if (inputType === "file" && !currentFile) {
      setError(`Please select a file to ${mode}`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (inputType === "text") {
        const result = mode === "encrypt" ? wasmModule.tinker_encrypt(keyset, textInput.encrypt, associatedData) : wasmModule.tinker_decrypt(keyset, textInput.decrypt, associatedData);
        setTextResult((prev) => ({ ...prev, [mode]: result }));
      } else {
        const data = new Uint8Array(await currentFile!.arrayBuffer());
        const result = mode === "encrypt" ? wasmModule.tinker_encrypt_file(keyset, data, associatedData) : wasmModule.tinker_decrypt_file(keyset, data, associatedData);
        setFileResult((prev) => ({ ...prev, [mode]: result }));
      }
    } catch (err) {
      setError(`${mode === "encrypt" ? "Encryption" : "Decryption"} failed: ${errorMessage(err)}`);
      if (inputType === "text") setTextResult((prev) => ({ ...prev, [mode]: "" }));
      else setFileResult((prev) => ({ ...prev, [mode]: null }));
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    const result = fileResult[mode];
    if (!result) return;
    const blob = new Blob([new Uint8Array(result)], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = outputName[mode] || (mode === "encrypt" ? "output.enc" : "output.txt");
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const verb = mode === "encrypt" ? "Encrypt" : "Decrypt";

  return (
    <div className="w-full space-y-5">
      <div className="text-center mb-3 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-1.5">Tinker {verb}</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">{verb} with a Tink AES-GCM keyset (compatible with tink-go AEAD)</p>
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
          <div className="flex gap-3 max-w-2xl mx-auto">
            <div className="flex flex-1 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <button onClick={() => { setMode("encrypt"); setError(null); }} className={toggleClass(mode === "encrypt")}>Encrypt</button>
              <button onClick={() => { setMode("decrypt"); setError(null); }} className={toggleClass(mode === "decrypt")}>Decrypt</button>
            </div>
            <div className="flex flex-1 gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
              <button onClick={() => { setInputType("text"); setError(null); }} className={toggleClass(inputType === "text")}>Text</button>
              <button onClick={() => { setInputType("file"); setError(null); }} className={toggleClass(inputType === "file")}>File</button>
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="tinker-keyset" className="block text-xs font-medium text-black dark:text-zinc-50">
                Keyset (base64 Tink cleartext keyset)
              </label>
              <button onClick={handleGenerateKeyset} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium active:opacity-70 transition-opacity">
                Generate Keyset
              </button>
            </div>
            <div className="flex gap-2 items-stretch">
              <textarea id="tinker-keyset" value={keyset} onChange={(e) => setKeyset(e.target.value)} placeholder="Paste a base64 keyset or generate one" rows={3} className={`${inputClass} font-mono text-xs resize-y`} />
              {keyset && <CopyIconButton onClick={() => navigator.clipboard.writeText(keyset.trim())} title="Copy keyset" />}
            </div>
          </div>

          <div className="max-w-2xl mx-auto">
            <label htmlFor="tinker-aad" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
              Associated Data (optional)
            </label>
            <input id="tinker-aad" type="text" value={associatedData} onChange={(e) => setAssociatedData(e.target.value)} placeholder="Leave empty for Encrypt/Decrypt without associated data" className={inputClass} />
          </div>

          {inputType === "text" ? (
            <div className="max-w-2xl mx-auto">
              <label htmlFor="tinker-input" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
                {mode === "encrypt" ? "Data to Encrypt" : "Ciphertext to Decrypt (base64)"}
              </label>
              <textarea
                id="tinker-input"
                value={textInput[mode]}
                onChange={(e) => setTextInput((prev) => ({ ...prev, [mode]: e.target.value }))}
                placeholder={mode === "encrypt" ? "Enter data to encrypt" : "Enter base64-encoded Tink ciphertext"}
                rows={4}
                className={`${inputClass} resize-y`}
              />
            </div>
          ) : (
            <>
              <div className="max-w-2xl mx-auto">
                <label htmlFor="tinker-file" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
                  File to {verb}
                </label>
                <input key={mode} id="tinker-file" type="file" onChange={handleFileChange} className={fileInputClass} />
                {file[mode] && (
                  <p className="mt-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                    Selected: <span className="font-medium text-black dark:text-zinc-50">{file[mode]!.name}</span>
                  </p>
                )}
              </div>
              {file[mode] && (
                <div className="max-w-2xl mx-auto">
                  <label htmlFor="tinker-output-name" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
                    Output File Name (optional)
                  </label>
                  <input id="tinker-output-name" type="text" value={outputName[mode]} onChange={(e) => setOutputName((prev) => ({ ...prev, [mode]: e.target.value }))} className={inputClass} />
                </div>
              )}
            </>
          )}

          <div className="max-w-2xl mx-auto space-y-2">
            <button onClick={handleRun} disabled={loading || !wasmReady} className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all active:scale-98 active:bg-blue-800 disabled:active:scale-100">
              {loading ? `${verb}ing...` : `${verb}${inputType === "file" ? " File" : ""}`}
            </button>
            {inputType === "file" && fileResult[mode] && (
              <button onClick={handleDownload} className="w-full px-4 py-2 text-sm bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-all active:scale-98 active:bg-green-800">
                Download {mode === "encrypt" ? "Encrypted" : "Decrypted"} File
              </button>
            )}
          </div>
        </div>
      )}

      {inputType === "text" && textResult[mode] && (
        <div className="mt-4 max-w-2xl mx-auto">
          <label className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">{mode === "encrypt" ? "Encrypted Result (base64)" : "Decrypted Result"}</label>
          <div className="flex gap-2 items-stretch">
            <div className="flex-1 min-w-0 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700 flex items-center">
              <code className="text-xs text-black dark:text-zinc-50 break-all font-mono w-full whitespace-pre-wrap" title={textResult[mode]}>
                {textResult[mode]}
              </code>
            </div>
            <CopyIconButton onClick={() => navigator.clipboard.writeText(mode === "encrypt" ? textResult[mode].trim() : textResult[mode])} title="Copy result" />
          </div>
        </div>
      )}
    </div>
  );
}
