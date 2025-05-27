
export enum FileExtension {
  MARKDOWN = "md",
  PLAINTEXT = "txt"
}

export interface NoteEntry {
  title: string;
  content: string;
  fileExtension: FileExtension;
}

export interface NoteMetadata extends Omit<NoteEntry, "content"> {
  tag: string;
  createdAt: number;
  updatedAt: number;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  icon: string;
}