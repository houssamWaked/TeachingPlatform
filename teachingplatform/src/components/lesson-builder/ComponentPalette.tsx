import { FileDoc, FilePdf, Image, LinkSimple, Plus, TextAa, VideoCamera } from "@phosphor-icons/react";
import type { LessonBlockType } from "../../types";
import { useLocale } from "../../context/LocaleContext";

const components = [
  { type: "heading", label: "Heading", arabic: "عنوان", icon: TextAa }, { type: "text", label: "Text", arabic: "نص", icon: TextAa },
  { type: "image", label: "Image", arabic: "صورة", icon: Image }, { type: "link", label: "Link", arabic: "رابط", icon: LinkSimple },
  { type: "embed", label: "Embed", arabic: "تضمين", icon: VideoCamera }, { type: "video", label: "Bunny video", arabic: "فيديو Bunny", icon: VideoCamera },
  { type: "pdf", label: "PDF reader", arabic: "قارئ PDF", icon: FilePdf }, { type: "word", label: "Word document", arabic: "مستند Word", icon: FileDoc },
] as const satisfies readonly { type: LessonBlockType; label: string; arabic: string; icon: typeof TextAa }[];

export function ComponentPalette({ onAdd, onDragStart }: {
  onAdd: (type: LessonBlockType) => void;
  onDragStart: (event: React.DragEvent, type: LessonBlockType) => void;
}) {
  const { tx } = useLocale();
  return <aside className="component-palette">
    <div className="panel-title"><strong>{tx("Components", "المكوّنات")}</strong></div>
    <p>{tx("Drag a block into the selected tab, or click to add it.", "اسحب مكوّناً إلى علامة التبويب المحددة أو انقر لإضافته.")}</p>
    {components.map(({ type, label, arabic, icon: Icon }) => <button className="palette-item" key={type} draggable onDragStart={(event) => onDragStart(event, type)} onClick={() => onAdd(type)}><Icon />{tx(label, arabic)}<Plus /></button>)}
  </aside>;
}
