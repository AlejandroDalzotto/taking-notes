use std::collections::HashMap;
use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri::command;

use crate::utils;
use crate::utils::sanitize_filename;
use crate::utils::validate_local_files;
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

fn get_v1_local_data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_local_data_dir()
        .expect("error trying to get local app data dir")
}

fn get_v1_manager_path(app: &tauri::AppHandle) -> PathBuf {
    get_v1_local_data_dir(app).join("notes-manager.json")
}

fn get_v2_data_dir(app: &tauri::AppHandle) -> PathBuf {
    app.path()
        .app_data_dir()
        .expect("error trying to get app data dir")
}

fn get_v2_manager_path(app: &tauri::AppHandle) -> PathBuf {
    get_v2_data_dir(app).join("session.json")
}

fn get_desktop_migration_folder(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let desktop = app
        .path()
        .desktop_dir()
        .map_err(|e| format!("Error getting desktop dir: {}", e))?;

    Ok(desktop.join("taking-notes-app-notes"))
}

/// Verifica si existe la estructura V1 y si es necesario migrar
#[command]
pub fn check_for_migration_to_v2(app: tauri::AppHandle) -> Result<bool, String> {
    #[cfg(dev)]
    {
        println!("Checking for migration to V2");
    }

    let v1_manager_path = get_v1_manager_path(&app);
    let v2_manager_path = get_v2_manager_path(&app);

    // Si ya existe V2, no necesitamos migrar
    if v2_manager_path.exists() {
        #[cfg(dev)]
        {
            println!("V2 manager exists, no migration needed");
        }
        return Ok(false);
    }

    // Si existe V1, verificar que sea válido
    if v1_manager_path.exists() {
        #[cfg(dev)]
        {
            println!("V1 manager exists, migration needed");
        }
        let raw_manager_data = std::fs::read_to_string(&v1_manager_path)
            .map_err(|e| format!("Error reading V1 manager: {}", e))?;

        match serde_json::from_str::<Vec<NoteV1>>(&raw_manager_data) {
            Ok(_) => Ok(true),   // V1 válido encontrado, necesita migración
            Err(_) => Ok(false), // Archivo corrupto, no migrar
        }
    } else {
        Ok(false) // No hay V1, no necesita migración
    }
}

/// Migra de V1 a V2:
/// 1. Lee notes-manager.json del local app data
/// 2. Mueve los archivos de notas a una carpeta en el escritorio
/// 3. Crea session.json en el app data (no local)
/// 4. Limpia el directorio local app data
#[command]
pub fn migrate_v1_to_v2(app: tauri::AppHandle) -> Result<String, String> {
    let v1_manager_path = get_v1_manager_path(&app);
    let v1_data_dir = get_v1_local_data_dir(&app);
    let v2_data_dir = get_v2_data_dir(&app);
    let v2_manager_path = get_v2_manager_path(&app);

    // Verificar que V1 existe
    if !v1_manager_path.exists() {
        return Err("No V1 data found to migrate".to_string());
    }

    // Leer datos V1
    let data_v1 = std::fs::read_to_string(&v1_manager_path)
        .map_err(|e| format!("Error reading V1 manager: {}", e))?;

    let notes_v1: Vec<NoteV1> =
        serde_json::from_str(&data_v1).map_err(|e| format!("Error parsing V1 data: {}", e))?;

    // Crear carpeta de migración en el escritorio
    let desktop_folder = get_desktop_migration_folder(&app)?;
    fs::create_dir_all(&desktop_folder)
        .map_err(|e| format!("Error creating desktop folder: {}", e))?;

    // Crear directorio V2 si no existe
    fs::create_dir_all(&v2_data_dir).map_err(|e| format!("Error creating V2 data dir: {}", e))?;

    let mut recent_files: HashMap<String, LocalFile> = HashMap::new();
    let mut migrated_count = 0;

    // Migrar cada nota
    for note in notes_v1.into_iter() {
        let old_filename = format!("{}.{}", note.tag, note.file_extension);
        let src = v1_data_dir.join(&old_filename);

        if src.exists() {
            let title_sanitized = sanitize_filename(&note.title);
            let new_filename = format!("{}.{}", title_sanitized, note.file_extension);
            let dest = desktop_folder.join(&new_filename);

            // Mover archivo a escritorio
            fs::copy(&src, &dest)
                .map_err(|e| format!("Failed to copy file {:?} -> {:?}: {}", src, dest, e))?;

            // Obtener metadata del archivo en su nueva ubicación
            let metadata = fs::metadata(&dest)
                .map_err(|e| format!("Error getting metadata for {:?}: {}", dest, e))?;

            let mut modified: u64 = 0;
            if let Ok(time) = metadata.modified() {
                if let Ok(duration) = time.duration_since(std::time::UNIX_EPOCH) {
                    modified = duration.as_millis() as u64;
                }
            }

            // Agregar a recent_files
            let path_string = dest.to_string_lossy().to_string();
            recent_files.insert(
                path_string.clone(),
                LocalFile {
                    id: note.tag,
                    filename: new_filename,
                    path: path_string,
                    modified,
                },
            );

            migrated_count += 1;
        }
    }

    // Crear base de datos V2
    let db_v2 = DatabaseV2 {
        recent_files,
        session: EditorSession::default(),
        schema_version: SchemaVersion::V2,
    };

    // Guardar session.json en V2
    let serialized = serde_json::to_string_pretty(&db_v2)
        .map_err(|e| format!("Error serializing V2 data: {}", e))?;

    utils::atomic_write(&v2_manager_path, &serialized)
        .map_err(|e| format!("Error saving V2 session.json: {}", e))?;

    // Limpiar directorio V1 (local app data)
    // Intentar eliminar todo el directorio
    if let Err(e) = fs::remove_dir_all(&v1_data_dir) {
        // Si falla, al menos intentar eliminar el archivo manager
        let _ = fs::remove_file(&v1_manager_path);
        eprintln!("Warning: Could not fully clean V1 directory: {}", e);
    }

    let migration_message = format!(
        "Migration successful! {} notes moved to: {}",
        migrated_count,
        desktop_folder.display()
    );

    Ok(migration_message)
}

#[command]
pub fn load_editor_state(app: tauri::AppHandle) -> Result<DatabaseV2, String> {
    let manager_path = get_v2_manager_path(&app);

    let db = if !manager_path.exists() {
        DatabaseV2::default()
    } else {
        let raw = std::fs::read_to_string(&manager_path)
            .map_err(|e| format!("Failed reading manager file: {}", e))?;

        match serde_json::from_str::<DatabaseV2>(&raw) {
            Ok(mut db) => {
                validate_local_files(&mut db);
                db
            }
            Err(e) => {
                eprintln!("Error parsing V2 database: {}, using default", e);
                DatabaseV2::default()
            }
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
pub fn save_editor_state(app: tauri::AppHandle, state: DatabaseV2) -> Result<(), String> {
    #[cfg(dev)]
    {
        println!("Attempting to save editor state");
    }
    let manager_path = get_v2_manager_path(&app);

    let serialized = serde_json::to_string_pretty(&state).map_err(|e| e.to_string())?;

    utils::atomic_write(&manager_path, &serialized).map_err(|e| e.to_string())?;

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
