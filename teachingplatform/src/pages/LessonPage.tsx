import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, ClipboardText, FilePdf, List, UserCircle, VideoCamera, X } from "@phosphor-icons/react";
import { api, type StudentProfile } from "../lib/api";
import type { Lesson } from "../types";
import { Shell, ThemeToggle } from "../context/LocaleContext";
import { useLocale } from "../context/LocaleState";
import { SecureVideo } from "../components/SecureVideo";
import { LessonTabContent } from "../components/LessonTabContent";
import { installWebCaptureMonitor, subscribeToCaptureEvents } from "../lib/captureProtection";
import { contentWithTabs } from "../lib/lessonTabs";

// ---------------------------------------------------------------------------
// Capture-protection hooks and UI are kept in a small helper component.
// ---------------------------------------------------------------------------
function useCaptureProtection(lessonId: string) {
  const [captureActive, setCaptureActive] = useState(false);
  const [captureMessage, setCaptureMessage] = useState("");
  const [shortcutCoverActive, setShortcutCoverActive] = useState(false);
  const shortcutCoverTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    const uninstall = installWebCaptureMonitor();
    const unsubscribe = subscribeToCaptureEvents((event) => {
      const detected = event.type !== "SCREEN_SHARING_ENDED";
      setCaptureActive(detected);
      setCaptureMessage(
        detected
          ? "Protected lesson content is hidden while screen sharing is active."
          : "Screen sharing ended. Lesson content is available again."
      );
      const response = detected ? "HIDE_CONTENT_PAUSE_MEDIA_SHOW_OVERLAY" : "RESTORE_CONTENT_CAPTURE_TRACK_ENDED";
      void api
        .logCaptureEvent({
          lesson_id: lessonId,
          capture_type: event.type,
          capture_state: detected ? "ACTIVE_OR_SUSPECTED" : "ENDED",
          response,
        })
        .catch(() => undefined);
    });

    let lastShortcutAt = 0;
    const onShortcutKey = (event: KeyboardEvent) => {
      if (!event.isTrusted) return;
      const key = event.key.toLowerCase();
      const printScreen = event.key === "PrintScreen" || event.code === "PrintScreen";
      const keyS = key === "s" || event.code === "KeyS";
      const windowsSnippingShortcut = event.metaKey && event.shiftKey && keyS;
      const macScreenshotShortcut = event.metaKey && event.shiftKey && ["3", "4", "5"].includes(key);
      if (!printScreen && !windowsSnippingShortcut && !macScreenshotShortcut) return;

      const now = Date.now();
      if (now - lastShortcutAt < 1500) return;
      lastShortcutAt = now;

      setShortcutCoverActive(true);
      if (shortcutCoverTimer.current !== null) window.clearTimeout(shortcutCoverTimer.current);
      shortcutCoverTimer.current = window.setTimeout(() => setShortcutCoverActive(false), 1800);

      void api
        .logCaptureEvent({
          lesson_id: lessonId,
          capture_type: "SCREENSHOT_SHORTCUT_OBSERVED",
          capture_state: "KEY_EVENT_ONLY",
          response: "TEMPORARY_CONTENT_COVER_1800MS",
        })
        .catch(() => undefined);
    };
    window.addEventListener("keydown", onShortcutKey, true);

    return () => {
      unsubscribe();
      uninstall();
      window.removeEventListener("keydown", onShortcutKey, true);
      if (shortcutCoverTimer.current !== null) window.clearTimeout(shortcutCoverTimer.current);
    };
  }, [lessonId]);

  return { captureActive, captureMessage, shortcutCoverActive };
}

