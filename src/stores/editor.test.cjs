// Run with: node --test src/stores/editor.test.cjs
// Use the installed TypeScript compiler and real Zustand; only native IPC/dialogs
// are mocked. No new test dependency or project configuration is required.
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

function loadTypeScript(filename, mocks = {}) {
  const fullPath = path.resolve(__dirname, filename);
  const { outputText } = ts.transpileModule(readFileSync(fullPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    fileName: fullPath,
  });
  const module = { exports: {} };
  const execute = vm.runInThisContext(`(function(require, module, exports) {\n${outputText}\n})`, { filename: fullPath });
  execute((name) => Object.hasOwn(mocks, name) ? mocks[name] : require(name), module, module.exports);
  return module.exports;
}

const types = loadTypeScript("../lib/types.ts");
const emptySession = () => ({ schemaVersion: "V2", recentFiles: {}, session: { tabs: [] } });
const file = (content, lineEnding = "LF") => ({
  content,
  fileInfo: { encoding: "UTF-8", lineEnding, fileSize: Buffer.byteLength(content), extension: "txt" },
});
const localTab = (id, extra = {}) => ({ id, filename: `${id}.txt`, path: `C:/${id}.txt`, isDirty: false, ...extra });
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
const tick = () => new Promise((resolve) => setImmediate(resolve));

function harness(backend = {}, dialogs = {}) {
  const calls = [];
  const defaults = {
    load_editor_state: emptySession,
    open_file: ({ path }) => file(path),
    save_file: () => undefined,
    save_editor_state: () => undefined,
  };
  const commands = loadTypeScript("../lib/commands.ts", {
    "@/lib/types": types,
    "@tauri-apps/api/core": {
      invoke: async (command, args) => {
        calls.push({ command, args });
        const handler = backend[command] ?? defaults[command];
        assert.ok(handler, `Unexpected native command: ${command}`);
        return handler(args);
      },
    },
  });
  const { useEditorStore: store } = loadTypeScript("editor.ts", {
    "@/lib/types": types,
    "@/lib/commands": commands,
    "@tauri-apps/plugin-dialog": {
      save: dialogs.save ?? (async () => "C:/saved.txt"),
      open: dialogs.open ?? (async () => null),
      message: dialogs.message ?? (async () => "Cancel"),
    },
  });
  return { store, actions: store.getState().actions, state: store.getState, calls, commands };
}
const commandCalls = (h, command) => h.calls.filter((call) => call.command === command);

async function blank(h, content = "draft") {
  await h.actions.initialize();
  h.actions.addBlank();
  h.actions.setContent(content);
  return h.state().currentTabId;
}

// Lifecycle and session preservation.
test("initialize shares one promise, is idempotent, and never drains launch paths", async () => {
  const load = deferred();
  const h = harness({ load_editor_state: () => load.promise });
  const first = h.actions.initialize();
  assert.equal(h.actions.initialize(), first);
  h.actions.addBlank();
  load.resolve(emptySession());
  await first;
  await tick();
  const id = h.state().currentTabId;
  h.actions.setContent("kept");
  await h.actions.initialize();
  assert.equal(h.state().currentTabId, id);
  assert.equal(h.state().activeContent, "kept");
  assert.equal(commandCalls(h, "load_editor_state").length, 1);
  assert.equal(commandCalls(h, "take_cli_file_paths").length, 0);
});

test("failed load reports an error and permanently blocks session overwrite even after dismiss", async () => {
  const h = harness({ load_editor_state: () => { throw "corrupt JSON"; } });
  await h.actions.initialize();
  assert.equal(h.state().isInitialized, true);
  assert.match(h.state().initializationError, /corrupt JSON/);
  assert.match(h.state().editorError, /corrupt JSON/);
  h.actions.dismissError();
  assert.equal(h.state().editorError, null);
  await blank(h);
  await assert.rejects(h.actions.persistSession(), /corrupt JSON/);
  assert.equal(commandCalls(h, "save_editor_state").length, 0);
  await h.actions.initialize();
  assert.equal(commandCalls(h, "load_editor_state").length, 1);
});

