export interface NoteEntry {
  title: string;
  body: string;
}

export interface Note extends NoteEntry {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface NavLink {
  id: string;
  label: string;
  href: string;
  icon: string;
}