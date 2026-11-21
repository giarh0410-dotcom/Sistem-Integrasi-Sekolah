import { jsPDF } from 'jspdf';
import { enhanceSignatureForDisplay } from './signatureUtils';

export interface DaftarSiswaPdfRow {
  nomorKursi: number;
  tableNo: number;
  noPeserta: string;
  namaSiswa: string;
  kelasSiswa: string;
  nis: string;
  nisn: string;
  isFilled: boolean;
}

export interface DaftarSiswaPdfRoom {
  roomName: string;
  pengawas: string;
  jumlahKursi: number;
  kursiPerMeja: number;
  rows: DaftarSiswaPdfRow[];
}

export interface ExamDaySession {
  mataPelajaran: string;
  jamMulai: string;
  jamSelesai: string;
}

export interface ExamAttendanceDay {
  dayIndex: number;
  tanggal: string;
  hariTanggalLabel: string;
  shortLabel: string;
  tanggalPenetapanLabel: string;
  sessions: ExamDaySession[];
}

export interface DaftarSiswaPdfOptions {
  rooms: DaftarSiswaPdfRoom[];
  attendanceDays?: ExamAttendanceDay[];
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

export function abbreviateMapel(name: string): string {
  const raw = (name || '').trim();
  const lower = raw.toLowerCase();
  if (lower.includes('pendidikan agama islam')) return 'PAI';
  if (lower.includes('pendidikan pancasila') || lower === 'ppkn' || lower === 'pkn') return 'Pancasila';
  if (lower.includes('ilmu pengetahuan alam')) return 'IPA';
  if (lower.includes('ilmu pengetahuan sosial')) return 'IPS';
  if (lower.includes('bahasa indonesia')) return 'B. Indo';
  if (lower.includes('bahasa inggris')) return 'B. Inggris';
  if (lower.includes('bahasa arab')) return 'B. Arab';
  if (lower.includes('bahasa jepang')) return 'B. Jepang';
  if (lower.includes('bahasa korea')) return 'B. Korea';
  if (lower.includes('bahasa sunda')) return 'B. Sunda';
  if (lower.includes('pendidikan jasmani')) return 'PJOK';
  if (lower.includes('matematika tingkat lanjut')) return 'Mat. Lanjut';
  if (lower.includes('seni budaya')) return 'Seni Budaya';
  if (lower.includes('kewirausahaan')) return 'KWU';
  if (lower.includes('informatika')) return 'Informatika';
  return raw;
}

interface PdfColDef {
  key: string;
  label: string;
  subLabel?: string;
  width: number;
  sessionIdx?: number;
}

export async function downloadDaftarSiswaRuangPdf(options: DaftarSiswaPdfOptions): Promise<void> {
  const {
    rooms,
    attendanceDays,
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

  if (!rooms.length) return;

  const isDailyMode = Boolean(attendanceDays && attendanceDays.length > 0);
  const daysToRender: Array<ExamAttendanceDay | null> = isDailyMode
    ? attendanceDays!
    : [null];

  const [logoImg, sigImg] = await Promise.all([
    loadImageAsPngDataUrl(logoUrl, 240),
    loadSignatureImage(ttdKepalaSekolahUrl)
  ]);

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageW = 210;
  const pageH = 297;
  const marginX = 12;
  const marginTop = 11;
  const marginBottom = 13;
  const contentW = pageW - marginX * 2; // 186mm

  const todayStr = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  const buildColumns = (day: ExamAttendanceDay | null): PdfColDef[] => {
    if (!day) {
      return [
        { key: 'no', label: 'NO', width: 9 },
        { key: 'kursi', label: 'KURSI', width: 14 },
        { key: 'meja', label: 'MEJA', width: 16 },
        { key: 'noPeserta', label: 'NO. PESERTA', width: 24 },
        { key: 'nama', label: 'NAMA LENGKAP SISWA', width: 55 },
        { key: 'kelas', label: 'KELAS', width: 24 },
        { key: 'nis', label: 'NIS / NISN', width: 26 },
        { key: 'paraf', label: 'PARAF', width: 18 }
      ];
    }

    // Per-day attendance sheet columns (total = 186mm)
    const fixedCols: PdfColDef[] = [
      { key: 'no', label: 'NO', width: 7.5 },
      { key: 'kursi', label: 'KURSI', width: 11.5 },
      { key: 'meja', label: 'MEJA', width: 10 },
      { key: 'noPeserta', label: 'NO. PESERTA', width: 21 },
      { key: 'nama', label: 'NAMA LENGKAP SISWA', width: 48 },
      { key: 'kelas', label: 'KELAS', width: 22 }
    ];
    // Remaining width = 66mm
    const sessions = day.sessions.slice(0, 4);
    if (sessions.length <= 1) {
      const s = sessions[0];
      return [
        ...fixedCols,
        {
          key: 'session_0',
          label: s ? `PARAF (${abbreviateMapel(s.mataPelajaran)})` : 'PARAF HADIR',
          subLabel: s?.jamMulai ? `${s.jamMulai}-${s.jamSelesai}` : undefined,
          width: 46,
          sessionIdx: 0
        },
        { key: 'ket', label: 'KET.', subLabel: 'H/S/I/A', width: 20 }
      ];
    }
    if (sessions.length === 2) {
      return [
        ...fixedCols,
        ...sessions.map((s, idx) => ({
          key: `session_${idx}`,
          label: `SESI ${idx + 1}`,
          subLabel: abbreviateMapel(s.mataPelajaran),
          width: 25,
          sessionIdx: idx
        })),
        { key: 'ket', label: 'KET.', subLabel: 'H/S/I/A', width: 16 }
      ];
    }
    if (sessions.length === 3) {
      return [
        ...fixedCols,
        ...sessions.map((s, idx) => ({
          key: `session_${idx}`,
          label: `SESI ${idx + 1}`,
          subLabel: abbreviateMapel(s.mataPelajaran),
          width: 18,
          sessionIdx: idx
        })),
        { key: 'ket', label: 'KET.', subLabel: 'H/S/I/A', width: 12 }
      ];
    }
    return [
      ...fixedCols,
      ...sessions.map((s, idx) => ({
        key: `session_${idx}`,
        label: `S${idx + 1}`,
        subLabel: abbreviateMapel(s.mataPelajaran),
        width: 13.5,
        sessionIdx: idx
      })),
      { key: 'ket', label: 'KET.', subLabel: 'H/S/I/A', width: 12 }
    ];
  };

  const drawTableHeader = (startY: number, cols: PdfColDef[], twoLine: boolean): number => {
    const headerH = twoLine ? 9.4 : 7;
    doc.setFillColor(8, 47, 99);
    doc.setDrawColor(8, 47, 99);
    doc.setLineWidth(0.25);
    doc.rect(marginX, startY, contentW, headerH, 'FD');

    let x = marginX;
    for (let i = 0; i < cols.length; i++) {
      const col = cols[i];
      if (i > 0) {
        doc.setDrawColor(59, 102, 158);
        doc.line(x, startY, x, startY + headerH);
      }

      if (twoLine && col.subLabel) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.9);
        doc.setTextColor(255, 255, 255);
        doc.text(fitText(doc, col.label, col.width - 1.5), x + col.width / 2, startY + 3.9, {
          align: 'center'
        });

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.1);
        doc.setTextColor(224, 242, 254);
        doc.text(fitText(doc, col.subLabel, col.width - 1.5), x + col.width / 2, startY + 7.6, {
          align: 'center'
        });
      } else {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(255, 255, 255);
        doc.text(
          fitText(doc, col.label, col.width - 1.5),
          x + col.width / 2,
          startY + (twoLine ? 5.8 : 4.7),
          { align: 'center' }
        );
      }
      x += col.width;
    }
    return startY + headerH;
  };

  const drawRoomHeader = (
    room: DaftarSiswaPdfRoom,
    day: ExamAttendanceDay | null,
    isContinuation: boolean
  ): number => {
    let y = marginTop;

    // Logo on left
    const logoSize = 14;
    if (logoImg) {
      const ratio = Math.min(logoSize / logoImg.width, logoSize / logoImg.height);
      const drawW = logoImg.width * ratio;
      const drawH = logoImg.height * ratio;
      doc.addImage(
        logoImg.dataUrl,
        'PNG',
        marginX + (logoSize - drawW) / 2,
        y + (logoSize - drawH) / 2,
        drawW,
        drawH,
        undefined,
        'NONE'
      );
    }

    // Room badge on right
    const badgeW = 30;
    const badgeH = day ? 14.8 : 13.5;
    const badgeX = pageW - marginX - badgeW;
    doc.setFillColor(240, 249, 255);
    doc.setDrawColor(8, 47, 99);
    doc.setLineWidth(0.55);
    doc.roundedRect(badgeX, y, badgeW, badgeH, 1.8, 1.8, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(71, 85, 105);
    doc.text('RUANG UJIAN', badgeX + badgeW / 2, y + 3.9, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(8, 47, 99);
    doc.text(fitText(doc, room.roomName.toUpperCase(), badgeW - 3), badgeX + badgeW / 2, y + 9.2, {
      align: 'center'
    });

    if (day) {
      doc.setFillColor(8, 47, 99);
      doc.roundedRect(badgeX + 2.5, y + 10.6, badgeW - 5, 3.4, 0.8, 0.8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(253, 224, 71);
      doc.text(`HARI KE-${day.dayIndex}`, badgeX + badgeW / 2, y + 13.0, { align: 'center' });
    }

    // Center title block
    const textLeft = marginX + (logoImg ? logoSize + 3 : 2);
    const textRight = badgeX - 3;
    const textCenterX = (textLeft + textRight) / 2;
    const maxTitleW = textRight - textLeft;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.6);
    doc.setTextColor(8, 47, 99);
    const mainTitle = day
      ? isContinuation
        ? 'DAFTAR HADIR PESERTA UJIAN PER HARI (LANJUTAN)'
        : 'DAFTAR HADIR PESERTA UJIAN (ABSENSI HARIAN)'
      : isContinuation
      ? 'DAFTAR PESERTA & PENEMPATAN DUDUK (LANJUTAN)'
      : 'DAFTAR PESERTA & PENEMPATAN DUDUK RUANG UJIAN';
    doc.text(fitText(doc, mainTitle, maxTitleW), textCenterX, y + 4.4, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(fitText(doc, examTitle.toUpperCase(), maxTitleW), textCenterX, y + 8.9, {
      align: 'center'
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.1);
    doc.setTextColor(15, 23, 42);
    doc.text(fitText(doc, schoolName.toUpperCase(), maxTitleW), textCenterX, y + 13.3, {
      align: 'center'
    });

    y += 15.8;

    // Double navy rule
    doc.setDrawColor(8, 47, 99);
    doc.setLineWidth(0.75);
    doc.line(marginX, y, pageW - marginX, y);
    doc.setLineWidth(0.25);
    doc.line(marginX, y + 1.1, pageW - marginX, y + 1.1);
    y += 3.2;

    // Meta info bar
    const filledCount = room.rows.filter(r => r.isFilled).length;
    const totalMeja = Math.ceil(room.jumlahKursi / Math.max(room.kursiPerMeja || 4, 1));

    if (day) {
      const sessionScheduleStr =
        day.sessions.length > 0
          ? day.sessions
              .map(
                (s, i) =>
                  `Sesi ${i + 1}: ${s.mataPelajaran}${s.jamMulai ? ` (${s.jamMulai}-${s.jamSelesai})` : ''}`
              )
              .join('  •  ')
          : 'Sesuai jadwal ujian harian';
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.1);
      const scheduleLines = doc.splitTextToSize(`Jadwal Sesi: ${sessionScheduleStr}`, contentW - 6);
      const metaH = 10.2 + scheduleLines.length * 3.5 + (filterNote ? 3.8 : 0);

      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.25);
      doc.roundedRect(marginX, y, contentW, metaH, 1.5, 1.5, 'FD');

      // Row 1: Hari/Tanggal & Jumlah Peserta
      doc.setFontSize(7.8);
      doc.setTextColor(8, 47, 99);
      doc.setFont('helvetica', 'bold');
      doc.text('Hari / Tanggal:', marginX + 3, y + 4.3);
      doc.setTextColor(15, 23, 42);
      doc.text(fitText(doc, day.hariTanggalLabel, 82), marginX + 25.5, y + 4.3);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(
        `Peserta: ${filledCount} / ${room.jumlahKursi} Kursi (${totalMeja} Meja)`,
        pageW - marginX - 3,
        y + 4.3,
        { align: 'right' }
      );

      // Row 2: Pengawas & Sesi Count
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(51, 65, 85);
      doc.text('Pengawas Ruang:', marginX + 3, y + 8.3);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(fitText(doc, room.pengawas || '-', 84), marginX + 28.5, y + 8.3);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(8, 47, 99);
      doc.text(
        day.sessions.length > 0 ? `${day.sessions.length} Mata Pelajaran` : 'Absensi Harian',
        pageW - marginX - 3,
        y + 8.3,
        { align: 'right' }
      );

      // Row 3: Schedule sessions line(s)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.1);
      doc.setTextColor(51, 65, 85);
      doc.text(scheduleLines, marginX + 3, y + 12.1);

      if (filterNote) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(6.9);
        doc.setTextColor(100, 116, 139);
        doc.text(
          fitText(doc, `Filter aktif: ${filterNote}`, contentW - 6),
          marginX + 3,
          y + metaH - 1.6
        );
      }

      return y + metaH + 2.6;
    }

    // General roster meta bar
    const metaH = filterNote ? 10.5 : 7;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.25);
    doc.roundedRect(marginX, y, contentW, metaH, 1.5, 1.5, 'FD');

    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text('Pengawas Ruang:', marginX + 3, y + 4.7);
    doc.setFont('helvetica', 'normal');
    doc.text(fitText(doc, room.pengawas || '-', 74), marginX + 29, y + 4.7);

    const rightInfo = `Jumlah Peserta: ${filledCount} / ${room.jumlahKursi} Kursi (${totalMeja} Meja)`;
    doc.setFont('helvetica', 'bold');
    doc.text(rightInfo, pageW - marginX - 3, y + 4.7, { align: 'right' });

    if (filterNote) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.2);
      doc.setTextColor(71, 85, 105);
      doc.text(fitText(doc, `Filter aktif: ${filterNote}`, contentW - 6), marginX + 3, y + 8.9);
    }

    return y + metaH + 3;
  };

  // Track footer caption per page
  const pageFooters: string[] = [];
  let isFirstSheet = true;

  rooms.forEach(room => {
    daysToRender.forEach(day => {
      if (!isFirstSheet) {
        doc.addPage();
      }
      isFirstSheet = false;

      const footerCaption = day
        ? `${schoolName} — Absensi Ujian Per Hari (${room.roomName} · ${day.hariTanggalLabel})`
        : `${schoolName} — Daftar Nama Siswa Ruang Ujian (${room.roomName})`;
      pageFooters.push(footerCaption);

      const cols = buildColumns(day);
      const twoLineHeader = Boolean(day);
      let y = drawRoomHeader(room, day, false);
      y = drawTableHeader(y, cols, twoLineHeader);

      // Slightly tighter row height on daily sheets with 24+ rows so a full 24-student room fits cleanly on 1 A4 page!
      const rowH = day ? (room.rows.length > 22 ? 6.0 : 6.3) : 6.3;
      const maxBodyY = pageH - marginBottom - 5;

      room.rows.forEach((row, idx) => {
        if (y + rowH > maxBodyY) {
          doc.addPage();
          pageFooters.push(footerCaption);
          y = drawRoomHeader(room, day, true);
          y = drawTableHeader(y, cols, twoLineHeader);
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
        for (let c = 0; c < cols.length; c++) {
          const col = cols[c];
          if (c > 0) {
            doc.line(x, y, x, y + rowH);
          }

          const textY = y + rowH * 0.68;
          if (col.key === 'no') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.6);
            doc.setTextColor(row.isFilled ? 15 : 148, row.isFilled ? 23 : 163, row.isFilled ? 42 : 184);
            doc.text(String(idx + 1), x + col.width / 2, textY, { align: 'center' });
          } else if (col.key === 'kursi') {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.6);
            doc.setTextColor(row.isFilled ? 8 : 148, row.isFilled ? 47 : 163, row.isFilled ? 99 : 184);
            doc.text(`#${String(row.nomorKursi).padStart(2, '0')}`, x + col.width / 2, textY, {
              align: 'center'
            });
          } else if (col.key === 'meja') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.4);
            doc.setTextColor(row.isFilled ? 15 : 148, row.isFilled ? 23 : 163, row.isFilled ? 42 : 184);
            doc.text(day ? `M${row.tableNo}` : `Meja ${row.tableNo}`, x + col.width / 2, textY, {
              align: 'center'
            });
          } else if (col.key === 'noPeserta') {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(7.3);
            doc.setTextColor(row.isFilled ? 30 : 148, row.isFilled ? 41 : 163, row.isFilled ? 59 : 184);
            doc.text(fitText(doc, row.noPeserta || '-', col.width - 2), x + col.width / 2, textY, {
              align: 'center'
            });
          } else if (col.key === 'nama') {
            if (row.isFilled) {
              doc.setFont('helvetica', 'bold');
              doc.setFontSize(7.6);
              doc.setTextColor(15, 23, 42);
              doc.text(fitText(doc, row.namaSiswa, col.width - 3), x + 1.6, textY);
            } else {
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(7.3);
              doc.setTextColor(148, 163, 184);
              doc.text('(Kursi Kosong)', x + 1.6, textY);
            }
          } else if (col.key === 'kelas') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.4);
            doc.setTextColor(row.isFilled ? 30 : 148, row.isFilled ? 41 : 163, row.isFilled ? 59 : 184);
            doc.text(fitText(doc, row.kelasSiswa || '-', col.width - 2.5), x + 1.4, textY);
          } else if (col.key === 'nis') {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.2);
            doc.setTextColor(row.isFilled ? 51 : 148, row.isFilled ? 65 : 163, row.isFilled ? 85 : 184);
            const nisLabel =
              row.nis && row.nisn && row.nisn !== row.nis
                ? `${row.nis} / ${row.nisn}`
                : row.nis || row.nisn || '-';
            doc.text(fitText(doc, nisLabel, col.width - 2.5), x + col.width / 2, textY, {
              align: 'center'
            });
          } else if (col.key === 'paraf' || col.key.startsWith('session_')) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6.6);
            doc.setTextColor(148, 163, 184);
            const parafX = idx % 2 === 0 ? x + 1.2 : x + col.width * 0.48;
            doc.text(`${idx + 1}.`, parafX, textY);
          }
          // 'ket' stays clean & blank for manual H/S/I/A notes

          x += col.width;
        }

        y += rowH;
      });

      const filledCount = room.rows.filter(r => r.isFilled).length;

      // Daily attendance summary bar (Hadir / Sakit / Izin / Alfa)
      if (day) {
        y += 2.6;
        const rekapH = 6.8;
        if (y + rekapH > pageH - marginBottom) {
          doc.addPage();
          pageFooters.push(footerCaption);
          y = marginTop;
        }
        doc.setFillColor(240, 249, 255);
        doc.setDrawColor(147, 197, 253);
        doc.setLineWidth(0.25);
        doc.roundedRect(marginX, y, contentW, rekapH, 1.3, 1.3, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.4);
        doc.setTextColor(8, 47, 99);
        doc.text('Rekap Kehadiran Harian:', marginX + 3, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(15, 23, 42);
        doc.text(
          `Terdaftar: ${filledCount}     |     Hadir: ..........     |     Sakit: ..........     |     Izin: ..........     |     Alfa: ..........`,
          marginX + 41,
          y + 4.5
        );
        y += rekapH;
      }

      // Class Breakdown Summary Box
      const classCounts = new Map<string, number>();
      room.rows.forEach(r => {
        if (r.isFilled) {
          const cls = r.kelasSiswa || 'Tanpa Kelas';
          classCounts.set(cls, (classCounts.get(cls) || 0) + 1);
        }
      });
      const classSummary = Array.from(classCounts.entries())
        .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
        .map(([k, v]) => `${k}: ${v}`)
        .join('  •  ');

      if (classSummary) {
        y += 2.2;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.1);
        const summaryLines = doc.splitTextToSize(`Rekap per Kelas: ${classSummary}`, contentW - 6);
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
        doc.text(summaryLines, marginX + 3, y + 3.9);
        y += boxH;
      }

      // Signature Block
      const sigBlockHeight = 29;
      if (y + sigBlockHeight + 4 > pageH - marginBottom) {
        doc.addPage();
        pageFooters.push(footerCaption);
        y = marginTop + 2;
      } else {
        y += 5.5;
      }

      const leftCenterX = marginX + contentW * 0.24;
      const rightCenterX = marginX + contentW * 0.76;
      const sigDateStr = day ? day.tanggalPenetapanLabel : todayStr;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('Mengetahui,', leftCenterX, y, { align: 'center' });
      doc.text(`${kota}, ${sigDateStr}`, rightCenterX, y, { align: 'center' });

      doc.setFont('helvetica', 'bold');
      doc.text('Kepala Sekolah,', leftCenterX, y + 4.1, { align: 'center' });
      doc.text(`Pengawas ${room.roomName}`, rightCenterX, y + 4.1, { align: 'center' });

      if (sigImg) {
        const maxSigW = 34;
        const maxSigH = 14;
        const ratio = Math.min(maxSigW / sigImg.width, maxSigH / sigImg.height);
        const drawW = sigImg.width * ratio;
        const drawH = sigImg.height * ratio;
        doc.addImage(
          sigImg.dataUrl,
          'PNG',
          leftCenterX - drawW / 2,
          y + 5.2 + (maxSigH - drawH) / 2,
          drawW,
          drawH,
          undefined,
          'NONE'
        );
      }

      const nameY = y + 21.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);

      const kepsekLabel = kepsekNama || 'Kepala Sekolah';
      doc.text(kepsekLabel, leftCenterX, nameY, { align: 'center' });
      const kepsekW = doc.getTextWidth(kepsekLabel);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.3);
      doc.line(leftCenterX - kepsekW / 2, nameY + 0.8, leftCenterX + kepsekW / 2, nameY + 0.8);

      if (kepsekNip) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(71, 85, 105);
        doc.text(`NIP. ${kepsekNip}`, leftCenterX, nameY + 4.2, { align: 'center' });
      }

      const pengawasLabel = room.pengawas || '....................................';
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.2);
      doc.setTextColor(15, 23, 42);
      doc.text(pengawasLabel, rightCenterX, nameY, { align: 'center' });
      const pengawasW = doc.getTextWidth(pengawasLabel);
      doc.setDrawColor(15, 23, 42);
      doc.setLineWidth(0.3);
      doc.line(rightCenterX - pengawasW / 2, nameY + 0.8, rightCenterX + pengawasW / 2, nameY + 0.8);
    });
  });

  // Page footer on every page
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.9);
    doc.setTextColor(100, 116, 139);
    doc.text(
      pageFooters[p - 1] || `${schoolName} — Daftar Hadir Peserta Ujian`,
      marginX,
      pageH - 6.5
    );
    doc.text(`Halaman ${p} dari ${totalPages}`, pageW - marginX, pageH - 6.5, { align: 'right' });
  }

  doc.save(fileName.endsWith('.pdf') ? fileName : `${fileName}.pdf`);
}
