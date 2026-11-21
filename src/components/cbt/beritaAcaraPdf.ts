import { jsPDF } from 'jspdf';
import { BeritaAcaraUjianItem } from '../../types/school';
import { enhanceSignatureForDisplay } from './signatureUtils';

export interface DownloadBeritaAcaraPdfOptions {
  items: BeritaAcaraUjianItem[];
  schoolName: string;
  schoolAddress?: string;
  schoolNpsn?: string;
  examTitle: string;
  examShortName: string;
  kota: string;
  kepsekNama: string;
  kepsekNip?: string;
  logoUrl?: string;
  ttdKepalaSekolahUrl?: string;
  blankFormMode?: boolean;
  fileName: string;
}

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
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

function parseIsoDate(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((isoDate || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
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

function clipText(doc: jsPDF, text: string, maxWidth: number): string {
  const raw = (text || '').trim();
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

export async function downloadBeritaAcaraPdf(options: DownloadBeritaAcaraPdfOptions): Promise<void> {
  const {
    items,
    schoolName,
    schoolAddress,
    schoolNpsn,
    examTitle,
    examShortName,
    kota,
    kepsekNama,
    kepsekNip,
    logoUrl,
    ttdKepalaSekolahUrl,
    blankFormMode = false,
    fileName
  } = options;

  if (!items || items.length === 0) return;

  const [logoDataUrl, enhancedTtdRaw] = await Promise.all([
    loadImageAsPngDataUrl(logoUrl),
    ttdKepalaSekolahUrl
      ? enhanceSignatureForDisplay(ttdKepalaSekolahUrl).catch(() => ttdKepalaSekolahUrl)
      : Promise.resolve('')
  ]);
  const ttdDataUrl = await loadImageAsPngDataUrl(enhancedTtdRaw || ttdKepalaSekolahUrl);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageW = doc.internal.pageSize.getWidth(); // 210
  const marginX = 16;
  const contentW = pageW - marginX * 2; // 178

  items.forEach((item, pageIdx) => {
    if (pageIdx > 0) doc.addPage();

    const parsedDate = parseIsoDate(item.tanggal);
    const hariStr = parsedDate ? HARI_ID[parsedDate.getDay()] : '................';
    const tglStr = parsedDate ? String(parsedDate.getDate()) : '....';
    const bulanStr = parsedDate ? BULAN_ID[parsedDate.getMonth()] : '................';
    const tahunStr = parsedDate ? String(parsedDate.getFullYear()) : '......';
    const fullDateStr = parsedDate ? `${tglStr} ${bulanStr} ${tahunStr}` : `${item.tanggal || '........................'}`;

    // =========================================================
    // 1. KOP SURAT RESMI SEKOLAH
    // =========================================================
    let y = 12;
    if (logoDataUrl) {
      try {
        doc.addImage(logoDataUrl, 'PNG', marginX, y, 18, 18);
      } catch {
        // ignore
      }
    }

    const centerX = pageW / 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('PANITIA PENYELENGGARA UJIAN', centerX + 4, y + 4.2, { align: 'center' });

    doc.setFontSize(13.5);
    doc.setTextColor(10, 54, 107);
    doc.text(clipText(doc, schoolName.toUpperCase(), contentW - 26), centerX + 4, y + 10.2, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    const subInfoParts: string[] = [];
    if (schoolAddress && schoolAddress.trim()) subInfoParts.push(schoolAddress.trim());
    if (schoolNpsn && schoolNpsn.trim()) subInfoParts.push(`NPSN: ${schoolNpsn.trim()}`);
    const subInfo = subInfoParts.join('  ·  ') || 'Sistem Informasi & Evaluasi Akademik Terpadu';
    doc.text(clipText(doc, subInfo, contentW - 24), centerX + 4, y + 15.2, { align: 'center' });

    y += 20;
    doc.setDrawColor(10, 54, 107);
    doc.setLineWidth(0.9);
    doc.line(marginX, y, marginX + contentW, y);
    doc.setLineWidth(0.3);
    doc.line(marginX, y + 1.2, marginX + contentW, y + 1.2);
    y += 8;

    // =========================================================
    // 2. JUDUL BERITA ACARA
    // =========================================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42);
    doc.text('BERITA ACARA PELAKSANAAN UJIAN', centerX, y, { align: 'center' });

    const titleW = doc.getTextWidth('BERITA ACARA PELAKSANAAN UJIAN');
    doc.setDrawColor(10, 54, 107);
    doc.setLineWidth(0.45);
    doc.line(centerX - titleW / 2, y + 1.3, centerX + titleW / 2, y + 1.3);

    y += 5.5;
    doc.setFontSize(9.2);
    doc.setTextColor(10, 54, 107);
    doc.text(clipText(doc, examTitle.toUpperCase(), contentW), centerX, y, { align: 'center' });

    if (item.nomorBeritaAcara && item.nomorBeritaAcara.trim()) {
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Nomor: ${item.nomorBeritaAcara.trim()}`, centerX, y, { align: 'center' });
    }
    y += 8.5;

    // =========================================================
    // 3. PARAGRAF PEMBUKA BAKU
    // =========================================================
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42);
    const introText =
      `Pada hari ini, ${hariStr} tanggal ${tglStr} bulan ${bulanStr} tahun ${tahunStr}, telah diselenggarakan ` +
      `${examShortName} di ${schoolName} mulai pukul ${item.jamMulai || '07:30'} WIB sampai dengan pukul ` +
      `${item.jamSelesai || '09:00'} WIB dengan rincian pelaksanaan sebagai berikut:`;
    const introLines = doc.splitTextToSize(introText, contentW);
    doc.text(introLines, marginX, y, { lineHeightFactor: 1.45 });
    y += introLines.length * 4.9 + 4;

    // =========================================================
    // 4. RINCIAN PELAKSANAAN (1 - 7)
    // =========================================================
    const hadirVal = blankFormMode ? '........ orang' : `${item.jumlahHadir} orang`;
    const tidakHadirVal = blankFormMode ? '........ orang' : `${item.jumlahTidakHadir} orang`;
    const terdaftarVal = item.jumlahTerdaftar > 0 ? `${item.jumlahTerdaftar} orang` : '........ orang';

    const detailRows: Array<{ no: string; label: string; value: string; highlight?: boolean }> = [
      { no: '1.', label: 'Nama Sekolah / Madrasah', value: schoolName },
      { no: '2.', label: 'Ruang Ujian', value: item.ruang || '-', highlight: true },
      { no: '3.', label: 'Sesi / Mata Pelajaran', value: `${item.sesi || 'Sesi 1'}  —  ${item.mataPelajaran || '-'}` },
      { no: '4.', label: 'Pengawas Ruang Ujian', value: item.pengawasNama || '-' },
      { no: '5.', label: 'Jumlah Peserta Seharusnya', value: terdaftarVal },
      { no: '6.', label: 'Jumlah Peserta Yang Hadir', value: hadirVal },
      { no: '7.', label: 'Jumlah Peserta Tidak Hadir', value: tidakHadirVal }
    ];

    const detailBoxStartY = y;
    const detailRowH = 7.4;
    const totalDetailH = detailRows.length * detailRowH;

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, detailBoxStartY, contentW, totalDetailH, 1.8, 1.8, 'S');

    detailRows.forEach((row, idx) => {
      const ry = detailBoxStartY + idx * detailRowH;
      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX + 0.2, ry + 0.1, contentW - 0.4, detailRowH - 0.2, 'F');
      }
      if (idx > 0) {
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.2);
        doc.line(marginX, ry, marginX + contentW, ry);
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.8);
      doc.setTextColor(71, 85, 105);
      doc.text(row.no, marginX + 3, ry + 5);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(30, 41, 59);
      doc.text(row.label, marginX + 10, ry + 5);
      doc.text(':', marginX + 66, ry + 5);

      doc.setFont('helvetica', row.highlight || idx >= 4 ? 'bold' : 'bold');
      doc.setTextColor(row.highlight ? 10 : 15, row.highlight ? 54 : 23, row.highlight ? 107 : 42);
      doc.text(clipText(doc, row.value, contentW - 73), marginX + 70, ry + 5);
    });

    y = detailBoxStartY + totalDetailH + 6.5;

    // =========================================================
    // 5. DAFTAR PESERTA YANG TIDAK HADIR
    // =========================================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(10, 54, 107);
    doc.text('A. Daftar Peserta Yang Tidak Hadir', marginX, y);
    y += 3.5;

    const absCols = [
      { label: 'NO', w: 10, align: 'center' as const },
      { label: 'NO. PESERTA', w: 32, align: 'center' as const },
      { label: 'NAMA LENGKAP SISWA', w: 72, align: 'left' as const },
      { label: 'KELAS', w: 34, align: 'left' as const },
      { label: 'KETERANGAN', w: 30, align: 'center' as const }
    ];

    // Table header
    let ax = marginX;
    doc.setFillColor(10, 54, 107);
    doc.rect(marginX, y, contentW, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.6);
    doc.setTextColor(255, 255, 255);
    absCols.forEach(c => {
      const tx = c.align === 'center' ? ax + c.w / 2 : ax + 2.2;
      doc.text(c.label, tx, y + 4.7, { align: c.align });
      ax += c.w;
    });
    y += 7;

    const absentList = blankFormMode ? [] : (item.pesertaTidakHadir || []);
    const absRowH = 6.8;

    if (absentList.length > 0) {
      const maxRows = Math.min(absentList.length, 7);
      for (let i = 0; i < maxRows; i++) {
        const ab = absentList[i];
        if (i % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(marginX, y, contentW, absRowH, 'F');
        }
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(marginX, y, contentW, absRowH, 'S');

        let cx = marginX;
        const vals = [
          String(i + 1),
          ab.nomorPeserta || (ab.nomorKursi ? `Kursi #${String(ab.nomorKursi).padStart(2, '0')}` : '-'),
          ab.namaSiswa,
          ab.kelas || '-',
          ab.alasan || 'Alpha'
        ];
        absCols.forEach((c, cIdx) => {
          if (cIdx > 0) doc.line(cx, y, cx, y + absRowH);
          doc.setFont('helvetica', cIdx === 2 || cIdx === 4 ? 'bold' : 'normal');
          doc.setFontSize(7.8);
          if (cIdx === 4) {
            if (ab.alasan === 'Sakit') doc.setTextColor(180, 83, 9);
            else if (ab.alasan === 'Izin') doc.setTextColor(29, 78, 216);
            else doc.setTextColor(185, 28, 28);
          } else {
            doc.setTextColor(15, 23, 42);
          }
          const tx = c.align === 'center' ? cx + c.w / 2 : cx + 2.2;
          doc.text(clipText(doc, vals[cIdx], c.w - 3.5), tx, y + 4.6, { align: c.align });
          cx += c.w;
        });
        y += absRowH;
      }
      if (absentList.length > maxRows) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`+ ${absentList.length - maxRows} peserta tidak hadir lainnya terlampir pada daftar hadir ruang.`, marginX, y + 4);
        y += 5;
      }
    } else if (!blankFormMode && item.status === 'Final' && item.jumlahTidakHadir === 0) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.rect(marginX, y, contentW, 8.5, 'S');
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(21, 128, 61);
      doc.text('— Nihil (Seluruh peserta ujian hadir lengkap) —', centerX, y + 5.5, { align: 'center' });
      y += 8.5;
    } else {
      // 3 blank ruled rows for manual fill during/before exam
      for (let i = 0; i < 3; i++) {
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(marginX, y, contentW, absRowH, 'S');
        let cx = marginX;
        absCols.forEach((c, cIdx) => {
          if (cIdx > 0) doc.line(cx, y, cx, y + absRowH);
          if (cIdx === 0) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.6);
            doc.setTextColor(148, 163, 184);
            doc.text(`${i + 1}.`, cx + c.w / 2, y + 4.6, { align: 'center' });
          }
          cx += c.w;
        });
        y += absRowH;
      }
    }

    y += 7;

    // =========================================================
    // 6. CATATAN KEJADIAN SELAMA PELAKSANAAN UJIAN
    // =========================================================
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.setTextColor(10, 54, 107);
    doc.text('B. Catatan Kejadian Selama Pelaksanaan Ujian', marginX, y);
    y += 3.5;

    const noteBoxH = 26;
    doc.setDrawColor(148, 163, 184);
    doc.setFillColor(250, 251, 253);
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, y, contentW, noteBoxH, 1.5, 1.5, 'FD');

    if (blankFormMode) {
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      for (let lineIdx = 1; lineIdx <= 3; lineIdx++) {
        const ly = y + lineIdx * 6.5;
        doc.line(marginX + 4, ly, marginX + contentW - 4, ly);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.3);
      doc.setTextColor(10, 54, 107);
      doc.text(`Kondisi Pelaksanaan: ${item.kondisiPelaksanaan || 'Tertib & Lancar'}`, marginX + 4, y + 6);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.8);
      doc.setTextColor(30, 41, 59);
      const noteText =
        (item.catatanKejadian || '').trim() ||
        'Pelaksanaan ujian berlangsung dengan tertib, aman, dan lancar tanpa kendala.';
      const noteLines = doc.splitTextToSize(noteText, contentW - 8).slice(0, 3);
      doc.text(noteLines, marginX + 4, y + 12, { lineHeightFactor: 1.45 });
    }

    y += noteBoxH + 7;

    // =========================================================
    // 7. PENUTUP & PENGESAHAN TANDA TANGAN
    // =========================================================
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.2);
    doc.setTextColor(15, 23, 42);
    const closingText =
      'Demikian berita acara pelaksanaan ujian ini dibuat dengan sesungguhnya untuk dapat dipergunakan sebagaimana mestinya.';
    const closingLines = doc.splitTextToSize(closingText, contentW);
    doc.text(closingLines, marginX, y, { lineHeightFactor: 1.4 });
    y += closingLines.length * 4.8 + 8;

    // Ensure signatures sit cleanly near bottom without overflow
    const sigY = Math.min(Math.max(y, 218), 240);
    const leftCenterX = marginX + 42;
    const rightCenterX = marginX + contentW - 42;

    // Left: Kepala Sekolah
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text('Mengetahui,', leftCenterX, sigY, { align: 'center' });
    doc.text('Kepala Sekolah,', leftCenterX, sigY + 4.8, { align: 'center' });

    if (ttdDataUrl) {
      try {
        doc.addImage(ttdDataUrl, 'PNG', leftCenterX - 20, sigY + 6.5, 40, 17);
      } catch {
        // ignore
      }
    }

    const nameY = sigY + 27;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.text(kepsekNama || 'Kepala Sekolah', leftCenterX, nameY, { align: 'center' });
    const kepsekW = Math.max(40, doc.getTextWidth(kepsekNama || 'Kepala Sekolah') + 4);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.3);
    doc.line(leftCenterX - kepsekW / 2, nameY + 1.1, leftCenterX + kepsekW / 2, nameY + 1.1);

    if (kepsekNip && kepsekNip.trim() && kepsekNip.trim() !== '-') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(51, 65, 85);
      doc.text(`NIP. ${kepsekNip.trim()}`, leftCenterX, nameY + 5.2, { align: 'center' });
    }

    // Right: Pengawas Ruang Ujian
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${kota}, ${fullDateStr}`, rightCenterX, sigY, { align: 'center' });
    doc.text('Pengawas Ruang Ujian,', rightCenterX, sigY + 4.8, { align: 'center' });

    const pengawasDisplay = item.pengawasNama || '..............................';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.2);
    doc.text(pengawasDisplay, rightCenterX, nameY, { align: 'center' });
    const pgwW = Math.max(40, doc.getTextWidth(pengawasDisplay) + 4);
    doc.line(rightCenterX - pgwW / 2, nameY + 1.1, rightCenterX + pgwW / 2, nameY + 1.1);

    if (item.pengawasNip && item.pengawasNip.trim() && item.pengawasNip.trim() !== '-') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(51, 65, 85);
      doc.text(`NIP. ${item.pengawasNip.trim()}`, rightCenterX, nameY + 5.2, { align: 'center' });
    } else {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.2);
      doc.setTextColor(100, 116, 139);
      doc.text('NIP. ..............................', rightCenterX, nameY + 5.2, { align: 'center' });
    }
  });

  doc.save(fileName);
}