test("invalid persisted dirty content blocks session overwrite", async () => {
  const h = harness({ load_editor_state: () => ({
    ...emptySession(), session: { tabs: [localTab("a", { isDirty: true })] },
  }) });
  await h.actions.initialize();
  assert.match(h.state().initializationError, /missing unsaved content/);
  await assert.rejects(h.actions.persistSession());
  assert.equal(commandCalls(h, "save_editor_state").length, 0);
});

test("missing restored active file stays inactive, not an empty editable document", async () => {
  const h = harness({
    load_editor_state: () => ({ ...emptySession(), session: { tabs: [localTab("a")], currentTabId: "a" } }),
    open_file: () => null,
  });
  await h.actions.initialize();
  assert.equal(h.state().currentTabId, null);
  assert.equal(h.state().tabs.length, 1);
  assert.equal(h.state().initializationError, null);
  assert.match(h.state().editorError, /File not found/);
  await h.actions.persistSession();
});

test("restore and persist preserve active and inactive dirty/untitled content", async () => {
  const tabs = [localTab("a", { isDirty: true, content: "edited a" }),
    { id: "b", filename: "untitled", isDirty: false, content: "" }, localTab("c")];
  const h = harness({ load_editor_state: () => ({ ...emptySession(), session: { tabs, currentTabId: "a" } }) });
  await h.actions.initialize();
  assert.equal(h.state().activeContent, "edited a");
  assert.equal(commandCalls(h, "open_file").length, 0);
  assert.equal(h.state().contentCache.b, "");
  await h.actions.persistSession();
  const persisted = commandCalls(h, "save_editor_state")[0].args.state.session.tabs;
  assert.deepEqual(JSON.parse(JSON.stringify(persisted)), tabs);
});

test("session write errors reject, surface in state, and do not poison the write queue", async () => {
  let fail = true;
  const h = harness({ save_editor_state: () => { if (fail) throw new Error("disk full"); } });
  await blank(h);
  await assert.rejects(h.actions.persistSession(), /disk full/);
  assert.match(h.state().editorError, /disk full/);
  fail = false;
  await h.actions.persistSession();
  assert.equal(commandCalls(h, "save_editor_state").length, 2);
});

test("session persistence is serialized and repeats to include edits made during IPC", async () => {
  const firstWrite = deferred();
  let writes = 0;
  const h = harness({ save_editor_state: () => ++writes === 1 ? firstWrite.promise : undefined });
  await blank(h, "first");
  const first = h.actions.persistSession();
  await tick();
  h.actions.setContent("latest");
  const second = h.actions.persistSession();
  await tick();
  assert.equal(writes, 1);
  firstWrite.resolve();
  await Promise.all([first, second]);
  const saved = commandCalls(h, "save_editor_state");
  assert.equal(saved.length, 3);
  assert.equal(saved[0].args.state.session.tabs[0].content, "first");
  assert.equal(saved[1].args.state.session.tabs[0].content, "latest");
  assert.equal(saved[2].args.state.session.tabs[0].content, "latest");
});

// Open/switch concurrency.
test("opening a missing file or rejecting an open reports an error without adding a tab", async () => {
  for (const open_file of [() => null, () => { throw "permission denied"; }]) {
    const h = harness({ open_file });
    const id = await blank(h);
    await h.actions.openByPath("C:/missing.txt");
    assert.equal(h.state().tabs.length, 1);
    assert.equal(h.state().currentTabId, id);
    assert.equal(h.state().activeContent, "draft");
    assert.ok(h.state().editorError);
  }
});

