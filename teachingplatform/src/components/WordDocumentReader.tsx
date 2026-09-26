import { useEffect, useRef, useState } from "react";
import mammoth from "mammoth";
import DOMPurify from "dompurify";
import { api } from "../lib/api";
import { useLocale } from "../context/LocaleState";

export function WordDocumentReader({ lessonId, documentPath, admin = false, onViewed }: { lessonId: string; documentPath?: string; admin?: boolean; onViewed?: () => void }) {
  const { tx } = useLocale();
  const onViewedRef = useRef(onViewed);
  onViewedRef.current = onViewed;
  const [html, setHtml] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      try {
        const signed = documentPath
          ? admin ? await api.adminDocumentUrl(lessonId, documentPath) : await api.getDocumentUrl(lessonId, documentPath)
          : admin ? await api.adminWordUrl(lessonId) : await api.getWordUrl(lessonId);
        if (!signed?.url) throw new Error(tx("This lesson has no Word document attached.", "لا يوجد مستند Word مرفق بهذا الدرس."));
        const response = await fetch(signed.url, { signal: controller.signal });
        if (!response.ok) throw new Error(tx("Could not download the secure Word document.", "تعذر تنزيل مستند Word الآمن."));
        const arrayBuffer = await response.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);
        const tail = bytes.subarray(Math.max(0, bytes.length - 65_557));
        const hasZipHeader = bytes[0] === 0x50 && bytes[1] === 0x4b && (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07);
        const hasZipDirectory = tail.some((byte, index) => byte === 0x50 && tail[index + 1] === 0x4b && tail[index + 2] === 0x05 && tail[index + 3] === 0x06);
        if (!hasZipHeader || !hasZipDirectory) throw new Error(tx("This stored file is not a valid .docx archive. Re-save it in Word as Word Document (.docx), then upload it again.", "الملف المخزن ليس مستند .docx صالحاً. احفظه مجدداً في Word بصيغة مستند Word (.docx)، ثم أعد رفعه."));
        const converted = await mammoth.convertToHtml({ arrayBuffer });
        if (!active) return;
        setHtml(DOMPurify.sanitize(converted.value, { USE_PROFILES: { html: true } }));
        setError("");
        setLoading(false);
        onViewedRef.current?.();
      } catch (reason) {
        if (active && !controller.signal.aborted) {
          const message = reason instanceof Error ? reason.message : tx("Could not render this Word document.", "تعذر عرض مستند Word هذا.");
          setError(message.includes("central directory") || message.includes("zip file")
            ? tx("Word could not open this file. Re-save it from Microsoft Word as .docx and upload it again.", "تعذر فتح الملف في Word. احفظه مجدداً من Microsoft Word بصيغة .docx ثم أعد رفعه.")
            : message);
          setLoading(false);
        }
      }
    }
    void load();
    return () => { active = false; controller.abort(); };
  }, [lessonId, documentPath, admin, tx]);

  return <section className={`word-reader${error ? " has-error" : ""}`} aria-label={tx("Word document", "مستند Word")} aria-busy={loading}>
    <header className="word-reader-header">
      <div><span className="word-reader-kicker">{tx("LESSON RESOURCE", "مورد الدرس")}</span><strong>{tx("Word document", "مستند Word")}</strong></div>
      <span className="word-reader-format">DOCX</span>
    </header>
    {error && <p className="word-reader-error" role="alert">{error}</p>}
    {loading && !error && <p className="word-reader-loading" role="status"><span className="ui-spinner" aria-hidden="true" />{tx("Opening Word document…", "جارٍ فتح مستند Word…")}</p>}
    {html && <div className="word-document-scroll"><article className="word-document-content" dangerouslySetInnerHTML={{ __html: html }} /></div>}
  </section>;
}
