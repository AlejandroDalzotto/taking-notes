// Run with: node --test src/stores/settings.test.cjs
// Exercise real Zustand persistence with in-memory localStorage, not a fake store.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const { persist, createJSONStorage } = require("zustand/middleware");

const storageKey = "taking-notes-settings";
function memoryStorage(saved) {
  const values = new Map(saved === undefined ? [] : [[storageKey, saved]]);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

function loadSettings(storage = memoryStorage()) {
  const fullPath = path.resolve(__dirname, "settings.ts");
  const { outputText } = ts.transpileModule(readFileSync(fullPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: fullPath,
  });
  const module = { exports: {} };
  const execute = vm.runInThisContext(`(function(require, module, exports) {\n${outputText}\n})`, { filename: fullPath });
  execute((name) => name === "zustand/middleware" ? {
    persist: (initializer, options) => persist(initializer, {
      ...options,
      storage: createJSONStorage(() => storage),
    }),
  } : require(name), module, module.exports);
  return { ...module.exports, storage };
}
const preferences = (store) => {
  const { theme, sidebarOpen, editorFontSize } = store.getState();
  return { theme, sidebarOpen, editorFontSize };
};

test("settings default to dark, an open sidebar, and a 16px editor font", () => {
  const { useSettingsStore: store } = loadSettings();
  assert.equal(store.persist.hasHydrated(), true);
  assert.deepEqual(preferences(store), { theme: "dark", sidebarOpen: true, editorFontSize: 16 });
});

test("each theme, sidebar visibility, and font size persist and reload with working actions", () => {
  const storage = memoryStorage();
  for (const theme of ["light", "dark", "cream"]) {
    const { useSettingsStore: store } = loadSettings(storage);
    const actions = store.getState().actions;
    actions.setTheme(theme);
    actions.toggleSidebar();
    actions.increaseEditorFontSize(2);
    const expected = preferences(store);
    const saved = JSON.parse(storage.getItem(storageKey));
    assert.deepEqual(saved, { state: expected, version: 1 });
    assert.equal(Object.hasOwn(saved.state, "actions"), false);

    const { useSettingsStore: reloaded } = loadSettings(storage);
    assert.deepEqual(preferences(reloaded), expected);
    assert.equal(reloaded.getState().theme, theme);
    reloaded.getState().actions.toggleSidebar();
    reloaded.getState().actions.decreaseEditorFontSize(1);
    assert.equal(reloaded.getState().sidebarOpen, !expected.sidebarOpen);
    assert.equal(reloaded.getState().editorFontSize, expected.editorFontSize - 1);
  }
});

test("font actions clamp to 12–32px and reset persists the default", () => {
  const { useSettingsStore: store, storage } = loadSettings();
  const actions = store.getState().actions;
  actions.increaseEditorFontSize(100);
  assert.equal(store.getState().editorFontSize, 32);
  assert.equal(loadSettings(storage).useSettingsStore.getState().editorFontSize, 32);
  actions.decreaseEditorFontSize(100);
  assert.equal(store.getState().editorFontSize, 12);
  assert.equal(loadSettings(storage).useSettingsStore.getState().editorFontSize, 12);
  actions.resetFontSize();
  assert.equal(loadSettings(storage).useSettingsStore.getState().editorFontSize, 16);
});

test("invalid saved themes/sidebar values default and numeric font sizes clamp on hydration", () => {
  for (const [editorFontSize, expectedFont] of [[-100, 12], [100, 32], ["24", 16], [null, 16]]) {
    const storage = memoryStorage(JSON.stringify({
      version: 1,
      state: { theme: "sepia", sidebarOpen: "false", editorFontSize, actions: { resetFontSize: "invalid" } },
    }));
    const { useSettingsStore: store } = loadSettings(storage);
    assert.deepEqual(preferences(store), { theme: "dark", sidebarOpen: true, editorFontSize: expectedFont });
    assert.equal(typeof store.getState().actions.resetFontSize, "function");
    store.getState().actions.resetFontSize();
    assert.equal(loadSettings(storage).useSettingsStore.getState().editorFontSize, 16);
  }
});

test("non-finite saved font sizes and absent or malformed preference objects use defaults", () => {
  const savedStates = ["null", "{}", '"invalid"', '{"editorFontSize":1e309}', '{"editorFontSize":-1e309}'];
  for (const state of savedStates) {
    const storage = memoryStorage(`{"version":1,"state":${state}}`);
    const { useSettingsStore: store } = loadSettings(storage);
    assert.deepEqual(preferences(store), { theme: "dark", sidebarOpen: true, editorFontSize: 16 });
    assert.equal(typeof store.getState().actions.setTheme, "function");
  }
});
