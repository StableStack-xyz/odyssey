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

// Netlify environment variable
const authBaseUrl = (process.env.VITE_REACT_APP_AUTH_BASE_URL || '').trim();

if (!authBaseUrl || authBaseUrl.startsWith('http://localhost') || authBaseUrl.startsWith('http://127.0.0.1')) {
  console.log('[generate-redirects] No remote VITE_REACT_APP_AUTH_BASE_URL provided. Keeping default _redirects.');
  process.exit(0);
}

const cleanAuthUrl = authBaseUrl.replace(/\/+$/, '');
const authRule = `/api/auth/*  ${cleanAuthUrl}/:splat  200!`;

let currentContent = '';
if (fs.existsSync(distRedirectsPath)) {
  currentContent = fs.readFileSync(distRedirectsPath, 'utf-8');
} else {
  // Fallback defaults if dist/client/_redirects wasn't generated yet
  currentContent = '/api/*  /.netlify/functions/api  200\n/*      /index.html              200\n';
}

// Avoid duplicate prepend if script runs multiple times
if (!currentContent.includes('/api/auth/*')) {
  const updatedContent = `${authRule}\n${currentContent}`;
  fs.writeFileSync(distRedirectsPath, updatedContent.trim() + '\n', 'utf-8');
  console.log(`[generate-redirects] Successfully prepended proxy rule:\n  ${authRule}`);
} else {
  console.log('[generate-redirects] /api/auth/* rule already present in _redirects.');
}
