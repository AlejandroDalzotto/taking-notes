use std::collections::HashMap;
use std::fs;

use crate::migration::{DatabaseV2, NoteV2, SchemaVersion};
use crate::{notes_manager::*, utils, AppDirs};
use tauri::State;
use uuid::Uuid;

#[tauri::command]
pub async fn get_all_notes_metadata(
    app_state: State<'_, AppDirs>,
) -> Result<HashMap<String, NoteV2>, ()> {
    let manager_path = app_state.manager_path.as_str();

    if !fs::exists(manager_path).unwrap() {
        return Ok(HashMap::new());
    }

    let raw_json_data = fs::read_to_string(manager_path).unwrap();
    let manager: DatabaseV2 = serde_json::from_str(&raw_json_data).unwrap();

    Ok(manager.notes)
}

// #[command]
// pub async fn get_note_metadata(
//     tag: String,
//     app_state: State<'_, AppDirs>,
// ) -> Result<NoteV2, NoteError> {
//     let manager_path = app_state.manager_path.to_string();

//     let file_data = NotesManager::read_note_metadata(manager_path, tag);

//     file_data.map_err(|e| {
//         NoteError::new(
//             "Error trying to get note information",
//             &e.to_string(),
//             "get_note_metadata",
//         )
//     })
// }

// #[command]
// pub async fn get_note_content(
//     tag: String,
//     file_extension: String,
//     app_state: State<'_, AppDirs>,
// ) -> Result<String, NoteError> {
//     let file_name = format!("{}.{}", tag, file_extension);

//     let path = app_state.app_data_path.join(file_name);

//     let file_path = path.to_str().unwrap().to_string();
//     let file_content = NotesManager::read_note_content(file_path);

//     file_content.map_err(|e| {
//         NoteError::new(
//             "Error trying to get note content",
//             &e.to_string(),
//             "get_note_content",
//         )
//     })
// }

#[tauri::command]
pub async fn create_note(entry: NoteEntry, app_state: State<'_, AppDirs>) -> Result<bool, ()> {
    let file_path = app_state.app_data_path.to_str().unwrap();
    let manager_path = app_state.manager_path.as_str();

    let now = chrono::Utc::now().timestamp_millis() as u64;
    let id = Uuid::new_v4().to_string();

    // Create new entry
    let new_note = NoteV2 {
        created_at: now,
        updated_at: now,
        access_control: None,
        is_favorite: false,
        tags: Vec::new(),
        title: entry.title,
        r#type: entry.r#type,
        id: id.clone(),
    };

    // Read previous entries (if file exists)
    let mut manager = if fs::exists(manager_path).unwrap() {
        let raw_json = fs::read_to_string(manager_path).unwrap();
        serde_json::from_str::<DatabaseV2>(&raw_json).unwrap()
    } else {
        DatabaseV2 {
            notes: HashMap::new(),
            schema_version: SchemaVersion::V2,
        }
    };

    // Add new entry
    manager.notes.insert(id, new_note);

    // Write updated entries list (notes-manager)
    utils::atomic_write(
        manager_path,
        serde_json::to_string(&manager).unwrap().as_str(),
    )
    .unwrap();

    // Create note file
    utils::atomic_write(file_path, &entry.content).unwrap();

    Ok(true)
}

// #[command]
// pub async fn search_notes_by_term(
//     term: String,
//     app_state: State<'_, AppDirs>,
// ) -> Result<Vec<NoteMetadata>, NoteError> {
//     let manager_path = app_state.manager_path.to_string();

//     let files_data = NotesManager::search_notes_metadata(manager_path, term);

//     files_data.map_err(|e| {
//         NoteError::new(
//             "Error trying to search notes",
//             &e.to_string(),
//             "search_notes_by_term",
//         )
//     })
// }

// #[command]
// pub async fn edit_note(
//     tag: String,
//     file_extension: String,
//     content: String,
//     app_state: State<'_, AppDirs>,
// ) -> Result<bool, NoteError> {
//     let file_name = format!("{}.{}", tag, file_extension);

//     let path = app_state.app_data_path.join(file_name);

//     let file_path = path.to_str().unwrap().to_string();

//     let result = NotesManager::edit_note_content(file_path, content);

//     result.map_err(|e| {
//         NoteError::new(
//             "Error trying to edit note file",
//             &e.to_string(),
//             "edit_note",
//         )
//     })
// }

// #[command]
// pub async fn edit_note_metadata(
//     tag: String,
//     title: String,
//     app_state: State<'_, AppDirs>,
// ) -> Result<bool, NoteError> {
//     let manager_path = app_state.manager_path.to_string();

//     let files_data = NotesManager::edit_note_metadata(manager_path, tag, title);

//     files_data.map_err(|e| {
//         NoteError::new(
//             "Error trying to edit note metadata",
//             &e.to_string(),
//             "edit_note_metadata",
//         )
//     })
// }

// #[command]
// pub async fn remove_note(
//     tag: String,
//     file_extension: String,
//     app_state: State<'_, AppDirs>,
// ) -> Result<bool, NoteError> {
//     let file_name = format!("{}.{}", tag, file_extension);

//     let path = app_state.app_data_path.join(file_name);

//     let file_path = path.to_str().unwrap().to_string();

//     let result = NotesManager::remove_note(file_path);

//     result.map_err(|e| {
//         NoteError::new(
//             "Error trying to remove note file",
//             &e.to_string(),
//             "remove_note",
//         )
//     })
// }

// #[command]
// pub async fn remove_note_metadata(
//     tag: String,
//     app_state: State<'_, AppDirs>,
// ) -> Result<bool, NoteError> {
//     let manager_path = app_state.manager_path.to_string();

//     let files_data = NotesManager::remove_note_metadata(manager_path, tag);

//     files_data.map_err(|e| {
//         NoteError::new(
//             "Error trying to remove note metadata",
//             &e.to_string(),
//             "remove_note_metadata",
//         )
//     })
// }

#[tauri::command]
pub async fn get_total_notes_count(app_state: State<'_, AppDirs>) -> Result<usize, ()> {
    let manager_path = app_state.manager_path.as_str();

    if !fs::exists(manager_path).unwrap() {
        return Ok(0);
    }

    let raw_json_data = fs::read_to_string(manager_path).unwrap();
    let manager: DatabaseV2 = serde_json::from_str(&raw_json_data).unwrap();

    Ok(manager.notes.len())
}
