import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow access from this machine's LAN address while running `next dev`.
  allowedDevOrigins: ['192.168.1.2'],
  // pdf-parse loads its pdf.js worker at runtime and must not be folded into
  // Turbopack's server chunks.
  serverExternalPackages: ['pdf-parse'],
};

export default nextConfig;
