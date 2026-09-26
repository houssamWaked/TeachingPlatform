import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { GearSix, List, MoonStars, SignOut, Sun } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { LocaleContext, useLocale } from "./LocaleState";
import { ThemeContext, useTheme, type Theme } from "./ThemeState";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() => localStorage.getItem("lesson_portal_theme") === "dark" ? "dark" : "light");
  useEffect(() => {
    localStorage.setItem("lesson_portal_theme", theme);
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  const toggleTheme = useCallback(() => setTheme((current) => current === "dark" ? "light" : "dark"), []);
  return <ThemeContext.Provider value={{ theme, toggleTheme }}>{children}</ThemeContext.Provider>;
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();
  const label = theme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return <button type="button" className={`theme-toggle ${className}`.trim()} aria-label={label} title={label} aria-pressed={theme === "dark"} onClick={toggleTheme}>{theme === "dark" ? <Sun aria-hidden="true" /> : <MoonStars aria-hidden="true" />}</button>;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    localStorage.removeItem("lesson_portal_locale");
    document.documentElement.lang = "en";
    document.documentElement.dir = "ltr";
  }, []);
  const tx = useCallback((english: string, arabic: string) => { void arabic; return english; }, []);
  return (
    <LocaleContext.Provider value={{ locale: "en", tx }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function Brand() {
  const { tx } = useLocale();
  return (
    <>
      <span className="brand-mark">
        <img src="/figma/landing-desktop-book-open.svg" alt="" aria-hidden="true" />
      </span>
      <span>{tx("Lesson Portal", "بوابة الدروس")}</span>
    </>
  );
}

export function Shell({ children, admin = false, hideHeader = false, onOpenAdminMenu, adminMenuOpen = false }: { children: React.ReactNode; admin?: boolean; hideHeader?: boolean; onOpenAdminMenu?: () => void; adminMenuOpen?: boolean }) {
  const navigate = useNavigate();
  const { tx } = useLocale();
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">{tx("Skip to content", "انتقل إلى المحتوى")}</a>
      {!hideHeader && <header className="site-header">
        <button className="brand" onClick={() => navigate(admin ? "/admin" : "/")}>
          <Brand />
        </button>
        {admin && onOpenAdminMenu && <button
          type="button"
          className="admin-header-drawer-trigger"
          aria-label={tx("Open navigation menu", "فتح قائمة التنقل")}
          aria-expanded={adminMenuOpen}
          aria-controls="admin-navigation-drawer"
          onClick={onOpenAdminMenu}
        ><List aria-hidden="true" /></button>}
        <nav className="header-actions">
          {admin ? (
            <span className="admin-chip"><GearSix /> {tx("Teacher workspace", "مساحة المعلّم")}</span>
          ) : (
            null
          )}
          <ThemeToggle />
          <button className="icon-button" aria-label={tx("Sign out", "تسجيل الخروج")} onClick={() => { api.signOut(); navigate("/"); }}>
            <SignOut />
          </button>
        </nav>
      </header>}
      {children}
    </div>
  );
}
