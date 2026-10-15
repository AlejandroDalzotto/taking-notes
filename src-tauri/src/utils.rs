use std::collections::HashSet;
use std::io::Write;
use std::path::{Path, PathBuf};

use tempfile::NamedTempFile;
use tokio::task::JoinSet;

use crate::commands::migration::DatabaseV2;

/// Maximum file size the app will open (10 MB).
pub const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024;

fn write_temp(path: &Path, content: &str) -> std::io::Result<NamedTempFile> {
    // `Path::parent` returns an empty path for a bare relative filename.
    let parent = path
        .parent()
        .filter(|p| !p.as_os_str().is_empty())
        .unwrap_or(Path::new("."));
    let mut temp = NamedTempFile::new_in(parent)?;
    temp.write_all(content.as_bytes())?;
    temp.as_file().sync_all()?;
    Ok(temp)
}

/// Replace a file atomically using a synced temporary file on the same drive.
/// Synchronous: call from `spawn_blocking` or use [`atomic_write_async`].
/// A directory fsync is not performed, so power-loss durability is OS-dependent.
pub fn atomic_write<P: AsRef<Path>>(path: P, content: &str) -> std::io::Result<()> {
    let path = path.as_ref();
    // Saving through a symlink should update its target, not destroy the link.
    let target = match std::fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => std::fs::canonicalize(path)?,
        Ok(_) => path.to_path_buf(),
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => path.to_path_buf(),
        Err(e) => return Err(e),
    };
    let permissions = match std::fs::metadata(&target) {
        Ok(metadata) => {
            if !metadata.is_file() {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::InvalidInput,
                    "Path is not a regular file",
                ));
            }
            let permissions = metadata.permissions();
            if permissions.readonly() {
                return Err(std::io::Error::new(
                    std::io::ErrorKind::PermissionDenied,
                    "File is read-only",
                ));
            }
            Some(permissions)
        }
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => None,
        Err(e) => return Err(e),
    };
    let temp = write_temp(&target, content)?;
    if let Some(permissions) = permissions {
        temp.as_file().set_permissions(permissions)?;
        temp.as_file().sync_all()?;
    }
    temp.persist(&target)?;
    Ok(())
}

/// Publish new data without ever replacing an existing destination.
pub fn atomic_write_new(path: &Path, content: &str) -> std::io::Result<()> {
    write_temp(path, content)?.persist_noclobber(path)?;
    Ok(())
}

/// Async wrapper around [`atomic_write`].
///
/// Moves the owned data into a blocking task so the Tokio runtime thread is
/// never stalled by disk I/O.
pub async fn atomic_write_async(path: PathBuf, content: String) -> Result<(), std::io::Error> {
    tokio::task::spawn_blocking(move || atomic_write(&path, &content))
        .await
        .map_err(std::io::Error::other)?
}

pub fn sanitize_filename(input: &str) -> String {
    let forbidden = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let mut s: String = input
        .chars()
        .map(|c| {
            if forbidden.contains(&c) || c.is_control() {
                '_'
            } else {
                c
            }
        })
        .collect();
    s = s
        .trim_matches(|c: char| c.is_whitespace() || c == '.')
        .to_string();
    if s.is_empty() {
        s = "untitled".to_string();
    }
    // Windows reserves these names even when followed by an extension.
    let stem = s.split('.').next().unwrap_or("").to_ascii_uppercase();
    if matches!(stem.as_str(), "CON" | "PRN" | "AUX" | "NUL")
        || (stem.len() == 4
            && (stem.starts_with("COM") || stem.starts_with("LPT"))
            && matches!(stem.as_bytes()[3], b'1'..=b'9'))
    {
        s.insert(0, '_');
    }
    s
}

fn definitely_unavailable(metadata: std::io::Result<std::fs::Metadata>) -> bool {
    match metadata {
        Ok(metadata) => !metadata.is_file(),
        // Permission errors and temporarily unavailable drives are not proof
        // that a file was deleted. Never discard session data on those errors.
        Err(e) => e.kind() == std::io::ErrorKind::NotFound,
    }
}

