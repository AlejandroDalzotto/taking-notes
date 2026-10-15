use std::collections::HashMap;
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::Manager;
use tauri::command;

use crate::utils;
use crate::utils::sanitize_filename;
use crate::utils::validate_local_files;

#[derive(Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteV1 {
    pub title: String,
    pub tag: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub file_extension: String,
}

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq, Eq)]
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
    pub content: Option<String>, // Cached content for untitled or dirty local tabs
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

/// Serialize session reads, writes, and migration within the running instance.
#[derive(Default)]
pub struct EditorStateLock(tokio::sync::Mutex<()>);

fn get_v1_local_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    app.path()
        .app_local_data_dir()
        .map_err(|e| format!("Error getting local app data dir: {e}"))
}

fn get_v1_manager_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(get_v1_local_data_dir(app)?.join("notes-manager.json"))
}

fn get_v2_manager_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Error getting app data dir: {e}"))?
        .join("session.json"))
}

fn get_desktop_migration_folder(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let desktop = app
        .path()
        .desktop_dir()
        .map_err(|e| format!("Error getting desktop dir: {}", e))?;

    Ok(desktop.join("taking-notes-app-notes"))
}

async fn migration_needed(v1: &Path, v2: &Path) -> Result<bool, String> {
    match tokio::fs::symlink_metadata(v2).await {
        Ok(_) => return Ok(false),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(format!("Error checking V2 session: {e}")),
    }
    let raw = match tokio::fs::read_to_string(v1).await {
        Ok(raw) => raw,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(false),
        Err(e) => return Err(format!("Error reading V1 manager: {e}")),
    };
    serde_json::from_str::<Vec<NoteV1>>(&raw)
        .map_err(|e| format!("Error parsing V1 manager (original preserved): {e}"))?;
    Ok(true)
}

#[command]
pub async fn check_for_migration_to_v2(
    app: tauri::AppHandle,
    lock: tauri::State<'_, EditorStateLock>,
) -> Result<bool, String> {
    let _guard = lock.0.lock().await;
    migration_needed(&get_v1_manager_path(&app)?, &get_v2_manager_path(&app)?).await
}

fn safe_legacy_component(value: &str) -> bool {
    !value.is_empty()
        && !value
            .chars()
            .any(|c| c.is_control() || matches!(c, '/' | '\\' | ':'))
        && value != "."
        && value != ".."
}

/// Copy to a synced temporary file, then publish without replacing any file.
/// Sanitized title collisions (including case-insensitive ones) get suffixes.
fn copy_note(src: &Path, folder: &Path, title: &str, extension: &str) -> Result<PathBuf, String> {
    let mut source =
        std::fs::File::open(src).map_err(|e| format!("Error opening {}: {e}", src.display()))?;
    if !source.metadata().map_err(|e| e.to_string())?.is_file() {
        return Err(format!(
            "Legacy note is not a regular file: {}",
            src.display()
        ));
    }
    let mut temp = tempfile::NamedTempFile::new_in(folder).map_err(|e| e.to_string())?;
    std::io::copy(&mut source, &mut temp)
        .map_err(|e| format!("Error copying {}: {e}", src.display()))?;
    temp.as_file().sync_all().map_err(|e| e.to_string())?;
    let title = sanitize_filename(title);
    let extension = sanitize_filename(extension);
    for suffix in 0u64.. {
        let filename = if suffix == 0 {
            format!("{title}.{extension}")
        } else {
            format!("{title} ({}).{extension}", suffix + 1)
        };
        let dest = folder.join(filename);
        match temp.persist_noclobber(&dest) {
            Ok(_) => return Ok(dest),
            Err(e) if e.error.kind() == std::io::ErrorKind::AlreadyExists => temp = e.file,
            Err(e) => return Err(format!("Error publishing {}: {}", dest.display(), e.error)),
        }
    }
    unreachable!()
}

