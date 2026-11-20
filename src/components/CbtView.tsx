import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Laptop, 
  Plus, 
  FileJson, 
  Upload, 
  Sparkles, 
  Play, 
  Clock, 
  Image,
  Film,
  CheckCircle2, 
  AlertCircle, 
  HelpCircle, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  BookOpen, 
  Trash2,
  Download,
  Calendar,
  CreditCard,
  ShieldAlert,
  FileSpreadsheet,
  Printer,
  Maximize2,
  X,
  Building2,
  QrCode,
  ShieldCheck,
  Cloud,
  FileText,
  User,
  Edit2,
  MapPin,
  UserCheck,
  Layers,
  Sparkle,
  CheckSquare,
  Square,
  Volume2,
  VolumeX,
  Search,
  Filter
} from 'lucide-react';
import { 
  BankSoal, 
  SoalCBT, 
  UjianCBT, 
  HasilUjian, 
  TipeSoal, 
  JawabanSiswa,
  JadwalUjianItem,
  CbtExamSettings,
  Siswa,
  Guru,
  Staf,
  RombelKelas,
  MataPelajaranItem,
  Role,
  CbtSubTab,
  SchoolSettings
} from '../types/school';
import { dbFetchCollection, dbSaveCollection, dbSaveItem } from '../lib/firebaseSync';
import { DenahRuangUjian } from './cbt/DenahRuangUjian';
import { JadwalUjianSection } from './cbt/JadwalUjianSection';
import { PengaturanCbtSection } from './cbt/PengaturanCbtSection';
import {
  KartuPesertaCard,
  KartuPesertaBatchModal,
  KartuPesertaPrintContainer,
  buildKartuA4PrintHtml,
  printKartuViaHiddenIframe
} from './cbt/KartuPesertaPrint';
import { downloadKartuPesertaA4Pdf } from './cbt/kartuPesertaPdf';
import { enhanceSignatureForDisplay } from './cbt/signatureUtils';

interface CbtViewProps {
  bankSoalList: BankSoal[];
  setBankSoalList: React.Dispatch<React.SetStateAction<BankSoal[]>>;
  ujianList: UjianCBT[];
  setUjianList: React.Dispatch<React.SetStateAction<UjianCBT[]>>;
  hasilUjianList?: HasilUjian[];
  setHasilUjianList?: React.Dispatch<React.SetStateAction<HasilUjian[]>>;
  siswaList: Siswa[];
  guruList?: Guru[];
  stafList?: Staf[];
  rombelList?: RombelKelas[];
  mapelList?: MataPelajaranItem[];
  currentRole?: Role;
  userEmail?: string;
  subTab?: CbtSubTab;
  setSubTab?: (subTab: CbtSubTab) => void;
  schoolSettings?: SchoolSettings;
}

