import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export function useLessonImageUrl(lessonId: string, path?: string, admin = false) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    setUrl("");
    if (path?.startsWith("data:image/")) { setUrl(path); return () => { active = false; }; }
    if (!path?.startsWith("lessons/images/")) return () => { active = false; };
    void api.lessonImageUrl(lessonId, path, admin)
      .then((result) => { if (active && result?.url) setUrl(result.url); })
      .catch(() => { if (active) setUrl(""); });
    return () => { active = false; };
  }, [lessonId, path, admin]);
  return url;
}
