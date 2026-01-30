use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{command, State};

use crate::utils;
use crate::utils::sanitize_filename;
use crate::utils::validate_local_files;
use crate::AppState;
use std::fs;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteV1 {
    pub title: String,
    pub tag: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub file_extension: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub enum SchemaVersion {
    V1,
    V2,
}

// V2 schemas

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SessionTab {
    pub id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub path: Option<String>, // None for untitled tabs
    pub filename: String,
    pub is_dirty: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub content: Option<String>, // Only stored for untitled tabs (path == None)
}

#[derive(Serialize, Deserialize, Debug, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct EditorSession {
    pub tabs: Vec<SessionTab>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub current_tab_id: Option<String>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct LocalFile {
    pub id: String,
    pub filename: String,
    pub modified: u64, // unix timestamp in milliseconds
    pub path: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseV2 {
    pub recent_files: HashMap<String, LocalFile>, // path -> file info
    pub session: EditorSession,
    pub schema_version: SchemaVersion,
}

impl Default for DatabaseV2 {
    fn default() -> Self {
        DatabaseV2 {
            recent_files: HashMap::new(),
            session: EditorSession::default(),
            schema_version: SchemaVersion::V2,
        }
    }
}

#[command]
pub fn get_schema_version(app_state: State<'_, AppState>) -> Result<SchemaVersion, ()> {
    let manager_path = app_state.manager_path.as_path();

    if fs::metadata(manager_path).is_ok() {
        let raw_manager_data = std::fs::read_to_string(manager_path).map_err(|_| ())?;
        if let Ok(manager) = serde_json::from_str::<Value>(&raw_manager_data) {
            if let Some(version) = manager.get("schemaVersion") {
                if let Some(version_str) = version.as_str() {
                    return match version_str {
                        "V2" => Ok(SchemaVersion::V2),
                        "V1" => Ok(SchemaVersion::V1),
                        _ => Ok(SchemaVersion::V1),
                    };
                }
            }
            return Ok(SchemaVersion::V1);
        }
        Ok(SchemaVersion::V1)
    } else {
        Ok(SchemaVersion::V1)
    }
}

#[command]
pub fn check_for_migration_to_v2(app_state: State<'_, AppState>) -> Result<bool, ()> {
    let manager_path = app_state.manager_path.as_path();
    if fs::metadata(manager_path).is_ok() {
        let raw_manager_data = std::fs::read_to_string(manager_path).map_err(|_| ())?;
        let parsed_v2 = serde_json::from_str::<DatabaseV2>(&raw_manager_data);
        match parsed_v2 {
            Ok(_) => Ok(false),
            Err(_) => Ok(true),
        }
    } else {
        Ok(false)
    }
}

#[command]
pub fn migrate_v1_to_v2(app_state: State<'_, AppState>) -> Result<bool, String> {
    let manager_path = app_state.manager_path.as_path();
    let data_dir = app_state.app_data_path.as_path();
    let data_v1 = std::fs::read_to_string(manager_path)
        .map_err(|e| format!("Error reading file manager: {}", e))?;
    let notes_v1: Vec<NoteV1> = serde_json::from_str(&data_v1)
        .map_err(|e| format!("Error trying to parse json data: {}", e))?;

    let mut recent_files: HashMap<String, LocalFile> = HashMap::new();

    for note in notes_v1.into_iter() {
        let src = data_dir.join(format!("{}.{}", note.tag, note.file_extension));
        if src.exists() {
            let title_sanitized = sanitize_filename(&note.title);
            let filename = format!("{}.{}", title_sanitized, note.file_extension);
            let dest = data_dir.join(&filename);

            fs::rename(&src, &dest)
                .map_err(|e| format!("Failed to move file {:?} -> {:?}: {}", src, dest, e))?;

            let mut modified: u64 = 0;
            let metadata = fs::metadata(&dest).unwrap();
            if let Ok(time) = metadata.modified() {
                if let Ok(duration) = time.duration_since(std::time::UNIX_EPOCH) {
                    modified = duration.as_millis() as u64;
                }
            }
            recent_files.insert(
                dest.to_string_lossy().to_string(),
                LocalFile {
                    id: note.tag,
                    filename,
                    path: dest.to_string_lossy().to_string(),
                    modified,
                },
            );
        }
    }

    let db_v2 = DatabaseV2 {
        recent_files,
        session: EditorSession::default(),
        schema_version: SchemaVersion::V2,
    };

    let serialized = serde_json::to_string(&db_v2)
        .map_err(|e| format!("Error trying to serialize v2 data: {}", e))?;
    utils::atomic_write(manager_path, &serialized)
        .map_err(|e| format!("Error trying to save json data: {}", e))?;
    Ok(true)
}

#[command]
pub fn load_editor_state(app_state: State<'_, AppState>) -> Result<DatabaseV2, String> {
    let manager_path = app_state.manager_path.as_path();

    let db = if !fs::metadata(manager_path).is_ok() {
        DatabaseV2::default()
    } else {
        let raw = std::fs::read_to_string(manager_path)
            .map_err(|e| format!("Failed reading manager file: {}", e))?;

        match serde_json::from_str::<DatabaseV2>(&raw) {
            Ok(mut db) => {
                validate_local_files(&mut db);
                db
            }
            Err(_) => DatabaseV2::default(),
        }
    };

    #[cfg(dev)]
    {
        println!("==========Successfully loaded editor state==========");
        println!("Recent files count: {}", db.recent_files.len());
        println!("Tabs count: {}", db.session.tabs.len());
        println!("Schema version: {:?}", db.schema_version);
        println!("\n");
    }

    Ok(db)
}

#[command]
pub fn save_editor_state(app_state: State<'_, AppState>, state: DatabaseV2) -> Result<(), String> {
    let manager_path = app_state.manager_path.as_path();

    let serialized = serde_json::to_string(&state).map_err(|e| e.to_string())?;
    utils::atomic_write(manager_path, &serialized).map_err(|e| e.to_string())?;

    #[cfg(dev)]
    {
        println!("==========Successfully saved editor state==========");
        println!("Recent files count: {}", state.recent_files.len());
        println!("Tabs count: {}", state.session.tabs.len());
        println!("Schema version: {:?}", state.schema_version);
        println!("\n");
    }

    Ok(())
}