test("open dialog failures are surfaced", async () => {
  const h = harness({}, { open: async () => { throw new Error("dialog failed"); } });
  await h.actions.openLocalFile();
  assert.match(h.state().editorError, /dialog failed/);
});

test("async open flushes latest edits and preserves tabs added during its read", async () => {
  const read = deferred();
  const h = harness({ open_file: () => read.promise });
  const first = await blank(h, "old");
  const opening = h.actions.openByPath("C:/a.txt");
  await tick();
  h.actions.setContent("latest");
  h.actions.addBlank();
  const newest = h.state().currentTabId;
  h.actions.setContent("new tab");
  read.resolve(file("disk"));
  await opening;
  assert.equal(h.state().tabs.length, 3);
  assert.equal(h.state().currentTabId, newest);
  assert.equal(h.state().activeContent, "new tab");
  assert.equal(h.state().contentCache[first], "latest");
});

test("async open caches edits made to the old active tab while the read was pending", async () => {
  const read = deferred();
  const h = harness({ open_file: () => read.promise });
  const id = await blank(h, "old");
  const opening = h.actions.openByPath("C:/a.txt");
  await tick();
  h.actions.setContent("new");
  read.resolve(file("disk"));
  await opening;
  assert.equal(h.state().activeContent, "disk");
  assert.equal(h.state().contentCache[id], "new");
  await h.actions.openTab(id);
  assert.equal(h.state().activeContent, "new");
});

test("concurrent opens retain both tabs/recent entries, with latest selection winning", async () => {
  const a = deferred(), b = deferred();
  const h = harness({ open_file: ({ path }) => path.endsWith("a.txt") ? a.promise : b.promise });
  await h.actions.initialize();
  const openA = h.actions.openByPath("C:/a.txt");
  const openB = h.actions.openByPath("C:/b.txt");
  await tick();
  b.resolve(file("b"));
  await openB;
  a.resolve(file("a"));
  await openA;
  assert.equal(h.state().activeContent, "b");
  assert.equal(h.state().tabs.length, 2);
  assert.equal(Object.keys(h.state().recentFiles).length, 2);
});

test("concurrent opens of the same path share a read and create exactly one tab", async () => {
  const read = deferred();
  const h = harness({ open_file: () => read.promise });
  await h.actions.initialize();
  const one = h.actions.openByPath("C:/a.txt"), two = h.actions.openByPath("C:/a.txt");
  await tick();
  assert.equal(commandCalls(h, "open_file").length, 1);
  read.resolve(file("disk"));
  await Promise.all([one, two]);
  assert.equal(h.state().tabs.length, 1);
  assert.equal(h.state().activeContent, "disk");
});

test("reopening the active path never replaces edits or rereads disk", async () => {
  const h = harness();
  await h.actions.openByPath("C:/a.txt");
  h.actions.setContent("unsaved");
  await h.actions.openByPath("C:/a.txt");
  assert.equal(h.state().activeContent, "unsaved");
  assert.equal(commandCalls(h, "open_file").length, 1);
});

test("switch completion preserves latest edits, and a later selection cancels an older read", async () => {
  const read = deferred();
  let pending = false;
  const h = harness({ open_file: () => pending ? read.promise : file("disk") });
  await h.actions.openByPath("C:/a.txt");
  const local = h.state().currentTabId;
  const blankId = await blank(h, "old");
  pending = true;
  const switching = h.actions.openTab(local);
  await tick();
  h.actions.setContent("new");
  await h.actions.openTab(blankId); // Even clicking the active tab cancels a pending switch.
  read.resolve(file("disk latest"));
  await switching;
  assert.equal(h.state().currentTabId, blankId);
  assert.equal(h.state().activeContent, "new");
});

test("switching to a missing existing file reports error and keeps the current document", async () => {
  let missing = false;
  const h = harness({ open_file: () => missing ? null : file("disk") });
  await h.actions.openByPath("C:/a.txt");
  const local = h.state().currentTabId;
  const id = await blank(h);
  missing = true;
  await h.actions.openTab(local);
  assert.equal(h.state().currentTabId, id);
  assert.equal(h.state().activeContent, "draft");
  assert.match(h.state().editorError, /File not found/);
});

