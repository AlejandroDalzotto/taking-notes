# Taking notes

This is a [Next.js](https://nextjs.org) project created alongside [Tauri](https://tauri.app/) with the goal of providing a desktop application that centralizes the creation of notes in Markdown or plain text format.

## Getting Started

First, run the development server:

```bash
bun tauri dev
```

This will open a window where you can work.

> [!WARNING]
> Take in mind that the application may not work properly in the browser, as it is designed to run as a desktop application using Tauri.

## Building for Production

To build the application for production, run:

```bash
bun tauri build
```

This will create a production-ready version of the application in the `src-tauri/target/release/bundle` directory.

## Features

- Create, edit, and delete notes in Markdown or plain text format.
- Search for notes by title.
- Dark mode by default (new themes are coming soon).
- Responsive design for different screen sizes.
- Cross-platform compatibility for Windows and Linux (not yet tested in Linux).
