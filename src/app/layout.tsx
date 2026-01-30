"use client";

import { Exo_2 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import Footer from "@/components/footer";
import AppHeader from "@/components/app-header";
import MenuBar from "@/components/menu-bar";
import { useEditorActions } from "@/stores/editor";
import { useEffect } from "react";
// import UpdaterRunner from "@/components/updater-runner";
import MigrationRunner from "@/components/migration-runner";
import { useMigrationStatus } from "@/stores/migration";

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
  const { initialize } = useEditorActions();
  const status = useMigrationStatus();

  useEffect(() => {
    console.log({ status });
    if (status === "complete") {
      initialize();
    }
  }, [status]);

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
        <Toaster
          position="bottom-left"
          toastOptions={{
            unstyled: true,
            className:
              "flex border border-white/10 min-h-16 text-sm items-center gap-x-2 px-3 py-2 rounded-md bg-neutral-900 text-neutral-50 fill-neutral-50",
          }}
          visibleToasts={1}
        />
        {/*<UpdaterRunner />*/}
        <MigrationRunner />
      </body>
    </html>
  );
}
