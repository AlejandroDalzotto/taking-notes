import type { Tag } from "./types";

/**
 * Generate a random unique code for files identification.
 * @returns An auto-generated unique code.
 */
export const generateRandomUniqueTag = (length = 10): Tag => {

  const characters = "qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM1234567890";
  let finalResult = "";

  for (let i = 0; i < length; i++) {
    const rand = Math.floor(Math.random() * characters.length)

    finalResult += characters.charAt(rand);
  }

  return finalResult;
}

export const getLocalDateString = (timestamp: number) => {
  const date = new Date(timestamp);
  const localDateTime = date.toLocaleString();

  return localDateTime
}

export const wordCounter = (text: string) => {
  // Expansión de contracciones
  const contractions: { [key: string]: string[] } = {
    "i'm": ["i", "am"],
    "i'll": ["i", "will"],
    "i've": ["i", "have"],
    "i'd": ["i", "would"],
    "you'd": ["you", "would"],
    "you'll": ["you", "will"],
    "you've": ["you", "have"],
    "he's": ["he", "is"],
    "she's": ["she", "is"],
    "it's": ["it", "is"],
    "they've": ["they", "have"],
    "they'd": ["they", "would"],
    "they'll": ["they", "will"],
    "we'll": ["we", "will"],
    "we'd": ["we", "would"],
    "what'll": ["what", "will"],
    "who'll": ["who", "will"],
    "that'll": ["that", "will"],
    "this'll": ["this", "will"],
    "won't": ["will", "not"],
    "can't": ["can", "not"],
    "don't": ["do", "not"],
    "doesn't": ["does", "not"],
    "didn't": ["did", "not"],
    "hasn't": ["has", "not"],
    "haven't": ["have", "not"],
    "hadn't": ["had", "not"],
    "isn't": ["is", "not"],
    "aren't": ["are", "not"],
    "wasn't": ["was", "not"],
    "weren't": ["were", "not"],
    "mightn't": ["might", "not"],
    "mustn't": ["must", "not"],
    "shouldn't": ["should", "not"],
    "couldn't": ["could", "not"],
    "wouldn't": ["would", "not"],
    "let's": ["let", "us"],
    "that's": ["that", "is"],
    "here's": ["here", "is"],
    "there's": ["there", "is"],
    "what's": ["what", "is"],
    "who's": ["who", "is"],
    "how's": ["how", "is"],
    "when's": ["when", "is"],
    "where's": ["where", "is"],
    "why's": ["why", "is"],
    "a'll": ["a", "will"], // Added for completeness
    "b'll": ["b", "will"], // Added for completeness
    // Agregar más contracciones según sea necesario
  };

  // Asegurarse de que el texto esté en minúsculas para la comparación
  text = text.toLowerCase();

  // Reemplazar las contracciones por sus palabras expandidas
  Object.keys(contractions).forEach((contraction) => {
    const expanded = contractions[contraction].join(" ");
    text = text.replace(new RegExp(`\\b${contraction}\\b`, "g"), expanded);
  });

  // Contar las palabras utilizando una expresión regular que capture todas las palabras
  const words = text.match(/\b(?:[A-Za-z]+(?:'[A-Za-z]+)?|'\w+)\b/g);

  return words ? words.length : 0;
}