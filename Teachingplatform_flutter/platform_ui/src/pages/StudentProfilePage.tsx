import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, UserCircle } from "@phosphor-icons/react";
import { Link, useNavigate } from "react-router-dom";
import { Shell, Brand, ThemeToggle } from "../context/LocaleContext";
import { useLocale } from "../context/LocaleState";
import { api, type StudentProfile } from "../lib/api";

export function StudentProfilePage() {
  const { tx } = useLocale();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<StudentProfile>(() => ({
    name: localStorage.getItem("lesson_portal_student_name") || "Student",
    photo_url: localStorage.getItem("lesson_portal_student_photo") || "",
  }));
  const [name, setName] = useState(profile.name);
  const [photo, setPhoto] = useState<File>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const preview = useMemo(() => photo ? URL.createObjectURL(photo) : profile.photo_url, [photo, profile.photo_url]);
  useEffect(() => () => { if (photo && preview.startsWith("blob:")) URL.revokeObjectURL(preview); }, [photo, preview]);

  useEffect(() => {
    let active = true;
    api.studentProfile().then((current) => {
      if (!active) return;
      setProfile(current);
      setName(current.name);
      localStorage.setItem("lesson_portal_student_name", current.name);
      if (current.photo_url) localStorage.setItem("lesson_portal_student_photo", current.photo_url);
    }).catch(() => undefined).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const cleanName = name.trim().replace(/\s+/g, " ");
    if (!cleanName) return setError(tx("Enter your name.", "أدخل اسمك."));
    if (photo && photo.size > 5 * 1024 * 1024) return setError(tx("Choose an image smaller than 5 MB.", "اختر صورة أصغر من 5 ميغابايت."));
    setSaving(true);
    try {
      const updated = await api.updateStudentProfile(cleanName, photo);
      setProfile(updated);
      setName(updated.name);
      setPhoto(undefined);
      localStorage.setItem("lesson_portal_student_name", updated.name);
      if (updated.photo_url) localStorage.setItem("lesson_portal_student_photo", updated.photo_url);
      navigate("/dashboard");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : tx("Your profile could not be updated.", "تعذر تحديث ملفك الشخصي."));
    } finally { setSaving(false); }
  }

  return <Shell hideHeader>
    <header className="student-dashboard-nav">
      <div className="brand"><Brand /></div>
      <div className="student-dashboard-nav-actions">
        <ThemeToggle />
        <button type="button" onClick={() => { api.signOut(); location.assign("/"); }}>{tx("Exit Portal", "الخروج")}</button>
      </div>
    </header>
    <main className="page-container student-profile-page" id="main-content" tabIndex={-1}>
      <Link className="student-course-back" to="/dashboard"><ArrowLeft aria-hidden="true" />{tx("Back to courses", "العودة للدورات")}</Link>
      <section className="student-profile-card">
        <p className="eyebrow">{tx("YOUR ACCOUNT", "حسابك")}</p>
        <h1>{tx("Student profile", "ملف الطالب")}</h1>
        <p className="student-profile-intro">{tx("Update the name and photo your teacher sees.", "حدّث الاسم والصورة التي يراها معلمك.")}</p>
        {loading ? <div className="student-profile-loading" aria-live="polite">{tx("Loading profile…", "جارٍ تحميل الملف الشخصي…")}</div> : <form onSubmit={submit}>
          <div className="student-profile-photo student-profile-page-photo">
            <div>{preview ? <img src={preview} alt={tx("Profile photo preview", "معاينة صورة الملف الشخصي")} /> : <UserCircle aria-hidden="true" />}</div>
            <label className="secondary-button">{tx("Choose profile photo", "اختر صورة الملف الشخصي")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhoto(event.target.files?.[0])} /></label>
            <small>{tx("JPG, PNG, or WebP. Maximum 5 MB.", "JPG أو PNG أو WebP. الحد الأقصى 5 ميغابايت.")}</small>
          </div>
          <label className="student-profile-name-field">{tx("Name", "الاسم")}<input required maxLength={80} autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="student-profile-actions"><button type="button" className="secondary-button" onClick={() => navigate("/dashboard")}>{tx("Cancel", "إلغاء")}</button><button className="primary-button" disabled={saving} aria-busy={saving}>{saving ? tx("Saving…", "جارٍ الحفظ…") : tx("Save profile", "حفظ الملف")}</button></div>
        </form>}
      </section>
    </main>
  </Shell>;
}
