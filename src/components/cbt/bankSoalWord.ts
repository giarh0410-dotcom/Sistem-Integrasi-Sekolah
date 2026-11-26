import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { BankSoal, OpsiSoal, SchoolSettings, SoalCBT, TipeSoal } from '../../types/school';

export const TIPE_SOAL_ORDER: Record<TipeSoal, number> = {
  pg: 0,
  multiple_choice: 1,
  isian: 2,
  esai: 3,
};

export function getTipeSoalRank(tipe?: string): number {
  const normalized = String(tipe || 'pg').toLowerCase().trim() as TipeSoal;
  return TIPE_SOAL_ORDER[normalized] ?? 99;
}

export function isSoalListSortedByTipeOrder<T extends { tipe?: string }>(list: T[]): boolean {
  let prevRank = -1;
  for (const item of list) {
    const rank = getTipeSoalRank(item.tipe);
    if (rank < prevRank) return false;
    prevRank = rank;
  }
  return true;
}

export function sortSoalByTipeOrder<T extends { tipe?: string }>(list: T[]): T[] {
  if (isSoalListSortedByTipeOrder(list)) return list;
  return [...list].sort((a, b) => getTipeSoalRank(a.tipe) - getTipeSoalRank(b.tipe));
}

// Total usable width on A4 Landscape (297mm - 2 * 14mm margin = 269mm ≈ 15250 twips)
const COL_WIDTHS_MM = [10, 27, 63, 27, 27, 27, 27, 20, 13, 28]; // sum = 269mm

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: '94A3B8' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '94A3B8' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '94A3B8' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '94A3B8' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
  insideVertical: { style: BorderStyle.SINGLE, size: 4, color: 'CBD5E1' },
};

const GUIDE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 6, color: '059669' },
  bottom: { style: BorderStyle.SINGLE, size: 6, color: '059669' },
  left: { style: BorderStyle.SINGLE, size: 6, color: '059669' },
  right: { style: BorderStyle.SINGLE, size: 6, color: '059669' },
};

interface WordRowData {
  no: string;
  tipe: string;
  pertanyaan: string;
  opsiA: string;
  opsiB: string;
  opsiC: string;
  opsiD: string;
  kunci: string;
  bobot: string;
  pembahasan: string;
}

const TEMPLATE_SAMPLE_ROWS: WordRowData[] = [
  {
    no: '1',
    tipe: 'PG',
    pertanyaan:
      'Topologi jaringan yang setiap perangkatnya terhubung ke satu perangkat konsentrator (Switch) di tengah disebut ...',
    opsiA: 'Topologi Star (Bintang)',
    opsiB: 'Topologi Bus',
    opsiC: 'Topologi Ring',
    opsiD: 'Topologi Mesh',
    kunci: 'A',
    bobot: '10',
    pembahasan: 'Pada topologi Star, seluruh node terhubung ke satu Switch pusat.',
  },
  {
    no: '2',
    tipe: 'MULTIPLE_CHOICE',
    pertanyaan:
      'Pilihlah dua perangkat keras jaringan komputer yang berfungsi meneruskan paket data! (Pilihan >1)',
    opsiA: 'Router',
    opsiB: 'Switch',
    opsiC: 'Monitor',
    opsiD: 'Scanner',
    kunci: 'A, B',
    bobot: '10',
    pembahasan: 'Router dan Switch merupakan perangkat jaringan aktif untuk transmisi data.',
  },
  {
    no: '3',
    tipe: 'ISIAN',
    pertanyaan: 'Ibu kota negara Republik Indonesia yang baru di Kalimantan Timur adalah ...',
    opsiA: '-',
    opsiB: '-',
    opsiC: '-',
    opsiD: '-',
    kunci: 'Nusantara',
    bobot: '10',
    pembahasan: 'IKN Nusantara berlokasi di Kalimantan Timur.',
  },
  {
    no: '4',
    tipe: 'ESAI',
    pertanyaan: 'Jelaskan prinsip kerja fotosintesis pada tumbuhan hijau secara singkat!',
    opsiA: '-',
    opsiB: '-',
    opsiC: '-',
    opsiD: '-',
    kunci: 'Proses mengubah air dan CO2 dengan bantuan cahaya matahari menjadi glukosa dan O2.',
    bobot: '20',
    pembahasan: 'Dinilai berdasarkan ketepatan penjelasan reaksi terang dan reaksi gelap.',
  },
  {
    no: '5',
    tipe: 'PG',
    pertanyaan: '',
    opsiA: '',
    opsiB: '',
    opsiC: '',
    opsiD: '',
    kunci: '',
    bobot: '10',
    pembahasan: '',
  },
  {
    no: '6',
    tipe: 'PG',
    pertanyaan: '',
    opsiA: '',
    opsiB: '',
    opsiC: '',
    opsiD: '',
    kunci: '',
    bobot: '10',
    pembahasan: '',
  },
  {
    no: '7',
    tipe: 'ISIAN',
    pertanyaan: '',
    opsiA: '-',
    opsiB: '-',
    opsiC: '-',
    opsiD: '-',
    kunci: '',
    bobot: '10',
    pembahasan: '',
  },
  {
    no: '8',
    tipe: 'ESAI',
    pertanyaan: '',
    opsiA: '-',
    opsiB: '-',
    opsiC: '-',
    opsiD: '-',
    kunci: '',
    bobot: '20',
    pembahasan: '',
  },
];

