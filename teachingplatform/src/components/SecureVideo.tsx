import { useEffect, useRef, useState } from "react";
import { LockKey, MonitorPlay } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { useLocale } from "../context/LocaleContext";
export function SecureVideo({ lessonId, videoId, locked, onWatched, admin = false }: { lessonId: string; videoId?: string; locked: boolean; onWatched: () => Promise<void>; admin?: boolean }) {
  const { tx } = useLocale();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loading, setLoading] = useState(false);
  const [playback, setPlayback] = useState<{ url: string; student_name: string; student_code: string } | null>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: 12, left: 14 });
  const [now, setNow] = useState(() => new Date().toLocaleString());
  const [error, setError] = useState("");
  useEffect(() => {
    const iframe = iframeRef.current; if (!playback || !iframe) return;
    let recorded = false;
    const onTime = (raw: unknown) => {
      try {
        const timing = typeof raw === "string" ? JSON.parse(raw) : raw as { seconds?: number; duration?: number };
        if (!recorded && timing.duration && (timing.seconds ?? 0) / timing.duration >= 0.9) {
          recorded = true;
          void onWatched();
        }
      } catch { /* Ignore malformed player timing messages. */ }
    };
    type BunnyPlayer = { on: (event: string, callback: (data: unknown) => void) => void };
    type PlayerJsWindow = Window & { playerjs?: { Player: new (frame: HTMLIFrameElement) => BunnyPlayer } };
    let player: BunnyPlayer | undefined;
    let disposed = false;
    const connect = () => {
      const Player = (window as PlayerJsWindow).playerjs?.Player;
      if (disposed || !Player || player) return;
      player = new Player(iframe);
      player.on("timeupdate", onTime);
    };
    let script = document.querySelector<HTMLScriptElement>("script[data-bunny-playerjs]");
    if (!(window as PlayerJsWindow).playerjs) {
      if (!script) {
        script = document.createElement("script");
        script.src = "https://assets.mediadelivery.net/playerjs/player-0.1.0.min.js";
        script.async = true;
        script.dataset.bunnyPlayerjs = "true";
        document.head.appendChild(script);
      }
      script.addEventListener("load", connect);
    } else connect();
    return () => { disposed = true; script?.removeEventListener("load", connect); };
  }, [playback, onWatched]);
  useEffect(() => { const timer = window.setInterval(() => { setNow(new Date().toLocaleString()); setWatermarkPos({ top: 8 + Math.floor(Math.random() * 70), left: 8 + Math.floor(Math.random() * 70) }); }, 30_000); return () => window.clearInterval(timer); }, []);
  async function start() { setLoading(true); setError(""); try { const result = admin ? await api.adminVideoUrl(lessonId, videoId) : await api.getVideoToken(lessonId, videoId); setPlayback(result ? { ...result, student_name: "Teacher preview", student_code: "PREVIEW" } : null); } catch (err) { setError(err instanceof Error ? err.message : "Secure playback is unavailable."); } finally { setLoading(false); } }
  return <div className={`secure-player ${locked ? "content-obscured" : ""}`}>
    {playback ? <div className="bunny-video-wrap"><iframe ref={iframeRef} src={playback.url} title="Secure lesson video" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen /><div className="player-watermark" style={{ top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%` }}>{playback.student_name} · {playback.student_code} · {now}</div></div> : <><button aria-label={tx("Play secure lesson", "تشغيل الدرس الآمن")} onClick={start} disabled={loading}><MonitorPlay weight="fill" /></button><span>{loading ? "Preparing secure playback…" : "Secure video lesson"}</span><small>{tx("A short-lived Bunny Stream playback URL is created when you start.", "يتم إنشاء رابط تشغيل قصير الصلاحية عند البدء.")}</small></>}
    {error && <p className="player-error">{error}</p>}
    {locked && <div className="devtools-notice"><LockKey weight="fill" /> {tx("Playback paused while developer tools are open.", "تم إيقاف التشغيل أثناء فتح أدوات المطوّر.")}</div>}
  </div>;
}
