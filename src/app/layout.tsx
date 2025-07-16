import Grainy from "@/components/Grainy";
import Navbar from "@/components/Navbar";
import DraftProvider from "@/context/draft-provider";
import MigrationProvider from "@/context/migration-provider";
import { ModalProvider } from "@/context/modal-provider";
import UpdaterProvider from "@/context/update-provider";
import type { Metadata } from "next";
import { Exo_2 } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const exo2 = Exo_2({
  variable: '--font-exo-2',
  style: 'normal',
  weight: 'variable',
  subsets: ['latin']
})

export const metadata: Metadata = {
  title: "Taking Notes",
  description: "Your best way to keep in mind your thoughts through a easy-to-use UI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${exo2.variable} antialiased flex flex-col font-exo-2 w-screen relative p-4 h-screen text-neutral-50 bg-neutral-950`}
      >
        <Grainy />
        <UpdaterProvider>
          <MigrationProvider>
            <DraftProvider>
              <ModalProvider>
                <Navbar />
                <main className="flex w-full h-full overflow-x-hidden">
                  {children}
                </main>
                <Toaster position="bottom-left" toastOptions={{
                  unstyled: true,
                  className: "flex border border-white/10 min-h-16 text-sm items-center gap-x-2 px-3 py-2 rounded-md bg-neutral-900 text-neutral-50 fill-neutral-50"
                }} />
              </ModalProvider>
            </DraftProvider>
          </MigrationProvider>
        </UpdaterProvider>
      </body>
    </html>
  );
}
