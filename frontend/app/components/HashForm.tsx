"use client";

import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useWasm } from "../contexts/WasmContext";
import HashResultRow from "./HashResultRow";
import InputRow from "./InputRow";
import ModeToggle from "./ModeToggle";

type HashMode = "single" | "multiple";

const STORAGE_KEY_HASH_MODE = "mfoa-utils-hash-mode";

export default function HashForm() {
  const { wasmReady, wasmModule, error: wasmError } = useWasm();
  const [mode, setMode] = useState<HashMode>("single");
  const [input, setInput] = useState("");
  const [inputs, setInputs] = useState<string[]>([""]);
  const [salt, setSalt] = useState("");
  const [hash, setHash] = useState("");
  const [hashes, setHashes] = useState<Array<{ value: string; hash: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Load saved mode from localStorage and mark as mounted
  // Using useLayoutEffect to synchronously update before paint to avoid hydration mismatch
  useLayoutEffect(() => {
    const savedMode = localStorage.getItem(STORAGE_KEY_HASH_MODE);
    startTransition(() => {
      if (savedMode === "single" || savedMode === "multiple") {
        setMode(savedMode);
      }
      setMounted(true);
    });
  }, []);

  // Save mode to localStorage when it changes (only after mount)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY_HASH_MODE, mode);
    }
  }, [mode, mounted]);
  const inputScrollRef = useRef<HTMLDivElement>(null);
  const resultScrollRef = useRef<HTMLDivElement>(null);
  const isScrolling = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (wasmError) {
      setError(wasmError);
    }
  }, [wasmError]);

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

    // Clear previous results only for the current mode
    if (mode === "single") {
      setHash(""); // Clear previous single mode hash
    } else {
      setHashes([]); // Clear previous multiple mode hashes
    }

    if (!wasmModule) {
      setError("WASM module is not loaded yet");
      setLoading(false);
      return;
    }

    try {
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
    // Scroll to bottom after adding new field
    setTimeout(() => {
      if (inputScrollRef.current) {
        inputScrollRef.current.scrollTop = inputScrollRef.current.scrollHeight;
      }
      if (resultScrollRef.current) {
        resultScrollRef.current.scrollTop = resultScrollRef.current.scrollHeight;
      }
    }, 0);
  };

  const removeInputField = (index: number) => {
    if (inputs.length > 1) {
      setInputs(inputs.filter((_, i) => i !== index));
    }
  };

  const clearAllInputs = () => {
    setInputs([""]);
    setHashes([]);
    setError(null);
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

  const handleModeChange = (newMode: HashMode): void => {
    setMode(newMode);
    setError(null);
    if (newMode === "multiple" && inputs.length === 0) {
      setInputs([""]);
    }
    // Mode is saved to localStorage via useEffect
  };

  const handleCopy = (textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
  };

  const handleCopyAll = () => {
    if (hashes.length === 0) return;
    const allHashes = hashes.map((item) => item.hash).join("\n");
    navigator.clipboard.writeText(allHashes);
  };

  // Synchronize scrolling between input and result sections
  useEffect(() => {
    const inputScroll = inputScrollRef.current;
    const resultScroll = resultScrollRef.current;

    if (!inputScroll || !resultScroll) return;

    const handleInputScroll = () => {
      if (!isScrolling.current) {
        isScrolling.current = true;
        resultScroll.scrollTop = inputScroll.scrollTop;
        requestAnimationFrame(() => {
          isScrolling.current = false;
        });
      }
    };

    const handleResultScroll = () => {
      if (!isScrolling.current) {
        isScrolling.current = true;
        inputScroll.scrollTop = resultScroll.scrollTop;
        requestAnimationFrame(() => {
          isScrolling.current = false;
        });
      }
    };

    inputScroll.addEventListener("scroll", handleInputScroll);
    resultScroll.addEventListener("scroll", handleResultScroll);

    return () => {
      inputScroll.removeEventListener("scroll", handleInputScroll);
      resultScroll.removeEventListener("scroll", handleResultScroll);
    };
  }, [mode]);

  return (
    <div className="w-full space-y-5">
      <div className="text-center mb-3 max-w-2xl mx-auto">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-1.5">String Hasher with Salt</h2>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">Hash strings using SHA-256 with salt</p>
      </div>

      {mounted && !wasmReady && !error && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 max-w-2xl mx-auto">
          <p className="text-sm text-blue-800 dark:text-blue-200">Loading WASM module...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 max-w-2xl mx-auto">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      <div className="space-y-3 mx-auto">
        <ModeToggle mode={mode} onModeChange={handleModeChange} />

        {/* Single Value Mode */}
        {mode === "single" && (
          <div className="max-w-2xl mx-auto">
            <label htmlFor="input" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
              Input String
            </label>
            <textarea id="input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Enter string to hash" rows={4} className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 resize-y" />
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5">Supports newlines in the input string.</p>
          </div>
        )}

        {/* Multiple Values Mode */}
        {mode === "multiple" && (
          <div className="space-y-2 mx-auto max-w-5xl">
            <div className="flex gap-4">
              {/* Left Half - Input Section */}
              <div className="w-1/2 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-black dark:text-zinc-50">Input Values</label>
                  <div className="flex gap-3">
                    <button onClick={clearAllInputs} className="text-xs text-red-600 dark:text-red-400 hover:underline font-medium active:opacity-70 transition-opacity">
                      Clear All
                    </button>
                    <button onClick={addInputField} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium active:opacity-70 transition-opacity">
                      + Add Value
                    </button>
                  </div>
                </div>
                <div ref={inputScrollRef} className="max-h-64 overflow-y-auto space-y-2 py-1 px-1 hide-scrollbar">
                  {inputs.map((value, index) => (
                    <InputRow key={index} index={index} value={value} onChange={(newValue) => updateInput(index, newValue)} onPaste={(e) => handlePaste(e, index)} onRemove={() => removeInputField(index)} canRemove={inputs.length > 1} />
                  ))}
                </div>
              </div>

              {/* Right Half - Result Section */}
              <div className="w-1/2 min-w-0 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-black dark:text-zinc-50">Hash Results (SHA-256)</label>
                  {hashes.length > 0 && (
                    <button onClick={handleCopyAll} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium active:opacity-70 transition-opacity">
                      Copy All
                    </button>
                  )}
                </div>
                <div ref={resultScrollRef} className="max-h-64 overflow-y-auto space-y-2 py-1 px-1 hide-scrollbar">
                  {inputs.map((value, index) => {
                    const hashResult = hashes.find((h) => h.value === value && value.trim() !== "")?.hash;
                    return (
                      <div key={index} className="flex gap-2 items-stretch">
                        <HashResultRow hash={hashResult} onCopy={() => hashResult && handleCopy(hashResult)} />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">Each value will be hashed individually with the salt. Paste text with newlines to automatically split into multiple values.</p>
          </div>
        )}

        <div className="max-w-2xl mx-auto">
          <label htmlFor="salt" className="block text-xs font-medium text-black dark:text-zinc-50 mb-1.5">
            Salt
          </label>
          <input id="salt" type="text" value={salt} onChange={(e) => setSalt(e.target.value)} placeholder="Enter salt" className="w-full px-3 py-2 text-sm rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400" />
        </div>

        <div className="max-w-2xl mx-auto">
          <button onClick={handleHash} disabled={loading || !wasmReady} className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-all active:scale-98 active:bg-blue-800 disabled:active:scale-100">
            {loading ? "Hashing..." : mode === "single" ? "Hash String" : "Hash Multiple Values"}
          </button>
        </div>
      </div>

      {/* Single Mode Result */}
      {mode === "single" && hash && (
        <div className="mt-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-medium text-black dark:text-zinc-50">Hash Result (SHA-256)</label>
            <button onClick={() => handleCopy(hash)} className="text-blue-600 dark:text-blue-400 hover:opacity-80 active:opacity-60 active:scale-95 transition-all" title="Copy hash">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>
          <div className="max-h-64 overflow-y-auto p-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-300 dark:border-zinc-700">
            <code className="text-xs text-black dark:text-zinc-50 break-all font-mono">{hash}</code>
          </div>
        </div>
      )}
    </div>
  );
}
