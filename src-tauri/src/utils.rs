use std::collections::HashSet;
use std::io::Write;
use std::path::{Path, PathBuf};

use tempfile::NamedTempFile;
use tokio::task::JoinSet;

use crate::commands::migration::DatabaseV2;

/// Maximum file size the app will open (10 MB).
pub const MAX_FILE_SIZE: u64 = 10 * 1024 * 1024;

/// Safely writes to a file, replacing its contents without risk of corruption.
/// This is a **synchronous** function — call it from `spawn_blocking` or use
/// the async wrapper [`atomic_write_async`] instead.
pub fn atomic_write<P: AsRef<Path>>(path: P, content: &str) -> Result<(), std::io::Error> {
    let parent = path.as_ref().parent().ok_or_else(|| {
        std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "path has no parent directory",
        )
    })?;

    let mut temp = NamedTempFile::new_in(parent)?;
    write!(temp, "{}", content)?;
    temp.persist(path)?;

    Ok(())
}

/// Async wrapper around [`atomic_write`].
///
/// Moves the owned data into a blocking task so the Tokio runtime thread is
/// never stalled by disk I/O.
pub async fn atomic_write_async(path: PathBuf, content: String) -> Result<(), std::io::Error> {
    tokio::task::spawn_blocking(move || atomic_write(&path, &content))
        .await
        .map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))?
}

pub fn sanitize_filename(input: &str) -> String {
    let forbidden = ['<', '>', ':', '"', '/', '\\', '|', '?', '*'];
    let mut s: String = input
        .chars()
        .map(|c| if forbidden.contains(&c) { '_' } else { c })
        .collect();
    s = s
        .trim_matches(|c: char| c.is_whitespace() || c == '.')
        .to_string();
    if s.is_empty() {
        s = "untitled".to_string();
    }
    s
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
            let exists = tokio::fs::metadata(&path).await.is_ok();
            (path, exists)
        });
    }

    let mut valid_paths: HashSet<String> = HashSet::new();

    while let Some(result) = set.join_next().await {
        if let Ok((path, true)) = result {
            valid_paths.insert(path);
        }
    }

    // 3. Filter tabs: remove local tabs whose files no longer exist.
    db.session.tabs.retain(|tab| match &tab.path {
        Some(path) => valid_paths.contains(path),
        None => true, // untitled tabs are always kept
    });

    // 4. Filter recent files.
    db.recent_files.retain(|path, _| valid_paths.contains(path));

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
