
export enum NoteExtension {
  MARKDOWN = "md",
  PLAINTEXT = "txt"
}

export type Icon = "home" | "list" | "add";

export type Note = {
  title: string;
  content: string;
  extension: NoteExtension;
}

export interface NoteMetadata extends Omit<Note, "content"> {
  tag: string;
  createdAt: number;
  updatedAt: number;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  icon: Icon;
}