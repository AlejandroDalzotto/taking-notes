import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router";
import RootLayout from "./App";
import HomePage from "@/pages/editor-page";
import RecentFilesPage from "@/pages/recent-files-page";

const root = document.getElementById("root")!;

ReactDOM.createRoot(root).render(
  <BrowserRouter>
    <Routes>
      <Route element={<RootLayout />}>
        <Route index element={<HomePage />} />
        <Route path="/recent-files" element={<RecentFilesPage />} />
      </Route>
    </Routes>
  </BrowserRouter>,
);