function makeHeaderCell(text: string, widthMm: number): TableCell {
  return new TableCell({
    width: { size: convertMillimetersToTwip(widthMm), type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    shading: { fill: '065F46', type: ShadingType.CLEAR, color: 'auto' },
    margins: { top: 100, bottom: 100, left: 90, right: 90 },
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 0 },
        children: [
          new TextRun({
            text,
            bold: true,
            size: 18,
            color: 'FFFFFF',
            font: 'Calibri',
          }),
        ],
      }),
    ],
  });
}

function makeBodyCell(
  text: string,
  widthMm: number,
  options?: { center?: boolean; bold?: boolean; shaded?: boolean }
): TableCell {
  return new TableCell({
    width: { size: convertMillimetersToTwip(widthMm), type: WidthType.DXA },
    verticalAlign: VerticalAlign.TOP,
    shading: options?.shaded
      ? { fill: 'F8FAFC', type: ShadingType.CLEAR, color: 'auto' }
      : undefined,
    margins: { top: 80, bottom: 80, left: 90, right: 90 },
    children: [
      new Paragraph({
        alignment: options?.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: 0, after: 0, line: 240 },
        children: [
          new TextRun({
            text,
            bold: options?.bold ?? false,
            size: 18,
            color: '0F172A',
            font: 'Calibri',
          }),
        ],
      }),
    ],
  });
}

function buildQuestionTable(rows: WordRowData[]): Table {
  const headers = [
    'No',
    'Tipe Soal',
    'Pertanyaan',
    'Opsi A',
    'Opsi B',
    'Opsi C',
    'Opsi D',
    'Kunci',
    'Bobot',
    'Pembahasan',
  ];

  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((label, idx) => makeHeaderCell(label, COL_WIDTHS_MM[idx])),
  });

  const dataRows = rows.map((row, idx) => {
    const shaded = idx % 2 === 1;
    const values = [
      row.no,
      row.tipe,
      row.pertanyaan,
      row.opsiA,
      row.opsiB,
      row.opsiC,
      row.opsiD,
      row.kunci,
      row.bobot,
      row.pembahasan,
    ];
    return new TableRow({
      cantSplit: true,
      children: values.map((val, colIdx) =>
        makeBodyCell(val, COL_WIDTHS_MM[colIdx], {
          center: colIdx === 0 || colIdx === 1 || colIdx === 7 || colIdx === 8,
          bold: colIdx === 0 || colIdx === 1 || colIdx === 7,
          shaded,
        })
      ),
    });
  });

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
    rows: [headerRow, ...dataRows],
  });
}

function buildGuideBox(): Table {
  const bullets = [
    '1. Kolom Tipe Soal wajib diisi salah satu dari: PG, MULTIPLE_CHOICE, ISIAN, atau ESAI.',
    '2. Untuk MULTIPLE_CHOICE (Pilihan Ganda Kompleks >1 jawaban), pisahkan Kunci dengan koma, contoh: A, B.',
    '3. Untuk tipe ISIAN dan ESAI, kosongkan atau isi "-" pada Opsi A sampai Opsi D, lalu tulis kunci/pedoman jawaban di kolom Kunci.',
    '4. Tambah baris baru di tabel (klik kanan -> Insert -> Insert Rows Below) sesuai jumlah soal yang dibutuhkan. Baris kosong otomatis dilewati saat import.',
    '5. Simpan file (.docx) ini lalu unggah di menu CBT Bank Soal (saat Tambah/Edit Paket atau klik tombol Import Word).',
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: GUIDE_BORDERS,
    rows: [
      new TableRow({
        children: [
          new TableCell({
            shading: { fill: 'ECFDF5', type: ShadingType.CLEAR, color: 'auto' },
            margins: { top: 100, bottom: 100, left: 140, right: 140 },
            children: [
              new Paragraph({
                spacing: { before: 0, after: 60 },
                children: [
                  new TextRun({
                    text: 'PANDUAN PENGISIAN TEMPLATE BANK SOAL (.DOCX)',
                    bold: true,
                    size: 19,
                    color: '065F46',
                    font: 'Calibri',
                  }),
                ],
              }),
              ...bullets.map(
                text =>
                  new Paragraph({
                    spacing: { before: 20, after: 20 },
                    children: [
                      new TextRun({
                        text,
                        size: 17,
                        color: '1E293B',
                        font: 'Calibri',
                      }),
                    ],
                  })
              ),
            ],
          }),
        ],
      }),
    ],
  });
}

export async function downloadBankSoalWordTemplate(schoolSettings?: SchoolSettings): Promise<void> {
  const schoolName = (schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase();

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(12),
              bottom: convertMillimetersToTwip(12),
              left: convertMillimetersToTwip(14),
              right: convertMillimetersToTwip(14),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: schoolName,
                bold: true,
                size: 24,
                color: '065F46',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 140 },
            children: [
              new TextRun({
                text: 'TEMPLATE BANK SOAL CBT — 4 TIPE SOAL (PG, MULTIPLE CHOICE, ISIAN, ESAI)',
                bold: true,
                size: 21,
                color: '0F172A',
                font: 'Calibri',
              }),
            ],
          }),
          buildGuideBox(),
          new Paragraph({
            spacing: { before: 140, after: 80 },
            children: [
              new TextRun({
                text: 'TABEL BUTIR SOAL (Baris 1–4 adalah contoh, silakan edit atau tambah baris di bawahnya):',
                bold: true,
                size: 18,
                color: '0F172A',
                font: 'Calibri',
              }),
            ],
          }),
          buildQuestionTable(TEMPLATE_SAMPLE_ROWS),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, 'Template_Bank_Soal_CBT_4Tipe.docx');
}

