import { JSX } from "react";

export enum NoteExtension {
  MARKDOWN = "md",
  PLAINTEXT = "txt",
  CSV = "csv",
}

export type AccessControl = {

}

export type NoteEntry = {
  title: string;
  content: string;
  type: NoteExtension;
}

export interface Note extends Omit<NoteEntry, "content"> {
  id: string;
  createdAt: number;
  updatedAt: number;
  accessControl: AccessControl | null;
  isFavorite: boolean;
  tags: string[];
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  icon: JSX.Element;
}