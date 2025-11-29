"use client";

import { useState } from "react";
import HashForm from "./components/HashForm";

type FeatureTab = "feature1" | "feature2" | "feature3";

export default function Home() {
  const [activeTab, setActiveTab] = useState<FeatureTab>("feature1");

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center justify-center py-16 px-4">
        <div className="w-full p-8 space-y-6">
          <div className="text-center mb-8 max-w-2xl mx-auto">
            <h1 className="text-4xl font-bold text-black dark:text-zinc-50 mb-2">MFOA Utils</h1>
            <p className="text-zinc-600 dark:text-zinc-400">Utility tools powered by Rust WASM</p>
          </div>

          {/* Feature Tabs */}
          <div className="flex gap-2 p-1 bg-zinc-100 dark:bg-zinc-800 rounded-lg mb-6 max-w-2xl mx-auto">
            <button onClick={() => setActiveTab("feature1")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "feature1" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`}>
              <span className="text-base">🔐</span>
              <span>Hash</span>
            </button>
            <button onClick={() => setActiveTab("feature2")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "feature2" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`} disabled>
              <span className="text-base">⚡</span>
              <span>Feature 2</span>
            </button>
            <button onClick={() => setActiveTab("feature3")} className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center justify-center gap-2 ${activeTab === "feature3" ? "bg-white dark:bg-zinc-700 text-black dark:text-zinc-50 shadow-sm" : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50"}`} disabled>
              <span className="text-base">🚀</span>
              <span>Feature 3</span>
            </button>
          </div>

          {/* Feature Content */}
          {activeTab === "feature1" && <HashForm />}

          {activeTab === "feature2" && (
            <div className="text-center py-12">
              <p className="text-zinc-600 dark:text-zinc-400">Feature 2 - Coming Soon</p>
            </div>
          )}

          {activeTab === "feature3" && (
            <div className="text-center py-12">
              <p className="text-zinc-600 dark:text-zinc-400">Feature 3 - Coming Soon</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
