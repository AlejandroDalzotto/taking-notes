# 🎉 New version: v2.0.0

Taking Notes 2.0 brings a new layout and a simpler look, while keeping your notes in local files and your workspace available offline.

- Replace the top tab bar with a collapsible sidebar for open notes. Toggle it with `Ctrl+B`.
- Redesign the editor, menus, recent-files page, and empty workspace with a quieter layout and more writing space.
- Add Light, Dark, and Cream themes. Theme, sidebar visibility, and text size are saved locally.
- Add Motion animations with reduced-motion support, keyboard-accessible menus, and live word and character counts.
- Open files from launch arguments, including files sent to an already running instance. Relative paths use the launching process's working directory.
- Enable native file drag and drop, with a drop indicator and support for opening multiple files.
- Save recovery snapshots while working, as well as on close. Wait for recovery data to be saved before closing the window.
- Keep startup independent of internet access. Update checks are now available from Help instead of running automatically on launch; installing an update requires confirmation.
- Fix races when opening, switching, saving, and closing notes so pending operations do not replace newer edits or restore closed notes.
- Keep notes open when a save is canceled or fails. Show file and recovery errors in the app instead of only logging them.
- Preserve the active note when visiting recent files, and support searching recent filenames and paths.
- Protect unreadable or corrupt recovery data from being overwritten. Recover cached edits as untitled notes when their backing files are missing.
- Make legacy migration preserve original data and avoid overwriting notes with matching export names.
- Harden file reads and atomic saves, including size limits, read-only checks, and preservation of existing permissions and symlinks.
- Preserve CRLF line endings when editing Windows text files, and read the displayed app version from Tauri.
- Add frontend and Rust regression tests for editor state, recovery, file handling, settings, and native event wiring.

---

## Feedback

If you encounter any bugs or have suggestions, please open an issue on [GitHub](https://github.com/AlejandroDalzotto/taking-notes/issues).

---

Thank you for your support!
