import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Eye, Trash, X } from "@phosphor-icons/react";
import type { Lesson, LessonBlock, LessonBlockType, LessonContent, Question } from "../types";
import { api } from "../lib/api";
import { BlockInspector } from "./lesson-builder/BlockInspector";
import { ComponentPalette } from "./lesson-builder/ComponentPalette";
import { LessonBlockRenderer } from "./lesson-builder/LessonBlockRenderer";
import { LessonTabContent } from "./LessonTabContent";
import { useLessonImageUrl } from "./lesson-builder/useLessonImageUrl";
import { QuizEditor } from "./lesson-builder/QuizEditor";
import { contentWithTabs } from "../lib/lessonTabs";

const makeId = () => crypto.randomUUID();
const emptyContent = (): LessonContent => ({ blocks: [], sections: [] });
type DragItem = { kind: "new"; type: LessonBlockType } | { kind: "block"; id: string; from: string } | { kind: "section"; id: string };

function LessonTabsPreview({ tabs, lesson, video, content }: { tabs: NonNullable<LessonContent["tabs"]>; lesson: Lesson; video: (lessonId: string, videoId?: string) => React.ReactNode; content: LessonContent }) {
  const [active, setActive] = useState(tabs[0]?.id ?? (content.quizEnabled ? "__quiz__" : ""));
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  return <>
    <nav className="lesson-author-tabs" aria-label="Lesson sections">
      {tabs.map((tab) => <button key={tab.id} className={tab.id === active ? "active" : ""} onClick={() => setActive(tab.id)}>{tab.title}</button>)}
      {content.quizEnabled && <button className={active === "__quiz__" ? "active" : ""} onClick={() => setActive("__quiz__")}>{content.quizTitle || "Quiz"}</button>}
    </nav>
    {active === "__quiz__" ? <div className="lesson-content-flow"><h2>{content.quizTitle || "Quiz"}</h2>{lesson.questions.map((question, index) => <fieldset key={question.id}><legend>{index + 1}. {question.question_text}</legend>{question.question_type === "multiple_choice" ? question.options?.map((option, optionIndex) => <p key={optionIndex}>◯ {option}</p>) : <textarea disabled placeholder="Student written answer" />}</fieldset>)}</div> : <LessonTabContent blocks={current?.blocks ?? []} lesson={lesson} video={video} admin />}
  </>;
}

