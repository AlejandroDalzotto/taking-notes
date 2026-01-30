"use client";

import { Exo_2 } from "next/font/google";
import "./globals.css";
import Footer from "@/components/footer";
import AppHeader from "@/components/app-header";
import MenuBar from "@/components/menu-bar";
import { useEditorActions } from "@/stores/editor";
import { useEffect } from "react";
import UpdaterRunner from "@/components/updater-runner";
import MigrationRunner from "@/components/migration-runner";
import { useMigrationStatus } from "@/stores/migration";
import { getCurrentWindow } from "@tauri-apps/api/window";

const exo2 = Exo_2({
  variable: "--font-exo-2",
  style: "normal",
  weight: "variable",
  subsets: ["latin"],
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { initialize, persistSession } = useEditorActions();
  const migrationStatus = useMigrationStatus();

  useEffect(() => {
    if (migrationStatus === "complete") {
      initialize();
    }
  }, [migrationStatus]);

  useEffect(() => {
    const appWindow = getCurrentWindow();

    const handleMinimize = () => appWindow.minimize();
    const handleMaximize = () => appWindow.toggleMaximize();
    const handleClose = () => appWindow.close();

    document.getElementById("titlebar-minimize")?.addEventListener("click", handleMinimize);
    document.getElementById("titlebar-maximize")?.addEventListener("click", handleMaximize);
    document.getElementById("titlebar-close")?.addEventListener("click", handleClose);

    const unlisten = appWindow.onCloseRequested(async () => {
      await persistSession();
    });

    return () => {
      document.getElementById("titlebar-minimize")?.removeEventListener("click", handleMinimize);
      document.getElementById("titlebar-maximize")?.removeEventListener("click", handleMaximize);
      document.getElementById("titlebar-close")?.removeEventListener("click", handleClose);
      unlisten.then((f) => f());
    };
  }, []);

  return (
    <html lang="en">
      <body
        className={`${exo2.variable} antialiased grid grid-rows-[min-content_1fr_min-content] font-exo-2 w-screen relative h-screen text-neutral-50 bg-neutral-950`}
      >
        <header className="row-span-1">
          <AppHeader />
          <MenuBar />
        </header>
        <main className="flex flex-col relative overflow-hidden row-span-2">{children}</main>
        <Footer />
        <UpdaterRunner />
        <MigrationRunner />
      </body>
    </html>
  );
}
