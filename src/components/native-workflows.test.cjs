// Run with: node --test src/components/native-workflows.test.cjs
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function mount(filename, mocks) {
  const effects = [];
  const fullPath = path.resolve(__dirname, filename);
  const { outputText } = ts.transpileModule(readFileSync(fullPath, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: fullPath,
  });
  const jsx = (type, props) => ({ type, props });
  const dependencies = {
    react: { useEffect: (effect) => effects.push(effect), useRef: (current) => ({ current }) },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    ...mocks,
  };
  const module = { exports: {} };
  const execute = vm.runInThisContext(`(function(require, module, exports) {\n${outputText}\n})`, { filename: fullPath });
  execute((name) => {
    assert.ok(Object.hasOwn(dependencies, name), `Unexpected import: ${name}`);
    return dependencies[name];
  }, module, module.exports);
  const rendered = module.exports.default();
  const cleanups = effects.map((effect) => effect());
  return { rendered, cleanup: () => cleanups.forEach((cleanup) => cleanup?.()) };
}

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

function externalHarness(options = {}) {
  const calls = [];
  const queue = [];
  let listener;
  let state = {};
  const unlisten = () => calls.push("unlisten");
  const component = mount("external-file-listener.tsx", {
    "@tauri-apps/api/event": {
      listen: (event, callback) => {
        assert.equal(event, "open-files");
        calls.push("listen");
        listener = callback;
        return options.registration ?? Promise.resolve(unlisten);
      },
    },
    "react-router": { useNavigate: () => (route) => calls.push(`navigate:${route}`) },
    "@/lib/commands": {
      takeCliFilePaths: async () => {
        calls.push("drain");
        return queue.splice(0);
      },
    },
    "@/stores/migration": { useMigrationStatus: () => options.migrationStatus ?? "complete" },
    "@/stores/editor": {
      useEditorActions: () => ({
        initialize: () => { calls.push("initialize"); return options.initialization ?? Promise.resolve(); },
        openByPath: async (file) => { calls.push(`open:${file}`); await options.open?.(file); },
      }),
      useEditorStore: { setState: (update) => { state = { ...state, ...update }; } },
    },
  });
  return { ...component, calls, queue, notify: () => listener(), unlisten, state: () => state };
}

test("launch listener registers before initialization and retains notifications during initialization", async () => {
  const registration = deferred();
  const initialization = deferred();
  const h = externalHarness({ registration: registration.promise, initialization: initialization.promise });
  assert.deepEqual(h.calls, ["listen"]);
  registration.resolve(h.unlisten);
  await tick();
  assert.deepEqual(h.calls, ["listen", "initialize"]);

  // Native paths remain queued; notifications must not drain before recovery finishes.
  h.queue.push("C:/during-init.txt");
  h.notify();
  await tick();
  assert.deepEqual(h.calls, ["listen", "initialize"]);
  initialization.resolve();
  await tick();
  assert.deepEqual(h.calls, ["listen", "initialize", "drain", "open:C:/during-init.txt", "navigate:/"]);
  h.cleanup();
  assert.equal(h.calls.at(-1), "unlisten");
});

test("launch drains and each file open run serially across notifications", async () => {
  const firstOpen = deferred();
  const h = externalHarness({ open: (file) => file === "first.txt" ? firstOpen.promise : undefined });
  h.queue.push("first.txt", "second.txt");
  await tick();
  assert.deepEqual(h.calls, ["listen", "initialize", "drain", "open:first.txt"]);
  h.queue.push("third.txt");
  h.notify();
  h.notify();
  await tick();
  assert.equal(h.calls.filter((call) => call === "drain").length, 1);
  assert.ok(!h.calls.includes("open:second.txt"));

  firstOpen.resolve();
  await tick();
  assert.deepEqual(h.calls, [
    "listen", "initialize", "drain", "open:first.txt", "open:second.txt", "navigate:/",
    "drain", "open:third.txt", "navigate:/", "drain",
  ]);
  h.cleanup();
});

test("launch cleanup disposes a listener whose registration resolves after unmount", async () => {
  const registration = deferred();
  const h = externalHarness({ registration: registration.promise });
  h.cleanup();
  registration.resolve(h.unlisten);
  await tick();
  h.notify();
  await tick();
  assert.deepEqual(h.calls, ["listen", "unlisten"]);
});

test("launch cleanup during initialization prevents draining or navigation", async () => {
  const initialization = deferred();
  const h = externalHarness({ initialization: initialization.promise });
  await tick();
  h.queue.push("kept.txt");
  h.cleanup();
  initialization.resolve();
  h.notify();
  await tick();
  assert.deepEqual(h.calls, ["listen", "initialize", "unlisten"]);
  assert.deepEqual(h.queue, ["kept.txt"]);
});

