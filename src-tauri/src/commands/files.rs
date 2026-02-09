use std::path::PathBuf;

use serde::{Deserialize, Serialize};
use tauri::Result;

use crate::utils::{MAX_FILE_SIZE, atomic_write_async};

#[derive(Debug, Serialize, Deserialize)]
pub struct Entry {
    path: PathBuf,
    content: String,
}

/// Metadata about a file detected at read time.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileInfo {
    /// Detected line-ending style: "CRLF", "LF", "Mixed", or "N/A".
    pub line_ending: String,
    /// Encoding used to read the file (always "UTF-8" for now).
    pub encoding: String,
    /// On-disk file size in bytes at the moment it was read.
    pub file_size: u64,
    /// File extension without the leading dot, e.g. "txt", "md".
    /// Empty string when there is no extension.
    pub extension: String,
}

/// Bundle returned by `open_file` so the frontend gets content + metadata
/// in a single IPC round-trip.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenedFile {
    pub content: String,
    pub file_info: FileInfo,
}

/// Efficiently detect the dominant line-ending style by scanning raw bytes.
///
/// Returns early with `"Mixed"` as soon as both styles are found.
fn detect_line_ending(content: &str) -> &'static str {
    let bytes = content.as_bytes();
    let mut has_crlf = false;
    let mut has_lf_only = false;

    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'\r' && i + 1 < bytes.len() && bytes[i + 1] == b'\n' {
            has_crlf = true;
            i += 2;
        } else if bytes[i] == b'\n' {
            has_lf_only = true;
            i += 1;
        } else {
            i += 1;
        }

        if has_crlf && has_lf_only {
            return "Mixed";
        }
    }

    match (has_crlf, has_lf_only) {
        (true, false) => "CRLF",
        (false, true) => "LF",
        (true, true) => "Mixed",
        (false, false) => "N/A",
    }
}

/// Extract the file extension (without the dot) from a path.
fn extract_extension(path: &PathBuf) -> String {
    path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_string()
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
pub async fn open_file(path: PathBuf) -> Result<Option<OpenedFile>> {
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

    let file_info = FileInfo {
        line_ending: detect_line_ending(&content).to_string(),
        encoding: "UTF-8".to_string(),
        file_size: size,
        extension: extract_extension(&path),
    };

    Ok(Some(OpenedFile { content, file_info }))
}
