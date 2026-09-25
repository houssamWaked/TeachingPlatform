import { useEffect, useState } from "react";
import { ArrowRight, Eye, EyeSlash, GearSix, LockKey } from "@phosphor-icons/react";
import { Brand } from "../../context/LocaleContext";
import { BackButton } from "./BackButton";

type TeacherAuthUIProps = {
  password: string;
  loginError: string;
  demoMode: boolean;
  onPasswordChange: (password: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onFillDemo: () => void;
  tx: (english: string, arabic: string) => string;
};

function Typewriter({ text }: { text: string }) {
  const [value, setValue] = useState("");

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) {
      setValue(text);
      return;
    }

    let index = 0;
    const timer = window.setInterval(() => {
      index += 1;
      setValue(text.slice(0, index));
      if (index >= text.length) window.clearInterval(timer);
    }, 38);
    return () => window.clearInterval(timer);
  }, [text]);

  return <>{value}</>;
}

export function TeacherAuthUI({
  password,
  loginError,
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
        <BackButton
          className="teacher-auth-back"
          to="/"
          label={tx("Back", "رجوع")}
          ariaLabel={tx("Back to student portal", "العودة إلى بوابة الطالب")}
        />

        <div className="teacher-auth-content">
          <div className="teacher-auth-brand"><Brand /></div>
          <div className="teacher-auth-heading">
            <span className="teacher-auth-icon"><GearSix weight="fill" /></span>
            <h1>{tx("Teacher sign in", "تسجيل دخول المعلّم")}</h1>
            <p>{tx("Enter your password to continue.", "أدخل كلمة المرور للمتابعة.")}</p>
          </div>

          <form className="teacher-auth-form" onSubmit={onSubmit}>
            <label className="field-label" htmlFor="teacher-password">
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
            <button className="primary-button teacher-auth-submit">
              {tx("Sign in", "تسجيل الدخول")} <ArrowRight aria-hidden="true" />
            </button>
            {demoMode && (
              <p className="demo-hint">
                {tx("Preview password:", "كلمة مرور المعاينة:")} {" "}
                <button type="button" onClick={onFillDemo}>teacher</button>
              </p>
            )}
          </form>
        </div>
      </section>

      <aside className="teacher-auth-visual" aria-label={tx("A calm place to plan what students learn next", "مساحة هادئة للتخطيط لما سيتعلمه الطلاب لاحقاً")}>
        <div className="teacher-auth-visual-shade" />
        <div className="teacher-auth-quote">
          <span>{tx("A LITTLE INSPIRATION", "قليل من الإلهام")}</span>
          <blockquote>“<Typewriter text={tx("Great teaching turns curiosity into possibility.", "التعليم الرائع يحوّل الفضول إلى آفاق جديدة.")} />”</blockquote>
          <p>{tx("Your classroom, thoughtfully organized.", "صفّك، منظّم بعناية.")}</p>
        </div>
      </aside>
    </main>
  );
}
