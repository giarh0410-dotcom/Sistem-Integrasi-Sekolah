import React, { useState, useMemo, useRef } from 'react';
import { 
  BookOpen, 
  Printer, 
  Search, 
  Filter, 
  CheckCircle2, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Sparkles, 
  FileSpreadsheet, 
  Download, 
  Check, 
  Calendar, 
  UserCheck, 
  Layers, 
  Info,
  ChevronDown,
  ShieldCheck,
  Star
} from 'lucide-react';
import { 
  Siswa, 
  Guru, 
  SchoolSettings, 
  Role,
  RaporTahfidzSiswa, 
  HafalanSuratItem, 
  getArabicPredikat, 
  getPredikatKeterangan 
} from '../types/school';

// Official Logo SMP Islam Modern Al Fakhir (Vector Octagram with Crescent & Calligraphy)
const AlFakhirLogo = ({ className = "w-36 h-auto" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(100,100)">
      {/* Outer 8-Point Star Border (Khatam) */}
      <polygon 
        points="0,-88 25,-62 62,-62 62,-25 88,0 62,25 62,62 25,62 0,88 -25,62 -62,62 -62,25 -88,0 -62,-25 -62,-62 -25,-62" 
        fill="#ffffff" 
        stroke="#0d9488" 
        strokeWidth="6"
      />
      <polygon 
        points="0,-82 23,-58 58,-58 58,-23 82,0 58,23 58,58 23,58 0,82 -23,58 -58,58 -58,23 -82,0 -58,-23 -58,-58 -23,-58" 
        fill="#ffffff" 
        stroke="#115e59" 
        strokeWidth="2"
      />
      {/* Dark Teal Inner Disc */}
      <circle cx="0" cy="0" r="54" fill="#0f766e" stroke="#fbbf24" strokeWidth="2.5" />
      
      {/* Stars on Top Arc */}
      <circle cx="-20" cy="-32" r="2" fill="#fbbf24" />
      <circle cx="-10" cy="-37" r="2.5" fill="#fbbf24" />
      <circle cx="0" cy="-39" r="3" fill="#fbbf24" />
      <circle cx="10" cy="-37" r="2.5" fill="#fbbf24" />
      <circle cx="20" cy="-32" r="2" fill="#fbbf24" />

      {/* Gold Crescent & Open Book / Rays */}
      <path d="M-28 10 Q0 -22 28 10 L18 18 Q0 -6 -18 18 Z" fill="#fbbf24"/>
      <circle cx="0" cy="-6" r="4.5" fill="#fbbf24"/>
      <path d="M-32 20 Q0 32 32 20 L32 26 Q0 38 -32 26 Z" fill="#ffffff"/>
      
      {/* School Name Typography */}
      <text x="0" y="38" fontSize="8" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#ffffff" textAnchor="middle" letterSpacing="0.5">
        SMP ISLAM MODERN
      </text>
      <text x="0" y="50" fontSize="12" fontFamily="Arial, sans-serif" fontWeight="900" fill="#fbbf24" textAnchor="middle" letterSpacing="1">
        AL FAKHİR
      </text>
    </g>
  </svg>
);

const DEFAULT_SURAT_JUZ_29 = [
  { no: 1, nama: 'AL MULK', juz: 'JUZ 29' },
  { no: 2, nama: 'AL QALAM', juz: 'JUZ 29' },
  { no: 3, nama: 'AL HAQQAH', juz: 'JUZ 29' },
  { no: 4, nama: "AL MA'ARIJ", juz: 'JUZ 29' },
  { no: 5, nama: 'NUH', juz: 'JUZ 29' },
  { no: 6, nama: 'AL JINN', juz: 'JUZ 29' },
  { no: 7, nama: "AL WAQ'IAH", juz: 'JUZ 29' },
  { no: 8, nama: 'YASIN', juz: 'JUZ 29' }
];

interface RaporTahfidzViewProps {
  raporTahfidzList: RaporTahfidzSiswa[];
  setRaporTahfidzList: React.Dispatch<React.SetStateAction<RaporTahfidzSiswa[]>>;
  siswaList: Siswa[];
  guruList?: Guru[];
  schoolSettings?: SchoolSettings;
  currentRole?: Role;
  userEmail?: string;
  theme?: 'dark' | 'light';
}

export const RaporTahfidzView: React.FC<RaporTahfidzViewProps> = ({
  raporTahfidzList,
  setRaporTahfidzList,
  siswaList,
  guruList = [],
  schoolSettings,
  currentRole = 'admin',
  userEmail = '',
  theme = 'light'
}) => {
  // Filters & Search
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [selectedStatus, setSelectedStatus] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Active print and modal states
  const [activePrintTahfidz, setActivePrintTahfidz] = useState<RaporTahfidzSiswa | null>(null);
  const [modalBookletTab, setModalBookletTab] = useState<'semua' | 'cover' | 'nilai'>('semua');
  const [editingTahfidz, setEditingTahfidz] = useState<RaporTahfidzSiswa | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState<boolean>(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const printSheetRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Student list classes
  const availableKelasList = useMemo(() => {
    const list = Array.from(new Set(siswaList.map(s => s.kelas).filter(Boolean)));
    return list.sort();
  }, [siswaList]);

  // Current logged in student
  const activeSiswaLogin = useMemo(() => {
    if (currentRole !== 'siswa') return null;
    return siswaList.find(s => 
      (s.email && s.email.toLowerCase() === userEmail.toLowerCase()) ||
      (s.username && s.username.toLowerCase() === userEmail.toLowerCase()) ||
      s.nama.toLowerCase().includes(userEmail.split('@')[0].toLowerCase())
    ) || siswaList[0];
  }, [currentRole, userEmail, siswaList]);

  // Helper to generate default Tahfidz report
  const generateDefaultTahfidzForSiswa = (s: Siswa): RaporTahfidzSiswa => {
    const pembimbing = guruList.find(g => g.nama.includes('Mutiara') || g.mataPelajaran?.toLowerCase().includes('agama')) || {
      nama: 'Mutiara Indah Pratiwi, S.Pd',
      nip: '199503122020122001'
    };

    const capaian = DEFAULT_SURAT_JUZ_29.map((item, idx) => {
      const hasScore = idx === 0 || idx === 1 || idx === 6;
      const nilai = hasScore ? (82 + (idx * 3) % 8) : null;
      return {
        id: `haf-${idx + 1}`,
        nomor: item.no,
        namaSurat: item.nama,
        juz: item.juz,
        nilai: nilai,
        predikat: getArabicPredikat(nilai)
      };
    });

    const aspek: any = {
      adabHalaqah: 86,
      adabPredikat: 'جيد جدا',
      tajwid: 80,
      tajwidPredikat: 'جيد جدا',
      makharijulHuruf: 81,
      makharijPredikat: 'جيد جدا',
      nilaiUjianAlQuran: 82,
      ujianPredikat: 'جيد جدا'
    };

    return {
      id: `tahfidz-${s.id}-${Date.now().toString().slice(-4)}`,
      siswaId: s.id,
      siswaNama: s.nama,
      nisn: s.nisn || '3117517009',
      nis: s.nis || '24250034',
      namaSekolah: schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR',
      kelas: s.kelas || 'VIII (delapan)',
      semester: '1',
      tahunAjaran: schoolSettings?.tahunAjaran || '2025/2026',
      halaqah: 'Tahfidz',
      pembimbingNama: pembimbing.nama,
      pembimbingNip: pembimbing.nip || '-',
      kepalaSekolahNama: schoolSettings?.kepalaSekolah || 'Nurhidayati, S. Pd',
      kepalaSekolahNip: schoolSettings?.nipKepalaSekolah || '-',
      tempatPenerbitan: 'Depok',
      tanggalPenerbitan: '22 Desember 2025',
      capaianHafalan: capaian,
      aspekPenilaian: aspek,
      catatan: `Alhamdulillah ${s.nama} semakin baik bacaan Al-Qur'an nya dan telah menyelesaikan hafalan wajib Q.S. Al-Waqi'ah. Semoga Ananda selalu istiqomah dalam membaca dan menghafal Al-Qur'an di rumah. Aamiin.`,
      status: 'Diterbitkan',
      updatedAt: new Date().toISOString()
    };
  };

  // Filtered Tahfidz List
  const filteredTahfidzList = useMemo(() => {
    if (currentRole === 'siswa' && activeSiswaLogin) {
      const found = raporTahfidzList.find(r => r.siswaId === activeSiswaLogin.id || r.siswaNama.toLowerCase() === activeSiswaLogin.nama.toLowerCase());
      if (found) return [found];
      return [generateDefaultTahfidzForSiswa(activeSiswaLogin)];
    }

    return raporTahfidzList.filter(item => {
      const matchKelas = selectedKelas === 'Semua' || item.kelas === selectedKelas;
      const matchStatus = selectedStatus === 'Semua' || item.status === selectedStatus;
      const matchQuery = !searchQuery || 
        item.siswaNama.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.nisn.includes(searchQuery) ||
        item.nis.includes(searchQuery);
      return matchKelas && matchStatus && matchQuery;
    });
  }, [raporTahfidzList, selectedKelas, selectedStatus, searchQuery, currentRole, activeSiswaLogin]);

  // Statistics
  const stats = useMemo(() => {
    const total = raporTahfidzList.length;
    const diterbitkan = raporTahfidzList.filter(r => r.status === 'Diterbitkan').length;
    const avgScore = total > 0 
      ? Math.round(raporTahfidzList.reduce((acc, curr) => acc + (curr.aspekPenilaian.nilaiUjianAlQuran || 80), 0) / total) 
      : 82;
    const mumtazCount = raporTahfidzList.filter(r => r.aspekPenilaian.ujianPredikat === 'ممتاز' || r.aspekPenilaian.nilaiUjianAlQuran >= 90).length;
    return { total, diterbitkan, avgScore, mumtazCount };
  }, [raporTahfidzList]);

  // Save or Update Editing Report
  const handleSaveTahfidz = () => {
    if (!editingTahfidz) return;

    // Recalculate average ujian if needed and ensure predicates
    const updatedCapaian = editingTahfidz.capaianHafalan.map(item => ({
      ...item,
      predikat: getArabicPredikat(item.nilai)
    }));

    const adabPred = getArabicPredikat(editingTahfidz.aspekPenilaian.adabHalaqah);
    const tajwidPred = getArabicPredikat(editingTahfidz.aspekPenilaian.tajwid);
    const makharijPred = getArabicPredikat(editingTahfidz.aspekPenilaian.makharijulHuruf);
    const ujianPred = getArabicPredikat(editingTahfidz.aspekPenilaian.nilaiUjianAlQuran);

    const payload: RaporTahfidzSiswa = {
      ...editingTahfidz,
      capaianHafalan: updatedCapaian,
      aspekPenilaian: {
        ...editingTahfidz.aspekPenilaian,
        adabPredikat: adabPred,
        tajwidPredikat: tajwidPred,
        makharijPredikat: makharijPred,
        ujianPredikat: ujianPred
      },
      updatedAt: new Date().toISOString()
    };

    setRaporTahfidzList(prev => {
      const idx = prev.findIndex(r => r.id === payload.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = payload;
        return next;
      }
      return [payload, ...prev];
    });

    setEditingTahfidz(null);
    setIsCreatingNew(false);
    showToast(`Rapor Tahfidz untuk ${payload.siswaNama} berhasil disimpan!`);
  };

  // Delete Tahfidz Report
  const handleDeleteTahfidz = (id: string) => {
    setRaporTahfidzList(prev => prev.filter(r => r.id !== id));
    setDeleteConfirmId(null);
    showToast('Rapor Tahfidz berhasil dihapus.');
  };

  // Execute Print Window
  const handleExecutePrintTahfidz = (singlePage: boolean = false) => {
    if (!printSheetRef.current || !activePrintTahfidz) return;

    let targetElement = printSheetRef.current;
    let htmlContent = '';

    if (singlePage) {
      const activeSheet = printSheetRef.current.querySelector(`.tahfidz-sheet-${modalBookletTab}`);
      if (activeSheet) {
        htmlContent = activeSheet.outerHTML;
      } else {
        htmlContent = printSheetRef.current.innerHTML;
      }
    } else {
      htmlContent = printSheetRef.current.innerHTML;
    }

    const printWin = window.open('', '', 'width=950,height=900');
    if (!printWin) {
      alert('Jendela cetak diblokir oleh browser. Harap izinkan pop-up untuk mencetak buku rapor tahfidz.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Rapor Tahfidz - ${activePrintTahfidz.siswaNama} (${activePrintTahfidz.nisn})</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <link rel="preconnect" href="https://fonts.googleapis.com">
          <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
          <link href="https://fonts.googleapis.com/css2?family=Amiri:ital,wght@0,400;0,700;1,400&family=Scheherazade+New:wght@600;700&display=swap" rel="stylesheet">
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            body {
              font-family: Arial, "Helvetica Neue", sans-serif;
              color: #000000;
              background: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .font-arabic {
              font-family: "Scheherazade New", "Amiri", "Traditional Arabic", serif;
              font-weight: 700;
            }
            .a4-sheet {
              min-height: 260mm;
              box-sizing: border-box;
              page-break-after: always;
              break-after: page;
              background: #ffffff;
              position: relative;
            }
            .a4-sheet:last-child {
              page-break-after: auto;
              break-after: auto;
            }
            @media print {
              .no-print { display: none !important; }
              body { margin: 0; padding: 0; }
              .a4-sheet {
                page-break-after: always !important;
                break-after: page !important;
                min-height: 260mm !important;
              }
              .a4-sheet:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            }
            table, th, td {
              border-color: #000000 !important;
            }
          </style>
        </head>
        <body class="p-2">
          <div class="max-w-[760px] mx-auto">
            ${htmlContent}
          </div>
          <script>
            setTimeout(() => {
              window.print();
              window.close();
            }, 500);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Export Rekap Tahfidz to CSV
  const handleExportCsv = () => {
    if (raporTahfidzList.length === 0) return;
    const headers = ['No', 'Nama Siswa', 'NISN', 'NIS', 'Kelas', 'Semester', 'Tahun Ajaran', 'Halaqah', 'Pembimbing', 'Adab Halaqah', 'Tajwid', 'Makharijul Huruf', 'Nilai Ujian', 'Predikat Ujian', 'Status'];
    const rows = filteredTahfidzList.map((r, i) => [
      i + 1,
      `"${r.siswaNama}"`,
      `"${r.nisn}"`,
      `"${r.nis}"`,
      `"${r.kelas}"`,
      `"${r.semester}"`,
      `"${r.tahunAjaran}"`,
      `"${r.halaqah}"`,
      `"${r.pembimbingNama}"`,
      r.aspekPenilaian.adabHalaqah,
      r.aspekPenilaian.tajwid,
      r.aspekPenilaian.makharijulHuruf,
      r.aspekPenilaian.nilaiUjianAlQuran,
      `"${r.aspekPenilaian.ujianPredikat || '-'}"`,
      `"${r.status}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Rekap_Rapor_Tahfidz_${selectedKelas}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Rekap Rapor Tahfidz berhasil diekspor ke CSV.');
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className={`${theme === 'light' ? 'bg-gradient-to-r from-emerald-50 via-teal-50 to-white border-emerald-200' : 'bg-slate-900/90 border-slate-800'} p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-600/10 dark:bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Rapor Tahfidz Al-Qur'an
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-sm">
                SMP Islam Modern Al Fakhir
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">
              Format buku capaian hafalan juz, penilaian adab & tajwid halaqah, predikat bahasa Arab (ممتاز, جيد جدا, جيد), catatan pembimbing, dan cetak sampul resmi A4.
            </p>
          </div>
        </div>

        {/* Quick action buttons for Admin & Guru */}
        {currentRole !== 'siswa' && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3.5 py-2 text-xs font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Ekspor Rekap CSV</span>
            </button>

            <button
              onClick={() => {
                const unEvaluated = siswaList.find(s => !raporTahfidzList.some(r => r.siswaId === s.id)) || siswaList[0];
                const newRapor = generateDefaultTahfidzForSiswa(unEvaluated);
                setEditingTahfidz(newRapor);
                setIsCreatingNew(true);
              }}
              className="px-4 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Input Nilai Tahfidz Baru</span>
            </button>
          </div>
        )}
      </div>

      {/* Quick Stat Cards */}
      {currentRole !== 'siswa' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className={`${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'} p-4 rounded-xl border shadow-sm`}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Siswa Tahfidz</div>
            <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{stats.total}</div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Tercatat di Halaqah Al-Qur'an</div>
          </div>
          <div className={`${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'} p-4 rounded-xl border shadow-sm`}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rapor Diterbitkan</div>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{stats.diterbitkan}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">Siap cetak & dibagikan ke wali</div>
          </div>
          <div className={`${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'} p-4 rounded-xl border shadow-sm`}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Rata-rata Nilai Ujian</div>
            <div className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.avgScore} / 100</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-bold font-arabic">جيد جدا (Sangat Baik)</div>
          </div>
          <div className={`${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'} p-4 rounded-xl border shadow-sm`}>
            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Predikat Mumtaz</div>
            <div className="text-2xl font-black text-amber-500 mt-1">{stats.mumtazCount} Siswa</div>
            <div className="text-[10px] text-slate-500 mt-0.5 font-bold font-arabic">ممتاز (Sempurna &ge; 90)</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      {currentRole !== 'siswa' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama atau NISN siswa..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={selectedKelas}
                onChange={e => setSelectedKelas(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Semua">Semua Kelas</option>
                {availableKelasList.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={e => setSelectedStatus(e.target.value)}
                className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="Semua">Semua Status</option>
                <option value="Diterbitkan">Diterbitkan</option>
                <option value="Draft">Draft</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Menampilkan <span className="font-bold text-slate-900 dark:text-white">{filteredTahfidzList.length}</span> rapor tahfidz
          </div>
        </div>
      )}

      {/* Table of Tahfidz Reports */}
      <div className={`${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/60 border-slate-800'} rounded-2xl border shadow-sm overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3.5 text-center w-12">No</th>
                <th className="p-3.5">Nama Siswa & NISN</th>
                <th className="p-3.5">Kelas & Halaqah</th>
                <th className="p-3.5">Guru Pembimbing</th>
                <th className="p-3.5 text-center">Hafalan Dinilai</th>
                <th className="p-3.5 text-center">Nilai Ujian</th>
                <th className="p-3.5 text-center">Predikat</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Aksi / Cetak</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredTahfidzList.length === 0 ? (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-slate-500">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-300">Belum ada data Rapor Tahfidz yang cocok</p>
                    <p className="text-xs text-slate-400 mt-0.5">Silakan pilih kelas lain atau klik "Input Nilai Tahfidz Baru"</p>
                  </td>
                </tr>
              ) : (
                filteredTahfidzList.map((r, idx) => {
                  const testedCount = r.capaianHafalan.filter(h => h.nilai !== null && h.nilai !== undefined).length;
                  return (
                    <tr 
                      key={r.id} 
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="p-3.5 text-center font-mono text-slate-400">{idx + 1}</td>
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                          <span>{r.siswaNama}</span>
                          {r.siswaNama.toLowerCase().includes('zhifani') && (
                            <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.2 rounded font-bold">
                              Sampel PDF
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          NISN: {r.nisn} • NIS: {r.nis}
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-800 dark:text-slate-200">{r.kelas}</span>
                        <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">Halaqah {r.halaqah}</div>
                      </td>
                      <td className="p-3.5">
                        <div className="font-medium text-slate-800 dark:text-slate-200">{r.pembimbingNama}</div>
                        <div className="text-[10px] text-slate-400 font-mono">NIP. {r.pembimbingNip || '-'}</div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {testedCount} / {r.capaianHafalan.length} Surat
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                          {r.aspekPenilaian.nilaiUjianAlQuran || '-'}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="font-bold text-slate-900 dark:text-white font-arabic text-sm px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                          {r.aspekPenilaian.ujianPredikat || getArabicPredikat(r.aspekPenilaian.nilaiUjianAlQuran)}
                        </span>
                        <div className="text-[9px] text-slate-400 mt-0.5">
                          {getPredikatKeterangan(r.aspekPenilaian.ujianPredikat || '')}
                        </div>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          r.status === 'Diterbitkan'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                        }`}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                          {r.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => {
                              setActivePrintTahfidz(r);
                              setModalBookletTab('semua');
                            }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-lg transition-colors cursor-pointer"
                            title="Lihat & Cetak Buku Rapor Tahfidz A4"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {currentRole !== 'siswa' && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingTahfidz(JSON.parse(JSON.stringify(r)));
                                  setIsCreatingNew(false);
                                }}
                                className="p-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-lg transition-colors cursor-pointer"
                                title="Edit Nilai & Catatan Tahfidz"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>

                              <button
                                onClick={() => setDeleteConfirmId(r.id)}
                                className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors cursor-pointer"
                                title="Hapus Rapor Tahfidz"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal for Delete */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Hapus Rapor Tahfidz?</h3>
              <p className="text-xs text-slate-500 mt-1">Data penilaian hafalan Al-Qur'an dan catatan perkembangan siswa ini akan dihapus.</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={() => handleDeleteTahfidz(deleteConfirmId)}
                className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: PREVIEW & CETAK BUKU RAPOR TAHFIDZ (A4 EXACT)   */}
      {/* ======================================================== */}
      {activePrintTahfidz && (
        <div className="fixed inset-0 z-[140] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full max-h-[96vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden text-slate-900 dark:text-white">
            
            {/* Modal Header Controls - Bright, high-contrast & clean */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/90">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 dark:text-white tracking-wide">
                    Pratinjau & Cetak Buku Rapor Tahfidz (A4)
                  </h3>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{activePrintTahfidz.siswaNama}</span> • {activePrintTahfidz.kelas} • NISN: <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{activePrintTahfidz.nisn}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs inside modal */}
              <div className="flex items-center gap-1 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl border border-slate-300 dark:border-slate-700">
                <button
                  onClick={() => setModalBookletTab('semua')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                    modalBookletTab === 'semua'
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 font-semibold'
                  }`}
                >
                  Buku Lengkap (2 Lembar)
                </button>
                <button
                  onClick={() => setModalBookletTab('cover')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                    modalBookletTab === 'cover'
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 font-semibold'
                  }`}
                >
                  Sampul Depan
                </button>
                <button
                  onClick={() => setModalBookletTab('nilai')}
                  className={`px-3 py-1.5 text-xs rounded-lg transition-all cursor-pointer ${
                    modalBookletTab === 'nilai'
                      ? 'bg-emerald-600 text-white font-black shadow-sm'
                      : 'text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-700/60 font-semibold'
                  }`}
                >
                  Lembar Nilai & Hafalan
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecutePrintTahfidz(false)}
                  className="px-4 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Buku Rapor Lengkap</span>
                </button>
                <button
                  onClick={() => handleExecutePrintTahfidz(true)}
                  className="px-3.5 py-2 text-xs font-black bg-blue-600 hover:bg-blue-500 text-white rounded-xl flex items-center gap-1.5 shadow-md shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <span>Cetak Halaman Ini</span>
                </button>
                <button
                  onClick={() => setActivePrintTahfidz(null)}
                  className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl cursor-pointer transition-colors"
                  title="Tutup Modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Sheet Viewer Container (Crisp White Physical Paper on Soft Desk Canvas) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-200 dark:bg-slate-950/90 flex justify-center shadow-inner">
              <div 
                ref={printSheetRef}
                className="w-full max-w-[760px] shadow-2xl rounded-sm border border-slate-300 print:border-none print:shadow-none bg-white text-black"
                style={{ 
                  backgroundColor: '#ffffff', 
                  color: '#000000', 
                  fontFamily: 'Arial, "Helvetica Neue", sans-serif' 
                }}
              >
                
                {/* ================================================= */}
                {/* HALAMAN 1: COVER SAMPUL DEPAN RAPOR TAHFIDZ       */}
                {/* ================================================= */}
                {(modalBookletTab === 'semua' || modalBookletTab === 'cover') && (
                  <div 
                    className="a4-sheet tahfidz-sheet-cover p-8 sm:p-12 flex flex-col justify-between border-b-4 border-dashed border-slate-300 print:border-none min-h-[960px] relative"
                    style={{ backgroundColor: '#ffffff', color: '#000000' }}
                  >
                    
                    {/* Top Centered Title */}
                    <div className="text-center pt-8">
                      <h1 className="text-xl sm:text-2xl font-black tracking-wider" style={{ color: '#000000' }}>
                        LAPORAN
                      </h1>
                      <h2 className="text-lg sm:text-xl font-bold tracking-wide mt-1" style={{ color: '#000000' }}>
                        PENCAPAIAN HASIL BELAJAR PESERTA DIDIK
                      </h2>
                      <h3 className="text-base sm:text-lg font-bold tracking-normal mt-1" style={{ color: '#000000' }}>
                        TAHUN PELAJARAN {activePrintTahfidz.tahunAjaran}
                      </h3>
                    </div>

                    {/* Official Octagram Logo in Center */}
                    <div className="my-10 flex flex-col items-center justify-center">
                      <AlFakhirLogo className="w-44 h-auto drop-shadow-sm" />
                    </div>

                    {/* Student Info Box Section */}
                    <div className="space-y-6 max-w-md mx-auto w-full my-6">
                      
                      {/* Box 1: Nama Peserta Didik */}
                      <div className="text-center">
                        <div className="text-sm font-bold mb-1" style={{ color: '#000000' }}>Nama Peserta Didik:</div>
                        <div 
                          className="border-2 border-black rounded-lg py-2.5 px-4 font-bold text-base sm:text-lg shadow-sm"
                          style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                        >
                          {activePrintTahfidz.siswaNama}
                        </div>
                      </div>

                      {/* Box 2: NISN */}
                      <div className="text-center">
                        <div className="text-sm font-bold mb-1" style={{ color: '#000000' }}>NISN:</div>
                        <div 
                          className="border-2 border-black rounded-lg py-2.5 px-4 font-mono font-bold text-base sm:text-lg shadow-sm tracking-wider"
                          style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                        >
                          {activePrintTahfidz.nisn}
                        </div>
                      </div>

                      {/* Box 3: Kelas / Semester */}
                      <div className="text-center">
                        <div className="text-sm font-bold mb-1" style={{ color: '#000000' }}>Kelas/Semester:</div>
                        <div 
                          className="border-2 border-black rounded-lg py-2.5 px-4 font-bold text-base sm:text-lg shadow-sm"
                          style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                        >
                          {activePrintTahfidz.kelas} &nbsp;/&nbsp; {activePrintTahfidz.semester === '1' ? 'Ganjil' : activePrintTahfidz.semester}
                        </div>
                      </div>

                    </div>

                    {/* Footer Identity */}
                    <div className="text-center pb-6 border-t-2 border-transparent pt-4">
                      <div className="font-black text-sm sm:text-base tracking-wide uppercase" style={{ color: '#000000' }}>
                        SMP ISLAM MODERN AL FAKHIR DEPOK
                      </div>
                      <div className="text-[10px] sm:text-[11px] leading-relaxed mt-1" style={{ color: '#000000' }}>
                        Jl. Kemang RT.03 RW.06 Kel. Pasir Putih Kec. Sawangan<br />
                        Kota Depok 16519 Telp. 085281752123 Website: https://smpialfakhir.sch.id<br />
                        E-mail: smpialfakhir@gmail.com; Instagram: @smpi.alfakhir
                      </div>
                    </div>

                  </div>
                )}

                {/* ================================================= */}
                {/* HALAMAN 2: LEMBAR LAPORAN PERKEMBANGAN BELAJAR    */}
                {/* ================================================= */}
                {(modalBookletTab === 'semua' || modalBookletTab === 'nilai') && (
                  <div 
                    className="a4-sheet tahfidz-sheet-nilai p-6 sm:p-10 flex flex-col justify-between min-h-[960px] relative"
                    style={{ backgroundColor: '#ffffff', color: '#000000' }}
                  >
                    
                    <div>
                      {/* Header 2-Column Grid Info */}
                      <div className="grid grid-cols-2 gap-4 text-[11px] sm:text-xs leading-relaxed mb-4" style={{ color: '#000000' }}>
                        <div className="space-y-1">
                          <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-normal" style={{ color: '#000000' }}>Nama Siswa</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span className="font-bold" style={{ color: '#000000' }}>{activePrintTahfidz.siswaNama}</span>
                          </div>
                          <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-normal" style={{ color: '#000000' }}>No.Induk/NISN</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span className="font-mono font-bold" style={{ color: '#000000' }}>{activePrintTahfidz.nis} &nbsp;/&nbsp; {activePrintTahfidz.nisn}</span>
                          </div>
                          <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-normal" style={{ color: '#000000' }}>Nama Sekolah</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span className="font-bold uppercase" style={{ color: '#000000' }}>{activePrintTahfidz.namaSekolah}</span>
                          </div>
                          <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-normal" style={{ color: '#000000' }}>Kelas</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span className="font-medium" style={{ color: '#000000' }}>{activePrintTahfidz.kelas}</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-normal" style={{ color: '#000000' }}>Semester</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span style={{ color: '#000000' }}>{activePrintTahfidz.semester}</span>
                          </div>
                          <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-normal" style={{ color: '#000000' }}>Tahun Pelajaran</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span style={{ color: '#000000' }}>{activePrintTahfidz.tahunAjaran}</span>
                          </div>
                          <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-normal" style={{ color: '#000000' }}>Halaqah</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span className="font-bold" style={{ color: '#000000' }}>{activePrintTahfidz.halaqah}</span>
                          </div>
                          <div className="grid grid-cols-[100px_10px_1fr]">
                            <span className="font-normal" style={{ color: '#000000' }}>Pembimbing</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span className="font-bold" style={{ color: '#000000' }}>{activePrintTahfidz.pembimbingNama}</span>
                          </div>
                        </div>
                      </div>

                      {/* Main Title */}
                      <div className="text-center my-4 pb-2 border-b-2 border-black" style={{ borderColor: '#000000' }}>
                        <h2 className="text-base sm:text-lg font-black tracking-wide uppercase" style={{ color: '#000000' }}>
                          LAPORAN PERKEMBANGAN HASIL BELAJAR
                        </h2>
                      </div>

                      {/* Section 1: CAPAIAN HAFALAN */}
                      <div className="mb-5">
                        <div className="font-black text-xs sm:text-sm mb-2 uppercase tracking-wide" style={{ color: '#000000' }}>
                          CAPAIAN HAFALAN
                        </div>

                        {/* 2-Column Split Tables for Surahs */}
                        <div className="grid grid-cols-2 gap-3 text-[11px] sm:text-xs">
                          
                          {/* Left Column Table (No 1 - 5) */}
                          <table 
                            className="w-full border-collapse border border-black text-center"
                            style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                          >
                            <thead>
                              <tr 
                                className="font-bold border-b border-black"
                                style={{ backgroundColor: '#f1f5f9', color: '#000000', borderColor: '#000000' }}
                              >
                                <th className="border border-black p-1.5 w-10" style={{ borderColor: '#000000', color: '#000000' }}>NO</th>
                                <th className="border border-black p-1.5 text-left" style={{ borderColor: '#000000', color: '#000000' }}>
                                  <div style={{ color: '#000000' }}>NAMA SURAT</div>
                                  <div className="text-[9px] font-normal" style={{ color: '#334155' }}>JUZ 29</div>
                                </th>
                                <th className="border border-black p-1.5 w-16" style={{ borderColor: '#000000', color: '#000000' }}>NILAI</th>
                                <th className="border border-black p-1.5 w-24" style={{ borderColor: '#000000', color: '#000000' }}>PREDIKAT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activePrintTahfidz.capaianHafalan.slice(0, 5).map(item => (
                                <tr 
                                  key={item.id} 
                                  className="border-b border-black"
                                  style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                                >
                                  <td className="border border-black p-1.5 font-mono" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>{item.nomor}</td>
                                  <td className="border border-black p-1.5 text-left font-bold" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>{item.namaSurat}</td>
                                  <td className="border border-black p-1.5 font-mono font-bold" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>
                                    {item.nilai !== null && item.nilai !== undefined ? item.nilai : '-'}
                                  </td>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>
                                    {item.predikat || getArabicPredikat(item.nilai)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Right Column Table (No 6 - 8) */}
                          <table 
                            className="w-full border-collapse border border-black text-center"
                            style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                          >
                            <thead>
                              <tr 
                                className="font-bold border-b border-black"
                                style={{ backgroundColor: '#f1f5f9', color: '#000000', borderColor: '#000000' }}
                              >
                                <th className="border border-black p-1.5 w-10" style={{ borderColor: '#000000', color: '#000000' }}>NO</th>
                                <th className="border border-black p-1.5 text-left" style={{ borderColor: '#000000', color: '#000000' }}>
                                  <div style={{ color: '#000000' }}>NAMA SURAT</div>
                                  <div className="text-[9px] font-normal" style={{ color: '#334155' }}>JUZ 29</div>
                                </th>
                                <th className="border border-black p-1.5 w-16" style={{ borderColor: '#000000', color: '#000000' }}>NILAI</th>
                                <th className="border border-black p-1.5 w-24" style={{ borderColor: '#000000', color: '#000000' }}>PREDIKAT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {activePrintTahfidz.capaianHafalan.slice(5).map(item => (
                                <tr 
                                  key={item.id} 
                                  className="border-b border-black"
                                  style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                                >
                                  <td className="border border-black p-1.5 font-mono" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>{item.nomor}</td>
                                  <td className="border border-black p-1.5 text-left font-bold" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>{item.namaSurat}</td>
                                  <td className="border border-black p-1.5 font-mono font-bold" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>
                                    {item.nilai !== null && item.nilai !== undefined ? item.nilai : '-'}
                                  </td>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>
                                    {item.predikat || getArabicPredikat(item.nilai)}
                                  </td>
                                </tr>
                              ))}
                              {/* Extra Empty rows to match 5-row height */}
                              {activePrintTahfidz.capaianHafalan.slice(5).length < 5 && (
                                Array.from({ length: 5 - activePrintTahfidz.capaianHafalan.slice(5).length }).map((_, i) => (
                                  <tr 
                                    key={`empty-${i}`} 
                                    className="border-b border-black text-transparent"
                                    style={{ backgroundColor: '#ffffff', borderColor: '#000000' }}
                                  >
                                    <td className="border border-black p-1.5" style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}>-</td>
                                    <td className="border border-black p-1.5" style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}>-</td>
                                    <td className="border border-black p-1.5" style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}>-</td>
                                    <td className="border border-black p-1.5" style={{ borderColor: '#000000', backgroundColor: '#ffffff' }}>-</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>

                        </div>
                      </div>

                      {/* Section 2: ASPEK PENILAIAN & KETERANGAN (Side by Side) */}
                      <div className="mb-5">
                        <div className="grid grid-cols-12 gap-3 text-[11px] sm:text-xs">
                          
                          {/* Left: Aspek Penilaian (7 cols) */}
                          <div className="col-span-7">
                            <div className="font-black text-xs mb-1.5 uppercase tracking-wide" style={{ color: '#000000' }}>
                              ASPEK PENILAIAN
                            </div>
                            <table 
                              className="w-full border-collapse border border-black text-center"
                              style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                            >
                              <thead>
                                <tr 
                                  className="font-bold border-b border-black"
                                  style={{ backgroundColor: '#f1f5f9', color: '#000000', borderColor: '#000000' }}
                                >
                                  <th className="border border-black p-1.5 w-10" style={{ borderColor: '#000000', color: '#000000' }}>NO</th>
                                  <th className="border border-black p-1.5 text-left" style={{ borderColor: '#000000', color: '#000000' }}>ASPEK</th>
                                  <th className="border border-black p-1.5 w-16" style={{ borderColor: '#000000', color: '#000000' }}>NILAI</th>
                                  <th className="border border-black p-1.5 w-24" style={{ borderColor: '#000000', color: '#000000' }}>PREDIKAT</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr 
                                  className="border-b border-black"
                                  style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                                >
                                  <td className="border border-black p-1.5 font-mono" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>1</td>
                                  <td className="border border-black p-1.5 text-left" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>Adab di dalam Halaqah</td>
                                  <td className="border border-black p-1.5 font-mono font-bold" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>{activePrintTahfidz.aspekPenilaian.adabHalaqah}</td>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>
                                    {activePrintTahfidz.aspekPenilaian.adabPredikat || getArabicPredikat(activePrintTahfidz.aspekPenilaian.adabHalaqah)}
                                  </td>
                                </tr>
                                <tr 
                                  className="border-b border-black"
                                  style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                                >
                                  <td className="border border-black p-1.5 font-mono" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>2</td>
                                  <td className="border border-black p-1.5 text-left" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>Tajwid</td>
                                  <td className="border border-black p-1.5 font-mono font-bold" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>{activePrintTahfidz.aspekPenilaian.tajwid}</td>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>
                                    {activePrintTahfidz.aspekPenilaian.tajwidPredikat || getArabicPredikat(activePrintTahfidz.aspekPenilaian.tajwid)}
                                  </td>
                                </tr>
                                <tr 
                                  className="border-b border-black"
                                  style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                                >
                                  <td className="border border-black p-1.5 font-mono" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>3</td>
                                  <td className="border border-black p-1.5 text-left" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>Makharijul Huruf</td>
                                  <td className="border border-black p-1.5 font-mono font-bold" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>{activePrintTahfidz.aspekPenilaian.makharijulHuruf}</td>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>
                                    {activePrintTahfidz.aspekPenilaian.makharijPredikat || getArabicPredikat(activePrintTahfidz.aspekPenilaian.makharijulHuruf)}
                                  </td>
                                </tr>
                                <tr 
                                  className="font-bold border-t-2 border-black"
                                  style={{ backgroundColor: '#f8fafc', color: '#000000', borderColor: '#000000' }}
                                >
                                  <td colSpan={2} className="border border-black p-1.5 text-center font-bold" style={{ borderColor: '#000000', color: '#000000' }}>
                                    Nilai Ujian Al Qur'an
                                  </td>
                                  <td className="border border-black p-1.5 font-mono font-bold text-center" style={{ borderColor: '#000000', color: '#000000' }}>
                                    {activePrintTahfidz.aspekPenilaian.nilaiUjianAlQuran}
                                  </td>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-sm text-center" style={{ borderColor: '#000000', color: '#000000' }}>
                                    {activePrintTahfidz.aspekPenilaian.ujianPredikat || getArabicPredikat(activePrintTahfidz.aspekPenilaian.nilaiUjianAlQuran)}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Right: Keterangan Predikat (5 cols) */}
                          <div className="col-span-5">
                            <div className="font-black text-xs mb-1.5 uppercase tracking-wide" style={{ color: '#000000' }}>
                              KETERANGAN :
                            </div>
                            <table 
                              className="w-full border-collapse border border-black text-xs"
                              style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                            >
                              <tbody>
                                <tr className="border-b border-black" style={{ backgroundColor: '#ffffff', borderColor: '#000000' }}>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-center w-20 text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>ممتاز</td>
                                  <td className="border border-black p-1.5 text-center w-6" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>:</td>
                                  <td className="border border-black p-1.5" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>Sempurna</td>
                                </tr>
                                <tr className="border-b border-black" style={{ backgroundColor: '#ffffff', borderColor: '#000000' }}>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-center text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>جيد جدا</td>
                                  <td className="border border-black p-1.5 text-center" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>:</td>
                                  <td className="border border-black p-1.5" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>Sangat Baik</td>
                                </tr>
                                <tr className="border-b border-black" style={{ backgroundColor: '#ffffff', borderColor: '#000000' }}>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-center text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>جيد</td>
                                  <td className="border border-black p-1.5 text-center" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>:</td>
                                  <td className="border border-black p-1.5" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>Baik</td>
                                </tr>
                                <tr className="border-b border-black" style={{ backgroundColor: '#ffffff', borderColor: '#000000' }}>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-center text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>مقبول</td>
                                  <td className="border border-black p-1.5 text-center" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>:</td>
                                  <td className="border border-black p-1.5" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>Cukup</td>
                                </tr>
                                <tr className="border-b border-black" style={{ backgroundColor: '#ffffff', borderColor: '#000000' }}>
                                  <td className="border border-black p-1.5 font-bold font-arabic text-center text-sm" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>ضعيف</td>
                                  <td className="border border-black p-1.5 text-center" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>:</td>
                                  <td className="border border-black p-1.5" style={{ borderColor: '#000000', color: '#000000', backgroundColor: '#ffffff' }}>Kurang</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                        </div>
                      </div>

                      {/* Section 3: CATATAN GURU PEMBIMBING */}
                      <div className="mb-6">
                        <div className="font-black text-xs mb-1.5 uppercase tracking-wide" style={{ color: '#000000' }}>
                          CATATAN
                        </div>
                        <div 
                          className="border-2 border-black p-3.5 text-xs sm:text-sm leading-relaxed italic text-center min-h-[64px] flex items-center justify-center shadow-sm"
                          style={{ backgroundColor: '#ffffff', color: '#000000', borderColor: '#000000' }}
                        >
                          "{activePrintTahfidz.catatan}"
                        </div>
                      </div>
                    </div>

                    {/* Section 4: Titimangsa & 3 Signatures */}
                    <div className="pt-2 text-xs sm:text-sm" style={{ color: '#000000' }}>
                      
                      {/* Titimangsa Date on Right */}
                      <div className="flex justify-end mb-3">
                        <div className="text-left text-xs leading-relaxed" style={{ color: '#000000' }}>
                          <div className="grid grid-cols-[80px_10px_1fr]">
                            <span style={{ color: '#000000' }}>Diberikan di</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span className="font-bold" style={{ color: '#000000' }}>{activePrintTahfidz.tempatPenerbitan || 'Depok'}</span>
                          </div>
                          <div className="grid grid-cols-[80px_10px_1fr]">
                            <span style={{ color: '#000000' }}>Pada tanggal</span>
                            <span style={{ color: '#000000' }}>:</span>
                            <span className="font-bold" style={{ color: '#000000' }}>{activePrintTahfidz.tanggalPenerbitan || '22 Desember 2025'}</span>
                          </div>
                        </div>
                      </div>

                      {/* 2 Top Signatures: Orang Tua & Guru Al-Qur'an */}
                      <div className="grid grid-cols-2 gap-4 text-center">
                        <div>
                          <div className="text-xs font-semibold" style={{ color: '#000000' }}>Orang Tua/Wali Siswa</div>
                          <div className="h-16"></div>
                          <div className="font-bold" style={{ color: '#000000' }}>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</div>
                        </div>
                        <div>
                          <div className="text-xs font-semibold" style={{ color: '#000000' }}>Guru Al-Qur'an</div>
                          <div className="h-16"></div>
                          <div className="font-bold underline" style={{ color: '#000000' }}>{activePrintTahfidz.pembimbingNama}</div>
                        </div>
                      </div>

                      {/* Center Bottom Signature: Kepala Sekolah */}
                      <div className="text-center mt-6">
                        <div className="text-xs font-semibold" style={{ color: '#000000' }}>Mengetahui,</div>
                        <div className="text-xs font-semibold" style={{ color: '#000000' }}>Kepala SMPI Modern Al Fakhir</div>
                        <div className="h-16"></div>
                        <div className="font-bold underline" style={{ color: '#000000' }}>{activePrintTahfidz.kepalaSekolahNama}</div>
                      </div>

                    </div>

                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: INPUT & EDIT NILAI TAHFIDZ                      */}
      {/* ======================================================== */}
      {editingTahfidz && (
        <div className="fixed inset-0 z-[140] bg-black/75 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            
            {/* Header */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-800/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    {isCreatingNew ? 'Input Rapor Tahfidz Siswa Baru' : 'Edit Capaian Hafalan & Aspek Tahfidz'}
                  </h3>
                  <div className="text-[11px] text-slate-500">
                    {editingTahfidz.siswaNama} • {editingTahfidz.kelas} • NISN: {editingTahfidz.nisn}
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  setEditingTahfidz(null);
                  setIsCreatingNew(false);
                }}
                className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="p-5 overflow-y-auto space-y-6 text-xs">
              
              {/* Student Picker if Creating New */}
              {isCreatingNew && (
                <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/60 space-y-3">
                  <label className="font-bold text-slate-900 dark:text-white text-xs block">
                    Pilih Siswa Target:
                  </label>
                  <select
                    value={editingTahfidz.siswaId}
                    onChange={e => {
                      const targetSiswa = siswaList.find(s => s.id === e.target.value);
                      if (targetSiswa) {
                        const newTemplate = generateDefaultTahfidzForSiswa(targetSiswa);
                        setEditingTahfidz(newTemplate);
                      }
                    }}
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-emerald-500"
                  >
                    {siswaList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nama} ({s.kelas}) - NISN: {s.nisn}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* General Metadata */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Semester & Tahun Ajaran
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingTahfidz.semester}
                      onChange={e => setEditingTahfidz({ ...editingTahfidz, semester: e.target.value })}
                      placeholder="1"
                      className="w-16 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-center"
                    />
                    <input
                      type="text"
                      value={editingTahfidz.tahunAjaran}
                      onChange={e => setEditingTahfidz({ ...editingTahfidz, tahunAjaran: e.target.value })}
                      placeholder="2025/2026"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Guru Pembimbing Tahfidz
                  </label>
                  <input
                    type="text"
                    value={editingTahfidz.pembimbingNama}
                    onChange={e => setEditingTahfidz({ ...editingTahfidz, pembimbingNama: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-1">
                    Titimangsa Penerbitan
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={editingTahfidz.tempatPenerbitan}
                      onChange={e => setEditingTahfidz({ ...editingTahfidz, tempatPenerbitan: e.target.value })}
                      placeholder="Depok"
                      className="w-24 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                    <input
                      type="text"
                      value={editingTahfidz.tanggalPenerbitan}
                      onChange={e => setEditingTahfidz({ ...editingTahfidz, tanggalPenerbitan: e.target.value })}
                      placeholder="22 Desember 2025"
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                    />
                  </div>
                </div>
              </div>

              {/* Table 1: Capaian Hafalan Surat */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Capaian Hafalan Surat (Juz 29 / 30)</span>
                  </h4>
                  <button
                    onClick={() => {
                      const nextNo = editingTahfidz.capaianHafalan.length + 1;
                      const newSurah: HafalanSuratItem = {
                        id: `haf-${Date.now()}`,
                        nomor: nextNo,
                        namaSurat: 'SURAT BARU',
                        juz: 'JUZ 29',
                        nilai: null,
                        predikat: '-'
                      };
                      setEditingTahfidz({
                        ...editingTahfidz,
                        capaianHafalan: [...editingTahfidz.capaianHafalan, newSurah]
                      });
                    }}
                    className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    Tambah Surat
                  </button>
                </div>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5 text-center w-10">No</th>
                        <th className="p-2.5">Nama Surat</th>
                        <th className="p-2.5 w-24">Juz Target</th>
                        <th className="p-2.5 w-28 text-center">Nilai (0-100 / '-')</th>
                        <th className="p-2.5 w-28 text-center">Predikat Arab</th>
                        <th className="p-2.5 text-center w-12">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {editingTahfidz.capaianHafalan.map((item, idx) => {
                        const currentPred = getArabicPredikat(item.nilai);
                        return (
                          <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                            <td className="p-2.5 text-center font-mono text-slate-400 font-bold">{idx + 1}</td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.namaSurat}
                                onChange={e => {
                                  const updated = [...editingTahfidz.capaianHafalan];
                                  updated[idx] = { ...updated[idx], namaSurat: e.target.value.toUpperCase() };
                                  setEditingTahfidz({ ...editingTahfidz, capaianHafalan: updated });
                                }}
                                className="w-full px-2 py-1 text-xs font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2.5">
                              <input
                                type="text"
                                value={item.juz || 'JUZ 29'}
                                onChange={e => {
                                  const updated = [...editingTahfidz.capaianHafalan];
                                  updated[idx] = { ...updated[idx], juz: e.target.value };
                                  setEditingTahfidz({ ...editingTahfidz, capaianHafalan: updated });
                                }}
                                className="w-full px-2 py-1 text-xs rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                              />
                            </td>
                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min={0}
                                max={100}
                                placeholder="-"
                                value={item.nilai !== null && item.nilai !== undefined ? item.nilai : ''}
                                onChange={e => {
                                  const val = e.target.value === '' ? null : Number(e.target.value);
                                  const updated = [...editingTahfidz.capaianHafalan];
                                  updated[idx] = { 
                                    ...updated[idx], 
                                    nilai: val,
                                    predikat: getArabicPredikat(val)
                                  };
                                  setEditingTahfidz({ ...editingTahfidz, capaianHafalan: updated });
                                }}
                                className="w-20 px-2 py-1 text-xs text-center font-mono font-bold rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-1 focus:ring-emerald-500"
                              />
                            </td>
                            <td className="p-2.5 text-center font-bold font-arabic text-sm text-emerald-700 dark:text-emerald-400">
                              {currentPred}
                            </td>
                            <td className="p-2.5 text-center">
                              {editingTahfidz.capaianHafalan.length > 1 && (
                                <button
                                  onClick={() => {
                                    const updated = editingTahfidz.capaianHafalan.filter((_, i) => i !== idx);
                                    setEditingTahfidz({ ...editingTahfidz, capaianHafalan: updated });
                                  }}
                                  className="text-slate-400 hover:text-rose-600 transition-colors"
                                  title="Hapus baris surat"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Table 2: Aspek Penilaian */}
              <div className="space-y-3">
                <h4 className="font-bold text-xs uppercase text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-amber-500" />
                  <span>Aspek Penilaian Halaqah & Ujian Al-Qur'an</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      1. Adab di dalam Halaqah
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editingTahfidz.aspekPenilaian.adabHalaqah}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setEditingTahfidz({
                            ...editingTahfidz,
                            aspekPenilaian: {
                              ...editingTahfidz.aspekPenilaian,
                              adabHalaqah: val,
                              adabPredikat: getArabicPredikat(val)
                            }
                          });
                        }}
                        className="w-20 px-2.5 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <span className="font-arabic font-bold text-sm text-emerald-600">
                        {getArabicPredikat(editingTahfidz.aspekPenilaian.adabHalaqah)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      2. Tajwid
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editingTahfidz.aspekPenilaian.tajwid}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setEditingTahfidz({
                            ...editingTahfidz,
                            aspekPenilaian: {
                              ...editingTahfidz.aspekPenilaian,
                              tajwid: val,
                              tajwidPredikat: getArabicPredikat(val)
                            }
                          });
                        }}
                        className="w-20 px-2.5 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <span className="font-arabic font-bold text-sm text-emerald-600">
                        {getArabicPredikat(editingTahfidz.aspekPenilaian.tajwid)}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                      3. Makharijul Huruf
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={editingTahfidz.aspekPenilaian.makharijulHuruf}
                        onChange={e => {
                          const val = Number(e.target.value);
                          setEditingTahfidz({
                            ...editingTahfidz,
                            aspekPenilaian: {
                              ...editingTahfidz.aspekPenilaian,
                              makharijulHuruf: val,
                              makharijPredikat: getArabicPredikat(val)
                            }
                          });
                        }}
                        className="w-20 px-2.5 py-1 text-xs font-mono font-bold rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <span className="font-arabic font-bold text-sm text-emerald-600">
                        {getArabicPredikat(editingTahfidz.aspekPenilaian.makharijulHuruf)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Nilai Ujian Al-Qur'an Total */}
                <div className="p-3 rounded-xl border-2 border-emerald-500/30 bg-emerald-50/40 dark:bg-emerald-950/20 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">Nilai Ujian Al Qur'an (Akhir)</div>
                    <div className="text-[10px] text-slate-500">Nilai komprehensif ujian tahfidz yang tercantum di lembar utama rapor</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        const asp = editingTahfidz.aspekPenilaian;
                        const avg = Math.round((asp.adabHalaqah + asp.tajwid + asp.makharijulHuruf) / 3);
                        setEditingTahfidz({
                          ...editingTahfidz,
                          aspekPenilaian: {
                            ...asp,
                            nilaiUjianAlQuran: avg,
                            ujianPredikat: getArabicPredikat(avg)
                          }
                        });
                      }}
                      className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 hover:underline cursor-pointer"
                    >
                      Hitung Rata-rata Otomatis
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={editingTahfidz.aspekPenilaian.nilaiUjianAlQuran}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingTahfidz({
                          ...editingTahfidz,
                          aspekPenilaian: {
                            ...editingTahfidz.aspekPenilaian,
                            nilaiUjianAlQuran: val,
                            ujianPredikat: getArabicPredikat(val)
                          }
                        });
                      }}
                      className="w-20 px-3 py-1.5 text-center font-mono font-bold text-sm rounded-lg border border-emerald-500 bg-white dark:bg-slate-900"
                    />
                    <span className="font-arabic font-bold text-base text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/60">
                      {getArabicPredikat(editingTahfidz.aspekPenilaian.nilaiUjianAlQuran)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Catatan Guru Pembimbing */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Catatan Guru Al-Qur'an / Pembimbing
                  </label>
                  <button
                    onClick={() => {
                      setEditingTahfidz({
                        ...editingTahfidz,
                        catatan: `Alhamdulillah ${editingTahfidz.siswaNama} semakin baik bacaan Al-Qur'an nya dan telah menyelesaikan hafalan wajib Q.S. Al-Waqi'ah. Semoga Ananda selalu istiqomah dalam membaca dan menghafal Al-Qur'an di rumah. Aamiin.`
                      });
                    }}
                    className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
                  >
                    Gunakan Redaksi Standar
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={editingTahfidz.catatan}
                  onChange={e => setEditingTahfidz({ ...editingTahfidz, catatan: e.target.value })}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white leading-relaxed focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Status Selector */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <span className="font-bold text-slate-700 dark:text-slate-300">Status Penerbitan Rapor</span>
                <select
                  value={editingTahfidz.status}
                  onChange={e => setEditingTahfidz({ ...editingTahfidz, status: e.target.value as any })}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                >
                  <option value="Diterbitkan">Diterbitkan (Siap Cetak)</option>
                  <option value="Draft">Draft (Belum Selesai)</option>
                </select>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2 bg-slate-50 dark:bg-slate-800/80">
              <button
                onClick={() => {
                  setEditingTahfidz(null);
                  setIsCreatingNew(false);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                onClick={handleSaveTahfidz}
                className="px-5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Rapor Tahfidz</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
