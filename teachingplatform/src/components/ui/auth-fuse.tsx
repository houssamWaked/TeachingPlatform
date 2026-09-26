import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Eye, EyeSlash, LockKey } from "@phosphor-icons/react";
import { Brand, ThemeToggle } from "../../context/LocaleContext";

type TeacherAuthUIProps = {
  password: string;
  loginError: string;
  loading: boolean;
  demoMode: boolean;
  onPasswordChange: (password: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFillDemo: () => void;
  tx: (english: string, arabic: string) => string;
};

export function TeacherAuthUI({
  password,
  loginError,
  loading,
  demoMode,
  onPasswordChange,
  onSubmit,
  onFillDemo,
  tx,
}: TeacherAuthUIProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="teacher-auth" id="main-content" tabIndex={-1}>
      <section className="teacher-auth-form-side">
        <header className="teacher-auth-header">
          <div className="teacher-auth-brand"><Brand /></div>
          <ThemeToggle className="teacher-auth-icon" />
        </header>
        <div className="teacher-auth-content">
          <div className="teacher-auth-heading">
            <h1>{tx("Teacher sign in", "تسجيل دخول المعلّم")}</h1>
            <p>{tx("Enter your password to continue.", "أدخل كلمة المرور للمتابعة.")}</p>
          </div>

          <form className="teacher-auth-form" onSubmit={onSubmit}>
            <label className="field-label visually-hidden" htmlFor="teacher-password">
              {tx("Password", "كلمة المرور")}
            </label>
            <div className="teacher-password-wrap">
              <LockKey aria-hidden="true" />
              <input
                id="teacher-password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder={tx("Password", "كلمة المرور")}
                autoComplete="current-password"
                required
              />
              <button
                className="teacher-password-toggle"
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? tx("Hide password", "إخفاء كلمة المرور") : tx("Show password", "إظهار كلمة المرور")}
              >
                {showPassword ? <EyeSlash aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </button>
            </div>

            {loginError && <p className="form-error" role="alert">{loginError}</p>}
            <button className="primary-button teacher-auth-submit" disabled={loading} aria-busy={loading}>
              {loading && <span className="ui-spinner" aria-hidden="true" />}
              {tx("Sign in", "تسجيل الدخول")} <ArrowRight aria-hidden="true" />
            </button>
            {demoMode && (
              <p className="demo-hint">
                {tx("Preview password:", "كلمة مرور المعاينة:")} {" "}
                <button type="button" onClick={onFillDemo}>teacher</button>
              </p>
            )}
          </form>
          <Link className="teacher-auth-back" to="/"><ArrowLeft aria-hidden="true" /> {tx("Back to student portal", "العودة إلى بوابة الطالب")}</Link>
        </div>
        <small className="teacher-auth-copyright">© 2026VH Lesson Portal. {tx("All rights reserved.", "جميع الحقوق محفوظة.")}</small>
      </section>

      <aside className="teacher-auth-visual" aria-label={tx("A calm place to plan what students learn next", "مساحة هادئة للتخطيط لما سيتعلمه الطلاب لاحقاً")}>
        <div className="teacher-auth-visual-shade" />
        <div className="teacher-auth-quote">
          <blockquote>“{tx("Great teaching turns curiosity into knowledge.", "التعليم الرائع يحوّل الفضول إلى المعرفة.")}”</blockquote>
          <p>{tx("Your classroom, thoughtfully organized.", "صفّك، منظّم بعناية.")}</p>
        </div>
      </aside>
    </main>
  );
}
