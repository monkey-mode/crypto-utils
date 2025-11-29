// WASM module loader
export async function loadWasmModule() {
  if (typeof window === "undefined") {
    // Server-side: return a mock or throw error
    throw new Error("WASM modules can only be loaded on the client side");
  }

  try {
    // Import the WASM module
    // This will be generated after building the Rust project with wasm-pack
    // The WASM module is built directly into frontend/wasm/pkg
    const wasmModule = await import("../../wasm/pkg/mfoa_hash_wasm");
    await wasmModule.default();
    return wasmModule;
  } catch (error) {
    console.error("Failed to load WASM module:", error);
    throw error;
  }
}
