import { jsPDF } from 'jspdf';
import type { KonselingRecord } from '../components/BimbinganKonselingView';
import type { SchoolSettings, Siswa, Guru } from '../types/school';

export interface BkPdfSchoolContext {
  schoolSettings?: SchoolSettings;
  principalNama: string;
  principalNip: string;
  koordinatorBkNama: string;
  siswaList?: Siswa[];
  guruList?: Guru[];
}

export interface DownloadRekapBkPdfOptions extends BkPdfSchoolContext {
  records: KonselingRecord[];
  filterSummary?: {
    kelas?: string;
    kategori?: string;
    status?: string;
    searchTerm?: string;
  };
  titleOverride?: string;
  fileName?: string;
}

export interface DownloadBeritaAcaraBkPdfOptions extends BkPdfSchoolContext {
  record: KonselingRecord;
  fileName?: string;
}

function formatTanggalIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function generateNomorBeritaAcara(tanggal?: string, sequence = 1): string {
  const parts = (tanggal || new Date().toISOString().split('T')[0]).split('-');
  const tahun = parts[0] || String(new Date().getFullYear());
  const bulan = parts[1] || String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  return `BK/${tahun}/${bulan}/${seq}`;
}

function sanitizeText(val?: string | number | null): string {
  return String(val ?? '')
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, '  ')
    .trim();
}

function clipText(doc: jsPDF, text: string, maxWidth: number): string {
  const raw = sanitizeText(text);
  if (!raw) return '-';
  if (doc.getTextWidth(raw) <= maxWidth) return raw;
  const ell = '...';
  const ellW = doc.getTextWidth(ell);
  let out = raw;
  while (out.length > 1 && doc.getTextWidth(out) + ellW > maxWidth) {
    out = out.slice(0, -1);
  }
  return out.trimEnd() + ell;
}

