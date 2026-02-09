use std::path::PathBuf;

use tauri::Result;

use crate::utils::{MAX_FILE_SIZE, atomic_write_async};

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct Entry {
    path: PathBuf,
    content: String,
}

#[tauri::command]
pub async fn save_file(entry: Entry) -> Result<Option<String>> {
    let path = entry.path;
    let content = entry.content;

    atomic_write_async(path.clone(), content)
        .await
        .map_err(|e| tauri::Error::Io(e))?;

    Ok(Some(format!("File saved at {}", path.to_string_lossy())))
}

#[tauri::command]
pub async fn open_file(path: PathBuf) -> Result<Option<String>> {
    // Check if the file exists before doing anything else.
    let metadata = match tokio::fs::metadata(&path).await {
        Ok(m) => m,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(tauri::Error::Io(e)),
    };

    // Guard against accidentally opening huge files.
    let size = metadata.len();
    if size > MAX_FILE_SIZE {
        return Err(tauri::Error::Io(std::io::Error::new(
            std::io::ErrorKind::InvalidData,
            format!(
                "File is too large ({:.1} MB). The maximum supported size is {:.0} MB.",
                size as f64 / (1024.0 * 1024.0),
                MAX_FILE_SIZE as f64 / (1024.0 * 1024.0),
            ),
        )));
    }

    let content = tokio::fs::read_to_string(&path)
        .await
        .map_err(|e| tauri::Error::Io(e))?;

    Ok(Some(content))
}
