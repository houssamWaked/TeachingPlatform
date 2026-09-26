import { useMemo, useState } from "react";
import { Eye, Trash, X } from "@phosphor-icons/react";
import type { Lesson, LessonBlock, LessonBlockType, LessonContent, Question } from "../types";
import { api } from "../lib/api";
import { BlockInspector } from "./lesson-builder/BlockInspector";
import { ComponentPalette } from "./lesson-builder/ComponentPalette";
import { LessonBlockRenderer } from "./lesson-builder/LessonBlockRenderer";
import { LessonTabContent } from "./LessonTabContent";
import { QuizEditor } from "./lesson-builder/QuizEditor";
import { contentWithTabs } from "../lib/lessonTabs";
import { useLocale } from "../context/LocaleContext";

const makeId = () => crypto.randomUUID();
const emptyContent = (): LessonContent => ({ blocks: [], sections: [] });
type DragItem = { kind: "new"; type: LessonBlockType } | { kind: "block"; id: string; from: string };

function LessonTabsPreview({ tabs, lesson, video, content, tx }: { tabs: NonNullable<LessonContent["tabs"]>; lesson: Lesson; video: (lessonId: string, videoId?: string) => React.ReactNode; content: LessonContent; tx: (english: string, arabic: string) => string }) {
  const [active, setActive] = useState(tabs[0]?.id ?? (content.quizEnabled ? "__quiz__" : ""));
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return <>
    <nav className="lesson-author-tabs" aria-label={tx("Lesson sections", "أقسام الدرس")}>
      {tabs.map((tab) => <button key={tab.id} className={tab.id === active ? "active" : ""} onClick={() => setActive(tab.id)}>{tab.title}</button>)}
      {content.quizEnabled && <button className={active === "__quiz__" ? "active" : ""} onClick={() => setActive("__quiz__")}>{content.quizTitle || tx("Quiz", "اختبار")}</button>}
    </nav>
    {active === "__quiz__" ? <div className="lesson-content-flow"><h2>{content.quizTitle || tx("Quiz", "اختبار")}</h2>{lesson.questions.map((question, index) => <fieldset key={question.id}><legend>{index + 1}. {question.question_text}</legend>{question.question_type === "multiple_choice" ? question.options?.map((option, optionIndex) => <p key={optionIndex}>◯ {option}</p>) : <textarea disabled placeholder={tx("Student written answer", "إجابة الطالب المكتوبة")} />}</fieldset>)}</div> : <LessonTabContent blocks={current?.blocks ?? []} lesson={lesson} video={video} admin />}
  </>;
}

