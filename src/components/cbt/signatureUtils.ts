import { useEffect, useState } from 'react';

const enhancedSignatureCache = new Map<string, Promise<string>>();

interface TrimBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

function findSignatureBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): TrimBounds {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = rowOffset + x * 4;
      const a = data[i + 3];
      if (a <= 14) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      // Treat near-white low-saturation background as empty margin
      const maxC = Math.max(r, g, b);
      const minC = Math.min(r, g, b);
      const isNearWhite = minC > 236 && maxC - minC < 18;
      if (isNearWhite) continue;

      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) {
    return { x: 0, y: 0, w: width, h: height };
  }

  const contentW = maxX - minX + 1;
  const contentH = maxY - minY + 1;
  const padX = Math.max(2, Math.round(contentW * 0.025));
  const padY = Math.max(2, Math.round(contentH * 0.025));

  const rx = Math.max(0, minX - padX);
  const ry = Math.max(0, minY - padY);
  const rMaxX = Math.min(width - 1, maxX + padX);
  const rMaxY = Math.min(height - 1, maxY + padY);

  return {
    x: rx,
    y: ry,
    w: Math.max(1, rMaxX - rx + 1),
    h: Math.max(1, rMaxY - ry + 1)
  };
}

function clampByte(v: number): number {
  return v < 0 ? 0 : v > 255 ? 255 : Math.round(v);
}

/**
 * Enhances scanned or upscaled signatures & school stamps for crisp print/display:
 * 1. Composites transparently onto virtual white before sharpening (prevents dark halos)
 * 2. Runs a 5x5 Gaussian unsharp mask to restore crisp stroke & stamp edges
 * 3. Applies an ink-darkening levels curve on neutral gray pen strokes so faint
 *    handwritten signatures become bold, crisp dark ink while preserving vivid
 *    colored stamps (e.g. green school stamp) and pure transparent background.
 */
