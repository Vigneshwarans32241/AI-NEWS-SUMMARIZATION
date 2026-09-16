// API Configuration
// In development: defaults to http://localhost:8000
// In production: defaults to '' (relative path) if served alongside backend,
// or uses VITE_API_URL when set (e.g. decoupled deployment on Vercel)
export const getApiBaseUrl = () => {
    if (import.meta.env.VITE_API_URL !== undefined && import.meta.env.VITE_API_URL !== '') {
        return import.meta.env.VITE_API_URL;
    }
    return import.meta.env.DEV ? 'http://localhost:8000' : '';
};

export default getApiBaseUrl;
