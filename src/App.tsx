import "./globals.css";
import { MotionConfig } from "motion/react";
import { Outlet } from "react-router";
import { AlertCircle, X } from "lucide-react";
import MigrationRunner from "@/components/migration-runner";
import AppHeader from "@/components/app-header";
import MenuBar from "@/components/menu-bar";
import Footer from "@/components/footer";
import Sidebar from "@/components/sidebar";
import ShortcutProvider from "@/components/shortcut-provider";
import FileDropZone from "@/components/file-drop-zone";
import ExternalFileListener from "@/components/external-file-listener";
import ThemeProvider from "@/components/theme-provider";
import SessionSaver from "@/components/session-saver";
import { useEditorActions, useEditorError, useInitializationError } from "@/stores/editor";
import { useCheckMigration, useMigrationError } from "@/stores/migration";
import { useUpdaterStatus } from "@/stores/updater";

export default function RootLayout() {
  const { dismissError } = useEditorActions();
  const editorError = useEditorError();
  const initializationError = useInitializationError();
  const migrationError = useMigrationError();
  const checkMigration = useCheckMigration();
  const error = migrationError ?? editorError ?? initializationError;
  const updating = useUpdaterStatus() === "downloading";

  return (
    <MotionConfig reducedMotion="user">
      <div inert={updating} className="flex h-dvh w-screen flex-col overflow-hidden bg-surface font-sans text-ink antialiased">
        <AppHeader />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <MenuBar />
            {error && (
              <div role="alert" className="flex shrink-0 items-start gap-3 border-b border-line bg-elevated px-5 py-3 text-xs text-ink">
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-danger" />
                <div className="min-w-0 flex-1 wrap-break-word leading-relaxed">
                  <p>{error}</p>
                  {(initializationError || migrationError) && (
                    <p className="mt-1 text-muted">
                      Your existing recovery data has not been overwritten. Save any new work to a file before exiting.
                    </p>
                  )}
                </div>
                {migrationError ? (
                  <button className="quiet-button" onClick={() => void checkMigration()}>
                    Retry
                  </button>
                ) : (
                  !initializationError && (
                    <button className="icon-button" onClick={dismissError} aria-label="Dismiss error">
                      <X size={14} />
                    </button>
                  )
                )}
              </div>
            )}
            <main className="relative min-h-0 flex-1 overflow-hidden">
              <Outlet />
            </main>
          </div>
        </div>
        <Footer />
        <MigrationRunner />
        <ShortcutProvider />
        <FileDropZone />
        <ExternalFileListener />
        <ThemeProvider />
        <SessionSaver />
      </div>
      {updating && <div role="status" aria-live="polite" className="fixed inset-0 z-100 flex flex-col items-center justify-center gap-4 bg-surface px-8 text-center text-ink">
        <p className="eyebrow">TAKING NOTES</p>
        <h2 className="font-serif text-3xl">Downloading and installing update…</h2>
        <p className="max-w-sm text-sm leading-relaxed text-secondary">Your session is being saved. Editing is paused until the update finishes, then the app will restart.</p>
      </div>}
    </MotionConfig>
  );
}
