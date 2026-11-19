// Run only against an isolated development/test database. Creates two test clients.
// CHAIBO_TEST_API=http://127.0.0.1:8000 CHAIBO_TEST_ADMIN_PHONE=... CHAIBO_TEST_ADMIN_PASSWORD=... npm run test:api
import { build } from "esbuild";
import assert from "node:assert/strict";
import fs from "node:fs";
import React from "react";
import { create, act } from "react-test-renderer";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
const base = process.env.CHAIBO_TEST_API,
  adminPhone = process.env.CHAIBO_TEST_ADMIN_PHONE,
  adminPassword = process.env.CHAIBO_TEST_ADMIN_PASSWORD;
if (!base || !adminPhone || !adminPassword)
  throw new Error(
    "Définir CHAIBO_TEST_API, CHAIBO_TEST_ADMIN_PHONE et CHAIBO_TEST_ADMIN_PASSWORD pour un serveur de test isolé.",
  );
await build({
  entryPoints: ["src/App.jsx"],
  bundle: true,
  platform: "node",
  format: "esm",
  packages: "external",
  define: { "import.meta.env.VITE_API_MODE": '"api"' },
  outfile: "node_modules/.cache/api-app.mjs",
});
const { default: App } = await import("../node_modules/.cache/api-app.mjs");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.window = { scrollTo() {} };
globalThis.localStorage = {
  getItem() {
    throw Error("API mode must not read local profiles");
  },
  setItem() {
    throw Error("API mode must not write local profiles");
  },
};
globalThis.sessionStorage = globalThis.localStorage;
const originalFetch = globalThis.fetch;
let jar = new Map();
let loseResponseOnce = false;
globalThis.fetch = async (url, options = {}) => {
  const headers = new Headers(options.headers);
  headers.set("Cookie", [...jar].map(([k, v]) => `${k}=${v}`).join("; "));
  if (options.method && options.method !== "GET")
    headers.set("Origin", "http://localhost:5173");
  const result = await originalFetch(new URL(url, base), {
    ...options,
    headers,
  });
  for (const cookie of result.headers.getSetCookie()) {
    const raw = cookie.split(";")[0],
      index = raw.indexOf("=");
    jar.set(raw.slice(0, index), raw.slice(index + 1));
  }
  if (
    loseResponseOnce &&
    options.method === "POST" &&
    String(url) === "/api/operations/"
  ) {
    loseResponseOnce = false;
    throw new Error("Simulated lost response after commit");
  }
  return result;
};
const NativeFormData = globalThis.FormData;
globalThis.FormData = class extends NativeFormData {
  constructor(values) {
    super();
    if (values) for (const [k, v] of Object.entries(values)) this.append(k, v);
  }
};
async function request(path, method = "GET", data) {
  let headers = {};
  if (method !== "GET") {
    let r = await fetch("/api/csrf/");
    headers["X-CSRFToken"] = (await r.json()).csrfToken;
    headers["Content-Type"] = "application/json";
  }
  let r = await fetch("/api/" + path, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
  });
  let body = r.status === 204 ? null : await r.json();
  assert.ok(r.ok, JSON.stringify(body));
  return body;
}
const suffix = String(Date.now()).slice(-7);
const bobPhone = "+2358" + suffix,
  alicePhone = "+2359" + suffix;
const password = "Integration-Client!8274";
await request("auth/register/", "POST", {
  name: "Integration Bob",
  phone: bobPhone,
  email: "bob@example.test",
  password,
});
await request("auth/logout/", "POST");
let renderer, currentPath, navigate;
function Probe() {
  currentPath = useLocation().pathname;
  navigate = useNavigate();
  return null;
}
async function mount(route) {
  if (renderer) await act(() => renderer.unmount());
  await act(() => {
    renderer = create(
      React.createElement(
        MemoryRouter,
        { initialEntries: [route] },
        React.createElement(App),
        React.createElement(Probe),
      ),
    );
  });
}
const text = (n) =>
  typeof n === "string"
    ? n
    : Array.isArray(n)
      ? n.map(text).join(" ")
      : n?.children
        ? text(n.children)
        : "";
