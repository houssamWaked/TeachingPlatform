import { useEffect, useState } from "react";
import { Navigate, NavLink, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, BookOpen, Clock, DeviceMobile, LockKey, UserCircle, X } from "@phosphor-icons/react";
import { api, isDemoMode } from "../lib/api";
import type { Course, Lesson } from "../types";
import { Brand, Shell, ThemeToggle } from "../context/LocaleContext";
import { useLocale } from "../context/LocaleState";
import { useTheme } from "../context/ThemeState";
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
      <label className={compact ? "visually-hidden" : undefined} htmlFor={askingName ? (compact ? "hero-student-name" : "access-student-name") : (compact ? "hero-code" : "access-code")}>{askingName ? tx("Your name", "اسمك") : tx("Access code", "رمز الدخول")}</label>
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
          placeholder={compact ? "ACCESS-CODE-HERE" : tx("e.g. LESSON26", "مثال: LESSON26")}
          autoComplete="one-time-code"
        />}
        <button className="primary-button" disabled={loading} aria-busy={loading}>
          {loading ? (
            <><span className="ui-spinner" aria-hidden="true" /> {tx("Checking…", "جارٍ التحقق…")}</>
          ) : (
            <>
              {askingName ? tx("Continue", "الدخول إلى الدروس") : compact ? tx("Join Lesson", "الانضمام إلى الدرس") : tx("Continue", "متابعة")} <ArrowRight aria-hidden="true" />
            </>
          )}
        </button>
      </div>
      {error && (
        <p className="form-error" role="alert" aria-live="polite">
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
          <ThemeToggle />
          <NavLink className="fresh-teacher-link" to="/admin">{tx("Login", "تسجيل الدخول")}</NavLink>
        </div>
      </header>

      <section className="hero-section fresh-hero">
        <div className="hero-copy fresh-hero-copy">
          <p className="eyebrow">{tx("A quiet space to grow", "مساحة هادئة للنمو")}</p>
          <h1>{tx("Welcome to", "مرحباً بك في")}<br />{tx("Deeb Center", "Deeb Center")}</h1>
          <p className="hero-lede desktop-helper">{tx("Enter your access code to continue your journey. A quiet space designed for focused learning and meaningful progress.", "أدخل رمز الدخول لمتابعة رحلتك التعليمية في مساحة هادئة للتعلم والتركيز والتقدم.")}</p>
          <p className="hero-lede mobile-helper">{tx("Enter your access code below to continue.", "أدخل رمز الدخول أدناه للمتابعة.")}</p>
        </div>
        <div className="fresh-hero-visual" aria-hidden="true" />
        <div className="fresh-access-card">
          <div className="fresh-access-heading"><strong>{tx("Enter Access Code", "أدخل رمز الدخول")}</strong><small className="desktop-helper">{tx("Type the code provided by your instructor", "اكتب الرمز الذي أعطاك إياه معلمك")}</small><small className="mobile-helper">{tx("Provided by your instructor", "مقدم من معلمك")}</small></div>
          <CodeForm compact />
          <div className="fresh-invite-note"><span className="desktop-helper">{tx("Don't have a code? Ask your teacher for an invite.", "ليس لديك رمز؟ اطلب دعوة من معلمك.")}</span><span className="mobile-helper">{tx("Need code? Ask your teacher.", "هل تحتاج إلى رمز؟ اسأل معلمك.")}</span></div>
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
      <ThemeToggle className="access-theme-toggle" />
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
function DashboardLessonCard({ lesson, index }: { lesson: Lesson; index: number }) {
  const { tx } = useLocale();
  const { theme } = useTheme();
  const { url: imageUrl } = useLessonImageUrl(lesson.id, lesson.content?.pageStyle?.cardImage);
  const dark = theme === "dark";
  return (
    <NavLink className="lesson-card" to={`/lessons/${lesson.id}`}>
      <div className={`lesson-thumb thumb-${(index % 3) + 1}`}>
        <picture className="lesson-thumb-picture">
          {!imageUrl && <source media="(max-width: 760px)" srcSet={dark ? "/figma/dark-student-dashboard-mobile-thumbnail.png" : "/figma/student-dashboard-mobile-lesson-thumbnail-mobile.png"} />}
          <img className="lesson-thumb-image" src={imageUrl || (dark ? "/figma/dark-student-dashboard-thumbnail.png" : "/figma/student-dashboard-desktop-lesson-thumbnail.png")} alt="" loading="lazy" />
        </picture>
      </div>
      <div className="lesson-card-body">
        <div className="lesson-meta">
          <span>{tx(`Lesson ${index + 1}`, `الدرس ${index + 1}`)}</span>
          <span className="lesson-card-duration"><Clock /> {lesson.duration}</span>
        </div>
        <h3>{lesson.title}</h3>
        <p>{lesson.description}</p>
        <div className="card-footer">
          <span className="open-lesson">{tx("Open lesson", "فتح الدرس")} <ArrowRight /></span>
        </div>
      </div>
    </NavLink>
  );
}

export function Dashboard() {
  const { tx } = useLocale();
  const studentName = localStorage.getItem("lesson_portal_student_name")?.trim();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api
      .getCourses()
      .then(setCourses)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  return (
    <Shell hideHeader>
      <header className="student-dashboard-nav">
        <div className="brand"><Brand /></div>
        <div className="student-dashboard-nav-actions">
          <NavLink to="/profile" className="student-dashboard-profile-link" aria-label={tx("Student profile", "ملف الطالب")}>
            <UserCircle aria-hidden="true" />{studentName && <span>{studentName}</span>}
          </NavLink>
          <ThemeToggle />
          <button type="button" onClick={() => { api.signOut(); location.assign("/"); }}>{tx("Exit Portal", "الخروج")}</button>
        </div>
      </header>
      <main className="page-container dashboard-page lessons-portal-page" id="main-content" tabIndex={-1}>
        <section className="dashboard-head">
          <div>
            <p className="eyebrow">{tx("STUDENT PORTAL", "بوابة الطالب")}</p>
            <h1>{studentName ? tx(`Welcome, ${studentName}.`, `مرحبًا، ${studentName}.`) : tx("Welcome to your lessons.", "مرحبًا بك في دروسك.")}</h1>
            <p className="desktop-helper">{tx("Continue where you left off, or start something new.", "تابع من حيث توقفت أو ابدأ درساً جديداً.")}</p>
            <p className="mobile-helper">{tx("Continue your focused learning.", "تابع تعلّمك بتركيز.")}</p>
          </div>
        </section>
        <div className="section-title">
          <h2>{tx("Your courses", "دوراتك")}</h2>
          <span>{tx(`${courses.length} courses`, `${courses.length} دورات`)}</span>
        </div>
        {loading ? (
          <div className="student-course-list">
            {[1, 2, 3].map((i) => (
              <div className="student-course skeleton" key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="empty-state">
            <h3>{tx("We couldn’t load your lessons", "تعذر تحميل دروسك")}</h3>
            <p>{error}</p>
            <button onClick={() => location.reload()}>{tx("Try again", "حاول مجدداً")}</button>
          </div>
        ) : courses.length ? (
          <div className="student-course-list">
            {courses.map((course) => <NavLink className="student-course" to={`/courses/${course.id}`} key={course.id}>
              {course.image_url || course.image_path?.startsWith("data:image/") ? <img className="student-course-image" src={course.image_url || course.image_path} alt="" loading="lazy" /> : <div className="student-course-image student-course-image-empty"><BookOpen aria-hidden="true" /></div>}
              <div className="student-course-heading"><h2>{course.name}</h2>{course.description && <p>{course.description}</p>}</div>
              <span className="student-course-open">{tx("Open course", "افتح الدورة")} <ArrowRight aria-hidden="true" /></span>
            </NavLink>)}
          </div>
        ) : (
          <div className="empty-state"><h3>{tx("No courses assigned yet", "لم يتم تعيين دورات بعد")}</h3><p>{tx("Ask your teacher to give you access to a course.", "اطلب من معلمك منحك صلاحية الوصول إلى دورة.")}</p></div>
        )}
      </main>
    </Shell>
  );
}

export function CoursePage() {
  const { tx } = useLocale();
  const { id = "" } = useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.getCourses().then((courses) => {
      if (active) setCourse(courses.find((item) => item.id === id) ?? null);
    }).catch((reason) => {
      if (active) setError(reason instanceof Error ? reason.message : tx("Could not load this course.", "تعذر تحميل الدورة."));
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, tx]);
  const studentName = localStorage.getItem("lesson_portal_student_name")?.trim();
  return <Shell hideHeader>
    <header className="student-dashboard-nav">
      <NavLink to="/dashboard" className="student-course-back"><ArrowLeft aria-hidden="true" />{tx("All courses", "كل الدورات")}</NavLink>
      <div className="student-dashboard-nav-actions">
        <NavLink to="/profile" className="student-dashboard-profile-link" aria-label={tx("Student profile", "ملف الطالب")}><UserCircle aria-hidden="true" />{studentName && <span>{studentName}</span>}</NavLink>
        <ThemeToggle />
        <button type="button" onClick={() => { api.signOut(); location.assign("/"); }}>{tx("Exit Portal", "الخروج")}</button>
      </div>
    </header>
    <main className="page-container dashboard-page lessons-portal-page course-page" id="main-content" tabIndex={-1}>
      {loading ? <div className="lesson-grid">{[1, 2].map((i) => <div className="lesson-card skeleton" key={i} />)}</div> : error ? <div className="empty-state"><p>{error}</p></div> : !course ? <div className="empty-state"><h2>{tx("Course not found", "الدورة غير موجودة")}</h2><NavLink to="/dashboard">{tx("Back to courses", "العودة للدورات")}</NavLink></div> : <>
        <div className="course-page-heading">
          {course.image_url || course.image_path?.startsWith("data:image/") ? <img src={course.image_url || course.image_path} alt="" /> : <div className="student-course-image-empty"><BookOpen aria-hidden="true" /></div>}
          <div><p className="eyebrow">{tx("COURSE", "الدورة")}</p><h1>{course.name}</h1>{course.description && <p>{course.description}</p>}</div>
        </div>
        <div className="section-title"><h2>{tx("Lessons", "الدروس")}</h2><span>{tx(`${course.lessons?.length ?? 0} lessons`, `${course.lessons?.length ?? 0} دروس`)}</span></div>
        {course.lessons?.length ? <div className="lesson-grid">{course.lessons.map((lesson, index) => <DashboardLessonCard key={lesson.id} lesson={lesson} index={index} />)}</div> : <div className="empty-state"><p>{tx("No lessons are available in this course yet.", "لا توجد دروس متاحة في هذه الدورة بعد.")}</p></div>}
      </>}
    </main>
  </Shell>;
}