export async function exportBankSoalToWord(
  bank: BankSoal,
  schoolSettings?: SchoolSettings
): Promise<void> {
  const schoolName = (schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase();

  const orderedSoal = sortSoalByTipeOrder(bank.daftarSoal);
  const rows: WordRowData[] =
    orderedSoal.length > 0
      ? orderedSoal.map((soal, idx) => {
          const getOpt = (id: string) =>
            soal.opsi?.find(o => o.id.toUpperCase() === id)?.teks || '';
          const kunciStr = Array.isArray(soal.kunciJawaban)
            ? soal.kunciJawaban.join(', ')
            : String(soal.kunciJawaban ?? '');
          return {
            no: String(idx + 1),
            tipe: soal.tipe.toUpperCase(),
            pertanyaan: soal.pertanyaan || '',
            opsiA: soal.tipe === 'pg' || soal.tipe === 'multiple_choice' ? getOpt('A') : '-',
            opsiB: soal.tipe === 'pg' || soal.tipe === 'multiple_choice' ? getOpt('B') : '-',
            opsiC: soal.tipe === 'pg' || soal.tipe === 'multiple_choice' ? getOpt('C') : '-',
            opsiD: soal.tipe === 'pg' || soal.tipe === 'multiple_choice' ? getOpt('D') : '-',
            kunci: kunciStr,
            bobot: String(soal.bobot || 10),
            pembahasan: soal.pembahasan || '',
          };
        })
      : TEMPLATE_SAMPLE_ROWS;

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            size: {
              orientation: PageOrientation.LANDSCAPE,
              width: convertMillimetersToTwip(210),
              height: convertMillimetersToTwip(297),
            },
            margin: {
              top: convertMillimetersToTwip(12),
              bottom: convertMillimetersToTwip(12),
              left: convertMillimetersToTwip(14),
              right: convertMillimetersToTwip(14),
            },
          },
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: schoolName,
                bold: true,
                size: 24,
                color: '065F46',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 40 },
            children: [
              new TextRun({
                text: `BANK SOAL: ${(bank.judul || 'PAKET SOAL CBT').toUpperCase()}`,
                bold: true,
                size: 21,
                color: '0F172A',
                font: 'Calibri',
              }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 0, after: 140 },
            children: [
              new TextRun({
                text: `Kode: ${bank.kode}  •  Mapel: ${bank.mataPelajaran}  •  Kelas: ${bank.kelas}  •  Durasi: ${bank.durasiMenit} Menit  •  Penyusun: ${bank.dibuatOleh || '-'}`,
                size: 18,
                color: '475569',
                font: 'Calibri',
              }),
            ],
          }),
          buildQuestionTable(rows),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const safeKode = (bank.kode || bank.judul || 'Bank_Soal')
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '');
  saveAs(blob, `Bank_Soal_${safeKode}.docx`);
}

export async function downloadBankSoalExcelTemplate(schoolSettings?: SchoolSettings): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Template Bank Soal', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  const headers = [
    'No',
    'Tipe Soal',
    'Pertanyaan',
    'Opsi A',
    'Opsi B',
    'Opsi C',
    'Opsi D',
    'Kunci',
    'Bobot',
    'Pembahasan',
  ];

  const headerRow = ws.addRow(headers);
  headerRow.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF065F46' } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  headerRow.height = 24;

  TEMPLATE_SAMPLE_ROWS.forEach((row, idx) => {
    const r = ws.addRow([
      idx + 1,
      row.tipe,
      row.pertanyaan,
      row.opsiA,
      row.opsiB,
      row.opsiC,
      row.opsiD,
      row.kunci,
      Number(row.bobot) || 10,
      row.pembahasan,
    ]);
    r.eachCell((cell, colNumber) => {
      cell.alignment = {
        vertical: 'top',
        horizontal: [1, 2, 8, 9].includes(colNumber) ? 'center' : 'left',
        wrapText: true,
      };
    });
  });

  const widths = [6, 18, 48, 22, 22, 22, 22, 14, 10, 32];
  widths.forEach((w, i) => {
    ws.getColumn(i + 1).width = w;
  });

  const schoolTag = (schoolSettings?.namaSekolah || 'CBT').replace(/[^a-zA-Z0-9]+/g, '_');
  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `Template_Bank_Soal_${schoolTag}_4Tipe.xlsx`
  );
}

function normalizeTipeSoal(raw: string, hasOptions: boolean, rawKunci: string): TipeSoal {
  const t = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (
    t === 'multiple_choice' ||
    t === 'mc' ||
    t === 'pgk' ||
    t === 'pg_kompleks' ||
    t === 'pilihan_ganda_kompleks' ||
    t === 'kompleks' ||
    t.includes('kompleks')
  ) {
    return 'multiple_choice';
  }
  if (t === 'isian' || t === 'isian_singkat' || t === 'singkat' || t.includes('isian')) {
    return 'isian';
  }
  if (t === 'esai' || t === 'essay' || t === 'uraian' || t.includes('uraian') || t.includes('esai')) {
    return 'esai';
  }
  if (t === 'pg' || t === 'pilihan_ganda' || t.includes('pilihan_ganda')) {
    return 'pg';
  }
  // Auto-infer if Tipe column was omitted or left blank
  if (!hasOptions) {
    return rawKunci.length > 40 ? 'esai' : 'isian';
  }
  if (/[,;/]/.test(rawKunci) || /^[A-D]\s+[A-D]/i.test(rawKunci.trim())) {
    return 'multiple_choice';
  }
  return 'pg';
}