test("launch listener waits for migration before registering or initializing", () => {
  for (const migrationStatus of ["idle", "checking", "error"]) {
    const h = externalHarness({ migrationStatus });
    assert.deepEqual(h.calls, []);
    h.cleanup();
  }
});

function windowHarness(options = {}) {
  const calls = [];
  let handler;
  let state = { initializationError: options.initializationError ?? null };
  const component = mount("window-controls.tsx", {
    "@tauri-apps/api/window": {
      getCurrentWindow: () => ({
        onCloseRequested: (callback) => {
          calls.push("listen");
          handler = callback;
          return Promise.resolve(() => calls.push("unlisten"));
        },
        destroy: async () => { calls.push("destroy"); },
        minimize: async () => { calls.push("minimize"); },
        toggleMaximize: async () => { calls.push("toggleMaximize"); },
        close: async () => { calls.push("close"); },
      }),
    },
    "lucide-react": { Minus: () => null, Square: () => null, X: () => null },
    "@tauri-apps/plugin-dialog": {
      ask: (message, dialogOptions) => {
        calls.push("ask");
        assert.match(message, /recovery/i);
        assert.equal(dialogOptions.kind, "warning");
        return options.confirmation ?? Promise.resolve(false);
      },
    },
    "@/stores/migration": { useMigrationStatus: () => options.migrationStatus ?? "complete" },
    "@/stores/editor": {
      useEditorActions: () => ({ persistSession: () => { calls.push("persist"); return options.persist?.() ?? Promise.resolve(); } }),
      useEditorStore: {
        getState: () => state,
        setState: (update) => { state = { ...state, ...update }; },
      },
    },
  });
  const requestClose = () => {
    let prevented = false;
    handler({ preventDefault: () => { prevented = true; calls.push("prevent"); } });
    assert.equal(prevented, true, "close must be prevented synchronously, not after an await");
  };
  return { ...component, calls, requestClose, state: () => state };
}

test("window prevents close synchronously, awaits persistence, and destroys only once", async () => {
  const saved = deferred();
  const h = windowHarness({ persist: () => saved.promise });
  h.requestClose();
  assert.deepEqual(h.calls, ["listen", "prevent", "persist"]);
  h.requestClose();
  await tick();
  assert.deepEqual(h.calls, ["listen", "prevent", "persist", "prevent"]);
  saved.resolve();
  await tick();
  assert.deepEqual(h.calls, ["listen", "prevent", "persist", "prevent", "destroy"]);
  h.cleanup();
  await tick();
  assert.equal(h.calls.at(-1), "unlisten");
});

test("failed persistence leaves the window open, reports the error, and permits a retry", async () => {
  const saved = deferred();
  let attempts = 0;
  const h = windowHarness({ persist: () => ++attempts === 1 ? saved.promise : Promise.resolve() });
  h.requestClose();
  saved.reject(new Error("disk full"));
  await tick();
  assert.ok(!h.calls.includes("destroy"));
  assert.ok(!h.calls.includes("ask"));
  assert.match(h.state().editorError, /stayed open.*disk full/);
  h.requestClose();
  await tick();
  assert.equal(attempts, 2);
  assert.equal(h.calls.filter((call) => call === "destroy").length, 1);
  h.cleanup();
});

for (const failure of [
  { name: "migration failure", migrationStatus: "error" },
  { name: "initialization failure", initializationError: "recovery unavailable" },
]) {
  for (const confirmed of [true, false]) {
    test(`${failure.name}: ${confirmed ? "confirmation is required before destroy" : "canceled fallback keeps the window open"}`, async () => {
      const confirmation = deferred();
      const h = windowHarness({ ...failure, confirmation: confirmation.promise });
      h.requestClose();
      assert.deepEqual(h.calls, ["listen", "prevent", "ask"]);
      await tick();
      assert.ok(!h.calls.includes("destroy"));
      confirmation.resolve(confirmed);
      await tick();
      assert.equal(h.calls.includes("persist"), false, "fallback must not overwrite recovery data");
      assert.equal(h.calls.includes("destroy"), confirmed);
      if (!confirmed) {
        h.requestClose();
        await tick();
        assert.equal(h.calls.filter((call) => call === "ask").length, 2);
        assert.ok(!h.calls.includes("destroy"));
      }
      h.cleanup();
    });
  }
}

test("rendered window controls route close through the native close request, not destroy", async () => {
  const h = windowHarness();
  const buttons = h.rendered.props.children;
  assert.deepEqual(buttons.map((button) => button.props["aria-label"]), [
    "Minimize window", "Maximize or restore window", "Close window",
  ]);
  buttons.forEach((button) => button.props.onClick());
  await tick();
  assert.deepEqual(h.calls, ["listen", "minimize", "toggleMaximize", "close"]);
  h.cleanup();
});
