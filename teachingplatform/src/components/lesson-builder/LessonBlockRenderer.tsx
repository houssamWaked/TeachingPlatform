import { FilePdf, Image, LinkSimple, VideoCamera } from "@phosphor-icons/react";
import type { Lesson, LessonBlock } from "../../types";
import { PdfPageReader } from "../PdfPageReader";
import { WordDocumentReader } from "../WordDocumentReader";
import { useLessonImageUrl } from "./useLessonImageUrl";

export function LessonBlockRenderer({ block, lesson, video, admin = false, onPdfViewed }: {
  block: LessonBlock;
  lesson: Lesson;
  video: (lessonId: string, videoId?: string) => React.ReactNode;
  admin?: boolean;
  onPdfViewed?: () => void;
}) {
  const imageUrl = useLessonImageUrl(lesson.id, block.type === "image" ? block.url : undefined, admin);
  const imageSource = imageUrl || safeHttps(block.url);
  const pdfPath = block.filePath || lesson.pdf_path;
  const wordPath = block.filePath || lesson.word_path || (lesson.pdf_path?.toLowerCase().endsWith(".docx") ? lesson.pdf_path : "");
  const textStyle: React.CSSProperties = { color: block.style?.color, backgroundColor: block.style?.backgroundColor, fontSize: block.style?.fontSize, textAlign: block.style?.textAlign, padding: block.style?.padding };
  const mediaStyle: React.CSSProperties = { width: `${block.style?.width ?? 100}%`, marginLeft: block.style?.textAlign === "left" ? 0 : "auto", marginRight: block.style?.textAlign === "right" ? 0 : "auto" };
  if (block.type === "heading") return block.level === 3 ? <h3 style={textStyle}>{block.text}</h3> : <h2 style={textStyle}>{block.text}</h2>;
  if (block.type === "text") return <p className="lesson-text-block" style={textStyle}>{block.text || "Click to add text"}</p>;
  if (block.type === "callout") return <aside className="lesson-callout" style={textStyle}>{block.text || "Add a callout"}</aside>;
  if (block.type === "divider") return <hr style={{ height: block.style?.thickness ?? 1, border: 0, backgroundColor: block.style?.color ?? "#d9e2dc" }} />;
  if (block.type === "image" && imageSource) return <figure style={mediaStyle}><img className="lesson-image" style={{ width: "100%", height: block.style?.imageFit === "cover" ? 360 : "auto", objectFit: block.style?.imageFit ?? "contain", borderRadius: block.style?.borderRadius ?? 10 }} src={imageSource} alt={block.caption || ""} loading="lazy"/><figcaption>{block.caption}</figcaption></figure>;
  if (block.type === "image") return <div style={mediaStyle} className="canvas-media-placeholder"><Image /> {block.url ? "Loading secure image…" : "Upload an image in block settings"}</div>;
  if (block.type === "link" && safeHttps(block.url)) return <p style={textStyle}><a href={block.url} target="_blank" rel="noreferrer">{block.title || block.url}</a></p>;
  if (block.type === "link") return <p style={textStyle} className="canvas-media-placeholder"><LinkSimple /> Add a destination URL in block settings</p>;
  if (block.type === "embed" && embedUrl(block.url)) return <div style={mediaStyle} className="lesson-embed"><iframe style={{ borderRadius: block.style?.borderRadius ?? 10 }} src={embedUrl(block.url)!} title={block.title || "Embedded video"} allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen /></div>;
  if (block.type === "embed") return <div style={mediaStyle} className="canvas-media-placeholder"><VideoCamera /> Add a YouTube or Vimeo URL in block settings</div>;
  const videoId = block.videoId || (block.id === "legacy-video" ? lesson.video_id : undefined);
  if (block.type === "video" && !block.mediaEmpty && videoId) return <div style={mediaStyle} className="lesson-inline-media">{video(lesson.id, videoId)}</div>;
  if (block.type === "video") return <div style={mediaStyle} className="canvas-media-placeholder"><VideoCamera /> Choose a video file in block settings</div>;
  if (block.type === "pdf" && !block.mediaEmpty && pdfPath) return <div style={mediaStyle} className="lesson-inline-media"><PdfPageReader lessonId={lesson.id} documentPath={block.filePath ? pdfPath : undefined} admin={admin} onViewed={onPdfViewed} /></div>;
  if (block.type === "pdf") return <div style={mediaStyle} className="canvas-media-placeholder"><FilePdf /> Your PDF block is empty. Upload a PDF in block settings.</div>;
  if (block.type === "word" && !block.mediaEmpty && wordPath) return <div style={mediaStyle} className="lesson-inline-media"><WordDocumentReader lessonId={lesson.id} documentPath={block.filePath ? wordPath : undefined} admin={admin} onViewed={onPdfViewed} /></div>;
  if (block.type === "word") return <div style={mediaStyle} className="canvas-media-placeholder"><FilePdf /> Your Word document block is empty. Upload a document in block settings.</div>;
  return null;
}

function safeHttps(url?: string) {
  try { return url && new URL(url).protocol === "https:" ? url : null; }
  catch { return null; }
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