function normalizeKunciJawaban(
  tipe: TipeSoal,
  rawKunci: string | string[],
  opsi: OpsiSoal[] | undefined
): string | string[] {
  if (Array.isArray(rawKunci)) {
    const cleaned = rawKunci
      .map(s => String(s).trim().toUpperCase().replace(/[^A-D]/g, ''))
      .filter(s => ['A', 'B', 'C', 'D'].includes(s));
    if (tipe === 'multiple_choice') {
      return cleaned.length > 0 ? Array.from(new Set(cleaned)) : ['A'];
    }
    if (tipe === 'pg') {
      return cleaned[0] || 'A';
    }
    return rawKunci.map(s => String(s).trim()).filter(Boolean).join(', ') || '-';
  }

  const trimmed = String(rawKunci ?? '').trim();
  if (tipe === 'multiple_choice') {
    const tokens = trimmed
      .toUpperCase()
      .split(/[,;\s/|]+/)
      .map(s => s.replace(/[^A-D]/g, ''))
      .filter(s => ['A', 'B', 'C', 'D'].includes(s));
    const unique = Array.from(new Set(tokens));
    return unique.length > 0 ? unique : ['A'];
  }
  if (tipe === 'pg') {
    const letterMatch = trimmed.toUpperCase().match(/\b([A-D])\b/);
    if (letterMatch) return letterMatch[1];
    if (opsi && trimmed) {
      const matchedOpt = opsi.find(
        o => o.teks.trim().toLowerCase() === trimmed.toLowerCase()
      );
      if (matchedOpt) return matchedOpt.id;
    }
    const firstChar = trimmed.toUpperCase().charAt(0);
    return ['A', 'B', 'C', 'D'].includes(firstChar) ? firstChar : 'A';
  }
  return trimmed || '-';
}