function sharpenAndCleanSignatureCanvas(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number
): void {
  const imgData = ctx.getImageData(0, 0, w, h);
  const raw = imgData.data;
  const totalPixels = w * h;

  // Step 1: Composite over pure white into a flat RGB buffer so transparent
  // neighbors never bleed black into the unsharp mask.
  const whiteComp = new Float32Array(totalPixels * 3);
  for (let p = 0; p < totalPixels; p++) {
    const ri = p * 4;
    const wi = p * 3;
    const alpha = raw[ri + 3] / 255;
    const inv = 1 - alpha;
    whiteComp[wi] = raw[ri] * alpha + 255 * inv;
    whiteComp[wi + 1] = raw[ri + 1] * alpha + 255 * inv;
    whiteComp[wi + 2] = raw[ri + 2] * alpha + 255 * inv;
  }

  // Step 2: Separable 5-tap Gaussian blur [1, 4, 6, 4, 1] / 16 (radius 2)
  const temp = new Float32Array(totalPixels * 3);
  const blurred = new Float32Array(totalPixels * 3);
  const weights = [1, 4, 6, 4, 1];

  // Horizontal pass
  for (let y = 0; y < h; y++) {
    const rowBase = y * w;
    for (let x = 0; x < w; x++) {
      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      for (let k = -2; k <= 2; k++) {
        const sx = x + k < 0 ? 0 : x + k >= w ? w - 1 : x + k;
        const si = (rowBase + sx) * 3;
        const wt = weights[k + 2];
        rAcc += whiteComp[si] * wt;
        gAcc += whiteComp[si + 1] * wt;
        bAcc += whiteComp[si + 2] * wt;
      }
      const di = (rowBase + x) * 3;
      temp[di] = rAcc / 16;
      temp[di + 1] = gAcc / 16;
      temp[di + 2] = bAcc / 16;
    }
  }

  // Vertical pass
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let rAcc = 0;
      let gAcc = 0;
      let bAcc = 0;
      for (let k = -2; k <= 2; k++) {
        const sy = y + k < 0 ? 0 : y + k >= h ? h - 1 : y + k;
        const si = (sy * w + x) * 3;
        const wt = weights[k + 2];
        rAcc += temp[si] * wt;
        gAcc += temp[si + 1] * wt;
        bAcc += temp[si + 2] * wt;
      }
      const di = (y * w + x) * 3;
      blurred[di] = rAcc / 16;
      blurred[di + 1] = gAcc / 16;
      blurred[di + 2] = bAcc / 16;
    }
  }

  // Step 3: Unsharp mask + selective pen-ink darkening & stamp crispness
  const unsharpAmount = 1.25;
  for (let p = 0; p < totalPixels; p++) {
    const wi = p * 3;
    const ri = p * 4;

    const r = clampByte(whiteComp[wi] + (whiteComp[wi] - blurred[wi]) * unsharpAmount);
    const g = clampByte(whiteComp[wi + 1] + (whiteComp[wi + 1] - blurred[wi + 1]) * unsharpAmount);
    const b = clampByte(whiteComp[wi + 2] + (whiteComp[wi + 2] - blurred[wi + 2]) * unsharpAmount);

    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    const sat = maxC - minC;
    const lum = 0.299 * r + 0.587 * g + 0.114 * b;

    // Clean pure-white / paper haze to transparent
    if (minC > 232 && sat < 18) {
      raw[ri] = 255;
      raw[ri + 1] = 255;
      raw[ri + 2] = 255;
      raw[ri + 3] = 0;
      continue;
    }

    if (sat < 28) {
      // Neutral gray/black handwritten pen stroke -> deepen into crisp, dark black ink
      const blackPt = 52;
      const whitePt = 232;
      const norm = Math.max(0, Math.min(1, (lum - blackPt) / (whitePt - blackPt)));
      if (norm >= 1) {
        raw[ri + 3] = 0;
        continue;
      }
      const inkStrength = 1 - norm;
      const inkVal = clampByte(10 + Math.pow(norm, 1.35) * 48);
      const outAlpha = clampByte(Math.min(255, Math.pow(inkStrength, 0.42) * 255 * 1.38));

      raw[ri] = inkVal;
      raw[ri + 1] = inkVal;
      raw[ri + 2] = inkVal;
      raw[ri + 3] = outAlpha;
    } else {
      // Colored school stamp (e.g. green / blue / purple) -> deepen & crisp without washing out
      const deepen = (ch: number) =>
        clampByte(255 - 255 * Math.pow(Math.max(0, (255 - ch) / 255), 0.76));
      let dr = deepen(r);
      let dg = deepen(g);
      let db = deepen(b);

      // Gentle saturation boost so stamp color & lettering pop cleanly
      const dLum = 0.299 * dr + 0.587 * dg + 0.114 * db;
      const satBoost = 1.14;
      dr = clampByte(dLum + (dr - dLum) * satBoost);
      dg = clampByte(dLum + (dg - dLum) * satBoost);
      db = clampByte(dLum + (db - dLum) * satBoost);

      const distFromWhite = 255 - minC;
      const outAlpha =
        distFromWhite < 28
          ? clampByte((distFromWhite / 28) * 255)
          : 255;

      raw[ri] = dr;
      raw[ri + 1] = dg;
      raw[ri + 2] = db;
      raw[ri + 3] = outAlpha;
    }
  }

  ctx.putImageData(imgData, 0, 0);
}

function loadHtmlImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    let settled = false;
    const done = (val: HTMLImageElement | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };
    const timer = window.setTimeout(() => done(null), 3000);
    img.onload = () => {
      window.clearTimeout(timer);
      done(img);
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      done(null);
    };
    img.src = src;
  });
}

/**
 * Processes a newly uploaded or canvas-drawn signature image for high-resolution storage:
 * - Preserves up to 1600x800 resolution (no more 180px blur!)
 * - Auto-trims empty transparent / near-white outer margins
 * - Keeps payload safe for Firestore (< 450KB)
 */
