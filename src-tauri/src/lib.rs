mod commands;
mod utils;

use commands::{files, migration};

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
            migration::save_editor_state,
            migration::load_editor_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
