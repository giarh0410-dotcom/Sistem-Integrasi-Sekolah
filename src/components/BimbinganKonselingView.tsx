import React, { useState, useEffect, useMemo } from 'react';
import {
  HeartHandshake,
  Users,
  Calendar,
  Award,
  FileText,
  Plus,
  Search,
  Filter,
  Printer,
  CheckCircle2,
  Clock,
  Edit3,
  Trash2,
  Save,
  X,
  Download,
  ShieldAlert,
  BookOpen,
  Eye,
  RotateCcw,
  FileSpreadsheet,
  AlertCircle,
  UserCheck,
  PhoneCall,
  CalendarClock,
  FileDown,
  Loader2,
} from 'lucide-react';
import { Siswa, SchoolSettings, Role, RombelKelas, Guru } from '../types/school';
import {
  dbFetchCollection,
  dbSaveCollection,
  dbSaveItem,
  dbDeleteItem,
} from '../lib/firebaseSync';
import {
  downloadRekapKonselingPdf,
  downloadBeritaAcaraKonselingPdf,
} from '../lib/bkKonselingPdf';
import { safeSetStorageJson } from '../utils/safeStorage';

export type JenisBimbinganBK =
  | 'Akademik'
  | 'Pribadi'
  | 'Sosial'
  | 'Karir'
  | 'Pelanggaran Kedisiplinan';

export type StatusKonselingBK = 'Selesai' | 'Dalam Penanganan' | 'Rujukan';

export type MetodeLayananBK =
  | 'Tatap Muka Individu'
  | 'Konseling Kelompok'
  | 'Panggilan Orang Tua'
  | 'Home Visit'
  | 'Konsultasi Wali Kelas';

export type PrioritasKonselingBK = 'Normal' | 'Perlu Pantauan' | 'Prioritas Tinggi';

export interface KonselingRecord {
  id: string;
  nomorBeritaAcara?: string;
  siswaId: string;
  nisn?: string;
  namaSiswa: string;
  kelas: string;
  jenisBimbingan: JenisBimbinganBK;
  metodeLayanan?: MetodeLayananBK;
  tanggal: string;
  jamSesi?: string;
  guruBk: string;
  permasalahan: string;
  hasilKonseling: string;
  tindakLanjut: string;
  jadwalEvaluasi?: string;
  melibatkanOrangTua?: boolean;
  catatanOrangTua?: string;
  prioritas?: PrioritasKonselingBK;
  status: StatusKonselingBK;
  poinPelanggaran?: number;
  updatedAt?: string;
}

export interface JadwalTemuBK {
  id: string;
  siswaId?: string;
  namaSiswa: string;
  kelas: string;
  tanggal: string;
  jam: string;
  keperluan: string;
  status: 'Dijadwalkan' | 'Selesai' | 'Dibatalkan';
}

interface BimbinganKonselingViewProps {
  siswaList: Siswa[];
  rombelList?: RombelKelas[];
  guruList?: Guru[];
  schoolSettings?: SchoolSettings;
  currentRole?: Role;
  subTab?: 'catatan' | 'janji' | 'pelanggaran' | 'karir';
  setSubTab?: (subTab: 'catatan' | 'janji' | 'pelanggaran' | 'karir') => void;
}

const KONSELING_STORAGE_KEY = 'edu_bk_konseling_list';
const KONSELING_COLLECTION = 'edu_bkKonselingList';
const APPOINTMENT_STORAGE_KEY = 'edu_bk_appointment_list';
const APPOINTMENT_COLLECTION = 'edu_bkJanjiTemuList';

const LEGACY_SMA_KONSELING_IDS = new Set(['bk-1', 'bk-2', 'bk-3']);
const LEGACY_SMA_CLASSES = new Set(['X-A', 'X-B', 'XI-IPA-1', 'XII-IPS-2', 'XII-IPA-2']);
const LEGACY_SMA_APT_IDS = new Set(['apt-1', 'apt-2']);

function stripLegacySmaKonseling(list: KonselingRecord[]): KonselingRecord[] {
  return list.filter((item) => {
    const isLegacySeed =
      LEGACY_SMA_KONSELING_IDS.has(item.id) &&
      LEGACY_SMA_CLASSES.has(item.kelas) &&
      item.guruBk === 'Dra. Hj. Nurul Hidayah, M.Pd.';
    return !isLegacySeed;
  });
}

function stripLegacySmaAppointments(list: JadwalTemuBK[]): JadwalTemuBK[] {
  return list.filter((item) => {
    const isLegacySeed =
      LEGACY_SMA_APT_IDS.has(item.id) && LEGACY_SMA_CLASSES.has(item.kelas);
    return !isLegacySeed;
  });
}

