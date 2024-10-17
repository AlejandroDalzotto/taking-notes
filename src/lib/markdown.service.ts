import {
  BaseDirectory,
  readTextFile,
  writeTextFile,
  exists,
  writeFile,
  readFile,
  remove as removeFile
} from "@tauri-apps/plugin-fs"
import type { MarkdownEntry, MarkdownFileInformation } from "./types"
import { markdownManager } from "@/lib/constants"

/**
 * A method that will return a list of information about the files already created.
 * 
 * @returns An array with the information.
 */
export const getMarkdownListInformation = async (): Promise<MarkdownFileInformation[]> => {

  const isFileCreated = await exists(markdownManager, { baseDir: BaseDirectory.AppLocalData })

  if (!isFileCreated) {
    return []
  }

  const rawData = await readTextFile(markdownManager, { baseDir: BaseDirectory.AppLocalData })
  const data: MarkdownFileInformation[] = JSON.parse(rawData)

  return data;
}

export const getMarkdownInformation = async (slug: string): Promise<MarkdownFileInformation> => {
  const rawData = await readTextFile(markdownManager, { baseDir: BaseDirectory.AppLocalData })
  const data: MarkdownFileInformation[] = JSON.parse(rawData)

  const markdown = data.find(value => value.slug === slug)!

  return markdown;

}
/**
 * Get the content of a markdown created.
 */
export const getMarkdown = async (slug: string) => {
  const decoder = new TextDecoder("utf-8")

  const rawData = await readFile(`${slug}.md`, { baseDir: BaseDirectory.AppLocalData })
  const data = decoder.decode(rawData)

  return data
}

export const create = async (values: MarkdownEntry) => {
  const encoder = new TextEncoder();

  const now = new Date().toLocaleString();
  const id = crypto.randomUUID();
  const slug = values.title.toLowerCase().replaceAll(" ", "-");

  const newEntry: MarkdownFileInformation = {
    id,
    title: values.title,
    slug,
    createdAt: now,
    updatedAt: now
  };

  const previousValues = await getMarkdownListInformation();
  const markdownContent = encoder.encode(values.content);

  const writeManagerFilePromise = writeTextFile(markdownManager, JSON.stringify([...previousValues, newEntry]), {
    baseDir: BaseDirectory.AppLocalData
  });

  const writeMarkdownFilePromise = writeFile(`${slug}.md`, markdownContent, {
    baseDir: BaseDirectory.AppLocalData
  });

  await Promise.all([writeManagerFilePromise, writeMarkdownFilePromise]);
};


export const remove = async (slug: string) => {
  const allValues = await getMarkdownListInformation();
  const newValues = allValues.filter(value => value.slug !== slug);

  const writeManagerFilePromise = writeTextFile(markdownManager, JSON.stringify(newValues), {
    baseDir: BaseDirectory.AppLocalData
  });

  const removeMarkdownFilePromise = removeFile(`${slug}.md`, { baseDir: BaseDirectory.AppLocalData });

  await Promise.all([writeManagerFilePromise, removeMarkdownFilePromise]);
};