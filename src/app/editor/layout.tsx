import { EditorProvider } from "@/context/editor-provider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <EditorProvider>
      {children}
    </EditorProvider>
  );
}
