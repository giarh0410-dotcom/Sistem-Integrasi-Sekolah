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
import { saveAs } from 'file-saver';
import mammoth from 'mammoth';
import { BankSoal, OpsiSoal, SchoolSettings, SoalCBT, TipeSoal } from '../../types/school';

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

  const rows: WordRowData[] =
    bank.daftarSoal.length > 0
      ? bank.daftarSoal.map((soal, idx) => {
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

function normalizeTipeSoal(raw: string, hasOptions: boolean, rawKunci: string): TipeSoal {
  const t = raw.trim().toLowerCase().replace(/[\s-]+/g, '_');
  if (
    t === 'multiple_choice' ||
    t === 'mc' ||
    t === 'pgk' ||
    t === 'pg_kompleks' ||
    t === 'pilihan_ganda_kompleks' ||
    t === 'kompleks'
  ) {
    return 'multiple_choice';
  }
  if (t === 'isian' || t === 'isian_singkat' || t === 'singkat') {
    return 'isian';
  }
  if (t === 'esai' || t === 'essay' || t === 'uraian') {
    return 'esai';
  }
  if (t === 'pg' || t === 'pilihan_ganda') {
    return 'pg';
  }
  // Auto-infer if Tipe column was omitted or left blank
  if (!hasOptions) {
    return rawKunci.length > 40 ? 'esai' : 'isian';
  }
  if (rawKunci.includes(',') || rawKunci.includes(';')) {
    return 'multiple_choice';
  }
  return 'pg';
}

function normalizeKunciJawaban(
  tipe: TipeSoal,
  rawKunci: string,
  opsi: OpsiSoal[] | undefined
): string | string[] {
  const trimmed = rawKunci.trim();
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
  return (el.textContent || '')
    .replace(/\u00a0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseTableQuestions(docHtml: DocumentFragment | globalThis.Document): SoalCBT[] {
  const tables = Array.from(docHtml.querySelectorAll('table'));
  const results: SoalCBT[] = [];

  for (const table of tables) {
    const rows = Array.from(table.querySelectorAll('tr'));
    if (rows.length < 2) continue;

    const headerCells = Array.from(rows[0].querySelectorAll('th, td')).map(c =>
      cleanCellText(c).toLowerCase()
    );

    const findCol = (keywords: string[], exact?: string[]) =>
      headerCells.findIndex(h => {
        if (exact && exact.includes(h)) return true;
        return keywords.some(k => h.includes(k));
      });

    const idxPertanyaan = findCol(['pertanyaan', 'butir soal', 'soal'], ['soal']);
    if (idxPertanyaan === -1) continue;

    const idxTipe = findCol(['tipe', 'jenis']);
    const idxA = findCol(['opsi a', 'pilihan a'], ['a']);
    const idxB = findCol(['opsi b', 'pilihan b'], ['b']);
    const idxC = findCol(['opsi c', 'pilihan c'], ['c']);
    const idxD = findCol(['opsi d', 'pilihan d'], ['d']);
    const idxKunci = findCol(['kunci', 'jawaban']);
    const idxBobot = findCol(['bobot', 'poin', 'skor']);
    const idxPembahasan = findCol(['pembahasan', 'penjelasan', 'keterangan']);

    for (let r = 1; r < rows.length; r++) {
      const cells = Array.from(rows[r].querySelectorAll('th, td'));
      if (cells.length === 0) continue;

      const pertanyaanCell = cells[idxPertanyaan];
      const pertanyaan = pertanyaanCell ? cleanCellText(pertanyaanCell) : '';
      if (!pertanyaan || pertanyaan === '-') continue;

      const embeddedImg = pertanyaanCell?.querySelector('img')?.getAttribute('src') || '';

      const rawTipe = idxTipe >= 0 && cells[idxTipe] ? cleanCellText(cells[idxTipe]) : '';
      const rawA = idxA >= 0 && cells[idxA] ? cleanCellText(cells[idxA]) : '';
      const rawB = idxB >= 0 && cells[idxB] ? cleanCellText(cells[idxB]) : '';
      const rawC = idxC >= 0 && cells[idxC] ? cleanCellText(cells[idxC]) : '';
      const rawD = idxD >= 0 && cells[idxD] ? cleanCellText(cells[idxD]) : '';
      const rawKunci = idxKunci >= 0 && cells[idxKunci] ? cleanCellText(cells[idxKunci]) : '';
      const rawBobot = idxBobot >= 0 && cells[idxBobot] ? cleanCellText(cells[idxBobot]) : '';
      const rawPembahasan =
        idxPembahasan >= 0 && cells[idxPembahasan] ? cleanCellText(cells[idxPembahasan]) : '';

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

      results.push({
        id: `soal-word-${Date.now()}-${results.length}`,
        tipe,
        pertanyaan,
        opsi,
        kunciJawaban: normalizeKunciJawaban(tipe, rawKunci, opsi),
        pembahasan: rawPembahasan === '-' ? '' : rawPembahasan,
        bobot: Math.max(1, bobotNum),
        ...(embeddedImg ? { imageUrl: embeddedImg } : {}),
      });
    }
  }

  return results;
}

function parseNumberedTextQuestions(rawText: string): SoalCBT[] {
  const lines = rawText
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  const blocks: string[][] = [];
  let current: string[] | null = null;

  for (const line of lines) {
    if (/^\d{1,3}[.)]\s+/.test(line)) {
      if (current) blocks.push(current);
      current = [line.replace(/^\d{1,3}[.)]\s+/, '').trim()];
    } else if (current) {
      current.push(line);
    }
  }
  if (current) blocks.push(current);

  const results: SoalCBT[] = [];

  for (const block of blocks) {
    const questionLines: string[] = [];
    const opsiMap: Record<string, string> = {};
    let rawTipe = '';
    let rawKunci = '';
    let rawPembahasan = '';
    let rawBobot = '';

    for (const line of block) {
      const optMatch = line.match(/^([A-Da-d])[.)]\s+(.+)$/);
      if (optMatch) {
        opsiMap[optMatch[1].toUpperCase()] = optMatch[2].trim();
        continue;
      }
      const tipeMatch = line.match(/^tipe(?:\s+soal)?\s*[:=]\s*(.+)$/i);
      if (tipeMatch) {
        rawTipe = tipeMatch[1].trim();
        continue;
      }
      const kunciMatch = line.match(/^(?:kunci(?:\s+jawaban)?|jawaban)\s*[:=]\s*(.+)$/i);
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
      if (Object.keys(opsiMap).length === 0 && !rawKunci) {
        questionLines.push(line);
      }
    }

    const pertanyaan = questionLines.join(' ').trim();
    if (!pertanyaan) continue;

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
      id: `soal-word-${Date.now()}-${results.length}`,
      tipe,
      pertanyaan,
      opsi,
      kunciJawaban: normalizeKunciJawaban(tipe, rawKunci, opsi),
      pembahasan: rawPembahasan,
      bobot: Math.max(1, bobotNum),
    });
  }

  return results;
}

export async function parseWordFileToSoalList(file: File): Promise<SoalCBT[]> {
  const arrayBuffer = await file.arrayBuffer();
  const { value: html } = await mammoth.convertToHtml({ arrayBuffer });

  const parser = new DOMParser();
  const parsedDoc = parser.parseFromString(html, 'text/html');

  const tableResults = parseTableQuestions(parsedDoc);
  if (tableResults.length > 0) {
    return tableResults;
  }

  const { value: rawText } = await mammoth.extractRawText({ arrayBuffer });
  return parseNumberedTextQuestions(rawText);
}
