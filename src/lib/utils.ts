/**
 * Generate a random unique code for files identification.
 * @returns An auto-generated unique code.
 */
export const generateRandomUniqueTag = (length = 20): string => {

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
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}/${month}/${year} ${hours}:${minutes}`;
}
