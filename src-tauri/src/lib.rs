mod commands;
mod notes_manager;
mod migration;
mod utils;

use std::{path::PathBuf, sync::Arc};

use commands::notes;
use tauri::{Emitter, Manager};

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
            notes::get_note_metadata,
            notes::get_note_content,
            notes::create_note,
            notes::create_note_metadata,
            notes::search_notes_by_term,
            notes::edit_note,
            notes::edit_note_metadata,
            notes::remove_note,
            notes::remove_note_metadata,
            notes::get_total_notes_count,
        ])
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {

            // Manage app directories and paths
            let app_dirs = get_app_dirs(app);
            let manager_path = app_dirs.manager_path.to_owned();

            let needs_migration = migration::check_for_migration(&manager_path)?;
            if needs_migration {
                migration::migrate_v1_to_v2(&manager_path)?;
            }

            app.manage(app_dirs);


            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
