import React, { useState, useMemo, useRef } from 'react';
import { 
  GraduationCap, 
  Printer, 
  Search, 
  Filter, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  BookOpen, 
  Check, 
  Trophy, 
  Award, 
  Sparkles, 
  RefreshCw, 
  Sliders, 
  UserCheck, 
  Calendar, 
  Share2, 
  FileText, 
  ShieldCheck, 
  Layers, 
  ArrowUpDown,
  Download,
  Info
} from 'lucide-react';
import { 
  Siswa, 
  Guru, 
  RombelKelas, 
  MataPelajaranItem, 
  EkstrakurikulerItem, 
  AbsensiSiswaHarian, 
  HasilUjian, 
  SchoolSettings, 
  Role, 
  RaporSubTab, 
  RaporSiswa, 
  RaporTahfidzSiswa,
  NilaiMapelRapor, 
  NilaiEkskulRapor, 
  PresensiRapor 
} from '../types/school';
import { RaporTahfidzView } from './RaporTahfidzView';
import { INITIAL_RAPOR_TAHFIDZ } from '../data/mockData';

// Official Vector Emblem of Kota Depok (Matching Cover Rapor PDF)
const KotaDepokLogo = ({ className = "w-28 h-auto" }: { className?: string }) => (
  <svg 
    viewBox="0 0 200 240" 
    className={className} 
    xmlns="http://www.w3.org/2000/svg"
  >
    {/* Shield Base */}
    <path 
      d="M20 20 H180 V150 C180 200 100 230 100 230 C100 230 20 200 20 150 Z" 
      fill="#0284c7" 
      stroke="#0f172a" 
      strokeWidth="4" 
    />
    {/* Top Banner Gold */}
    <rect x="20" y="20" width="160" height="32" rx="4" fill="#fbbf24" stroke="#0f172a" strokeWidth="3" />
    <text x="100" y="42" fontFamily="Arial, sans-serif" fontSize="15" fontWeight="900" fill="#0f172a" textAnchor="middle" letterSpacing="1">
      KOTA DEPOK
    </text>

    {/* Star on top */}
    <polygon points="100,58 103,66 112,66 105,71 107,79 100,74 93,79 95,71 88,66 97,66" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

    {/* Wings */}
    <path d="M40 90 Q70 110 90 140 Q60 130 40 90 Z" fill="#ffffff" opacity="0.9" />
    <path d="M160 90 Q130 110 110 140 Q140 130 160 90 Z" fill="#ffffff" opacity="0.9" />

    {/* Golden Tower in center */}
    <rect x="92" y="80" width="16" height="55" fill="#f59e0b" stroke="#78350f" strokeWidth="2" />
    <polygon points="100,68 112,80 88,80" fill="#dc2626" stroke="#78350f" strokeWidth="2" />
    <rect x="95" y="90" width="10" height="12" rx="5" fill="#1e293b" />
    <rect x="95" y="110" width="10" height="15" fill="#1e293b" />

    {/* Green Hill */}
    <path d="M30 155 Q100 130 170 155 L170 175 Q100 160 30 175 Z" fill="#15803d" />

    {/* Water Waves */}
    <path d="M30 175 Q65 168 100 175 T170 175 L170 188 Q135 182 100 188 T30 188 Z" fill="#ffffff" />
    <path d="M35 188 Q65 182 100 188 T165 188 L160 200 Q130 195 100 200 T40 200 Z" fill="#0369a1" />
    <path d="M45 200 Q72 195 100 200 T155 200 L145 210 Q122 206 100 210 T55 210 Z" fill="#ffffff" />

    {/* Bottom Ribbon */}
    <path d="M25 215 L50 205 L150 205 L175 215 L165 225 L100 225 L35 225 Z" fill="#f8fafc" stroke="#0f172a" strokeWidth="2" />
    <text x="100" y="221" fontFamily="Arial, sans-serif" fontSize="10" fontWeight="900" fill="#0f172a" textAnchor="middle" letterSpacing="0.8">
      PARICARA DHARMA
    </text>
  </svg>
);

// Official Logo SMP Islam Modern Al Fakhir
const AlFakhirLogo = ({ className = "w-32 h-auto" }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
    <g transform="translate(100,100)">
      <polygon 
        points="0,-85 24,-60 60,-60 60,-24 85,0 60,24 60,60 24,60 0,85 -24,60 -60,60 -60,24 -85,0 -60,-24 -60,-60 -24,-60" 
        fill="#ffffff" 
        stroke="#0d9488" 
        strokeWidth="6"
      />
      <circle cx="0" cy="0" r="54" fill="#0f766e"/>
      <path d="M-28 10 Q0 -22 28 10 L18 18 Q0 -6 -18 18 Z" fill="#fbbf24"/>
      <circle cx="0" cy="-6" r="4.5" fill="#fbbf24"/>
      <path d="M-32 20 Q0 32 32 20 L32 26 Q0 38 -32 26 Z" fill="#ffffff"/>
      <text x="0" y="38" fontSize="8" fontFamily="Arial, sans-serif" fontWeight="bold" fill="#ffffff" textAnchor="middle">
        SMP ISLAM MODERN
      </text>
      <text x="0" y="50" fontSize="11" fontFamily="Arial, sans-serif" fontWeight="900" fill="#fbbf24" textAnchor="middle">
        AL FAKHIR
      </text>
    </g>
  </svg>
);

const formatTanggalLengkap = (tglStr?: string) => {
  if (!tglStr) return '-';
  try {
    const d = new Date(tglStr);
    if (isNaN(d.getTime())) return tglStr;
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return tglStr;
  }
};

interface RaporViewProps {
  siswaList: Siswa[];
  guruList?: Guru[];
  rombelList?: RombelKelas[];
  mapelList?: MataPelajaranItem[];
  ekskulList?: EkstrakurikulerItem[];
  absensiHarian?: AbsensiSiswaHarian[];
  hasilUjianList?: HasilUjian[];
  schoolSettings?: SchoolSettings;
  currentRole?: Role;
  userEmail?: string;
  subTab?: RaporSubTab;
  setSubTab?: (subTab: RaporSubTab) => void;
  raporList: RaporSiswa[];
  setRaporList: React.Dispatch<React.SetStateAction<RaporSiswa[]>>;
  raporTahfidzList?: RaporTahfidzSiswa[];
  setRaporTahfidzList?: React.Dispatch<React.SetStateAction<RaporTahfidzSiswa[]>>;
  theme?: 'dark' | 'light';
}