function cleanCellText(el: Element): string {
  const clone = el.cloneNode(true) as Element;
  clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
  clone.querySelectorAll('p, div, li, tr').forEach(block => {
    block.appendChild(document.createTextNode(' '));
  });
  return (clone.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function compressEmbeddedDataUrl(src: string, maxDimension = 900, quality = 0.8): Promise<string> {
  if (!src || !src.startsWith('data:image/') || src.startsWith('data:image/svg+xml')) {
    return src;
  }
  if (src.length < 110_000) {
    return src;
  }
  return new Promise(resolve => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;
      if (width > maxDimension || height > maxDimension) {
        if (width >= height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const mimeType = src.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';
      resolve(canvas.toDataURL(mimeType, mimeType === 'image/png' ? undefined : quality));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

function findColumnIndices(headerCells: string[]) {
  const normalized = headerCells.map(h => h.toLowerCase().replace(/\s+/g, ' ').trim());

  const findBest = (exactList: string[], includeList: string[], excludeList: string[] = []): number => {
    const exactIdx = normalized.findIndex(h => exactList.includes(h));
    if (exactIdx !== -1) return exactIdx;
    return normalized.findIndex(h => {
      if (excludeList.some(ex => h === ex || h.includes(ex))) return false;
      return includeList.some(k => h.includes(k));
    });
  };

  const idxPertanyaan = findBest(
    ['pertanyaan', 'soal', 'butir soal', 'question'],
    ['pertanyaan', 'butir soal', 'teks soal', 'question', 'soal'],
    ['tipe soal', 'jenis soal', 'no soal', 'nomor soal']
  );

  const idxTipe = findBest(['tipe', 'tipe soal', 'jenis', 'jenis soal', 'type'], ['tipe', 'jenis', 'bentuk']);
  const idxA = findBest(['a', 'a.', 'opsi a', 'pilihan a', 'pil a', 'pil. a', 'jawaban a'], ['opsi a', 'pilihan a', 'pil. a', 'jawaban a']);
  const idxB = findBest(['b', 'b.', 'opsi b', 'pilihan b', 'pil b', 'pil. b', 'jawaban b'], ['opsi b', 'pilihan b', 'pil. b', 'jawaban b']);
  const idxC = findBest(['c', 'c.', 'opsi c', 'pilihan c', 'pil c', 'pil. c', 'jawaban c'], ['opsi c', 'pilihan c', 'pil. c', 'jawaban c']);
  const idxD = findBest(['d', 'd.', 'opsi d', 'pilihan d', 'pil d', 'pil. d', 'jawaban d'], ['opsi d', 'pilihan d', 'pil. d', 'jawaban d']);
  const idxKunci = findBest(
    ['kunci', 'kunci jawaban', 'kj', 'jawaban', 'answer'],
    ['kunci', 'answer'],
    ['opsi', 'pilihan', 'jawaban a', 'jawaban b', 'jawaban c', 'jawaban d']
  );
  const idxBobot = findBest(['bobot', 'poin', 'skor', 'nilai', 'score'], ['bobot', 'poin', 'skor']);
  const idxPembahasan = findBest(
    ['pembahasan', 'penjelasan', 'keterangan', 'uraian'],
    ['pembahasan', 'penjelasan', 'keterangan']
  );
  const idxImage = findBest(['gambar', 'image', 'imageurl', 'url gambar', 'foto'], ['gambar', 'imageurl']);

  return {
    idxPertanyaan,
    idxTipe,
    idxA,
    idxB,
    idxC,
    idxD,
    idxKunci,
    idxBobot,
    idxPembahasan,
    idxImage,
  };
}

function buildQuestionFromRowCells(
  values: string[],
  cols: ReturnType<typeof findColumnIndices>,
  rowIndex: number,
  embeddedImg?: string
): SoalCBT | null {
  const rawPertanyaan = cols.idxPertanyaan >= 0 ? (values[cols.idxPertanyaan] || '').trim() : '';
  const hasImage = Boolean(embeddedImg && embeddedImg.trim());

  // Skip empty template rows
  if ((!rawPertanyaan || rawPertanyaan === '-') && !hasImage) {
    return null;
  }

  const pertanyaan = rawPertanyaan && rawPertanyaan !== '-' ? rawPertanyaan : 'Perhatikan gambar berikut!';
  const rawTipe = cols.idxTipe >= 0 ? (values[cols.idxTipe] || '').trim() : '';
  const rawA = cols.idxA >= 0 ? (values[cols.idxA] || '').trim() : '';
  const rawB = cols.idxB >= 0 ? (values[cols.idxB] || '').trim() : '';
  const rawC = cols.idxC >= 0 ? (values[cols.idxC] || '').trim() : '';
  const rawD = cols.idxD >= 0 ? (values[cols.idxD] || '').trim() : '';
  const rawKunci = cols.idxKunci >= 0 ? (values[cols.idxKunci] || '').trim() : '';
  const rawBobot = cols.idxBobot >= 0 ? (values[cols.idxBobot] || '').trim() : '';
  const rawPembahasan = cols.idxPembahasan >= 0 ? (values[cols.idxPembahasan] || '').trim() : '';
  const rawImageCol = cols.idxImage >= 0 ? (values[cols.idxImage] || '').trim() : '';

  const nonDashOptions = [rawA, rawB, rawC, rawD].filter(v => v !== '' && v !== '-');
  const hasOptions = nonDashOptions.length >= 2;
  const tipe = normalizeTipeSoal(rawTipe, hasOptions, rawKunci);

  const opsi: OpsiSoal[] | undefined =
    tipe === 'pg' || tipe === 'multiple_choice'
      ? [
          { id: 'A', teks: rawA && rawA !== '-' ? rawA : 'Opsi A' },
          { id: 'B', teks: rawB && rawB !== '-' ? rawB : 'Opsi B' },
          { id: 'C', teks: rawC && rawC !== '-' ? rawC : 'Opsi C' },
          { id: 'D', teks: rawD && rawD !== '-' ? rawD : 'Opsi D' },
        ]
      : undefined;

  const bobotNum = Number(rawBobot.replace(/[^\d.]/g, '')) || 10;
  const finalImg = embeddedImg || (rawImageCol && rawImageCol !== '-' ? rawImageCol : undefined);

  return {
    id: `soal-imp-${Date.now()}-${rowIndex}`,
    tipe,
    pertanyaan,
    opsi,
    kunciJawaban: normalizeKunciJawaban(tipe, rawKunci, opsi),
    pembahasan: rawPembahasan === '-' ? '' : rawPembahasan,
    bobot: Math.max(1, bobotNum),
    ...(finalImg ? { imageUrl: finalImg } : {}),
  };
}

async function parseTableQuestions(docHtml: DocumentFragment | globalThis.Document): Promise<SoalCBT[]> {
  const tables = Array.from(docHtml.querySelectorAll('table'));
  const results: SoalCBT[] = [];

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) continue;

    // Scan first up to 5 rows in case table starts with a merged title or banner row
    let headerRowIdx = -1;
    let cols: ReturnType<typeof findColumnIndices> | null = null;
    const scanLimit = Math.min(5, rows.length - 1);
    for (let r = 0; r < scanLimit; r++) {
      const candidateHeaders = Array.from(rows[r].querySelectorAll('th, td')).map(c => cleanCellText(c));
      const candidateCols = findColumnIndices(candidateHeaders);
      if (candidateCols.idxPertanyaan !== -1) {
        headerRowIdx = r;
        cols = candidateCols;
        break;
      }
    }

    if (headerRowIdx === -1 || !cols) continue;

    for (let r = headerRowIdx + 1; r < rows.length; r++) {
      const cells = Array.from(rows[r].querySelectorAll('th, td'));
      if (cells.length === 0) continue;

      const cellTexts = cells.map(c => cleanCellText(c));
      const pertanyaanCell = cells[cols.idxPertanyaan];
      const rawImg =
        pertanyaanCell?.querySelector('img')?.getAttribute('src') ||
        rows[r].querySelector('img')?.getAttribute('src') ||
        '';
      const compressedImg = rawImg ? await compressEmbeddedDataUrl(rawImg) : '';

      const built = buildQuestionFromRowCells(cellTexts, cols, results.length, compressedImg || undefined);
      if (built) {
        results.push(built);
      }
    }
  }

  return results;
}

function splitInlineOptions(line: string): string[] {
  // Split single-line options like "A. Merah   B. Biru   C. Hijau   D. Kuning"
  const optionTokens = Array.from(line.matchAll(/(?:^|\s)(\*?\s*[A-Da-d][.)]\s+)/g));
  if (optionTokens.length < 2) return [line];

  const parts: string[] = [];
  const firstIdx = optionTokens[0].index ?? 0;
  if (firstIdx > 0) {
    const prefix = line.slice(0, firstIdx).trim();
    if (prefix) parts.push(prefix);
  }
  for (let i = 0; i < optionTokens.length; i++) {
    const start = optionTokens[i].index ?? 0;
    const end = i + 1 < optionTokens.length ? (optionTokens[i + 1].index ?? line.length) : line.length;
    const seg = line.slice(start, end).trim();
    if (seg) parts.push(seg);
  }
  return parts;
}

export function parsePlainTextToSoalList(rawText: string, imagePerBlock?: Array<string | undefined>): SoalCBT[] {
  const rawLines = rawText
    .split(/\r?\n/)
    .flatMap(l => splitInlineOptions(l.trim()))
    .map(l => l.trim())
    .filter(Boolean);

  interface TextBlock {
    lines: string[];
    imageUrl?: string;
    hasOptionsOrKunci: boolean;
  }

  const blocks: TextBlock[] = [];
  let current: TextBlock | null = null;
  let lastQuestionNum = 0;

  for (let idx = 0; idx < rawLines.length; idx++) {
    const line = rawLines[idx];
    const explicitSoalMatch = line.match(/^(?:soal|no\.?)\s*(\d{1,3})[.):\-\s]+(.+)$/i);
    const numMatch = line.match(/^(\d{1,3})([.)])\s*(.+)$/);

    let isNewQuestion = false;
    let parsedNum = 0;
    let firstStem = '';

    if (explicitSoalMatch) {
      isNewQuestion = true;
      parsedNum = Number(explicitSoalMatch[1]);
      firstStem = explicitSoalMatch[2].trim();
    } else if (numMatch) {
      parsedNum = Number(numMatch[1]);
      const delim = numMatch[2];
      firstStem = numMatch[3].trim();

      if (!current) {
        isNewQuestion = true;
      } else if (current.hasOptionsOrKunci) {
        isNewQuestion = true;
      } else if (delim === '.' && parsedNum === lastQuestionNum + 1 && parsedNum > 1) {
        isNewQuestion = true;
      }
    }

    if (isNewQuestion) {
      if (current) blocks.push(current);
      lastQuestionNum = parsedNum || lastQuestionNum + 1;
      current = {
        lines: [firstStem],
        imageUrl: imagePerBlock?.[blocks.length],
        hasOptionsOrKunci: false,
      };
      continue;
    }

    if (current) {
      if (
        /^\*?\s*[A-Da-d][.)]\s*/.test(line) ||
        /^(?:kunci(?:\s+jawaban)?|jawaban|kj|answer)\s*[:=]/i.test(line)
      ) {
        current.hasOptionsOrKunci = true;
      }
      current.lines.push(line);
    }
  }
  if (current) blocks.push(current);

  const results: SoalCBT[] = [];

  for (const block of blocks) {
    const questionLines: string[] = [];
    const opsiMap: Record<string, string> = {};
    const starredAnswers: string[] = [];
    let rawTipe = '';
    let rawKunci = '';
    let rawPembahasan = '';
    let rawBobot = '';

    for (const line of block.lines) {
      const optMatch = line.match(/^(\*?)\s*([A-Da-d])[.)]\s*(.+)$/);
      if (optMatch) {
        const isStarred = Boolean(optMatch[1]);
        const letter = optMatch[2].toUpperCase();
        let optText = optMatch[3].trim();
        if (/\((?:benar|kunci)\)\s*$/i.test(optText) || /\s*\*$/.test(optText)) {
          optText = optText.replace(/\((?:benar|kunci)\)\s*$/i, '').replace(/\s*\*$/, '').trim();
          starredAnswers.push(letter);
        } else if (isStarred) {
          starredAnswers.push(letter);
        }
        opsiMap[letter] = optText;
        continue;
      }
      const tipeMatch = line.match(/^(?:tipe|jenis)(?:\s+soal)?\s*[:=]\s*(.+)$/i);
      if (tipeMatch) {
        rawTipe = tipeMatch[1].trim();
        continue;
      }
      const kunciMatch = line.match(/^(?:kunci(?:\s+jawaban)?|jawaban|kj|answer)\s*[:=]\s*(.+)$/i);
      if (kunciMatch) {
        rawKunci = kunciMatch[1].trim();
        continue;
      }
      const bobotMatch = line.match(/^(?:bobot|poin|skor)\s*[:=]\s*(.+)$/i);
      if (bobotMatch) {
        rawBobot = bobotMatch[1].trim();
        continue;
      }
      const pembMatch = line.match(/^(?:pembahasan|penjelasan)\s*[:=]\s*(.+)$/i);
      if (pembMatch) {
        rawPembahasan = pembMatch[1].trim();
        continue;
      }
      if (Object.keys(opsiMap).length === 0 && !rawKunci && !rawPembahasan) {
        questionLines.push(line);
      } else if (rawPembahasan) {
        rawPembahasan = `${rawPembahasan} ${line}`.trim();
      }
    }

    if (!rawKunci && starredAnswers.length > 0) {
      rawKunci = starredAnswers.join(', ');
    }

    const pertanyaan = questionLines.join(' ').trim();
    if (!pertanyaan && !block.imageUrl) continue;

    const hasOptions = Object.keys(opsiMap).length >= 2;
    const tipe = normalizeTipeSoal(rawTipe, hasOptions, rawKunci);
    const opsi: OpsiSoal[] | undefined =
      tipe === 'pg' || tipe === 'multiple_choice'
        ? (['A', 'B', 'C', 'D'] as const).map(id => ({
            id,
            teks: opsiMap[id] || `Opsi ${id}`,
          }))
        : undefined;

    const bobotNum = Number(rawBobot.replace(/[^\d.]/g, '')) || 10;

    results.push({
      id: `soal-txt-${Date.now()}-${results.length}`,
      tipe,
      pertanyaan: pertanyaan || 'Perhatikan gambar berikut!',
      opsi,
      kunciJawaban: normalizeKunciJawaban(tipe, rawKunci, opsi),
      pembahasan: rawPembahasan,
      bobot: Math.max(1, bobotNum),
      ...(block.imageUrl ? { imageUrl: block.imageUrl } : {}),
    });
  }

  return results;
}