function StudentProfileDialog({ profile, onClose, onSaved }: { profile: StudentProfile; onClose: () => void; onSaved: (profile: StudentProfile) => void }) {
  const { tx } = useLocale();
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState<File | undefined>();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(profile.photo_url);
  useEffect(() => {
    if (!photo) { setPreview(profile.photo_url); return; }
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo, profile.photo_url]);
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError(""); setSaving(true);
    try { onSaved(await api.updateStudentProfile(name, photo)); onClose(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : "Your profile could not be updated."); }
    finally { setSaving(false); }
  }
  return <div className="modal-backdrop profile-modal-backdrop" onMouseDown={() => !saving && onClose()}>
    <form className="modal student-profile-modal" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
      <div className="modal-head"><div><p className="eyebrow">{tx("YOUR ACCOUNT", "حسابك")}</p><h2>{tx("Student profile", "ملف الطالب")}</h2></div><button type="button" onClick={onClose} aria-label={tx("Close", "إغلاق")}><X /></button></div>
      <div className="student-profile-photo"><div>{preview ? <img src={preview} alt="" /> : <UserCircle aria-hidden="true" />}</div><label className="secondary-button">{tx("Change photo", "تغيير الصورة")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0])} /></label></div>
      <label>{tx("Name", "الاسم")}<input required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="secondary-button" disabled={saving} onClick={onClose}>{tx("Cancel", "إلغاء")}</button><button className="primary-button" disabled={saving} aria-busy={saving}>{saving && <span className="ui-spinner" aria-hidden="true" />}{saving ? tx("Saving…", "جارٍ الحفظ…") : tx("Save profile", "حفظ الملف")}</button></div>
    </form>
  </div>;
}

// ---------------------------------------------------------------------------
// Small pure helpers
// ---------------------------------------------------------------------------
type AuthoredTab = ReturnType<typeof contentWithTabs>["tabs"] extends (infer T)[] | undefined ? T : never;

