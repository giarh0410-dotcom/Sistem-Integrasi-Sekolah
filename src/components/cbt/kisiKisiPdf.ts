import { jsPDF } from 'jspdf';
import { KisiKisiSoalDoc } from '../../types/school';
import { enhanceSignatureForDisplay } from './signatureUtils';

export interface DownloadKisiKisiPdfOptions {
  docData: KisiKisiSoalDoc;
  schoolName: string;
  schoolAddress?: string;
  schoolNpsn?: string;
  examTitle: string;
  kota: string;
  kepsekNama: string;
  kepsekNip?: string;
  logoUrl?: string;
  ttdKepalaSekolahUrl?: string;
  includeKunci?: boolean;
  fileName: string;
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

function formatTanggalIndo(isoDate?: string): string {
  if (!isoDate) {
    const now = new Date();
    return `${now.getDate()} ${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!m) return isoDate;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

async function loadImageAsPngDataUrl(url?: string): Promise<string | null> {
  if (!url || !url.trim()) return null;
  if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg')) return url;

  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 160;
        canvas.height = img.naturalHeight || img.height || 160;
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
    img.src = url;
  });
}

export async function downloadKisiKisiPdf(options: DownloadKisiKisiPdfOptions): Promise<void> {
  const {
    docData,
    schoolName,
    schoolAddress,
    schoolNpsn,
    examTitle,
    kota,
    kepsekNama,
    kepsekNip,
    logoUrl,
    ttdKepalaSekolahUrl,
    includeKunci = false,
    fileName
  } = options;

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageW = pdf.internal.pageSize.getWidth(); // 297mm
  const pageH = pdf.internal.pageSize.getHeight(); // 210mm
  const marginX = 12;
  const contentW = pageW - marginX * 2; // 273mm
  const bottomLimit = pageH - 13;

  const logoDataUrl = await loadImageAsPngDataUrl(logoUrl);
  let ttdDataUrl: string | null = null;
  if (ttdKepalaSekolahUrl) {
    try {
      const enhanced = await enhanceSignatureForDisplay(ttdKepalaSekolahUrl);
      ttdDataUrl = await loadImageAsPngDataUrl(enhanced || ttdKepalaSekolahUrl);
    } catch {
      ttdDataUrl = await loadImageAsPngDataUrl(ttdKepalaSekolahUrl);
    }
  }

  // Color palette
  const NAVY: [number, number, number] = [15, 42, 86];
  const DARK_TEXT: [number, number, number] = [20, 26, 38];
  const MUTED_TEXT: [number, number, number] = [90, 102, 122];
  const BORDER: [number, number, number] = [196, 206, 222];
  const ZEBRA_BG: [number, number, number] = [248, 250, 253];
  const SOFT_BG: [number, number, number] = [241, 245, 251];

  const sortedButir = [...(docData.butirKisi || [])].sort((a, b) => a.nomorSoal - b.nomorSoal);

  // Column definitions summing to 273mm
  interface ColDef {
    key: string;
    label: string;
    width: number;
    align: 'left' | 'center';
  }

  const columns: ColDef[] = includeKunci
    ? [
        { key: 'no', label: 'NO', width: 9, align: 'center' },
        { key: 'cp', label: 'TUJUAN PEMBELAJARAN / CP', width: 58, align: 'left' },
        { key: 'materi', label: 'MATERI POKOK', width: 38, align: 'left' },
        { key: 'indikator', label: 'INDIKATOR SOAL', width: 78, align: 'left' },
        { key: 'level', label: 'LEVEL', width: 20, align: 'center' },
        { key: 'bentuk', label: 'BENTUK', width: 25, align: 'center' },
        { key: 'nomor', label: 'NO. SOAL', width: 14, align: 'center' },
        { key: 'bobot', label: 'BOBOT', width: 13, align: 'center' },
        { key: 'kunci', label: 'KUNCI', width: 18, align: 'center' }
      ]
    : [
        { key: 'no', label: 'NO', width: 10, align: 'center' },
        { key: 'cp', label: 'TUJUAN PEMBELAJARAN / CP', width: 66, align: 'left' },
        { key: 'materi', label: 'MATERI POKOK', width: 44, align: 'left' },
        { key: 'indikator', label: 'INDIKATOR SOAL', width: 88, align: 'left' },
        { key: 'level', label: 'LEVEL', width: 21, align: 'center' },
        { key: 'bentuk', label: 'BENTUK SOAL', width: 28, align: 'center' },
        { key: 'nomor', label: 'NO. SOAL', width: 16, align: 'center' }
      ];

  // Header on page 1
  let y = 11;

  if (logoDataUrl) {
    try {
      pdf.addImage(logoDataUrl, 'PNG', marginX + 2, y, 16, 16);
    } catch {
      // ignore invalid image
    }
  }

  pdf.setTextColor(...NAVY);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text('KISI-KISI PENULISAN SOAL', pageW / 2, y + 5, { align: 'center' });

  pdf.setFontSize(9.5);
  pdf.text(
    `${(examTitle || 'ASESMEN SUMATIF').toUpperCase()} — SEMESTER ${(docData.semester || 'Ganjil').toUpperCase()} TAHUN PELAJARAN ${docData.tahunAjaran || ''}`,
    pageW / 2,
    y + 10.2,
    { align: 'center' }
  );

  pdf.setFontSize(10);
  pdf.setTextColor(...DARK_TEXT);
  pdf.text((schoolName || 'SEKOLAH').toUpperCase(), pageW / 2, y + 15, { align: 'center' });

  if (schoolAddress || schoolNpsn) {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.5);
    pdf.setTextColor(...MUTED_TEXT);
    const subParts: string[] = [];
    if (schoolAddress) subParts.push(schoolAddress);
    if (schoolNpsn) subParts.push(`NPSN: ${schoolNpsn}`);
    pdf.text(subParts.join(' • '), pageW / 2, y + 19, { align: 'center' });
    y += 21.5;
  } else {
    y += 18;
  }

  // Double horizontal line
  pdf.setDrawColor(...NAVY);
  pdf.setLineWidth(0.7);
  pdf.line(marginX, y, pageW - marginX, y);
  pdf.setLineWidth(0.25);
  pdf.line(marginX, y + 1.1, pageW - marginX, y + 1.1);
  y += 4;

  // Count breakdown by bentuk soal
  const countPg = sortedButir.filter(b => b.bentukSoal === 'PG').length;
  const countPgk = sortedButir.filter(b => b.bentukSoal === 'PG Kompleks').length;
  const countIsian = sortedButir.filter(b => b.bentukSoal === 'Isian Singkat').length;
  const countEsai = sortedButir.filter(b => b.bentukSoal === 'Uraian / Esai').length;
  const bentukParts: string[] = [];
  if (countPg) bentukParts.push(`${countPg} PG`);
  if (countPgk) bentukParts.push(`${countPgk} PG Kompleks`);
  if (countIsian) bentukParts.push(`${countIsian} Isian`);
  if (countEsai) bentukParts.push(`${countEsai} Uraian`);
  const bentukRingkas = bentukParts.length ? `${sortedButir.length} Soal (${bentukParts.join(', ')})` : `${sortedButir.length} Soal`;

  // Metadata Box (2 columns x 4 rows)
  const metaBoxH = 22;
  pdf.setFillColor(...SOFT_BG);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(marginX, y, contentW, metaBoxH, 1.5, 1.5, 'FD');

  const leftMeta: [string, string][] = [
    ['Satuan Pendidikan', schoolName || '-'],
    ['Mata Pelajaran', docData.mataPelajaran || '-'],
    ['Kelas / Fase', `${docData.kelas || '-'}${docData.fase ? ` / ${docData.fase}` : ''}`],
    ['Kurikulum', docData.kurikulum || 'Kurikulum Merdeka']
  ];
  const rightMeta: [string, string][] = [
    ['Tahun Pelajaran / Sem.', `${docData.tahunAjaran || '-'} / ${docData.semester || 'Ganjil'}`],
    ['Alokasi Waktu', docData.alokasiWaktu || '90 Menit'],
    ['Jumlah & Bentuk Soal', bentukRingkas],
    ['Penyusun', docData.penyusunNama || '-']
  ];

  const colMidX = marginX + contentW / 2 + 4;
  pdf.setFontSize(8);
  for (let i = 0; i < 4; i++) {
    const rowY = y + 4.8 + i * 4.8;

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...NAVY);
    pdf.text(leftMeta[i][0], marginX + 3.5, rowY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...DARK_TEXT);
    pdf.text(`:  ${leftMeta[i][1]}`, marginX + 38, rowY);

    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(...NAVY);
    pdf.text(rightMeta[i][0], colMidX, rowY);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(...DARK_TEXT);
    pdf.text(`:  ${rightMeta[i][1]}`, colMidX + 38, rowY);
  }

  y += metaBoxH + 3.5;

  // Helper to draw table header
  const headerH = 8.5;
  const drawTableHeader = (startY: number): number => {
    pdf.setFillColor(...NAVY);
    pdf.setDrawColor(...NAVY);
    pdf.setLineWidth(0.25);
    pdf.rect(marginX, startY, contentW, headerH, 'FD');

    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(7.5);
    pdf.setTextColor(255, 255, 255);

    let cx = marginX;
    for (const col of columns) {
      pdf.text(col.label, cx + col.width / 2, startY + 5.5, { align: 'center' });
      if (cx > marginX) {
        pdf.setDrawColor(48, 76, 126);
        pdf.line(cx, startY, cx, startY + headerH);
      }
      cx += col.width;
    }
    return startY + headerH;
  };

  y = drawTableHeader(y);

  // Draw table rows
  const lineH = 3.7;
  const padY = 2.0;
  const padX = 2.0;

  if (sortedButir.length === 0) {
    pdf.setDrawColor(...BORDER);
    pdf.setFillColor(255, 255, 255);
    pdf.rect(marginX, y, contentW, 12, 'FD');
    pdf.setFont('helvetica', 'italic');
    pdf.setFontSize(8.5);
    pdf.setTextColor(...MUTED_TEXT);
    pdf.text('Belum ada butir kisi-kisi soal yang ditambahkan.', pageW / 2, y + 7.2, { align: 'center' });
    y += 12;
  } else {
    sortedButir.forEach((item, idx) => {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7.8);

      const cellTexts: Record<string, string[]> = {
        no: [String(idx + 1)],
        cp: pdf.splitTextToSize(item.capaianPembelajaran?.trim() || '-', columns.find(c => c.key === 'cp')!.width - padX * 2),
        materi: pdf.splitTextToSize(item.materi?.trim() || '-', columns.find(c => c.key === 'materi')!.width - padX * 2),
        indikator: pdf.splitTextToSize(item.indikatorSoal?.trim() || '-', columns.find(c => c.key === 'indikator')!.width - padX * 2),
        level: [item.levelKognitif || 'L2 (C3)'],
        bentuk: pdf.splitTextToSize(item.bentukSoal || 'PG', columns.find(c => c.key === 'bentuk')!.width - padX * 2),
        nomor: [String(item.nomorSoal)],
        bobot: [item.bobot !== undefined ? String(item.bobot) : '-'],
        kunci: pdf.splitTextToSize(item.kunciJawaban?.trim() || '-', (columns.find(c => c.key === 'kunci')?.width || 18) - padX * 2)
      };

      const maxLines = Math.max(
        1,
        ...columns.map(c => (cellTexts[c.key] || ['-']).length)
      );
      const rowH = Math.max(7.2, maxLines * lineH + padY * 2);

      // Page break if row won't fit
      if (y + rowH > bottomLimit) {
        pdf.addPage();
        y = 12;
        // Mini continuation title
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(8.5);
        pdf.setTextColor(...NAVY);
        pdf.text(
          `KISI-KISI PENULISAN SOAL — ${(docData.mataPelajaran || '').toUpperCase()} (${docData.kelas || ''}) [Lanjutan]`,
          marginX,
          y
        );
        y += 3.5;
        y = drawTableHeader(y);
      }

      // Row background
      if (idx % 2 === 1) {
        pdf.setFillColor(...ZEBRA_BG);
        pdf.rect(marginX, y, contentW, rowH, 'F');
      }

      // Row borders & text
      pdf.setDrawColor(...BORDER);
      pdf.setLineWidth(0.2);
      pdf.rect(marginX, y, contentW, rowH, 'S');

      let cx = marginX;
      for (const col of columns) {
        if (cx > marginX) {
          pdf.line(cx, y, cx, y + rowH);
        }

        const lines = cellTexts[col.key] || ['-'];
        const isBoldCol = col.key === 'nomor' || col.key === 'level';
        pdf.setFont('helvetica', isBoldCol ? 'bold' : 'normal');
        pdf.setFontSize(col.key === 'level' ? 7.2 : 7.8);

        if (col.key === 'level') {
          if (item.levelKognitif?.startsWith('L1')) pdf.setTextColor(14, 116, 144);
          else if (item.levelKognitif?.startsWith('L3')) pdf.setTextColor(180, 83, 9);
          else pdf.setTextColor(37, 99, 235);
        } else if (col.key === 'nomor') {
          pdf.setTextColor(...NAVY);
        } else {
          pdf.setTextColor(...DARK_TEXT);
        }

        const blockH = lines.length * lineH;
        const startTextY =
          col.align === 'center'
            ? y + (rowH - blockH) / 2 + lineH - 0.8
            : y + padY + lineH - 0.8;

        lines.forEach((ln, lineIdx) => {
          const textX = col.align === 'center' ? cx + col.width / 2 : cx + padX;
          pdf.text(ln, textX, startTextY + lineIdx * lineH, { align: col.align });
        });

        cx += col.width;
      }

      y += rowH;
    });
  }

  // Rekap Sebaran Soal & Level Kognitif
  const totalSoal = sortedButir.length;
  const countL1 = sortedButir.filter(b => b.levelKognitif === 'L1 (C1-C2)').length;
  const countL2 = sortedButir.filter(b => b.levelKognitif === 'L2 (C3)').length;
  const countL3 = sortedButir.filter(b => b.levelKognitif === 'L3 (C4-C6)').length;
  const totalBobot = sortedButir.reduce((acc, b) => acc + (Number(b.bobot) || 0), 0);

  const pct = (n: number) => (totalSoal > 0 ? Math.round((n / totalSoal) * 100) : 0);

  const rekapAndSignH = 44;
  if (y + rekapAndSignH > bottomLimit) {
    pdf.addPage();
    y = 14;
  } else {
    y += 4;
  }

  // Summary strip
  pdf.setFillColor(...SOFT_BG);
  pdf.setDrawColor(...BORDER);
  pdf.setLineWidth(0.25);
  pdf.roundedRect(marginX, y, contentW, 8.5, 1.2, 1.2, 'FD');
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(7.6);
  pdf.setTextColor(...NAVY);
  pdf.text('REKAP SEBARAN:', marginX + 3.5, y + 5.4);

  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(...DARK_TEXT);
  const rekapText = `Total: ${totalSoal} Soal  |  L1 (C1-C2): ${countL1} (${pct(countL1)}%)  •  L2 (C3): ${countL2} (${pct(countL2)}%)  •  L3 (C4-C6): ${countL3} (${pct(countL3)}%)${totalBobot > 0 ? `  |  Total Bobot: ${totalBobot} Poin` : ''}`;
  pdf.text(rekapText, marginX + 31, y + 5.4);

  y += 12.5;

  // Signature block (2 columns)
  const leftSigX = marginX + 44;
  const rightSigX = pageW - marginX - 48;
  const tglText = formatTanggalIndo(docData.tanggalPenyusunan);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8.5);
  pdf.setTextColor(...DARK_TEXT);

  pdf.text('Mengetahui,', leftSigX, y, { align: 'center' });
  pdf.text('Kepala Sekolah', leftSigX, y + 4.3, { align: 'center' });

  pdf.text(`${kota || 'Depok'}, ${tglText}`, rightSigX, y, { align: 'center' });
  pdf.text('Guru Mata Pelajaran / Penyusun', rightSigX, y + 4.3, { align: 'center' });

  // Principal signature image if available
  if (ttdDataUrl) {
    try {
      pdf.addImage(ttdDataUrl, 'PNG', leftSigX - 18, y + 5.5, 36, 15);
    } catch {
      // ignore
    }
  }

  const nameY = y + 23.5;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(8.8);
  pdf.text(kepsekNama || 'Kepala Sekolah', leftSigX, nameY, { align: 'center' });
  const kepsekW = Math.max(36, pdf.getTextWidth(kepsekNama || 'Kepala Sekolah') + 4);
  pdf.setDrawColor(...DARK_TEXT);
  pdf.setLineWidth(0.25);
  pdf.line(leftSigX - kepsekW / 2, nameY + 1, leftSigX + kepsekW / 2, nameY + 1);

  pdf.text(docData.penyusunNama || 'Guru Mata Pelajaran', rightSigX, nameY, { align: 'center' });
  const guruW = Math.max(36, pdf.getTextWidth(docData.penyusunNama || 'Guru Mata Pelajaran') + 4);
  pdf.line(rightSigX - guruW / 2, nameY + 1, rightSigX + guruW / 2, nameY + 1);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(7.8);
  pdf.setTextColor(...MUTED_TEXT);
  pdf.text(`NIP. ${kepsekNip?.trim() || '-'}`, leftSigX, nameY + 4.6, { align: 'center' });
  pdf.text(`NIP. ${docData.penyusunNip?.trim() || '-'}`, rightSigX, nameY + 4.6, { align: 'center' });

  // Page footer numbers
  const totalPages = pdf.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    pdf.setPage(p);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(7.2);
    pdf.setTextColor(...MUTED_TEXT);
    pdf.text(
      `${schoolName || 'Sekolah'} • Kisi-Kisi ${docData.mataPelajaran || ''} (${docData.kelas || ''})`,
      marginX,
      pageH - 5.5
    );
    pdf.text(`Halaman ${p} dari ${totalPages}`, pageW - marginX, pageH - 5.5, { align: 'right' });
  }

  pdf.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
