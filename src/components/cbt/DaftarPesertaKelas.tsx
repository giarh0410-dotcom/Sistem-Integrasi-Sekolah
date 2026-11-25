import React, { useEffect, useMemo, useState } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileDown,
  FileSpreadsheet,
  LayoutGrid,
  Loader2,
  Printer,
  RefreshCw,
  Search,
  Users,
  X
} from 'lucide-react';
import {
  CbtExamSettings,
  RombelKelas,
  Role,
  SchoolSettings,
  Siswa
} from '../../types/school';
import { dbFetchCollection } from '../../lib/firebaseSync';
import {
  downloadDaftarPesertaKelasPdf,
  PesertaKelasPdfGroup
} from './daftarPesertaKelasPdf';

interface DenahSeatRef {
  nomorKursi: number;
  siswaId?: string;
  namaSiswa?: string;
  kelasSiswa?: string;
  nomorPeserta?: string;
}

interface DenahRoomRef {
  id: string;
  namaRuang: string;
  pengawas?: string;
  kursiList?: DenahSeatRef[];
}

export interface DaftarPesertaKelasRow {
  siswa: Siswa;
  nama: string;
  kelas: string;
  jenisKelamin: 'L' | 'P';
  jenisKelaminLabel: 'Laki-laki' | 'Perempuan';
  ruangUjian: string;
  nomorKursi?: number;
  noPesertaCbt: string;
  isPlaced: boolean;
}

interface DaftarPesertaKelasProps {
  siswaList: Siswa[];
  rombelList?: RombelKelas[];
  schoolSettings?: SchoolSettings;
  cbtSettings?: CbtExamSettings;
  currentRole?: Role;
  showToast: (msg: string) => void;
  onNavigateToDenah?: () => void;
}

const DENAH_STORAGE_KEY = 'edu_denahRuangList';

function getGradeSortWeight(kelasName: string): number {
  const upper = kelasName.toUpperCase().trim();
  if (upper.startsWith('VII') || upper.startsWith('7')) return 7;
  if (upper.startsWith('VIII') || upper.startsWith('8')) return 8;
  if (upper.startsWith('IX') || upper.startsWith('9')) return 9;
  if (upper.startsWith('X ') || upper.startsWith('10')) return 10;
  if (upper.startsWith('XI ') || upper.startsWith('11')) return 11;
  if (upper.startsWith('XII') || upper.startsWith('12')) return 12;
  return 99;
}

function compareKelasNames(a: string, b: string): number {
  const wa = getGradeSortWeight(a);
  const wb = getGradeSortWeight(b);
  if (wa !== wb) return wa - wb;
  return a.localeCompare(b, undefined, { numeric: true });
}

function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function sanitizeSheetName(name: string, usedNames: Set<string>): string {
  const base = (name || 'Kelas')
    .replace(/[\\/?*[\]:]/g, '-')
    .trim()
    .slice(0, 31) || 'Kelas';
  if (!usedNames.has(base)) {
    usedNames.add(base);
    return base;
  }
  let idx = 2;
  while (idx < 100) {
    const suffix = ` (${idx})`;
    const candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    if (!usedNames.has(candidate)) {
      usedNames.add(candidate);
      return candidate;
    }
    idx += 1;
  }
  return base;
}

function buildCbtNoPeserta(siswa: Siswa, seatNoPeserta?: string): string {
  const cleanId = (siswa.nisn || siswa.nis || '').trim();
  if (cleanId) {
    return `C2026-${cleanId.slice(-4).padStart(4, '0')}`;
  }
  if (seatNoPeserta && seatNoPeserta.trim()) {
    return seatNoPeserta.trim();
  }
  return 'C2026-0000';
}