function resolveVideoParts(authoredTab: AuthoredTab | undefined, lesson: Lesson) {
  const blocks = authoredTab?.blocks ?? [];
  const videoBlocks = blocks.filter((b) => b.type === "video");
  const overviewBlocks = blocks.filter((b) => b.type !== "video");
  const legacyVideoBlockId = videoBlocks.find((b) => !b.videoId && !b.mediaEmpty)?.id;

  const videoParts = videoBlocks.flatMap((block, index) => {
    const videoId =
      block.videoId || (block.id === "legacy-video" || block.id === legacyVideoBlockId ? lesson.video_id : undefined);
    return !block.mediaEmpty && videoId ? [{ ...block, videoId, partNumber: index + 1 }] : [];
  });

  return { overviewBlocks, videoParts };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export function LessonPage() {
  const { tx } = useLocale();
  const { id = "" } = useParams();
  const navigate = useNavigate();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [profile, setProfile] = useState<StudentProfile>(() => ({ name: localStorage.getItem("lesson_portal_student_name") || "Student", photo_url: localStorage.getItem("lesson_portal_student_photo") || "" }));
  const [profileOpen, setProfileOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"content" | "quiz">("content");
  const [activeLessonTab, setActiveLessonTab] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSectionsOpen, setMobileSectionsOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(() => window.matchMedia("(max-width: 820px)").matches);
  const [activeVideoBlockId, setActiveVideoBlockId] = useState("");
  const [sent, setSent] = useState(false);
  const [quizResult, setQuizResult] = useState<{ correct_count: number; graded_count: number; written_count: number } | null>(
    null
  );

  const { captureActive, captureMessage, shortcutCoverActive } = useCaptureProtection(id);

  useEffect(() => {
    let active = true;
    api.studentProfile().then((current) => {
      if (!active) return;
      setProfile(current);
      localStorage.setItem("lesson_portal_student_name", current.name);
      if (current.photo_url) localStorage.setItem("lesson_portal_student_photo", current.photo_url);
    }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    setLesson(null);
    api
      .getLesson(id)
      .then((loaded) => {
        setLesson(loaded);
        const hasContent =
          Boolean(loaded.content && (loaded.content.blocks.length || loaded.content.sections.length || loaded.content.tabs?.length)) ||
          Boolean(loaded.video_id || loaded.pdf_path || loaded.word_path);
        if (hasContent) setTab("content");
        else if (loaded.content?.quizEnabled || loaded.questions.length) setTab("quiz");
      })
      .catch(() => navigate("/dashboard"));
  }, [id, navigate]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 820px)");
    const updateViewport = () => setIsMobileViewport(media.matches);
    media.addEventListener("change", updateViewport);
    return () => media.removeEventListener("change", updateViewport);
  }, []);

  if (!lesson) {
    return (
      <Shell>
        <main className="page-container" id="main-content" tabIndex={-1}>
          <div className="lesson-detail-skeleton skeleton" />
        </main>
      </Shell>
    );
  }

  const lessonTabs = contentWithTabs(lesson).tabs ?? [];
  const authoredTab = lessonTabs.find((item) => item.id === activeLessonTab) ?? lessonTabs[0];
  const { overviewBlocks, videoParts } = resolveVideoParts(authoredTab, lesson);
  const activeVideoPart = videoParts.find((block) => block.id === activeVideoBlockId) ?? videoParts[0];
  const showQuizTab = Boolean(lesson.content?.quizEnabled || lesson.questions.length);
  const showTabsNav = lessonTabs.length > 0 || showQuizTab;
  const activeSectionTitle = tab === "quiz" ? lesson.content?.quizTitle || tx("Quiz", "اختبار") : authoredTab?.title || tx("Lesson content", "محتوى الدرس");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = await api.submitAnswers(id, answers);
    setQuizResult(result);
    setSent(true);
  }

  return (
    <Shell>
      <main
        id="main-content"
        tabIndex={-1}
        className={`page-container protected-content lesson-shell-layout lesson-reference-page${
          captureActive ? " capture-active" : ""
        }`}
        onContextMenu={(e) => e.preventDefault()}
      >
        {(captureActive || shortcutCoverActive) && (
          <div className="capture-protection-overlay" role="alert" aria-live="assertive">
            <div className="capture-protection-card">
              <span className="capture-protection-eyebrow">{tx("PROTECTED LESSON", "درس محمي")}</span>
              <h2>{captureActive ? tx("Screen sharing detected", "تم اكتشاف مشاركة الشاشة") : tx("Screenshot shortcut detected", "تم اكتشاف اختصار لقطة الشاشة")}</h2>
              <p>
                {captureActive
                  ? captureMessage
                  : tx("Lesson content is temporarily hidden because the page received a screenshot shortcut key event. This does not confirm that a screenshot was captured.", "تم إخفاء محتوى الدرس مؤقتاً لأن الصفحة تلقت اختصار لوحة مفاتيح للقطة شاشة. هذا لا يؤكد التقاط صورة للشاشة.")}
              </p>
              {captureActive && (
                <small>{tx("This browser can only report screen sharing initiated through this page. OS screenshots and external recording are not detectable here.", "يمكن لهذا المتصفح الإبلاغ فقط عن مشاركة الشاشة التي بدأت من هذه الصفحة. لا يمكنه اكتشاف لقطات النظام أو التسجيل الخارجي.")}</small>
              )}
            </div>
          </div>
        )}

        {/* Keep the title and actions as direct children of the flex header. */}
        <header className="lesson-player-header">
          <div className="lesson-player-title">
            <button
              type="button"
              className="lesson-back-button"
              onClick={() => navigate("/dashboard")}
              aria-label={tx("Back to my lessons", "العودة إلى دروسي")}
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <span className="lesson-header-divider" aria-hidden="true" />
            <h1 title={lesson.title}>{lesson.title}</h1>
          </div>
          <button type="button" className="lesson-profile-button" onClick={() => setProfileOpen(true)}>
            {profile.photo_url ? <img src={profile.photo_url} alt="" /> : <UserCircle aria-hidden="true" />}
            <span>{tx("Profile", "الملف الشخصي")}</span>
          </button>
          <ThemeToggle />
          <button type="button" className="lesson-exit-button" onClick={() => navigate("/dashboard")}>{tx("Exit Portal", "الخروج")}</button>
        </header>



        <div className={`lesson-player-workspace${sidebarCollapsed ? " sidebar-collapsed" : ""}`}>
          {showTabsNav && (
            <>
              <button
                type="button"
                className="lesson-mobile-sections-trigger"
                aria-expanded={mobileSectionsOpen}
                aria-controls="student-lesson-sections"
                onClick={() => setMobileSectionsOpen((open) => !open)}
              >
                <List aria-hidden="true" />
                <span>{activeSectionTitle}</span>
                <ArrowRight aria-hidden="true" />
              </button>
              {mobileSectionsOpen && <button type="button" className="lesson-mobile-drawer-backdrop" aria-label={tx("Close lesson sections", "إغلاق أقسام الدرس")} onClick={() => setMobileSectionsOpen(false)} />}
            <aside id="student-lesson-sections" className={`admin-sidebar lesson-section-sidebar${mobileSectionsOpen ? " mobile-open" : ""}`} aria-label={tx("Lesson sections", "أقسام الدرس")} aria-hidden={isMobileViewport && !mobileSectionsOpen} inert={isMobileViewport && !mobileSectionsOpen}>
              <div>
                <div className="lesson-sidebar-heading">
                  <p>{tx("LESSON CONTENT", "محتوى الدرس")}</p>
                  <button type="button" className="lesson-mobile-drawer-close" aria-label={tx("Close lesson sections", "إغلاق أقسام الدرس")} onClick={() => setMobileSectionsOpen(false)}><X aria-hidden="true" /></button>
                  <button
                    type="button"
                    className="lesson-sidebar-toggle"
                    aria-label={sidebarCollapsed ? tx("Expand sidebar", "توسيع القائمة الجانبية") : tx("Collapse sidebar", "طي القائمة الجانبية")}
                    title={sidebarCollapsed ? tx("Expand sidebar", "توسيع القائمة الجانبية") : tx("Collapse sidebar", "طي القائمة الجانبية")}
                    aria-expanded={!sidebarCollapsed}
                    onClick={() => setSidebarCollapsed((collapsed) => !collapsed)}
                  >
                    {sidebarCollapsed ? <ArrowRight aria-hidden="true" /> : <ArrowLeft aria-hidden="true" />}
                    <span>{sidebarCollapsed ? tx("Expand", "توسيع") : tx("Collapse", "طي")}</span>
                  </button>
                </div>
                {lessonTabs.map((item) => {
                  const genericTab = item.title.trim().match(/^tab\s+(\d+)$/i);
                  const normalizedTitle = item.title.toLowerCase();
                  const SectionIcon = normalizedTitle.includes("video") ? VideoCamera : normalizedTitle.includes("resource") ? FilePdf : BookOpen;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={item.title}
                      aria-current={tab === "content" && item.id === authoredTab?.id ? "page" : undefined}
                      className={tab === "content" && item.id === authoredTab?.id ? "active" : ""}
                      onClick={() => {
                        setActiveLessonTab(item.id);
                        setTab("content");
                        setMobileSectionsOpen(false);
                      }}
                    >
                      <SectionIcon aria-hidden="true" />
                      <span>{genericTab ? genericTab[1] : item.title}</span>
                    </button>
                  );
                })}
                {showQuizTab && (
                  <button
                    type="button"
                    aria-current={tab === "quiz" ? "page" : undefined}
                    className={tab === "quiz" ? "active" : ""}
                    onClick={() => { setTab("quiz"); setMobileSectionsOpen(false); }}
                  >
                    <ClipboardText aria-hidden="true" /> <span>{lesson.content?.quizTitle || tx("Quiz", "اختبار")}</span>
                  </button>
                )}
              </div>
            </aside>
            </>
          )}

          <div className="lesson-player-main">
            {lesson.description && (
              <header className="lesson-player-content-title">
                <p>{lesson.description}</p>
              </header>
            )}
            {tab === "content" && videoParts.length > 1 && (
              <nav className="lesson-video-switcher" aria-label={tx("Choose a video", "اختر فيديو")}>
                {videoParts.map((part, index) => {
                  const current = part.id === activeVideoPart?.id;
                  return (
                    <button
                      type="button"
                      key={part.id}
                      className={`lesson-video-switcher-item${current ? " active" : ""}`}
                      aria-current={current ? "true" : undefined}
                      disabled={current}
                      onClick={() => setActiveVideoBlockId(part.id)}
                    >
                      <span className="lesson-video-switcher-number">{String(index + 1).padStart(2, "0")}</span>
                      <span>{part.title?.trim() || `${tx("Video", "فيديو")} ${index + 1}`}</span>
                    </button>
                  );
                })}
              </nav>
            )}

            {tab === "content" && activeVideoPart && (
              <section className="lesson-feature-media" aria-label={tx("Lesson video", "فيديو الدرس")}>
                <SecureVideo
                  key={activeVideoPart.id}
                  lessonId={lesson.id}
                  videoId={activeVideoPart.videoId}
                  locked={false}
                  autoLoad
                />
              </section>
            )}

            <div className="lesson-tab-panel">
              {tab === "content" && (lesson.description || overviewBlocks.length > 0) && (
                <article className="lesson-overview-content">
                  {lesson.description && <p className="lesson-overview-description">{lesson.description}</p>}
                  {authoredTab && overviewBlocks.length > 0 && (
                    <LessonTabContent
                      blocks={overviewBlocks}
                      lesson={lesson}
                      video={(lessonId, videoId) => (
                        <SecureVideo lessonId={lessonId} videoId={videoId} locked={false} />
                      )}
                    />
                  )}
                </article>
              )}

              {tab === "quiz" && (
                <QuizPanel
                  lesson={lesson}
                  sent={sent}
                  quizResult={quizResult}
                  answers={answers}
                  setAnswers={setAnswers}
                  onSubmit={submit}
                  onReturn={() => navigate("/dashboard")}
                  tx={tx}
                />
              )}
            </div>
          </div>
        </div>
        {profileOpen && <StudentProfileDialog profile={profile} onClose={() => setProfileOpen(false)} onSaved={(next) => {
          setProfile(next);
          localStorage.setItem("lesson_portal_student_name", next.name);
          if (next.photo_url) localStorage.setItem("lesson_portal_student_photo", next.photo_url);
        }} />}
      </main>
    </Shell>
  );
}

