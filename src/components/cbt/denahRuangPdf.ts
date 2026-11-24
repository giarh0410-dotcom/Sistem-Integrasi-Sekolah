import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export type DenahPdfOrientation = 'auto' | 'portrait' | 'landscape';

export interface DownloadDenahRuangPdfOptions {
  posterEl: HTMLElement;
  rosterEl?: HTMLElement | null;
  fileName: string;
  orientation?: DenahPdfOrientation;
}

export interface DownloadDenahRuangPdfResult {
  usedOrientation: 'portrait' | 'landscape';
}

const A4_SHORT_MM = 210;
const A4_LONG_MM = 297;
const POSTER_MARGIN_MM = 3.5;
const ROSTER_MARGIN_MM = 5;

const FALLBACK_LOGO_DATA_URL =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">' +
      '<circle cx="50" cy="50" r="46" fill="#0c3f7e"/>' +
      '<text x="50" y="62" font-size="36" fill="white" text-anchor="middle" font-weight="bold" font-family="sans-serif">AF</text>' +
    '</svg>'
  );

async function urlToInlineDataUrl(src: string): Promise<string | null> {
  if (!src || src.startsWith('data:')) return src;

  // Attempt 1: fetch -> blob -> dataURL (works for same-origin and CORS-enabled CDNs)
  try {
    const res = await fetch(src, { mode: 'cors', cache: 'force-cache' });
    if (res.ok) {
      const blob = await res.blob();
      const dataUrl = await new Promise<string | null>(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
      if (dataUrl) return dataUrl;
    }
  } catch {
    // Fall through to Image canvas attempt
  }

  // Attempt 2: Image with crossOrigin="anonymous" -> canvas -> PNG
  return new Promise<string | null>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 128;
        canvas.height = img.naturalHeight || img.height || 128;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function inlineExternalImages(root: HTMLElement): Promise<() => void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  const restorers: Array<() => void> = [];

  await Promise.all(
    imgs.map(async img => {
      const originalSrc = img.getAttribute('src') || '';
      if (!originalSrc || originalSrc.startsWith('data:')) return;

      const inlined = await urlToInlineDataUrl(originalSrc);
      const nextSrc = inlined || FALLBACK_LOGO_DATA_URL;
      img.setAttribute('src', nextSrc);
      restorers.push(() => {
        img.setAttribute('src', originalSrc);
      });
    })
  );

  return () => {
    restorers.forEach(fn => fn());
  };
}

function loadImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      resolve({
        width: img.naturalWidth || img.width || 1,
        height: img.naturalHeight || img.height || 1
      });
    };
    img.onerror = err => reject(err);
    img.src = dataUrl;
  });
}

function temporarilyHidePrintHidden(root: HTMLElement): () => void {
  const hiddenTargets: Array<{ el: HTMLElement; prevDisplay: string; prevPriority: string }> = [];
  const allEls = root.querySelectorAll<HTMLElement>('*');

  allEls.forEach(el => {
    if (el.classList.contains('print:hidden')) {
      hiddenTargets.push({
        el,
        prevDisplay: el.style.getPropertyValue('display'),
        prevPriority: el.style.getPropertyPriority('display')
      });
      el.style.setProperty('display', 'none', 'important');
    }
  });

  return () => {
    hiddenTargets.forEach(({ el, prevDisplay, prevPriority }) => {
      if (prevDisplay) {
        el.style.setProperty('display', prevDisplay, prevPriority);
      } else {
        el.style.removeProperty('display');
      }
    });
  };
}

interface SavedStyleProp {
  el: HTMLElement;
  prop: string;
  value: string;
  priority: string;
}

function setTempStyle(
  saved: SavedStyleProp[],
  el: HTMLElement | null,
  prop: string,
  value: string,
  priority = ''
) {
  if (!el) return;
  saved.push({
    el,
    prop,
    value: el.style.getPropertyValue(prop),
    priority: el.style.getPropertyPriority(prop)
  });
  el.style.setProperty(prop, value, priority);
}

function restoreTempStyles(saved: SavedStyleProp[]) {
  for (let i = saved.length - 1; i >= 0; i--) {
    const { el, prop, value, priority } = saved[i];
    if (value) {
      el.style.setProperty(prop, value, priority);
    } else {
      el.style.removeProperty(prop);
    }
  }
}

async function waitTwoFrames(): Promise<void> {
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
  await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
}

/**
 * Temporarily reflows the poster into a full-width A4 Portrait layout where the
 * legend (Keterangan & Ketentuan) sits cleanly side-by-side underneath the floorplan
 * while preserving the exact floorplan pixel width so any dragged table/seat offsets
 * stay in the exact same positions.
 */
