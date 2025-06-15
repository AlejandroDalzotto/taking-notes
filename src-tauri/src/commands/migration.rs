use std::collections::HashMap;

use serde::{Deserialize, Serialize};
use tauri::{command, State};

use crate::{AppDirs};
use crate::utils;

// La primera versión de la nota
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteV1 {
    pub title: String,
    pub tag: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub file_extension: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteV2 {
    pub id: String,
    pub title: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub access_control: Option<AccessControl>, // <- opcional
    pub is_favorite: bool,
    pub tags: Vec<String>,
    pub r#type: NoteType,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct AccessControl {
    pub password: String,
}

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "lowercase")]
pub enum NoteType {
    MD,
    TXT,
}

impl NoteType {
    fn from_file_extension(file_extension: &str) -> Self {
        match file_extension {
            "md" => NoteType::MD,
            _ => NoteType::TXT,
        }
    }
}

/// La estructura que contiene toutes las notas en V2 junto a la versión de esquema
#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DatabaseV2 {
    pub notes: HashMap<String, NoteV2>,
    pub schema_version: SchemaVersion,
}

/// La versión del esquema
#[derive(Serialize, Deserialize, Debug)]
pub enum SchemaVersion {
    V2,
}

impl DatabaseV2 {
    pub fn migrate_from_v1(v1_notes: Vec<NoteV1>) -> Self {
        let notes = v1_notes
            .into_iter()
            .map(|note_v1| {
                let id = note_v1.tag;

                let note_v2 = NoteV2 {
                    id: id.clone(),
                    title: note_v1.title,
                    created_at: note_v1.created_at,
                    updated_at: note_v1.updated_at,
                    access_control: None,
                    is_favorite: false,
                    tags: Vec::new(),
                    r#type: NoteType::from_file_extension(&note_v1.file_extension),
                };
                (id, note_v2)
            })
            .collect();

        DatabaseV2 {
            notes,
            schema_version: SchemaVersion::V2,
        }
    }
}

#[command]
pub fn check_for_migration(app_state: State<'_, AppDirs>) -> Result<bool, String> {
    let manager_path = app_state.manager_path.to_string();
    // Cargar el esquema crudo
    let raw_manager_data = std::fs::read_to_string(manager_path).expect("Error reading file manager");

    // Intentamos parsesr como V2
    let parsed_v2 = serde_json::from_str::<DatabaseV2>(&raw_manager_data);

    match parsed_v2 {
        Ok(_) => {
            // Si parsed_v2 fue OK, significa que NO necesita migrar
            Ok(false)
        }
        Err(_) => {
            // Si parsed_v2 falla, eso significa que el esquema es V1
            // o que el esquema tiene un problema
            Ok(true)
        }
    }
}

#[command]
pub fn migrate_v1_to_v2(app_state: State<'_, AppDirs>) -> Result<(), String> {
    let manager_path = app_state.manager_path.to_string();
    // load the v1 schema
    let data_v1 = std::fs::read_to_string(&manager_path).expect("Error reading file manager");
    let notes_v1: Vec<NoteV1> = serde_json::from_str(&data_v1).expect("Error trying to parse json data");

    // migrate to v2
    let db_v2 = DatabaseV2::migrate_from_v1(notes_v1);

    // save the new schema
    let serialized = serde_json::to_string(&db_v2).expect("Error trying to parse data to string");
    utils::atomic_write(manager_path, &serialized).expect("Error trying to save json data");

    Ok(())
}
