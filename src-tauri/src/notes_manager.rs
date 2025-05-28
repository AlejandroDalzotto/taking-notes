use std::{
    fs,
    io::{Error, ErrorKind},
};

#[derive(serde::Deserialize, serde::Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct NoteMetadata {
    pub title: String,
    pub tag: String,
    pub created_at: u64,
    pub updated_at: u64,
    pub file_extension: String, // "md" | "txt"
}

#[derive(serde::Serialize)]
pub struct NoteError {
    pub message: String,
    pub reason: String,
    pub method: String,
}

impl NoteError {
    pub fn new(message: &str, reason: &str, method: &str) -> Self {
        NoteError {
            message: message.to_string(),
            reason: reason.to_string(),
            method: method.to_string(),
        }
    }
}

pub struct NotesManager;

impl NotesManager {
    pub fn read_note_content(file_path: String) -> Result<String, std::io::Error> {
        if !fs::exists(&file_path)? {
            return Err(Error::new(
                ErrorKind::NotFound,
                "It seems the note does not exist",
            ));
        }

        let file_content = fs::read_to_string(&file_path)?;

        Ok(file_content)
    }

    pub fn read_note_metadata(
        notes_manager_path: String,
        tag: String,
    ) -> Result<NoteMetadata, std::io::Error> {
        if !fs::exists(&notes_manager_path)? {
            return Err(Error::new(
                ErrorKind::NotFound,
                "It seems the note does not exist",
            ));
        }

        let raw_json_data = fs::read_to_string(&notes_manager_path)?;
        let files_data: Vec<NoteMetadata> = serde_json::from_str(&raw_json_data)
            .map_err(|e| Error::new(ErrorKind::InvalidData, e.to_string()))?;

        let file_data = files_data
            .into_iter()
            .find(|x| x.tag == tag)
            .ok_or_else(|| {
                Error::new(ErrorKind::NotFound, "File with the specified tag not found")
            })?;

        Ok(file_data)
    }

    pub fn read_notes_metadata(
        notes_manager_path: String,
    ) -> Result<Vec<NoteMetadata>, std::io::Error> {
        if !fs::exists(&notes_manager_path)? {
            return Ok(Vec::new());
        }

        let raw_json_data = fs::read_to_string(&notes_manager_path)?;
        let files_data: Vec<NoteMetadata> = serde_json::from_str(&raw_json_data)
            .map_err(|e| Error::new(ErrorKind::InvalidData, e.to_string()))?;

        Ok(files_data)
    }

    pub fn write_note(file_path: String, content: String) -> Result<bool, std::io::Error> {
        fs::write(file_path, content)?;

        Ok(true)
    }

    pub fn write_note_metadata(
        notes_manager_path: String,
        tag: String,
        title: String,
        file_extension: String,
    ) -> Result<bool, std::io::Error> {
        let now = chrono::Utc::now().timestamp_millis() as u64;

        // Create new entry
        let new_entry = NoteMetadata {
            title,
            tag,
            created_at: now,
            updated_at: now,
            file_extension,
        };

        // Read previous entries (if file exists)
        let mut entries = if fs::exists(&notes_manager_path)? {
            let raw_json = fs::read_to_string(&notes_manager_path)?;
            serde_json::from_str::<Vec<NoteMetadata>>(&raw_json)
                .map_err(|e| Error::new(ErrorKind::Other, e.to_string()))?
        } else {
            Vec::new()
        };

        // Add new entry
        entries.push(new_entry);

        // Write updated entries list (markdown-manager)
        fs::write(
            &notes_manager_path,
            serde_json::to_string(&entries).unwrap(),
        )?;

        Ok(true)
    }

    pub fn edit_note_content(note_path: String, content: String) -> Result<bool, std::io::Error> {
        fs::write(note_path, content)?;

        Ok(true)
    }

    pub fn edit_note_metadata(
        notes_manager_path: String,
        tag: String,
        title: String,
    ) -> Result<bool, std::io::Error> {
        // Read previous entries (if file exists)
        let mut entries = if fs::exists(&notes_manager_path)? {
            let raw_json = fs::read_to_string(&notes_manager_path)?;
            serde_json::from_str::<Vec<NoteMetadata>>(&raw_json)
                .map_err(|e| Error::new(ErrorKind::Other, e.to_string()))?
        } else {
            return Err(Error::new(
                ErrorKind::NotFound,
                String::from("Error finding the manager file"),
            ));
        };

        let now = chrono::Utc::now().timestamp_millis() as u64;

        if let Some(entry) = entries.iter_mut().find(|x| x.tag == tag) {
            entry.title = title;
            entry.updated_at = now;
        } else {
            return Err(Error::new(
                ErrorKind::NotFound,
                "Entry with the specified tag not found",
            ));
        }

        // Write updated entries list (markdown-manager)
        fs::write(
            &notes_manager_path,
            serde_json::to_string(&entries).unwrap(),
        )?;

        Ok(true)
    }

    pub fn remove_note(note_path: String) -> Result<bool, std::io::Error> {
        fs::remove_file(note_path)?;

        Ok(true)
    }

    pub fn remove_note_metadata(
        notes_manager_path: String,
        tag: String,
    ) -> Result<bool, std::io::Error> {
        // Read previous entries (if file exists)
        let entries = if fs::exists(&notes_manager_path)? {
            let raw_json = fs::read_to_string(&notes_manager_path)?;
            serde_json::from_str::<Vec<NoteMetadata>>(&raw_json)
                .map_err(|e| Error::new(ErrorKind::Other, e.to_string()))?
        } else {
            return Err(Error::new(
                ErrorKind::NotFound,
                String::from("Error finding the manager file"),
            ));
        };

        let new_entries: Vec<NoteMetadata> = entries.into_iter().filter(|x| x.tag != tag).collect();

        // Write updated entries list without the removed one (markdown-manager)
        fs::write(
            &notes_manager_path,
            serde_json::to_string(&new_entries).unwrap(),
        )?;

        Ok(true)
    }

    pub fn search_notes_metadata(
        notes_manager_path: String,
        term: String,
    ) -> Result<Vec<NoteMetadata>, std::io::Error> {
        if !fs::exists(&notes_manager_path)? {
            return Err(Error::new(ErrorKind::NotFound, "File manager not found"));
        }

        let raw_json_data = fs::read_to_string(&notes_manager_path)?;
        let files_data: Vec<NoteMetadata> = serde_json::from_str(&raw_json_data)
            .map_err(|e| Error::new(ErrorKind::Other, e.to_string()))?;

        let files_data = files_data
            .into_iter()
            .filter(|x| x.title.to_lowercase().contains(&term.to_lowercase()))
            .collect();

        Ok(files_data)
    }
}
