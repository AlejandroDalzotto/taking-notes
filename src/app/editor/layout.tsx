import { EditorProvider } from "@/context/editor-provider";

export default function RootEditorLayout({
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