function printHtmlViaHiddenIframe(html: string): void {
  try {
    const existing = document.getElementById('cbt-peserta-kelas-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cbt-peserta-kelas-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '210mm';
    iframe.style.height = '297mm';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.style.border = '0';
    iframe.style.zIndex = '-1';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    const win = iframe.contentWindow;
    if (!doc || !win) {
      iframe.remove();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    let printed = false;
    const triggerPrint = () => {
      if (printed) return;
      printed = true;
      setTimeout(() => {
        try {
          win.focus();
          win.print();
        } finally {
          setTimeout(() => iframe.remove(), 1500);
        }
      }, 250);
    };

    iframe.onload = triggerPrint;
    setTimeout(triggerPrint, 700);
  } catch (err) {
    console.error('Gagal mencetak daftar peserta ujian per kelas:', err);
  }
}

export const DaftarPesertaKelas: React.FC<DaftarPesertaKelasProps> = ({
  siswaList,
  rombelList = [],
  schoolSettings,
  cbtSettings,
  currentRole = 'admin',
  showToast,
  onNavigateToDenah
}) => {
  const [denahRooms, setDenahRooms] = useState<DenahRoomRef[]>(() => {
    try {
      const saved = localStorage.getItem(DENAH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore parse errors
    }
    return [];
  });

  const [isRefreshingRooms, setIsRefreshingRooms] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [selectedRuang, setSelectedRuang] = useState<string>('Semua');
  const [genderFilter, setGenderFilter] = useState<'Semua' | 'L' | 'P'>('Semua');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');

  const fetchDenahRooms = async (notify = false) => {
    setIsRefreshingRooms(true);
    try {
      const remote = await dbFetchCollection<DenahRoomRef>(DENAH_STORAGE_KEY);
      if (Array.isArray(remote) && remote.length > 0) {
        const sorted = [...remote].sort((a, b) =>
          (a.namaRuang || '').localeCompare(b.namaRuang || '', undefined, { numeric: true })
        );
        setDenahRooms(sorted);
        localStorage.setItem(DENAH_STORAGE_KEY, JSON.stringify(sorted));
        if (notify) {
          showToast(`Data ruang ujian disinkronkan (${sorted.length} ruang).`);
        }
      } else if (notify) {
        showToast('Belum ada data denah ruang tersimpan. Menampilkan data lokal.');
      }
    } catch (err) {
      console.error('Gagal memuat data ruang ujian:', err);
      if (notify) showToast('Gagal menyinkronkan data ruang ujian.');
    } finally {
      setIsRefreshingRooms(false);
    }
  };

  useEffect(() => {
    fetchDenahRooms(false);
  }, []);

  // Build lookup of where each student sits in Denah Ruang Ujian
  const seatPlacementLookup = useMemo(() => {
    const byId = new Map<string, { roomName: string; nomorKursi: number; nomorPeserta?: string }>();
    const byName = new Map<string, { roomName: string; nomorKursi: number; nomorPeserta?: string }>();

    denahRooms.forEach(room => {
      const roomName = (room.namaRuang || '').trim();
      if (!roomName || !Array.isArray(room.kursiList)) return;
      room.kursiList.forEach(seat => {
        const nama = (seat.namaSiswa || '').trim();
        if (!nama) return;
        const payload = {
          roomName,
          nomorKursi: seat.nomorKursi,
          nomorPeserta: seat.nomorPeserta
        };
        if (seat.siswaId) {
          byId.set(seat.siswaId, payload);
        }
        byName.set(nama.toLowerCase(), payload);
      });
    });

    return { byId, byName };
  }, [denahRooms]);

  // Lookup wali kelas per rombel
  const waliKelasMap = useMemo(() => {
    const map = new Map<string, string>();
    rombelList.forEach(r => {
      const key = (r.namaRombel || '').trim();
      if (key && r.waliKelasNama) {
        map.set(key, r.waliKelasNama.trim());
      }
    });
    return map;
  }, [rombelList]);

  // All active students enriched with room & CBT participant number
  const allParticipantRows = useMemo<DaftarPesertaKelasRow[]>(() => {
    return siswaList
      .filter(s => !s.status || s.status === 'Aktif')
      .map(s => {
        const nama = (s.nama || '').trim() || '-';
        const kelas = (s.kelas || s.rombel || '').trim() || 'Belum Ada Kelas';
        const placement =
          seatPlacementLookup.byId.get(s.id) ||
          seatPlacementLookup.byName.get(nama.toLowerCase());
        const isPlaced = Boolean(placement);
        const jenisKelamin: 'L' | 'P' = s.jenisKelamin === 'P' ? 'P' : 'L';
        const jenisKelaminLabel: 'Laki-laki' | 'Perempuan' =
          jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan';
        return {
          siswa: s,
          nama,
          kelas,
          jenisKelamin,
          jenisKelaminLabel,
          ruangUjian: placement ? placement.roomName : 'Belum Ditempatkan',
          nomorKursi: placement?.nomorKursi,
          noPesertaCbt: buildCbtNoPeserta(s, placement?.nomorPeserta),
          isPlaced
        };
      })
      .sort((a, b) => {
        const cmpKelas = compareKelasNames(a.kelas, b.kelas);
        if (cmpKelas !== 0) return cmpKelas;
        return a.nama.localeCompare(b.nama);
      });
  }, [siswaList, seatPlacementLookup]);

  const classOptions = useMemo(() => {
    const counts = new Map<string, number>();
    allParticipantRows.forEach(r => {
      counts.set(r.kelas, (counts.get(r.kelas) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => compareKelasNames(a[0], b[0]));
  }, [allParticipantRows]);

  const roomOptions = useMemo(() => {
    const set = new Set<string>();
    denahRooms.forEach(r => {
      if (r.namaRuang) set.add(r.namaRuang.trim());
    });
    allParticipantRows.forEach(r => {
      if (r.isPlaced) set.add(r.ruangUjian);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [denahRooms, allParticipantRows]);

  // Filtered rows
  const filteredRows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allParticipantRows.filter(r => {
      if (selectedKelas !== 'Semua' && r.kelas !== selectedKelas) return false;
      if (genderFilter !== 'Semua' && r.jenisKelamin !== genderFilter) return false;
      if (selectedRuang === 'BELUM_DITEMPATKAN') {
        if (r.isPlaced) return false;
      } else if (selectedRuang !== 'Semua' && r.ruangUjian !== selectedRuang) {
        return false;
      }
      if (q) {
        const hit =
          r.nama.toLowerCase().includes(q) ||
          r.kelas.toLowerCase().includes(q) ||
          r.ruangUjian.toLowerCase().includes(q) ||
          r.noPesertaCbt.toLowerCase().includes(q) ||
          (r.siswa.nis || '').toLowerCase().includes(q) ||
          (r.siswa.nisn || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [allParticipantRows, selectedKelas, genderFilter, selectedRuang, searchQuery]);

  // Grouped by class
  const groupedByClass = useMemo(() => {
    const map = new Map<string, DaftarPesertaKelasRow[]>();
    filteredRows.forEach(row => {
      const arr = map.get(row.kelas) || [];
      arr.push(row);
      map.set(row.kelas, arr);
    });
    return Array.from(map.entries())
      .sort((a, b) => compareKelasNames(a[0], b[0]))
      .map(([kelas, rows]) => {
        const lCount = rows.filter(r => r.jenisKelamin === 'L').length;
        const pCount = rows.filter(r => r.jenisKelamin === 'P').length;
        const placedCount = rows.filter(r => r.isPlaced).length;
        const roomsUsed = Array.from(
          new Set(rows.filter(r => r.isPlaced).map(r => r.ruangUjian))
        ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        return {
          kelas,
          waliKelas: waliKelasMap.get(kelas) || '',
          rows,
          lCount,
          pCount,
          placedCount,
          unplacedCount: rows.length - placedCount,
          roomsUsed
        };
      });
  }, [filteredRows, waliKelasMap]);

  // Metrics for summary strip
  const summaryStats = useMemo(() => {
    const total = filteredRows.length;
    const totalL = filteredRows.filter(r => r.jenisKelamin === 'L').length;
    const totalP = filteredRows.filter(r => r.jenisKelamin === 'P').length;
    const placed = filteredRows.filter(r => r.isPlaced).length;
    const unplaced = total - placed;
    return {
      total,
      totalL,
      totalP,
      totalKelas: groupedByClass.length,
      placed,
      unplaced
    };
  }, [filteredRows, groupedByClass.length]);

  const schoolName = (schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase();
  const examBanner = cbtSettings
    ? `${cbtSettings.namaUjian.toUpperCase()} SEMESTER ${cbtSettings.semester.toUpperCase()} TAHUN PELAJARAN ${cbtSettings.tahunAjaran}`
    : 'SUMATIF AKHIR SEMESTER (SAS) GANJIL TAHUN PELAJARAN 2026/2027';

  const activeFilterNote = useMemo(() => {
    const parts: string[] = [];
    if (selectedKelas !== 'Semua') parts.push(`Kelas ${selectedKelas}`);
    if (genderFilter !== 'Semua') {
      parts.push(genderFilter === 'L' ? 'Laki-laki' : 'Perempuan');
    }
    if (selectedRuang === 'BELUM_DITEMPATKAN') {
      parts.push('Belum Ditempatkan');
    } else if (selectedRuang !== 'Semua') {
      parts.push(selectedRuang);
    }
    if (searchQuery.trim()) parts.push(`Pencarian "${searchQuery.trim()}"`);
    return parts.length > 0 ? parts.join(' · ') : undefined;
  }, [selectedKelas, genderFilter, selectedRuang, searchQuery]);

  // --- PDF EXPORT (All filtered classes or 1 specific class) ---
  const handleDownloadPdf = async (targetGroups = groupedByClass, customSlug?: string) => {
    if (isExportingPdf || targetGroups.length === 0) return;
    setIsExportingPdf(true);
    try {
      const pdfGroups: PesertaKelasPdfGroup[] = targetGroups.map(g => ({
        kelas: g.kelas,
        waliKelas: g.waliKelas,
        rows: g.rows.map(r => ({
          nama: r.nama,
          jenisKelamin: r.jenisKelamin,
          ruangUjian: r.ruangUjian,
          nomorKursi: r.nomorKursi,
          noPesertaCbt: r.noPesertaCbt
        }))
      }));

      const slug =
        customSlug ||
        (selectedKelas !== 'Semua'
          ? selectedKelas.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          : 'semua-kelas');
      const fileName = `daftar-peserta-ujian-${slug}.pdf`;

      await downloadDaftarPesertaKelasPdf({
        groups: pdfGroups,
        schoolName,
        examTitle: examBanner,
        kota: cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok',
        kepsekNama:
          cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah',
        kepsekNip: (cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '').trim(),
        logoUrl: schoolSettings?.logoUrl,
        ttdKepalaSekolahUrl: cbtSettings?.ttdKepalaSekolahUrl,
        filterNote: activeFilterNote,
        fileName
      });

      const totalCount = targetGroups.reduce((sum, g) => sum + g.rows.length, 0);
      showToast(`Berhasil mengunduh ${fileName} (${totalCount} peserta · ${targetGroups.length} kelas).`);
    } catch (err) {
      console.error('Gagal membuat PDF daftar peserta per kelas:', err);
      showToast('Gagal membuat file PDF daftar peserta ujian.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // --- EXCEL EXPORT (.xlsx with summary sheet + per-class worksheets) ---
  const handleDownloadExcel = async (targetGroups = groupedByClass, customSlug?: string) => {
    if (isExportingExcel || targetGroups.length === 0) return;
    setIsExportingExcel(true);
    try {
      const wb = new ExcelJS.Workbook();
      wb.creator = schoolName;
      wb.created = new Date();

      const populateWorksheet = (
        ws: ExcelJS.Worksheet,
        title: string,
        subtitle: string,
        rows: Array<{
          no: number;
          nama: string;
          kelas: string;
          jk: string;
          ruang: string;
          kursi: string;
          noPesertaCbt: string;
        }>,
        includeKelasColumn: boolean
      ) => {
        const cols = includeKelasColumn
          ? [
              { key: 'no', header: 'No', width: 6 },
              { key: 'nama', header: 'Nama Lengkap Peserta', width: 34 },
              { key: 'kelas', header: 'Kelas', width: 22 },
              { key: 'jk', header: 'Jenis Kelamin', width: 15 },
              { key: 'ruang', header: 'Ruang Ujian', width: 18 },
              { key: 'kursi', header: 'No. Kursi', width: 12 },
              { key: 'noPesertaCbt', header: 'No. Peserta CBT', width: 20 }
            ]
          : [
              { key: 'no', header: 'No', width: 6 },
              { key: 'nama', header: 'Nama Lengkap Peserta', width: 36 },
              { key: 'jk', header: 'Jenis Kelamin', width: 16 },
              { key: 'ruang', header: 'Ruang Ujian', width: 20 },
              { key: 'kursi', header: 'No. Kursi', width: 12 },
              { key: 'noPesertaCbt', header: 'No. Peserta CBT', width: 20 }
            ];

        ws.columns = cols.map(c => ({ key: c.key, width: c.width }));
        const lastCol = ws.getColumn(cols.length).letter;

        ws.mergeCells(`A1:${lastCol}1`);
        const tCell = ws.getCell('A1');
        tCell.value = title;
        tCell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
        tCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF082F63' } };
        tCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        ws.getRow(1).height = 26;

        ws.mergeCells(`A2:${lastCol}2`);
        const sCell = ws.getCell('A2');
        sCell.value = subtitle;
        sCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF1E293B' } };
        sCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
        sCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
        ws.getRow(2).height = 20;

        ws.getRow(3).height = 8;

        const headerRow = ws.getRow(4);
        headerRow.values = cols.map(c => c.header);
        headerRow.height = 22;
        headerRow.eachCell(cell => {
          cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F3F7A' } };
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
          cell.border = {
            top: { style: 'thin', color: { argb: 'FF94A3B8' } },
            left: { style: 'thin', color: { argb: 'FF94A3B8' } },
            bottom: { style: 'thin', color: { argb: 'FF94A3B8' } },
            right: { style: 'thin', color: { argb: 'FF94A3B8' } }
          };
        });

        rows.forEach((r, idx) => {
          const excelRow = ws.addRow(r);
          excelRow.height = 19;
          const isEven = idx % 2 === 1;
          cols.forEach((col, cIdx) => {
            const cell = excelRow.getCell(cIdx + 1);
            cell.font = {
              name: 'Calibri',
              size: 10,
              bold: col.key === 'nama' || col.key === 'noPesertaCbt',
              color: {
                argb:
                  col.key === 'ruang' && r.ruang === 'Belum Ditempatkan'
                    ? 'FFB45309'
                    : 'FF0F172A'
              }
            };
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' }
            };
            cell.alignment = {
              horizontal:
                col.key === 'nama' || col.key === 'kelas' ? 'left' : 'center',
              vertical: 'middle'
            };
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
              right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
            };
          });
        });

        ws.views = [{ state: 'frozen', ySplit: 4 }];
      };

      const usedSheetNames = new Set<string>();

      // Combined sheet if exporting multiple classes
      if (targetGroups.length > 1) {
        const combinedSheet = wb.addWorksheet(
          sanitizeSheetName('Rekap Semua Kelas', usedSheetNames)
        );
        const flatExcelRows: Array<{
          no: number;
          nama: string;
          kelas: string;
          jk: string;
          ruang: string;
          kursi: string;
          noPesertaCbt: string;
        }> = [];
        let runningNo = 1;
        targetGroups.forEach(g => {
          g.rows.forEach(r => {
            flatExcelRows.push({
              no: runningNo++,
              nama: r.nama,
              kelas: r.kelas,
              jk: r.jenisKelaminLabel,
              ruang: r.ruangUjian,
              kursi: r.nomorKursi ? `#${String(r.nomorKursi).padStart(2, '0')}` : '-',
              noPesertaCbt: r.noPesertaCbt
            });
          });
        });
        populateWorksheet(
          combinedSheet,
          `DAFTAR PESERTA UJIAN PER KELAS — ${schoolName}`,
          `${examBanner}  |  Total: ${flatExcelRows.length} Peserta (${targetGroups.length} Kelas)`,
          flatExcelRows,
          true
        );
      }

      // Per-class sheets
      targetGroups.forEach(g => {
        const ws = wb.addWorksheet(sanitizeSheetName(g.kelas, usedSheetNames));
        const classRows = g.rows.map((r, idx) => ({
          no: idx + 1,
          nama: r.nama,
          kelas: r.kelas,
          jk: r.jenisKelaminLabel,
          ruang: r.ruangUjian,
          kursi: r.nomorKursi ? `#${String(r.nomorKursi).padStart(2, '0')}` : '-',
          noPesertaCbt: r.noPesertaCbt
        }));
        populateWorksheet(
          ws,
          `DAFTAR PESERTA UJIAN KELAS ${g.kelas.toUpperCase()} — ${schoolName}`,
          `${examBanner}  |  Wali Kelas: ${g.waliKelas || '-'}  |  Peserta: ${g.rows.length} (L: ${g.lCount}, P: ${g.pCount})`,
          classRows,
          false
        );
      });

      const buffer = await wb.xlsx.writeBuffer();
      const slug =
        customSlug ||
        (selectedKelas !== 'Semua'
          ? selectedKelas.toLowerCase().replace(/[^a-z0-9]+/g, '-')
          : 'semua-kelas');
      const fileName = `daftar-peserta-ujian-${slug}.xlsx`;
      saveAs(
        new Blob([buffer], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }),
        fileName
      );
      const totalCount = targetGroups.reduce((sum, g) => sum + g.rows.length, 0);
      showToast(`Berhasil mengunduh ${fileName} (${totalCount} peserta · ${targetGroups.length} sheet kelas).`);
    } catch (err) {
      console.error('Gagal membuat file Excel daftar peserta per kelas:', err);
      showToast('Gagal membuat file Excel daftar peserta ujian.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // --- CSV EXPORT ---
  const handleDownloadCsv = () => {
    if (filteredRows.length === 0) return;
    const headers = [
      'No',
      'Kelas',
      'Nama Lengkap Peserta',
      'Jenis Kelamin',
      'Ruang Ujian',
      'No Kursi',
      'No Peserta CBT'
    ];
    const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.map(esc).join(','),
      ...filteredRows.map((r, i) =>
        [
          i + 1,
          r.kelas,
          r.nama,
          r.jenisKelaminLabel,
          r.ruangUjian,
          r.nomorKursi ? `#${String(r.nomorKursi).padStart(2, '0')}` : '-',
          r.noPesertaCbt
        ]
          .map(esc)
          .join(',')
      )
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {
      type: 'text/csv;charset=utf-8;'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const slug =
      selectedKelas !== 'Semua'
        ? selectedKelas.toLowerCase().replace(/[^a-z0-9]+/g, '-')
        : 'semua-kelas';
    const fileName = `daftar-peserta-ujian-${slug}.csv`;
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`Berhasil mengunduh ${fileName} (${filteredRows.length} peserta).`);
  };

  // --- PRINT VIA HIDDEN IFRAME ---
  const handlePrint = (targetGroups = groupedByClass) => {
    if (targetGroups.length === 0) return;
    const kota = cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok';
    const kepsekNama =
      cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah';
    const kepsekNip = (cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '').trim();
    const todayStr = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    const logoTag = schoolSettings?.logoUrl
      ? `<img src="${escapeHtml(schoolSettings.logoUrl)}" alt="Logo" class="kop-logo" referrerpolicy="no-referrer" />`
      : '';
    const sigTag = cbtSettings?.ttdKepalaSekolahUrl
      ? `<img src="${escapeHtml(cbtSettings.ttdKepalaSekolahUrl)}" alt="TTD" class="sig-img" referrerpolicy="no-referrer" />`
      : '';

    const sheetsHtml = targetGroups
      .map(g => {
        const rowsHtml = g.rows
          .map(
            (r, idx) => `
              <tr>
                <td class="c">${idx + 1}</td>
                <td class="bold">${escapeHtml(r.nama)}</td>
                <td class="c">${escapeHtml(r.jenisKelaminLabel)}</td>
                <td class="c ${r.isPlaced ? 'room-ok' : 'room-missing'}">${escapeHtml(
                  r.isPlaced && r.nomorKursi
                    ? `${r.ruangUjian} (#${String(r.nomorKursi).padStart(2, '0')})`
                    : r.ruangUjian
                )}</td>
                <td class="c mono">${escapeHtml(r.noPesertaCbt)}</td>
              </tr>`
          )
          .join('');

        return `
          <section class="sheet">
            <header class="kop">
              ${logoTag}
              <div class="kop-text">
                <div class="kop-title">DAFTAR PESERTA UJIAN PER KELAS</div>
                <div class="kop-exam">${escapeHtml(examBanner)}</div>
                <div class="kop-school">${escapeHtml(schoolName)}</div>
              </div>
              <div class="kelas-badge">
                <div class="kelas-lbl">KELAS / ROMBEL</div>
                <div class="kelas-val">${escapeHtml(g.kelas)}</div>
                <div class="kelas-sub">${g.rows.length} Peserta</div>
              </div>
            </header>

            <div class="meta-bar">
              <div><strong>Wali Kelas:</strong> ${escapeHtml(g.waliKelas || '-')}</div>
              <div><strong>L:</strong> ${g.lCount} &nbsp;|&nbsp; <strong>P:</strong> ${g.pCount} &nbsp;|&nbsp; <strong>Ruang:</strong> ${escapeHtml(g.roomsUsed.join(', ') || 'Belum ditempatkan')}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th style="width:7%">No</th>
                  <th style="width:41%">Nama Peserta Ujian</th>
                  <th style="width:17%">Jenis Kelamin</th>
                  <th style="width:19%">Ruang Ujian</th>
                  <th style="width:16%">No. Peserta CBT</th>
                </tr>
              </thead>
              <tbody>${rowsHtml}</tbody>
            </table>

            <div class="sig-row">
              <div class="sig-box">
                <div>Mengetahui,</div>
                <div class="sig-role">Kepala Sekolah</div>
                <div class="sig-space">${sigTag}</div>
                <div class="sig-name">${escapeHtml(kepsekNama)}</div>
                ${kepsekNip && kepsekNip !== '-' ? `<div class="sig-nip">NIP. ${escapeHtml(kepsekNip)}</div>` : ''}
              </div>
              <div class="sig-box">
                <div>${escapeHtml(kota)}, ${escapeHtml(todayStr)}</div>
                <div class="sig-role">Wali Kelas ${escapeHtml(g.kelas)}</div>
                <div class="sig-space"></div>
                <div class="sig-name">${escapeHtml(g.waliKelas || '........................................')}</div>
              </div>
            </div>
          </section>`;
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Daftar Peserta Ujian Per Kelas — ${escapeHtml(schoolName)}</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #fff; font-size: 8.6pt; }
    .sheet { page-break-after: always; }
    .sheet:last-child { page-break-after: auto; }
    .kop { display: flex; align-items: center; gap: 12px; border-bottom: 2.5px solid #082f63; padding-bottom: 7px; margin-bottom: 7px; }
    .kop-logo { width: 46px; height: 46px; object-fit: contain; flex-shrink: 0; }
    .kop-text { flex: 1; text-align: center; }
    .kop-title { font-size: 11pt; font-weight: 900; color: #082f63; }
    .kop-exam { font-size: 8.4pt; font-weight: 800; color: #1e293b; margin-top: 2px; }
    .kop-school { font-size: 9.4pt; font-weight: 900; color: #0f172a; margin-top: 1px; }
    .kelas-badge { border: 2px solid #082f63; border-radius: 6px; padding: 4px 10px; text-align: center; background: #f0f9ff; flex-shrink: 0; min-width: 110px; }
    .kelas-lbl { font-size: 6pt; font-weight: 800; color: #475569; }
    .kelas-val { font-size: 9.2pt; font-weight: 900; color: #082f63; }
    .kelas-sub { font-size: 7pt; font-weight: 700; color: #334155; }
    .meta-bar { display: flex; justify-content: space-between; font-size: 8pt; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 9px; margin-bottom: 7px; }
    table { width: 100%; border-collapse: collapse; font-size: 8.1pt; }
    th, td { border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; }
    thead th { background: #082f63; color: #fff; font-weight: 800; text-transform: uppercase; font-size: 7.2pt; text-align: center; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    .c { text-align: center; }
    .bold { font-weight: 700; }
    .mono { font-variant-numeric: tabular-nums; font-weight: 700; }
    .room-ok { font-weight: 700; color: #082f63; }
    .room-missing { font-style: italic; color: #b45309; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 14px; padding: 0 20px; font-size: 8.2pt; }
    .sig-box { width: 42%; text-align: center; }
    .sig-role { font-weight: 700; margin-top: 2px; }
    .sig-space { height: 42px; display: flex; align-items: center; justify-content: center; }
    .sig-img { max-height: 40px; max-width: 120px; object-fit: contain; }
    .sig-name { font-weight: 800; text-decoration: underline; }
    .sig-nip { font-size: 7.4pt; color: #475569; margin-top: 2px; }
  </style>
</head>
<body>${sheetsHtml}</body>
</html>`;

    printHtmlViaHiddenIframe(html);
  };

  return (
    <div className="space-y-5">
      {/* Main Control & Summary Card */}
      <div className="bg-[#121212] rounded-2xl p-5 border border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400 shrink-0" />
              <span>Daftar Peserta Ujian Sesuai Kelas</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 tabular-nums">
              {allParticipantRows.length} peserta aktif · {classOptions.length} kelas ·{' '}
              {allParticipantRows.filter(r => r.isPlaced).length} sudah ditempatkan di ruang ujian
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => fetchDenahRooms(true)}
              disabled={isRefreshingRooms}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              title="Ambil data penempatan ruang terbaru dari Denah Ruang Ujian"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isRefreshingRooms ? 'animate-spin' : ''}`} />
              <span>Segarkan Ruang</span>
            </button>

            <button
              type="button"
              disabled={isExportingExcel || filteredRows.length === 0}
              onClick={() => handleDownloadExcel(groupedByClass)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isExportingExcel ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-3.5 h-3.5" />
              )}
              <span>Unduh Excel</span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf || filteredRows.length === 0}
              onClick={() => handleDownloadPdf(groupedByClass)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FileDown className="w-3.5 h-3.5" />
              )}
              <span>Unduh PDF</span>
            </button>

            <button
              type="button"
              disabled={filteredRows.length === 0}
              onClick={handleDownloadCsv}
              className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5 text-sky-400" />
              <span>CSV</span>
            </button>

            <button
              type="button"
              disabled={filteredRows.length === 0}
              onClick={() => handlePrint(groupedByClass)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white flex items-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* 4-Column Summary Strip (flat hairline dividers, tabular-nums) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 divide-y lg:divide-y-0 lg:divide-x divide-slate-800 bg-slate-950/60 border border-slate-800 rounded-xl">
          <div className="px-4 py-3">
            <div className="text-xs text-slate-400">Total Peserta Ditampilkan</div>
            <div className="text-xl font-bold text-white tabular-nums mt-0.5">
              {summaryStats.total} <span className="text-xs font-normal text-slate-400">Siswa</span>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-slate-400">Komposisi Gender</div>
            <div className="text-xl font-bold text-white tabular-nums mt-0.5">
              {summaryStats.totalL} L <span className="text-slate-500 font-normal">/</span> {summaryStats.totalP} P
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-slate-400">Jumlah Kelas / Rombel</div>
            <div className="text-xl font-bold text-sky-300 tabular-nums mt-0.5">
              {summaryStats.totalKelas} <span className="text-xs font-normal text-slate-400">Kelas</span>
            </div>
          </div>
          <div className="px-4 py-3">
            <div className="text-xs text-slate-400">Penempatan Ruang Ujian</div>
            <div className="text-sm font-bold tabular-nums mt-1.5 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-emerald-400">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                {summaryStats.placed} Terjadwal
              </span>
              {summaryStats.unplaced > 0 && (
                <span className="inline-flex items-center gap-1 text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {summaryStats.unplaced} Belum
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Warning Strip if any students lack room placement */}
        {summaryStats.unplaced > 0 && selectedRuang !== 'BELUM_DITEMPATKAN' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-3.5 py-2.5 rounded-xl bg-amber-950/30 border border-amber-500/35 text-xs text-amber-100">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Terdapat <strong className="text-amber-300 tabular-nums">{summaryStats.unplaced} peserta</strong> yang belum memiliki ruang ujian pada Denah Ruang.
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedRuang('BELUM_DITEMPATKAN')}
                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 font-semibold cursor-pointer whitespace-nowrap"
              >
                Tampilkan Belum Ditempatkan
              </button>
              {onNavigateToDenah && currentRole !== 'siswa' && (
                <button
                  type="button"
                  onClick={onNavigateToDenah}
                  className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>Atur di Denah Ruang</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Interactive Search & Filter Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-2.5">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama peserta, kelas, ruang ujian, atau no. peserta CBT (C2026-...)..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Hapus pencarian"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedKelas}
              onChange={e => setSelectedKelas(e.target.value)}
              aria-label="Filter Kelas"
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="Semua">Semua Kelas ({classOptions.length})</option>
              {classOptions.map(([cls, count]) => (
                <option key={cls} value={cls}>
                  {cls} ({count})
                </option>
              ))}
            </select>

            <select
              value={selectedRuang}
              onChange={e => setSelectedRuang(e.target.value)}
              aria-label="Filter Ruang Ujian"
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-sky-400 cursor-pointer"
            >
              <option value="Semua">Semua Ruang Ujian</option>
              {roomOptions.map(rm => (
                <option key={rm} value={rm}>
                  {rm}
                </option>
              ))}
              <option value="BELUM_DITEMPATKAN">Belum Ditempatkan</option>
            </select>

            {/* Segmented Gender Filter */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 shrink-0">
              {(
                [
                  { id: 'Semua', label: 'Semua' },
                  { id: 'L', label: 'Laki-laki' },
                  { id: 'P', label: 'Perempuan' }
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setGenderFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    genderFilter === opt.id
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Grouping Mode Toggle */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'grouped'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Per Kelas
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  viewMode === 'flat'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Gabungan
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Class Quick-Filter Buttons */}
        {classOptions.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <button
              type="button"
              onClick={() => setSelectedKelas('Semua')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
                selectedKelas === 'Semua'
                  ? 'bg-sky-600 text-white border-sky-500'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
              }`}
            >
              Semua Kelas ({allParticipantRows.length})
            </button>
            {classOptions.map(([cls, count]) => (
              <button
                key={cls}
                type="button"
                onClick={() => setSelectedKelas(prev => (prev === cls ? 'Semua' : cls))}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                  selectedKelas === cls
                    ? 'bg-sky-600 text-white border-sky-500'
                    : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-600 hover:text-white'
                }`}
              >
                {cls} ({count})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Empty State */}
      {filteredRows.length === 0 ? (
        <div className="bg-[#121212] rounded-2xl p-10 border border-slate-800 text-center space-y-3">
          <Users className="w-8 h-8 text-slate-500 mx-auto" />
          <div className="text-sm font-bold text-white">
            Tidak ada peserta ujian yang cocok dengan filter saat ini
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Pastikan data siswa aktif sudah tersedia di Database Siswa atau ubah filter kelas, ruang ujian, atau kata kunci pencarian.
          </p>
          {(selectedKelas !== 'Semua' ||
            selectedRuang !== 'Semua' ||
            genderFilter !== 'Semua' ||
            searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedKelas('Semua');
                setSelectedRuang('Semua');
                setGenderFilter('Semua');
                setSearchQuery('');
              }}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold cursor-pointer"
            >
              Reset Semua Filter
            </button>
          )}
        </div>
      ) : viewMode === 'grouped' ? (
        /* GROUPED BY CLASS VIEW */
        <div className="space-y-4">
          {groupedByClass.map(group => (
            <section
              key={group.kelas}
              className="bg-[#121212] rounded-2xl border border-slate-800 shadow-sm overflow-hidden"
            >
              {/* Class Header */}
              <div className="px-5 py-3.5 bg-slate-900/80 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2.5">
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Kelas {group.kelas}
                  </h4>
                  <div className="text-xs text-slate-400 mt-0.5 tabular-nums flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{group.rows.length} Peserta</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {group.lCount} Laki-laki / {group.pCount} Perempuan
                    </span>
                    {group.waliKelas && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>Wali Kelas: {group.waliKelas}</span>
                      </>
                    )}
                    <span aria-hidden="true">·</span>
                    <span>
                      Ruang:{' '}
                      <strong className="text-sky-300 font-semibold">
                        {group.roomsUsed.length > 0
                          ? group.roomsUsed.join(', ')
                          : 'Belum ditempatkan'}
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={isExportingExcel}
                    onClick={() =>
                      handleDownloadExcel(
                        [group],
                        group.kelas.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-950/70 hover:bg-emerald-900/80 text-emerald-200 border border-emerald-700/50 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title={`Unduh Excel khusus Kelas ${group.kelas}`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Excel</span>
                  </button>
                  <button
                    type="button"
                    disabled={isExportingPdf}
                    onClick={() =>
                      handleDownloadPdf(
                        [group],
                        group.kelas.toLowerCase().replace(/[^a-z0-9]+/g, '-')
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-950/70 hover:bg-rose-900/80 text-rose-200 border border-rose-700/50 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title={`Unduh PDF khusus Kelas ${group.kelas}`}
                  >
                    <FileDown className="w-3.5 h-3.5 text-rose-400" />
                    <span>PDF</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePrint([group])}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                    title={`Cetak khusus Kelas ${group.kelas}`}
                  >
                    <Printer className="w-3.5 h-3.5 text-sky-400" />
                    <span>Cetak</span>
                  </button>
                </div>
              </div>

              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/70 text-slate-300 uppercase text-[11px] font-bold border-b border-slate-800">
                      <th className="px-4 py-2.5 w-14 text-center">No</th>
                      <th className="px-4 py-2.5">Nama Peserta</th>
                      <th className="px-4 py-2.5 w-36">Jenis Kelamin</th>
                      <th className="px-4 py-2.5 w-44">Ruang Ujian</th>
                      <th className="px-4 py-2.5 w-40 text-right">No. Peserta CBT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {group.rows.map((row, idx) => (
                      <tr
                        key={row.siswa.id}
                        className="hover:bg-slate-900/60 transition-colors"
                      >
                        <td className="px-4 py-2.5 text-center text-slate-400 tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-white">
                          {row.nama}
                        </td>
                        <td className="px-4 py-2.5 text-slate-300">
                          {row.jenisKelaminLabel}
                        </td>
                        <td className="px-4 py-2.5">
                          {row.isPlaced ? (
                            <span className="font-semibold text-sky-300 tabular-nums">
                              {row.ruangUjian}
                              {row.nomorKursi
                                ? ` · Kursi #${String(row.nomorKursi).padStart(2, '0')}`
                                : ''}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                              <span>Belum Ditempatkan</span>
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-300 tabular-nums">
                          {row.noPesertaCbt}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* FLAT COMBINED TABLE VIEW */
        <section className="bg-[#121212] rounded-2xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/90 text-slate-300 uppercase text-[11px] font-bold border-b border-slate-800">
                  <th className="px-4 py-3 w-14 text-center">No</th>
                  <th className="px-4 py-3">Nama Peserta</th>
                  <th className="px-4 py-3 w-44">Kelas</th>
                  <th className="px-4 py-3 w-36">Jenis Kelamin</th>
                  <th className="px-4 py-3 w-44">Ruang Ujian</th>
                  <th className="px-4 py-3 w-40 text-right">No. Peserta CBT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredRows.map((row, idx) => (
                  <tr
                    key={row.siswa.id}
                    className="hover:bg-slate-900/60 transition-colors"
                  >
                    <td className="px-4 py-2.5 text-center text-slate-400 tabular-nums">
                      {idx + 1}
                    </td>
                    <td className="px-4 py-2.5 font-semibold text-white">
                      {row.nama}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 font-medium">
                      {row.kelas}
                    </td>
                    <td className="px-4 py-2.5 text-slate-300">
                      {row.jenisKelaminLabel}
                    </td>
                    <td className="px-4 py-2.5">
                      {row.isPlaced ? (
                        <span className="font-semibold text-sky-300 tabular-nums">
                          {row.ruangUjian}
                          {row.nomorKursi
                            ? ` · Kursi #${String(row.nomorKursi).padStart(2, '0')}`
                            : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-300 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Belum Ditempatkan</span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-indigo-300 tabular-nums">
                      {row.noPesertaCbt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
};
