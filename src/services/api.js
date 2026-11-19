export const API_MODE = import.meta.env.VITE_API_MODE !== "demo";
function errorText(value) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.map(errorText).join(" ");
  if (value && typeof value === "object")
    return Object.values(value).map(errorText).join(" ");
  return "Une erreur est survenue.";
}
export async function api(path, { method = "GET", data } = {}) {
  const headers = { Accept: "application/json" };
  if (method !== "GET") {
    const csrf = await fetch("/api/csrf/", {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (!csrf.ok)
      throw new Error("Impossible de préparer la connexion au serveur Django.");
    headers["X-CSRFToken"] = (await csrf.json()).csrfToken;
  }
  const multipart = data instanceof FormData;
  if (data && !multipart) headers["Content-Type"] = "application/json";
  let response;
  try {
    response = await fetch("/api/" + path, {
      method,
      headers,
      credentials: "same-origin",
      cache: "no-store",
      body: data ? (multipart ? data : JSON.stringify(data)) : undefined,
    });
  } catch {
    throw new Error(
      "Le serveur Django est inaccessible. Vérifiez qu’il est démarré.",
    );
  }
  let result = null;
  if (response.status !== 204) {
    try {
      result = await response.json();
    } catch {
      throw new Error(
        "Réponse serveur invalide. Vérifiez le backend Django et le proxy Vite.",
      );
    }
  }
  if (!response.ok) {
    const error = new Error(errorText(result?.errors || result));
    error.status = response.status;
    throw error;
  }
  return result;
}
export async function listAll(path) {
  const rows = [];
  let current = path + (path.includes("?") ? "&" : "?") + "limit=200";
  while (current) {
    const result = await api(current);
    rows.push(...result.results);
    current = result.next ? result.next.split("/api/")[1] : null;
  }
  return rows;
}
export function adaptUser(user) {
  return { ...user, balance: Number(user.balance) };
}
export function adaptOperation(op) {
  return {
    ...op,
    type: op.kind_label,
    amount: Number(op.amount),
    date: op.created_at,
    status: op.status_label,
    name:
      op.kind === "transfer"
        ? op.direction === "credit"
          ? "De " + op.owner_name
          : "À " + op.recipient_name
        : op.kind_label + " — " + op.owner_name,
  };
}
