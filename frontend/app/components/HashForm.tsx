"use client";

import { useEffect, useState } from "react";
import { loadWasmModule } from "../utils/wasm-loader";

type HashMode = "single" | "multiple";

export default function HashForm() {
  const [mode, setMode] = useState<HashMode>("single");
  const [input, setInput] = useState("");
  const [inputs, setInputs] = useState<string[]>([""]);
  const [salt, setSalt] = useState("");
  const [hash, setHash] = useState("");
  const [hashes, setHashes] = useState<Array<{ value: string; hash: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Ensure this only runs on client
    setMounted(true);
    // Load WASM module on component mount
    loadWasmModule()
      .then(() => {
        setWasmReady(true);
        setError(null);
      })
      .catch((err) => {
        setError("Failed to load WASM module. Please build the WASM module first.");
        console.error(err);
      });
  }, []);

  const handleHash = async () => {
    if (!salt.trim()) {
      setError("Please enter a salt");
      return;
    }

    if (mode === "single") {
      if (!input.trim()) {
        setError("Please enter an input string");
        return;
      }
    } else {
      const validInputs = inputs.filter((i) => i.trim() !== "");
      if (validInputs.length === 0) {
        setError("Please enter at least one input value");
        return;
      }
    }

    if (!wasmReady) {
      setError("WASM module is not ready yet");
      return;
    }

    setLoading(true);
    setError(null);
    setHash(""); // Clear previous hash result
    setHashes([]); // Clear previous hash results

    try {
      const wasmModule = await loadWasmModule();

      if (mode === "single") {
        const result = wasmModule.hash_string(input, salt);
        setHash(result);
      } else {
        // Hash each value individually
        const validInputs = inputs.filter((i) => i.trim() !== "");
        const results = validInputs.map((value) => ({
          value,
          hash: wasmModule.hash_string(value, salt)
        }));
        setHashes(results);
      }
    } catch (err) {
      setError("Failed to hash string. Please check the console for details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addInputField = () => {
    setInputs([...inputs, ""]);
  };

  const removeInputField = (index: number) => {
    if (inputs.length > 1) {
      setInputs(inputs.filter((_, i) => i !== index));
    }
  };

  const updateInput = (index: number, value: string) => {
    const newInputs = [...inputs];
    newInputs[index] = value;
    setInputs(newInputs);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement | HTMLTextAreaElement>, index?: number) => {
    const pastedText = e.clipboardData.getData("text");

    // Only intercept if we're in multiple mode and the text contains newlines
    if (mode === "multiple" && index !== undefined && (pastedText.includes("\n") || pastedText.includes("\r"))) {
      e.preventDefault();
      // Split by newlines and populate multiple fields
      const lines = pastedText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line !== "");

      if (lines.length > 0) {
        const newInputs = [...inputs];
        // Replace from the current index onwards
        newInputs[index] = lines[0] || "";
        // Add remaining lines as new fields
        for (let i = 1; i < lines.length; i++) {
          if (newInputs.length > index + i) {
            newInputs[index + i] = lines[i];
          } else {
            newInputs.push(lines[i]);
          }
        }
        setInputs(newInputs);
      }
    }
    // Otherwise, let the default paste behavior happen (for textarea in single mode or normal input)
  };

  const handleModeChange = (newMode: HashMode) => {
    setMode(newMode);
    setHash("");
    setHashes([]);
    setError(null);
    if (newMode === "multiple" && inputs.length === 0) {
      setInputs([""]);
    }
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-8 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-2">String Hasher with Salt</h1>
        <p className="text-zinc-600 dark:text-zinc-400">Hash strings using SHA-256 with salt (powered by Rust WASM)</p>
      </div>

      {mounted && !wasmReady && !error && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-200">Loading WASM module...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg">
          <button onClick={() => handleModeChange("single")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "single" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
            Single Value
          </button>
          <button onClick={() => handleModeChange("multiple")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${mode === "multiple" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
            Multiple Values
          </button>
        </div>

        {/* Single Value Mode */}
        {mode === "single" && (
          <div>
            <label htmlFor="input" className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
              Input String
            </label>
            <input id="input" type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter string to hash" className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
          </div>
        )}

        {/* Multiple Values Mode */}
        {mode === "multiple" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-medium text-black dark:text-zinc-50">Input Values</label>
              <button onClick={addInputField} className="text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium">
                + Add Value
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto space-y-2 py-1 px-1">
              {inputs.map((value, index) => (
                <div key={index} className="flex gap-2">
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => updateInput(index, e.target.value)}
                    onPaste={(e) => handlePaste(e, index)}
                    placeholder={`Value ${index + 1}`}
                    className="flex-1 min-w-0 px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                  />
                  {inputs.length > 1 && (
                    <button onClick={() => removeInputField(index)} className="px-4 py-3 rounded-lg border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Remove this value">
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Each value will be hashed individually with the salt. Paste text with newlines to automatically split into multiple values.</p>
          </div>
        )}

        <div>
          <label htmlFor="salt" className="block text-sm font-medium text-black dark:text-zinc-50 mb-2">
            Salt
          </label>
          <input id="salt" type="text" value={salt} onChange={(e) => setSalt(e.target.value)} placeholder="Enter salt" className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
        </div>

        <button onClick={handleHash} disabled={loading || !wasmReady} className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors">
          {loading ? "Hashing..." : mode === "single" ? "Hash String" : "Hash Multiple Values"}
        </button>
      </div>

      {/* Single Mode Result */}
      {mode === "single" && hash && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-black dark:text-zinc-50">Hash Result (SHA-256)</label>
            <button onClick={() => handleCopy(hash)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              Copy
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
            <code className="text-sm text-black dark:text-zinc-50 break-all font-mono">{hash}</code>
          </div>
        </div>
      )}

      {/* Multiple Mode Results */}
      {mode === "multiple" && hashes.length > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-black dark:text-zinc-50">Hash Results (SHA-256)</label>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-3">
            {hashes.map((item, index) => (
              <div key={index} className="p-4 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Value {index + 1}:</p>
                    <p className="text-sm text-black dark:text-zinc-50 font-mono break-all">{item.value}</p>
                  </div>
                  <button onClick={() => handleCopy(item.hash)} className="text-sm text-blue-600 dark:text-blue-400 hover:underline whitespace-nowrap" title="Copy hash">
                    Copy
                  </button>
                </div>
                <div className="mt-2">
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-1">Hash:</p>
                </div>
                <code className="text-sm text-black dark:text-zinc-50 break-all font-mono">{item.hash}</code>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