test("a pending switch cannot resurrect a tab closed while its read is pending", async () => {
  const read = deferred();
  let pending = false;
  const h = harness({ open_file: () => pending ? read.promise : file("disk") });
  await h.actions.openByPath("C:/a.txt");
  const local = h.state().currentTabId;
  const id = await blank(h);
  pending = true;
  const switching = h.actions.openTab(local);
  await tick();
  assert.equal(await h.actions.closeTab(local), true);
  read.resolve(file("disk"));
  await switching;
  assert.equal(h.state().currentTabId, id);
  assert.equal(h.state().tabs.some((t) => t.id === local), false);
});

// Saving and closing.
test("save captures edits made during Save As, but targets the originally requested tab", async () => {
  const dialog = deferred();
  const h = harness({}, { save: () => dialog.promise });
  const id = await blank(h, "old");
  const saving = h.actions.saveCurrentFileOnDisk();
  await tick();
  h.actions.setContent("latest");
  h.actions.addBlank();
  const active = h.state().currentTabId;
  h.actions.setContent("other");
  dialog.resolve("C:/a.md");
  await saving;
  assert.equal(commandCalls(h, "save_file")[0].args.entry.content, "latest");
  assert.equal(h.state().currentTabId, active);
  assert.equal(h.state().activeContent, "other");
  assert.equal(h.state().currentFileInfo.extension, "");
  assert.equal(h.state().tabs.find((t) => t.id === id).isDirty, false);
});

test("save preserves edits made during IPC, fresh tab lists/cache/recent entries, and active metadata", async () => {
  const write = deferred();
  const h = harness({ save_file: () => write.promise });
  await h.actions.openByPath("C:/a.txt");
  const id = h.state().currentTabId;
  h.actions.setContent("saved snapshot");
  const saving = h.actions.saveCurrentFileOnDisk();
  await tick();
  h.actions.setContent("newer edits");
  await h.actions.openByPath("C:/b.txt");
  const active = h.state().currentTabId;
  write.resolve();
  await saving;
  assert.equal(h.state().tabs.length, 2);
  assert.equal(h.state().tabs.find((t) => t.id === id).isDirty, true);
  assert.equal(h.state().contentCache[id], "newer edits");
  assert.equal(h.state().currentTabId, active);
  assert.equal(Object.keys(h.state().recentFiles).length, 2);
  await h.actions.openTab(id);
  assert.equal(h.state().activeContent, "newer edits");
});

test("file saves are serialized and session persistence waits for a pending save", async () => {
  const write = deferred();
  let writes = 0, dialogs = 0;
  const h = harness({ save_file: () => ++writes === 1 ? write.promise : undefined }, {
    save: async () => { dialogs++; return "C:/a.txt"; },
  });
  await blank(h, "first");
  const first = h.actions.saveCurrentFileOnDisk();
  await tick();
  h.actions.setContent("latest");
  const second = h.actions.saveCurrentFileOnDisk();
  const persist = h.actions.persistSession();
  await tick();
  assert.equal(writes, 1);
  assert.equal(commandCalls(h, "save_editor_state").length, 0);
  write.resolve();
  await Promise.all([first, second, persist]);
  assert.equal(dialogs, 1);
  assert.equal(writes, 2);
  assert.equal(commandCalls(h, "save_file")[1].args.entry.content, "latest");
  assert.equal(h.state().tabs[0].isDirty, false);
  assert.equal(commandCalls(h, "save_editor_state")[0].args.state.session.tabs[0].content, undefined);
});

