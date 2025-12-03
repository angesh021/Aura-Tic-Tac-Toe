
// Robustly get the API URL.
// In production (Vite build), import.meta.env.VITE_API_URL is replaced with the string value.
// In development, it defaults to localhost.

let envUrl = 'http://localhost:3000';

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

export const API_URL = normalizedUrl.endsWith('/api') ? normalizedUrl : `${normalizedUrl}/api`;
export const SERVER_URL = API_URL.replace(/\/api$/, '');
