import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { Siswa } from '../types/school';

export interface ExportSiswaOptions {
  filterLabel?: string;
  fileNamePrefix?: string;
  schoolName?: string;
}

const DEFAULT_SCHOOL_NAME = 'SMP ISLAM MODERN AL FAKHIR';

function formatDateId(date: Date): string {
  const bulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${date.getDate()} ${bulan[date.getMonth()]} ${date.getFullYear()}`;
}

function formatSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function getTodayStamp(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function safeStr(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

function buildFileName(ext: 'xlsx' | 'csv' | 'pdf', options?: ExportSiswaOptions): string {
  const base = options?.fileNamePrefix ? formatSlug(options.fileNamePrefix) : 'data_siswa';
  return `${base}_${getTodayStamp()}.${ext}`;
}

export async function exportSiswaToExcel(
  students: Siswa[],
  options?: ExportSiswaOptions
): Promise<string> {
  const schoolName = (options?.schoolName || DEFAULT_SCHOOL_NAME).toUpperCase();
  const filterLabel = options?.filterLabel || 'Semua Data Siswa';
  const todayText = formatDateId(new Date());

  const totalL = students.filter(s => s.jenisKelamin === 'L').length;
  const totalP = students.filter(s => s.jenisKelamin === 'P').length;
  const totalAktif = students.filter(s => s.status === 'Aktif').length;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = schoolName;
  workbook.created = new Date();

  // --- SHEET 1: DATA SISWA ---
  const sheet = workbook.addWorksheet('Data Siswa', {
    views: [{ state: 'frozen', ySplit: 4 }]
  });

  const columns: Array<{ header: string; key: string; width: number; isText?: boolean; align?: 'left' | 'center' | 'right' }> = [
    { header: 'No', key: 'no', width: 6, align: 'center' },
    { header: 'Nama Lengkap Siswa', key: 'nama', width: 30 },
    { header: 'L/P', key: 'jk', width: 6, align: 'center' },
    { header: 'NISN', key: 'nisn', width: 15, isText: true, align: 'center' },
    { header: 'NIS', key: 'nis', width: 14, isText: true, align: 'center' },
    { header: 'NIK', key: 'nik', width: 20, isText: true, align: 'center' },
    { header: 'Kelas / Rombel', key: 'kelas', width: 20 },
    { header: 'Status', key: 'status', width: 11, align: 'center' },
    { header: 'Tempat Lahir', key: 'tempatLahir', width: 16 },
    { header: 'Tanggal Lahir', key: 'tanggalLahir', width: 14, isText: true, align: 'center' },
    { header: 'Agama', key: 'agama', width: 12, align: 'center' },
    { header: 'Alamat Lengkap', key: 'alamat', width: 34 },
    { header: 'Nama Ayah', key: 'namaAyah', width: 22 },
    { header: 'Pekerjaan Ayah', key: 'pekerjaanAyah', width: 18 },
    { header: 'NIK Ayah', key: 'nikAyah', width: 20, isText: true, align: 'center' },
    { header: 'Nama Ibu', key: 'namaIbu', width: 22 },
    { header: 'Pekerjaan Ibu', key: 'pekerjaanIbu', width: 18 },
    { header: 'NIK Ibu', key: 'nikIbu', width: 20, isText: true, align: 'center' },
    { header: 'Nama Wali', key: 'namaWali', width: 22 },
    { header: 'Telepon Wali', key: 'teleponWali', width: 17, isText: true, align: 'center' },
    { header: 'Asal Sekolah', key: 'asalSekolah', width: 24 },
    { header: 'Email', key: 'email', width: 24 },
    { header: 'Gol. Darah', key: 'golDarah', width: 11, align: 'center' },
    { header: 'Berat (kg)', key: 'berat', width: 11, align: 'center' },
    { header: 'Tinggi (cm)', key: 'tinggi', width: 12, align: 'center' }
  ];

  sheet.columns = columns.map(c => ({ key: c.key, width: c.width }));

  const lastColLetter = sheet.getColumn(columns.length).letter;

  // Row 1: Title Banner
  sheet.mergeCells(`A1:${lastColLetter}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = `DATABASE PESERTA DIDIK — ${schoolName}`;
  titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2E5C' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(1).height = 28;

  // Row 2: Subtitle / Filter / Summary
  sheet.mergeCells(`A2:${lastColLetter}2`);
  const subCell = sheet.getCell('A2');
  subCell.value = `Filter: ${filterLabel}  |  Diunduh: ${todayText}  |  Total: ${students.length} Siswa (${totalL} Laki-laki, ${totalP} Perempuan, ${totalAktif} Aktif)`;
  subCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF1E293B' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  subCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  sheet.getRow(2).height = 20;

  // Row 3: Blank spacer
  sheet.getRow(3).height = 8;

  // Row 4: Table Headers
  const headerRow = sheet.getRow(4);
  headerRow.height = 24;
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Data Rows
  students.forEach((s, idx) => {
    const row = sheet.addRow({
      no: idx + 1,
      nama: safeStr(s.nama),
      jk: safeStr(s.jenisKelamin),
      nisn: safeStr(s.nisn),
      nis: safeStr(s.nis),
      nik: safeStr(s.nik),
      kelas: safeStr(s.kelas),
      status: safeStr(s.status || 'Aktif'),
      tempatLahir: safeStr(s.tempatLahir),
      tanggalLahir: safeStr(s.tanggalLahir),
      agama: safeStr(s.agama),
      alamat: safeStr(s.alamatLengkap || s.alamat),
      namaAyah: safeStr(s.namaAyah),
      pekerjaanAyah: safeStr(s.pekerjaanAyah || s.pekerjaanOrtu),
      nikAyah: safeStr(s.nikAyah),
      namaIbu: safeStr(s.namaIbu),
      pekerjaanIbu: safeStr(s.pekerjaanIbu),
      nikIbu: safeStr(s.nikIbu),
      namaWali: safeStr(s.namaWali),
      teleponWali: safeStr(s.teleponWali),
      asalSekolah: safeStr(s.asalSekolah),
      email: safeStr(s.email),
      golDarah: safeStr(s.golonganDarah),
      berat: s.beratBadan ? s.beratBadan : '',
      tinggi: s.tinggiBadan ? s.tinggiBadan : ''
    });

    row.height = 20;
    const isEven = idx % 2 === 1;
    columns.forEach((col, cIdx) => {
      const cell = row.getCell(cIdx + 1);
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
      if (col.isText) {
        cell.numFmt = '@';
      }
      cell.alignment = {
        horizontal: col.align || 'left',
        vertical: 'middle'
      };
      if (isEven) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });
  });

  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: Math.max(4, 4 + students.length), column: columns.length }
  };

  // --- SHEET 2: REKAP PER KELAS ---
  const rekapSheet = workbook.addWorksheet('Rekap per Kelas');
  const classMap = new Map<string, { l: number; p: number; aktif: number; lainnya: number }>();
  students.forEach(s => {
    const k = safeStr(s.kelas) || 'Belum Ada Kelas';
    const cur = classMap.get(k) || { l: 0, p: 0, aktif: 0, lainnya: 0 };
    if (s.jenisKelamin === 'L') cur.l += 1;
    else cur.p += 1;
    if (s.status === 'Aktif') cur.aktif += 1;
    else cur.lainnya += 1;
    classMap.set(k, cur);
  });

  const sortedClasses = Array.from(classMap.entries()).sort((a, b) =>
    a[0].localeCompare(b[0], undefined, { numeric: true })
  );

  rekapSheet.columns = [
    { key: 'no', width: 7 },
    { key: 'kelas', width: 28 },
    { key: 'l', width: 15 },
    { key: 'p', width: 15 },
    { key: 'total', width: 15 },
    { key: 'aktif', width: 14 },
    { key: 'lainnya', width: 16 }
  ];

  rekapSheet.mergeCells('A1:G1');
  const rTitle = rekapSheet.getCell('A1');
  rTitle.value = `REKAPITULASI JUMLAH SISWA PER KELAS — ${schoolName}`;
  rTitle.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  rTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0A2E5C' } };
  rTitle.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  rekapSheet.getRow(1).height = 26;

  const rHeaders = ['No', 'Kelas / Rombel', 'Laki-laki (L)', 'Perempuan (P)', 'Total Siswa', 'Aktif', 'Alumni / Pindah'];
  const rHeaderRow = rekapSheet.getRow(3);
  rHeaderRow.height = 22;
  rHeaders.forEach((h, i) => {
    const c = rHeaderRow.getCell(i + 1);
    c.value = h;
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
    c.alignment = { horizontal: 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'thin', color: { argb: 'FF0F172A' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  sortedClasses.forEach(([kelas, stats], idx) => {
    const r = rekapSheet.addRow({
      no: idx + 1,
      kelas,
      l: stats.l,
      p: stats.p,
      total: stats.l + stats.p,
      aktif: stats.aktif,
      lainnya: stats.lainnya
    });
    r.height = 20;
    for (let i = 1; i <= 7; i++) {
      const c = r.getCell(i);
      c.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' }, bold: i === 5 };
      c.alignment = { horizontal: i === 2 ? 'left' : 'center', vertical: 'middle' };
      c.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    }
  });

  const totalRow = rekapSheet.addRow({
    no: '',
    kelas: 'TOTAL KESELURUHAN',
    l: totalL,
    p: totalP,
    total: students.length,
    aktif: totalAktif,
    lainnya: students.length - totalAktif
  });
  totalRow.height = 22;
  for (let i = 1; i <= 7; i++) {
    const c = totalRow.getCell(i);
    c.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
    c.alignment = { horizontal: i === 2 ? 'left' : 'center', vertical: 'middle' };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF1E40AF' } },
      bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
      left: { style: 'thin', color: { argb: 'FF93C5FD' } },
      right: { style: 'thin', color: { argb: 'FF93C5FD' } }
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const fileName = buildFileName('xlsx', options);
  saveAs(blob, fileName);
  return fileName;
}

export function exportSiswaToCsv(
  students: Siswa[],
  options?: ExportSiswaOptions
): string {
  const headers = [
    'No',
    'Nama Lengkap',
    'L/P',
    'NISN',
    'NIS',
    'NIK',
    'Kelas / Rombel',
    'Status',
    'Tempat Lahir',
    'Tanggal Lahir',
    'Agama',
    'Alamat Lengkap',
    'Nama Ayah',
    'Pekerjaan Ayah',
    'NIK Ayah',
    'Nama Ibu',
    'Pekerjaan Ibu',
    'NIK Ibu',
    'Nama Wali',
    'Telepon Wali',
    'Asal Sekolah',
    'Email',
    'Golongan Darah',
    'Berat Badan (kg)',
    'Tinggi Badan (cm)'
  ];

  const escapeCsv = (val: string | number | undefined | null): string => {
    const str = safeStr(val).replace(/\r?\n/g, ' ');
    return `"${str.replace(/"/g, '""')}"`;
  };

  const lines = [
    headers.map(escapeCsv).join(','),
    ...students.map((s, idx) =>
      [
        idx + 1,
        s.nama,
        s.jenisKelamin,
        s.nisn,
        s.nis,
        s.nik,
        s.kelas,
        s.status || 'Aktif',
        s.tempatLahir,
        s.tanggalLahir,
        s.agama,
        s.alamatLengkap || s.alamat,
        s.namaAyah,
        s.pekerjaanAyah || s.pekerjaanOrtu,
        s.nikAyah,
        s.namaIbu,
        s.pekerjaanIbu,
        s.nikIbu,
        s.namaWali,
        s.teleponWali,
        s.asalSekolah,
        s.email,
        s.golonganDarah,
        s.beratBadan ?? '',
        s.tinggiBadan ?? ''
      ]
        .map(escapeCsv)
        .join(',')
    )
  ];

  const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
    type: 'text/csv;charset=utf-8;'
  });
  const fileName = buildFileName('csv', options);
  saveAs(blob, fileName);
  return fileName;
}

export function exportSiswaToPdf(
  students: Siswa[],
  options?: ExportSiswaOptions
): string {
  const schoolName = (options?.schoolName || DEFAULT_SCHOOL_NAME).toUpperCase();
  const filterLabel = options?.filterLabel || 'Semua Data Siswa';
  const todayText = formatDateId(new Date());

  const totalL = students.filter(s => s.jenisKelamin === 'L').length;
  const totalP = students.filter(s => s.jenisKelamin === 'P').length;
  const totalAktif = students.filter(s => s.status === 'Aktif').length;

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
    compress: true
  });

  const pageW = doc.internal.pageSize.getWidth(); // 297mm
  const pageH = doc.internal.pageSize.getHeight(); // 210mm
  const marginX = 8;
  const tableW = pageW - marginX * 2; // 281mm

  const cols = [
    { label: 'NO', width: 10, align: 'center' as const },
    { label: 'NAMA LENGKAP SISWA', width: 56, align: 'left' as const },
    { label: 'L/P', width: 10, align: 'center' as const },
    { label: 'NISN', width: 26, align: 'center' as const },
    { label: 'NIS', width: 22, align: 'center' as const },
    { label: 'KELAS / ROMBEL', width: 34, align: 'left' as const },
    { label: 'TEMPAT, TGL LAHIR', width: 38, align: 'left' as const },
    { label: 'ORANG TUA / WALI', width: 42, align: 'left' as const },
    { label: 'TELEPON WALI', width: 28, align: 'center' as const },
    { label: 'STATUS', width: 15, align: 'center' as const }
  ];

  const drawPageHeader = (isFirstPage: boolean): number => {
    let y = 9;

    if (isFirstPage) {
      // Navy Header Box
      doc.setFillColor(10, 46, 92);
      doc.roundedRect(marginX, y, tableW, 18, 2, 2, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(`DAFTAR DATA PESERTA DIDIK — ${schoolName}`, marginX + 5, y + 7.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(219, 234, 254);
      doc.text(
        `Filter: ${filterLabel}   |   Tanggal Unduh: ${todayText}   |   Total: ${students.length} Siswa (${totalL} L, ${totalP} P, ${totalAktif} Aktif)`,
        marginX + 5,
        y + 13.8
      );
      y += 22;
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`DAFTAR DATA PESERTA DIDIK — ${schoolName} (${filterLabel})`, marginX, y + 3);
      y += 7;
    }

    // Table Header Bar
    const headerH = 7.5;
    doc.setFillColor(30, 64, 175);
    doc.rect(marginX, y, tableW, headerH, 'F');
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.25);
    doc.rect(marginX, y, tableW, headerH, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);

    let cx = marginX;
    cols.forEach((col, i) => {
      if (i > 0) {
        doc.setDrawColor(147, 197, 253);
        doc.line(cx, y, cx, y + headerH);
      }
      const tx = col.align === 'center' ? cx + col.width / 2 : cx + 2;
      doc.text(col.label, tx, y + 4.9, { align: col.align });
      cx += col.width;
    });

    return y + headerH;
  };

  let curY = drawPageHeader(true);
  const rowH = 6.5;
  const maxY = pageH - 13;

  const fitText = (text: string, maxWidthMm: number): string => {
    const clean = safeStr(text) || '-';
    if (doc.getTextWidth(clean) <= maxWidthMm) return clean;
    let trimmed = clean;
    while (trimmed.length > 1 && doc.getTextWidth(`${trimmed}...`) > maxWidthMm) {
      trimmed = trimmed.slice(0, -1);
    }
    return `${trimmed}...`;
  };

  students.forEach((s, idx) => {
    if (curY + rowH > maxY) {
      doc.addPage('a4', 'landscape');
      curY = drawPageHeader(false);
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252);
      doc.rect(marginX, curY, tableW, rowH, 'F');
    }

    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.18);
    doc.rect(marginX, curY, tableW, rowH, 'S');

    const ttlParts = [safeStr(s.tempatLahir), safeStr(s.tanggalLahir)].filter(Boolean);
    const waliName = safeStr(s.namaWali) || safeStr(s.namaAyah) || safeStr(s.namaIbu) || '-';

    const rowValues = [
      String(idx + 1),
      safeStr(s.nama) || '-',
      safeStr(s.jenisKelamin) || '-',
      safeStr(s.nisn) || '-',
      safeStr(s.nis) || '-',
      safeStr(s.kelas) || '-',
      ttlParts.length > 0 ? ttlParts.join(', ') : '-',
      waliName,
      safeStr(s.teleponWali) || '-',
      safeStr(s.status || 'Aktif')
    ];

    doc.setFontSize(7.5);
    let cx = marginX;
    cols.forEach((col, cIdx) => {
      if (cIdx > 0) {
        doc.setDrawColor(226, 232, 240);
        doc.line(cx, curY, cx, curY + rowH);
      }
      doc.setFont('helvetica', cIdx === 1 ? 'bold' : 'normal');
      doc.setTextColor(15, 23, 42);
      const cellText = fitText(rowValues[cIdx], col.width - 3.2);
      const tx = col.align === 'center' ? cx + col.width / 2 : cx + 1.8;
      doc.text(cellText, tx, curY + 4.4, { align: col.align });
      cx += col.width;
    });

    curY += rowH;
  });

  // Footer with page numbers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(
      `Sistem Informasi Sekolah — ${schoolName} · Diunduh ${todayText}`,
      marginX,
      pageH - 5.5
    );
    doc.text(
      `Halaman ${p} dari ${totalPages}`,
      pageW - marginX,
      pageH - 5.5,
      { align: 'right' }
    );
  }

  const fileName = buildFileName('pdf', options);
  doc.save(fileName);
  return fileName;
}
