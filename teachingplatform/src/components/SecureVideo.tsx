import { useEffect, useRef, useState } from "react";
import { LockKey, MonitorPlay, Play } from "@phosphor-icons/react";
import { api } from "../lib/api";
import { useLocale } from "../context/LocaleContext";
import { subscribeToCaptureEvents } from "../lib/captureProtection";

type BunnyPlayer = {
  on: (event: string, callback: (data: unknown) => void) => void;
  pause?: () => void;
  play?: () => void;
};
type PlayerJsWindow = Window & { playerjs?: { Player: new (frame: HTMLIFrameElement) => BunnyPlayer } };

export function SecureVideo({ lessonId, videoId, locked, onWatched, admin = false, watermarkCode = "", autoLoad = false }: {
  lessonId: string; videoId?: string; locked: boolean; onWatched?: () => Promise<void>; admin?: boolean; watermarkCode?: string; autoLoad?: boolean;
}) {
  const { tx } = useLocale();
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<BunnyPlayer | null>(null);
  const wasPlayingRef = useRef(false);
  const resumeAfterCaptureRef = useRef(false);
  const [loading, setLoading] = useState(false);
  const [playback, setPlayback] = useState<{ url: string; expires_in: number } | null>(null);
  const [watermarkPos, setWatermarkPos] = useState({ top: 12, left: 14 });
  const [now, setNow] = useState(() => new Date().toLocaleString());
  const [error, setError] = useState("");

  useEffect(() => {
    if (!autoLoad || !videoId) return;
    let active = true;
    setLoading(true);
    setError("");
    void (async () => {
      try {
        const result = await api.getVideoToken(lessonId, videoId);
        if (active) setPlayback(result);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "Secure playback is unavailable.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [autoLoad, lessonId, videoId]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!playback || !iframe) return;
    let recorded = false;
    const onTime = (raw: unknown) => {
      try {
        const timing = typeof raw === "string" ? JSON.parse(raw) : raw as { seconds?: number; duration?: number };
        if (!recorded && timing.duration && (timing.seconds ?? 0) / timing.duration >= 0.9) {
          recorded = true;
          if (onWatched) void onWatched();
        }
      } catch { /* Ignore malformed player timing messages. */ }
    };
    let disposed = false;
    let player: BunnyPlayer | undefined;
    const connect = () => {
      const Player = (window as PlayerJsWindow).playerjs?.Player;
      if (disposed || !Player || player) return;
      player = new Player(iframe);
      playerRef.current = player;
      player.on("timeupdate", onTime);
      player.on("play", () => { wasPlayingRef.current = true; });
      player.on("pause", () => { if (!resumeAfterCaptureRef.current) wasPlayingRef.current = false; });
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
    return () => { disposed = true; playerRef.current = null; script?.removeEventListener("load", connect); };
  }, [playback, onWatched]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date().toLocaleString());
      setWatermarkPos({ top: 8 + Math.floor(Math.random() * 70), left: 8 + Math.floor(Math.random() * 70) });
    }, 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => subscribeToCaptureEvents((event) => {
    if (event.type === "SCREEN_SHARING_ENDED") {
      if (resumeAfterCaptureRef.current && !locked) playerRef.current?.play?.();
      resumeAfterCaptureRef.current = false;
      return;
    }
    resumeAfterCaptureRef.current = wasPlayingRef.current;
    playerRef.current?.pause?.();
  }), [locked]);

  async function start() {
    setLoading(true);
    setError("");
    try {
      const result = admin ? await api.adminVideoUrl(lessonId, videoId) : await api.getVideoToken(lessonId, videoId);
      setPlayback(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Secure playback is unavailable.");
    } finally { setLoading(false); }
  }

  return <div className={`secure-player ${locked ? "content-obscured" : ""}${autoLoad ? " auto-preview" : ""}`}>
    {playback ? <div className="bunny-video-wrap">
      <iframe ref={iframeRef} src={playback.url} title="Secure lesson video" allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />
      {watermarkCode && <div className="player-watermark" style={{ top: `${watermarkPos.top}%`, left: `${watermarkPos.left}%` }}>{watermarkCode} · {now}</div>}
    </div> : <>
      <button aria-label={tx("Play secure lesson", "ØªØ´ØºÙŠÙ„ Ø§Ù„Ø¯Ø±Ø³ Ø§Ù„Ø¢Ù…Ù†")} onClick={start} disabled={loading}>{autoLoad ? <Play weight="fill" /> : <MonitorPlay weight="fill" />}</button>
      <span>{loading && <span className="ui-spinner" aria-hidden="true" />}{loading ? "Preparing secure playback…" : "Secure video lesson"}</span>
      <small>{tx("A short-lived Bunny Stream playback URL is created when you start.", "ÙŠØªÙ… Ø¥Ù†Ø´Ø§Ø¡ Ø±Ø§Ø¨Ø· ØªØ´ØºÙŠÙ„ Ù‚ØµÙŠØ± Ø§Ù„ØµÙ„Ø§Ø­ÙŠØ© Ø¹Ù†Ø¯ Ø§Ù„Ø¨Ø¯Ø¡.")}</small>
    </>}
    {error && <p className="player-error">{error}</p>}
    {locked && <div className="devtools-notice"><LockKey weight="fill" /> {tx("Playback paused while developer tools are open.", "ØªÙ… Ø¥ÙŠÙ‚Ø§Ù Ø§Ù„ØªØ´ØºÙŠÙ„ Ø£Ø«Ù†Ø§Ø¡ ÙØªØ­ Ø£Ø¯ÙˆØ§Øª Ø§Ù„Ù…Ø·ÙˆÙ‘Ø±.")}</div>}
  </div>;
}
