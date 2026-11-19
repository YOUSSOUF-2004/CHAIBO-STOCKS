import { build } from "esbuild";
import assert from "node:assert/strict";
import React from "react";
import { create, act } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
await build({
  entryPoints: ["src/App.jsx"],
  bundle: true,
  define: { "import.meta.env.VITE_API_MODE": '"demo"' },
  platform: "node",
  format: "esm",
  packages: "external",
  outfile: "node_modules/.cache/photo-app.mjs",
});
const { default: App } = await import("../node_modules/.cache/photo-app.mjs");
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function storage() {
  const values = new Map();
  return {
    getItem: (k) => values.get(k) ?? null,
    setItem: (k, v) => values.set(k, v),
  };
}
globalThis.localStorage = storage();
globalThis.sessionStorage = storage();
sessionStorage.setItem("chaibo-session", '"client"');
globalThis.window = { scrollTo() {} };
globalThis.FormData = class {
  constructor(data) {
    this.data = data;
  }
  *[Symbol.iterator]() {
    yield* Object.entries(this.data);
  }
};
let imageMode = "ok",
  revoked = 0,
  drawArgs;
URL.createObjectURL = () => "blob:test-photo";
URL.revokeObjectURL = () => revoked++;
globalThis.Image = class {
  naturalWidth = 800;
  naturalHeight = 600;
  set src(value) {
    queueMicrotask(() => (imageMode === "ok" ? this.onload() : this.onerror()));
  }
};
const data = "data:image/jpeg;base64,dGVzdA==";
globalThis.document = {
  createElement(tag) {
    assert.equal(tag, "canvas");
    return {
      getContext: () => ({
        fillRect() {},
        drawImage(...args) {
          drawArgs = args;
        },
      }),
      toDataURL: () => data,
    };
  },
};
let view;
async function mount(path = "/profil") {
  if (view) await act(() => view.unmount());
  await act(() => {
    view = create(
      React.createElement(
        MemoryRouter,
        { initialEntries: [path] },
        React.createElement(App),
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
async function upload(file) {
  await act(async () => {
    await view.root
      .findByProps({ type: "file" })
      .props.onChange({ target: { files: [file], value: "file" } });
  });
}
await mount();
await upload({ type: "image/jpeg", size: 1024 });
assert.equal(JSON.parse(localStorage.getItem("chaibo-profile")).photo, data);
assert.equal(view.root.findAllByType("img").length, 2);
assert.deepEqual(drawArgs.slice(1), [100, 0, 600, 600, 0, 0, 384, 384]);
assert.equal(revoked, 1);
console.log(
  "PASS image compressed, centered and displayed in profile and header",
);
await act(() =>
  view.root.findByType("form").props.onSubmit({
    preventDefault() {},
    currentTarget: {
      name: "Nouveau Nom",
      phone: "+23566112233",
      email: "test@example.com",
    },
  }),
);
assert.equal(JSON.parse(localStorage.getItem("chaibo-profile")).photo, data);
console.log("PASS saving personal details preserves photo");
await mount();
assert.equal(view.root.findAllByType("img").length, 2);
console.log("PASS photo restored after remount");
await upload({ type: "application/pdf", size: 1 });
assert.match(text(view.toJSON()), /Choisissez une image/);
await upload({ type: "image/png", size: 6 * 1024 * 1024 });
assert.match(text(view.toJSON()), /5 Mo/);
imageMode = "bad";
await upload({ type: "image/png", size: 100 });
assert.match(text(view.toJSON()), /illisible/);
assert.equal(JSON.parse(localStorage.getItem("chaibo-profile")).photo, data);
assert.equal(revoked, 2);
console.log(
  "PASS invalid type, oversized and corrupt files retain existing photo",
);
imageMode = "ok";
const original = localStorage.setItem;
localStorage.setItem = () => {
  throw new Error("quota");
};
await upload({ type: "image/webp", size: 100 });
assert.match(text(view.toJSON()), /stockage/);
assert.equal(view.root.findAllByType("img").length, 2);
localStorage.setItem = original;
console.log("PASS storage failure is reported without losing photo");
await act(() =>
  view.root
    .findAllByType("button")
    .find((b) => text(b).includes("Supprimer la photo"))
    .props.onClick(),
);
assert.equal(JSON.parse(localStorage.getItem("chaibo-profile")).photo, "");
assert.equal(view.root.findAllByType("img").length, 0);
await mount();
assert.equal(view.root.findAllByType("img").length, 0);
console.log("PASS removal persists and restores initials");
sessionStorage.setItem("chaibo-session", '"admin"');
await mount("/parametres");
await upload({ type: "image/webp", size: 100 });
assert.equal(view.root.findAllByType("img").length, 2);
await act(() => view.unmount());
console.log("PASS photo controls available in administrator settings");
