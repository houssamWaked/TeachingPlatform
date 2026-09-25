import { useEffect, useState } from "react";
import { Navigate, NavLink, useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Check, CheckCircle, Clock, DeviceMobile, LockKey, MonitorPlay, Sparkle, X } from "@phosphor-icons/react";
import { api, isDemoMode } from "../lib/api";
import type { Lesson, ProgressState } from "../types";
import { Brand, LanguageToggle, Shell, useLocale } from "../context/LocaleContext";
import MorphGallery from "../components/ui/morph-gallery";
import { BackButton } from "../components/ui/BackButton";
import { useLessonImageUrl } from "../components/lesson-builder/useLessonImageUrl";
function CodeForm({ compact = false }: { compact?: boolean }) {
  const navigate = useNavigate();
  const { tx } = useLocale();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [askingName, setAskingName] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!code.trim()) return setError(tx("Enter the code your teacher gave you.", "أدخل الرمز الذي أعطاك إياه معلّمك."));
    if (!askingName) {
      const savedCode = localStorage.getItem("lesson_portal_student_code");
      const savedName = localStorage.getItem("lesson_portal_student_name");
      if (savedCode !== code.trim().toUpperCase() || !savedName) {
        setAskingName(true);
        return;
      }
      setName(savedName);
    }
    const studentName = (name || localStorage.getItem("lesson_portal_student_name") || "").trim().replace(/\s+/g, " ");
    if (!studentName) return setError(tx("Enter your name to continue.", "أدخل اسمك للمتابعة."));
    if (studentName.length > 80) return setError(tx("Your name must be 80 characters or fewer.", "يجب ألا يتجاوز الاسم ٨٠ حرفًا."));
    setLoading(true);
    try {
      await api.redeemCode(code.trim(), studentName);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : tx("That code could not be redeemed.", "تعذّر استخدام هذا الرمز."),
      );
    } finally {
      setLoading(false);
    }
  }
  return (
    <form
      className={compact ? "code-form compact" : "code-form"}
      onSubmit={submit}
      noValidate
    >
      <label htmlFor={askingName ? (compact ? "hero-student-name" : "access-student-name") : (compact ? "hero-code" : "access-code")}>{askingName ? tx("Your name", "اسمك") : tx("Access code", "رمز الدخول")}</label>
      <div className="code-row">
        {askingName ? <input
          id={compact ? "hero-student-name" : "access-student-name"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={tx("Enter your name", "أدخل اسمك")}
          autoComplete="name"
          autoFocus
          maxLength={80}
        /> : <input
          id={compact ? "hero-code" : "access-code"}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={tx("e.g. LESSON26", "مثال: LESSON26")}
          autoComplete="one-time-code"
        />}
        <button className="primary-button" disabled={loading}>
          {loading ? (
            "Checking…"
          ) : (
            <>
              {askingName ? tx("Enter lessons", "الدخول إلى الدروس") : tx("Continue", "متابعة")} <ArrowRight />
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="form-error">
          <X weight="bold" /> {error}
        </p>
      )}
      {isDemoMode && (
        <p className="demo-hint">
          {tx("Preview code:", "رمز المعاينة:")} {" "}
          <button type="button" onClick={() => { setCode("LESSON26"); setAskingName(false); }}>
            LESSON26
          </button>
        </p>
      )}
    </form>
  );
}

