import Grainy from "@/components/Grainy";
import Navbar from "@/components/Navbar";
import DraftProvider from "@/context/draft-provider";
import MigrationProvider from "@/context/migration-provider";
import { ModalProvider } from "@/context/modal-provider";
import UpdaterProvider from "@/context/update-provider";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const newKansas = localFont({
  src: [
    {
      path: './fonts/New-Kansas.otf',
      weight: '400',
      style: 'normal',
    },
    {
      path: './fonts/New-Kansas-Bold.otf',
      weight: '700',
      style: 'normal',
    },
    {
      path: './fonts/New-Kansas-Light.otf',
      weight: '300',
      style: 'normal',
    },
    {
      path: './fonts/New-Kansas-Medium.otf',
      weight: '500',
      style: 'normal',
    },
  ],
  variable: "--font-new-kansas",
});

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
        className={`${newKansas.variable} antialiased flex font-new-kansas w-screen relative p-4 h-screen text-neutral-50 bg-neutral-950`}
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
