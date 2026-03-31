// Flexible API base URL for all components.
// Uses VITE_API_URL env var (set at build time), falls back to relative "/api".
// On production behind nginx, relative paths are proxied to the backend.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default API_BASE_URL;
