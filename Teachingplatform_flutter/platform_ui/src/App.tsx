import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { LocaleProvider, ThemeProvider } from "./context/LocaleContext";
import "./App.css";
import "./figma-reference.css";

const AdminPage = lazy(() =>
  import("./pages/AdminPage").then((module) => ({ default: module.AdminPage })),
);
const AccessPage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.AccessPage })));
const CoursePage = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.CoursePage })));
const Dashboard = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.Dashboard })));
const Landing = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.Landing })));
const RequireStudent = lazy(() => import("./pages/PublicPages").then((module) => ({ default: module.RequireStudent })));
const LessonPage = lazy(() => import("./pages/LessonPage").then((module) => ({ default: module.LessonPage })));
const StudentProfilePage = lazy(() => import("./pages/StudentProfilePage").then((module) => ({ default: module.StudentProfilePage })));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage").then((module) => ({ default: module.NotFoundPage })));

function RouteLoading() {
  return (
    <main className="route-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="ui-spinner" aria-hidden="true" />
      <span>Loading your workspace…</span>
    </main>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LocaleProvider>
        <Suspense fallback={<RouteLoading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/access" element={<AccessPage />} />
            <Route path="/dashboard" element={<RequireStudent><Dashboard /></RequireStudent>} />
            <Route path="/courses/:id" element={<RequireStudent><CoursePage /></RequireStudent>} />
            <Route path="/profile" element={<RequireStudent><StudentProfilePage /></RequireStudent>} />
            <Route path="/lessons/:id" element={<RequireStudent><LessonPage /></RequireStudent>} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/answers/:lessonId" element={<AdminPage />} />
            <Route path="/admin/answers/:lessonId/:studentId" element={<AdminPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </LocaleProvider>
    </ThemeProvider>
  );
}
