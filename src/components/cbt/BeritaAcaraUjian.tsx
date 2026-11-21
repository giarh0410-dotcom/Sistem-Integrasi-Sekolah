import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  FileDown,
  FileSignature,
  FileText,
  Filter,
  Loader2,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UserMinus,
  UserPlus,
  Users,
  X,
  Edit2
} from 'lucide-react';
import {
  BeritaAcaraAbsenSiswa,
  BeritaAcaraUjianItem,
  CbtExamSettings,
  Guru,
  JadwalUjianItem,
  PengawasUjianItem,
  Role,
  SchoolSettings,
  Staf
} from '../../types/school';
import { dbFetchCollection, dbSaveCollection } from '../../lib/firebaseSync';
import { downloadBeritaAcaraPdf } from './beritaAcaraPdf';

interface DenahSeatRef {
  nomorKursi: number;
  namaSiswa: string;
  kelasSiswa?: string;
  nomorPeserta?: string;
}

interface DenahRoomRef {
  id: string;
  namaRuang: string;
  pengawas?: string;
  jumlahKursi: number;
  kursiList: DenahSeatRef[];
}

interface BeritaAcaraUjianProps {
  guruList?: Guru[];
  stafList?: Staf[];
  jadwalUjianList?: JadwalUjianItem[];
  schoolSettings?: SchoolSettings;
  cbtSettings?: CbtExamSettings;
  currentRole?: Role;
  userEmail?: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const STORAGE_KEY = 'edu_beritaAcaraUjianList';
const DENAH_STORAGE_KEY = 'edu_denahRuangList';
const PENGAWAS_STORAGE_KEY = 'edu_pengawasUjianList';

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN_ID = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember'
];
const BULAN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

const DEFAULT_NOTE_TERTIB =
  'Pelaksanaan ujian berlangsung dengan tertib, aman, dan lancar tanpa kendala.';

