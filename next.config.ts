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
  // pdf-parse loads its pdf.js worker at runtime and must not be folded into
  // Turbopack's server chunks.
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
