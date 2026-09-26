export type CaptureEventType = "SCREEN_SHARING_DETECTED" | "SCREEN_SHARING_ENDED";
type CapabilityStatus = "SUPPORTED" | "PARTIALLY_SUPPORTED" | "DETECTION_ONLY" | "NOT_SUPPORTED" | "UNKNOWN";

export type CaptureCapabilities = {
  platform: "web";
  screenshotPrevention: CapabilityStatus;
  screenshotDetection: CapabilityStatus;
  recordingPrevention: CapabilityStatus;
  recordingDetection: CapabilityStatus;
  screenShareDetection: CapabilityStatus;
};

export function getCaptureCapabilities(): CaptureCapabilities {
  const canCaptureDisplay = typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getDisplayMedia);
  return {
    platform: "web",
    screenshotPrevention: "NOT_SUPPORTED",
    screenshotDetection: "NOT_SUPPORTED",
    recordingPrevention: "NOT_SUPPORTED",
    recordingDetection: canCaptureDisplay ? "PARTIALLY_SUPPORTED" : "NOT_SUPPORTED",
    screenShareDetection: canCaptureDisplay ? "PARTIALLY_SUPPORTED" : "NOT_SUPPORTED",
  };
}

type CaptureDetail = { type: CaptureEventType; source: "getDisplayMedia" };
const eventName = "lesson-portal:capture-state";
let monitorCount = 0;
let originalGetDisplayMedia: MediaDevices["getDisplayMedia"] | undefined;
let activeStreams = 0;

function announce(detail: CaptureDetail) {
  window.dispatchEvent(new CustomEvent<CaptureDetail>(eventName, { detail }));
}

/**
 * Observes display capture started through this page's JavaScript realm only.
 * It cannot observe OS/browser screenshot shortcuts, browser UI, extensions,
 * external capture applications, or calls made in another realm.
 */
export function installWebCaptureMonitor() {
  monitorCount += 1;
  const mediaDevices = navigator.mediaDevices;
  if (monitorCount === 1 && mediaDevices?.getDisplayMedia) {
    originalGetDisplayMedia = mediaDevices.getDisplayMedia.bind(mediaDevices);
    try {
      mediaDevices.getDisplayMedia = async (...args: Parameters<MediaDevices["getDisplayMedia"]>) => {
        const stream = await originalGetDisplayMedia!(...args);
        activeStreams += 1;
        announce({ type: "SCREEN_SHARING_DETECTED", source: "getDisplayMedia" });
        let released = false;
        const release = () => {
          if (released) return;
          released = true;
          activeStreams = Math.max(0, activeStreams - 1);
          if (activeStreams === 0) announce({ type: "SCREEN_SHARING_ENDED", source: "getDisplayMedia" });
        };
        for (const track of stream.getTracks()) track.addEventListener("ended", release, { once: true });
        return stream;
      };
    } catch {
      originalGetDisplayMedia = undefined;
    }
  }

  return () => {
    monitorCount = Math.max(0, monitorCount - 1);
    if (monitorCount === 0 && originalGetDisplayMedia && mediaDevices) {
      try { mediaDevices.getDisplayMedia = originalGetDisplayMedia; } catch { /* Browser may expose a readonly method. */ }
      originalGetDisplayMedia = undefined;
    }
  };
}

export function subscribeToCaptureEvents(listener: (detail: CaptureDetail) => void) {
  const handler = (event: Event) => listener((event as CustomEvent<CaptureDetail>).detail);
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}
