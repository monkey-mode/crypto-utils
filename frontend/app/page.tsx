"use client";

import { startTransition, useEffect, useLayoutEffect, useState } from "react";
import EncryptDecryptFileForm from "./components/EncryptDecryptFileForm";
import EncryptDecryptForm from "./components/EncryptDecryptForm";
import GcsUploadForm from "./components/GcsUploadForm";
import HashForm from "./components/HashForm";

type FeatureTab = "feature1" | "feature2" | "feature3" | "feature4";

const STORAGE_KEY_FEATURE = "mfoa-utils-active-feature";
const MIN_DESKTOP_WIDTH = 1024; // Minimum width for desktop (lg breakpoint)

export default function Home() {
  const [activeTab, setActiveTab] = useState<FeatureTab>("feature1");
  const [mounted, setMounted] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  // Check if screen is desktop size
  useEffect(() => {
    const checkScreenSize = () => {
      setIsDesktop(window.innerWidth >= MIN_DESKTOP_WIDTH);
    };

    // Check on mount
    checkScreenSize();

    // Listen for resize events
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Load saved feature from localStorage and mark as mounted
  // Using useLayoutEffect to synchronously update before paint to avoid hydration mismatch
  // This is necessary to prevent hydration mismatches when loading from localStorage
  useLayoutEffect(() => {
    const savedFeature = localStorage.getItem(STORAGE_KEY_FEATURE);
    startTransition(() => {
      if (savedFeature && (savedFeature === "feature1" || savedFeature === "feature2" || savedFeature === "feature3" || savedFeature === "feature4")) {
        setActiveTab(savedFeature as FeatureTab);
      }
      // Smooth transition by delaying mount slightly
      setTimeout(() => {
        setMounted(true);
      }, 50);
    });
  }, []);

  // Save feature to localStorage when it changes (only after mount)
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY_FEATURE, activeTab);
    }
  }, [activeTab, mounted]);

  // Show desktop-only message on mobile/small screens
  if (!isDesktop) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black px-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-2">MFOA Utils</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Utility tools powered by Rust WASM</p>
          </div>
          <div className="bg-zinc-100 dark:bg-zinc-800 rounded-lg p-8 border border-zinc-300 dark:border-zinc-700">
            <div className="text-6xl mb-4">💻</div>
            <h2 className="text-2xl font-semibold text-black dark:text-zinc-50 mb-3">Desktop Only</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mb-4">This application is optimized for desktop browsers and requires a screen width of at least 1024px.</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-500">Please access this site from a desktop or laptop computer for the best experience.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-start justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center py-16 px-4">
        <div className="w-full p-8">
          {/* Fixed Header Section */}
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-2">MFOA Utils</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Utility tools powered by Rust WASM</p>
          </div>

          {/* Feature Tabs */}
          {mounted && (
            <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-6 max-w-4xl mx-auto fade-in">
              <button onClick={() => setActiveTab("feature1")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "feature1" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
                <span className="text-base">🔐</span>
                <span>Hash</span>
              </button>
              <button onClick={() => setActiveTab("feature2")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "feature2" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
                <span className="text-base">🔒</span>
                <span>Encrypt/Decrypt</span>
              </button>
              <button onClick={() => setActiveTab("feature3")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "feature3" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
                <span className="text-base">📁</span>
                <span>Encrypt/Decrypt File</span>
              </button>
              <button onClick={() => setActiveTab("feature4")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "feature4" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
                <span className="text-base">☁️</span>
                <span>GCS Upload</span>
              </button>
            </div>
          )}

          {/* Feature Content - Keep all components mounted to preserve state */}
          {mounted && (
            <>
              <div className={activeTab === "feature1" ? "" : "hidden"}>
                <HashForm />
              </div>

              <div className={activeTab === "feature2" ? "" : "hidden"}>
                <EncryptDecryptForm />
              </div>

              <div className={activeTab === "feature3" ? "" : "hidden"}>
                <EncryptDecryptFileForm />
              </div>

              <div className={activeTab === "feature4" ? "" : "hidden"}>
                <GcsUploadForm />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
