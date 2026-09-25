import { FileDoc, FilePdf, Image, LinkSimple, Plus, Quotes, Rows, TextAa, VideoCamera } from "@phosphor-icons/react";
import type { LessonBlockType } from "../../types";

const components = [
  { type: "heading", label: "Heading", icon: TextAa }, { type: "text", label: "Text", icon: TextAa },
  { type: "callout", label: "Callout", icon: Quotes }, { type: "divider", label: "Divider", icon: Rows },
  { type: "image", label: "Image", icon: Image }, { type: "link", label: "Link", icon: LinkSimple },
  { type: "embed", label: "Embed", icon: VideoCamera }, { type: "video", label: "Bunny video", icon: VideoCamera },
  { type: "pdf", label: "PDF reader", icon: FilePdf }, { type: "word", label: "Word document", icon: FileDoc },
] as const satisfies readonly { type: LessonBlockType; label: string; icon: typeof TextAa }[];

export function ComponentPalette({ onAdd, onDragStart, onAddSection, onClose }: {
  onAdd: (type: LessonBlockType) => void;
  onDragStart: (event: React.DragEvent, type: LessonBlockType) => void;
  onAddSection: () => void;
  onClose: () => void;
}) {
  return <aside className="component-palette">
    <div className="panel-title"><strong>Components</strong><button aria-label="Hide components" onClick={onClose}>×</button></div>
    <p>Drag a block into the selected tab, or click to add it.</p>
    {components.map(({ type, label, icon: Icon }) => <button className="palette-item" key={type} draggable onDragStart={(event) => onDragStart(event, type)} onClick={() => onAdd(type)}><Icon />{label}<Plus /></button>)}
    <button className="palette-section" onClick={onAddSection}><Plus /> Add section heading</button>
  </aside>;
}