export function Landing() {
  const { tx } = useLocale();
  return (
    <main className="landing fresh-landing" id="main-content" tabIndex={-1}>
      <header className="landing-nav fresh-nav">
        <div className="brand"><Brand /></div>
        <div className="fresh-nav-actions">
          <span className="fresh-nav-note">A PRIVATE CLASSROOM, MADE FOR YOU</span>
          <LanguageToggle />
          <NavLink className="fresh-teacher-link" to="/admin">{tx("Teacher access", "دخول المعلم")} <ArrowRight /></NavLink>
        </div>
      </header>

      <section className="hero-section fresh-hero">
        <div className="hero-copy fresh-hero-copy">
          <p className="eyebrow fresh-eyebrow"><Sparkle weight="fill" /> {tx("A calmer way to learn", "طريقة أهدأ للتعلّم")}</p>
          <h1>{tx("Your next lesson", "درسك القادم")}<br />{tx("starts ", "")}<span>{tx("here.", "هنا.")}</span></h1>
          <p className="hero-lede">{tx("Your teacher brings the lesson. You bring your curiosity. Videos, notes, and quizzes stay together in one private learning space.", "معلّمك يقدّم الدرس، وأنت تحضر فضولك. الفيديوهات والملاحظات والاختبارات في مساحة تعلّم خاصة واحدة.")}</p>

        </div>

        <div className="hero-visual fresh-hero-visual" aria-label={tx("A visual tour of learning", "جولة مرئية في التعلّم")}>
          <MorphGallery
            className="fresh-morph-gallery"
            height="100%"
            items={[
              { src: "https://cdn.21st.dev/assets/mirror/ec/eceae69f56b5b3e29b9372032b5c22e96bd5fc9c167ce072813868aa871d52af.jpg", thumb: "https://cdn.21st.dev/assets/mirror/69/69dbb246d917da410f7e79e87e53aaf6302023baa9db05f1075fca5bcb255410.jpg", alt: "Sunlight passing through a forest" },
              { src: "https://cdn.21st.dev/assets/mirror/95/95b854c8c5fc73249ba12e729548a432ff171dab87d960e2aaf098f1db941828.jpg", thumb: "https://cdn.21st.dev/assets/mirror/3d/3d637a6ebf76a17643434f0a6939ae4a0e15853797ba886588071bf792dd12d9.jpg", alt: "A snow-capped mountain under the night sky" },
              { src: "https://cdn.21st.dev/assets/mirror/15/15a4a367001c723a22cc1f5b480cfdc6abc1e50fdf87e0555ddd324f404fb98a.jpg", thumb: "https://cdn.21st.dev/assets/mirror/b8/b88e4af2580633f65cd2fce4867c647be4e317e3bf54c47dac854aab211e6dde.jpg", alt: "Mountains reflected in a still lake" },
              { src: "https://cdn.21st.dev/assets/mirror/69/6947b2d1b15fc6614fe30af02282fe6418b3c43556fbfe6ad8e2fa16c72ae700.jpg", thumb: "https://cdn.21st.dev/assets/mirror/e0/e025ceb111646f4030ac36225aa4997e5024d098c4c939c409cddd281bd2c314.jpg", alt: "An aerial view of green hills" },
              { src: "https://cdn.21st.dev/assets/mirror/40/40907f0afb67e9bf2767a5982d24f0d56e6f49dd12b859cf92eb9b3b9771f4a4.jpg", thumb: "https://cdn.21st.dev/assets/mirror/38/38b66ef8fe46060a916db605710e709522a9534ff72aa549c1233c543f0a92a9.jpg", alt: "A field of orange wildflowers" },
              { src: "https://cdn.21st.dev/assets/mirror/ef/ef4b96d0e0de49e89f600b77edbe0a150e1f93f8ba92ae1422d285d267b7bd47.jpg", thumb: "https://cdn.21st.dev/assets/mirror/f8/f8ee65346d7a36d4a795ca4628042627baa2f3f5e1c79d1dd471f874c8a6f0a4.jpg", alt: "A tropical beach with clear blue water" },
            ]}
            autoplay={2200}
            duration={900}
            noiseScale={3.5}
            thumbnails={false}
            arrows={false}
          />

        </div>
          <div className="fresh-access-card">
            <div className="fresh-access-heading"><span className="fresh-access-icon"><LockKey weight="fill" /></span><div><strong>{tx("Have an access code?", "هل لديك رمز دخول؟")}</strong><small>{tx("Enter the one-time code from your teacher.", "أدخل الرمز الذي أرسله لك معلمك.")}</small></div></div>
            <CodeForm compact />
            <div className="fresh-private-note"><CheckCircle weight="fill" /> {tx("Private to your device. Your progress saves automatically.", "خاص بجهازك، ويُحفظ تقدمك تلقائياً.")}</div>
          </div>

      </section>


    </main>
  );
}
export function AccessPage() {
  const { tx } = useLocale();
  return (
      <main className="auth-page" id="main-content" tabIndex={-1}>
      <BackButton to="/" label={tx("Back", "رجوع")} ariaLabel={tx("Back to home", "العودة للرئيسية")} />
      <div className="auth-card">
        <div className="brand centered"><Brand /></div>
        <div className="auth-copy">
          <span className="auth-icon">
            <LockKey weight="fill" />
          </span>
          <h1>{tx("Enter your access code", "أدخل رمز الدخول")}</h1>
          <p>
            {tx("Use the one-time code your teacher shared with you. It will be securely linked to this device.", "استخدم الرمز الذي شاركه معك معلّمك. سيتم ربطه بهذا الجهاز بأمان.")}
          </p>
        </div>
        <CodeForm />
        <div className="device-note">
          <DeviceMobile />
          <span>
            <strong>{tx("One device only", "جهاز واحد فقط")}</strong>
            <br />
            {tx("Need to switch devices? Ask your teacher to reset your access.", "تريد تغيير الجهاز؟ اطلب من معلّمك إعادة ضبط الدخول.")}
          </span>
        </div>
      </div>
    </main>
  );
}
export function RequireStudent({ children }: { children: React.ReactNode }) {
  return api.hasSession() ? children : <Navigate to="/access" replace />;
}
function ProgressBadge({ state }: { state: ProgressState }) {
  const { tx } = useLocale();
  const labels = {
    not_started: tx("Not started", "لم يبدأ"),
    in_progress: tx("In progress", "قيد التقدّم"),
    completed: tx("Completed", "مكتمل"),
  };
  return (
    <span className={`status ${state}`}>
      {state === "completed" && <Check />} {labels[state]}
    </span>
  );
}

