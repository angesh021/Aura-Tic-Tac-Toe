
// Robustly get the API URL.
// In production (Vite build), import.meta.env.VITE_API_URL is replaced with the string value.
// In development, we default to an empty string to allow the Vite proxy (setup in vite.config.ts)
// to handle the request. This avoids CORS issues by making requests relative (e.g. /api/...)
// rather than absolute (e.g. http://localhost:3000/api/...).

// Try to read the API URL from Vite env first.
// In production, Vite inlines import.meta.env.VITE_API_URL at build time.
let envUrl = '';

try {
  const meta = import.meta as any;
  if (meta?.env?.VITE_API_URL) {
    envUrl = meta.env.VITE_API_URL as string;
  }
} catch (e) {
  console.warn('Failed to load VITE_API_URL', e);
}

// If VITE_API_URL is not set, add a safe runtime fallback for Render.
if (!envUrl && typeof window !== 'undefined') {
  const hostname = window.location.hostname;
  // Handle standard and specific typo-ed production URLs
  if (
    hostname === 'aura-tic-tac-toe-frontend.onrender.com' || 
    hostname === 'aura-tic-tac-toe-froentend.onrender.com'
  ) {
    envUrl = 'https://aura-tic-tac-toe.onrender.com';
  }
  // You could add other hostnames here later if you get a custom domain.
}

// Normalize: remove trailing slash if present
const normalizedUrl = envUrl.replace(/\/$/, '');

// If normalizedUrl is empty, API_URL will stay as '/api' (useful in dev with Vite proxy).
export const API_URL =
  normalizedUrl === ''
    ? '/api'
    : normalizedUrl.endsWith('/api')
    ? normalizedUrl
    : `${normalizedUrl}/api`;

// SERVER_URL is just the base origin (no /api at the end).
export const SERVER_URL =
  normalizedUrl === '' ? '' : normalizedUrl.replace(/\/api$/, '');

console.log(`[Config] API_URL configured as: ${API_URL}`);
console.log(`[Config] SERVER_URL configured as: ${SERVER_URL}`);
