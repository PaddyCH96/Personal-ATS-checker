import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  serverExternalPackages: ['pdf-parse', 'canvas', 'pdfjs-dist'],
};

export default nextConfig;
