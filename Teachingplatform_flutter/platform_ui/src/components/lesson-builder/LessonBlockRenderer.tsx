import { lazy, Suspense } from "react";
import { ArrowUpRight, FilePdf, Image, LinkSimple, VideoCamera } from "@phosphor-icons/react";
import type { Lesson, LessonBlock } from "../../types";
import { useLessonImageUrl } from "./useLessonImageUrl";
import { useLocale } from "../../context/LocaleState";

const PdfPageReader = lazy(() => import("../PdfPageReader").then((module) => ({ default: module.PdfPageReader })));
const WordDocumentReader = lazy(() => import("../WordDocumentReader").then((module) => ({ default: module.WordDocumentReader })));

function DocumentViewerLoading({ format }: { format: "PDF" | "Word" }) {
  return (
    <div className="document-viewer-loading" role="status" aria-live="polite" aria-busy="true">
      <span className="ui-spinner" aria-hidden="true" />
      <span>Loading {format} viewer…</span>
    </div>
  );
}

export function LessonBlockRenderer({ block, lesson, video, admin = false, onPdfViewed }: {
  block: LessonBlock;
  lesson: Lesson;
  video: (lessonId: string, videoId?: string) => React.ReactNode;
  admin?: boolean;
  onPdfViewed?: () => void;
}) {
  const { tx } = useLocale();
  const { url: imageUrl, loading: imageLoading } = useLessonImageUrl(lesson.id, block.type === "image" ? block.url : undefined, admin);
  const imageSource = imageUrl || safeHttps(block.url);
  const pdfPath = block.filePath || lesson.pdf_path;
  const wordPath = block.filePath || lesson.word_path || (lesson.pdf_path?.toLowerCase().endsWith(".docx") ? lesson.pdf_path : "");
  const textStyle: React.CSSProperties = { color: block.style?.color, backgroundColor: block.style?.backgroundColor, fontSize: block.style?.fontSize, textAlign: block.style?.textAlign, padding: block.style?.padding };
  const mediaStyle: React.CSSProperties = { width: `${block.style?.width ?? 100}%`, marginLeft: block.style?.textAlign === "left" ? 0 : "auto", marginRight: block.style?.textAlign === "right" ? 0 : "auto" };
  if (block.type === "heading") return block.level === 3 ? <h3 style={textStyle}>{block.text}</h3> : <h2 style={textStyle}>{block.text}</h2>;
  if (block.type === "text") return <p className="lesson-text-block" style={textStyle}>{block.text || tx("Click to add text", "انقر لإضافة نص")}</p>;
  if (block.type === "callout") return <aside className="lesson-callout" style={textStyle}>{block.text || tx("Add a callout", "أضف تنبيهاً")}</aside>;
  if (block.type === "divider") return <hr style={{ height: block.style?.thickness ?? 1, border: 0, backgroundColor: block.style?.color ?? "#d9e2dc" }} />;
  if (block.type === "image" && imageSource) return <figure style={mediaStyle}><img className="lesson-image" style={{ width: "100%", height: block.style?.imageFit === "cover" ? 360 : "auto", objectFit: block.style?.imageFit ?? "contain", borderRadius: block.style?.borderRadius ?? 10 }} src={imageSource} alt={block.caption || ""} loading="lazy"/><figcaption>{block.caption}</figcaption></figure>;
  if (block.type === "image") return <div style={mediaStyle} className="canvas-media-placeholder" aria-busy={imageLoading}>{imageLoading ? <><span className="ui-spinner" aria-hidden="true" /> {tx("Loading secure image…", "جارٍ تحميل الصورة الآمنة…")}</> : <><Image /> {block.url ? tx("Image could not be loaded. Try uploading it again.", "تعذر تحميل الصورة. حاول رفعها مجدداً.") : tx("Upload an image in block settings", "ارفع صورة من إعدادات المكوّن")}</>}</div>;
  const linkUrl = block.type === "link" ? safeWebUrl(block.url) : null;
  if (block.type === "link" && linkUrl) return <p style={textStyle}><a className="lesson-link-block" href={linkUrl} target="_blank" rel="noopener noreferrer"><span className="lesson-link-icon"><LinkSimple aria-hidden="true" /></span><span className="lesson-link-copy"><strong>{block.title?.trim() && block.title !== "Add a title" ? block.title : tx("Open resource", "فتح المورد")}</strong><small>{new URL(linkUrl).hostname}</small></span><ArrowUpRight className="lesson-link-arrow" aria-hidden="true" /></a></p>;
  if (block.type === "link") return <p style={textStyle} className="canvas-media-placeholder"><LinkSimple /> {tx("Add a destination URL in block settings", "أضف رابط الوجهة من إعدادات المكوّن")}</p>;
  if (block.type === "embed" && embedUrl(block.url)) return <div style={mediaStyle} className="lesson-embed"><iframe style={{ borderRadius: block.style?.borderRadius ?? 10 }} src={embedUrl(block.url)!} title={block.title || tx("Embedded video", "فيديو مضمن")} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>;
  if (block.type === "embed") return <div style={mediaStyle} className="canvas-media-placeholder"><VideoCamera /> {tx("Add a YouTube or Vimeo URL in block settings", "أضف رابط YouTube أو Vimeo في إعدادات المكوّن")}</div>;
  const videoId = block.videoId || (block.id === "legacy-video" ? lesson.video_id : undefined);
  if (block.type === "video" && !block.mediaEmpty && videoId) return <div key={videoId} style={mediaStyle} className="lesson-inline-media">{video(lesson.id, videoId)}</div>;
  if (block.type === "video") return <div style={mediaStyle} className="canvas-media-placeholder"><VideoCamera /> {tx("Choose a video file in block settings", "اختر ملف فيديو من إعدادات المكوّن")}</div>;
  if (block.type === "pdf" && !block.mediaEmpty && pdfPath) return <div style={mediaStyle} className="lesson-inline-media"><Suspense fallback={<DocumentViewerLoading format="PDF" />}><PdfPageReader lessonId={lesson.id} documentPath={block.filePath ? pdfPath : undefined} admin={admin} onViewed={onPdfViewed} /></Suspense></div>;
  if (block.type === "pdf") return <div style={mediaStyle} className="canvas-media-placeholder"><FilePdf /> {tx("Your PDF block is empty. Upload a PDF in block settings.", "مكوّن PDF فارغ. ارفع ملف PDF من إعدادات المكوّن.")}</div>;
  if (block.type === "word" && !block.mediaEmpty && wordPath) return <div style={mediaStyle} className="lesson-inline-media"><Suspense fallback={<DocumentViewerLoading format="Word" />}><WordDocumentReader lessonId={lesson.id} documentPath={block.filePath ? wordPath : undefined} admin={admin} onViewed={onPdfViewed} /></Suspense></div>;
  if (block.type === "word") return <div style={mediaStyle} className="canvas-media-placeholder"><FilePdf /> {tx("Your Word document block is empty. Upload a document in block settings.", "مكوّن مستند Word فارغ. ارفع مستنداً من إعدادات المكوّن.")}</div>;
  return null;
}

function safeHttps(url?: string) {
  try { return url && new URL(url).protocol === "https:" ? url : null; }
  catch { return null; }
}

function safeWebUrl(value?: string) {
  const raw = value?.trim();
  if (!raw) return null;
  const candidate = raw.startsWith("//")
    ? `https:${raw}`
    : /^[a-z][a-z\d+.-]*:/i.test(raw) ? raw : `https://${raw}`;
  try {
    const parsed = new URL(candidate);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.href : null;
  } catch { return null; }
}

function embedUrl(url?: string) {
  try {
    const parsed = new URL(url || "");
    if (parsed.hostname === "youtu.be") return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (["youtube.com", "www.youtube.com", "m.youtube.com"].includes(parsed.hostname)) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
      if (parsed.pathname.startsWith("/embed/")) return `https://www.youtube-nocookie.com${parsed.pathname}`;
    }
    if (["vimeo.com", "www.vimeo.com"].includes(parsed.hostname) && /^\d+$/.test(parsed.pathname.slice(1))) return `https://player.vimeo.com/video/${parsed.pathname.slice(1)}`;
  } catch { /* Invalid or unsupported embed URL. */ }
  return null;
}