fn migrate_paths(
    v1_manager: &Path,
    v1_dir: &Path,
    v2_manager: &Path,
    folder: &Path,
) -> Result<String, String> {
    match std::fs::symlink_metadata(v2_manager) {
        Ok(_) => return Err("V2 session already exists; refusing to overwrite it".into()),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(format!("Error checking V2 session: {e}")),
    }
    let raw = std::fs::read_to_string(v1_manager)
        .map_err(|e| format!("Error reading V1 manager: {e}"))?;
    let notes: Vec<NoteV1> =
        serde_json::from_str(&raw).map_err(|e| format!("Error parsing V1 manager: {e}"))?;
    let canonical_dir =
        std::fs::canonicalize(v1_dir).map_err(|e| format!("Error resolving V1 directory: {e}"))?;

    // Validate every source before exporting anything. Missing notes must not
    // silently produce a supposedly complete V2 migration.
    let mut sources = Vec::new();
    for note in &notes {
        if !safe_legacy_component(&note.tag) || !safe_legacy_component(&note.file_extension) {
            return Err(format!("Unsafe legacy filename for note {:?}", note.tag));
        }
        let src = v1_dir.join(format!("{}.{}", note.tag, note.file_extension));
        let resolved = std::fs::canonicalize(&src)
            .map_err(|e| format!("Error resolving legacy note {}: {e}", src.display()))?;
        if !resolved.starts_with(&canonical_dir) || !resolved.is_file() {
            return Err(format!(
                "Legacy note is not a file inside the data directory: {}",
                src.display()
            ));
        }
        sources.push(resolved);
    }
    std::fs::create_dir_all(folder).map_err(|e| format!("Error creating migration folder: {e}"))?;
    if let Some(parent) = v2_manager.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Error creating V2 data directory: {e}"))?;
    }
    let mut db = DatabaseV2::default();
    for (note, src) in notes.into_iter().zip(sources) {
        let dest = copy_note(&src, folder, &note.title, &note.file_extension)?;
        let path = dest
            .to_str()
            .ok_or("Migrated path cannot be represented in UTF-8")?
            .to_string();
        let filename = dest
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or("Invalid migrated filename")?
            .to_string();
        let modified = std::fs::metadata(&dest)
            .and_then(|m| m.modified())
            .ok()
            .and_then(|time| time.duration_since(std::time::UNIX_EPOCH).ok())
            .map_or(0, |duration| duration.as_millis() as u64);
        db.recent_files.insert(
            path.clone(),
            LocalFile {
                id: note.tag,
                filename,
                modified,
                path,
            },
        );
    }
    let serialized =
        serde_json::to_string_pretty(&db).map_err(|e| format!("Error serializing V2 data: {e}"))?;
    utils::atomic_write_new(v2_manager, &serialized)
        .map_err(|e| format!("Error publishing V2 session: {e}"))?;

    // Never delete the legacy directory: local-data and data directories can
    // coincide, and it can also contain unrelated files or recoverable notes.
    Ok(format!(
        "Migration successful! {} notes copied to: {}. Legacy data retained.",
        db.recent_files.len(),
        folder.display()
    ))
}

#[command]
pub async fn migrate_v1_to_v2(
    app: tauri::AppHandle,
    lock: tauri::State<'_, EditorStateLock>,
) -> Result<String, String> {
    let _guard = lock.0.lock().await;
    let manager = get_v1_manager_path(&app)?;
    let data = get_v1_local_data_dir(&app)?;
    let v2 = get_v2_manager_path(&app)?;
    let folder = get_desktop_migration_folder(&app)?;
    tokio::task::spawn_blocking(move || migrate_paths(&manager, &data, &v2, &folder))
        .await
        .map_err(|e| format!("Migration task failed: {e}"))?
}

fn parse_v2(raw: &str) -> Result<DatabaseV2, String> {
    let db: DatabaseV2 = serde_json::from_str(raw)
        .map_err(|e| format!("Invalid session JSON (original preserved): {e}"))?;
    if db.schema_version != SchemaVersion::V2 {
        return Err("Unsupported session schema version (original preserved)".into());
    }
    Ok(db)
}

async fn load_state_at(path: &Path) -> Result<DatabaseV2, String> {
    let raw = match tokio::fs::read_to_string(path).await {
        Ok(raw) => raw,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(DatabaseV2::default()),
        Err(e) => return Err(format!("Failed reading session file: {e}")),
    };
    let mut db = parse_v2(&raw)?;
    validate_local_files(&mut db).await;
    Ok(db)
}

#[command]
pub async fn load_editor_state(
    app: tauri::AppHandle,
    lock: tauri::State<'_, EditorStateLock>,
) -> Result<DatabaseV2, String> {
    let _guard = lock.0.lock().await;
    load_state_at(&get_v2_manager_path(&app)?).await
}

