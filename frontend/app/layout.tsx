import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { WasmProvider } from "./contexts/WasmContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  title: "String Hasher with Salt",
  description: "Hash strings with salt using Rust WASM"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`} suppressHydrationWarning>
        <WasmProvider>{children}</WasmProvider>
      </body>
    </html>
  );
}
