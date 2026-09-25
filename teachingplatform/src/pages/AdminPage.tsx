import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { BookOpen, CheckCircle, ClipboardText, DeviceMobile, DownloadSimple, LockKey, MonitorPlay, Plus, Trash, UserCircle, UsersThree, X } from "@phosphor-icons/react";
import { api, isDemoMode, type StudentAnswer } from "../lib/api";
import type { Lesson, Student } from "../types";
import { Brand, Shell, useLocale } from "../context/LocaleContext";
import { LessonBuilder } from "../components/LessonBuilder";
import { SecureVideo } from "../components/SecureVideo";
import { TeacherAuthUI } from "../components/ui/auth-fuse";
export function AdminPage() {
  const { tx } = useLocale();
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("lp-admin") === "true",
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [view, setView] = useState<"lessons" | "codes" | "students" | "answers">("lessons");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [answerLessonId, setAnswerLessonId] = useState("");
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [newLesson, setNewLesson] = useState({
    title: "",
    description: "",
    video_id: "",
  });
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonError, setLessonError] = useState("");
  useEffect(() => {
    if (authenticated)
      Promise.all([api.adminLessons(), api.adminStudents()]).then(([l, s]) => {
        setLessons(l);
        setStudents(s);
      });
  }, [authenticated]);
  const selectedAnswerLessonId = answerLessonId || lessons[0]?.id || "";
  useEffect(() => {
    if (!authenticated || view !== "answers" || !selectedAnswerLessonId) return;
    let active = true;
    setAnswersLoading(true);
    setAnswersError("");
    api.adminAnswers(selectedAnswerLessonId)
      .then((items) => { if (active) setAnswers(items); })
      .catch((error) => { if (active) setAnswersError(error instanceof Error ? error.message : "Could not load student answers."); })
      .finally(() => { if (active) setAnswersLoading(false); });
    return () => { active = false; };
  }, [authenticated, view, selectedAnswerLessonId]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    const ok = await api.adminLogin(password);
    if (ok) {
      sessionStorage.setItem("lp-admin", "true");
      setAuthenticated(true);
    } else setLoginError(tx("Incorrect password. Please try again.", "كلمة المرور غير صحيحة. حاول مجدداً."));
  }
  if (!authenticated)
    return (
      <TeacherAuthUI
        password={password}
        loginError={loginError}
        demoMode={isDemoMode}
        onPasswordChange={setPassword}
        onSubmit={login}
        onFillDemo={() => setPassword("teacher")}
        tx={tx}
      />
    );
  async function createLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!newLesson.title.trim()) return;
    setSavingLesson(true);
    setLessonError("");
    try {
      const l = await api.createLesson({ title: newLesson.title.trim(), description: newLesson.description.trim() });
      setLessons((v) => [...v, l]);
      setShowLessonForm(false);
      setNewLesson({ title: "", description: "", video_id: "" });
      setEditingLesson(l);
    } catch (error) {
      setLessonError(
        error instanceof Error
          ? error.message
          : "The lesson could not be created.",
      );
    } finally {
      setSavingLesson(false);
    }
  }
  return (
    <Shell admin>
      <main className="admin-layout" id="main-content" tabIndex={-1}>
        <aside className="admin-sidebar">
          <div>
            <p>{tx("MANAGE", "الإدارة")}</p>
            <button
              className={view === "lessons" ? "active" : ""}
              onClick={() => setView("lessons")}
            >
              <BookOpen /> {tx("Lessons", "الدروس")}
            </button>
            <button
              className={view === "codes" ? "active" : ""}
              onClick={() => setView("codes")}
            >
              <LockKey /> {tx("Access codes", "رموز الدخول")}
            </button>
            <button
              className={view === "students" ? "active" : ""}
              onClick={() => setView("students")}
            >
              <UsersThree /> {tx("Students", "الطلاب")}
            </button>
            <button className={view === "answers" ? "active" : ""} onClick={() => setView("answers")}>
              <ClipboardText /> Student answers
            </button>
          </div>
          <div className="admin-user">
            <UserCircle weight="duotone" />
            <span>
              <strong>{tx("Teacher", "المعلّم")}</strong>
              <small>{tx("Administrator", "المدير")}</small>
            </span>
          </div>
        </aside>
        <section className="admin-main">
          {view === "lessons" && (
            <>
              <div className="admin-title">
                <div>
                  <p className="eyebrow">{tx("COURSE CONTENT", "محتوى الدورة")}</p>
                  <h1>{tx("Lessons", "الدروس")}</h1>
                  <p>
                    {tx("Create and organize the material your students can access.", "أنشئ ونظّم المواد التي يمكن لطلابك الوصول إليها.")}
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={() => setShowLessonForm(true)}
                >
                  <Plus /> {tx("New lesson", "درس جديد")}
                </button>
              </div>
              <div className="admin-list">
                {lessons.map((l, i) => (
                  <div className="admin-row" key={l.id}>
                    <span className="drag-index">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="row-icon">
                      <MonitorPlay />
                    </div>
                    <div className="row-copy">
                      <strong>{l.title}</strong>
                      <span>{l.description}</span>
                    </div>
                    <div className="row-meta">
                      <span className={`publish-badge ${l.published ? "is-published" : ""}`}>{l.published ? "Published" : "Draft"}</span>
                      <button className="text-button" onClick={() => setEditingLesson(l)}>{tx("Edit / Preview", "تحرير / معاينة")}</button>
                      <button className="text-button" onClick={async () => { const updated = await api.updateLesson(l.id, { published: !l.published }); if (updated) setLessons((items) => items.map((item) => item.id === l.id ? updated as Lesson : item)); }}>{l.published ? "Unpublish" : "Publish"}</button>
                      <span>{tx(`${l.questions.length} questions`, `${l.questions.length} أسئلة`)}</span>
                      <button
                        aria-label={tx("Delete lesson", "حذف الدرس")}
                        onClick={async () => {
                          await api.deleteLesson(l.id);
                          setLessons((v) => v.filter((x) => x.id !== l.id));
                        }}
                      >
                        <Trash />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
          {view === "codes" && (
            <>
              <div className="admin-title">
                <div>
                  <p className="eyebrow">{tx("STUDENT ACCESS", "دخول الطلاب")}</p>
                  <h1>{tx("Access codes", "رموز الدخول")}</h1>
                  <p>
                    {tx("Generate one-time codes to share privately with students.", "أنشئ رموزاً لمرة واحدة لمشاركتها مع الطلاب بشكل خاص.")}
                  </p>
                </div>
                <button
                  className="primary-button"
                  onClick={async () => setCodes(await api.generateCodes(5))}
                >
                  <Plus /> {tx("Generate 5 codes", "إنشاء 5 رموز")}
                </button>
              </div>
              {codes.length ? (
                <div className="code-sheet">
                  <div>
                    <h3>{tx("New codes", "الرموز الجديدة")}</h3>
                    <button
                      onClick={() =>
                        navigator.clipboard.writeText(codes.join("\n"))
                      }
                    >
                      {tx("Copy all", "نسخ الكل")}
                    </button>
                  </div>
                  {codes.map((c) => (
                    <code key={c}>{c}</code>
                  ))}
                  <button
                    className="secondary-button"
                    onClick={() => {
                      const blob = new Blob([codes.join("\n")]);
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "lesson-portal-codes.txt";
                      a.click();
                    }}
                  >
                    <DownloadSimple /> {tx("Export list", "تصدير القائمة")}
                  </button>
                </div>
              ) : (
                <div className="empty-state">
                  <LockKey weight="duotone" />
                  <h3>{tx("No fresh codes yet", "لا توجد رموز جديدة بعد")}</h3>
                  <p>Generate a batch when you’re ready to invite students.</p>
                </div>
              )}
            </>
          )}
          {view === "answers" && (
            <>
              <div className="admin-title answers-title">
                <div>
                  <p className="eyebrow">STUDENT WORK</p>
                  <h1>Student answers</h1>
                  <p>Review quiz submissions by lesson.</p>
                </div>
                <label className="answer-lesson-select">Lesson
                  <select value={selectedAnswerLessonId} onChange={(event) => setAnswerLessonId(event.target.value)}>
                    {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                  </select>
                </label>
              </div>
              {answersError && <p className="form-error">{answersError}</p>}
              {answersLoading ? <div className="empty-state">Loading submissions…</div> : answers.length ? (
                <div className="answer-list">
                  {answers.map((answer) => <article className="answer-card" key={answer.id}>
                    <header><div><strong>{answer.student_name}</strong><span>{new Date(answer.submitted_at).toLocaleString()}</span></div><small>{answer.question_type === "text" ? "Written answer" : "Multiple choice"}</small></header>
                    <h2>{answer.question_text}</h2>
                    <p>{answer.answer_text}</p>
                  </article>)}
                </div>
              ) : <div className="empty-state"><ClipboardText weight="duotone" /><h3>No answers yet</h3><p>Student quiz submissions for this lesson will appear here.</p></div>}
            </>
          )}
          {view === "students" && (
            <>
              <div className="admin-title">
                <div>
                  <p className="eyebrow">{tx("ENROLLMENT", "التسجيل")}</p>
                  <h1>{tx("Students", "الطلاب")}</h1>
                  <p>
                    Review access status and reset a student’s device when
                    needed.
                  </p>
                </div>
              </div>
              <div className="student-table">
                <div className="table-head">
                  <span>{tx("Student", "الطالب")}</span>
                  <span>{tx("Access code", "رمز الدخول")}</span>
                  <span>{tx("Device", "الجهاز")}</span>
                  <span>{tx("Progress", "التقدّم")}</span>
                  <span></span>
                </div>
                {students.map((s) => (
                  <div className="table-row" key={s.id}>
                    <span className="student-name">
                      <UserCircle weight="duotone" />
                      <strong>{s.name}</strong>
                    </span>
                    <code>{s.code}</code>
                    <span
                      className={
                        s.device_locked ? "device-locked" : "device-open"
                      }
                    >
                      {s.device_locked ? (
                        <>
                          <LockKey /> {tx("Locked", "مرتبط")}
                        </>
                      ) : (
                        <>
                          <DeviceMobile /> {tx("Ready to bind", "جاهز للربط")}
                        </>
                      )}
                    </span>
                    <span>
                      {tx(`${s.completed}/${lessons.length} lessons`, `${s.completed}/${lessons.length} دروس`)}
                    </span>
                    <button
                      className="text-button"
                      onClick={async () => {
                        await api.resetDevice(s.id);
                        setStudents((v) =>
                          v.map((x) =>
                            x.id === s.id ? { ...x, device_locked: false } : x,
                          ),
                        );
                      }}
                    >
                      {tx("Reset device", "إعادة ضبط الجهاز")}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      {showLessonForm && (
        <div className="modal-backdrop" onMouseDown={() => !savingLesson && setShowLessonForm(false)}>
          <form className="modal" onSubmit={createLesson} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><p className="eyebrow">NEW CONTENT</p><h2>Create a lesson draft</h2></div><button type="button" onClick={() => setShowLessonForm(false)}><X /></button></div>
            <p>Start with a title. Add any content, sections, video, PDF, or questions later in the lesson editor.</p>
            <label>Title<input required value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} placeholder="e.g. Cell structure" /></label>
            <label>Description (optional)<textarea value={newLesson.description} onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })} placeholder="A short introduction for students" /></label>
            {lessonError && <p className="form-error"><X /> {lessonError}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setShowLessonForm(false)}>Cancel</button><button disabled={savingLesson} className="primary-button">{savingLesson ? "Creating…" : "Create draft"}</button></div>
          </form>
        </div>
      )}
      {editingLesson && (
        <LessonBuilder
          lesson={editingLesson}
          onClose={() => setEditingLesson(null)}
          onSaved={(saved) => setLessons((items) => items.map((item) => item.id === saved.id ? saved : item))}
          video={(lessonId, videoId) => <SecureVideo lessonId={lessonId} videoId={videoId} locked={false} admin onWatched={async () => {}} />}
        />
      )}
    </Shell>
  );
}