// ---------------------------------------------------------------------------
// Quiz panel kept separate from the lesson player layout.
// ---------------------------------------------------------------------------
function QuizPanel({
  lesson,
  sent,
  quizResult,
  answers,
  setAnswers,
  onSubmit,
  onReturn,
  tx,
}: {
  lesson: Lesson;
  sent: boolean;
  quizResult: { correct_count: number; graded_count: number; written_count: number } | null;
  answers: Record<string, string>;
  setAnswers: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onSubmit: (e: React.FormEvent) => void;
  onReturn: () => void;
  tx: (en: string, ar: string) => string;
}) {
  return (
    <section className="lesson-panel questions-panel">
      <div className="panel-intro">
        <span>{tx("Knowledge check", "اختبر فهمك")}</span>
        <h2>{lesson.content?.quizTitle || tx("Take a moment to reflect.", "خذ لحظة للتفكير.")}</h2>
        <p>{tx("Your answers are saved privately for your teacher to review.", "تُحفظ إجاباتك بسرية ليتمكن معلمك من مراجعتها.")}</p>
      </div>

      {sent ? (
        <div className="success-state">
          <CheckCircle weight="fill" />
          <h3>{tx("Answers submitted", "تم إرسال الإجابات")}</h3>
          <p>
            {quizResult?.graded_count
              ? `Score: ${quizResult.correct_count} / ${quizResult.graded_count} multiple-choice answers correct.`
              : "Your answers were saved."}
            {quizResult?.written_count ? ` ${quizResult.written_count} written answer(s) were saved for your teacher to review.` : ""}
          </p>
          <button onClick={onReturn}>{tx("Return to lessons", "العودة إلى الدروس")}</button>
        </div>
      ) : lesson.questions.length ? (
        <form onSubmit={onSubmit}>
          {lesson.questions.map((q, i) => (
            <fieldset key={q.id}>
              <legend>
                <span>{i + 1}</span>
                {q.question_text}
              </legend>
              {q.question_type === "multiple_choice" ? (
                <div className="option-list">
                  {q.options?.map((o) => (
                    <label key={o}>
                      <input
                        type="radio"
                        name={q.id}
                        value={o}
                        required
                        onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      />
                      <span>{o}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <textarea
                  required
                  placeholder={tx("Write your answer…", "اكتب إجابتك…")}
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                />
              )}
            </fieldset>
          ))}
          <button className="primary-button submit-answers">
            {tx("Submit answers", "إرسال الإجابات")} <ArrowRight />
          </button>
        </form>
      ) : (
        <p>{tx("This quiz does not have any questions yet.", "لا يحتوي هذا الاختبار على أسئلة بعد.")}</p>
      )}
    </section>
  );
}