async function loadImageAsPngDataUrl(url?: string): Promise<string | null> {
  if (!url || !url.trim()) return null;
  if (url.startsWith('data:image/png') || url.startsWith('data:image/jpeg')) return url;

  return new Promise((resolve) => {
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

function drawKopSurat(
  doc: jsPDF,
  marginX: number,
  contentW: number,
  schoolSettings?: SchoolSettings,
  logoDataUrl?: string | null
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const centerX = pageW / 2;
  const schoolName = (schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase();
  const schoolAddress =
    schoolSettings?.alamat || 'Jl. Raya Sawangan No. 45, Depok, Jawa Barat';
  const schoolPhone = schoolSettings?.telepon || '(021) 77889922';
  const schoolEmail = schoolSettings?.email || 'info@alfakhir.sch.id';
  const schoolNpsn = schoolSettings?.npsn ? `NPSN: ${schoolSettings.npsn}` : '';

  const y = 11;
  const textShift = logoDataUrl ? 6 : 0;

  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', marginX + 1, y, 16, 16);
    } catch {
      // ignore image errors
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.2);
  doc.setTextColor(15, 118, 110); // teal-700
  doc.text('UNIT LAYANAN BIMBINGAN DAN KONSELING (BK)', centerX + textShift, y + 3.5, {
    align: 'center',
  });

  doc.setFontSize(13.5);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(clipText(doc, schoolName, contentW - 26), centerX + textShift, y + 9.2, {
    align: 'center',
  });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.text(clipText(doc, schoolAddress, contentW - 24), centerX + textShift, y + 13.4, {
    align: 'center',
  });

  const contactLine = [
    `Telp: ${schoolPhone}`,
    `Email: ${schoolEmail}`,
    schoolNpsn,
  ]
    .filter(Boolean)
    .join('  •  ');
  doc.text(clipText(doc, contactLine, contentW - 24), centerX + textShift, y + 17.0, {
    align: 'center',
  });

  const lineY = y + 19.5;
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.9);
  doc.line(marginX, lineY, marginX + contentW, lineY);
  doc.setLineWidth(0.3);
  doc.line(marginX, lineY + 1.2, marginX + contentW, lineY + 1.2);

  return lineY + 6.5;
}

function addPageFooters(doc: jsPDF, schoolName: string, marginX: number): void {
  const totalPages = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const printDate = formatTanggalIndo(new Date().toISOString().split('T')[0]);

  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.line(marginX, pageH - 10.5, pageW - marginX, pageH - 10.5);

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.2);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Dokumen Rahasia (Konfidensial) • Unit BK ${schoolName} • Dicetak ${printDate}`,
      marginX,
      pageH - 6.8
    );
    doc.setFont('helvetica', 'normal');
    doc.text(`Halaman ${p} dari ${totalPages}`, pageW - marginX, pageH - 6.8, {
      align: 'right',
    });
  }
}

/**
 * Unduh Rekapitulasi Catatan Sesi Konseling BK dalam bentuk PDF (A4 Landscape).
 * Mendukung mode terisi (daftar catatan sesuai filter) maupun formulir siap isi bila belum ada data.
 */
export async function downloadRekapKonselingPdf(
  options: DownloadRekapBkPdfOptions
): Promise<void> {
  const {
    records,
    schoolSettings,
    principalNama,
    principalNip,
    koordinatorBkNama,
    filterSummary,
    titleOverride,
    fileName,
  } = options;

  const logoDataUrl = await loadImageAsPngDataUrl(schoolSettings?.logoUrl);

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageW = doc.internal.pageSize.getWidth(); // 297
  const pageH = doc.internal.pageSize.getHeight(); // 210
  const marginX = 13;
  const contentW = pageW - marginX * 2; // 271
  const bottomLimit = pageH - 16;

  const schoolName = schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR';
  const kota = schoolSettings?.kotaKabupaten || 'Depok';
  const tahunAjaran = schoolSettings?.tahunAjaran || '2026/2027';
  const semesterAktif = schoolSettings?.semesterAktif || schoolSettings?.semester || 'Ganjil';

  let y = drawKopSurat(doc, marginX, contentW, schoolSettings, logoDataUrl);

  // Document Title
  const docTitle =
    titleOverride || 'REKAPITULASI CATATAN SESI BIMBINGAN KONSELING (BK)';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(docTitle, pageW / 2, y, { align: 'center' });

  const titleW = doc.getTextWidth(docTitle);
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.4);
  doc.line(pageW / 2 - titleW / 2, y + 1.2, pageW / 2 + titleW / 2, y + 1.2);
  y += 5.2;

  // Subtitle / Filter metadata
  const filterParts: string[] = [
    `Tahun Ajaran ${tahunAjaran} (${semesterAktif})`,
    `Kelas: ${filterSummary?.kelas && filterSummary.kelas !== 'Semua' ? filterSummary.kelas : 'Semua Kelas'}`,
    `Kategori: ${filterSummary?.kategori && filterSummary.kategori !== 'Semua' ? filterSummary.kategori : 'Semua Kategori'}`,
    `Status: ${filterSummary?.status && filterSummary.status !== 'Semua' ? filterSummary.status : 'Semua Status'}`,
  ];
  if (filterSummary?.searchTerm?.trim()) {
    filterParts.push(`Pencarian: "${filterSummary.searchTerm.trim()}"`);
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text(clipText(doc, filterParts.join('   |   '), contentW), pageW / 2, y, {
    align: 'center',
  });
  y += 4.5;

  // Compact KPI Summary Bar
  const totalKasus = records.length;
  const selesaiCount = records.filter((r) => r.status === 'Selesai').length;
  const penangananCount = records.filter((r) => r.status === 'Dalam Penanganan').length;
  const rujukanCount = records.filter((r) => r.status === 'Rujukan').length;
  const totalPoin = records.reduce((acc, cur) => acc + (cur.poinPelanggaran || 0), 0);

  const statItems = [
    { label: 'TOTAL SESI', value: `${totalKasus} Kasus`, color: [15, 118, 110] as [number, number, number] },
    { label: 'SELESAI', value: `${selesaiCount} Kasus`, color: [5, 150, 105] as [number, number, number] },
    { label: 'DALAM PENANGANAN', value: `${penangananCount} Aktif`, color: [217, 119, 6] as [number, number, number] },
    { label: 'RUJUKAN', value: `${rujukanCount} Kasus`, color: [37, 99, 235] as [number, number, number] },
    { label: 'AKUMULASI POIN', value: `${totalPoin} Poin`, color: [225, 29, 72] as [number, number, number] },
  ];

  const cardGap = 3;
  const cardW = (contentW - cardGap * (statItems.length - 1)) / statItems.length;
  const cardH = 11.5;

  statItems.forEach((st, idx) => {
    const cx = marginX + idx * (cardW + cardGap);
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(cx, y, cardW, cardH, 1.5, 1.5, 'FD');

    // Left accent strip
    doc.setFillColor(st.color[0], st.color[1], st.color[2]);
    doc.rect(cx, y + 1.5, 1.4, cardH - 3, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(st.label, cx + 4, y + 4.3);

    doc.setFontSize(9.5);
    doc.setTextColor(st.color[0], st.color[1], st.color[2]);
    doc.text(st.value, cx + 4, y + 9.2);
  });

  y += cardH + 4.5;

  // Table Columns Definition (total = 271mm)
  const cols = [
    { key: 'no', label: 'No', width: 9, align: 'center' as const },
    { key: 'tanggal', label: 'Tanggal & Jam', width: 27, align: 'left' as const },
    { key: 'siswa', label: 'Siswa, Kelas & NISN', width: 44, align: 'left' as const },
    { key: 'jenis', label: 'Jenis & Konselor', width: 41, align: 'left' as const },
    { key: 'masalah', label: 'Permasalahan / Topik', width: 64, align: 'left' as const },
    { key: 'tindak', label: 'Hasil & Tindak Lanjut', width: 60, align: 'left' as const },
    { key: 'status', label: 'Status & Poin', width: 26, align: 'center' as const },
  ];

  const drawTableHeader = (startY: number): number => {
    const headerH = 8;
    doc.setFillColor(15, 118, 110); // teal-700
    doc.rect(marginX, startY, contentW, headerH, 'F');

    doc.setDrawColor(15, 118, 110);
    doc.setLineWidth(0.3);
    doc.rect(marginX, startY, contentW, headerH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(255, 255, 255);

    let cx = marginX;
    cols.forEach((col, i) => {
      if (i > 0) {
        doc.setDrawColor(45, 212, 191);
        doc.setLineWidth(0.15);
        doc.line(cx, startY, cx, startY + headerH);
      }
      const tx = col.align === 'center' ? cx + col.width / 2 : cx + 2.2;
      doc.text(col.label, tx, startY + 5.2, { align: col.align });
      cx += col.width;
    });

    return startY + headerH;
  };

  y = drawTableHeader(y);

  if (records.length === 0) {
    // Draw clean notice + ready-to-fill blank rows so PDF is immediately usable even when empty
    const noteH = 9;
    doc.setFillColor(240, 253, 250);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(marginX, y, contentW, noteH, 'FD');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(15, 118, 110);
    doc.text(
      'Belum ada catatan sesi konseling tersimpan pada filter aktif. Tabel di bawah dapat digunakan sebagai formulir pencatatan manual.',
      pageW / 2,
      y + 5.6,
      { align: 'center' }
    );
    y += noteH;

    const blankRowCount = 7;
    const blankRowH = 10.5;
    for (let r = 0; r < blankRowCount; r++) {
      if (r % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentW, blankRowH, 'F');
      }
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.22);
      doc.rect(marginX, y, contentW, blankRowH, 'S');

      let cx = marginX;
      cols.forEach((col, ci) => {
        if (ci > 0) {
          doc.line(cx, y, cx, y + blankRowH);
        }
        if (ci === 0) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.8);
          doc.setTextColor(100, 116, 139);
          doc.text(String(r + 1), cx + col.width / 2, y + 6.5, { align: 'center' });
        }
        cx += col.width;
      });
      y += blankRowH;
    }
  } else {
    const lineH = 3.7;
    const padY = 2.4;

    records.forEach((rec, idx) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.6);

      const tanggalLines = doc.splitTextToSize(
        `${formatTanggalIndo(rec.tanggal)}${rec.jamSesi ? `\n${rec.jamSesi} WIB` : ''}`,
        cols[1].width - 4
      );
      const siswaText = `${rec.namaSiswa}\nKelas ${rec.kelas}${rec.nisn ? `\nNISN: ${rec.nisn}` : ''}`;
      const siswaLines = doc.splitTextToSize(siswaText, cols[2].width - 4);

      const jenisText = `${rec.jenisBimbingan}\n${rec.guruBk}${rec.metodeLayanan ? `\n(${rec.metodeLayanan})` : ''}`;
      const jenisLines = doc.splitTextToSize(jenisText, cols[3].width - 4);

      const masalahLines = doc.splitTextToSize(
        sanitizeText(rec.permasalahan) || '-',
        cols[4].width - 4
      );

      const tindakCombined = [
        rec.hasilKonseling ? `Hasil: ${sanitizeText(rec.hasilKonseling)}` : '',
        rec.tindakLanjut ? `Tindak Lanjut: ${sanitizeText(rec.tindakLanjut)}` : '',
        rec.jadwalEvaluasi ? `Evaluasi: ${formatTanggalIndo(rec.jadwalEvaluasi)}` : '',
      ]
        .filter(Boolean)
        .join('\n') || '-';
      const tindakLines = doc.splitTextToSize(tindakCombined, cols[5].width - 4);

      const statusText = `${rec.status}${rec.poinPelanggaran && rec.poinPelanggaran > 0 ? `\n(+${rec.poinPelanggaran} Poin)` : ''}`;
      const statusLines = doc.splitTextToSize(statusText, cols[6].width - 3);

      const maxLines = Math.max(
        1,
        tanggalLines.length,
        siswaLines.length,
        jenisLines.length,
        masalahLines.length,
        tindakLines.length,
        statusLines.length
      );
      const rowH = Math.max(9.5, maxLines * lineH + padY * 2);

      // Page break if row won't fit
      if (y + rowH > bottomLimit) {
        doc.addPage();
        y = 14;
        y = drawTableHeader(y);
      }

      // Zebra row background
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentW, rowH, 'F');
      }

      // Row outer & column borders
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.22);
      doc.rect(marginX, y, contentW, rowH, 'S');

      let cx = marginX;
      cols.forEach((col, ci) => {
        if (ci > 0) {
          doc.line(cx, y, cx, y + rowH);
        }
        cx += col.width;
      });

      // Render cell contents
      let xPos = marginX;
      const baseTextY = y + padY + 2.8;

      // Col 0: No
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(51, 65, 85);
      doc.text(String(idx + 1), xPos + cols[0].width / 2, baseTextY, { align: 'center' });
      xPos += cols[0].width;

      // Col 1: Tanggal & Jam
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(30, 41, 59);
      doc.text(tanggalLines, xPos + 2, baseTextY, { lineHeightFactor: 1.32 });
      xPos += cols[1].width;

      // Col 2: Siswa, Kelas & NISN
      siswaLines.forEach((line: string, li: number) => {
        if (li === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(71, 85, 105);
        }
        doc.setFontSize(7.5);
        doc.text(line, xPos + 2, baseTextY + li * lineH);
      });
      xPos += cols[2].width;

      // Col 3: Jenis & Konselor
      jenisLines.forEach((line: string, li: number) => {
        if (li === 0) {
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 118, 110);
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
        }
        doc.setFontSize(7.5);
        doc.text(line, xPos + 2, baseTextY + li * lineH);
      });
      xPos += cols[3].width;

      // Col 4: Permasalahan
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text(masalahLines, xPos + 2, baseTextY, { lineHeightFactor: 1.32 });
      xPos += cols[4].width;

      // Col 5: Tindak Lanjut
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.4);
      doc.setTextColor(51, 65, 85);
      doc.text(tindakLines, xPos + 2, baseTextY, { lineHeightFactor: 1.32 });
      xPos += cols[5].width;

      // Col 6: Status & Poin
      statusLines.forEach((line: string, li: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.3);
        if (li === 0) {
          if (rec.status === 'Selesai') doc.setTextColor(5, 150, 105);
          else if (rec.status === 'Dalam Penanganan') doc.setTextColor(180, 83, 9);
          else doc.setTextColor(29, 78, 216);
        } else {
          doc.setTextColor(190, 18, 60);
        }
        doc.text(line, xPos + cols[6].width / 2, baseTextY + li * lineH, { align: 'center' });
      });

      y += rowH;
    });
  }

  // Signature Block (keep intact on page)
  const sigBlockH = 38;
  if (y + sigBlockH + 6 > bottomLimit) {
    doc.addPage();
    y = 18;
  } else {
    y += 8;
  }

  const leftSigX = marginX + contentW * 0.23;
  const rightSigX = marginX + contentW * 0.77;
  const todayIndo = formatTanggalIndo(new Date().toISOString().split('T')[0]);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);

  // Left: Kepala Sekolah
  doc.text('Mengetahui,', leftSigX, y, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Kepala ${schoolName}`, leftSigX, y + 4.3, { align: 'center' });

  doc.text(principalNama || 'Kepala Sekolah', leftSigX, y + 24.5, { align: 'center' });
  const kepsekW = doc.getTextWidth(principalNama || 'Kepala Sekolah');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(leftSigX - kepsekW / 2, y + 25.4, leftSigX + kepsekW / 2, y + 25.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${principalNip || '-'}`, leftSigX, y + 29.2, { align: 'center' });

  // Right: Koordinator BK
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(`${kota}, ${todayIndo}`, rightSigX, y, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text('Koordinator Bimbingan Konseling', rightSigX, y + 4.3, { align: 'center' });

  doc.text(koordinatorBkNama || 'Guru BK', rightSigX, y + 24.5, { align: 'center' });
  const bkW = doc.getTextWidth(koordinatorBkNama || 'Guru BK');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(rightSigX - bkW / 2, y + 25.4, rightSigX + bkW / 2, y + 25.4);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.8);
  doc.setTextColor(71, 85, 105);
  doc.text('Unit Layanan BK', rightSigX, y + 29.2, { align: 'center' });

  addPageFooters(doc, schoolName, marginX);

  const outputName =
    fileName || `Rekap_Catatan_Konseling_BK_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(outputName);
}

/**
 * Unduh Berita Acara Layanan Bimbingan Konseling (Per Siswa) dalam bentuk PDF (A4 Portrait).
 */
export async function downloadBeritaAcaraKonselingPdf(
  options: DownloadBeritaAcaraBkPdfOptions
): Promise<void> {
  const {
    record,
    schoolSettings,
    principalNama,
    principalNip,
    siswaList = [],
    guruList = [],
    fileName,
  } = options;

  const logoDataUrl = await loadImageAsPngDataUrl(schoolSettings?.logoUrl);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  const pageW = doc.internal.pageSize.getWidth(); // 210
  const pageH = doc.internal.pageSize.getHeight(); // 297
  const marginX = 16;
  const contentW = pageW - marginX * 2; // 178
  const bottomLimit = pageH - 18;

  const schoolName = schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR';
  const kota = schoolSettings?.kotaKabupaten || 'Depok';
  const nomorBa = record.nomorBeritaAcara || generateNomorBeritaAcara(record.tanggal, 1);

  const siswaData =
    siswaList.find((s) => s.id === record.siswaId) ||
    siswaList.find((s) => s.nama === record.namaSiswa);
  const guruData = guruList.find((g) => g.nama === record.guruBk);
  const rawNisnCandidates = [record.nisn, siswaData?.nisn, siswaData?.nis];
  const nisnVal =
    rawNisnCandidates.find((v) => /^\d{4,18}$/.test(String(v ?? '').trim())) || '-';
  const rawWaliCandidates = [siswaData?.namaAyah, siswaData?.namaIbu, siswaData?.namaWali];
  const waliVal =
    rawWaliCandidates.find((v) => {
      const c = String(v ?? '').trim();
      return (
        c.length > 0 &&
        c !== '-' &&
        !/^(sd|sdn|sdit|mi|min|smp|mts|tk|paud)\b/i.test(c) &&
        !/^[\d\s\-_./]+$/.test(c)
      );
    }) || 'Orang Tua/Wali';

  let y = drawKopSurat(doc, marginX, contentW, schoolSettings, logoDataUrl);

  // Title Block
  const titleStr = 'BERITA ACARA LAYANAN BIMBINGAN KONSELING';
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text(titleStr, pageW / 2, y, { align: 'center' });
  const titleW = doc.getTextWidth(titleStr);
  doc.setDrawColor(15, 118, 110);
  doc.setLineWidth(0.45);
  doc.line(pageW / 2 - titleW / 2, y + 1.3, pageW / 2 + titleW / 2, y + 1.3);

  y += 5.3;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.8);
  doc.setTextColor(71, 85, 105);
  doc.text(`Nomor: ${nomorBa}`, pageW / 2, y, { align: 'center' });
  y += 7;

  // Identity Metadata Table (2 pairs of label/value per row)
  const metaRows: Array<[string, string, string, string]> = [
    [
      'Nama Peserta Didik',
      record.namaSiswa || '-',
      'Tanggal & Jam Sesi',
      `${formatTanggalIndo(record.tanggal)}${record.jamSesi ? ` (${record.jamSesi} WIB)` : ''}`,
    ],
    [
      'NISN / NIS',
      nisnVal,
      'Jenis Bimbingan',
      record.jenisBimbingan || '-',
    ],
    [
      'Kelas / Rombel',
      `Kelas ${record.kelas || '-'}`,
      'Metode Layanan',
      record.metodeLayanan || 'Tatap Muka Individu',
    ],
    [
      'Guru BK / Konselor',
      record.guruBk || '-',
      'Status Penanganan',
      `${record.status}${record.poinPelanggaran && record.poinPelanggaran > 0 ? ` (+${record.poinPelanggaran} Poin)` : ''}`,
    ],
  ];

  if (record.jadwalEvaluasi || record.melibatkanOrangTua) {
    metaRows.push([
      'Jadwal Evaluasi',
      record.jadwalEvaluasi ? formatTanggalIndo(record.jadwalEvaluasi) : '-',
      'Koordinasi Orang Tua',
      record.melibatkanOrangTua ? `Ya (${waliVal})` : 'Internal Sekolah',
    ]);
  }

  const colW = [36, 53, 37, 52]; // sum = 178
  const metaLineH = 4.0;
  const metaPadY = 2.2;

  metaRows.forEach((row) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.3);
    const v1 = doc.splitTextToSize(sanitizeText(row[1]) || '-', colW[1] - 4);
    const v2 = doc.splitTextToSize(sanitizeText(row[3]) || '-', colW[3] - 4);
    const linesCount = Math.max(1, v1.length, v2.length);
    const rowH = Math.max(7.4, linesCount * metaLineH + metaPadY * 2);

    // Label backgrounds
    doc.setFillColor(248, 250, 252);
    doc.rect(marginX, y, colW[0], rowH, 'F');
    doc.rect(marginX + colW[0] + colW[1], y, colW[2], rowH, 'F');

    // Cell borders
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(marginX, y, contentW, rowH, 'S');
    doc.line(marginX + colW[0], y, marginX + colW[0], y + rowH);
    doc.line(marginX + colW[0] + colW[1], y, marginX + colW[0] + colW[1], y + rowH);
    doc.line(
      marginX + colW[0] + colW[1] + colW[2],
      y,
      marginX + colW[0] + colW[1] + colW[2],
      y + rowH
    );

    const textY = y + metaPadY + 2.8;
    // Left label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.1);
    doc.setTextColor(51, 65, 85);
    doc.text(row[0], marginX + 2.2, textY);

    // Left value
    doc.setFont('helvetica', row[0] === 'Nama Peserta Didik' ? 'bold' : 'normal');
    doc.setFontSize(8.3);
    doc.setTextColor(15, 23, 42);
    doc.text(v1, marginX + colW[0] + 2.2, textY, { lineHeightFactor: 1.32 });

    // Right label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.1);
    doc.setTextColor(51, 65, 85);
    doc.text(row[2], marginX + colW[0] + colW[1] + 2.2, textY);

    // Right value
    doc.setFont('helvetica', row[2] === 'Jenis Bimbingan' || row[2] === 'Status Penanganan' ? 'bold' : 'normal');
    doc.setFontSize(8.3);
    if (row[2] === 'Status Penanganan') {
      if (record.status === 'Selesai') doc.setTextColor(5, 150, 105);
      else if (record.status === 'Dalam Penanganan') doc.setTextColor(180, 83, 9);
      else doc.setTextColor(29, 78, 216);
    } else {
      doc.setTextColor(15, 23, 42);
    }
    doc.text(v2, marginX + colW[0] + colW[1] + colW[2] + 2.2, textY, { lineHeightFactor: 1.32 });

    y += rowH;
  });

  y += 6;

  // Narrative Sections Helper
  const drawNarrativeSection = (sectionTitle: string, bodyText: string) => {
    const headerH = 7.2;
    const bodyPadY = 3.2;
    const lineH = 4.6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.1);
    const wrapped = doc.splitTextToSize(sanitizeText(bodyText) || '-', contentW - 7);
    const bodyH = Math.max(14, wrapped.length * lineH + bodyPadY * 2);
    const totalH = headerH + bodyH;

    if (y + totalH > bottomLimit) {
      doc.addPage();
      y = 16;
    }

    // Header Bar
    doc.setFillColor(240, 253, 250); // teal-50
    doc.setDrawColor(153, 246, 228); // teal-200
    doc.setLineWidth(0.25);
    doc.rect(marginX, y, contentW, headerH, 'FD');

    // Left Teal Accent Bar
    doc.setFillColor(15, 118, 110);
    doc.rect(marginX, y, 2, headerH, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.7);
    doc.setTextColor(15, 118, 110);
    doc.text(sectionTitle, marginX + 4.5, y + 4.9);

    // Body Box
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.rect(marginX, y + headerH, contentW, bodyH, 'FD');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.1);
    doc.setTextColor(15, 23, 42);
    doc.text(wrapped, marginX + 3.5, y + headerH + bodyPadY + 3.1, {
      lineHeightFactor: 1.42,
    });

    y += totalH + 4.5;
  };

  drawNarrativeSection(
    'I. URAIAN PERMASALAHAN / TOPIK KONSELING',
    record.permasalahan || '-'
  );

  drawNarrativeSection(
    'II. HASIL ANALISIS & WAWANCARA KONSELING',
    record.hasilKonseling || '-'
  );

  const tindakFull =
    (record.tindakLanjut || '-') +
    (record.melibatkanOrangTua
      ? `\n\nCatatan Koordinasi Orang Tua / Wali:\n${
          record.catatanOrangTua || 'Orang tua/wali peserta didik telah dihubungi untuk pendampingan bersama.'
        }`
      : '');
  drawNarrativeSection('III. TINDAK LANJUT & REKOMENDASI PEMBINAAN', tindakFull);

  // Signatures Block (2 columns + Kepala Sekolah centered below)
  const sigTotalH = 68;
  if (y + sigTotalH > bottomLimit) {
    doc.addPage();
    y = 20;
  } else {
    y += 5;
  }

  const leftColX = marginX + contentW * 0.24;
  const rightColX = marginX + contentW * 0.76;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);

  // Left: Peserta Didik
  doc.text('Peserta Didik Yang Bersangkutan,', leftColX, y + 4.5, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(record.namaSiswa || '-', leftColX, y + 25.5, { align: 'center' });
  const siswaNameW = doc.getTextWidth(record.namaSiswa || '-');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(leftColX - siswaNameW / 2, y + 26.5, leftColX + siswaNameW / 2, y + 26.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`Kelas ${record.kelas || '-'}`, leftColX, y + 30.5, { align: 'center' });

  // Right: Guru BK / Konselor
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text(`${kota}, ${formatTanggalIndo(record.tanggal)}`, rightColX, y, { align: 'center' });
  doc.text('Konselor / Guru Bimbingan Konseling,', rightColX, y + 4.5, { align: 'center' });

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(record.guruBk || '-', rightColX, y + 25.5, { align: 'center' });
  const guruNameW = doc.getTextWidth(record.guruBk || '-');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(rightColX - guruNameW / 2, y + 26.5, rightColX + guruNameW / 2, y + 26.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${guruData?.nip || '-'}`, rightColX, y + 30.5, { align: 'center' });

  // Center Bottom: Kepala Sekolah
  const kepsekY = y + 38;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(30, 41, 59);
  doc.text('Mengetahui,', pageW / 2, kepsekY, { align: 'center' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Kepala ${schoolName}`, pageW / 2, kepsekY + 4.5, { align: 'center' });

  doc.setTextColor(15, 23, 42);
  doc.text(principalNama || 'Kepala Sekolah', pageW / 2, kepsekY + 24.5, { align: 'center' });
  const kepW = doc.getTextWidth(principalNama || 'Kepala Sekolah');
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(pageW / 2 - kepW / 2, kepsekY + 25.5, pageW / 2 + kepW / 2, kepsekY + 25.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.2);
  doc.setTextColor(71, 85, 105);
  doc.text(`NIP. ${principalNip || '-'}`, pageW / 2, kepsekY + 29.5, { align: 'center' });

  addPageFooters(doc, schoolName, marginX);

  const safeName = (record.namaSiswa || 'Siswa').replace(/[^a-zA-Z0-9_-]/g, '_');
  const outputName = fileName || `Berita_Acara_BK_${safeName}_${record.tanggal || 'sesi'}.pdf`;
  doc.save(outputName);
}
