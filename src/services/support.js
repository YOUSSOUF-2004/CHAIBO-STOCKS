export const SUPPORT_EMAIL =
  import.meta.env?.VITE_SUPPORT_EMAIL || "youssoufchaiboabakaradam@gmail.com";
export const SUPPORT_PHONE =
  import.meta.env?.VITE_SUPPORT_WHATSAPP || "23566009695";
export const WHATSAPP_URL = `https://wa.me/${SUPPORT_PHONE.replace(/\D/g, "")}?text=${encodeURIComponent("Bonjour, je souhaite contacter le support CHAIBO STOCK.")}`;
