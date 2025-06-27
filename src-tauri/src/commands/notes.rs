use std::collections::HashMap;
use std::fs;

use crate::commands::migration::{AccessControl, NoteType};
use crate::migration::{DatabaseV2, NoteV2, SchemaVersion};
use crate::utils::{decrypt_spanish_caesar, encrypt_spanish_caesar};
use crate::{utils, AppDirs};
use argon2::password_hash::rand_core::OsRng;
use argon2::password_hash::SaltString;
use argon2::{Argon2, PasswordHasher, PasswordVerifier};
use tauri::State;
use uuid::Uuid;

#[derive(serde::Deserialize, serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteEntry {
    pub title: String,
    pub content: String,
    pub r#type: NoteType,
}

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

#[tauri::command]
pub async fn get_note(
    id: String,
    r#type: String,
    app_state: State<'_, AppDirs>,
) -> Result<(String, NoteV2), ()> {
    let file_path = app_state.app_data_path.join(format!("{}.{}", &id, r#type));
    let manager_path = app_state.manager_path.as_str();

    let manager = if fs::exists(manager_path).unwrap() {
        let raw_json = fs::read_to_string(manager_path).unwrap();
        serde_json::from_str::<DatabaseV2>(&raw_json).unwrap()
    } else {
        DatabaseV2 {
            notes: HashMap::new(),
            schema_version: SchemaVersion::V2,
        }
    };

    let note = manager.notes.get(&id).unwrap().clone();

    let content = fs::read_to_string(file_path).unwrap();
    if note.access_control.is_some() {
        let decrypted_content = decrypt_spanish_caesar(&content);

        return Ok((decrypted_content, note));
    }

    Ok((content, note))
}

#[tauri::command]
pub async fn create_note(entry: NoteEntry, app_state: State<'_, AppDirs>) -> Result<bool, ()> {
    let id = Uuid::new_v4().to_string();
    let file_path = app_state
        .app_data_path
        .join(format!("{}.{}", &id, &entry.r#type));
    let manager_path = app_state.manager_path.as_str();

    let now = chrono::Utc::now().timestamp_millis() as u64;

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

#[tauri::command]
pub async fn search_notes_by_term(
    term: String,
    app_state: State<'_, AppDirs>,
) -> Result<HashMap<String, NoteV2>, ()> {
    let manager_path = app_state.manager_path.as_str();

    let raw_json = match fs::read_to_string(manager_path) {
        Ok(json) => json,
        Err(_) => return Err(()),
    };

    let manager = match serde_json::from_str::<DatabaseV2>(&raw_json) {
        Ok(db) => db,
        Err(_) => return Err(()),
    };

    let lowercased_term = term.to_lowercase();

    let filtered_notes = manager
        .notes
        .into_iter()
        .filter(|(_key, note)| note.title.to_lowercase().contains(&lowercased_term))
        .collect();

    Ok(filtered_notes)
}

#[tauri::command]
pub async fn edit_note(
    id: String,
    entry: NoteEntry,
    app_state: State<'_, AppDirs>,
) -> Result<bool, ()> {
    let file_path = app_state
        .app_data_path
        .join(format!("{}.{}", &id, &entry.r#type));
    let manager_path = app_state.manager_path.as_str();

    if fs::exists(manager_path).unwrap() {
        let now = chrono::Utc::now().timestamp_millis() as u64;

        // Read previous entries (if file exists)
        let raw_json = fs::read_to_string(manager_path).unwrap();
        let mut manager = serde_json::from_str::<DatabaseV2>(&raw_json).unwrap();

        if let Some(x) = manager.notes.get_mut(&id) {
            x.updated_at = now;
            x.title = entry.title;
        }

        // Write updated entries list (notes-manager)
        utils::atomic_write(
            manager_path,
            serde_json::to_string(&manager).unwrap().as_str(),
        )
        .unwrap();

        utils::atomic_write(file_path, &entry.content).unwrap();

        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn remove_note(
    id: String,
    r#type: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, ()> {
    let file_path = app_state.app_data_path.join(format!("{}.{}", &id, r#type));
    let manager_path = app_state.manager_path.as_str();

    if fs::exists(manager_path).unwrap() {
        // Read previous entries (if file exists)
        let raw_json = fs::read_to_string(manager_path).unwrap();
        let mut manager = serde_json::from_str::<DatabaseV2>(&raw_json).unwrap();

        manager.notes.remove(&id);

        // Write updated entries list without the removed one (notes-manager)
        utils::atomic_write(
            manager_path,
            serde_json::to_string(&manager).unwrap().as_str(),
        )
        .unwrap();

        fs::remove_file(file_path).unwrap();

        Ok(true)
    } else {
        Ok(false)
    }
}

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

#[tauri::command]
pub async fn toggle_favorite(
    id: String,
    current: bool,
    app_state: State<'_, AppDirs>,
) -> Result<bool, ()> {
    let manager_path = app_state.manager_path.as_str();

    if fs::exists(manager_path).unwrap() {
        // Read previous entries (if file exists)
        let raw_json = fs::read_to_string(manager_path).unwrap();
        let mut manager = serde_json::from_str::<DatabaseV2>(&raw_json).unwrap();

        if let Some(item) = manager.notes.get_mut(&id) {
            item.is_favorite = !current;
        }

        utils::atomic_write(
            manager_path,
            serde_json::to_string(&manager).unwrap().as_str(),
        )
        .unwrap();

        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn save_password(
    id: String,
    password: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, ()> {
    let manager_path = app_state.manager_path.as_str();

    if fs::exists(manager_path).unwrap() {
        // Read previous entries (if file exists)
        let raw_json = fs::read_to_string(manager_path).unwrap();
        let mut manager = serde_json::from_str::<DatabaseV2>(&raw_json).unwrap();

        if let Some(item) = manager.notes.get_mut(&id) {
            // Generate a random salt
            let salt = SaltString::generate(&mut OsRng);

            // Create an Argon2 instance with default parameters
            // You might want to adjust the parameters (memory, time, threads)
            // based on your security requirements and performance considerations.
            let argon2 = Argon2::default();
            // Hash the password
            let password_hashed =
                Argon2::hash_password(&argon2, password.as_bytes(), &salt).unwrap();

            item.access_control = Some(AccessControl {
                password: password_hashed.to_string(),
            });

            drop(password_hashed);

            let file_path = app_state
                .app_data_path
                .join(format!("{}.{}", &item.id, &item.r#type));

            let file_content = fs::read_to_string(&file_path).unwrap();

            let new_encrypted_content = encrypt_spanish_caesar(&file_content);

            utils::atomic_write(
                file_path,
                &new_encrypted_content
            )
            .unwrap();
        }

        utils::atomic_write(
            manager_path,
            serde_json::to_string(&manager).unwrap().as_str(),
        )
        .unwrap();

        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
pub async fn verify_password(
    id: String,
    password: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, ()> {
    let manager_path = app_state.manager_path.as_str();

    if fs::exists(manager_path).unwrap() {
        // Read previous entries (if file exists)
        let raw_json = fs::read_to_string(manager_path).unwrap();
        let manager = serde_json::from_str::<DatabaseV2>(&raw_json).unwrap();

        if let Some(item) = manager.notes.get(&id) {
            if let Some(note_access_control) = &item.access_control {
                let note_password = &note_access_control.password;

                // Parse the stored hash
                let parsed_hash = argon2::password_hash::PasswordHash::new(note_password).unwrap();

                // Create an Argon2 instance (parameters must match those used for hashing if not default)
                let argon2 = Argon2::default();

                // Verify the password
                return Ok(argon2
                    .verify_password(password.as_bytes(), &parsed_hash)
                    .is_ok());
            }

            return Ok(false);
        }

        Ok(false)
    } else {
        Ok(false)
    }
}
