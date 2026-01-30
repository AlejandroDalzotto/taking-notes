use std::{fs, path::PathBuf};

use tauri::Result;

use crate::utils::atomic_write;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Entry {
    path: PathBuf,
    content: String,
}

#[tauri::command]
pub async fn save_file(entry: Entry) -> Result<Option<String>> {
    let path = entry.path;
    let content = entry.content;

    atomic_write(&path, content.as_str())?;

    Ok(Some(format!(
        "File saved at {}",
        path.to_string_lossy().to_string()
    )))
}

#[tauri::command]
pub async fn open_file(path: PathBuf) -> Result<Option<String>> {
    if path.exists() {
        let content = fs::read_to_string(path)?;

        Ok(Some(content))
    } else {
        Ok(None)
    }
}
