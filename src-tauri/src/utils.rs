use std::fs;
use std::io::Write;
use std::path::Path;
use tempfile::NamedTempFile;

use crate::commands::migration::DatabaseV2;

/// Safely writes to a file, replacing its contents without risk of corruption.
pub fn atomic_write<P: AsRef<Path>>(path: P, content: &str) -> Result<(), std::io::Error> {
    let mut temp = NamedTempFile::new_in(path.as_ref().parent().unwrap())?;

    write!(temp, "{}", content)?;
    temp.persist(path)?;

    Ok(())
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

// pub fn unique_filename_in_dir(dir: &PathBuf, base: &str, ext: &str) -> String {
//     let mut candidate = format!("{}.{}", base, ext);
//     let mut counter = 1usize;
//     while dir.join(&candidate).exists() {
//         candidate = format!("{} ({}){}", base, counter, ext);
//         counter += 1;
//     }
//     candidate
// }

pub fn validate_local_files(db: &mut DatabaseV2) {
    // 1. Filtrar tabs: remover tabs locales cuyos archivos no existan
    db.session.tabs.retain(|tab| {
        if let Some(path) = &tab.path {
            // Es una tab local, verificar que el archivo exista
            return fs::metadata(path).is_ok();
        }
        // Es untitled (path == None), siempre mantener
        true
    });

    // 2. Limpiar recentFiles: remover entradas de archivos que no existan
    db.recent_files.retain(|path, _| fs::metadata(path).is_ok());

    // 3. Validar currentTabId: si apunta a una tab que ya no existe, ponerlo en None
    if let Some(current_id) = &db.session.current_tab_id {
        let tab_exists = db.session.tabs.iter().any(|tab| &tab.id == current_id);
        if !tab_exists {
            db.session.current_tab_id = None;
        }
    }

    // 4. Si no hay current pero hay tabs, seleccionar la primera
    if db.session.current_tab_id.is_none() && !db.session.tabs.is_empty() {
        db.session.current_tab_id = Some(db.session.tabs[0].id.clone());
    }
}
