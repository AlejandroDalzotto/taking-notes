use std::io::{self, Read};
use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};
use tauri::Result;

use crate::CliFilePaths;
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
fn extract_extension(path: &Path) -> String {
    path.extension()
        .and_then(|ext| ext.to_str())
        .unwrap_or("")
        .to_string()
}

/// Atomically drain pending paths from cold start and all subsequent launches.
/// Register the `open-files` listener before the initial drain, then drain on
/// every notification. Event payloads are not file paths.
#[tauri::command]
pub fn take_cli_file_paths(state: tauri::State<'_, CliFilePaths>) -> Vec<String> {
    state.take()
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

fn too_large() -> io::Error {
    io::Error::new(
        io::ErrorKind::InvalidData,
        format!(
            "File is too large. The maximum supported size is {} MB.",
            MAX_FILE_SIZE / (1024 * 1024)
        ),
    )
}

fn read_bounded(reader: impl Read) -> io::Result<String> {
    let mut bytes = Vec::new();
    reader.take(MAX_FILE_SIZE + 1).read_to_end(&mut bytes)?;
    if bytes.len() as u64 > MAX_FILE_SIZE {
        return Err(too_large());
    }
    String::from_utf8(bytes).map_err(|e| io::Error::new(io::ErrorKind::InvalidData, e))
}

fn open_file_sync(path: &Path) -> io::Result<Option<OpenedFile>> {
    // Inspect and read the same handle, not a path that can be replaced between
    // metadata and reading. Also cap the read if the file grows after metadata.
    // Reject known directories/devices before opening: opening a FIFO can
    // block before handle metadata is available. Recheck the opened handle too.
    match std::fs::metadata(path) {
        Ok(metadata) if !metadata.is_file() => {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "Path is not a regular file",
            ));
        }
        Ok(_) => {}
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e),
    }
    let file = match std::fs::File::open(path) {
        Ok(file) => file,
        Err(e) if e.kind() == io::ErrorKind::NotFound => return Ok(None),
        Err(e) => return Err(e),
    };
    let metadata = file.metadata()?;
    if !metadata.is_file() {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "Path is not a regular file",
        ));
    }
    if metadata.len() > MAX_FILE_SIZE {
        return Err(too_large());
    }
    let content = read_bounded(file)?;
    let file_info = FileInfo {
        line_ending: detect_line_ending(&content).to_string(),
        encoding: "UTF-8".to_string(),
        file_size: content.len() as u64,
        extension: extract_extension(path),
    };
    Ok(Some(OpenedFile { content, file_info }))
}

#[tauri::command]
pub async fn open_file(path: PathBuf) -> Result<Option<OpenedFile>> {
    tokio::task::spawn_blocking(move || open_file_sync(&path))
        .await
        .map_err(|e| tauri::Error::Io(io::Error::other(e)))?
        .map_err(tauri::Error::Io)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_line_endings() {
        for (content, expected) in [
            ("", "N/A"),
            ("one\rtwo", "N/A"),
            ("one\ntwo\n", "LF"),
            ("one\r\ntwo\r\n", "CRLF"),
            ("one\r\ntwo\n", "Mixed"),
        ] {
            assert_eq!(detect_line_ending(content), expected);
        }
    }

    #[test]
    fn reads_content_and_metadata_and_handles_missing_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.md");
        assert!(open_file_sync(&path).unwrap().is_none());
        std::fs::write(&path, "héllo\r\n").unwrap();
        let opened = open_file_sync(&path).unwrap().unwrap();
        assert_eq!(opened.content, "héllo\r\n");
        assert_eq!(opened.file_info.file_size, "héllo\r\n".len() as u64);
        assert_eq!(opened.file_info.line_ending, "CRLF");
        assert_eq!(opened.file_info.extension, "md");
        assert_eq!(opened.file_info.encoding, "UTF-8");
        assert!(open_file_sync(dir.path()).is_err());
    }

    #[test]
    fn rejects_non_utf8_and_oversized_files() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("invalid.txt");
        std::fs::write(&path, [0xff]).unwrap();
        assert_eq!(
            open_file_sync(&path).unwrap_err().kind(),
            io::ErrorKind::InvalidData
        );
        std::fs::File::create(&path)
            .unwrap()
            .set_len(MAX_FILE_SIZE + 1)
            .unwrap();
        assert_eq!(
            open_file_sync(&path).unwrap_err().kind(),
            io::ErrorKind::InvalidData
        );
    }

    #[test]
    fn read_limit_is_enforced_independently_of_metadata() {
        assert_eq!(
            read_bounded(io::repeat(b'x').take(MAX_FILE_SIZE))
                .unwrap()
                .len() as u64,
            MAX_FILE_SIZE
        );
        assert_eq!(
            read_bounded(io::repeat(b'x')).unwrap_err().kind(),
            io::ErrorKind::InvalidData
        );
    }
}