function escapeHtml(text?: string | number | null): string {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTanggalIndo(dateStr?: string): string {
  if (!dateStr) return '-';
  const parsed = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function generateNomorBeritaAcara(tanggal: string, sequence: number): string {
  const parts = (tanggal || new Date().toISOString().split('T')[0]).split('-');
  const tahun = parts[0] || String(new Date().getFullYear());
  const bulan = parts[1] || String(new Date().getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(3, '0');
  return `BK/${tahun}/${bulan}/${seq}`;
}

function isValidStudentName(name?: string | null): boolean {
  const cleaned = String(name ?? '').trim();
  if (cleaned.length < 2) return false;
  // Reject numeric-only codes (e.g. "25260056") or values without alphabetic letters
  if (/^[\d\s\-_./]+$/.test(cleaned)) return false;
  const letterCount = (cleaned.match(/[a-zA-Z\u00C0-\u024F]/g) || []).length;
  return letterCount >= 2;
}

function getCleanNisn(s?: Siswa | null): string {
  if (!s) return '';
  const candidates = [s.nisn, s.nis];
  for (const val of candidates) {
    const cleaned = String(val ?? '').trim();
    if (/^\d{4,18}$/.test(cleaned)) return cleaned;
  }
  return '';
}

function getCleanWaliName(s?: Siswa | null): string {
  if (!s) return '-';
  const candidates = [s.namaAyah, s.namaIbu, s.namaWali];
  for (const val of candidates) {
    const cleaned = String(val ?? '').trim();
    if (!cleaned || cleaned === '-') continue;
    // Skip obvious school names or numeric-only values from shifted imports
    if (/^(sd|sdn|sdit|mi|min|smp|mts|tk|paud)\b/i.test(cleaned)) continue;
    if (/^[\d\s\-_./]+$/.test(cleaned)) continue;
    return cleaned;
  }
  return '-';
}

function getCleanWaliPhone(s?: Siswa | null): string {
  if (!s) return '';
  const candidates = [s.teleponWali, s.teleponAyah, s.teleponIbu];
  for (const val of candidates) {
    const cleaned = String(val ?? '').trim();
    const digits = cleaned.replace(/\D/g, '');
    if (digits.length >= 7) return cleaned;
  }
  return '';
}

function normalizeClassMatch(cls?: string | null): string {
  return String(cls ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const BimbinganKonselingView: React.FC<BimbinganKonselingViewProps> = ({
  siswaList,
  rombelList = [],
  guruList = [],
  schoolSettings,
  subTab,
}) => {
  const [konselingList, setKonselingList] = useState<KonselingRecord[]>(() => {
    try {
      const saved = localStorage.getItem(KONSELING_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const cleaned = stripLegacySmaKonseling(parsed);
      if (cleaned.length !== parsed.length) {
        safeSetStorageJson(KONSELING_STORAGE_KEY, cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  });

  const [appointmentList, setAppointmentList] = useState<JadwalTemuBK[]>(() => {
    try {
      const saved = localStorage.getItem(APPOINTMENT_STORAGE_KEY);
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      const cleaned = stripLegacySmaAppointments(parsed);
      if (cleaned.length !== parsed.length) {
        safeSetStorageJson(APPOINTMENT_STORAGE_KEY, cleaned);
      }
      return cleaned;
    } catch {
      return [];
    }
  });

  const [internalActiveTab] = useState<'catatan' | 'janji' | 'pelanggaran' | 'karir'>('catatan');
  const activeTab = subTab || internalActiveTab;

  // Filter & Search States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState<string>('Semua');
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');

  // Toast Notification & Form Error State
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Add / Edit Konseling Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<KonselingRecord | null>(null);
  const [modalKelasFilter, setModalKelasFilter] = useState<string>('Semua');
  const [modalSiswaSearch, setModalSiswaSearch] = useState<string>('');
  const [isManualStudentMode, setIsManualStudentMode] = useState(false);
  const [isPickingStudent, setIsPickingStudent] = useState(true);
  const [formData, setFormData] = useState<Partial<KonselingRecord>>({});

  // Detail / Berita Acara Preview Modal State
  const [detailModalRecord, setDetailModalRecord] = useState<KonselingRecord | null>(null);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Confirmation Delete Modal State
  const [confirmDeleteRecord, setConfirmDeleteRecord] = useState<KonselingRecord | null>(null);

  // Add Appointment Modal State (replaces window.prompt)
  const [isAptModalOpen, setIsAptModalOpen] = useState(false);
  const [aptKelasFilter, setAptKelasFilter] = useState<string>('Semua');
  const [aptForm, setAptForm] = useState<Partial<JadwalTemuBK>>({
    namaSiswa: '',
    kelas: '',
    tanggal: new Date().toISOString().split('T')[0],
    jam: '09:30',
    keperluan: '',
    status: 'Dijadwalkan',
  });
  const [aptError, setAptError] = useState<string | null>(null);

  // Auto dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  // Load & sync from Firestore on mount
  useEffect(() => {
    let mounted = true;
    const loadRemote = async () => {
      try {
        const [remoteKonseling, remoteApt] = await Promise.all([
          dbFetchCollection<KonselingRecord>(KONSELING_COLLECTION),
          dbFetchCollection<JadwalTemuBK>(APPOINTMENT_COLLECTION),
        ]);

        if (!mounted) return;

        if (remoteKonseling && remoteKonseling.length > 0) {
          const cleaned = stripLegacySmaKonseling(remoteKonseling).sort((a, b) =>
            (b.tanggal || '').localeCompare(a.tanggal || '')
          );
          setKonselingList(cleaned);
          safeSetStorageJson(KONSELING_STORAGE_KEY, cleaned);
        }

        if (remoteApt && remoteApt.length > 0) {
          const cleanedApt = stripLegacySmaAppointments(remoteApt).sort((a, b) =>
            (b.tanggal || '').localeCompare(a.tanggal || '')
          );
          setAppointmentList(cleanedApt);
          safeSetStorageJson(APPOINTMENT_STORAGE_KEY, cleanedApt);
        }
      } catch (err) {
        console.warn('Sinkronisasi awal BK dari Firestore menggunakan cache lokal:', err);
      }
    };
    loadRemote();
    return () => {
      mounted = false;
    };
  }, []);

  // Derive real school lists (filtering out shifted/corrupted numeric-only student rows)
  const activeSiswaList = useMemo(() => {
    const validNamed = siswaList.filter((s) => isValidStudentName(s.nama));
    const basePool = validNamed.length > 0 ? validNamed : siswaList;
    const active = basePool.filter((s) => !s.status || s.status === 'Aktif');
    const source = active.length > 0 ? active : basePool;
    return [...source].sort((a, b) => {
      const clsCmp = (a.kelas || '').localeCompare(b.kelas || '', 'id', { numeric: true });
      if (clsCmp !== 0) return clsCmp;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });
  }, [siswaList]);

  const availableClasses = useMemo(() => {
    const classSet = new Set<string>();
    rombelList.forEach((r) => {
      if (r.namaRombel?.trim()) classSet.add(r.namaRombel.trim());
    });
    activeSiswaList.forEach((s) => {
      if (s.kelas?.trim()) classSet.add(s.kelas.trim());
    });
    konselingList.forEach((k) => {
      if (k.kelas?.trim()) classSet.add(k.kelas.trim());
    });
    return Array.from(classSet).sort((a, b) =>
      a.localeCompare(b, 'id', { numeric: true, sensitivity: 'base' })
    );
  }, [rombelList, activeSiswaList, konselingList]);

  const sortedGuruList = useMemo(() => {
    return [...guruList].sort((a, b) => {
      const aIsBk = `${a.jabatan || ''} ${a.mataPelajaran || ''}`.toLowerCase();
      const bIsBk = `${b.jabatan || ''} ${b.mataPelajaran || ''}`.toLowerCase();
      const aMatch = aIsBk.includes('bk') || aIsBk.includes('konseling') || aIsBk.includes('bimbingan');
      const bMatch = bIsBk.includes('bk') || bIsBk.includes('konseling') || bIsBk.includes('bimbingan');
      if (aMatch && !bMatch) return -1;
      if (!aMatch && bMatch) return 1;
      return (a.nama || '').localeCompare(b.nama || '', 'id');
    });
  }, [guruList]);

  const defaultGuruBk = useMemo(() => {
    const bkTeacher = sortedGuruList.find((g) => {
      const label = `${g.jabatan || ''} ${g.mataPelajaran || ''}`.toLowerCase();
      return label.includes('bk') || label.includes('konseling') || label.includes('bimbingan');
    });
    return bkTeacher?.nama || sortedGuruList[0]?.nama || 'Guru BK';
  }, [sortedGuruList]);

  const principalInfo = useMemo(() => {
    const foundPrincipal = guruList.find((g) =>
      (g.jabatan || '').toLowerCase().includes('kepala sekolah')
    );
    return {
      nama: schoolSettings?.kepalaSekolah || foundPrincipal?.nama || 'Kepala Sekolah',
      nip: schoolSettings?.nipKepalaSekolah || foundPrincipal?.nip || '-',
    };
  }, [schoolSettings, guruList]);

  const modalFilteredSiswa = useMemo(() => {
    const q = modalSiswaSearch.trim().toLowerCase();
    const filterNorm = normalizeClassMatch(modalKelasFilter);
    return activeSiswaList.filter((s) => {
      const matchKelas =
        modalKelasFilter === 'Semua' ||
        s.kelas === modalKelasFilter ||
        (filterNorm.length > 0 && normalizeClassMatch(s.kelas).includes(filterNorm));
      const matchQuery =
        !q ||
        (s.nama || '').toLowerCase().includes(q) ||
        getCleanNisn(s).toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q) ||
        (s.kelas || '').toLowerCase().includes(q);
      return matchKelas && matchQuery;
    });
  }, [activeSiswaList, modalKelasFilter, modalSiswaSearch]);

  // Cross-class fallback when user searches a student name that belongs to another class
  const modalCrossClassMatches = useMemo(() => {
    const q = modalSiswaSearch.trim().toLowerCase();
    if (!q || modalKelasFilter === 'Semua' || modalFilteredSiswa.length > 0) return [];
    return activeSiswaList.filter(
      (s) =>
        (s.nama || '').toLowerCase().includes(q) ||
        getCleanNisn(s).toLowerCase().includes(q) ||
        (s.nis || '').toLowerCase().includes(q) ||
        (s.kelas || '').toLowerCase().includes(q)
    );
  }, [activeSiswaList, modalKelasFilter, modalSiswaSearch, modalFilteredSiswa.length]);

  const selectedFormSiswa = useMemo(() => {
    if (!formData.siswaId && !formData.namaSiswa) return null;
    return (
      activeSiswaList.find((s) => s.id === formData.siswaId) ||
      activeSiswaList.find(
        (s) => s.nama.trim().toLowerCase() === (formData.namaSiswa || '').trim().toLowerCase()
      ) ||
      null
    );
  }, [activeSiswaList, formData.siswaId, formData.namaSiswa]);

  const persistKonseling = async (
    updatedList: KonselingRecord[],
    changedItem?: KonselingRecord,
    deletedId?: string
  ) => {
    setKonselingList(updatedList);
    safeSetStorageJson(KONSELING_STORAGE_KEY, updatedList);
    try {
      if (deletedId) {
        await dbDeleteItem(KONSELING_COLLECTION, deletedId);
      } else if (changedItem) {
        await dbSaveItem(KONSELING_COLLECTION, changedItem);
      } else {
        await dbSaveCollection(KONSELING_COLLECTION, updatedList);
      }
    } catch (err) {
      console.warn('Gagal menyinkronkan data BK ke Firestore:', err);
    }
  };

  const persistAppointments = async (
    updatedList: JadwalTemuBK[],
    changedItem?: JadwalTemuBK,
    deletedId?: string
  ) => {
    setAppointmentList(updatedList);
    safeSetStorageJson(APPOINTMENT_STORAGE_KEY, updatedList);
    try {
      if (deletedId) {
        await dbDeleteItem(APPOINTMENT_COLLECTION, deletedId);
      } else if (changedItem) {
        await dbSaveItem(APPOINTMENT_COLLECTION, changedItem);
      } else {
        await dbSaveCollection(APPOINTMENT_COLLECTION, updatedList);
      }
    } catch (err) {
      console.warn('Gagal menyinkronkan janji temu BK ke Firestore:', err);
    }
  };

  const handleOpenAdd = (presetJenis: JenisBimbinganBK = 'Akademik') => {
    setSelectedRecord(null);
    setFormError(null);
    setModalKelasFilter('Semua');
    setModalSiswaSearch('');
    setIsManualStudentMode(false);
    setIsPickingStudent(true);
    setFormData({
      siswaId: '',
      nisn: '',
      namaSiswa: '',
      kelas: '',
      jenisBimbingan: presetJenis,
      metodeLayanan: 'Tatap Muka Individu',
      tanggal: new Date().toISOString().split('T')[0],
      jamSesi: '09:00',
      guruBk: defaultGuruBk,
      permasalahan: '',
      hasilKonseling: '',
      tindakLanjut: presetJenis === 'Pelanggaran Kedisiplinan' ? 'Pembinaan lisan & perjanjian kedisiplinan' : '',
      jadwalEvaluasi: '',
      melibatkanOrangTua: false,
      catatanOrangTua: '',
      prioritas: presetJenis === 'Pelanggaran Kedisiplinan' ? 'Perlu Pantauan' : 'Normal',
      status: 'Dalam Penanganan',
      poinPelanggaran: presetJenis === 'Pelanggaran Kedisiplinan' ? 10 : 0,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: KonselingRecord) => {
    setSelectedRecord(rec);
    setFormError(null);
    setModalKelasFilter('Semua');
    setModalSiswaSearch('');
    setIsManualStudentMode(false);
    setIsPickingStudent(false);
    setFormData({
      ...rec,
      metodeLayanan: rec.metodeLayanan || 'Tatap Muka Individu',
      jamSesi: rec.jamSesi || '09:00',
      prioritas: rec.prioritas || 'Normal',
      poinPelanggaran: rec.poinPelanggaran || 0,
    });
    setIsModalOpen(true);
  };

  const handleSelectStudentFromDb = (s: Siswa) => {
    setFormData((prev) => ({
      ...prev,
      siswaId: s.id || '',
      nisn: getCleanNisn(s),
      namaSiswa: s.nama.trim(),
      kelas: s.kelas || prev.kelas || availableClasses[0] || '',
    }));
    setModalSiswaSearch('');
    setIsManualStudentMode(false);
    setIsPickingStudent(false);
    setFormError(null);
  };

  const handleConfirmDelete = async () => {
    if (!confirmDeleteRecord) return;
    const target = confirmDeleteRecord;
    const updated = konselingList.filter((item) => item.id !== target.id);
    await persistKonseling(updated, undefined, target.id);
    if (detailModalRecord?.id === target.id) {
      setDetailModalRecord(null);
    }
    setConfirmDeleteRecord(null);
    setToast({
      type: 'success',
      message: `Catatan sesi konseling ${target.namaSiswa} berhasil dihapus.`,
    });
  };

  const handleQuickStatusChange = async (rec: KonselingRecord, newStatus: StatusKonselingBK) => {
    if (rec.status === newStatus) return;
    const updatedRec: KonselingRecord = {
      ...rec,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };
    const updatedList = konselingList.map((item) => (item.id === rec.id ? updatedRec : item));
    await persistKonseling(updatedList, updatedRec);
    if (detailModalRecord?.id === rec.id) {
      setDetailModalRecord(updatedRec);
    }
    setToast({
      type: 'success',
      message: `Status kasus ${rec.namaSiswa} diperbarui menjadi "${newStatus}".`,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.namaSiswa?.trim()) {
      setFormError('Silakan pilih nama siswa terlebih dahulu.');
      return;
    }
    if (!formData.kelas?.trim()) {
      setFormError('Kelas siswa wajib ditentukan.');
      return;
    }
    if (!formData.permasalahan?.trim()) {
      setFormError('Uraian permasalahan / kendala siswa wajib diisi.');
      return;
    }

    const matchedSiswa =
      siswaList.find((s) => s.id === formData.siswaId) ||
      siswaList.find((s) => s.nama === formData.namaSiswa);

    const tanggalVal = formData.tanggal || new Date().toISOString().split('T')[0];
    const poinVal =
      formData.jenisBimbingan === 'Pelanggaran Kedisiplinan'
        ? Math.max(0, Math.min(100, Number(formData.poinPelanggaran) || 0))
        : 0;

    if (selectedRecord) {
      const updatedRec: KonselingRecord = {
        ...selectedRecord,
        siswaId: matchedSiswa?.id || formData.siswaId || selectedRecord.siswaId,
        nisn: getCleanNisn(matchedSiswa) || formData.nisn || selectedRecord.nisn || '',
        namaSiswa: formData.namaSiswa.trim(),
        kelas: formData.kelas.trim(),
        jenisBimbingan: (formData.jenisBimbingan as JenisBimbinganBK) || 'Akademik',
        metodeLayanan: (formData.metodeLayanan as MetodeLayananBK) || 'Tatap Muka Individu',
        tanggal: tanggalVal,
        jamSesi: formData.jamSesi || '09:00',
        guruBk: (formData.guruBk || defaultGuruBk).trim(),
        permasalahan: formData.permasalahan.trim(),
        hasilKonseling: (formData.hasilKonseling || '').trim(),
        tindakLanjut: (formData.tindakLanjut || '').trim(),
        jadwalEvaluasi: formData.jadwalEvaluasi || '',
        melibatkanOrangTua: Boolean(formData.melibatkanOrangTua),
        catatanOrangTua: (formData.catatanOrangTua || '').trim(),
        prioritas: (formData.prioritas as PrioritasKonselingBK) || 'Normal',
        status: (formData.status as StatusKonselingBK) || 'Dalam Penanganan',
        poinPelanggaran: poinVal,
        nomorBeritaAcara:
          selectedRecord.nomorBeritaAcara ||
          generateNomorBeritaAcara(tanggalVal, konselingList.length + 1),
        updatedAt: new Date().toISOString(),
      };
      const updatedList = konselingList.map((item) =>
        item.id === selectedRecord.id ? updatedRec : item
      );
      await persistKonseling(updatedList, updatedRec);
      if (detailModalRecord?.id === updatedRec.id) {
        setDetailModalRecord(updatedRec);
      }
      setToast({
        type: 'success',
        message: `Catatan sesi konseling ${updatedRec.namaSiswa} berhasil diperbarui.`,
      });
    } else {
      const newRec: KonselingRecord = {
        id: `bk-${Date.now()}`,
        nomorBeritaAcara: generateNomorBeritaAcara(tanggalVal, konselingList.length + 1),
        siswaId: matchedSiswa?.id || `s-${Date.now()}`,
        nisn: getCleanNisn(matchedSiswa) || formData.nisn || '',
        namaSiswa: formData.namaSiswa.trim(),
        kelas: formData.kelas.trim(),
        jenisBimbingan: (formData.jenisBimbingan as JenisBimbinganBK) || 'Akademik',
        metodeLayanan: (formData.metodeLayanan as MetodeLayananBK) || 'Tatap Muka Individu',
        tanggal: tanggalVal,
        jamSesi: formData.jamSesi || '09:00',
        guruBk: (formData.guruBk || defaultGuruBk).trim(),
        permasalahan: formData.permasalahan.trim(),
        hasilKonseling: (formData.hasilKonseling || '').trim(),
        tindakLanjut: (formData.tindakLanjut || '').trim(),
        jadwalEvaluasi: formData.jadwalEvaluasi || '',
        melibatkanOrangTua: Boolean(formData.melibatkanOrangTua),
        catatanOrangTua: (formData.catatanOrangTua || '').trim(),
        prioritas: (formData.prioritas as PrioritasKonselingBK) || 'Normal',
        status: (formData.status as StatusKonselingBK) || 'Dalam Penanganan',
        poinPelanggaran: poinVal,
        updatedAt: new Date().toISOString(),
      };
      await persistKonseling([newRec, ...konselingList], newRec);
      setToast({
        type: 'success',
        message: `Sesi konseling baru untuk ${newRec.namaSiswa} berhasil disimpan.`,
      });
    }
    setIsModalOpen(false);
  };

  // Filtered records
  const filteredKonseling = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return konselingList.filter((item) => {
      const matchSearch =
        !q ||
        item.namaSiswa.toLowerCase().includes(q) ||
        (item.nisn || '').toLowerCase().includes(q) ||
        item.kelas.toLowerCase().includes(q) ||
        item.permasalahan.toLowerCase().includes(q) ||
        (item.tindakLanjut || '').toLowerCase().includes(q) ||
        item.guruBk.toLowerCase().includes(q) ||
        (item.nomorBeritaAcara || '').toLowerCase().includes(q);
      const matchCat = filterKategori === 'Semua' || item.jenisBimbingan === filterKategori;
      const matchKelas = filterKelas === 'Semua' || item.kelas === filterKelas;
      const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
      return matchSearch && matchCat && matchKelas && matchStatus;
    });
  }, [konselingList, searchTerm, filterKategori, filterKelas, filterStatus]);

  const hasActiveFilter =
    searchTerm.trim() !== '' ||
    filterKategori !== 'Semua' ||
    filterKelas !== 'Semua' ||
    filterStatus !== 'Semua';

  const resetFilters = () => {
    setSearchTerm('');
    setFilterKategori('Semua');
    setFilterKelas('Semua');
    setFilterStatus('Semua');
  };

  // Stats
  const totalKasus = konselingList.length;
  const kasusSelesai = konselingList.filter((k) => k.status === 'Selesai').length;
  const kasusPenanganan = konselingList.filter((k) => k.status === 'Dalam Penanganan').length;
  const kasusRujukan = konselingList.filter((k) => k.status === 'Rujukan').length;
  const totalPoinPelanggaran = konselingList.reduce(
    (acc, curr) => acc + (curr.poinPelanggaran || 0),
    0
  );

  // Build clean formal HTML for single Berita Acara (Print & .DOC)
  const buildBeritaAcaraHtml = (rec: KonselingRecord, forWord = false) => {
    const schoolName = schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR';
    const schoolAddress =
      schoolSettings?.alamat || 'Jl. Raya Sawangan No. 45, Depok, Jawa Barat';
    const schoolPhone = schoolSettings?.telepon || '(021) 77889922';
    const schoolEmail = schoolSettings?.email || 'info@alfakhir.sch.id';
    const nomorBa = rec.nomorBeritaAcara || generateNomorBeritaAcara(rec.tanggal, 1);
    const siswaData =
      siswaList.find((s) => s.id === rec.siswaId) ||
      siswaList.find((s) => s.nama === rec.namaSiswa);
    const guruData = guruList.find((g) => g.nama === rec.guruBk);
    const nisnVal = rec.nisn || getCleanNisn(siswaData) || '-';
    const waliVal = getCleanWaliName(siswaData);

    return `<!DOCTYPE html>
<html${forWord ? " xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'" : ''}>
<head>
  <meta charset="utf-8" />
  <title>Berita Acara Konseling - ${escapeHtml(rec.namaSiswa)}</title>
  <style>
    @page { size: A4; margin: 18mm 20mm; }
    body { font-family: 'Arial', 'Helvetica Neue', sans-serif; color: #0f172a; background: #ffffff; font-size: 10.5pt; line-height: 1.55; margin: 0; padding: 0; }
    .kop { text-align: center; border-bottom: 3.5px double #0f766e; padding-bottom: 10px; margin-bottom: 18px; }
    .kop h1 { margin: 0; font-size: 15pt; font-weight: 800; text-transform: uppercase; letter-spacing: 0.6px; color: #0f766e; }
    .kop p { margin: 2px 0 0 0; font-size: 9pt; color: #475569; }
    .title-block { text-align: center; margin-bottom: 16px; }
    .title-block h2 { margin: 0; font-size: 12.5pt; font-weight: 800; text-transform: uppercase; text-decoration: underline; color: #0f172a; }
    .title-block .nomor { margin-top: 3px; font-size: 9.5pt; color: #334155; font-weight: 600; }
    .meta-table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 9.8pt; }
    .meta-table td { border: 1px solid #cbd5e1; padding: 6px 10px; vertical-align: top; }
    .meta-table td.lbl { width: 22%; background: #f8fafc; font-weight: 700; color: #334155; }
    .meta-table td.val { width: 28%; color: #0f172a; }
    .section { margin-bottom: 13px; page-break-inside: avoid; }
    .section-title { font-size: 10pt; font-weight: 800; text-transform: uppercase; color: #0f766e; background: #f0fdfa; border: 1px solid #99f6e4; border-left: 4px solid #0f766e; padding: 5px 10px; margin-bottom: 0; }
    .section-body { border: 1px solid #cbd5e1; border-top: none; padding: 10px 12px; background: #ffffff; text-align: justify; white-space: pre-line; }
    .badge-poin { display: inline-block; padding: 2px 8px; background: #ffe4e6; color: #be123c; border: 1px solid #fda4af; border-radius: 4px; font-weight: 700; font-size: 9pt; }
    .sig-table { width: 100%; border-collapse: collapse; margin-top: 28px; page-break-inside: avoid; }
    .sig-table td { width: 50%; text-align: center; vertical-align: top; padding: 6px 12px; border: none; font-size: 10pt; }
    .sig-space { height: 62px; }
    .sig-name { font-weight: 700; text-decoration: underline; color: #0f172a; }
    .sig-nip { font-size: 9pt; color: #475569; margin-top: 2px; }
    .principal-box { text-align: center; margin-top: 22px; page-break-inside: avoid; font-size: 10pt; }
    .confidential { margin-top: 20px; border-top: 1px dashed #cbd5e1; padding-top: 8px; font-size: 8.5pt; color: #64748b; text-align: center; font-style: italic; }
  </style>
</head>
<body>
  <div class="kop">
    <h1>${escapeHtml(schoolName)}</h1>
    <p>${escapeHtml(schoolAddress)}</p>
    <p>Telp: ${escapeHtml(schoolPhone)} &bull; Email: ${escapeHtml(schoolEmail)}</p>
  </div>

  <div class="title-block">
    <h2>BERITA ACARA LAYANAN BIMBINGAN KONSELING</h2>
    <div class="nomor">Nomor: ${escapeHtml(nomorBa)}</div>
  </div>

  <table class="meta-table">
    <tr>
      <td class="lbl">Nama Peserta Didik</td>
      <td class="val"><b>${escapeHtml(rec.namaSiswa)}</b></td>
      <td class="lbl">Tanggal &amp; Jam Sesi</td>
      <td class="val">${escapeHtml(formatTanggalIndo(rec.tanggal))}${rec.jamSesi ? ` (${escapeHtml(rec.jamSesi)} WIB)` : ''}</td>
    </tr>
    <tr>
      <td class="lbl">NISN / NIS</td>
      <td class="val">${escapeHtml(nisnVal)}</td>
      <td class="lbl">Jenis Bimbingan</td>
      <td class="val"><b>${escapeHtml(rec.jenisBimbingan)}</b></td>
    </tr>
    <tr>
      <td class="lbl">Kelas / Rombel</td>
      <td class="val">Kelas ${escapeHtml(rec.kelas)}</td>
      <td class="lbl">Metode Layanan</td>
      <td class="val">${escapeHtml(rec.metodeLayanan || 'Tatap Muka Individu')}</td>
    </tr>
    <tr>
      <td class="lbl">Guru BK / Konselor</td>
      <td class="val">${escapeHtml(rec.guruBk)}</td>
      <td class="lbl">Status Penanganan</td>
      <td class="val"><b>${escapeHtml(rec.status)}</b>${rec.poinPelanggaran && rec.poinPelanggaran > 0 ? ` &nbsp;<span class="badge-poin">${rec.poinPelanggaran} Poin</span>` : ''}</td>
    </tr>
    ${rec.jadwalEvaluasi || rec.melibatkanOrangTua ? `
    <tr>
      <td class="lbl">Jadwal Evaluasi</td>
      <td class="val">${rec.jadwalEvaluasi ? escapeHtml(formatTanggalIndo(rec.jadwalEvaluasi)) : '-'}</td>
      <td class="lbl">Koordinasi Orang Tua</td>
      <td class="val">${rec.melibatkanOrangTua ? `Ya (${escapeHtml(waliVal !== '-' ? waliVal : 'Orang Tua/Wali')})` : 'Internal Sekolah'}</td>
    </tr>` : ''}
  </table>

  <div class="section">
    <div class="section-title">I. Uraian Permasalahan / Topik Konseling</div>
    <div class="section-body">${escapeHtml(rec.permasalahan || '-')}</div>
  </div>

  <div class="section">
    <div class="section-title">II. Hasil Analisis &amp; Wawancara Konseling</div>
    <div class="section-body">${escapeHtml(rec.hasilKonseling || '-')}</div>
  </div>

  <div class="section">
    <div class="section-title">III. Tindak Lanjut &amp; Rekomendasi Pembinaan</div>
    <div class="section-body">${escapeHtml(rec.tindakLanjut || '-')}${rec.melibatkanOrangTua && rec.catatanOrangTua ? `\n\nCatatan Koordinasi Orang Tua/Wali:\n${escapeHtml(rec.catatanOrangTua)}` : ''}</div>
  </div>

  <table class="sig-table">
    <tr>
      <td>
        <div>Peserta Didik Yang Bersangkutan,</div>
        <div class="sig-space"></div>
        <div class="sig-name">${escapeHtml(rec.namaSiswa)}</div>
        <div class="sig-nip">Kelas ${escapeHtml(rec.kelas)}</div>
      </td>
      <td>
        <div>Depok, ${escapeHtml(formatTanggalIndo(rec.tanggal))}</div>
        <div>Konselor / Guru Bimbingan Konseling,</div>
        <div class="sig-space"></div>
        <div class="sig-name">${escapeHtml(rec.guruBk)}</div>
        <div class="sig-nip">NIP. ${escapeHtml(guruData?.nip || '-')}</div>
      </td>
    </tr>
  </table>

  <div class="principal-box">
    <div>Mengetahui,</div>
    <div><b>Kepala ${escapeHtml(schoolName)}</b></div>
    <div class="sig-space"></div>
    <div class="sig-name">${escapeHtml(principalInfo.nama)}</div>
    <div class="sig-nip">NIP. ${escapeHtml(principalInfo.nip)}</div>
  </div>

  <div class="confidential">
    Dokumen ini bersifat rahasia (konfidensial) dan hanya digunakan untuk kepentingan pembinaan peserta didik di Unit Bimbingan Konseling ${escapeHtml(schoolName)}.
  </div>
</body>
</html>`;
  };

  // Print helper using hidden iframe (works reliably inside iframe without window.open)
  const printHtmlViaIframe = (html: string) => {
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
    if (!frameDoc) {
      document.body.removeChild(iframe);
      setToast({ type: 'error', message: 'Gagal menyiapkan halaman cetak.' });
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } finally {
        setTimeout(() => {
          if (document.body.contains(iframe)) {
            document.body.removeChild(iframe);
          }
        }, 1200);
      }
    }, 350);
  };

  const handlePrintRecord = (rec: KonselingRecord) => {
    printHtmlViaIframe(buildBeritaAcaraHtml(rec, false));
  };

  const handleDownloadDoc = (rec: KonselingRecord) => {
    const htmlContent = buildBeritaAcaraHtml(rec, true);
    const blob = new Blob(['\ufeff', htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeName = rec.namaSiswa.replace(/[^a-zA-Z0-9_-]/g, '_');
    a.download = `Berita_Acara_BK_${safeName}_${rec.tanggal}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadRecordPdf = async (rec: KonselingRecord) => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await downloadBeritaAcaraKonselingPdf({
        record: rec,
        schoolSettings,
        principalNama: principalInfo.nama,
        principalNip: principalInfo.nip,
        koordinatorBkNama: defaultGuruBk,
        siswaList,
        guruList,
      });
      setToast({
        type: 'success',
        message: `Berita Acara PDF untuk ${rec.namaSiswa} berhasil diunduh.`,
      });
    } catch (err) {
      console.error('Gagal membuat PDF Berita Acara BK:', err);
      setToast({
        type: 'error',
        message: 'Gagal membuat file PDF Berita Acara Konseling.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadRekapPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await downloadRekapKonselingPdf({
        records: filteredKonseling,
        schoolSettings,
        principalNama: principalInfo.nama,
        principalNip: principalInfo.nip,
        koordinatorBkNama: defaultGuruBk,
        siswaList,
        guruList,
        filterSummary: {
          kelas: filterKelas,
          kategori: filterKategori,
          status: filterStatus,
          searchTerm,
        },
      });
      setToast({
        type: 'success',
        message:
          filteredKonseling.length > 0
            ? `Rekap PDF (${filteredKonseling.length} catatan konseling) berhasil diunduh.`
            : 'Formulir Rekap PDF Catatan Konseling BK berhasil diunduh.',
      });
    } catch (err) {
      console.error('Gagal membuat PDF Rekap BK:', err);
      setToast({
        type: 'error',
        message: 'Gagal mengunduh rekap PDF catatan konseling.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleDownloadPelanggaranPdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      const pelanggaranRecords = konselingList.filter(
        (k) => k.poinPelanggaran && k.poinPelanggaran > 0
      );
      await downloadRekapKonselingPdf({
        records: pelanggaranRecords,
        schoolSettings,
        principalNama: principalInfo.nama,
        principalNip: principalInfo.nip,
        koordinatorBkNama: defaultGuruBk,
        siswaList,
        guruList,
        filterSummary: {
          kelas: 'Semua',
          kategori: 'Pelanggaran Kedisiplinan',
          status: 'Semua',
        },
        titleOverride: 'REKAPITULASI POIN PELANGGARAN KEDISIPLINAN SISWA',
        fileName: `Rekap_Pelanggaran_BK_${new Date().toISOString().split('T')[0]}.pdf`,
      });
      setToast({
        type: 'success',
        message:
          pelanggaranRecords.length > 0
            ? `Rekap PDF Pelanggaran (${pelanggaranRecords.length} kasus) berhasil diunduh.`
            : 'Formulir Rekap PDF Pelanggaran Kedisiplinan berhasil diunduh.',
      });
    } catch (err) {
      console.error('Gagal membuat PDF Rekap Pelanggaran BK:', err);
      setToast({
        type: 'error',
        message: 'Gagal mengunduh rekap PDF pelanggaran kedisiplinan.',
      });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleExportCsv = () => {
    if (filteredKonseling.length === 0) {
      setToast({ type: 'error', message: 'Tidak ada data catatan konseling untuk diekspor.' });
      return;
    }
    const headers = [
      'No',
      'Nomor Berita Acara',
      'Tanggal',
      'Jam',
      'Nama Siswa',
      'NISN',
      'Kelas',
      'Jenis Bimbingan',
      'Metode Layanan',
      'Guru BK',
      'Permasalahan',
      'Hasil Konseling',
      'Tindak Lanjut',
      'Status',
      'Prioritas',
      'Poin Pelanggaran',
    ];
    const escapeCsv = (val: any) => `"${String(val ?? '').replace(/"/g, '""')}"`;
    const rows = filteredKonseling.map((r, idx) => [
      idx + 1,
      r.nomorBeritaAcara || '-',
      r.tanggal,
      r.jamSesi || '-',
      r.namaSiswa,
      r.nisn || '-',
      r.kelas,
      r.jenisBimbingan,
      r.metodeLayanan || 'Tatap Muka Individu',
      r.guruBk,
      r.permasalahan,
      r.hasilKonseling || '-',
      r.tindakLanjut || '-',
      r.status,
      r.prioritas || 'Normal',
      r.poinPelanggaran || 0,
    ]);
    const csvContent =
      '\ufeff' + [headers.map(escapeCsv).join(','), ...rows.map((r) => r.map(escapeCsv).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Konseling_BK_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setToast({ type: 'success', message: `${filteredKonseling.length} catatan konseling diekspor ke CSV.` });
  };

  const handlePrintRekap = () => {
    if (filteredKonseling.length === 0) {
      setToast({ type: 'error', message: 'Tidak ada catatan konseling untuk dicetak.' });
      return;
    }
    const schoolName = schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR';
    const schoolAddress =
      schoolSettings?.alamat || 'Jl. Raya Sawangan No. 45, Depok, Jawa Barat';
    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Rekap Catatan Sesi Konseling BK</title>
  <style>
    @page { size: A4 landscape; margin: 14mm; }
    body { font-family: Arial, sans-serif; color: #0f172a; font-size: 9.5pt; margin: 0; }
    .kop { text-align: center; border-bottom: 3px double #0f766e; padding-bottom: 8px; margin-bottom: 14px; }
    .kop h1 { margin: 0; font-size: 14pt; color: #0f766e; text-transform: uppercase; }
    .kop p { margin: 2px 0 0 0; font-size: 8.5pt; color: #475569; }
    h2 { text-align: center; font-size: 11.5pt; margin: 0 0 12px 0; text-transform: uppercase; }
    table { width: 100%; border-collapse: collapse; font-size: 8.8pt; }
    th { background: #0f766e; color: #ffffff; padding: 6px; border: 1px solid #0f766e; text-align: left; }
    td { padding: 6px; border: 1px solid #cbd5e1; vertical-align: top; }
    tr:nth-child(even) { background: #f8fafc; }
    .sig { width: 100%; margin-top: 24px; border: none; page-break-inside: avoid; }
    .sig td { border: none; width: 50%; text-align: center; padding: 6px; }
  </style>
</head>
<body>
  <div class="kop">
    <h1>${escapeHtml(schoolName)}</h1>
    <p>${escapeHtml(schoolAddress)}</p>
  </div>
  <h2>REKAPITULASI CATATAN SESI BIMBINGAN KONSELING (${filteredKonseling.length} KASUS)</h2>
  <table>
    <thead>
      <tr>
        <th style="width:4%; text-align:center;">No</th>
        <th style="width:10%;">Tanggal</th>
        <th style="width:16%;">Nama Siswa &amp; Kelas</th>
        <th style="width:13%;">Jenis &amp; Konselor</th>
        <th style="width:24%;">Permasalahan</th>
        <th style="width:23%;">Tindak Lanjut</th>
        <th style="width:10%; text-align:center;">Status</th>
      </tr>
    </thead>
    <tbody>
      ${filteredKonseling
        .map(
          (r, i) => `
        <tr>
          <td style="text-align:center; font-weight:bold;">${i + 1}</td>
          <td>${escapeHtml(formatTanggalIndo(r.tanggal))}</td>
          <td><b>${escapeHtml(r.namaSiswa)}</b><br/>Kelas ${escapeHtml(r.kelas)}</td>
          <td><b>${escapeHtml(r.jenisBimbingan)}</b><br/>${escapeHtml(r.guruBk)}</td>
          <td>${escapeHtml(r.permasalahan)}</td>
          <td>${escapeHtml(r.tindakLanjut || '-')}</td>
          <td style="text-align:center; font-weight:bold;">${escapeHtml(r.status)}${r.poinPelanggaran ? `<br/>(${r.poinPelanggaran} Poin)` : ''}</td>
        </tr>`
        )
        .join('')}
    </tbody>
  </table>
  <table class="sig">
    <tr>
      <td>Mengetahui,<br/><b>Kepala Sekolah</b><br/><br/><br/><br/><u><b>${escapeHtml(principalInfo.nama)}</b></u><br/>NIP. ${escapeHtml(principalInfo.nip)}</td>
      <td>Depok, ${escapeHtml(formatTanggalIndo(new Date().toISOString().split('T')[0]))}<br/><b>Koordinator Bimbingan Konseling</b><br/><br/><br/><br/><u><b>${escapeHtml(defaultGuruBk)}</b></u></td>
    </tr>
  </table>
</body>
</html>`;
    printHtmlViaIframe(html);
  };

  // Appointment Save (clean modal instead of window.prompt)
  const handleSaveAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    setAptError(null);
    if (!aptForm.namaSiswa?.trim() || !aptForm.keperluan?.trim()) {
      setAptError('Nama siswa dan keperluan konsultasi wajib diisi.');
      return;
    }
    const found = siswaList.find((s) => s.nama === aptForm.namaSiswa);
    const newApt: JadwalTemuBK = {
      id: `apt-${Date.now()}`,
      siswaId: found?.id || '',
      namaSiswa: aptForm.namaSiswa.trim(),
      kelas: aptForm.kelas || found?.kelas || availableClasses[0] || 'VII-A',
      tanggal: aptForm.tanggal || new Date().toISOString().split('T')[0],
      jam: aptForm.jam || '09:30',
      keperluan: aptForm.keperluan.trim(),
      status: 'Dijadwalkan',
    };
    await persistAppointments([newApt, ...appointmentList], newApt);
    setIsAptModalOpen(false);
    setToast({ type: 'success', message: `Janji temu BK untuk ${newApt.namaSiswa} berhasil dijadwalkan.` });
  };

  const handleDeleteAppointment = async (apt: JadwalTemuBK) => {
    const updated = appointmentList.filter((a) => a.id !== apt.id);
    await persistAppointments(updated, undefined, apt.id);
    setToast({ type: 'success', message: `Janji temu ${apt.namaSiswa} dihapus.` });
  };

  const getJenisBadgeClass = (jenis: JenisBimbinganBK) => {
    switch (jenis) {
      case 'Akademik':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'Pribadi':
        return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
      case 'Sosial':
        return 'bg-teal-500/15 text-teal-300 border-teal-500/30';
      case 'Karir':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      case 'Pelanggaran Kedisiplinan':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-700/40 text-slate-300 border-slate-600/40';
    }
  };

  const getStatusSelectClass = (status: StatusKonselingBK) => {
    if (status === 'Selesai') {
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    }
    if (status === 'Dalam Penanganan') {
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    }
    return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[60] px-4 py-3 rounded-xl shadow-2xl border flex items-center gap-2.5 text-xs font-bold ${
            toast.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/95 border-rose-500/40 text-rose-200'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-500/20 border border-teal-400/40 text-teal-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5" /> Layanan Bimbingan Konseling (BK)
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Manajemen Konseling &amp; Pembinaan Siswa</h2>
          <p className="text-slate-300 text-sm max-w-2xl">
            Pusat layanan bimbingan akademik, karir, pribadi, sosial, pencatatan pelanggaran kedisiplinan, janji temu siswa, dan rekapitulasi penanganan kasus secara komprehensif.
          </p>
        </div>
        <button
          onClick={() => handleOpenAdd('Akademik')}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all shrink-0"
        >
          <Plus className="w-4 h-4" /> Catat Sesi Konseling Baru
        </button>
      </div>

      {/* Stats Cards (Interactive quick filters) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => {
            setFilterStatus('Semua');
            setFilterKategori('Semua');
          }}
          className={`text-left bg-slate-900/75 backdrop-blur-md rounded-2xl p-4 border transition-all flex items-center justify-between shadow-xl hover:border-teal-500/50 ${
            filterStatus === 'Semua' && filterKategori === 'Semua'
              ? 'border-teal-500/60 ring-1 ring-teal-500/30'
              : 'border-slate-800'
          }`}
        >
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Sesi Konseling</p>
            <p className="text-xl font-black text-white mt-1">{totalKasus} Kasus</p>
            {kasusRujukan > 0 && (
              <p className="text-[10px] text-blue-400 font-semibold mt-0.5">{kasusRujukan} Rujukan</p>
            )}
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
            <HeartHandshake className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterKategori('Semua');
            setFilterStatus(filterStatus === 'Selesai' ? 'Semua' : 'Selesai');
          }}
          className={`text-left bg-slate-900/75 backdrop-blur-md rounded-2xl p-4 border transition-all flex items-center justify-between shadow-xl hover:border-emerald-500/50 ${
            filterStatus === 'Selesai'
              ? 'border-emerald-500/60 ring-1 ring-emerald-500/30'
              : 'border-slate-800'
          }`}
        >
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Kasus Selesai</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{kasusSelesai} Selesai</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterKategori('Semua');
            setFilterStatus(filterStatus === 'Dalam Penanganan' ? 'Semua' : 'Dalam Penanganan');
          }}
          className={`text-left bg-slate-900/75 backdrop-blur-md rounded-2xl p-4 border transition-all flex items-center justify-between shadow-xl hover:border-amber-500/50 ${
            filterStatus === 'Dalam Penanganan'
              ? 'border-amber-500/60 ring-1 ring-amber-500/30'
              : 'border-slate-800'
          }`}
        >
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Dalam Penanganan</p>
            <p className="text-xl font-black text-amber-400 mt-1">{kasusPenanganan} Aktif</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setFilterStatus('Semua');
            setFilterKategori(
              filterKategori === 'Pelanggaran Kedisiplinan'
                ? 'Semua'
                : 'Pelanggaran Kedisiplinan'
            );
          }}
          className={`text-left bg-slate-900/75 backdrop-blur-md rounded-2xl p-4 border transition-all flex items-center justify-between shadow-xl hover:border-rose-500/50 ${
            filterKategori === 'Pelanggaran Kedisiplinan'
              ? 'border-rose-500/60 ring-1 ring-rose-500/30'
              : 'border-slate-800'
          }`}
        >
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Akumulasi Poin Pelanggaran</p>
            <p className="text-xl font-black text-rose-400 mt-1">{totalPoinPelanggaran} Poin</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* Tab 1: Catatan Sesi Konseling */}
      {activeTab === 'catatan' && (
        <div className="space-y-4">
          {/* Full-width Responsive Search, Filters & Actions Bar */}
          <div className="bg-slate-900/75 backdrop-blur-md p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari nama siswa, NISN, kelas, permasalahan, guru BK..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-8 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                    title="Bersihkan pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter Controls */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Filter className="w-3.5 h-3.5 hidden sm:block" />
                </div>

                <select
                  value={filterKelas}
                  onChange={(e) => setFilterKelas(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Semua">Semua Kelas</option>
                  {availableClasses.map((cls) => (
                    <option key={cls} value={cls}>
                      Kelas {cls}
                    </option>
                  ))}
                </select>

                <select
                  value={filterKategori}
                  onChange={(e) => setFilterKategori(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Semua">Semua Kategori</option>
                  <option value="Akademik">Akademik</option>
                  <option value="Pribadi">Pribadi</option>
                  <option value="Sosial">Sosial</option>
                  <option value="Karir">Karir</option>
                  <option value="Pelanggaran Kedisiplinan">Pelanggaran Kedisiplinan</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                >
                  <option value="Semua">Semua Status</option>
                  <option value="Dalam Penanganan">Dalam Penanganan</option>
                  <option value="Selesai">Selesai</option>
                  <option value="Rujukan">Rujukan</option>
                </select>

                {hasActiveFilter && (
                  <button
                    type="button"
                    onClick={resetFilters}
                    className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Reset semua filter"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset
                  </button>
                )}
              </div>
            </div>

            {/* Secondary Info & Export Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-[11px]">
              <span className="text-slate-400">
                Menampilkan <span className="font-bold text-white">{filteredKonseling.length}</span> dari{' '}
                <span className="font-bold text-teal-400">{konselingList.length}</span> catatan sesi konseling
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadRekapPdf}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 disabled:opacity-50 text-white rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors border border-rose-500/60 shadow-sm shadow-rose-900/30"
                  title="Unduh Rekap Catatan Sesi Konseling dalam format PDF (A4)"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  Unduh PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  disabled={filteredKonseling.length === 0}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Ekspor CSV
                </button>
                <button
                  type="button"
                  onClick={handlePrintRekap}
                  disabled={filteredKonseling.length === 0}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-colors border border-slate-700"
                >
                  <Printer className="w-3.5 h-3.5 text-teal-400" /> Cetak Rekap
                </button>
              </div>
            </div>
          </div>

          {/* Counseling Records Table */}
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Siswa &amp; Jadwal Sesi</th>
                    <th className="py-3.5 px-4">Jenis &amp; Konselor</th>
                    <th className="py-3.5 px-4">Permasalahan &amp; Tindak Lanjut</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredKonseling.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-14 px-6 text-center">
                        <div className="flex flex-col items-center justify-center max-w-md mx-auto space-y-3">
                          <div className="p-3.5 rounded-2xl bg-slate-800/70 border border-slate-700 text-slate-400">
                            <HeartHandshake className="w-8 h-8" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-white">
                              {konselingList.length === 0
                                ? 'Belum Ada Catatan Sesi Konseling'
                                : 'Catatan Konseling Tidak Ditemukan'}
                            </p>
                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                              {konselingList.length === 0
                                ? 'Mulai catat sesi konseling siswa SMP Islam Modern Al Fakhir yang terhubung langsung ke database siswa, guru BK, dan penyimpanan Firebase.'
                                : 'Coba ubah kata kunci pencarian atau reset filter kelas, kategori, maupun status.'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            {hasActiveFilter ? (
                              <button
                                type="button"
                                onClick={resetFilters}
                                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                              >
                                <RotateCcw className="w-3.5 h-3.5" /> Reset Filter
                              </button>
                            ) : null}
                            <button
                              type="button"
                              onClick={() => handleOpenAdd('Akademik')}
                              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-600/20"
                            >
                              <Plus className="w-3.5 h-3.5" /> Catat Sesi Konseling Baru
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredKonseling.map((rec) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-800/40 transition-colors align-top"
                      >
                        <td className="py-3.5 px-4 min-w-[200px]">
                          <button
                            type="button"
                            onClick={() => setDetailModalRecord(rec)}
                            className="text-left group"
                          >
                            <div className="font-bold text-white text-sm group-hover:text-teal-300 transition-colors">
                              {rec.namaSiswa}
                            </div>
                          </button>
                          <div className="text-[11px] text-teal-400 font-semibold mt-0.5">
                            Kelas {rec.kelas} &bull; {formatTanggalIndo(rec.tanggal)}
                            {rec.jamSesi ? ` • ${rec.jamSesi}` : ''}
                          </div>
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {rec.nisn && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-mono">
                                NISN: {rec.nisn}
                              </span>
                            )}
                            {rec.prioritas === 'Prioritas Tinggi' && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                Prioritas Tinggi
                              </span>
                            )}
                            {rec.melibatkanOrangTua && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                                <PhoneCall className="w-2.5 h-2.5" /> Wali Murid
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 min-w-[185px]">
                          <span
                            className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getJenisBadgeClass(
                              rec.jenisBimbingan
                            )}`}
                          >
                            {rec.jenisBimbingan}
                          </span>
                          <div className="text-[11px] text-slate-300 mt-1.5 flex items-center gap-1.5">
                            <UserCheck className="w-3 h-3 text-teal-400 shrink-0" />
                            <span className="truncate max-w-[175px]" title={rec.guruBk}>
                              {rec.guruBk}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 mt-0.5">
                            {rec.metodeLayanan || 'Tatap Muka Individu'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 min-w-[270px] max-w-md">
                          <div className="text-slate-100 font-medium line-clamp-2 leading-relaxed">
                            {rec.permasalahan}
                          </div>
                          {rec.tindakLanjut && (
                            <div className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                              <span className="text-teal-400 font-semibold">Tindak Lanjut:</span>{' '}
                              {rec.tindakLanjut}
                            </div>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-1.5">
                            {rec.poinPelanggaran && rec.poinPelanggaran > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                <ShieldAlert className="w-3 h-3" /> +{rec.poinPelanggaran} Poin
                              </span>
                            ) : null}
                            {rec.jadwalEvaluasi && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700 text-[10px]">
                                <CalendarClock className="w-3 h-3 text-amber-400" /> Evaluasi:{' '}
                                {formatTanggalIndo(rec.jadwalEvaluasi)}
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <select
                            value={rec.status}
                            onChange={(e) =>
                              handleQuickStatusChange(rec, e.target.value as StatusKonselingBK)
                            }
                            aria-label={`Ubah status ${rec.namaSiswa}`}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold border outline-none cursor-pointer transition-colors ${getStatusSelectClass(
                              rec.status
                            )}`}
                          >
                            <option value="Dalam Penanganan" className="bg-slate-900 text-amber-300">
                              Dalam Penanganan
                            </option>
                            <option value="Selesai" className="bg-slate-900 text-emerald-300">
                              Selesai
                            </option>
                            <option value="Rujukan" className="bg-slate-900 text-blue-300">
                              Rujukan
                            </option>
                          </select>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setDetailModalRecord(rec)}
                              title="Lihat Detail & Berita Acara"
                              className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadRecordPdf(rec)}
                              disabled={isExportingPdf}
                              title="Unduh Berita Acara PDF"
                              className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 disabled:opacity-40 transition-colors"
                            >
                              <FileDown className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintRecord(rec)}
                              title="Cetak Berita Acara A4"
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                            >
                              <Printer className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(rec)}
                              title="Edit Catatan"
                              className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteRecord(rec)}
                              title="Hapus Catatan"
                              className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

      {/* Tab 2: Janji Temu */}
      {activeTab === 'janji' && (
        <div className="space-y-4">
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" /> Jadwal Janji Temu Siswa &amp; Guru BK
              </h3>
              <button
                type="button"
                onClick={() => {
                  setAptError(null);
                  setAptKelasFilter('Semua');
                  setAptForm({
                    siswaId: '',
                    namaSiswa: '',
                    kelas: availableClasses[0] || '',
                    tanggal: new Date().toISOString().split('T')[0],
                    jam: '09:30',
                    keperluan: '',
                    status: 'Dijadwalkan',
                  });
                  setIsAptModalOpen(true);
                }}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Buat Janji Temu
              </button>
            </div>

            {appointmentList.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 border border-dashed border-slate-800 rounded-xl">
                Belum ada jadwal janji temu BK. Klik <b className="text-white">Buat Janji Temu</b> untuk menjadwalkan sesi konsultasi siswa.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {appointmentList.map((apt) => (
                  <div
                    key={apt.id}
                    className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-white text-sm">{apt.namaSiswa}</h4>
                        <p className="text-xs text-teal-400">Kelas {apt.kelas}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-lg text-[10px] font-bold">
                        {formatTanggalIndo(apt.tanggal)} • {apt.jam}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                      <span className="font-semibold text-slate-400">Keperluan:</span> {apt.keperluan}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-emerald-400 font-bold uppercase">
                        {apt.status}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteAppointment(apt)}
                        className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                      >
                        Batalkan / Hapus
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Pelanggaran & Tata Tertib */}
      {activeTab === 'pelanggaran' && (
        <div className="space-y-4">
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Rekapitulasi Poin Pelanggaran Kedisiplinan Siswa
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Akumulasi poin pelanggaran kedisiplinan siswa digunakan sebagai bahan evaluasi pembinaan karakter. Batas maksimal poin peringatan adalah 100 poin sebelum tindakan skorsing atau pemanggilan resmi orang tua/wali.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
              <span className="text-xs text-slate-400">
                Daftar pelanggaran siswa dan akumulasi poin kedisiplinan.
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadPelanggaranPdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  Unduh PDF Pelanggaran
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd('Pelanggaran Kedisiplinan')}
                  className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Catat Pelanggaran Siswa
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Jenis Pelanggaran</th>
                    <th className="py-3 px-4 text-center">Poin</th>
                    <th className="py-3 px-4 text-center">Tindakan Pembinaan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {konselingList
                    .filter((k) => k.poinPelanggaran && k.poinPelanggaran > 0)
                    .map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-bold text-white">{rec.namaSiswa}</td>
                        <td className="py-3 px-4 text-slate-300">Kelas {rec.kelas}</td>
                        <td className="py-3 px-4 text-slate-300">{rec.permasalahan}</td>
                        <td className="py-3 px-4 text-center font-black text-rose-400">
                          {rec.poinPelanggaran} Poin
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2.5 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-lg text-[10px] font-bold">
                            {rec.tindakLanjut || '-'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setDetailModalRecord(rec)}
                            title="Lihat Berita Acara"
                            className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDownloadRecordPdf(rec)}
                            disabled={isExportingPdf}
                            title="Unduh Berita Acara PDF"
                            className="p-1.5 rounded-lg bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 disabled:opacity-40 transition-colors"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit Poin & Pelanggaran"
                            className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteRecord(rec)}
                            title="Hapus"
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  {konselingList.filter((k) => k.poinPelanggaran && k.poinPelanggaran > 0).length ===
                    0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Belum ada catatan pelanggaran kedisiplinan tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Bimbingan Karir & Studi Lanjut (SMP) */}
      {activeTab === 'karir' && (
        <div className="space-y-4">
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-400" /> Pemetaan Minat Bakat &amp; Studi Lanjut Jenjang Menengah
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Layanan bimbingan karir membantu siswa kelas VII–IX mengenali potensi diri, menelusuri minat dan bakat, serta mempersiapkan pilihan studi lanjut ke SMA, MA, SMK, maupun Pondok Pesantren unggulan.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 w-fit rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Pemetaan Studi Lanjut SMA/MA/SMK</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pendampingan pemilihan sekolah lanjutan, jalur prestasi rapor &amp; tahfidz, serta tes peminatan kelas IX.
                </p>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 w-fit rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Bimbingan Psikologis &amp; Sosial Remaja</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pengembangan adab Islami, komunikasi efektif, manajemen emosi remaja, anti-perundungan, dan kesiapan ujian.
                </p>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 w-fit rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Pengembangan Bakat &amp; Prestasi</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Arah pemilihan ekstrakurikuler, pembinaan olimpiade/lomba akademik, serta portofolio bakat siswa.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Sesi Konseling Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-teal-400" />
                {selectedRecord ? 'Edit Catatan Sesi Konseling' : 'Catat Sesi Konseling Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                title="Tutup"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              {formError && (
                <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Quick Student Picker Box */}
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-teal-400">
                    1. Pilih Peserta Didik (Database Sekolah)
                  </span>
                  <div className="flex items-center gap-2">
                    {!isManualStudentMode && (
                      <span className="text-[10px] text-slate-400">
                        {modalFilteredSiswa.length > 0
                          ? `${modalFilteredSiswa.length} siswa cocok`
                          : modalCrossClassMatches.length > 0
                          ? `${modalCrossClassMatches.length} ditemukan di kelas lain`
                          : '0 siswa cocok'}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const nextManual = !isManualStudentMode;
                        setIsManualStudentMode(nextManual);
                        if (!nextManual) {
                          setIsPickingStudent(!formData.namaSiswa);
                        }
                      }}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors ${
                        isManualStudentMode
                          ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                          : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                      }`}
                    >
                      {isManualStudentMode ? 'Pilih dari Database' : '+ Input Manual'}
                    </button>
                  </div>
                </div>

                {!isManualStudentMode ? (
                  <>
                    {/* Selected Student Card */}
                    {formData.namaSiswa && !isPickingStudent ? (
                      <div className="p-3.5 rounded-xl bg-teal-950/35 border border-teal-500/40 space-y-2">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-black text-white">
                              {formData.namaSiswa}
                            </div>
                            <div className="text-[11px] text-teal-300 font-semibold mt-0.5">
                              Kelas {formData.kelas || '-'}
                              {formData.nisn ? ` • NISN/NIS: ${formData.nisn}` : ''}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setIsPickingStudent(true);
                              setModalSiswaSearch('');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-bold text-teal-300 transition-colors shrink-0"
                          >
                            Ganti Siswa
                          </button>
                        </div>

                        {selectedFormSiswa && (
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-300 pt-2 border-t border-teal-500/20">
                            <span>
                              NISN/NIS:{' '}
                              <b className="text-white">
                                {getCleanNisn(selectedFormSiswa) || '-'}
                              </b>
                            </span>
                            <span>
                              Orang Tua / Wali:{' '}
                              <b className="text-white">
                                {getCleanWaliName(selectedFormSiswa)}
                              </b>
                            </span>
                            {getCleanWaliPhone(selectedFormSiswa) && (
                              <span>
                                Kontak:{' '}
                                <b className="text-teal-300">
                                  {getCleanWaliPhone(selectedFormSiswa)}
                                </b>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {/* Search & Class Filter */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <select
                            value={modalKelasFilter}
                            onChange={(e) => setModalKelasFilter(e.target.value)}
                            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                          >
                            <option value="Semua">Semua Kelas</option>
                            {availableClasses.map((cls) => (
                              <option key={cls} value={cls}>
                                {cls}
                              </option>
                            ))}
                          </select>

                          <div className="relative sm:col-span-2">
                            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input
                              type="text"
                              value={modalSiswaSearch}
                              onChange={(e) => setModalSiswaSearch(e.target.value)}
                              placeholder="Ketik nama siswa atau NISN (misal: Al Faqih)..."
                              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                            />
                            {modalSiswaSearch && (
                              <button
                                type="button"
                                onClick={() => setModalSiswaSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                                title="Hapus pencarian"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Live Clickable Student Results */}
                        <div className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden">
                          {modalFilteredSiswa.length > 0 ? (
                            <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/80">
                              {modalFilteredSiswa.slice(0, 60).map((s) => {
                                const cleanNisn = getCleanNisn(s);
                                const isSelected =
                                  (formData.siswaId && formData.siswaId === s.id) ||
                                  formData.namaSiswa === s.nama;
                                return (
                                  <button
                                    key={s.id || `${s.nama}-${s.kelas}`}
                                    type="button"
                                    onClick={() => handleSelectStudentFromDb(s)}
                                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors ${
                                      isSelected
                                        ? 'bg-teal-600/20 text-white'
                                        : 'hover:bg-slate-800/80 text-slate-200'
                                    }`}
                                  >
                                    <div className="min-w-0">
                                      <div className="text-xs font-bold text-white truncate">
                                        {s.nama}
                                      </div>
                                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                        {cleanNisn ? `NISN/NIS: ${cleanNisn} • ` : ''}
                                        Wali: {getCleanWaliName(s)}
                                      </div>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[10px] font-bold shrink-0">
                                      {s.kelas || '-'}
                                    </span>
                                  </button>
                                );
                              })}
                              {modalFilteredSiswa.length > 60 && (
                                <div className="px-3.5 py-2 text-[10px] text-slate-400 text-center bg-slate-950/50">
                                  Menampilkan 60 dari {modalFilteredSiswa.length} siswa — ketik nama untuk mempersempit pencarian.
                                </div>
                              )}
                            </div>
                          ) : modalCrossClassMatches.length > 0 ? (
                            <div className="divide-y divide-slate-800/80">
                              <div className="px-3.5 py-2 bg-amber-500/10 border-b border-amber-500/20 text-[11px] text-amber-300 font-semibold flex items-center justify-between gap-2">
                                <span>
                                  Tidak ditemukan di <b>{modalKelasFilter}</b> — hasil dari kelas lain:
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setModalKelasFilter('Semua')}
                                  className="underline text-amber-200 hover:text-white shrink-0"
                                >
                                  Tampilkan Semua Kelas
                                </button>
                              </div>
                              <div className="max-h-44 overflow-y-auto divide-y divide-slate-800/80">
                                {modalCrossClassMatches.slice(0, 40).map((s) => {
                                  const cleanNisn = getCleanNisn(s);
                                  return (
                                    <button
                                      key={s.id || `${s.nama}-${s.kelas}`}
                                      type="button"
                                      onClick={() => handleSelectStudentFromDb(s)}
                                      className="w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-800/80 text-slate-200 transition-colors"
                                    >
                                      <div className="min-w-0">
                                        <div className="text-xs font-bold text-white truncate">
                                          {s.nama}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate mt-0.5">
                                          {cleanNisn ? `NISN/NIS: ${cleanNisn} • ` : ''}
                                          Wali: {getCleanWaliName(s)}
                                        </div>
                                      </div>
                                      <span className="px-2 py-0.5 rounded-md bg-teal-500/15 border border-teal-500/30 text-teal-300 text-[10px] font-bold shrink-0">
                                        {s.kelas || '-'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <div className="p-4 text-center space-y-2">
                              <p className="text-xs text-slate-400">
                                Siswa <b className="text-white">&ldquo;{modalSiswaSearch || '-'}&rdquo;</b> tidak ditemukan di database siswa.
                              </p>
                              <div className="flex flex-wrap items-center justify-center gap-2">
                                {modalKelasFilter !== 'Semua' && (
                                  <button
                                    type="button"
                                    onClick={() => setModalKelasFilter('Semua')}
                                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200"
                                  >
                                    Cari di Semua Kelas
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsManualStudentMode(true);
                                    if (modalSiswaSearch.trim()) {
                                      setFormData((prev) => ({
                                        ...prev,
                                        siswaId: '',
                                        namaSiswa: modalSiswaSearch.trim(),
                                        kelas:
                                          modalKelasFilter !== 'Semua'
                                            ? modalKelasFilter
                                            : prev.kelas || availableClasses[0] || '',
                                      }));
                                    }
                                  }}
                                  className="px-3 py-1.5 rounded-lg bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/40 text-[11px] font-bold text-teal-300"
                                >
                                  Gunakan Nama Ini Secara Manual
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  /* Manual Student Entry Fallback */
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Nama Lengkap Siswa <span className="text-rose-400">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.namaSiswa || ''}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            siswaId: '',
                            namaSiswa: e.target.value,
                          })
                        }
                        placeholder="Ketik nama lengkap siswa..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        Kelas / Rombel <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={formData.kelas || ''}
                        onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                        required
                      >
                        <option value="">-- Pilih Kelas --</option>
                        {availableClasses.map((cls) => (
                          <option key={cls} value={cls}>
                            {cls}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              {/* Session Metadata */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Jenis Bimbingan
                  </label>
                  <select
                    value={formData.jenisBimbingan || 'Akademik'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        jenisBimbingan: e.target.value as JenisBimbinganBK,
                        poinPelanggaran:
                          e.target.value === 'Pelanggaran Kedisiplinan'
                            ? formData.poinPelanggaran || 10
                            : 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Akademik">Akademik</option>
                    <option value="Pribadi">Pribadi</option>
                    <option value="Sosial">Sosial</option>
                    <option value="Karir">Karir &amp; Studi Lanjut</option>
                    <option value="Pelanggaran Kedisiplinan">Pelanggaran Kedisiplinan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Metode Layanan
                  </label>
                  <select
                    value={formData.metodeLayanan || 'Tatap Muka Individu'}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        metodeLayanan: e.target.value as MetodeLayananBK,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Tatap Muka Individu">Tatap Muka Individu</option>
                    <option value="Konseling Kelompok">Konseling Kelompok</option>
                    <option value="Panggilan Orang Tua">Panggilan Orang Tua / Wali</option>
                    <option value="Home Visit">Home Visit (Kunjungan Rumah)</option>
                    <option value="Konsultasi Wali Kelas">Konsultasi Wali Kelas</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Tanggal Sesi
                    </label>
                    <input
                      type="date"
                      value={formData.tanggal || ''}
                      onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Jam Sesi
                    </label>
                    <input
                      type="time"
                      value={formData.jamSesi || '09:00'}
                      onChange={(e) => setFormData({ ...formData, jamSesi: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Guru BK / Konselor
                  </label>
                  <select
                    value={formData.guruBk || ''}
                    onChange={(e) => setFormData({ ...formData, guruBk: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Pilih Guru / Konselor --</option>
                    {formData.guruBk &&
                      !sortedGuruList.some((g) => g.nama === formData.guruBk) && (
                        <option value={formData.guruBk}>{formData.guruBk}</option>
                      )}
                    {sortedGuruList.map((g) => (
                      <option key={g.id || g.nip} value={g.nama}>
                        {g.nama} ({g.jabatan || g.mataPelajaran || 'Guru'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Status Penanganan
                  </label>
                  <select
                    value={formData.status || 'Dalam Penanganan'}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as StatusKonselingBK })
                    }
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Dalam Penanganan">Dalam Penanganan</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Rujukan">Rujukan (Wali Kelas / Psikolog / Kepala Sekolah)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Prioritas Pantauan
                    </label>
                    <select
                      value={formData.prioritas || 'Normal'}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          prioritas: e.target.value as PrioritasKonselingBK,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    >
                      <option value="Normal">Normal</option>
                      <option value="Perlu Pantauan">Perlu Pantauan</option>
                      <option value="Prioritas Tinggi">Prioritas Tinggi</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      Jadwal Evaluasi
                    </label>
                    <input
                      type="date"
                      value={formData.jadwalEvaluasi || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, jadwalEvaluasi: e.target.value })
                      }
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {formData.jenisBimbingan === 'Pelanggaran Kedisiplinan' && (
                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30">
                  <label className="block text-xs font-bold text-rose-300 mb-1">
                    Poin Pelanggaran Kedisiplinan (0 – 100)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={formData.poinPelanggaran ?? 0}
                    onChange={(e) =>
                      setFormData({ ...formData, poinPelanggaran: Number(e.target.value) })
                    }
                    className="w-full bg-slate-950 border border-rose-500/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-rose-400"
                    placeholder="Contoh: 10"
                  />
                </div>
              )}

              {/* Counseling Notes */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Permasalahan / Topik Konseling <span className="text-rose-400">*</span>
                  </label>
                  <textarea
                    rows={2}
                    value={formData.permasalahan || ''}
                    onChange={(e) => setFormData({ ...formData, permasalahan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                    placeholder="Uraikan permasalahan, kendala belajar, atau topik konsultasi siswa..."
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Hasil Analisis &amp; Wawancara Konselor
                  </label>
                  <textarea
                    rows={2}
                    value={formData.hasilKonseling || ''}
                    onChange={(e) => setFormData({ ...formData, hasilKonseling: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                    placeholder="Tuliskan hasil penggalian informasi, faktor penyebab, dan respons siswa..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tindak Lanjut &amp; Rekomendasi Pembinaan
                  </label>
                  <textarea
                    rows={2}
                    value={formData.tindakLanjut || ''}
                    onChange={(e) => setFormData({ ...formData, tindakLanjut: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                    placeholder="Contoh: Pendampingan belajar bersama wali kelas, komitmen tertulis, atau sesi lanjutan pekan depan..."
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <label className="flex items-center gap-2.5 text-xs font-bold text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(formData.melibatkanOrangTua)}
                      onChange={(e) =>
                        setFormData({ ...formData, melibatkanOrangTua: e.target.checked })
                      }
                      className="w-4 h-4 rounded accent-teal-500"
                    />
                    <span>Melibatkan Koordinasi Orang Tua / Wali Murid</span>
                  </label>
                  {formData.melibatkanOrangTua && (
                    <input
                      type="text"
                      value={formData.catatanOrangTua || ''}
                      onChange={(e) =>
                        setFormData({ ...formData, catatanOrangTua: e.target.value })
                      }
                      placeholder="Ringkasan komunikasi / kesepakatan dengan orang tua atau wali murid..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                    />
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-teal-600/30 flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" /> Simpan Sesi Konseling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail & Berita Acara Preview Modal (Authentic Clean White A4 Sheet) */}
      {detailModalRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl my-auto overflow-hidden">
            {/* Modal Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5 bg-slate-950 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-teal-400" />
                <h3 className="font-bold text-sm text-white">
                  Berita Acara Bimbingan Konseling
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const rec = detailModalRecord;
                    setDetailModalRecord(null);
                    handleOpenEdit(rec);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <Edit3 className="w-3.5 h-3.5 text-teal-400" /> Edit
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadRecordPdf(detailModalRecord)}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  Unduh PDF
                </button>
                <button
                  type="button"
                  onClick={() => handleDownloadDoc(detailModalRecord)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh .DOC
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintRecord(detailModalRecord)}
                  className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition-all"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak A4
                </button>
                <button
                  type="button"
                  onClick={() => setDetailModalRecord(null)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white transition-all"
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clean White Paper A4 Document Preview */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 bg-slate-800/70">
              <div className="bg-white text-slate-900 rounded-2xl shadow-xl p-6 sm:p-8 space-y-5 max-w-[740px] mx-auto border border-slate-200">
                {/* Kop Surat */}
                <div className="text-center border-b-4 border-double border-teal-700 pb-3 space-y-0.5">
                  <h2 className="text-base sm:text-lg font-black tracking-wide uppercase text-teal-800">
                    {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}
                  </h2>
                  <p className="text-[11px] text-slate-600">
                    {schoolSettings?.alamat || 'Jl. Raya Sawangan No. 45, Depok, Jawa Barat'}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Telp: {schoolSettings?.telepon || '(021) 77889922'} &bull; Email:{' '}
                    {schoolSettings?.email || 'info@alfakhir.sch.id'}
                  </p>
                </div>

                {/* Title */}
                <div className="text-center">
                  <h3 className="text-sm font-black uppercase underline tracking-wide text-slate-900">
                    BERITA ACARA LAYANAN BIMBINGAN KONSELING
                  </h3>
                  <p className="text-[11px] font-semibold text-slate-600 mt-0.5">
                    Nomor:{' '}
                    {detailModalRecord.nomorBeritaAcara ||
                      generateNomorBeritaAcara(detailModalRecord.tanggal, 1)}
                  </p>
                </div>

                {/* Identity Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 w-32 shrink-0">Nama Siswa</span>
                    <span className="font-bold text-slate-900">: {detailModalRecord.namaSiswa}</span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 w-32 shrink-0">Tanggal Sesi</span>
                    <span className="text-slate-800">
                      : {formatTanggalIndo(detailModalRecord.tanggal)}
                      {detailModalRecord.jamSesi ? ` (${detailModalRecord.jamSesi})` : ''}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 w-32 shrink-0">NISN / Kelas</span>
                    <span className="text-slate-800">
                      : {detailModalRecord.nisn || '-'} / <b>Kelas {detailModalRecord.kelas}</b>
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 w-32 shrink-0">Jenis &amp; Metode</span>
                    <span className="text-slate-800">
                      : <b>{detailModalRecord.jenisBimbingan}</b> (
                      {detailModalRecord.metodeLayanan || 'Tatap Muka Individu'})
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span className="font-bold text-slate-500 w-32 shrink-0">Guru BK</span>
                    <span className="font-semibold text-slate-900">
                      : {detailModalRecord.guruBk}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-500 w-32 shrink-0">Status Kasus</span>
                    <span className="font-bold text-teal-700">
                      : {detailModalRecord.status}
                      {detailModalRecord.poinPelanggaran && detailModalRecord.poinPelanggaran > 0
                        ? ` (${detailModalRecord.poinPelanggaran} Poin)`
                        : ''}
                    </span>
                  </div>
                  {detailModalRecord.jadwalEvaluasi && (
                    <div className="flex gap-2 sm:col-span-2">
                      <span className="font-bold text-slate-500 w-32 shrink-0">Jadwal Evaluasi</span>
                      <span className="font-semibold text-amber-800">
                        : {formatTanggalIndo(detailModalRecord.jadwalEvaluasi)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Narrative Sections */}
                <div className="space-y-3 text-xs">
                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3.5 py-2 bg-teal-50 border-b border-teal-100 font-bold text-teal-900 uppercase text-[11px]">
                      I. Uraian Permasalahan / Topik Konseling
                    </div>
                    <div className="p-3.5 text-slate-800 leading-relaxed whitespace-pre-line">
                      {detailModalRecord.permasalahan}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3.5 py-2 bg-teal-50 border-b border-teal-100 font-bold text-teal-900 uppercase text-[11px]">
                      II. Hasil Analisis &amp; Wawancara Konseling
                    </div>
                    <div className="p-3.5 text-slate-800 leading-relaxed whitespace-pre-line">
                      {detailModalRecord.hasilKonseling || '-'}
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <div className="px-3.5 py-2 bg-teal-50 border-b border-teal-100 font-bold text-teal-900 uppercase text-[11px]">
                      III. Tindak Lanjut &amp; Rekomendasi Pembinaan
                    </div>
                    <div className="p-3.5 text-slate-800 leading-relaxed whitespace-pre-line">
                      {detailModalRecord.tindakLanjut || '-'}
                      {detailModalRecord.melibatkanOrangTua && (
                        <div className="mt-2.5 pt-2.5 border-t border-slate-200 text-indigo-900">
                          <b>Koordinasi Orang Tua / Wali:</b>{' '}
                          {detailModalRecord.catatanOrangTua || 'Orang tua/wali telah dihubungi.'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="grid grid-cols-2 gap-6 pt-6 text-center text-xs text-slate-700">
                  <div>
                    <p className="mb-14">Peserta Didik Yang Bersangkutan,</p>
                    <p className="font-bold underline text-slate-900">
                      {detailModalRecord.namaSiswa}
                    </p>
                    <p className="text-[11px] text-slate-500">Kelas {detailModalRecord.kelas}</p>
                  </div>
                  <div>
                    <p>Depok, {formatTanggalIndo(detailModalRecord.tanggal)}</p>
                    <p className="mb-14">Konselor / Guru BK,</p>
                    <p className="font-bold underline text-slate-900">
                      {detailModalRecord.guruBk}
                    </p>
                  </div>
                </div>

                <div className="text-center text-xs text-slate-700 pt-2">
                  <p>Mengetahui,</p>
                  <p className="font-semibold mb-14">
                    Kepala {schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir'}
                  </p>
                  <p className="font-bold underline text-slate-900">{principalInfo.nama}</p>
                  <p className="text-[11px] text-slate-500">NIP. {principalInfo.nip}</p>
                </div>

                <p className="text-[10px] text-slate-400 italic text-center border-t border-dashed border-slate-200 pt-3">
                  Dokumen ini bersifat rahasia (konfidensial) untuk kepentingan pembinaan peserta didik.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styled Delete Confirmation Modal (No window.confirm) */}
      {confirmDeleteRecord && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4 text-slate-100">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Hapus Catatan Sesi Konseling?</h3>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Catatan konseling milik <b className="text-white">{confirmDeleteRecord.namaSiswa}</b>{' '}
                  (Kelas {confirmDeleteRecord.kelas}, {formatTanggalIndo(confirmDeleteRecord.tanggal)}) akan dihapus secara permanen dari arsip BK.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteRecord(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-600/20"
              >
                Ya, Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Appointment Modal (Replaces window.prompt) */}
      {isAptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-slate-100">
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" /> Buat Janji Temu BK
              </h3>
              <button
                type="button"
                onClick={() => setIsAptModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAppointment} className="p-5 space-y-3.5">
              {aptError && (
                <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs">
                  {aptError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Filter Kelas</label>
                <select
                  value={aptKelasFilter}
                  onChange={(e) => setAptKelasFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Semua">Semua Kelas</option>
                  {availableClasses.map((c) => (
                    <option key={c} value={c}>
                      Kelas {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Siswa</label>
                <select
                  value={aptForm.namaSiswa || ''}
                  onChange={(e) => {
                    const found = siswaList.find((s) => s.nama === e.target.value);
                    setAptForm({
                      ...aptForm,
                      siswaId: found?.id || '',
                      namaSiswa: e.target.value,
                      kelas: found?.kelas || aptForm.kelas || '',
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                >
                  <option value="">-- Pilih Siswa --</option>
                  {activeSiswaList
                    .filter((s) => aptKelasFilter === 'Semua' || s.kelas === aptKelasFilter)
                    .map((s) => (
                      <option key={s.id || s.nisn} value={s.nama}>
                        {s.nama} (Kelas {s.kelas})
                      </option>
                    ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tanggal</label>
                  <input
                    type="date"
                    value={aptForm.tanggal || ''}
                    onChange={(e) => setAptForm({ ...aptForm, tanggal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Jam</label>
                  <input
                    type="time"
                    value={aptForm.jam || '09:30'}
                    onChange={(e) => setAptForm({ ...aptForm, jam: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Keperluan Konsultasi
                </label>
                <textarea
                  rows={2}
                  value={aptForm.keperluan || ''}
                  onChange={(e) => setAptForm({ ...aptForm, keperluan: e.target.value })}
                  placeholder="Contoh: Konsultasi belajar persiapan SAS..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAptModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold"
                >
                  Simpan Jadwal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
