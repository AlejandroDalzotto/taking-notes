use std::io::{Write, Result};
use std::path::Path;
use tempfile::NamedTempFile;

/// Safely writes to a file, replacing its contents without risk of corruption.
pub fn atomic_write<P: AsRef<Path>>(path: P, content: &str) -> Result<()> {
    let mut temp = NamedTempFile::new_in(path.as_ref().parent().unwrap())?;

    write!(temp, "{}", content)?;
    temp.persist(path)?;

    Ok(())
}