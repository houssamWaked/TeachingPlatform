import { Navigate, Route, Routes } from "react-router-dom";
import { LocaleProvider, ThemeProvider } from "./context/LocaleContext";
import { AdminPage } from "./pages/AdminPage";
import { AccessPage, Dashboard, Landing, RequireStudent } from "./pages/PublicPages";
import { LessonPage } from "./pages/LessonPage";
import "./App.css";
import "./figma-reference.css";

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/access" element={<AccessPage />} />
          <Route path="/dashboard" element={<RequireStudent><Dashboard /></RequireStudent>} />
          <Route path="/lessons/:id" element={<RequireStudent><LessonPage /></RequireStudent>} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/admin/answers/:lessonId" element={<AdminPage />} />
          <Route path="/admin/answers/:lessonId/:studentId" element={<AdminPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </LocaleProvider>
    </ThemeProvider>
  );
}
