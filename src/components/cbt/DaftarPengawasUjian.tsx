import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarDays,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  Edit2,
  FileDown,
  Filter,
  Grid,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
  X
} from 'lucide-react';
import {
  CbtExamSettings,
  Guru,
  JadwalUjianItem,
  PengawasUjianItem,
  Role,
  SchoolSettings,
  Staf
} from '../../types/school';
import { dbFetchCollection, dbSaveCollection } from '../../lib/firebaseSync';
import {
  downloadDaftarPengawasPdf,
  PengawasDirectoryEntry,
  PengawasPdfMode
} from './daftarPengawasPdf';

interface DenahRoomRef {
  id: string;
  namaRuang: string;
  pengawas?: string;
}

interface DaftarPengawasUjianProps {
  guruList?: Guru[];
  stafList?: Staf[];
  jadwalUjianList?: JadwalUjianItem[];
  schoolSettings?: SchoolSettings;
  cbtSettings?: CbtExamSettings;
  currentRole?: Role;
  userEmail?: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const STORAGE_KEY = 'edu_pengawasUjianList';
const DENAH_STORAGE_KEY = 'edu_denahRuangList';

const HARI_SHORT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const BULAN_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

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

function parseMinutes(hhmm: string): number {
  const [h, m] = (hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
}

function isTimeOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const s1 = parseMinutes(aStart);
  const e1 = parseMinutes(aEnd);
  const s2 = parseMinutes(bStart);
  const e2 = parseMinutes(bEnd);
  if (s1 < 0 || e1 < 0 || s2 < 0 || e2 < 0) return aStart === bStart;
  return s1 < e2 && s2 < e1;
}

function escapeCsvCell(val: string): string {
  const s = String(val ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

interface CandidatePerson {
  id: string;
  nama: string;
  nip: string;
  mapel: string;
  email: string;
  source: 'Guru' | 'Staf';
}

export const DaftarPengawasUjian: React.FC<DaftarPengawasUjianProps> = ({
  guruList = [],
  stafList = [],
  jadwalUjianList = [],
  schoolSettings,
  cbtSettings,
  currentRole = 'admin',
  userEmail = '',
  showToast
}) => {
  const canEdit = currentRole !== 'siswa' && currentRole !== 'guru';

  const [pengawasList, setPengawasList] = useState<PengawasUjianItem[]>(() => {
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
            .map((r: any) => ({ id: r.id, namaRuang: String(r.namaRuang), pengawas: r.pengawas || '' }));
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [viewMode, setViewMode] = useState<'table' | 'matrix' | 'rekap'>('table');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTanggal, setFilterTanggal] = useState('Semua');
  const [filterRuang, setFilterRuang] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | PengawasUjianItem['status']>('Semua');
  const [onlyMySchedule, setOnlyMySchedule] = useState(false);
  const [onlyConflicts, setOnlyConflicts] = useState(false);

  const [pdfMode, setPdfMode] = useState<PengawasPdfMode>('daftar');
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  // Modals
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formState, setFormState] = useState<{
    tanggal: string;
    sesi: string;
    jamMulai: string;
    jamSelesai: string;
    mataPelajaran: string;
    ruang: string;
    pengawas1Nama: string;
    pengawas2Nama: string;
    status: PengawasUjianItem['status'];
    penggantiNama: string;
    catatan: string;
  }>({
    tanggal: '',
    sesi: 'Sesi 1',
    jamMulai: '07:30',
    jamSelesai: '09:00',
    mataPelajaran: '',
    ruang: 'Ruang 1',
    pengawas1Nama: '',
    pengawas2Nama: '',
    status: 'Terjadwal',
    penggantiNama: '',
    catatan: ''
  });

  const [showAutoModal, setShowAutoModal] = useState(false);
  const [autoPerRoom, setAutoPerRoom] = useState<1 | 2>(1);
  const [autoIncludeStaf, setAutoIncludeStaf] = useState(false);
  const [autoAvoidOwnSubject, setAutoAvoidOwnSubject] = useState(true);
  const [autoReplaceExisting, setAutoReplaceExisting] = useState(true);
  const [autoSelectedDates, setAutoSelectedDates] = useState<string[]>([]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Fetch remote Firestore data on mount
  useEffect(() => {
    let active = true;
    const loadRemote = async () => {
      try {
        const [remotePengawas, remoteDenah] = await Promise.all([
          dbFetchCollection<PengawasUjianItem>(STORAGE_KEY),
          dbFetchCollection<any>(DENAH_STORAGE_KEY)
        ]);
        if (!active) return;

        if (remotePengawas && remotePengawas.length > 0) {
          setPengawasList(remotePengawas);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remotePengawas));
        }

        if (remoteDenah && remoteDenah.length > 0) {
          const mapped: DenahRoomRef[] = remoteDenah
            .filter(r => r && r.namaRuang)
            .map(r => ({
              id: r.id,
              namaRuang: String(r.namaRuang),
              pengawas: r.pengawas || ''
            }))
            .sort((a, b) => a.namaRuang.localeCompare(b.namaRuang, undefined, { numeric: true }));
          if (mapped.length > 0) {
            setDenahRooms(mapped);
          }
        }
      } catch (err) {
        console.error('Gagal sinkronisasi data pengawas ujian:', err);
      }
    };
    loadRemote();
    return () => {
      active = false;
    };
  }, []);

  const persistPengawasList = (nextList: PengawasUjianItem[]) => {
    setPengawasList(nextList);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextList));
      dbSaveCollection(STORAGE_KEY, nextList).catch(console.error);
    } catch (err) {
      console.error('Gagal menyimpan daftar pengawas:', err);
    }
  };

  // Candidate invigilators (Guru + Staf)
  const candidates = useMemo<CandidatePerson[]>(() => {
    const map = new Map<string, CandidatePerson>();
    guruList.forEach(g => {
      if (!g.nama?.trim()) return;
      const key = g.nama.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: g.id,
          nama: g.nama.trim(),
          nip: g.nip || '',
          mapel: g.mataPelajaran || '',
          email: (g.email || '').trim().toLowerCase(),
          source: 'Guru'
        });
      }
    });
    stafList.forEach(s => {
      if (!s.nama?.trim()) return;
      const key = s.nama.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: s.id,
          nama: s.nama.trim(),
          nip: s.nip || s.nik || '',
          mapel: s.bagian || 'Staf',
          email: (s.email || '').trim().toLowerCase(),
          source: 'Staf'
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => a.nama.localeCompare(b.nama));
  }, [guruList, stafList]);

  // Logged-in teacher name (for Guru "Jadwal Saya" filter)
  const currentTeacherName = useMemo(() => {
    if (!userEmail) return '';
    const emailLower = userEmail.trim().toLowerCase();
    const matched = candidates.find(c => c.email && c.email === emailLower);
    return matched?.nama || '';
  }, [candidates, userEmail]);

  // Stable invigilator code directory (P-01, P-02, ...)
  const directory = useMemo<PengawasDirectoryEntry[]>(() => {
    const names = new Map<string, { nama: string; nip?: string }>();
    candidates.forEach(c => {
      names.set(c.nama.toLowerCase(), { nama: c.nama, nip: c.nip });
    });
    pengawasList.forEach(item => {
      if (item.pengawas1Nama?.trim()) {
        const k = item.pengawas1Nama.trim().toLowerCase();
        if (!names.has(k)) names.set(k, { nama: item.pengawas1Nama.trim(), nip: item.pengawas1Nip });
      }
      if (item.pengawas2Nama?.trim()) {
        const k = item.pengawas2Nama.trim().toLowerCase();
        if (!names.has(k)) names.set(k, { nama: item.pengawas2Nama.trim(), nip: item.pengawas2Nip });
      }
    });

    // Only include teachers who actually appear in pengawasList if list isn't empty; otherwise all candidates
    const usedSet = new Set<string>();
    pengawasList.forEach(item => {
      if (item.pengawas1Nama?.trim()) usedSet.add(item.pengawas1Nama.trim().toLowerCase());
      if (item.pengawas2Nama?.trim()) usedSet.add(item.pengawas2Nama.trim().toLowerCase());
    });

    const sortedEntries = Array.from(names.entries())
      .filter(([k]) => usedSet.size === 0 || usedSet.has(k))
      .sort((a, b) => a[1].nama.localeCompare(b[1].nama));

    return sortedEntries.map(([, val], idx) => ({
      kode: `P-${String(idx + 1).padStart(2, '0')}`,
      nama: val.nama,
      nip: val.nip
    }));
  }, [candidates, pengawasList]);

  const codeByName = useMemo(() => {
    const map = new Map<string, string>();
    directory.forEach(d => map.set(d.nama.toLowerCase(), d.kode));
    return map;
  }, [directory]);

  // Available room list (merged from Denah Ruang + existing pengawasList + default fallback)
  const availableRooms = useMemo(() => {
    const set = new Set<string>();
    denahRooms.forEach(r => {
      if (r.namaRuang.trim()) set.add(r.namaRuang.trim());
    });
    pengawasList.forEach(p => {
      if (p.ruang?.trim()) set.add(p.ruang.trim());
    });
    if (set.size === 0) {
      ['Ruang 1', 'Ruang 2', 'Ruang 3', 'Ruang 4', 'Ruang 5', 'Ruang 6'].forEach(r => set.add(r));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [denahRooms, pengawasList]);

  // Unique exam sessions extracted from jadwalUjianList
  const uniqueExamSessions = useMemo(() => {
    const byKey = new Map<
      string,
      {
        key: string;
        tanggal: string;
        jamMulai: string;
        jamSelesai: string;
        mataPelajaran: string;
        sesi: string;
      }
    >();

    const sortedJadwal = [...jadwalUjianList].sort((a, b) => {
      const d = (a.tanggal || '').localeCompare(b.tanggal || '');
      if (d !== 0) return d;
      return (a.jamMulai || '').localeCompare(b.jamMulai || '');
    });

    // Count session number per day
    const dayTimeOrder = new Map<string, string[]>();
    sortedJadwal.forEach(j => {
      const dt = (j.tanggal || '').slice(0, 10);
      const tKey = `${j.jamMulai || '07:30'}-${j.jamSelesai || '09:00'}`;
      if (!dt) return;
      const arr = dayTimeOrder.get(dt) || [];
      if (!arr.includes(tKey)) arr.push(tKey);
      dayTimeOrder.set(dt, arr);
    });

    sortedJadwal.forEach(j => {
      const dt = (j.tanggal || '').slice(0, 10);
      if (!dt) return;
      const jm = j.jamMulai || '07:30';
      const js = j.jamSelesai || '09:00';
      const tKey = `${jm}-${js}`;
      const sesiIdx = (dayTimeOrder.get(dt) || []).indexOf(tKey) + 1;
      const sesiLabel = `Sesi ${Math.max(1, sesiIdx)}`;
      const key = `${dt}|${jm}|${js}`;

      if (!byKey.has(key)) {
        byKey.set(key, {
          key,
          tanggal: dt,
          jamMulai: jm,
          jamSelesai: js,
          mataPelajaran: j.mataPelajaran || j.judulUjian || 'Ujian CBT',
          sesi: sesiLabel
        });
      } else {
        const existing = byKey.get(key)!;
        const mapel = (j.mataPelajaran || '').trim();
        if (mapel && !existing.mataPelajaran.includes(mapel)) {
          existing.mataPelajaran = `${existing.mataPelajaran} / ${mapel}`;
        }
      }
    });

    return Array.from(byKey.values());
  }, [jadwalUjianList]);

  const availableDates = useMemo(() => {
    const set = new Set<string>();
    pengawasList.forEach(p => {
      if (p.tanggal) set.add(p.tanggal);
    });
    uniqueExamSessions.forEach(s => {
      if (s.tanggal) set.add(s.tanggal);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pengawasList, uniqueExamSessions]);

  // Conflict detection: same invigilator assigned to 2+ rooms on same date & overlapping time
  const conflictIds = useMemo(() => {
    const ids = new Set<string>();
    const details: string[] = [];

    for (let i = 0; i < pengawasList.length; i++) {
      for (let j = i + 1; j < pengawasList.length; j++) {
        const a = pengawasList[i];
        const b = pengawasList[j];
        if (!a.tanggal || a.tanggal !== b.tanggal) continue;
        if (a.ruang === b.ruang && a.sesi === b.sesi) continue;
        if (!isTimeOverlap(a.jamMulai, a.jamSelesai, b.jamMulai, b.jamSelesai)) continue;

        const namesA = [
          a.status === 'Digantikan' && a.penggantiNama ? a.penggantiNama : a.pengawas1Nama,
          a.pengawas2Nama
        ]
          .filter(Boolean)
          .map(n => n!.trim().toLowerCase());

        const namesB = [
          b.status === 'Digantikan' && b.penggantiNama ? b.penggantiNama : b.pengawas1Nama,
          b.pengawas2Nama
        ]
          .filter(Boolean)
          .map(n => n!.trim().toLowerCase());

        const shared = namesA.find(n => namesB.includes(n));
        if (shared) {
          ids.add(a.id);
          ids.add(b.id);
          const display = a.pengawas1Nama.toLowerCase() === shared ? a.pengawas1Nama : a.pengawas2Nama || shared;
          details.push(`${display} bentrok di ${a.ruang} & ${b.ruang} (${formatTanggalCompact(a.tanggal)} ${a.jamMulai})`);
        }
      }
    }

    return { ids, details: Array.from(new Set(details)) };
  }, [pengawasList]);

  // Filtered & sorted rows
  const filteredList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return [...pengawasList]
      .filter(item => {
        if (filterTanggal !== 'Semua' && item.tanggal !== filterTanggal) return false;
        if (filterRuang !== 'Semua' && item.ruang !== filterRuang) return false;
        if (filterStatus !== 'Semua' && item.status !== filterStatus) return false;
        if (onlyConflicts && !conflictIds.ids.has(item.id)) return false;
        if (onlyMySchedule && currentTeacherName) {
          const me = currentTeacherName.toLowerCase();
          const matchMe =
            (item.pengawas1Nama || '').toLowerCase() === me ||
            (item.pengawas2Nama || '').toLowerCase() === me ||
            (item.penggantiNama || '').toLowerCase() === me;
          if (!matchMe) return false;
        }
        if (q) {
          const k1 = (codeByName.get((item.pengawas1Nama || '').toLowerCase()) || item.kodePengawas || '').toLowerCase();
          const k2 = (codeByName.get((item.pengawas2Nama || '').toLowerCase()) || '').toLowerCase();
          const hay = [
            item.pengawas1Nama,
            item.pengawas2Nama,
            item.penggantiNama,
            item.ruang,
            item.mataPelajaran,
            item.sesi,
            item.tanggal,
            item.catatan,
            k1,
            k2
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
  }, [
    pengawasList,
    searchQuery,
    filterTanggal,
    filterRuang,
    filterStatus,
    onlyConflicts,
    onlyMySchedule,
    currentTeacherName,
    conflictIds.ids,
    codeByName
  ]);

  // Matrix rows (grouped by tanggal + jamMulai + jamSelesai + sesi + mataPelajaran)
  const matrixRows = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        tanggal: string;
        sesi: string;
        jamMulai: string;
        jamSelesai: string;
        mataPelajaran: string;
        byRoom: Record<string, PengawasUjianItem>;
      }
    >();

    filteredList.forEach(item => {
      const key = `${item.tanggal}|${item.jamMulai}|${item.jamSelesai}|${item.sesi}|${item.mataPelajaran}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          tanggal: item.tanggal,
          sesi: item.sesi,
          jamMulai: item.jamMulai,
          jamSelesai: item.jamSelesai,
          mataPelajaran: item.mataPelajaran,
          byRoom: {}
        });
      }
      map.get(key)!.byRoom[item.ruang] = item;
    });

    return Array.from(map.values());
  }, [filteredList]);

  // Summary per teacher (Rekap Beban Tugas)
  const teacherSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        kode: string;
        nama: string;
        nip: string;
        mapel: string;
        totalSesi: number;
        hadirCount: number;
        digantikanCount: number;
        rooms: Set<string>;
        dates: Set<string>;
      }
    >();

    const ensure = (nama: string, nipFallback?: string) => {
      const clean = nama.trim();
      const key = clean.toLowerCase();
      if (!map.has(key)) {
        const cand = candidates.find(c => c.nama.toLowerCase() === key);
        map.set(key, {
          kode: codeByName.get(key) || '-',
          nama: clean,
          nip: cand?.nip || nipFallback || '-',
          mapel: cand?.mapel || '-',
          totalSesi: 0,
          hadirCount: 0,
          digantikanCount: 0,
          rooms: new Set(),
          dates: new Set()
        });
      }
      return map.get(key)!;
    };

    filteredList.forEach(item => {
      if (item.pengawas1Nama?.trim()) {
        const rec = ensure(item.pengawas1Nama, item.pengawas1Nip);
        rec.totalSesi += 1;
        if (item.status === 'Hadir' || item.status === 'Selesai') rec.hadirCount += 1;
        if (item.status === 'Digantikan') rec.digantikanCount += 1;
        rec.rooms.add(item.ruang);
        rec.dates.add(item.tanggal);
      }
      if (item.pengawas2Nama?.trim()) {
        const rec = ensure(item.pengawas2Nama, item.pengawas2Nip);
        rec.totalSesi += 1;
        if (item.status === 'Hadir' || item.status === 'Selesai') rec.hadirCount += 1;
        rec.rooms.add(item.ruang);
        rec.dates.add(item.tanggal);
      }
    });

    return Array.from(map.values()).sort((a, b) => b.totalSesi - a.totalSesi || a.nama.localeCompare(b.nama));
  }, [filteredList, candidates, codeByName]);

  // Stats
  const stats = useMemo(() => {
    const activeTeachers = new Set<string>();
    const activeRooms = new Set<string>();
    let hadirOrDone = 0;
    pengawasList.forEach(p => {
      if (p.pengawas1Nama) activeTeachers.add(p.pengawas1Nama.toLowerCase());
      if (p.pengawas2Nama) activeTeachers.add(p.pengawas2Nama.toLowerCase());
      if (p.ruang) activeRooms.add(p.ruang);
      if (p.status === 'Hadir' || p.status === 'Selesai') hadirOrDone += 1;
    });
    return {
      totalPenugasan: pengawasList.length,
      totalPengawas: activeTeachers.size,
      totalRuang: activeRooms.size,
      hadirOrDone,
      conflictCount: conflictIds.details.length
    };
  }, [pengawasList, conflictIds.details.length]);

  const examBannerTitle = cbtSettings
    ? `${cbtSettings.namaUjian} · Semester ${cbtSettings.semester} · TP ${cbtSettings.tahunAjaran}`
    : `Sumatif Akhir Semester (SAS) · TP ${schoolSettings?.tahunAjaran || '2026/2027'}`;

  // Handlers
  const openAddModal = (prefill?: Partial<typeof formState>) => {
    if (!canEdit) return;
    const firstSession = uniqueExamSessions[0];
    const todayIso = new Date().toISOString().slice(0, 10);
    setEditingId(null);
    setFormState({
      tanggal: prefill?.tanggal || firstSession?.tanggal || todayIso,
      sesi: prefill?.sesi || firstSession?.sesi || 'Sesi 1',
      jamMulai: prefill?.jamMulai || firstSession?.jamMulai || '07:30',
      jamSelesai: prefill?.jamSelesai || firstSession?.jamSelesai || '09:00',
      mataPelajaran: prefill?.mataPelajaran || firstSession?.mataPelajaran || '',
      ruang: prefill?.ruang || availableRooms[0] || 'Ruang 1',
      pengawas1Nama: prefill?.pengawas1Nama || candidates[0]?.nama || '',
      pengawas2Nama: prefill?.pengawas2Nama || '',
      status: prefill?.status || 'Terjadwal',
      penggantiNama: prefill?.penggantiNama || '',
      catatan: prefill?.catatan || ''
    });
    setShowFormModal(true);
  };

  const openEditModal = (item: PengawasUjianItem) => {
    if (!canEdit) return;
    setEditingId(item.id);
    setFormState({
      tanggal: item.tanggal || '',
      sesi: item.sesi || 'Sesi 1',
      jamMulai: item.jamMulai || '07:30',
      jamSelesai: item.jamSelesai || '09:00',
      mataPelajaran: item.mataPelajaran || '',
      ruang: item.ruang || availableRooms[0] || 'Ruang 1',
      pengawas1Nama: item.pengawas1Nama || '',
      pengawas2Nama: item.pengawas2Nama || '',
      status: item.status || 'Terjadwal',
      penggantiNama: item.penggantiNama || '',
      catatan: item.catatan || ''
    });
    setShowFormModal(true);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    if (!formState.tanggal.trim() || !formState.ruang.trim() || !formState.pengawas1Nama.trim()) {
      showToast('Tanggal, Ruang Ujian, dan Pengawas 1 wajib diisi.', 'error');
      return;
    }

    const p1 = candidates.find(c => c.nama.toLowerCase() === formState.pengawas1Nama.trim().toLowerCase());
    const p2 = formState.pengawas2Nama.trim()
      ? candidates.find(c => c.nama.toLowerCase() === formState.pengawas2Nama.trim().toLowerCase())
      : undefined;

    const record: PengawasUjianItem = {
      id: editingId || `pgw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      kodePengawas: codeByName.get(formState.pengawas1Nama.trim().toLowerCase()) || undefined,
      tanggal: formState.tanggal.trim(),
      sesi: formState.sesi.trim() || 'Sesi 1',
      jamMulai: formState.jamMulai.trim() || '07:30',
      jamSelesai: formState.jamSelesai.trim() || '09:00',
      mataPelajaran: formState.mataPelajaran.trim() || 'Ujian CBT',
      ruang: formState.ruang.trim(),
      pengawas1Id: p1?.id,
      pengawas1Nama: formState.pengawas1Nama.trim(),
      pengawas1Nip: p1?.nip,
      pengawas2Id: p2?.id,
      pengawas2Nama: formState.pengawas2Nama.trim() || undefined,
      pengawas2Nip: p2?.nip,
      status: formState.status,
      penggantiNama: formState.status === 'Digantikan' ? formState.penggantiNama.trim() : undefined,
      catatan: formState.catatan.trim() || undefined,
      updatedAt: new Date().toISOString()
    };

    const next = editingId
      ? pengawasList.map(item => (item.id === editingId ? record : item))
      : [...pengawasList, record];

    persistPengawasList(next);
    setShowFormModal(false);
    showToast(editingId ? 'Data pengawas ujian berhasil diperbarui.' : 'Pengawas ujian berhasil ditambahkan.');
  };

  const handleDeleteItem = (id: string) => {
    if (!canEdit) return;
    const next = pengawasList.filter(item => item.id !== id);
    persistPengawasList(next);
    showToast('Jadwal pengawas berhasil dihapus.');
  };

  const handleCycleStatus = (item: PengawasUjianItem) => {
    if (!canEdit) return;
    const order: PengawasUjianItem['status'][] = ['Terjadwal', 'Hadir', 'Selesai'];
    const currIdx = order.indexOf(item.status);
    const nextStatus = order[(currIdx + 1) % order.length];
    const next = pengawasList.map(p =>
      p.id === item.id ? { ...p, status: nextStatus, updatedAt: new Date().toISOString() } : p
    );
    persistPengawasList(next);
  };

  // Sync directly from Denah Ruang Ujian
  const handleSyncFromDenah = () => {
    if (!canEdit) return;
    if (denahRooms.length === 0) {
      showToast('Belum ada ruang pada Denah Ruang Ujian. Tambahkan ruang di menu Denah Ruang Ujian terlebih dahulu.', 'error');
      return;
    }

    const sessions =
      uniqueExamSessions.length > 0
        ? uniqueExamSessions
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

    const existingKeys = new Set(
      pengawasList.map(p => `${p.tanggal}|${p.jamMulai}|${p.ruang.toLowerCase()}`)
    );

    const added: PengawasUjianItem[] = [];
    sessions.forEach(s => {
      denahRooms.forEach((r, rIdx) => {
        const key = `${s.tanggal}|${s.jamMulai}|${r.namaRuang.toLowerCase()}`;
        if (existingKeys.has(key)) return;
        const pNama = (r.pengawas || '').trim() || candidates[rIdx % Math.max(1, candidates.length)]?.nama || 'Pengawas Ujian';
        const matched = candidates.find(c => c.nama.toLowerCase() === pNama.toLowerCase());
        added.push({
          id: `pgw-sync-${Date.now()}-${added.length}-${Math.random().toString(36).slice(2, 5)}`,
          tanggal: s.tanggal,
          sesi: s.sesi,
          jamMulai: s.jamMulai,
          jamSelesai: s.jamSelesai,
          mataPelajaran: s.mataPelajaran,
          ruang: r.namaRuang,
          pengawas1Id: matched?.id,
          pengawas1Nama: pNama,
          pengawas1Nip: matched?.nip,
          status: 'Terjadwal',
          updatedAt: new Date().toISOString()
        });
      });
    });

    if (added.length === 0) {
      showToast('Semua ruang dari Denah Ruang Ujian sudah terdaftar pada jadwal pengawas.');
      return;
    }

    persistPengawasList([...pengawasList, ...added]);
    showToast(`Berhasil menyinkronkan ${added.length} penugasan pengawas dari Denah Ruang Ujian.`);
  };

  // Smart Auto-Distribution (Fair rotation, zero double-booking, optional subject avoidance)
  const handleRunAutoGenerate = () => {
    if (!canEdit) return;
    const pool = candidates.filter(c => autoIncludeStaf || c.source === 'Guru');
    if (pool.length === 0) {
      showToast('Belum ada data Guru/Staf di Database Sekolah untuk dijadikan pengawas.', 'error');
      return;
    }

    const targetRooms =
      denahRooms.length > 0 ? denahRooms.map(r => r.namaRuang) : availableRooms;

    const targetSessions =
      uniqueExamSessions.length > 0
        ? uniqueExamSessions.filter(
            s => autoSelectedDates.length === 0 || autoSelectedDates.includes(s.tanggal)
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
      showToast('Pilih minimal 1 tanggal ujian untuk pembagian pengawas otomatis.', 'error');
      return;
    }

    const baseList = autoReplaceExisting
      ? pengawasList.filter(p => !targetSessions.some(s => s.tanggal === p.tanggal))
      : [...pengawasList];

    const loadCount = new Map<string, number>();
    pool.forEach(c => loadCount.set(c.nama.toLowerCase(), 0));
    baseList.forEach(p => {
      if (p.pengawas1Nama) {
        const k = p.pengawas1Nama.toLowerCase();
        loadCount.set(k, (loadCount.get(k) || 0) + 1);
      }
      if (p.pengawas2Nama) {
        const k = p.pengawas2Nama.toLowerCase();
        loadCount.set(k, (loadCount.get(k) || 0) + 1);
      }
    });

    const existingSlotRoom = new Set(
      baseList.map(p => `${p.tanggal}|${p.jamMulai}|${p.ruang.toLowerCase()}`)
    );

    const generated: PengawasUjianItem[] = [];

    targetSessions.forEach((session, sIdx) => {
      const busyInSlot = new Set<string>();
      baseList
        .filter(p => p.tanggal === session.tanggal && isTimeOverlap(p.jamMulai, p.jamSelesai, session.jamMulai, session.jamSelesai))
        .forEach(p => {
          if (p.pengawas1Nama) busyInSlot.add(p.pengawas1Nama.toLowerCase());
          if (p.pengawas2Nama) busyInSlot.add(p.pengawas2Nama.toLowerCase());
        });

      const sessionMapelLower = (session.mataPelajaran || '').toLowerCase();

      const pickNextCandidate = (): CandidatePerson | undefined => {
        const available = pool.filter(c => !busyInSlot.has(c.nama.toLowerCase()));
        if (available.length === 0) return undefined;

        const score = (c: CandidatePerson) => {
          const cnt = loadCount.get(c.nama.toLowerCase()) || 0;
          const isOwnSubject =
            autoAvoidOwnSubject &&
            c.mapel &&
            c.mapel.length > 2 &&
            sessionMapelLower.includes(c.mapel.toLowerCase());
          return cnt * 10 + (isOwnSubject ? 50 : 0);
        };

        // Rotate tie-break offset by session index so teachers don't get stuck in the same room
        const rotated = [...available.slice(sIdx % available.length), ...available.slice(0, sIdx % available.length)];
        rotated.sort((a, b) => score(a) - score(b));
        return rotated[0];
      };

      targetRooms.forEach((ruang, rIdx) => {
        const slotRoomKey = `${session.tanggal}|${session.jamMulai}|${ruang.toLowerCase()}`;
        if (!autoReplaceExisting && existingSlotRoom.has(slotRoomKey)) return;

        const p1 = pickNextCandidate();
        if (!p1) return;
        busyInSlot.add(p1.nama.toLowerCase());
        loadCount.set(p1.nama.toLowerCase(), (loadCount.get(p1.nama.toLowerCase()) || 0) + 1);

        let p2: CandidatePerson | undefined;
        if (autoPerRoom === 2) {
          p2 = pickNextCandidate();
          if (p2) {
            busyInSlot.add(p2.nama.toLowerCase());
            loadCount.set(p2.nama.toLowerCase(), (loadCount.get(p2.nama.toLowerCase()) || 0) + 1);
          }
        }

        generated.push({
          id: `pgw-auto-${Date.now()}-${sIdx}-${rIdx}-${Math.random().toString(36).slice(2, 5)}`,
          tanggal: session.tanggal,
          sesi: session.sesi,
          jamMulai: session.jamMulai,
          jamSelesai: session.jamSelesai,
          mataPelajaran: session.mataPelajaran,
          ruang,
          pengawas1Id: p1.id,
          pengawas1Nama: p1.nama,
          pengawas1Nip: p1.nip,
          pengawas2Id: p2?.id,
          pengawas2Nama: p2?.nama,
          pengawas2Nip: p2?.nip,
          status: 'Terjadwal',
          updatedAt: new Date().toISOString()
        });
      });
    });

    persistPengawasList([...baseList, ...generated]);
    setShowAutoModal(false);
    showToast(
      `Berhasil membagi ${generated.length} jadwal pengawas secara otomatis untuk ${targetRooms.length} ruang (${targetSessions.length} sesi).`
    );
  };

  // Export CSV
  const handleExportCsv = () => {
    if (filteredList.length === 0) {
      showToast('Tidak ada data pengawas untuk diekspor.', 'error');
      return;
    }
    const headers = [
      'No',
      'Kode',
      'Tanggal',
      'Sesi',
      'Jam Mulai',
      'Jam Selesai',
      'Mata Pelajaran',
      'Ruang Ujian',
      'Pengawas',
      'NIP Pengawas',
      'Status',
      'Pengganti',
      'Catatan'
    ];
    const rows = filteredList.map((item, idx) => [
      String(idx + 1),
      codeByName.get((item.pengawas1Nama || '').toLowerCase()) || item.kodePengawas || '-',
      item.tanggal,
      item.sesi,
      item.jamMulai,
      item.jamSelesai,
      item.mataPelajaran,
      item.ruang,
      item.pengawas1Nama,
      item.pengawas1Nip || '',
      item.status,
      item.penggantiNama || '',
      item.catatan || ''
    ]);
    const csv = '\uFEFF' + [headers, ...rows].map(r => r.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `daftar-pengawas-ujian-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`Berhasil mengekspor ${filteredList.length} data pengawas ke CSV.`);
  };

  // Download PDF
  const handleDownloadPdf = async () => {
    if (isDownloadingPdf) return;
    if (filteredList.length === 0) {
      showToast('Belum ada jadwal pengawas untuk diunduh sebagai PDF.', 'error');
      return;
    }
    setIsDownloadingPdf(true);
    try {
      const schoolName = schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR';
      const examTitle = cbtSettings
        ? `${cbtSettings.namaUjian.toUpperCase()} SEMESTER ${cbtSettings.semester.toUpperCase()} TAHUN PELAJARAN ${cbtSettings.tahunAjaran}`
        : `SUMATIF AKHIR SEMESTER (SAS) TAHUN PELAJARAN ${schoolSettings?.tahunAjaran || '2026/2027'}`;
      const kota = cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok';
      const kepsekNama = cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah';
      const kepsekNip = cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '';

      const filterNotes: string[] = [];
      if (filterTanggal !== 'Semua') filterNotes.push(formatTanggalCompact(filterTanggal));
      if (filterRuang !== 'Semua') filterNotes.push(filterRuang);
      if (filterStatus !== 'Semua') filterNotes.push(filterStatus);
      if (onlyMySchedule && currentTeacherName) filterNotes.push(currentTeacherName);

      const modeSlug =
        pdfMode === 'matriks'
          ? 'matriks-pengawas-ujian'
          : pdfMode === 'absensi'
          ? 'daftar-hadir-pengawas-ujian'
          : 'daftar-pengawas-ujian';
      const fileName = `${modeSlug}.pdf`;

      const usedRooms = Array.from(new Set(filteredList.map(i => i.ruang))).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true })
      );

      await downloadDaftarPengawasPdf({
        mode: pdfMode,
        items: filteredList,
        rooms: usedRooms.length > 0 ? usedRooms : availableRooms,
        directory,
        schoolName,
        examTitle,
        kota,
        kepsekNama,
        kepsekNip,
        logoUrl: schoolSettings?.logoUrl,
        ttdKepalaSekolahUrl: cbtSettings?.ttdKepalaSekolahUrl,
        filterNote: filterNotes.length > 0 ? filterNotes.join(' · ') : undefined,
        fileName
      });

      showToast(`Berhasil mengunduh ${fileName}.`);
    } catch (err) {
      console.error('Gagal membuat PDF daftar pengawas:', err);
      showToast('Gagal membuat file PDF daftar pengawas.', 'error');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Main Container matching Manajemen Jadwal Ujian aesthetic */}
      <div className="bg-[#121212] rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-5">
        {/* Header Row */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-lg font-black text-white flex items-center gap-2.5">
              <UserCheck className="w-5 h-5 text-sky-400" />
              <span>Daftar & Jadwal Pengawas Ujian</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{examBannerTitle}</span>
              <span>·</span>
              <span className="text-sky-400 font-semibold tabular-nums">
                {stats.totalPenugasan} penugasan
              </span>
              <span>·</span>
              <span className="text-emerald-400 font-semibold tabular-nums">
                {stats.totalPengawas} pengawas aktif
              </span>
              <span>·</span>
              <span className="text-amber-300 font-semibold tabular-nums">
                {stats.totalRuang || denahRooms.length} ruang
              </span>
            </p>
          </div>

          {/* Search input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama pengawas, kode, ruang, mapel..."
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
          {/* Left: View Switcher + Export / PDF */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Daftar Pengawas</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('matrix')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Matriks Ruang</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('rekap')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                  viewMode === 'rekap'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>Rekap Tugas ({teacherSummary.length})</span>
              </button>
            </div>

            {/* PDF Mode + Download */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 gap-1">
              <select
                value={pdfMode}
                onChange={e => setPdfMode(e.target.value as PengawasPdfMode)}
                className="bg-transparent text-xs font-semibold text-slate-200 px-2 py-1 focus:outline-none cursor-pointer"
                title="Pilih format dokumen PDF pengawas"
              >
                <option value="daftar" className="bg-slate-900 text-white">
                  PDF Daftar Jadwal
                </option>
                <option value="matriks" className="bg-slate-900 text-white">
                  PDF Matriks Ruang
                </option>
                <option value="absensi" className="bg-slate-900 text-white">
                  PDF Daftar Hadir (Paraf)
                </option>
              </select>
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isDownloadingPdf || filteredList.length === 0}
                className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
              >
                {isDownloadingPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{isDownloadingPdf ? 'Menyiapkan...' : 'Unduh PDF'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filteredList.length === 0}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-200 border border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Export CSV</span>
            </button>
          </div>

          {/* Right: Admin Management Controls */}
          {canEdit && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setAutoSelectedDates(uniqueExamSessions.map(s => s.tanggal).filter((v, i, a) => a.indexOf(v) === i));
                  setShowAutoModal(true);
                }}
                className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Bagi Pengawas Otomatis</span>
              </button>

              <button
                type="button"
                onClick={handleSyncFromDenah}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-sky-300 border border-sky-500/40 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                title="Ambil ruang & pengawas langsung dari menu Denah Ruang Ujian"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sinkron Denah</span>
              </button>

              {pengawasList.length > 0 && (
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
                onClick={() => openAddModal()}
                className="px-3.5 py-2 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Pengawas</span>
              </button>
            </div>
          )}
        </div>

        {/* Conflict Warning Banner */}
        {conflictIds.details.length > 0 && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-950/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-200 space-y-0.5">
                <div className="font-bold">
                  Terdeteksi {conflictIds.details.length} bentrok jadwal pengawas pada jam yang sama:
                </div>
                <div className="text-amber-300/90 text-[11px]">
                  {conflictIds.details.slice(0, 3).join(' · ')}
                  {conflictIds.details.length > 3 ? ` (+${conflictIds.details.length - 3} lainnya)` : ''}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOnlyConflicts(prev => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer shrink-0 ${
                onlyConflicts
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-amber-900/40 text-amber-200 border-amber-500/50 hover:bg-amber-900/70'
              }`}
            >
              {onlyConflicts ? 'Tampilkan Semua' : 'Filter Jadwal Bentrok'}
            </button>
          </div>
        )}

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
                Status
              </label>
              <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 gap-0.5">
                {(['Semua', 'Terjadwal', 'Hadir', 'Digantikan', 'Selesai'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      filterStatus === st
                        ? 'bg-slate-700 text-white'
                        : 'text-slate-400 hover:text-white'
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
                onClick={() => setOnlyMySchedule(prev => !prev)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  onlyMySchedule
                    ? 'bg-purple-600/30 text-purple-200 border-purple-500'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-purple-500/60'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Jadwal Saya ({currentTeacherName.split(',')[0]})</span>
              </button>
            )}
          </div>

          <div className="text-xs text-slate-400 tabular-nums">
            Menampilkan <span className="text-white font-bold">{filteredList.length}</span> dari{' '}
            <span className="text-white font-bold">{pengawasList.length}</span> jadwal pengawas
          </div>
        </div>

        {/* Empty State */}
        {pengawasList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-950/60 p-10 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mx-auto">
              <UserCheck className="w-7 h-7 text-sky-400" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h4 className="text-base font-bold text-white">Belum Ada Jadwal Pengawas Ujian</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gunakan tombol <strong className="text-emerald-400">Bagi Pengawas Otomatis</strong> untuk mendistribusikan guru secara adil ke seluruh ruang & sesi ujian tanpa bentrok, atau sinkronkan langsung dari Denah Ruang Ujian.
              </p>
            </div>
            {canEdit && (
              <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAutoSelectedDates(uniqueExamSessions.map(s => s.tanggal).filter((v, i, a) => a.indexOf(v) === i));
                    setShowAutoModal(true);
                  }}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Bagi Pengawas Otomatis</span>
                </button>
                <button
                  type="button"
                  onClick={handleSyncFromDenah}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-sky-500/40 text-xs font-bold rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Sinkron dari Denah Ruang</span>
                </button>
                <button
                  type="button"
                  onClick={() => openAddModal()}
                  className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black rounded-xl flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Manual</span>
                </button>
              </div>
            )}
          </div>
        ) : viewMode === 'table' ? (
          /* VIEW 1: TABLE LIST */
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5 text-center w-10">No</th>
                  <th className="py-3 px-3.5">Hari & Tanggal</th>
                  <th className="py-3 px-3.5">Sesi, Waktu & Mapel</th>
                  <th className="py-3 px-3.5">Ruang</th>
                  <th className="py-3 px-3.5">Pengawas</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  {canEdit && <th className="py-3 px-3.5 text-center w-24">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredList.length === 0 ? (
                  <tr>
                    <td colSpan={canEdit ? 7 : 6} className="py-10 text-center text-slate-500">
                      Tidak ada jadwal pengawas yang sesuai dengan filter saat ini.
                    </td>
                  </tr>
                ) : (
                  filteredList.map((item, idx) => {
                    const isConflict = conflictIds.ids.has(item.id);
                    const kode1 = codeByName.get((item.pengawas1Nama || '').toLowerCase()) || item.kodePengawas || 'P-00';
                    const isMine =
                      Boolean(currentTeacherName) &&
                      ((item.pengawas1Nama || '').toLowerCase() === currentTeacherName.toLowerCase() ||
                        (item.pengawas2Nama || '').toLowerCase() === currentTeacherName.toLowerCase());

                    return (
                      <tr
                        key={item.id}
                        className={`transition-colors ${
                          isConflict
                            ? 'bg-amber-950/25 hover:bg-amber-950/40'
                            : isMine
                            ? 'bg-purple-950/20 hover:bg-purple-950/35'
                            : 'hover:bg-slate-900/60'
                        }`}
                      >
                        <td className="py-3 px-3.5 text-center text-slate-400 font-mono tabular-nums">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <div className="font-bold text-white flex items-center gap-1.5">
                            <CalendarDays className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>{formatTanggalCompact(item.tanggal)}</span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5 pl-5">
                            {item.tanggal}
                          </div>
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
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-extrabold text-[11px]">
                            {item.ruang}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="flex items-center gap-2">
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono font-bold text-[10px] shrink-0">
                              {kode1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-white flex items-center gap-1.5">
                                <span className="truncate">{item.pengawas1Nama}</span>
                                {isConflict && (
                                  <span
                                    title="Bentrok dengan ruang lain di jam yang sama"
                                    className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase"
                                  >
                                    Bentrok
                                  </span>
                                )}
                              </div>
                              {item.pengawas1Nip && item.pengawas1Nip !== '-' && (
                                <div className="text-[10px] text-slate-500 font-mono">
                                  NIP. {item.pengawas1Nip}
                                </div>
                              )}
                              {item.status === 'Digantikan' && item.penggantiNama && (
                                <div className="text-[10px] text-amber-300 font-semibold mt-0.5">
                                  Pengganti: {item.penggantiNama}
                                </div>
                              )}
                              {item.catatan && (
                                <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[240px]">
                                  {item.catatan}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <button
                            type="button"
                            disabled={!canEdit}
                            onClick={() => handleCycleStatus(item)}
                            title={canEdit ? 'Klik untuk ubah status cepat (Terjadwal → Hadir → Selesai)' : undefined}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all ${
                              canEdit ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
                            } ${
                              item.status === 'Hadir'
                                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                                : item.status === 'Selesai'
                                ? 'bg-sky-500/15 text-sky-300 border-sky-500/35'
                                : item.status === 'Digantikan'
                                ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                                : 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {item.status}
                          </button>
                        </td>
                        {canEdit && (
                          <td className="py-3 px-3.5 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditModal(item)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition-colors cursor-pointer"
                                title="Edit jadwal pengawas"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteItem(item.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/40 transition-colors cursor-pointer"
                                title="Hapus jadwal pengawas"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : viewMode === 'matrix' ? (
          /* VIEW 2: MATRIX RUANG x HARI/SESI + LEGEND KODE PENGAWAS */
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold uppercase text-slate-300">
                    <th className="py-3 px-3 min-w-[140px]">Hari / Tanggal</th>
                    <th className="py-3 px-3 min-w-[100px] text-center">Waktu</th>
                    <th className="py-3 px-3 min-w-[180px]">Mata Pelajaran</th>
                    {availableRooms.map(r => (
                      <th
                        key={r}
                        className="py-3 px-2 text-center min-w-[82px] border-l border-slate-800 text-sky-300"
                      >
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {matrixRows.length === 0 ? (
                    <tr>
                      <td colSpan={3 + availableRooms.length} className="py-10 text-center text-slate-500">
                        Belum ada data matriks pengawas untuk filter saat ini.
                      </td>
                    </tr>
                  ) : (
                    matrixRows.map(slot => (
                      <tr key={slot.key} className="hover:bg-slate-900/50">
                        <td className="py-2.5 px-3 font-bold text-white whitespace-nowrap">
                          {formatTanggalCompact(slot.tanggal)}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap tabular-nums text-slate-300">
                          <div className="font-semibold text-[11px] text-sky-400">{slot.sesi}</div>
                          <div className="text-[10px] text-slate-400">
                            {slot.jamMulai}–{slot.jamSelesai}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {slot.mataPelajaran}
                        </td>
                        {availableRooms.map(r => {
                          const cell = slot.byRoom[r];
                          const isConf = cell ? conflictIds.ids.has(cell.id) : false;
                          const k1 = cell
                            ? codeByName.get((cell.pengawas1Nama || '').toLowerCase()) || cell.kodePengawas || 'P-00'
                            : '';
                          const k2 = cell?.pengawas2Nama
                            ? codeByName.get(cell.pengawas2Nama.toLowerCase()) || ''
                            : '';
                          return (
                            <td
                              key={r}
                              className="py-2 px-1.5 text-center border-l border-slate-800/80"
                            >
                              {cell ? (
                                <button
                                  type="button"
                                  disabled={!canEdit}
                                  onClick={() => openEditModal(cell)}
                                  title={`${cell.pengawas1Nama}${cell.pengawas2Nama ? ` & ${cell.pengawas2Nama}` : ''} (${cell.status})${canEdit ? ' · Klik untuk edit' : ''}`}
                                  className={`w-full px-2 py-1.5 rounded-lg border text-center transition-all ${
                                    canEdit ? 'cursor-pointer hover:brightness-110' : 'cursor-default'
                                  } ${
                                    isConf
                                      ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                                      : cell.status === 'Hadir' || cell.status === 'Selesai'
                                      ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-200'
                                      : 'bg-sky-500/15 border-sky-500/35 text-sky-200'
                                  }`}
                                >
                                  <div className="font-mono font-black text-[11px]">
                                    {k1}
                                    {k2 ? ` / ${k2}` : ''}
                                  </div>
                                  <div className="text-[9px] text-slate-300 truncate max-w-[78px] mx-auto">
                                    {cell.pengawas1Nama.split(' ')[0]}
                                  </div>
                                </button>
                              ) : canEdit ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openAddModal({
                                      tanggal: slot.tanggal,
                                      sesi: slot.sesi,
                                      jamMulai: slot.jamMulai,
                                      jamSelesai: slot.jamSelesai,
                                      mataPelajaran: slot.mataPelajaran,
                                      ruang: r
                                    })
                                  }
                                  title={`Tambah pengawas untuk ${r}`}
                                  className="w-full py-2 rounded-lg border border-dashed border-slate-800 hover:border-sky-500/50 text-slate-600 hover:text-sky-400 text-[11px] transition-colors cursor-pointer"
                                >
                                  +
                                </button>
                              ) : (
                                <span className="text-slate-600">-</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Directory Legend of Invigilator Codes */}
            {directory.length > 0 && (
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 space-y-3">
                <div className="text-xs font-bold text-sky-300 uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4" />
                  <span>Keterangan Kode Pengawas Ujian ({directory.length} Orang)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {directory.map(entry => (
                    <div
                      key={entry.kode}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-slate-900/90 border border-slate-800 text-xs"
                    >
                      <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono font-black text-[11px] shrink-0">
                        {entry.kode}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-white truncate">{entry.nama}</div>
                        {entry.nip && (
                          <div className="text-[10px] text-slate-500 font-mono truncate">NIP. {entry.nip}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 3: REKAP BEBAN TUGAS PER GURU */
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 px-3.5 text-center w-10">No</th>
                  <th className="py-3 px-3.5 text-center w-20">Kode</th>
                  <th className="py-3 px-3.5">Nama Pengawas</th>
                  <th className="py-3 px-3.5">Mapel / Bagian</th>
                  <th className="py-3 px-3.5 text-center">Total Sesi</th>
                  <th className="py-3 px-3.5 text-center">Hadir / Selesai</th>
                  <th className="py-3 px-3.5">Ruang Ditugaskan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {teacherSummary.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-slate-500">
                      Belum ada data rekap beban tugas pengawas.
                    </td>
                  </tr>
                ) : (
                  teacherSummary.map((row, idx) => (
                    <tr key={row.nama} className="hover:bg-slate-900/60">
                      <td className="py-3 px-3.5 text-center text-slate-400 font-mono">{idx + 1}</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-mono font-black text-[11px]">
                          {row.kode}
                        </span>
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="font-bold text-white">{row.nama}</div>
                        {row.nip && row.nip !== '-' && (
                          <div className="text-[10px] text-slate-500 font-mono">NIP. {row.nip}</div>
                        )}
                      </td>
                      <td className="py-3 px-3.5 text-slate-300">{row.mapel}</td>
                      <td className="py-3 px-3.5 text-center">
                        <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 border border-sky-500/30 text-sky-300 font-black tabular-nums">
                          {row.totalSesi} Sesi
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-center tabular-nums">
                        <span className="text-emerald-400 font-bold">{row.hadirCount}</span>
                        <span className="text-slate-500"> / {row.totalSesi}</span>
                        {row.digantikanCount > 0 && (
                          <span className="ml-1.5 text-[10px] text-amber-400">
                            ({row.digantikanCount} diganti)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <div className="flex flex-wrap gap-1">
                          {Array.from(row.rooms)
                            .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
                            .map(rm => (
                              <span
                                key={rm}
                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-semibold"
                              >
                                {rm}
                              </span>
                            ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: ADD / EDIT PENGAWAS */}
      {showFormModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UserCheck className="w-4 h-4 text-sky-400" />
                <span>{editingId ? 'Edit Jadwal Pengawas Ujian' : 'Tambah Jadwal Pengawas Ujian'}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowFormModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveForm} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              {/* Quick-fill from Jadwal Ujian */}
              {uniqueExamSessions.length > 0 && (
                <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-1.5">
                  <label className="block text-[11px] font-bold text-sky-300">
                    Isi Cepat dari Jadwal Ujian Terdaftar (Opsional)
                  </label>
                  <select
                    defaultValue=""
                    onChange={e => {
                      const found = uniqueExamSessions.find(s => s.key === e.target.value);
                      if (!found) return;
                      setFormState(prev => ({
                        ...prev,
                        tanggal: found.tanggal,
                        sesi: found.sesi,
                        jamMulai: found.jamMulai,
                        jamSelesai: found.jamSelesai,
                        mataPelajaran: found.mataPelajaran
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tanggal Ujian *</label>
                  <input
                    type="date"
                    required
                    value={formState.tanggal}
                    onChange={e => setFormState(prev => ({ ...prev, tanggal: e.target.value }))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Ruang Ujian *</label>
                  <select
                    value={availableRooms.includes(formState.ruang) ? formState.ruang : '__custom__'}
                    onChange={e => {
                      if (e.target.value !== '__custom__') {
                        setFormState(prev => ({ ...prev, ruang: e.target.value }));
                      }
                    }}
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

              <div className="grid grid-cols-3 gap-3">
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
                    onChange={e => setFormState(prev => ({ ...prev, jamMulai: e.target.value }))}
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

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Mata Pelajaran</label>
                <input
                  type="text"
                  value={formState.mataPelajaran}
                  onChange={e => setFormState(prev => ({ ...prev, mataPelajaran: e.target.value }))}
                  placeholder="Contoh: Pendidikan Agama Islam & Budi Pekerti"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Pengawas *</label>
                <select
                  required
                  value={formState.pengawas1Nama}
                  onChange={e => setFormState(prev => ({ ...prev, pengawas1Nama: e.target.value }))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                >
                  <option value="">-- Pilih Guru / Staf --</option>
                  {candidates.map(c => (
                    <option key={c.id} value={c.nama}>
                      {c.nama} ({c.source}{c.mapel ? ` · ${c.mapel}` : ''})
                    </option>
                  ))}
                  {formState.pengawas1Nama &&
                    !candidates.some(c => c.nama === formState.pengawas1Nama) && (
                      <option value={formState.pengawas1Nama}>{formState.pengawas1Nama}</option>
                    )}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status Kehadiran</label>
                  <select
                    value={formState.status}
                    onChange={e =>
                      setFormState(prev => ({
                        ...prev,
                        status: e.target.value as PengawasUjianItem['status']
                      }))
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Hadir">Hadir</option>
                    <option value="Digantikan">Digantikan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>

                {formState.status === 'Digantikan' ? (
                  <div>
                    <label className="block text-xs font-semibold text-amber-300 mb-1">
                      Nama Pengawas Pengganti
                    </label>
                    <select
                      value={formState.penggantiNama}
                      onChange={e => setFormState(prev => ({ ...prev, penggantiNama: e.target.value }))}
                      className="w-full bg-slate-900 border border-amber-500/50 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">-- Pilih Pengganti --</option>
                      {candidates.map(c => (
                        <option key={c.id} value={c.nama}>
                          {c.nama} ({c.source})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Catatan (Opsional)</label>
                    <input
                      type="text"
                      value={formState.catatan}
                      onChange={e => setFormState(prev => ({ ...prev, catatan: e.target.value }))}
                      placeholder="Contoh: Bawa cadangan token / lab"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}
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
                  <span>{editingId ? 'Simpan Perubahan' : 'Simpan Pengawas'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: AUTO-GENERATE PENGAWAS */}
      {showAutoModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-slate-700/80 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Bagi Pengawas Ujian Otomatis</span>
              </div>
              <button
                type="button"
                onClick={() => setShowAutoModal(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 space-y-1 text-slate-300">
                <div className="flex items-center justify-between">
                  <span>Ruang Ujian Aktif (dari Denah):</span>
                  <strong className="text-sky-400">{denahRooms.length || availableRooms.length} Ruang</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sesi Jadwal Ujian Terdaftar:</span>
                  <strong className="text-emerald-400">{uniqueExamSessions.length || 1} Sesi</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span>Guru / Staf Tersedia:</span>
                  <strong className="text-amber-300">
                    {candidates.filter(c => autoIncludeStaf || c.source === 'Guru').length} Orang
                  </strong>
                </div>
              </div>

              {uniqueExamSessions.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    Pilih Hari Ujian ({autoSelectedDates.length} hari dipilih)
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-xl bg-slate-900 border border-slate-800">
                    {Array.from(new Set(uniqueExamSessions.map(s => s.tanggal))).map(dt => {
                      const active = autoSelectedDates.includes(dt);
                      return (
                        <button
                          key={dt}
                          type="button"
                          onClick={() =>
                            setAutoSelectedDates(prev =>
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

              <div className="space-y-2.5 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoAvoidOwnSubject}
                    onChange={e => setAutoAvoidOwnSubject(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500"
                  />
                  <span>Hindari guru mengawas mata pelajaran yang diampunya sendiri</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoIncludeStaf}
                    onChange={e => setAutoIncludeStaf(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500"
                  />
                  <span>Sertakan Staf / Tata Usaha sebagai pengawas cadangan</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer text-slate-300">
                  <input
                    type="checkbox"
                    checked={autoReplaceExisting}
                    onChange={e => setAutoReplaceExisting(e.target.checked)}
                    className="rounded border-slate-600 bg-slate-900 text-emerald-500"
                  />
                  <span>Ganti jadwal pengawas lama pada tanggal yang dipilih</span>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAutoModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRunAutoGenerate}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Buat Jadwal Otomatis</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: CLEAR ALL CONFIRMATION */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#12161f] border border-red-800/60 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 border border-red-500/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Hapus Semua Daftar Pengawas?</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Seluruh {pengawasList.length} data penugasan pengawas ujian akan dihapus dari sistem & Firebase.
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
                  persistPengawasList([]);
                  setShowClearConfirm(false);
                  showToast('Seluruh daftar pengawas ujian berhasil dihapus.');
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
