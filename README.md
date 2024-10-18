# Taking notes

This is a [Next.js](https://nextjs.org) project created together with [Tauri.app](https://tauri.app/) with the goal of having a desktop application capable of handling a CRUD of markdown files for note creation.

## Capabilities

- `Note's management (Basic CRUD operations)`
- `Markdown rendering to HTML`

## Data storing

The application data (Markdown files) are stored in the applocaldata folder of the current computer where the project has been installed. It uses a `json file` to manage the information about the notes created, like the date of creation, the slug, title, and a couple of more fields.

## Getting Started

First, run the development server:

```bash
pnpm tauri dev
```

This will open a window where you can work.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.