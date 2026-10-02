import { useEffect, useRef, useState } from "react";
import { GlobalWorkerOptions, getDocument, type PDFDocumentLoadingTask, type PDFDocumentProxy } from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { api } from "../lib/api";

GlobalWorkerOptions.workerSrc = workerUrl;

export function PdfPageReader({ lessonId, documentPath, admin = false, onViewed }: { lessonId: string; documentPath?: string; admin?: boolean; onViewed?: () => void }) {
  const stackRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef(new Map<number, HTMLCanvasElement>());
  const onViewedRef = useRef(onViewed);
  onViewedRef.current = onViewed;
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const scale = 1.15;
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [rendering, setRendering] = useState(false);
  const [firstPageRendered, setFirstPageRendered] = useState(false);

  useEffect(() => {
    let active = true;
    let loadingTask: PDFDocumentLoadingTask | undefined;
    setLoading(true);
    setRendering(false);
    setFirstPageRendered(false);
    setError("");
    (async () => {
      try {
        const result = documentPath
          ? admin ? await api.adminDocumentUrl(lessonId, documentPath) : await api.getDocumentUrl(lessonId, documentPath)
          : admin ? await api.adminPdfUrl(lessonId) : await api.getPdfUrl(lessonId);
        if (!result?.url) throw new Error("This lesson has no PDF attached.");
        loadingTask = getDocument({ url: result.url });
        const loaded = await loadingTask.promise;
        if (!active) { await loadingTask.destroy(); return; }
        setDoc(loaded);
        setRendering(loaded.numPages > 0);
        setError("");
        setLoading(false);
        onViewedRef.current?.();
      } catch (e) {
        if (active) {
          setError(e instanceof Error ? e.message : "Could not load the document.");
          setLoading(false);
        }
      }
    })();
    return () => { active = false; if (loadingTask) void loadingTask.destroy(); };
  }, [lessonId, documentPath, admin]);

  useEffect(() => {
    if (!doc) return;
    let active = true;
    (async () => {
      for (let number = 1; number <= doc.numPages; number += 1) {
        const canvas = canvasRefs.current.get(number);
        if (!canvas) continue;
        const pdfPage = await doc.getPage(number);
        if (!active) return;
        const viewport = pdfPage.getViewport({ scale });
        const context = canvas.getContext("2d");
        if (!context) continue;
        const ratio = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = `${viewport.width}px`;
        canvas.style.height = `${viewport.height}px`;
        context.setTransform(ratio, 0, 0, ratio, 0, 0);
        await pdfPage.render({ canvas, canvasContext: context, viewport }).promise;
        if (number === 1 && active) setFirstPageRendered(true);
      }
      if (active) setRendering(false);
    })().catch((e) => {
      if (active) {
        setError(e instanceof Error ? e.message : "Could not render this page.");
        setRendering(false);
      }
    });
    return () => { active = false; };
  }, [doc]);

  const isBusy = loading || (rendering && !firstPageRendered);
  return <div className="pdf-reader" aria-busy={isBusy}>
    {error && <p className="form-error" role="alert">{error}</p>}
    {isBusy && <p className="document-reader-loading" role="status"><span className="ui-spinner" aria-hidden="true" />{loading ? "Opening PDF…" : "Rendering PDF…"}</p>}
    {doc && <>
      <div className="pdf-page-wrap" ref={stackRef}>
        <div className="pdf-page-stack">
          {Array.from({ length: doc.numPages }, (_, index) => index + 1).map((number) => <div className="pdf-page-frame" key={number}>
            <canvas ref={(canvas) => { if (canvas) canvasRefs.current.set(number, canvas); else canvasRefs.current.delete(number); }} />
          </div>)}
        </div>
      </div>
    </>}
  </div>;
}
