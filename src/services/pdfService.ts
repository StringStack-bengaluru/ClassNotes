import * as pdfjs from 'pdfjs-dist';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const documentCache = new Map<string, Promise<pdfjs.PDFDocumentProxy>>();
const pageRenderCache = new Map<string, ImageBitmap>();

function cacheKey(pdfUrl: string, pageNumber: number, scale: number): string {
  return `${pdfUrl}::${pageNumber}::${scale.toFixed(2)}`;
}

export async function getPdfDocument(pdfUrl: string): Promise<pdfjs.PDFDocumentProxy> {
  const existing = documentCache.get(pdfUrl);
  if (existing) return existing;

  const loadingTask = pdfjs.getDocument({ url: pdfUrl });
  const promise = loadingTask.promise;
  documentCache.set(pdfUrl, promise);
  return promise;
}

export async function getPdfPageCount(pdfUrl: string): Promise<number> {
  const doc = await getPdfDocument(pdfUrl);
  return doc.numPages;
}

export async function renderPdfPageToCanvas(
  pdfUrl: string,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  scale: number,
): Promise<void> {
  const key = cacheKey(pdfUrl, pageNumber, scale);
  const cached = pageRenderCache.get(key);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  if (cached) {
    canvas.width = cached.width;
    canvas.height = cached.height;
    ctx.drawImage(cached, 0, 0);
    return;
  }

  const doc = await getPdfDocument(pdfUrl);
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  await page.render({ canvas, canvasContext: ctx, viewport }).promise;

  try {
    const bitmap = await createImageBitmap(canvas);
    pageRenderCache.set(key, bitmap);

    if (pageRenderCache.size > 120) {
      const firstKey = pageRenderCache.keys().next().value;
      if (firstKey) pageRenderCache.delete(firstKey);
    }
  } catch {
    // ImageBitmap may be unavailable in some environments
  }
}

export function clearPdfCache(): void {
  pageRenderCache.clear();
  documentCache.clear();
}

export function preloadPdfPages(pdfUrl: string, pageNumbers: number[], scale: number): void {
  const offscreen = document.createElement('canvas');

  for (const pageNumber of pageNumbers) {
    void renderPdfPageToCanvas(pdfUrl, pageNumber, offscreen, scale).catch(() => {
      // Preload failures are non-fatal
    });
  }
}
