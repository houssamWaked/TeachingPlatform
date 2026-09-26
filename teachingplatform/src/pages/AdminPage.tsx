import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { BookOpen, ClipboardText, DeviceMobile, DownloadSimple, LockKey, MagnifyingGlass, MonitorPlay, Plus, Trash, UserCircle, UsersThree, X } from "@phosphor-icons/react";
import { api, isDemoMode, type StudentAnswer } from "../lib/api";
import type { Lesson, Student } from "../types";
import { Shell, useLocale } from "../context/LocaleContext";
import { LessonBuilder } from "../components/LessonBuilder";
import { SecureVideo } from "../components/SecureVideo";
import { TeacherAuthUI } from "../components/ui/auth-fuse";
export function AdminPage() {
  const { tx } = useLocale();
  const navigate = useNavigate();
  const { lessonId, studentId } = useParams<{ lessonId: string; studentId: string }>();
  const [authenticated, setAuthenticated] = useState(
    () => sessionStorage.getItem("lp-admin") === "true",
  );
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [view, setView] = useState<"lessons" | "codes" | "students" | "answers" | "forensic">(() => lessonId ? "answers" : "lessons");
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [portalLoading, setPortalLoading] = useState(true);
  const [portalError, setPortalError] = useState("");
  const [portalRefresh, setPortalRefresh] = useState(0);
  const [answers, setAnswers] = useState<StudentAnswer[]>([]);
  const [answerLessonId, setAnswerLessonId] = useState("");
  const [answersLoading, setAnswersLoading] = useState(false);
  const [answersError, setAnswersError] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codesCopying, setCodesCopying] = useState(false);
  const [codesCopied, setCodesCopied] = useState(false);
  const [publishingLessonId, setPublishingLessonId] = useState("");
  const [deletingLessonId, setDeletingLessonId] = useState("");
  const [resettingStudentId, setResettingStudentId] = useState("");
  const [actionError, setActionError] = useState("");
  const [showLessonForm, setShowLessonForm] = useState(false);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [newLesson, setNewLesson] = useState({
    title: "",
    description: "",
    video_id: "",
  });
  const [savingLesson, setSavingLesson] = useState(false);
  const [lessonError, setLessonError] = useState("");
  const [watermarkInput, setWatermarkInput] = useState("");
  const [watermarkResult, setWatermarkResult] = useState<Awaited<ReturnType<typeof api.adminResolveWatermark>> | null>(null);
  const [watermarkError, setWatermarkError] = useState("");
  const [watermarkLoading, setWatermarkLoading] = useState(false);
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    setPortalLoading(true);
    setPortalError("");
    Promise.all([api.adminLessons(), api.adminStudents()])
      .then(([l, s]) => {
        if (!active) return;
        setLessons(l);
        setStudents(s);
      })
      .catch((error) => {
        if (active) setPortalError(error instanceof Error ? error.message : "Could not load the teacher workspace.");
      })
      .finally(() => { if (active) setPortalLoading(false); });
    return () => { active = false; };
  }, [authenticated, portalRefresh]);
  const selectedAnswerLessonId = answerLessonId || lessonId || lessons[0]?.id || "";
  const selectedAnswerStudent = students.find((student) => student.id === studentId);
  const selectedStudentAnswers = answers.filter((answer) => answer.student_id === studentId);
  const studentAnswerGroups = [...students]
    .sort((first, second) => first.name.localeCompare(second.name))
    .map((student) => {
      const studentAnswers = answers.filter((answer) => answer.student_id === student.id);
      return { student, answers: studentAnswers, latest: studentAnswers[0]?.submitted_at };
    });
  useEffect(() => {
    if (!lessonId) return;
    setAnswerLessonId(lessonId);
    setView("answers");
  }, [lessonId]);
  useEffect(() => {
    if (!authenticated || view !== "answers" || !selectedAnswerLessonId) return;
    let active = true;
    setAnswersLoading(true);
    setAnswersError("");
    setAnswers([]);
    api.adminAnswers(selectedAnswerLessonId)
      .then((items) => { if (active) setAnswers(items); })
      .catch((error) => { if (active) setAnswersError(error instanceof Error ? error.message : "Could not load student answers."); })
      .finally(() => { if (active) setAnswersLoading(false); });
    return () => { active = false; };
  }, [authenticated, view, selectedAnswerLessonId]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    let ok = false;
    try { ok = await api.adminLogin(password); }
    catch (error) {
      setLoginError(error instanceof Error ? error.message : "Sign in failed. Please try again.");
      return;
    } finally { setLoginLoading(false); }
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
        loading={loginLoading}
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
              onClick={() => { setView("lessons"); navigate("/admin"); }}
            >
              <BookOpen /> {tx("Lessons", "الدروس")}
            </button>
            <button
              className={view === "codes" ? "active" : ""}
              onClick={() => { setView("codes"); navigate("/admin"); }}
            >
              <LockKey /> {tx("Access codes", "رموز الدخول")}
            </button>
            <button
              className={view === "students" ? "active" : ""}
              onClick={() => { setView("students"); navigate("/admin"); }}
            >
              <UsersThree /> {tx("Students", "الطلاب")}
            </button>
            <button className={view === "answers" ? "active" : ""} onClick={() => {
              const targetLessonId = selectedAnswerLessonId;
              setView("answers");
              if (targetLessonId) navigate(`/admin/answers/${targetLessonId}`);
            }}>
              <ClipboardText /> {tx("Student answers", "إجابات الطلاب")}
            </button>
            <button className={view === "forensic" ? "active" : ""} onClick={() => { setView("forensic"); navigate("/admin"); }}>
              <MagnifyingGlass /> {tx("Forensic", "التحقق الجنائي")}
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
          {portalLoading ? (
            <div className="admin-loading" role="status" aria-live="polite" aria-busy="true"><span className="ui-spinner" aria-hidden="true" /> {tx("Loading teacher workspace…", "جارٍ تحميل مساحة المعلم…")}</div>
          ) : portalError ? (
            <div className="admin-load-error" role="alert"><p>{portalError}</p><button className="secondary-button" onClick={() => setPortalRefresh((value) => value + 1)}>{tx("Try again", "حاول مرة أخرى")}</button></div>
          ) : <>
          {actionError && <p className="form-error" role="alert">{actionError}</p>}
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
                      <button className="text-button" onClick={() => { setAnswerLessonId(l.id); setView("answers"); navigate(`/admin/answers/${l.id}`); }}>{tx("View answers", "عرض الإجابات")}</button>
                      <button className="text-button" disabled={publishingLessonId === l.id || deletingLessonId === l.id} aria-busy={publishingLessonId === l.id} onClick={async () => {
                        setPublishingLessonId(l.id); setActionError("");
                        try {
                          const updated = await api.updateLesson(l.id, { published: !l.published });
                          if (updated) setLessons((items) => items.map((item) => item.id === l.id ? updated as Lesson : item));
                          else setActionError("The lesson status could not be updated.");
                        } catch (error) { setActionError(error instanceof Error ? error.message : "The lesson status could not be updated."); }
                        finally { setPublishingLessonId(""); }
                      }}>{publishingLessonId === l.id && <span className="ui-spinner" aria-hidden="true" />}{publishingLessonId === l.id ? "Saving…" : l.published ? "Unpublish" : "Publish"}</button>
                      <span>{tx(`${l.questions.length} questions`, `${l.questions.length} أسئلة`)}</span>
                      <button
                        aria-label={tx("Delete lesson", "حذف الدرس")}
                        disabled={deletingLessonId === l.id || publishingLessonId === l.id}
                        aria-busy={deletingLessonId === l.id}
                        onClick={async () => {
                          setDeletingLessonId(l.id); setActionError("");
                          try {
                            await api.deleteLesson(l.id);
                            setLessons((v) => v.filter((x) => x.id !== l.id));
                          } catch (error) { setActionError(error instanceof Error ? error.message : "The lesson could not be deleted."); }
                          finally { setDeletingLessonId(""); }
                        }}
                      >
                        {deletingLessonId === l.id ? <span className="ui-spinner" aria-hidden="true" /> : <Trash />}
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
                  disabled={codesLoading}
                  aria-busy={codesLoading}
                  onClick={async () => {
                    setCodesLoading(true); setActionError("");
                    try { setCodes(await api.generateCodes(5)); }
                    catch (error) { setActionError(error instanceof Error ? error.message : "Could not generate access codes."); }
                    finally { setCodesLoading(false); }
                  }}
                >
                  {codesLoading && <span className="ui-spinner" aria-hidden="true" />}
                  <Plus /> {tx("Generate 5 codes", "إنشاء 5 رموز")}
                </button>
              </div>
              {codes.length ? (
                <div className="code-sheet">
                  <div>
                    <h3>{tx("New codes", "الرموز الجديدة")}</h3>
                    <button
                      disabled={codesCopying}
                      aria-label={codesCopied ? "Codes copied" : codesCopying ? "Copying codes" : "Copy all codes"}
                      aria-busy={codesCopying}
                      onClick={async () => {
                        setCodesCopying(true); setActionError("");
                        try {
                          await navigator.clipboard.writeText(codes.join("\n"));
                          setCodesCopied(true);
                          window.setTimeout(() => setCodesCopied(false), 1800);
                        } catch (error) { setActionError(error instanceof Error ? error.message : "Could not copy the access codes."); }
                        finally { setCodesCopying(false); }
                      }}
                    >
                      {codesCopying && <span className="ui-spinner" aria-hidden="true" />}
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
                  <p>{tx("Generate a batch when you’re ready to invite students.", "أنشئ مجموعة من الرموز عندما تكون مستعداً لدعوة الطلاب.")}</p>
                </div>
              )}
            </>
          )}
          {view === "answers" && (
            <>
              {studentId && <button className="secondary-button answer-back-button" onClick={() => navigate(`/admin/answers/${selectedAnswerLessonId}`)}>← {tx("Back to students", "العودة إلى الطلاب")}</button>}
              <div className="admin-title answers-title">
                <div>
                  <p className="eyebrow">{tx("STUDENT WORK", "أعمال الطلاب")}</p>
                  <h1>{studentId ? tx(`${selectedAnswerStudent?.name ?? selectedStudentAnswers[0]?.student_name ?? "Student"}’s answers`, `إجابات ${selectedAnswerStudent?.name ?? selectedStudentAnswers[0]?.student_name ?? "الطالب"}`) : tx("Student answers", "إجابات الطلاب")}</h1>
                  <p>{studentId ? tx("Quiz answers submitted by this student.", "إجابات الاختبار التي أرسلها هذا الطالب.") : tx("Choose a student to review their quiz answers.", "اختر طالباً لمراجعة إجاباته عن الاختبار.")}</p>
                </div>
                <label className="answer-lesson-select">{tx("Lesson", "الدرس")}
                  <select value={selectedAnswerLessonId} onChange={(event) => { setAnswerLessonId(event.target.value); navigate(`/admin/answers/${event.target.value}`); }}>
                    {lessons.map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title}</option>)}
                  </select>
                </label>
              </div>
              {answersError && <p className="form-error">{answersError}</p>}
              {!studentId && answersLoading && <div className="admin-loading" role="status" aria-busy="true"><span className="ui-spinner" aria-hidden="true" /> {tx("Loading submissions…", "جارٍ تحميل الإجابات…")}</div>}
              {!studentId && !answersLoading && (studentAnswerGroups.length ? (
                <div className="student-answer-list">
                  {studentAnswerGroups.map(({ student, answers: studentAnswers, latest }) => <article className="student-answer-row" key={student.id}>
                    <div className="student-answer-summary">
                      <UserCircle weight="duotone" />
                      <div><strong>{student.name}</strong><span>{studentAnswers.length} {studentAnswers.length === 1 ? tx("answer", "إجابة") : tx("answers", "إجابات")}{latest ? ` · ${tx("Latest", "الأحدث")} ${new Date(latest).toLocaleString()}` : ` · ${tx("No submissions yet", "لا توجد إجابات مرسلة بعد")}`}</span></div>
                    </div>
                    <button className="secondary-button" onClick={() => navigate(`/admin/answers/${selectedAnswerLessonId}/${student.id}`)}>{tx("View answers", "عرض الإجابات")}</button>
                  </article>)}
                </div>
              ) : <div className="empty-state"><ClipboardText weight="duotone" /><h3>{tx("No students yet", "لا يوجد طلاب بعد")}</h3><p>{tx("Students will appear here when they have access to the course.", "سيظهر الطلاب هنا عندما يحصلون على صلاحية الوصول إلى الدورة.")}</p></div>)}
              {studentId && (answersLoading ? <div className="admin-loading" role="status" aria-busy="true"><span className="ui-spinner" aria-hidden="true" /> {tx("Loading submissions…", "جارٍ تحميل الإجابات…")}</div> : selectedStudentAnswers.length ? (
                <div className="answer-list">
                  {selectedStudentAnswers.map((answer) => <article className="answer-card" key={answer.id}>
                    <header><div><strong>{answer.student_name}</strong><span>{new Date(answer.submitted_at).toLocaleString()}</span></div><small>{answer.question_type === "text" ? tx("Written answer", "إجابة كتابية") : tx("Multiple choice", "اختيار من متعدد")}</small></header>
                    <h2>{answer.question_text}</h2>
                    <p>{answer.answer_text}</p>
                  </article>)}
                </div>
              ) : <div className="empty-state"><ClipboardText weight="duotone" /><h3>{tx("No answers yet", "لا توجد إجابات بعد")}</h3><p>{tx("Student quiz submissions for this lesson will appear here.", "ستظهر هنا إجابات الطلاب عن اختبار هذا الدرس.")}</p></div>)}
            </>
          )}
          {view === "students" && (
            <>
              <div className="admin-title">
                <div>
                  <p className="eyebrow">{tx("ENROLLMENT", "التسجيل")}</p>
                  <h1>{tx("Students", "الطلاب")}</h1>
                  <p>{tx("Review access status and reset a student’s device when needed.", "راجع حالة الوصول وأعد ضبط جهاز الطالب عند الحاجة.")}</p>
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
                      disabled={resettingStudentId === s.id}
                      aria-busy={resettingStudentId === s.id}
                      onClick={async () => {
                        setResettingStudentId(s.id); setActionError("");
                        try {
                          await api.resetDevice(s.id);
                          setStudents((v) => v.map((x) => x.id === s.id ? { ...x, device_locked: false } : x));
                        } catch (error) { setActionError(error instanceof Error ? error.message : "The device could not be reset."); }
                        finally { setResettingStudentId(""); }
                      }}
                    >
                      {resettingStudentId === s.id && <span className="ui-spinner" aria-hidden="true" />}
                      {tx("Reset device", "إعادة ضبط الجهاز")}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
          {view === "forensic" && <section className="forensic-tool">
            <h1>{tx("Forensic watermark lookup", "التحقق من العلامة المائية")}</h1>
            <p>{tx("Enter the full code or any visible fragment in order; you do not need to know which code group it came from. Use ? for one unreadable character and * for a gap of unknown length. At least 8 readable hex characters are required. Only a unique signature-verified match identifies a learner; this does not perform OCR.", "أدخل الرمز كاملاً أو أي جزء ظاهر منه بالترتيب. استخدم ? لمحرف واحد غير مقروء و* لفجوة مجهولة الطول. يلزم إدخال 8 محارف سداسية عشرية مقروءة على الأقل. لا يحدد هوية المتعلم إلا تطابق فريد تم التحقق من توقيعه؛ ولا تُجرى هنا معالجة OCR.")}</p>
            <form onSubmit={async (event) => {
              event.preventDefault();
              setWatermarkLoading(true); setWatermarkError(""); setWatermarkResult(null);
              try { setWatermarkResult(await api.adminResolveWatermark(watermarkInput.trim().toUpperCase())); }
              catch (error) { setWatermarkError(error instanceof Error ? error.message : tx("Could not resolve this watermark.", "تعذر التحقق من هذه العلامة المائية.")); }
              finally { setWatermarkLoading(false); }
            }}>
              <label htmlFor="forensic-watermark-code">{tx("Visible watermark code", "رمز العلامة المائية الظاهر")}</label>
              <div className="forensic-tool-row"><input id="forensic-watermark-code" value={watermarkInput} onChange={(event) => setWatermarkInput(event.target.value)} maxLength={80} required placeholder="A1?C*7F9D11" /><button className="secondary-button" disabled={watermarkLoading} aria-busy={watermarkLoading}>{watermarkLoading && <span className="ui-spinner" aria-hidden="true" />}{watermarkLoading ? tx("Checking…", "جارٍ التحقق…") : tx("Verify code", "تحقق من الرمز")}</button></div>
            </form>
            {watermarkError && <p className="form-error" role="alert">{watermarkError}</p>}
            {watermarkResult && <dl className="forensic-result">
              <div><dt>{tx("Classification", "التصنيف")}</dt><dd>{watermarkResult.classification}</dd></div>
              <div><dt>{tx("Detected", "تم الاكتشاف")}</dt><dd>{watermarkResult.detected ? tx("Yes", "نعم") : tx("No", "لا")}</dd></div>
              <div><dt>{tx("Integrity", "سلامة البيانات")}</dt><dd>{watermarkResult.integrity}</dd></div>
              <div><dt>{tx("Confidence", "مستوى الثقة")}</dt><dd>{watermarkResult.confidence}%</dd></div>
              <div><dt>{tx("Extraction quality", "جودة الاستخراج")}</dt><dd>{watermarkResult.extraction_quality}</dd></div>
              {watermarkResult.watermark_id && <div><dt>{tx("Watermark ID", "معرّف العلامة المائية")}</dt><dd>{watermarkResult.watermark_id}</dd></div>}
              {watermarkResult.content_id && <div><dt>{tx("Content ID", "معرّف المحتوى")}</dt><dd>{watermarkResult.content_id}</dd></div>}
              {watermarkResult.detected && <div><dt>{tx("Associated learner", "المتعلم المرتبط")}</dt><dd>{watermarkResult.student_name || tx("Name not returned by API", "لم تُرجع الواجهة اسم المتعلم")}</dd></div>}
              {watermarkResult.student_id && <div><dt>{tx("Student ID", "معرّف الطالب")}</dt><dd>{watermarkResult.student_id}</dd></div>}
              {watermarkResult.session_id && <div><dt>{tx("Session reference", "مرجع الجلسة")}</dt><dd>{watermarkResult.session_id}</dd></div>}
              {watermarkResult.timestamp && <div><dt>{tx("Issued", "تاريخ الإصدار")}</dt><dd>{new Date(watermarkResult.timestamp).toLocaleString()}</dd></div>}
              <p>{tx("Use as evidence for authorized human review only. Do not automatically accuse or penalize a learner.", "استخدم هذه النتيجة كدليل لمراجعة بشرية مخوّلة فقط. لا تتهم المتعلم أو تعاقبه تلقائياً.")}</p>
            </dl>}
            {watermarkResult?.detected && watermarkResult.integrity === "VALID" && !watermarkResult.student_name && <p className="forensic-no-match" role="status">
              {tx("This code is valid, but the API did not return the learner name. Deploy the latest Supabase api Edge Function, then verify the lookup again. The current function resolves the watermark’s student ID to the learner record.", "هذا الرمز صالح، لكن الواجهة لم تُرجع اسم المتعلم. انشر أحدث إصدار من دالة Supabase api، ثم أعد التحقق. تحوّل الدالة الحالية معرّف الطالب المرتبط بالعلامة إلى سجل المتعلم.")}
            </p>}
          {watermarkResult && !watermarkResult.detected && <p className="forensic-no-match" role="status">
              {watermarkResult.reason === "DEMO_MODE"
                ? tx("This app is in demo mode, so watermark lookup cannot identify a learner. Configure VITE_API_BASE_URL for the deployed Supabase API, rebuild and deploy the frontend, and open the lesson again to issue a server-registered watermark.", "التطبيق يعمل في الوضع التجريبي، لذلك لا يمكن للتحقق من العلامة تحديد المتعلم. اضبط VITE_API_BASE_URL لواجهة Supabase المنشورة، ثم أعد بناء الواجهة ونشرها وافتح الدرس مجدداً لإصدار علامة مسجلة على الخادم.")
                : watermarkResult.reason === "AMBIGUOUS_PARTIAL_CODE"
                  ? tx("Several issued codes match this fragment. Add more readable characters from the image, or narrow the unknown gap with ? (one character) or * (any-length gap), then verify again. No learner was identified.", "تطابق هذا الجزء مع عدة رموز صادرة. أضف محارف مقروءة أكثر من الصورة، أو حدّد الفجوة المجهولة باستخدام ? لمحرف واحد أو * لفجوة بأي طول، ثم أعد التحقق. لم يتم تحديد أي متعلم.")
                  : tx("No learner can be identified from this code: there is no matching server record. Check for a mistyped character, an older code, or that the app and Edge Function use the same Supabase project and that the watermark migration and secret were configured before this lesson was opened.", "تعذر تحديد متعلم من هذا الرمز لعدم وجود سجل مطابق على الخادم. تحقق من المحارف، ومن أن الرمز ليس قديماً، وأن التطبيق ودالة Edge يستخدمان مشروع Supabase نفسه، وأن ترحيل العلامات والسر قد أُعدّا قبل فتح هذا الدرس.")}
          </p>}
          </section>}
          </>}
        </section>
      </main>
      {showLessonForm && (
        <div className="modal-backdrop" onMouseDown={() => !savingLesson && setShowLessonForm(false)}>
          <form className="modal" onSubmit={createLesson} onMouseDown={(e) => e.stopPropagation()}>
            <div className="modal-head"><div><p className="eyebrow">{tx("NEW CONTENT", "محتوى جديد")}</p><h2>{tx("Create a lesson draft", "إنشاء مسودة درس")}</h2></div><button type="button" onClick={() => setShowLessonForm(false)} aria-label={tx("Close", "إغلاق")}><X /></button></div>
            <p>{tx("Start with a title. Add any content, sections, video, PDF, or questions later in the lesson editor.", "ابدأ بكتابة العنوان. يمكنك إضافة المحتوى والأقسام والفيديو وملفات PDF والأسئلة لاحقاً في محرر الدرس.")}</p>
            <label>{tx("Title", "العنوان")}<input required value={newLesson.title} onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })} placeholder={tx("e.g. Cell structure", "مثال: تركيب الخلية")} /></label>
            <label>{tx("Description (optional)", "الوصف (اختياري)")}<textarea value={newLesson.description} onChange={(e) => setNewLesson({ ...newLesson, description: e.target.value })} placeholder={tx("A short introduction for students", "مقدمة قصيرة للطلاب")} /></label>
            {lessonError && <p className="form-error"><X /> {lessonError}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" disabled={savingLesson} onClick={() => setShowLessonForm(false)}>{tx("Cancel", "إلغاء")}</button><button disabled={savingLesson} aria-busy={savingLesson} className="primary-button">{savingLesson && <span className="ui-spinner" aria-hidden="true" />}{savingLesson ? tx("Creating…", "جارٍ الإنشاء…") : tx("Create draft", "إنشاء مسودة")}</button></div>
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
