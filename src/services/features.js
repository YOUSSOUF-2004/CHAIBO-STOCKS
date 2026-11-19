// Disabled by default until durable photo storage and messaging are configured.
export const PHOTOS_ENABLED = import.meta.env?.VITE_PHOTOS_ENABLED === "1";
export const MESSAGING_ENABLED = import.meta.env?.VITE_MESSAGING_ENABLED === "1";