export const CbtView: React.FC<CbtViewProps> = ({
  bankSoalList,
  setBankSoalList,
  ujianList,
  setUjianList,
  hasilUjianList = [],
  setHasilUjianList,
  siswaList,
  guruList = [],
  stafList = [],
  rombelList = [],
  mapelList = [],
  currentRole = 'admin',
  userEmail = '',
  subTab: externalSubTab,
  setSubTab: externalSetSubTab,
  schoolSettings
}) => {
  const [internalSubTab, setInternalSubTab] = useState<CbtSubTab>('bank_soal');
  const subTab = externalSubTab !== undefined ? externalSubTab : internalSubTab;
  const setSubTab = externalSetSubTab || setInternalSubTab;

  useEffect(() => {
    if (currentRole === 'siswa') {
      if (subTab === 'bank_soal' || subTab === 'ai_generator' || subTab === 'pengaturan_cbt') {
        setSubTab('simulasi_ujian');
      }
    }
  }, [currentRole, subTab]);

  // --- Pengaturan CBT Ujian (Nama Ujian, Tahun Ajaran, Semester, TTD Kepala Sekolah) ---
  const buildDefaultCbtSettings = (): CbtExamSettings => {
    const rawSem = (schoolSettings?.semesterAktif || schoolSettings?.semester || 'Ganjil').toLowerCase();
    return {
      id: 'default',
      namaUjian: 'Sumatif Akhir Semester (SAS)',
      tahunAjaran: schoolSettings?.tahunAjaran || '2026/2027',
      semester: rawSem.includes('genap') ? 'Genap' : 'Ganjil',
      kepalaSekolahNama: schoolSettings?.kepalaSekolah || 'Nurhidayati, S.Pd',
      kepalaSekolahNip: schoolSettings?.nipKepalaSekolah || '',
      kotaPenetapan: schoolSettings?.kotaKabupaten || 'Depok',
      tanggalPenetapan: '',
      ttdKepalaSekolahUrl: ''
    };
  };

  const [cbtSettings, setCbtSettings] = useState<CbtExamSettings>(() => {
    try {
      const saved = localStorage.getItem('edu_cbtSettings');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          return { ...buildDefaultCbtSettings(), ...parsed, id: 'default' };
        }
      }
    } catch {
      // fallback to default
    }
    return buildDefaultCbtSettings();
  });

  useEffect(() => {
    const fetchRemoteCbtSettings = async () => {
      try {
        const remote = await dbFetchCollection<CbtExamSettings>('edu_cbtSettings');
        if (remote && remote.length > 0) {
          const found = remote.find(r => r.id === 'default') || remote[0];
          const merged: CbtExamSettings = { ...buildDefaultCbtSettings(), ...found, id: 'default' };
          setCbtSettings(merged);
          localStorage.setItem('edu_cbtSettings', JSON.stringify(merged));
        }
      } catch (err) {
        console.error('Gagal mengambil pengaturan CBT remote:', err);
      }
    };
    fetchRemoteCbtSettings();
  }, []);

  const saveCbtSettings = (next: CbtExamSettings) => {
    const payload: CbtExamSettings = { ...next, id: 'default' };
    setCbtSettings(payload);
    try {
      localStorage.setItem('edu_cbtSettings', JSON.stringify(payload));
      dbSaveItem('edu_cbtSettings', payload).catch(console.error);
    } catch (err) {
      console.error('Gagal menyimpan pengaturan CBT:', err);
    }
  };

  // Compute dynamic lists of available classes, subjects, and teachers
  // Hanya masukkan kelas/rombel yang benar-benar memiliki siswa terdaftar
  const availableKelasList = useMemo(() => {
    const rawSet = new Set<string>();

    rombelList.forEach(r => {
      const name = r.namaRombel || (r as any).nama;
      if (name && typeof name === 'string' && name.trim()) {
        rawSet.add(name.trim());
      }
    });

    if (rawSet.size === 0) {
      ['VII - Ibnu Sina', 'VII - Ibnu Khaldun', 'VII - Ibnu Al Haytam', 'VIII - Al Kindi', 'VIII - Al Khawarizmi', 'VIII - Al Farabi', 'VIII - Al Biruni', 'IX - Umar bin Khattab', 'IX - Utsman bin Affan'].forEach(k => rawSet.add(k));
    }

    return Array.from(rawSet).sort((a, b) => {
      const getGrade = (s: string) => {
        if (s.startsWith('VII -') || s.startsWith('7 -')) return 7;
        if (s.startsWith('VIII -') || s.startsWith('8 -')) return 8;
        if (s.startsWith('IX -') || s.startsWith('9 -')) return 9;
        return 99;
      };
      const gradeA = getGrade(a);
      const gradeB = getGrade(b);
      if (gradeA !== gradeB) return gradeA - gradeB;
      return a.localeCompare(b, undefined, { numeric: true });
    });
  }, [rombelList]);

  const availableMapelList = useMemo(() => {
    const set = new Set<string>();
    mapelList.forEach(m => {
      const name = m.namaMapel || (m as any).nama;
      if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
    });
    ujianList.forEach(u => {
      if (u.mataPelajaran && u.mataPelajaran.trim()) set.add(u.mataPelajaran.trim());
    });
    bankSoalList.forEach(b => {
      if (b.mataPelajaran && b.mataPelajaran.trim()) set.add(b.mataPelajaran.trim());
    });
    guruList.forEach(g => {
      if (g.mataPelajaran && g.mataPelajaran.trim()) set.add(g.mataPelajaran.trim());
    });
    hasilUjianList.forEach(h => {
      if (h.mataPelajaran && h.mataPelajaran.trim()) set.add(h.mataPelajaran.trim());
    });
    if (set.size === 0) {
      ['Informatika / TIK', 'Matematika', 'Matematika Tingkat Lanjut', 'Bahasa Indonesia', 'Bahasa Inggris', 'IPA (Fisika/Kimia/Biologi)', 'IPS (Ekonomi/Geografi/Sejarah)', 'Pendidikan Agama Islam'].forEach(m => set.add(m));
    }
    return Array.from(set).sort();
  }, [mapelList, ujianList, bankSoalList, guruList, hasilUjianList]);

  // --- Jadwal Ujian State & Persistence ---
  const DEFAULT_JADWAL: JadwalUjianItem[] = [
    {
      id: 'jdw-01',
      ujianId: 'uj-01',
      judulUjian: 'Penilaian Tengah Semester (PTS) Matematika Kelas VIII',
      mataPelajaran: 'Matematika',
      kelasTarget: 'VIII - Al Biruni',
      tanggal: '2026-08-01',
      jamMulai: '07:30',
      jamSelesai: '09:00',
      ruang: 'Lab Komputer 01',
      pengawas: 'Siti Rahmawati, S.Si., M.Sc.',
      status: 'Aktif'
    },
    {
      id: 'jdw-02',
      ujianId: 'uj-02',
      judulUjian: 'PTS Bahasa Indonesia Fase D',
      mataPelajaran: 'Bahasa Indonesia',
      kelasTarget: 'VIII - Al Farabi',
      tanggal: '2026-08-01',
      jamMulai: '09:30',
      jamSelesai: '11:00',
      ruang: 'Lab Komputer 01',
      pengawas: 'Rian Hidayat, S.Pd.',
      status: 'Mendatang'
    }
  ];

  const [jadwalList, setJadwalList] = useState<JadwalUjianItem[]>(() => {
    try {
      const saved = localStorage.getItem('edu_jadwalUjianList');
      if (saved !== null) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((item: JadwalUjianItem) => ({
            ...item,
            kelasTarget: item.kelasTarget === 'X-IPA-1' ? 'VIII - Al Biruni' : item.kelasTarget
          }));
        }
      }
    } catch (e) {
      console.error(e);
    }
    return DEFAULT_JADWAL;
  });

  // Delete Confirmation Modal State
  const [deleteTargetJadwal, setDeleteTargetJadwal] = useState<JadwalUjianItem | null>(null);

  // Sync with Firestore
  useEffect(() => {
    const fetchRemoteJadwal = async () => {
      try {
        const remote = await dbFetchCollection<JadwalUjianItem>('edu_jadwalUjianList');
        if (remote && Array.isArray(remote) && remote.length > 0) {
          const sanitized = remote.map(item => ({
            ...item,
            kelasTarget: item.kelasTarget === 'X-IPA-1' ? 'VIII - Al Biruni' : item.kelasTarget
          }));
          setJadwalList(sanitized);
          localStorage.setItem('edu_jadwalUjianList', JSON.stringify(sanitized));
        }
      } catch (err) {
        console.error('Gagal mengambil jadwal ujian remote:', err);
      }
    };
    fetchRemoteJadwal();
  }, []);

  const saveJadwalList = (newList: JadwalUjianItem[]) => {
    const sanitized = newList.map(item => ({
      ...item,
      kelasTarget: item.kelasTarget === 'X-IPA-1' ? 'VIII - Al Biruni' : item.kelasTarget
    }));
    setJadwalList(sanitized);
    try {
      localStorage.setItem('edu_jadwalUjianList', JSON.stringify(sanitized));
      dbSaveCollection('edu_jadwalUjianList', sanitized).catch(console.error);
    } catch (e) {
      console.error(e);
    }
  };

  // State Modal Tambah / Edit Sesi Ujian
  const [showJadwalModal, setShowJadwalModal] = useState(false);
  const [editingJadwalId, setEditingJadwalId] = useState<string | null>(null);
  const [formJadwal, setFormJadwal] = useState<{
    ujianId: string;
    judulUjian: string;
    mataPelajaran: string;
    kelasTarget: string;
    tanggal: string;
    jamMulai: string;
    jamSelesai: string;
    ruang: string;
    pengawas: string;
    status: 'Aktif' | 'Mendatang' | 'Selesai';
  }>({
    ujianId: '',
    judulUjian: '',
    mataPelajaran: '',
    kelasTarget: 'Semua Kelas',
    tanggal: new Date().toISOString().split('T')[0],
    jamMulai: '07:30',
    jamSelesai: '09:00',
    ruang: 'Lab Komputer 01',
    pengawas: '',
    status: 'Aktif'
  });

  const [formError, setFormError] = useState('');
  const [toastNotification, setToastNotification] = useState<string | null>(null);
  const [customKelasInput, setCustomKelasInput] = useState('');

  // Helper untuk multi-select Kelas Target (membersihkan kelas usang seperti X-IPA-1 jika ada)
  const selectedKelasArray = useMemo(() => {
    if (!formJadwal.kelasTarget || !formJadwal.kelasTarget.trim()) return [];
    if (formJadwal.kelasTarget === 'Semua Kelas') return availableKelasList;
    return formJadwal.kelasTarget
      .split(',')
      .map(s => s.trim())
      .filter(s => s && s !== 'X-IPA-1');
  }, [formJadwal.kelasTarget, availableKelasList]);

  // Efek untuk otomatis membersihkan jika formJadwal.kelasTarget masih memuat X-IPA-1
  useEffect(() => {
    if (formJadwal.kelasTarget && formJadwal.kelasTarget.includes('X-IPA-1')) {
      const cleaned = formJadwal.kelasTarget
        .split(',')
        .map(s => s.trim())
        .filter(s => s && s !== 'X-IPA-1')
        .join(', ');
      setFormJadwal(prev => ({
        ...prev,
        kelasTarget: cleaned || 'Semua Kelas'
      }));
    }
  }, [formJadwal.kelasTarget]);

  const isAllKelasSelected = 
    formJadwal.kelasTarget === 'Semua Kelas' || 
    (availableKelasList.length > 0 && availableKelasList.every(k => selectedKelasArray.includes(k)));

  const handleToggleKelasCheckbox = (kelasName: string) => {
    let current: string[];
    if (formJadwal.kelasTarget === 'Semua Kelas') {
      current = [...availableKelasList];
    } else {
      current = [...selectedKelasArray];
    }

    if (current.includes(kelasName)) {
      current = current.filter(k => k !== kelasName);
    } else {
      current = [...current, kelasName];
    }

    if (current.length === 0) {
      setFormJadwal(prev => ({ ...prev, kelasTarget: '' }));
    } else if (current.length === availableKelasList.length && availableKelasList.length > 0) {
      setFormJadwal(prev => ({ ...prev, kelasTarget: 'Semua Kelas' }));
    } else {
      setFormJadwal(prev => ({ ...prev, kelasTarget: current.join(', ') }));
    }
  };

  const handleSelectAllKelasToggle = () => {
    if (isAllKelasSelected) {
      setFormJadwal(prev => ({ ...prev, kelasTarget: '' }));
    } else {
      setFormJadwal(prev => ({ ...prev, kelasTarget: 'Semua Kelas' }));
    }
  };

  const handleAddCustomKelas = () => {
    if (!customKelasInput.trim()) return;
    const newKelas = customKelasInput.trim();
    let current: string[] = [];
    if (formJadwal.kelasTarget === 'Semua Kelas') {
      current = [...availableKelasList];
    } else {
      current = [...selectedKelasArray];
    }
    if (!current.includes(newKelas)) {
      current.push(newKelas);
      setFormJadwal(prev => ({ ...prev, kelasTarget: current.join(', ') }));
    }
    setCustomKelasInput('');
  };

  const showToast = (msg: string) => {
    setToastNotification(msg);
    setTimeout(() => {
      setToastNotification(null);
    }, 3500);
  };

  const handleOpenAddJadwal = () => {
    setEditingJadwalId(null);
    setFormError('');
    
    // Temukan ujian CBT pertama (jika ada) untuk dijadikan referensi awal
    const firstUjian = ujianList[0];
    const defaultMapel = firstUjian?.mataPelajaran || availableMapelList[0] || 'Informatika / TIK';
    const rawKelas = firstUjian?.kelasTarget;
    const defaultKelas = (rawKelas && rawKelas !== 'X-IPA-1' && (availableKelasList.includes(rawKelas) || rawKelas === 'Semua Kelas'))
      ? rawKelas
      : (availableKelasList[0] || 'Semua Kelas');

    // Cari guru pengampu mapel yang sesuai
    const matchedGuru = guruList.find(g => 
      g.mataPelajaran && defaultMapel && 
      (g.mataPelajaran.toLowerCase().includes(defaultMapel.toLowerCase()) || 
       defaultMapel.toLowerCase().includes(g.mataPelajaran.toLowerCase()))
    );
    const defaultGuru = matchedGuru?.nama || guruList[0]?.nama || 'Aulia Safitri, S.Pd';

    setFormJadwal({
      ujianId: firstUjian?.id || '',
      judulUjian: firstUjian?.judulUjian || '',
      mataPelajaran: defaultMapel,
      kelasTarget: defaultKelas,
      tanggal: new Date().toISOString().split('T')[0],
      jamMulai: '07:30',
      jamSelesai: '09:00',
      ruang: 'Lab Komputer 01',
      pengawas: defaultGuru,
      status: 'Aktif'
    });
    setShowJadwalModal(true);
  };

  const handleOpenEditJadwal = (item: JadwalUjianItem) => {
    setEditingJadwalId(item.id);
    setFormError('');
    setFormJadwal({
      ujianId: item.ujianId || '',
      judulUjian: item.judulUjian,
      mataPelajaran: item.mataPelajaran,
      kelasTarget: item.kelasTarget,
      tanggal: item.tanggal,
      jamMulai: item.jamMulai,
      jamSelesai: item.jamSelesai,
      ruang: item.ruang,
      pengawas: item.pengawas,
      status: item.status
    });
    setShowJadwalModal(true);
  };

  const handleSelectUjianPreset = (selectedId: string) => {
    const selected = ujianList.find(u => u.id === selectedId);
    if (selected) {
      // Cari guru pengampu dari bank soal atau kecocokan mata pelajaran
      const bank = bankSoalList.find(b => b.id === selected.bankSoalId);
      const matchedGuruByBank = bank?.dibuatOleh ? guruList.find(g => g.nama.toLowerCase() === bank.dibuatOleh.toLowerCase()) : null;
      const matchedGuruByMapel = guruList.find(g => 
        g.mataPelajaran && selected.mataPelajaran && 
        (g.mataPelajaran.toLowerCase().includes(selected.mataPelajaran.toLowerCase()) || 
         selected.mataPelajaran.toLowerCase().includes(g.mataPelajaran.toLowerCase()))
      );

      const targetGuru = matchedGuruByBank?.nama || matchedGuruByMapel?.nama;

      setFormJadwal(prev => ({
        ...prev,
        ujianId: selected.id,
        judulUjian: selected.judulUjian,
        mataPelajaran: selected.mataPelajaran,
        kelasTarget: selected.kelasTarget,
        pengawas: targetGuru || prev.pengawas || (guruList[0]?.nama || '')
      }));
    } else {
      setFormJadwal(prev => ({ ...prev, ujianId: '' }));
    }
  };

  const handleMapelChange = (newMapel: string) => {
    const matchedGuru = guruList.find(g => 
      g.mataPelajaran && newMapel && 
      (g.mataPelajaran.toLowerCase().includes(newMapel.toLowerCase()) || 
       newMapel.toLowerCase().includes(g.mataPelajaran.toLowerCase()))
    );

    setFormJadwal(prev => ({
      ...prev,
      mataPelajaran: newMapel,
      pengawas: matchedGuru ? matchedGuru.nama : prev.pengawas
    }));
  };

  const handleSaveJadwal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formJadwal.judulUjian.trim()) {
      setFormError('Nama sesi ujian tidak boleh kosong!');
      return;
    }
    if (!formJadwal.mataPelajaran.trim()) {
      setFormError('Mata pelajaran tidak boleh kosong!');
      return;
    }
    if (!formJadwal.kelasTarget || !formJadwal.kelasTarget.trim() || selectedKelasArray.length === 0) {
      setFormError('Pilih minimal satu kelas / rombel target!');
      return;
    }
    if (!formJadwal.tanggal) {
      setFormError('Tanggal pelaksanaan ujian harus dipilih!');
      return;
    }

    if (editingJadwalId) {
      const updated = jadwalList.map(j => {
        if (j.id === editingJadwalId) {
          return {
            ...j,
            ...formJadwal,
            id: editingJadwalId
          };
        }
        return j;
      });
      saveJadwalList(updated);
      showToast('Sesi ujian berhasil diperbarui!');
    } else {
      const newItem: JadwalUjianItem = {
        id: `jdw-${Date.now().toString().slice(-6)}`,
        ...formJadwal
      };
      saveJadwalList([newItem, ...jadwalList]);
      showToast('Sesi ujian baru berhasil dijadwalkan!');
    }

    setShowJadwalModal(false);
  };

  const handleOpenDeleteJadwal = (item: JadwalUjianItem) => {
    setDeleteTargetJadwal(item);
  };

  const handleConfirmDeleteJadwal = () => {
    if (!deleteTargetJadwal) return;
    const filtered = jadwalList.filter(j => j.id !== deleteTargetJadwal.id);
    saveJadwalList(filtered);
    showToast(`Sesi ujian "${deleteTargetJadwal.judulUjian}" berhasil dihapus!`);
    setDeleteTargetJadwal(null);
  };

  const handleToggleStatusJadwal = (id: string, currentStatus: 'Aktif' | 'Mendatang' | 'Selesai') => {
    const nextStatus: 'Aktif' | 'Mendatang' | 'Selesai' = 
      currentStatus === 'Aktif' ? 'Selesai' :
      currentStatus === 'Mendatang' ? 'Aktif' : 'Mendatang';
    
    const updated = jadwalList.map(j => j.id === id ? { ...j, status: nextStatus } : j);
    saveJadwalList(updated);
    showToast(`Status sesi diubah menjadi ${nextStatus}!`);
  };

  const handleDeleteHasilUjian = (arg: string | HasilUjian) => {
    const item = typeof arg === 'string' ? hasilUjianList.find(h => h.id === arg) || null : arg;
    if (item) setDeleteTargetHasilUjian(item);
  };

  // Modal Kartu Peserta Ujian Printable State
  const [selectedKartuSiswa, setSelectedKartuSiswa] = useState<Siswa | null>(null);
  const [kartuSearchQuery, setKartuSearchQuery] = useState('');
  const [kartuKelasFilter, setKartuKelasFilter] = useState<string>('ALL');
  const [selectedKartuIds, setSelectedKartuIds] = useState<string[]>([]);
  const [showBatchPrintModal, setShowBatchPrintModal] = useState(false);
  const [showKartuCutGuide, setShowKartuCutGuide] = useState(true);
  const [printKartuTargetList, setPrintKartuTargetList] = useState<Siswa[]>([]);
  const [isPrintingKartu, setIsPrintingKartu] = useState(false);
  const [isDownloadingKartuPdf, setIsDownloadingKartuPdf] = useState(false);
  const [downloadPdfProgress, setDownloadPdfProgress] = useState<{ current: number; total: number } | null>(null);

  useEffect(() => {
    return () => {
      document.body.classList.remove('printing-kartu-a4');
    };
  }, []);

  const kartuKelasOptions = useMemo(() => {
    const map = new Map<string, number>();
    siswaList.forEach(s => {
      const k = (s.kelas || s.rombel || '').trim();
      if (k) {
        map.set(k, (map.get(k) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'id'));
  }, [siswaList]);

  const filteredKartuSiswaList = useMemo(() => {
    const q = kartuSearchQuery.trim().toLowerCase();
    return siswaList.filter(s => {
      const kelasVal = (s.kelas || s.rombel || '').trim();
      if (kartuKelasFilter !== 'ALL' && kelasVal !== kartuKelasFilter) {
        return false;
      }
      if (!q) return true;
      const noPeserta = `c2026-${(s.nisn || '').slice(-4)}`.toLowerCase();
      return (
        (s.nama || '').toLowerCase().includes(q) ||
        (s.nisn || '').toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q) ||
        kelasVal.toLowerCase().includes(q) ||
        (s.username || '').toLowerCase().includes(q) ||
        noPeserta.includes(q)
      );
    });
  }, [siswaList, kartuSearchQuery, kartuKelasFilter]);

  const batchKartuSiswaList = useMemo(() => {
    if (selectedKartuIds.length > 0) {
      const idSet = new Set(selectedKartuIds);
      return siswaList.filter(s => idSet.has(s.id));
    }
    return filteredKartuSiswaList;
  }, [selectedKartuIds, siswaList, filteredKartuSiswaList]);

  const allFilteredKartuSelected = useMemo(() => {
    if (filteredKartuSiswaList.length === 0) return false;
    const idSet = new Set(selectedKartuIds);
    return filteredKartuSiswaList.every(s => idSet.has(s.id));
  }, [filteredKartuSiswaList, selectedKartuIds]);

  const handleToggleSelectKartu = (siswaId: string) => {
    setSelectedKartuIds(prev =>
      prev.includes(siswaId) ? prev.filter(id => id !== siswaId) : [...prev, siswaId]
    );
  };

  const handleToggleSelectAllFilteredKartu = () => {
    const filteredIds = filteredKartuSiswaList.map(s => s.id);
    if (allFilteredKartuSelected) {
      const removeSet = new Set(filteredIds);
      setSelectedKartuIds(prev => prev.filter(id => !removeSet.has(id)));
    } else {
      setSelectedKartuIds(prev => Array.from(new Set([...prev, ...filteredIds])));
    }
  };

  const activeKartuSiswa = useMemo(() => {
    if (!selectedKartuSiswa) return null;
    return siswaList.find(s => s.id === selectedKartuSiswa.id) || selectedKartuSiswa;
  }, [selectedKartuSiswa, siswaList]);

  const triggerKartuA4PrintFallback = (targetList: Siswa[]) => {
    setPrintKartuTargetList(targetList);
    document.body.classList.add('printing-kartu-a4');

    const cleanup = () => {
      document.body.classList.remove('printing-kartu-a4');
      window.removeEventListener('afterprint', cleanup);
    };
    window.addEventListener('afterprint', cleanup);

    requestAnimationFrame(() => {
      setTimeout(() => {
        window.print();
      }, 220);
    });
  };

  const triggerKartuA4Print = async (targetList: Siswa[]) => {
    if (targetList.length === 0) return;
    setIsPrintingKartu(true);
    setPrintKartuTargetList(targetList);

    const sharpTtdUrl = cbtSettings.ttdKepalaSekolahUrl
      ? await enhanceSignatureForDisplay(cbtSettings.ttdKepalaSekolahUrl)
      : cbtSettings.ttdKepalaSekolahUrl;

    const html = buildKartuA4PrintHtml({
      siswaList: targetList,
      jadwalList,
      rombelList,
      schoolSettings,
      cbtSettings: {
        ...cbtSettings,
        ttdKepalaSekolahUrl: sharpTtdUrl
      },
      showCutGuide: showKartuCutGuide
    });

    printKartuViaHiddenIframe(
      html,
      () => triggerKartuA4PrintFallback(targetList),
      () => setIsPrintingKartu(false)
    );
  };

  const handlePrintKartuUjian = () => {
    if (!activeKartuSiswa) return;
    triggerKartuA4Print([activeKartuSiswa]);
  };

  const handleDownloadKartuPdf = async (targetList: Siswa[], fileSuffix?: string) => {
    if (targetList.length === 0 || isDownloadingKartuPdf) return;
    setIsDownloadingKartuPdf(true);
    setDownloadPdfProgress({ current: 0, total: Math.ceil(targetList.length / 4) });
    try {
      const baseName = fileSuffix
        ? `Kartu-Peserta-Ujian-A4-${fileSuffix}`
        : `Kartu-Peserta-Ujian-A4-${targetList.length}-Siswa`;
      await downloadKartuPesertaA4Pdf({
        siswaList: targetList,
        jadwalList,
        rombelList,
        schoolSettings,
        cbtSettings,
        showCutGuide: showKartuCutGuide,
        fileName: baseName,
        onProgress: (current, total) => setDownloadPdfProgress({ current, total })
      });
      showToast(`Berhasil mengunduh PDF ${targetList.length} Kartu Peserta (${Math.ceil(targetList.length / 4)} lembar A4).`);
    } catch (err) {
      console.error('Gagal membuat PDF Kartu Peserta:', err);
      showToast('Gagal mengunduh PDF kartu peserta. Silakan coba lagi.');
    } finally {
      setIsDownloadingKartuPdf(false);
      setDownloadPdfProgress(null);
    }
  };

  // --- Bank Soal & Input Soal Manual State ---
  const [selectedBankId, setSelectedBankId] = useState<string>(bankSoalList[0]?.id || '');

  useEffect(() => {
    if (!bankSoalList.some(b => b.id === selectedBankId) && bankSoalList.length > 0) {
      setSelectedBankId(bankSoalList[0].id);
    }
  }, [bankSoalList, selectedBankId]);

  const activeBank = bankSoalList.find(b => b.id === selectedBankId) || bankSoalList[0];

  // --- Tambah / Edit Paket Bank Soal State ---
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [editingBankId, setEditingBankId] = useState<string | null>(null);
  const [bankJudul, setBankJudul] = useState('');
  const [bankKode, setBankKode] = useState('');
  const [bankMapel, setBankMapel] = useState('');
  const [bankKelas, setBankKelas] = useState('');
  const [bankDurasi, setBankDurasi] = useState(90);
  const [bankImportedSoal, setBankImportedSoal] = useState<SoalCBT[]>([]);
  const [bankImportFileName, setBankImportFileName] = useState('');
  const [bankFormError, setBankFormError] = useState('');
  const [filterBankByGuruMapel, setFilterBankByGuruMapel] = useState(false);

  const [showAddSoalModal, setShowAddSoalModal] = useState(false);
  const [editingSoalId, setEditingSoalId] = useState<string | null>(null);
  const [newTipe, setNewTipe] = useState<TipeSoal>('pg');
  const [newPertanyaan, setNewPertanyaan] = useState('');
  const [newOpsiA, setNewOpsiA] = useState('');
  const [newOpsiB, setNewOpsiB] = useState('');
  const [newOpsiC, setNewOpsiC] = useState('');
  const [newOpsiD, setNewOpsiD] = useState('');
  const [newKunciPg, setNewKunciPg] = useState('A');
  const [newKunciMultipleChoice, setNewKunciMultipleChoice] = useState<string[]>(['A', 'C']);
  const [newKunciIsian, setNewKunciIsian] = useState('');
  const [newKunciEsai, setNewKunciEsai] = useState('');
  const [newPembahasan, setNewPembahasan] = useState('');
  const [newBobot, setNewBobot] = useState(25);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [newVideoUrl, setNewVideoUrl] = useState('');

  const handleOpenEditSoal = (soal: SoalCBT) => {
    setEditingSoalId(soal.id);
    setNewTipe(soal.tipe);
    setNewPertanyaan(soal.pertanyaan);
    setNewBobot(soal.bobot || 25);
    setNewPembahasan(soal.pembahasan || '');
    setNewImageUrl(soal.imageUrl || '');
    setNewVideoUrl(soal.videoUrl || '');
    if (soal.opsi && soal.opsi.length >= 4) {
      setNewOpsiA(soal.opsi[0]?.teks || '');
      setNewOpsiB(soal.opsi[1]?.teks || '');
      setNewOpsiC(soal.opsi[2]?.teks || '');
      setNewOpsiD(soal.opsi[3]?.teks || '');
    } else {
      setNewOpsiA('');
      setNewOpsiB('');
      setNewOpsiC('');
      setNewOpsiD('');
    }
    if (soal.tipe === 'pg') {
      setNewKunciPg(Array.isArray(soal.kunciJawaban) ? soal.kunciJawaban[0] || 'A' : String(soal.kunciJawaban || 'A'));
    } else if (soal.tipe === 'multiple_choice') {
      setNewKunciMultipleChoice(Array.isArray(soal.kunciJawaban) ? soal.kunciJawaban : ['A']);
    } else if (soal.tipe === 'isian') {
      setNewKunciIsian(String(soal.kunciJawaban || ''));
    } else if (soal.tipe === 'esai') {
      setNewKunciEsai(String(soal.kunciJawaban || ''));
    }
    setShowAddSoalModal(true);
  };

  const [deleteTargetSoal, setDeleteTargetSoal] = useState<{ id: string; pertanyaan: string } | null>(null);

  const handleDeleteSoal = (soalId: string) => {
    if (!activeBank) return;
    const soal = activeBank.daftarSoal.find(s => s.id === soalId);
    if (soal) {
      setDeleteTargetSoal({ id: soal.id, pertanyaan: soal.pertanyaan });
    }
  };

  const handleAddSoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBank) return;

    let kunci: string | string[] = newKunciPg;
    if (newTipe === 'multiple_choice') kunci = newKunciMultipleChoice;
    if (newTipe === 'isian') kunci = newKunciIsian;
    if (newTipe === 'esai') kunci = newKunciEsai;

    const payloadSoal: SoalCBT = {
      id: editingSoalId || `soal-${Date.now()}`,
      tipe: newTipe,
      pertanyaan: newPertanyaan,
      opsi: (newTipe === 'pg' || newTipe === 'multiple_choice') ? [
        { id: 'A', teks: newOpsiA || 'Opsi A' },
        { id: 'B', teks: newOpsiB || 'Opsi B' },
        { id: 'C', teks: newOpsiC || 'Opsi C' },
        { id: 'D', teks: newOpsiD || 'Opsi D' },
      ] : undefined,
      kunciJawaban: kunci,
      pembahasan: newPembahasan,
      bobot: Number(newBobot),
      imageUrl: newImageUrl || undefined,
      videoUrl: newVideoUrl || undefined
    };

    setBankSoalList(prev => prev.map(b => {
      if (b.id === activeBank.id) {
        let updatedDaftarSoal = [...b.daftarSoal];
        if (editingSoalId) {
          updatedDaftarSoal = updatedDaftarSoal.map(s => s.id === editingSoalId ? payloadSoal : s);
        } else {
          updatedDaftarSoal.push(payloadSoal);
        }
        return {
          ...b,
          daftarSoal: updatedDaftarSoal,
          jumlahSoal: updatedDaftarSoal.length
        };
      }
      return b;
    }));

    setShowAddSoalModal(false);
    setEditingSoalId(null);
    setNewPertanyaan('');
    setNewImageUrl('');
    setNewVideoUrl('');
    setNewPembahasan('');
    alert(editingSoalId ? 'Soal berhasil diperbarui!' : 'Soal baru berhasil ditambahkan ke Bank Soal!');
  };

  // --- In-Bank AI Question Generator State & Handlers ---
  const [showAiModalInBank, setShowAiModalInBank] = useState(false);
  const [inBankAiMapel, setInBankAiMapel] = useState('');
  const [inBankAiKelas, setInBankAiKelas] = useState('');
  const [inBankAiTopik, setInBankAiTopik] = useState('');
  const [inBankAiJumlah, setInBankAiJumlah] = useState(10);
  const [inBankAiTipeSoal, setInBankAiTipeSoal] = useState<string[]>(['pg', 'multiple_choice', 'isian', 'esai']);
  const [inBankAiKesulitan, setInBankAiKesulitan] = useState('Sedang (C3: Aplikasi Konsep)');
  const [inBankAiInstruksi, setInBankAiInstruksi] = useState('');
  const [inBankAiBobot, setInBankAiBobot] = useState(10);
  const [inBankAiLoading, setInBankAiLoading] = useState(false);
  const [inBankAiGeneratedList, setInBankAiGeneratedList] = useState<SoalCBT[]>([]);
  const [inBankAiSelectedIndices, setInBankAiSelectedIndices] = useState<number[]>([]);
  const [inBankAiToast, setInBankAiToast] = useState<string | null>(null);

  // Mapping Topik Kurikulum Merdeka Lengkap Berdasarkan Mata Pelajaran
  const SUBJECT_TOPIC_MAP: Record<string, string[]> = {
    'bahasa_jepang': [
      'Huruf Hiragana & Katakana Dasar (Gojuon, Dakuten & Handakuten)',
      'Aisatsu (Salam Sapaan, Ucapan Terima Kasih & Permintaan Maaf)',
      'Jikoshoukai (Perkenalan Diri, Asal Daerah, Kelas & Usia)',
      'Partikel Dasar Bahasa Jepang (は / が / を / に / で / の / へ)',
      'Kata Tunjuk Benda & Tempat (Kore, Sore, Are & Koko, Soko, Asoko)',
      'Angka, Jam (Jikan), Hari, Tanggal & Jadwal Pelajaran Sekolah',
      'Kata Sifat Golongan -i (I-Keiyoushi) & Golongan -na (Na-Keiyoushi)',
      'Kata Kerja Bentuk -masu / -masen (Aktivitas Sehari-hari)',
      'Kazoku (Anggota Keluarga) & Shumi (Hobi / Kegemaran)',
      'Kanji Dasar JLPT N5 (Angka, Hari, Orang, Sekolah & Alam)'
    ],
    'bahasa_arab': [
      'Ta\'aruf (Perkenalan Diri & Kata Ganti Dhamir Munfashil)',
      'Al-Adawat Al-Madrasiyah (Perlengkapan & Lingkungan Sekolah)',
      'Al-Alwan (Warna-Warni) & Kesesuaian Mudzakkar-Muannats',
      'Al-Arqam (Bilangan 1–100) & As-Sa\'ah (Jam / Waktu)',
      'Fi\'il Madhi, Fi\'il Mudhari\' & Fi\'il Amr Sederhana',
      'Mubtada & Khabar dalam Kalimat Nominal (Jumlah Ismiyah)',
      'Huruf Jar & Zharaf Makan (Kata Depan & Keterangan Tempat)',
      'Al-Usrah (Keluarga), Al-Mihnatu (Profesi) & Al-Hiwayah (Hobi)'
    ],
    'bahasa_daerah': [
      'Unggah-Ungguh / Undak-Usuk Basa (Ragam Bahasa Santun & Sehari-hari)',
      'Membaca & Menulis Aksara Daerah (Jawa / Sunda / Nusantara)',
      'Cerita Rakyat, Dongeng & Legenda Daerah Setempat',
      'Puisi Tradisional Daerah (Tembang Macapat / Pupuh / Pantun)',
      'Pidato / Biantara Bahasa Daerah dalam Acara Adat & Sekolah',
      'Peribahasa (Paribasan / Babasan) & Ungkapan Budaya Lokal',
      'Artikel Budaya, Makanan Tradisional & Kesenian Daerah'
    ],
    'bahasa_asing': [
      'Salam Sapaan, Perkenalan Diri & Ungkapan Sopan Santun',
      'Pelafalan Dasar, Sistem Penulisan & Kosakata Sehari-hari',
      'Struktur Kalimat Dasar & Tata Bahasa Kontekstual',
      'Bilangan, Waktu, Hari, Tanggal & Aktivitas Harian',
      'Memahami Teks Dialog Singkat & Deskripsi Sederhana',
      'Keluarga, Hobi, Sekolah & Budaya Negara Penutur'
    ],
    'informatika': [
      'Berpikir Komputasional (Dekomposisi, Pola, Abstraksi & Algoritma)',
      'Jaringan Komputer & Topologi Internet',
      'Algoritma Pemrograman & Logika Percabangan/Perulangan',
      'Analisis Data, Visualisasi & Formula Spreadsheet',
      'Perangkat Keras (Hardware), Perangkat Lunak & Sistem Operasi',
      'Dampak Sosial Informatika, Jejak Digital & Etika Siber',
      'Sistem Bilangan Biner, Desimal & Heksadesimal',
      'Keamanan Data, Enkripsi & Proteksi Akun'
    ],
    'matematika': [
      'Eksponen, Bentuk Akar & Notasi Ilmiah',
      'Logaritma & Sifat-Sifat Operasi Logaritma',
      'Sistem Persamaan Linier Dua Variabel (SPLDV)',
      'Persamaan & Fungsi Kuadrat serta Grafik Parabola',
      'Trigonometri Dasar (Sinus, Cosinus, Tangen)',
      'Statistika (Mean, Median, Modus, Jangkauan & Kuartil)',
      'Peluang Kejadian Tunggal & Majemuk',
      'Teorema Pythagoras & Segitiga Istimewa',
      'Transformasi Geometri (Translasi, Refleksi, Rotasi, Dilatasi)',
      'Bangun Ruang Sisi Lengkung (Tabung, Kerucut, Bola)'
    ],
    'fisika': [
      'Besaran Pokok, Besaran Turunan, Satuan SI & Pengukuran',
      'Gerak Lurus Beraturan (GLB) & Gerak Lurus Berubah Beraturan (GLBB)',
      'Hukum Newton tentang Gerak, Gaya Gesek & Dinamika Partikel',
      'Usaha, Energi Kinetik, Energi Potensial & Hukum Kekekalan Energi',
      'Suhu, Kalor, Asas Black & Perpindahan Kalor',
      'Getaran, Gelombang Mekanik, Bunyi & Efek Doppler',
      'Optika Geometri (Cermin, Lensa & Alat Optik)',
      'Listrik Statis, Listrik Dinamis (Hukum Ohm & Kirchhoff) & Kemagnetan'
    ],
    'kimia': [
      'Hakikat Ilmu Kimia, Keselamatan Laboratorium & Metode Ilmiah',
      'Struktur Atom, Konfigurasi Elektron & Sistem Periodik Unsur',
      'Ikatan Kimia (Ion, Kovalen, Logam) & Bentuk Molekul',
      'Tata Nama Senyawa Kimia & Persamaan Reaksi Sederhana',
      'Hukum-Hukum Dasar Kimia & Stoikiometri (Konsep Mol)',
      'Larutan Elektrolit-Nonelektrolit & Reaksi Redoks',
      'Hidrokarbon, Minyak Bumi & Termokimia',
      'Laju Reaksi, Kesetimbangan Kimia & Asam-Basa'
    ],
    'biologi': [
      'Keanekaragaman Hayati, Klasifikasi Makhluk Hidup & Virus',
      'Struktur & Fungsi Sel (Prokariotik, Eukariotik & Organel Sel)',
      'Jaringan Tumbuhan & Jaringan Hewan serta Fungsinya',
      'Sistem Organ Manusia (Pencernaan, Pernapasan, Peredaran Darah)',
      'Ekosistem, Aliran Energi, Daur Biogeokimia & Perubahan Lingkungan',
      'Metabolisme Sel (Enzim, Respirasi Seluler & Fotosintesis)',
      'Substansi Genetika (DNA, RNA, Sintesis Protein) & Pembelahan Sel',
      'Hukum Pewarisan Sifat Mendel, Mutasi & Bioteknologi'
    ],
    'ipa': [
      'Ekosistem, Interaksi Biotik-Abiotik & Rantai Makanan',
      'Sistem Peredaran Darah & Organ Jantung Manusia',
      'Sistem Pencernaan, Nutrisi & Enzim Metabolisme',
      'Sistem Pernapasan & Pertukaran Gas Alveolus',
      'Hukum Newton tentang Gerak, Gaya & Percepatan',
      'Energi Kinetik, Potensial & Hukum Kekekalan Energi',
      'Listrik Dinamis, Rangkaian Seri-Paralel & Hukum Ohm',
      'Pewarisan Sifat, Genetika & Persilangan Monohibrid/Dihibrid',
      'Zat Aditif Makanan, Pewarna Alami & Zat Adiktif',
      'Tekanan Zat Padat, Cair (Hidrostatis) & Hukum Pascal'
    ],
    'tahfidz': [
      'Hafalan Juz 30 (An-Naba s.d. An-Nas) — Muraja\'ah & Sambung Ayat',
      'Hafalan Juz 29 (Al-Mulk s.d. Al-Mursalat) — Mutqin & Tajwid',
      'Hukum Bacaan Nun Sukun, Tanwin & Mim Sukun dalam Tilawah',
      'Hukum Mad (Mad Thabi\'i, Mad Wajib Muttashil, Mad Jaiz Munfashil)',
      'Makharijul Huruf & Sifat-Sifat Huruf Hijaiyah',
      'Adab Terhadap Al-Qur\'an, Halaqah & Metode Penguatan Hafalan',
      'Tafhimul Ayat (Memahami Makna Kosakata & Pesan Pokok Surat Pilihan)'
    ],
    'pai': [
      'Hukum Tajwid Nun Sukun, Tanwin & Mim Sukun',
      'Hukum Tajwid Mad Thabi\'i & Mad Far\'i',
      'Toleransi & Moderasi Beragama dalam Islam (Tasamuh)',
      'Rukun Iman & Pemahaman Asmaul Husna',
      'Ketentuan Shalat Fardhu, Berjamaah & Shalat Sunnah',
      'Zakat Fitrah, Zakat Mal & Golongan Mustahik',
      'Sejarah Perjuangan Dakwah Nabi Muhammad SAW di Madinah',
      'Adab Bergaul, Menghormati Guru & Akhlakul Karimah'
    ],
    'indonesia': [
      'Teks Laporan Hasil Observasi (LHO) & Ciri Kebahasaannya',
      'Teks Eksplanasi Fenomena Alam & Sosial',
      'Teks Pidato Persuasif & Argumen Bernalar Kritis',
      'Unsur Intrinsik & Ekstrinsik Teks Cerpen',
      'Teks Tanggapan Kritis & Resensi Karya',
      'Teks Prosedur & Langkah-Langkah Sistematis',
      'Kaidah Ejaan Bahasa Indonesia (EBI), Kalimat Efektif & Tanda Baca',
      'Puisi Rakyat (Pantun, Gurindam, Syair) & Makna Konotatif'
    ],
    'inggris': [
      'Descriptive Text (Describing People, Animals & Tourist Spots)',
      'Narrative Text (Folktales, Fables & Moral Lessons)',
      'Procedure Text (Step-by-Step Recipes & Manual Guides)',
      'Recount Text (Past Personal Experiences & Historical Events)',
      'Simple Past Tense & Irregular Verbs in Context',
      'Passive Voice in Scientific & General Facts',
      'Asking and Giving Opinions, Agreeing & Disagreeing',
      'Report Text (Scientific Facts & Natural Phenomena)'
    ],
    'sejarah': [
      'Konsep Dasar Sejarah (Diakronik, Sinkronik, Ruang & Waktu)',
      'Asal-Usul Nenek Moyang & Kehidupan Masa Praaksara Indonesia',
      'Kerajaan-Kerajaan Hindu-Buddha & Islam di Nusantara',
      'Kolonialisme, Imperialisme Barat & Perlawanan Bangsa Indonesia',
      'Pergerakan Nasional, Sumpah Pemuda 1928 & Kebangkitan Nasional',
      'Peristiwa Proklamasi Kemerdekaan RI 17 Agustus 1945',
      'Perjuangan Mempertahankan Kemerdekaan & Demokrasi di Indonesia'
    ],
    'geografi': [
      'Konsep Esensial, Prinsip & Pendekatan Ilmu Geografi',
      'Peta, Penginderaan Jauh & Sistem Informasi Geografis (SIG)',
      'Dinamika Litosfer (Tektonisme, Vulkanisme, Seisme) & Pedosfer',
      'Dinamika Atmosfer (Cuaca, Iklim) & Hidrosfer (Siklus Air)',
      'Sebaran Flora-Fauna, Bioma & Potensi Sumber Daya Alam Indonesia',
      'Dinamika Kependudukan, Keragaman Budaya & Mitigasi Bencana'
    ],
    'ekonomi': [
      'Konsep Ilmu Ekonomi, Kelangkaan & Biaya Peluang',
      'Kegiatan Ekonomi, Pelaku Ekonomi & Circular Flow Diagram',
      'Permintaan, Penawaran, Elastisitas & Harga Keseimbangan Pasar',
      'Struktur Pasar, Lembaga Keuangan, Bank Sentral & OJK',
      'Pendapatan Nasional, Pertumbuhan Ekonomi & Ketenagakerjaan',
      'Kebijakan Moneter, Kebijakan Fiskal, APBN/APBD & Perdagangan Internasional',
      'Persamaan Dasar Akuntansi & Siklus Akuntansi Perusahaan'
    ],
    'sosiologi': [
      'Hakikat Sosiologi sebagai Ilmu tentang Masyarakat & Realitas Sosial',
      'Interaksi Sosial, Nilai, Norma & Sosialisasi Pembentukan Kepribadian',
      'Kelompok Sosial, Diferensiasi & Stratifikasi Sosial',
      'Konflik Sosial, Kekerasan, Integrasi & Harmoni Sosial',
      'Perubahan Sosial, Globalisasi & Pemberdayaan Komunitas Lokal'
    ],
    'ips': [
      'Karakteristik Geografis & Potensi Sumber Daya Negara ASEAN',
      'Interaksi Antarruang & Perubahan Sosial Budaya',
      'Kegiatan Ekonomi (Produksi, Distribusi, Konsumsi) & Pasar Bebas',
      'Lembaga Sosial & Peranannya dalam Keteraturan Masyarakat',
      'Peristiwa Menjelang Proklamasi Kemerdekaan Indonesia',
      'Permintaan, Penawaran & Pembentukan Harga Keseimbangan',
      'Globalisasi, Kearifan Lokal & Tantangan Era Digital'
    ],
    'pancasila': [
      'Penerapan Nilai-Nilai Pancasila dalam Kehidupan Berbangsa',
      'Norma Hukum, Hak & Kewajiban Asasi Warga Negara',
      'Makna & Kedudukan UUD NRI Tahun 1945',
      'Bhinneka Tunggal Ika & Menghargai Keragaman Suku/Agama',
      'Kedaulatan Rakyat, Demokrasi Pancasila & Pemilu',
      'Menjaga Keutuhan Negara Kesatuan Republik Indonesia (NKRI)'
    ],
    'pjok': [
      'Teknik Dasar & Aturan Permainan Bola Voli (Passing & Servis)',
      'Keterampilan Menggiring, Mengoper & Menembak Bola Basket',
      'Latihan Kebugaran Jasmani (Kekuatan, Kelenturan, Daya Tahan)',
      'Aktivitas Senam Lantai (Roll Depan, Roll Belakang, Sikap Lilin)',
      'Pola Hidup Bersih dan Sehat (PHBS) serta Bahaya Merokok/NAPZA',
      'Aktivitas Atletik (Lari Cepat/Sprint & Lompat Jauh)'
    ],
    'seni': [
      'Menggambar Model dengan Proporsi & Pencahayaan',
      'Ragam Hias Flora, Fauna & Geometris Tradisional Nusantara',
      'Teknik Bernyanyi Vokal Grup & Tangga Nada Diatonis',
      'Mengenal Alat Musik Tradisional Nusantara & Musik Ansambel',
      'Apresiasi Karya Seni Patung & Seni Rupa Terapan Daerah',
      'Eksplorasi Gerak Tari Tradisional & Iringan Musik'
    ],
    'prakarya': [
      'Pengolahan Bahan Pangan Buah & Sayuran Menjadi Makanan Khas',
      'Kerajinan Bahan Serat Alam & Bahan Lunak Alami',
      'Budidaya Tanaman Sayuran dengan Metode Hidroponik',
      'Teknik Dasar Pengemasan Produk & Analisis Usaha Sederhana',
      'Pengolahan Bahan Samping Pangan Menjadi Produk Bergizi'
    ],
    'bk': [
      'Mengenal Potensi Diri, Minat & Gaya Belajar Efektif',
      'Manajemen Waktu & Mengatasi Kebiasaan Menunda Belajar',
      'Perencanaan Karir & Pemilihan Jurusan/Sekolah Lanjutan',
      'Komunikasi Asertif & Pencegahan Perundungan (Anti-Bullying)',
      'Manajemen Emosi, Regulasi Diri & Mengatasi Stres Belajar'
    ]
  };

  const getSubjectCategoryKey = (mapel: string): string => {
    const m = (mapel || '').trim().toLowerCase();

    // 1. Cek Bahasa Jepang
    if (m.includes('jepang') || m.includes('japanese') || m.includes('nihongo')) {
      return 'bahasa_jepang';
    }

    // 2. Cek Bahasa Arab
    if (m.includes('arab') || m.includes('arabic') || m.includes('nahwu') || m.includes('shorof') || m.includes('sharaf')) {
      return 'bahasa_arab';
    }

    // 3. Cek Bahasa Daerah / Muatan Lokal Bahasa
    if (m.includes('sunda') || m.includes('jawa') || m.includes('daerah') || m.includes('bali') || m.includes('madura') || m.includes('minang') || m.includes('bugis') || m.includes('batak')) {
      return 'bahasa_daerah';
    }

    // 4. Cek Bahasa Asing Lainnya (Mandarin, Korea, Jerman, Perancis, dll.)
    if (m.includes('mandarin') || m.includes('korea') || m.includes('jerman') || m.includes('perancis') || m.includes('prancis') || m.includes('spanyol') || m.includes('bahasa asing')) {
      return 'bahasa_asing';
    }

    // 5. Cek Informatika / Komputer / TIK
    const isTik = /(?:^|[\s/()_-])tik(?:[\s/()_-]|$)/i.test(m);
    if (m.includes('informatika') || m.includes('komputer') || m.includes('coding') || m.includes('cyber') || m.includes('pemrograman') || isTik) {
      return 'informatika';
    }

    // 6. Cek Matematika
    if (m.includes('matematik') || m.includes('mtk') || m.includes('kalkulus') || m.includes('aljabar') || m.includes('geometri') || m.includes('trigonometri')) {
      return 'matematika';
    }

    // 7. Cek Fisika, Kimia, Biologi, dan IPA umum
    if (m.includes('fisika')) return 'fisika';
    if (m.includes('kimia')) return 'kimia';
    if (m.includes('biologi')) return 'biologi';
    const isIpa = /(?:^|[\s/()_-])ipa(?:[\s/()_-]|$)/i.test(m);
    if (isIpa || m.includes('sains') || m.includes('ilmu pengetahuan alam')) {
      return 'ipa';
    }

    // 8. Cek Tahfidz & PAI / Agama Islam
    if (m.includes('tahfidz') || m.includes('tahfiz') || m.includes('al-qur') || m.includes('alquran')) {
      return 'tahfidz';
    }
    const isPai = /(?:^|[\s/()_-])pai(?:[\s/()_-]|$)/i.test(m);
    if (isPai || m.includes('agama') || m.includes('islam') || m.includes('fiqih') || m.includes('fikih') || m.includes('akidah') || m.includes('aqidah') || m.includes('qur') || m.includes('hadits')) {
      return 'pai';
    }

    // 9. Cek Bahasa Indonesia
    if (m.includes('indonesia') || /(?:^|[\s/()_-])bindo(?:[\s/()_-]|$)/i.test(m)) {
      return 'indonesia';
    }

    // 10. Cek Bahasa Inggris
    if (m.includes('inggris') || m.includes('english') || /(?:^|[\s/()_-])bing(?:[\s/()_-]|$)/i.test(m)) {
      return 'inggris';
    }

    // 11. Cek Sejarah, Geografi, Ekonomi, Sosiologi, dan IPS umum
    if (m.includes('sejarah')) return 'sejarah';
    if (m.includes('geografi')) return 'geografi';
    if (m.includes('ekonomi') || m.includes('akuntansi')) return 'ekonomi';
    if (m.includes('sosiologi') || m.includes('antropologi')) return 'sosiologi';
    const isIps = /(?:^|[\s/()_-])ips(?:[\s/()_-]|$)/i.test(m);
    if (isIps || m.includes('ilmu pengetahuan sosial')) {
      return 'ips';
    }

    // 12. Cek Pancasila / PKn / PPKn
    const isPkn = /(?:^|[\s/()_-])pkn(?:[\s/()_-]|$)/i.test(m) || /(?:^|[\s/()_-])ppkn(?:[\s/()_-]|$)/i.test(m);
    if (isPkn || m.includes('pancasila') || m.includes('kewarganegaraan')) {
      return 'pancasila';
    }

    // 13. Cek PJOK / Olahraga
    const isPjok = /(?:^|[\s/()_-])pjok(?:[\s/()_-]|$)/i.test(m);
    if (isPjok || m.includes('olahraga') || m.includes('penjas') || m.includes('jasmani')) {
      return 'pjok';
    }

    // 14. Cek Seni Budaya
    if (m.includes('seni') || m.includes('musik') || m.includes('lukis') || m.includes('tari') || m.includes('teater')) {
      return 'seni';
    }

    // 15. Cek Prakarya
    if (m.includes('prakarya') || m.includes('kewirausahaan') || m.includes('pkwu')) {
      return 'prakarya';
    }

    // 16. Cek BK / Bimbingan Konseling
    const isBk = /(?:^|[\s/()_-])bk(?:[\s/()_-]|$)/i.test(m);
    if (isBk || m.includes('konseling') || m.includes('bimbingan')) {
      return 'bk';
    }

    return 'custom';
  };

  const getSubjectTopicSuggestions = (mapel: string): string[] => {
    const key = getSubjectCategoryKey(mapel);
    if (key !== 'custom' && SUBJECT_TOPIC_MAP[key]) {
      return SUBJECT_TOPIC_MAP[key];
    }
    const cleanMapel = (mapel || 'Mata Pelajaran').trim();
    return [
      `Konsep Dasar & Ruang Lingkup ${cleanMapel}`,
      `Prinsip, Kaidah & Terminologi Pokok ${cleanMapel}`,
      `Penerapan ${cleanMapel} dalam Kehidupan Sehari-hari`,
      `Analisis Studi Kasus & Pemecahan Masalah ${cleanMapel}`,
      `Keterampilan Praktik & Proyek Pembelajaran ${cleanMapel}`,
      `Evaluasi Pemahaman & Penalaran Kritis (HOTS) ${cleanMapel}`,
      `Literasi & Pemahaman Teks Kontekstual ${cleanMapel}`,
      `Integrasi Nilai Profil Pelajar Pancasila dalam ${cleanMapel}`
    ];
  };

  const getSubjectMetadata = (mapel: string) => {
    const key = getSubjectCategoryKey(mapel);
    switch (key) {
      case 'bahasa_jepang':
        return { icon: '🇯🇵', label: 'Bahasa Jepang', colorBadge: 'bg-rose-50 text-rose-700 border-rose-200', placeholder: 'Contoh: Hiragana & Katakana, Aisatsu, Jikoshoukai, Partikel wa/ga/o/ni, Kata Kerja -masu...' };
      case 'bahasa_arab':
        return { icon: '🕌', label: 'Bahasa Arab', colorBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200', placeholder: 'Contoh: Ta\'aruf, Al-Adawat Al-Madrasiyah, Fi\'il Madhi & Mudhari\', Jumlah Ismiyah...' };
      case 'bahasa_daerah':
        return { icon: '🏺', label: 'Bahasa Daerah', colorBadge: 'bg-amber-50 text-amber-700 border-amber-200', placeholder: 'Contoh: Unggah-Ungguh Basa, Aksara Daerah, Cerita Rakyat, Tembang / Pupuh...' };
      case 'bahasa_asing':
        return { icon: '🌐', label: mapel || 'Bahasa Asing', colorBadge: 'bg-sky-50 text-sky-700 border-sky-200', placeholder: `Contoh: Salam Sapaan, Kosakata Sehari-hari, Tata Bahasa & Dialog ${mapel}...` };
      case 'informatika':
        return { icon: '💻', label: 'Informatika', colorBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200', placeholder: 'Contoh: Berpikir Komputasional, Algoritma Pemrograman, Jaringan Komputer, Sistem Biner...' };
      case 'matematika':
        return { icon: '📐', label: 'Matematika', colorBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200', placeholder: 'Contoh: Eksponen & Logaritma, Sistem Persamaan Linier Dua Variabel, Trigonometri...' };
      case 'fisika':
        return { icon: '⚡', label: 'Fisika', colorBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200', placeholder: 'Contoh: GLB & GLBB, Hukum Newton, Usaha & Energi, Listrik Dinamis...' };
      case 'kimia':
        return { icon: '⚗️', label: 'Kimia', colorBadge: 'bg-violet-50 text-violet-700 border-violet-200', placeholder: 'Contoh: Struktur Atom, Ikatan Kimia, Stoikiometri Mol, Asam-Basa...' };
      case 'biologi':
        return { icon: '🧬', label: 'Biologi', colorBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200', placeholder: 'Contoh: Struktur Sel, Sistem Organ Manusia, Ekosistem, Genetika Mendel...' };
      case 'ipa':
        return { icon: '🔬', label: 'IPA / Sains', colorBadge: 'bg-teal-50 text-teal-700 border-teal-200', placeholder: 'Contoh: Sistem Peredaran Darah Manusia, Listrik Dinamis, Ekosistem...' };
      case 'tahfidz':
        return { icon: '📿', label: 'Tahfidz Al-Qur\'an', colorBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200', placeholder: 'Contoh: Hafalan Juz 30 & Juz 29, Sambung Ayat, Hukum Tajwid & Mad, Makharijul Huruf...' };
      case 'pai':
        return { icon: '🕌', label: 'PAI / Agama Islam', colorBadge: 'bg-emerald-50 text-emerald-700 border-emerald-200', placeholder: 'Contoh: Hukum Tajwid, Toleransi Beragama (Tasamuh), Rukun Iman, Zakat...' };
      case 'indonesia':
        return { icon: '📖', label: 'Bahasa Indonesia', colorBadge: 'bg-blue-50 text-blue-700 border-blue-200', placeholder: 'Contoh: Teks Laporan Hasil Observasi (LHO), Teks Pidato Persuasif, Cerpen...' };
      case 'inggris':
        return { icon: '🌍', label: 'Bahasa Inggris', colorBadge: 'bg-sky-50 text-sky-700 border-sky-200', placeholder: 'Contoh: Descriptive Text, Narrative Text, Simple Past Tense, Passive Voice...' };
      case 'sejarah':
        return { icon: '📜', label: 'Sejarah', colorBadge: 'bg-amber-50 text-amber-700 border-amber-200', placeholder: 'Contoh: Kerajaan Nusantara, Pergerakan Nasional, Proklamasi Kemerdekaan...' };
      case 'geografi':
        return { icon: '🗺️', label: 'Geografi', colorBadge: 'bg-teal-50 text-teal-700 border-teal-200', placeholder: 'Contoh: Peta & SIG, Dinamika Litosfer & Atmosfer, Mitigasi Bencana...' };
      case 'ekonomi':
        return { icon: '📊', label: 'Ekonomi', colorBadge: 'bg-blue-50 text-blue-700 border-blue-200', placeholder: 'Contoh: Permintaan & Penawaran, Pendapatan Nasional, Kebijakan Moneter...' };
      case 'sosiologi':
        return { icon: '👥', label: 'Sosiologi', colorBadge: 'bg-purple-50 text-purple-700 border-purple-200', placeholder: 'Contoh: Interaksi Sosial, Stratifikasi Sosial, Perubahan Sosial & Globalisasi...' };
      case 'ips':
        return { icon: '🏛️', label: 'IPS / Sosial', colorBadge: 'bg-amber-50 text-amber-700 border-amber-200', placeholder: 'Contoh: Interaksi Antarruang Negara ASEAN, Perubahan Sosial Budaya, Pasar Bebas...' };
      case 'pancasila':
        return { icon: '🇮🇩', label: 'Pendidikan Pancasila', colorBadge: 'bg-rose-50 text-rose-700 border-rose-200', placeholder: 'Contoh: Penerapan Nilai Pancasila, Norma Hukum & UUD 1945, Bhinneka Tunggal Ika...' };
      case 'pjok':
        return { icon: '⚽', label: 'PJOK / Olahraga', colorBadge: 'bg-green-50 text-green-700 border-green-200', placeholder: 'Contoh: Teknik Dasar Bola Voli, Senam Lantai, Kebugaran Jasmani...' };
      case 'seni':
        return { icon: '🎨', label: 'Seni Budaya', colorBadge: 'bg-purple-50 text-purple-700 border-purple-200', placeholder: 'Contoh: Menggambar Model & Proporsi, Musik Tradisional Nusantara, Ragam Hias...' };
      case 'prakarya':
        return { icon: '🛠️', label: 'Prakarya & PKWU', colorBadge: 'bg-orange-50 text-orange-700 border-orange-200', placeholder: 'Contoh: Pengolahan Pangan Bahan Nabati, Kerajinan Serat Alam, Hidroponik...' };
      case 'bk':
        return { icon: '🧠', label: 'Bimbingan Konseling', colorBadge: 'bg-cyan-50 text-cyan-700 border-cyan-200', placeholder: 'Contoh: Manajemen Waktu Belajar, Perencanaan Karir, Anti-Bullying...' };
      default:
        return { icon: '📚', label: mapel || 'Mata Pelajaran', colorBadge: 'bg-indigo-50 text-indigo-700 border-indigo-200', placeholder: `Contoh: Konsep dasar, kaidah, dan penerapan materi ${mapel || 'Kurikulum Merdeka'}...` };
    }
  };

  const handleOpenAiModalForActiveBank = () => {
    if (!activeBank) return;
    
    // Periksa apakah mapel aktif sesuai atau bisa diambil dari judul paket
    let detectedMapel = activeBank.mataPelajaran || '';
    if (!detectedMapel || detectedMapel.trim() === '' || detectedMapel === 'Umum') {
      const judulLower = (activeBank.judul || '').toLowerCase();
      if (judulLower.includes('jepang') || judulLower.includes('nihongo')) detectedMapel = 'Bahasa Jepang';
      else if (judulLower.includes('arab')) detectedMapel = 'Bahasa Arab';
      else if (judulLower.includes('tahfidz') || judulLower.includes('tahfiz')) detectedMapel = 'Tahfidz Al-Qur\'an';
      else if (judulLower.includes('matematik')) detectedMapel = 'Matematika';
      else if (judulLower.includes('informatika') || judulLower.includes('tik')) detectedMapel = 'Informatika';
      else if (judulLower.includes('fisika')) detectedMapel = 'Fisika';
      else if (judulLower.includes('kimia')) detectedMapel = 'Kimia';
      else if (judulLower.includes('biologi')) detectedMapel = 'Biologi';
      else if (judulLower.includes('ipa') || judulLower.includes('sains')) detectedMapel = 'Ilmu Pengetahuan Alam (IPA)';
      else if (judulLower.includes('agama') || judulLower.includes('pai')) detectedMapel = 'Pendidikan Agama Islam';
      else if (judulLower.includes('inggris')) detectedMapel = 'Bahasa Inggris';
      else if (judulLower.includes('indonesia')) detectedMapel = 'Bahasa Indonesia';
      else if (judulLower.includes('sejarah')) detectedMapel = 'Sejarah';
      else if (judulLower.includes('geografi')) detectedMapel = 'Geografi';
      else if (judulLower.includes('ekonomi')) detectedMapel = 'Ekonomi';
      else if (judulLower.includes('sosiologi')) detectedMapel = 'Sosiologi';
      else if (judulLower.includes('ips')) detectedMapel = 'Ilmu Pengetahuan Sosial (IPS)';
      else if (judulLower.includes('pancasila') || judulLower.includes('pkn')) detectedMapel = 'Pendidikan Pancasila';
      else if (judulLower.includes('pjok') || judulLower.includes('olahraga')) detectedMapel = 'PJOK';
      else if (judulLower.includes('seni')) detectedMapel = 'Seni Budaya';
      else if (judulLower.includes('prakarya')) detectedMapel = 'Prakarya & Kewirausahaan';
      else detectedMapel = availableMapelList[0] || 'Matematika';
    }

    setInBankAiMapel(detectedMapel);
    setInBankAiKelas(activeBank.kelas || 'X-IPA-1');
    
    // Ambil topik spesifik yang relevan dengan mata pelajaran tersebut
    const suggestions = getSubjectTopicSuggestions(detectedMapel);
    const defaultTopic = suggestions.length > 0 ? suggestions[0] : `Konsep Dasar ${detectedMapel}`;

    setInBankAiTopik(defaultTopic);
    setInBankAiJumlah(10);
    setInBankAiTipeSoal(['pg', 'multiple_choice', 'isian', 'esai']);
    setInBankAiKesulitan('Sedang (C3: Aplikasi Konsep)');
    setInBankAiInstruksi('');
    setInBankAiBobot(10);
    setInBankAiGeneratedList([]);
    setInBankAiSelectedIndices([]);
    setShowAiModalInBank(true);
  };

  const handleToggleInBankAiTipe = (tipeId: string) => {
    setInBankAiTipeSoal(prev => {
      if (prev.includes(tipeId)) {
        if (prev.length === 1) return prev; // keep at least 1
        return prev.filter(t => t !== tipeId);
      }
      return [...prev, tipeId];
    });
  };

  const handleGenerateInBankAi = async () => {
    if (!inBankAiTopik.trim()) {
      alert('Harap ketikkan atau pilih topik materi soal terlebih dahulu!');
      return;
    }
    setInBankAiLoading(true);
    setInBankAiGeneratedList([]);
    setInBankAiSelectedIndices([]);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mataPelajaran: inBankAiMapel,
          kelas: inBankAiKelas,
          topik: inBankAiTopik,
          jumlahSoal: inBankAiJumlah,
          tipeSoal: inBankAiTipeSoal,
          tingkatKesulitan: inBankAiKesulitan,
          instruksiTambahan: inBankAiInstruksi,
          bobotPerSoal: inBankAiBobot
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.soalList) && data.soalList.length > 0) {
        const formatted: SoalCBT[] = data.soalList.map((item: any, idx: number) => ({
          id: `soal-ai-${Date.now()}-${idx}`,
          tipe: item.tipe || 'pg',
          pertanyaan: item.pertanyaan || '',
          opsi: item.opsi && Array.isArray(item.opsi) && item.opsi.length >= 2 ? item.opsi : (
            (item.tipe === 'pg' || item.tipe === 'multiple_choice') ? [
              { id: 'A', teks: 'Pilihan A' },
              { id: 'B', teks: 'Pilihan B' },
              { id: 'C', teks: 'Pilihan C' },
              { id: 'D', teks: 'Pilihan D' }
            ] : undefined
          ),
          kunciJawaban: item.kunciJawaban || (item.tipe === 'multiple_choice' ? ['A', 'C'] : 'A'),
          pembahasan: item.pembahasan || '',
          bobot: Number(item.bobot) || inBankAiBobot
        }));
        setInBankAiGeneratedList(formatted);
        setInBankAiSelectedIndices(formatted.map((_, i) => i));
      } else {
        alert('Gagal menghasilkan soal dari AI. Silakan coba kembali.');
      }
    } catch (err: any) {
      console.error('Error generating AI questions:', err);
      alert('Terjadi kesalahan saat menghubungi API Gemini AI.');
    } finally {
      setInBankAiLoading(false);
    }
  };

  const handleApplyAiQuestionsToActiveBank = () => {
    if (!activeBank) return;
    const selectedSoal = inBankAiGeneratedList.filter((_, idx) => inBankAiSelectedIndices.includes(idx));
    if (selectedSoal.length === 0) {
      alert('Pilih minimal satu butir soal untuk dimasukkan ke Bank Soal!');
      return;
    }

    setBankSoalList(prev => prev.map(b => {
      if (b.id === activeBank.id) {
        const updatedDaftar = [...b.daftarSoal, ...selectedSoal];
        return {
          ...b,
          daftarSoal: updatedDaftar,
          jumlahSoal: updatedDaftar.length
        };
      }
      return b;
    }));

    setShowAiModalInBank(false);
    setInBankAiToast(`Berhasil menambahkan ${selectedSoal.length} butir soal AI ke paket "${activeBank.judul}"!`);
    setTimeout(() => setInBankAiToast(null), 4000);
  };

  // --- AI Generator State (Legacy subTab) ---
  const initialAiMapel = availableMapelList[0] || 'Informatika';
  const [aiMapel, setAiMapel] = useState(initialAiMapel);
  const [aiKelas, setAiKelas] = useState<string[]>(availableKelasList.length > 0 ? [availableKelasList[0]] : []);
  const [aiTipeSoal, setAiTipeSoal] = useState<string[]>(['pg', 'multiple_choice', 'isian', 'esai']);
  const [aiTopik, setAiTopik] = useState(() => getSubjectTopicSuggestions(initialAiMapel)[0] || 'Capaian Pembelajaran Kurikulum Merdeka');
  const [aiJumlah, setAiJumlah] = useState(10);
  const [loadingAi, setLoadingAi] = useState(false);

  const handleToggleAiKelas = (kelasName: string) => {
    setAiKelas(prev => {
      if (prev.includes(kelasName)) {
        return prev.filter(k => k !== kelasName);
      }
      return [...prev, kelasName];
    });
  };

  const handleToggleAiTipe = (tipeName: string) => {
    setAiTipeSoal(prev => {
      if (prev.includes(tipeName)) {
        if (prev.length === 1) return prev; // prevent emptying
        return prev.filter(t => t !== tipeName);
      }
      return [...prev, tipeName];
    });
  };

  const handleGenerateAi = async () => {
    if (aiKelas.length === 0) {
      alert('Pilih minimal satu kelas target!');
      return;
    }
    setLoadingAi(true);
    try {
      const res = await fetch('/api/ai/generate-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mataPelajaran: aiMapel,
          kelas: aiKelas.join(', '),
          topik: aiTopik,
          jumlahSoal: aiJumlah,
          tipeSoal: aiTipeSoal
        })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.soalList)) {
        const formattedSoal: SoalCBT[] = data.soalList.map((item: any, index: number) => ({
          id: `ai-soal-${Date.now()}-${index}`,
          tipe: item.tipe || 'pg',
          pertanyaan: item.pertanyaan,
          opsi: item.opsi,
          kunciJawaban: item.kunciJawaban,
          pembahasan: item.pembahasan,
          bobot: item.bobot || 25
        }));

        const newBank: BankSoal = {
          id: `bs-ai-${Date.now()}`,
          judul: `AI Bank Soal: ${aiMapel} - ${aiTopik}`,
          kode: `AI-${aiMapel.slice(0,3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          mataPelajaran: aiMapel,
          kelas: aiKelas.join(', '),
          durasiMenit: 60,
          jumlahSoal: formattedSoal.length,
          daftarSoal: formattedSoal,
          dibuatOleh: 'Gemini AI Assistant',
          tanggalDibuat: new Date().toISOString().split('T')[0]
        };

        setBankSoalList(prev => [newBank, ...prev]);
        setSelectedBankId(newBank.id);
        setSubTab('bank_soal');
        alert('Berhasil membuat Bank Soal otomatis dengan Gemini AI!');
      } else {
        alert('Gagal menghasilkan soal. Silakan coba lagi.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Terjadi kesalahan saat menghubungi API Gemini AI.');
    } finally {
      setLoadingAi(false);
    }
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        tipe: "pg",
        pertanyaan: "Berapakah hasil dari 12 x 8?",
        opsi: [
          { id: "A", teks: "96" },
          { id: "B", teks: "84" },
          { id: "C", teks: "108" },
          { id: "D", teks: "72" }
        ],
        kunciJawaban: "A",
        pembahasan: "12 dikali 8 sama dengan 96.",
        bobot: 25
      },
      {
        tipe: "multiple_choice",
        pertanyaan: "Pilihlah planet yang tergolong Planet Dalam (Terestrial)! (Pilihan >1)",
        opsi: [
          { id: "A", teks: "Merkurius" },
          { id: "B", teks: "Venus" },
          { id: "C", teks: "Jupiter" },
          { id: "D", teks: "Saturnus" }
        ],
        kunciJawaban: ["A", "B"],
        pembahasan: "Planet Dalam adalah Merkurius, Venus, Bumi, dan Mars.",
        bobot: 25
      },
      {
        tipe: "isian",
        pertanyaan: "Ibu kota negara Republik Indonesia yang baru di Kalimantan Timur adalah...",
        kunciJawaban: "Nusantara",
        pembahasan: "IKN Nusantara berlokasi di Kalimantan Timur.",
        bobot: 25
      },
      {
        tipe: "esai",
        pertanyaan: "Jelaskan prinsip kerja Fotosintesis pada tumbuhan hijau!",
        kunciJawaban: "Proses merubah air dan CO2 dengan bantuan sinar matahari menjadi glukosa dan O2...",
        pembahasan: "Penilaian berdasarkan penjelasan reaksi terang dan gelap.",
        bobot: 25
      }
    ];

    const jsonStr = JSON.stringify(templateData, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Soal_CBT_4Tipe.json';
    a.click();
  };

  // --- Simulasi Ujian Student State ---
  const [isExamStarted, setIsExamStarted] = useState(false);
  const [selectedExamBank, setSelectedExamBank] = useState<BankSoal | null>(null);
  const [examMapelFilter, setExamMapelFilter] = useState<string>('');
  const [soalIndex, setSoalIndex] = useState(0);
  const [siswaJawaban, setSiswaJawaban] = useState<Record<string, JawabanSiswa>>({});
  const [examFinished, setExamFinished] = useState(false);
  const [finalScore, setFinalScore] = useState<number | null>(null);
  const [selectedSiswaId, setSelectedSiswaId] = useState<string>('');
  const [selectedRaporHasil, setSelectedRaporHasil] = useState<HasilUjian | null>(null);
  const [showKolektifRaporModal, setShowKolektifRaporModal] = useState(false);
  const [selectedMapelRapor, setSelectedMapelRapor] = useState(availableMapelList[0] || 'Matematika');
  const [hasilKelasFilter, setHasilKelasFilter] = useState<string>('Semua');
  const [hasilMapelFilter, setHasilMapelFilter] = useState<string>('Semua');
  const [kolektifKelasFilter, setKolektifKelasFilter] = useState<string>('Semua');
  const [deleteTargetBankSoal, setDeleteTargetBankSoal] = useState<BankSoal | null>(null);
  const [deleteTargetHasilUjian, setDeleteTargetHasilUjian] = useState<HasilUjian | 'all' | null>(null);

  // Resolve Mata Pelajaran for any HasilUjian (supports both new records with mataPelajaran and legacy records linked by ujianId)
  const resolveHasilMapel = useMemo(() => {
    const bankById = new Map<string, string>();
    bankSoalList.forEach(b => {
      if (b.id && b.mataPelajaran?.trim()) bankById.set(b.id, b.mataPelajaran.trim());
    });
    const ujianById = new Map<string, string>();
    ujianList.forEach(u => {
      if (u.mataPelajaran?.trim()) {
        if (u.id) ujianById.set(u.id, u.mataPelajaran.trim());
        if (u.bankSoalId) ujianById.set(u.bankSoalId, u.mataPelajaran.trim());
      }
    });
    const jadwalById = new Map<string, string>();
    jadwalList.forEach(j => {
      if (j.mataPelajaran?.trim()) {
        if (j.ujianId) jadwalById.set(j.ujianId, j.mataPelajaran.trim());
        if (j.id) jadwalById.set(j.id, j.mataPelajaran.trim());
      }
    });

    return (h: HasilUjian): string => {
      if (h.mataPelajaran?.trim()) return h.mataPelajaran.trim();
      if (h.ujianId) {
        const fromBank = bankById.get(h.ujianId);
        if (fromBank) return fromBank;
        const fromUjian = ujianById.get(h.ujianId);
        if (fromUjian) return fromUjian;
        const fromJadwal = jadwalById.get(h.ujianId);
        if (fromJadwal) return fromJadwal;
      }
      return '';
    };
  }, [bankSoalList, ujianList, jadwalList]);

  const kolektifMapelOptions = useMemo(() => {
    const set = new Set<string>(availableMapelList);
    jadwalList.forEach(j => {
      if (j.mataPelajaran?.trim()) set.add(j.mataPelajaran.trim());
    });
    hasilUjianList.forEach(h => {
      const m = resolveHasilMapel(h);
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableMapelList, jadwalList, hasilUjianList, resolveHasilMapel]);

  useEffect(() => {
    if (kolektifMapelOptions.length > 0 && !kolektifMapelOptions.includes(selectedMapelRapor)) {
      setSelectedMapelRapor(kolektifMapelOptions[0]);
    }
  }, [kolektifMapelOptions, selectedMapelRapor]);

  useEffect(() => {
    if (!showKolektifRaporModal && !selectedRaporHasil) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showKolektifRaporModal) setShowKolektifRaporModal(false);
        if (selectedRaporHasil) setSelectedRaporHasil(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showKolektifRaporModal, selectedRaporHasil]);

  const kolektifResultCountByMapel = useMemo(() => {
    const counts = new Map<string, number>();
    hasilUjianList.forEach(h => {
      const m = resolveHasilMapel(h).toLowerCase();
      if (!m) return;
      counts.set(m, (counts.get(m) || 0) + 1);
    });
    return counts;
  }, [hasilUjianList, resolveHasilMapel]);

  const filteredHasilUjianList = useMemo(() => {
    const targetKelas = hasilKelasFilter.toLowerCase().trim();
    const targetMapel = hasilMapelFilter.toLowerCase().trim();
    return hasilUjianList.filter(h => {
      const matchKelas =
        hasilKelasFilter === 'Semua' ||
        (h.kelas && h.kelas.toLowerCase().trim() === targetKelas);
      const matchMapel =
        hasilMapelFilter === 'Semua' ||
        resolveHasilMapel(h).toLowerCase() === targetMapel;
      return matchKelas && matchMapel;
    });
  }, [hasilUjianList, hasilKelasFilter, hasilMapelFilter, resolveHasilMapel]);

  const filteredSiswaListForKolektif = useMemo(() => {
    if (kolektifKelasFilter === 'Semua') return siswaList;
    return siswaList.filter(s => s.kelas && s.kelas.toLowerCase().trim() === kolektifKelasFilter.toLowerCase().trim());
  }, [siswaList, kolektifKelasFilter]);

  // Results filtered STRICTLY to the selected Mata Pelajaran (sorted latest first)
  const hasilForSelectedMapel = useMemo(() => {
    const targetMapel = selectedMapelRapor.trim().toLowerCase();
    if (!targetMapel) return [];
    return hasilUjianList
      .filter(h => resolveHasilMapel(h).toLowerCase() === targetMapel)
      .sort((a, b) => (b.waktuSubmit || '').localeCompare(a.waktuSubmit || ''));
  }, [hasilUjianList, selectedMapelRapor, resolveHasilMapel]);

  // Precomputed rows & per-mapel summary statistics for Modal Rapor Kolektif
  const kolektifRaporRows = useMemo(() => {
    const matchedHasilIds = new Set<string>();
    const rows = filteredSiswaListForKolektif.map(siswa => {
      const siswaNamaNorm = (siswa.nama || '').trim().toLowerCase();
      const siswaNisNorm = (siswa.nis || '').trim();
      const studentResult = hasilForSelectedMapel.find(h => {
        if (h.siswaId && siswa.id && h.siswaId === siswa.id) return true;
        if (siswaNisNorm && h.nis && h.nis.trim() === siswaNisNorm) return true;
        if (siswaNamaNorm && h.siswaNama && h.siswaNama.trim().toLowerCase() === siswaNamaNorm) return true;
        return false;
      });
      if (studentResult) matchedHasilIds.add(studentResult.id);
      return {
        key: siswa.id,
        nama: siswa.nama,
        kelas: siswa.kelas,
        nisDisplay: siswa.nisn || siswa.nis || '-',
        result: studentResult || null
      };
    });

    // Include any submitted result for this mapel & class that is not in siswaList (e.g. demo/archived student)
    const targetKelas = kolektifKelasFilter.trim().toLowerCase();
    hasilForSelectedMapel.forEach(h => {
      if (matchedHasilIds.has(h.id)) return;
      if (kolektifKelasFilter !== 'Semua' && (h.kelas || '').trim().toLowerCase() !== targetKelas) return;
      matchedHasilIds.add(h.id);
      rows.push({
        key: `extra-${h.id}`,
        nama: h.siswaNama,
        kelas: h.kelas || '-',
        nisDisplay: h.nis || '-',
        result: h
      });
    });

    return rows;
  }, [filteredSiswaListForKolektif, hasilForSelectedMapel, kolektifKelasFilter]);

  const kolektifRaporStats = useMemo(() => {
    const totalSiswa = kolektifRaporRows.length;
    const completed = kolektifRaporRows.filter(r => r.result !== null);
    const sudahUjian = completed.length;
    const belumUjian = totalSiswa - sudahUjian;
    const avgScore =
      sudahUjian > 0
        ? Math.round(completed.reduce((sum, r) => sum + (r.result?.nilaiTotal || 0), 0) / sudahUjian)
        : null;
    const tuntasCount = completed.filter(r => (r.result?.nilaiTotal || 0) >= 75).length;
    return { totalSiswa, sudahUjian, belumUjian, avgScore, tuntasCount };
  }, [kolektifRaporRows]);

  const printRaporRef = useRef<HTMLDivElement>(null);
  const printKolektifRef = useRef<HTMLDivElement>(null);

  const printNodeViaHiddenIframe = (title: string, htmlContent: string) => {
    const existing = document.getElementById('cbt-rapor-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cbt-rapor-print-iframe';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      iframe.remove();
      window.print();
      return;
    }

    const headStyles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    doc.open();
    doc.write(`<!DOCTYPE html>
      <html lang="id">
        <head>
          <meta charset="UTF-8" />
          <title>${title}</title>
          ${headStyles}
          <style>
            @page { size: A4 portrait; margin: 12mm; }
            @media print {
              body { margin: 0; padding: 0; background: #ffffff !important; color: #0f172a !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="bg-white text-slate-900 p-4 font-sans">
          <div>${htmlContent}</div>
        </body>
      </html>`);
    doc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => iframe.remove(), 60000);
      }
    }, 300);
  };

  const handlePrintRapor = () => {
    const printContent = printRaporRef.current;
    if (!printContent) return;
    printNodeViaHiddenIframe(
      `Rapor Hasil Ujian CBT - ${selectedRaporHasil?.siswaNama || ''}`,
      printContent.innerHTML
    );
  };

  const handlePrintKolektif = () => {
    const printContent = printKolektifRef.current;
    if (!printContent) return;
    printNodeViaHiddenIframe(
      `Rapor Kolektif Hasil Ujian CBT - ${selectedMapelRapor}`,
      printContent.innerHTML
    );
  };

  // Ambil data siswa aktif secara dinamis & akurat sesuai akun login atau pilihan simulasi
  const activeSiswa = useMemo(() => {
    // 1. Jika admin/guru secara manual memilih siswa dari dropdown simulasi, gunakan pilihan tersebut
    if (currentRole !== 'siswa' && selectedSiswaId) {
      const found = (siswaList || []).find(s => s.id === selectedSiswaId);
      if (found) return found;
    }

    const emailLower = userEmail?.toLowerCase().trim() || '';
    const emailPrefix = emailLower.split('@')[0];

    // 2. Cari siswa yang emailnya cocok atau username / NIS cocok dengan userEmail / emailPrefix
    const foundSiswa = (siswaList || []).find(s => {
      const sEmail = s.email?.toLowerCase().trim() || '';
      const sUsername = s.username?.toLowerCase().trim() || '';
      const sId = s.id?.toLowerCase().trim() || '';
      const sNis = s.nis?.toLowerCase().trim() || '';
      const sNisn = s.nisn?.toLowerCase().trim() || '';

      // Match criteria - Ensure none of the comparison fields are empty strings to avoid false positive matches
      return (
        (sEmail && sEmail === emailLower) ||
        (sUsername && sUsername === emailLower) ||
        (sId && sId === emailLower) ||
        (sNis && sNis === emailLower) ||
        (sNisn && sNisn === emailLower) ||
        (emailPrefix && (
          (sEmail && sEmail === emailPrefix) ||
          (sUsername && sUsername === emailPrefix) ||
          (sId && sId === emailPrefix) ||
          (sNis && sNis === emailPrefix) ||
          (sNisn && sNisn === emailPrefix)
        )) ||
        (emailLower.length > 0 && (
          (sUsername && emailLower.startsWith(sUsername)) ||
          (sNis && emailLower.startsWith(sNis)) ||
          (sId && emailLower.startsWith(sId)) ||
          (sUsername && emailLower.includes(sUsername)) ||
          (sNis && emailLower.includes(sNis))
        ))
      );
    });

    if (foundSiswa) return foundSiswa;

    // 3. Jika login sebagai siswa tapi tidak ditemukan di database dengan email itu,
    // coba cari siswa pertama yang namanya mengandung bagian dari email prefix
    if (emailPrefix && emailPrefix.length > 2) {
      const matchingByName = (siswaList || []).find(s => {
        const sNama = s.nama?.toLowerCase() || '';
        return sNama.includes(emailPrefix) || emailPrefix.includes(sNama);
      });
      if (matchingByName) return matchingByName;
    }

    // 4. Jika tidak ada kecocokan email tapi ada daftar siswa, berikan rekomendasi otomatis
    // Sesuai permintaan user, prioritaskan "Azahra", "Alya Salsabila" atau "Syahira"
    if (siswaList && siswaList.length > 0) {
      if (emailLower.includes('azahra') || emailLower.includes('zahra') || emailLower.includes('kamilah')) {
        const azahra = siswaList.find(s => s.nama.toLowerCase().includes('azahra') || s.nama.toLowerCase().includes('zahra'));
        if (azahra) return azahra;
      }
      if (emailLower.includes('alya')) {
        const alya = siswaList.find(s => s.nama.toLowerCase().includes('alya'));
        if (alya) return alya;
      }
      if (emailLower.includes('syahira')) {
        const syahira = siswaList.find(s => s.nama.toLowerCase().includes('syahira'));
        if (syahira) return syahira;
      }
      
      // Default fallback demo: cari siswa bernama "Azahra" (untuk visual demo terbaik sesuai screenshot user)
      const defaultAzahra = siswaList.find(s => s.nama.toLowerCase().includes('azahra') || s.nama.toLowerCase().includes('zahra'));
      if (defaultAzahra) return defaultAzahra;

      const defaultAlya = siswaList.find(s => s.nama.toLowerCase().includes('alya'));
      if (defaultAlya) return defaultAlya;

      // Jika tidak ada "Alya" di database, cari "Syahira"
      const defaultSyahira = siswaList.find(s => s.nama.toLowerCase().includes('syahira'));
      if (defaultSyahira) return defaultSyahira;

      return siswaList[0];
    }

    // 5. Fallback final jika list kosong
    return {
      id: 'sis-002',
      nisn: '122600683',
      nis: '10209',
      nama: 'Alya Salsabila Amani',
      kelas: 'IX - Utsman bin Affan',
      jenisKelamin: 'P',
      fotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
    };
  }, [siswaList, currentRole, userEmail, selectedSiswaId]);

  const activeGuru = useMemo(() => {
    const emailLower = userEmail?.toLowerCase().trim() || '';
    const emailPrefix = emailLower.split('@')[0];

    const found = (guruList || []).find(g => {
      const gEmail = g.email?.toLowerCase().trim() || '';
      const gUsername = g.username?.toLowerCase().trim() || '';
      return (
        (gEmail && gEmail === emailLower) ||
        (gUsername && gUsername === emailLower) ||
        (emailPrefix && (
          (gEmail && gEmail === emailPrefix) ||
          (gUsername && gUsername === emailPrefix)
        )) ||
        (emailLower.length > 0 && (
          (gUsername && emailLower.includes(gUsername)) ||
          (gEmail && emailLower.includes(gEmail))
        ))
      );
    });

    return found || guruList[0] || { id: 'g-1', nama: 'Siti Rahmawati, S.Si., M.Sc.', mataPelajaran: 'Matematika', nip: '19850115', email: 'siti.rahmawati@guru.sch.id', fotoUrl: '' };
  }, [guruList, userEmail]);

  const generateBankKode = (mapelName: string, kelasName: string) => {
    const cleanMapel = (mapelName || 'CBT')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .map(w => w.slice(0, 3).toUpperCase())
      .join('')
      .slice(0, 4) || 'CBT';
    const romanMatch = (kelasName || '').match(/\b(VII|VIII|IX|X|XI|XII|7|8|9|10|11|12)\b/i);
    const kelasPart = romanMatch ? romanMatch[1].toUpperCase() : 'SMP';
    const year = new Date().getFullYear();
    const seq = String(bankSoalList.length + 1).padStart(2, '0');
    return `${cleanMapel}-${kelasPart}-${year}-${seq}`;
  };

  const handleOpenAddBankModal = () => {
    const defaultMapel =
      currentRole === 'guru' && activeGuru?.mataPelajaran && activeGuru.mataPelajaran.trim()
        ? activeGuru.mataPelajaran.trim()
        : availableMapelList[0] || 'Matematika';
    const defaultKelas = availableKelasList[0] || 'VIII - Al Biruni';
    setEditingBankId(null);
    setBankMapel(defaultMapel);
    setBankKelas(defaultKelas);
    setBankJudul(`Asesmen Sumatif - ${defaultMapel} Kurikulum Merdeka`);
    setBankKode(generateBankKode(defaultMapel, defaultKelas));
    setBankDurasi(90);
    setBankImportedSoal([]);
    setBankImportFileName('');
    setBankFormError('');
    setShowAddBankModal(true);
  };

  const handleOpenEditBankModal = (bank: BankSoal) => {
    setEditingBankId(bank.id);
    setBankJudul(bank.judul);
    setBankKode(bank.kode);
    setBankMapel(bank.mataPelajaran);
    setBankKelas(bank.kelas);
    setBankDurasi(bank.durasiMenit || 90);
    setBankImportedSoal([]);
    setBankImportFileName('');
    setBankFormError('');
    setShowAddBankModal(true);
  };

  const handleImportJsonForBank = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBankFormError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(String(ev.target?.result || '[]'));
        const rawList = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.daftarSoal) ? parsed.daftarSoal : null;
        if (!rawList || rawList.length === 0) {
          setBankFormError('File JSON harus berisi array daftar soal (minimal 1 soal).');
          return;
        }
        const normalized: SoalCBT[] = rawList
          .filter((item: any) => item && typeof item.pertanyaan === 'string' && item.pertanyaan.trim())
          .map((item: any, idx: number) => {
            const tipe: TipeSoal = ['pg', 'multiple_choice', 'isian', 'esai'].includes(item.tipe) ? item.tipe : 'pg';
            return {
              id: `soal-json-${Date.now()}-${idx}`,
              tipe,
              pertanyaan: item.pertanyaan.trim(),
              opsi:
                tipe === 'pg' || tipe === 'multiple_choice'
                  ? Array.isArray(item.opsi) && item.opsi.length >= 2
                    ? item.opsi
                    : [
                        { id: 'A', teks: 'Opsi A' },
                        { id: 'B', teks: 'Opsi B' },
                        { id: 'C', teks: 'Opsi C' },
                        { id: 'D', teks: 'Opsi D' }
                      ]
                  : undefined,
              kunciJawaban: item.kunciJawaban ?? (tipe === 'multiple_choice' ? ['A', 'B'] : 'A'),
              pembahasan: item.pembahasan || '',
              bobot: Number(item.bobot) || 25
            };
          });
        if (normalized.length === 0) {
          setBankFormError('Tidak ada soal valid ditemukan dalam file JSON.');
          return;
        }
        setBankImportedSoal(normalized);
        setBankImportFileName(`${file.name} (${normalized.length} soal)`);
      } catch {
        setBankFormError('Format file JSON tidak valid. Gunakan Template JSON sebagai acuan.');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveBankPaket = (e: React.FormEvent) => {
    e.preventDefault();
    setBankFormError('');
    if (!bankJudul.trim()) {
      setBankFormError('Judul Paket Bank Soal wajib diisi.');
      return;
    }
    if (!bankKode.trim()) {
      setBankFormError('Kode Paket wajib diisi.');
      return;
    }
    if (!bankMapel.trim()) {
      setBankFormError('Mata Pelajaran wajib dipilih.');
      return;
    }
    if (!bankKelas.trim()) {
      setBankFormError('Kelas Target wajib dipilih.');
      return;
    }
    const durasiNum = Math.max(5, Number(bankDurasi) || 90);
    const pembuatNama =
      currentRole === 'guru'
        ? activeGuru?.nama || userEmail || 'Guru Pengampu'
        : 'Administrator';

    if (editingBankId) {
      setBankSoalList(prev =>
        prev.map(b =>
          b.id === editingBankId
            ? {
                ...b,
                judul: bankJudul.trim(),
                kode: bankKode.trim().toUpperCase(),
                mataPelajaran: bankMapel.trim(),
                kelas: bankKelas.trim(),
                durasiMenit: durasiNum,
                daftarSoal: bankImportedSoal.length > 0 ? [...b.daftarSoal, ...bankImportedSoal] : b.daftarSoal,
                jumlahSoal:
                  bankImportedSoal.length > 0
                    ? b.daftarSoal.length + bankImportedSoal.length
                    : b.daftarSoal.length
              }
            : b
        )
      );
      showToast('Paket Bank Soal berhasil diperbarui!');
    } else {
      const newBank: BankSoal = {
        id: `bs-${Date.now()}`,
        judul: bankJudul.trim(),
        kode: bankKode.trim().toUpperCase(),
        mataPelajaran: bankMapel.trim(),
        kelas: bankKelas.trim(),
        durasiMenit: durasiNum,
        jumlahSoal: bankImportedSoal.length,
        daftarSoal: bankImportedSoal,
        dibuatOleh: pembuatNama,
        tanggalDibuat: new Date().toISOString().split('T')[0]
      };
      setBankSoalList(prev => [newBank, ...prev]);
      setSelectedBankId(newBank.id);
      showToast(`Paket "${newBank.judul}" berhasil ditambahkan ke Daftar Bank Soal!`);
    }

    setShowAddBankModal(false);
    setEditingBankId(null);
  };

  const displayedBankSoalList = useMemo(() => {
    if (currentRole === 'guru' && filterBankByGuruMapel && activeGuru?.mataPelajaran) {
      const guruMapelLower = activeGuru.mataPelajaran.toLowerCase();
      return bankSoalList.filter(
        b =>
          (b.mataPelajaran || '').toLowerCase().includes(guruMapelLower) ||
          guruMapelLower.includes((b.mataPelajaran || '').toLowerCase()) ||
          b.dibuatOleh === activeGuru.nama
      );
    }
    return bankSoalList;
  }, [bankSoalList, currentRole, filterBankByGuruMapel, activeGuru]);
  
  // Real dynamic timer matching the mockup image (1 Jam 49 Menit 51 Detik)
  const [timeLeft, setTimeLeft] = useState(1 * 3600 + 49 * 60 + 51);

  useEffect(() => {
    if (subTab !== 'simulasi_ujian' || examFinished) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          handleFinishExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [subTab, examFinished]);

  const getFormattedTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h} Jam ${m} Menit ${s} Detik`;
  };

  // --- Anti-Cheat Monitoring & Audio Alarm State ---
  const [cheatCount, setCheatCount] = useState(0);
  const [showCheatAlert, setShowCheatAlert] = useState(false);
  const [cheatLogs, setCheatLogs] = useState<string[]>([]);

  // Synthesizer Web Audio API for Warning Alarm (Bip Bip Bip)
  const playViolationBeepSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const now = ctx.currentTime;
      
      // Play 3 loud, high-pitched alarm beeps in quick succession: "Bip... Bip... Bip!"
      const beeps = [
        { time: now + 0.05, freq: 900, dur: 0.12 },
        { time: now + 0.22, freq: 900, dur: 0.12 },
        { time: now + 0.39, freq: 1150, dur: 0.22 }
      ];

      beeps.forEach(({ time, freq, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth'; // Piercing, clear warning alarm tone
        osc.frequency.setValueAtTime(freq, time);

        // Envelope: instant attack, punchy decay
        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.45, time + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur + 0.05);
      });
    } catch (e) {
      console.error('Audio warning beep error:', e);
    }
  };

  // Continuous sound alarm loop while the violation popup (showCheatAlert) is visible
  useEffect(() => {
    if (!showCheatAlert) return;

    // Play initial beep burst immediately
    playViolationBeepSound();

    // Repeat alarm beep "bip bip bip" every 1.4s until dismissed
    const alarmInterval = setInterval(() => {
      playViolationBeepSound();
    }, 1400);

    return () => {
      clearInterval(alarmInterval);
    };
  }, [showCheatAlert]);

  // Window Focus / Tab Switch Detection Effect
  useEffect(() => {
    if (subTab !== 'simulasi_ujian' || examFinished) return;

    const handleWindowBlur = () => {
      setCheatCount(prev => {
        const next = prev + 1;
        const timeLog = new Date().toLocaleTimeString('id-ID');
        setCheatLogs(logs => [`[${timeLog}] Terdeteksi keluar dari aplikasi CBT (Pelanggaran ke-${next})`, ...logs]);
        setShowCheatAlert(true);

        if (next >= 3) {
          setTimeout(() => {
            handleFinishExam();
            alert('PERINGATAN KRITIS: Anda telah melakukan pelanggaran batas 3x keluar aplikasi! Ujian di-submit otomatis oleh Sistem Anti-Cheat.');
          }, 1000);
        }
        return next;
      });
    };

    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) handleWindowBlur();
    });

    return () => {
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [subTab, examFinished]);

  const currentExam = selectedExamBank || activeBank;
  const currentSoal = currentExam?.daftarSoal[soalIndex];

  const handleAnswerSelect = (soalId: string, answer: string | string[]) => {
    setSiswaJawaban(prev => ({
      ...prev,
      [soalId]: {
        soalId,
        jawaban: answer,
        raguRagu: prev[soalId]?.raguRagu || false
      }
    }));
  };

  const toggleRaguRagu = (soalId: string) => {
    setSiswaJawaban(prev => ({
      ...prev,
      [soalId]: {
        soalId: soalId,
        jawaban: prev[soalId]?.jawaban || '',
        raguRagu: !prev[soalId]?.raguRagu
      }
    }));
  };

  const handleFinishExam = () => {
    if (!currentExam) return;
    let score = 0;
    currentExam.daftarSoal.forEach(s => {
      const userAns = siswaJawaban[s.id]?.jawaban;
      if (s.tipe === 'pg') {
        if (userAns === s.kunciJawaban) score += s.bobot;
      } else if (s.tipe === 'isian') {
        if (typeof userAns === 'string' && typeof s.kunciJawaban === 'string') {
          if (userAns.trim().toLowerCase() === s.kunciJawaban.trim().toLowerCase()) {
            score += s.bobot;
          }
        }
      } else if (s.tipe === 'multiple_choice') {
        if (Array.isArray(userAns) && Array.isArray(s.kunciJawaban)) {
          if (JSON.stringify(userAns.sort()) === JSON.stringify((s.kunciJawaban as string[]).sort())) {
            score += s.bobot;
          }
        }
      } else if (s.tipe === 'esai') {
        // Default partial score for esai preview
        score += Math.round(s.bobot * 0.8);
      }
    });

    const newHasil: HasilUjian = {
      id: `hsl-${Date.now()}`,
      ujianId: currentExam.id,
      mataPelajaran: currentExam.mataPelajaran,
      judulUjian: currentExam.judul,
      siswaId: activeSiswa.id,
      siswaNama: activeSiswa.nama,
      nis: activeSiswa.nis,
      kelas: activeSiswa.kelas,
      jawaban: siswaJawaban,
      nilaiTotal: score,
      statusPenilaian: currentExam.daftarSoal.some(s => s.tipe === 'esai') ? 'Perlu Koreksi Manual' : 'Selesai',
      waktuSubmit: new Date().toISOString(),
      pelanggaranCount: cheatCount,
      logKecurangan: cheatLogs
    };

    if (setHasilUjianList) {
      setHasilUjianList(prev => [...prev, newHasil]);
    }

    setFinalScore(score);
    setExamFinished(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Global Toast Notification */}
      {toastNotification && (
        <div className="fixed top-5 right-5 z-[120] bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 text-xs font-bold animate-bounce">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastNotification}</span>
        </div>
      )}

      {/* Teacher Account Identity Banner */}
      {currentRole === 'guru' && (
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-5 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-purple-700/50">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 border-2 border-white/40 flex items-center justify-center shrink-0 shadow-md">
              {activeGuru?.fotoUrl ? (
                <img src={activeGuru.fotoUrl} alt={activeGuru.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="w-7 h-7 text-white" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-400/40">
                  Guru / Pendidik Aktif
                </span>
                <span className="text-[11px] font-mono text-purple-200">NIP: {activeGuru?.nip || activeGuru?.id || '-'}</span>
              </div>
              <h4 className="text-base font-extrabold text-white mt-1">{activeGuru?.nama || 'Guru Pengampu'}</h4>
              <p className="text-xs text-purple-200 font-medium mt-0.5">Mata Pelajaran: {activeGuru?.mataPelajaran || 'Semua Mata Pelajaran'} | Email: {activeGuru?.email || userEmail || '-'}</p>
            </div>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">Status Akses Guru</div>
            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi CBT
            </div>
          </div>
        </div>
      )}

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#121212] p-5 rounded-xl border border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-400" /> CBT Ujian & Bank Soal
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Input Soal 4 Tipe (PG, Multiple Choice, Isian, Esai), Generator AI, & Simulasi Ujian Online
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg font-bold bg-slate-800/80 text-blue-400 border border-slate-700/60">
            {subTab === 'bank_soal' && `Bank Soal (${bankSoalList.length})`}
            {subTab === 'jadwal_kartu' && 'Jadwal & Kartu Ujian'}
            {subTab === 'denah_ruang' && 'Denah Ruang Ujian'}
            {subTab === 'simulasi_ujian' && 'Simulasi CBT Anti-Cheat'}
            {subTab === 'hasil_ujian' && 'Hasil Ujian (Firebase)'}
            {subTab === 'pengaturan_cbt' && 'Pengaturan Ujian'}
          </span>
        </div>
      </div>

      {/* SUBTAB PENGATURAN CBT UJIAN */}
      {subTab === 'pengaturan_cbt' && (
        <PengaturanCbtSection
          cbtSettings={cbtSettings}
          onSaveSettings={saveCbtSettings}
          schoolSettings={schoolSettings}
          currentRole={currentRole}
          showToast={showToast}
        />
      )}

      {/* SUBTAB DENAH RUANG UJIAN */}
      {subTab === 'denah_ruang' && (
        <DenahRuangUjian
          siswaList={siswaList}
          guruList={guruList}
          rombelList={rombelList}
          schoolSettings={schoolSettings}
          cbtSettings={cbtSettings}
          currentRole={currentRole}
          userEmail={userEmail}
        />
      )}

      {/* SUBTAB JADWAL & KARTU PESERTA UJIAN */}
      {subTab === 'jadwal_kartu' && (
        <div className="space-y-6">

          {/* Manajemen Jadwal Ujian */}
          <JadwalUjianSection
            jadwalList={jadwalList}
            onSaveJadwalList={saveJadwalList}
            ujianList={ujianList}
            bankSoalList={bankSoalList}
            mapelList={mapelList}
            rombelList={rombelList}
            siswaList={siswaList}
            guruList={guruList}
            stafList={stafList}
            schoolSettings={schoolSettings}
            cbtSettings={cbtSettings}
            currentRole={currentRole}
            showToast={showToast}
          />

          {/* Kartu Peserta Ujian Generator */}
          <div className="bg-[#121212] rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="font-bold text-white text-base flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-purple-400" /> Cetak Kartu Peserta & Kartu Jadwal Ujian
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kartu resmi peserta ujian CBT (10 × 13 cm • 4 kartu/lembar HVS A4) lengkap dengan username & password dari database siswa
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <div className="text-xs text-slate-400 font-medium">
                  Menampilkan <span className="text-white font-bold">{filteredKartuSiswaList.length}</span> dari{' '}
                  <span className="text-white font-bold">{siswaList.length}</span> siswa
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (batchKartuSiswaList.length === 0) return;
                    setShowBatchPrintModal(true);
                  }}
                  disabled={batchKartuSiswaList.length === 0}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-purple-900/30 transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  {selectedKartuIds.length > 0
                    ? `Cetak Terpilih (${selectedKartuIds.length} Kartu • A4)`
                    : `Cetak Banyak (${filteredKartuSiswaList.length} Kartu • A4)`}
                </button>
              </div>
            </div>

            {/* Toolbar Pencarian Nama, Filter Kelas & Pilih Banyak */}
            <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={kartuSearchQuery}
                  onChange={e => setKartuSearchQuery(e.target.value)}
                  placeholder="Cari nama siswa, NISN, username, kelas, atau no peserta..."
                  className="w-full pl-10 pr-9 py-2.5 bg-[#181818] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
                />
                {kartuSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setKartuSearchQuery('')}
                    aria-label="Hapus pencarian"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-md cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="relative flex-1 sm:flex-initial">
                  <Filter className="w-3.5 h-3.5 text-purple-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <select
                    value={kartuKelasFilter}
                    onChange={e => setKartuKelasFilter(e.target.value)}
                    aria-label="Filter berdasarkan kelas"
                    className="w-full sm:w-52 pl-8 pr-8 py-2.5 bg-[#181818] border border-slate-800 rounded-xl text-xs font-medium text-white focus:outline-none focus:border-purple-500/60 transition-colors cursor-pointer"
                  >
                    <option value="ALL">Semua Kelas ({siswaList.length})</option>
                    {kartuKelasOptions.map(([kelasNama, count]) => (
                      <option key={kelasNama} value={kelasNama}>
                        Kelas {kelasNama} ({count})
                      </option>
                    ))}
                  </select>
                </div>

                {filteredKartuSiswaList.length > 0 && (
                  <button
                    type="button"
                    onClick={handleToggleSelectAllFilteredKartu}
                    className={`px-3 py-2.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                      allFilteredKartuSelected
                        ? 'bg-purple-600/20 border-purple-500/50 text-purple-300'
                        : 'bg-[#181818] hover:bg-slate-800 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {allFilteredKartuSelected ? (
                      <CheckSquare className="w-3.5 h-3.5 text-purple-400" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span>{allFilteredKartuSelected ? 'Batal Pilih' : 'Pilih Semua'}</span>
                  </button>
                )}

                {selectedKartuIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedKartuIds([])}
                    className="px-3 py-2.5 bg-[#181818] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Bersihkan ({selectedKartuIds.length})
                  </button>
                )}

                {(kartuSearchQuery || kartuKelasFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setKartuSearchQuery('');
                      setKartuKelasFilter('ALL');
                    }}
                    className="px-3 py-2.5 bg-[#181818] hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition-colors shrink-0 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {filteredKartuSiswaList.length === 0 ? (
              <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-800 bg-[#181818]/60 space-y-2">
                <Search className="w-7 h-7 text-slate-600 mx-auto" />
                <p className="text-xs font-bold text-slate-300">Data siswa tidak ditemukan</p>
                <p className="text-[11px] text-slate-500">
                  Tidak ada siswa yang sesuai dengan kata kunci atau filter kelas yang dipilih.
                </p>
                {(kartuSearchQuery || kartuKelasFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setKartuSearchQuery('');
                      setKartuKelasFilter('ALL');
                    }}
                    className="mt-1 px-3.5 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold cursor-pointer"
                  >
                    Tampilkan Semua Siswa
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredKartuSiswaList.map(siswa => {
                  const isChecked = selectedKartuIds.includes(siswa.id);
                  return (
                    <div
                      key={siswa.id}
                      onClick={() => handleToggleSelectKartu(siswa.id)}
                      className={`p-3.5 rounded-xl border flex items-center justify-between transition-all group gap-2.5 cursor-pointer ${
                        isChecked
                          ? 'bg-purple-950/25 border-purple-500/60 shadow-sm shadow-purple-950/30'
                          : 'bg-[#181818] border-slate-800 hover:border-purple-500/40'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            handleToggleSelectKartu(siswa.id);
                          }}
                          aria-label={`Pilih ${siswa.nama}`}
                          className="text-slate-400 hover:text-purple-400 shrink-0 cursor-pointer"
                        >
                          {isChecked ? (
                            <CheckSquare className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-600 group-hover:text-slate-400" />
                          )}
                        </button>
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                          {siswa.fotoUrl ? (
                            <img src={siswa.fotoUrl} alt={siswa.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <User className="w-5 h-5 text-slate-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white group-hover:text-purple-300 truncate">{siswa.nama}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">NISN: {siswa.nisn} | Kelas {siswa.kelas}</div>
                          <div className="text-[9px] font-mono text-purple-400 mt-0.5 truncate">
                            No Peserta: C2026-{siswa.nisn.slice(-4)} • User: {siswa.username?.trim() || '-'}
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setSelectedKartuSiswa(siswa);
                        }}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-md shrink-0 cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5" /> Kartu
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB 1: BANK SOAL */}
      {subTab === 'bank_soal' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left: Bank List */}
          <div className="bg-[#121212] text-slate-100 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <h3 className="font-bold text-slate-100 text-xs uppercase tracking-wider">Daftar Paket Bank Soal</h3>
              <button 
                type="button"
                onClick={handleDownloadTemplate}
                className="text-[11px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" /> Template JSON
              </button>
            </div>

            {/* Tombol Tambah Paket Bank Soal */}
            <button
              type="button"
              onClick={handleOpenAddBankModal}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Paket Bank Soal</span>
            </button>

            {/* Filter Mapel Guru (Opsional saat peran Guru aktif) */}
            {currentRole === 'guru' && activeGuru?.mataPelajaran && (
              <div className="flex items-center gap-1.5 bg-[#181818] border border-slate-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setFilterBankByGuruMapel(false)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                    !filterBankByGuruMapel
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Semua ({bankSoalList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterBankByGuruMapel(true)}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer truncate ${
                    filterBankByGuruMapel
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                  title={`Tampilkan hanya paket ${activeGuru.mataPelajaran}`}
                >
                  Mapel {activeGuru.mataPelajaran}
                </button>
              </div>
            )}

            <div className="space-y-2.5">
              {displayedBankSoalList.length === 0 ? (
                <div className="p-5 text-center rounded-2xl border border-dashed border-slate-700 bg-[#181818] space-y-2">
                  <BookOpen className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-xs font-bold text-slate-200">
                    {filterBankByGuruMapel
                      ? `Belum ada paket untuk mapel ${activeGuru?.mataPelajaran}`
                      : 'Belum ada Paket Bank Soal'}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Klik tombol "Tambah Paket Bank Soal" di atas untuk membuat paket soal baru.
                  </p>
                </div>
              ) : (
                displayedBankSoalList.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBankId(b.id)}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-2.5 relative group ${
                      b.id === activeBank?.id
                        ? 'border-emerald-500/80 bg-emerald-950/30 text-white font-semibold shadow-md shadow-emerald-950/30'
                        : 'border-slate-800 bg-[#181818] hover:bg-slate-800/80 hover:border-slate-700 text-slate-300'
                    }`}
                  >
                    <h4 className="text-xs font-extrabold text-white leading-snug">{b.judul}</h4>
                    <div className="text-[11px] text-slate-400 font-medium">{b.mataPelajaran} • {b.kelas}</div>
                    {b.dibuatOleh && (
                      <div className="text-[10px] text-slate-500 flex items-center gap-1">
                        <User className="w-3 h-3" />
                        <span className="truncate">Penyusun: {b.dibuatOleh}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-extrabold truncate max-w-[95px]" title={b.kode}>
                        {b.kode}
                      </span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-extrabold px-2 py-0.5 rounded-full">
                          {b.jumlahSoal} Soal
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditBankModal(b);
                          }}
                          className="p-1.5 bg-blue-500/15 hover:bg-blue-500/25 text-blue-400 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-sm border border-blue-500/30"
                          title="Edit Info Paket Bank Soal"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTargetBankSoal(b);
                          }}
                          className="px-2 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm border border-rose-500/30"
                          title="Hapus Paket Bank Soal"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right: Question Inspector & Manual Addition */}
          <div className="lg:col-span-2 bg-[#121212] text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            {activeBank ? (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-white text-base">{activeBank.judul}</h3>
                      <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-200 px-2 py-0.5 rounded font-mono font-bold">
                        {activeBank.kode}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      <span className="font-semibold text-emerald-400">{activeBank.mataPelajaran}</span> • Kelas <span className="font-semibold text-slate-200">{activeBank.kelas}</span> | Durasi: {activeBank.durasiMenit} Menit • Total: <span className="font-bold text-white">{activeBank.daftarSoal.length} Soal</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={handleOpenAiModalForActiveBank}
                      className="px-3.5 py-2 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-md shadow-indigo-500/20 cursor-pointer"
                      title={`Buat soal baru dengan AI khusus mata pelajaran ${activeBank.mataPelajaran}`}
                    >
                      <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                      <span>Tambah Soal AI</span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingSoalId(null);
                        setNewTipe('pg');
                        setNewPertanyaan('');
                        setNewOpsiA('');
                        setNewOpsiB('');
                        setNewOpsiC('');
                        setNewOpsiD('');
                        setNewKunciPg('A');
                        setNewKunciIsian('');
                        setNewKunciEsai('');
                        setNewPembahasan('');
                        setNewBobot(25);
                        setNewImageUrl('');
                        setNewVideoUrl('');
                        setShowAddSoalModal(true);
                      }}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Tambah Soal Manual
                    </button>
                  </div>
                </div>

                {/* List of Questions in Bank */}
                <div className="space-y-4">
                  {activeBank.daftarSoal.length === 0 && (
                    <div className="p-8 text-center rounded-2xl border-2 border-dashed border-slate-700 bg-[#181818] space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center mx-auto border border-indigo-500/30">
                        <BookOpen className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-extrabold text-slate-100">
                          Paket "{activeBank.judul}" Masih Kosong
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                          Silakan mulai menambahkan butir soal untuk mata pelajaran <span className="font-bold text-emerald-400">{activeBank.mataPelajaran}</span> menggunakan tombol <strong className="text-indigo-400">Tambah Soal AI</strong> atau <strong className="text-emerald-400">Tambah Soal Manual</strong> di atas.
                        </p>
                      </div>
                    </div>
                  )}
                  {activeBank.daftarSoal.map((soal, idx) => (
                    <div key={soal.id} className="p-4 rounded-xl border border-slate-800 bg-[#181818] space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 font-mono font-bold rounded text-[10px]">
                            Soal #{idx + 1} • {soal.tipe.toUpperCase()}
                          </span>
                          <span className="text-[11px] font-bold text-emerald-400">Bobot: {soal.bobot} Poin</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleOpenEditSoal(soal)}
                            className="px-2.5 py-1 bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 border border-blue-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                            title="Edit Soal"
                          >
                            <Edit2 className="w-3 h-3" /> Edit
                          </button>
                          <button
                            onClick={() => handleDeleteSoal(soal.id)}
                            className="px-2.5 py-1 bg-rose-500/15 text-rose-400 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm cursor-pointer"
                            title="Hapus Soal"
                          >
                            <Trash2 className="w-3 h-3" /> Hapus
                          </button>
                        </div>
                      </div>
                      <p className="font-bold text-slate-100 text-xs leading-relaxed">{soal.pertanyaan}</p>

                      {/* Media Display (Image / Video) */}
                      {(soal.imageUrl || soal.videoUrl) && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 my-2.5">
                          {soal.imageUrl && (
                            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-1">
                              <img 
                                src={soal.imageUrl} 
                                alt={`Media Soal #${idx + 1}`} 
                                className="max-h-48 w-full object-contain rounded-lg mx-auto"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                          {soal.videoUrl && (
                            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-1 flex items-center justify-center">
                              <video 
                                src={soal.videoUrl} 
                                controls 
                                className="max-h-48 w-full rounded-lg"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Options for PG & MC */}
                      {soal.opsi && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2 pt-1">
                          {soal.opsi.map(o => (
                            <div key={o.id} className="text-xs text-slate-200 flex items-center gap-2">
                              <span className="font-bold text-slate-400">{o.id}.</span>
                              <span>{o.teks}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="text-[11px] bg-emerald-950/40 text-emerald-200 p-2.5 rounded-lg border border-emerald-500/30 mt-2">
                        <span className="font-bold text-emerald-300">Kunci Jawaban:</span> {Array.isArray(soal.kunciJawaban) ? soal.kunciJawaban.join(', ') : soal.kunciJawaban}
                        {soal.pembahasan && <div className="text-[10px] text-emerald-300/90 mt-0.5">Pembahasan: {soal.pembahasan}</div>}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex justify-center">
                  <button
                    onClick={() => {
                      setEditingSoalId(null);
                      setNewTipe('pg');
                      setNewPertanyaan('');
                      setNewOpsiA('');
                      setNewOpsiB('');
                      setNewOpsiC('');
                      setNewOpsiD('');
                      setNewKunciPg('A');
                      setNewKunciIsian('');
                      setNewKunciEsai('');
                      setNewPembahasan('');
                      setNewBobot(25);
                      setNewImageUrl('');
                      setNewVideoUrl('');
                      setShowAddSoalModal(true);
                    }}
                    className="w-full py-3 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-emerald-500/30 shadow-sm cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Tambah Soal Baru
                  </button>
                </div>
              </>
            ) : (
              <p className="text-slate-400 text-xs">Pilih paket bank soal di sebelah kiri.</p>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB 2: AI GENERATOR */}
      {subTab === 'ai_generator' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl mx-auto space-y-4">
          <div className="flex items-center gap-2 text-emerald-600 font-bold text-lg border-b pb-3">
            <Sparkles className="w-5 h-5" /> Gemini AI Question Generator
          </div>

          <p className="text-xs text-slate-600 leading-relaxed">
            Hasilkan set soal Ujian CBT otomatis berdasarkan mata pelajaran <span className="font-bold text-slate-800">{aiMapel}</span> dan topik <span className="font-bold text-slate-800">{aiTopik || 'umum'}</span>, lengkap dengan pembahasan dan kunci jawaban!
          </p>

          <div className="space-y-3">
            <div>
              <label className="text-[11px] font-bold text-slate-700">Mata Pelajaran</label>
              <select
                value={aiMapel}
                onChange={e => {
                  const nextMapel = e.target.value;
                  setAiMapel(nextMapel);
                  const suggestions = getSubjectTopicSuggestions(nextMapel);
                  if (suggestions.length > 0) setAiTopik(suggestions[0]);
                }}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
              >
                {availableMapelList.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Kelas Target (Pilih lebih dari satu)</label>
              <div className="flex flex-wrap gap-2">
                {availableKelasList.map(k => (
                  <button
                    key={k}
                    onClick={() => handleToggleAiKelas(k)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
                      aiKelas.includes(k)
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-700 block mb-1">Tipe Soal (Pilih yang akan di-generate)</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'pg', label: 'Pilihan Ganda' },
                  { id: 'multiple_choice', label: 'Ganda Kompleks' },
                  { id: 'isian', label: 'Isian Singkat' },
                  { id: 'esai', label: 'Esai Uraian' }
                ].map(tipe => (
                  <button
                    key={tipe.id}
                    onClick={() => handleToggleAiTipe(tipe.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-1.5 ${
                      aiTipeSoal.includes(tipe.id)
                        ? 'bg-emerald-100 border-emerald-500 text-emerald-700'
                        : 'bg-slate-50 border-slate-300 text-slate-500 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded flex items-center justify-center border ${
                      aiTipeSoal.includes(tipe.id) ? 'bg-emerald-500 border-emerald-600' : 'bg-white border-slate-300'
                    }`}>
                      {aiTipeSoal.includes(tipe.id) && <Check className="w-2 h-2 text-white" />}
                    </div>
                    {tipe.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Jumlah Soal Total (1–50)</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {[5, 10, 15, 20, 30, 40].map(cnt => (
                      <button
                        key={cnt}
                        type="button"
                        onClick={() => setAiJumlah(cnt)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                          aiJumlah === cnt
                            ? 'bg-emerald-600 border-emerald-600 text-white'
                            : 'bg-slate-50 border-slate-300 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        {cnt}
                      </button>
                    ))}
                  </div>
                  <input 
                    type="number" 
                    min={1}
                    max={50}
                    value={aiJumlah} 
                    onChange={e => setAiJumlah(Math.min(Math.max(Number(e.target.value) || 1, 1), 50))}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 placeholder:text-slate-400" 
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Topik / Bahasan Soal</label>
                  <input 
                    type="text" 
                    value={aiTopik} 
                    onChange={e => setAiTopik(e.target.value)}
                    placeholder={getSubjectMetadata(aiMapel).placeholder}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 placeholder:text-slate-400" 
                  />
                </div>
              </div>

              <div>
                <div className="text-[10px] font-bold text-slate-500 mb-1">
                  💡 Rekomendasi Topik {getSubjectMetadata(aiMapel).label}:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {getSubjectTopicSuggestions(aiMapel).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setAiTopik(t)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-semibold border transition-all cursor-pointer ${
                        aiTopik.trim().toLowerCase() === t.trim().toLowerCase()
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 hover:bg-emerald-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {aiTopik.trim().toLowerCase() === t.trim().toLowerCase() ? `✓ ${t}` : `+ ${t}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleGenerateAi}
              disabled={loadingAi}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md cursor-pointer"
            >
              {loadingAi ? (
                <span>Generating {aiJumlah} Soal dengan Gemini AI...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Generate {aiJumlah} Soal Otomatis ({aiMapel})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* SUBTAB 3: SIMULASI UJIAN SISWA */}
      {subTab === 'simulasi_ujian' && (
        <div className="space-y-4">
          
          {/* Anti-Cheat Proctored Warning Banner */}
          {!examFinished && (
            <div className="p-4 bg-amber-950/80 border border-amber-500/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-amber-200 text-xs">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold text-amber-300 uppercase tracking-wider block text-[10px]">
                    Sistem Pengawasan Otomatis CBT (Anti-Cheat Active)
                  </span>
                  <span>Dilarang berpindah tab, membuka aplikasi lain, atau meminimalkan browser.</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCheatCount(prev => {
                      const next = prev + 1;
                      const timeLog = new Date().toLocaleTimeString('id-ID');
                      setCheatLogs(logs => [`[${timeLog}] Simulasi Pelanggaran Ujian (Pelanggaran ke-${next})`, ...logs]);
                      setShowCheatAlert(true);
                      return next;
                    });
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-950/40 cursor-pointer active:scale-95"
                  title="Klik untuk menguji bunyi alarm bip bip bip dan simulasi pelanggaran"
                >
                  <Volume2 className="w-3.5 h-3.5 animate-pulse" /> Uji Alarm Bip
                </button>
                <span className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs ${
                  cheatCount === 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  cheatCount === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  Pelanggaran: {cheatCount} / 3
                </span>
              </div>
            </div>
          )}

          {!examFinished ? (
            !isExamStarted ? (
              /* Selection Screen: Choose Subject & Bank Soal */
              <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-8">
                  
                  {/* Student Account Identity Banner */}
                  <div className="bg-gradient-to-r from-blue-900 to-indigo-900 p-5 rounded-2xl text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 border border-blue-700/50">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-white/20 border-2 border-white/40 flex items-center justify-center shrink-0 shadow-md">
                        {activeSiswa?.fotoUrl ? (
                          <img src={activeSiswa.fotoUrl} alt={activeSiswa.nama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <User className="w-7 h-7 text-white" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-emerald-500/30 text-emerald-300 text-[10px] font-bold border border-emerald-400/40">
                            Peserta Ujian Aktif
                          </span>
                          <span className="text-[11px] font-mono text-blue-200">NISN: {activeSiswa?.nisn || '-'}</span>
                        </div>
                        <h4 className="text-base font-extrabold text-white mt-1">{activeSiswa?.nama || 'Siswa Peserta'}</h4>
                        <p className="text-xs text-blue-200 font-medium mt-0.5">Kelas: {activeSiswa?.kelas || '-'} | NIS: {activeSiswa?.nis || '-'}</p>
                      </div>
                    </div>
                    <div className="text-right hidden sm:block">
                      <div className="text-[10px] text-blue-300 font-semibold uppercase tracking-wider">Status Akun CBT</div>
                      <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 justify-end mt-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi
                      </div>
                    </div>
                  </div>

                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                      <BookOpen className="w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-black text-slate-900 tracking-tight">Persiapan Ujian CBT</h3>
                    <p className="text-sm text-slate-500 font-medium">Silakan pilih mata pelajaran dan paket soal untuk memulai simulasi ujian.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Subject Selection */}
                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <Layers className="w-3.5 h-3.5" /> 1. Pilih Mata Pelajaran
                      </label>
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {availableMapelList.map(m => {
                          const count = bankSoalList.filter(b => b.mataPelajaran === m).length;
                          return (
                            <button
                              key={m}
                              onClick={() => {
                                setExamMapelFilter(m);
                                setSelectedExamBank(null);
                              }}
                              className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all text-left ${
                                examMapelFilter === m
                                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-md'
                                  : 'bg-slate-50 border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <span className="text-xs font-bold">{m}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                                examMapelFilter === m ? 'bg-blue-200 text-blue-800' : 'bg-slate-200 text-slate-500'
                              }`}>
                                {count} Soal
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Bank Soal Selection */}
                    <div className="space-y-4">
                      <label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                        <CheckSquare className="w-3.5 h-3.5" /> 2. Pilih Paket Soal
                      </label>
                      <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {!examMapelFilter ? (
                          <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                            <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pilih Mata Pelajaran Terlebih Dahulu</p>
                          </div>
                        ) : (
                          bankSoalList.filter(b => b.mataPelajaran === examMapelFilter).length === 0 ? (
                            <div className="h-[200px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                              <X className="w-8 h-8 text-rose-300 mb-2" />
                              <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Belum Ada Paket Soal Tersedia</p>
                            </div>
                          ) : (
                            bankSoalList.filter(b => b.mataPelajaran === examMapelFilter).map(b => (
                              <button
                                key={b.id}
                                onClick={() => setSelectedExamBank(b)}
                                className={`flex flex-col p-4 rounded-2xl border-2 transition-all text-left ${
                                  selectedExamBank?.id === b.id
                                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-md'
                                    : 'bg-slate-50 border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                <span className="text-xs font-black">{b.judul}</span>
                                <div className="flex items-center gap-3 mt-2 text-[10px] font-bold opacity-70">
                                  <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {b.jumlahSoal} Soal</span>
                                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {b.durasiMenit} Menit</span>
                                </div>
                              </button>
                            ))
                          )
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <button
                      disabled={!selectedExamBank}
                      onClick={() => {
                        setIsExamStarted(true);
                        setSoalIndex(0);
                        setSiswaJawaban({});
                        setTimeLeft((selectedExamBank?.durasiMenit || 60) * 60);
                      }}
                      className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-2xl text-sm transition-all shadow-xl shadow-blue-600/20 disabled:opacity-50 disabled:grayscale disabled:pointer-events-none flex items-center justify-center gap-3 uppercase tracking-widest cursor-pointer group"
                    >
                      <Play className="w-5 h-5 group-hover:scale-110 transition-transform" /> Mulai Kerjakan Soal Sekarang
                    </button>
                  </div>
                </div>

                {/* Info Panel */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { icon: <ShieldAlert className="w-5 h-5" />, title: 'Anti-Cheat', desc: 'Sistem memantau perpindahan tab & aplikasi.' },
                    { icon: <Clock className="w-5 h-5" />, title: 'Timer Realtime', desc: 'Ujian otomatis terhenti saat waktu habis.' },
                    { icon: <CheckCircle2 className="w-5 h-5" />, title: 'Autosave', desc: 'Jawaban tersimpan otomatis ke cloud database.' }
                  ].map((info, i) => (
                    <div key={i} className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 p-4 rounded-2xl flex items-start gap-3">
                      <div className="text-blue-400 mt-0.5">{info.icon}</div>
                      <div>
                        <h5 className="text-[11px] font-black text-white uppercase tracking-wider">{info.title}</h5>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed mt-0.5">{info.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              
              {/* Main Question Display - Left side (8 Cols to accommodate the 4-col sidebar perfectly) */}
              <div className="lg:col-span-8 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                
                {/* Header: Soal No.X and Subject Badge */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-4">
                  <span className="text-xl font-extrabold text-slate-800 tracking-tight">Soal No.{soalIndex + 1}</span>
                  <span className="text-xs font-bold text-[#4f46e5] bg-[#eef2ff] px-4 py-1.5 rounded-full border border-indigo-100 uppercase tracking-wider">
                    {currentExam?.mataPelajaran || currentExam?.mapel || "Matematika"}
                  </span>
                </div>

                {/* Question Body */}
                {currentSoal ? (
                  <div className="space-y-6">
                    <div className="text-slate-800 text-[15px] font-semibold leading-relaxed">
                      {currentSoal.pertanyaan}
                    </div>

                    {/* Student Exam Question Media Display */}
                    {(currentSoal.imageUrl || currentSoal.videoUrl) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {currentSoal.imageUrl && (
                          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 shadow-sm flex flex-col items-center justify-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Gambar Soal</span>
                            <img 
                              src={currentSoal.imageUrl} 
                              alt="Gambar Lampiran" 
                              className="max-h-64 object-contain rounded-xl w-full"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                        )}
                        {currentSoal.videoUrl && (
                          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-white p-2 shadow-sm flex flex-col items-center justify-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Video Lampiran</span>
                            <video 
                              src={currentSoal.videoUrl} 
                              controls 
                              className="max-h-64 rounded-xl w-full"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Answer Inputs based on Question Type */}
                    {(currentSoal.tipe === 'pg' || currentSoal.tipe === 'multiple_choice') && currentSoal.opsi && (
                      <div className="space-y-3 pt-2">
                        {currentSoal.opsi.map(o => {
                          const isSelected = Array.isArray(siswaJawaban[currentSoal.id]?.jawaban)
                            ? (siswaJawaban[currentSoal.id]?.jawaban as string[]).includes(o.id)
                            : siswaJawaban[currentSoal.id]?.jawaban === o.id;

                          return (
                            <div
                              key={o.id}
                              onClick={() => {
                                if (currentSoal.tipe === 'pg') {
                                  handleAnswerSelect(currentSoal.id, o.id);
                                } else {
                                  // Multiple choice
                                  const currentArr = (siswaJawaban[currentSoal.id]?.jawaban as string[]) || [];
                                  const newArr = currentArr.includes(o.id) 
                                    ? currentArr.filter(x => x !== o.id) 
                                    : [...currentArr, o.id];
                                  handleAnswerSelect(currentSoal.id, newArr);
                                }
                              }}
                              className="group flex items-start gap-3 cursor-pointer text-slate-800 hover:text-slate-950 text-sm font-semibold transition-all py-1.5"
                            >
                              {/* Circular Radio Indicator - matching hollow green/teal/slate style */}
                              <span className={`w-5.5 h-5.5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                                isSelected 
                                  ? 'border-teal-500 bg-white' 
                                  : 'border-slate-300 group-hover:border-slate-400 bg-white'
                              }`}>
                                {isSelected && <span className="w-3 h-3 rounded-full bg-teal-500"></span>}
                              </span>
                              <span className="leading-relaxed">
                                <span className="lowercase font-bold text-slate-800 mr-2">{o.id.toLowerCase()}.</span> 
                                <span className="text-slate-700 font-semibold group-hover:text-slate-900">{o.teks}</span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {currentSoal.tipe === 'isian' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Ketikkan Jawaban Singkat Anda:</label>
                        <input
                          type="text"
                          value={(siswaJawaban[currentSoal.id]?.jawaban as string) || ''}
                          onChange={e => handleAnswerSelect(currentSoal.id, e.target.value)}
                          placeholder="Masukkan jawaban..."
                          className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:font-normal"
                        />
                      </div>
                    )}

                    {currentSoal.tipe === 'esai' && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">Tuliskan Jawaban Uraian / Esai Anda secara Lengkap:</label>
                        <textarea
                          rows={4}
                          value={(siswaJawaban[currentSoal.id]?.jawaban as string) || ''}
                          onChange={e => handleAnswerSelect(currentSoal.id, e.target.value)}
                          placeholder="Ketikkan uraian penjelas..."
                          className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold text-slate-900 outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:font-normal leading-relaxed"
                        />
                      </div>
                    )}

                    {/* Bottom Question Controls */}
                    <div className="flex items-center justify-between pt-5 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <button
                          disabled={soalIndex === 0}
                          onClick={() => setSoalIndex(prev => prev - 1)}
                          className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black rounded-full flex items-center gap-1 transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                        >
                          <ChevronLeft className="w-4 h-4" /> Sebelum
                        </button>
                        <button
                          onClick={() => toggleRaguRagu(currentSoal.id)}
                          className={`px-4 py-2.5 rounded-full text-xs font-bold transition-all border cursor-pointer ${
                            siswaJawaban[currentSoal.id]?.raguRagu
                              ? 'bg-amber-400 text-slate-950 border-amber-500'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                          }`}
                        >
                          {siswaJawaban[currentSoal.id]?.raguRagu ? '✓ Ragu (Aktif)' : 'Ragu-Ragu'}
                        </button>
                      </div>

                      {soalIndex < (currentExam?.daftarSoal.length || 1) - 1 ? (
                        <button
                          onClick={() => setSoalIndex(prev => prev + 1)}
                          className="px-8 py-3 bg-[#f59e0b] hover:bg-[#d97706] text-white text-xs font-black rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer uppercase tracking-wider"
                        >
                          Selanjutnya <ChevronRight className="w-4 h-4 text-white" />
                        </button>
                      ) : (
                        <button
                          onClick={handleFinishExam}
                          className="px-8 py-3 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black rounded-full flex items-center gap-1.5 transition-all shadow-md cursor-pointer uppercase tracking-wider"
                        >
                          Selesai <CheckCircle2 className="w-4 h-4 text-white" />
                        </button>
                      )}
                    </div>

                  </div>
                ) : null}

              </div>

              {/* Right: Countdown Panel & Question Navigation Grid (4 Cols) */}
              <div className="lg:col-span-4 space-y-6">
                
                {/* Profil Peserta Card */}
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm tracking-wider text-center pb-2 border-b border-slate-100">
                    Profil Peserta
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className="relative shrink-0">
                      <img
                        src={activeSiswa.fotoUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256"}
                        alt={activeSiswa.nama}
                        referrerPolicy="no-referrer"
                        className="w-14 h-14 rounded-2xl object-cover border border-slate-200 shadow-sm"
                      />
                      <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse"></span>
                    </div>
                    <div className="space-y-0.5 min-w-0">
                      <h5 className="font-bold text-slate-900 text-sm truncate" title={activeSiswa.nama}>{activeSiswa.nama}</h5>
                      <p className="text-[11px] text-slate-500 font-medium">NISN: {activeSiswa.nisn || activeSiswa.nis || "117899483"}</p>
                      <p className="text-[11px] text-slate-500 font-medium">Kelas: {activeSiswa.kelas || "IX - Utsman bin Affan"}</p>
                      <span className="inline-block text-[10px] uppercase font-black bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-md border border-emerald-100/30 mt-1">
                        Aktif Mengikuti Ujian
                      </span>
                    </div>
                  </div>

                  {/* Dropdown Pemilihan Siswa khusus untuk Admin / Guru untuk simulasi */}
                  {currentRole !== 'siswa' && siswaList && siswaList.length > 0 && (
                    <div className="pt-3 border-t border-slate-100 space-y-1">
                      <label className="text-[9px] uppercase font-extrabold text-slate-400 tracking-wider block">
                        Ganti Akun Simulasi (Mode Admin):
                      </label>
                      <select
                        value={selectedSiswaId || activeSiswa.id}
                        onChange={(e) => setSelectedSiswaId(e.target.value)}
                        className="w-full text-xs font-bold bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 py-1.5 px-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all cursor-pointer"
                      >
                        {siswaList.map(s => (
                          <option key={s.id} value={s.id}>
                            {s.nama} ({s.kelas})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Waktu Tersisa Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm text-center space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm tracking-wide">Waktu Tersisa</h4>
                  
                  <div className="py-2 bg-amber-50/20 rounded-2xl border border-amber-100/30">
                    <span className="text-[#f59e0b] font-black text-2xl block">
                      {Math.floor(timeLeft / 3600)} Jam
                    </span>
                    <span className="text-[#f59e0b] font-black text-xl block mt-0.5">
                      {Math.floor((timeLeft % 3600) / 60)} Menit {timeLeft % 60} Detik
                    </span>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-slate-400">Sudah Selesai?</p>
                    <button
                      onClick={handleFinishExam}
                      className="w-full py-2.5 bg-[#f59e0b] hover:bg-[#d97706] text-white font-extrabold rounded-full text-xs transition-all shadow-md tracking-wider uppercase cursor-pointer"
                    >
                      Selesaikan Ujian
                    </button>
                  </div>
                </div>

                {/* Nomor Soal Grid Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                  <h4 className="font-extrabold text-slate-800 text-sm tracking-wider text-center pb-2 border-b border-slate-100">
                    Nomor Soal
                  </h4>

                  <div className="grid grid-cols-5 gap-2">
                    {currentExam?.daftarSoal.map((s, idx) => {
                      const hasAnswer = siswaJawaban[s.id]?.jawaban;
                      const isRagu = siswaJawaban[s.id]?.raguRagu;
                      const isCurrent = soalIndex === idx;

                      // Exact styles inspired by mockup image: pink blocks for unanswered, orange/amber for answered
                      let btnStyle = "bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200";
                      if (isRagu) {
                        btnStyle = "bg-amber-400 text-slate-950 border-amber-400 font-black";
                      } else if (hasAnswer) {
                        btnStyle = "bg-[#f59e0b] text-white border-[#f59e0b] font-black";
                      }

                      if (isCurrent) {
                        btnStyle += " ring-2 ring-slate-800 ring-offset-2 scale-105";
                      }

                      return (
                        <button
                          key={s.id}
                          onClick={() => setSoalIndex(idx)}
                          className={`aspect-square w-full rounded-xl text-xs font-black transition-all border cursor-pointer flex items-center justify-center ${btnStyle}`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

              </div>
            </div>
          )
        ) : (
            /* Result Screen */
            <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-md max-w-xl mx-auto text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto font-bold">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Ujian CBT Telah Selesai!</h3>
              <p className="text-xs text-slate-500">
                Jawaban telah berhasil disimpan dan dinilai secara otomatis oleh sistem.
              </p>

              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Nilai Akhir Siswa</span>
                <span className="text-4xl font-extrabold text-emerald-600 mt-1 block">{finalScore} / 100</span>
              </div>

              <button
                onClick={() => {
                  setExamFinished(false);
                  setIsExamStarted(false);
                  setSelectedExamBank(null);
                  setExamMapelFilter('');
                  setSoalIndex(0);
                  setSiswaJawaban({});
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs"
              >
                Kembali ke Simulasi
              </button>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB 5: HASIL UJIAN FROM FIREBASE */}
      {subTab === 'hasil_ujian' && (
        <div className="space-y-6">
          <div className="bg-[#121212] text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" /> Hasil Penilaian Ujian CBT (Database Firebase)
                </h3>
                <p className="text-xs text-slate-400">
                  Daftar hasil pengerjaan ujian siswa yang telah tersimpan secara aman dan realtime di Firestore cloud database.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => {
                    if (hasilMapelFilter !== 'Semua') {
                      setSelectedMapelRapor(hasilMapelFilter);
                    } else if (hasilUjianList.length > 0) {
                      const currentCount = kolektifResultCountByMapel.get(selectedMapelRapor.toLowerCase()) || 0;
                      if (currentCount === 0) {
                        const firstWithData = kolektifMapelOptions.find(
                          m => (kolektifResultCountByMapel.get(m.toLowerCase()) || 0) > 0
                        );
                        if (firstWithData) setSelectedMapelRapor(firstWithData);
                      }
                    }
                    setShowKolektifRaporModal(true);
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-4 h-4" /> Rapor Kolektif Per Mapel
                </button>
                <button
                  onClick={() => {
                    if (hasilUjianList.length === 0) {
                      return;
                    }
                    setDeleteTargetHasilUjian('all');
                  }}
                  disabled={hasilUjianList.length === 0}
                  className="px-3.5 py-2 bg-rose-500/15 hover:bg-rose-500/25 disabled:opacity-40 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer whitespace-nowrap"
                  title="Hapus Semua Hasil Ujian"
                >
                  <Trash2 className="w-4 h-4" /> Hapus Semua
                </button>
                <div
                  className="px-3.5 py-2 bg-amber-500/15 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                  title="Data hasil ujian tersinkronisasi realtime dengan Cloud Firestore"
                >
                  <Cloud className="w-4 h-4" /> Cloud Terhubung
                </div>
              </div>
            </div>

            {/* Overview cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#181818] rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Hasil Disimpan</span>
                  <span className="text-lg font-bold text-white block">{hasilUjianList.length} Lembar</span>
                </div>
              </div>

              <div className="p-4 bg-[#181818] rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rata-Rata Nilai</span>
                  <span className="text-lg font-bold text-white block">
                    {hasilUjianList.length > 0 
                      ? Math.round(hasilUjianList.reduce((acc, h) => acc + h.nilaiTotal, 0) / hasilUjianList.length)
                      : 0} / 100
                  </span>
                </div>
              </div>

              <div className="p-4 bg-[#181818] rounded-xl border border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold shrink-0">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sesi Dengan Pelanggaran</span>
                  <span className="text-lg font-bold text-white block">
                    {hasilUjianList.filter(h => (h.pelanggaranCount || 0) > 0).length} Sesi
                  </span>
                </div>
              </div>
            </div>

            {/* Filter Mapel, Filter Kelas & Table */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-300 w-full sm:w-auto">
                <div className="flex items-center gap-2">
                  <span className="uppercase text-[10px] text-slate-400 font-extrabold">Filter Mapel:</span>
                  <select
                    value={hasilMapelFilter}
                    onChange={e => setHasilMapelFilter(e.target.value)}
                    className="p-2 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-slate-100 outline-none focus:border-cyan-500/60"
                  >
                    <option value="Semua">Semua Mapel ({hasilUjianList.length})</option>
                    {kolektifMapelOptions.map(m => {
                      const cnt = kolektifResultCountByMapel.get(m.toLowerCase()) || 0;
                      return (
                        <option key={m} value={m}>
                          {m}{cnt > 0 ? ` (${cnt})` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="uppercase text-[10px] text-slate-400 font-extrabold">Filter Kelas:</span>
                  <select
                    value={hasilKelasFilter}
                    onChange={e => setHasilKelasFilter(e.target.value)}
                    className="p-2 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-slate-100 outline-none focus:border-cyan-500/60"
                  >
                    <option value="Semua">Semua Kelas ({hasilUjianList.length} Hasil)</option>
                    {availableKelasList.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="text-xs text-slate-400 font-semibold">
                Menampilkan <strong className="text-white">{filteredHasilUjianList.length}</strong> dari {hasilUjianList.length} hasil ujian
              </div>
            </div>

            {hasilUjianList.length === 0 ? (
              <div className="p-8 text-center bg-[#181818] rounded-2xl border border-dashed border-slate-700">
                <ShieldCheck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="font-bold text-slate-200 text-sm">Belum Ada Hasil Ujian Tersimpan</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Silakan buka tab <strong className="text-slate-200">"Simulasi CBT Anti-Cheat"</strong>, pilih paket bank soal, lalu selesaikan ujian untuk mensimulasikan penyimpanan data otomatis ke Firebase.
                </p>
              </div>
            ) : filteredHasilUjianList.length === 0 ? (
              <div className="p-8 text-center bg-[#181818] rounded-2xl border border-dashed border-slate-700">
                <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-2" />
                <h4 className="font-bold text-slate-200 text-sm">
                  Tidak Ada Hasil Ujian untuk Filter yang Dipilih
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Coba pilih mata pelajaran atau kelas lain, atau ubah filter ke &quot;Semua&quot;.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-xl bg-[#161822]/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-[#181818] border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <tr>
                      <th className="p-3">Nama Siswa</th>
                      <th className="p-3">Mata Pelajaran</th>
                      <th className="p-3">Kelas & NIS</th>
                      <th className="p-3">Waktu Submit</th>
                      <th className="p-3 text-center">Pelanggaran</th>
                      <th className="p-3 text-center">Status</th>
                      <th className="p-3 text-right">Nilai Akhir</th>
                      <th className="p-3 text-center">Aksi / Hapus</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {filteredHasilUjianList.map(h => {
                      const mapelLabel = resolveHasilMapel(h) || 'Umum';
                      return (
                      <tr key={h.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 font-bold text-white">{h.siswaNama}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 font-bold rounded-md text-[10px] inline-block">
                            {mapelLabel}
                          </span>
                        </td>
                        <td className="p-3 text-slate-300">
                          {h.kelas} <span className="text-[10px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded ml-1 font-mono">{h.nis}</span>
                        </td>
                        <td className="p-3 text-slate-400 font-mono text-[11px]">
                          {new Date(h.waktuSubmit).toLocaleString('id-ID')}
                        </td>
                        <td className="p-3 text-center">
                          {(h.pelanggaranCount || 0) > 0 ? (
                            <span className="px-2 py-0.5 bg-rose-500/15 text-rose-300 border border-rose-500/30 font-bold rounded-full text-[9px] inline-flex items-center gap-1">
                              <ShieldAlert className="w-3 h-3" /> {h.pelanggaranCount}x
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold rounded-full text-[9px]">
                              Aman
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] border ${
                            h.statusPenilaian === 'Selesai' 
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30' 
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}>
                            {h.statusPenilaian}
                          </span>
                        </td>
                        <td className="p-3 text-right font-extrabold text-sm">
                          <span className={h.nilaiTotal >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                            {h.nilaiTotal} / 100
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setSelectedRaporHasil(h)}
                              className="px-2.5 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Cetak Rapor Hasil Ujian"
                            >
                              <Printer className="w-3 h-3" /> Rapor
                            </button>
                            <button
                              onClick={() => handleDeleteHasilUjian(h.id)}
                              className="px-2.5 py-1 bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 border border-rose-500/30 font-bold rounded-lg text-[10px] flex items-center gap-1 cursor-pointer transition-colors"
                              title="Hapus Hasil Ujian Siswa"
                            >
                              <Trash2 className="w-3 h-3" /> Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Rapor Hasil Ujian CBT */}
          {selectedRaporHasil && (
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setSelectedRaporHasil(null)}
            >
              <div
                className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 no-print bg-slate-50">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                    <Printer className="w-5 h-5 text-indigo-600 shrink-0" /> Cetak Rapor Hasil Ujian CBT
                  </h3>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handlePrintRapor}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Printer className="w-4 h-4" /> Cetak / Print PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRaporHasil(null)}
                      aria-label="Tutup"
                      title="Tutup (Esc)"
                      className="inline-flex items-center gap-1 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-bold rounded-xl transition-colors cursor-pointer text-xs"
                    >
                      <X className="w-4 h-4" /> Tutup
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-white text-slate-900" ref={printRaporRef}>
                  {/* School Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                    <h2 className="text-lg font-black uppercase tracking-wider">{schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir'}</h2>
                    <p className="text-xs text-slate-700 font-bold">RAPOR HASIL UJIAN BERBASIS KOMPUTER (CBT) TAHUN AJARAN 2026/2027</p>
                    <p className="text-[10px] text-slate-500">Akreditasi A (Unggul) • Terverifikasi Cloud Firestore Database</p>
                  </div>

                  {/* Student Identity */}
                  <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="space-y-1">
                      <div><strong className="text-slate-500 w-24 inline-block">Nama Siswa:</strong> <span className="font-bold text-slate-900">{selectedRaporHasil.siswaNama}</span></div>
                      <div><strong className="text-slate-500 w-24 inline-block">Nomor Induk:</strong> <span className="font-mono">{selectedRaporHasil.nis}</span></div>
                      <div><strong className="text-slate-500 w-24 inline-block">Kelas:</strong> <span className="font-bold">{selectedRaporHasil.kelas}</span></div>
                      <div><strong className="text-slate-500 w-24 inline-block">Mata Pelajaran:</strong> <span className="font-bold text-indigo-700">{resolveHasilMapel(selectedRaporHasil) || '-'}</span></div>
                    </div>
                    <div className="space-y-1 text-right sm:text-left">
                      <div><strong className="text-slate-500 w-28 inline-block">Waktu Submit:</strong> <span className="font-mono">{new Date(selectedRaporHasil.waktuSubmit).toLocaleString('id-ID')}</span></div>
                      <div><strong className="text-slate-500 w-28 inline-block">Status Penilaian:</strong> <span className="font-bold text-blue-600">{selectedRaporHasil.statusPenilaian}</span></div>
                      <div><strong className="text-slate-500 w-28 inline-block">Pelanggaran:</strong> <span className="font-bold text-rose-600">{selectedRaporHasil.pelanggaranCount || 0} Kali</span></div>
                    </div>
                  </div>

                  {/* Score Highlight */}
                  <div className="text-center p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border border-emerald-200 space-y-2">
                    <span className="text-xs font-bold text-emerald-800 uppercase tracking-widest block">Nilai Akhir Hasil Ujian CBT</span>
                    <span className="text-5xl font-black text-emerald-600 block">{selectedRaporHasil.nilaiTotal} / 100</span>
                    <p className="text-xs text-emerald-700 font-medium">
                      {selectedRaporHasil.nilaiTotal >= 75 ? 'Ket: Lulus / Kompeten dengan Baik' : 'Ket: Perlu Perbaikan & Remedial'}
                    </p>
                  </div>

                  {/* Signatures */}
                  <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center">
                    <div className="space-y-16">
                      <p className="font-bold">Mengetahui,<br/>Orang Tua / Wali Murid</p>
                      <p className="font-bold underline">( ______________________ )</p>
                    </div>
                    <div className="space-y-16">
                      <p className="font-bold">Depok, {new Date().toLocaleDateString('id-ID')}<br/>Guru Pengampu / Tim CBT</p>
                      <p className="font-bold underline">( ______________________ )</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Modal Rapor Kolektif Per Mata Pelajaran */}
          {showKolektifRaporModal && (
            <div
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
              onClick={() => setShowKolektifRaporModal(false)}
            >
              <div
                className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
                onClick={e => e.stopPropagation()}
              >
                <div className="p-4 sm:p-5 border-b border-slate-200 space-y-3 no-print bg-slate-50">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                      <Printer className="w-5 h-5 text-indigo-600 shrink-0" /> Rapor Kolektif Semua Siswa Per Mata Pelajaran
                    </h3>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectedMapelRapor}
                        onChange={e => setSelectedMapelRapor(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                      >
                        {kolektifMapelOptions.map(m => {
                          const cnt = kolektifResultCountByMapel.get(m.toLowerCase()) || 0;
                          return (
                            <option key={m} value={m}>
                              Mapel: {m}{cnt > 0 ? ` (${cnt} nilai)` : ' (0 nilai)'}
                            </option>
                          );
                        })}
                      </select>
                      <select
                        value={kolektifKelasFilter}
                        onChange={e => setKolektifKelasFilter(e.target.value)}
                        className="px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 outline-none focus:border-indigo-500"
                      >
                        <option value="Semua">Semua Kelas</option>
                        {availableKelasList.map(k => (
                          <option key={k} value={k}>Kelas: {k}</option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={handlePrintKolektif}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                    >
                      <Printer className="w-4 h-4" /> Cetak / Print PDF
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar bg-white text-slate-900" ref={printKolektifRef}>
                  {/* Header */}
                  <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                    <h2 className="text-lg font-black uppercase tracking-wider">{schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir'}</h2>
                    <p className="text-xs text-slate-700 font-bold">
                      DAFTAR NILAI &amp; RAPOR KOLEKTIF {cbtSettings?.namaUjian ? cbtSettings.namaUjian.toUpperCase() : 'UJIAN CBT'}
                    </p>
                    <p className="text-xs text-indigo-700 font-black">
                      MATA PELAJARAN: {selectedMapelRapor.toUpperCase()} {kolektifKelasFilter !== 'Semua' ? `• KELAS ${kolektifKelasFilter.toUpperCase()}` : ''}
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Tahun Ajaran {cbtSettings?.tahunAjaran || schoolSettings?.tahunAjaran || '2026/2027'} • Semester {cbtSettings?.semester || schoolSettings?.semesterAktif || 'Ganjil'} • Terverifikasi Database Firestore
                    </p>
                  </div>

                  {/* Ringkasan Statistik Per Mapel Terpilih */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Total Siswa</div>
                      <div className="text-base font-black text-slate-900 tabular-nums mt-0.5">{kolektifRaporStats.totalSiswa}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
                      <div className="text-[10px] font-bold uppercase text-emerald-700">Sudah Ujian</div>
                      <div className="text-base font-black text-emerald-700 tabular-nums mt-0.5">{kolektifRaporStats.sudahUjian}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-center">
                      <div className="text-[10px] font-bold uppercase text-slate-500">Belum Ujian</div>
                      <div className="text-base font-black text-slate-700 tabular-nums mt-0.5">{kolektifRaporStats.belumUjian}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-indigo-50 border border-indigo-200 text-center">
                      <div className="text-[10px] font-bold uppercase text-indigo-700">Rata-Rata Mapel</div>
                      <div className="text-base font-black text-indigo-700 tabular-nums mt-0.5">
                        {kolektifRaporStats.avgScore !== null ? `${kolektifRaporStats.avgScore} / 100` : '-'}
                      </div>
                    </div>
                  </div>

                  {/* Master Grade Table */}
                  <div className="overflow-x-auto border border-slate-300 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-300 text-slate-800 font-bold uppercase text-[10px]">
                        <tr>
                          <th className="p-3 border-r border-slate-300 w-12 text-center">No</th>
                          <th className="p-3 border-r border-slate-300">Nama Siswa</th>
                          <th className="p-3 border-r border-slate-300">Kelas</th>
                          <th className="p-3 border-r border-slate-300">NISN / NIS</th>
                          <th className="p-3 border-r border-slate-300 text-center">Waktu Submit</th>
                          <th className="p-3 border-r border-slate-300 text-center">Pelanggaran</th>
                          <th className="p-3 text-right">Nilai Akhir</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {kolektifRaporRows.map((row, idx) => {
                          const studentResult = row.result;
                          const nilai = studentResult ? studentResult.nilaiTotal : null;
                          const pelanggaran = studentResult ? (studentResult.pelanggaranCount || 0) : null;
                          const waktu = studentResult ? new Date(studentResult.waktuSubmit).toLocaleString('id-ID') : 'Belum Ujian';

                          return (
                            <tr key={row.key} className="hover:bg-slate-50">
                              <td className="p-3 border-r border-slate-200 text-center font-bold">{idx + 1}</td>
                              <td className="p-3 border-r border-slate-200 font-bold text-slate-900">{row.nama}</td>
                              <td className="p-3 border-r border-slate-200 text-slate-700">{row.kelas}</td>
                              <td className="p-3 border-r border-slate-200 font-mono text-slate-600">{row.nisDisplay}</td>
                              <td className="p-3 border-r border-slate-200 text-center font-mono text-[11px] text-slate-600">{waktu}</td>
                              <td className="p-3 border-r border-slate-200 text-center font-bold">
                                {pelanggaran === null ? (
                                  <span className="text-slate-400 font-normal">-</span>
                                ) : pelanggaran > 0 ? (
                                  <span className="text-rose-600">{pelanggaran}x</span>
                                ) : (
                                  <span className="text-emerald-600">Aman</span>
                                )}
                              </td>
                              <td className="p-3 text-right font-black text-sm">
                                {typeof nilai === 'number' ? (
                                  <span className={nilai >= 75 ? 'text-emerald-600' : 'text-amber-600'}>{nilai} / 100</span>
                                ) : (
                                  <span className="text-slate-400 font-normal italic">Belum Ujian</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Signatures */}
                  <div className="pt-8 grid grid-cols-2 gap-8 text-xs text-center">
                    <div className="flex flex-col items-center">
                      <p className="font-bold">Mengetahui,<br/>Kepala Sekolah</p>
                      <div className="h-16 flex items-center justify-center my-1">
                        {cbtSettings?.ttdKepalaSekolahUrl ? (
                          <img
                            src={cbtSettings.ttdKepalaSekolahUrl}
                            alt="TTD Kepala Sekolah"
                            className="max-h-16 max-w-[160px] object-contain mix-blend-multiply"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                      </div>
                      <p className="font-bold underline">
                        {cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || '( ______________________ )'}
                      </p>
                    </div>
                    <div className="flex flex-col items-center justify-between">
                      <p className="font-bold">
                        {cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok'}, {new Date().toLocaleDateString('id-ID')}<br/>
                        Guru Mata Pelajaran {selectedMapelRapor}
                      </p>
                      <div className="h-16" />
                      <p className="font-bold underline">( ______________________ )</p>
                    </div>
                  </div>
                </div>

                {/* Modal Footer with Close action */}
                <div className="px-5 py-3.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3 no-print">
                  <span className="text-[11px] text-slate-500 font-medium">
                    Tekan <kbd className="px-1.5 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-700">Esc</kbd> atau klik area luar untuk menutup
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowKolektifRaporModal(false)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" /> Tutup
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL ADD MANUAL QUESTION */}
      {showAddSoalModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 text-base">{editingSoalId ? 'Edit Soal Ujian' : 'Input Soal Baru Manual'}</h3>
              <button 
                type="button" 
                onClick={() => setShowAddSoalModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1.5 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddSoal} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
              <div>
                <label className="text-xs font-extrabold text-slate-800 mb-1 block">Tipe Soal</label>
                <select
                  value={newTipe}
                  onChange={e => setNewTipe(e.target.value as TipeSoal)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="pg" className="text-slate-900 bg-white font-medium">Pilihan Ganda (1 Jawaban Benar)</option>
                  <option value="multiple_choice" className="text-slate-900 bg-white font-medium">Pilihan Ganda Kompleks (&gt;1 Jawaban)</option>
                  <option value="isian" className="text-slate-900 bg-white font-medium">Isian Singkat</option>
                  <option value="esai" className="text-slate-900 bg-white font-medium">Esai Uraian</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 mb-1 block">Teks Pertanyaan Soal</label>
                <textarea
                  required
                  rows={3}
                  value={newPertanyaan}
                  onChange={e => setNewPertanyaan(e.target.value)}
                  placeholder="Ketikkan teks pertanyaan soal secara lengkap..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-500 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {(newTipe === 'pg' || newTipe === 'multiple_choice') && (
                <div>
                  <label className="text-xs font-extrabold text-slate-800 mb-1 block">Pilihan Opsi Jawaban</label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <input type="text" placeholder="Opsi A" value={newOpsiA} onChange={e => setNewOpsiA(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-500 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                    <input type="text" placeholder="Opsi B" value={newOpsiB} onChange={e => setNewOpsiB(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-500 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                    <input type="text" placeholder="Opsi C" value={newOpsiC} onChange={e => setNewOpsiC(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-500 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                    <input type="text" placeholder="Opsi D" value={newOpsiD} onChange={e => setNewOpsiD(e.target.value)} className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 placeholder:text-slate-500 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                  </div>
                </div>
              )}

              {newTipe === 'pg' && (
                <div>
                  <label className="text-xs font-extrabold text-slate-800 mb-1 block">Kunci Jawaban PG</label>
                  <select value={newKunciPg} onChange={e => setNewKunciPg(e.target.value)} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    <option value="A" className="text-slate-900 bg-white font-medium">A</option>
                    <option value="B" className="text-slate-900 bg-white font-medium">B</option>
                    <option value="C" className="text-slate-900 bg-white font-medium">C</option>
                    <option value="D" className="text-slate-900 bg-white font-medium">D</option>
                  </select>
                </div>
              )}

              {newTipe === 'isian' && (
                <div>
                  <label className="text-xs font-extrabold text-slate-800 mb-1 block">Kunci Jawaban Isian Singkat</label>
                  <input type="text" required value={newKunciIsian} onChange={e => setNewKunciIsian(e.target.value)} placeholder="Contoh: Jakarta" className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              )}

              {newTipe === 'esai' && (
                <div>
                  <label className="text-xs font-extrabold text-slate-800 mb-1 block">Pedoman Kunci Esai</label>
                  <input type="text" required value={newKunciEsai} onChange={e => setNewKunciEsai(e.target.value)} placeholder="Masukkan kata kunci/pedoman jawaban..." className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
                </div>
              )}

              {/* Media Upload Area (Image & Video) */}
              <div className="space-y-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Image className="w-4 h-4 text-emerald-600" /> Media Pendukung (Gambar / Video)
                </span>
                
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Image input/upload */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Gambar Soal</label>
                    {newImageUrl ? (
                      <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white h-20 flex items-center justify-center">
                        <img src={newImageUrl} alt="Pratinjau Gambar" className="h-full object-cover w-full" />
                        <button 
                          type="button" 
                          onClick={() => setNewImageUrl('')} 
                          className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                        >
                          Hapus Gambar
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="border border-dashed border-slate-300 hover:border-slate-400 bg-white text-center p-2 rounded-lg cursor-pointer flex flex-col items-center justify-center h-20 transition-all">
                          <Image className="w-5 h-5 text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-600 mt-1">Unggah Gambar</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewImageUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                        </label>
                        <input 
                          type="text" 
                          placeholder="Atau URL gambar..." 
                          value={newImageUrl} 
                          onChange={(e) => setNewImageUrl(e.target.value)} 
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-[9px] font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                        />
                      </div>
                    )}
                  </div>

                  {/* Video input/upload */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Video Soal</label>
                    {newVideoUrl ? (
                      <div className="relative group rounded-lg overflow-hidden border border-slate-200 bg-white h-20 flex items-center justify-center">
                        <div className="text-[10px] text-slate-600 font-bold flex flex-col items-center gap-1">
                          <Film className="w-5 h-5 text-emerald-600" />
                          <span>Video Terpasang</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setNewVideoUrl('')} 
                          className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-[10px] font-bold transition-opacity"
                        >
                          Hapus Video
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        <label className="border border-dashed border-slate-300 hover:border-slate-400 bg-white text-center p-2 rounded-lg cursor-pointer flex flex-col items-center justify-center h-20 transition-all">
                          <Film className="w-5 h-5 text-slate-400" />
                          <span className="text-[9px] font-bold text-slate-600 mt-1">Unggah Video</span>
                          <input 
                            type="file" 
                            accept="video/*" 
                            className="hidden" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  setNewVideoUrl(reader.result as string);
                                };
                                reader.readAsDataURL(file);
                              }
                            }} 
                          />
                        </label>
                        <input 
                          type="text" 
                          placeholder="Atau URL video..." 
                          value={newVideoUrl} 
                          onChange={(e) => setNewVideoUrl(e.target.value)} 
                          className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-[9px] font-medium text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-slate-800 mb-1 block">Bobot Poin Soal</label>
                <input type="number" value={newBobot} onChange={e => setNewBobot(Number(e.target.value))} className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 placeholder:text-slate-500 placeholder:font-normal focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-none" />
              </div>
              </div>

              <div className="flex justify-end gap-2.5 p-4 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => setShowAddSoalModal(false)} className="px-5 py-2.5 rounded-xl text-xs font-black bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer">Batal</button>
                <button type="submit" className="px-6 py-2.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/15 transition-all cursor-pointer">{editingSoalId ? 'Simpan Perubahan' : 'Simpan Soal'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL GENERATE SOAL AI (SESUAI MATA PELAJARAN PAKET AKTIF) */}
      {showAiModalInBank && activeBank && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200/80 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                  <Sparkles className="w-6 h-6 animate-pulse" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-base text-white">
                      Tambah Soal dengan Bantuan AI (Gemini)
                    </h3>
                    <span className="text-[10px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-400/30 px-2 py-0.5 rounded-full">
                      Kurikulum Merdeka
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Mata Pelajaran: <span className="font-bold text-amber-300">{inBankAiMapel}</span> • Paket: <span className="font-semibold">{activeBank.judul}</span> ({inBankAiKelas})
                  </p>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => setShowAiModalInBank(false)}
                className="text-slate-400 hover:text-white font-bold p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer text-xs"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 custom-scrollbar bg-slate-50/60">
              
              {/* Step 1: Parameter Generator (If not reviewed yet) */}
              {inBankAiGeneratedList.length === 0 ? (
                <div className="space-y-4">
                  
                  {/* Subject & Packet Connection Info Card */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                        <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                          <span>{getSubjectMetadata(inBankAiMapel).icon}</span>
                          <span>Tersambung ke Mata Pelajaran: {inBankAiMapel}</span>
                        </span>
                      </div>
                      <div className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                        <span>{inBankAiMapel}</span>
                        <span className="text-slate-400">•</span>
                        <span className="text-slate-700">Kelas {inBankAiKelas}</span>
                        <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-bold ${getSubjectMetadata(inBankAiMapel).colorBadge}`}>
                          {getSubjectMetadata(inBankAiMapel).label}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600">
                        Daftar topik pembelajaran & butir soal AI otomatis disesuaikan dengan Capaian Pembelajaran Kurikulum Merdeka untuk mapel ini.
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex flex-col">
                        <label className="text-[10px] font-bold text-slate-500 mb-1">Ganti Mata Pelajaran:</label>
                        <select
                          value={inBankAiMapel}
                          onChange={e => {
                            const newMapel = e.target.value;
                            setInBankAiMapel(newMapel);
                            const suggestions = getSubjectTopicSuggestions(newMapel);
                            if (suggestions.length > 0) setInBankAiTopik(suggestions[0]);
                          }}
                          className="px-3 py-1.5 bg-white border border-emerald-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
                          title="Ganti mata pelajaran untuk memperbarui rekomendasi materi/topik"
                        >
                          {(() => {
                            const standardMapels = [
                              'Informatika',
                              'Matematika',
                              'Matematika Tingkat Lanjut',
                              'Ilmu Pengetahuan Alam (IPA)',
                              'Fisika',
                              'Kimia',
                              'Biologi',
                              'Bahasa Indonesia',
                              'Bahasa Inggris',
                              'Bahasa Jepang',
                              'Bahasa Arab',
                              'Bahasa Daerah',
                              'Pendidikan Agama Islam (PAI)',
                              'Tahfidz Al-Qur\'an',
                              'Ilmu Pengetahuan Sosial (IPS)',
                              'Sejarah',
                              'Geografi',
                              'Ekonomi',
                              'Sosiologi',
                              'Pendidikan Pancasila (PPKn)',
                              'PJOK (Pendidikan Jasmani & Olahraga)',
                              'Seni Budaya',
                              'Prakarya & Kewirausahaan',
                              'Bimbingan Konseling (BK)'
                            ];
                            const set = new Set<string>();
                            if (inBankAiMapel && inBankAiMapel.trim()) set.add(inBankAiMapel.trim());
                            availableMapelList.forEach(m => {
                              if (m && m.trim()) set.add(m.trim());
                            });
                            standardMapels.forEach(m => set.add(m));
                            return Array.from(set).map(m => (
                              <option key={m} value={m}>{m}</option>
                            ));
                          })()}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Input Topik / Materi Pembelajaran with Dynamic Suggestions */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                        <span>Topik / Materi Pembelajaran Spesifik</span>
                        <span className="text-rose-500">*</span>
                      </label>
                      <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-200">
                        Mapel Aktif: {inBankAiMapel}
                      </span>
                    </div>
                    
                    <input 
                      type="text"
                      required
                      value={inBankAiTopik}
                      onChange={e => setInBankAiTopik(e.target.value)}
                      placeholder={getSubjectMetadata(inBankAiMapel).placeholder}
                      className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none shadow-sm transition-all"
                    />

                    {/* Topic Suggestions Chips */}
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-slate-700">
                          <span className="text-amber-500">💡</span>
                          <span>Rekomendasi Topik Kurikulum Merdeka untuk {inBankAiMapel}:</span>
                          <span className="text-[10px] font-medium text-slate-400">
                            ({getSubjectTopicSuggestions(inBankAiMapel).length} materi)
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">Klik rekomendasi di bawah untuk memilih</span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {getSubjectTopicSuggestions(inBankAiMapel).map(t => {
                          const isSelected = inBankAiTopik.trim().toLowerCase() === t.trim().toLowerCase();
                          return (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setInBankAiTopik(t)}
                              className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all cursor-pointer border flex items-center gap-1.5 text-left ${
                                isSelected
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-300 font-bold'
                                  : 'bg-white hover:bg-indigo-50 text-slate-700 border-slate-200 hover:border-indigo-300 hover:text-indigo-800 shadow-sm'
                              }`}
                            >
                              <span className={isSelected ? 'text-amber-300 font-bold' : 'text-indigo-500 font-bold'}>
                                {isSelected ? '✓' : '+'}
                              </span>
                              <span>{t}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Difficulty Level & Question Count */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    {/* Tingkat Kesulitan */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-extrabold text-slate-800 block">
                        Tingkat Kesulitan Kognitif (Taksonomi Bloom)
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {[
                          { id: 'Mudah (C1-C2: Pemahaman Dasar)', label: '🟢 Mudah', desc: 'C1 - C2' },
                          { id: 'Sedang (C3: Aplikasi Konsep)', label: '🟡 Sedang', desc: 'C3 Aplikasi' },
                          { id: 'Sukar / HOTS (C4-C6: Analisis Kritis)', label: '🔴 HOTS', desc: 'C4 - C6' }
                        ].map(k => (
                          <button
                            key={k.id}
                            type="button"
                            onClick={() => setInBankAiKesulitan(k.id)}
                            className={`p-2 rounded-xl text-xs text-center border transition-all cursor-pointer ${
                              inBankAiKesulitan === k.id
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-800 font-extrabold shadow-sm ring-1 ring-indigo-500'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-medium'
                            }`}
                          >
                            <div className="font-bold">{k.label}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{k.desc}</div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Jumlah Soal & Bobot Poin */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-extrabold text-slate-800 block">
                          Jumlah Soal yang Digenerate
                        </label>
                        <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                          1 – 50 Soal
                        </span>
                      </div>
                      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                        {[5, 10, 15, 20, 30, 40].map(cnt => (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() => setInBankAiJumlah(cnt)}
                            className={`py-2 rounded-xl text-xs font-extrabold border transition-all cursor-pointer ${
                              inBankAiJumlah === cnt
                                ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {cnt} Soal
                          </button>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 pt-1">
                        <div className="flex items-center gap-1.5">
                          <span>Custom jumlah:</span>
                          <input
                            type="number"
                            min={1}
                            max={50}
                            value={inBankAiJumlah}
                            onChange={e => setInBankAiJumlah(Math.min(Math.max(Number(e.target.value) || 1, 1), 50))}
                            className="w-16 p-1 text-center bg-white border border-indigo-300 rounded-lg text-xs font-extrabold text-indigo-700"
                          />
                          <span className="font-bold text-slate-700">Butir</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span>Bobot/soal:</span>
                          <input 
                            type="number"
                            min={1}
                            max={100}
                            value={inBankAiBobot}
                            onChange={e => setInBankAiBobot(Math.min(Math.max(Number(e.target.value) || 1, 1), 100))}
                            className="w-14 p-1 text-center bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                          />
                          <span className="font-bold text-slate-700">Poin</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Tipe Soal yang Diinginkan */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-800 block">
                      Tipe Soal yang Ingin Dihasilkan
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { id: 'pg', label: 'Pilihan Ganda', badge: '1 Jawaban' },
                        { id: 'multiple_choice', label: 'Ganda Kompleks', badge: '>1 Jawaban' },
                        { id: 'isian', label: 'Isian Singkat', badge: 'Teks Pendek' },
                        { id: 'esai', label: 'Esai / Uraian', badge: 'Analisis' }
                      ].map(t => {
                        const isChecked = inBankAiTipeSoal.includes(t.id);
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => handleToggleInBankAiTipe(t.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-start gap-2 ${
                              isChecked
                                ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-sm ring-1 ring-indigo-500'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center shrink-0 border ${
                              isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-300'
                            }`}>
                              {isChecked && <Check className="w-3 h-3" />}
                            </div>
                            <div>
                              <div className="text-xs font-bold leading-tight">{t.label}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">{t.badge}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Instruksi Khusus Guru (Opsional) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-800 block">
                      Instruksi Tambahan Guru (Opsional)
                    </label>
                    <textarea 
                      rows={2}
                      value={inBankAiInstruksi}
                      onChange={e => setInBankAiInstruksi(e.target.value)}
                      placeholder="Contoh: Sertakan stimulus cerita kontekstual kehidupan sehari-hari, atau fokuskan pada penerapan rumus..."
                      className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Action Button: Generate */}
                  <div className="pt-2">
                    <button
                      type="button"
                      disabled={inBankAiLoading}
                      onClick={handleGenerateInBankAi}
                      className="w-full py-3.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 disabled:opacity-50 text-white font-extrabold rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 cursor-pointer"
                    >
                      {inBankAiLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>AI Sedang Merumuskan {inBankAiJumlah} Soal & Kunci Jawaban...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-5 h-5 text-amber-300" />
                          <span>Generate {inBankAiJumlah} Soal AI untuk "{inBankAiMapel}"</span>
                        </>
                      )}
                    </button>
                  </div>

                </div>
              ) : (
                /* Step 2: Review Generated Questions before adding to active Bank */
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-2xl border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                        ✓
                      </span>
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">
                          {inBankAiGeneratedList.length} Soal AI Berhasil Dibuat
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {inBankAiSelectedIndices.length} dari {inBankAiGeneratedList.length} soal terpilih untuk dimasukkan ke "{activeBank.judul}"
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (inBankAiSelectedIndices.length === inBankAiGeneratedList.length) {
                            setInBankAiSelectedIndices([]);
                          } else {
                            setInBankAiSelectedIndices(inBankAiGeneratedList.map((_, i) => i));
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
                      >
                        {inBankAiSelectedIndices.length === inBankAiGeneratedList.length ? 'Batal Pilih Semua' : 'Pilih Semua'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setInBankAiGeneratedList([]);
                          setInBankAiSelectedIndices([]);
                        }}
                        className="px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-all cursor-pointer flex items-center gap-1"
                      >
                        🔄 Ganti Parameter
                      </button>
                    </div>
                  </div>

                  {/* List of Generated Questions for Review */}
                  <div className="space-y-3">
                    {inBankAiGeneratedList.map((soal, idx) => {
                      const isSelected = inBankAiSelectedIndices.includes(idx);
                      return (
                        <div 
                          key={soal.id || idx}
                          className={`p-4 rounded-2xl border transition-all ${
                            isSelected 
                              ? 'bg-white border-indigo-400 shadow-sm ring-1 ring-indigo-400' 
                              : 'bg-slate-100/70 border-slate-200 opacity-70'
                          }`}
                        >
                          <div className="flex items-center justify-between border-b pb-2 mb-2.5">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input 
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => {
                                  setInBankAiSelectedIndices(prev => 
                                    prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                                  );
                                }}
                                className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                              />
                              <span className="text-xs font-extrabold text-slate-800">
                                Butir Soal #{idx + 1}
                              </span>
                            </label>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                {soal.tipe}
                              </span>
                              <span className="text-[11px] font-bold text-emerald-700">
                                Bobot: {soal.bobot} Poin
                              </span>
                            </div>
                          </div>

                          {/* Question Text (Editable) */}
                          <div className="space-y-1 mb-3">
                            <textarea
                              rows={2}
                              value={soal.pertanyaan}
                              onChange={e => {
                                const val = e.target.value;
                                setInBankAiGeneratedList(prev => prev.map((s, i) => i === idx ? { ...s, pertanyaan: val } : s));
                              }}
                              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Options if PG or Multiple Choice */}
                          {(soal.tipe === 'pg' || soal.tipe === 'multiple_choice') && soal.opsi && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                              {soal.opsi.map(op => {
                                const isCorrect = Array.isArray(soal.kunciJawaban) 
                                  ? soal.kunciJawaban.includes(op.id)
                                  : soal.kunciJawaban === op.id;
                                return (
                                  <div 
                                    key={op.id}
                                    className={`p-2 rounded-xl text-xs border flex items-center justify-between ${
                                      isCorrect 
                                        ? 'bg-emerald-50 border-emerald-400 text-emerald-950 font-bold' 
                                        : 'bg-white border-slate-200 text-slate-700 font-medium'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-black">{op.id}.</span>
                                      <span>{op.teks}</span>
                                    </div>
                                    {isCorrect && (
                                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-bold">
                                        Kunci ✓
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* Kunci Jawaban for Isian or Esai */}
                          {(soal.tipe === 'isian' || soal.tipe === 'esai') && (
                            <div className="mb-2 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                              <span className="font-bold text-amber-900">Kunci Jawaban: </span>
                              <span className="text-slate-800">{String(soal.kunciJawaban)}</span>
                            </div>
                          )}

                          {/* Pembahasan */}
                          {soal.pembahasan && (
                            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600">
                              <span className="font-bold text-slate-800">Pembahasan Ilmiah: </span>
                              <span>{soal.pembahasan}</span>
                            </div>
                          )}

                        </div>
                      );
                    })}
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
              <button 
                type="button" 
                onClick={() => setShowAiModalInBank(false)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Batal
              </button>

              {inBankAiGeneratedList.length > 0 && (
                <button
                  type="button"
                  onClick={handleApplyAiQuestionsToActiveBank}
                  disabled={inBankAiSelectedIndices.length === 0}
                  className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-extrabold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Masukkan {inBankAiSelectedIndices.length} Soal ke Paket "{activeBank.judul}"</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {inBankAiToast && (
        <div className="fixed bottom-6 right-6 z-[160] bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-in slide-in-from-bottom-4 duration-200">
          <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold">{inBankAiToast}</span>
        </div>
      )}

      {/* POPUP CHEAT ALERT MODAL (DENGAN ALARM SUARA BIP BIP BIP) */}
      {showCheatAlert && (
        <div className="fixed inset-0 bg-[#3b050d]/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#100a0d] border border-rose-500/70 rounded-2xl max-w-md w-full p-6 text-center space-y-4 shadow-2xl shadow-rose-950/70 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Pulsing Icon */}
            <div className="w-14 h-14 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 relative">
              <ShieldAlert className="w-7 h-7 animate-pulse" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
              </span>
            </div>

            <div>
              <h3 className="text-base font-extrabold text-white tracking-wide uppercase">
                PERINGATAN KECURANGAN CBT!
              </h3>
              <p className="text-[11px] text-rose-200/90 mt-1 leading-relaxed px-2">
                Sistem mendeteksi Anda mencoba membuka aplikasi/tab lain atau keluar dari fokus layar ujian.
              </p>
            </div>

            {/* Violation Counter Box */}
            <div className="p-3 bg-[#1e0a11] rounded-xl border border-rose-900/80 text-rose-200 font-mono text-xs font-bold tracking-wider">
              Status Pelanggaran: {cheatCount} / 3
            </div>

            {/* Sound Alarm Active Badge */}
            <div className="flex items-center justify-center gap-2 text-[11px] font-semibold text-rose-300 bg-rose-950/40 border border-rose-800/60 rounded-xl py-1.5 px-3">
              <Volume2 className="w-4 h-4 text-rose-400 animate-bounce" />
              <span>Alarm Pelanggaran Aktif: <strong>Bip Bip Bip</strong></span>
              <button
                type="button"
                onClick={() => playViolationBeepSound()}
                className="text-[10px] bg-rose-600/30 hover:bg-rose-600/50 text-rose-200 border border-rose-500/40 px-2 py-0.5 rounded ml-1 transition-all cursor-pointer font-bold"
                title="Bunyikan Ulang"
              >
                Ulangi
              </button>
            </div>

            <p className="text-[10px] text-slate-400 px-1 leading-relaxed">
              {cheatCount >= 3 
                ? 'Batas maksimal pelanggaran telah terlampaui. Ujian telah di-submit secara otomatis!' 
                : 'Peringatan: Apabila mencapai 3 kali pelanggaran, sistem akan otomatis mengunci dan me-submit ujian Anda!'}
            </p>

            <button
              onClick={() => setShowCheatAlert(false)}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-500 active:scale-98 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-rose-900/50 cursor-pointer"
            >
              Saya Mengerti & Kembali ke Ujian
            </button>
          </div>
        </div>
      )}

      {/* PRINTABLE KARTU PESERTA & JADWAL UJIAN MODAL (10 × 13 cm • A4) */}
      {activeKartuSiswa && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto print:hidden">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl max-w-xl w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-purple-400" /> Pratinjau Cetak Kartu Peserta Ujian CBT
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Ukuran fisik cetak: <strong className="text-slate-200">10 cm × 13 cm</strong> (HVS A4 Portrait)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedKartuSiswa(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Centered 10x13cm Card Preview */}
            <div className="flex justify-center overflow-x-auto py-2 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="shadow-xl rounded-sm overflow-hidden bg-white shrink-0">
                <KartuPesertaCard
                  siswa={activeKartuSiswa}
                  jadwalList={jadwalList}
                  rombelList={rombelList}
                  schoolSettings={schoolSettings}
                  cbtSettings={cbtSettings}
                  showCutGuide={showKartuCutGuide}
                />
              </div>
            </div>

            {(!activeKartuSiswa.username?.trim() || !activeKartuSiswa.password?.trim()) && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>
                  Username atau password siswa ini belum diisi di Database Siswa. Silakan lengkapi pada menu <strong>Database Sekolah &rarr; Data Siswa</strong> agar otomatis tampil pada kartu.
                </span>
              </div>
            )}

            <div className="flex flex-wrap justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSelectedKartuSiswa(null)}
                className="px-4 py-2 bg-[#181818] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => handleDownloadKartuPdf([activeKartuSiswa], activeKartuSiswa.nama)}
                disabled={isDownloadingKartuPdf}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Download className="w-4 h-4" />
                {isDownloadingKartuPdf ? 'Mengunduh PDF...' : 'Unduh PDF'}
              </button>
              <button
                type="button"
                onClick={handlePrintKartuUjian}
                disabled={isPrintingKartu}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
              >
                <Printer className="w-4 h-4" /> Cetak Kartu (10 × 13 cm)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PRATINJAU CETAK BANYAK KARTU PESERTA (HVS A4 • 4 KARTU/LEMBAR) */}
      <KartuPesertaBatchModal
        isOpen={showBatchPrintModal}
        onClose={() => setShowBatchPrintModal(false)}
        siswaList={batchKartuSiswaList}
        jadwalList={jadwalList}
        rombelList={rombelList}
        schoolSettings={schoolSettings}
        cbtSettings={cbtSettings}
        showCutGuide={showKartuCutGuide}
        onToggleCutGuide={() => setShowKartuCutGuide(prev => !prev)}
        onTriggerPrint={targetList => triggerKartuA4Print(targetList)}
        onTriggerDownloadPdf={(targetList, rangeSuffix) => handleDownloadKartuPdf(targetList, rangeSuffix)}
        isPrinting={isPrintingKartu}
        isDownloadingPdf={isDownloadingKartuPdf}
        downloadProgress={downloadPdfProgress}
      />

      {/* TOP-LEVEL PRINT CONTAINER (HANYA TERLIHAT SAAT WINDOW.PRINT) */}
      <KartuPesertaPrintContainer
        siswaList={printKartuTargetList}
        jadwalList={jadwalList}
        rombelList={rombelList}
        schoolSettings={schoolSettings}
        cbtSettings={cbtSettings}
        showCutGuide={showKartuCutGuide}
      />

      {/* MODAL TAMBAH & EDIT SESI UJIAN CBT */}
      {showJadwalModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-600/20 text-blue-400 border border-blue-500/30">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">
                    {editingJadwalId ? 'Edit Sesi Ujian CBT' : 'Tambah Sesi Ujian CBT'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Atur jadwal pelaksanaan ujian online, ruang lab, dan guru mata pelajaran
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowJadwalModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveJadwal} className="space-y-4 text-xs">
              
              {/* Preset dari Ujian CBT */}
              {ujianList.length > 0 && !editingJadwalId && (
                <div className="p-3.5 bg-[#181818] rounded-xl border border-blue-500/30 space-y-1.5 shadow-sm">
                  <label className="text-[11px] font-bold text-blue-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Pilih dari Ujian CBT yang Sudah Dibuat (Opsional):
                  </label>
                  <select
                    value={formJadwal.ujianId}
                    onChange={(e) => handleSelectUjianPreset(e.target.value)}
                    className="w-full bg-[#121212] border border-slate-700 rounded-lg px-3 py-2 text-slate-200 text-xs focus:border-blue-500 outline-none font-medium"
                  >
                    <option value="">-- Buat Sesi Kustom / Mandiri --</option>
                    {ujianList.map(u => (
                      <option key={u.id} value={u.id}>
                        📝 {u.judulUjian} ({u.mataPelajaran} • Kelas {u.kelasTarget})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400">
                    Memilih ujian CBT akan otomatis mengisi nama sesi, mata pelajaran, kelas target, dan guru mapel terkait.
                  </p>
                </div>
              )}

              {/* Nama Sesi Ujian */}
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  Nama Sesi Ujian <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="cth: Penilaian Tengah Semester (PTS) Matematika Kelas X"
                  value={formJadwal.judulUjian}
                  onChange={(e) => setFormJadwal({ ...formJadwal, judulUjian: e.target.value })}
                  className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-xs focus:border-blue-500 outline-none"
                />
              </div>

              {/* Grid 2: Mapel & Guru Mapel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Mata Pelajaran <span className="text-rose-400">*</span>
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={availableMapelList.includes(formJadwal.mataPelajaran) ? formJadwal.mataPelajaran : 'custom'}
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          handleMapelChange(e.target.value);
                        }
                      }}
                      className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-blue-500 outline-none"
                    >
                      <option value="">-- Pilih Mata Pelajaran --</option>
                      {availableMapelList.map(m => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                      <option value="custom">✏️ Tulis Mata Pelajaran Kustom / Lainnya...</option>
                    </select>

                    {/* Jika memilih kustom atau input manual */}
                    {(!availableMapelList.includes(formJadwal.mataPelajaran) || !formJadwal.mataPelajaran) && (
                      <input
                        type="text"
                        required
                        placeholder="Ketik nama mata pelajaran..."
                        value={formJadwal.mataPelajaran}
                        onChange={(e) => handleMapelChange(e.target.value)}
                        className="w-full bg-[#1c1c1c] border border-blue-500/50 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 text-xs focus:border-blue-500 outline-none"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Guru Mata Pelajaran (Guru Mapel)
                  </label>
                  <div className="space-y-1.5">
                    <select
                      value={
                        guruList.some(g => g.nama === formJadwal.pengawas)
                          ? formJadwal.pengawas
                          : formJadwal.pengawas
                          ? 'custom'
                          : ''
                      }
                      onChange={(e) => {
                        if (e.target.value !== 'custom') {
                          setFormJadwal({ ...formJadwal, pengawas: e.target.value });
                        }
                      }}
                      className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white text-xs focus:border-blue-500 outline-none font-medium"
                    >
                      <option value="">-- Pilih Guru Mata Pelajaran --</option>
                      {guruList.map(g => (
                        <option key={g.id} value={g.nama}>
                          {g.nama} {g.mataPelajaran ? `(Guru ${g.mataPelajaran})` : ''}
                        </option>
                      ))}
                      <option value="custom">✏️ Tulis Guru Mapel Lainnya...</option>
                    </select>

                    {(formJadwal.pengawas && !guruList.some(g => g.nama === formJadwal.pengawas)) && (
                      <input
                        type="text"
                        placeholder="Ketik nama guru mata pelajaran..."
                        value={formJadwal.pengawas}
                        onChange={(e) => setFormJadwal({ ...formJadwal, pengawas: e.target.value })}
                        className="w-full bg-[#1c1c1c] border border-blue-500/50 rounded-xl px-3.5 py-2 text-white placeholder-slate-500 text-xs focus:border-blue-500 outline-none"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* Kelas / Rombel Target (Multi-Pilihan Ceklis) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-slate-300 font-bold text-xs">
                    Kelas / Rombel Target (Bisa Pilih Lebih dari Satu) <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                      formJadwal.kelasTarget === 'Semua Kelas' || isAllKelasSelected
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
                        : selectedKelasArray.length > 0
                        ? 'text-blue-400 bg-blue-500/10 border-blue-500/30'
                        : 'text-rose-400 bg-rose-500/10 border-rose-500/30'
                    }`}>
                      {formJadwal.kelasTarget === 'Semua Kelas' || isAllKelasSelected
                        ? '🌐 Semua Kelas Terpilih'
                        : selectedKelasArray.length > 0
                        ? `✓ ${selectedKelasArray.length} Kelas Dipilih`
                        : '⚠️ Belum Ada Kelas Dipilih'}
                    </span>
                    <button
                      type="button"
                      onClick={handleSelectAllKelasToggle}
                      className="text-[11px] text-slate-400 hover:text-blue-400 underline transition-colors cursor-pointer"
                    >
                      {isAllKelasSelected ? 'Batal Pilih Semua' : 'Pilih Semua'}
                    </button>
                  </div>
                </div>

                <div className="bg-[#181818] border border-slate-800 rounded-xl p-3 space-y-2.5">
                  {/* Master Toggle: Semua Kelas */}
                  <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#141414] hover:bg-slate-800/60 border border-slate-800 cursor-pointer transition-all">
                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        checked={isAllKelasSelected}
                        onChange={handleSelectAllKelasToggle}
                        className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer accent-blue-600"
                      />
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>🌐</span> Semua Kelas (Semua Rombel Terdaftar)
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Berlaku otomatis untuk seluruh siswa di semua tingkatan kelas
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                      {availableKelasList.length} Rombel
                    </span>
                  </label>

                  {/* Grid Checkbox Rombel */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1 custom-scrollbar">
                    {availableKelasList.map(k => {
                      const isChecked = selectedKelasArray.includes(k) || formJadwal.kelasTarget === 'Semua Kelas';
                      const count = siswaList.filter(s => s.kelas && s.kelas.trim().toLowerCase() === k.toLowerCase()).length;
                      return (
                        <label
                          key={k}
                          className={`flex items-center justify-between p-2.5 rounded-lg border transition-all cursor-pointer ${
                            isChecked
                              ? 'bg-blue-950/40 border-blue-500/50 text-white shadow-sm'
                              : 'bg-[#141414] border-slate-800/80 hover:bg-slate-800/40 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleKelasCheckbox(k)}
                              className="w-4 h-4 rounded bg-slate-900 border-slate-700 text-blue-600 focus:ring-0 cursor-pointer accent-blue-600 shrink-0"
                            />
                            <span className="text-xs font-medium truncate" title={k}>{k}</span>
                          </div>
                          {count > 0 && (
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-800/90 px-1.5 py-0.5 rounded shrink-0 ml-1.5">
                              {count} Siswa
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>

                  {/* Tambah Kelas / Rombel Kustom */}
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="+ Tulis nama kelas / rombel kustom..."
                      value={customKelasInput}
                      onChange={(e) => setCustomKelasInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomKelas();
                        }
                      }}
                      className="flex-1 bg-[#121212] border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-blue-500 outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomKelas}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 text-slate-200 hover:text-white rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0"
                    >
                      + Tambah
                    </button>
                  </div>

                  {/* Chips Preview Rombel yang Dipilih */}
                  {selectedKelasArray.length > 0 && formJadwal.kelasTarget !== 'Semua Kelas' && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-slate-400">Rombel Terpilih:</span>
                      {selectedKelasArray.map(k => (
                        <span
                          key={k}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[11px]"
                        >
                          {k}
                          <button
                            type="button"
                            onClick={() => handleToggleKelasCheckbox(k)}
                            className="hover:text-rose-400 cursor-pointer ml-0.5"
                            title={`Hapus ${k}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Grid 3: Tanggal & Waktu */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Tanggal Pelaksanaan <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formJadwal.tanggal}
                    onChange={(e) => setFormJadwal({ ...formJadwal, tanggal: e.target.value })}
                    className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Jam Mulai <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formJadwal.jamMulai}
                    onChange={(e) => setFormJadwal({ ...formJadwal, jamMulai: e.target.value })}
                    className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Jam Selesai <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formJadwal.jamSelesai}
                    onChange={(e) => setFormJadwal({ ...formJadwal, jamSelesai: e.target.value })}
                    className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Grid 2: Ruang & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Ruang Ujian
                  </label>
                  <input
                    type="text"
                    placeholder="cth: Ruang Ujian 01"
                    value={formJadwal.ruang}
                    onChange={(e) => setFormJadwal({ ...formJadwal, ruang: e.target.value })}
                    className="w-full bg-[#181818] border border-slate-800 rounded-xl px-3.5 py-2.5 text-white placeholder-slate-500 text-xs focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    Status Sesi Ujian
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['Aktif', 'Mendatang', 'Selesai'] as const).map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setFormJadwal({ ...formJadwal, status: st })}
                        className={`py-2 px-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                          formJadwal.status === st
                            ? st === 'Aktif'
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-sm'
                              : st === 'Mendatang'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                              : 'bg-slate-700 text-slate-200 border-slate-600 shadow-sm'
                            : 'bg-[#181818] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full ${
                          st === 'Aktif' ? 'bg-emerald-400' : st === 'Mendatang' ? 'bg-amber-400' : 'bg-slate-500'
                        }`}></span>
                        {st}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowJadwalModal(false)}
                  className="px-4 py-2.5 bg-[#181818] hover:bg-slate-800 text-slate-300 rounded-xl font-bold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-900/30 transition-all cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  {editingJadwalId ? 'Perbarui Sesi Ujian' : 'Simpan Sesi Ujian'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Sesi Ujian */}
      {deleteTargetJadwal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-rose-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-rose-950/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-base font-bold text-white">Hapus Sesi Ujian CBT?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin menghapus sesi ujian ini dari jadwal pelaksanaan CBT?
                </p>
                <div className="p-3 bg-[#181818] rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-rose-300">{deleteTargetJadwal.judulUjian}</div>
                  <div className="text-[11px] text-slate-400">
                    {deleteTargetJadwal.mataPelajaran} • Kelas {deleteTargetJadwal.kelasTarget}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {deleteTargetJadwal.tanggal} ({deleteTargetJadwal.jamMulai} - {deleteTargetJadwal.jamSelesai}) • {deleteTargetJadwal.ruang}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTargetJadwal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteJadwal}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Bank Soal */}
      {deleteTargetBankSoal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-rose-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-rose-950/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-base font-bold text-white">Hapus Paket Bank Soal?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin menghapus paket bank soal ini dari daftar?
                </p>
                <div className="p-3 bg-[#181818] rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-rose-300">{deleteTargetBankSoal.judul}</div>
                  <div className="text-[11px] text-slate-400">
                    {deleteTargetBankSoal.mataPelajaran} • Kelas {deleteTargetBankSoal.kelas} ({deleteTargetBankSoal.jumlahSoal} Soal)
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTargetBankSoal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (bankSoalList.length <= 1) {
                    alert('Minimal harus menyisakan 1 paket Bank Soal.');
                    setDeleteTargetBankSoal(null);
                    return;
                  }
                  const nextList = bankSoalList.filter(item => item.id !== deleteTargetBankSoal.id);
                  setBankSoalList(nextList);
                  if (selectedBankId === deleteTargetBankSoal.id) {
                    setSelectedBankId(nextList[0]?.id || '');
                  }
                  showToast('Paket Bank Soal berhasil dihapus!');
                  setDeleteTargetBankSoal(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Paket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Soal */}
      {deleteTargetSoal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-rose-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-rose-950/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-base font-bold text-white">Hapus Soal dari Bank Soal?</h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Apakah Anda yakin ingin menghapus butir soal ini dari paket bank soal aktif?
                </p>
                <div className="p-3 bg-[#181818] rounded-xl border border-slate-800 space-y-1">
                  <div className="text-xs font-bold text-rose-300 line-clamp-2">{deleteTargetSoal.pertanyaan}</div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTargetSoal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeBank) {
                    setBankSoalList(prev => prev.map(b => {
                      if (b.id === activeBank.id) {
                        const updatedDaftarSoal = b.daftarSoal.filter(s => s.id !== deleteTargetSoal.id);
                        return {
                          ...b,
                          daftarSoal: updatedDaftarSoal,
                          jumlahSoal: updatedDaftarSoal.length
                        };
                      }
                      return b;
                    }));
                    showToast('Soal berhasil dihapus dari Bank Soal!');
                  }
                  setDeleteTargetSoal(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> Ya, Hapus Soal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Hasil Ujian */}
      {deleteTargetHasilUjian && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-rose-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl shadow-rose-950/30 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div className="space-y-2 flex-1">
                <h3 className="text-base font-bold text-white">
                  {deleteTargetHasilUjian === 'all' ? 'Hapus SEMUA Hasil Ujian Siswa?' : 'Hapus Hasil Ujian Siswa?'}
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {deleteTargetHasilUjian === 'all'
                    ? `Apakah Anda yakin ingin menghapus SEMUA (${hasilUjianList.length} lembar) catatan hasil ujian siswa dari database?`
                    : 'Apakah Anda yakin ingin menghapus catatan hasil ujian siswa ini dari database?'}
                </p>
                <div className="p-3 bg-[#181818] rounded-xl border border-slate-800 space-y-1">
                  {deleteTargetHasilUjian === 'all' ? (
                    <div className="text-xs font-bold text-rose-300">Total {hasilUjianList.length} Lembar Penilaian CBT</div>
                  ) : (
                    <>
                      <div className="text-xs font-bold text-rose-300">{(deleteTargetHasilUjian as HasilUjian).siswaNama}</div>
                      <div className="text-[11px] text-slate-400">
                        Kelas: {(deleteTargetHasilUjian as HasilUjian).kelas} • NIS: {(deleteTargetHasilUjian as HasilUjian).nis}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Nilai Akhir: {(deleteTargetHasilUjian as HasilUjian).nilaiTotal} / 100 • Submit: {new Date((deleteTargetHasilUjian as HasilUjian).waktuSubmit).toLocaleString('id-ID')}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTargetHasilUjian(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  if (deleteTargetHasilUjian === 'all') {
                    if (setHasilUjianList) {
                      setHasilUjianList([]);
                    }
                    showToast('Semua hasil ujian berhasil dihapus!');
                  } else {
                    if (setHasilUjianList) {
                      setHasilUjianList(prev => prev.filter(h => h.id !== (deleteTargetHasilUjian as HasilUjian).id));
                    }
                    showToast('Hasil ujian siswa berhasil dihapus!');
                  }
                  setDeleteTargetHasilUjian(null);
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-900/40 transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" /> {deleteTargetHasilUjian === 'all' ? 'Ya, Hapus Semua' : 'Ya, Hapus Hasil Ujian'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT PAKET BANK SOAL */}
      {showAddBankModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[105] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 shadow-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">
                    {editingBankId ? 'Edit Paket Bank Soal' : 'Tambah Paket Bank Soal Baru'}
                  </h3>
                  <p className="text-[11px] text-emerald-200 mt-0.5">
                    {currentRole === 'guru'
                      ? `Penyusun: ${activeGuru?.nama || userEmail || 'Guru Pengampu'} • Tersimpan Otomatis ke Firebase`
                      : 'Buat paket soal ujian baru sesuai Kurikulum Merdeka'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddBankModal(false)}
                className="text-slate-400 hover:text-white p-2 hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                title="Tutup Modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBankPaket} className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4 custom-scrollbar">
                {bankFormError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bankFormError}</span>
                  </div>
                )}

                {/* Judul Paket */}
                <div className="space-y-1.5">
                  <label className="text-xs font-extrabold text-slate-800 block">
                    Judul Paket Bank Soal <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={bankJudul}
                    onChange={e => setBankJudul(e.target.value)}
                    placeholder="Contoh: Asesmen Sumatif Akhir Semester - Informatika Kurikulum Merdeka"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                  {/* Quick Template Title Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {[
                      'Asesmen Sumatif Akhir Semester (ASAS)',
                      'Penilaian Tengah Semester (PTS)',
                      'Asesmen Formatif / Ulangan Harian',
                      'Latihan Soal Kurikulum Merdeka'
                    ].map(prefix => (
                      <button
                        key={prefix}
                        type="button"
                        onClick={() => setBankJudul(`${prefix} - ${bankMapel || 'Mata Pelajaran'}`)}
                        className="px-2 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 rounded-lg text-[10px] font-semibold transition-all cursor-pointer"
                      >
                        + {prefix}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mata Pelajaran & Kelas Target */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-800 block">
                      Mata Pelajaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bankMapel}
                      onChange={e => {
                        const val = e.target.value;
                        setBankMapel(val);
                        if (!editingBankId) {
                          setBankKode(generateBankKode(val, bankKelas));
                          if (
                            !bankJudul ||
                            bankJudul.startsWith('Asesmen Sumatif -') ||
                            bankJudul.startsWith('Penilaian Tengah Semester') ||
                            bankJudul.startsWith('Asesmen Formatif') ||
                            bankJudul.startsWith('Latihan Soal')
                          ) {
                            const prefix = bankJudul.includes(' - ')
                              ? bankJudul.split(' - ')[0]
                              : 'Asesmen Sumatif';
                            setBankJudul(`${prefix} - ${val} Kurikulum Merdeka`);
                          }
                        }
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                    >
                      {(() => {
                        const set = new Set<string>();
                        if (currentRole === 'guru' && activeGuru?.mataPelajaran?.trim()) {
                          set.add(activeGuru.mataPelajaran.trim());
                        }
                        if (bankMapel?.trim()) set.add(bankMapel.trim());
                        availableMapelList.forEach(m => {
                          if (m?.trim()) set.add(m.trim());
                        });
                        [
                          'Informatika',
                          'Matematika',
                          'Matematika Tingkat Lanjut',
                          'Ilmu Pengetahuan Alam (IPA)',
                          'Bahasa Indonesia',
                          'Bahasa Inggris',
                          'Pendidikan Agama Islam (PAI)',
                          'Ilmu Pengetahuan Sosial (IPS)',
                          'Pendidikan Pancasila (PPKn)',
                          'PJOK (Pendidikan Jasmani & Olahraga)',
                          'Seni Budaya',
                          'Prakarya & Kewirausahaan',
                          'Bimbingan Konseling (BK)'
                        ].forEach(m => set.add(m));
                        return Array.from(set).map(m => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-800 block">
                      Kelas Target <span className="text-rose-500">*</span>
                    </label>
                    <select
                      value={bankKelas}
                      onChange={e => {
                        const val = e.target.value;
                        setBankKelas(val);
                        if (!editingBankId) {
                          setBankKode(generateBankKode(bankMapel, val));
                        }
                      }}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none cursor-pointer"
                    >
                      {(() => {
                        const set = new Set<string>();
                        if (bankKelas?.trim()) set.add(bankKelas.trim());
                        availableKelasList.forEach(k => set.add(k));
                        ['Semua Kelas VII', 'Semua Kelas VIII', 'Semua Kelas IX', 'Semua Kelas'].forEach(k =>
                          set.add(k)
                        );
                        return Array.from(set).map(k => (
                          <option key={k} value={k}>
                            {k}
                          </option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                {/* Kode Paket & Durasi */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-800 block">
                      Kode Paket Soal <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={bankKode}
                      onChange={e => setBankKode(e.target.value.toUpperCase())}
                      placeholder="Contoh: INF-VIII-2026-01"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-extrabold text-slate-800 block">
                      Durasi Ujian (Menit) <span className="text-rose-500">*</span>
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={5}
                        max={300}
                        required
                        value={bankDurasi}
                        onChange={e => setBankDurasi(Number(e.target.value))}
                        className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                      {[45, 60, 90, 120].map(d => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setBankDurasi(d)}
                          className={`px-2 py-2 rounded-xl text-[10px] font-bold border transition-all cursor-pointer shrink-0 ${
                            bankDurasi === d
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {d}m
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Optional JSON Question Import */}
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-dashed border-slate-300 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                      <FileJson className="w-4 h-4 text-emerald-600" />
                      <span>Import Soal dari File JSON (Opsional)</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" /> Unduh Template
                    </button>
                  </div>
                  <p className="text-[11px] text-slate-500">
                    {editingBankId
                      ? 'Jika Anda mengunggah file JSON, soal di dalamnya akan ditambahkan ke paket ini.'
                      : 'Biarkan kosong jika ingin mengisi butir soal nanti dengan tombol "Tambah Soal AI" atau "Tambah Soal Manual".'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="px-3 py-1.5 bg-white hover:bg-emerald-50 text-slate-700 hover:text-emerald-800 border border-slate-300 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shadow-sm transition-all">
                      <Upload className="w-3.5 h-3.5 text-emerald-600" />
                      <span>{bankImportFileName ? 'Ganti File JSON' : 'Pilih File JSON'}</span>
                      <input type="file" accept=".json,application/json" onChange={handleImportJsonForBank} className="hidden" />
                    </label>
                    {bankImportFileName && (
                      <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg text-[11px] font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{bankImportFileName}</span>
                        <button
                          type="button"
                          onClick={() => {
                            setBankImportedSoal([]);
                            setBankImportFileName('');
                          }}
                          className="ml-1 text-emerald-900 hover:text-rose-600 font-black cursor-pointer"
                          title="Batalkan file JSON"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAddBankModal(false)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{editingBankId ? 'Simpan Perubahan Paket' : 'Simpan Paket Bank Soal'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
