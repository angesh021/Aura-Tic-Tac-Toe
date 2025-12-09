
// Robustly get the API URL.
// In production (Vite build), import.meta.env.VITE_API_URL is replaced with the string value.
// In development, we default to an empty string to allow the Vite proxy (setup in vite.config.ts)
// to handle the request. This avoids CORS issues by making requests relative (e.g. /api/...)
// rather than absolute (e.g. http://localhost:3000/api/...).

let envUrl = '';

try {
    // Safe access to prevent "Cannot read properties of undefined"
    // Cast to any to avoid TypeScript errors about missing properties on ImportMeta
    const meta = import.meta as any;
    if (meta && meta.env && meta.env.VITE_API_URL) {
        envUrl = meta.env.VITE_API_URL;
    }
} catch (e) {
    console.warn("Failed to load VITE_API_URL", e);
}

// Normalize: Remove trailing slash
const normalizedUrl = envUrl.replace(/\/$/, '');

// If normalizedUrl is empty, API_URL becomes '/api'.
// If normalizedUrl is 'http://...', API_URL becomes 'http://.../api'.
export const API_URL = normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;

// If API_URL is '/api', SERVER_URL becomes ''.
export const SERVER_URL = API_URL.replace(/\/api$/, '');
