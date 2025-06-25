mod commands;
mod utils;

use std::{path::PathBuf, sync::Arc};

use commands::{notes, migration};
use tauri::Manager;

static MANAGER_METADATA_FILE: &str = "notes-manager.json";

pub struct AppDirs {
    pub manager_path: Arc<String>,
    pub app_data_path: Arc<PathBuf>,
}

/// Helper to get app data and manager file paths.
fn get_app_dirs(app: &tauri::App) -> AppDirs {
    let data_dir = app
        .path()
        .app_local_data_dir()
        .expect("Failed to get app local data directory");

    let manager_path = data_dir
        .join(MANAGER_METADATA_FILE)
        .to_str()
        .expect("Failed to convert manager path to string")
        .to_string();

    AppDirs {
        manager_path: Arc::new(manager_path),
        app_data_path: Arc::new(data_dir),
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::new()
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some(String::from("app-logs")),
                    },
                ))
                .build(),
        )
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            notes::get_all_notes_metadata,
            notes::get_note,
            notes::create_note,
            notes::search_notes_by_term,
            notes::edit_note,
            notes::remove_note,
            notes::get_total_notes_count,
            notes::toggle_favorite,
            notes::save_password,
            notes::verify_password,
            migration::check_for_migration,
            migration::migrate_v1_to_v2,
        ])
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {

            // Manage app directories and paths
            let app_dirs = get_app_dirs(app);
            app.manage(app_dirs);

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
