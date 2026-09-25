import type { Lesson, LessonBlock } from "../../types";
import { useState } from "react";
import { ArrowDown, ArrowUp } from "@phosphor-icons/react";

export function BlockInspector({ block, onChange, uploadVideo, uploadPdf, uploadImage, busy, lesson, onMoveVideoPart, canMoveVideoPartUp, canMoveVideoPartDown, videoPartNumber }: {
  block: LessonBlock;
  onChange: (patch: Partial<LessonBlock>) => void;
  uploadVideo: (file?: File, blockId?: string) => Promise<boolean>;
  uploadPdf: (file?: File, blockId?: string) => Promise<boolean>;
  uploadImage: (file: File) => Promise<string>;
  busy: boolean;
  lesson: Lesson;
  onMoveVideoPart?: (direction: -1 | 1) => void;
  canMoveVideoPartUp?: boolean;
  canMoveVideoPartDown?: boolean;
  videoPartNumber?: number;
}) {
  const [imageError, setImageError] = useState("");
  const hasMatchingDocument = !block.mediaEmpty && (block.type === "pdf"
    ? (block.filePath || lesson.pdf_path)?.toLowerCase().endsWith(".pdf")
    : block.type === "word" && (block.filePath || lesson.word_path || lesson.pdf_path)?.toLowerCase().endsWith(".docx"));
  return <div className="block-inspector"><small>{block.type.toUpperCase()}</small>
    {(["heading", "text", "callout", "link"].includes(block.type) || ["image", "video", "pdf", "embed"].includes(block.type) || block.type === "divider") && <details className="block-style-controls" open><summary>Appearance</summary>
      {["heading", "text", "callout", "link"].includes(block.type) && <>
        <label>Text color<input type="color" value={block.style?.color ?? "#26352f"} onChange={(event) => onChange({ style: { ...block.style, color: event.target.value } })} /></label>
        <label>Background<input type="color" value={block.style?.backgroundColor ?? "#ffffff"} onChange={(event) => onChange({ style: { ...block.style, backgroundColor: event.target.value } })} /></label>
        <label>Text size<input type="range" min="12" max="40" value={block.style?.fontSize ?? 16} onChange={(event) => onChange({ style: { ...block.style, fontSize: Number(event.target.value) } })} /><small>{block.style?.fontSize ?? 16}px</small></label>
        <label>Alignment<select value={block.style?.textAlign ?? "left"} onChange={(event) => onChange({ style: { ...block.style, textAlign: event.target.value as "left" | "center" | "right" } })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
        <label>Padding<input type="range" min="0" max="48" step="4" value={block.style?.padding ?? 0} onChange={(event) => onChange({ style: { ...block.style, padding: Number(event.target.value) } })} /><small>{block.style?.padding ?? 0}px</small></label>
      </>}
      {["image", "video", "pdf", "word", "embed"].includes(block.type) && <>
        <label>Width<input type="range" min="30" max="100" step="5" value={block.style?.width ?? 100} onChange={(event) => onChange({ style: { ...block.style, width: Number(event.target.value) } })} /><small>{block.style?.width ?? 100}%</small></label>
        <label>Alignment<select value={block.style?.textAlign ?? "center"} onChange={(event) => onChange({ style: { ...block.style, textAlign: event.target.value as "left" | "center" | "right" } })}><option value="left">Left</option><option value="center">Center</option><option value="right">Right</option></select></label>
        {["image", "embed"].includes(block.type) && <label>Corner rounding<input type="range" min="0" max="32" step="2" value={block.style?.borderRadius ?? 10} onChange={(event) => onChange({ style: { ...block.style, borderRadius: Number(event.target.value) } })} /><small>{block.style?.borderRadius ?? 10}px</small></label>}
        {block.type === "image" && <label>Image fit<select value={block.style?.imageFit ?? "contain"} onChange={(event) => onChange({ style: { ...block.style, imageFit: event.target.value as "cover" | "contain" } })}><option value="contain">Show full image</option><option value="cover">Fill and crop</option></select></label>}
      </>}
      {block.type === "divider" && <><label>Line color<input type="color" value={block.style?.color ?? "#d9e2dc"} onChange={(event) => onChange({ style: { ...block.style, color: event.target.value } })} /></label><label>Thickness<input type="range" min="1" max="8" value={block.style?.thickness ?? 1} onChange={(event) => onChange({ style: { ...block.style, thickness: Number(event.target.value) } })} /><small>{block.style?.thickness ?? 1}px</small></label></>}
    </details>}
    {block.type === "heading" && <><label>Heading text<input autoFocus value={block.text ?? ""} onChange={(event) => onChange({ text: event.target.value })} /></label><label>Size<select value={block.level ?? 2} onChange={(event) => onChange({ level: Number(event.target.value) as 2 | 3 })}><option value="2">Large</option><option value="3">Medium</option></select></label></>}
    {(block.type === "text" || block.type === "callout") && <label>{block.type === "callout" ? "Callout text" : "Text content"}<textarea autoFocus value={block.text ?? ""} onChange={(event) => onChange({ text: event.target.value })} /></label>}
    {block.type === "image" && <><label>Upload image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (event) => { const file = event.target.files?.[0]; if (file) { setImageError(""); try { onChange({ url: await uploadImage(file) }); } catch (error) { setImageError(error instanceof Error ? error.message : "Image upload failed."); } } event.target.value = ""; }} /></label>{imageError && <small className="form-error">{imageError}</small>}{block.url && <small>Image attached. Upload a new image to replace it.</small>}<label>Caption<input value={block.caption ?? ""} onChange={(event) => onChange({ caption: event.target.value })} /></label></>}
    {block.type === "link" && <><label>Link label<input value={block.title ?? ""} onChange={(event) => onChange({ title: event.target.value })} /></label><label>Destination URL<input value={block.url ?? ""} onChange={(event) => onChange({ url: event.target.value })} placeholder="https://…" /></label></>}
    {block.type === "embed" && <><label>Embed title<input value={block.title ?? ""} onChange={(event) => onChange({ title: event.target.value })} /></label><label>YouTube/Vimeo URL<input value={block.url ?? ""} onChange={(event) => onChange({ url: event.target.value })} /></label></>}
    {block.type === "video" && <><label>{videoPartNumber ? `Part ${videoPartNumber} · Bunny Stream video` : "Bunny Stream video"}<input type="file" accept="video/*,.mp4,.mov,.mkv,.webm" disabled={busy} onChange={async (event) => { if (await uploadVideo(event.target.files?.[0], block.id)) onChange({ mediaEmpty: false }); event.target.value = ""; }} />{!block.mediaEmpty && (block.videoId || (block.id === "legacy-video" && lesson.video_id)) && <small>Video attached. Bunny may need a few minutes to encode it.</small>}{block.mediaEmpty && <small>This video block is empty. Choose a file to attach it.</small>}</label><div className="video-part-order"><span>{videoPartNumber ? `Part ${videoPartNumber} order` : "Video part order"}</span><div><button type="button" className="secondary-button" aria-label="Move video part up" disabled={!canMoveVideoPartUp} onClick={() => onMoveVideoPart?.(-1)}><ArrowUp /> Move up</button><button type="button" className="secondary-button" aria-label="Move video part down" disabled={!canMoveVideoPartDown} onClick={() => onMoveVideoPart?.(1)}><ArrowDown /> Move down</button></div></div></>}
    {(block.type === "pdf" || block.type === "word") && <label>{block.type === "pdf" ? "Upload PDF" : "Upload Word document (.docx)"}<input type="file" accept={block.type === "pdf" ? ".pdf,application/pdf" : ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"} disabled={busy} onChange={async (event) => { if (await uploadPdf(event.target.files?.[0], block.id)) onChange({ mediaEmpty: false }); event.target.value = ""; }} />{hasMatchingDocument ? <small>This block has a document. Uploading here replaces this block’s file; add another document block to keep both.</small> : block.mediaEmpty ? <small>This {block.type === "pdf" ? "PDF" : "Word document"} block is empty. Choose a file to attach it.</small> : <small>No {block.type === "pdf" ? "PDF" : "Word document"} uploaded yet. Choose a file to attach it.</small>}{busy && <small>Uploading document…</small>}</label>}
    {block.type === "divider" && <p>A simple divider separates page content.</p>}
  </div>;
}
