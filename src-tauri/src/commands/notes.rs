use tauri::{command, State};

use crate::{notes_manager::*, AppDirs};

#[command]
pub async fn get_all_notes_metadata(
    app_state: State<'_, AppDirs>,
) -> Result<Vec<NoteMetadata>, NoteError> {
    let manager_path = app_state.manager_path.to_string();

    let files_data = NotesManager::read_notes_metadata(manager_path);

    files_data.map_err(|e| {
        NoteError::new(
            "Error trying to get the notes information",
            &e.to_string(),
            "get_all_notes_metadata",
        )
    })
}

#[command]
pub async fn get_note_metadata(
    tag: String,
    app_state: State<'_, AppDirs>,
) -> Result<NoteMetadata, NoteError> {
    let manager_path = app_state.manager_path.to_string();

    let file_data = NotesManager::read_note_metadata(manager_path, tag);

    file_data.map_err(|e| {
        NoteError::new(
            "Error trying to get note information",
            &e.to_string(),
            "get_note_metadata",
        )
    })
}

#[command]
pub async fn get_note_content(
    tag: String,
    file_extension: String,
    app_state: State<'_, AppDirs>,
) -> Result<String, NoteError> {
    let file_name = format!("{}.{}", tag, file_extension);

    let path = app_state.app_data_path.join(file_name);

    let file_path = path.to_str().unwrap().to_string();
    let file_content = NotesManager::read_note_content(file_path);

    file_content.map_err(|e| {
        NoteError::new(
            "Error trying to get note content",
            &e.to_string(),
            "get_note_content",
        )
    })
}

#[command]
pub async fn create_note(
    tag: String,
    file_extension: String,
    content: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, NoteError> {
    let file_name = format!("{}.{}", tag, file_extension);

    let path = app_state.app_data_path.join(file_name);

    let file_path = path.to_str().unwrap().to_string();

    let has_markdown_note_succeeded = NotesManager::write_note(file_path, content);

    has_markdown_note_succeeded.map_err(|e| {
        NoteError::new(
            "Error trying to create note file",
            &e.to_string(),
            "create_note",
        )
    })
}

#[command]
pub async fn create_note_metadata(
    tag: String,
    title: String,
    file_extension: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, NoteError> {
    let manager_path = app_state.manager_path.to_string();

    let has_markdown_manager_succeeded =
        NotesManager::write_note_metadata(manager_path, tag, title, file_extension);

    has_markdown_manager_succeeded.map_err(|e| {
        NoteError::new(
            "Error trying to create note metadata",
            &e.to_string(),
            "create_note_metadata",
        )
    })
}

#[command]
pub async fn search_notes_by_term(
    term: String,
    app_state: State<'_, AppDirs>,
) -> Result<Vec<NoteMetadata>, NoteError> {
    let manager_path = app_state.manager_path.to_string();

    let files_data = NotesManager::search_notes_metadata(manager_path, term);

    files_data.map_err(|e| {
        NoteError::new(
            "Error trying to search notes",
            &e.to_string(),
            "search_notes_by_term",
        )
    })
}

#[command]
pub async fn edit_note(
    tag: String,
    file_extension: String,
    content: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, NoteError> {
    let file_name = format!("{}.{}", tag, file_extension);

    let path = app_state.app_data_path.join(file_name);

    let file_path = path.to_str().unwrap().to_string();

    let result = NotesManager::edit_note_content(file_path, content);

    result.map_err(|e| {
        NoteError::new(
            "Error trying to edit note file",
            &e.to_string(),
            "edit_note",
        )
    })
}

#[command]
pub async fn edit_note_metadata(
    tag: String,
    title: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, NoteError> {
    let manager_path = app_state.manager_path.to_string();

    let files_data = NotesManager::edit_note_metadata(manager_path, tag, title);

    files_data.map_err(|e| {
        NoteError::new(
            "Error trying to edit note metadata",
            &e.to_string(),
            "edit_note_metadata",
        )
    })
}

#[command]
pub async fn remove_note(
    tag: String,
    file_extension: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, NoteError> {
    let file_name = format!("{}.{}", tag, file_extension);

    let path = app_state.app_data_path.join(file_name);

    let file_path = path.to_str().unwrap().to_string();

    let result = NotesManager::remove_note(file_path);

    result.map_err(|e| {
        NoteError::new(
            "Error trying to remove note file",
            &e.to_string(),
            "remove_note",
        )
    })
}

#[command]
pub async fn remove_note_metadata(
    tag: String,
    app_state: State<'_, AppDirs>,
) -> Result<bool, NoteError> {
    let manager_path = app_state.manager_path.to_string();

    let files_data = NotesManager::remove_note_metadata(manager_path, tag);

    files_data.map_err(|e| {
        NoteError::new(
            "Error trying to remove note metadata",
            &e.to_string(),
            "remove_note_metadata",
        )
    })
}

#[command]
pub async fn get_total_notes_count(
    app_state: State<'_, AppDirs>,
) -> Result<usize, NoteError> {
    let manager_path = app_state.manager_path.to_string();

    let count = NotesManager::get_total_notes_count(manager_path);

    count.map_err(|e| {
        NoteError::new(
            "Error trying to get total notes count",
            &e.to_string(),
            "get_total_notes_count",
        )
    })
}
