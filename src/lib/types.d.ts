export interface MarkdownEntry {
  title: string;
  content: string;
}

export type Tag = string;

export interface MarkdownFileInformation extends Omit<MarkdownEntry, "content"> {
  id: string;
  tag: Tag;
  createdAt: number;
  updatedAt: number;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  icon: string;
}