test("failed file save surfaces an error and leaves the document dirty", async () => {
  const h = harness({ save_file: () => { throw new Error("permission denied"); } });
  await blank(h);
  await h.actions.saveCurrentFileOnDisk();
  assert.equal(h.state().tabs[0].isDirty, true);
  assert.equal(h.state().tabs[0].type, types.TabType.UNTITLED);
  assert.match(h.state().editorError, /permission denied/);
});

test("open waits for an in-flight Save As and does not create a duplicate tab", async () => {
  const write = deferred();
  const h = harness({ save_file: () => write.promise });
  const id = await blank(h, "saved content");
  const saving = h.actions.saveCurrentFileOnDisk();
  await tick();
  const opening = h.actions.openByPath("C:/saved.txt");
  await tick();
  assert.equal(commandCalls(h, "open_file").length, 0);
  write.resolve();
  await Promise.all([saving, opening]);
  assert.equal(h.state().tabs.length, 1);
  assert.equal(h.state().currentTabId, id);
  assert.equal(h.state().activeContent, "saved content");
});

test("a read started before Save As cannot create a duplicate or promote old disk content", async () => {
  const read = deferred(), write = deferred();
  let reads = 0;
  const h = harness({
    open_file: () => ++reads === 1 ? read.promise : file("saved content"),
    save_file: () => write.promise,
  });
  const id = await blank(h, "saved content");
  const opening = h.actions.openByPath("C:/saved.txt");
  await tick();
  const saving = h.actions.saveCurrentFileOnDisk();
  await tick();
  read.resolve(file("old disk content"));
  await tick();
  assert.equal(h.state().tabs.length, 1);
  write.resolve();
  await Promise.all([saving, opening]);
  assert.equal(reads, 2);
  assert.equal(h.state().tabs.length, 1);
  assert.equal(h.state().currentTabId, id);
  assert.equal(h.state().activeContent, "saved content");
});

test("a clean local tab refreshes disk metadata when reopened", async () => {
  let latest = file("old", "LF");
  const h = harness({ open_file: () => latest });
  await h.actions.openByPath("C:/a.txt");
  const id = h.state().currentTabId;
  await blank(h);
  latest = file("new\r\n", "CRLF");
  await h.actions.openTab(id);
  assert.equal(h.state().activeContent, "new\r\n");
  assert.equal(h.state().currentFileInfo.lineEnding, "CRLF");
  assert.equal(h.state().currentFileInfo.fileSize, 5);
});

test("Save As cannot overwrite another open tab", async () => {
  const h = harness({}, { save: async () => "C:/a.txt" });
  await h.actions.openByPath("C:/a.txt");
  await blank(h);
  await h.actions.saveCurrentFileOnDisk();
  assert.equal(commandCalls(h, "save_file").length, 0);
  assert.match(h.state().editorError, /already open/);
  assert.equal(h.state().tabs[1].isDirty, true);
});

test("dirty close Cancel and canceled Save As both leave the tab intact", async () => {
  for (const choice of ["Cancel", "Save"]) {
    const h = harness({}, { message: async () => choice, save: async () => null });
    const id = await blank(h);
    assert.equal(await h.actions.closeTab(id), false);
    assert.equal(h.state().tabs.length, 1);
    assert.equal(h.state().activeContent, "draft");
    assert.equal(h.state().tabs[0].isDirty, true);
  }
});

test("failed save on close never removes local or untitled dirty documents", async () => {
  for (const local of [false, true]) {
    const h = harness({ save_file: () => { throw new Error("disk full"); } }, { message: async () => "Save" });
    if (local) await h.actions.openByPath("C:/a.txt");
    else await blank(h);
    h.actions.setContent("unsaved");
    assert.equal(await h.actions.closeCurrentTab(), false);
    assert.equal(h.state().tabs.length, 1);
    assert.equal(h.state().activeContent, "unsaved");
    assert.match(h.state().editorError, /disk full/);
  }
});

