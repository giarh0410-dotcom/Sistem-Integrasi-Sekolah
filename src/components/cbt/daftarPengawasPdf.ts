import { jsPDF } from 'jspdf';
import { PengawasUjianItem } from '../../types/school';
import { enhanceSignatureForDisplay } from './signatureUtils';

export type PengawasPdfMode = 'daftar' | 'matriks' | 'absensi';

export interface PengawasDirectoryEntry {
  kode: string;
  nama: string;
  nip?: string;
}

export interface DownloadDaftarPengawasPdfOptions {
  mode: PengawasPdfMode;
  items: PengawasUjianItem[];
  rooms: string[];
  directory: PengawasDirectoryEntry[];
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
const BULAN_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function parseIsoDate(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((isoDate || '').trim());
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateFullId(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  if (!d) return isoDate || '-';
  return `${HARI_ID[d.getDay()]}, ${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function formatDateCompactId(isoDate: string): string {
  const d = parseIsoDate(isoDate);
  if (!d) return isoDate || '-';
  const hariShort = HARI_ID[d.getDay()].slice(0, 3);
  return `${hariShort}, ${String(d.getDate()).padStart(2, '0')} ${BULAN_SHORT_ID[d.getMonth()]} ${d.getFullYear()}`;
}

function formatTodayIndo(): string {
  const d = new Date();
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

function drawDocumentHeader(
  doc: jsPDF,
  opts: {
    title: string;
    subtitle: string;
    schoolName: string;
    badgeTop: string;
    badgeBottom: string;
    logoDataUrl: string | null;
    marginX: number;
    contentW: number;
  }
): number {
  const { title, subtitle, schoolName, badgeTop, badgeBottom, logoDataUrl, marginX, contentW } = opts;
  const pageW = doc.internal.pageSize.getWidth();
  const yTop = 10;

  // School Logo
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', marginX, yTop, 16, 16);
    } catch {
      // ignore invalid logo
    }
  }

  // Right Info Badge
  const badgeW = 36;
  const badgeH = 15;
  const badgeX = marginX + contentW - badgeW;
  doc.setDrawColor(10, 54, 107);
  doc.setLineWidth(0.5);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(badgeX, yTop + 0.5, badgeW, badgeH, 2.2, 2.2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(71, 85, 105);
  doc.text(badgeTop.toUpperCase(), badgeX + badgeW / 2, yTop + 5.5, { align: 'center' });

  doc.setFontSize(9.5);
  doc.setTextColor(10, 54, 107);
  doc.text(clipText(doc, badgeBottom, badgeW - 4), badgeX + badgeW / 2, yTop + 12, { align: 'center' });

  // Center Titles
  const centerX = pageW / 2;
  const maxTitleW = contentW - 80;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(10, 54, 107);
  doc.text(clipText(doc, title.toUpperCase(), maxTitleW), centerX, yTop + 5, { align: 'center' });

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(clipText(doc, subtitle.toUpperCase(), maxTitleW), centerX, yTop + 10, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text(clipText(doc, schoolName.toUpperCase(), maxTitleW), centerX, yTop + 15.2, { align: 'center' });

  // Official Double Divider Line
  const lineY = yTop + 18.5;
  doc.setDrawColor(10, 54, 107);
  doc.setLineWidth(0.8);
  doc.line(marginX, lineY, marginX + contentW, lineY);
  doc.setLineWidth(0.25);
  doc.line(marginX, lineY + 1.1, marginX + contentW, lineY + 1.1);

  return lineY + 4.5;
}

function drawSignatureFooter(
  doc: jsPDF,
  opts: {
    startY: number;
    marginX: number;
    contentW: number;
    kota: string;
    dateLabel?: string;
    kepsekNama: string;
    kepsekNip?: string;
    ttdDataUrl: string | null;
    leftNote?: string;
  }
) {
  const { marginX, contentW, kota, dateLabel, kepsekNama, kepsekNip, ttdDataUrl, leftNote } = opts;
  const pageH = doc.internal.pageSize.getHeight();
  let y = opts.startY;

  const blockH = 34;
  if (y + blockH > pageH - 8) {
    doc.addPage();
    y = 16;
  }

  if (leftNote) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(71, 85, 105);
    const lines = doc.splitTextToSize(leftNote, contentW * 0.55);
    doc.text(lines, marginX, y + 6);
  }

  const sigCenterX = marginX + contentW - 34;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`${kota}, ${dateLabel || formatTodayIndo()}`, sigCenterX, y + 4, { align: 'center' });
  doc.text('Kepala Sekolah,', sigCenterX, y + 8.5, { align: 'center' });

  if (ttdDataUrl) {
    try {
      doc.addImage(ttdDataUrl, 'PNG', sigCenterX - 18, y + 9.5, 36, 15);
    } catch {
      // ignore
    }
  }

  const nameY = y + 27;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.8);
  doc.setTextColor(15, 23, 42);
  doc.text(kepsekNama || 'Kepala Sekolah', sigCenterX, nameY, { align: 'center' });

  const nameW = Math.max(36, doc.getTextWidth(kepsekNama || 'Kepala Sekolah') + 4);
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(0.3);
  doc.line(sigCenterX - nameW / 2, nameY + 1, sigCenterX + nameW / 2, nameY + 1);

  if (kepsekNip && kepsekNip.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(51, 65, 85);
    doc.text(`NIP. ${kepsekNip.trim()}`, sigCenterX, nameY + 4.8, { align: 'center' });
  }
}

export async function downloadDaftarPengawasPdf(options: DownloadDaftarPengawasPdfOptions): Promise<void> {
  const {
    mode,
    items,
    rooms,
    directory,
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

  const [logoDataUrl, enhancedTtdRaw] = await Promise.all([
    loadImageAsPngDataUrl(logoUrl),
    ttdKepalaSekolahUrl ? enhanceSignatureForDisplay(ttdKepalaSekolahUrl).catch(() => ttdKepalaSekolahUrl) : Promise.resolve('')
  ]);
  const ttdDataUrl = await loadImageAsPngDataUrl(enhancedTtdRaw || ttdKepalaSekolahUrl);

  const codeMap = new Map<string, string>();
  directory.forEach(d => {
    codeMap.set(d.nama.trim().toLowerCase(), d.kode);
  });
  const getCode = (nama?: string, fallback?: string) => {
    if (fallback && fallback.trim()) return fallback.trim();
    if (!nama) return '-';
    return codeMap.get(nama.trim().toLowerCase()) || '-';
  };

  const sortedItems = [...items].sort((a, b) => {
    const dCmp = (a.tanggal || '').localeCompare(b.tanggal || '');
    if (dCmp !== 0) return dCmp;
    const tCmp = (a.jamMulai || '').localeCompare(b.jamMulai || '');
    if (tCmp !== 0) return tCmp;
    return (a.ruang || '').localeCompare(b.ruang || '', undefined, { numeric: true });
  });

  if (mode === 'daftar') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 11;
    const contentW = pageW - marginX * 2;

    let y = drawDocumentHeader(doc, {
      title: 'DAFTAR PENGAWAS RUANG UJIAN',
      subtitle: examTitle,
      schoolName,
      badgeTop: 'TOTAL TUGAS',
      badgeBottom: `${sortedItems.length} Sesi`,
      logoDataUrl,
      marginX,
      contentW
    });

    // Info bar
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, y, contentW, 7, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(30, 41, 59);
    const uniqueTeachers = new Set<string>();
    sortedItems.forEach(i => {
      if (i.pengawas1Nama) uniqueTeachers.add(i.pengawas1Nama);
      if (i.pengawas2Nama) uniqueTeachers.add(i.pengawas2Nama);
    });
    doc.text(
      `Jumlah Pengawas Bertugas: ${uniqueTeachers.size} Orang  ·  Jumlah Ruang: ${rooms.length} Ruang${filterNote ? `  ·  Filter: ${filterNote}` : ''}`,
      marginX + 3,
      y + 4.6
    );
    y += 10;

    const cols = [
      { label: 'NO', w: 9, align: 'center' as const },
      { label: 'HARI / TANGGAL', w: 35, align: 'left' as const },
      { label: 'SESI & WAKTU', w: 32, align: 'center' as const },
      { label: 'MATA PELAJARAN', w: 63, align: 'left' as const },
      { label: 'RUANG', w: 23, align: 'center' as const },
      { label: 'PENGAWAS', w: 71, align: 'left' as const },
      { label: 'PARAF', w: 42, align: 'center' as const }
    ];

    const drawTableHeader = (currY: number) => {
      let x = marginX;
      doc.setFillColor(10, 54, 107);
      doc.setDrawColor(10, 54, 107);
      doc.rect(marginX, currY, contentW, 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      cols.forEach(c => {
        const textX = c.align === 'center' ? x + c.w / 2 : x + 2;
        doc.text(c.label, textX, currY + 4.9, { align: c.align });
        x += c.w;
      });
      return currY + 7.5;
    };

    y = drawTableHeader(y);
    const rowH = 8.2;

    sortedItems.forEach((item, idx) => {
      if (y + rowH > pageH - 14) {
        doc.addPage();
        y = 12;
        y = drawTableHeader(y);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentW, rowH, 'F');
      }

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.rect(marginX, y, contentW, rowH, 'S');

      let x = marginX;
      const kode1 = getCode(item.pengawas1Nama, item.kodePengawas);
      let pengawasLabel = kode1 !== '-' ? `[${kode1}] ${item.pengawas1Nama}` : item.pengawas1Nama;
      if (item.status === 'Digantikan' && item.penggantiNama) {
        pengawasLabel = `${item.penggantiNama} (Pengganti)`;
      } else if (item.pengawas2Nama) {
        pengawasLabel = `${pengawasLabel} / ${item.pengawas2Nama}`;
      }

      const rowVals = [
        String(idx + 1),
        formatDateCompactId(item.tanggal),
        `${item.sesi} (${item.jamMulai}-${item.jamSelesai})`,
        item.mataPelajaran || '-',
        item.ruang || '-',
        pengawasLabel || '-',
        ''
      ];

      cols.forEach((c, cIdx) => {
        if (cIdx > 0) {
          doc.line(x, y, x, y + rowH);
        }

        if (cIdx === 6) {
          // PARAF column with alternating zig-zag numbering for clean signatures
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.3);
          doc.setTextColor(100, 116, 139);
          const isEven = (idx + 1) % 2 === 0;
          const parafNumX = isEven ? x + c.w / 2 + 1.5 : x + 2.5;
          doc.text(`${idx + 1}.`, parafNumX, y + 5.3);
        } else {
          doc.setFont('helvetica', cIdx === 4 || cIdx === 5 ? 'bold' : 'normal');
          doc.setFontSize(7.5);
          if (cIdx === 4) {
            doc.setTextColor(10, 54, 107);
          } else {
            doc.setTextColor(15, 23, 42);
          }
          const textX = c.align === 'center' ? x + c.w / 2 : x + 2;
          doc.text(clipText(doc, rowVals[cIdx], c.w - 3.5), textX, y + 5.2, { align: c.align });
        }
        x += c.w;
      });

      y += rowH;
    });

    drawSignatureFooter(doc, {
      startY: y + 6,
      marginX,
      contentW,
      kota,
      kepsekNama,
      kepsekNip,
      ttdDataUrl,
      leftNote: 'Catatan: Pengawas diharapkan hadir di ruang panitia minimal 15 menit sebelum ujian dimulai untuk mengambil berkas & token CBT.'
    });

    doc.save(fileName);
    return;
  }

  if (mode === 'matriks') {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const marginX = 10;
    const contentW = pageW - marginX * 2;

    // Group items by (tanggal + jamMulai + sesi + mataPelajaran)
    type SlotGroup = {
      key: string;
      tanggal: string;
      sesi: string;
      jamMulai: string;
      jamSelesai: string;
      mataPelajaran: string;
      byRoom: Record<string, PengawasUjianItem>;
    };

    const slotMap = new Map<string, SlotGroup>();
    sortedItems.forEach(item => {
      const key = `${item.tanggal}|${item.jamMulai}|${item.jamSelesai}|${item.sesi}|${item.mataPelajaran}`;
      if (!slotMap.has(key)) {
        slotMap.set(key, {
          key,
          tanggal: item.tanggal,
          sesi: item.sesi,
          jamMulai: item.jamMulai,
          jamSelesai: item.jamSelesai,
          mataPelajaran: item.mataPelajaran,
          byRoom: {}
        });
      }
      slotMap.get(key)!.byRoom[item.ruang] = item;
    });
    const slots = Array.from(slotMap.values());

    // Chunk rooms if there are many rooms (max 10 room columns per page)
    const maxRoomsPerPage = 10;
    const activeRooms = rooms.length > 0 ? rooms : Array.from(new Set(sortedItems.map(i => i.ruang)));
    const roomChunks: string[][] = [];
    for (let i = 0; i < activeRooms.length; i += maxRoomsPerPage) {
      roomChunks.push(activeRooms.slice(i, i + maxRoomsPerPage));
    }
    if (roomChunks.length === 0) roomChunks.push(['Ruang 1']);

    roomChunks.forEach((chunkRooms, chunkIdx) => {
      if (chunkIdx > 0) doc.addPage();
      let y = drawDocumentHeader(doc, {
        title: 'JADWAL PIKET PENGAWAS UJIAN (MATRIKS RUANG)',
        subtitle: examTitle,
        schoolName,
        badgeTop: 'MATRIKS',
        badgeBottom: roomChunks.length > 1 ? `Bagian ${chunkIdx + 1}/${roomChunks.length}` : `${activeRooms.length} Ruang`,
        logoDataUrl,
        marginX,
        contentW
      });

      const dateW = 30;
      const timeW = 24;
      const mapelW = 46;
      const fixedW = dateW + timeW + mapelW;
      const roomColW = (contentW - fixedW) / Math.max(1, chunkRooms.length);

      const drawMatrixHeader = (currY: number) => {
        doc.setFillColor(10, 54, 107);
        doc.rect(marginX, currY, contentW, 8, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(255, 255, 255);
        doc.text('HARI / TANGGAL', marginX + 2, currY + 5.1);
        doc.text('WAKTU', marginX + dateW + timeW / 2, currY + 5.1, { align: 'center' });
        doc.text('MATA PELAJARAN', marginX + dateW + timeW + 2, currY + 5.1);

        let rx = marginX + fixedW;
        chunkRooms.forEach(r => {
          doc.text(clipText(doc, r.replace(/^Ruang\s*/i, 'R.'), roomColW - 2), rx + roomColW / 2, currY + 5.1, {
            align: 'center'
          });
          rx += roomColW;
        });
        return currY + 8;
      };

      y = drawMatrixHeader(y);
      const rowH = 8;

      slots.forEach((slot, sIdx) => {
        if (y + rowH > pageH - 16) {
          doc.addPage();
          y = 12;
          y = drawMatrixHeader(y);
        }

        if (sIdx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(marginX, y, contentW, rowH, 'F');
        }
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.2);
        doc.rect(marginX, y, contentW, rowH, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(clipText(doc, formatDateCompactId(slot.tanggal), dateW - 3), marginX + 2, y + 5.1);

        doc.line(marginX + dateW, y, marginX + dateW, y + rowH);
        doc.setFont('helvetica', 'normal');
        doc.text(`${slot.jamMulai}-${slot.jamSelesai}`, marginX + dateW + timeW / 2, y + 5.1, { align: 'center' });

        doc.line(marginX + dateW + timeW, y, marginX + dateW + timeW, y + rowH);
        doc.text(clipText(doc, slot.mataPelajaran, mapelW - 3), marginX + dateW + timeW + 2, y + 5.1);

        let rx = marginX + fixedW;
        chunkRooms.forEach(r => {
          doc.line(rx, y, rx, y + rowH);
          const cell = slot.byRoom[r];
          if (cell) {
            const c1 = getCode(cell.pengawas1Nama, cell.kodePengawas);
            const c2 = cell.pengawas2Nama ? getCode(cell.pengawas2Nama) : '';
            const label = c2 && c2 !== '-' ? `${c1} / ${c2}` : c1;
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.4);
            doc.setTextColor(10, 54, 107);
            doc.text(clipText(doc, label, roomColW - 2), rx + roomColW / 2, y + 5.1, { align: 'center' });
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(148, 163, 184);
            doc.text('-', rx + roomColW / 2, y + 5.1, { align: 'center' });
          }
          rx += roomColW;
        });

        y += rowH;
      });

      // Legend of Invigilator Codes on the last chunk
      if (chunkIdx === roomChunks.length - 1) {
        y += 5;
        const colsLegend = 3;
        const rowsLegend = Math.ceil(directory.length / colsLegend);
        const legendH = 7 + rowsLegend * 4.6 + 2;

        if (y + legendH > pageH - 12) {
          doc.addPage();
          y = 14;
        }

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(marginX, y, contentW, legendH, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(10, 54, 107);
        doc.text('KETERANGAN KODE PENGAWAS UJIAN:', marginX + 3, y + 5);

        const colW = (contentW - 6) / colsLegend;
        doc.setFontSize(7.2);
        directory.forEach((entry, idx) => {
          const col = Math.floor(idx / Math.max(1, rowsLegend));
          const row = idx % Math.max(1, rowsLegend);
          const lx = marginX + 3 + col * colW;
          const ly = y + 9.5 + row * 4.6;
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(10, 54, 107);
          doc.text(`${entry.kode}`, lx, ly);
          doc.setFont('helvetica', 'normal');
          doc.setTextColor(30, 41, 59);
          doc.text(clipText(doc, `: ${entry.nama}`, colW - 14), lx + 11, ly);
        });

        drawSignatureFooter(doc, {
          startY: y + legendH + 4,
          marginX,
          contentW,
          kota,
          kepsekNama,
          kepsekNip,
          ttdDataUrl
        });
      }
    });

    doc.save(fileName);
    return;
  }

  // mode === 'absensi' -> DAFTAR HADIR PENGAWAS UJIAN PER HARI (A4 Portrait, Paraf Column!)
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 12;
  const contentW = pageW - marginX * 2;

  const byDate = new Map<string, PengawasUjianItem[]>();
  sortedItems.forEach(item => {
    const key = item.tanggal || 'Tanpa Tanggal';
    const arr = byDate.get(key) || [];
    arr.push(item);
    byDate.set(key, arr);
  });

  const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
  dates.forEach((dateKey, dIdx) => {
    if (dIdx > 0) doc.addPage();
    const dayItems = byDate.get(dateKey) || [];

    let y = drawDocumentHeader(doc, {
      title: 'DAFTAR HADIR PENGAWAS UJIAN',
      subtitle: examTitle,
      schoolName,
      badgeTop: `HARI KE-${dIdx + 1}`,
      badgeBottom: formatDateCompactId(dateKey).split(',')[0] || `Hari ${dIdx + 1}`,
      logoDataUrl,
      marginX,
      contentW
    });

    // Day Metadata strip
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, y, contentW, 8, 1.5, 1.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.2);
    doc.setTextColor(15, 23, 42);
    doc.text(`Hari / Tanggal : ${formatDateFullId(dateKey)}`, marginX + 3, y + 5.2);
    doc.text(`Total Penugasan : ${dayItems.length} Sesi`, marginX + contentW - 3, y + 5.2, { align: 'right' });
    y += 11;

    // Expand Pengawas 1 & Pengawas 2 into signable attendance rows
    const signRows: Array<{
      kode: string;
      nama: string;
      peran: string;
      ruang: string;
      sesiWaktu: string;
      mapel: string;
    }> = [];
    dayItems.forEach(item => {
      const activeName1 =
        item.status === 'Digantikan' && item.penggantiNama
          ? `${item.penggantiNama} (Pengganti)`
          : item.pengawas1Nama;
      signRows.push({
        kode: getCode(item.pengawas1Nama, item.kodePengawas),
        nama: activeName1,
        peran: 'Pengawas 1',
        ruang: item.ruang,
        sesiWaktu: `${item.sesi} (${item.jamMulai}-${item.jamSelesai})`,
        mapel: item.mataPelajaran
      });
      if (item.pengawas2Nama && item.pengawas2Nama.trim()) {
        signRows.push({
          kode: getCode(item.pengawas2Nama),
          nama: item.pengawas2Nama,
          peran: 'Pengawas 2',
          ruang: item.ruang,
          sesiWaktu: `${item.sesi} (${item.jamMulai}-${item.jamSelesai})`,
          mapel: item.mataPelajaran
        });
      }
    });

    const cols = [
      { label: 'NO', w: 9, align: 'center' as const },
      { label: 'KODE', w: 13, align: 'center' as const },
      { label: 'NAMA PENGAWAS', w: 50, align: 'left' as const },
      { label: 'RUANG', w: 20, align: 'center' as const },
      { label: 'SESI / WAKTU', w: 28, align: 'center' as const },
      { label: 'MATA PELAJARAN', w: 34, align: 'left' as const },
      { label: 'PARAF', w: 32, align: 'center' as const }
    ];

    const drawHeader = (currY: number) => {
      let x = marginX;
      doc.setFillColor(10, 54, 107);
      doc.rect(marginX, currY, contentW, 7.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(255, 255, 255);
      cols.forEach(c => {
        const tx = c.align === 'center' ? x + c.w / 2 : x + 2;
        doc.text(c.label, tx, currY + 4.9, { align: c.align });
        x += c.w;
      });
      return currY + 7.5;
    };

    y = drawHeader(y);
    const rowH = 8.5;

    signRows.forEach((row, idx) => {
      if (y + rowH > pageH - 16) {
        doc.addPage();
        y = 14;
        y = drawHeader(y);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(marginX, y, contentW, rowH, 'F');
      }
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.rect(marginX, y, contentW, rowH, 'S');

      let x = marginX;
      const vals = [
        String(idx + 1),
        row.kode,
        row.nama,
        row.ruang,
        row.sesiWaktu,
        row.mapel,
        ''
      ];

      cols.forEach((c, cIdx) => {
        if (cIdx > 0) doc.line(x, y, x, y + rowH);
        doc.setFont('helvetica', cIdx === 1 || cIdx === 2 || cIdx === 3 ? 'bold' : 'normal');
        doc.setFontSize(7.4);
        doc.setTextColor(cIdx === 1 || cIdx === 3 ? 10 : 15, cIdx === 1 || cIdx === 3 ? 54 : 23, cIdx === 1 || cIdx === 3 ? 107 : 42);

        if (cIdx === 6) {
          // Alternating zig-zag numbering for crisp hand signatures
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.2);
          doc.setTextColor(100, 116, 139);
          const isEven = (idx + 1) % 2 === 0;
          const numX = isEven ? x + c.w / 2 + 1.5 : x + 2.5;
          doc.text(`${idx + 1}.`, numX, y + 5.5);
        } else {
          const tx = c.align === 'center' ? x + c.w / 2 : x + 2;
          doc.text(clipText(doc, vals[cIdx], c.w - 3), tx, y + 5.4, { align: c.align });
        }
        x += c.w;
      });

      y += rowH;
    });

    const parsedDay = parseIsoDate(dateKey);
    const dayDateLabel = parsedDay
      ? `${parsedDay.getDate()} ${BULAN_ID[parsedDay.getMonth()]} ${parsedDay.getFullYear()}`
      : formatTodayIndo();

    drawSignatureFooter(doc, {
      startY: y + 6,
      marginX,
      contentW,
      kota,
      dateLabel: dayDateLabel,
      kepsekNama,
      kepsekNip,
      ttdDataUrl,
      leftNote: 'Mengetahui Panitia Ujian:\nHarap menandatangani daftar hadir pengawas sebelum memasuki ruang ujian.'
    });
  });

  doc.save(fileName);
}
