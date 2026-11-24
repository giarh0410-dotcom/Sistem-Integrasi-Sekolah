import { jsPDF } from 'jspdf';
import {
  ScheduleClassItem,
  ScheduleEntry,
  ScheduleHeaderConfig,
  TeacherMapping,
} from '../types/scheduleData';

export interface JadwalExportParams {
  header: ScheduleHeaderConfig;
  logoUrl?: string;
  days: string[];
  timeSlots: string[];
  classes: ScheduleClassItem[];
  teacherMappings: TeacherMapping[];
  getCellEntry: (day: string, time: string, cls: ScheduleClassItem) => ScheduleEntry | undefined;
  getSpecialActivity: (day: string, time: string) => ScheduleEntry | undefined;
  resolveTeacherCode: (entry: ScheduleEntry | undefined) => string;
}

async function loadLogoAsPngDataUrl(url?: string): Promise<string | null> {
  if (!url) return null;
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.referrerPolicy = 'no-referrer';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 180;
          canvas.height = 180;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(null);
            return;
          }
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          const pad = 10;
          const ratio = Math.min(
            (canvas.width - pad * 2) / (img.naturalWidth || 180),
            (canvas.height - pad * 2) / (img.naturalHeight || 180)
          );
          const drawW = (img.naturalWidth || 180) * ratio;
          const drawH = (img.naturalHeight || 180) * ratio;
          ctx.drawImage(img, (canvas.width - drawW) / 2, (canvas.height - drawH) / 2, drawW, drawH);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

function getSubjectRgb(subject?: string, code?: string): [number, number, number] {
  const s = (subject || '').toUpperCase();
  const cInt = parseInt(code || '', 10);
  if (s.includes('BAHASA INDONESIA') || cInt === 21 || cInt === 2) return [219, 234, 254];
  if (s.includes('MATEMATIKA') || cInt === 6) return [254, 249, 195];
  if (s.includes('IPA') || s.includes('ALAM') || cInt === 9) return [220, 252, 231];
  if (s.includes('SENI') || s.includes('BUDAYA') || cInt === 12) return [254, 226, 226];
  if (s.includes('KOREA') || cInt === 29) return [207, 250, 254];
  if (s.includes('JEPANG') || cInt === 11) return [224, 231, 255];
  if (s.includes('AGAMA') || s.includes('PABP') || s.includes('FIQIH') || s.includes('QUR'))
    return [209, 250, 229];
  if (s.includes('IPS') || s.includes('SOSIAL')) return [254, 243, 199];
  if (s.includes('INGGRIS')) return [224, 242, 254];
  if (s.includes('INFORMATIKA') || s.includes('TIK')) return [243, 232, 255];
  if (s.includes('OLAHRAGA') || s.includes('PJOK')) return [236, 252, 203];
  return [248, 250, 252];
}

function getClassHeaderRgb(className: string): {
  bg: [number, number, number];
  text: [number, number, number];
} {
  const name = className.toUpperCase();
  let text: [number, number, number] = [15, 23, 42];
  if (name.includes('VIII')) text = [29, 78, 216];
  else if (name.includes('VII')) text = [185, 28, 28];
  else if (name.includes('IX')) text = [194, 65, 12];

  if (name.includes('IBNU SINA')) return { bg: [239, 246, 255], text };
  if (name.includes('IBNU KHALDUN')) return { bg: [238, 242, 255], text };
  if (name.includes('IBNU AL HAYTAM')) return { bg: [240, 249, 255], text };
  if (name.includes('IBNU RUSYD')) return { bg: [245, 243, 255], text };
  if (name.includes('AL KINDI')) return { bg: [236, 254, 255], text };
  if (name.includes('AL KHAWARIZMI')) return { bg: [240, 253, 244], text };
  if (name.includes('AL FARABI')) return { bg: [236, 253, 245], text };
  if (name.includes('AL BIRUNI')) return { bg: [247, 254, 231], text };
  if (name.includes('UMAR BIN KHATTAB')) return { bg: [240, 253, 250], text };
  if (name.includes('UTSMAN BIN AFFAN')) return { bg: [255, 251, 235], text };
  return { bg: [241, 245, 249], text };
}

