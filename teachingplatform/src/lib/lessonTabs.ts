import type { Lesson, LessonBlock, LessonContent, LessonTab } from "../types";

function legacyTabId(tabs: LessonTab[]) {
  let id = "lesson-content";
  let suffix = 2;
  while (tabs.some((tab) => tab.id === id)) id = `lesson-content-${suffix++}`;
  return id;
}

export function contentWithTabs(lesson: Lesson): LessonContent {
  const content = lesson.content ?? { blocks: [], sections: [] };
  const tabs = [...(content.tabs ?? [])];
  const legacyBlocks: LessonBlock[] = [...content.blocks];
  for (const section of content.sections) {
    legacyBlocks.push({ id: `section-heading-${section.id}`, type: "heading", text: section.title, level: 2 });
    legacyBlocks.push(...section.blocks);
  }

  if (legacyBlocks.length) {
    if (tabs.length) tabs[0] = { ...tabs[0], blocks: [...legacyBlocks, ...tabs[0].blocks] };
    else tabs.push({ id: legacyTabId(tabs), title: "Lesson", blocks: legacyBlocks });
  }

  const allBlocks = tabs.flatMap((tab) => tab.blocks);
  const legacyMedia: LessonBlock[] = [];
  if (lesson.video_id && !allBlocks.some((block) => block.type === "video")) legacyMedia.push({ id: "legacy-video", type: "video" });
  if (lesson.pdf_path && !lesson.pdf_path.toLowerCase().endsWith(".docx") && !allBlocks.some((block) => block.type === "pdf")) legacyMedia.push({ id: "legacy-pdf", type: "pdf" });
  const oldWordPath = lesson.word_path || (lesson.pdf_path?.toLowerCase().endsWith(".docx") ? lesson.pdf_path : "");
  if (oldWordPath && !allBlocks.some((block) => block.type === "word")) legacyMedia.push({ id: "legacy-word", type: "word" });

  if (legacyMedia.length) {
    if (tabs.length) tabs[0] = { ...tabs[0], blocks: [...tabs[0].blocks, ...legacyMedia] };
    else tabs.push({ id: legacyTabId(tabs), title: "Lesson", blocks: legacyMedia });
  }
  if (!tabs.length) tabs.push({ id: legacyTabId(tabs), title: "Tab 1", blocks: [] });

  return { ...content, blocks: [], sections: [], tabs };
}
