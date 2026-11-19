import { build } from "esbuild";
import assert from "node:assert/strict";
import React from "react";
import { create, act } from "react-test-renderer";
import { MemoryRouter, useNavigate, useLocation } from "react-router-dom";
await build({
  entryPoints: ["src/App.jsx"],
  bundle: true,
  define: { "import.meta.env.VITE_API_MODE": '"demo"' },
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: "node_modules/.cache/test-app.mjs",
});
const { default: App } = await import("../node_modules/.cache/test-app.mjs");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function storage() {
  let data = new Map();
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    clear: () => data.clear(),
  };
}
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
globalThis.window = { scrollTo() {} };
globalThis.FormData = class {
  constructor(data) {
    this.data = data;
  }
  get(k) {
    return this.data?.[k] ?? null;
  }
};
let renderer, navigate, currentPath;
function Probe() {
  navigate = useNavigate();
  currentPath = useLocation().pathname;
  return null;
}
async function mount(route, session = null) {
  if (renderer) await act(() => renderer.unmount());
  if (session !== "preserve") sessionStorage.clear();
  if (session && session !== "preserve")
    sessionStorage.setItem("chaibo-session", JSON.stringify(session));
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
const text = (node) =>
  typeof node === "string"
    ? node
    : Array.isArray(node)
      ? node.map(text).join(" ")
      : node?.children
        ? text(node.children)
        : "";
function findButton(label) {
  return renderer.root
    .findAllByType("button")
    .find((b) => text(b).includes(label));
}
async function click(label) {
  let b = findButton(label);
  assert.ok(b, "Button exists: " + label);
  await act(() => b.props.onClick());
}
const all = [
  ["/accueil", null, "Votre compte."],
  ["/contact",null,"Contactez notre équipe"],
  ["/connexion", null, "Heureux de vous revoir"],
  ["/inscription", null, "Créer un compte"],
  ["/oublie", null, "Mot de passe oublié"],
  ["/dashboard", "client", "Bonjour,"],
  ["/transfert", "client", "Envoyer de l’argent"],
  ["/depot", "client", "Alimenter mon compte"],
  ["/retrait", "client", "Retirer de mon compte"],
  ["/historique", "client", "Historique des opérations"],
  ["/profil", "client", "Mon profil"],
  ["/admin", "admin", "Tableau de bord"],
  ["/clients", "admin", "Gestion des clients"],
  ["/operations", "admin", "Toutes les opérations"],
  ["/parametres", "admin", "Paramètres"],
];
for (let [route, role, title] of all) {
  await mount(route, role);
  assert.equal(currentPath, route);
  assert.ok(text(renderer.toJSON()).includes(title), route + " content");
  console.log("PASS page " + route);
}
await mount("/depot");
assert.equal(currentPath, "/connexion");
console.log("PASS private route redirects to connexion");
await mount("/admin", "client");
assert.equal(currentPath, "/dashboard");
console.log("PASS role navigation guard");
await mount("/accueil");
await click("Connexion");
assert.equal(currentPath, "/connexion");
await click("Créer un compte");
assert.equal(currentPath, "/inscription");
await act(() => navigate(-1));
assert.equal(currentPath, "/connexion");
await click("Ouvrir la démonstration");
assert.equal(currentPath, "/dashboard");
await click("Transfert");
assert.equal(currentPath, "/transfert");
let amount = () =>
  renderer.root.findAllByType("input").find((i) => i.props.type === "number");
await act(() => amount().props.onChange({ target: { value: "200000" } }));
await act(() =>
  renderer.root.findByType("form").props.onSubmit({
    preventDefault() {},
    currentTarget: { beneficiaire: "Amina Saleh" },
  }),
);
assert.ok(text(renderer.toJSON()).includes("solde est insuffisant"));
await act(() => amount().props.onChange({ target: { value: "10000" } }));
await act(() =>
  renderer.root.findByType("form").props.onSubmit({
    preventDefault() {},
    currentTarget: { beneficiaire: "Amina Saleh" },
  }),
);
await click("Confirmer l’opération");
assert.equal(currentPath, "/historique");
assert.equal(JSON.parse(localStorage.getItem("chaibo-balance")), 115000);
assert.ok(text(renderer.toJSON()).includes("Amina Saleh"));
console.log(
  "PASS linked registration/login/demo, back navigation, transfer and balance control",
);
await act(() => navigate("/depot"));
await act(() => amount().props.onChange({ target: { value: "5000" } }));
await act(() =>
  renderer.root
    .findByType("form")
    .props.onSubmit({ preventDefault() {}, currentTarget: {} }),
);
await click("Confirmer l’opération");
assert.equal(JSON.parse(localStorage.getItem("chaibo-balance")), 115000);
await click("Se déconnecter");
await click("Administrateur");
await click("Ouvrir la démonstration");
assert.equal(currentPath, "/admin");
await click("Toutes les opérations");
assert.equal(currentPath, "/operations");
await click("Valider");
assert.equal(JSON.parse(localStorage.getItem("chaibo-balance")), 120000);
console.log("PASS client deposit → admin validation → updated balance");
assert.equal(JSON.parse(sessionStorage.getItem("chaibo-session")), "admin");
await mount("/operations", "preserve");
assert.equal(currentPath, "/operations");
assert.ok(text(renderer.toJSON()).includes("Validé"));
await click("Se déconnecter");
assert.equal(currentPath, "/connexion");
assert.equal(JSON.parse(sessionStorage.getItem("chaibo-session")), null);
console.log("PASS persisted demo state and logout");
await act(() => renderer.unmount());
await mount("/retrait");
await act(() =>
  renderer.root.findByType("form").props.onSubmit({ preventDefault() {} }),
);
assert.equal(currentPath, "/retrait");
await mount("/retrait", "preserve");
assert.equal(currentPath, "/retrait");
console.log("PASS login resumes requested page and session survives remount");
await mount("/inscription");
await act(() =>
  renderer.root.findByType("form").props.onSubmit({
    preventDefault() {},
    currentTarget: {
      name: "Test Client",
      phone: "+23566000000",
      email: "test@example.com",
      password: "abcdef",
      confirm: "different",
    },
  }),
);
assert.ok(text(renderer.toJSON()).includes("ne correspondent pas"));
await act(() =>
  renderer.root.findByType("form").props.onSubmit({
    preventDefault() {},
    currentTarget: {
      name: "Test Client",
      phone: "+23566000000",
      email: "test@example.com",
      password: "abcdef",
      confirm: "abcdef",
    },
  }),
);
assert.equal(currentPath, "/dashboard");
assert.equal(
  JSON.parse(localStorage.getItem("chaibo-profile")).name,
  "Test Client",
);
assert.match(text(renderer.toJSON()), /Bonjour,\s+Test/);
await act(() => renderer.unmount());
console.log("PASS registration linked to client dashboard");
console.log("All route and interaction checks passed.");
