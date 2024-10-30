import { NavLink } from "./types";

export const navLinks: NavLink[] = [
  {
    id: "03fa4448-2463-4b8c-8e9a-955f71006ab5",
    label: "home",
    href: "/",
    icon: "home",
  },
  {
    id: "6d8fd2e6-8994-4bac-a716-f9a739c159dc",
    label: "notes",
    href: "/notes",
    icon: "list"
  },
  {
    id: "5620f70f-3fdc-44e8-a2d7-1bf21c0e0788",
    label: "create",
    href: "/create",
    icon: "add"
  }
];

export const markdownManager = "markdown-manager.json";

export const MIN_LENGTH_TITLE = 3;
export const MAX_LENGTH_TITLE = 45;
export const MIN_LENGTH_CONTENT = 5;