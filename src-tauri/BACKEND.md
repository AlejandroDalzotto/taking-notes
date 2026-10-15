# Native file and session contract

## Launch files

`take_cli_file_paths` has no arguments and returns `string[]`. It atomically
removes **all currently pending paths**, in arrival order, from an in-memory
queue shared by cold startup and every subsequent single-instance launch.
Repeated calls are supported; an empty queue returns `[]`. Paths are not
explicitly deduplicated, and a path is returned by only one drain.

`open-files` is an app event with a **null payload**, not an array of paths.
The Rust callback queues paths before emitting it. Treat it only as a signal
to invoke `take_cli_file_paths`; never open paths from the event payload.

Frontend initialization must:

1. Await registration of the `open-files` listener before the initial drain.
2. Finish loading/restoring the editor session before opening launch files.
   Notifications received during initialization should defer processing, not
   open files that session restoration would subsequently replace.
3. Drain once after restoration, even if no notification was received.
4. Drain on every later notification, serializing drains and file-opening work
   through one consumer. Open each returned path with `open_file`/`openByPath`.
   Unregister the listener on teardown.

Registering before the initial drain closes the startup race: earlier launches
are already queued, and later launches either appear in that drain or trigger
another one. A late notification after a drain may legitimately return `[]`.
The queue is not a persisted mailbox: process exit loses pending paths, and
successful draining transfers responsibility for handling/retrying to the
frontend. Failed notification emission leaves paths queued for a later drain.

Argument parsing skips the executable, empty arguments, and tokens beginning
with `-` until `--`. After `--`, even `-draft.txt` is a filename. No value-taking
application flags are defined: a separate non-flag token is always a file path;
`--option=value` is ignored as one flag token. Windows `/`-rooted paths are not
flags. Spaces/quotes are handled by the OS argv parser, not split again.

Relative paths resolve against the **invoking process's cwd**: the startup cwd
for the first launch, and the single-instance plugin's supplied cwd for later
launches. Paths are made absolute without requiring existence or canonicalizing
symlinks/`..`. Relative paths with an unavailable/non-absolute cwd, ambiguous
Windows drive-relative paths, and paths that cannot be encoded as UTF-8 are
skipped with a warning rather than guessed or lossily changed. The plugin itself
supplies later-launch arguments as strings, so original non-UTF-8 argv cannot be
recovered there.

The existing main window is shown, unminimized, and focused on another launch,
even when no file paths are supplied.

## Native drag/drop and file commands

The main window explicitly enables `dragDropEnabled`. Use Tauri's
`onDragDropEvent`: `drop` supplies `payload.paths`. Drag/drop is independent of
`open-files` and does not enter the CLI queue. No filesystem/network plugin or
additional capability is required for the existing Rust file commands.

- `open_file({ path })` returns `null` for a missing file, or
  `{ content, fileInfo: { lineEnding, encoding, fileSize, extension } }`.
  Only regular UTF-8 files up to 10 MiB are supported. The read is bounded even
  if the file grows after the size check. `fileSize` reflects bytes actually
  read; line endings and UTF-8 BOMs are not rewritten.
- `save_file({ entry: { path, content } })` keeps its existing return shape.
  Writes use a synced same-directory temporary file and atomic replacement;
  existing permissions and symlinks are preserved, and read-only files fail
  instead of being silently replaced. Missing parent directories are not
  created for arbitrary user files.

Atomic replacement does not preserve every platform-specific attribute (for
example, Windows ACLs/alternate streams or Unix hard-link identity). Parent
directories are not fsynced, so power-loss durability remains OS-dependent.
These are not transactional snapshots of files being modified by another app.

## Sessions and migration

The V2 JSON/IPC schema is unchanged (`recentFiles`, `session`, `schemaVersion`,
camelCase session fields and optional `path`/`content`). Data remains local.

- Only a missing session returns an empty default. Read errors, malformed JSON,
  and unsupported schema versions return an error. Autosave refuses to replace
  an existing unreadable, malformed, or unsupported session. Recovery requires
  explicitly repairing or moving that original file; there is no new reset API.
- First save creates the app-data directory. Session reads, saves, and migration
  share an asynchronous lock within the running app. Writes are serialized,
  but the schema has no revision number: the frontend must order snapshots to
  avoid a stale snapshot being submitted after a newer one.
- Missing/non-file recent entries and clean tabs with no cached content are
  pruned. Cached content, including empty strings, is kept as an untitled
  recovery tab when its backing file is missing/non-file. Its ID, filename,
  dirty state, and content remain intact. Active selection is repaired.
  Metadata errors other than `NotFound` are not treated as deletion.
- Migration rejects invalid legacy filenames, sources outside the legacy data
  directory, and missing/non-file notes. It validates all sources before
  exporting, adds suffixes on sanitized-name collisions, and never overwrites
  existing exports or an existing V2 session. Export and session publication
  use no-clobber writes. Legacy files and the manager are **retained**, including
  when V1 and V2 data directories are the same.
- A mid-export failure can leave already copied notes; retries may create
  additional suffixed copies. Originals are preserved and no session is
  published until all copies succeed. Migration is not a cross-file transaction.
- `check_for_migration_to_v2` returns `boolean`, rejecting unreadable/corrupt V1
  managers rather than silently treating them as absent.
  `migrate_v1_to_v2` returns a **string message**, reflected by the frontend wrapper.

## Backend validation

Run from `src-tauri`:

```sh
cargo fmt --all -- --check
cargo check --locked
cargo test --locked --lib
```

Unit tests exercise argument/cwd parsing, queued launches/concurrency, bounded
UTF-8 reads, file metadata, atomic writes, session recovery/schema roundtrips,
corrupt-session protection, migration collisions, shared-directory retention,
and unsafe/missing legacy sources. Windows-rooted paths have Windows-only tests;
symlink/permission tests have Unix-only coverage. Interactive shell association,
actual second-process delivery, window focus, and native drag/drop require a
manual desktop smoke test with the updated frontend consumer.
