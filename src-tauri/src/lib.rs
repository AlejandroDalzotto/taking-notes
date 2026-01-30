mod commands;
mod utils;

use std::path::PathBuf;

use commands::{files, migration};
use tauri::Manager;

static MANAGER_METADATA_FILE: &str = "notes-manager.json";

pub struct AppState {
    pub manager_path: PathBuf,
    pub app_data_path: PathBuf,
}

/// Helper to get app data and manager file paths.
fn initialize_state(app: &tauri::AppHandle) -> AppState {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .expect("Failed to get app local data directory");

    let manager_path = data_dir.join(MANAGER_METADATA_FILE);

    AppState {
        manager_path: manager_path,
        app_data_path: data_dir,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|_app, _args, _cwd| {}))
        .plugin(tauri_plugin_window_state::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            files::save_file,
            files::open_file,
            migration::check_for_migration_to_v2,
            migration::migrate_v1_to_v2,
            migration::get_schema_version,
            migration::save_editor_state,
            migration::load_editor_state,
        ])
        .setup(|app| {
            let app_handle = app.handle();

            let app_state = initialize_state(&app_handle);
            app.manage(app_state);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
