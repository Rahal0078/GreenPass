// API origin for all backend calls.
// Set VITE_API_URL in your deployment environment (e.g. https://api.example.com).
// Falls back to '' (same-origin) when not set — correct for the Replit dev proxy.
export const API_BASE = (import.meta.env.VITE_API_URL ?? "").replace(/\/+$/, "");
