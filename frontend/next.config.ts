import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack configuration (Next.js 16 default)
  turbopack: {
    // Turbopack supports WASM by default
  },
  // Webpack configuration (fallback for compatibility)
  webpack: (config, { isServer }) => {
    // Enable WASM support
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true
    };

    // Add fallback for Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false
      };
    }

    return config;
  }
};

export default nextConfig;
