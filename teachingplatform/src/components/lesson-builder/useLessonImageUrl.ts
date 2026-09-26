import { useEffect, useState } from "react";
import { api } from "../../lib/api";

export function useLessonImageUrl(lessonId: string, path?: string, admin = false) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setUrl("");
    if (path?.startsWith("data:image/")) { setUrl(path); setLoading(false); return () => { active = false; }; }
    if (!path?.startsWith("lessons/images/")) { setLoading(false); return () => { active = false; }; }
    setLoading(true);
    void api.lessonImageUrl(lessonId, path, admin)
      .then((result) => { if (active && result?.url) setUrl(result.url); })
      .catch(() => { if (active) setUrl(""); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [lessonId, path, admin]);
  return { url, loading };
}