function applyPortraitA4PosterLayout(posterEl: HTMLElement, floorWidthPx: number): () => void {
  const saved: SavedStyleProp[] = [];
  const bodyEl = posterEl.querySelector<HTMLElement>('[data-denah-body="true"]');
  const legendEl = posterEl.querySelector<HTMLElement>('[data-denah-legend="true"]');
  const ketentuanEl = posterEl.querySelector<HTMLElement>('[data-denah-ketentuan="true"]');
  const bannerEl = posterEl.querySelector<HTMLElement>('[data-denah-banner="true"]');
  const bannerTextEl = posterEl.querySelector<HTMLElement>('[data-denah-banner-text="true"]');
  const legendItemsEl = posterEl.querySelector<HTMLElement>('[data-denah-legend-items="true"]');

  const targetWidth = Math.max(720, Math.ceil(floorWidthPx));
  setTempStyle(saved, posterEl, 'width', `${targetWidth}px`, 'important');
  setTempStyle(saved, posterEl, 'max-width', `${targetWidth}px`, 'important');

  if (bodyEl) {
    setTempStyle(saved, bodyEl, 'display', 'flex', 'important');
    setTempStyle(saved, bodyEl, 'flex-direction', 'column', 'important');
    setTempStyle(saved, bodyEl, 'gap', '10px', 'important');
  }

  if (legendEl) {
    setTempStyle(saved, legendEl, 'display', 'grid', 'important');
    setTempStyle(saved, legendEl, 'grid-template-columns', '1fr 1.25fr', 'important');
    setTempStyle(saved, legendEl, 'gap', '10px', 'important');
    setTempStyle(saved, legendEl, 'align-items', 'stretch', 'important');
  }

  if (legendItemsEl) {
    setTempStyle(saved, legendItemsEl, 'display', 'grid', 'important');
    setTempStyle(saved, legendItemsEl, 'grid-template-columns', '1fr 1fr', 'important');
    setTempStyle(saved, legendItemsEl, 'gap', '8px 10px', 'important');
    setTempStyle(saved, legendItemsEl, 'padding', '10px 12px', 'important');
  }

  if (ketentuanEl) {
    setTempStyle(saved, ketentuanEl, 'flex', 'none', 'important');
  }

  if (bannerEl) {
    setTempStyle(saved, bannerEl, 'padding', '12px 18px', 'important');
    setTempStyle(saved, bannerEl, 'gap', '14px', 'important');
  }

  if (bannerTextEl) {
    setTempStyle(saved, bannerTextEl, 'padding-right', '12px', 'important');
  }

  return () => restoreTempStyles(saved);
}

function computeFittedScaleMmPerPx(
  imgWidthPx: number,
  imgHeightPx: number,
  orientation: 'portrait' | 'landscape',
  marginMm: number
): number {
  const pageW = orientation === 'portrait' ? A4_SHORT_MM : A4_LONG_MM;
  const pageH = orientation === 'portrait' ? A4_LONG_MM : A4_SHORT_MM;
  const maxW = pageW - marginMm * 2;
  const maxH = pageH - marginMm * 2;
  return Math.min(maxW / Math.max(1, imgWidthPx), maxH / Math.max(1, imgHeightPx));
}

async function captureElementAsPng(
  el: HTMLElement,
  opts?: { minWidth?: number; pixelRatio?: number }
): Promise<{ dataUrl: string; width: number; height: number }> {
  const minWidth = opts?.minWidth ?? 720;
  const pixelRatio = opts?.pixelRatio ?? 2.5;

  const rect = el.getBoundingClientRect();
  const captureWidth = Math.max(Math.ceil(el.scrollWidth), Math.ceil(rect.width), minWidth);
  const captureHeight = Math.max(Math.ceil(el.scrollHeight), Math.ceil(rect.height));

  const filter = (node: HTMLElement | Node): boolean => {
    if (node instanceof HTMLElement && node.classList.contains('print:hidden')) {
      return false;
    }
    return true;
  };

  const dataUrl = await toPng(el, {
    width: captureWidth,
    height: captureHeight,
    pixelRatio,
    backgroundColor: '#ffffff',
    cacheBust: false,
    skipFonts: true,
    imagePlaceholder: FALLBACK_LOGO_DATA_URL,
    filter,
    style: {
      margin: '0',
      transform: 'none',
      width: `${captureWidth}px`,
      height: `${captureHeight}px`
    }
  });

  const dims = await loadImageDimensions(dataUrl);
  return { dataUrl, width: dims.width, height: dims.height };
}

function addFittedImageToPage(
  doc: jsPDF,
  imgDataUrl: string,
  imgWidthPx: number,
  imgHeightPx: number,
  marginMm: number,
  verticalAlign: 'center' | 'top' = 'center'
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxW = pageWidth - marginMm * 2;
  const maxH = pageHeight - marginMm * 2;

  const imgRatio = imgWidthPx / Math.max(1, imgHeightPx);
  const boxRatio = maxW / maxH;

  let drawW: number;
  let drawH: number;
  if (imgRatio > boxRatio) {
    drawW = maxW;
    drawH = maxW / imgRatio;
  } else {
    drawH = maxH;
    drawW = maxH * imgRatio;
  }

  const x = (pageWidth - drawW) / 2;
  const y = verticalAlign === 'top' ? marginMm : (pageHeight - drawH) / 2;

  doc.addImage(imgDataUrl, 'PNG', x, y, drawW, drawH, undefined, 'FAST');
}

