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