fn save_state_at(path: &Path, state: &DatabaseV2) -> Result<(), String> {
    if state.schema_version != SchemaVersion::V2 {
        return Err("Refusing to save an unsupported session schema version".into());
    }
    // Frontends may autosave empty state after a failed load. Do not destroy
    // unreadable/corrupt sessions; require explicit recovery outside autosave.
    match std::fs::read_to_string(path) {
        Ok(raw) => {
            parse_v2(&raw)?;
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => {}
        Err(e) => return Err(format!("Refusing to overwrite unreadable session: {e}")),
    }
    let serialized =
        serde_json::to_string_pretty(state).map_err(|e| format!("Serialization error: {e}"))?;
    if let Some(parent) = path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Error creating session directory: {e}"))?;
    }
    utils::atomic_write(path, &serialized).map_err(|e| format!("Error writing session file: {e}"))
}

#[command]
pub async fn save_editor_state(
    app: tauri::AppHandle,
    state: DatabaseV2,
    lock: tauri::State<'_, EditorStateLock>,
) -> Result<(), String> {
    let _guard = lock.0.lock().await;
    let path = get_v2_manager_path(&app)?;
    tokio::task::spawn_blocking(move || save_state_at(&path, &state))
        .await
        .map_err(|e| format!("Session save task failed: {e}"))?
}

#[cfg(test)]
mod tests {
    use super::*;

    fn runtime() -> tokio::runtime::Runtime {
        tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap()
    }

    fn note(tag: &str, title: &str) -> NoteV1 {
        NoteV1 {
            title: title.into(),
            tag: tag.into(),
            created_at: 0,
            updated_at: 0,
            file_extension: "txt".into(),
        }
    }

    fn legacy(dir: &Path, notes: &[NoteV1]) -> PathBuf {
        std::fs::create_dir_all(dir).unwrap();
        let manager = dir.join("notes-manager.json");
        std::fs::write(&manager, serde_json::to_string(notes).unwrap()).unwrap();
        manager
    }

    #[test]
    fn migration_preserves_colliding_notes_existing_exports_and_shared_data_directory() {
        let root = tempfile::tempdir().unwrap();
        let data = root.path().join("data");
        let folder = root.path().join("exports");
        let manager = legacy(&data, &[note("a", "same/name"), note("b", "same:name")]);
        std::fs::write(data.join("a.txt"), "first note").unwrap();
        std::fs::write(data.join("b.txt"), "second note").unwrap();
        std::fs::write(data.join("unrelated.dat"), "keep me").unwrap();
        std::fs::create_dir_all(&folder).unwrap();
        std::fs::write(folder.join("same_name.txt"), "existing export").unwrap();
        let session = data.join("session.json");
        migrate_paths(&manager, &data, &session, &folder).unwrap();
        assert_eq!(
            std::fs::read_to_string(folder.join("same_name.txt")).unwrap(),
            "existing export"
        );
        assert_eq!(
            std::fs::read_to_string(folder.join("same_name (2).txt")).unwrap(),
            "first note"
        );
        assert_eq!(
            std::fs::read_to_string(folder.join("same_name (3).txt")).unwrap(),
            "second note"
        );
        assert!(manager.exists());
        assert_eq!(
            std::fs::read_to_string(data.join("a.txt")).unwrap(),
            "first note"
        );
        assert_eq!(
            std::fs::read_to_string(data.join("unrelated.dat")).unwrap(),
            "keep me"
        );
        let db = parse_v2(&std::fs::read_to_string(&session).unwrap()).unwrap();
        assert_eq!(db.recent_files.len(), 2);
        assert!(db.session.tabs.is_empty());
        assert!(
            !runtime()
                .block_on(migration_needed(&manager, &session))
                .unwrap()
        );
        let original = std::fs::read(&session).unwrap();
        assert!(migrate_paths(&manager, &data, &session, &folder).is_err());
        assert_eq!(std::fs::read(&session).unwrap(), original);
    }

    #[test]
    fn missing_or_unsafe_legacy_notes_do_not_publish_a_session() {
        let root = tempfile::tempdir().unwrap();
        let data = root.path().join("data");
        let session = root.path().join("v2/session.json");
        let exports = root.path().join("exports");
        for notes in [
            vec![note("missing", "Missing")],
            vec![note("../outside", "Escape")],
            vec![NoteV1 {
                file_extension: "../txt".into(),
                ..note("a", "Escape")
            }],
            vec![note(r"..\outside", "Escape")],
        ] {
            let manager = legacy(&data, &notes);
            assert!(migrate_paths(&manager, &data, &session, &exports).is_err());
            assert!(manager.exists());
            assert!(!session.exists());
            assert!(!exports.exists());
        }
    }