export async function processSignatureForStorage(rawSrc: string): Promise<string> {
  if (typeof document === 'undefined') return rawSrc;
  const img = await loadHtmlImage(rawSrc);
  if (!img) return rawSrc;

  const natW = img.naturalWidth || img.width;
  const natH = img.naturalHeight || img.height;
  if (!natW || !natH) return rawSrc;

  try {
    const probeScale = Math.min(1, 1600 / Math.max(natW, natH));
    const pw = Math.max(1, Math.round(natW * probeScale));
    const ph = Math.max(1, Math.round(natH * probeScale));

    const probeCanvas = document.createElement('canvas');
    probeCanvas.width = pw;
    probeCanvas.height = ph;
    const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });
    if (!probeCtx) return rawSrc;

    probeCtx.imageSmoothingEnabled = true;
    probeCtx.imageSmoothingQuality = 'high';
    probeCtx.drawImage(img, 0, 0, pw, ph);

    const probeData = probeCtx.getImageData(0, 0, pw, ph);
    const bounds = findSignatureBounds(probeData.data, pw, ph);

    const sx = bounds.x / probeScale;
    const sy = bounds.y / probeScale;
    const sw = bounds.w / probeScale;
    const sh = bounds.h / probeScale;

    const maxCandidates: Array<[number, number]> = [
      [1600, 800],
      [1200, 600],
      [960, 480],
      [760, 380]
    ];

    for (const [maxW, maxH] of maxCandidates) {
      const scale = Math.min(maxW / sw, maxH / sh, 1);
      const outW = Math.max(1, Math.round(sw * scale));
      const outH = Math.max(1, Math.round(sh * scale));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d');
      if (!outCtx) return rawSrc;

      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.clearRect(0, 0, outW, outH);
      outCtx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

      const dataUrl = outCanvas.toDataURL('image/png');
      if (dataUrl.length <= 460_000 || maxH === 380) {
        return dataUrl;
      }
    }
    return rawSrc;
  } catch {
    return rawSrc;
  }
}

/**
 * Enhances a signature/stamp image for display, printing, and PDF export:
 * - Auto-trims empty margins so the signature fills 100% of its box
 * - Cleanly upscales legacy low-res signatures and applies 5x5 unsharp mask + ink clarity pass
 * - Cached in memory per source URL for instant reuse across 250+ student cards
 */
export function enhanceSignatureForDisplay(url?: string): Promise<string> {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl || typeof document === 'undefined') {
    return Promise.resolve(cleanUrl);
  }

  const cached = enhancedSignatureCache.get(cleanUrl);
  if (cached) return cached;

  const task = (async () => {
    const img = await loadHtmlImage(cleanUrl);
    if (!img) return cleanUrl;

    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;
    if (!natW || !natH) return cleanUrl;

    try {
      // 1. Probe tight bounding box
      const probeCanvas = document.createElement('canvas');
      probeCanvas.width = natW;
      probeCanvas.height = natH;
      const probeCtx = probeCanvas.getContext('2d', { willReadFrequently: true });
      if (!probeCtx) return cleanUrl;

      probeCtx.drawImage(img, 0, 0, natW, natH);
      const probeData = probeCtx.getImageData(0, 0, natW, natH);
      const bounds = findSignatureBounds(probeData.data, natW, natH);

      // 2. Crisp working size (upscale legacy small uploads cleanly up to 520px tall)
      const minTargetH = 520;
      const maxTargetDim = 1400;
      let scale = 1;
      if (bounds.h < minTargetH) {
        scale = Math.min(3.2, minTargetH / bounds.h);
      }
      if (Math.max(bounds.w * scale, bounds.h * scale) > maxTargetDim) {
        scale = maxTargetDim / Math.max(bounds.w, bounds.h);
      }

      const outW = Math.max(1, Math.round(bounds.w * scale));
      const outH = Math.max(1, Math.round(bounds.h * scale));

      const outCanvas = document.createElement('canvas');
      outCanvas.width = outW;
      outCanvas.height = outH;
      const outCtx = outCanvas.getContext('2d', { willReadFrequently: true });
      if (!outCtx) return cleanUrl;

      outCtx.imageSmoothingEnabled = true;
      outCtx.imageSmoothingQuality = 'high';
      outCtx.clearRect(0, 0, outW, outH);
      outCtx.drawImage(
        img,
        bounds.x,
        bounds.y,
        bounds.w,
        bounds.h,
        0,
        0,
        outW,
        outH
      );

      // 3. Apply 5x5 white-composited unsharp mask + ink/stamp clarity curve
      sharpenAndCleanSignatureCanvas(outCtx, outW, outH);

      return outCanvas.toDataURL('image/png');
    } catch {
      return cleanUrl;
    }
  })();

  enhancedSignatureCache.set(cleanUrl, task);
  return task;
}

/**
 * React hook returning the trimmed & sharpened signature URL once ready.
 */
export function useEnhancedSignature(url?: string): string | undefined {
  const [enhancedUrl, setEnhancedUrl] = useState<string | undefined>(url);

  useEffect(() => {
    const clean = (url || '').trim();
    if (!clean) {
      setEnhancedUrl(undefined);
      return;
    }
    let cancelled = false;
    setEnhancedUrl(clean);
    enhanceSignatureForDisplay(clean).then(res => {
      if (!cancelled && res) {
        setEnhancedUrl(res);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return enhancedUrl;
}