function parseIsoDateLocal(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((isoDate || '').trim());
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatTanggalCompact(isoDate: string): string {
  const dt = parseIsoDateLocal(isoDate);
  if (!dt) return isoDate || '-';
  return `${HARI_SHORT[dt.getDay()]}, ${String(dt.getDate()).padStart(2, '0')} ${BULAN_SHORT[dt.getMonth()]} ${dt.getFullYear()}`;
}

function formatTanggalFull(isoDate: string): string {
  const dt = parseIsoDateLocal(isoDate);
  if (!dt) return isoDate || '-';
  return `${HARI_ID[dt.getDay()]}, ${dt.getDate()} ${BULAN_ID[dt.getMonth()]} ${dt.getFullYear()}`;
}

function generateNomorBa(tanggal: string, ruang: string, seq: number): string {
  const dt = parseIsoDateLocal(tanggal);
  const year = dt ? dt.getFullYear() : new Date().getFullYear();
  const roomNum = ruang.replace(/[^0-9]/g, '') || '01';
  return `BA/${String(seq).padStart(3, '0')}/R${roomNum.padStart(2, '0')}/${year}`;
}

export const BeritaAcaraUjian: React.FC<BeritaAcaraUjianProps> = ({
  guruList = [],
  stafList = [],
  jadwalUjianList = [],
  schoolSettings,
  cbtSettings,
  currentRole = 'admin',
  userEmail = '',
  showToast
}) => {
  const canEdit = currentRole !== 'siswa';
  const isAdmin = currentRole !== 'siswa' && currentRole !== 'guru';

  const [items, setItems] = useState<BeritaAcaraUjianItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [denahRooms, setDenahRooms] = useState<DenahRoomRef[]>(() => {
    try {
      const saved = localStorage.getItem(DENAH_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((r: any) => r && r.namaRuang)
            .map((r: any) => ({
              id: r.id,
              namaRuang: String(r.namaRuang),
              pengawas: r.pengawas || '',
              jumlahKursi: Number(r.jumlahKursi || 0),
              kursiList: Array.isArray(r.kursiList) ? r.kursiList : []
            }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [pengawasSchedules, setPengawasSchedules] = useState<PengawasUjianItem[]>(() => {
    try {
      const saved = localStorage.getItem(PENGAWAS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('Semua');
  const [filterRuang, setFilterRuang] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Draft' | 'Final'>('Semua');
  const [onlyMyRooms, setOnlyMyRooms] = useState(false);

  // PDF Export state
  const [blankPdfMode, setBlankPdfMode] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadingItemId, setDownloadingItemId] = useState<string | null>(null);

  // Modals
  const [previewItem, setPreviewItem] = useState<BeritaAcaraUjianItem | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [seatSearch, setSeatSearch] = useState('');
  const [manualAbsentName, setManualAbsentName] = useState('');
  const [manualAbsentKelas, setManualAbsentKelas] = useState('');
  const [manualAbsentAlasan, setManualAbsentAlasan] = useState<'Sakit' | 'Izin' | 'Alpha'>('Sakit');

  const [formState, setFormState] = useState<{
    nomorBeritaAcara: string;
    tanggal: string;
    sesi: string;
    jamMulai: string;
    jamSelesai: string;
    mataPelajaran: string;
    ruang: string;
    pengawasNama: string;
    pengawasNip: string;
    jumlahTerdaftar: number;
    jumlahHadir: number;
    pesertaTidakHadir: BeritaAcaraAbsenSiswa[];
    kondisiPelaksanaan: BeritaAcaraUjianItem['kondisiPelaksanaan'];
    catatanKejadian: string;
    status: 'Draft' | 'Final';
  }>({
    nomorBeritaAcara: '',
    tanggal: '',
    sesi: 'Sesi 1',
    jamMulai: '07:30',
    jamSelesai: '09:00',
    mataPelajaran: '',
    ruang: 'Ruang 1',
    pengawasNama: '',
    pengawasNip: '',
    jumlahTerdaftar: 24,
    jumlahHadir: 24,
    pesertaTidakHadir: [],
    kondisiPelaksanaan: 'Tertib & Lancar',
    catatanKejadian: DEFAULT_NOTE_TERTIB,
    status: 'Draft'
  });

  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchSelectedDates, setBatchSelectedDates] = useState<string[]>([]);
  const [batchReplaceExisting, setBatchReplaceExisting] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Sync Firestore on mount
  useEffect(() => {
    let mounted = true;
    const loadRemote = async () => {
      try {
        const [remoteBa, remoteDenah, remotePengawas] = await Promise.all([
          dbFetchCollection<BeritaAcaraUjianItem>(STORAGE_KEY),
          dbFetchCollection<any>(DENAH_STORAGE_KEY),
          dbFetchCollection<PengawasUjianItem>(PENGAWAS_STORAGE_KEY)
        ]);
        if (!mounted) return;

        if (remoteBa && remoteBa.length > 0) {
          setItems(remoteBa);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remoteBa));
        }

        if (remoteDenah && remoteDenah.length > 0) {
          const mapped: DenahRoomRef[] = remoteDenah
            .filter(r => r && r.namaRuang)
            .map(r => ({
              id: r.id,
              namaRuang: String(r.namaRuang),
              pengawas: r.pengawas || '',
              jumlahKursi: Number(r.jumlahKursi || 0),
              kursiList: Array.isArray(r.kursiList) ? r.kursiList : []
            }))
            .sort((a, b) => a.namaRuang.localeCompare(b.namaRuang, undefined, { numeric: true }));
          if (mapped.length > 0) setDenahRooms(mapped);
        }

        if (remotePengawas && remotePengawas.length > 0) {
          setPengawasSchedules(remotePengawas);
        }
      } catch (err) {
        console.error('Gagal mengambil data Berita Acara Ujian:', err);
      }
    };
    loadRemote();
    return () => {
      mounted = false;
    };
  }, []);

  const persistItems = (next: BeritaAcaraUjianItem[]) => {
    setItems(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      dbSaveCollection(STORAGE_KEY, next).catch(console.error);
    } catch (err) {
      console.error('Gagal menyimpan Berita Acara Ujian:', err);
    }
  };

  // Teachers / staff lookup
  const staffDirectory = useMemo(() => {
    const map = new Map<string, { nama: string; nip: string; email: string; roleLabel: string }>();
    guruList.forEach(g => {
      if (!g.nama?.trim()) return;
      map.set(g.nama.trim().toLowerCase(), {
        nama: g.nama.trim(),
        nip: g.nip || '',
        email: (g.email || '').trim().toLowerCase(),
        roleLabel: 'Guru'
      });
    });
    stafList.forEach(s => {
      if (!s.nama?.trim()) return;
      const k = s.nama.trim().toLowerCase();
      if (!map.has(k)) {
        map.set(k, {
          nama: s.nama.trim(),
          nip: s.nip || s.nik || '',
          email: (s.email || '').trim().toLowerCase(),
          roleLabel: 'Staf'
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [guruList, stafList]);

  const currentTeacherName = useMemo(() => {
    if (!userEmail) return '';
    const lower = userEmail.trim().toLowerCase();
    return staffDirectory.find(s => s.email && s.email === lower)?.nama || '';
  }, [staffDirectory, userEmail]);

  // Unique exam sessions from jadwalUjianList
  const uniqueExamSessions = useMemo(() => {
    const sorted = [...jadwalUjianList].sort((a, b) => {
      const d = (a.tanggal || '').localeCompare(b.tanggal || '');
      if (d !== 0) return d;
      return (a.jamMulai || '').localeCompare(b.jamMulai || '');
    });

    const dayOrder = new Map<string, string[]>();
    sorted.forEach(j => {
      const dt = (j.tanggal || '').slice(0, 10);
      const tKey = `${j.jamMulai || '07:30'}-${j.jamSelesai || '09:00'}`;
      if (!dt) return;
      const arr = dayOrder.get(dt) || [];
      if (!arr.includes(tKey)) arr.push(tKey);
      dayOrder.set(dt, arr);
    });

    const byKey = new Map<
      string,
      { key: string; tanggal: string; sesi: string; jamMulai: string; jamSelesai: string; mataPelajaran: string }
    >();

    sorted.forEach(j => {
      const dt = (j.tanggal || '').slice(0, 10);
      if (!dt) return;
      const jm = j.jamMulai || '07:30';
      const js = j.jamSelesai || '09:00';
      const tKey = `${jm}-${js}`;
      const sesi = `Sesi ${Math.max(1, (dayOrder.get(dt) || []).indexOf(tKey) + 1)}`;
      const key = `${dt}|${jm}|${js}`;
      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          tanggal: dt,
          sesi,
          jamMulai: jm,
          jamSelesai: js,
          mataPelajaran: j.mataPelajaran || j.judulUjian || 'Ujian CBT'
        });
      } else {
        const ex = byKey.get(key)!;
        const m = (j.mataPelajaran || '').trim();
        if (m && !ex.mataPelajaran.includes(m)) {
          ex.mataPelajaran = `${ex.mataPelajaran} / ${m}`;
        }
      }
    });

    return Array.from(byKey.values());
  }, [jadwalUjianList]);

  const availableRooms = useMemo(() => {
    const set = new Set<string>();
    denahRooms.forEach(r => set.add(r.namaRuang));
    pengawasSchedules.forEach(p => {
      if (p.ruang) set.add(p.ruang);
    });
    items.forEach(i => {
      if (i.ruang) set.add(i.ruang);
    });
    if (set.size === 0) {
      ['Ruang 1', 'Ruang 2', 'Ruang 3', 'Ruang 4', 'Ruang 5', 'Ruang 6'].forEach(r => set.add(r));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [denahRooms, pengawasSchedules, items]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    items.forEach(i => {
      if (i.tanggal) set.add(i.tanggal);
    });
    uniqueExamSessions.forEach(s => {
      if (s.tanggal) set.add(s.tanggal);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items, uniqueExamSessions]);

  // Helper: Look up invigilator & room capacity for a (tanggal, jamMulai, ruang)
  const resolveRoomContext = (tanggal: string, jamMulai: string, ruang: string) => {
    const roomObj = denahRooms.find(r => r.namaRuang.toLowerCase() === ruang.toLowerCase());
    const filledSeats = roomObj
      ? roomObj.kursiList.filter(k => k.namaSiswa && k.namaSiswa.trim() !== '')
      : [];
    const terdaftar = filledSeats.length > 0 ? filledSeats.length : roomObj?.jumlahKursi || 0;

    const matchedPengawas = pengawasSchedules.find(
      p =>
        p.tanggal === tanggal &&
        p.ruang.toLowerCase() === ruang.toLowerCase() &&
        (!jamMulai || p.jamMulai === jamMulai)
    );
    const pengawasNama =
      (matchedPengawas?.status === 'Digantikan' && matchedPengawas.penggantiNama
        ? matchedPengawas.penggantiNama
        : matchedPengawas?.pengawas1Nama) ||
      roomObj?.pengawas ||
      '';
    const staffEntry = staffDirectory.find(s => s.nama.toLowerCase() === pengawasNama.toLowerCase());
    const pengawasNip = matchedPengawas?.pengawas1Nip || staffEntry?.nip || '';

    return {
      terdaftar,
      filledSeats,
      pengawasNama,
      pengawasNip
    };
  };

  // Room students for the currently selected room inside the Form Modal
  const formRoomSeats = useMemo(() => {
    const roomObj = denahRooms.find(r => r.namaRuang.toLowerCase() === formState.ruang.toLowerCase());
    if (!roomObj) return [];
    const q = seatSearch.trim().toLowerCase();
    return roomObj.kursiList
      .filter(s => s.namaSiswa && s.namaSiswa.trim() !== '')
      .filter(
        s =>
          !q ||
          s.namaSiswa.toLowerCase().includes(q) ||
          (s.kelasSiswa || '').toLowerCase().includes(q) ||
          (s.nomorPeserta || '').toLowerCase().includes(q)
      );
  }, [denahRooms, formState.ruang, seatSearch]);

  // Filtered & sorted list
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...items]
      .filter(item => {
        if (filterTanggal !== 'Semua' && item.tanggal !== filterTanggal) return false;
        if (filterRuang !== 'Semua' && item.ruang !== filterRuang) return false;
        if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
        if (onlyMyRooms && currentTeacherName) {
          if ((item.pengawasNama || '').toLowerCase() !== currentTeacherName.toLowerCase()) return false;
        }
        if (q) {
          const hay = [
            item.nomorBeritaAcara,
            item.ruang,
            item.mataPelajaran,
            item.pengawasNama,
            item.tanggal,
            item.sesi,
            item.catatanKejadian,
            ...(item.pesertaTidakHadir || []).map(a => a.namaSiswa)
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => {
        const dCmp = (a.tanggal || '').localeCompare(b.tanggal || '');
        if (dCmp !== 0) return dCmp;
        const tCmp = (a.jamMulai || '').localeCompare(b.jamMulai || '');
        if (tCmp !== 0) return tCmp;
        return (a.ruang || '').localeCompare(b.ruang || '', undefined, { numeric: true });
      });
  }, [items, searchQuery, filterTanggal, filterRuang, filterStatus, onlyMyRooms, currentTeacherName]);

  const stats = useMemo(() => {
    let finalCount = 0;
    let draftCount = 0;
    let totalAbsent = 0;
    items.forEach(i => {
      if (i.status === 'Final') finalCount += 1;
      else draftCount += 1;
      totalAbsent += Number(i.jumlahTidakHadir || 0);
    });
    return {
      total: items.length,
      finalCount,
      draftCount,
      totalAbsent
    };
  }, [items]);

  const examBannerShort = cbtSettings
    ? `${cbtSettings.namaUjian} · Semester ${cbtSettings.semester} · TP ${cbtSettings.tahunAjaran}`
    : `Sumatif Akhir Semester (SAS) · TP ${schoolSettings?.tahunAjaran || '2026/2027'}`;

  const examFullTitle = cbtSettings
    ? `${cbtSettings.namaUjian.toUpperCase()} SEMESTER ${cbtSettings.semester.toUpperCase()} TAHUN PELAJARAN ${cbtSettings.tahunAjaran}`
    : `SUMATIF AKHIR SEMESTER (SAS) TAHUN PELAJARAN ${schoolSettings?.tahunAjaran || '2026/2027'}`;

  const schoolDisplayName = schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR';

  // Form Modal openers
  const openCreateModal = () => {
    if (!canEdit) return;
    const firstSession = uniqueExamSessions[0];
    const tanggal = firstSession?.tanggal || new Date().toISOString().slice(0, 10);
    const jamMulai = firstSession?.jamMulai || '07:30';
    const jamSelesai = firstSession?.jamSelesai || '09:00';
    const sesi = firstSession?.sesi || 'Sesi 1';
    const mataPelajaran = firstSession?.mataPelajaran || '';
    const ruang = availableRooms[0] || 'Ruang 1';
    const ctx = resolveRoomContext(tanggal, jamMulai, ruang);

    setEditingId(null);
    setSeatSearch('');
    setFormState({
      nomorBeritaAcara: generateNomorBa(tanggal, ruang, items.length + 1),
      tanggal,
      sesi,
      jamMulai,
      jamSelesai,
      mataPelajaran,
      ruang,
      pengawasNama: ctx.pengawasNama || currentTeacherName || staffDirectory[0]?.nama || '',
      pengawasNip: ctx.pengawasNip || '',
      jumlahTerdaftar: ctx.terdaftar,
      jumlahHadir: ctx.terdaftar,
      pesertaTidakHadir: [],
      kondisiPelaksanaan: 'Tertib & Lancar',
      catatanKejadian: DEFAULT_NOTE_TERTIB,
      status: 'Draft'
    });
    setShowFormModal(true);
  };

  const openEditModal = (item: BeritaAcaraUjianItem) => {
    if (!canEdit) return;
    setEditingId(item.id);
    setSeatSearch('');
    setFormState({
      nomorBeritaAcara: item.nomorBeritaAcara || '',
      tanggal: item.tanggal || '',
      sesi: item.sesi || 'Sesi 1',
      jamMulai: item.jamMulai || '07:30',
      jamSelesai: item.jamSelesai || '09:00',
      mataPelajaran: item.mataPelajaran || '',
      ruang: item.ruang || availableRooms[0] || 'Ruang 1',
      pengawasNama: item.pengawasNama || '',
      pengawasNip: item.pengawasNip || '',
      jumlahTerdaftar: Number(item.jumlahTerdaftar || 0),
      jumlahHadir: Number(item.jumlahHadir || 0),
      pesertaTidakHadir: Array.isArray(item.pesertaTidakHadir) ? [...item.pesertaTidakHadir] : [],
      kondisiPelaksanaan: item.kondisiPelaksanaan || 'Tertib & Lancar',
      catatanKejadian: item.catatanKejadian || DEFAULT_NOTE_TERTIB,
      status: item.status || 'Draft'
    });
    setShowFormModal(true);
  };

  const handleRoomOrSessionChange = (nextTanggal: string, nextJamMulai: string, nextRuang: string) => {
    const ctx = resolveRoomContext(nextTanggal, nextJamMulai, nextRuang);
    setFormState(prev => {
      const nextTerdaftar = ctx.terdaftar > 0 ? ctx.terdaftar : prev.jumlahTerdaftar;
      const absentLen = prev.pesertaTidakHadir.length;
      return {
        ...prev,
        tanggal: nextTanggal,
        jamMulai: nextJamMulai,
        ruang: nextRuang,
        pengawasNama: ctx.pengawasNama || prev.pengawasNama,
        pengawasNip: ctx.pengawasNip || prev.pengawasNip,
        jumlahTerdaftar: nextTerdaftar,
        jumlahHadir: Math.max(0, nextTerdaftar - absentLen)
      };
    });
  };

  const toggleAbsentSeat = (seat: DenahSeatRef) => {
    setFormState(prev => {
      const exists = prev.pesertaTidakHadir.some(
        a => a.namaSiswa.toLowerCase() === seat.namaSiswa.toLowerCase()
      );
      const nextAbsent = exists
        ? prev.pesertaTidakHadir.filter(a => a.namaSiswa.toLowerCase() !== seat.namaSiswa.toLowerCase())
        : [
            ...prev.pesertaTidakHadir,
            {
              nomorKursi: seat.nomorKursi,
              nomorPeserta: seat.nomorPeserta,
              namaSiswa: seat.namaSiswa,
              kelas: seat.kelasSiswa,
              alasan: 'Sakit' as const
            }
          ];
      return {
        ...prev,
        pesertaTidakHadir: nextAbsent,
        jumlahHadir: Math.max(0, prev.jumlahTerdaftar - nextAbsent.length)
      };
    });
  };

  const updateAbsentReason = (namaSiswa: string, alasan: 'Sakit' | 'Izin' | 'Alpha') => {
    setFormState(prev => ({
      ...prev,
      pesertaTidakHadir: prev.pesertaTidakHadir.map(a =>
        a.namaSiswa === namaSiswa ? { ...a, alasan } : a
      )
    }));
  };

  const handleAddManualAbsent = () => {
    const nama = manualAbsentName.trim();
    if (!nama) return;
    setFormState(prev => {
      if (prev.pesertaTidakHadir.some(a => a.namaSiswa.toLowerCase() === nama.toLowerCase())) {
        return prev;
      }
      const nextAbsent: BeritaAcaraAbsenSiswa[] = [
        ...prev.pesertaTidakHadir,
        {
          namaSiswa: nama,
          kelas: manualAbsentKelas.trim() || undefined,
          alasan: manualAbsentAlasan
        }
      ];
      return {
        ...prev,
        pesertaTidakHadir: nextAbsent,
        jumlahHadir: Math.max(0, prev.jumlahTerdaftar - nextAbsent.length)
      };
    });
    setManualAbsentName('');
    setManualAbsentKelas('');
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!formState.tanggal || !formState.ruang || !formState.pengawasNama.trim()) {
      showToast('Tanggal, Ruang Ujian, dan Pengawas Ruang wajib diisi.', 'error');
      return;
    }

    const terdaftar = Math.max(0, Number(formState.jumlahTerdaftar || 0));
    const hadir = Math.min(terdaftar, Math.max(0, Number(formState.jumlahHadir || 0)));
    const tidakHadir = Math.max(formState.pesertaTidakHadir.length, Math.max(0, terdaftar - hadir));

    const matchedStaff = staffDirectory.find(
      s => s.nama.toLowerCase() === formState.pengawasNama.trim().toLowerCase()
    );

    const record: BeritaAcaraUjianItem = {
      id: editingId || `ba-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      nomorBeritaAcara:
        formState.nomorBeritaAcara.trim() ||
        generateNomorBa(formState.tanggal, formState.ruang, items.length + 1),
      tanggal: formState.tanggal,
      sesi: formState.sesi.trim() || 'Sesi 1',
      jamMulai: formState.jamMulai || '07:30',
      jamSelesai: formState.jamSelesai || '09:00',
      mataPelajaran: formState.mataPelajaran.trim() || 'Ujian CBT',
      ruang: formState.ruang.trim(),
      pengawasNama: formState.pengawasNama.trim(),
      pengawasNip: formState.pengawasNip.trim() || matchedStaff?.nip || undefined,
      jumlahTerdaftar: terdaftar,
      jumlahHadir: Math.max(0, terdaftar - tidakHadir),
      jumlahTidakHadir: tidakHadir,
      pesertaTidakHadir: formState.pesertaTidakHadir,
      kondisiPelaksanaan: formState.kondisiPelaksanaan,
      catatanKejadian: formState.catatanKejadian.trim() || DEFAULT_NOTE_TERTIB,
      status: formState.status,
      updatedAt: new Date().toISOString()
    };

    const next = editingId
      ? items.map(i => (i.id === editingId ? record : i))
      : [...items, record];

    persistItems(next);
    setShowFormModal(false);
    showToast(editingId ? 'Berita Acara Ujian berhasil diperbarui.' : 'Berita Acara Ujian berhasil disimpan.');
  };

  const handleToggleStatus = (item: BeritaAcaraUjianItem) => {
    if (!canEdit) return;
    const nextStatus: 'Draft' | 'Final' = item.status === 'Final' ? 'Draft' : 'Final';
    const next = items.map(i =>
      i.id === item.id ? { ...i, status: nextStatus, updatedAt: new Date().toISOString() } : i
    );
    persistItems(next);
    showToast(`Status Berita Acara ${item.ruang} diubah menjadi ${nextStatus}.`);
  };

  const handleDeleteItem = (id: string) => {
    if (!canEdit) return;
    persistItems(items.filter(i => i.id !== id));
    showToast('Berita Acara Ujian berhasil dihapus.');
  };

  // Batch generate Berita Acara for all rooms & selected exam days
  const handleRunBatchGenerate = () => {
    if (!canEdit) return;
    const roomsToUse = denahRooms.length > 0 ? denahRooms.map(r => r.namaRuang) : availableRooms;
    const targetSessions =
      uniqueExamSessions.length > 0
        ? uniqueExamSessions.filter(
            s => batchSelectedDates.length === 0 || batchSelectedDates.includes(s.tanggal)
          )
        : [
            {
              key: 'default',
              tanggal: new Date().toISOString().slice(0, 10),
              sesi: 'Sesi 1',
              jamMulai: '07:30',
              jamSelesai: '09:00',
              mataPelajaran: 'Ujian CBT'
            }
          ];

    if (targetSessions.length === 0) {
      showToast('Pilih minimal 1 tanggal ujian untuk membuat Berita Acara massal.', 'error');
      return;
    }

    const baseList = batchReplaceExisting
      ? items.filter(i => !targetSessions.some(s => s.tanggal === i.tanggal))
      : [...items];

    const existingKeys = new Set(
      baseList.map(i => `${i.tanggal}|${i.jamMulai}|${i.ruang.toLowerCase()}`)
    );

    const created: BeritaAcaraUjianItem[] = [];
    let seq = baseList.length + 1;

    targetSessions.forEach(s => {
      roomsToUse.forEach(ruang => {
        const key = `${s.tanggal}|${s.jamMulai}|${ruang.toLowerCase()}`;
        if (!batchReplaceExisting && existingKeys.has(key)) return;
        const ctx = resolveRoomContext(s.tanggal, s.jamMulai, ruang);
        created.push({
          id: `ba-batch-${Date.now()}-${seq}-${Math.random().toString(36).slice(2, 5)}`,
          nomorBeritaAcara: generateNomorBa(s.tanggal, ruang, seq),
          tanggal: s.tanggal,
          sesi: s.sesi,
          jamMulai: s.jamMulai,
          jamSelesai: s.jamSelesai,
          mataPelajaran: s.mataPelajaran,
          ruang,
          pengawasNama: ctx.pengawasNama || 'Pengawas Ruang',
          pengawasNip: ctx.pengawasNip || undefined,
          jumlahTerdaftar: ctx.terdaftar,
          jumlahHadir: ctx.terdaftar,
          jumlahTidakHadir: 0,
          pesertaTidakHadir: [],
          kondisiPelaksanaan: 'Tertib & Lancar',
          catatanKejadian: DEFAULT_NOTE_TERTIB,
          status: 'Draft',
          updatedAt: new Date().toISOString()
        });
        seq += 1;
      });
    });

    if (created.length === 0) {
      showToast('Seluruh Berita Acara pada tanggal & ruang terpilih sudah tersedia.');
      setShowBatchModal(false);
      return;
    }

    persistItems([...baseList, ...created]);
    setShowBatchModal(false);
    showToast(
      `Berhasil membuat ${created.length} Berita Acara Ujian (${roomsToUse.length} ruang × ${targetSessions.length} sesi).`
    );
  };

  // Download single or batch PDF
  const handleDownloadPdf = async (targetItems: BeritaAcaraUjianItem[], forceBlank?: boolean, singleId?: string) => {
    if (targetItems.length === 0) {
      showToast('Belum ada Berita Acara Ujian untuk diunduh.', 'error');
      return;
    }
    const useBlank = forceBlank !== undefined ? forceBlank : blankPdfMode;

    if (singleId) setDownloadingItemId(singleId);
    else setIsDownloadingPdf(true);

    try {
      const kota = cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok';
      const kepsekNama = cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah';
      const kepsekNip = cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '';
      const examShortName = cbtSettings?.namaUjian || 'Sumatif Akhir Semester (SAS)';

      const fileName =
        targetItems.length === 1
          ? `berita-acara-${targetItems[0].ruang.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${targetItems[0].tanggal || 'ujian'}${useBlank ? '-blanko' : ''}.pdf`
          : `berita-acara-ujian-${filterTanggal !== 'Semua' ? filterTanggal : 'semua'}${useBlank ? '-blanko' : ''}.pdf`;

      await downloadBeritaAcaraPdf({
        items: targetItems,
        schoolName: schoolDisplayName,
        schoolAddress: schoolSettings?.alamat,
        schoolNpsn: schoolSettings?.npsn,
        examTitle: examFullTitle,
        examShortName,
        kota,
        kepsekNama,
        kepsekNip,
        logoUrl: schoolSettings?.logoUrl,
        ttdKepalaSekolahUrl: cbtSettings?.ttdKepalaSekolahUrl,
        blankFormMode: useBlank,
        fileName
      });

      showToast(
        `Berhasil mengunduh ${fileName} (${targetItems.length} lembar${useBlank ? ' · Blanko Kosong' : ''}).`
      );
    } catch (err) {
      console.error('Gagal mengunduh PDF Berita Acara Ujian:', err);
      showToast('Gagal membuat file PDF Berita Acara Ujian.', 'error');
    } finally {
      setIsDownloadingPdf(false);
      setDownloadingItemId(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="bg-[#121212] rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-5">
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2.5">
              <FileSignature className="w-5 h-5 text-amber-400" />
              <span>Berita Acara Pelaksanaan Ujian</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{examBannerShort}</span>
              <span>·</span>
              <span className="text-sky-400 font-semibold tabular-nums">{stats.total} dokumen</span>
              <span>·</span>
              <span className="text-emerald-400 font-semibold tabular-nums">{stats.finalCount} final</span>
              <span>·</span>
              <span className="text-slate-300 font-semibold tabular-nums">{stats.draftCount} draft</span>
              {stats.totalAbsent > 0 && (
                <>
                  <span>·</span>
                  <span className="text-rose-400 font-semibold tabular-nums">
                    {stats.totalAbsent} peserta tidak hadir
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari ruang, mapel, pengawas, nomor BA..."
              className="w-full bg-slate-900/90 border border-slate-700/80 rounded-xl pl-10 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: PDF Batch Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1.5">
              <button
                type="button"
                onClick={() => setBlankPdfMode(false)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  !blankPdfMode ? 'bg-sky-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Cetak Berita Acara sesuai data kehadiran & catatan digital"
              >
                Isi Lengkap
              </button>
              <button
                type="button"
                onClick={() => setBlankPdfMode(true)}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  blankPdfMode ? 'bg-amber-500 text-slate-950' : 'text-slate-400 hover:text-white'
                }`}
                title="Cetak blanko Berita Acara kosong untuk diisi tulis tangan oleh pengawas di ruang ujian"
              >
                Blanko Kosong
              </button>
              <button
                type="button"
                onClick={() => handleDownloadPdf(filteredItems)}
                disabled={isDownloadingPdf || filteredItems.length === 0}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>
                  {isDownloadingPdf
                    ? 'Menyiapkan PDF...'
                    : `Unduh PDF (${filteredItems.length} Lembar)`}
                </span>
              </button>
            </div>
          </div>

          {/* Right: Create & Batch Actions */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchSelectedDates(
                      Array.from(new Set(uniqueExamSessions.map(s => s.tanggal)))
                    );
                    setShowBatchModal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Buat Massal (Semua Ruang)</span>
                </button>
              )}

              {isAdmin && items.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(true)}
                  className="px-3 py-2 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/60 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua</span>
                </button>
              )}

              <button
                type="button"
                onClick={openCreateModal}
                className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Berita Acara</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="flex flex-wrap items-end justify-between gap-3 pt-1">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Filter Tanggal
              </label>
              <select
                value={filterTanggal}
                onChange={e => setFilterTanggal(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Semua">Semua Tanggal ({availableDates.length})</option>
                {availableDates.map(dt => (
                  <option key={dt} value={dt}>
                    {formatTanggalCompact(dt)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Filter Ruang
              </label>
              <select
                value={filterRuang}
                onChange={e => setFilterRuang(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
              >
                <option value="Semua">Semua Ruang ({availableRooms.length})</option>
                {availableRooms.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Status Dokumen
              </label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 gap-0.5">
                {(['Semua', 'Draft', 'Final'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      filterStatus === st ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {currentTeacherName && (
              <button
                type="button"
                onClick={() => setOnlyMyRooms(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  onlyMyRooms
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-purple-500/60'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Ruang Tugas Saya</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 tabular-nums">
            Menampilkan <span className="text-white font-bold">{filteredItems.length}</span> dari{' '}
            <span className="text-white font-bold">{items.length}</span> berita acara
          </div>
        </div>

        {/* Empty State or Table */}
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mx-auto">
              <FileSignature className="w-7 h-7 text-amber-400" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="text-base font-bold text-white">Belum Ada Berita Acara Ujian</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Buat Berita Acara secara massal dari <strong className="text-emerald-400">Jadwal Ujian, Denah Ruang & Daftar Pengawas</strong> (siap cetak blanko ke ruang ujian), atau buat satu per satu setelah sesi selesai.
              </p>
            </div>
            {canEdit && (
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setBatchSelectedDates(
                        Array.from(new Set(uniqueExamSessions.map(s => s.tanggal)))
                      );
                      setShowBatchModal(true);
                    }}
                    className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Buat Massal (Semua Ruang)</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={openCreateModal}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Buat Berita Acara</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5 text-center w-10">No</th>
                  <th className="py-3 px-3.5">Hari / Tanggal & No. BA</th>
                  <th className="py-3 px-3.5">Sesi, Waktu & Mapel</th>
                  <th className="py-3 px-3.5">Ruang & Pengawas</th>
                  <th className="py-3 px-3.5 text-center">Kehadiran Peserta</th>
                  <th className="py-3 px-3.5">Kondisi & Catatan</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center w-36">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      Tidak ada berita acara yang sesuai dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const isDownloadingThis = downloadingItemId === item.id;
                    return (
                      <tr key={item.id} className="hover:bg-slate-900/60 transition-colors">
                        <td className="py-3 px-3.5 text-center text-slate-400 font-mono tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>{formatTanggalCompact(item.tanggal)}</span>
                          </div>
                          {item.nomorBeritaAcara && (
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5 pl-5">
                              {item.nomorBeritaAcara}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-100 leading-snug">
                            {item.mataPelajaran || 'Ujian CBT'}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1.5 tabular-nums">
                            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 font-bold text-[10px]">
                              {item.sesi}
                            </span>
                            <Clock className="w-3 h-3 text-slate-500" />
                            <span>
                              {item.jamMulai} – {item.jamSelesai} WIB
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 font-extrabold text-[11px] shrink-0">
                              {item.ruang}
                            </span>
                            <span className="font-semibold text-white truncate max-w-[170px]">
                              {item.pengawasNama}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap tabular-nums">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700/80">
                            <Users className="w-3 h-3 text-sky-400" />
                            <span className="font-bold text-emerald-400">{item.jumlahHadir}</span>
                            <span className="text-slate-500">/ {item.jumlahTerdaftar}</span>
                            {item.jumlahTidakHadir > 0 && (
                              <span className="ml-1 px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                                {item.jumlahTidakHadir} absen
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 max-w-[230px]">
                          <div
                            className={`text-[11px] font-bold ${
                              item.kondisiPelaksanaan === 'Tertib & Lancar'
                                ? 'text-emerald-400'
                                : item.kondisiPelaksanaan === 'Ada Kendala Teknis'
                                ? 'text-amber-300'
                                : 'text-rose-400'
                            }`}
                          >
                            {item.kondisiPelaksanaan}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5" title={item.catatanKejadian}>
                            {item.catatanKejadian || DEFAULT_NOTE_TERTIB}
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleToggleStatus(item)}
                            title={canEdit ? 'Klik untuk ubah status Draft / Final' : undefined}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              canEdit ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
                            } ${
                              item.status === 'Final'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.status}
                          </button>
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setPreviewItem(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Pratinjau Dokumen Resmi"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={isDownloadingThis}
                              onClick={() => handleDownloadPdf([item], undefined, item.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Unduh PDF Berita Acara"
                            >
                              {isDownloadingThis ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                              ) : (
                                <FileDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                            {canEdit && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => openEditModal(item)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                  title="Edit Berita Acara"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteItem(item.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                                  title="Hapus Berita Acara"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
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
        )}
      </div>

      {/* =========================================================
          MODAL 1: CREATE / EDIT BERITA ACARA UJIAN
         ========================================================= */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-slate-700/80 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileSignature className="w-4 h-4 text-amber-400" />
                <span>{editingId ? 'Edit Berita Acara Ujian' : 'Buat Berita Acara Ujian'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 max-h-[84vh] overflow-y-auto">
              {/* Quick-fill from Jadwal Ujian */}
              {uniqueExamSessions.length > 0 && (
                <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-1.5">
                  <label className="block text-[11px] font-bold text-sky-300">
                    Pilih Cepat dari Jadwal Ujian (Otomatis isi Tanggal, Jam, Mapel & Pengawas)
                  </label>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const found = uniqueExamSessions.find(s => s.key === e.target.value);
                      if (!found) return;
                      const ctx = resolveRoomContext(found.tanggal, found.jamMulai, formState.ruang);
                      setFormState(prev => ({
                        ...prev,
                        tanggal: found.tanggal,
                        sesi: found.sesi,
                        jamMulai: found.jamMulai,
                        jamSelesai: found.jamSelesai,
                        mataPelajaran: found.mataPelajaran,
                        pengawasNama: ctx.pengawasNama || prev.pengawasNama,
                        pengawasNip: ctx.pengawasNip || prev.pengawasNip
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Pilih sesi dari Jadwal Ujian --</option>
                    {uniqueExamSessions.map(s => (
                      <option key={s.key} value={s.key}>
                        {formatTanggalCompact(s.tanggal)} · {s.sesi} ({s.jamMulai}-{s.jamSelesai}) · {s.mataPelajaran}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Nomor Berita Acara</label>
                  <input
                    type="text"
                    value={formState.nomorBeritaAcara}
                    onChange={e => setFormState(prev => ({ ...prev, nomorBeritaAcara: e.target.value }))}
                    placeholder="BA/001/R01/2026"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Ujian *</label>
                  <input
                    type="date"
                    required
                    value={formState.tanggal}
                    onChange={e => handleRoomOrSessionChange(e.target.value, formState.jamMulai, formState.ruang)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ruang Ujian *</label>
                  <select
                    value={formState.ruang}
                    onChange={e => handleRoomOrSessionChange(formState.tanggal, formState.jamMulai, e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    {availableRooms.map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Sesi</label>
                  <input
                    type="text"
                    value={formState.sesi}
                    onChange={e => setFormState(prev => ({ ...prev, sesi: e.target.value }))}
                    placeholder="Sesi 1"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Mulai</label>
                  <input
                    type="time"
                    value={formState.jamMulai}
                    onChange={e => handleRoomOrSessionChange(formState.tanggal, e.target.value, formState.ruang)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Jam Selesai</label>
                  <input
                    type="time"
                    value={formState.jamSelesai}
                    onChange={e => setFormState(prev => ({ ...prev, jamSelesai: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    value={formState.mataPelajaran}
                    onChange={e => setFormState(prev => ({ ...prev, mataPelajaran: e.target.value }))}
                    placeholder="Pendidikan Agama Islam & Budi Pekerti"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Pengawas Ruang *</label>
                  <select
                    required
                    value={formState.pengawasNama}
                    onChange={e => {
                      const val = e.target.value;
                      const found = staffDirectory.find(s => s.nama === val);
                      setFormState(prev => ({
                        ...prev,
                        pengawasNama: val,
                        pengawasNip: found?.nip || ''
                      }));
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">-- Pilih Pengawas --</option>
                    {staffDirectory.map(s => (
                      <option key={s.nama} value={s.nama}>
                        {s.nama} ({s.roleLabel})
                      </option>
                    ))}
                    {formState.pengawasNama &&
                      !staffDirectory.some(s => s.nama === formState.pengawasNama) && (
                        <option value={formState.pengawasNama}>{formState.pengawasNama}</option>
                      )}
                  </select>
                </div>
              </div>

              {/* Attendance Numbers */}
              <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">
                    Peserta Seharusnya
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={200}
                    value={formState.jumlahTerdaftar}
                    onChange={e => {
                      const val = Math.max(0, Number(e.target.value) || 0);
                      setFormState(prev => ({
                        ...prev,
                        jumlahTerdaftar: val,
                        jumlahHadir: Math.max(0, val - prev.pesertaTidakHadir.length)
                      }));
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm font-black text-white tabular-nums focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-emerald-400 mb-1">
                    Peserta Hadir
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={formState.jumlahTerdaftar}
                    value={formState.jumlahHadir}
                    onChange={e => {
                      const val = Math.min(formState.jumlahTerdaftar, Math.max(0, Number(e.target.value) || 0));
                      setFormState(prev => ({ ...prev, jumlahHadir: val }));
                    }}
                    className="w-full bg-slate-950 border border-emerald-700/60 rounded-lg px-3 py-1.5 text-sm font-black text-emerald-400 tabular-nums focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-rose-400 mb-1">
                    Tidak Hadir
                  </label>
                  <div className="w-full bg-slate-950 border border-rose-800/50 rounded-lg px-3 py-1.5 text-sm font-black text-rose-400 tabular-nums">
                    {Math.max(formState.pesertaTidakHadir.length, Math.max(0, formState.jumlahTerdaftar - formState.jumlahHadir))} orang
                  </div>
                </div>
              </div>

              {/* Absent Student Selector */}
              <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <UserMinus className="w-3.5 h-3.5 text-rose-400" />
                    <span>Daftar Peserta Tidak Hadir ({formState.pesertaTidakHadir.length})</span>
                  </div>
                  {formRoomSeats.length > 0 && (
                    <input
                      type="text"
                      value={seatSearch}
                      onChange={e => setSeatSearch(e.target.value)}
                      placeholder={`Cari siswa di ${formState.ruang}...`}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-white w-48 focus:outline-none focus:border-sky-500"
                    />
                  )}
                </div>

                {/* Selected absent students list */}
                {formState.pesertaTidakHadir.length > 0 && (
                  <div className="space-y-1.5">
                    {formState.pesertaTidakHadir.map(ab => (
                      <div
                        key={ab.namaSiswa}
                        className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-bold text-white">{ab.namaSiswa}</span>
                          {ab.kelas && <span className="text-slate-400 ml-1.5">({ab.kelas})</span>}
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {(['Sakit', 'Izin', 'Alpha'] as const).map(al => (
                            <button
                              key={al}
                              type="button"
                              onClick={() => updateAbsentReason(ab.namaSiswa, al)}
                              className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer ${
                                ab.alasan === al
                                  ? al === 'Sakit'
                                    ? 'bg-amber-500 text-slate-950'
                                    : al === 'Izin'
                                    ? 'bg-sky-500 text-slate-950'
                                    : 'bg-rose-500 text-white'
                                  : 'bg-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {al}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={() =>
                              setFormState(prev => {
                                const nextAbs = prev.pesertaTidakHadir.filter(
                                  x => x.namaSiswa !== ab.namaSiswa
                                );
                                return {
                                  ...prev,
                                  pesertaTidakHadir: nextAbs,
                                  jumlahHadir: Math.max(0, prev.jumlahTerdaftar - nextAbs.length)
                                };
                              })
                            }
                            className="p-1 text-slate-400 hover:text-red-400 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Quick pick chips from Denah Ruang */}
                {formRoomSeats.length > 0 && (
                  <div className="max-h-28 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
                    {formRoomSeats.map(seat => {
                      const isAbsent = formState.pesertaTidakHadir.some(
                        a => a.namaSiswa.toLowerCase() === seat.namaSiswa.toLowerCase()
                      );
                      return (
                        <button
                          key={seat.nomorKursi}
                          type="button"
                          onClick={() => toggleAbsentSeat(seat)}
                          className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer flex items-center gap-1 ${
                            isAbsent
                              ? 'bg-rose-500/20 border-rose-500/50 text-rose-200'
                              : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-sky-500/50'
                          }`}
                        >
                          <span className="font-mono text-[10px] text-slate-400">
                            #{String(seat.nomorKursi).padStart(2, '0')}
                          </span>
                          <span>{seat.namaSiswa.split(' ').slice(0, 2).join(' ')}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Manual add absent student */}
                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/80">
                  <input
                    type="text"
                    value={manualAbsentName}
                    onChange={e => setManualAbsentName(e.target.value)}
                    placeholder="Tambah manual nama siswa absen..."
                    className="flex-1 min-w-[160px] bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-sky-500"
                  />
                  <input
                    type="text"
                    value={manualAbsentKelas}
                    onChange={e => setManualAbsentKelas(e.target.value)}
                    placeholder="Kelas"
                    className="w-28 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-white focus:outline-none focus:border-sky-500"
                  />
                  <select
                    value={manualAbsentAlasan}
                    onChange={e => setManualAbsentAlasan(e.target.value as 'Sakit' | 'Izin' | 'Alpha')}
                    className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-white focus:outline-none"
                  >
                    <option value="Sakit">Sakit</option>
                    <option value="Izin">Izin</option>
                    <option value="Alpha">Alpha</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddManualAbsent}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Tambah</span>
                  </button>
                </div>
              </div>

              {/* Kondisi & Catatan Kejadian */}
              <div className="space-y-2.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Kondisi Pelaksanaan
                    </label>
                    <select
                      value={formState.kondisiPelaksanaan}
                      onChange={e => {
                        const val = e.target.value as BeritaAcaraUjianItem['kondisiPelaksanaan'];
                        setFormState(prev => ({
                          ...prev,
                          kondisiPelaksanaan: val,
                          catatanKejadian:
                            val === 'Tertib & Lancar'
                              ? DEFAULT_NOTE_TERTIB
                              : prev.catatanKejadian === DEFAULT_NOTE_TERTIB
                              ? ''
                              : prev.catatanKejadian
                        }));
                      }}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Tertib & Lancar">Tertib & Lancar</option>
                      <option value="Ada Kendala Teknis">Ada Kendala Teknis</option>
                      <option value="Ada Pelanggaran / Khusus">Ada Pelanggaran / Khusus</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Status Berita Acara
                    </label>
                    <select
                      value={formState.status}
                      onChange={e =>
                        setFormState(prev => ({
                          ...prev,
                          status: e.target.value as 'Draft' | 'Final'
                        }))
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    >
                      <option value="Draft">Draft (Belum Selesai)</option>
                      <option value="Final">Final (Siap Cetak & Arsip)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Catatan Kejadian Selama Ujian
                  </label>
                  <textarea
                    rows={3}
                    value={formState.catatanKejadian}
                    onChange={e => setFormState(prev => ({ ...prev, catatanKejadian: e.target.value }))}
                    placeholder="Tuliskan kejadian penting, kendala perangkat, keterlambatan peserta, atau keterangan lainnya..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowFormModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Simpan Berita Acara'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 2: OFFICIAL DOCUMENT PREVIEW (A4 WHITE SHEET)
         ========================================================= */}
      {previewItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Pratinjau Berita Acara — {previewItem.ruang}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf([previewItem], true, previewItem.id)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF Blanko</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadPdf([previewItem], false, previewItem.id)}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Unduh PDF Resmi</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto bg-slate-900/80">
              <div className="bg-white text-slate-900 rounded-xl shadow-xl p-7 sm:p-9 max-w-[700px] mx-auto space-y-5 text-xs leading-relaxed">
                {/* Kop Surat */}
                <div className="flex items-center gap-4 border-b-4 border-double border-[#0a366b] pb-3.5">
                  {schoolSettings?.logoUrl && (
                    <img
                      src={schoolSettings.logoUrl}
                      alt={schoolDisplayName}
                      referrerPolicy="no-referrer"
                      className="w-14 h-14 object-contain shrink-0"
                    />
                  )}
                  <div className="flex-1 text-center">
                    <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                      PANITIA PENYELENGGARA UJIAN
                    </div>
                    <div className="text-base font-black text-[#0a366b] uppercase tracking-wide">
                      {schoolDisplayName}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {[schoolSettings?.alamat, schoolSettings?.npsn ? `NPSN: ${schoolSettings.npsn}` : '']
                        .filter(Boolean)
                        .join(' · ') || 'Sistem Informasi & Evaluasi Akademik Terpadu'}
                    </div>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center space-y-0.5">
                  <h4 className="text-sm font-black uppercase tracking-wide underline decoration-[#0a366b] underline-offset-4">
                    BERITA ACARA PELAKSANAAN UJIAN
                  </h4>
                  <div className="text-[11px] font-extrabold text-[#0a366b] uppercase">
                    {examFullTitle}
                  </div>
                  {previewItem.nomorBeritaAcara && (
                    <div className="text-[10px] text-slate-500 font-mono">
                      Nomor: {previewItem.nomorBeritaAcara}
                    </div>
                  )}
                </div>

                {/* Intro */}
                <p className="text-justify">
                  Pada hari ini, <strong>{formatTanggalFull(previewItem.tanggal)}</strong>, telah diselenggarakan{' '}
                  <strong>{cbtSettings?.namaUjian || 'Sumatif Akhir Semester (SAS)'}</strong> di{' '}
                  <strong>{schoolDisplayName}</strong> mulai pukul <strong>{previewItem.jamMulai} WIB</strong> sampai
                  dengan pukul <strong>{previewItem.jamSelesai} WIB</strong> dengan rincian sebagai berikut:
                </p>

                {/* Numbered Details */}
                <div className="border border-slate-300 rounded-lg overflow-hidden divide-y divide-slate-200">
                  {[
                    ['1.', 'Nama Sekolah / Madrasah', schoolDisplayName],
                    ['2.', 'Ruang Ujian', previewItem.ruang],
                    ['3.', 'Sesi / Mata Pelajaran', `${previewItem.sesi} — ${previewItem.mataPelajaran}`],
                    ['4.', 'Pengawas Ruang Ujian', previewItem.pengawasNama],
                    ['5.', 'Jumlah Peserta Seharusnya', `${previewItem.jumlahTerdaftar} orang`],
                    ['6.', 'Jumlah Peserta Yang Hadir', `${previewItem.jumlahHadir} orang`],
                    ['7.', 'Jumlah Peserta Tidak Hadir', `${previewItem.jumlahTidakHadir} orang`]
                  ].map(([no, label, val], i) => (
                    <div key={no} className={`grid grid-cols-[24px_175px_12px_1fr] px-3 py-1.5 ${i % 2 === 1 ? 'bg-slate-50' : ''}`}>
                      <span className="font-bold text-slate-500">{no}</span>
                      <span className="text-slate-700">{label}</span>
                      <span>:</span>
                      <span className={`font-bold ${i === 1 ? 'text-[#0a366b]' : 'text-slate-900'}`}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Absent Table */}
                <div className="space-y-1.5">
                  <div className="font-bold text-[#0a366b]">A. Daftar Peserta Yang Tidak Hadir</div>
                  <table className="w-full border-collapse border border-slate-300 text-[11px]">
                    <thead>
                      <tr className="bg-[#0a366b] text-white">
                        <th className="border border-[#0a366b] px-2 py-1 text-center w-9">No</th>
                        <th className="border border-[#0a366b] px-2 py-1 text-left">Nama Lengkap Siswa</th>
                        <th className="border border-[#0a366b] px-2 py-1 text-left w-32">Kelas</th>
                        <th className="border border-[#0a366b] px-2 py-1 text-center w-24">Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(previewItem.pesertaTidakHadir || []).length > 0 ? (
                        previewItem.pesertaTidakHadir.map((ab, i) => (
                          <tr key={ab.namaSiswa} className={i % 2 === 1 ? 'bg-slate-50' : ''}>
                            <td className="border border-slate-300 px-2 py-1 text-center">{i + 1}</td>
                            <td className="border border-slate-300 px-2 py-1 font-bold">{ab.namaSiswa}</td>
                            <td className="border border-slate-300 px-2 py-1">{ab.kelas || '-'}</td>
                            <td className="border border-slate-300 px-2 py-1 text-center font-bold">{ab.alasan}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="border border-slate-300 px-2 py-2 text-center italic text-emerald-700">
                            — Nihil (Seluruh peserta ujian hadir lengkap) —
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <div className="font-bold text-[#0a366b]">B. Catatan Kejadian Selama Pelaksanaan Ujian</div>
                  <div className="border border-slate-300 rounded-lg p-3 bg-slate-50/70 space-y-1">
                    <div className="font-bold text-[#0a366b] text-[11px]">
                      Kondisi Pelaksanaan: {previewItem.kondisiPelaksanaan}
                    </div>
                    <p className="text-slate-800">{previewItem.catatanKejadian || DEFAULT_NOTE_TERTIB}</p>
                  </div>
                </div>

                <p>
                  Demikian berita acara pelaksanaan ujian ini dibuat dengan sesungguhnya untuk dapat dipergunakan
                  sebagaimana mestinya.
                </p>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-4 text-center">
                  <div>
                    <div>Mengetahui,</div>
                    <div>Kepala Sekolah,</div>
                    <div className="h-14 flex items-center justify-center">
                      {cbtSettings?.ttdKepalaSekolahUrl && (
                        <img
                          src={cbtSettings.ttdKepalaSekolahUrl}
                          alt="TTD Kepala Sekolah"
                          className="max-h-12 object-contain"
                        />
                      )}
                    </div>
                    <div className="font-bold underline">
                      {cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah'}
                    </div>
                    {(cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah) && (
                      <div className="text-[10px] text-slate-600">
                        NIP. {cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah}
                      </div>
                    )}
                  </div>
                  <div>
                    <div>
                      {cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok'},{' '}
                      {formatTanggalFull(previewItem.tanggal).split(', ')[1] || previewItem.tanggal}
                    </div>
                    <div>Pengawas Ruang Ujian,</div>
                    <div className="h-14" />
                    <div className="font-bold underline">{previewItem.pengawasNama}</div>
                    <div className="text-[10px] text-slate-600">
                      {previewItem.pengawasNip ? `NIP. ${previewItem.pengawasNip}` : 'NIP. ..............................'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 3: BATCH GENERATE BERITA ACARA
         ========================================================= */}
      {showBatchModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Buat Berita Acara Massal (Semua Ruang)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 space-y-1.5 text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Ruang Ujian Aktif (dari Denah):</span>
                  <strong className="text-sky-400">{denahRooms.length || availableRooms.length} Ruang</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sesi Jadwal Ujian Terdaftar:</span>
                  <strong className="text-emerald-400">{uniqueExamSessions.length || 1} Sesi</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Jadwal Pengawas Tersinkron:</span>
                  <strong className="text-amber-300">{pengawasSchedules.length} Penugasan</strong>
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-sky-950/30 border border-sky-500/30 p-3 text-[11px] text-sky-200">
                <AlertCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  Nama pengawas dan jumlah peserta terdaftar tiap ruang akan otomatis diambil dari menu{' '}
                  <strong>Daftar Pengawas Ujian</strong> dan <strong>Denah Ruang Ujian</strong>.
                </span>
              </div>

              {uniqueExamSessions.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Pilih Hari Ujian ({batchSelectedDates.length} hari dipilih)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-900 border border-slate-800">
                    {Array.from(new Set(uniqueExamSessions.map(s => s.tanggal))).map(dt => {
                      const active = batchSelectedDates.includes(dt);
                      return (
                        <button
                          key={dt}
                          type="button"
                          onClick={() =>
                            setBatchSelectedDates(prev =>
                              prev.includes(dt) ? prev.filter(x => x !== dt) : [...prev, dt]
                            )
                          }
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                            active
                              ? 'bg-sky-600/25 border-sky-500 text-sky-200'
                              : 'bg-slate-950 border-slate-800 text-slate-500 hover:text-slate-300'
                          }`}
                        >
                          {formatTanggalCompact(dt)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={batchReplaceExisting}
                  onChange={e => setBatchReplaceExisting(e.target.checked)}
                  className="rounded border-slate-600 bg-slate-900 text-emerald-500"
                />
                <span>Timpa Berita Acara lama pada tanggal yang dipilih</span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowBatchModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRunBatchGenerate}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Buat Berita Acara</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          MODAL 4: CLEAR ALL CONFIRMATION
         ========================================================= */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-red-800/60 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Hapus Semua Berita Acara?</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Seluruh {items.length} dokumen Berita Acara Ujian akan dihapus dari sistem & Firebase.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  persistItems([]);
                  setShowClearConfirm(false);
                  showToast('Seluruh Berita Acara Ujian berhasil dihapus.');
                }}
                className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