async function parseNonTableDocxQuestions(docHtml: globalThis.Document): Promise<SoalCBT[]> {
  // Walk paragraph/list blocks so embedded images stay paired with the question block they belong to
  const blocks = Array.from(docHtml.body.querySelectorAll('p, li, h1, h2, h3, h4'));
  const lines: string[] = [];
  const blockImagesByQuestionIdx: Array<string | undefined> = [];
  let currentQuestionIdx = -1;

  for (const el of blocks) {
    if (el.closest('table')) continue;
    const text = cleanCellText(el);
    const imgSrc = el.querySelector('img')?.getAttribute('src') || '';

    if (text) {
      const splitLines = splitInlineOptions(text);
      for (const line of splitLines) {
        if (
          /^(?:soal|no\.?)\s*\d{1,3}[.):\-\s]+/i.test(line) ||
          /^\d{1,3}\.\s*\S+/.test(line)
        ) {
          currentQuestionIdx++;
        }
        lines.push(line);
      }
    }

    if (imgSrc && currentQuestionIdx >= 0 && !blockImagesByQuestionIdx[currentQuestionIdx]) {
      blockImagesByQuestionIdx[currentQuestionIdx] = await compressEmbeddedDataUrl(imgSrc);
    }
  }

  if (lines.length === 0) return [];
  return parsePlainTextToSoalList(lines.join('\n'), blockImagesByQuestionIdx);
}

