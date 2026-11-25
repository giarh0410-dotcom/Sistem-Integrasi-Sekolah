import { jsPDF } from 'jspdf';
import { enhanceSignatureForDisplay } from './signatureUtils';

export interface PesertaKelasPdfRow {
  nama: string;
  jenisKelamin: 'L' | 'P';
  ruangUjian: string;
  nomorKursi?: number;
  noPesertaCbt: string;
}

export interface PesertaKelasPdfGroup {
  kelas: string;
  waliKelas?: string;
  rows: PesertaKelasPdfRow[];
}

export interface DaftarPesertaKelasPdfOptions {
  groups: PesertaKelasPdfGroup[];
  schoolName: string;
  examTitle: string;
  kota: string;
  kepsekNama: string;
  kepsekNip?: string;
  logoUrl?: string;
  ttdKepalaSekolahUrl?: string;
  filterNote?: string;
  fileName: string;
}

interface LoadedImage {
  dataUrl: string;
  width: number;
  height: number;
}

const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];

function loadImageAsPngDataUrl(src?: string, maxDim = 256): Promise<LoadedImage | null> {
  if (!src || !src.trim()) return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    if (!src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    const timer = window.setTimeout(() => resolve(null), 3500);
    img.onload = () => {
      window.clearTimeout(timer);
      try {
        const natW = img.naturalWidth || img.width;
        const natH = img.naturalHeight || img.height;
        if (!natW || !natH) {
          resolve(null);
          return;
        }
        const scale = Math.min(1, maxDim / Math.max(natW, natH));
        const outW = Math.max(1, Math.round(natW * scale));
        const outH = Math.max(1, Math.round(natH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, outW, outH);
        resolve({
          dataUrl: canvas.toDataURL('image/png'),
          width: outW,
          height: outH
        });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      resolve(null);
    };
    img.src = src;
  });
}

function loadSignatureImage(src?: string): Promise<LoadedImage | null> {
  if (!src || !src.trim()) return Promise.resolve(null);
  return enhanceSignatureForDisplay(src)
    .then(crisp => {
      const target = crisp || src;
      return new Promise<LoadedImage | null>(resolve => {
        const img = new Image();
        if (!target.startsWith('data:')) {
          img.crossOrigin = 'anonymous';
        }
        img.onload = () => {
          resolve({
            dataUrl: target,
            width: img.naturalWidth || img.width || 300,
            height: img.naturalHeight || img.height || 120
          });
        };
        img.onerror = () => resolve(null);
        img.src = target;
      });
    })
    .catch(() => null);
}

function fitText(doc: jsPDF, text: string, maxWidth: number): string {
  const clean = (text || '').trim();
  if (!clean) return '';
  if (doc.getTextWidth(clean) <= maxWidth) return clean;
  const ellipsis = '…';
  let lo = 0;
  let hi = clean.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (doc.getTextWidth(clean.slice(0, mid) + ellipsis) <= maxWidth) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return clean.slice(0, Math.max(1, lo)) + ellipsis;
}

export async function downloadDaftarPesertaKelasPdf(
  options: DaftarPesertaKelasPdfOptions
): Promise<void> {
  const {
    groups,
    schoolName,
    examTitle,
    kota,
    kepsekNama,
    kepsekNip,
    logoUrl,
    ttdKepalaSekolahUrl,
    filterNote,
    fileName
  } = options;

  if (!groups.length) return;

  const [logoImg, sigImg] = await Promise.all([
    loadImageAsPngDataUrl(logoUrl, 240),
    loadSignatureImage(ttdKepalaSekolahUrl)
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageW = 210;
  const pageH = 297;
  const marginX = 12;
  const marginTop = 10;
  const marginBottom = 11;
  const contentW = pageW - marginX * 2; // 186mm

  const now = new Date();
  const todayStr = `${now.getDate()} ${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`;

  const cols = [
    { key: 'no', label: 'NO', width: 11 },
    { key: 'nama', label: 'NAMA PESERTA UJIAN', width: 76 },
    { key: 'jk', label: 'JENIS KELAMIN', width: 31 },
    { key: 'ruang', label: 'RUANG UJIAN', width: 36 },
    { key: 'noPeserta', label: 'NO. PESERTA CBT', width: 32 }
  ] as const;

  const drawTableHeader = (y: number): number => {
    const headerH = 7.5;
    doc.setFillColor(8, 47, 99);
    doc.setDrawColor(8, 47, 99);
    doc.setLineWidth(0.25);
    doc.rect(marginX, y, contentW, headerH, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(255, 255, 255);

    let x = marginX;
    cols.forEach((col, i) => {
      if (i > 0) {
        doc.setDrawColor(56, 103, 166);
        doc.line(x, y, x, y + headerH);
      }
      doc.text(col.label, x + col.width / 2, y + 4.9, { align: 'center' });
      x += col.width;
    });

    return y + headerH;
  };

  const drawGroupHeader = (group: PesertaKelasPdfGroup, isContinuation: boolean): number => {
    let y = marginTop;

    const logoBoxSize = 14.5;
    if (logoImg) {
      const ratio = logoImg.width / logoImg.height;
      let drawW = logoBoxSize;
      let drawH = logoBoxSize;
      if (ratio > 1) drawH = logoBoxSize / ratio;
      else drawW = logoBoxSize * ratio;
      doc.addImage(
        logoImg.dataUrl,
        'PNG',
        marginX + (logoBoxSize - drawW) / 2,
        y + (logoBoxSize - drawH) / 2,
        drawW,
        drawH,
        undefined,
        'FAST'
      );
    }

    const badgeW = 40;
    const badgeH = 14.5;
    const badgeX = pageW - marginX - badgeW;
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(8, 47, 99);
    doc.setLineWidth(0.5);
    doc.roundedRect(badgeX, y, badgeW, badgeH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(71, 85, 105);
    doc.text('KELAS / ROMBEL', badgeX + badgeW / 2, y + 4.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(8, 47, 99);
    doc.text(fitText(doc, group.kelas, badgeW - 3), badgeX + badgeW / 2, y + 9.2, {
      align: 'center'
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(30, 41, 59);
    doc.text(`${group.rows.length} Peserta`, badgeX + badgeW / 2, y + 12.9, { align: 'center' });

    const centerLeft = logoImg ? marginX + logoBoxSize + 3 : marginX;
    const centerRight = badgeX - 3;
    const centerW = centerRight - centerLeft;
    const centerX = centerLeft + centerW / 2;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(8, 47, 99);
    doc.text(
      isContinuation
        ? 'DAFTAR PESERTA UJIAN PER KELAS (LANJUTAN)'
        : 'DAFTAR PESERTA UJIAN PER KELAS',
      centerX,
      y + 4.8,
      { align: 'center' }
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(30, 41, 59);
    doc.text(fitText(doc, examTitle.toUpperCase(), centerW), centerX, y + 9.3, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(15, 23, 42);
    doc.text(fitText(doc, schoolName.toUpperCase(), centerW), centerX, y + 13.7, {
      align: 'center'
    });

    y += 16.5;
    doc.setDrawColor(8, 47, 99);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageW - marginX, y);
    y += 2.5;

    const totalL = group.rows.filter(r => r.jenisKelamin === 'L').length;
    const totalP = group.rows.filter(r => r.jenisKelamin === 'P').length;
    const roomSet = Array.from(
      new Set(
        group.rows
          .map(r => r.ruangUjian)
          .filter(r => r && r !== 'Belum Ditempatkan')
      )
    ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    const metaH = filterNote ? 11 : 7.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, y, contentW, metaH, 1.5, 1.5, 'FD');

    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Wali Kelas:', marginX + 3, y + 4.8);
    doc.setFont('helvetica', 'normal');
    doc.text(fitText(doc, group.waliKelas || '-', 54), marginX + 21, y + 4.8);

    const roomSummary = roomSet.length > 0 ? roomSet.join(', ') : 'Belum ditempatkan';
    const rightSummary = `L: ${totalL}  |  P: ${totalP}  |  Total: ${group.rows.length}  ·  Ruang: ${roomSummary}`;
    doc.setFont('helvetica', 'bold');
    doc.text(fitText(doc, rightSummary, 108), pageW - marginX - 3, y + 4.8, { align: 'right' });

    if (filterNote) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(fitText(doc, `Filter aktif: ${filterNote}`, contentW - 6), marginX + 3, y + 9.1);
    }

    return y + metaH + 2.8;
  };

  const pageFooters: string[] = [];

  groups.forEach((group, groupIdx) => {
    if (groupIdx > 0) {
      doc.addPage();
    }

    const footerCaption = `${schoolName} — Daftar Peserta Ujian Kelas ${group.kelas}`;
    pageFooters.push(footerCaption);

    let y = drawGroupHeader(group, false);
    y = drawTableHeader(y);

    const rowH = group.rows.length > 30 ? 5.6 : 6.1;
    const maxBodyY = pageH - marginBottom - 6;

    group.rows.forEach((row, idx) => {
      if (y + rowH > maxBodyY) {
        doc.addPage();
        pageFooters.push(footerCaption);
        y = drawGroupHeader(group, true);
        y = drawTableHeader(y);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
      } else {
        doc.setFillColor(255, 255, 255);
      }
      doc.setDrawColor(148, 163, 184);
      doc.setLineWidth(0.2);
      doc.rect(marginX, y, contentW, rowH, 'FD');

      let x = marginX;
      const textY = y + rowH * 0.68;

      cols.forEach((col, cIdx) => {
        if (cIdx > 0) {
          doc.line(x, y, x, y + rowH);
        }

        if (col.key === 'no') {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.6);
          doc.setTextColor(15, 23, 42);
          doc.text(String(idx + 1), x + col.width / 2, textY, { align: 'center' });
        } else if (col.key === 'nama') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.6);
          doc.setTextColor(15, 23, 42);
          doc.text(fitText(doc, row.nama, col.width - 3), x + 2, textY);
        } else if (col.key === 'jk') {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(30, 41, 59);
          const jkText = row.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan';
          doc.text(jkText, x + col.width / 2, textY, { align: 'center' });
        } else if (col.key === 'ruang') {
          const isUnplaced = !row.ruangUjian || row.ruangUjian === 'Belum Ditempatkan';
          doc.setFont('helvetica', isUnplaced ? 'italic' : 'bold');
          doc.setFontSize(7.4);
          if (isUnplaced) {
            doc.setTextColor(180, 83, 9);
          } else {
            doc.setTextColor(8, 47, 99);
          }
          const ruangLabel = isUnplaced
            ? 'Belum Ditempatkan'
            : row.nomorKursi
            ? `${row.ruangUjian} (#${String(row.nomorKursi).padStart(2, '0')})`
            : row.ruangUjian;
          doc.text(fitText(doc, ruangLabel, col.width - 2.5), x + col.width / 2, textY, {
            align: 'center'
          });
        } else if (col.key === 'noPeserta') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
          doc.text(fitText(doc, row.noPesertaCbt || '-', col.width - 2.5), x + col.width / 2, textY, {
            align: 'center'
          });
        }

        x += col.width;
      });

      y += rowH;
    });

    // Room Breakdown Summary inside class
    const roomCountMap = new Map<string, number>();
    group.rows.forEach(r => {
      const key = r.ruangUjian || 'Belum Ditempatkan';
      roomCountMap.set(key, (roomCountMap.get(key) || 0) + 1);
    });
    const roomBreakdownText = Array.from(roomCountMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
      .map(([k, v]) => `${k}: ${v}`)
      .join('  •  ');

    if (roomBreakdownText) {
      y += 2.4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.1);
      const summaryLines = doc.splitTextToSize(`Sebaran Ruang Ujian: ${roomBreakdownText}`, contentW - 6);
      const boxH = Math.max(5.8, summaryLines.length * 3.5 + 2.4);
      if (y + boxH > pageH - marginBottom) {
        doc.addPage();
        pageFooters.push(footerCaption);
        y = marginTop;
      }
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(marginX, y, contentW, boxH, 1.2, 1.2, 'FD');
      doc.setTextColor(51, 65, 85);
      doc.text(summaryLines, marginX + 3, y + 4);
      y += boxH;
    }

    // Signature Block
    const sigBlockH = 26;
    if (y + sigBlockH + 4 > pageH - marginBottom) {
      doc.addPage();
      pageFooters.push(footerCaption);
      y = marginTop + 2;
    } else {
      y += 4.5;
    }

    const leftSigX = marginX + 38;
    const rightSigX = pageW - marginX - 38;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(15, 23, 42);
    doc.text('Mengetahui,', leftSigX, y, { align: 'center' });
    doc.text(`${kota}, ${todayStr}`, rightSigX, y, { align: 'center' });

    y += 3.8;
    doc.setFont('helvetica', 'bold');
    doc.text('Kepala Sekolah', leftSigX, y, { align: 'center' });
    doc.text(`Wali Kelas ${group.kelas}`, rightSigX, y, { align: 'center' });

    const sigAreaTop = y + 1.5;
    if (sigImg) {
      const maxSigW = 30;
      const maxSigH = 12;
      const sRatio = sigImg.width / sigImg.height;
      let sw = maxSigW;
      let sh = maxSigH;
      if (sw / sh > sRatio) sw = sh * sRatio;
      else sh = sw / sRatio;
      doc.addImage(
        sigImg.dataUrl,
        'PNG',
        leftSigX - sw / 2,
        sigAreaTop + (maxSigH - sh) / 2,
        sw,
        sh,
        undefined,
        'FAST'
      );
    }

    const nameY = sigAreaTop + 14.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(kepsekNama || 'Kepala Sekolah', leftSigX, nameY, { align: 'center' });
    const kepsekW = doc.getTextWidth(kepsekNama || 'Kepala Sekolah');
    doc.setLineWidth(0.25);
    doc.line(leftSigX - kepsekW / 2, nameY + 0.6, leftSigX + kepsekW / 2, nameY + 0.6);

    const waliLabel = group.waliKelas || '........................................';
    doc.text(waliLabel, rightSigX, nameY, { align: 'center' });
    const waliW = doc.getTextWidth(waliLabel);
    doc.line(rightSigX - waliW / 2, nameY + 0.6, rightSigX + waliW / 2, nameY + 0.6);

    if (kepsekNip && kepsekNip !== '-') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      doc.text(`NIP. ${kepsekNip}`, leftSigX, nameY + 3.8, { align: 'center' });
    }
  });

  // Page footer
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(pageFooters[p - 1] || schoolName, marginX, pageH - 5.2);
    doc.text(`Halaman ${p} dari ${totalPages}`, pageW - marginX, pageH - 5.2, { align: 'right' });
  }

  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
