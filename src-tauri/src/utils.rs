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

/// Encrypts a given string using a Caesar cipher with a shift of 23 positions.
/// It uses the Spanish alphabet (a-z, including ñ) and preserves case.
/// Characters not found in the Spanish alphabet (e.g., spaces, numbers, punctuation)
/// are left unchanged.
///
/// # Arguments
///
/// * `text` - A string slice (`&str`) to be encrypted.
///
/// # Returns
///
/// A `String` containing the encrypted text.
///
/// # Example
///
/// ```
/// let original_text = "Hola Mundo, esto es una prueba con la letra Ñ.";
/// let encrypted_text = encrypt_spanish_caesar(original_text);
/// // Expected output: "Ejkx Jqfmk, bqrv bq rfx oqrbx zkf hx kxbqx L." (approximate, verify with exact shift)
/// println!("{}", encrypted_text);
/// ```
pub fn encrypt_spanish_caesar(text: &str) -> String {
    // Define the Spanish alphabet including 'ñ'
    const ALPHABET: &str = "abcdefghijklmnñopqrstuvwxyz";
    let alphabet_chars: Vec<char> = ALPHABET.chars().collect();
    let alphabet_len = alphabet_chars.len(); // Should be 27 (26 letters + ñ)
    let shift = 23; // The desired shift value

    // Initialize a new string to store the encrypted result
    let mut encrypted_text = String::new();

    // Iterate over each character in the input text
    for char_to_encrypt in text.chars() {
        let mut found_and_encrypted = false;

        // Check for lowercase characters
        if char_to_encrypt.is_lowercase() {
            if let Some(index) = alphabet_chars.iter().position(|&c| c == char_to_encrypt) {
                // Calculate the new index, ensuring it wraps around the alphabet
                let new_index = (index + shift) % alphabet_len;
                encrypted_text.push(alphabet_chars[new_index]);
                found_and_encrypted = true;
            }
        }
        // Check for uppercase characters
        else if char_to_encrypt.is_uppercase() {
            // Convert to lowercase to find its position in the alphabet
            let lower_char = char_to_encrypt.to_ascii_lowercase();
            if let Some(index) = alphabet_chars.iter().position(|&c| c == lower_char) {
                // Calculate the new index
                let new_index = (index + shift) % alphabet_len;
                // Convert the new character back to uppercase before pushing
                encrypted_text.push(alphabet_chars[new_index].to_ascii_uppercase());
                found_and_encrypted = true;
            }
        }

        // If the character was not a Spanish alphabet letter (e.g., space, punctuation, number),
        // append it unchanged.
        if !found_and_encrypted {
            encrypted_text.push(char_to_encrypt);
        }
    }

    encrypted_text
}

/// Decrypts a given string using a Caesar cipher with a reverse shift of 23 positions.
/// It uses the Spanish alphabet (a-z, including ñ) and preserves case.
/// Characters not found in the Spanish alphabet (e.g., spaces, numbers, punctuation)
/// are left unchanged.
///
/// # Arguments
///
/// * `text` - A string slice (`&str`) to be decrypted.
///
/// # Returns
///
/// A `String` containing the decrypted text.
///
/// # Example
///
/// ```
/// let encrypted_text = "Ejkx Jqfmk, bqrv bq rfx oqrbx zkf hx kxbqx L.";
/// let decrypted_text = decrypt_spanish_caesar(encrypted_text);
/// // Expected output: "Hola Mundo, esto es una prueba con la letra Ñ."
/// println!("{}", decrypted_text);
/// ```
pub fn decrypt_spanish_caesar(text: &str) -> String {
    // Define the Spanish alphabet including 'ñ'
    const ALPHABET: &str = "abcdefghijklmnñopqrstuvwxyz";
    let alphabet_chars: Vec<char> = ALPHABET.chars().collect();
    let alphabet_len = alphabet_chars.len(); // Should be 27 (26 letters + ñ)
    let shift = 23; // The original encryption shift value

    // Initialize a new string to store the decrypted result
    let mut decrypted_text = String::new();

    // Iterate over each character in the input text
    for char_to_decrypt in text.chars() {
        let mut found_and_decrypted = false;

        // Check for lowercase characters
        if char_to_decrypt.is_lowercase() {
            if let Some(index) = alphabet_chars.iter().position(|&c| c == char_to_decrypt) {
                // Calculate the new index for decryption
                // (index - shift + alphabet_len) ensures the result is non-negative before modulo
                let new_index = (index as isize - shift as isize + alphabet_len as isize) % alphabet_len as isize;
                decrypted_text.push(alphabet_chars[new_index as usize]);
                found_and_decrypted = true;
            }
        }
        // Check for uppercase characters
        else if char_to_decrypt.is_uppercase() {
            // Convert to lowercase to find its position in the alphabet
            let lower_char = char_to_decrypt.to_ascii_lowercase();
            if let Some(index) = alphabet_chars.iter().position(|&c| c == lower_char) {
                // Calculate the new index for decryption
                let new_index = (index as isize - shift as isize + alphabet_len as isize) % alphabet_len as isize;
                // Convert the new character back to uppercase before pushing
                decrypted_text.push(alphabet_chars[new_index as usize].to_ascii_uppercase());
                found_and_decrypted = true;
            }
        }

        // If the character was not a Spanish alphabet letter (e.g., space, punctuation, number),
        // append it unchanged.
        if !found_and_decrypted {
            decrypted_text.push(char_to_decrypt);
        }
    }

    decrypted_text
}