    #[cfg(unix)]
    #[test]
    fn migration_rejects_symlinks_outside_legacy_directory() {
        let root = tempfile::tempdir().unwrap();
        let data = root.path().join("data");
        let manager = legacy(&data, &[note("a", "Escape")]);
        let outside = root.path().join("outside.txt");
        std::fs::write(&outside, "private").unwrap();
        std::os::unix::fs::symlink(&outside, data.join("a.txt")).unwrap();
        assert!(
            migrate_paths(
                &manager,
                &data,
                &data.join("session.json"),
                &root.path().join("exports")
            )
            .is_err()
        );
    }

    #[test]
    fn session_roundtrip_keeps_schema_and_dirty_local_content() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("new/data/session.json");
        let mut state = DatabaseV2::default();
        state.session.tabs.push(SessionTab {
            id: "draft".into(),
            path: None,
            filename: "untitled".into(),
            is_dirty: true,
            content: Some("draft text".into()),
        });
        state.session.current_tab_id = Some("draft".into());
        save_state_at(&path, &state).unwrap();
        let raw = std::fs::read_to_string(&path).unwrap();
        let json: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert_eq!(json["schemaVersion"], "V2");
        assert!(json.get("recentFiles").is_some());
        assert_eq!(json["session"]["currentTabId"], "draft");
        assert_eq!(json["session"]["tabs"][0]["isDirty"], true);
        assert!(json["session"]["tabs"][0].get("path").is_none());
        let loaded = runtime().block_on(load_state_at(&path)).unwrap();
        assert_eq!(
            loaded.session.tabs[0].content.as_deref(),
            Some("draft text")
        );
        let local = root.path().join("local.txt");
        std::fs::write(&local, "saved").unwrap();
        state.session.tabs[0].path = Some(local.to_str().unwrap().into());
        state.session.tabs[0].content = Some("unsaved local changes".into());
        save_state_at(&path, &state).unwrap();
        let loaded = runtime().block_on(load_state_at(&path)).unwrap();
        assert_eq!(loaded.session.tabs[0].path, state.session.tabs[0].path);
        assert_eq!(
            loaded.session.tabs[0].content.as_deref(),
            Some("unsaved local changes")
        );
    }

    #[test]
    fn corrupt_unsupported_and_unreadable_sessions_are_not_replaced_by_autosave() {
        let root = tempfile::tempdir().unwrap();
        let path = root.path().join("session.json");
        let runtime = runtime();
        assert!(
            runtime
                .block_on(load_state_at(&path))
                .unwrap()
                .session
                .tabs
                .is_empty()
        );
        for raw in [
            "{bad json",
            r#"{"recentFiles":{},"session":{"tabs":[]},"schemaVersion":"V1"}"#,
        ] {
            std::fs::write(&path, raw).unwrap();
            assert!(runtime.block_on(load_state_at(&path)).is_err());
            assert!(save_state_at(&path, &DatabaseV2::default()).is_err());
            assert_eq!(std::fs::read_to_string(&path).unwrap(), raw);
        }
        std::fs::remove_file(&path).unwrap();
        std::fs::create_dir(&path).unwrap();
        assert!(runtime.block_on(load_state_at(&path)).is_err());
        assert!(save_state_at(&path, &DatabaseV2::default()).is_err());
        assert!(path.is_dir());
        let unsupported = DatabaseV2 {
            schema_version: SchemaVersion::V1,
            ..DatabaseV2::default()
        };
        assert!(save_state_at(&root.path().join("new.json"), &unsupported).is_err());
        assert!(!root.path().join("new.json").exists());
    }

    #[test]
    fn migration_check_reports_corruption_instead_of_silently_skipping_it() {
        let root = tempfile::tempdir().unwrap();
        let v1 = root.path().join("notes-manager.json");
        let v2 = root.path().join("session.json");
        let runtime = runtime();
        assert!(!runtime.block_on(migration_needed(&v1, &v2)).unwrap());
        std::fs::write(&v1, "broken").unwrap();
        assert!(runtime.block_on(migration_needed(&v1, &v2)).is_err());
        std::fs::write(&v1, "[]").unwrap();
        assert!(runtime.block_on(migration_needed(&v1, &v2)).unwrap());
        std::fs::write(&v2, "do not overwrite even if corrupt").unwrap();
        assert!(!runtime.block_on(migration_needed(&v1, &v2)).unwrap());
    }
}