export function LessonBuilder({ lesson: initial, onClose, onSaved, video }: { lesson: Lesson; onClose: () => void; onSaved: (lesson: Lesson) => void; video: (lessonId: string, videoId?: string) => React.ReactNode }) {
  const [lesson, setLesson] = useState<Lesson>(() => ({ ...initial, content: contentWithTabs(initial) }));
  const [selected, setSelected] = useState("");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [showPalette, setShowPalette] = useState(true);
  const [activeTab, setActiveTab] = useState("");
  const content = lesson.content ?? emptyContent();
  const allBlocks = useMemo(() => [{ section: "root", block: undefined as LessonBlock | undefined }, ...content.blocks.map((block) => ({ section: "root", block })), ...content.sections.flatMap((section) => section.blocks.map((block) => ({ section: section.id, block }))), ...(content.tabs ?? []).flatMap((tab) => tab.blocks.map((block) => ({ section: `tab_${tab.id}`, block })))], [content]);
  const currentTabId = activeTab === "__quiz__" ? "__quiz__" : content.tabs?.some((tab) => tab.id === activeTab) ? activeTab : content.tabs?.[0]?.id ?? "";
  const destination = `tab_${content.tabs?.find((tab) => tab.id === currentTabId)?.id ?? content.tabs?.[0]?.id ?? ""}`;
  const selectedBlock = allBlocks.find((item) => item.block && `${item.section}:${item.block.id}` === selected)?.block;
  const selectedSection = content.sections.find((section) => `section:${section.id}` === selected);
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
      const questions = await api.saveQuestions(lesson.id, next.questions);
      update({ ...saved, questions }); onSaved({ ...saved, questions }); setNotice("All changes saved"); return { ...saved, questions };
    } catch (error) { setNotice(error instanceof Error ? error.message : "Could not save changes."); return null; }
    finally { setBusy(false); }
  }
  function createBlock(type: LessonBlockType): LessonBlock { return { id: makeId(), type, text: type === "heading" ? "New heading" : "", title: type === "link" || type === "embed" ? "Add a title" : "", url: "", mediaEmpty: ["video", "pdf", "word"].includes(type) }; }
  function addBlock(type: LessonBlockType, sectionId = destination, index?: number) {
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
  function moveSection(sectionId: string, targetIndex: number) {
    const fromIndex = content.sections.findIndex((section) => section.id === sectionId);
    if (fromIndex < 0) return;
    const next = [...content.sections]; const [section] = next.splice(fromIndex, 1); next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, section);
    setContent({ ...content, sections: next });
  }
  function updateBlock(blockId: string, patch: Partial<LessonBlock>) {
    const [sectionId] = selected.split(":");
    const edit = (list: LessonBlock[]) => list.map((block) => block.id === blockId ? { ...block, ...patch } : block);
    setContent(sectionId === "root" ? { ...content, blocks: edit(content.blocks) } : sectionId.startsWith("tab_") ? { ...content, tabs: (content.tabs ?? []).map((tab) => `tab_${tab.id}` === sectionId ? { ...tab, blocks: edit(tab.blocks) } : tab) } : { ...content, sections: content.sections.map((section) => section.id === sectionId ? { ...section, blocks: edit(section.blocks) } : section) });
  }
  function deleteSelected() {
    if (selectedSection) { setContent({ ...content, sections: content.sections.filter((section) => section.id !== selectedSection.id) }); setSelected(""); return; }
    if (!selectedBlock) return;
    const [sectionId] = selected.split(":");
    const next = sectionId === "root" ? { ...content, blocks: content.blocks.filter((block) => block.id !== selectedBlock.id) } : sectionId.startsWith("tab_") ? { ...content, tabs: (content.tabs ?? []).map((tab) => `tab_${tab.id}` === sectionId ? { ...tab, blocks: tab.blocks.filter((block) => block.id !== selectedBlock.id) } : tab) } : { ...content, sections: content.sections.map((section) => section.id === sectionId ? { ...section, blocks: section.blocks.filter((block) => block.id !== selectedBlock.id) } : section) };
    const remaining = [...next.blocks, ...next.sections.flatMap((section) => section.blocks), ...(next.tabs ?? []).flatMap((tab) => tab.blocks)];
    update({ content: next, ...(selectedBlock.type === "video" && !remaining.some((block) => block.type === "video") ? { video_id: "" } : {}), ...(selectedBlock.type === "pdf" && !remaining.some((block) => block.type === "pdf") ? { pdf_path: "" } : {}), ...(selectedBlock.type === "word" && !remaining.some((block) => block.type === "word") ? { word_path: "" } : {}) });
    setSelected("");
  }
  function markMediaBlockAttached(blockId: string, filePath?: string, videoId?: string): LessonContent {
    const attach = (blocks: LessonBlock[]) => blocks.map((block) => block.id === blockId ? { ...block, ...(filePath ? { filePath } : {}), ...(videoId ? { videoId } : {}), mediaEmpty: false } : block);
    return { ...content, blocks: attach(content.blocks), sections: content.sections.map((section) => ({ ...section, blocks: attach(section.blocks) })), tabs: (content.tabs ?? []).map((tab) => ({ ...tab, blocks: attach(tab.blocks) })) };
  }
  async function uploadVideo(file?: File, blockId?: string): Promise<boolean> {
    if (!file) return false;
    setBusy(true); setNotice("Uploading video…");
    try {
      const video_id = await api.uploadVideo(file, lesson.title, () => {});
      const nextContent = blockId ? markMediaBlockAttached(blockId, undefined, video_id) : content;
      const patch: Partial<Lesson> = blockId ? { content: nextContent } : { video_id, content: nextContent };
      const saved = await save(patch);
      if (!saved) return false;
      setNotice("Video uploaded. Bunny may need time to finish encoding."); return true;
    } catch (error) { setNotice(error instanceof Error ? error.message : "Video upload failed."); return false; }
    finally { setBusy(false); }
  }
  async function uploadPdf(file?: File, blockId?: string): Promise<boolean> {
    if (!file) return false;
    setBusy(true); setNotice("Uploading document…");
    try {
      const uploadedPath = await api.uploadDocument(file);
      const nextContent = blockId ? markMediaBlockAttached(blockId, uploadedPath) : content;
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
      setNotice("Document uploaded."); return true;
    }
    catch (error) { setNotice(error instanceof Error ? error.message : "Document upload failed."); return false; }
    finally { setBusy(false); }
  }
  async function uploadImage(file: File) {
    if (file.size > 8 * 1024 * 1024) throw new Error("Images must be 8 MB or smaller.");
    setBusy(true); setNotice("Uploading image…");
    try { const path = await api.uploadImage(file); setNotice("Image uploaded. Save the lesson to keep the change."); return path; }
    catch (error) { setNotice(error instanceof Error ? error.message : "Image upload failed."); throw error; }
    finally { setBusy(false); }
  }
  async function uploadCardImage(file?: File) {
    if (!file) return;
    try {
      const cardImage = await uploadImage(file);
      setContent({ ...content, pageStyle: { ...content.pageStyle, cardImage } });
    } catch { /* The upload message is shown in the editor status. */ }
  }
  function startNewDrag(event: React.DragEvent, type: LessonBlockType) { const data: DragItem = { kind: "new", type }; event.dataTransfer.setData("application/x-lesson-block", JSON.stringify(data)); event.dataTransfer.effectAllowed = "copy"; }
  function startBlockDrag(event: React.DragEvent, id: string, from: string) { const data: DragItem = { kind: "block", id, from }; event.dataTransfer.setData("application/x-lesson-block", JSON.stringify(data)); event.dataTransfer.effectAllowed = "move"; }
  function dropOn(event: React.DragEvent, destination: string, index: number) {
    event.preventDefault(); event.stopPropagation();
    const raw = event.dataTransfer.getData("application/x-lesson-block"); if (!raw) return;
    const item = JSON.parse(raw) as DragItem;
    if (item.kind === "new") addBlock(item.type, destination, index);
    if (item.kind === "block") moveBlock(item.id, item.from, destination, index);
    if (item.kind === "section" && destination === "sections") moveSection(item.id, index);
  }
  function editableBlock(block: LessonBlock, sectionId: string, index: number) {
    const id = `${sectionId}:${block.id}`;
    return <div key={block.id} className={`canvas-component ${selected === id ? "is-selected" : ""}`} draggable onDragStart={(event) => startBlockDrag(event, block.id, sectionId)} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOn(event, sectionId, index)} onClick={(event) => { event.stopPropagation(); setSelected(id); }}>
      <span className="canvas-drag-handle" aria-hidden="true">⠿</span>
      <LessonBlockRenderer block={block} lesson={lesson} video={video} admin />
    </div>;
  }
  function insertMarker(sectionId: string, index: number) { return <div key={`drop-${sectionId}-${index}`} className="canvas-drop-marker" onDragOver={(event) => { event.preventDefault(); event.currentTarget.classList.add("is-over"); }} onDragLeave={(event) => event.currentTarget.classList.remove("is-over")} onDrop={(event) => dropOn(event, sectionId, index)}><span>Drop component here</span></div>; }
  const pageWidth = content.pageStyle?.contentWidth === "narrow" ? 680 : content.pageStyle?.contentWidth === "wide" ? 1120 : 850;
  const backgroundImageUrl = useLessonImageUrl(lesson.id, content.pageStyle?.backgroundImage, true);
  const pageStyle = { width: `min(${pageWidth}px, 100%)`, backgroundColor: content.pageStyle?.backgroundColor ?? "#ffffff", backgroundImage: backgroundImageUrl ? `url(${backgroundImageUrl})` : undefined, backgroundSize: "cover", backgroundPosition: "center", maxWidth: pageWidth };
  const addTab = () => { const tab = { id: makeId(), title: `Tab ${(content.tabs?.length ?? 0) + 1}`, blocks: [] as LessonBlock[] }; setContent({ ...content, tabs: [...(content.tabs ?? []), tab] }); setActiveTab(tab.id); setSelected(""); };
  const addSectionBlock = () => {
    const tabId = currentTabId === "__quiz__" ? content.tabs?.[0]?.id : currentTabId;
    const block: LessonBlock = { ...createBlock("heading"), text: "New section" };
    setContent({ ...content, tabs: (content.tabs ?? []).map((tab) => tab.id === tabId ? { ...tab, blocks: [...tab.blocks, block] } : tab) });
    if (tabId) setActiveTab(tabId);
    setSelected(`tab_${tabId}:${block.id}`);
  };
  const removeActiveTab = () => {
    const nextTabs = (content.tabs ?? []).filter((tab) => tab.id !== currentTabId);
    const safeTabs = nextTabs.length ? nextTabs : [{ id: makeId(), title: "Tab 1", blocks: [] }];
    setContent({ ...content, tabs: safeTabs });
    setActiveTab(safeTabs[0].id);
    setSelected("");
  };
  const addQuiz = () => { setContent({ ...content, quizEnabled: true, quizTitle: content.quizTitle || "Quiz" }); setActiveTab("__quiz__"); setSelected(""); };
  const setQuestions = (questions: Question[]) => update({ questions });
  const tabBlocks = content.tabs?.find((tab) => tab.id === currentTabId)?.blocks ?? [];
  if (preview) return <div className="builder-backdrop"><section className="builder-preview"><header><strong><Eye /> Student preview</strong><button className="secondary-button" onClick={() => setPreview(false)}>Back to editor</button></header><div className="preview-paper" style={pageStyle}><h1>{lesson.title || "Untitled lesson"}</h1>{lesson.description && <p className="preview-description">{lesson.description}</p>}{content.tabs?.length || content.quizEnabled ? <LessonTabsPreview tabs={content.tabs ?? []} lesson={lesson} video={video} content={content} /> : <div className="lesson-content-flow">{content.blocks.map((block) => <LessonBlockRenderer key={block.id} block={block} lesson={lesson} video={video} admin />)}{content.sections.map((section) => <section className="lesson-content-section" key={section.id}><h2>{section.title}</h2>{section.blocks.map((block) => <LessonBlockRenderer key={block.id} block={block} lesson={lesson} video={video} admin />)}</section>)}</div>}</div></section></div>;
  return <div className="builder-backdrop"><section className="lesson-builder live-builder">
    <header className="builder-top"><div><small>LESSON BUILDER · {lesson.published ? "PUBLISHED" : "DRAFT"}</small><h2>{lesson.title || "Untitled lesson"}</h2></div><div><span className="save-status">{notice || (busy ? "Saving…" : "Drag blocks into the selected tab · changes need saving")}</span><button className="secondary-button" onClick={() => setPreview(true)}><Eye /> Student preview</button><button className="secondary-button" disabled={busy} onClick={() => void save()}>Save</button><button className="primary-button" disabled={busy || !lesson.title.trim()} onClick={() => void save({ published: !lesson.published })}>{lesson.published ? "Unpublish" : "Publish"}</button><button className="icon-button" onClick={onClose} aria-label="Close"><X /></button></div></header>
    <div className="builder-fields"><label>Lesson title<input value={lesson.title} onChange={(event) => update({ title: event.target.value })} /></label><label>Short description<input value={lesson.description} onChange={(event) => update({ description: event.target.value })} /></label></div>
    <div className="live-editor-grid">
      {showPalette && <ComponentPalette onClose={() => setShowPalette(false)} onAdd={addBlock} onDragStart={startNewDrag} onAddSection={addSectionBlock} />}
      <main className="live-canvas-area">{!showPalette && <button className="show-palette secondary-button" onClick={() => setShowPalette(true)}>＋ Components</button>}<article className="live-page-canvas" style={pageStyle} onDragOver={(event) => event.preventDefault()} onDrop={(event) => dropOn(event, destination, tabBlocks.length)}><div className="live-page-title"><h1>{lesson.title || "Untitled lesson"}</h1>{lesson.description && <p>{lesson.description}</p>}</div>
        <div className="builder-tab-strip">{(content.tabs ?? []).map((tab) => <button className={currentTabId === tab.id ? "active" : ""} key={tab.id} onClick={() => { setActiveTab(tab.id); setSelected(""); }}>{tab.title}</button>)}{content.quizEnabled && <button className={currentTabId === "__quiz__" ? "active" : ""} onClick={() => { setActiveTab("__quiz__"); setSelected(""); }}>{content.quizTitle || "Quiz"}</button>}<button onClick={addTab}>＋ Add tab</button>{!content.quizEnabled && <button onClick={addQuiz}>＋ Add quiz tab</button>}</div>
        {currentTabId === "__quiz__" && <div className="tab-title-edit"><label>Quiz tab name<input value={content.quizTitle || "Quiz"} onChange={(event) => setContent({ ...content, quizTitle: event.target.value })} /></label><button className="secondary-button" onClick={() => { setContent({ ...content, quizEnabled: false }); setQuestions([]); setActiveTab(content.tabs?.[0]?.id ?? ""); }}>Remove quiz tab</button></div>}
        {currentTabId === "__quiz__" ? <QuizEditor questions={lesson.questions} onChange={setQuestions} /> : <div className="tab-title-edit"><label>Tab name<input value={content.tabs?.find((tab) => tab.id === currentTabId)?.title ?? ""} onChange={(event) => setContent({ ...content, tabs: (content.tabs ?? []).map((tab) => tab.id === currentTabId ? { ...tab, title: event.target.value } : tab) })} /></label><button className="secondary-button" onClick={removeActiveTab}>Remove tab</button></div>}
        {currentTabId !== "__quiz__" && <>{insertMarker(destination, 0)}{tabBlocks.map((block, index) => <div className="canvas-component-group" key={block.id}>{editableBlock(block, destination, index)}{insertMarker(destination, index + 1)}</div>)}{!tabBlocks.length && <div className="canvas-empty-hint">Add components to this tab.</div>}</>}
      </article></main>
      <aside className="properties-panel"><div className="panel-title"><strong>{selectedSection ? "Section settings" : selectedBlock ? "Block settings" : "Lesson settings"}</strong>{(selectedSection || selectedBlock) && <button aria-label="Delete selected item" onClick={deleteSelected}><Trash /></button>}</div>
        {selectedSection ? <><label>Section heading<input value={selectedSection.title} onChange={(event) => setContent({ ...content, sections: content.sections.map((section) => section.id === selectedSection.id ? { ...section, title: event.target.value } : section) })} /></label><div className="property-actions"><button onClick={() => moveSection(selectedSection.id, Math.max(0, content.sections.indexOf(selectedSection) - 1))}><ArrowUp /> Move up</button><button onClick={() => moveSection(selectedSection.id, Math.min(content.sections.length - 1, content.sections.indexOf(selectedSection) + 1))}><ArrowDown /> Move down</button></div></> : selectedBlock ? <BlockInspector block={selectedBlock} onChange={(patch) => updateBlock(selectedBlock.id, patch)} uploadVideo={uploadVideo} uploadPdf={uploadPdf} uploadImage={uploadImage} busy={busy} lesson={lesson} onMoveVideoPart={(direction) => moveVideoPart(selectedBlock.id, selectedLocation, direction)} canMoveVideoPartUp={selectedVideoIndex > 0} canMoveVideoPartDown={selectedVideoIndex >= 0 && selectedVideoIndex < selectedVideoBlocks.length - 1} videoPartNumber={selectedBlock.type === "video" && selectedVideoIndex >= 0 ? selectedVideoIndex + 1 : undefined} /> : <><p>Select a block to edit its content and appearance.</p><label>Page background<input type="color" value={content.pageStyle?.backgroundColor ?? "#ffffff"} onChange={(event) => setContent({ ...content, pageStyle: { ...content.pageStyle, backgroundColor: event.target.value } })} /></label><label>Upload background image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={async (event) => { const file = event.target.files?.[0]; if (file) { try { const path = await uploadImage(file); setContent({ ...content, pageStyle: { ...content.pageStyle, backgroundImage: path } }); } catch { /* The upload message is shown in the editor status. */ } } event.target.value = ""; }} /></label>{content.pageStyle?.backgroundImage && <button className="secondary-button" onClick={() => setContent({ ...content, pageStyle: { ...content.pageStyle, backgroundImage: "" } })}>Remove background image</button>}<label>Lesson card background image<input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => { void uploadCardImage(event.target.files?.[0]); event.target.value = ""; }} /></label>{content.pageStyle?.cardImage && <button className="secondary-button" onClick={() => setContent({ ...content, pageStyle: { ...content.pageStyle, cardImage: "" } })}>Remove card image</button>}<label>Content width<select value={content.pageStyle?.contentWidth ?? "normal"} onChange={(event) => setContent({ ...content, pageStyle: { ...content, contentWidth: event.target.value as "narrow" | "normal" | "wide" } })}><option value="narrow">Narrow</option><option value="normal">Normal</option><option value="wide">Wide</option></select></label></>}
      </aside>
    </div>
  </section></div>;
}