/// Validate that local files referenced by tabs and recent-files still exist
/// on disk.  All metadata checks run **concurrently** via a [`JoinSet`] so
/// startup isn't blocked by slow / network-mounted drives.
pub async fn validate_local_files(db: &mut DatabaseV2) {
    // 1. Collect every unique path we need to check.
    let mut paths_to_check: Vec<String> = Vec::new();
    let mut seen = HashSet::new();

    for tab in &db.session.tabs {
        if let Some(path) = &tab.path {
            if seen.insert(path.clone()) {
                paths_to_check.push(path.clone());
            }
        }
    }

    for path in db.recent_files.keys() {
        if seen.insert(path.clone()) {
            paths_to_check.push(path.clone());
        }
    }

    // 2. Check all paths concurrently.
    let mut set = JoinSet::new();

    for path in paths_to_check {
        set.spawn(async move {
            let unavailable = definitely_unavailable(tokio::fs::metadata(&path).await);
            (path, unavailable)
        });
    }

    let mut unavailable_paths: HashSet<String> = HashSet::new();

    while let Some(result) = set.join_next().await {
        if let Ok((path, true)) = result {
            unavailable_paths.insert(path);
        }
    }

    // Preserve cached edits as untitled recovery tabs if their file is gone.
    // A failed metadata task is likewise not evidence of a deleted file.
    db.session.tabs.retain_mut(|tab| {
        if tab
            .path
            .as_ref()
            .is_some_and(|path| unavailable_paths.contains(path))
        {
            if tab.content.is_some() {
                tab.path = None;
                return true;
            }
            return false;
        }
        true
    });

    db.recent_files
        .retain(|path, _| !unavailable_paths.contains(path));

    // 5. Fix currentTabId if it points to a tab that was just removed.
    if let Some(current_id) = &db.session.current_tab_id {
        let still_exists = db.session.tabs.iter().any(|tab| &tab.id == current_id);
        if !still_exists {
            db.session.current_tab_id = None;
        }
    }

    // 6. If there is no current tab but tabs remain, select the first one.
    if db.session.current_tab_id.is_none() && !db.session.tabs.is_empty() {
        db.session.current_tab_id = Some(db.session.tabs[0].id.clone());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::commands::migration::{LocalFile, SessionTab};

    #[test]
    fn atomic_writes_replace_files_and_do_not_clobber_new_destinations() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("note.txt");
        atomic_write(&path, "first").unwrap();
        atomic_write(&path, "second").unwrap();
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "second");
        assert_eq!(
            atomic_write_new(&path, "third").unwrap_err().kind(),
            std::io::ErrorKind::AlreadyExists
        );
        assert_eq!(std::fs::read_to_string(&path).unwrap(), "second");
        assert!(atomic_write(dir.path(), "bad").is_err());
        assert_eq!(std::fs::read_dir(dir.path()).unwrap().count(), 1);
    }

    #[test]
    fn bare_relative_filenames_use_current_directory() {
        let file = tempfile::Builder::new()
            .prefix("atomic-write-test-")
            .tempfile_in(".")
            .unwrap()
            .into_temp_path();
        let filename = file.file_name().unwrap();
        atomic_write(Path::new(filename), "relative").unwrap();
        assert_eq!(std::fs::read_to_string(&file).unwrap(), "relative");
    }

    #[cfg(unix)]
    #[test]
    fn preserves_permissions_and_symlinks() {
        use std::os::unix::fs::{PermissionsExt, symlink};
        let dir = tempfile::tempdir().unwrap();
        let target = dir.path().join("target.txt");
        let link = dir.path().join("link.txt");
        std::fs::write(&target, "before").unwrap();
        std::fs::set_permissions(&target, std::fs::Permissions::from_mode(0o640)).unwrap();
        symlink(&target, &link).unwrap();
        atomic_write(&link, "after").unwrap();
        assert!(
            std::fs::symlink_metadata(&link)
                .unwrap()
                .file_type()
                .is_symlink()
        );
        assert_eq!(std::fs::read_to_string(&target).unwrap(), "after");
        assert_eq!(
            std::fs::metadata(&target).unwrap().permissions().mode() & 0o777,
            0o640
        );
        std::fs::set_permissions(&target, std::fs::Permissions::from_mode(0o440)).unwrap();
        assert_eq!(
            atomic_write(&link, "lost").unwrap_err().kind(),
            std::io::ErrorKind::PermissionDenied
        );
        assert_eq!(std::fs::read_to_string(&target).unwrap(), "after");
    }

    #[test]
    fn sanitizes_control_characters_and_windows_reserved_names() {
        assert_eq!(sanitize_filename("  ...  "), "untitled");
        assert_eq!(sanitize_filename("a/b\n:c"), "a_b__c");
        assert_eq!(sanitize_filename("con.txt"), "_con.txt");
        assert_eq!(sanitize_filename("LPT9"), "_LPT9");
        assert_eq!(sanitize_filename("COM10"), "COM10");
    }

    #[test]
    fn transient_metadata_errors_do_not_mean_deleted() {
        for kind in [
            std::io::ErrorKind::PermissionDenied,
            std::io::ErrorKind::Other,
            std::io::ErrorKind::TimedOut,
        ] {
            assert!(!definitely_unavailable(Err(std::io::Error::from(kind))));
        }
        assert!(definitely_unavailable(Err(std::io::Error::from(
            std::io::ErrorKind::NotFound
        ))));
    }

    #[test]
    fn validation_preserves_selected_recovery_tab_and_drops_directories() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().to_str().unwrap().to_string();
        let mut db = DatabaseV2::default();
        db.session.tabs = vec![
            SessionTab {
                id: "recovery".into(),
                path: Some(path.clone()),
                filename: "note.txt".into(),
                is_dirty: true,
                content: Some("edits".into()),
            },
            SessionTab {
                id: "directory".into(),
                path: Some(path.clone()),
                filename: "directory".into(),
                is_dirty: false,
                content: None,
            },
        ];
        db.session.current_tab_id = Some("recovery".into());
        db.recent_files.insert(
            path.clone(),
            LocalFile {
                id: "directory".into(),
                filename: "directory".into(),
                modified: 0,
                path,
            },
        );
        runtime.block_on(validate_local_files(&mut db));
        assert_eq!(db.session.tabs.len(), 1);
        assert!(db.session.tabs[0].path.is_none());
        assert_eq!(db.session.current_tab_id.as_deref(), Some("recovery"));
        assert!(db.recent_files.is_empty());
        db.session.tabs.clear();
        runtime.block_on(validate_local_files(&mut db));
        assert!(db.session.current_tab_id.is_none());
    }

    #[test]
    fn validation_preserves_missing_files_unsaved_content_and_repairs_selection() {
        let runtime = tokio::runtime::Builder::new_current_thread()
            .enable_all()
            .build()
            .unwrap();
        let dir = tempfile::tempdir().unwrap();
        let missing = dir.path().join("missing.txt").to_str().unwrap().to_string();
        let existing = dir
            .path()
            .join("existing.txt")
            .to_str()
            .unwrap()
            .to_string();
        std::fs::write(&existing, "on disk").unwrap();
        let mut db = DatabaseV2::default();
        for (id, path, content) in [
            ("clean-missing", Some(missing.clone()), None),
            (
                "dirty-missing",
                Some(missing.clone()),
                Some("unsaved edits".to_string()),
            ),
            ("empty-missing", Some(missing.clone()), Some(String::new())),
            ("existing", Some(existing.clone()), None),
            ("untitled", None, Some("draft".to_string())),
        ] {
            db.session.tabs.push(SessionTab {
                id: id.into(),
                path,
                filename: "note.txt".into(),
                is_dirty: content.is_some(),
                content,
            });
        }
        db.session.current_tab_id = Some("clean-missing".into());
        for path in [&missing, &existing] {
            db.recent_files.insert(
                path.clone(),
                LocalFile {
                    id: path.clone(),
                    filename: "note.txt".into(),
                    path: path.clone(),
                    modified: 0,
                },
            );
        }
        runtime.block_on(validate_local_files(&mut db));
        assert_eq!(db.session.tabs.len(), 4);
        assert_eq!(db.session.tabs[0].path, None);
        assert_eq!(db.session.tabs[0].content.as_deref(), Some("unsaved edits"));
        assert!(db.session.tabs[0].is_dirty);
        assert_eq!(db.session.tabs[1].content.as_deref(), Some(""));
        assert_eq!(db.session.current_tab_id.as_deref(), Some("dirty-missing"));
        assert_eq!(db.recent_files.len(), 1);
        assert!(db.recent_files.contains_key(&existing));
        db.session.tabs.retain(|tab| tab.id == "existing");
        db.session.current_tab_id = None;
        runtime.block_on(validate_local_files(&mut db));
        assert_eq!(db.session.current_tab_id.as_deref(), Some("existing"));
    }
}
