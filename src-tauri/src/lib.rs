mod commands;
mod launch;
mod utils;

use commands::{files, migration};
use tauri::{Emitter, Manager};

pub use launch::CliFilePaths;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let cwd = std::env::current_dir().ok();
    let pending_paths = CliFilePaths::default();
    pending_paths.enqueue(launch::file_paths(std::env::args_os(), cwd.as_deref()));

    tauri::Builder::default()
        .manage(pending_paths)
        .manage(migration::EditorStateLock::default())
        .plugin(tauri_plugin_single_instance::init(|app, args, cwd| {
            let paths = launch::file_paths(
                args.into_iter().map(std::ffi::OsString::from),
                Some(std::path::Path::new(&cwd)),
            );
            // Queue before notifying. A missed event during frontend startup
            // is harmless because the initial drain also consumes this queue.
            if app.state::<CliFilePaths>().enqueue(paths) {
                if let Err(error) = app.emit("open-files", ()) {
                    log::warn!("Could not notify frontend of pending files: {error}");
                }
            }

            // Bring the existing window to the foreground.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
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
