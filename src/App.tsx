import "./globals.css";
import { useEffect } from "react";
import UpdaterRunner from "@/components/updater-runner";
import MigrationRunner from "@/components/migration-runner";
import { Outlet } from "react-router";
import { useEditorActions } from "./stores/editor";
import AppHeader from "@/components/app-header";
import MenuBar from "@/components/menu-bar";
import Footer from "@/components/footer";
import ShortcutProvider from "@/components/shortcut-provider";
import FileDropZone from "@/components/file-drop-zone";
import ExternalFileListener from "@/components/external-file-listener";
import { useMigrationStatus } from "@/stores/migration";

export default function RootLayout() {
  const { initialize } = useEditorActions();
  const migrationStatus = useMigrationStatus();

  useEffect(() => {
    if (migrationStatus === "complete") {
      initialize();
    }
  }, [migrationStatus]);

  return (
    <div className="font-sans antialiased grid grid-rows-[min-content_1fr_min-content] w-screen relative h-screen text-neutral-50 bg-neutral-950">
      <header className="row-span-1">
        <AppHeader />
        <MenuBar />
      </header>
      <main className="flex flex-col relative overflow-hidden row-span-2">
        <Outlet />
      </main>
      <Footer />
      <UpdaterRunner />
      <MigrationRunner />
      <ShortcutProvider />
      <FileDropZone />
      <ExternalFileListener />
    </div>
  );
}
