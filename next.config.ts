import type { NextConfig } from 'next';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

const nextConfig: NextConfig = {
  // Prevent Turbopack from mistaking the App Router directory for the project
  // root when the project is launched from an IDE or a parent directory.
  turbopack: {
    root: projectRoot,
  },
  // Allow access from this machine's LAN address while running `next dev`.
  allowedDevOrigins: ['192.168.1.2'],
  // Native canvas and PDF parsing are loaded only in Node.js API routes.
  serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist'],
};

export default nextConfig;
