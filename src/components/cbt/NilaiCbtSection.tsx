import React, { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Download,
  Edit3,
  FileSpreadsheet,
  Filter,
  ListChecks,
  Printer,
  RefreshCw,
  Save,
  Search,
  TrendingUp,
  Upload,
  Users
} from 'lucide-react';
import {
  BankSoal,
  CbtExamSettings,
  HasilUjian,
  MataPelajaranItem,
  RombelKelas,
  SchoolSettings,
  Siswa
} from '../../types/school';
import { sortSoalByTipeOrder } from './bankSoalWord';

export type NilaiCbtMode = 'input_nilai' | 'rekap_nilai' | 'analisis_nilai';

interface NilaiCbtSectionProps {
  mode: NilaiCbtMode;
  onChangeMode: (next: NilaiCbtMode) => void;
  hasilUjianList: HasilUjian[];
  onUpsertHasilUjianList: (updatedOrNewItems: HasilUjian[]) => void;
  siswaList: Siswa[];
  rombelList: RombelKelas[];
  mapelList: MataPelajaranItem[];
  bankSoalList: BankSoal[];
  availableKelasList: string[];
  availableMapelList: string[];
  resolveHasilMapel: (h: HasilUjian) => string;
  schoolSettings?: SchoolSettings;
  cbtSettings?: CbtExamSettings;
  korektorNama: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface DraftInputRow {
  nilaiStr: string;
  catatan: string;
}

function getPredikat(score: number, kkm: number): { huruf: string; label: string; colorClass: string } {
  if (score >= 90) {
    return { huruf: 'A', label: 'Sangat Baik', colorClass: 'text-emerald-400' };
  }
  if (score >= 80) {
    return { huruf: 'B', label: 'Baik', colorClass: 'text-sky-400' };
  }
  if (score >= kkm) {
    return { huruf: 'C', label: 'Cukup', colorClass: 'text-amber-300' };
  }
  return { huruf: 'D', label: 'Perlu Remedial', colorClass: 'text-rose-400' };
}

function escapeHtml(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function printHtmlViaHiddenIframe(title: string, htmlBody: string) {
  const existing = document.getElementById('cbt-nilai-print-iframe');
  if (existing) existing.remove();

  const iframe = document.createElement('iframe');
  iframe.id = 'cbt-nilai-print-iframe';
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    @page { size: A4 landscape; margin: 12mm; }
    * { box-sizing: border-box; }
    body {
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 11px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .header h1 {
      margin: 0;
      font-size: 16px;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .header p {
      margin: 2px 0 0;
      font-size: 11px;
      color: #475569;
    }
    .meta {
      text-align: right;
      font-size: 10px;
      color: #334155;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 8px;
    }
    th, td {
      border: 1px solid #cbd5e1;
      padding: 5px 7px;
      text-align: left;
    }
    th {
      background-color: #f1f5f9;
      font-weight: 700;
      text-transform: uppercase;
      font-size: 10px;
    }
    td.num, th.num {
      text-align: center;
      font-variant-numeric: tabular-nums;
    }
    .pass { color: #047857; font-weight: 700; }
    .fail { color: #be123c; font-weight: 700; }
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }
    .summary-card {
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 6px 8px;
      background: #f8fafc;
    }
    .summary-card .lbl {
      font-size: 9px;
      text-transform: uppercase;
      color: #64748b;
    }
    .summary-card .val {
      font-size: 14px;
      font-weight: 700;
      margin-top: 2px;
    }
    .footer-sign {
      margin-top: 20px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
    }
    .sign-box {
      width: 220px;
      text-align: center;
    }
    .sign-space {
      height: 54px;
    }
  </style>
</head>
<body>
  ${htmlBody}
</body>
</html>`);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (err) {
      console.error('Print iframe gagal:', err);
    }
  }, 250);
}

function getMedian(sortedNums: number[]): number {
  if (sortedNums.length === 0) return 0;
  const mid = Math.floor(sortedNums.length / 2);
  if (sortedNums.length % 2 === 1) return sortedNums[mid];
  return (sortedNums[mid - 1] + sortedNums[mid]) / 2;
}

function getStdDev(nums: number[], mean: number): number {
  if (nums.length <= 1) return 0;
  const variance = nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
  return Math.sqrt(variance);
}

export const NilaiCbtSection: React.FC<NilaiCbtSectionProps> = ({
  mode,
  onChangeMode,
  hasilUjianList,
  onUpsertHasilUjianList,
  siswaList,
  rombelList,
  mapelList,
  bankSoalList,
  availableKelasList,
  availableMapelList,
  resolveHasilMapel,
  schoolSettings,
  cbtSettings,
  korektorNama,
  showToast
}) => {
  const activeSiswaList = useMemo(
    () => siswaList.filter(s => (s.status || 'Aktif') === 'Aktif'),
    [siswaList]
  );

  const combinedMapelOptions = useMemo(() => {
    const set = new Set<string>();
    availableMapelList.forEach(m => {
      if (m && m.trim()) set.add(m.trim());
    });
    mapelList.forEach(m => {
      if (m.namaMapel && m.namaMapel.trim()) set.add(m.namaMapel.trim());
    });
    bankSoalList.forEach(b => {
      const m = (b.mataPelajaran || b.mapel || '').trim();
      if (m) set.add(m);
    });
    hasilUjianList.forEach(h => {
      const m = resolveHasilMapel(h).trim();
      if (m && m !== '-') set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [availableMapelList, mapelList, bankSoalList, hasilUjianList, resolveHasilMapel]);

  const combinedKelasOptions = useMemo(() => {
    const set = new Set<string>();
    availableKelasList.forEach(k => {
      if (k && k.trim()) set.add(k.trim());
    });
    rombelList.forEach(r => {
      if (r.namaRombel && r.namaRombel.trim()) set.add(r.namaRombel.trim());
    });
    activeSiswaList.forEach(s => {
      const k = (s.kelas || s.rombel || '').trim();
      if (k) set.add(k);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  }, [availableKelasList, rombelList, activeSiswaList]);

  // Shared filter state
  const [selectedKelas, setSelectedKelas] = useState<string>(() => combinedKelasOptions[0] || '');
  const [selectedMapel, setSelectedMapel] = useState<string>(() => combinedMapelOptions[0] || '');
  const [selectedBankId, setSelectedBankId] = useState<string>('auto');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [customKkmStr, setCustomKkmStr] = useState<string>('');

  // Rekap view mode: per-mapel detail vs all-mapel leger matrix
  const [rekapTampilan, setRekapTampilan] = useState<'per_mapel' | 'leger_semua_mapel'>('per_mapel');

  // Draft rows keyed by `${siswaId}` for Input Nilai
  const [draftMap, setDraftMap] = useState<Record<string, DraftInputRow>>({});
  const [isImporting, setIsImporting] = useState(false);

  // Sync default kelas & mapel when lists populate
  useEffect(() => {
    if (!selectedKelas && combinedKelasOptions.length > 0) {
      setSelectedKelas(combinedKelasOptions[0]);
    }
  }, [combinedKelasOptions, selectedKelas]);

  useEffect(() => {
    if (!selectedMapel && combinedMapelOptions.length > 0) {
      setSelectedMapel(combinedMapelOptions[0]);
    }
  }, [combinedMapelOptions, selectedMapel]);

  // Matching Bank Soal for selected mapel
  const matchingBanks = useMemo(() => {
    if (!selectedMapel) return bankSoalList;
    return bankSoalList.filter(
      b => (b.mataPelajaran || b.mapel || '').trim().toLowerCase() === selectedMapel.trim().toLowerCase()
    );
  }, [bankSoalList, selectedMapel]);

  const activeBankSoal = useMemo(() => {
    if (selectedBankId !== 'auto') {
      return bankSoalList.find(b => b.id === selectedBankId) || null;
    }
    return matchingBanks[0] || null;
  }, [selectedBankId, bankSoalList, matchingBanks]);

  // Determine KKM (from custom input, or mapelList, or default 75)
  const resolvedKkm = useMemo(() => {
    const parsedCustom = Number(customKkmStr);
    if (customKkmStr.trim() !== '' && !Number.isNaN(parsedCustom) && parsedCustom >= 1 && parsedCustom <= 100) {
      return parsedCustom;
    }
    const foundMapel = mapelList.find(
      m => m.namaMapel.trim().toLowerCase() === selectedMapel.trim().toLowerCase()
    );
    return foundMapel?.kkm && foundMapel.kkm > 0 ? foundMapel.kkm : 75;
  }, [customKkmStr, mapelList, selectedMapel]);

  // Latest HasilUjian per student for the selected mapel (or matching bank)
  const hasilBySiswaForMapel = useMemo(() => {
    const map = new Map<string, HasilUjian>();
    const targetMapelNorm = selectedMapel.trim().toLowerCase();

    hasilUjianList.forEach(h => {
      const hMapelNorm = resolveHasilMapel(h).trim().toLowerCase();
      const bankMatch = selectedBankId !== 'auto' ? h.ujianId === selectedBankId : true;
      if (targetMapelNorm && hMapelNorm !== targetMapelNorm && !(selectedBankId !== 'auto' && h.ujianId === selectedBankId)) {
        return;
      }
      if (!bankMatch && hMapelNorm !== targetMapelNorm) return;

      const keys = [h.siswaId, h.nis].filter(Boolean);
      keys.forEach(k => {
        const existing = map.get(k);
        if (!existing || new Date(h.waktuSubmit).getTime() >= new Date(existing.waktuSubmit).getTime()) {
          map.set(k, h);
        }
      });
    });
    return map;
  }, [hasilUjianList, selectedMapel, selectedBankId, resolveHasilMapel]);

  // Students in selected class (or all if selectedKelas === 'Semua')
  const classStudents = useMemo(() => {
    const list =
      selectedKelas === 'Semua' || !selectedKelas
        ? activeSiswaList
        : activeSiswaList.filter(
            s => (s.kelas || s.rombel || '').trim().toLowerCase() === selectedKelas.trim().toLowerCase()
          );
    return [...list].sort((a, b) => a.nama.localeCompare(b.nama, 'id'));
  }, [activeSiswaList, selectedKelas]);

  // Rebuild draft inputs whenever kelas, mapel, bank, or hasilUjianList changes
  useEffect(() => {
    const nextDrafts: Record<string, DraftInputRow> = {};
    classStudents.forEach(s => {
      const existing = hasilBySiswaForMapel.get(s.id) || hasilBySiswaForMapel.get(s.nis);
      nextDrafts[s.id] = {
        nilaiStr: existing ? String(existing.nilaiTotal) : '',
        catatan: existing?.catatanKorektor || ''
      };
    });
    setDraftMap(nextDrafts);
  }, [classStudents, hasilBySiswaForMapel]);

  const filteredClassStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return classStudents;
    return classStudents.filter(
      s =>
        s.nama.toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q) ||
        (s.nisn || '').toLowerCase().includes(q)
    );
  }, [classStudents, searchQuery]);

  // Save all dirty/filled draft scores in Input Nilai
  const handleSaveInputNilai = () => {
    if (!selectedMapel) {
      showToast('Pilih mata pelajaran terlebih dahulu.', 'error');
      return;
    }

    const nowIso = new Date().toISOString();
    const targetUjianId = activeBankSoal?.id || `manual-${selectedMapel.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    const targetJudulUjian =
      activeBankSoal?.judul || `${cbtSettings?.namaUjian || 'Penilaian CBT'} - ${selectedMapel}`;

    const itemsToUpsert: HasilUjian[] = [];
    let invalidCount = 0;

    classStudents.forEach(siswa => {
      const draft = draftMap[siswa.id];
      if (!draft || draft.nilaiStr.trim() === '') return;

      const parsed = Number(draft.nilaiStr.replace(',', '.'));
      if (Number.isNaN(parsed) || parsed < 0 || parsed > 100) {
        invalidCount += 1;
        return;
      }

      const clampedScore = Math.round(parsed * 100) / 100;
      const existing = hasilBySiswaForMapel.get(siswa.id) || hasilBySiswaForMapel.get(siswa.nis);

      if (existing) {
        const unchanged =
          existing.nilaiTotal === clampedScore &&
          (existing.catatanKorektor || '') === draft.catatan.trim() &&
          existing.statusPenilaian === 'Selesai';
        if (unchanged) return;

        itemsToUpsert.push({
          ...existing,
          mataPelajaran: existing.mataPelajaran || selectedMapel,
          judulUjian: existing.judulUjian || targetJudulUjian,
          nilaiTotal: clampedScore,
          statusPenilaian: 'Selesai',
          dikoreksiOleh: korektorNama,
          waktuKoreksi: nowIso,
          catatanKorektor: draft.catatan.trim() || undefined
        });
      } else {
        itemsToUpsert.push({
          id: `hasil-manual-${targetUjianId}-${siswa.id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          ujianId: targetUjianId,
          mataPelajaran: selectedMapel,
          judulUjian: targetJudulUjian,
          siswaId: siswa.id,
          siswaNama: siswa.nama,
          nis: siswa.nis || siswa.nisn || '-',
          kelas: siswa.kelas || siswa.rombel || selectedKelas,
          jawaban: {},
          nilaiTotal: clampedScore,
          statusPenilaian: 'Selesai',
          waktuSubmit: nowIso,
          pelanggaranCount: 0,
          dikoreksiOleh: korektorNama,
          waktuKoreksi: nowIso,
          catatanKorektor: draft.catatan.trim() || 'Input Nilai Manual CBT'
        });
      }
    });

    if (invalidCount > 0) {
      showToast(`${invalidCount} baris memiliki nilai di luar rentang 0–100. Perbaiki sebelum menyimpan.`, 'error');
      return;
    }

    if (itemsToUpsert.length === 0) {
      showToast('Tidak ada perubahan nilai baru untuk disimpan.', 'error');
      return;
    }

    onUpsertHasilUjianList(itemsToUpsert);
    showToast(`Berhasil menyimpan ${itemsToUpsert.length} data nilai CBT (${selectedMapel}) ke database!`);
  };

  // Helper: raise below-KKM drafts up to KKM (Remedial tuntas KKM)
  const handleTerapkanRemedialKkm = () => {
    let adjusted = 0;
    setDraftMap(prev => {
      const next = { ...prev };
      classStudents.forEach(s => {
        const current = next[s.id];
        if (!current || current.nilaiStr.trim() === '') return;
        const val = Number(current.nilaiStr.replace(',', '.'));
        if (!Number.isNaN(val) && val < resolvedKkm) {
          adjusted += 1;
          next[s.id] = {
            nilaiStr: String(resolvedKkm),
            catatan: current.catatan
              ? `${current.catatan} (Remedial KKM ${resolvedKkm})`
              : `Remedial tuntas KKM ${resolvedKkm}`
          };
        }
      });
      return next;
    });
    if (adjusted === 0) {
      showToast('Semua siswa yang sudah memiliki nilai telah mencapai KKM.');
    } else {
      showToast(`${adjusted} nilai di bawah KKM disesuaikan ke ${resolvedKkm}. Klik "Simpan Semua Nilai" untuk menyimpan.`);
    }
  };

  // Download Excel template for Input Nilai
  const handleDownloadTemplateInputExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Input Nilai CBT');

    sheet.mergeCells('A1:G1');
    sheet.getCell('A1').value = `TEMPLATE INPUT NILAI CBT - ${selectedMapel || 'MATA PELAJARAN'}`;
    sheet.getCell('A1').font = { bold: true, size: 13 };

    sheet.mergeCells('A2:G2');
    sheet.getCell('A2').value = `Kelas: ${selectedKelas || 'Semua'} | KKM: ${resolvedKkm} | Isi kolom Nilai (0-100) lalu unggah kembali`;
    sheet.getCell('A2').font = { size: 10, italic: true };

    const headers = ['No', 'NIS', 'NISN', 'Nama Siswa', 'Kelas', 'Nilai (0-100)', 'Catatan / Keterangan'];
    const headerRow = sheet.addRow(headers);
    headerRow.eachCell(cell => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
    });

    classStudents.forEach((s, idx) => {
      const existing = hasilBySiswaForMapel.get(s.id) || hasilBySiswaForMapel.get(s.nis);
      const draftVal = draftMap[s.id]?.nilaiStr;
      const numericVal =
        draftVal !== undefined && draftVal.trim() !== '' && !Number.isNaN(Number(draftVal))
          ? Number(draftVal)
          : existing?.nilaiTotal ?? '';
      sheet.addRow([
        idx + 1,
        s.nis || '',
        s.nisn || '',
        s.nama,
        s.kelas || s.rombel || selectedKelas,
        numericVal,
        draftMap[s.id]?.catatan || existing?.catatanKorektor || ''
      ]);
    });

    sheet.columns = [
      { width: 6 },
      { width: 15 },
      { width: 16 },
      { width: 32 },
      { width: 14 },
      { width: 15 },
      { width: 32 }
    ];

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const safeMapel = (selectedMapel || 'Mapel').replace(/[^a-zA-Z0-9_-]+/g, '_');
    const safeKelas = (selectedKelas || 'Kelas').replace(/[^a-zA-Z0-9_-]+/g, '_');
    saveAs(blob, `Template-Input-Nilai-CBT-${safeMapel}-${safeKelas}.xlsx`);
    showToast('Template Excel input nilai berhasil diunduh.');
  };

  // Import Excel/CSV scores into Input Nilai drafts
  const handleImportNilaiFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setIsImporting(true);
    try {
      const rows: Array<{ nis: string; nisn: string; nama: string; nilai: string; catatan: string }> = [];

      if (file.name.toLowerCase().endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
        if (lines.length > 0) {
          const delimiter = lines[0].includes(';') ? ';' : ',';
          lines.forEach(line => {
            const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            if (cols.length >= 6 && !Number.isNaN(Number(cols[5].replace(',', '.')))) {
              rows.push({
                nis: cols[1] || '',
                nisn: cols[2] || '',
                nama: cols[3] || '',
                nilai: cols[5].replace(',', '.'),
                catatan: cols[6] || ''
              });
            }
          });
        }
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const sheet = workbook.worksheets[0];
        if (sheet) {
          sheet.eachRow(row => {
            const c1 = String(row.getCell(2).value ?? '').trim();
            const c2 = String(row.getCell(3).value ?? '').trim();
            const c3 = String(row.getCell(4).value ?? '').trim();
            const c5 = String(row.getCell(6).value ?? '').trim().replace(',', '.');
            const c6 = String(row.getCell(7).value ?? '').trim();
            const parsed = Number(c5);
            if (c3 && c5 !== '' && !Number.isNaN(parsed) && parsed >= 0 && parsed <= 100) {
              rows.push({ nis: c1, nisn: c2, nama: c3, nilai: String(parsed), catatan: c6 });
            }
          });
        }
      }

      if (rows.length === 0) {
        showToast('Tidak ada data nilai valid (0-100) yang terbaca dari file. Gunakan template Excel.', 'error');
        return;
      }

      let matched = 0;
      setDraftMap(prev => {
        const next = { ...prev };
        classStudents.forEach(s => {
          const found = rows.find(
            r =>
              (s.nis && r.nis && r.nis === s.nis) ||
              (s.nisn && r.nisn && r.nisn === s.nisn) ||
              r.nama.toLowerCase() === s.nama.trim().toLowerCase()
          );
          if (found) {
            matched += 1;
            next[s.id] = {
              nilaiStr: found.nilai,
              catatan: found.catatan || next[s.id]?.catatan || ''
            };
          }
        });
        return next;
      });

      if (matched === 0) {
        showToast('File terbaca, namun tidak ada NIS/NISN/Nama yang cocok dengan siswa kelas ini.', 'error');
      } else {
        showToast(`${matched} nilai berhasil dimuat dari file. Klik "Simpan Semua Nilai" untuk menyimpan.`);
      }
    } catch (err) {
      console.error('Gagal impor nilai Excel:', err);
      showToast('Gagal membaca file nilai. Pastikan format .xlsx atau .csv valid.', 'error');
    } finally {
      setIsImporting(false);
    }
  };

  // =========================================================================
  // REKAP NILAI COMPUTATION (Single Mapel + All-Mapel Leger Matrix)
  // =========================================================================
  const rekapPerMapelRows = useMemo(() => {
    return filteredClassStudents.map((s, idx) => {
      const hasil = hasilBySiswaForMapel.get(s.id) || hasilBySiswaForMapel.get(s.nis);
      const hasScore = Boolean(hasil);
      const nilai = hasil ? hasil.nilaiTotal : null;
      const predikat = nilai !== null ? getPredikat(nilai, resolvedKkm) : null;
      const statusTuntas =
        nilai === null ? 'Belum Ujian' : nilai >= resolvedKkm ? 'Tuntas' : 'Remedial';
      return {
        no: idx + 1,
        siswa: s,
        hasil,
        hasScore,
        nilai,
        predikat,
        statusTuntas,
        selisihKkm: nilai !== null ? Math.round((nilai - resolvedKkm) * 10) / 10 : null
      };
    });
  }, [filteredClassStudents, hasilBySiswaForMapel, resolvedKkm]);

  // Matrix Leger across all mapels that have scores or exist in combinedMapelOptions
  const legerMapelColumns = useMemo(() => {
    const mapelsWithScores = new Set<string>();
    hasilUjianList.forEach(h => {
      const m = resolveHasilMapel(h).trim();
      if (m && m !== '-') mapelsWithScores.add(m);
    });
    const list =
      mapelsWithScores.size > 0
        ? Array.from(mapelsWithScores)
        : combinedMapelOptions.slice(0, 12);
    return list.sort((a, b) => a.localeCompare(b, 'id'));
  }, [hasilUjianList, resolveHasilMapel, combinedMapelOptions]);

  const legerMatrixRows = useMemo(() => {
    const lookup = new Map<string, HasilUjian>();
    hasilUjianList.forEach(h => {
      const mNorm = resolveHasilMapel(h).trim().toLowerCase();
      [h.siswaId, h.nis].filter(Boolean).forEach(idKey => {
        const key = `${idKey}__${mNorm}`;
        const existing = lookup.get(key);
        if (!existing || new Date(h.waktuSubmit).getTime() >= new Date(existing.waktuSubmit).getTime()) {
          lookup.set(key, h);
        }
      });
    });

    const rawRows = filteredClassStudents.map(s => {
      const scoresByMapel: Record<string, number | null> = {};
      let sum = 0;
      let count = 0;

      legerMapelColumns.forEach(mapelName => {
        const mNorm = mapelName.trim().toLowerCase();
        const found = lookup.get(`${s.id}__${mNorm}`) || lookup.get(`${s.nis}__${mNorm}`);
        if (found) {
          scoresByMapel[mapelName] = found.nilaiTotal;
          sum += found.nilaiTotal;
          count += 1;
        } else {
          scoresByMapel[mapelName] = null;
        }
      });

      const average = count > 0 ? Math.round((sum / count) * 100) / 100 : 0;
      return {
        siswa: s,
        scoresByMapel,
        totalNilai: Math.round(sum * 100) / 100,
        jumlahMapelDinilai: count,
        rataRata: average
      };
    });

    // Compute Rank by rataRata descending
    const sortedForRank = [...rawRows].sort((a, b) => b.rataRata - a.rataRata || b.totalNilai - a.totalNilai);
    const rankMap = new Map<string, number>();
    sortedForRank.forEach((row, idx) => {
      rankMap.set(row.siswa.id, row.jumlahMapelDinilai > 0 ? idx + 1 : 0);
    });

    return rawRows.map((row, idx) => ({
      no: idx + 1,
      ...row,
      peringkat: rankMap.get(row.siswa.id) || 0
    }));
  }, [filteredClassStudents, hasilUjianList, resolveHasilMapel, legerMapelColumns]);

  // Export Rekap Excel
  const handleExportRekapExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    if (rekapTampilan === 'per_mapel') {
      const sheet = workbook.addWorksheet('Rekap Nilai CBT');
      sheet.mergeCells('A1:H1');
      sheet.getCell('A1').value = `REKAP NILAI CBT - ${selectedMapel || 'SEMUA MAPEL'} (${selectedKelas || 'SEMUA KELAS'})`;
      sheet.getCell('A1').font = { bold: true, size: 13 };

      const header = sheet.addRow(['No', 'NIS', 'Nama Siswa', 'Kelas', 'Nilai Akhir', 'Predikat', 'Status KKM', 'Catatan / Sumber']);
      header.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      });

      rekapPerMapelRows.forEach(r => {
        sheet.addRow([
          r.no,
          r.siswa.nis || r.siswa.nisn || '-',
          r.siswa.nama,
          r.siswa.kelas || r.siswa.rombel || '-',
          r.nilai ?? '-',
          r.predikat ? `${r.predikat.huruf} (${r.predikat.label})` : '-',
          r.statusTuntas,
          r.hasil?.catatanKorektor || (r.hasil ? 'Ujian CBT' : 'Belum ada nilai')
        ]);
      });

      sheet.columns = [
        { width: 6 },
        { width: 14 },
        { width: 32 },
        { width: 14 },
        { width: 13 },
        { width: 20 },
        { width: 15 },
        { width: 32 }
      ];
    } else {
      const sheet = workbook.addWorksheet('Leger Nilai CBT');
      const totalCols = 6 + legerMapelColumns.length;
      sheet.mergeCells(1, 1, 1, totalCols);
      sheet.getCell(1, 1).value = `LEGER REKAP NILAI CBT - KELAS ${selectedKelas || 'SEMUA'}`;
      sheet.getCell(1, 1).font = { bold: true, size: 13 };

      const header = sheet.addRow([
        'No',
        'NIS',
        'Nama Siswa',
        ...legerMapelColumns,
        'Total',
        'Rata-Rata',
        'Rank'
      ]);
      header.eachCell(c => {
        c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
      });

      legerMatrixRows.forEach(r => {
        sheet.addRow([
          r.no,
          r.siswa.nis || r.siswa.nisn || '-',
          r.siswa.nama,
          ...legerMapelColumns.map(m => r.scoresByMapel[m] ?? '-'),
          r.totalNilai,
          r.rataRata,
          r.peringkat > 0 ? r.peringkat : '-'
        ]);
      });

      sheet.columns = [
        { width: 6 },
        { width: 14 },
        { width: 30 },
        ...legerMapelColumns.map(() => ({ width: 14 })),
        { width: 11 },
        { width: 12 },
        { width: 8 }
      ];
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    const filePrefix = rekapTampilan === 'per_mapel' ? `Rekap-Nilai-${selectedMapel}` : 'Leger-Nilai-CBT';
    saveAs(blob, `${filePrefix.replace(/[^a-zA-Z0-9_-]+/g, '_')}-${(selectedKelas || 'Semua').replace(/\s+/g, '_')}.xlsx`);
    showToast('File Excel rekap nilai berhasil diekspor.');
  };

  // Print Rekap A4 Landscape
  const handlePrintRekap = () => {
    const namaSekolah = schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir';
    const ujianJudul = cbtSettings?.namaUjian || 'Penilaian CBT';
    const semesterInfo = `${cbtSettings?.semester || 'Ganjil'} • TP ${cbtSettings?.tahunAjaran || '2026/2027'}`;

    let tableHtml = '';
    if (rekapTampilan === 'per_mapel') {
      const scored = rekapPerMapelRows.filter(r => r.nilai !== null);
      const tuntasCount = scored.filter(r => (r.nilai ?? 0) >= resolvedKkm).length;
      const avg = scored.length > 0 ? (scored.reduce((a, b) => a + (b.nilai ?? 0), 0) / scored.length).toFixed(1) : '0.0';

      tableHtml = `
        <div class="summary-grid">
          <div class="summary-card"><div class="lbl">Mata Pelajaran</div><div class="val">${escapeHtml(selectedMapel || '-')}</div></div>
          <div class="summary-card"><div class="lbl">Kelas / KKM</div><div class="val">${escapeHtml(selectedKelas || 'Semua')} / ${resolvedKkm}</div></div>
          <div class="summary-card"><div class="lbl">Sudah Dinilai</div><div class="val">${scored.length} / ${rekapPerMapelRows.length}</div></div>
          <div class="summary-card"><div class="lbl">Rata-Rata</div><div class="val">${avg}</div></div>
          <div class="summary-card"><div class="lbl">Ketuntasan</div><div class="val">${scored.length > 0 ? Math.round((tuntasCount / scored.length) * 100) : 0}%</div></div>
        </div>
        <table>
          <thead>
            <tr>
              <th class="num" style="width:36px;">No</th>
              <th style="width:95px;">NIS</th>
              <th>Nama Siswa</th>
              <th style="width:90px;">Kelas</th>
              <th class="num" style="width:70px;">Nilai</th>
              <th class="num" style="width:95px;">Predikat</th>
              <th class="num" style="width:90px;">Status KKM</th>
              <th>Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${rekapPerMapelRows
              .map(
                r => `<tr>
                  <td class="num">${r.no}</td>
                  <td>${escapeHtml(r.siswa.nis || r.siswa.nisn || '-')}</td>
                  <td>${escapeHtml(r.siswa.nama)}</td>
                  <td>${escapeHtml(r.siswa.kelas || r.siswa.rombel || '-')}</td>
                  <td class="num"><strong>${r.nilai ?? '-'}</strong></td>
                  <td class="num">${r.predikat ? `${r.predikat.huruf} (${r.predikat.label})` : '-'}</td>
                  <td class="num ${r.statusTuntas === 'Tuntas' ? 'pass' : r.statusTuntas === 'Remedial' ? 'fail' : ''}">${r.statusTuntas}</td>
                  <td>${escapeHtml(r.hasil?.catatanKorektor || (r.hasil ? 'CBT Otomatis / Koreksi' : 'Belum Mengikuti'))}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>`;
    } else {
      tableHtml = `
        <table>
          <thead>
            <tr>
              <th class="num" style="width:32px;">No</th>
              <th style="width:85px;">NIS</th>
              <th>Nama Siswa</th>
              ${legerMapelColumns.map(m => `<th class="num">${escapeHtml(m)}</th>`).join('')}
              <th class="num">Total</th>
              <th class="num">Rata2</th>
              <th class="num">Rank</th>
            </tr>
          </thead>
          <tbody>
            ${legerMatrixRows
              .map(
                r => `<tr>
                  <td class="num">${r.no}</td>
                  <td>${escapeHtml(r.siswa.nis || '-')}</td>
                  <td>${escapeHtml(r.siswa.nama)}</td>
                  ${legerMapelColumns
                    .map(m => {
                      const val = r.scoresByMapel[m];
                      return `<td class="num ${val !== null && val < resolvedKkm ? 'fail' : ''}">${val ?? '-'}</td>`;
                    })
                    .join('')}
                  <td class="num"><strong>${r.totalNilai}</strong></td>
                  <td class="num"><strong>${r.rataRata}</strong></td>
                  <td class="num">${r.peringkat > 0 ? r.peringkat : '-'}</td>
                </tr>`
              )
              .join('')}
          </tbody>
        </table>`;
    }

    const body = `
      <div class="header">
        <div>
          <h1>${escapeHtml(namaSekolah)}</h1>
          <p>Rekapitulasi Nilai ${escapeHtml(ujianJudul)} • ${escapeHtml(semesterInfo)}</p>
        </div>
        <div class="meta">
          <div>Kelas: <strong>${escapeHtml(selectedKelas || 'Semua')}</strong></div>
          <div>Dicetak: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
        </div>
      </div>
      ${tableHtml}
      <div class="footer-sign">
        <div class="sign-box">
          <div>Mengetahui, Kepala Sekolah</div>
          <div class="sign-space"></div>
          <div><strong>${escapeHtml(cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah')}</strong></div>
        </div>
        <div class="sign-box">
          <div>${escapeHtml(cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok')}, ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}</div>
          <div>Guru / Pengampu Mapel</div>
          <div class="sign-space"></div>
          <div><strong>${escapeHtml(korektorNama)}</strong></div>
        </div>
      </div>`;

    printHtmlViaHiddenIframe(`Rekap Nilai CBT - ${selectedMapel || 'Leger'}`, body);
  };

  // =========================================================================
  // ANALISIS NILAI & ANALISIS BUTIR SOAL COMPUTATION
  // =========================================================================
  const analisisData = useMemo(() => {
    const targetMapelNorm = selectedMapel.trim().toLowerCase();
    const targetKelasNorm = selectedKelas.trim().toLowerCase();

    const filteredAllForMapel = hasilUjianList.filter(h => {
      const mNorm = resolveHasilMapel(h).trim().toLowerCase();
      if (targetMapelNorm && mNorm !== targetMapelNorm) return false;
      if (selectedBankId !== 'auto' && h.ujianId !== selectedBankId && mNorm !== targetMapelNorm) return false;
      return true;
    });

    // Scope according to kelas filter (or all classes)
    const scopedHasil =
      selectedKelas === 'Semua' || !selectedKelas
        ? filteredAllForMapel
        : filteredAllForMapel.filter(h => (h.kelas || '').trim().toLowerCase() === targetKelasNorm);

    // Deduplicate latest attempt per student
    const latestPerStudentMap = new Map<string, HasilUjian>();
    scopedHasil.forEach(h => {
      const key = h.siswaId || h.nis || h.id;
      const prev = latestPerStudentMap.get(key);
      if (!prev || new Date(h.waktuSubmit).getTime() >= new Date(prev.waktuSubmit).getTime()) {
        latestPerStudentMap.set(key, h);
      }
    });

    const uniqueResults = Array.from(latestPerStudentMap.values());
    const scores = uniqueResults.map(r => Number(r.nilaiTotal || 0)).sort((a, b) => a - b);
    const n = scores.length;
    const sum = scores.reduce((a, b) => a + b, 0);
    const mean = n > 0 ? Math.round((sum / n) * 100) / 100 : 0;
    const median = Math.round(getMedian(scores) * 100) / 100;
    const stdDev = Math.round(getStdDev(scores, mean) * 100) / 100;
    const minScore = n > 0 ? scores[0] : 0;
    const maxScore = n > 0 ? scores[n - 1] : 0;

    const tuntasList = uniqueResults.filter(r => r.nilaiTotal >= resolvedKkm).sort((a, b) => b.nilaiTotal - a.nilaiTotal);
    const remedialList = uniqueResults.filter(r => r.nilaiTotal < resolvedKkm).sort((a, b) => a.nilaiTotal - b.nilaiTotal);
    const ketuntasanPct = n > 0 ? Math.round((tuntasList.length / n) * 1000) / 10 : 0;

    // 5-band distribution
    const bands = [
      { label: '90 - 100 (A)', min: 90, max: 100, color: 'bg-emerald-500' },
      { label: '80 - 89 (B)', min: 80, max: 89.999, color: 'bg-sky-500' },
      { label: `${resolvedKkm} - 79 (C)`, min: Math.min(resolvedKkm, 79), max: 79.999, color: 'bg-amber-400' },
      { label: `60 - ${Math.max(resolvedKkm - 1, 60)}`, min: 60, max: Math.max(resolvedKkm - 0.001, 59.999), color: 'bg-orange-500' },
      { label: '< 60 (Perlu Bimbingan)', min: -1, max: 59.999, color: 'bg-rose-500' }
    ].map(b => {
      const count = scores.filter(s => s >= b.min && s <= b.max).length;
      return {
        ...b,
        count,
        pct: n > 0 ? Math.round((count / n) * 1000) / 10 : 0
      };
    });

    // Cross-class comparison for selectedMapel
    const classStatsMap = new Map<string, number[]>();
    filteredAllForMapel.forEach(h => {
      const k = (h.kelas || 'Tanpa Kelas').trim();
      const arr = classStatsMap.get(k) || [];
      arr.push(Number(h.nilaiTotal || 0));
      classStatsMap.set(k, arr);
    });
    const classComparisons = Array.from(classStatsMap.entries())
      .map(([kelasName, vals]) => {
        const avg = Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10;
        const pass = vals.filter(v => v >= resolvedKkm).length;
        return {
          kelas: kelasName,
          peserta: vals.length,
          rataRata: avg,
          tertinggi: Math.max(...vals),
          terendah: Math.min(...vals),
          ketuntasanPct: Math.round((pass / vals.length) * 1000) / 10
        };
      })
      .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }));

    // Item Difficulty Analysis (Tingkat Kesukaran Butir Soal / Indeks P)
    const itemAnalysis = (() => {
      if (!activeBankSoal || !activeBankSoal.daftarSoal || activeBankSoal.daftarSoal.length === 0) {
        return [];
      }
      const orderedSoal = sortSoalByTipeOrder(activeBankSoal.daftarSoal);
      const responsesWithAnswers = uniqueResults.filter(
        r => r.jawaban && Object.keys(r.jawaban).length > 0
      );

      return orderedSoal.map((soal, idx) => {
        const maxBobot = soal.bobot > 0 ? soal.bobot : 10;
        let answeredCount = 0;
        let totalNormalizedScore = 0;
        let fullCorrectCount = 0;

        responsesWithAnswers.forEach(res => {
          const jwb = res.jawaban?.[soal.id];
          if (!jwb) return;
          answeredCount += 1;

          if (typeof jwb.nilai === 'number') {
            const ratio = Math.min(1, Math.max(0, jwb.nilai / maxBobot));
            totalNormalizedScore += ratio;
            if (ratio >= 0.99) fullCorrectCount += 1;
          } else {
            // Compute objective correctness on the fly
            let isCorrect = false;
            if (soal.tipe === 'pg') {
              isCorrect =
                typeof jwb.jawaban === 'string' &&
                jwb.jawaban.trim().toUpperCase() === String(soal.kunciJawaban || '').trim().toUpperCase();
            } else if (soal.tipe === 'multiple_choice') {
              const keys = Array.isArray(soal.kunciJawaban)
                ? soal.kunciJawaban.map(k => k.trim().toUpperCase()).sort()
                : [];
              const ans = Array.isArray(jwb.jawaban)
                ? jwb.jawaban.map(a => a.trim().toUpperCase()).sort()
                : [];
              isCorrect = keys.length > 0 && JSON.stringify(keys) === JSON.stringify(ans);
            } else if (soal.tipe === 'isian') {
              const expected = String(soal.kunciJawaban || '').trim().toLowerCase();
              const actual = typeof jwb.jawaban === 'string' ? jwb.jawaban.trim().toLowerCase() : '';
              isCorrect = Boolean(expected) && expected === actual;
            }
            if (isCorrect) {
              totalNormalizedScore += 1;
              fullCorrectCount += 1;
            }
          }
        });

        const indexP = answeredCount > 0 ? Math.round((totalNormalizedScore / answeredCount) * 100) / 100 : null;
        let kategoriKesukaran: 'Mudah' | 'Sedang' | 'Sukar' | 'Belum Ada Data' = 'Belum Ada Data';
        if (indexP !== null) {
          if (indexP > 0.7) kategoriKesukaran = 'Mudah';
          else if (indexP >= 0.3) kategoriKesukaran = 'Sedang';
          else kategoriKesukaran = 'Sukar';
        }

        return {
          nomor: idx + 1,
          soal,
          answeredCount,
          fullCorrectCount,
          indexP,
          kategoriKesukaran
        };
      });
    })();

    return {
      n,
      mean,
      median,
      stdDev,
      minScore,
      maxScore,
      tuntasList,
      remedialList,
      ketuntasanPct,
      bands,
      classComparisons,
      itemAnalysis
    };
  }, [hasilUjianList, selectedMapel, selectedKelas, selectedBankId, activeBankSoal, resolveHasilMapel, resolvedKkm]);

  const inputSummary = useMemo(() => {
    let filled = 0;
    let passed = 0;
    let total = 0;
    classStudents.forEach(s => {
      const str = draftMap[s.id]?.nilaiStr?.trim() || '';
      if (str !== '') {
        const val = Number(str.replace(',', '.'));
        if (!Number.isNaN(val)) {
          filled += 1;
          total += val;
          if (val >= resolvedKkm) passed += 1;
        }
      }
    });
    return {
      totalSiswa: classStudents.length,
      filled,
      empty: Math.max(0, classStudents.length - filled),
      passed,
      remedial: Math.max(0, filled - passed),
      avg: filled > 0 ? Math.round((total / filled) * 10) / 10 : 0
    };
  }, [classStudents, draftMap, resolvedKkm]);

  return (
    <div className="space-y-6">
      {/* Top Bar: Mode Switcher + Filter Toolbar */}
      <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              {mode === 'input_nilai' && <Edit3 className="w-5 h-5 text-cyan-400" />}
              {mode === 'rekap_nilai' && <ClipboardList className="w-5 h-5 text-indigo-400" />}
              {mode === 'analisis_nilai' && <BarChart3 className="w-5 h-5 text-violet-400" />}
              <span>
                {mode === 'input_nilai' && 'Input Nilai CBT (Manual & Batch Excel)'}
                {mode === 'rekap_nilai' && 'Rekapitulasi & Leger Nilai CBT'}
                {mode === 'analisis_nilai' && 'Analisis Hasil & Butir Soal CBT'}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {mode === 'input_nilai' &&
                'Input atau perbarui nilai ujian siswa per kelas & mata pelajaran, lengkap dengan impor Excel/CSV dan penyesuaian KKM.'}
              {mode === 'rekap_nilai' &&
                'Pantau rekap nilai per mata pelajaran maupun leger lintas mata pelajaran dengan ekspor Excel dan cetak A4.'}
              {mode === 'analisis_nilai' &&
                'Evaluasi statistik ketuntasan klasikal, distribusi nilai, daftar remedial, perbandingan antar kelas, dan tingkat kesukaran butir soal.'}
            </p>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="inline-flex bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => onChangeMode('input_nilai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'input_nilai'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Edit3 className="w-3.5 h-3.5" /> Input Nilai
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('rekap_nilai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'rekap_nilai'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <ClipboardList className="w-3.5 h-3.5" /> Rekap Nilai
            </button>
            <button
              type="button"
              onClick={() => onChangeMode('analisis_nilai')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                mode === 'analisis_nilai'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Analisis Nilai
            </button>
          </div>
        </div>

        {/* Shared Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Users className="w-3 h-3" /> Kelas / Rombel
            </label>
            <select
              value={selectedKelas}
              onChange={e => setSelectedKelas(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-none focus:border-cyan-500"
            >
              <option value="Semua">Semua Kelas ({activeSiswaList.length} Siswa)</option>
              {combinedKelasOptions.map(k => (
                <option key={k} value={k}>
                  {k}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Mata Pelajaran
            </label>
            <select
              value={selectedMapel}
              onChange={e => {
                setSelectedMapel(e.target.value);
                setSelectedBankId('auto');
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-none focus:border-cyan-500"
            >
              {combinedMapelOptions.length === 0 && <option value="">Belum ada Mapel</option>}
              {combinedMapelOptions.map(m => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Paket Bank Soal
            </label>
            <select
              value={selectedBankId}
              onChange={e => setSelectedBankId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-none focus:border-cyan-500"
            >
              <option value="auto">Otomatis ({matchingBanks[0]?.judul || 'Semua Paket Mapel'})</option>
              {matchingBanks.map(b => (
                <option key={b.id} value={b.id}>
                  {b.judul} ({b.daftarSoal.length} soal)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1">
              KKM / Batas Tuntas
            </label>
            <input
              type="number"
              min={1}
              max={100}
              placeholder={`Default: ${resolvedKkm}`}
              value={customKkmStr}
              onChange={e => setCustomKkmStr(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 mb-1 flex items-center gap-1">
              <Search className="w-3 h-3" /> Cari Siswa
            </label>
            <input
              type="text"
              placeholder="Nama / NIS / NISN..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* =================================================================== */}
      {/* MODE 1: INPUT NILAI CBT                                             */}
      {/* =================================================================== */}
      {mode === 'input_nilai' && (
        <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          {/* Summary KPI & Action Bar */}
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 flex-1">
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Total Siswa</div>
                <div className="text-lg font-extrabold text-white tabular-nums">{inputSummary.totalSiswa}</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Terisi</div>
                <div className="text-lg font-extrabold text-cyan-400 tabular-nums">{inputSummary.filled}</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Tuntas (≥{resolvedKkm})</div>
                <div className="text-lg font-extrabold text-emerald-400 tabular-nums">{inputSummary.passed}</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Remedial</div>
                <div className="text-lg font-extrabold text-rose-400 tabular-nums">{inputSummary.remedial}</div>
              </div>
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl px-3 py-2">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Rata-Rata</div>
                <div className="text-lg font-extrabold text-amber-300 tabular-nums">{inputSummary.avg}</div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleDownloadTemplateInputExcel}
                className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" /> Template Excel
              </button>

              <label className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-sky-400" />
                <span>{isImporting ? 'Membaca...' : 'Impor Excel/CSV'}</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleImportNilaiFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleTerapkanRemedialKkm}
                className="px-3 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Tuntaskan ke KKM ({resolvedKkm})
              </button>

              <button
                type="button"
                onClick={handleSaveInputNilai}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md cursor-pointer"
              >
                <Save className="w-4 h-4" /> Simpan Semua Nilai
              </button>
            </div>
          </div>

          {/* Score Input Table */}
          {filteredClassStudents.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs border border-dashed border-slate-800 rounded-xl">
              Tidak ada data siswa yang cocok dengan filter kelas/pencarian saat ini.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 w-28">NIS</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3 w-28">Kelas</th>
                    <th className="py-2.5 px-3 w-32 text-center">Nilai CBT (0–100)</th>
                    <th className="py-2.5 px-3 w-32 text-center">Predikat</th>
                    <th className="py-2.5 px-3 w-32 text-center">Status</th>
                    <th className="py-2.5 px-3">Catatan / Keterangan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredClassStudents.map((siswa, idx) => {
                    const existing = hasilBySiswaForMapel.get(siswa.id) || hasilBySiswaForMapel.get(siswa.nis);
                    const draft = draftMap[siswa.id] || { nilaiStr: '', catatan: '' };
                    const parsedVal = draft.nilaiStr.trim() !== '' ? Number(draft.nilaiStr.replace(',', '.')) : NaN;
                    const isValid = !Number.isNaN(parsedVal) && parsedVal >= 0 && parsedVal <= 100;
                    const predikat = isValid ? getPredikat(parsedVal, resolvedKkm) : null;
                    const isModified =
                      (existing ? String(existing.nilaiTotal) : '') !== draft.nilaiStr ||
                      (existing?.catatanKorektor || '') !== draft.catatan;

                    return (
                      <tr
                        key={siswa.id}
                        className={`transition-colors ${
                          isModified ? 'bg-cyan-950/20' : 'hover:bg-slate-900/50'
                        }`}
                      >
                        <td className="py-2 px-3 text-center text-slate-500 tabular-nums">{idx + 1}</td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-300">
                          {siswa.nis || siswa.nisn || '-'}
                        </td>
                        <td className="py-2 px-3 font-semibold text-white">
                          <div className="flex items-center gap-2">
                            <span>{siswa.nama}</span>
                            {isModified && (
                              <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 text-[9px] font-bold">
                                Diubah
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-300">{siswa.kelas || siswa.rombel || '-'}</td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="number"
                            min={0}
                            max={100}
                            step="0.5"
                            placeholder="-"
                            value={draft.nilaiStr}
                            onChange={e => {
                              const val = e.target.value;
                              setDraftMap(prev => ({
                                ...prev,
                                [siswa.id]: {
                                  nilaiStr: val,
                                  catatan: prev[siswa.id]?.catatan || ''
                                }
                              }));
                            }}
                            className={`w-24 px-2.5 py-1.5 rounded-lg text-center font-bold text-xs tabular-nums outline-none border ${
                              draft.nilaiStr.trim() !== '' && !isValid
                                ? 'bg-rose-950/40 border-rose-500 text-rose-300'
                                : 'bg-slate-900 border-slate-700 text-white focus:border-cyan-400'
                            }`}
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          {predikat ? (
                            <span className={`font-extrabold ${predikat.colorClass}`}>
                              {predikat.huruf} ({predikat.label})
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {!isValid ? (
                            <span className="text-slate-500 text-[11px]">Belum diisi</span>
                          ) : parsedVal >= resolvedKkm ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[11px] font-bold">
                              <CheckCircle2 className="w-3 h-3" /> Tuntas
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 text-[11px] font-bold">
                              <AlertCircle className="w-3 h-3" /> Remedial
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            placeholder="Opsional: catatan susulan/remedial..."
                            value={draft.catatan}
                            onChange={e => {
                              const val = e.target.value;
                              setDraftMap(prev => ({
                                ...prev,
                                [siswa.id]: {
                                  nilaiStr: prev[siswa.id]?.nilaiStr || '',
                                  catatan: val
                                }
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900/70 border border-slate-800 text-xs text-slate-200 outline-none focus:border-cyan-500"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 2: REKAP NILAI CBT                                             */}
      {/* =================================================================== */}
      {mode === 'rekap_nilai' && (
        <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div className="inline-flex bg-slate-900 border border-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setRekapTampilan('per_mapel')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  rekapTampilan === 'per_mapel'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Rekap Detail Per Mapel
              </button>
              <button
                type="button"
                onClick={() => setRekapTampilan('leger_semua_mapel')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                  rekapTampilan === 'leger_semua_mapel'
                    ? 'bg-indigo-500 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Leger Semua Mapel CBT ({legerMapelColumns.length})
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleExportRekapExcel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" /> Ekspor Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={handlePrintRekap}
                className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak / PDF A4
              </button>
            </div>
          </div>

          {rekapTampilan === 'per_mapel' ? (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 w-28">NIS</th>
                    <th className="py-2.5 px-3">Nama Siswa</th>
                    <th className="py-2.5 px-3 w-28">Kelas</th>
                    <th className="py-2.5 px-3 w-24 text-center">Nilai</th>
                    <th className="py-2.5 px-3 w-24 text-center">Selisih KKM</th>
                    <th className="py-2.5 px-3 w-36 text-center">Predikat</th>
                    <th className="py-2.5 px-3 w-28 text-center">Status</th>
                    <th className="py-2.5 px-3">Sumber / Korektor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {rekapPerMapelRows.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        Belum ada siswa pada filter kelas ini.
                      </td>
                    </tr>
                  ) : (
                    rekapPerMapelRows.map(row => (
                      <tr key={row.siswa.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums">{row.no}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                          {row.siswa.nis || row.siswa.nisn || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{row.siswa.nama}</td>
                        <td className="py-2.5 px-3 text-slate-300">{row.siswa.kelas || row.siswa.rombel || '-'}</td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-sm tabular-nums text-white">
                          {row.nilai ?? '-'}
                        </td>
                        <td
                          className={`py-2.5 px-3 text-center font-bold tabular-nums ${
                            row.selisihKkm === null
                              ? 'text-slate-600'
                              : row.selisihKkm >= 0
                              ? 'text-emerald-400'
                              : 'text-rose-400'
                          }`}
                        >
                          {row.selisihKkm === null
                            ? '-'
                            : row.selisihKkm >= 0
                            ? `+${row.selisihKkm}`
                            : row.selisihKkm}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.predikat ? (
                            <span className={`font-bold ${row.predikat.colorClass}`}>
                              {row.predikat.huruf} ({row.predikat.label})
                            </span>
                          ) : (
                            <span className="text-slate-600">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {row.statusTuntas === 'Tuntas' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[11px] font-bold">
                              Tuntas
                            </span>
                          )}
                          {row.statusTuntas === 'Remedial' && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 text-[11px] font-bold">
                              Remedial
                            </span>
                          )}
                          {row.statusTuntas === 'Belum Ujian' && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px] font-semibold">
                              Belum Ada
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                          {row.hasil
                            ? row.hasil.dikoreksiOleh
                              ? `Dikoreksi: ${row.hasil.dikoreksiOleh}`
                              : 'Ujian CBT'
                            : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/90 text-[11px] uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <th className="py-2.5 px-3 w-10 text-center">No</th>
                    <th className="py-2.5 px-3 w-24">NIS</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Nama Siswa</th>
                    {legerMapelColumns.map(mapelName => (
                      <th key={mapelName} className="py-2.5 px-3 text-center min-w-[95px]">
                        {mapelName}
                      </th>
                    ))}
                    <th className="py-2.5 px-3 text-center w-20 bg-slate-900 text-indigo-300">Total</th>
                    <th className="py-2.5 px-3 text-center w-20 bg-slate-900 text-cyan-300">Rata2</th>
                    <th className="py-2.5 px-3 text-center w-16 bg-slate-900 text-amber-300">Rank</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {legerMatrixRows.length === 0 ? (
                    <tr>
                      <td colSpan={6 + legerMapelColumns.length} className="py-8 text-center text-slate-500">
                        Belum ada data siswa/nilai CBT untuk ditampilkan pada leger.
                      </td>
                    </tr>
                  ) : (
                    legerMatrixRows.map(row => (
                      <tr key={row.siswa.id} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 text-center text-slate-500 tabular-nums">{row.no}</td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-300">
                          {row.siswa.nis || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-white">{row.siswa.nama}</td>
                        {legerMapelColumns.map(mapelName => {
                          const val = row.scoresByMapel[mapelName];
                          return (
                            <td
                              key={mapelName}
                              className={`py-2.5 px-3 text-center font-bold tabular-nums ${
                                val === null
                                  ? 'text-slate-600'
                                  : val >= resolvedKkm
                                  ? 'text-emerald-300'
                                  : 'text-rose-400'
                              }`}
                            >
                              {val ?? '-'}
                            </td>
                          );
                        })}
                        <td className="py-2.5 px-3 text-center font-extrabold text-indigo-300 tabular-nums bg-slate-900/40">
                          {row.jumlahMapelDinilai > 0 ? row.totalNilai : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-cyan-300 tabular-nums bg-slate-900/40">
                          {row.jumlahMapelDinilai > 0 ? row.rataRata : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-extrabold text-amber-300 tabular-nums bg-slate-900/40">
                          {row.peringkat > 0 ? `#${row.peringkat}` : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =================================================================== */}
      {/* MODE 3: ANALISIS NILAI & BUTIR SOAL CBT                             */}
      {/* =================================================================== */}
      {mode === 'analisis_nilai' && (
        <div className="space-y-5">
          {/* Statistical Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Peserta Dinilai</div>
              <div className="text-2xl font-extrabold text-white mt-1 tabular-nums">{analisisData.n}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">{selectedKelas || 'Semua Kelas'}</div>
            </div>

            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Rata-Rata (Mean)</div>
              <div className="text-2xl font-extrabold text-cyan-400 mt-1 tabular-nums">{analisisData.mean}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Median: {analisisData.median}</div>
            </div>

            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Ketuntasan Klasikal</div>
              <div
                className={`text-2xl font-extrabold mt-1 tabular-nums ${
                  analisisData.ketuntasanPct >= 75 ? 'text-emerald-400' : 'text-amber-300'
                }`}
              >
                {analisisData.ketuntasanPct}%
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {analisisData.tuntasList.length} Tuntas / {analisisData.remedialList.length} Remedial
              </div>
            </div>

            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Tertinggi</div>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1 tabular-nums">{analisisData.maxScore}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Nilai Maksimal</div>
            </div>

            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Terendah</div>
              <div className="text-2xl font-extrabold text-rose-400 mt-1 tabular-nums">{analisisData.minScore}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Nilai Minimal</div>
            </div>

            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400 font-bold uppercase">Simpangan Baku</div>
              <div className="text-2xl font-extrabold text-violet-400 mt-1 tabular-nums">{analisisData.stdDev}</div>
              <div className="text-[11px] text-slate-500 mt-0.5">Sebaran Nilai (SD)</div>
            </div>
          </div>

          {/* Distribution & Cross-Class Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Score Band Distribution */}
            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-cyan-400" /> Distribusi Rentang Nilai ({selectedMapel || '-'})
              </h4>

              <div className="space-y-3">
                {analisisData.bands.map(band => (
                  <div key={band.label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">{band.label}</span>
                      <span className="font-bold text-slate-300 tabular-nums">
                        {band.count} siswa ({band.pct}%)
                      </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                      <div
                        className={`h-full ${band.color} transition-all duration-300`}
                        style={{ width: `${Math.min(100, band.pct)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Cross-Class Comparison */}
            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 space-y-4">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-indigo-400" /> Perbandingan Antar Kelas ({selectedMapel || '-'})
              </h4>

              {analisisData.classComparisons.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Belum ada data hasil ujian untuk mata pelajaran ini.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900/90 text-[11px] uppercase text-slate-400 border-b border-slate-800">
                        <th className="py-2 px-3">Kelas</th>
                        <th className="py-2 px-3 text-center">Peserta</th>
                        <th className="py-2 px-3 text-center">Rata-Rata</th>
                        <th className="py-2 px-3 text-center">Min–Max</th>
                        <th className="py-2 px-3 text-center">Tuntas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {analisisData.classComparisons.map(c => (
                        <tr key={c.kelas} className="hover:bg-slate-900/50">
                          <td className="py-2 px-3 font-bold text-white">{c.kelas}</td>
                          <td className="py-2 px-3 text-center tabular-nums text-slate-300">{c.peserta}</td>
                          <td className="py-2 px-3 text-center tabular-nums font-bold text-cyan-300">{c.rataRata}</td>
                          <td className="py-2 px-3 text-center tabular-nums text-slate-400">
                            {c.terendah} – {c.tertinggi}
                          </td>
                          <td className="py-2 px-3 text-center tabular-nums font-bold text-emerald-400">
                            {c.ketuntasanPct}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Remedial & Enrichment Student Lists */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-rose-400 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" /> Daftar Siswa Perlu Remedial (&lt; KKM {resolvedKkm})
                </h4>
                <span className="text-xs font-bold text-rose-300 bg-rose-500/15 px-2.5 py-0.5 rounded-lg">
                  {analisisData.remedialList.length} Siswa
                </span>
              </div>
              {analisisData.remedialList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Tidak ada siswa remedial pada filter ini.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 border border-slate-800 rounded-xl">
                  {analisisData.remedialList.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div>
                        <span className="text-slate-500 mr-2">{i + 1}.</span>
                        <span className="font-semibold text-white">{r.siswaNama}</span>
                        <span className="ml-2 text-slate-400">({r.kelas})</span>
                      </div>
                      <span className="font-extrabold text-rose-400 tabular-nums">{r.nilaiTotal}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-extrabold text-emerald-400 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> Daftar Siswa Tuntas / Pengayaan (≥ KKM {resolvedKkm})
                </h4>
                <span className="text-xs font-bold text-emerald-300 bg-emerald-500/15 px-2.5 py-0.5 rounded-lg">
                  {analisisData.tuntasList.length} Siswa
                </span>
              </div>
              {analisisData.tuntasList.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  Belum ada siswa yang mencapai KKM pada filter ini.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/80 border border-slate-800 rounded-xl">
                  {analisisData.tuntasList.map((r, i) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 text-xs">
                      <div>
                        <span className="text-slate-500 mr-2">{i + 1}.</span>
                        <span className="font-semibold text-white">{r.siswaNama}</span>
                        <span className="ml-2 text-slate-400">({r.kelas})</span>
                      </div>
                      <span className="font-extrabold text-emerald-400 tabular-nums">{r.nilaiTotal}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Item Difficulty Index (Tingkat Kesukaran Butir Soal) */}
          <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-violet-400" /> Analisis Tingkat Kesukaran Butir Soal (Indeks P)
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Indeks Kesukaran P = proporsi skor benar peserta per butir soal (Mudah &gt; 0.70, Sedang 0.30–0.70, Sukar &lt; 0.30).
                </p>
              </div>
              {activeBankSoal && (
                <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-300 font-semibold">
                  Paket: {activeBankSoal.judul} ({activeBankSoal.daftarSoal.length} soal)
                </span>
              )}
            </div>

            {analisisData.itemAnalysis.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                Pilih Paket Bank Soal untuk melihat analisis tingkat kesukaran tiap butir soal.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900/90 text-[11px] uppercase text-slate-400 border-b border-slate-800">
                      <th className="py-2.5 px-3 w-12 text-center">No</th>
                      <th className="py-2.5 px-3 w-32">Tipe Soal</th>
                      <th className="py-2.5 px-3">Cuplikan Pertanyaan</th>
                      <th className="py-2.5 px-3 w-24 text-center">Responden</th>
                      <th className="py-2.5 px-3 w-24 text-center">Benar Penuh</th>
                      <th className="py-2.5 px-3 w-24 text-center">Indeks P</th>
                      <th className="py-2.5 px-3 w-32 text-center">Kategori</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {analisisData.itemAnalysis.map(item => (
                      <tr key={item.soal.id} className="hover:bg-slate-900/50">
                        <td className="py-2 px-3 text-center text-slate-400 tabular-nums">{item.nomor}</td>
                        <td className="py-2 px-3 font-semibold text-slate-300 uppercase text-[10px]">
                          {item.soal.tipe === 'pg'
                            ? 'Pilihan Ganda'
                            : item.soal.tipe === 'multiple_choice'
                            ? 'Ganda Kompleks'
                            : item.soal.tipe === 'isian'
                            ? 'Isian Singkat'
                            : 'Esai'}
                        </td>
                        <td className="py-2 px-3 text-slate-200 max-w-md truncate">
                          {item.soal.pertanyaan}
                        </td>
                        <td className="py-2 px-3 text-center tabular-nums text-slate-300">{item.answeredCount}</td>
                        <td className="py-2 px-3 text-center tabular-nums text-emerald-300">{item.fullCorrectCount}</td>
                        <td className="py-2 px-3 text-center font-extrabold tabular-nums text-white">
                          {item.indexP !== null ? item.indexP.toFixed(2) : '-'}
                        </td>
                        <td className="py-2 px-3 text-center">
                          {item.kategoriKesukaran === 'Mudah' && (
                            <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 text-[11px] font-bold">
                              Mudah
                            </span>
                          )}
                          {item.kategoriKesukaran === 'Sedang' && (
                            <span className="px-2 py-0.5 rounded-md bg-sky-500/15 text-sky-300 text-[11px] font-bold">
                              Sedang
                            </span>
                          )}
                          {item.kategoriKesukaran === 'Sukar' && (
                            <span className="px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 text-[11px] font-bold">
                              Sukar
                            </span>
                          )}
                          {item.kategoriKesukaran === 'Belum Ada Data' && (
                            <span className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 text-[11px]">
                              Belum Ada Data
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