function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function downloadMasterJadwalPdf(params: JadwalExportParams) {
  const {
    header,
    logoUrl,
    days,
    timeSlots,
    classes,
    teacherMappings,
    getCellEntry,
    getSpecialActivity,
    resolveTeacherCode,
  } = params;

  const logoPng = await loadLogoAsPngDataUrl(logoUrl);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 8;
  const marginTop = 7;
  const bannerH = 21;
  const usableW = pageW - marginX * 2;

  const dayColW = 12;
  const timeColW = 20;
  const safeClasses = classes.length > 0 ? classes : [{ id: 'cls', name: 'Kelas' }];
  const perClassW = (usableW - dayColW - timeColW) / safeClasses.length;
  const codeColW = Math.min(7.5, Math.max(5.5, perClassW * 0.28));
  const subjectColW = perClassW - codeColW;

  const drawPageHeader = () => {
    // Deep Navy Blue Rounded Banner
    doc.setFillColor(11, 53, 120);
    doc.roundedRect(marginX, marginTop, usableW, bannerH, 3.2, 3.2, 'F');

    // Left White Rounded Logo Square
    const logoBoxSize = 15.5;
    const logoBoxX = marginX + 4;
    const logoBoxY = marginTop + (bannerH - logoBoxSize) / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 2.4, 2.4, 'F');
    if (logoPng) {
      doc.addImage(logoPng, 'PNG', logoBoxX + 1, logoBoxY + 1, logoBoxSize - 2, logoBoxSize - 2);
    }

    // Centered 3-Line Typography (White / Gold / White)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(255, 255, 255);
    doc.text(header.judul.toUpperCase(), pageW / 2, marginTop + 7, { align: 'center' });

    doc.setFontSize(9);
    doc.setTextColor(250, 204, 21);
    doc.text(
      `${header.semester.toUpperCase()} TAHUN AJARAN ${header.tahunAjaran.toUpperCase()}`,
      pageW / 2,
      marginTop + 12.6,
      { align: 'center' }
    );

    doc.setFontSize(10.5);
    doc.setTextColor(255, 255, 255);
    doc.text(header.namaSekolah.toUpperCase(), pageW / 2, marginTop + 18, { align: 'center' });
  };

  const drawTableHeader = (startY: number) => {
    const hTop = 8;
    const hSub = 4.5;
    doc.setDrawColor(180, 190, 205);
    doc.setLineWidth(0.2);

    // HARI & WAKTU
    doc.setFillColor(241, 245, 249);
    doc.rect(marginX, startY, dayColW, hTop + hSub, 'FD');
    doc.rect(marginX + dayColW, startY, timeColW, hTop + hSub, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(51, 65, 85);
    doc.text('HARI', marginX + dayColW / 2, startY + (hTop + hSub) / 2 + 1, { align: 'center' });
    doc.text('WAKTU', marginX + dayColW + timeColW / 2, startY + (hTop + hSub) / 2 + 1, {
      align: 'center',
    });

    let x = marginX + dayColW + timeColW;
    safeClasses.forEach((cls) => {
      const palette = getClassHeaderRgb(cls.name);
      doc.setFillColor(...palette.bg);
      doc.rect(x, startY, perClassW, hTop, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(safeClasses.length > 9 ? 5.6 : 6.2);
      doc.setTextColor(...palette.text);
      const wrapped = doc.splitTextToSize(cls.name, perClassW - 1.5).slice(0, 2);
      const lineOffset = wrapped.length > 1 ? 3.2 : 4.8;
      doc.text(wrapped, x + perClassW / 2, startY + lineOffset, { align: 'center' });

      // Subheaders Mapel & Kode
      doc.setFillColor(248, 250, 252);
      doc.rect(x, startY + hTop, subjectColW, hSub, 'FD');
      doc.rect(x + subjectColW, startY + hTop, codeColW, hSub, 'FD');
      doc.setFontSize(5.4);
      doc.setTextColor(100, 116, 139);
      doc.text('Mapel', x + subjectColW / 2, startY + hTop + 3.1, { align: 'center' });
      doc.text('Kd', x + subjectColW + codeColW / 2, startY + hTop + 3.1, { align: 'center' });
      x += perClassW;
    });

    return startY + hTop + hSub;
  };

  drawPageHeader();
  let cursorY = drawTableHeader(marginTop + bannerH + 3);
  const rowH = 6.0;

  days.forEach((day, dIdx) => {
    const neededH = timeSlots.length * rowH;
    if (dIdx > 0 && cursorY + neededH > pageH - 10) {
      doc.addPage();
      drawPageHeader();
      cursorY = drawTableHeader(marginTop + bannerH + 3);
    }

    const dayStartY = cursorY;

    timeSlots.forEach((slot) => {
      if (cursorY + rowH > pageH - 8) {
        // Draw day cell up to here, break page
        doc.addPage();
        drawPageHeader();
        cursorY = drawTableHeader(marginTop + bannerH + 3);
      }

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.18);

      // Time cell
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX + dayColW, cursorY, timeColW, rowH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(5.6);
      doc.setTextColor(71, 85, 105);
      doc.text(slot, marginX + dayColW + timeColW / 2, cursorY + rowH / 2 + 1, {
        align: 'center',
      });

      const special = getSpecialActivity(day, slot);
      const startClassesX = marginX + dayColW + timeColW;

      if (special) {
        const totalClassesW = perClassW * safeClasses.length;
        const sUpper = special.subject.toUpperCase();
        if (sUpper.includes('UPACARA')) doc.setFillColor(238, 242, 255);
        else if (sUpper.includes('SHOLAT')) doc.setFillColor(236, 253, 245);
        else if (sUpper.includes('ISTIRAHAT')) doc.setFillColor(241, 245, 249);
        else doc.setFillColor(254, 243, 199);

        doc.rect(startClassesX, cursorY, totalClassesW, rowH, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.4);
        doc.setTextColor(71, 85, 105);
        doc.text(special.subject.toUpperCase(), startClassesX + totalClassesW / 2, cursorY + rowH / 2 + 1, {
          align: 'center',
        });
      } else {
        let x = startClassesX;
        safeClasses.forEach((cls) => {
          const entry = getCellEntry(day, slot, cls);
          const code = resolveTeacherCode(entry);
          if (entry) {
            const rgb = getSubjectRgb(entry.subject, code);
            doc.setFillColor(...rgb);
          } else {
            doc.setFillColor(255, 255, 255);
          }
          doc.rect(x, cursorY, subjectColW, rowH, 'FD');
          doc.rect(x + subjectColW, cursorY, codeColW, rowH, 'FD');

          if (entry) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(safeClasses.length > 9 ? 4.9 : 5.5);
            doc.setTextColor(15, 23, 42);
            const subjLines = doc.splitTextToSize(entry.subject, subjectColW - 1.2).slice(0, 2);
            const yOff = subjLines.length > 1 ? 2.4 : rowH / 2 + 0.9;
            doc.text(subjLines, x + subjectColW / 2, cursorY + yOff, { align: 'center' });

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(5.4);
            doc.text(code || '-', x + subjectColW + codeColW / 2, cursorY + rowH / 2 + 0.9, {
              align: 'center',
            });
          }
          x += perClassW;
        });
      }

      cursorY += rowH;
    });

    // Day merged block on left
    const dayH = cursorY - dayStartY;
    if (dayH > 0) {
      doc.setFillColor(241, 245, 249);
      doc.setDrawColor(180, 190, 205);
      doc.rect(marginX, dayStartY, dayColW, dayH, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.setTextColor(15, 23, 42);
      doc.text(day, marginX + dayColW / 2, dayStartY + dayH / 2 + 1, { align: 'center' });
    }
  });

  // Page 2: Teacher Code Legend
  if (teacherMappings.length > 0) {
    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('DAFTAR KODE GURU & MATA PELAJARAN', pageW / 2, 14, { align: 'center' });
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `${header.namaSekolah} • ${header.semester} • Tahun Pelajaran ${header.tahunAjaran}`,
      pageW / 2,
      19,
      { align: 'center' }
    );

    const colCount = 2;
    const colGap = 6;
    const colW = (usableW - colGap) / colCount;
    const half = Math.ceil(teacherMappings.length / 2);

    [teacherMappings.slice(0, half), teacherMappings.slice(half)].forEach((chunk, colIdx) => {
      const startX = marginX + colIdx * (colW + colGap);
      let y = 25;
      doc.setFillColor(15, 23, 42);
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.rect(startX, y, colW, 6.5, 'F');
      doc.text('Kode', startX + 3, y + 4.3);
      doc.text('Nama Guru', startX + 18, y + 4.3);
      doc.text('Mata Pelajaran', startX + 76, y + 4.3);
      y += 6.5;

      chunk.forEach((t, idx) => {
        if (y > pageH - 12) return;
        doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
        doc.setDrawColor(226, 232, 240);
        doc.rect(startX, y, colW, 6.2, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(37, 99, 235);
        doc.text(t.code, startX + 3, y + 4.1);
        doc.setTextColor(15, 23, 42);
        doc.text(doc.splitTextToSize(t.name, 55)[0] || t.name, startX + 18, y + 4.1);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(doc.splitTextToSize(t.subject, colW - 78)[0] || t.subject, startX + 76, y + 4.1);
        y += 6.2;
      });
    });
  }

  const safeFile = `Jadwal_Pelajaran_${header.tahunAjaran.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(safeFile);
}

export async function downloadPersonalJadwalPdf(params: {
  header: ScheduleHeaderConfig;
  logoUrl?: string;
  teacher: TeacherMapping;
  rows: Array<{ day: string; time: string; className: string; subject: string }>;
}) {
  const { header, logoUrl, teacher, rows } = params;
  const logoPng = await loadLogoAsPngDataUrl(logoUrl);
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const marginX = 14;
  const usableW = pageW - marginX * 2;

  // Deep Navy Blue Rounded Banner
  doc.setFillColor(11, 53, 120);
  doc.roundedRect(marginX, 10, usableW, 22, 3.2, 3.2, 'F');
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(marginX + 3.5, 13, 16, 16, 2.2, 2.2, 'F');
  if (logoPng) {
    doc.addImage(logoPng, 'PNG', marginX + 4.5, 14, 14, 14);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.setTextColor(255, 255, 255);
  doc.text('JADWAL MENGAJAR PERSONAL GURU', pageW / 2 + 4, 17.2, { align: 'center' });
  doc.setFontSize(8.5);
  doc.setTextColor(250, 204, 21);
  doc.text(
    `${header.semester.toUpperCase()} TAHUN AJARAN ${header.tahunAjaran.toUpperCase()}`,
    pageW / 2 + 4,
    22.8,
    { align: 'center' }
  );
  doc.setFontSize(9.5);
  doc.setTextColor(255, 255, 255);
  doc.text(header.namaSekolah.toUpperCase(), pageW / 2 + 4, 28.2, { align: 'center' });

  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.roundedRect(marginX, 36, usableW, 20, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(6, 78, 59);
  doc.text(`Nama Guru : ${teacher.name} (Kode: ${teacher.code})`, marginX + 4, 43);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Bidang / Mapel : ${teacher.subject || '-'}`, marginX + 4, 48.5);
  doc.text(`Total Sesi Mengajar : ${rows.length} Sesi / Minggu`, marginX + 4, 53.5);

  let y = 62;
  const cols = [
    { label: 'No', w: 10 },
    { label: 'Hari', w: 26 },
    { label: 'Waktu', w: 34 },
    { label: 'Kelas / Rombel', w: 50 },
    { label: 'Mata Pelajaran', w: usableW - 120 },
  ];

  doc.setFillColor(15, 23, 42);
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  let x = marginX;
  cols.forEach((c) => {
    doc.rect(x, y, c.w, 7.5, 'F');
    doc.text(c.label, x + 2.5, y + 5);
    x += c.w;
  });
  y += 7.5;

  rows.forEach((r, idx) => {
    if (y > 275) {
      doc.addPage();
      y = 18;
    }
    doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 252);
    doc.setDrawColor(226, 232, 240);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);

    const vals = [String(idx + 1), r.day, r.time, r.className, r.subject];
    x = marginX;
    cols.forEach((c, ci) => {
      doc.rect(x, y, c.w, 7, 'FD');
      if (ci === 1 || ci === 3) doc.setFont('helvetica', 'bold');
      else doc.setFont('helvetica', 'normal');
      doc.text(doc.splitTextToSize(vals[ci], c.w - 3)[0] || vals[ci], x + 2.5, y + 4.7);
      x += c.w;
    });
    y += 7;
  });

  const safeTeacher = teacher.name.replace(/[^a-zA-Z0-9_-]/g, '_');
  doc.save(`Jadwal_Personal_${teacher.code}_${safeTeacher}.pdf`);
}

