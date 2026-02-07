# Taking notes

This is a [Vite](https://vitejs.dev/) project created alongside [Tauri](https://tauri.app/) with the goal of providing a desktop application that centralizes the creation of notes.

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

- Full CRUD support for plain-text notes.
- Quick access to recently opened files.
- Dark mode enabled by default (with more themes coming soon).
- Responsive layout optimized for different screen sizes.
- Multi-tab support for working with multiple files at once.
- Automatic session saving on close and seamless recovery on launch to prevent data loss.
- Fast, reliable, and always aiming for better performance.
