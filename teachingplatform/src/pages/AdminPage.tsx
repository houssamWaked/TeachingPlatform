import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, ClipboardText, DeviceMobile, DownloadSimple, GraduationCap, Image, LockKey, MonitorPlay, PencilSimple, Plus, Trash, UserCircle, UsersThree, X } from "@phosphor-icons/react";
import { api, isDemoMode, type StudentAnswer } from "../lib/api";
import type { Course, Lesson, Student } from "../types";
import { Shell } from "../context/LocaleContext";
import { useLocale } from "../context/LocaleState";
import { LessonBuilder } from "../components/LessonBuilder";
import { useLessonImageUrl } from "../components/lesson-builder/useLessonImageUrl";
import { SecureVideo } from "../components/SecureVideo";
import { TeacherAuthUI } from "../components/ui/auth-fuse";

function AdminLessonThumbnail({ lesson }: { lesson: Lesson }) {
  const imagePath = lesson.content?.pageStyle?.cardImage;
  const { url } = useLessonImageUrl(lesson.id, imagePath, true);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [url]);

  return (
    <div className={`row-icon${url && !imageFailed ? " has-image" : ""}`} aria-hidden="true">
      {url && !imageFailed && <img className="row-icon-image" src={url} alt="" loading="lazy" onError={() => setImageFailed(true)} />}
      <MonitorPlay />
    </div>
  );
}

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
  const [view, setView] = useState<"lessons" | "courses" | "codes" | "students" | "answers">(() => lessonId ? "answers" : "lessons");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia("(max-width: 820px)").matches);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
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
  const [deletingStudentId, setDeletingStudentId] = useState("");
  const [assigningLessonId, setAssigningLessonId] = useState("");
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
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [courseDraft, setCourseDraft] = useState({ name: "", description: "", image_path: "" });
  const [courseImageFile, setCourseImageFile] = useState<File | null>(null);
  const [savingCourse, setSavingCourse] = useState(false);
  const [courseError, setCourseError] = useState("");
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [studentCourseIds, setStudentCourseIds] = useState<string[]>([]);
  const [savingStudent, setSavingStudent] = useState(false);
  const [newLessonCourseId, setNewLessonCourseId] = useState("");
  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const updateViewport = () => setIsMobileViewport(media.matches);
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);
  useEffect(() => {
    if (!authenticated) return;
    let active = true;
    setPortalLoading(true);
    setPortalError("");
    Promise.all([api.adminLessons(), api.adminStudents(), api.adminCourses()])
      .then(([l, s, c]) => {
        if (!active) return;
        setLessons(l);
        setStudents(s);
        setCourses(c);
        setNewLessonCourseId((current) => current || c[0]?.id || "");
      })
      .catch((error) => {
        if (active) setPortalError(error instanceof Error ? error.message : "Could not load the teacher workspace.");
      })
      .finally(() => { if (active) setPortalLoading(false); });
    return () => { active = false; };
  }, [authenticated, portalRefresh]);
  const selectedAnswerLessonId = answerLessonId || lessonId || lessons[0]?.id || "";
  const selectedCourse = courses.find((course) => course.id === selectedCourseId) ?? null;
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
    if (!newLesson.title.trim() || !newLessonCourseId) return;
    setSavingLesson(true);
    setLessonError("");
    try {
      const l = await api.createLesson({ title: newLesson.title.trim(), description: newLesson.description.trim(), course_id: newLessonCourseId });
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
  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    if (!courseDraft.name.trim()) return;
    setSavingCourse(true); setCourseError(""); setActionError("");
    try {
      const image_path = courseImageFile ? await api.uploadCourseImage(courseImageFile) : courseDraft.image_path;
      const saved = await api.saveCourse({ ...(editingCourse ? { id: editingCourse.id } : {}), ...courseDraft, image_path });
      setCourses((items) => editingCourse ? items.map((course) => course.id === saved.id ? saved : course) : [...items, saved]);
      setShowCourseForm(false); setEditingCourse(null); setCourseImageFile(null);
    } catch (error) { setCourseError(error instanceof Error ? error.message : "The course could not be saved."); }
    finally { setSavingCourse(false); }
  }
  async function moveLessonToCourse(lessonId: string, courseId: string) {
    if (!courseId) return;
    setAssigningLessonId(lessonId); setActionError("");
    try {
      const updated = await api.updateLesson(lessonId, { course_id: courseId });
      if (!updated) throw new Error("The lesson could not be assigned.");
      setLessons((items) => items.map((lesson) => lesson.id === lessonId ? updated as Lesson : lesson));
    } catch (error) { setActionError(error instanceof Error ? error.message : "The lesson could not be assigned."); }
    finally { setAssigningLessonId(""); }
  }
  async function saveStudentCourses(e: React.FormEvent) {
    e.preventDefault();
    if (!editingStudent) return;
    setSavingStudent(true); setActionError("");
    try {
      await api.updateStudentCourses(editingStudent.id, studentCourseIds);
      setStudents((items) => items.map((student) => student.id === editingStudent.id ? { ...student, course_ids: studentCourseIds } : student));
      setEditingStudent(null);
    } catch (error) { setActionError(error instanceof Error ? error.message : "Course access could not be updated."); }
    finally { setSavingStudent(false); }
  }
  async function removeStudent(student: Student) {
    if (!window.confirm(`Delete ${student.name}? Their quiz answers and lesson progress will also be removed.`)) return;
    setDeletingStudentId(student.id); setActionError("");
    try {
      await api.deleteStudent(student.id);
      setStudents((items) => items.filter((item) => item.id !== student.id));
      setEditingStudent(null);
    } catch (error) { setActionError(error instanceof Error ? error.message : "The student could not be deleted."); }
    finally { setDeletingStudentId(""); }
  }
  return (
    <Shell admin onOpenAdminMenu={() => setMobileNavOpen(true)} adminMenuOpen={mobileNavOpen}>
      <main className="admin-layout" id="main-content" tabIndex={-1}>
        {mobileNavOpen && <button type="button" className="admin-mobile-drawer-backdrop" aria-label={tx("Close navigation menu", "إغلاق قائمة التنقل")} onClick={() => setMobileNavOpen(false)} />}
        <aside id="admin-navigation-drawer" className={`admin-sidebar${mobileNavOpen ? " mobile-open" : ""}`} inert={isMobileViewport && !mobileNavOpen}>
          <div className="admin-sidebar-mobile-head">
            <span>{tx("MANAGE", "الإدارة")}</span>
            <button type="button" className="admin-sidebar-mobile-close" aria-label={tx("Close navigation menu", "إغلاق قائمة التنقل")} onClick={() => setMobileNavOpen(false)}><X /></button>
          </div>
          <div className="admin-sidebar-nav">
            <p>{tx("MANAGE", "الإدارة")}</p>
            <button
              className={view === "lessons" ? "active" : ""}
              onClick={() => { setView("lessons"); navigate("/admin"); setMobileNavOpen(false); }}
            >
              <BookOpen /> {tx("Lessons", "الدروس")}
            </button>
            <button
              className={view === "courses" ? "active" : ""}
              onClick={() => { setView("courses"); setSelectedCourseId(""); navigate("/admin"); setMobileNavOpen(false); }}
            >
              <GraduationCap /> {tx("Courses", "الدورات")}
            </button>
            <button
              className={view === "codes" ? "active" : ""}
              onClick={() => { setView("codes"); navigate("/admin"); setMobileNavOpen(false); }}
            >
              <LockKey /> {tx("Access codes", "رموز الدخول")}
            </button>
            <button
              className={view === "students" ? "active" : ""}
              onClick={() => { setView("students"); navigate("/admin"); setMobileNavOpen(false); }}
            >
              <UsersThree /> {tx("Students", "الطلاب")}
            </button>
            <button className={view === "answers" ? "active" : ""} onClick={() => {
              const targetLessonId = selectedAnswerLessonId;
              setView("answers");
              setMobileNavOpen(false);
              if (targetLessonId) navigate(`/admin/answers/${targetLessonId}`);
            }}>
              <ClipboardText /> {tx("Student answers", "إجابات الطلاب")}
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
                  onClick={() => { setNewLessonCourseId(courses[0]?.id ?? ""); setShowLessonForm(true); }}
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
                    <AdminLessonThumbnail lesson={l} />
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
          {view === "courses" && (
            <>
              {!selectedCourse ? <>
                <div className="admin-title">
                  <div><p className="eyebrow">{tx("LEARNING PATHS", "مسارات التعلم")}</p><h1>{tx("Courses", "الدورات")}</h1><p>{tx("Create courses and organize lessons into each course.", "أنشئ دورات ونظّم الدروس داخل كل دورة.")}</p></div>
                  <button className="primary-button" onClick={() => { setEditingCourse(null); setCourseDraft({ name: "", description: "", image_path: "" }); setCourseImageFile(null); setCourseError(""); setShowCourseForm(true); }}><Plus /> {tx("New course", "دورة جديدة")}</button>
                </div>
                {courses.length ? <div className="course-admin-grid">
                  {courses.map((course) => <article className="course-admin-card course-admin-card-compact" key={course.id}>
                    {course.image_url || course.image_path?.startsWith("data:image/") ? <img className="course-admin-image" src={course.image_url || course.image_path} alt="" /> : <div className="course-admin-image course-admin-image-empty"><Image aria-hidden="true" /></div>}
                    <h2>{course.name}</h2>
                    <button type="button" className="course-open-button" aria-label={`${tx("Open course", "افتح الدورة")}: ${course.name}`} onClick={() => setSelectedCourseId(course.id)}><ArrowRight aria-hidden="true" /></button>
                  </article>)}
                </div> : <div className="empty-state"><GraduationCap /><h3>{tx("Create your first course", "أنشئ دورتك الأولى")}</h3><p>{tx("Courses group lessons and control which students can open them.", "تجمع الدورات الدروس وتحدد الطلاب الذين يمكنهم فتحها.")}</p></div>}
              </> : <>
                <div className="admin-title course-detail-title">
                  <div><button type="button" className="course-detail-back" onClick={() => setSelectedCourseId("")}><ArrowLeft aria-hidden="true" />{tx("All courses", "كل الدورات")}</button><p className="eyebrow">{tx("COURSE DETAILS", "تفاصيل الدورة")}</p><h1>{selectedCourse.name}</h1><p>{selectedCourse.description || tx("No description yet.", "لا يوجد وصف بعد.")}</p></div>
                  <div className="course-admin-actions">
                    <button className="icon-button" aria-label={tx("Edit course", "تعديل الدورة")} onClick={() => { setEditingCourse(selectedCourse); setCourseDraft({ name: selectedCourse.name, description: selectedCourse.description, image_path: selectedCourse.image_path }); setCourseImageFile(null); setCourseError(""); setShowCourseForm(true); }}><PencilSimple /></button>
                    <button className="icon-button" aria-label={tx("Delete course", "حذف الدورة")} onClick={async () => { if (!window.confirm(`Delete course “${selectedCourse.name}”?`)) return; setActionError(""); try { await api.deleteCourse(selectedCourse.id); setCourses((items) => items.filter((item) => item.id !== selectedCourse.id)); setSelectedCourseId(""); } catch (error) { setActionError(error instanceof Error ? error.message : "The course could not be deleted."); } }}><Trash /></button>
                  </div>
                </div>
                <div className="course-detail-cover">
                  {selectedCourse.image_url || selectedCourse.image_path?.startsWith("data:image/") ? <img src={selectedCourse.image_url || selectedCourse.image_path} alt="" /> : <div className="course-admin-image-empty"><Image aria-hidden="true" /></div>}
                  <div><strong>{tx("Course description", "وصف الدورة")}</strong><p>{selectedCourse.description || tx("Add a description so students know what this course covers.", "أضف وصفاً ليعرف الطلاب محتوى هذه الدورة.")}</p></div>
                </div>
                <section className="course-detail-section">
                  <div className="course-detail-section-heading"><div><h2>{tx("Lessons", "الدروس")}</h2><p>{tx(`${lessons.filter((lesson) => lesson.course_id === selectedCourse.id).length} lessons in this course`, `${lessons.filter((lesson) => lesson.course_id === selectedCourse.id).length} دروس في هذه الدورة`)}</p></div><button className="primary-button" onClick={() => { setNewLessonCourseId(selectedCourse.id); setShowLessonForm(true); }}><Plus /> {tx("Add lesson", "إضافة درس")}</button></div>
                  <div className="course-detail-list">
                    {lessons.filter((lesson) => lesson.course_id === selectedCourse.id).map((lesson) => <div className="course-detail-row" key={lesson.id}><div><strong>{lesson.title}</strong><span>{lesson.description || tx("No description", "لا يوجد وصف")}</span></div><span className={`publish-badge ${lesson.published ? "is-published" : ""}`}>{lesson.published ? tx("Published", "منشور") : tx("Draft", "مسودة")}</span><button className="text-button" onClick={() => setEditingLesson(lesson)}>{tx("Edit / Preview", "تحرير / معاينة")}</button></div>)}
                    {!lessons.some((lesson) => lesson.course_id === selectedCourse.id) && <p className="course-detail-empty">{tx("No lessons in this course yet. Add the first lesson here.", "لا توجد دروس في هذه الدورة بعد. أضف الدرس الأول هنا.")}</p>}
                  </div>
                  {lessons.some((lesson) => lesson.course_id !== selectedCourse.id) && <label className="course-assign-select">{tx("Move an existing lesson into this course", "نقل درس موجود إلى هذه الدورة")}
                    <select value="" disabled={Boolean(assigningLessonId)} onChange={(event) => { const lessonId = event.target.value; if (lessonId) void moveLessonToCourse(lessonId, selectedCourse.id); }}>
                      <option value="">{tx("Choose a lesson…", "اختر درساً…")}</option>
                      {lessons.filter((lesson) => lesson.course_id !== selectedCourse.id).map((lesson) => <option key={lesson.id} value={lesson.id}>{lesson.title} · {courses.find((item) => item.id === lesson.course_id)?.name ?? tx("Other course", "دورة أخرى")}</option>)}
                    </select>
                  </label>}
                </section>
                <section className="course-detail-section">
                  <div className="course-detail-section-heading"><div><h2>{tx("Enrolled students", "الطلاب المسجلون")}</h2><p>{tx(`${students.filter((student) => student.course_ids?.includes(selectedCourse.id)).length} students`, `${students.filter((student) => student.course_ids?.includes(selectedCourse.id)).length} طلاب`)}</p></div></div>
                  <div className="course-detail-list">
                    {students.filter((student) => student.course_ids?.includes(selectedCourse.id)).map((student) => <div className="course-student-row" key={student.id}><UserCircle aria-hidden="true" /><strong>{student.name}</strong><span>{tx("Access code", "رمز الدخول")}: {student.code}</span></div>)}
                    {!students.some((student) => student.course_ids?.includes(selectedCourse.id)) && <p className="course-detail-empty">{tx("No students are enrolled in this course yet.", "لا يوجد طلاب مسجلون في هذه الدورة بعد.")}</p>}
                  </div>
                </section>
              </>}
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
                    <span className="student-row-actions">
                      <button className="text-button" onClick={() => { setEditingStudent(s); setStudentCourseIds(s.course_ids ?? []); }}>{tx("Edit access", "تعديل الوصول")}</button>
                      <button className="text-button" disabled={resettingStudentId === s.id} aria-busy={resettingStudentId === s.id} onClick={async () => {
                        setResettingStudentId(s.id); setActionError("");
                        try { await api.resetDevice(s.id); setStudents((v) => v.map((x) => x.id === s.id ? { ...x, device_locked: false } : x)); }
                        catch (error) { setActionError(error instanceof Error ? error.message : "The device could not be reset."); }
                        finally { setResettingStudentId(""); }
                      }}>{resettingStudentId === s.id && <span className="ui-spinner" aria-hidden="true" />}{tx("Reset device", "إعادة ضبط الجهاز")}</button>
                      <button className="text-button danger-button" disabled={deletingStudentId === s.id} onClick={() => void removeStudent(s)}>{deletingStudentId === s.id ? <span className="ui-spinner" aria-hidden="true" /> : <Trash />}{tx("Delete", "حذف")}</button>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
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
            <label>{tx("Course", "الدورة")}<select required value={newLessonCourseId} onChange={(event) => setNewLessonCourseId(event.target.value)}><option value="">{tx("Choose a course", "اختر دورة")}</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></label>
            {lessonError && <p className="form-error"><X /> {lessonError}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" disabled={savingLesson} onClick={() => setShowLessonForm(false)}>{tx("Cancel", "إلغاء")}</button><button disabled={savingLesson} aria-busy={savingLesson} className="primary-button">{savingLesson && <span className="ui-spinner" aria-hidden="true" />}{savingLesson ? tx("Creating…", "جارٍ الإنشاء…") : tx("Create draft", "إنشاء مسودة")}</button></div>
          </form>
        </div>
      )}
      {showCourseForm && (
        <div className="modal-backdrop" onMouseDown={() => !savingCourse && setShowCourseForm(false)}>
          <form className="modal" onSubmit={saveCourse} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><p className="eyebrow">{tx("COURSE DETAILS", "تفاصيل الدورة")}</p><h2>{editingCourse ? tx("Edit course", "تعديل الدورة") : tx("Create a course", "إنشاء دورة")}</h2></div><button type="button" onClick={() => setShowCourseForm(false)} aria-label={tx("Close", "إغلاق")}><X /></button></div>
            <label>{tx("Name", "الاسم")}<input required maxLength={120} value={courseDraft.name} onChange={(event) => setCourseDraft({ ...courseDraft, name: event.target.value })} /></label>
            <label>{tx("Description", "الوصف")}<textarea maxLength={2000} value={courseDraft.description} onChange={(event) => setCourseDraft({ ...courseDraft, description: event.target.value })} placeholder={tx("What will students learn?", "ماذا سيتعلم الطلاب؟")} /></label>
            <label>{tx("Course image", "صورة الدورة")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setCourseImageFile(event.target.files?.[0] ?? null)} /><small>{courseImageFile?.name || (courseDraft.image_path ? tx("An image is already attached.", "هناك صورة مرفقة بالفعل.") : tx("JPEG, PNG, or WebP, up to 8 MB.", "JPEG أو PNG أو WebP، حتى 8 ميغابايت."))}</small></label>
            {courseError && <p className="form-error"><X /> {courseError}</p>}
            <div className="modal-actions"><button type="button" className="secondary-button" disabled={savingCourse} onClick={() => setShowCourseForm(false)}>{tx("Cancel", "إلغاء")}</button><button className="primary-button" disabled={savingCourse} aria-busy={savingCourse}>{savingCourse && <span className="ui-spinner" aria-hidden="true" />}{savingCourse ? tx("Saving…", "جارٍ الحفظ…") : tx("Save course", "حفظ الدورة")}</button></div>
          </form>
        </div>
      )}
      {editingStudent && (
        <div className="modal-backdrop" onMouseDown={() => !savingStudent && setEditingStudent(null)}>
          <form className="modal student-course-modal" onSubmit={saveStudentCourses} onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-head"><div><p className="eyebrow">{tx("STUDENT ACCESS", "دخول الطالب")}</p><h2>{tx(`Edit ${editingStudent.name}`, `تعديل ${editingStudent.name}`)}</h2></div><button type="button" onClick={() => setEditingStudent(null)} aria-label={tx("Close", "إغلاق")}><X /></button></div>
            <p>{tx("Choose which courses this student can open. Access updates immediately after saving.", "اختر الدورات التي يمكن لهذا الطالب فتحها. يتم تحديث الوصول بعد الحفظ مباشرة.")}</p>
            <div className="student-course-options">{courses.map((course) => <label key={course.id}><input type="checkbox" checked={studentCourseIds.includes(course.id)} onChange={(event) => setStudentCourseIds((current) => event.target.checked ? [...current, course.id] : current.filter((id) => id !== course.id))} /><span><strong>{course.name}</strong><small>{lessons.filter((lesson) => lesson.course_id === course.id).length} {tx("lessons", "دروس")}</small></span></label>)}</div>
            <div className="student-modal-footer"><button type="button" className="text-button danger-button" disabled={savingStudent || deletingStudentId === editingStudent.id} onClick={() => void removeStudent(editingStudent)}>{tx("Delete student", "حذف الطالب")}</button><div className="modal-actions"><button type="button" className="secondary-button" disabled={savingStudent} onClick={() => setEditingStudent(null)}>{tx("Cancel", "إلغاء")}</button><button className="primary-button" disabled={savingStudent} aria-busy={savingStudent}>{savingStudent && <span className="ui-spinner" aria-hidden="true" />}{savingStudent ? tx("Saving…", "جارٍ الحفظ…") : tx("Save access", "حفظ الوصول")}</button></div></div>
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
