import { useState } from "react";
import type { Lesson, LessonBlock } from "../types";
import { LessonBlockRenderer } from "./lesson-builder/LessonBlockRenderer";

export function LessonTabContent({ blocks, lesson, video, admin = false, onPdfViewed }: {
  blocks: LessonBlock[];
  lesson: Lesson;
  video: (lessonId: string, videoId?: string) => React.ReactNode;
  admin?: boolean;
  onPdfViewed?: () => void;
}) {
  const videoBlocks = blocks.filter((block) => block.type === "video");
  // Older lessons stored one video ID on the lesson itself. Bind it to only
  // one existing video block while newly uploaded parts use their own IDs.
  const legacyVideoBlockId = videoBlocks.find((block) => !block.videoId && !block.mediaEmpty)?.id;
  const withVideoId = (block: LessonBlock) => ({
    ...block,
    videoId: block.videoId || (block.id === "legacy-video" || block.id === legacyVideoBlockId ? lesson.video_id : undefined),
  });
  const playableVideos = videoBlocks.filter((block) => !block.mediaEmpty && Boolean(withVideoId(block).videoId));
  const [activeVideoId, setActiveVideoId] = useState(playableVideos[0]?.id ?? "");
  if (playableVideos.length < 2) return <div className="lesson-content-flow">{blocks.map((block) => <LessonBlockRenderer key={block.id} block={block.type === "video" ? withVideoId(block) : block} lesson={lesson} video={video} admin={admin} onPdfViewed={onPdfViewed} />)}</div>;

  const activeVideo = playableVideos.find((block) => block.id === activeVideoId) ?? playableVideos[0];
  let playlistInserted = false;
  return <div className="lesson-content-flow lesson-tab-content-with-videos">
    {blocks.map((block) => {
      if (block.type === "video" && playableVideos.some((item) => item.id === block.id)) {
        if (playlistInserted) return null;
        playlistInserted = true;
        return <section className="lesson-video-playlist" key="lesson-video-playlist" aria-label="Lesson video parts">
          <aside className="lesson-video-picker">
            <h2>Lesson parts</h2>
            <nav aria-label="Choose a video part">
              {playableVideos.map((item, index) => <button key={item.id} className={item.id === activeVideo.id ? "active" : ""} aria-current={item.id === activeVideo.id ? "true" : undefined} onClick={() => setActiveVideoId(item.id)}>
                <span className="video-part-number">{String(index + 1).padStart(2, "0")}</span>
                <span>Part {index + 1}</span>
              </button>)}
            </nav>
          </aside>
          <div className="lesson-video-stage">
            <LessonBlockRenderer key={activeVideo.id} block={withVideoId(activeVideo)} lesson={lesson} video={video} admin={admin} onPdfViewed={onPdfViewed} />
          </div>
        </section>;
      }
      return <LessonBlockRenderer key={block.id} block={block} lesson={lesson} video={video} admin={admin} onPdfViewed={onPdfViewed} />;
    })}
  </div>;
}
