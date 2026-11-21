import { jsPDF } from 'jspdf';
import { toPng } from 'html-to-image';

export interface DownloadDenahRuangPdfOptions {
  posterEl: HTMLElement;
  rosterEl?: HTMLElement | null;
  fileName: string;
}

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

async function captureElementAsPng(el: HTMLElement): Promise<{ dataUrl: string; width: number; height: number }> {
  const restoreImages = await inlineExternalImages(el);
  const restoreHidden = temporarilyHidePrintHidden(el);

  try {
    // Allow browser to reflow after hiding editor-only controls & inlining images
    await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));

    const captureWidth = Math.max(Math.ceil(el.scrollWidth), Math.ceil(el.getBoundingClientRect().width), 960);
    const captureHeight = Math.max(Math.ceil(el.scrollHeight), Math.ceil(el.getBoundingClientRect().height));

    const filter = (node: HTMLElement | Node): boolean => {
      if (node instanceof HTMLElement && node.classList.contains('print:hidden')) {
        return false;
      }
      return true;
    };

    const dataUrl = await toPng(el, {
      width: captureWidth,
      height: captureHeight,
      pixelRatio: 2.25,
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
  } finally {
    restoreHidden();
    restoreImages();
  }
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

export async function downloadDenahRuangPdf(options: DownloadDenahRuangPdfOptions): Promise<void> {
  const { posterEl, rosterEl, fileName } = options;

  const posterCapture = await captureElementAsPng(posterEl);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  // Page 1: Full-width high-resolution Denah Poster (A4 Landscape)
  addFittedImageToPage(doc, posterCapture.dataUrl, posterCapture.width, posterCapture.height, 7, 'center');

  // Page 2 (optional): Daftar Nama Siswa di Ruang Ujian if visible below poster
  if (rosterEl && rosterEl.offsetHeight > 0) {
    const rosterCapture = await captureElementAsPng(rosterEl);
    const rosterAspect = rosterCapture.width / Math.max(1, rosterCapture.height);
    const rosterOrientation: 'landscape' | 'portrait' = rosterAspect >= 1.15 ? 'landscape' : 'portrait';
    doc.addPage('a4', rosterOrientation);
    addFittedImageToPage(doc, rosterCapture.dataUrl, rosterCapture.width, rosterCapture.height, 8, 'top');
  }

  doc.save(fileName);
}
