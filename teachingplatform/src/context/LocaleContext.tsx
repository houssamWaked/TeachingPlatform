import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { GearSix, GraduationCap, SignOut } from "@phosphor-icons/react";
import { api } from "../lib/api";
type Locale = "en" | "ar";
const LocaleContext = createContext({
  locale: "en" as Locale,
  setLocale: (_locale: Locale) => {},
  tx: (english: string, _arabic: string) => english,
});

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState<Locale>(() => {
    const saved = localStorage.getItem("lesson_portal_locale");
    return saved === "ar" || saved === "en"
      ? saved
      : navigator.language.startsWith("ar")
        ? "ar"
        : "en";
  });
  useEffect(() => {
    localStorage.setItem("lesson_portal_locale", locale);
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);
  const tx = useCallback(
    (english: string, arabic: string) => (locale === "ar" ? arabic : english),
    [locale],
  );
  return (
    <LocaleContext.Provider value={{ locale, setLocale, tx }}>
      {children}
    </LocaleContext.Provider>
  );
}

export const useLocale = () => useContext(LocaleContext);

export function Brand() {
  const { tx } = useLocale();
  return (
    <>
      <span className="brand-mark">
        <GraduationCap weight="fill" />
      </span>
      <span>{tx("Lesson Portal", "بوابة الدروس")}</span>
    </>
  );
}

export function LanguageToggle() {
  const { locale, setLocale } = useLocale();
  return (
    <button
      type="button"
      className="language-toggle"
      onClick={() => setLocale(locale === "en" ? "ar" : "en")}
      aria-label={locale === "en" ? "العربية" : "English"}
    >
      {locale === "en" ? "العربية" : "English"}
    </button>
  );
}

export function Shell({
  children,
  admin = false,
}: {
  children: React.ReactNode;
  admin?: boolean;
}) {
  const navigate = useNavigate();
  const { tx } = useLocale();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{tx("Skip to content", "انتقل إلى المحتوى")}</a>
      <header className="site-header">
        <button
          className="brand"
          onClick={() => navigate(admin ? "/admin" : "/")}
        >
          <Brand />
        </button>
        <nav className="header-actions">
          {admin ? (
            <span className="admin-chip">
              <GearSix /> {tx("Teacher workspace", "مساحة المعلّم")}
            </span>
          ) : (
            <NavLink to="/dashboard">{tx("My lessons", "دروسي")}</NavLink>
          )}
          <LanguageToggle />
          <button
            className="icon-button"
            aria-label={tx("Sign out", "تسجيل الخروج")}
            onClick={() => {
              api.signOut();
              navigate("/");
            }}
          >
            <SignOut />
          </button>
        </nav>
      </header>
      {children}
    </div>
  );
}