export function printJadwalViaIframe(params: JadwalExportParams) {
  const {
    header,
    logoUrl,
    days,
    timeSlots,
    classes,
    getCellEntry,
    getSpecialActivity,
    resolveTeacherCode,
  } = params;

  const existing = document.getElementById('jadwal-mengajar-print-iframe');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'jadwal-mengajar-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const theadClasses = classes
    .map((c) => {
      const palette = getClassHeaderRgb(c.name);
      return `<th colspan="2" style="background:rgb(${palette.bg.join(',')});color:rgb(${palette.text.join(',')});">${escapeHtml(c.name)}</th>`;
    })
    .join('');

  const theadSub = classes.map(() => `<th>Mapel</th><th>Kd</th>`).join('');

  const tbody = days
    .map((day) =>
      timeSlots
        .map((slot, tIdx) => {
          const special = getSpecialActivity(day, slot);
          const dayCell =
            tIdx === 0
              ? `<td rowspan="${timeSlots.length}" class="day-cell">${escapeHtml(day)}</td>`
              : '';
          if (special) {
            return `<tr>${dayCell}<td class="time-cell">${escapeHtml(slot)}</td><td colspan="${classes.length * 2}" class="special-cell">${escapeHtml(special.subject)}</td></tr>`;
          }
          const cells = classes
            .map((cls) => {
              const entry = getCellEntry(day, slot, cls);
              const code = resolveTeacherCode(entry);
              const bg = entry ? `rgb(${getSubjectRgb(entry.subject, code).join(',')})` : '#ffffff';
              return `<td style="background:${bg}">${escapeHtml(entry?.subject || '')}</td><td class="code-cell" style="background:${bg}">${escapeHtml(code)}</td>`;
            })
            .join('');
          return `<tr>${dayCell}<td class="time-cell">${escapeHtml(slot)}</td>${cells}</tr>`;
        })
        .join('')
    )
    .join('');

  const logoHtml = logoUrl
    ? `<div class="logo-box"><img src="${escapeHtml(logoUrl)}" alt="Logo" referrerpolicy="no-referrer" /></div>`
    : `<div class="logo-box"></div>`;

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(header.judul)}</title>
<style>
  @page { size: A4 landscape; margin: 8mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
  .banner {
    background: linear-gradient(90deg, #0A3170 0%, #0C3B87 50%, #0A3170 100%);
    border-radius: 12px;
    padding: 10px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 10px;
  }
  .logo-box {
    width: 56px;
    height: 56px;
    border-radius: 10px;
    background: #ffffff;
    padding: 4px;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .logo-box img { width: 100%; height: 100%; object-fit: contain; }
  .banner-spacer { width: 56px; flex-shrink: 0; }
  .banner-text { flex: 1; text-align: center; }
  .banner-text h1 { margin: 0; font-size: 18px; font-weight: 900; color: #ffffff; letter-spacing: 0.6px; text-transform: uppercase; }
  .banner-text p { margin: 3px 0; font-size: 11px; font-weight: 900; color: #FACC15; letter-spacing: 0.8px; text-transform: uppercase; }
  .banner-text h2 { margin: 0; font-size: 13px; font-weight: 900; color: #ffffff; letter-spacing: 0.5px; text-transform: uppercase; }
  table { width: 100%; border-collapse: collapse; font-size: 8.5px; }
  th, td { border: 1px solid #cbd5e1; padding: 3px 2px; text-align: center; }
  th { font-weight: 700; }
  .day-cell { font-weight: 800; background: #f1f5f9; writing-mode: vertical-lr; transform: rotate(180deg); width: 22px; }
  .time-cell { font-weight: 700; background: #f8fafc; white-space: nowrap; width: 64px; }
  .code-cell { font-weight: 800; width: 24px; }
  .special-cell { font-weight: 800; letter-spacing: 3px; text-transform: uppercase; background: #eef2ff; color: #475569; }
</style>
</head>
<body>
  <div class="banner">
    ${logoHtml}
    <div class="banner-text">
      <h1>${escapeHtml(header.judul)}</h1>
      <p>${escapeHtml(`${header.semester} TAHUN AJARAN ${header.tahunAjaran}`)}</p>
      <h2>${escapeHtml(header.namaSekolah)}</h2>
    </div>
    <div class="banner-spacer"></div>
  </div>
  <table>
    <thead>
      <tr>
        <th rowspan="2">HARI</th>
        <th rowspan="2">WAKTU</th>
        ${theadClasses}
      </tr>
      <tr>${theadSub}</tr>
    </thead>
    <tbody>${tbody}</tbody>
  </table>
</body>
</html>`;

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 250);
}

export interface BebanJpRowExport {
  code: string;
  name: string;
  subject: string;
  dailyJp: Record<string, number>;
  sesiCount: number;
  jpTatapMuka: number;
  tugasTambahan: string;
  ekuivalensiJp: number;
  totalJp: number;
  targetMinJp: number;
  targetMaxJp: number;
  statusLabel: string;
  statusKey: 'kosong' | 'kurang' | 'ideal' | 'overload';
}

export interface BebanJpExportParams {
  header: ScheduleHeaderConfig;
  logoUrl?: string;
  kepalaSekolah?: string;
  nipKepalaSekolah?: string;
  menitPerJp: number;
  hitungMode: 'durasi' | 'slot';
  defaultMinJp: number;
  defaultMaxJp: number;
  rows: BebanJpRowExport[];
}

export async function downloadBebanJpPdf(params: BebanJpExportParams) {
  const {
    header,
    logoUrl,
    kepalaSekolah = 'Kepala Sekolah',
    nipKepalaSekolah = '-',
    menitPerJp,
    hitungMode,
    defaultMinJp,
    defaultMaxJp,
    rows,
  } = params;

  const logoPng = await loadLogoAsPngDataUrl(logoUrl);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const marginX = 10;
  const marginTop = 8;
  const bannerH = 21;
  const usableW = pageW - marginX * 2;

  const drawBanner = () => {
    doc.setFillColor(11, 53, 120);
    doc.roundedRect(marginX, marginTop, usableW, bannerH, 3.2, 3.2, 'F');

    const logoBoxSize = 15.5;
    const logoBoxX = marginX + 4;
    const logoBoxY = marginTop + (bannerH - logoBoxSize) / 2;
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(logoBoxX, logoBoxY, logoBoxSize, logoBoxSize, 2.4, 2.4, 'F');
    if (logoPng) {
      doc.addImage(logoPng, 'PNG', logoBoxX + 1, logoBoxY + 1, logoBoxSize - 2, logoBoxSize - 2);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('REKAP BEBAN JAM PELAJARAN (JP) GURU', pageW / 2, marginTop + 7, { align: 'center' });

    doc.setFontSize(8.8);
    doc.setTextColor(250, 204, 21);
    doc.text(
      `${header.semester.toUpperCase()} TAHUN AJARAN ${header.tahunAjaran.toUpperCase()}`,
      pageW / 2,
      marginTop + 12.6,
      { align: 'center' }
    );

    doc.setFontSize(10.2);
    doc.setTextColor(255, 255, 255);
    doc.text(header.namaSekolah.toUpperCase(), pageW / 2, marginTop + 18, { align: 'center' });
  };

  drawBanner();

  const totalTatapMuka = rows.reduce((s, r) => s + r.jpTatapMuka, 0);
  const totalTambahan = rows.reduce((s, r) => s + r.ekuivalensiJp, 0);
  const totalSemuaJp = rows.reduce((s, r) => s + r.totalJp, 0);
  const idealCount = rows.filter((r) => r.statusKey === 'ideal').length;

  // Info strip
  let y = marginTop + bannerH + 3.5;
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(marginX, y, usableW, 8, 1.8, 1.8, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.setTextColor(30, 41, 59);
  const modeLabel = hitungMode === 'durasi' ? `1 JP = ${menitPerJp} Menit` : '1 Slot Jadwal = 1 JP';
  doc.text(
    `Standar Hitung: ${modeLabel}   |   Target Ideal: ${defaultMinJp}-${defaultMaxJp} JP/Minggu   |   Total Guru: ${rows.length}   |   Total JP Tatap Muka: ${totalTatapMuka} JP   |   Tugas Tambahan: +${totalTambahan} JP   |   Total Keseluruhan: ${totalSemuaJp} JP   |   Memenuhi Target: ${idealCount} Guru`,
    pageW / 2,
    y + 5.1,
    { align: 'center' }
  );
  y += 11;

  const cols = [
    { label: 'No', w: 8, align: 'center' as const },
    { label: 'Kode', w: 12, align: 'center' as const },
    { label: 'Nama Guru', w: 50, align: 'left' as const },
    { label: 'Mata Pelajaran', w: 46, align: 'left' as const },
    { label: 'Sen', w: 10, align: 'center' as const },
    { label: 'Sel', w: 10, align: 'center' as const },
    { label: 'Rab', w: 10, align: 'center' as const },
    { label: 'Kam', w: 10, align: 'center' as const },
    { label: 'Jum', w: 10, align: 'center' as const },
    { label: 'TM (JP)', w: 15, align: 'center' as const },
    { label: 'Tugas Tambahan', w: 38, align: 'left' as const },
    { label: '+JP', w: 11, align: 'center' as const },
    { label: 'Total', w: 14, align: 'center' as const },
    { label: 'Target', w: 15, align: 'center' as const },
    { label: 'Status', w: usableW - 259, align: 'center' as const },
  ];

  const drawTableHeader = (startY: number) => {
    doc.setFillColor(15, 23, 42);
    doc.setDrawColor(15, 23, 42);
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    let x = marginX;
    cols.forEach((c) => {
      doc.rect(x, startY, c.w, 7.2, 'FD');
      const tx = c.align === 'center' ? x + c.w / 2 : x + 2;
      doc.text(c.label, tx, startY + 4.8, { align: c.align });
      x += c.w;
    });
    return startY + 7.2;
  };

  y = drawTableHeader(y);
  const rowH = 6.5;

  rows.forEach((r, idx) => {
    if (y + rowH > pageH - 14) {
      doc.addPage();
      drawBanner();
      y = drawTableHeader(marginTop + bannerH + 4);
    }

    const even = idx % 2 === 0;
    const vals = [
      String(idx + 1),
      r.code,
      r.name,
      r.subject || '-',
      String(r.dailyJp.SENIN || 0),
      String(r.dailyJp.SELASA || 0),
      String(r.dailyJp.RABU || 0),
      String(r.dailyJp.KAMIS || 0),
      String(r.dailyJp.JUMAT || 0),
      String(r.jpTatapMuka),
      r.tugasTambahan || '-',
      r.ekuivalensiJp > 0 ? `+${r.ekuivalensiJp}` : '0',
      String(r.totalJp),
      `${r.targetMinJp}`,
      r.statusLabel,
    ];

    let x = marginX;
    cols.forEach((c, ci) => {
      if (ci === cols.length - 1) {
        if (r.statusKey === 'ideal') doc.setFillColor(209, 250, 229);
        else if (r.statusKey === 'overload') doc.setFillColor(254, 226, 226);
        else if (r.statusKey === 'kurang') doc.setFillColor(254, 243, 199);
        else doc.setFillColor(241, 245, 249);
      } else {
        doc.setFillColor(even ? 255 : 248, even ? 255 : 250, even ? 255 : 252);
      }
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.18);
      doc.rect(x, y, c.w, rowH, 'FD');

      if (ci === 1 || ci === 2 || ci === 9 || ci === 12 || ci === cols.length - 1) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.setFontSize(6.4);

      if (ci === 1) doc.setTextColor(37, 99, 235);
      else if (ci === cols.length - 1) {
        if (r.statusKey === 'ideal') doc.setTextColor(6, 95, 70);
        else if (r.statusKey === 'overload') doc.setTextColor(185, 28, 28);
        else if (r.statusKey === 'kurang') doc.setTextColor(146, 64, 14);
        else doc.setTextColor(100, 116, 139);
      } else {
        doc.setTextColor(15, 23, 42);
      }

      const tx = c.align === 'center' ? x + c.w / 2 : x + 1.8;
      const truncated = doc.splitTextToSize(vals[ci], c.w - 2.6)[0] || vals[ci];
      doc.text(truncated, tx, y + 4.3, { align: c.align });
      x += c.w;
    });
    y += rowH;
  });

  // Totals Footer Row
  if (y + rowH + 26 > pageH - 8) {
    doc.addPage();
    drawBanner();
    y = marginTop + bannerH + 6;
  }
  const dayTotals = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'].map((d) =>
    rows.reduce((sum, r) => sum + (r.dailyJp[d] || 0), 0)
  );
  const sumVals = [
    '',
    '',
    'TOTAL KESELURUHAN',
    `${rows.length} Guru`,
    ...dayTotals.map(String),
    String(totalTatapMuka),
    '',
    `+${totalTambahan}`,
    String(totalSemuaJp),
    '',
    `${idealCount} Ideal`,
  ];
  let sx = marginX;
  cols.forEach((c, ci) => {
    doc.setFillColor(226, 232, 240);
    doc.setDrawColor(148, 163, 184);
    doc.rect(sx, y, c.w, rowH + 0.5, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.6);
    doc.setTextColor(15, 23, 42);
    const tx = c.align === 'center' ? sx + c.w / 2 : sx + 1.8;
    if (sumVals[ci]) {
      doc.text(sumVals[ci], tx, y + 4.6, { align: c.align });
    }
    sx += c.w;
  });

  // Signature block
  const sigY = y + 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('Mengetahui,', marginX + 25, sigY);
  doc.text('Kepala Sekolah', marginX + 25, sigY + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text(kepalaSekolah, marginX + 25, sigY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text(`NIP. ${nipKepalaSekolah}`, marginX + 25, sigY + 24);

  const rightSigX = pageW - marginX - 75;
  doc.setFontSize(8);
  doc.text('Waka Bidang Kurikulum,', rightSigX, sigY + 4.2);
  doc.setFont('helvetica', 'bold');
  doc.text('___________________________', rightSigX, sigY + 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('NIP. ..............................', rightSigX, sigY + 24);

  const safeFile = `Rekap_Beban_JP_${header.tahunAjaran.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;
  doc.save(safeFile);
}

export function printBebanJpViaIframe(params: BebanJpExportParams) {
  const {
    header,
    logoUrl,
    kepalaSekolah = 'Kepala Sekolah',
    nipKepalaSekolah = '-',
    menitPerJp,
    hitungMode,
    defaultMinJp,
    defaultMaxJp,
    rows,
  } = params;

  const existing = document.getElementById('jadwal-beban-jp-print-iframe');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'jadwal-beban-jp-print-iframe';
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const totalTatapMuka = rows.reduce((s, r) => s + r.jpTatapMuka, 0);
  const totalTambahan = rows.reduce((s, r) => s + r.ekuivalensiJp, 0);
  const totalSemuaJp = rows.reduce((s, r) => s + r.totalJp, 0);
  const dayTotals = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'].map((d) =>
    rows.reduce((sum, r) => sum + (r.dailyJp[d] || 0), 0)
  );

  const badgeStyle = (key: BebanJpRowExport['statusKey']) => {
    if (key === 'ideal') return 'background:#d1fae5;color:#065f46;';
    if (key === 'overload') return 'background:#fee2e2;color:#b91c1c;';
    if (key === 'kurang') return 'background:#fef3c7;color:#92400e;';
    return 'background:#f1f5f9;color:#64748b;';
  };

  const tbody = rows
    .map(
      (r, idx) => `<tr>
        <td>${idx + 1}</td>
        <td class="code">${escapeHtml(r.code)}</td>
        <td class="left bold">${escapeHtml(r.name)}</td>
        <td class="left">${escapeHtml(r.subject || '-')}</td>
        <td>${r.dailyJp.SENIN || 0}</td>
        <td>${r.dailyJp.SELASA || 0}</td>
        <td>${r.dailyJp.RABU || 0}</td>
        <td>${r.dailyJp.KAMIS || 0}</td>
        <td>${r.dailyJp.JUMAT || 0}</td>
        <td class="bold">${r.jpTatapMuka}</td>
        <td class="left">${escapeHtml(r.tugasTambahan || '-')}</td>
        <td>${r.ekuivalensiJp > 0 ? `+${r.ekuivalensiJp}` : '0'}</td>
        <td class="bold">${r.totalJp}</td>
        <td>${r.targetMinJp}</td>
        <td class="bold" style="${badgeStyle(r.statusKey)}">${escapeHtml(r.statusLabel)}</td>
      </tr>`
    )
    .join('');

  const logoHtml = logoUrl
    ? `<div class="logo-box"><img src="${escapeHtml(logoUrl)}" alt="Logo" referrerpolicy="no-referrer" /></div>`
    : `<div class="logo-box"></div>`;

  const modeLabel = hitungMode === 'durasi' ? `1 JP = ${menitPerJp} Menit` : '1 Slot Jadwal = 1 JP';

  const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Rekap Beban JP Guru</title>
<style>
  @page { size: A4 landscape; margin: 9mm; }
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0f172a; margin: 0; }
  .banner {
    background: linear-gradient(90deg, #0A3170 0%, #0C3B87 50%, #0A3170 100%);
    border-radius: 12px;
    padding: 10px 18px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 14px;
    margin-bottom: 10px;
  }
  .logo-box { width: 54px; height: 54px; border-radius: 10px; background: #fff; padding: 4px; box-sizing: border-box; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
  .logo-box img { width: 100%; height: 100%; object-fit: contain; }
  .banner-spacer { width: 54px; flex-shrink: 0; }
  .banner-text { flex: 1; text-align: center; }
  .banner-text h1 { margin: 0; font-size: 16px; font-weight: 900; color: #fff; text-transform: uppercase; letter-spacing: 0.5px; }
  .banner-text p { margin: 3px 0; font-size: 10.5px; font-weight: 900; color: #FACC15; text-transform: uppercase; letter-spacing: 0.7px; }
  .banner-text h2 { margin: 0; font-size: 12px; font-weight: 900; color: #fff; text-transform: uppercase; }
  .meta-bar { background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 8px; padding: 6px 12px; font-size: 10px; font-weight: 700; text-align: center; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; font-size: 9.2px; }
  th, td { border: 1px solid #cbd5e1; padding: 4px 5px; text-align: center; }
  thead th { background: #0f172a; color: #fff; font-weight: 800; }
  tbody tr:nth-child(even) { background: #f8fafc; }
  tfoot td { background: #e2e8f0; font-weight: 800; }
  .left { text-align: left; }
  .bold { font-weight: 800; }
  .code { font-weight: 900; color: #1d4ed8; }
  .sig-row { display: flex; justify-content: space-between; margin-top: 22px; padding: 0 32px; font-size: 10.5px; }
  .sig-box { width: 220px; }
  .sig-space { height: 48px; }
</style>
</head>
<body>
  <div class="banner">
    ${logoHtml}
    <div class="banner-text">
      <h1>REKAP BEBAN JAM PELAJARAN (JP) GURU</h1>
      <p>${escapeHtml(`${header.semester} TAHUN AJARAN ${header.tahunAjaran}`)}</p>
      <h2>${escapeHtml(header.namaSekolah)}</h2>
    </div>
    <div class="banner-spacer"></div>
  </div>
  <div class="meta-bar">
    Standar Hitung: ${escapeHtml(modeLabel)} &nbsp;|&nbsp; Target Ideal: ${defaultMinJp}–${defaultMaxJp} JP/Minggu &nbsp;|&nbsp; Total Guru: ${rows.length} &nbsp;|&nbsp; Total JP Tatap Muka: ${totalTatapMuka} JP &nbsp;|&nbsp; Tugas Tambahan: +${totalTambahan} JP &nbsp;|&nbsp; Total Keseluruhan: ${totalSemuaJp} JP
  </div>
  <table>
    <thead>
      <tr>
        <th>No</th>
        <th>Kode</th>
        <th>Nama Guru</th>
        <th>Mata Pelajaran</th>
        <th>Sen</th>
        <th>Sel</th>
        <th>Rab</th>
        <th>Kam</th>
        <th>Jum</th>
        <th>TM (JP)</th>
        <th>Tugas Tambahan</th>
        <th>+JP</th>
        <th>Total JP</th>
        <th>Target</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>${tbody}</tbody>
    <tfoot>
      <tr>
        <td colspan="4" class="left">TOTAL KESELURUHAN (${rows.length} Guru)</td>
        ${dayTotals.map((t) => `<td>${t}</td>`).join('')}
        <td>${totalTatapMuka}</td>
        <td></td>
        <td>+${totalTambahan}</td>
        <td>${totalSemuaJp}</td>
        <td></td>
        <td></td>
      </tr>
    </tfoot>
  </table>
  <div class="sig-row">
    <div class="sig-box">
      <div>Mengetahui,</div>
      <div>Kepala Sekolah</div>
      <div class="sig-space"></div>
      <div class="bold">${escapeHtml(kepalaSekolah)}</div>
      <div>NIP. ${escapeHtml(nipKepalaSekolah)}</div>
    </div>
    <div class="sig-box">
      <div>&nbsp;</div>
      <div>Waka Bidang Kurikulum</div>
      <div class="sig-space"></div>
      <div class="bold">___________________________</div>
      <div>NIP. ..............................</div>
    </div>
  </div>
</body>
</html>`;

  const doc = iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
  }, 250);
}