export async function parseWordFileToSoalList(file: File): Promise<SoalCBT[]> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.doc') && !lowerName.endsWith('.docx')) {
    throw new Error('Format Word .doc lama tidak didukung. Silakan buka di Word lalu Save As menjadi .docx.');
  }

  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(html, 'text/html');

  const tableResults = await parseTableQuestions(parsedDoc);
  if (tableResults.length > 0) {
    return tableResults;
  }

  const htmlBlockResults = await parseNonTableDocxQuestions(parsedDoc);
  if (htmlBlockResults.length > 0) {
    return htmlBlockResults;
  }

  const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
  return parsePlainTextToSoalList(rawText);
}

function parseCsvRows(rawText: string): string[][] {
  const cleaned = rawText.replace(/^\uFEFF/, '');
  const firstLine = cleaned.split(/\r?\n/)[0] || '';
  const semiCount = (firstLine.match(/;/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const delimiter = semiCount > commaCount ? ';' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (inQuotes) {
      if (ch === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === delimiter) {
      row.push(field.trim());
      field = '';
    } else if (ch === '\r') {
      continue;
    } else if (ch === '\n') {
      row.push(field.trim());
      if (row.some(c => c !== '')) rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  row.push(field.trim());
  if (row.some(c => c !== '')) rows.push(row);
  return rows;
}

function extractExcelCellText(cell: ExcelJS.Cell): string {
  const val = cell.value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean') {
    return String(val).trim();
  }
  if (typeof val === 'object') {
    if ('richText' in val && Array.isArray((val as any).richText)) {
      return (val as any).richText.map((r: any) => r.text || '').join('').trim();
    }
    if ('result' in val && (val as any).result !== undefined) {
      return String((val as any).result).trim();
    }
    if ('text' in val && (val as any).text !== undefined) {
      return String((val as any).text).trim();
    }
  }
  return String(cell.text || '').trim();
}

function parseTabularRowsToSoalList(matrix: string[][]): SoalCBT[] {
  if (matrix.length < 2) return [];
  let headerRowIdx = -1;
  let cols: ReturnType<typeof findColumnIndices> | null = null;
  const scanLimit = Math.min(5, matrix.length - 1);

  for (let r = 0; r < scanLimit; r++) {
    const candidateCols = findColumnIndices(matrix[r]);
    if (candidateCols.idxPertanyaan !== -1) {
      headerRowIdx = r;
      cols = candidateCols;
      break;
    }
  }
  if (headerRowIdx === -1 || !cols) return [];

  const results: SoalCBT[] = [];
  for (let r = headerRowIdx + 1; r < matrix.length; r++) {
    const built = buildQuestionFromRowCells(matrix[r], cols, results.length);
    if (built) results.push(built);
  }
  return results;
}

async function parseExcelFileToSoalList(file: File): Promise<SoalCBT[]> {
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith('.xls') && !lowerName.endsWith('.xlsx')) {
    throw new Error('Format Excel .xls lama tidak didukung. Silakan simpan ulang sebagai .xlsx atau .csv.');
  }
  const wb = new ExcelJS.Workbook();
  const buffer = await file.arrayBuffer();
  await wb.xlsx.load(buffer);

  const results: SoalCBT[] = [];
  for (const ws of wb.worksheets) {
    const matrix: string[][] = [];
    ws.eachRow(row => {
      const rowValues: string[] = [];
      const colCount = Math.max(row.cellCount, 10);
      for (let c = 1; c <= colCount; c++) {
        rowValues.push(extractExcelCellText(row.getCell(c)));
      }
      if (rowValues.some(v => v !== '')) {
        matrix.push(rowValues);
      }
    });
    const parsed = parseTabularRowsToSoalList(matrix);
    if (parsed.length > 0) {
      results.push(...parsed);
      break;
    }
  }
  return results;
}

function normalizeJsonSoalArray(rawList: any[]): SoalCBT[] {
  return rawList
    .filter((item: any) => item && (typeof item.pertanyaan === 'string' || typeof item.soal === 'string' || item.imageUrl))
    .map((item: any, idx: number) => {
      const pertanyaan = String(item.pertanyaan ?? item.soal ?? '').trim() || 'Perhatikan gambar berikut!';
      let opsi: OpsiSoal[] | undefined;

      if (Array.isArray(item.opsi) && item.opsi.length >= 2) {
        const letters = ['A', 'B', 'C', 'D'];
        opsi = item.opsi.slice(0, 4).map((o: any, oIdx: number) =>
          typeof o === 'string'
            ? { id: letters[oIdx] || String.fromCharCode(65 + oIdx), teks: o.trim() }
            : {
                id: String(o?.id || letters[oIdx] || String.fromCharCode(65 + oIdx)).toUpperCase(),
                teks: String(o?.teks ?? o?.text ?? '').trim()
              }
        );
      } else if (item.opsi && typeof item.opsi === 'object' && !Array.isArray(item.opsi)) {
        const letters = ['A', 'B', 'C', 'D'];
        opsi = letters
          .filter(l => item.opsi[l] !== undefined || item.opsi[l.toLowerCase()] !== undefined)
          .map(l => ({ id: l, teks: String(item.opsi[l] ?? item.opsi[l.toLowerCase()] ?? '').trim() }));
      } else if (item.opsiA || item.opsiB) {
        opsi = [
          { id: 'A', teks: String(item.opsiA || 'Opsi A').trim() },
          { id: 'B', teks: String(item.opsiB || 'Opsi B').trim() },
          { id: 'C', teks: String(item.opsiC || 'Opsi C').trim() },
          { id: 'D', teks: String(item.opsiD || 'Opsi D').trim() },
        ];
      }

      const hasOptions = Boolean(opsi && opsi.length >= 2);
      const rawKunci = item.kunciJawaban ?? item.kunci ?? '';
      const rawTipe = String(item.tipe ?? item.jenis ?? '');
      const tipe = normalizeTipeSoal(rawTipe, hasOptions, Array.isArray(rawKunci) ? rawKunci.join(',') : String(rawKunci));

      const finalOpsi: OpsiSoal[] | undefined =
        tipe === 'pg' || tipe === 'multiple_choice'
          ? opsi && opsi.length >= 2
            ? opsi
            : [
                { id: 'A', teks: 'Opsi A' },
                { id: 'B', teks: 'Opsi B' },
                { id: 'C', teks: 'Opsi C' },
                { id: 'D', teks: 'Opsi D' },
              ]
          : undefined;

      return {
        id: `soal-json-${Date.now()}-${idx}`,
        tipe,
        pertanyaan,
        opsi: finalOpsi,
        kunciJawaban: normalizeKunciJawaban(tipe, rawKunci, finalOpsi),
        pembahasan: String(item.pembahasan ?? item.penjelasan ?? '').trim(),
        bobot: Math.max(1, Number(item.bobot ?? item.poin ?? 10) || 10),
        ...(item.imageUrl ? { imageUrl: String(item.imageUrl) } : {}),
        ...(item.videoUrl ? { videoUrl: String(item.videoUrl) } : {}),
      };
    });
}

export async function parseSoalImportFile(file: File): Promise<{ soalList: SoalCBT[]; formatLabel: string }> {
  const lowerName = file.name.toLowerCase();

  if (
    lowerName.endsWith('.docx') ||
    lowerName.endsWith('.doc') ||
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) {
    const soalList = sortSoalByTipeOrder(await parseWordFileToSoalList(file));
    return { soalList, formatLabel: 'Word (.docx)' };
  }

  if (
    lowerName.endsWith('.xlsx') ||
    lowerName.endsWith('.xls') ||
    file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ) {
    const soalList = sortSoalByTipeOrder(await parseExcelFileToSoalList(file));
    return { soalList, formatLabel: 'Excel (.xlsx)' };
  }

  if (lowerName.endsWith('.csv') || file.type === 'text/csv') {
    const text = await file.text();
    const matrix = parseCsvRows(text);
    const soalList = sortSoalByTipeOrder(parseTabularRowsToSoalList(matrix));
    return { soalList, formatLabel: 'CSV' };
  }

  if (lowerName.endsWith('.json') || file.type === 'application/json') {
    const text = await file.text();
    let parsed: any;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new Error('Isi file JSON tidak valid. Periksa tanda koma atau tanda kutip pada JSON.');
    }
    const rawList = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.daftarSoal)
      ? parsed.daftarSoal
      : null;
    if (!rawList) {
      throw new Error('File JSON harus berupa array soal [...] atau objek dengan properti "daftarSoal".');
    }
    const soalList = sortSoalByTipeOrder(normalizeJsonSoalArray(rawList));
    return { soalList, formatLabel: 'JSON' };
  }

  if (lowerName.endsWith('.txt') || file.type === 'text/plain') {
    const text = await file.text();
    const soalList = sortSoalByTipeOrder(parsePlainTextToSoalList(text));
    return { soalList, formatLabel: 'Teks (.txt)' };
  }

  throw new Error('Format file belum didukung. Gunakan Word (.docx), Excel (.xlsx), CSV, JSON, atau TXT.');
}
