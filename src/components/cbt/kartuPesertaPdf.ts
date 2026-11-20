import { jsPDF } from 'jspdf';
import {
  Siswa,
  JadwalUjianItem,
  RombelKelas,
  SchoolSettings,
  CbtExamSettings
} from '../../types/school';
import { enhanceSignatureForDisplay } from './signatureUtils';

interface LoadedImageAsset {
  dataUrl: string;
  format: 'PNG' | 'JPEG';
  width: number;
  height: number;
}

function formatTanggalPenetapan(rawDate?: string): string {
  const dt = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(dt.getTime())) {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return dt.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getSortedJadwal(jadwalList: JadwalUjianItem[]): JadwalUjianItem[] {
  return [...jadwalList].sort((a, b) => {
    const cmpDate = (a.tanggal || '').localeCompare(b.tanggal || '');
    if (cmpDate !== 0) return cmpDate;
    return (a.jamMulai || '').localeCompare(b.jamMulai || '');
  });
}

function formatTanggalDMY(tanggal?: string): string {
  const tgl = (tanggal || '').trim();
  if (!tgl) return '-';
  const isoMatch = tgl.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    return `${isoMatch[3].padStart(2, '0')}/${isoMatch[2].padStart(2, '0')}/${isoMatch[1]}`;
  }
  const dmyMatch = tgl.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[1].padStart(2, '0')}/${dmyMatch[2].padStart(2, '0')}/${dmyMatch[3]}`;
  }
  return tgl;
}

function formatJamRange(jamMulai?: string, jamSelesai?: string): string {
  const mulai = (jamMulai || '').trim();
  const selesai = (jamSelesai || '').trim();
  if (mulai && selesai) return `${mulai}-${selesai}`;
  return mulai || selesai || '-';
}

async function loadImageAsset(
  url: string | undefined,
  cache: Map<string, LoadedImageAsset | null>,
  preferJpeg = false,
  maxDim = preferJpeg ? 640 : 1400
): Promise<LoadedImageAsset | null> {
  const cleanUrl = (url || '').trim();
  if (!cleanUrl) return null;
  if (cache.has(cleanUrl)) {
    return cache.get(cleanUrl) || null;
  }

  const result = await new Promise<LoadedImageAsset | null>(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';

    let settled = false;
    const finish = (val: LoadedImageAsset | null) => {
      if (settled) return;
      settled = true;
      resolve(val);
    };

    const timer = window.setTimeout(() => finish(null), 2500);

    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          finish(null);
          return;
        }
        const scale = Math.min(1, maxDim / Math.max(w, h));
        const cw = Math.max(1, Math.round(w * scale));
        const ch = Math.max(1, Math.round(h * scale));

        const canvas = document.createElement('canvas');
        canvas.width = cw;
        canvas.height = ch;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          finish(null);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        if (preferJpeg) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, cw, ch);
        }
        ctx.drawImage(img, 0, 0, cw, ch);
        const format: 'PNG' | 'JPEG' = preferJpeg ? 'JPEG' : 'PNG';
        const dataUrl = preferJpeg
          ? canvas.toDataURL('image/jpeg', 0.92)
          : canvas.toDataURL('image/png');
        finish({ dataUrl, format, width: cw, height: ch });
      } catch {
        finish(null);
      }
    };

    img.onerror = () => {
      window.clearTimeout(timer);
      finish(null);
    };

    img.src = cleanUrl;
  });

  cache.set(cleanUrl, result);
  return result;
}

function fitTextSingleLine(doc: jsPDF, text: string, maxWidth: number): string {
  const str = (text || '').trim();
  if (!str) return '-';
  if (doc.getTextWidth(str) <= maxWidth) return str;
  const ellipsis = '...';
  let cut = str.length;
  while (cut > 1 && doc.getTextWidth(str.slice(0, cut) + ellipsis) > maxWidth) {
    cut -= 1;
  }
  return str.slice(0, cut).trimEnd() + ellipsis;
}

function drawImageContained(
  doc: jsPDF,
  asset: LoadedImageAsset,
  boxX: number,
  boxY: number,
  boxW: number,
  boxH: number,
  alignLeft = false
) {
  const ratio = Math.min(boxW / asset.width, boxH / asset.height);
  const dw = asset.width * ratio;
  const dh = asset.height * ratio;
  const dx = alignLeft ? boxX : boxX + (boxW - dw) / 2;
  const dy = boxY + (boxH - dh) / 2;
  doc.addImage(
    asset.dataUrl,
    asset.format,
    dx,
    dy,
    dw,
    dh,
    undefined,
    asset.format === 'PNG' ? 'NONE' : 'FAST'
  );
}

function drawSingleKartuOnPdf(params: {
  doc: jsPDF;
  x: number;
  y: number;
  siswa: Siswa;
  jadwalList: JadwalUjianItem[];
  sortedJadwal: JadwalUjianItem[];
  rombelList: RombelKelas[];
  schoolName: string;
  examName: string;
  semester: string;
  tahunAjaran: string;
  kota: string;
  tanggalStr: string;
  kepsekNama: string;
  showNip: boolean;
  rawNip: string;
  showCutGuide: boolean;
  logoAsset: LoadedImageAsset | null;
  ttdAsset: LoadedImageAsset | null;
  photoAsset: LoadedImageAsset | null;
}) {
  const {
    doc,
    x,
    y,
    siswa,
    jadwalList,
    sortedJadwal,
    rombelList,
    schoolName,
    examName,
    semester,
    tahunAjaran,
    kota,
    tanggalStr,
    kepsekNama,
    showNip,
    rawNip,
    showCutGuide,
    logoAsset,
    ttdAsset,
    photoAsset
  } = params;

  const cardW = 100; // 10 cm
  const cardH = 130; // 13 cm

  // Outer dashed cut guide (100mm x 130mm)
  if (showCutGuide) {
    doc.saveGraphicsState();
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.28);
    doc.setLineDashPattern([1.6, 1.4], 0);
    doc.rect(x, y, cardW, cardH);
    doc.restoreGraphicsState();
  }

  const isCompactMode = sortedJadwal.length > 8;
  const isTwoColMode = sortedJadwal.length > 16;

  // Inner card border
  const pad = isCompactMode ? 2.1 : 2.8;
  const ix = x + pad;
  const iy = y + pad;
  const iw = cardW - pad * 2;
  const ih = cardH - pad * 2;

  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
  doc.roundedRect(ix, iy, iw, ih, 1.8, 1.8, 'FD');

  const cp = isCompactMode ? 2.1 : 2.8;
  const cx = ix + cp;
  const cw = iw - cp * 2;
  const topY = iy + cp;
  const bottomY = iy + ih - cp;

  // =========================================================
  // 1. HEADER (KOP KARTU)
  // =========================================================
  const logoSize = isCompactMode ? 8 : 9.5;
  if (logoAsset) {
    drawImageContained(doc, logoAsset, cx, topY, logoSize, logoSize);
  } else {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.35);
    doc.roundedRect(cx, topY, logoSize, logoSize, 1.4, 1.4, 'S');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompactMode ? 7.5 : 8.5);
    doc.setTextColor(0, 0, 0);
    doc.text('AF', cx + logoSize / 2, topY + logoSize / 2 + 1.1, { align: 'center' });
  }

  // Right NO PESERTA box
  const noPeserta = `C2026-${(siswa.nisn || siswa.nis || '0000').slice(-4)}`;
  const rightBoxW = isCompactMode ? 19.5 : 20.5;
  const dividerX = cx + cw - rightBoxW;

  // Center text
  const headerTextX = cx + logoSize + 1.8;
  const headerTextW = dividerX - headerTextX - 1.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 7.2 : 8.0);
  doc.setTextColor(0, 0, 0);
  const rawTitle = `KARTU PESERTA — ${examName}`.toUpperCase();
  const titleLines = (doc.splitTextToSize(rawTitle, headerTextW) as string[]).slice(0, 2);
  let hy = topY + (isCompactMode ? 2.3 : 2.7);
  titleLines.forEach(line => {
    doc.text(line, headerTextX, hy);
    hy += isCompactMode ? 2.6 : 3.0;
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 6.4 : 7.0);
  doc.setTextColor(0, 0, 0);
  doc.text(fitTextSingleLine(doc, schoolName.toUpperCase(), headerTextW), headerTextX, hy + 0.1);
  hy += isCompactMode ? 2.3 : 2.7;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 5.8 : 6.3);
  doc.setTextColor(0, 0, 0);
  doc.text(
    fitTextSingleLine(doc, `SEMESTER ${semester} • TP ${tahunAjaran}`, headerTextW),
    headerTextX,
    hy
  );

  const headerBottomY = Math.max(topY + logoSize + (isCompactMode ? 1 : 1.5), hy + (isCompactMode ? 1.1 : 1.6));

  // Vertical divider for NO PESERTA
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.line(dividerX, topY + 0.3, dividerX, headerBottomY - 1);

  const noPesertaCenterY = topY + (headerBottomY - topY) / 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 5.5 : 5.9);
  doc.setTextColor(0, 0, 0);
  doc.text('NO PESERTA', cx + cw, noPesertaCenterY - 1.3, { align: 'right' });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 8.0 : 8.8);
  doc.setTextColor(0, 0, 0);
  doc.text(noPeserta, cx + cw, noPesertaCenterY + 2.1, { align: 'right' });

  // Horizontal header rule
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
  doc.line(cx, headerBottomY, cx + cw, headerBottomY);

  // =========================================================
  // 2. IDENTITY, PHOTO 3x4 & LOGIN CREDENTIALS
  // =========================================================
  const idY = headerBottomY + (isCompactMode ? 1.5 : 2.2);
  const photoW = isCompactMode ? 14.5 : 17;
  const photoH = isCompactMode ? 19.5 : 23;

  // Photo frame
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.4);
  doc.roundedRect(cx, idY, photoW, photoH, 1.2, 1.2, 'FD');

  if (photoAsset) {
    drawImageContained(doc, photoAsset, cx + 0.3, idY + 0.3, photoW - 0.6, photoH - 0.6);
  } else {
    const pCx = cx + photoW / 2;
    doc.setDrawColor(51, 65, 85);
    doc.setLineWidth(0.42);
    doc.circle(pCx, idY + (isCompactMode ? 6.8 : 8.2), isCompactMode ? 1.9 : 2.2, 'S');
    doc.roundedRect(
      pCx - (isCompactMode ? 3 : 3.6),
      idY + (isCompactMode ? 9.3 : 11.2),
      isCompactMode ? 6 : 7.2,
      isCompactMode ? 3.5 : 4.2,
      1.8,
      1.8,
      'S'
    );
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompactMode ? 5.0 : 5.6);
    doc.setTextColor(0, 0, 0);
    doc.text('FOTO 3x4', pCx, idY + (isCompactMode ? 16.0 : 19.0), { align: 'center' });
  }

  // Right identity details
  const dx = cx + photoW + (isCompactMode ? 2 : 2.5);
  const dw = cw - photoW - (isCompactMode ? 2 : 2.5);
  let dy = idY + (isCompactMode ? 1.6 : 2.0);

  // Nama Peserta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 5.5 : 6.0);
  doc.setTextColor(0, 0, 0);
  doc.text('NAMA PESERTA:', dx, dy);
  dy += isCompactMode ? 2.7 : 3.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 8.6 : 9.6);
  doc.setTextColor(0, 0, 0);
  if (isCompactMode) {
    doc.text(fitTextSingleLine(doc, siswa.nama || '-', dw), dx, dy);
    dy += 2.7;
  } else {
    const namaLines = (doc.splitTextToSize(siswa.nama || '-', dw) as string[]).slice(0, 2);
    namaLines.forEach(line => {
      doc.text(line, dx, dy);
      dy += 3.5;
    });
    dy += 0.3;
  }

  // NISN / NIS
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 5.5 : 6.0);
  doc.setTextColor(0, 0, 0);
  doc.text('NISN / NIS:', dx, dy);
  dy += isCompactMode ? 2.4 : 2.8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 7.2 : 8.0);
  doc.setTextColor(0, 0, 0);
  doc.text(
    fitTextSingleLine(doc, `${siswa.nisn || '-'} / ${siswa.nis || '-'}`, dw),
    dx,
    dy
  );

  // Kelas
  dy += isCompactMode ? 2.3 : 2.9;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 5.5 : 6.0);
  doc.setTextColor(0, 0, 0);
  doc.text('KELAS:', dx, dy);
  dy += isCompactMode ? 2.4 : 2.8;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 7.2 : 8.0);
  doc.setTextColor(0, 0, 0);
  doc.text(fitTextSingleLine(doc, siswa.kelas || '-', dw), dx, dy);

  // Subtle divider above credentials
  dy += isCompactMode ? 1.2 : 1.6;
  doc.setDrawColor(100, 116, 139);
  doc.setLineWidth(0.25);
  doc.line(dx, dy, dx + dw, dy);
  dy += isCompactMode ? 2.0 : 2.4;

  // Username & Password Login (from Database Siswa)
  const credGap = 1.8;
  const credColW = (dw - credGap) / 2;
  const username = siswa.username?.trim() || '-';
  const password = siswa.password?.trim() || '-';
  const pillH = isCompactMode ? 3.9 : 4.6;

  // Username column
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 5.4 : 5.8);
  doc.setTextColor(0, 0, 0);
  doc.text('USERNAME LOGIN:', dx, dy);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 7.2 : 8.0);
  const userText = fitTextSingleLine(doc, username, credColW - 2.8);
  const userPillW = Math.min(credColW, Math.max(10.5, doc.getTextWidth(userText) + 3.2));
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.28);
  doc.roundedRect(dx, dy + 0.7, userPillW, pillH, 0.8, 0.8, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.text(userText, dx + 1.5, dy + (isCompactMode ? 3.4 : 4.0));

  // Password column
  const passX = dx + credColW + credGap;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 5.4 : 5.8);
  doc.setTextColor(0, 0, 0);
  doc.text('PASSWORD LOGIN:', passX, dy);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 7.2 : 8.0);
  const passText = fitTextSingleLine(doc, password, credColW - 2.8);
  const passPillW = Math.min(credColW, Math.max(10.5, doc.getTextWidth(passText) + 3.2));
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.28);
  doc.roundedRect(passX, dy + 0.7, passPillW, pillH, 0.8, 0.8, 'FD');
  doc.setTextColor(0, 0, 0);
  doc.text(passText, passX + 1.5, dy + (isCompactMode ? 3.4 : 4.0));

  const identityEndY = Math.max(idY + photoH, dy + pillH + 1);

  // =========================================================
  // 3. FOOTER (PENGESAHAN KEPALA SEKOLAH + BARCODE)
  // =========================================================
  const footerH = isCompactMode ? (showNip ? 23.6 : 21.4) : showNip ? 26.8 : 24.4;
  const footerTopY = bottomY - footerH;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.45);
  doc.line(cx, footerTopY, cx + cw, footerTopY);

  // Left signature block — draw signature image first so text stays crisp on top
  const dateY = footerTopY + (isCompactMode ? 2.3 : 2.7);
  const roleY = dateY + (isCompactMode ? 2.2 : 2.5);
  const nameY = bottomY - (showNip ? (isCompactMode ? 2.6 : 2.9) : 0.6);

  if (ttdAsset) {
    const sigBoxTop = roleY - (isCompactMode ? 0.45 : 0.6);
    const sigBoxBottom = nameY - (isCompactMode ? 1.0 : 1.15);
    const sigBoxH = Math.max(12, sigBoxBottom - sigBoxTop);
    drawImageContained(
      doc,
      ttdAsset,
      cx,
      sigBoxTop,
      isCompactMode ? 54 : 58,
      Math.min(isCompactMode ? 14.6 : 16.5, sigBoxH),
      true
    );
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 6.0 : 6.6);
  doc.setTextColor(0, 0, 0);
  doc.text(`${kota}, ${tanggalStr}`, cx, dateY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 6.0 : 6.6);
  doc.setTextColor(0, 0, 0);
  doc.text('Kepala Sekolah,', cx, roleY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 7.0 : 7.8);
  doc.setTextColor(0, 0, 0);
  const displayKepsek = fitTextSingleLine(doc, kepsekNama, 54);
  doc.text(displayKepsek, cx, nameY);
  const nameW = doc.getTextWidth(displayKepsek);
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.24);
  doc.line(cx, nameY + 0.45, cx + nameW, nameY + 0.45);

  if (showNip) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompactMode ? 5.6 : 6.1);
    doc.setTextColor(0, 0, 0);
    doc.text(`NIP. ${rawNip}`, cx, bottomY - 0.25);
  }

  // Right barcode block
  const barBoxW = isCompactMode ? 27.5 : 29;
  const barBoxH = isCompactMode ? 4.6 : 5.2;
  const barBoxX = cx + cw - barBoxW;
  const barBoxY = bottomY - (isCompactMode ? 7.4 : 8.4);

  doc.setFillColor(0, 0, 0);
  doc.roundedRect(barBoxX, barBoxY, barBoxW, barBoxH, 0.9, 0.9, 'F');

  // Crisp vector barcode stripes
  const pattern = [1, 0.5, 0.5, 1.1, 0.5, 0.8, 0.5, 1.2, 0.5, 0.5, 0.9, 0.6, 1.1, 0.5, 0.8, 0.5, 1];
  let stripeX = barBoxX + 2.1;
  doc.setFillColor(255, 255, 255);
  pattern.forEach((wBar, idx) => {
    if (stripeX + wBar < barBoxX + barBoxW - 1.7) {
      doc.rect(stripeX, barBoxY + 0.8, wBar * 0.65, barBoxH - 1.6, 'F');
    }
    stripeX += wBar + (idx % 3 === 0 ? 0.85 : 0.52);
  });

  const barcodeText = siswa.kodeBarcode || `SIS-${siswa.nisn || siswa.nis || ''}`;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 5.6 : 6.1);
  doc.setTextColor(0, 0, 0);
  doc.text(fitTextSingleLine(doc, barcodeText, barBoxW + 2), barBoxX + barBoxW / 2, bottomY - 0.35, {
    align: 'center'
  });

  // =========================================================
  // 4. JADWAL SESI UJIAN TERJADWAL (ALL SUBJECTS, ADAPTIVE FIT)
  // =========================================================
  let ty = identityEndY + (isCompactMode ? 2.0 : 3.0);
  const tableMaxBottom = footerTopY - 1.2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(isCompactMode ? 6.2 : 6.8);
  doc.setTextColor(0, 0, 0);
  doc.text('JADWAL SESI UJIAN TERJADWAL:', cx, ty);

  if (sortedJadwal.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(isCompactMode ? 5.6 : 6.1);
    doc.setTextColor(0, 0, 0);
    doc.text(`${sortedJadwal.length} Mapel`, cx + cw, ty, { align: 'right' });
  }

  ty += isCompactMode ? 1.2 : 1.5;
  const availableTableH = Math.max(12, tableMaxBottom - ty);

  if (sortedJadwal.length === 0) {
    const col1W = cw * 0.22;
    const col2W = cw * 0.24;
    const col3W = cw - col1W - col2W;
    const headerRowH = 4.8;

    doc.setFillColor(226, 232, 240);
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.22);
    doc.rect(cx, ty, col1W, headerRowH, 'FD');
    doc.rect(cx + col1W, ty, col2W, headerRowH, 'FD');
    doc.rect(cx + col1W + col2W, ty, col3W, headerRowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(0, 0, 0);
    doc.text('TANGGAL', cx + 1.2, ty + 3.3);
    doc.text('WAKTU', cx + col1W + 1.2, ty + 3.3);
    doc.text('MATA PELAJARAN', cx + col1W + col2W + 1.2, ty + 3.3);
    ty += headerRowH;

    doc.setFillColor(255, 255, 255);
    doc.rect(cx, ty, cw, 6.4, 'FD');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.6);
    doc.setTextColor(0, 0, 0);
    doc.text('Belum ada jadwal ujian terjadwal', cx + cw / 2, ty + 4.1, { align: 'center' });
  } else if (isTwoColMode) {
    // 2-column side-by-side grid for 17+ subjects so EVERY subject fits cleanly inside 10x13cm
    const half = Math.ceil(sortedJadwal.length / 2);
    const colGap = 1.4;
    const subTableW = (cw - colGap) / 2;
    const cDateW = subTableW * 0.50;
    const cMapelW = subTableW - cDateW;

    const headerRowH = Math.min(4.0, Math.max(2.9, availableTableH / (half + 1.3)));
    const dataRowH = Math.min(4.0, Math.max(2.4, (availableTableH - headerRowH) / half));
    const fontSize = dataRowH >= 3.2 ? 5.1 : dataRowH >= 2.7 ? 4.6 : 4.2;
    const textOffsetY = dataRowH * 0.69;

    const drawSubTable = (items: JadwalUjianItem[], startX: number) => {
      let rowY = ty;

      // Sub-table header
      doc.setFillColor(226, 232, 240);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.18);
      doc.rect(startX, rowY, cDateW, headerRowH, 'FD');
      doc.rect(startX + cDateW, rowY, cMapelW, headerRowH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(fontSize);
      doc.setTextColor(0, 0, 0);
      doc.text('TGL & WAKTU', startX + 0.7, rowY + headerRowH * 0.69);
      doc.text('MATA PELAJARAN', startX + cDateW + 0.7, rowY + headerRowH * 0.69);
      rowY += headerRowH;

      for (const j of items) {
        doc.setFillColor(255, 255, 255);
        doc.setDrawColor(100, 116, 139);
        doc.setLineWidth(0.18);
        doc.rect(startX, rowY, cDateW, dataRowH, 'FD');
        doc.rect(startX + cDateW, rowY, cMapelW, dataRowH, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);
        doc.text(
          fitTextSingleLine(
            doc,
            `${formatTanggalDMY(j.tanggal)} ${formatJamRange(j.jamMulai, j.jamSelesai)}`,
            cDateW - 1.2
          ),
          startX + 0.6,
          rowY + textOffsetY
        );

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(fontSize);
        doc.setTextColor(0, 0, 0);
        doc.text(
          fitTextSingleLine(doc, j.mataPelajaran || '-', cMapelW - 1.2),
          startX + cDateW + 0.6,
          rowY + textOffsetY
        );

        rowY += dataRowH;
      }
    };

    drawSubTable(sortedJadwal.slice(0, half), cx);
    drawSubTable(sortedJadwal.slice(half), cx + subTableW + colGap);
  } else {
    // 1-column full table (1-8 roomy, 9-16 dynamically sized so all rows fit with zero cutoff)
    const col1W = isCompactMode ? cw * 0.21 : cw * 0.22;
    const col2W = isCompactMode ? cw * 0.23 : cw * 0.24;
    const col3W = cw - col1W - col2W;

    const headerRowH = isCompactMode
      ? Math.min(4.2, Math.max(3.3, availableTableH / (sortedJadwal.length + 1.2)))
      : 4.8;
    const maxDataRowH = isCompactMode ? 4.3 : 4.8;
    const dataRowH = isCompactMode
      ? Math.min(maxDataRowH, (availableTableH - headerRowH) / sortedJadwal.length)
      : Math.min(maxDataRowH, (availableTableH - headerRowH) / Math.max(1, sortedJadwal.length));

    const headerFontSize = isCompactMode ? (dataRowH >= 3.6 ? 6.2 : 5.9) : 6.8;
    const bodyFontSize = isCompactMode ? (dataRowH >= 3.6 ? 6.8 : 6.4) : 7.2;
    const headerTextY = ty + headerRowH * 0.69;
    const rowTextOffset = dataRowH * 0.69;

    // Table header
    doc.setFillColor(226, 232, 240);
    doc.setDrawColor(100, 116, 139);
    doc.setLineWidth(0.2);
    doc.rect(cx, ty, col1W, headerRowH, 'FD');
    doc.rect(cx + col1W, ty, col2W, headerRowH, 'FD');
    doc.rect(cx + col1W + col2W, ty, col3W, headerRowH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(headerFontSize);
    doc.setTextColor(0, 0, 0);
    doc.text('TANGGAL', cx + 1, headerTextY);
    doc.text('WAKTU', cx + col1W + 1, headerTextY);
    doc.text('MATA PELAJARAN', cx + col1W + col2W + 1, headerTextY);
    ty += headerRowH;

    for (const j of sortedJadwal) {
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(100, 116, 139);
      doc.setLineWidth(0.2);
      doc.rect(cx, ty, col1W, dataRowH, 'FD');
      doc.rect(cx + col1W, ty, col2W, dataRowH, 'FD');
      doc.rect(cx + col1W + col2W, ty, col3W, dataRowH, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(bodyFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(
        fitTextSingleLine(doc, formatTanggalDMY(j.tanggal), col1W - 1.6),
        cx + 0.9,
        ty + rowTextOffset
      );

      doc.text(
        fitTextSingleLine(doc, formatJamRange(j.jamMulai, j.jamSelesai), col2W - 1.6),
        cx + col1W + 0.9,
        ty + rowTextOffset
      );

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(bodyFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(
        fitTextSingleLine(doc, j.mataPelajaran || '-', col3W - 1.8),
        cx + col1W + col2W + 0.9,
        ty + rowTextOffset
      );

      ty += dataRowH;
    }
  }
}

export interface DownloadKartuPdfParams {
  siswaList: Siswa[];
  jadwalList: JadwalUjianItem[];
  rombelList: RombelKelas[];
  schoolSettings?: SchoolSettings;
  cbtSettings: CbtExamSettings;
  showCutGuide: boolean;
  fileName?: string;
  onProgress?: (currentPage: number, totalPages: number) => void;
}

/**
 * Generates and downloads a crisp vector PDF formatted strictly for HVS A4 Portrait
 * (210mm x 297mm), 4 cards per page (2 cols x 2 rows), each card exactly 100mm x 130mm (10cm x 13cm).
 */
export async function downloadKartuPesertaA4Pdf(params: DownloadKartuPdfParams): Promise<void> {
  const {
    siswaList,
    jadwalList,
    rombelList,
    schoolSettings,
    cbtSettings,
    showCutGuide,
    fileName,
    onProgress
  } = params;

  if (siswaList.length === 0) return;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const sortedJadwal = getSortedJadwal(jadwalList);
  const tanggalStr = formatTanggalPenetapan(cbtSettings.tanggalPenetapan);
  const schoolName = schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR';
  const examName = cbtSettings.namaUjian || 'UJIAN CBT';
  const semester = (cbtSettings.semester || 'Ganjil').toUpperCase();
  const tahunAjaran = cbtSettings.tahunAjaran || '2026/2027';
  const kota = cbtSettings.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok';
  const kepsekNama =
    cbtSettings.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Nurhidayati, S.Pd';
  const rawNip = (cbtSettings.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '').trim();
  const showNip = rawNip !== '' && rawNip !== '-';

  // Cache shared images (logo + enhanced crisp signature) once across all cards
  const imageCache = new Map<string, LoadedImageAsset | null>();
  const sharpSignatureUrl = cbtSettings.ttdKepalaSekolahUrl
    ? await enhanceSignatureForDisplay(cbtSettings.ttdKepalaSekolahUrl)
    : undefined;
  const [logoAsset, ttdAsset] = await Promise.all([
    loadImageAsset(schoolSettings?.logoUrl, imageCache, false, 1000),
    loadImageAsset(sharpSignatureUrl, imageCache, false, 1400)
  ]);

  // Exact A4 2x2 grid positions for 100mm x 130mm cards:
  // Horizontal: 4mm + 100mm + 2mm + 100mm + 4mm = 210mm
  // Vertical:   15mm + 130mm + 7mm + 130mm + 15mm = 297mm
  const slotCoords: Array<{ x: number; y: number }> = [
    { x: 4, y: 15 },
    { x: 106, y: 15 },
    { x: 4, y: 152 },
    { x: 106, y: 152 }
  ];

  const totalPages = Math.ceil(siswaList.length / 4);

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage('a4', 'portrait');
    }

    const slice = siswaList.slice(pageIdx * 4, pageIdx * 4 + 4);
    const photoAssets = await Promise.all(
      slice.map(s => loadImageAsset(s.fotoUrl, imageCache, true))
    );

    slice.forEach((siswa, slotIdx) => {
      const pos = slotCoords[slotIdx];
      drawSingleKartuOnPdf({
        doc,
        x: pos.x,
        y: pos.y,
        siswa,
        jadwalList,
        sortedJadwal,
        rombelList,
        schoolName,
        examName,
        semester,
        tahunAjaran,
        kota,
        tanggalStr,
        kepsekNama,
        showNip,
        rawNip,
        showCutGuide,
        logoAsset,
        ttdAsset,
        photoAsset: photoAssets[slotIdx]
      });
    });

    onProgress?.(pageIdx + 1, totalPages);

    // Yield briefly every 8 pages so the UI progress indicator stays responsive for 250+ students
    if ((pageIdx + 1) % 8 === 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  const safeSlug = (fileName || `Kartu-Peserta-Ujian-A4-${siswaList.length}-Siswa`)
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  doc.save(`${safeSlug}.pdf`);
}
