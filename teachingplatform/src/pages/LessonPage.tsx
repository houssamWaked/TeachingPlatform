import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle, ClipboardText } from "@phosphor-icons/react";
import { api } from "../lib/api";
import type { Lesson } from "../types";
import { Shell, useLocale } from "../context/LocaleContext";
import { SecureVideo } from "../components/SecureVideo";
import { LessonTabContent } from "../components/LessonTabContent";
import { useLessonImageUrl } from "../components/lesson-builder/useLessonImageUrl";
import { BackButton } from "../components/ui/BackButton";
import { contentWithTabs } from "../lib/lessonTabs";
export function LessonPage() {
  const { tx } = useLocale();
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [tab, setTab] = useState<"content" | "quiz">("content");
  const [activeLessonTab, setActiveLessonTab] = useState("");
  const [sent, setSent] = useState(false);
  const [quizResult, setQuizResult] = useState<{ correct_count: number; graded_count: number; written_count: number } | null>(null);
  const backgroundImageUrl = useLessonImageUrl(id, lesson?.content?.pageStyle?.backgroundImage);
  useEffect(() => {
    api
      .getLesson(id)
      .then((loaded) => { setLesson(loaded); if ((loaded.content && (loaded.content.blocks.length || loaded.content.sections.length || loaded.content.tabs?.length)) || loaded.video_id || loaded.pdf_path || loaded.word_path) setTab("content"); else if (loaded.content?.quizEnabled || loaded.questions.length) setTab("quiz"); })
      .catch(() => navigate("/dashboard"));
  }, [id, navigate]);
  const markWatched = useCallback(async () => {
    await api.markProgress(id, "video_watched");
    setLesson(await api.getLesson(id));
  }, [id]);
  if (!lesson)
    return (
      <Shell>
        <main className="page-container" id="main-content" tabIndex={-1}>
          <div className="lesson-detail-skeleton skeleton" />
        </main>
      </Shell>
    );
  const hasPageContent = Boolean(lesson.content && (lesson.content.blocks.length || lesson.content.sections.length || lesson.content.tabs?.length)) || Boolean(lesson.video_id || lesson.pdf_path || lesson.word_path);
  const lessonTabs = contentWithTabs(lesson).tabs ?? [];
  const authoredTab = lessonTabs.find((item) => item.id === activeLessonTab) ?? lessonTabs[0];
  const isFullPageMediaTab = Boolean(authoredTab?.blocks.some((block) => ["pdf", "word", "video", "embed"].includes(block.type)));
  const pageWidth = lesson.content?.pageStyle?.contentWidth === "narrow" ? 680 : lesson.content?.pageStyle?.contentWidth === "wide" ? 1120 : 850;
  const pageStyle = { width: `min(${pageWidth}px, 100%)`, marginInline: "auto", maxWidth: pageWidth };
  const hasCustomPageBackground = Boolean(backgroundImageUrl || lesson.content?.pageStyle?.backgroundColor);
  const pageBackgroundStyle = {
    "--lesson-page-background-color": lesson.content?.pageStyle?.backgroundColor ?? "transparent",
    "--lesson-page-background-image": backgroundImageUrl ? `url("${backgroundImageUrl}")` : "none",
  } as React.CSSProperties;
  const hasTrackedProgress = Boolean(lesson.video_id || lesson.content?.tabs?.some((item) => item.blocks.some((block) => block.type === "video" && block.videoId)) || lesson.pdf_path || lesson.word_path || lesson.questions.length);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const result = await api.submitAnswers(id, answers);
    setQuizResult(result);
    setSent(true);
    setLesson(await api.getLesson(id));
  }
  return (
    <Shell>
      <main
        id="main-content"
        tabIndex={-1}
        className={`page-container protected-content${hasCustomPageBackground ? " has-custom-page-background" : ""}${hasPageContent || lesson.content?.quizEnabled || lesson.questions.length ? " lesson-shell-layout" : ""}${tab === "content" && isFullPageMediaTab ? " has-full-page-media-tab" : ""}`}
        style={pageBackgroundStyle}
        onContextMenu={(e) => e.preventDefault()}
      >
        <BackButton
          className="page-back"
          to="/dashboard"
          label={tx("Back", "رجوع")}
          ariaLabel={tx("Back to all lessons", "العودة إلى كل الدروس")}
        />
        <section className="lesson-heading">
          <div>
            <p className="eyebrow">{tx(`LESSON ${lesson.order_index}`, `الدرس ${lesson.order_index}`)}</p>
            <h1>{lesson.title}</h1>
            <p>{lesson.description}</p>
          </div>
          {hasTrackedProgress && <div className="lesson-completion">
            <strong>{lesson.progressPercent}%</strong>
            <span>{tx("complete", "مكتمل")}</span>
          </div>}
        </section>
        {(hasPageContent || lesson.content?.quizEnabled || lesson.questions.length > 0) && <nav className="lesson-author-tabs" aria-label={tx("Lesson tabs", "علامات تبويب الدرس")}>
          {hasPageContent && lessonTabs.map((item) => <button key={item.id} className={tab === "content" && item.id === authoredTab?.id ? "active" : ""} onClick={() => { setActiveLessonTab(item.id); setTab("content"); }}>{item.title}</button>)}
          {(lesson.content?.quizEnabled || lesson.questions.length > 0) && <button className={tab === "quiz" ? "active" : ""} onClick={() => setTab("quiz")}><ClipboardText /> {lesson.content?.quizTitle || tx("Quiz", "اختبار")}</button>}
        </nav>}
        {tab === "content" && hasPageContent && (
          <section className={`lesson-panel lesson-page-panel${isFullPageMediaTab ? " lesson-media-page" : ""}`} style={isFullPageMediaTab ? undefined : pageStyle}>
            <div className={`lesson-content-flow${isFullPageMediaTab ? " lesson-media-flow" : ""}`}>
              {authoredTab && <LessonTabContent blocks={authoredTab.blocks} lesson={lesson} video={(lessonId, videoId) => <SecureVideo lessonId={lessonId} videoId={videoId} locked={false} onWatched={markWatched} />} onPdfViewed={() => { void api.markProgress(id, "pdf_viewed").then(async () => setLesson(await api.getLesson(id))); }} />}
            </div>
          </section>
        )}
        {tab === "quiz" && (
          <section className="lesson-panel questions-panel">
            <div className="panel-intro">
              <span>{tx("Knowledge check", "اختبار المعرفة")}</span>
              <h2>{lesson.content?.quizTitle || tx("Take a moment to reflect.", "خذ لحظة للتفكير.")}</h2>
              <p>
                {tx("Your answers are saved privately for your teacher to review.", "تُحفظ إجاباتك بشكل خاص ليراجعها معلّمك.")}
              </p>
            </div>
            {sent ? (
              <div className="success-state">
                <CheckCircle weight="fill" />
                <h3>{tx("Answers submitted", "تم إرسال الإجابات")}</h3>
                <p>{quizResult?.graded_count ? `Score: ${quizResult.correct_count} / ${quizResult.graded_count} multiple-choice answers correct.` : "Your answers were saved."}{Boolean(quizResult?.written_count) && ` ${quizResult.written_count} written answer(s) were saved for your teacher to review.`}</p>
                <p>{tx("Nice work. Your progress has been updated.", "عمل رائع. تم تحديث تقدّمك.")}</p>
                <button onClick={() => navigate("/dashboard")}>
                  {tx("Return to lessons", "العودة إلى الدروس")}
                </button>
              </div>
            ) : lesson.questions.length ? (
              <form onSubmit={submit}>
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
                              onChange={(e) =>
                                setAnswers((a) => ({
                                  ...a,
                                  [q.id]: e.target.value,
                                }))
                              }
                            />
                            <span>{o}</span>
                          </label>
                        ))}
                      </div>
                    ) : (
                      <textarea
                        required
                        placeholder="Write your answer…"
                        value={answers[q.id] || ""}
                        onChange={(e) =>
                          setAnswers((a) => ({ ...a, [q.id]: e.target.value }))
                        }
                      />
                    )}
                  </fieldset>
                ))}
                <button className="primary-button submit-answers">
                  {tx("Submit answers", "إرسال الإجابات")} <ArrowRight />
                </button>
              </form>
            ) : <p>This quiz does not have any questions yet.</p>}
          </section>
        )}
      </main>
    </Shell>
  );
}