async function wait(check, message) {
  for (let i = 0; i < 100; i++) {
    await act(() => new Promise((r) => setTimeout(r, 25)));
    if (check()) return;
  }
  throw Error(message + "\n" + text(renderer.toJSON()));
}
async function click(label) {
  let button = renderer.root
    .findAllByType("button")
    .find((b) => text(b).includes(label));
  assert.ok(button, "Button " + label);
  await act(async () => {
    await button.props.onClick();
  });
}
async function submit(data) {
  await act(async () => {
    await renderer.root
      .findByType("form")
      .props.onSubmit({ preventDefault() {}, currentTarget: data });
  });
}
await mount("/inscription");
await wait(
  () => renderer.root.findAllByType("form").length === 1,
  "registration rendered",
);
assert.ok(!text(renderer.toJSON()).includes("Ouvrir la démonstration"));
assert.ok(!text(renderer.toJSON()).includes("Administrateur"));
await submit({
  name: "Integration Alice",
  phone: alicePhone,
  email: "alice@example.test",
  password,
  confirm: password,
});
await wait(() => currentPath === "/dashboard", "registration redirects");
assert.match(text(renderer.toJSON()), /Bonjour,\s+Integration/);
console.log("PASS React register → authenticated Django session");
await click("Dépôt & retrait");
let amount = () => renderer.root.findByProps({ type: "number" });
await act(() => amount().props.onChange({ target: { value: "15000" } }));
await submit({ reference: "Integration test deposit" });
await click("Confirmer l’opération");
await wait(() => currentPath === "/historique", "deposit history");
assert.ok(text(renderer.toJSON()).includes("En attente"));
await click("Se déconnecter");
await wait(() => currentPath === "/connexion", "logout");
await submit({ phone: adminPhone, password: adminPassword });
await wait(() => currentPath === "/admin", "admin login");
await click("Toutes les opérations");
await click("Valider");
await wait(
  () => !text(renderer.toJSON()).includes("En attente"),
  "admin validates deposit",
);
console.log("PASS real deposit → admin approval");
await click("Se déconnecter");
await wait(() => currentPath === "/connexion", "admin logout");
await submit({ phone: alicePhone, password });
await wait(() => currentPath === "/dashboard", "client login");
assert.equal((await request("me/")).balance, "15000");
await click("Transfert");
await act(() => amount().props.onChange({ target: { value: "4000" } }));
await submit({
  telephone: bobPhone,
  beneficiaire: "Integration Bob",
  reference: "Integration transfer",
});
loseResponseOnce = true;
await click("Confirmer l’opération");
assert.equal(currentPath, "/transfert");
await click("Confirmer l’opération");
await wait(() => currentPath === "/historique", "transfer completed");
assert.equal((await request("me/")).balance, "11000");
console.log(
  "PASS lost response and retry never double-charge the PostgreSQL transfer",
);
await click("Mon profil");
await submit({
  name: "Alice Server",
  phone: alicePhone,
  email: "alice@example.test",
});
await wait(
  () => text(renderer.toJSON()).includes("Alice Server"),
  "profile update",
);
const file = new File(
  [fs.readFileSync("scripts/fixtures/profile.png")],
  "profile.png",
  { type: "image/png" },
);
await act(async () => {
  await renderer.root
    .findByProps({ type: "file" })
    .props.onChange({ target: { files: [file], value: "photo" } });
});
let me = await request("me/");
assert.ok(me.photo.startsWith("/api/users/"));
assert.equal(renderer.root.findAllByType("img").length, 2);
assert.equal((await fetch(me.photo)).status, 200);
await mount("/profil");
await wait(
  () => renderer.root.findAllByType("img").length === 2,
  "server photo restored",
);
console.log("PASS profile and private server photo persist after remount");
await click("Supprimer la photo");
await wait(
  () => renderer.root.findAllByType("img").length === 0,
  "photo removal",
);
await click("Se déconnecter");
await wait(() => currentPath === "/connexion", "logout after profile");
await submit({ phone: bobPhone, password });
await wait(() => currentPath === "/dashboard", "recipient login");
assert.equal((await request("me/")).balance, "4000");
await act(() => navigate("/historique"));
assert.ok(text(renderer.toJSON()).includes("De Alice Server"));
assert.ok(text(renderer.toJSON()).includes("+"));
console.log("PASS recipient sees credited transfer in own history");
await click("Se déconnecter");
await act(() => renderer.unmount());
console.log("All React ↔ Django ↔ PostgreSQL integration checks passed.");
