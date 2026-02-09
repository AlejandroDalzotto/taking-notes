mod commands;
mod utils;

use std::sync::Mutex;

use commands::{files, migration};
use tauri::{Emitter, Manager};

/// Holds file paths passed via CLI arguments on cold start.
/// The frontend calls `take_cli_file_paths` once during initialization
/// to drain and consume these paths.
pub struct CliFilePaths(pub Mutex<Vec<String>>);

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Extract file paths from CLI args (skip the exe path at args[0]).
    // Filter out flags (--something / -x) so we only keep paths.
    let cli_file_paths: Vec<String> = std::env::args()
        .skip(1)
        .filter(|arg| !arg.starts_with('-'))
        .collect();

    tauri::Builder::default()
        .manage(CliFilePaths(Mutex::new(cli_file_paths)))
        .plugin(tauri_plugin_single_instance::init(|app, args, _cwd| {
            // When a second instance is launched (e.g. "Open with" while
            // the app is already running), extract file paths from its
            // args and forward them to the running frontend via an event.
            let file_paths: Vec<&str> = args
                .iter()
                .skip(1)
                .filter(|arg| !arg.starts_with('-'))
                .map(|s| s.as_str())
                .collect();

            if !file_paths.is_empty() {
                let _ = app.emit("open-files", &file_paths);
            }

            // Bring the existing window to the foreground.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            files::save_file,
            files::open_file,
            files::take_cli_file_paths,
            migration::check_for_migration_to_v2,
            migration::migrate_v1_to_v2,
            migration::save_editor_state,
            migration::load_editor_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