test("closing an inactive dirty untitled tab saves its content without switching active tabs", async () => {
  const h = harness({}, { message: async () => "Save" });
  const old = await blank(h, "save this");
  const active = await blank(h, "keep this");
  assert.equal(await h.actions.closeTab(old), true);
  assert.equal(h.state().currentTabId, active);
  assert.equal(h.state().activeContent, "keep this");
  assert.equal(commandCalls(h, "save_file")[0].args.entry.content, "save this");
});

test("edits made while a close-save is pending prevent closure", async () => {
  const write = deferred();
  const h = harness({ save_file: () => write.promise }, { message: async () => "Save" });
  const id = await blank(h, "snapshot");
  const closing = h.actions.closeTab(id);
  await tick();
  h.actions.setContent("new edits");
  write.resolve();
  assert.equal(await closing, false);
  assert.equal(h.state().activeContent, "new edits");
  assert.equal(h.state().tabs[0].isDirty, true);
});

test("edits while discard confirmation is pending are not discarded", async () => {
  const confirmation = deferred();
  const h = harness({}, { message: () => confirmation.promise });
  const id = await blank(h, "snapshot");
  const closing = h.actions.closeTab(id);
  await tick();
  h.actions.setContent("new edits");
  confirmation.resolve("Don't Save");
  assert.equal(await closing, false);
  assert.equal(h.state().activeContent, "new edits");
  assert.match(h.state().editorError, /changed while closing/);
});

test("close rechecks edits while loading the adjacent file", async () => {
  const read = deferred();
  let pending = false;
  const h = harness({ open_file: () => pending ? read.promise : file("disk") }, { message: async () => "Don't Save" });
  await h.actions.openByPath("C:/a.txt");
  const id = await blank(h);
  pending = true;
  const closing = h.actions.closeTab(id);
  await tick();
  h.actions.setContent("changed during adjacent read");
  read.resolve(file("disk"));
  assert.equal(await closing, false);
  assert.equal(h.state().tabs.length, 2);
  assert.equal(h.state().activeContent, "changed during adjacent read");
});

test("close preserves tabs and selection created during an adjacent read", async () => {
  const read = deferred();
  let pending = false;
  const h = harness({ open_file: () => pending ? read.promise : file("disk") }, { message: async () => "Don't Save" });
  await h.actions.openByPath("C:/a.txt");
  const id = await blank(h);
  pending = true;
  const closing = h.actions.closeTab(id);
  await tick();
  h.actions.addBlank();
  const active = h.state().currentTabId;
  h.actions.setContent("keep");
  read.resolve(file("disk"));
  assert.equal(await closing, true);
  assert.equal(h.state().tabs.length, 2);
  assert.equal(h.state().currentTabId, active);
  assert.equal(h.state().activeContent, "keep");
});

test("concurrent close requests share one confirmation and close only once", async () => {
  const confirmation = deferred();
  let dialogs = 0;
  const h = harness({}, { message: () => { dialogs++; return confirmation.promise; } });
  const id = await blank(h);
  const first = h.actions.closeTab(id), second = h.actions.closeTab(id);
  assert.equal(first, second);
  await tick();
  assert.equal(dialogs, 1);
  confirmation.resolve("Don't Save");
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(h.state().tabs.length, 0);
});

test("dirty typing keeps tab metadata identity after the first edit", async () => {
  const h = harness();
  await blank(h, "one");
  const tabs = h.state().tabs;
  h.actions.setContent("two");
  h.actions.setContent("three");
  assert.equal(h.state().tabs, tabs);
  h.actions.setContent("three");
  assert.equal(h.state().tabs, tabs);
});

test("serialization refuses unavailable unsaved content instead of persisting an empty replacement", () => {
  const h = harness();
  assert.throws(() => h.commands.serializeTabs([
    { id: "a", type: types.TabType.LOCAL, filename: "a.txt", path: "C:/a.txt", isDirty: true },
  ], {}), /session saving was canceled/);
});