export async function downloadDenahRuangPdf(
  options: DownloadDenahRuangPdfOptions
): Promise<DownloadDenahRuangPdfResult> {
  const { posterEl, rosterEl, fileName, orientation = 'auto' } = options;

  const restoreImages = await inlineExternalImages(posterEl);
  const restoreHidden = temporarilyHidePrintHidden(posterEl);

  let posterCapture: { dataUrl: string; width: number; height: number };
  let chosenOrientation: 'portrait' | 'landscape' = 'landscape';

  try {
    await waitTwoFrames();

    const floorplanEl = posterEl.querySelector<HTMLElement>('[data-denah-floorplan="true"]');
    const landscapeRect = posterEl.getBoundingClientRect();
    const landscapeW = Math.max(Math.ceil(posterEl.scrollWidth), Math.ceil(landscapeRect.width), 920);
    const landscapeH = Math.max(Math.ceil(posterEl.scrollHeight), Math.ceil(landscapeRect.height), 1);
    const floorWidthPx = floorplanEl
      ? Math.max(Math.ceil(floorplanEl.getBoundingClientRect().width), 720)
      : Math.max(720, landscapeW - 210);

    if (orientation === 'landscape') {
      chosenOrientation = 'landscape';
      posterCapture = await captureElementAsPng(posterEl, { minWidth: 920, pixelRatio: 2.5 });
    } else if (orientation === 'portrait') {
      chosenOrientation = 'portrait';
      const restorePortrait = applyPortraitA4PosterLayout(posterEl, floorWidthPx);
      try {
        await waitTwoFrames();
        posterCapture = await captureElementAsPng(posterEl, { minWidth: 720, pixelRatio: 2.5 });
      } finally {
        restorePortrait();
      }
    } else {
      // Auto mode: compare exact physical A4 scale (mm per floorplan pixel) between
      // Landscape (sidebar right) and Portrait (legend stacked cleanly at bottom)
      const landscapeScale = computeFittedScaleMmPerPx(
        landscapeW,
        landscapeH,
        'landscape',
        POSTER_MARGIN_MM
      );

      const restorePortrait = applyPortraitA4PosterLayout(posterEl, floorWidthPx);
      try {
        await waitTwoFrames();
        const portraitRect = posterEl.getBoundingClientRect();
        const portraitW = Math.max(Math.ceil(posterEl.scrollWidth), Math.ceil(portraitRect.width), 720);
        const portraitH = Math.max(Math.ceil(posterEl.scrollHeight), Math.ceil(portraitRect.height), 1);
        const portraitScale = computeFittedScaleMmPerPx(
          portraitW,
          portraitH,
          'portrait',
          POSTER_MARGIN_MM
        );

        if (portraitScale >= landscapeScale) {
          chosenOrientation = 'portrait';
          posterCapture = await captureElementAsPng(posterEl, { minWidth: 720, pixelRatio: 2.5 });
        } else {
          restorePortrait();
          await waitTwoFrames();
          chosenOrientation = 'landscape';
          posterCapture = await captureElementAsPng(posterEl, { minWidth: 920, pixelRatio: 2.5 });
        }
      } finally {
        restorePortrait();
      }
    }
  } finally {
    restoreHidden();
    restoreImages();
  }

  const doc = new jsPDF({
    orientation: chosenOrientation,
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Page 1: Full-page high-resolution A4 HVS Denah Poster (210mm x 297mm)
  addFittedImageToPage(
    doc,
    posterCapture.dataUrl,
    posterCapture.width,
    posterCapture.height,
    POSTER_MARGIN_MM,
    'center'
  );

  // Page 2 (optional): Daftar Nama Siswa di Ruang Ujian if visible below poster
  if (rosterEl && rosterEl.offsetHeight > 0) {
    const restoreRosterImages = await inlineExternalImages(rosterEl);
    const restoreRosterHidden = temporarilyHidePrintHidden(rosterEl);
    try {
      await waitTwoFrames();
      const rosterCapture = await captureElementAsPng(rosterEl, { minWidth: 920, pixelRatio: 2.4 });
      const scalePortrait = computeFittedScaleMmPerPx(
        rosterCapture.width,
        rosterCapture.height,
        'portrait',
        ROSTER_MARGIN_MM
      );
      const scaleLandscape = computeFittedScaleMmPerPx(
        rosterCapture.width,
        rosterCapture.height,
        'landscape',
        ROSTER_MARGIN_MM
      );
      const rosterOrientation: 'portrait' | 'landscape' =
        scaleLandscape > scalePortrait ? 'landscape' : 'portrait';

      doc.addPage('a4', rosterOrientation);
      addFittedImageToPage(
        doc,
        rosterCapture.dataUrl,
        rosterCapture.width,
        rosterCapture.height,
        ROSTER_MARGIN_MM,
        'top'
      );
    } finally {
      restoreRosterHidden();
      restoreRosterImages();
    }
  }

  doc.save(fileName);
  return { usedOrientation: chosenOrientation };
}