export function LessonBuilder({ lesson: initial, onClose, onSaved, video }: { lesson: Lesson; onClose: () => void; onSaved: (lesson: Lesson) => void; video: (lessonId: string, videoId?: string) => React.ReactNode }) {
  const { tx } = useLocale();
  const [lesson, setLesson] = useState<Lesson>(() => ({ ...initial, content: contentWithTabs(initial) }));
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingCardImage, setUploadingCardImage] = useState(false);
  const [uploading, setUploading] = useState<{ type: "video" | "document"; blockId: string } | null>(null);
  const [notice, setNotice] = useState("");
  const [placementError, setPlacementError] = useState("");
  const [activeTab, setActiveTab] = useState("");
  const content = lesson.content ?? emptyContent();
  const allBlocks = useMemo(() => [{ section: "root", block: undefined as LessonBlock | undefined }, ...content.blocks.map((block) => ({ section: "root", block })), ...content.sections.flatMap((section) => section.blocks.map((block) => ({ section: section.id, block }))), ...(content.tabs ?? []).flatMap((tab) => tab.blocks.map((block) => ({ section: `tab_${tab.id}`, block })))], [content]);
  const currentTabId = activeTab === "__quiz__" ? "__quiz__" : content.tabs?.some((tab) => tab.id === activeTab) ? activeTab : content.tabs?.[0]?.id ?? "";
  const destination = `tab_${content.tabs?.find((tab) => tab.id === currentTabId)?.id ?? content.tabs?.[0]?.id ?? ""}`;
  const selectedBlock = allBlocks.find((item) => item.block && `${item.section}:${item.block.id}` === selected)?.block;
  const selectedLocation = selected.split(":")[0];
  const selectedVideoBlocks = (selectedLocation.startsWith("tab_") ? content.tabs?.find((tab) => `tab_${tab.id}` === selectedLocation)?.blocks : selectedLocation === "root" ? content.blocks : content.sections.find((section) => section.id === selectedLocation)?.blocks)?.filter((block) => block.type === "video") ?? [];
  const selectedVideoIndex = selectedVideoBlocks.findIndex((block) => block.id === selectedBlock?.id);
  const update = (patch: Partial<Lesson>) => setLesson((current) => ({ ...current, ...patch }));
  const setContent = (next: LessonContent) => update({ content: next });
  async function save(patch: Partial<Lesson> = {}) {
    setBusy(true); setNotice("");
    try {
      const next = { ...lesson, ...patch };
      const result = await api.updateLesson(lesson.id, { title: next.title, description: next.description, video_id: next.video_id, pdf_path: next.pdf_path, word_path: next.word_path, content: next.content, published: next.published });
      const saved = (result ?? next) as Lesson;
      // Apply the lesson response before saving quiz answers. A quiz-save
      // failure must not leave a newly uploaded media block looking empty.
      update(saved); onSaved(saved);
      const questions = await api.saveQuestions(lesson.id, next.questions);
      update({ ...saved, questions }); onSaved({ ...saved, questions }); setNotice(tx("All changes saved", "تم حفظ كل التغييرات")); return { ...saved, questions };
    } catch (error) { setNotice(error instanceof Error ? error.message : tx("Could not save changes.", "تعذر حفظ التغييرات.")); return null; }
    finally { setBusy(false); }
  }
  function createBlock(type: LessonBlockType): LessonBlock { return { id: makeId(), type, text: type === "heading" ? tx("New heading", "عنوان جديد") : "", title: type === "embed" ? tx("Add a title", "أضف عنواناً") : "", url: "", mediaEmpty: ["video", "pdf", "word"].includes(type) }; }
  function tabPlacementError(type: LessonBlockType, sectionId: string, exceptId?: string) {
    if (!sectionId.startsWith("tab_")) return "";
    const blocks = (content.tabs?.find((tab) => `tab_${tab.id}` === sectionId)?.blocks ?? []).filter((block) => block.id !== exceptId);
    const hasVideo = blocks.some((block) => block.type === "video");
    if (hasVideo && type !== "video") return tx("A tab with videos can contain only videos. Move this component to another tab.", "لا يمكن أن تحتوي علامة التبويب التي تضم فيديوهات إلا على فيديوهات. انقل هذا المكوّن إلى علامة تبويب أخرى.");
    if (type === "video" && blocks.some((block) => block.type !== "video")) return tx("Videos can only share a tab with other videos. Move the video to another tab.", "لا يمكن وضع الفيديو إلا مع فيديوهات أخرى. انقله إلى علامة تبويب أخرى.");
    if ((type === "pdf" || type === "word") && blocks.some((block) => block.type === "pdf" || block.type === "word")) return tx("A tab can contain only one PDF or Word document. Add another tab for a second document.", "يمكن أن تحتوي علامة التبويب على مستند PDF أو Word واحد فقط. أضف علامة تبويب أخرى للمستند الثاني.");
    return "";
  }
  function addBlock(type: LessonBlockType, sectionId = destination, index?: number) {
    const error = tabPlacementError(type, sectionId);
    if (error) { setPlacementError(error); return; }
    setPlacementError("");
    const block = createBlock(type);
    const insert = (list: LessonBlock[]) => { const next = [...list]; next.splice(index ?? next.length, 0, block); return next; };
    setContent(sectionId === "root" ? { ...content, blocks: insert(content.blocks) } : sectionId.startsWith("tab_") ? { ...content, tabs: (content.tabs ?? []).map((tab) => `tab_${tab.id}` === sectionId ? { ...tab, blocks: insert(tab.blocks) } : tab) } : { ...content, sections: content.sections.map((section) => section.id === sectionId ? { ...section, blocks: insert(section.blocks) } : section) });
    setSelected(`${sectionId}:${block.id}`);
  }
  function moveBlock(blockId: string, from: string, to: string, index: number) {
    const getBlocks = (location: string) => location === "root" ? content.blocks : location.startsWith("tab_") ? content.tabs?.find((tab) => `tab_${tab.id}` === location)?.blocks ?? [] : content.sections.find((section) => section.id === location)?.blocks ?? [];
    const source = getBlocks(from);
    const block = source.find((item) => item.id === blockId);
    if (!block) return;
    const error = tabPlacementError(block.type, to, from === to ? blockId : undefined);
    if (error) { setPlacementError(error); return; }
    setPlacementError("");
    let sections = content.sections;
    let blocks = content.blocks;
    let tabs = content.tabs ?? [];
    if (from === "root") blocks = blocks.filter((item) => item.id !== blockId);
    else if (from.startsWith("tab_")) tabs = tabs.map((tab) => `tab_${tab.id}` === from ? { ...tab, blocks: tab.blocks.filter((item) => item.id !== blockId) } : tab);
    else sections = sections.map((section) => section.id === from ? { ...section, blocks: section.blocks.filter((item) => item.id !== blockId) } : section);
    const insert = (list: LessonBlock[]) => { const next = [...list]; next.splice(Math.max(0, Math.min(index, next.length)), 0, block); return next; };
    if (to === "root") blocks = insert(blocks);
    else if (to.startsWith("tab_")) tabs = tabs.map((tab) => `tab_${tab.id}` === to ? { ...tab, blocks: insert(tab.blocks) } : tab);
    else sections = sections.map((section) => section.id === to ? { ...section, blocks: insert(section.blocks) } : section);
    setContent({ ...content, blocks, sections, tabs }); setSelected(`${to}:${blockId}`);
  }
  function moveVideoPart(blockId: string, sectionId: string, direction: -1 | 1) {
    const list = sectionId.startsWith("tab_") ? content.tabs?.find((tab) => `tab_${tab.id}` === sectionId)?.blocks ?? [] : sectionId === "root" ? content.blocks : content.sections.find((section) => section.id === sectionId)?.blocks ?? [];
    const videoBlocks = list.filter((block) => block.type === "video");
    const videoIndex = videoBlocks.findIndex((block) => block.id === blockId);
    const target = videoBlocks[videoIndex + direction];
    if (!target) return;
    const targetIndex = list.findIndex((block) => block.id === target.id);
    moveBlock(blockId, sectionId, sectionId, targetIndex);
  }
  function updateBlock(blockId: string, patch: Partial<LessonBlock>) {
    const [sectionId] = selected.split(":");
    const edit = (list: LessonBlock[]) => list.map((block) => block.id === blockId ? { ...block, ...patch } : block);
    setContent(sectionId === "root" ? { ...content, blocks: edit(content.blocks) } : sectionId.startsWith("tab_") ? { ...content, tabs: (content.tabs ?? []).map((tab) => `tab_${tab.id}` === sectionId ? { ...tab, blocks: edit(tab.blocks) } : tab) } : { ...content, sections: content.sections.map((section) => section.id === sectionId ? { ...section, blocks: edit(section.blocks) } : section) });
  }
  function deleteSelected() {
    if (!selectedBlock) return;
    const [sectionId] = selected.split(":");
    const next = sectionId === "root" ? { ...content, blocks: content.blocks.filter((block) => block.id !== selectedBlock.id) } : sectionId.startsWith("tab_") ? { ...content, tabs: (content.tabs ?? []).map((tab) => `tab_${tab.id}` === sectionId ? { ...tab, blocks: tab.blocks.filter((block) => block.id !== selectedBlock.id) } : tab) } : { ...content, sections: content.sections.map((section) => section.id === sectionId ? { ...section, blocks: section.blocks.filter((block) => block.id !== selectedBlock.id) } : section) };
    const remaining = [...next.blocks, ...next.sections.flatMap((section) => section.blocks), ...(next.tabs ?? []).flatMap((tab) => tab.blocks)];
    update({ content: next, ...(selectedBlock.type === "video" && !remaining.some((block) => block.type === "video") ? { video_id: "" } : {}), ...(selectedBlock.type === "pdf" && !remaining.some((block) => block.type === "pdf") ? { pdf_path: "" } : {}), ...(selectedBlock.type === "word" && !remaining.some((block) => block.type === "word") ? { word_path: "" } : {}) });
    setSelected("");
  }
  function markMediaBlockAttached(blockId: string, filePath?: string, videoId?: string, attachmentName?: string): LessonContent {
    const attach = (blocks: LessonBlock[]) => blocks.map((block) => {
      if (block.id !== blockId) return block;
      const fileTitle = attachmentName?.replace(/\.[^.]+$/, "");
      const hasDefaultPartTitle = /^part\s+\d+$/i.test(block.title?.trim() ?? "");
      return {
        ...block,
        ...(filePath ? { filePath } : {}),
        ...(videoId ? { videoId } : {}),
        ...(attachmentName ? { attachmentName, ...(!block.title?.trim() || hasDefaultPartTitle ? { title: fileTitle } : {}) } : {}),
        mediaEmpty: false,
      };
    });
    return { ...content, blocks: attach(content.blocks), sections: content.sections.map((section) => ({ ...section, blocks: attach(section.blocks) })), tabs: (content.tabs ?? []).map((tab) => ({ ...tab, blocks: attach(tab.blocks) })) };
  }
  async function uploadVideo(file?: File, blockId?: string): Promise<boolean> {
    if (!file) return false;
    if (blockId) setUploading({ type: "video", blockId });
    setBusy(true); setNotice(tx("Uploading video…", "جارٍ رفع الفيديو…"));
    try {
      const videoBlocks = [...content.blocks, ...content.sections.flatMap((section) => section.blocks), ...(content.tabs ?? []).flatMap((tab) => tab.blocks)].filter((block) => block.type === "video");
      const selectedVideo = videoBlocks.find((block) => block.id === blockId);
      const fallbackTitle = blockId ? `Part ${Math.max(1, videoBlocks.findIndex((block) => block.id === blockId) + 1)}` : "";
      const videoTitle = [lesson.title, selectedVideo?.title?.trim() || fallbackTitle].filter(Boolean).join(" - ");
      const video_id = await api.uploadVideo(file, videoTitle, () => {});
      const nextContent = blockId ? markMediaBlockAttached(blockId, undefined, video_id, file.name) : content;
      const patch: Partial<Lesson> = blockId ? { content: nextContent } : { video_id, content: nextContent };
      const saved = await save(patch);
      if (!saved) return false;
      if (blockId) { const savedWithFilename = { ...saved, content: nextContent }; update(savedWithFilename); onSaved(savedWithFilename); }
      setNotice(tx("Video uploaded. Bunny may need time to finish encoding.", "تم رفع الفيديو. قد يحتاج Bunny إلى بعض الوقت لإنهاء المعالجة.")); return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : tx("Video upload failed.", "تعذر رفع الفيديو.")); return false; }
    finally { setBusy(false); setUploading(null); }
  }
  async function uploadPdf(file?: File, blockId?: string): Promise<boolean> {
    if (!file) return false;
    if (blockId) setUploading({ type: "document", blockId });
    setBusy(true); setNotice(tx("Uploading document…", "جارٍ رفع المستند…"));
    try {
      const uploadedPath = await api.uploadDocument(file);
      const nextContent = blockId ? markMediaBlockAttached(blockId, uploadedPath, undefined, file.name) : content;
      const targetBlock = [...content.blocks, ...content.sections.flatMap((section) => section.blocks), ...(content.tabs ?? []).flatMap((tab) => tab.blocks)].find((block) => block.id === blockId);
      const patch: Partial<Lesson> = blockId
        ? { content: nextContent }
        : targetBlock?.type === "word" || file.name.toLowerCase().endsWith(".docx")
          ? { word_path: uploadedPath, content: nextContent }
          : { pdf_path: uploadedPath, content: nextContent };
      // Persist the attachment before exposing its storage path to the preview.
      // Otherwise the reader can request a signed URL while the lesson row is
      // still being updated, then remain in its failed/empty state until remount.
      const saved = await save(patch);
      if (!saved) return false;
      if (blockId) { const savedWithFilename = { ...saved, content: nextContent }; update(savedWithFilename); onSaved(savedWithFilename); }
      setNotice(tx("Document uploaded.", "تم رفع المستند.")); return true;
    }
    catch (error) { setNotice(error instanceof Error ? error.message : tx("Document upload failed.", "تعذر رفع المستند.")); return false; }
    finally { setBusy(false); setUploading(null); }
  }
  async function uploadImage(file: File) {
    if (file.size > 8 * 1024 * 1024) throw new Error("Images must be 8 MB or smaller.");
    setBusy(true); setNotice(tx("Uploading image…", "جارٍ رفع الصورة…"));
    try { const path = await api.uploadImage(file); setNotice(tx("Image uploaded. Save the lesson to keep the change.", "تم رفع الصورة. احفظ الدرس للاحتفاظ بالتغيير.")); return path; }
    catch (error) { setNotice(error instanceof Error ? error.message : tx("Image upload failed.", "تعذر رفع الصورة.")); throw error; }
    finally { setBusy(false); }
  }
  async function uploadCardImage(file?: File) {
    if (!file) return;
    setUploadingCardImage(true);
    try {
      const cardImage = await uploadImage(file);
      setContent({ ...content, pageStyle: { ...content.pageStyle, cardImage, cardImageName: file.name } });
    } catch { /* The upload message is shown in the editor status. */ }
    finally { setUploadingCardImage(false); }
  }
  function startNewDrag(event: React.DragEvent, type: LessonBlockType) { const data: DragItem = { kind: "new", type }; event.dataTransfer.setData("application/x-lesson-block", JSON.stringify(data)); event.dataTransfer.effectAllowed = "copy"; }
  function startBlockDrag(event: React.DragEvent, id: string, from: string) { const data: DragItem = { kind: "block", id, from }; event.dataTransfer.setData("application/x-lesson-block", JSON.stringify(data)); event.dataTransfer.effectAllowed = "move"; }
  function dropOn(event: React.DragEvent, destination: string, index: number) {
    event.preventDefault(); event.stopPropagation();
    const raw = event.dataTransfer.getData("application/x-lesson-block"); if (!raw) return;
    const item = JSON.parse(raw) as DragItem;
    if (item.kind === "new") addBlock(item.type, destination, index);
    if (item.kind === "block") moveBlock(item.id, item.from, destination, index);
  }
  function editableBlock(block: LessonBlock, sectionId: string, index: number) {
    const id = `${sectionId}:${block.id}`;
    return <div key={block.id} className={`canvas-component ${selected === id ? "is-selected" : ""}`} draggable onDragStart={(event) => startBlockDrag(event, block.id, sectionId)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOn(event, sectionId, index)} onClick={(event) => { event.stopPropagation(); setSelected(id); }}>
      <span className="canvas-drag-handle" aria-hidden="true">⠿</span>
      <LessonBlockRenderer block={block} lesson={lesson} video={video} admin />
    </div>;
  }
  function insertMarker(sectionId: string, index: number) { return <div key={`drop-${sectionId}-${index}`} className="canvas-drop-marker" onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add("is-over"); }} onDragLeave={(event) => event.currentTarget.classList.remove("is-over")} onDrop={(event) => dropOn(event, sectionId, index)}><span>{tx("Drop component here", "أفلت المكوّن هنا")}</span></div>; }
  const pageWidth = 850;
  const pageStyle = { width: `min(${pageWidth}px, 100%)`, maxWidth: pageWidth };
  const addTab = () => { const tab = { id: makeId(), title: `Tab ${(content.tabs?.length ?? 0) + 1}`, blocks: [] as LessonBlock[] }; setContent({ ...content, tabs: [...(content.tabs ?? []), tab] }); setActiveTab(tab.id); setSelected(""); };
  const removeActiveTab = () => {
    const nextTabs = (content.tabs ?? []).filter((tab) => tab.id !== currentTabId);
    const safeTabs = nextTabs.length ? nextTabs : [{ id: makeId(), title: "Tab 1", blocks: [] }];
    setContent({ ...content, tabs: safeTabs });
    setActiveTab(safeTabs[0].id);
    setSelected("");
  };
  const addQuiz = () => { setContent({ ...content, quizEnabled: true, quizTitle: content.quizTitle || tx("Quiz", "اختبار") }); setActiveTab("__quiz__"); setSelected(""); };
  const setQuestions = (questions: Question[]) => update({ questions });
  const tabBlocks = content.tabs?.find((tab) => tab.id === currentTabId)?.blocks ?? [];
  if (preview) return (
    <div className="builder-backdrop">
      <section className="builder-preview">
        <header><strong><Eye /> {tx("Student preview", "معاينة الطالب")}</strong><button className="secondary-button" onClick={() => setPreview(false)}>{tx("Back to editor", "العودة إلى المحرر")}</button></header>
        <div className="preview-paper" style={pageStyle}>
          <h1>{lesson.title || tx("Untitled lesson", "درس بلا عنوان")}</h1>
          {lesson.description && <p className="preview-description">{lesson.description}</p>}
          {content.tabs?.length || content.quizEnabled
            ? <LessonTabsPreview tabs={content.tabs ?? []} lesson={lesson} video={video} content={content} tx={tx} />
            : <div className="lesson-content-flow">
                {content.blocks.map((block) => <LessonBlockRenderer key={block.id} block={block} lesson={lesson} video={video} admin />)}
                {content.sections.map((section) => <section className="lesson-content-section" key={section.id}><h2>{section.title}</h2>{section.blocks.map((block) => <LessonBlockRenderer key={block.id} block={block} lesson={lesson} video={video} admin />)}</section>)}
              </div>}
        </div>
      </section>
    </div>
  );
  return (
    <div className="builder-backdrop">
      <section className="lesson-builder live-builder">
        <header className="builder-top">
          <div><small>{tx("LESSON BUILDER", "محرر الدرس")} · {lesson.published ? tx("PUBLISHED", "منشور") : tx("DRAFT", "مسودة")}</small><h2>{lesson.title || tx("Untitled lesson", "درس بلا عنوان")}</h2></div>
          <div>
            <span className="save-status" aria-live="polite">{notice}</span>
            <button className="secondary-button" onClick={() => setPreview(true)}><Eye /> {tx("Student preview", "معاينة الطالب")}</button>
            <button className="secondary-button" disabled={busy} aria-busy={busy} onClick={() => void save()}>{busy && <span className="ui-spinner" aria-hidden="true" />}{tx("Save", "حفظ")}</button>
            <button className="primary-button" disabled={busy || !lesson.title.trim()} aria-busy={busy} onClick={() => void save({ published: !lesson.published })}>{busy && <span className="ui-spinner" aria-hidden="true" />}{lesson.published ? tx("Unpublish", "إلغاء النشر") : tx("Publish", "نشر")}</button>
            <button className="icon-button" onClick={onClose} aria-label={tx("Close", "إغلاق")}><X /></button>
          </div>
        </header>
        <div className="builder-fields">
          <label>{tx("Lesson title", "عنوان الدرس")}<input value={lesson.title} onChange={(event) => update({ title: event.target.value })} /></label>
          <label>{tx("Short description", "وصف مختصر")}<input value={lesson.description} onChange={(event) => update({ description: event.target.value })} /></label>
          <label>{tx("Lesson card background image", "صورة خلفية بطاقة الدرس")}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void uploadCardImage(event.target.files?.[0]); event.target.value = ""; }} />
            {uploadingCardImage && <small className="block-upload-loading" role="status"><span className="ui-spinner" aria-hidden="true" />{tx("Uploading image…", "جارٍ رفع الصورة…")}</small>}
            {content.pageStyle?.cardImage && <small className="builder-uploaded-filename" title={content.pageStyle.cardImageName || undefined}>{content.pageStyle.cardImageName || tx("Image attached", "تم إرفاق صورة")}</small>}
            {content.pageStyle?.cardImage && <button type="button" className="secondary-button" onClick={() => setContent({ ...content, pageStyle: { ...content.pageStyle, cardImage: "", cardImageName: "" } })}>{tx("Remove card image", "إزالة صورة البطاقة")}</button>}
          </label>
        </div>
        <div className="live-editor-grid">
          <ComponentPalette onAdd={addBlock} onDragStart={startNewDrag} />
          <main className="live-canvas-area">
            <article className="live-page-canvas" style={pageStyle} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOn(event, destination, tabBlocks.length)}>
              <div className="live-page-title"><h1>{lesson.title || tx("Untitled lesson", "درس بلا عنوان")}</h1>{lesson.description && <p>{lesson.description}</p>}</div>
              <div className="builder-tab-strip">
                {(content.tabs ?? []).map((tab) => <button className={currentTabId === tab.id ? "active" : ""} key={tab.id} onClick={() => { setActiveTab(tab.id); setSelected(""); setPlacementError(""); }}>{tab.title}</button>)}
                {content.quizEnabled && <button className={currentTabId === "__quiz__" ? "active" : ""} onClick={() => { setActiveTab("__quiz__"); setSelected(""); setPlacementError(""); }}>{content.quizTitle || tx("Quiz", "اختبار")}</button>}
                <button onClick={addTab}>＋ {tx("Add tab", "إضافة علامة تبويب")}</button>
                {!content.quizEnabled && <button onClick={addQuiz}>＋ {tx("Add quiz tab", "إضافة علامة تبويب اختبار")}</button>}
              </div>
              {currentTabId === "__quiz__" && <div className="tab-title-edit"><label>{tx("Quiz tab name", "اسم علامة تبويب الاختبار")}<input value={content.quizTitle || tx("Quiz", "اختبار")} onChange={(event) => setContent({ ...content, quizTitle: event.target.value })} /></label><button className="secondary-button" onClick={() => { setContent({ ...content, quizEnabled: false }); setQuestions([]); setActiveTab(content.tabs?.[0]?.id ?? ""); }}>{tx("Remove quiz tab", "إزالة علامة تبويب الاختبار")}</button></div>}
              {currentTabId === "__quiz__" ? <QuizEditor questions={lesson.questions} onChange={setQuestions} /> : <div className="tab-title-edit"><label>{tx("Tab name", "اسم علامة التبويب")}<input value={content.tabs?.find((tab) => tab.id === currentTabId)?.title ?? ""} onChange={(event) => setContent({ ...content, tabs: (content.tabs ?? []).map((tab) => tab.id === currentTabId ? { ...tab, title: event.target.value } : tab) })} /></label><button className="secondary-button" onClick={removeActiveTab}>{tx("Remove tab", "إزالة علامة التبويب")}</button></div>}
              {currentTabId !== "__quiz__" && <>{placementError && <p className="form-error tab-placement-error" role="alert">{placementError}</p>}{insertMarker(destination, 0)}{tabBlocks.map((block, index) => <div className="canvas-component-group" key={block.id}>{editableBlock(block, destination, index)}{insertMarker(destination, index + 1)}</div>)}{!tabBlocks.length && <div className="canvas-empty-hint">{tx("Add components to this tab.", "أضف مكوّنات إلى علامة التبويب هذه.")}</div>}</>}
            </article>
          </main>
          <aside className="properties-panel">
            <div className="panel-title"><strong>{selectedBlock ? tx("Block settings", "إعدادات المكوّن") : tx("Lesson settings", "إعدادات الدرس")}</strong>{selectedBlock && <button aria-label={tx("Delete selected item", "حذف العنصر المحدد")} onClick={deleteSelected}><Trash /></button>}</div>
            {selectedBlock ? <BlockInspector block={selectedBlock} onChange={(patch) => updateBlock(selectedBlock.id, patch)} uploadVideo={uploadVideo} uploadPdf={uploadPdf} uploadImage={uploadImage} busy={busy} uploading={uploading?.blockId === selectedBlock.id ? uploading.type : undefined} lesson={lesson} onMoveVideoPart={(direction) => moveVideoPart(selectedBlock.id, selectedLocation, direction)} canMoveVideoPartUp={selectedVideoIndex > 0} canMoveVideoPartDown={selectedVideoIndex >= 0 && selectedVideoIndex < selectedVideoBlocks.length - 1} videoPartNumber={selectedBlock.type === "video" && selectedVideoIndex >= 0 ? selectedVideoIndex + 1 : undefined} /> : <p>{tx("Select a block to edit its content and appearance.", "اختر مكوّناً لتعديل محتواه ومظهره.")}</p>}
          </aside>
        </div>
      </section>
    </div>
  );
}
