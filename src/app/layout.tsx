import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { Toaster } from "sonner";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
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
        className={`${geistSans.variable} ${geistMono.variable} antialiased flex font-geist-sans w-screen relative p-4 h-screen text-neutral-50 bg-neutral-950`}
      >
        <Navbar />
        <main className="w-full h-full">
          {children}
        </main>
        <Toaster position="bottom-left" toastOptions={{
          unstyled: true,
          className: "flex border border-white/10 min-h-16 text-sm items-center gap-x-2 px-3 py-2 rounded-md bg-neutral-900 text-neutral-50 fill-neutral-50"
        }} />
      </body>
    </html>
  );
}
