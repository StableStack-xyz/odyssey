import fs from 'node:fs';
import path from 'node:path';

// Load .env file locally if present (native in Node 20.6+)
try {
  if (typeof process.loadEnvFile === 'function') {
    process.loadEnvFile();
  }
} catch {
  // Ignore missing .env file
}

const distRedirectsPath = path.resolve(process.cwd(), 'dist/client/_redirects');

// Read upstream gateway URL from Netlify build environment
const gatewayUrl = (
  process.env.INTERNAL_MIDDLEWARE_URL ||
  process.env.VITE_REACT_APP_GATEWAY_URL ||
  ''
).trim();

if (!gatewayUrl || gatewayUrl.startsWith('http://localhost') || gatewayUrl.startsWith('http://127.0.0.1')) {
  console.log('[generate-redirects] No remote gateway URL provided. Using fallback function redirects.');
  process.exit(0);
}

const cleanGatewayUrl = gatewayUrl.replace(/\/+$/, '');

// 200! forces Netlify CDN edge to reverse-proxy directly to internal-middleware
// This bypasses AWS Lambda limits (enabling large file uploads up to 50MB)
const redirectsContent = `/api/*  ${cleanGatewayUrl}/api/:splat  200!\n/*      /index.html  200\n`;

fs.writeFileSync(distRedirectsPath, redirectsContent, 'utf-8');
console.log(`[generate-redirects] Generated CDN proxy rule:\n  /api/* -> ${cleanGatewayUrl}/api/:splat`);