function DashboardLessonCard({ lesson, index }: { lesson: Lesson; index: number }) {
  const { tx } = useLocale();
  const imageUrl = useLessonImageUrl(lesson.id, lesson.content?.pageStyle?.cardImage);
  const imageStyle = imageUrl
    ? { backgroundImage: `linear-gradient(135deg, rgba(8, 28, 45, .12), rgba(8, 28, 45, .42)), url("${imageUrl}")`, backgroundSize: "cover", backgroundPosition: "center" }
    : undefined;
  return (
    <NavLink className="lesson-card" to={`/lessons/${lesson.id}`}>
      <div className={`lesson-thumb thumb-${(index % 3) + 1}`} style={imageStyle}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <MonitorPlay weight="duotone" />
      </div>
      <div className="lesson-card-body">
        <div className="lesson-meta">
          <span>{tx(`Lesson ${index + 1}`, `الدرس ${index + 1}`)}</span>
          <span><Clock /> {lesson.duration}</span>
        </div>
        <h3>{lesson.title}</h3>
        <p>{lesson.description}</p>
        <div className="card-footer">
          <ProgressBadge state={lesson.status} />
          <span className="open-lesson">{tx("Open lesson", "فتح الدرس")} <ArrowRight /></span>
        </div>
      </div>
    </NavLink>
  );
}

export function Dashboard() {
  const { tx } = useLocale();
  const studentName = localStorage.getItem("lesson_portal_student_name")?.trim();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .getLessons()
      .then(setLessons)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  const complete = lessons.filter((l) => l.status === "completed").length;
  return (
    <Shell>
      <main className="page-container dashboard-page" id="main-content" tabIndex={-1}>
        <section className="dashboard-head">
          <div>
            <p className="eyebrow">{tx("STUDENT PORTAL", "بوابة الطالب")}</p>
            <h1>{studentName ? tx(`Welcome, ${studentName}.`, `مرحبًا، ${studentName}.`) : tx("Welcome to your lessons.", "مرحبًا بك في دروسك.")}</h1>
            <p>{tx("Continue where you left off, or start something new.", "تابع من حيث توقفت أو ابدأ درساً جديداً.")}</p>
          </div>
          <div className="course-progress">
            <div className="progress-top">
              <span>{tx("Course progress", "تقدّم الدورة")}</span>
              <strong>
                {lessons.length
                  ? Math.round((complete / lessons.length) * 100)
                  : 0}
                %
              </strong>
            </div>
            <div className="progress-track">
              <span
                style={{
                  width: `${lessons.length ? (complete / lessons.length) * 100 : 0}%`,
                }}
              />
            </div>
            <small>
              {tx(`${complete} of ${lessons.length} lessons completed`, `اكتمل ${complete} من ${lessons.length} دروس`)}
            </small>
          </div>
        </section>
        <div className="section-title">
          <h2>{tx("Your lessons", "دروسك")}</h2>
          <span>{tx(`${lessons.length} lessons`, `${lessons.length} دروس`)}</span>
        </div>
        {loading ? (
          <div className="lesson-grid">
            {[1, 2, 3].map((i) => (
              <div className="lesson-card skeleton" key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>We couldn’t load your lessons</h3>
            <p>{error}</p>
            <button onClick={() => location.reload()}>{tx("Try again", "حاول مجدداً")}</button>
          </div>
        ) : (
          <div className="lesson-grid">
            {lessons.map((lesson, index) => <DashboardLessonCard key={lesson.id} lesson={lesson} index={index} />)}
          </div>
        )}
      </main>
    </Shell>
  );
}
