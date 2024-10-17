export interface MarkdownEntry {
  title: string;
  content: string;
}

export interface MarkdownFileInformation extends Omit<MarkdownEntry, "content"> {
  id: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  icon: string;
}