export const RaporView: React.FC<RaporViewProps> = ({
  siswaList,
  guruList = [],
  rombelList = [],
  mapelList = [],
  ekskulList = [],
  absensiHarian = [],
  hasilUjianList = [],
  schoolSettings,
  currentRole = 'admin',
  userEmail = '',
  subTab: externalSubTab,
  setSubTab: externalSetSubTab,
  raporList,
  setRaporList,
  raporTahfidzList: externalTahfidzList,
  setRaporTahfidzList: externalSetTahfidzList,
  theme = 'light'
}) => {
  const [internalTahfidzList, setInternalTahfidzList] = useState<RaporTahfidzSiswa[]>(() => {
    try {
      const saved = localStorage.getItem('edu_raporTahfidzList');
      if (saved) return JSON.parse(saved);
    } catch {}
    return INITIAL_RAPOR_TAHFIDZ;
  });

  const tahfidzList = externalTahfidzList || internalTahfidzList;
  const setTahfidzList = externalSetTahfidzList || setInternalTahfidzList;

  const [internalSubTab, setInternalSubTab] = useState<RaporSubTab>('cetak_rapor');
  const subTab = externalSubTab || internalSubTab;
  const setSubTab = externalSetSubTab || setInternalSubTab;

  // Filter & Search states
  const [selectedKelas, setSelectedKelas] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<'Ganjil' | 'Genap'>('Genap');
  const [selectedTahunAjaran, setSelectedTahunAjaran] = useState<string>('2026/2027');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Preview & Cetak Rapor
  const [activePrintRapor, setActivePrintRapor] = useState<RaporSiswa | null>(null);
  const [modalBookletTab, setModalBookletTab] = useState<'semua' | 'cover' | 'sekolah' | 'siswa' | 'nilai' | 'keluar' | 'masuk'>('semua');
  const printContainerRef = useRef<HTMLDivElement>(null);

  // Matching student profile for full 17 identity details
  const activeSiswaObj = useMemo(() => {
    if (!activePrintRapor) return null;
    return siswaList.find(s => s.id === activePrintRapor.siswaId || s.nisn === activePrintRapor.nisn) || null;
  }, [activePrintRapor, siswaList]);

  // Modal Edit Rapor
  const [editingRapor, setEditingRapor] = useState<RaporSiswa | null>(null);

  // Input Massal Per Mapel State
  const [inputMassalKelas, setInputMassalKelas] = useState<string>('IX - Utsman bin Affan');
  const [inputMassalMapel, setInputMassalMapel] = useState<string>('Matematika');
  const [massalNilaiState, setMassalNilaiState] = useState<Record<string, { formatif: number; sumatif: number; akhir: number; capaian: string }>>({});

  // Leger Print Modal
  const [showLegerPrintModal, setShowLegerPrintModal] = useState<boolean>(false);
  const legerPrintRef = useRef<HTMLDivElement>(null);

  // Settings State
  const [tampilkanRanking, setTampilkanRanking] = useState<boolean>(false);
  const [tanggalTitimangsa, setTanggalTitimangsa] = useState<string>('2026-06-20');
  const [tempatTitimangsa, setTempatTitimangsa] = useState<string>(schoolSettings?.kotaKabupaten || 'Jakarta Selatan');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Available classes list from rombel or siswa
  const availableKelasList = useMemo(() => {
    const set = new Set<string>();
    rombelList.forEach(r => {
      if (r.namaRombel) set.add(r.namaRombel);
    });
    siswaList.forEach(s => {
      if (s.kelas) set.add(s.kelas);
    });
    if (set.size === 0) {
      ['VII - Ibnu Sina', 'VIII - Al Biruni', 'IX - Umar bin Khattab', 'IX - Utsman bin Affan'].forEach(k => set.add(k));
    }
    return Array.from(set).sort();
  }, [rombelList, siswaList]);

  // Current active logged in student (if role is siswa)
  const activeSiswaLogin = useMemo(() => {
    if (currentRole !== 'siswa') return null;
    const emailLower = userEmail?.toLowerCase().trim() || '';
    const found = siswaList.find(s => 
      (s.email && s.email.toLowerCase() === emailLower) || 
      (s.username && s.username.toLowerCase() === emailLower.split('@')[0])
    );
    return found || siswaList[0] || null;
  }, [currentRole, userEmail, siswaList]);

  // Helper to generate full default rapor for a student
  const generateDefaultRaporForSiswa = (siswa: Siswa): RaporSiswa => {
    // Cari wali kelas rombel
    const rombel = rombelList.find(r => r.namaRombel === siswa.kelas);
    const matchedGuru = guruList.find(g => g.nama === rombel?.waliKelasNama);
    
    // Cari rekap absensi
    const siswaAbsen = absensiHarian.filter(a => a.siswaId === siswa.id);
    const sakitCount = siswaAbsen.filter(a => a.status === 'Sakit').length;
    const izinCount = siswaAbsen.filter(a => a.status === 'Izin').length;
    const alpaCount = siswaAbsen.filter(a => a.status === 'Alpha').length;

    // Nilai mapel standar
    const defaultMapel: NilaiMapelRapor[] = (mapelList.length > 0 ? mapelList : [
      { id: 'm-1', namaMapel: 'Pendidikan Agama Islam & Budi Pekerti', kkm: 75 },
      { id: 'm-2', namaMapel: 'Pendidikan Pancasila', kkm: 75 },
      { id: 'm-3', namaMapel: 'Bahasa Indonesia', kkm: 75 },
      { id: 'm-4', namaMapel: 'Matematika', kkm: 75 },
      { id: 'm-5', namaMapel: 'Ilmu Pengetahuan Alam (IPA)', kkm: 75 },
      { id: 'm-6', namaMapel: 'Ilmu Pengetahuan Sosial (IPS)', kkm: 70 },
      { id: 'm-7', namaMapel: 'Bahasa Inggris', kkm: 75 },
      { id: 'm-8', namaMapel: 'Informatika', kkm: 75 },
      { id: 'm-9', namaMapel: 'Pendidikan Jasmani, Olahraga & Kesehatan', kkm: 75 },
      { id: 'm-10', namaMapel: 'Seni Budaya & Prakarya', kkm: 75 },
    ] as any[]).map((m: any, idx: number) => {
      // Periksa apakah ada nilai CBT untuk mapel ini
      const cbt = hasilUjianList.find(h => h.siswaId === siswa.id || h.siswaNama === siswa.nama);
      const baseScore = cbt?.nilaiTotal && cbt.nilaiTotal > 40 ? Math.min(100, Math.max(75, cbt.nilaiTotal + (idx % 5))) : (84 + (idx % 10));
      const formatif = Math.min(100, baseScore - 2 + (idx % 3));
      const sumatif = Math.min(100, baseScore + 2);
      const akhir = Math.round((formatif + sumatif) / 2);
      const predikat: 'A' | 'B' | 'C' | 'D' = akhir >= 88 ? 'A' : akhir >= 78 ? 'B' : akhir >= 68 ? 'C' : 'D';

      return {
        mapelId: m.id || `mapel-${idx}`,
        namaMapel: m.namaMapel || m.nama || 'Mata Pelajaran',
        kelompok: 'Kelompok A (Umum / Wajib)',
        kkm: m.kkm || 75,
        nilaiFormatif: formatif,
        nilaiSumatif: sumatif,
        nilaiAkhir: akhir,
        capaianKompetensi: `Menunjukkan penguasaan sangat baik dalam capaian pembelajaran ${m.namaMapel || 'mata pelajaran'} dan berpartisipasi aktif dalam kegiatan asesmen sumatif.`,
        predikat
      };
    });

    const defaultEkskul: NilaiEkskulRapor[] = [
      {
        namaEkskul: 'Praja Muda Karana (Pramuka)',
        predikat: 'Sangat Baik',
        keterangan: 'Aktif, disiplin, dan patuh terhadap kode kehormatan Dasa Darma Pramuka.'
      },
      {
        namaEkskul: 'Robotik & Literasi Digital',
        predikat: 'Baik',
        keterangan: 'Menunjukkan kreativitas dan kerja sama kelompok yang baik dalam eksperimen teknologi.'
      }
    ];

    return {
      id: `rap-${siswa.id}-${Date.now().toString().slice(-4)}`,
      siswaId: siswa.id,
      siswaNama: siswa.nama,
      nisn: siswa.nisn || '0081234567',
      nis: siswa.nis || '10200',
      kelas: siswa.kelas || 'IX - Utsman bin Affan',
      tingkatKelas: siswa.tingkatKelas || 'Kelas 9',
      fase: 'Fase D',
      semester: selectedSemester,
      tahunAjaran: selectedTahunAjaran,
      kurikulum: 'Kurikulum Merdeka',
      tanggalRapor: tanggalTitimangsa,
      tempatPenerbitan: tempatTitimangsa,
      nilaiMapel: defaultMapel,
      nilaiEkskul: defaultEkskul,
      presensi: {
        sakit: Math.max(0, sakitCount),
        izin: Math.max(0, izinCount),
        tanpaKeterangan: Math.max(0, alpaCount)
      },
      catatanWaliKelas: `Ananda ${siswa.nama} menunjukkan perkembangan belajar yang positif, berakhlak mulia, dan tekun. Pertahankan semangat belajar yang tinggi dan tingkatkan prestasimu ke jenjang berikutnya.`,
      projekPancasila: 'Berkembang Sangat Baik dalam dimensi Beriman, Bertakwa kepada Tuhan YME, Mandiri, dan Bernalar Kritis dalam projek P5 Gaya Hidup Berkelanjutan.',
      statusKenaikan: siswa.kelas.includes('9') ? 'Lulus' : 'Naik ke Kelas Berikutnya',
      waliKelasNama: rombel?.waliKelasNama || matchedGuru?.nama || 'Giar Hermawan, S.Kom',
      waliKelasNip: matchedGuru?.nip || '198204102010011010',
      kepalaSekolahNama: schoolSettings?.kepalaSekolah || 'Dr. H. Ahmad Dahlan, M.Pd.',
      kepalaSekolahNip: schoolSettings?.nipKepalaSekolah || '197508151999031002',
      status: 'Diterbitkan',
      updatedAt: new Date().toISOString()
    };
  };

  // Filtered Rapor List
  const filteredRaporList = useMemo(() => {
    // If role is siswa, ONLY show their own report card
    if (currentRole === 'siswa' && activeSiswaLogin) {
      const myRapor = raporList.find(r => r.siswaId === activeSiswaLogin.id || r.siswaNama.toLowerCase() === activeSiswaLogin.nama.toLowerCase());
      if (myRapor) return [myRapor];
      return [generateDefaultRaporForSiswa(activeSiswaLogin)];
    }

    return siswaList
      .filter(s => {
        const matchKelas = selectedKelas === 'Semua' || (s.kelas && s.kelas.trim() === selectedKelas.trim());
        const matchQuery = !searchQuery || 
          s.nama.toLowerCase().includes(searchQuery.toLowerCase()) || 
          s.nisn?.includes(searchQuery) || 
          s.nis?.includes(searchQuery);
        return matchKelas && matchQuery;
      })
      .map(s => {
        const found = raporList.find(r => r.siswaId === s.id || r.siswaNama.toLowerCase() === s.nama.toLowerCase());
        return found || generateDefaultRaporForSiswa(s);
      });
  }, [siswaList, raporList, selectedKelas, searchQuery, currentRole, activeSiswaLogin]);

  // Leger Data for selected class
  const legerData = useMemo(() => {
    const targetKelas = inputMassalKelas || availableKelasList[0];
    const siswaInClass = siswaList.filter(s => s.kelas === targetKelas);
    
    const records = siswaInClass.map(s => {
      const rapor = raporList.find(r => r.siswaId === s.id) || generateDefaultRaporForSiswa(s);
      const totalNilai = rapor.nilaiMapel.reduce((sum, m) => sum + (m.nilaiAkhir || 0), 0);
      const rataRata = rapor.nilaiMapel.length > 0 ? Number((totalNilai / rapor.nilaiMapel.length).toFixed(1)) : 0;
      return {
        siswa: s,
        rapor,
        totalNilai,
        rataRata
      };
    });

    // Sort by rataRata descending to compute ranking
    const sorted = [...records].sort((a, b) => b.rataRata - a.rataRata);
    return sorted.map((item, idx) => ({
      ...item,
      ranking: idx + 1
    }));
  }, [siswaList, raporList, inputMassalKelas, availableKelasList]);

  // Synchronize massal input table when class/mapel changes
  const siswaInMassalKelas = useMemo(() => {
    return siswaList.filter(s => s.kelas === inputMassalKelas);
  }, [siswaList, inputMassalKelas]);

  const handleInitMassalValues = () => {
    const map: Record<string, { formatif: number; sumatif: number; akhir: number; capaian: string }> = {};
    siswaInMassalKelas.forEach(s => {
      const rapor = raporList.find(r => r.siswaId === s.id) || generateDefaultRaporForSiswa(s);
      const mapelNilai = rapor.nilaiMapel.find(m => m.namaMapel === inputMassalMapel);
      const formatif = mapelNilai?.nilaiFormatif ?? 85;
      const sumatif = mapelNilai?.nilaiSumatif ?? 87;
      const akhir = mapelNilai?.nilaiAkhir ?? Math.round((formatif + sumatif) / 2);
      const capaian = mapelNilai?.capaianKompetensi ?? `Menunjukkan pemahaman sangat baik dalam kompetensi pembelajaran ${inputMassalMapel}.`;
      map[s.id] = { formatif, sumatif, akhir, capaian };
    });
    setMassalNilaiState(map);
  };

  // Sync / Auto-generate all report cards from CBT & Absensi
  const handleAutoSyncFromCbtAndAbsensi = () => {
    const updated: RaporSiswa[] = siswaList.map(s => {
      const existing = raporList.find(r => r.siswaId === s.id);
      const base = existing || generateDefaultRaporForSiswa(s);
      
      // Update attendance from real Absensi database
      const sAbsen = absensiHarian.filter(a => a.siswaId === s.id);
      const sakit = sAbsen.filter(a => a.status === 'Sakit').length;
      const izin = sAbsen.filter(a => a.status === 'Izin').length;
      const alpa = sAbsen.filter(a => a.status === 'Alpha').length;

      // Update CBT score for CBT exams
      const cbt = hasilUjianList.find(h => h.siswaId === s.id || h.siswaNama === s.nama);
      const updatedMapel = base.nilaiMapel.map(m => {
        if (cbt && (m.namaMapel.toLowerCase().includes('matematika') || m.namaMapel.toLowerCase().includes('informatika'))) {
          const sumatifCbt = cbt.nilaiTotal || m.nilaiSumatif;
          const akhir = Math.round((m.nilaiFormatif + sumatifCbt) / 2);
          return {
            ...m,
            nilaiSumatif: sumatifCbt,
            nilaiAkhir: akhir,
            predikat: (akhir >= 88 ? 'A' : akhir >= 78 ? 'B' : akhir >= 68 ? 'C' : 'D') as any
          };
        }
        return m;
      });

      return {
        ...base,
        presensi: { sakit, izin, tanpaKeterangan: alpa },
        nilaiMapel: updatedMapel,
        updatedAt: new Date().toISOString()
      };
    });

    setRaporList(updated);
    showToast('Berhasil menyinkronkan nilai CBT & presensi kehadiran seluruh siswa!');
  };

  // Save Massal Grades
  const handleSaveMassalNilai = () => {
    const updated = [...raporList];
    siswaInMassalKelas.forEach(s => {
      const currentValues = massalNilaiState[s.id];
      if (!currentValues) return;

      const idx = updated.findIndex(r => r.siswaId === s.id);
      const baseRapor = idx >= 0 ? updated[idx] : generateDefaultRaporForSiswa(s);

      const existingMapelIdx = baseRapor.nilaiMapel.findIndex(m => m.namaMapel === inputMassalMapel);
      const predikat: 'A' | 'B' | 'C' | 'D' = currentValues.akhir >= 88 ? 'A' : currentValues.akhir >= 78 ? 'B' : currentValues.akhir >= 68 ? 'C' : 'D';

      const mapelObj: NilaiMapelRapor = {
        mapelId: existingMapelIdx >= 0 ? baseRapor.nilaiMapel[existingMapelIdx].mapelId : `m-${Date.now()}`,
        namaMapel: inputMassalMapel,
        kelompok: 'Kelompok A (Umum / Wajib)',
        kkm: 75,
        nilaiFormatif: currentValues.formatif,
        nilaiSumatif: currentValues.sumatif,
        nilaiAkhir: currentValues.akhir,
        capaianKompetensi: currentValues.capaian,
        predikat
      };

      let newMapelList = [...baseRapor.nilaiMapel];
      if (existingMapelIdx >= 0) {
        newMapelList[existingMapelIdx] = mapelObj;
      } else {
        newMapelList.push(mapelObj);
      }

      const updatedRapor: RaporSiswa = {
        ...baseRapor,
        nilaiMapel: newMapelList,
        updatedAt: new Date().toISOString()
      };

      if (idx >= 0) {
        updated[idx] = updatedRapor;
      } else {
        updated.push(updatedRapor);
      }
    });

    setRaporList(updated);
    showToast(`Nilai mata pelajaran ${inputMassalMapel} untuk kelas ${inputMassalKelas} berhasil disimpan!`);
  };

  // Save Edited Single Rapor
  const handleSaveEditedRapor = () => {
    if (!editingRapor) return;
    setRaporList(prev => {
      const idx = prev.findIndex(r => r.siswaId === editingRapor.siswaId);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...editingRapor, updatedAt: new Date().toISOString() };
        return copy;
      }
      return [editingRapor, ...prev];
    });
    showToast(`Rapor siswa ${editingRapor.siswaNama} berhasil diperbarui!`);
    setEditingRapor(null);
  };

  // Print Window Execution for Official Report Card (Booklet A4 Multi-Halaman)
  const handleExecutePrintRapor = (printSingle: boolean = false) => {
    const printContent = printContainerRef.current;
    if (!printContent) return;

    const printWin = window.open('', '', 'width=1000,height=900');
    if (!printWin) {
      alert('Jendela cetak diblokir oleh browser. Harap izinkan pop-up untuk mencetak buku rapor.');
      return;
    }

    let htmlContent = '';
    if (printSingle && modalBookletTab !== 'semua') {
      const pageEl = printContent.querySelector(`[data-booklet-page="${modalBookletTab}"]`);
      htmlContent = pageEl ? pageEl.outerHTML : printContent.innerHTML;
    } else {
      htmlContent = printContent.innerHTML;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Buku Rapor Resmi - ${activePrintRapor?.siswaNama} (${activePrintRapor?.nisn})</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4 portrait;
              margin: 15mm 15mm 15mm 15mm;
            }
            body {
              font-family: Arial, Helvetica, sans-serif;
              color: #000000;
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              margin: 0;
              padding: 0;
            }
            .a4-sheet {
              box-sizing: border-box;
              min-height: 258mm;
              display: flex;
              flex-direction: column;
              justify-content: space-between;
              page-break-after: always;
              break-after: page;
              padding: 5mm 0;
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
            }, 600);
          </script>
        </body>
      </html>
    `);
    printWin.document.close();
  };

  // Print Leger Window Execution
  const handleExecutePrintLeger = () => {
    const printContent = legerPrintRef.current;
    if (!printContent) return;

    const printWin = window.open('', '', 'width=1100,height=800');
    if (!printWin) {
      alert('Jendela cetak diblokir. Harap izinkan pop-up untuk mencetak leger nilai.');
      return;
    }

    printWin.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Leger Nilai & Peringkat - Kelas ${inputMassalKelas}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: landscape;
              margin: 10mm;
            }
            body {
              font-family: Arial, sans-serif;
              color: #000;
              background: #fff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            @media print {
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="p-6">
          ${printContent.innerHTML}
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

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[120] bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Banner & Title */}
      <div className={`${theme === 'light' ? 'bg-white border-slate-200' : 'bg-slate-900/80 border-slate-800'} p-6 rounded-2xl border shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors`}>
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 bg-blue-600/10 text-blue-600 rounded-xl border border-blue-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              {currentRole === 'siswa' ? 'Rapor Hasil Belajar Siswa' : 'Rapor Sekolah & E-Rapor Kurikulum Merdeka'}
            </h2>
            <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 rounded-md">
              Semester {selectedSemester} • {selectedTahunAjaran}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {currentRole === 'siswa' 
              ? 'Pantau perolehan nilai akademik, deskripsi capaian kompetensi, catatan wali kelas, dan cetak rapor resmi Anda.'
              : 'Manajemen penilaian rapor resmi, cetak dokumen standar Kemdikbudristek, leger nilai kelas, dan konversi capaian kompetensi.'}
          </p>
        </div>

        {currentRole !== 'siswa' && (
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button
              onClick={handleAutoSyncFromCbtAndAbsensi}
              className="px-3.5 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 border border-blue-200 rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Perbarui data nilai rapor dari riwayat CBT dan absensi kelas"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Tarik dari CBT & Presensi</span>
            </button>
            <button
              onClick={() => setShowLegerPrintModal(true)}
              className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Leger Nilai</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs (For non-student roles) */}
      {currentRole !== 'siswa' && (
        <div className="flex items-center gap-1.5 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSubTab('cetak_rapor')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'cetak_rapor'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Daftar & Cetak Rapor Siswa</span>
          </button>

          <button
            onClick={() => {
              setSubTab('input_nilai');
              handleInitMassalValues();
            }}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'input_nilai'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Input Nilai Massal Per Mapel</span>
          </button>

          <button
            onClick={() => setSubTab('leger_nilai')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'leger_nilai'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Leger & Peringkat Kelas</span>
          </button>

          <button
            onClick={() => setSubTab('rapor_tahfidz')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'rapor_tahfidz'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Rapor Tahfidz (Al-Qur'an)</span>
            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold ${
              subTab === 'rapor_tahfidz'
                ? 'bg-white/20 text-white'
                : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
            }`}>
              Baru
            </span>
          </button>

          <button
            onClick={() => setSubTab('pengaturan_rapor')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'pengaturan_rapor'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Format & Titimangsa Rapor</span>
          </button>
        </div>
      )}

      {/* Student Role Tab Selector between Academic & Tahfidz */}
      {currentRole === 'siswa' && (
        <div className="flex items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
          <button
            onClick={() => setSubTab('cetak_rapor')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab !== 'rapor_tahfidz'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Rapor Akademik (Kurikulum Merdeka)</span>
          </button>

          <button
            onClick={() => setSubTab('rapor_tahfidz')}
            className={`px-4 py-2 text-xs font-semibold rounded-lg flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
              subTab === 'rapor_tahfidz'
                ? 'bg-emerald-600 text-white shadow-sm font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Rapor Tahfidz (Al-Qur'an)</span>
          </button>
        </div>
      )}

      {/* SUBTAB 1: DAFTAR & CETAK RAPOR SISWA */}
      {(subTab === 'cetak_rapor' || (currentRole === 'siswa' && subTab !== 'rapor_tahfidz')) && (
        <div className="space-y-4">
          
          {/* Controls: Search & Filter */}
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
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-400" />
                  <select
                    value={selectedKelas}
                    onChange={e => setSelectedKelas(e.target.value)}
                    className="text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Semua">Semua Kelas ({siswaList.length} Siswa)</option>
                    {availableKelasList.map(k => (
                      <option key={k} value={k}>
                        {k} ({siswaList.filter(s => s.kelas === k).length} Siswa)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="text-xs text-slate-500 dark:text-slate-400 self-end sm:self-center">
                Menampilkan <span className="font-bold text-slate-900 dark:text-white">{filteredRaporList.length}</span> buku rapor
              </div>
            </div>
          )}

          {/* Student Report Cards Table */}
          <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px] tracking-wider">
                    <th className="py-3 px-4">No</th>
                    <th className="py-3 px-4">Identitas Siswa</th>
                    <th className="py-3 px-4">Kelas & Fase</th>
                    <th className="py-3 px-4 text-center">Rata-Rata Nilai</th>
                    <th className="py-3 px-4 text-center">Predikat</th>
                    <th className="py-3 px-4 text-center">Ketidakhadiran</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
                  {filteredRaporList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-400">
                        Tidak ada data rapor yang cocok dengan pencarian atau filter kelas.
                      </td>
                    </tr>
                  ) : (
                    filteredRaporList.map((rapor, idx) => {
                      const totalNilai = rapor.nilaiMapel.reduce((sum, m) => sum + (m.nilaiAkhir || 0), 0);
                      const avg = rapor.nilaiMapel.length > 0 ? (totalNilai / rapor.nilaiMapel.length).toFixed(1) : '0';
                      const avgNum = Number(avg);
                      const overallPredikat = avgNum >= 88 ? 'A (Sangat Baik)' : avgNum >= 78 ? 'B (Baik)' : avgNum >= 68 ? 'C (Cukup)' : 'D (Perlu Bimbingan)';

                      return (
                        <tr key={rapor.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="py-3.5 px-4 font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900 dark:text-white leading-tight">
                              {rapor.siswaNama}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                              NISN: {rapor.nisn} • NIS: {rapor.nis}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-slate-800 dark:text-slate-200 block">{rapor.kelas}</span>
                            <span className="text-[10px] text-slate-400">{rapor.fase} • Kurikulum Merdeka</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-block font-mono font-bold text-sm px-2 py-0.5 rounded ${
                              avgNum >= 88 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                              avgNum >= 75 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                              'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              {avg}
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">{rapor.nilaiMapel.length} Mata Pelajaran</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{overallPredikat}</span>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-600 dark:text-slate-400">
                              <span title="Sakit">S: {rapor.presensi.sakit}</span>
                              <span>•</span>
                              <span title="Izin">I: {rapor.presensi.izin}</span>
                              <span>•</span>
                              <span title="Alpa / Tanpa Keterangan" className={rapor.presensi.tanpaKeterangan > 0 ? 'text-rose-500 font-bold' : ''}>
                                A: {rapor.presensi.tanpaKeterangan}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-center">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{rapor.status}</span>
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => setActivePrintRapor(rapor)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors shadow-sm cursor-pointer"
                                title="Lihat dan Cetak Lembar Rapor Resmi"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Cetak Rapor</span>
                              </button>

                              {currentRole !== 'siswa' && (
                                <button
                                  onClick={() => setEditingRapor(rapor)}
                                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
                                  title="Edit Nilai & Catatan Rapor"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
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
        </div>
      )}

      {/* SUBTAB 2: INPUT NILAI MASSAL PER MATA PELAJARAN */}
      {subTab === 'input_nilai' && currentRole !== 'siswa' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Pilih Kelas / Rombel:</label>
                <select
                  value={inputMassalKelas}
                  onChange={e => {
                    setInputMassalKelas(e.target.value);
                  }}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-semibold cursor-pointer"
                >
                  {availableKelasList.map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Mata Pelajaran:</label>
                <select
                  value={inputMassalMapel}
                  onChange={e => {
                    setInputMassalMapel(e.target.value);
                  }}
                  className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-semibold cursor-pointer"
                >
                  {mapelList.map(m => (
                    <option key={m.id} value={m.namaMapel}>{m.namaMapel}</option>
                  ))}
                </select>
              </div>

              <div className="self-end">
                <button
                  type="button"
                  onClick={handleInitMassalValues}
                  className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Muat Data Kelas
                </button>
              </div>
            </div>

            <div className="self-end">
              <button
                type="button"
                onClick={handleSaveMassalNilai}
                className="px-4 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Nilai Semua Siswa</span>
              </button>
            </div>
          </div>

          {/* Table Input Massal */}
          <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 font-bold uppercase text-[11px]">
                    <th className="py-3 px-4 w-12 text-center">No</th>
                    <th className="py-3 px-4 w-64">Nama Siswa</th>
                    <th className="py-3 px-4 w-28 text-center">Formatif (40%)</th>
                    <th className="py-3 px-4 w-28 text-center">Sumatif (60%)</th>
                    <th className="py-3 px-4 w-28 text-center">Nilai Akhir</th>
                    <th className="py-3 px-4">Deskripsi Capaian Kompetensi (Kurikulum Merdeka)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {siswaInMassalKelas.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-400">
                        Tidak ada siswa yang terdaftar di kelas {inputMassalKelas}.
                      </td>
                    </tr>
                  ) : (
                    siswaInMassalKelas.map((s, idx) => {
                      const current = massalNilaiState[s.id] || { formatif: 85, sumatif: 87, akhir: 86, capaian: `Menunjukkan penguasaan sangat baik dalam capaian pembelajaran ${inputMassalMapel}.` };
                      return (
                        <tr key={s.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                          <td className="py-3 px-4 text-center font-mono text-slate-400">{idx + 1}</td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 dark:text-white block">{s.nama}</span>
                            <span className="text-[11px] text-slate-400 font-mono">NISN: {s.nisn}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={current.formatif}
                              onChange={e => {
                                const val = Number(e.target.value);
                                const newAkhir = Math.round((val * 0.4) + (current.sumatif * 0.6));
                                setMassalNilaiState(prev => ({
                                  ...prev,
                                  [s.id]: {
                                    ...current,
                                    formatif: val,
                                    akhir: newAkhir
                                  }
                                }));
                              }}
                              className="w-20 text-center py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={current.sumatif}
                              onChange={e => {
                                const val = Number(e.target.value);
                                const newAkhir = Math.round((current.formatif * 0.4) + (val * 0.6));
                                setMassalNilaiState(prev => ({
                                  ...prev,
                                  [s.id]: {
                                    ...current,
                                    sumatif: val,
                                    akhir: newAkhir
                                  }
                                }));
                              }}
                              className="w-20 text-center py-1.5 px-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-mono font-bold text-slate-900 dark:text-white focus:outline-none focus:border-blue-500"
                            />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`font-mono font-extrabold text-sm px-2.5 py-1 rounded inline-block ${
                              current.akhir >= 85 ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' :
                              current.akhir >= 75 ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' :
                              'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                            }`}>
                              {current.akhir}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <input
                              type="text"
                              value={current.capaian}
                              onChange={e => {
                                const val = e.target.value;
                                setMassalNilaiState(prev => ({
                                  ...prev,
                                  [s.id]: {
                                    ...current,
                                    capaian: val
                                  }
                                }));
                              }}
                              className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:border-blue-500"
                              placeholder="Tuliskan capaian kompetensi..."
                            />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 3: LEGER NILAI & PERINGKAT KELAS */}
      {subTab === 'leger_nilai' && (
        <div className="space-y-4">
          <div className="p-4 bg-white dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-500 uppercase">Pilih Rombel / Kelas:</label>
              <select
                value={inputMassalKelas}
                onChange={e => setInputMassalKelas(e.target.value)}
                className="text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold cursor-pointer"
              >
                {availableKelasList.map(k => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowLegerPrintModal(true)}
              className="px-4 py-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Rekap Leger Nilai</span>
            </button>
          </div>

          {/* Leger Table */}
          <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/70 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px]">
                    <th className="py-3 px-3 text-center w-10">Rank</th>
                    <th className="py-3 px-3 w-48">Nama Siswa</th>
                    <th className="py-3 px-2 text-center">NISN</th>
                    {mapelList.map(m => (
                      <th key={m.id} className="py-3 px-2 text-center" title={m.namaMapel}>
                        {m.namaMapel.length > 8 ? `${m.namaMapel.substring(0, 6)}..` : m.namaMapel}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center bg-blue-50/50 dark:bg-blue-950/20 font-bold">Total</th>
                    <th className="py-3 px-3 text-center bg-emerald-50/50 dark:bg-emerald-950/20 font-bold">Rata-Rata</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {legerData.length === 0 ? (
                    <tr>
                      <td colSpan={mapelList.length + 5} className="py-12 text-center text-slate-400">
                        Tidak ada data siswa untuk kelas {inputMassalKelas}.
                      </td>
                    </tr>
                  ) : (
                    legerData.map((item) => (
                      <tr key={item.siswa.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-3 text-center font-bold">
                          {item.ranking <= 3 ? (
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-400 text-amber-950 font-bold text-xs shadow-sm">
                              {item.ranking}
                            </span>
                          ) : (
                            <span className="font-mono text-slate-500">{item.ranking}</span>
                          )}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-900 dark:text-white">
                          {item.siswa.nama}
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-[11px] text-slate-400">
                          {item.siswa.nisn}
                        </td>
                        {mapelList.map(m => {
                          const mapelItem = item.rapor.nilaiMapel.find(nm => nm.namaMapel === m.namaMapel);
                          const score = mapelItem?.nilaiAkhir ?? '-';
                          return (
                            <td key={m.id} className="py-3 px-2 text-center font-mono text-slate-700 dark:text-slate-300">
                              {score}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-center font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50/30 dark:bg-blue-950/10">
                          {item.totalNilai}
                        </td>
                        <td className="py-3 px-3 text-center font-mono font-extrabold text-emerald-700 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/10">
                          {item.rataRata}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 4: PENGATURAN & TITIMANGSA RAPOR */}
      {subTab === 'pengaturan_rapor' && (
        <div className="bg-white dark:bg-slate-900/60 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 max-w-2xl space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Format & Titimangsa Buku Rapor</h3>
            <p className="text-xs text-slate-500">Konfigurasi tanggal penerbitan, kepala sekolah, dan tanda tangan resmi pada lembar cetak rapor.</p>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Semester Aktif:</label>
                <select
                  value={selectedSemester}
                  onChange={e => setSelectedSemester(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 font-semibold text-slate-900 dark:text-white"
                >
                  <option value="Ganjil">Semester Ganjil (1)</option>
                  <option value="Genap">Semester Genap (2)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tahun Ajaran:</label>
                <input
                  type="text"
                  value={selectedTahunAjaran}
                  onChange={e => setSelectedTahunAjaran(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tanggal Titimangsa Rapor:</label>
                <input
                  type="date"
                  value={tanggalTitimangsa}
                  onChange={e => setTanggalTitimangsa(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Tempat Penerbitan:</label>
                <input
                  type="text"
                  value={tempatTitimangsa}
                  onChange={e => setTempatTitimangsa(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2.5 text-slate-900 dark:text-white font-semibold"
                  placeholder="cth: Jakarta Selatan"
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={tampilkanRanking}
                  onChange={e => setTampilkanRanking(e.target.checked)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-0 cursor-pointer"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Tampilkan Ranking Kelas pada Lembar Catatan Rapor Siswa
                </span>
              </label>
              <p className="text-[11px] text-slate-400 mt-1 pl-6">
                Sesuai panduan Kurikulum Merdeka, peringkat siswa umumnya ditampilkan pada Leger Guru, namun Anda dapat mengaktifkannya jika diperlukan sekolah.
              </p>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  showToast('Pengaturan format & titimangsa rapor berhasil disimpan!');
                }}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm transition-colors cursor-pointer"
              >
                Simpan Pengaturan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUBTAB 5: RAPOR TAHFIDZ AL-QUR'AN */}
      {subTab === 'rapor_tahfidz' && (
        <RaporTahfidzView
          raporTahfidzList={tahfidzList}
          setRaporTahfidzList={setTahfidzList}
          siswaList={siswaList}
          guruList={guruList}
          schoolSettings={schoolSettings}
          currentRole={currentRole}
          userEmail={userEmail}
          theme={theme}
        />
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: PREVIEW & CETAK RAPOR RESMI KEMDIKBUDRISTEK (A4 STANDAR) */}
      {/* ========================================================================= */}
      {activePrintRapor && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[150] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-5xl w-full p-4 sm:p-6 shadow-2xl space-y-5 my-6 max-h-[92vh] overflow-y-auto border border-slate-200">
            
            {/* Header Actions & Booklet Navigator */}
            <div className="border-b border-slate-200 pb-4 space-y-3 no-print">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-700 rounded-md uppercase">
                      Buku Rapor Lengkap Resmi
                    </span>
                    <span className="text-xs text-slate-500 font-mono">
                      NPSN: {schoolSettings?.npsn || '70048660'}
                    </span>
                  </div>
                  <h3 className="font-extrabold text-lg text-slate-900 mt-1">
                    Buku Rapor Siswa: {activePrintRapor.siswaNama}
                  </h3>
                  <p className="text-xs text-slate-500">
                    NISN: <span className="font-mono font-semibold">{activePrintRapor.nisn}</span> • NIS: <span className="font-mono font-semibold">{activePrintRapor.nis}</span> • Kelas: <span className="font-bold">{activePrintRapor.kelas}</span>
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Cetak Semua Halaman */}
                  <button
                    onClick={() => handleExecutePrintRapor(false)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-600/20 cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4" /> Cetak Buku Rapor Lengkap
                  </button>

                  {/* Cetak Halaman Aktif */}
                  {modalBookletTab !== 'semua' && (
                    <button
                      onClick={() => handleExecutePrintRapor(true)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-300 cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4 text-slate-600" /> Cetak Halaman Ini
                    </button>
                  )}

                  <button
                    onClick={() => setActivePrintRapor(null)}
                    className="p-2 hover:bg-slate-100 text-slate-500 rounded-xl cursor-pointer"
                    title="Tutup"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Navigation Page Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pt-2 pb-1 text-xs">
                {[
                  { id: 'semua', label: 'Buku Lengkap (Semua Halaman)' },
                  { id: 'cover', label: '1. Cover / Sampul' },
                  { id: 'sekolah', label: '2. Identitas Sekolah' },
                  { id: 'siswa', label: '3. Identitas Siswa' },
                  { id: 'nilai', label: '4. Capaian Nilai Belajar' },
                  { id: 'keluar', label: '5. Pindah Sekolah (Keluar)' },
                  { id: 'masuk', label: '6. Pindah Sekolah (Masuk)' }
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setModalBookletTab(p.id as any)}
                    className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      modalBookletTab === p.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Printable Paper Area (Container for all pages) */}
            <div ref={printContainerRef} className="bg-white p-4 sm:p-6 border border-slate-300 rounded-xl text-black font-sans leading-relaxed text-xs shadow-inner">
              
              {/* ========================================================= */}
              {/* HALAMAN 1: COVER / SAMPUL RAPOR */}
              {/* ========================================================= */}
              {(modalBookletTab === 'semua' || modalBookletTab === 'cover') && (
                <div data-booklet-page="cover" className="a4-sheet bg-white p-8 flex flex-col items-center justify-between min-h-[255mm] text-center">
                  
                  {/* Bagian Atas: Lambang Kota Depok & Judul SMP */}
                  <div className="flex flex-col items-center w-full pt-4">
                    <KotaDepokLogo className="w-28 sm:w-32 h-auto mb-6" />

                    <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black font-sans mb-1">
                      SEKOLAH MENENGAH PERTAMA
                    </h1>
                    <h2 className="text-lg sm:text-xl font-black text-black font-sans tracking-wide">
                      ( SMP )
                    </h2>
                  </div>

                  {/* Bagian Tengah: Logo Al Fakhir & Kotak Nama Siswa */}
                  <div className="flex flex-col items-center w-full my-8">
                    <AlFakhirLogo className="w-32 sm:w-36 h-auto mb-10" />

                    <div className="w-full max-w-[480px] space-y-5">
                      <div>
                        <div className="text-xs font-bold text-black uppercase tracking-wide mb-1.5">
                          Nama Peserta Didik
                        </div>
                        <div className="border-2 border-black py-2.5 px-6 font-black text-sm sm:text-base tracking-wider uppercase text-black bg-white">
                          {activePrintRapor.siswaNama}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs font-bold text-black uppercase tracking-wide mb-1.5">
                          NISN / NIS
                        </div>
                        <div className="border-2 border-black py-2 px-6 font-bold text-sm tracking-widest text-black font-mono bg-white">
                          {activePrintRapor.nisn} / {activePrintRapor.nis}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bagian Bawah: Kementerian Pendidikan */}
                  <div className="w-full pb-6 text-center">
                    <div className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-black font-sans">
                      KEMENTERIAN PENDIDIKAN DASAR DAN MENENGAH
                    </div>
                    <div className="text-sm sm:text-base font-extrabold uppercase tracking-wider text-black font-sans mt-0.5">
                      REPUBLIK INDONESIA
                    </div>
                  </div>

                </div>
              )}

              {/* Page Divider for Preview */}
              {modalBookletTab === 'semua' && (
                <div className="no-print my-8 border-t-2 border-dashed border-slate-300 relative text-center">
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider relative -top-3">
                    Batas Halaman 1 (Cover) & Halaman 2
                  </span>
                </div>
              )}

              {/* ========================================================= */}
              {/* HALAMAN 2: IDENTITAS SATUAN PENDIDIKAN (SEKOLAH) */}
              {/* ========================================================= */}
              {(modalBookletTab === 'semua' || modalBookletTab === 'sekolah') && (
                <div data-booklet-page="sekolah" className="a4-sheet bg-white p-8 flex flex-col justify-between min-h-[255mm]">
                  
                  {/* Header */}
                  <div className="text-center pt-8 mb-16">
                    <h1 className="text-xl font-black uppercase tracking-wider text-black font-sans">
                      SEKOLAH MENENGAH PERTAMA
                    </h1>
                    <h2 className="text-lg font-black text-black font-sans tracking-wide">
                      ( SMP )
                    </h2>
                  </div>

                  {/* Tabel Data Identitas Sekolah */}
                  <div className="max-w-[580px] mx-auto w-full text-xs font-sans text-black leading-relaxed space-y-4 my-auto">
                    <div className="flex">
                      <span className="w-48 font-bold">Nama Sekolah</span>
                      <span className="font-bold">: {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">NPSN</span>
                      <span className="font-mono font-bold">: {schoolSettings?.npsn || '70048660'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">NIS/NSS/NDS</span>
                      <span>: -</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">Alamat Sekolah</span>
                      <span>: {schoolSettings?.alamat || 'Kp. Kekupu RT. 003 RW. 006'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">Kelurahan / Desa</span>
                      <span>: {schoolSettings?.kelurahan || 'Pasir Putih'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">Kecamatan</span>
                      <span>: {schoolSettings?.kecamatan || 'Kec. Sawangan'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">Kota/Kabupaten</span>
                      <span>: {schoolSettings?.kotaKabupaten || 'Kota Depok'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">Provinsi</span>
                      <span>: {schoolSettings?.provinsi || 'Prov. Jawa Barat'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">Website</span>
                      <span>: {schoolSettings?.website || 'http://www.smpialfakhir.sch.id/'}</span>
                    </div>

                    <div className="flex">
                      <span className="w-48 font-bold">E-mail</span>
                      <span>: {schoolSettings?.email || 'smpialfakhir@gmail.com'}</span>
                    </div>
                  </div>

                  <div className="pb-8"></div>
                </div>
              )}

              {/* Page Divider for Preview */}
              {modalBookletTab === 'semua' && (
                <div className="no-print my-8 border-t-2 border-dashed border-slate-300 relative text-center">
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider relative -top-3">
                    Batas Halaman 2 (Identitas Sekolah) & Halaman 3
                  </span>
                </div>
              )}

              {/* ========================================================= */}
              {/* HALAMAN 3: IDENTITAS PESERTA DIDIK (17 BUTIR LENGKAP) */}
              {/* ========================================================= */}
              {(modalBookletTab === 'semua' || modalBookletTab === 'siswa') && (
                <div data-booklet-page="siswa" className="a4-sheet bg-white p-8 flex flex-col justify-between min-h-[255mm]">
                  
                  <div>
                    {/* Header Judul */}
                    <div className="text-center mb-6">
                      <h2 className="text-sm font-black uppercase tracking-wider text-black font-sans">
                        IDENTITAS PESERTA DIDIK
                      </h2>
                    </div>

                    {/* Daftar 17 Poin Data Lengkap Peserta Didik */}
                    <div className="space-y-2 text-[11px] text-black font-sans leading-snug">
                      <div className="flex">
                        <span className="w-6 font-semibold">1.</span>
                        <span className="w-56 font-semibold">Nama Lengkap Peserta Didik</span>
                        <span className="font-bold">: {activePrintRapor.siswaNama}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">2.</span>
                        <span className="w-56 font-semibold">Nomor Induk/NISN</span>
                        <span className="font-mono">: {activePrintRapor.nis} / {activePrintRapor.nisn}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">3.</span>
                        <span className="w-56 font-semibold">Tempat ,Tanggal Lahir</span>
                        <span>: {activeSiswaObj?.tempatLahir || 'JAKARTA'}, {formatTanggalLengkap(activeSiswaObj?.tanggalLahir || '2012-10-23')}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">4.</span>
                        <span className="w-56 font-semibold">Jenis Kelamin</span>
                        <span>: {activeSiswaObj?.jenisKelamin === 'L' ? 'Laki-laki' : 'Perempuan'}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">5.</span>
                        <span className="w-56 font-semibold">Agama</span>
                        <span>: {activeSiswaObj?.agama || 'Islam'}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">6.</span>
                        <span className="w-56 font-semibold">Status dalam Keluarga</span>
                        <span>: {activeSiswaObj?.statusKeluarga || 'Anak Kandung'}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">7.</span>
                        <span className="w-56 font-semibold">Anak ke</span>
                        <span>: {activeSiswaObj?.anakKe || 1}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">8.</span>
                        <span className="w-56 font-semibold">Alamat Peserta Didik</span>
                        <span className="flex-1">: {activeSiswaObj?.alamat || 'Jl. Raya Pasir Putih Perum Bumi Agung Residence Blok B No. 2 , Sawangan , Depok'}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">9.</span>
                        <span className="w-56 font-semibold">Nomor Telepon Rumah</span>
                        <span>: {activeSiswaObj?.teleponRumah || activeSiswaObj?.teleponWali || '082129152188'}</span>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">10.</span>
                        <span className="w-56 font-semibold">Sekolah Asal</span>
                        <span>: {activeSiswaObj?.asalSekolah || 'SD INSAN NURUL FIKRI'}</span>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex">
                          <span className="w-6 font-semibold">11.</span>
                          <span className="w-56 font-semibold">Diterima di sekolah ini</span>
                          <span>:</span>
                        </div>
                        <div className="pl-6 space-y-1 mt-0.5">
                          <div className="flex">
                            <span className="w-56 pl-4 text-slate-800">Di kelas</span>
                            <span>: {activeSiswaObj?.diterimaDiKelas || activePrintRapor.kelas.split(' - ')[0] || 'VII'}</span>
                          </div>
                          <div className="flex">
                            <span className="w-56 pl-4 text-slate-800">Pada tanggal</span>
                            <span>: {activeSiswaObj?.diterimaTanggal || '01 Juli 2025'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex">
                          <span className="w-6 font-semibold">12.</span>
                          <span className="w-56 font-semibold">Nama Orang Tua</span>
                          <span>:</span>
                        </div>
                        <div className="pl-6 space-y-1 mt-0.5">
                          <div className="flex">
                            <span className="w-56 pl-4 text-slate-800">a. Ayah</span>
                            <span className="font-semibold">: {activeSiswaObj?.namaAyah || 'HADI MULYONO'}</span>
                          </div>
                          <div className="flex">
                            <span className="w-56 pl-4 text-slate-800">b. Ibu</span>
                            <span className="font-semibold">: {activeSiswaObj?.namaIbu || 'USWATUN KHASANAH'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex">
                          <span className="w-6 font-semibold">13.</span>
                          <span className="w-56 font-semibold">Alamat Orang Tua</span>
                          <span className="flex-1">: {activeSiswaObj?.alamat || 'Jl. Raya Pasir Putih Perum Bumi Agung Residence Blok B No. 2, Sawangan, Depok'}</span>
                        </div>
                        <div className="pl-6 mt-0.5">
                          <div className="flex">
                            <span className="w-56 pl-4 text-slate-800">Nomor Telepon Rumah</span>
                            <span>: {activeSiswaObj?.teleponRumah || activeSiswaObj?.teleponWali || '082129152188'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex">
                          <span className="w-6 font-semibold">14.</span>
                          <span className="w-56 font-semibold">Pekerjaan Orang Tua</span>
                          <span>:</span>
                        </div>
                        <div className="pl-6 space-y-1 mt-0.5">
                          <div className="flex">
                            <span className="w-56 pl-4 text-slate-800">a. Ayah</span>
                            <span>: {activeSiswaObj?.pekerjaanAyah || 'Karyawan Swasta'}</span>
                          </div>
                          <div className="flex">
                            <span className="w-56 pl-4 text-slate-800">b. Ibu</span>
                            <span>: {activeSiswaObj?.pekerjaanIbu || 'Wiraswasta'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">15.</span>
                        <span className="w-56 font-semibold">Nama Wali Siswa</span>
                        <span>: {activeSiswaObj?.namaWali && activeSiswaObj?.namaWali !== activeSiswaObj?.namaAyah ? activeSiswaObj.namaWali : '-'}</span>
                      </div>

                      <div className="flex flex-col">
                        <div className="flex">
                          <span className="w-6 font-semibold">16.</span>
                          <span className="w-56 font-semibold">Alamat Wali Peserta Didik</span>
                          <span>: {activeSiswaObj?.alamatWali || '-'}</span>
                        </div>
                        <div className="pl-6 mt-0.5">
                          <div className="flex">
                            <span className="w-56 pl-4 text-slate-800">Nomor Telepon Rumah</span>
                            <span>: {activeSiswaObj?.teleponWali && activeSiswaObj?.namaWali !== activeSiswaObj?.namaAyah ? activeSiswaObj.teleponWali : '-'}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex">
                        <span className="w-6 font-semibold">17.</span>
                        <span className="w-56 font-semibold">Pekerjaan Wali Peserta Didik</span>
                        <span>: {activeSiswaObj?.pekerjaanWali || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Foto 3x4 & Tanda Tangan Kepala Sekolah */}
                  <div className="grid grid-cols-2 items-end pt-6 mt-6">
                    {/* Kotak Pas Foto 3x4 */}
                    <div className="flex justify-center">
                      <div className="w-24 h-32 border border-slate-700 flex flex-col items-center justify-center text-[10px] text-slate-500 bg-slate-50 relative overflow-hidden">
                        {activeSiswaObj?.fotoUrl ? (
                          <img 
                            src={activeSiswaObj.fotoUrl} 
                            alt="Foto Siswa" 
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-center p-2">
                            <div className="w-8 h-8 rounded-full bg-slate-300 mx-auto mb-1"></div>
                            <span>Pas Foto<br/>3 x 4</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tanda Tangan Kepala Sekolah */}
                    <div className="text-left pl-8 text-xs font-sans">
                      <div>Kota Depok, {activeSiswaObj?.diterimaTanggal || '01 Juli 2025'}</div>
                      <div className="font-semibold">Kepala Sekolah</div>
                      <div className="h-16"></div>
                      <div className="font-bold underline">{schoolSettings?.kepalaSekolah || 'Nurhidayati'}</div>
                      <div className="text-[11px] text-slate-700">NIP. {schoolSettings?.nipKepalaSekolah !== '-' ? schoolSettings?.nipKepalaSekolah : ''}</div>
                    </div>
                  </div>

                </div>
              )}

              {/* Page Divider for Preview */}
              {modalBookletTab === 'semua' && (
                <div className="no-print my-8 border-t-2 border-dashed border-slate-300 relative text-center">
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider relative -top-3">
                    Batas Halaman 3 (Identitas Siswa) & Halaman 4 (Nilai Belajar)
                  </span>
                </div>
              )}

              {/* ========================================================= */}
              {/* HALAMAN 4: LAPORAN CAPAIAN HASIL BELAJAR (NILAI AKADEMIK) */}
              {/* ========================================================= */}
              {(modalBookletTab === 'semua' || modalBookletTab === 'nilai') && (
                <div data-booklet-page="nilai" className="a4-sheet bg-white p-6 flex flex-col justify-between min-h-[255mm]">
                  
                  <div>
                    {/* Kop Surat Sekolah */}
                    <div className="flex items-center gap-4 border-b-2 border-black pb-3 mb-4">
                      <div className="w-16 h-16 shrink-0 flex items-center justify-center">
                        <AlFakhirLogo className="w-16 h-auto" />
                      </div>
                      <div className="flex-1 text-center">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-black">
                          YAYASAN PENDIDIKAN ISLAM MODERN AL FAKHÍR
                        </div>
                        <h1 className="text-lg font-black uppercase text-black tracking-tight font-sans">
                          {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}
                        </h1>
                        <div className="text-[10px] text-black font-sans leading-tight">
                          {schoolSettings?.alamat || 'Kp. Kekupu RT. 003 RW. 006, Pasir Putih'}, {schoolSettings?.kotaKabupaten || 'Kota Depok'}, {schoolSettings?.provinsi || 'Prov. Jawa Barat'}
                        </div>
                        <div className="text-[9px] text-black font-sans mt-0.5">
                          NPSN: {schoolSettings?.npsn || '70048660'} • Akreditasi: {schoolSettings?.akreditasi || 'A (Unggul)'} • Email: {schoolSettings?.email || 'smpialfakhir@gmail.com'}
                        </div>
                      </div>
                    </div>

                    {/* Judul Rapor */}
                    <div className="text-center mb-4 font-sans">
                      <h2 className="text-sm font-extrabold uppercase tracking-wide underline">
                        LAPORAN HASIL BELAJAR (RAPOR PESERTA DIDIK)
                      </h2>
                      <div className="text-[10px] font-semibold text-black mt-0.5">
                        KURIKULUM MERDEKA • {activePrintRapor.fase.toUpperCase()}
                      </div>
                    </div>

                    {/* Data Identitas Peserta Didik */}
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[11px] mb-4 bg-slate-50 p-2.5 rounded border border-slate-300 font-sans">
                      <div className="flex">
                        <span className="w-36 font-semibold">Nama Peserta Didik</span>
                        <span className="font-bold">: {activePrintRapor.siswaNama}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-semibold">Kelas / Rombel</span>
                        <span className="font-bold">: {activePrintRapor.kelas}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 font-semibold">NISN / NIS</span>
                        <span className="font-mono">: {activePrintRapor.nisn} / {activePrintRapor.nis}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-semibold">Semester</span>
                        <span>: {activePrintRapor.semester}</span>
                      </div>
                      <div className="flex">
                        <span className="w-36 font-semibold">Nama Sekolah</span>
                        <span>: {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}</span>
                      </div>
                      <div className="flex">
                        <span className="w-32 font-semibold">Tahun Ajaran</span>
                        <span>: {activePrintRapor.tahunAjaran}</span>
                      </div>
                    </div>

                    {/* Tabel A: Nilai Akademik & Capaian Pembelajaran */}
                    <div className="mb-4">
                      <h3 className="font-sans font-bold text-[11px] text-black uppercase mb-1">
                        A. NILAI AKADEMIK & CAPAIAN KOMPETENSI
                      </h3>
                      <table className="w-full text-left border-collapse border border-black text-[10px] font-sans">
                        <thead>
                          <tr className="bg-slate-100 font-bold text-center">
                            <th className="border border-black p-1.5 w-8">No</th>
                            <th className="border border-black p-1.5 w-44 text-left">Mata Pelajaran</th>
                            <th className="border border-black p-1.5 w-14">Nilai Akhir</th>
                            <th className="border border-black p-1.5 w-12">Predikat</th>
                            <th className="border border-black p-1.5 text-left">Capaian Kompetensi (Deskripsi Pembelajaran)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activePrintRapor.nilaiMapel.map((m, i) => (
                            <tr key={m.mapelId}>
                              <td className="border border-black p-1.5 text-center font-mono">{i + 1}</td>
                              <td className="border border-black p-1.5 font-semibold">{m.namaMapel}</td>
                              <td className="border border-black p-1.5 text-center font-mono font-bold">{m.nilaiAkhir}</td>
                              <td className="border border-black p-1.5 text-center font-bold">{m.predikat}</td>
                              <td className="border border-black p-1.5 leading-snug">{m.capaianKompetensi}</td>
                            </tr>
                          ))}
                          <tr className="bg-slate-50 font-bold">
                            <td colSpan={2} className="border border-black p-1.5 text-center uppercase">
                              Rata-Rata Nilai
                            </td>
                            <td className="border border-black p-1.5 text-center font-mono font-extrabold">
                              {(activePrintRapor.nilaiMapel.reduce((sum, m) => sum + m.nilaiAkhir, 0) / (activePrintRapor.nilaiMapel.length || 1)).toFixed(1)}
                            </td>
                            <td colSpan={2} className="border border-black p-1.5 text-black font-normal">
                              Rata-rata seluruh perolehan mata pelajaran
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Grid: Tabel B (Ekstrakurikuler) & Tabel C (Presensi) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 font-sans text-[10px]">
                      <div>
                        <h3 className="font-bold text-[11px] text-black uppercase mb-1">
                          B. KEGIATAN EKSTRAKURIKULER
                        </h3>
                        <table className="w-full border-collapse border border-black">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-center">
                              <th className="border border-black p-1.5 w-8">No</th>
                              <th className="border border-black p-1.5 text-left">Nama Ekstrakurikuler</th>
                              <th className="border border-black p-1.5 w-20">Predikat</th>
                              <th className="border border-black p-1.5 text-left">Keterangan</th>
                            </tr>
                          </thead>
                          <tbody>
                            {activePrintRapor.nilaiEkskul.map((e, idx) => (
                              <tr key={idx}>
                                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                                <td className="border border-black p-1.5 font-semibold">{e.namaEkskul}</td>
                                <td className="border border-black p-1.5 text-center font-bold">{e.predikat}</td>
                                <td className="border border-black p-1.5">{e.keterangan}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      <div>
                        <h3 className="font-bold text-[11px] text-black uppercase mb-1">
                          C. KETIDAKHADIRAN (PRESENSI)
                        </h3>
                        <table className="w-full border-collapse border border-black">
                          <thead>
                            <tr className="bg-slate-100 font-bold text-center">
                              <th className="border border-black p-1.5 w-8">No</th>
                              <th className="border border-black p-1.5 text-left">Alasan Ketidakhadiran</th>
                              <th className="border border-black p-1.5 w-20">Jumlah</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="border border-black p-1.5 text-center font-mono">1</td>
                              <td className="border border-black p-1.5">Sakit</td>
                              <td className="border border-black p-1.5 text-center font-mono font-bold">{activePrintRapor.presensi.sakit} hari</td>
                            </tr>
                            <tr>
                              <td className="border border-black p-1.5 text-center font-mono">2</td>
                              <td className="border border-black p-1.5">Izin</td>
                              <td className="border border-black p-1.5 text-center font-mono font-bold">{activePrintRapor.presensi.izin} hari</td>
                            </tr>
                            <tr>
                              <td className="border border-black p-1.5 text-center font-mono">3</td>
                              <td className="border border-black p-1.5">Tanpa Keterangan (Alpha)</td>
                              <td className="border border-black p-1.5 text-center font-mono font-bold">{activePrintRapor.presensi.tanpaKeterangan} hari</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* D. Catatan Wali Kelas */}
                    <div className="mb-4 font-sans text-[10px]">
                      <div className="border border-black p-2.5 rounded">
                        <div className="font-bold text-[11px] text-black uppercase mb-0.5">
                          D. CATATAN PERKEMBANGAN & MOTIVASI WALI KELAS:
                        </div>
                        <p className="italic text-black leading-relaxed">
                          "{activePrintRapor.catatanWaliKelas}"
                        </p>
                      </div>
                    </div>

                    {/* Keputusan Kenaikan */}
                    <div className="mb-4 font-sans text-[10px] p-2 border border-black rounded text-center font-bold bg-slate-50">
                      Keputusan: Berdasarkan hasil penilaian, peserta didik dinyatakan: <span className="uppercase underline text-black">{activePrintRapor.statusKenaikan || 'Naik ke Kelas Berikutnya'}</span>
                    </div>
                  </div>

                  {/* Titimangsa & Tanda Tangan */}
                  <div className="font-sans text-[10px] pt-1">
                    <div className="flex justify-end mb-3">
                      <div>
                        {activePrintRapor.tempatPenerbitan || 'Kota Depok'}, {new Date(activePrintRapor.tanggalRapor).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </div>
                    </div>

                    <div className="grid grid-cols-3 text-center gap-4">
                      <div>
                        <div>Mengetahui,</div>
                        <div className="font-bold">Orang Tua / Wali Murid,</div>
                        <div className="h-14"></div>
                        <div className="border-b border-black w-36 mx-auto"></div>
                        <div className="text-[9px] text-black mt-0.5">( ....................................... )</div>
                      </div>

                      <div className="flex flex-col items-center justify-center">
                        <div className="p-1 border border-black rounded bg-white shadow-sm inline-block">
                          <div className="w-12 h-12 bg-black text-white flex flex-col items-center justify-center text-[6px] text-center font-mono font-bold p-1">
                            <span>RESMI</span>
                            <span>AL-FAKHIR</span>
                            <span>VERIFIED</span>
                          </div>
                        </div>
                        <span className="text-[8px] text-black mt-1 font-mono">Dokumen Sah Digital</span>
                      </div>

                      <div>
                        <div>Wali Kelas,</div>
                        <div className="font-bold">{activePrintRapor.kelas}</div>
                        <div className="h-14"></div>
                        <div className="font-bold underline">{activePrintRapor.waliKelasNama}</div>
                        <div className="text-[9px] text-black font-mono">NIP. {activePrintRapor.waliKelasNip}</div>
                      </div>
                    </div>

                    <div className="text-center mt-4">
                      <div>Mengetahui,</div>
                      <div className="font-bold">Kepala Sekolah {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}</div>
                      <div className="h-12"></div>
                      <div className="font-bold underline">{activePrintRapor.kepalaSekolahNama}</div>
                      <div className="text-[9px] text-black font-mono">NIP. {activePrintRapor.kepalaSekolahNip !== '-' ? activePrintRapor.kepalaSekolahNip : ''}</div>
                    </div>
                  </div>

                </div>
              )}

              {/* Page Divider for Preview */}
              {modalBookletTab === 'semua' && (
                <div className="no-print my-8 border-t-2 border-dashed border-slate-300 relative text-center">
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider relative -top-3">
                    Batas Halaman 4 (Nilai Belajar) & Halaman 5 (Pindah Sekolah Keluar)
                  </span>
                </div>
              )}

              {/* ========================================================= */}
              {/* HALAMAN 5: KETERANGAN PINDAH SEKOLAH (KELUAR) */}
              {/* ========================================================= */}
              {(modalBookletTab === 'semua' || modalBookletTab === 'keluar') && (
                <div data-booklet-page="keluar" className="a4-sheet bg-white p-8 flex flex-col justify-between min-h-[255mm]">
                  
                  <div>
                    <div className="text-center mb-6">
                      <h2 className="text-sm font-black uppercase tracking-wider text-black font-sans">
                        KETERANGAN PINDAH SEKOLAH
                      </h2>
                    </div>

                    <div className="text-xs font-sans text-black mb-4 flex items-center">
                      <span className="font-semibold w-40">Nama Peserta Didik</span>
                      <span>: {activePrintRapor.siswaNama}</span>
                    </div>

                    <div className="text-center font-bold text-xs uppercase tracking-wide bg-slate-100 p-2 border border-black border-b-0">
                      KELUAR
                    </div>

                    <table className="w-full border-collapse border border-black text-[11px] font-sans">
                      <thead>
                        <tr className="bg-slate-50 font-bold text-center">
                          <th className="border border-black p-2 w-28">Tanggal</th>
                          <th className="border border-black p-2 w-28">Kelas yang ditinggalkan</th>
                          <th className="border border-black p-2">Sebab-sebab Keluar atau Atas Permintaan (Tertulis)</th>
                          <th className="border border-black p-2 w-64">Tanda Tangan Kepala Sekolah, Stempel Sekolah, dan Tanda Tangan Orang Tua/Wali</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((row) => (
                          <tr key={row} className="h-44">
                            <td className="border border-black p-2 align-top text-center"></td>
                            <td className="border border-black p-2 align-top text-center"></td>
                            <td className="border border-black p-2 align-top"></td>
                            <td className="border border-black p-2 align-top space-y-3">
                              <div className="text-[10px]">
                                <div>.............................,...........</div>
                                <div className="font-semibold">Kepala Sekolah,</div>
                                <div className="h-10"></div>
                                <div className="border-b border-dotted border-black w-48"></div>
                                <div>NIP.</div>
                              </div>
                              <div className="text-[10px] pt-1">
                                <div className="font-semibold">Orang Tua/Wali,</div>
                                <div className="h-10"></div>
                                <div className="border-b border-dotted border-black w-48"></div>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pb-4"></div>
                </div>
              )}

              {/* Page Divider for Preview */}
              {modalBookletTab === 'semua' && (
                <div className="no-print my-8 border-t-2 border-dashed border-slate-300 relative text-center">
                  <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider relative -top-3">
                    Batas Halaman 5 & Halaman 6 (Pindah Sekolah Masuk)
                  </span>
                </div>
              )}

              {/* ========================================================= */}
              {/* HALAMAN 6: KETERANGAN PINDAH SEKOLAH (MASUK) */}
              {/* ========================================================= */}
              {(modalBookletTab === 'semua' || modalBookletTab === 'masuk') && (
                <div data-booklet-page="masuk" className="a4-sheet bg-white p-8 flex flex-col justify-between min-h-[255mm]">
                  
                  <div>
                    <div className="text-center mb-6">
                      <h2 className="text-sm font-black uppercase tracking-wider text-black font-sans">
                        KETERANGAN PINDAH SEKOLAH
                      </h2>
                    </div>

                    <div className="text-xs font-sans text-black mb-4 flex items-center">
                      <span className="font-semibold w-40">Nama Peserta Didik</span>
                      <span>: {activePrintRapor.siswaNama}</span>
                    </div>

                    <table className="w-full border-collapse border border-black text-[11px] font-sans">
                      <thead>
                        <tr className="bg-slate-100 font-bold text-center">
                          <th className="border border-black p-2 w-12">NO</th>
                          <th className="border border-black p-2 text-center" colSpan={2}>MASUK</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[1, 2, 3].map((num) => (
                          <tr key={num} className="h-44">
                            <td className="border border-black p-2 text-center align-top font-bold">
                              {num}.
                            </td>
                            <td className="border border-black p-3 align-top space-y-2.5 w-80">
                              <div className="flex items-center">
                                <span className="w-6">1.</span>
                                <span className="w-32">Nama Siswa</span>
                                <span className="border-b border-black flex-1 inline-block h-4"></span>
                              </div>
                              <div className="flex items-center">
                                <span className="w-6">2.</span>
                                <span className="w-32">Nomor Induk</span>
                                <span className="border-b border-black flex-1 inline-block h-4"></span>
                              </div>
                              <div className="flex items-center">
                                <span className="w-6">3.</span>
                                <span className="w-32">Nama Sekolah</span>
                                <span className="border-b border-black flex-1 inline-block h-4"></span>
                              </div>
                              <div>
                                <div className="flex items-center">
                                  <span className="w-6">4.</span>
                                  <span className="flex-1">Masuk di Sekolah ini:</span>
                                </div>
                                <div className="pl-6 space-y-2 mt-1">
                                  <div className="flex items-center">
                                    <span className="w-28">a. Tanggal</span>
                                    <span className="border-b border-black flex-1 inline-block h-4"></span>
                                  </div>
                                  <div className="flex items-center">
                                    <span className="w-28">b. Di Kelas</span>
                                    <span className="border-b border-black flex-1 inline-block h-4"></span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center">
                                <span className="w-6">5.</span>
                                <span className="w-32">Tahun Ajaran</span>
                                <span className="border-b border-black flex-1 inline-block h-4"></span>
                              </div>
                            </td>
                            <td className="border border-black p-3 align-top w-56 text-[10px]">
                              <div>.............................,...........</div>
                              <div className="font-semibold">Kepala Sekolah,</div>
                              <div className="h-20"></div>
                              <div className="border-b border-dotted border-black w-44"></div>
                              <div className="mt-1">NIP.</div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pb-4"></div>
                </div>
              )}

            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT NILAI & CATATAN RAPOR INDIVIDU */}
      {/* ========================================================================= */}
      {editingRapor && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-2xl max-w-3xl w-full p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
            
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Edit Buku Rapor Siswa
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {editingRapor.siswaNama} • {editingRapor.kelas} • NISN: {editingRapor.nisn}
                </p>
              </div>
              <button
                onClick={() => setEditingRapor(null)}
                className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Presensi */}
              <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700">
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-2">Presensi Ketidakhadiran (Hari):</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Sakit:</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRapor.presensi.sakit}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRapor({
                          ...editingRapor,
                          presensi: { ...editingRapor.presensi, sakit: val }
                        });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Izin:</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRapor.presensi.izin}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRapor({
                          ...editingRapor,
                          presensi: { ...editingRapor.presensi, izin: val }
                        });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-500 block mb-1">Tanpa Keterangan (Alpha):</label>
                    <input
                      type="number"
                      min="0"
                      value={editingRapor.presensi.tanpaKeterangan}
                      onChange={e => {
                        const val = Number(e.target.value);
                        setEditingRapor({
                          ...editingRapor,
                          presensi: { ...editingRapor.presensi, tanpaKeterangan: val }
                        });
                      }}
                      className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* Tabel Nilai Mapel */}
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-1.5">Nilai Mata Pelajaran:</span>
                <div className="max-h-60 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold sticky top-0">
                      <tr>
                        <th className="p-2.5">Mata Pelajaran</th>
                        <th className="p-2.5 w-24 text-center">Formatif</th>
                        <th className="p-2.5 w-24 text-center">Sumatif</th>
                        <th className="p-2.5 w-24 text-center">Nilai Akhir</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {editingRapor.nilaiMapel.map((m, idx) => (
                        <tr key={m.mapelId}>
                          <td className="p-2.5 font-semibold">{m.namaMapel}</td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={m.nilaiFormatif}
                              onChange={e => {
                                const val = Number(e.target.value);
                                const newAkhir = Math.round((val + m.nilaiSumatif) / 2);
                                const updatedMapel = [...editingRapor.nilaiMapel];
                                updatedMapel[idx] = {
                                  ...m,
                                  nilaiFormatif: val,
                                  nilaiAkhir: newAkhir,
                                  predikat: (newAkhir >= 88 ? 'A' : newAkhir >= 78 ? 'B' : newAkhir >= 68 ? 'C' : 'D') as any
                                };
                                setEditingRapor({ ...editingRapor, nilaiMapel: updatedMapel });
                              }}
                              className="w-16 p-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={m.nilaiSumatif}
                              onChange={e => {
                                const val = Number(e.target.value);
                                const newAkhir = Math.round((m.nilaiFormatif + val) / 2);
                                const updatedMapel = [...editingRapor.nilaiMapel];
                                updatedMapel[idx] = {
                                  ...m,
                                  nilaiSumatif: val,
                                  nilaiAkhir: newAkhir,
                                  predikat: (newAkhir >= 88 ? 'A' : newAkhir >= 78 ? 'B' : newAkhir >= 68 ? 'C' : 'D') as any
                                };
                                setEditingRapor({ ...editingRapor, nilaiMapel: updatedMapel });
                              }}
                              className="w-16 p-1 text-center bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded"
                            />
                          </td>
                          <td className="p-2.5 text-center font-mono font-bold text-blue-600">
                            {m.nilaiAkhir}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Catatan Wali Kelas */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Catatan & Motivasi Wali Kelas:</label>
                <textarea
                  rows={3}
                  value={editingRapor.catatanWaliKelas}
                  onChange={e => setEditingRapor({ ...editingRapor, catatanWaliKelas: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  placeholder="Tuliskan catatan apresiasi dan motivasi bagi siswa..."
                />
              </div>

              {/* Projek P5 */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Capaian Projek P5 (Profil Pelajar Pancasila):</label>
                <textarea
                  rows={2}
                  value={editingRapor.projekPancasila || ''}
                  onChange={e => setEditingRapor({ ...editingRapor, projekPancasila: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white"
                  placeholder="Uraikan capaian projek penguatan profil pelajar pancasila..."
                />
              </div>

              {/* Keputusan Kenaikan */}
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">Status Kenaikan / Kelulusan:</label>
                <select
                  value={editingRapor.statusKenaikan || 'Naik ke Kelas Berikutnya'}
                  onChange={e => setEditingRapor({ ...editingRapor, statusKenaikan: e.target.value as any })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold"
                >
                  <option value="Naik ke Kelas Berikutnya">Naik ke Kelas Berikutnya</option>
                  <option value="Lulus">Lulus</option>
                  <option value="Tinggal di Kelas">Tinggal di Kelas</option>
                  <option value="Sedang Berjalan">Sedang Berjalan</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingRapor(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditedRapor}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" /> Simpan Perubahan
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: CETAK LEGER KELAS PRINT PREVIEW */}
      {/* ========================================================================= */}
      {showLegerPrintModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[150] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl max-w-5xl w-full p-6 shadow-2xl space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Leger Nilai & Rekapitulasi Hasil Belajar</h3>
                <p className="text-xs text-slate-500">Kelas: {inputMassalKelas} • Semester {selectedSemester} • Tahun Ajaran {selectedTahunAjaran}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExecutePrintLeger}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
                >
                  <Printer className="w-4 h-4" /> Cetak Leger
                </button>
                <button
                  onClick={() => setShowLegerPrintModal(false)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div ref={legerPrintRef} className="p-6 bg-white border border-slate-200 rounded-xl text-xs font-sans">
              <div className="text-center mb-4">
                <h2 className="text-sm font-bold uppercase">{schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHÍR'}</h2>
                <h3 className="text-xs font-bold uppercase underline">LEGER NILAI HASIL BELAJAR SISWA</h3>
                <div className="text-[10px] text-slate-600 mt-0.5">
                  Kelas: {inputMassalKelas} | Semester: {selectedSemester} | Tahun Ajaran: {selectedTahunAjaran}
                </div>
              </div>

              <table className="w-full border-collapse border border-slate-400 text-[10px]">
                <thead>
                  <tr className="bg-slate-100 font-bold text-center">
                    <th className="border border-slate-400 p-1.5 w-8">Rank</th>
                    <th className="border border-slate-400 p-1.5 w-48 text-left">Nama Siswa</th>
                    <th className="border border-slate-400 p-1.5 w-20">NISN</th>
                    {mapelList.map(m => (
                      <th key={m.id} className="border border-slate-400 p-1.5">
                        {m.namaMapel.length > 8 ? `${m.namaMapel.substring(0, 7)}.` : m.namaMapel}
                      </th>
                    ))}
                    <th className="border border-slate-400 p-1.5 w-14 font-extrabold">Total</th>
                    <th className="border border-slate-400 p-1.5 w-14 font-extrabold">Rata-Rata</th>
                  </tr>
                </thead>
                <tbody>
                  {legerData.map(item => (
                    <tr key={item.siswa.id}>
                      <td className="border border-slate-400 p-1.5 text-center font-mono font-bold">{item.ranking}</td>
                      <td className="border border-slate-400 p-1.5 font-semibold">{item.siswa.nama}</td>
                      <td className="border border-slate-400 p-1.5 text-center font-mono">{item.siswa.nisn}</td>
                      {mapelList.map(m => {
                        const mScore = item.rapor.nilaiMapel.find(nm => nm.namaMapel === m.namaMapel);
                        return (
                          <td key={m.id} className="border border-slate-400 p-1.5 text-center font-mono">
                            {mScore?.nilaiAkhir ?? '-'}
                          </td>
                        );
                      })}
                      <td className="border border-slate-400 p-1.5 text-center font-mono font-bold">{item.totalNilai}</td>
                      <td className="border border-slate-400 p-1.5 text-center font-mono font-extrabold">{item.rataRata}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="grid grid-cols-2 text-center text-[10px] mt-8 pt-4">
                <div>
                  <div>Mengetahui,</div>
                  <div className="font-bold">Kepala Sekolah,</div>
                  <div className="h-14"></div>
                  <div className="font-bold underline">{schoolSettings?.kepalaSekolah || 'Dr. H. Ahmad Dahlan, M.Pd.'}</div>
                  <div className="text-[9px]">NIP. {schoolSettings?.nipKepalaSekolah || '197508151999031002'}</div>
                </div>
                <div>
                  <div>Jakarta, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                  <div className="font-bold">Wali Kelas {inputMassalKelas},</div>
                  <div className="h-14"></div>
                  <div className="font-bold underline">{legerData[0]?.rapor?.waliKelasNama || 'Giar Hermawan, S.Kom'}</div>
                  <div className="text-[9px]">NIP. {legerData[0]?.rapor?.waliKelasNip || '198204102010011010'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
