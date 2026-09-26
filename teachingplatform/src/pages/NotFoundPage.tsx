import { Link } from "react-router-dom";
import { ArrowLeft, House } from "@phosphor-icons/react";
import { Shell } from "../context/LocaleContext";
import { useLocale } from "../context/LocaleState";

export function NotFoundPage() {
  const { tx } = useLocale();

  return (
    <Shell>
      <main className="not-found-page" id="main-content">
        <section className="not-found-card" aria-labelledby="not-found-title">
          <p className="not-found-code">404</p>
          <h1 id="not-found-title">{tx("Page not found", "الصفحة غير موجودة")}</h1>
          <p className="not-found-description">
            {tx("The page you’re looking for may have moved or no longer exists.", "قد تكون الصفحة التي تبحث عنها قد نُقلت أو لم تعد موجودة.")}
          </p>
          <div className="not-found-actions">
            <Link className="primary-button" to="/">
              <House aria-hidden="true" /> {tx("Go to home", "العودة للرئيسية")}
            </Link>
            <Link className="secondary-button" to="/access">
              <ArrowLeft aria-hidden="true" /> {tx("Student sign in", "دخول الطالب")}
            </Link>
          </div>
        </section>
      </main>
    </Shell>
  );
}
