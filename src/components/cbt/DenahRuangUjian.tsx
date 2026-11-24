import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Printer,
  Search,
  Users,
  Edit2,
  Sparkles,
  ArrowLeftRight,
  Check,
  X,
  RotateCcw,
  Settings2,
  LayoutGrid,
  Armchair,
  UserPlus,
  UserMinus,
  AlertCircle,
  CheckCircle2,
  ClipboardList,
  Download,
  Eye,
  EyeOff,
  Move,
  FileDown,
  Loader2,
  CalendarDays
} from 'lucide-react';
import { Siswa, Guru, RombelKelas, SchoolSettings, Role, CbtExamSettings, JadwalUjianItem } from '../../types/school';
import { dbFetchCollection, dbSaveCollection } from '../../lib/firebaseSync';
import {
  downloadDaftarSiswaRuangPdf,
  DaftarSiswaPdfRoom,
  ExamAttendanceDay,
  abbreviateMapel
} from './daftarSiswaRuangPdf';
import { downloadDenahRuangPdf, DenahPdfOrientation } from './denahRuangPdf';

export interface DenahPosOffset {
  x: number;
  y: number;
}

export interface DenahKursi {
  nomorKursi: number;
  siswaId?: string;
  namaSiswa: string;
  kelasSiswa?: string;
  nomorPeserta?: string;
  tableIndex?: number;
  slotIndex?: number;
}

export interface DenahRuangItem {
  id: string;
  namaRuang: string;
  pengawas: string;
  jumlahKursi: number;
  kursiPerMeja: 1 | 2 | 4;
  judulUjian: string;
  labelPintu: string;
  labelJendela: string;
  ketentuanTambahan: string;
  kursiList: DenahKursi[];
  pengawasOffset?: DenahPosOffset;
  tableOffsets?: Record<string, DenahPosOffset>;
  seatOffsets?: Record<string, DenahPosOffset>;
  updatedAt?: string;
}

interface DenahRuangUjianProps {
  siswaList: Siswa[];
  guruList?: Guru[];
  rombelList?: RombelKelas[];
  schoolSettings?: SchoolSettings;
  cbtSettings?: CbtExamSettings;
  jadwalUjianList?: JadwalUjianItem[];
  currentRole?: Role;
  userEmail?: string;
}

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
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
const BULAN_SHORT_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function parseIsoDateLocal(isoDate: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec((isoDate || '').trim());
  if (!m) return null;
  const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function buildExamAttendanceDays(jadwalList: JadwalUjianItem[]): ExamAttendanceDay[] {
  const byDate = new Map<string, JadwalUjianItem[]>();
  jadwalList.forEach(item => {
    const key = (item.tanggal || '').trim().slice(0, 10);
    if (!key) return;
    const arr = byDate.get(key) || [];
    arr.push(item);
    byDate.set(key, arr);
  });

  const sortedDates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));
  if (sortedDates.length === 0) {
    const now = new Date();
    const iso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}`;
    return [
      {
        dayIndex: 1,
        tanggal: iso,
        hariTanggalLabel: `${HARI_ID[now.getDay()]}, ${now.getDate()} ${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`,
        shortLabel: `${HARI_SHORT_ID[now.getDay()]}, ${String(now.getDate()).padStart(2, '0')} ${BULAN_SHORT_ID[now.getMonth()]} ${now.getFullYear()}`,
        tanggalPenetapanLabel: `${now.getDate()} ${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`,
        sessions: []
      }
    ];
  }

  return sortedDates.map((iso, idx) => {
    const items = (byDate.get(iso) || []).slice().sort((a, b) =>
      (a.jamMulai || '').localeCompare(b.jamMulai || '')
    );
    const seen = new Set<string>();
    const sessions: ExamAttendanceDay['sessions'] = [];
    items.forEach(it => {
      const mapel = (it.mataPelajaran || it.judulUjian || 'Ujian').trim();
      const dedupeKey = `${mapel.toLowerCase()}|${it.jamMulai || ''}`;
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      sessions.push({
        mataPelajaran: mapel,
        jamMulai: (it.jamMulai || '').trim(),
        jamSelesai: (it.jamSelesai || '').trim()
      });
    });

    const dt = parseIsoDateLocal(iso);
    const hariTanggalLabel = dt
      ? `${HARI_ID[dt.getDay()]}, ${dt.getDate()} ${BULAN_ID[dt.getMonth()]} ${dt.getFullYear()}`
      : iso;
    const shortLabel = dt
      ? `${HARI_SHORT_ID[dt.getDay()]}, ${String(dt.getDate()).padStart(2, '0')} ${BULAN_SHORT_ID[dt.getMonth()]} ${dt.getFullYear()}`
      : iso;
    const tanggalPenetapanLabel = dt
      ? `${dt.getDate()} ${BULAN_ID[dt.getMonth()]} ${dt.getFullYear()}`
      : iso;

    return {
      dayIndex: idx + 1,
      tanggal: iso,
      hariTanggalLabel,
      shortLabel,
      tanggalPenetapanLabel,
      sessions
    };
  });
}

const DEFAULT_JUDUL_UJIAN = 'SUMATIF AKHIR SEMESTER (SAS) GANJIL TAHUN PELAJARAN 2026/2027';

function escapeHtmlStr(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function printHtmlViaHiddenIframe(html: string): void {
  try {
    const existing = document.getElementById('cbt-denah-roster-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cbt-denah-roster-print-iframe';
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
    console.error('Gagal mencetak daftar siswa ruang ujian:', err);
  }
}

function createEmptySeats(count: number, existing: DenahKursi[] = []): DenahKursi[] {
  const safeCount = Math.min(Math.max(Math.round(count) || 1, 1), 80);
  const byNo = new Map<number, DenahKursi>();
  existing.forEach(s => byNo.set(s.nomorKursi, s));
  const result: DenahKursi[] = [];
  for (let i = 1; i <= safeCount; i++) {
    const prev = byNo.get(i);
    if (prev) {
      result.push({ ...prev, nomorKursi: i });
    } else {
      result.push({
        nomorKursi: i,
        namaSiswa: '',
        kelasSiswa: '',
        nomorPeserta: ''
      });
    }
  }
  return result;
}

function materializeSeatLayout(kursiList: DenahKursi[], perTable: 1 | 2 | 4): Array<DenahKursi & { tableIndex: number; slotIndex: number }> {
  return kursiList.map((seat, idx) => ({
    ...seat,
    tableIndex: typeof seat.tableIndex === 'number' && seat.tableIndex >= 1
      ? seat.tableIndex
      : Math.floor(idx / perTable) + 1,
    slotIndex: typeof seat.slotIndex === 'number' && seat.slotIndex >= 0 && seat.slotIndex < perTable
      ? seat.slotIndex
      : idx % perTable
  }));
}

function getRoomTableCount(room: DenahRuangItem): number {
  const perTable = room.kursiPerMeja || 4;
  if (!room.kursiList.length) return 0;
  const tables = new Set<number>();
  room.kursiList.forEach((seat, idx) => {
    const t = typeof seat.tableIndex === 'number' && seat.tableIndex >= 1
      ? seat.tableIndex
      : Math.floor(idx / perTable) + 1;
    tables.add(t);
  });
  return tables.size;
}

function normalizeRoomSeatsAndOffsets(
  room: DenahRuangItem,
  rawSeats: Array<DenahKursi & { tableIndex: number; slotIndex: number }>
): DenahRuangItem {
  const uniqueTableIds = Array.from(new Set(rawSeats.map(s => s.tableIndex))).sort((a, b) => a - b);
  const tableMap = new Map<number, number>();
  uniqueTableIds.forEach((oldIdx, i) => {
    tableMap.set(oldIdx, i + 1);
  });

  const sorted = [...rawSeats].sort((a, b) => {
    const ta = tableMap.get(a.tableIndex) || 1;
    const tb = tableMap.get(b.tableIndex) || 1;
    if (ta !== tb) return ta - tb;
    if (a.slotIndex !== b.slotIndex) return a.slotIndex - b.slotIndex;
    return a.nomorKursi - b.nomorKursi;
  });

  const nextSeatOffsets: Record<string, DenahPosOffset> = {};
  const normalizedSeats: DenahKursi[] = sorted.map((seat, idx) => {
    const newSeatNo = idx + 1;
    const oldSeatKey = String(seat.nomorKursi);
    if (room.seatOffsets && room.seatOffsets[oldSeatKey]) {
      nextSeatOffsets[String(newSeatNo)] = room.seatOffsets[oldSeatKey];
    }
    return {
      ...seat,
      nomorKursi: newSeatNo,
      tableIndex: tableMap.get(seat.tableIndex) || 1,
      slotIndex: seat.slotIndex
    };
  });

  const nextTableOffsets: Record<string, DenahPosOffset> = {};
  if (room.tableOffsets) {
    tableMap.forEach((newTableIdx, oldTableIdx) => {
      const off = room.tableOffsets?.[String(oldTableIdx)];
      if (off) {
        nextTableOffsets[String(newTableIdx)] = off;
      }
    });
  }

  return {
    ...room,
    jumlahKursi: normalizedSeats.length,
    kursiList: normalizedSeats,
    tableOffsets: nextTableOffsets,
    seatOffsets: nextSeatOffsets,
    updatedAt: new Date().toISOString()
  };
}

function resizeRoomSeatsPreservingLayout(room: DenahRuangItem, targetCount: number): DenahRuangItem {
  const perTable = room.kursiPerMeja || 4;
  const clamped = Math.min(Math.max(Math.round(targetCount) || 1, 1), 80);
  const materialized = materializeSeatLayout(room.kursiList, perTable);

  if (clamped === materialized.length) {
    return normalizeRoomSeatsAndOffsets(room, materialized);
  }

  if (clamped < materialized.length) {
    return normalizeRoomSeatsAndOffsets(room, materialized.slice(0, clamped));
  }

  const nextSeats = [...materialized];
  const toAdd = clamped - materialized.length;
  let nextTempNo = nextSeats.reduce((m, s) => Math.max(m, s.nomorKursi), 0) + 1;

  for (let i = 0; i < toAdd; i++) {
    const usedByTable = new Map<number, Set<number>>();
    nextSeats.forEach(s => {
      const set = usedByTable.get(s.tableIndex) || new Set<number>();
      set.add(s.slotIndex);
      usedByTable.set(s.tableIndex, set);
    });

    const tableIds = Array.from(usedByTable.keys()).sort((a, b) => a - b);
    let placedTable: number | null = null;
    let placedSlot: number | null = null;

    for (const tId of tableIds) {
      const used = usedByTable.get(tId)!;
      if (used.size < perTable) {
        for (let slot = 0; slot < perTable; slot++) {
          if (!used.has(slot)) {
            placedTable = tId;
            placedSlot = slot;
            break;
          }
        }
        if (placedTable !== null) break;
      }
    }

    if (placedTable === null || placedSlot === null) {
      placedTable = (tableIds.length > 0 ? Math.max(...tableIds) : 0) + 1;
      placedSlot = 0;
    }

    nextSeats.push({
      nomorKursi: nextTempNo++,
      namaSiswa: '',
      kelasSiswa: '',
      nomorPeserta: '',
      tableIndex: placedTable,
      slotIndex: placedSlot
    });
  }

  return normalizeRoomSeatsAndOffsets(room, nextSeats);
}

function buildDefaultRooms(siswaList: Siswa[], guruList: Guru[]): DenahRuangItem[] {
  const activeSiswa = siswaList.filter(s => s.status === 'Aktif');
  const rooms: DenahRuangItem[] = [];
  for (let r = 1; r <= 6; r++) {
    const jumlahKursi = 16;
    const kursiList: DenahKursi[] = [];
    for (let k = 1; k <= jumlahKursi; k++) {
      const globalIdx = (r - 1) * jumlahKursi + (k - 1);
      const s = activeSiswa[globalIdx];
      kursiList.push({
        nomorKursi: k,
        siswaId: s?.id,
        namaSiswa: s?.nama || '',
        kelasSiswa: s?.kelas || '',
        nomorPeserta: s?.nis || ''
      });
    }
    const pengawas = guruList[(r - 1) % Math.max(guruList.length, 1)]?.nama || `Pengawas Ruang ${r}`;
    rooms.push({
      id: `denah-ruang-${r}`,
      namaRuang: `Ruang ${r}`,
      pengawas,
      jumlahKursi,
      kursiPerMeja: 4,
      judulUjian: DEFAULT_JUDUL_UJIAN,
      labelPintu: 'Pintu (di sebelah kiri)',
      labelJendela: 'Jendela (samping kiri)',
      ketentuanTambahan: 'Jaga ketertiban dan ikuti arahan pengawas.',
      kursiList,
      updatedAt: new Date().toISOString()
    });
  }
  return rooms;
}

// Inline SVG illustrations faithful to the attached Al Fakhir Exam Seating Blueprint
const PottedPlantSvg: React.FC<{ className?: string }> = ({ className = 'w-10 h-10' }) => (
  <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
    <ellipse cx="32" cy="48" rx="13" ry="9" fill="#9a4b1f" stroke="#1e293b" strokeWidth="2.5" />
    <ellipse cx="32" cy="44" rx="11" ry="4" fill="#c26227" stroke="#1e293b" strokeWidth="2" />
    <g fill="#4ade80" stroke="#14532d" strokeWidth="2" strokeLinejoin="round">
      <path d="M32 32 C26 18, 22 10, 32 6 C42 10, 38 18, 32 32 Z" />
      <path d="M32 32 C18 26, 10 22, 6 32 C10 42, 18 38, 32 32 Z" />
      <path d="M32 32 C46 26, 54 22, 58 32 C54 42, 46 38, 32 32 Z" />
      <path d="M32 32 C22 22, 14 14, 14 14 C14 14, 24 14, 32 32 Z" fill="#22c55e" />
      <path d="M32 32 C42 22, 50 14, 50 14 C50 14, 40 14, 32 32 Z" fill="#22c55e" />
      <path d="M32 32 C24 40, 14 44, 16 48 C22 48, 28 42, 32 32 Z" fill="#16a34a" />
      <path d="M32 32 C40 40, 50 44, 48 48 C42 48, 36 42, 32 32 Z" fill="#16a34a" />
    </g>
    <circle cx="32" cy="31" r="4" fill="#facc15" stroke="#713f12" strokeWidth="1.5" />
  </svg>
);

const DoorSvg: React.FC<{ className?: string }> = ({ className = 'w-11 h-24' }) => (
  <svg viewBox="0 0 48 110" className={className} aria-hidden="true">
    <polygon points="4,4 42,24 42,88 4,106" fill="#c77d33" stroke="#1e293b" strokeWidth="3" strokeLinejoin="round" />
    <polygon points="10,14 36,28 36,82 10,96" fill="#d99345" stroke="#78350f" strokeWidth="1.5" />
    <circle cx="32" cy="57" r="3.5" fill="#e2e8f0" stroke="#1e293b" strokeWidth="1.5" />
    <path d="M32 57 L20 50" stroke="#e2e8f0" strokeWidth="3.5" strokeLinecap="round" />
    <path d="M32 57 L20 50" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
);

const LegendChairIcon: React.FC = () => (
  <svg viewBox="0 0 40 40" className="w-8 h-8 shrink-0" aria-hidden="true">
    <rect x="7" y="5" width="26" height="10" rx="5" fill="#1d4ed8" stroke="#0f172a" strokeWidth="2.2" />
    <rect x="6" y="13" width="28" height="20" rx="6" fill="#2563eb" stroke="#0f172a" strokeWidth="2.2" />
    <rect x="10" y="16" width="20" height="8" rx="3" fill="#60a5fa" opacity="0.45" />
  </svg>
);

export const DenahRuangUjian: React.FC<DenahRuangUjianProps> = ({
  siswaList,
  guruList = [],
  rombelList = [],
  schoolSettings,
  cbtSettings,
  jadwalUjianList = [],
  currentRole = 'admin',
  userEmail = ''
}) => {
  const canEdit = currentRole !== 'siswa';
  const configuredExamBanner = cbtSettings
    ? `${cbtSettings.namaUjian.toUpperCase()} SEMESTER ${cbtSettings.semester.toUpperCase()} TAHUN PELAJARAN ${cbtSettings.tahunAjaran}`
    : DEFAULT_JUDUL_UJIAN;

  const [rooms, setRooms] = useState<DenahRuangItem[]>(() => {
    try {
      const saved = localStorage.getItem('edu_denahRuangList');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return buildDefaultRooms(siswaList, guruList);
  });

  const [selectedRoomId, setSelectedRoomId] = useState<string>(() => rooms[0]?.id || 'denah-ruang-1');
  const [viewMode, setViewMode] = useState<'detail' | 'roster' | 'overview'>('detail');
  const [showRosterInPoster, setShowRosterInPoster] = useState<boolean>(true);
  const [rosterScope, setRosterScope] = useState<'active' | 'all'>('active');
  const [rosterSearch, setRosterSearch] = useState('');
  const [rosterKelasFilter, setRosterKelasFilter] = useState('Semua');
  const [rosterStatusFilter, setRosterStatusFilter] = useState<'semua' | 'terisi' | 'kosong'>('semua');
  const [selectedAttendanceDay, setSelectedAttendanceDay] = useState<string>('all_days');
  const [searchQuery, setSearchQuery] = useState('');
  const [swapSourceSeat, setSwapSourceSeat] = useState<number | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [isDownloadingRosterPdf, setIsDownloadingRosterPdf] = useState(false);
  const [isDownloadingDenahPdf, setIsDownloadingDenahPdf] = useState(false);
  const [pdfOrientation, setPdfOrientation] = useState<DenahPdfOrientation>('auto');

  const examAttendanceDays = useMemo(
    () => buildExamAttendanceDays(jadwalUjianList),
    [jadwalUjianList]
  );

  const selectedDaysForOutput = useMemo<ExamAttendanceDay[] | undefined>(() => {
    if (selectedAttendanceDay === 'general') return undefined;
    if (selectedAttendanceDay === 'all_days') return examAttendanceDays;
    const found = examAttendanceDays.find(d => d.tanggal === selectedAttendanceDay);
    return found ? [found] : examAttendanceDays;
  }, [selectedAttendanceDay, examAttendanceDays]);

  // Interactive drag-to-move state for Meja Pengawas, Meja Peserta, and Kursi Peserta
  const [dragMoveEnabled, setDragMoveEnabled] = useState<boolean>(true);
  const [activeDrag, setActiveDrag] = useState<{
    kind: 'pengawas' | 'table' | 'seat';
    key: string;
    x: number;
    y: number;
  } | null>(null);
  const suppressNextClickRef = useRef<boolean>(false);
  const floorplanFrameRef = useRef<HTMLDivElement | null>(null);
  const denahPosterRef = useRef<HTMLDivElement | null>(null);
  const denahPosterRosterRef = useRef<HTMLDivElement | null>(null);
  const roomsRef = useRef<DenahRuangItem[]>(rooms);
  roomsRef.current = rooms;

  // Seat edit modal state
  const [editingSeatNo, setEditingSeatNo] = useState<number | null>(null);
  const [seatSearchStudent, setSeatSearchStudent] = useState('');
  const [seatFilterKelas, setSeatFilterKelas] = useState('Semua');
  const [seatManualNama, setSeatManualNama] = useState('');
  const [seatManualKelas, setSeatManualKelas] = useState('');
  const [seatManualNoPeserta, setSeatManualNoPeserta] = useState('');
  const [seatSelectedSiswaId, setSeatSelectedSiswaId] = useState<string | undefined>(undefined);

  // Room settings modal
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [isAddingRoom, setIsAddingRoom] = useState(false);
  const [roomForm, setRoomForm] = useState({
    namaRuang: '',
    pengawas: '',
    jumlahKursi: 16,
    kursiPerMeja: 4 as 1 | 2 | 4,
    judulUjian: DEFAULT_JUDUL_UJIAN,
    labelPintu: 'Pintu (di sebelah kiri)',
    labelJendela: 'Jendela (samping kiri)',
    ketentuanTambahan: 'Jaga ketertiban dan ikuti arahan pengawas.'
  });

  // Auto-fill modal
  const [showAutoFillModal, setShowAutoFillModal] = useState(false);
  const [autoFillScope, setAutoFillScope] = useState<'active' | 'all'>('active');
  const [autoFillOrder, setAutoFillOrder] = useState<'abjad' | 'zigzag' | 'acak'>('abjad');
  const [autoFillSelectedClasses, setAutoFillSelectedClasses] = useState<string[]>([]);

  // Delete room confirm modal
  const [deleteConfirmRoom, setDeleteConfirmRoom] = useState<DenahRuangItem | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Fetch from Firestore on mount
  useEffect(() => {
    let mounted = true;
    const loadRemote = async () => {
      try {
        const remote = await dbFetchCollection<DenahRuangItem>('edu_denahRuangList');
        if (mounted && Array.isArray(remote) && remote.length > 0) {
          const sorted = [...remote].sort((a, b) => a.namaRuang.localeCompare(b.namaRuang, undefined, { numeric: true }));
          setRooms(sorted);
          localStorage.setItem('edu_denahRuangList', JSON.stringify(sorted));
          setSelectedRoomId(prev => sorted.some(r => r.id === prev) ? prev : sorted[0].id);
        }
      } catch (err) {
        console.error('Gagal mengambil denah ruang dari Firestore:', err);
      }
    };
    loadRemote();
    return () => {
      mounted = false;
    };
  }, []);

  const persistRooms = (nextRooms: DenahRuangItem[]) => {
    setRooms(nextRooms);
    try {
      localStorage.setItem('edu_denahRuangList', JSON.stringify(nextRooms));
      dbSaveCollection('edu_denahRuangList', nextRooms).catch(console.error);
    } catch (e) {
      console.error(e);
    }
  };

  const activeRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId) || rooms[0];
  }, [rooms, selectedRoomId]);

  // All available classes from siswaList + rombelList
  const kelasList = useMemo(() => {
    const set = new Set<string>();
    rombelList.forEach(r => {
      if (r.namaRombel) set.add(r.namaRombel);
    });
    siswaList.forEach(s => {
      if (s.kelas) set.add(s.kelas);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [rombelList, siswaList]);

  // Map of where every student (by siswaId or lowercase nama) is seated across ALL rooms
  const seatedLookup = useMemo(() => {
    const byId = new Map<string, { roomId: string; roomName: string; seatNo: number }>();
    const byName = new Map<string, { roomId: string; roomName: string; seatNo: number }>();
    rooms.forEach(r => {
      r.kursiList.forEach(k => {
        if (k.namaSiswa && k.namaSiswa.trim()) {
          if (k.siswaId) {
            byId.set(k.siswaId, { roomId: r.id, roomName: r.namaRuang, seatNo: k.nomorKursi });
          }
          byName.set(k.namaSiswa.trim().toLowerCase(), { roomId: r.id, roomName: r.namaRuang, seatNo: k.nomorKursi });
        }
      });
    });
    return { byId, byName };
  }, [rooms]);

  // Search matches across all rooms
  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: { roomId: string; roomName: string; seatNo: number; nama: string; kelas: string }[] = [];
    rooms.forEach(r => {
      r.kursiList.forEach(k => {
        const matchNama = (k.namaSiswa || '').toLowerCase().includes(q);
        const matchNis = (k.nomorPeserta || '').toLowerCase().includes(q);
        const matchKelas = (k.kelasSiswa || '').toLowerCase().includes(q);
        if (k.namaSiswa && (matchNama || matchNis || matchKelas)) {
          results.push({
            roomId: r.id,
            roomName: r.namaRuang,
            seatNo: k.nomorKursi,
            nama: k.namaSiswa,
            kelas: k.kelasSiswa || ''
          });
        }
      });
    });
    return results;
  }, [rooms, searchQuery]);

  // Logged-in student auto highlight
  const myStudentName = useMemo(() => {
    if (currentRole !== 'siswa' || !userEmail) return '';
    const found = siswaList.find(s =>
      (s.email && s.email.toLowerCase() === userEmail.toLowerCase()) ||
      (s.username && userEmail.toLowerCase().includes(s.username.toLowerCase()))
    );
    return found?.nama || '';
  }, [currentRole, userEmail, siswaList]);

  // Update chair count directly on active room
  const handleChangeChairCount = (newCount: number) => {
    if (!canEdit || !activeRoom) return;
    const clamped = Math.min(Math.max(Math.round(newCount) || 1, 1), 80);
    const updated = rooms.map(r =>
      r.id === activeRoom.id ? resizeRoomSeatsPreservingLayout(r, clamped) : r
    );
    persistRooms(updated);
    setSwapSourceSeat(null);
  };

  // Add 1 new table (+kursiPerMeja chairs) to active room
  const handleAddTable = () => {
    if (!canEdit || !activeRoom) return;
    const perTable = activeRoom.kursiPerMeja || 4;
    if (activeRoom.kursiList.length >= 80) {
      showToast('Kapasitas maksimum 80 kursi per ruang telah tercapai.');
      return;
    }
    const materialized = materializeSeatLayout(activeRoom.kursiList, perTable);
    const maxTableIndex = materialized.reduce((m, s) => Math.max(m, s.tableIndex), 0);
    const nextTableIdx = maxTableIndex + 1;
    const seatsToAdd = Math.min(perTable, 80 - materialized.length);
    let nextTempNo = materialized.reduce((m, s) => Math.max(m, s.nomorKursi), 0) + 1;

    const addedSeats = Array.from({ length: seatsToAdd }, (_, slotIdx) => ({
      nomorKursi: nextTempNo++,
      namaSiswa: '',
      kelasSiswa: '',
      nomorPeserta: '',
      tableIndex: nextTableIdx,
      slotIndex: slotIdx
    }));

    const updatedRoom = normalizeRoomSeatsAndOffsets(activeRoom, [...materialized, ...addedSeats]);
    const nextTableNo = getRoomTableCount(updatedRoom);
    const updated = rooms.map(r => (r.id === activeRoom.id ? updatedRoom : r));
    persistRooms(updated);
    showToast(`Meja ${nextTableNo} (+${seatsToAdd} kursi) berhasil ditambahkan ke ${activeRoom.namaRuang}.`);
  };

  // Add 1 blue chair to a specific table slot (e.g. restoring a deleted chair on a table)
  const handleAddSeatToTable = (tableIndex: number, preferredSlot?: number) => {
    if (!canEdit || !activeRoom) return;
    const perTable = activeRoom.kursiPerMeja || 4;
    if (activeRoom.kursiList.length >= 80) {
      showToast('Kapasitas maksimum 80 kursi per ruang telah tercapai.');
      return;
    }
    const materialized = materializeSeatLayout(activeRoom.kursiList, perTable);
    const usedSlots = new Set(
      materialized.filter(s => s.tableIndex === tableIndex).map(s => s.slotIndex)
    );
    if (usedSlots.size >= perTable) return;

    let targetSlot: number | undefined =
      typeof preferredSlot === 'number' && !usedSlots.has(preferredSlot) ? preferredSlot : undefined;
    if (targetSlot === undefined) {
      for (let s = 0; s < perTable; s++) {
        if (!usedSlots.has(s)) {
          targetSlot = s;
          break;
        }
      }
    }
    if (targetSlot === undefined) return;

    const nextTempNo = materialized.reduce((m, s) => Math.max(m, s.nomorKursi), 0) + 1;
    const nextSeats = [
      ...materialized,
      {
        nomorKursi: nextTempNo,
        namaSiswa: '',
        kelasSiswa: '',
        nomorPeserta: '',
        tableIndex,
        slotIndex: targetSlot
      }
    ];
    const updated = rooms.map(r =>
      r.id === activeRoom.id ? normalizeRoomSeatsAndOffsets(r, nextSeats) : r
    );
    persistRooms(updated);
    setSwapSourceSeat(null);
    showToast(`1 kursi biru ditambahkan ke Meja ${tableIndex} (${activeRoom.namaRuang}).`);
  };

  // Delete a specific blue chair while keeping every other chair on its exact table & side
  const handleDeleteSeat = (nomorKursi: number, targetRoomId?: string) => {
    if (!canEdit) return;
    const room = targetRoomId ? rooms.find(r => r.id === targetRoomId) : activeRoom;
    if (!room) return;
    if (room.kursiList.length <= 1) {
      showToast('Minimal harus ada 1 kursi di dalam ruang ujian.');
      return;
    }
    const targetSeat = room.kursiList.find(k => k.nomorKursi === nomorKursi);
    if (!targetSeat) return;

    const perTable = room.kursiPerMeja || 4;
    const materialized = materializeSeatLayout(room.kursiList, perTable);
    const remainingSeats = materialized.filter(s => s.nomorKursi !== nomorKursi);
    const updatedRoom = normalizeRoomSeatsAndOffsets(room, remainingSeats);

    const updated = rooms.map(r => (r.id === room.id ? updatedRoom : r));
    persistRooms(updated);
    if (editingSeatNo === nomorKursi && room.id === activeRoom?.id) {
      setEditingSeatNo(null);
    }
    setSwapSourceSeat(null);
    const seatDesc = targetSeat.namaSiswa.trim() ? targetSeat.namaSiswa.trim() : 'Kosong';
    showToast(`Kursi #${String(nomorKursi).padStart(2, '0')} (${seatDesc}) berhasil dihapus dari ${room.namaRuang}.`);
  };

  // Delete all empty blue chairs in active room in one click
  const handleDeleteEmptySeats = () => {
    if (!canEdit || !activeRoom) return;
    const perTable = activeRoom.kursiPerMeja || 4;
    const materialized = materializeSeatLayout(activeRoom.kursiList, perTable);
    const filledSeats = materialized.filter(s => s.namaSiswa && s.namaSiswa.trim() !== '');
    const emptyCount = materialized.length - filledSeats.length;

    if (emptyCount === 0) {
      showToast(`Tidak ada kursi kosong di ${activeRoom.namaRuang}.`);
      return;
    }
    if (filledSeats.length === 0) {
      showToast('Minimal harus tersisa 1 kursi di dalam ruang ujian.');
      return;
    }

    const updatedRoom = normalizeRoomSeatsAndOffsets(activeRoom, filledSeats);
    const updated = rooms.map(r => (r.id === activeRoom.id ? updatedRoom : r));
    persistRooms(updated);
    setEditingSeatNo(null);
    setSwapSourceSeat(null);
    showToast(`${emptyCount} kursi biru kosong berhasil dihapus dari ${activeRoom.namaRuang}.`);
  };

  // Remove a specific table (1-based tableIndex) and re-number remaining seats cleanly
  const handleRemoveTable = (tableIndex: number) => {
    if (!canEdit || !activeRoom) return;
    const perTable = activeRoom.kursiPerMeja || 4;
    const materialized = materializeSeatLayout(activeRoom.kursiList, perTable);
    const totalTables = new Set(materialized.map(s => s.tableIndex)).size;
    if (totalTables <= 1) {
      showToast('Minimal harus ada 1 meja di dalam ruang ujian.');
      return;
    }
    const remainingSeats = materialized.filter(s => s.tableIndex !== tableIndex);
    if (remainingSeats.length === 0) {
      showToast('Minimal harus ada 1 kursi di dalam ruang ujian.');
      return;
    }

    const updatedRoom = normalizeRoomSeatsAndOffsets(activeRoom, remainingSeats);
    const updated = rooms.map(r => (r.id === activeRoom.id ? updatedRoom : r));
    persistRooms(updated);
    setSwapSourceSeat(null);
    showToast(`Meja ${tableIndex} berhasil dihapus dari ${activeRoom.namaRuang}.`);
  };

  const handleChangeChairsPerTable = (perTable: 1 | 2 | 4) => {
    if (!canEdit || !activeRoom) return;
    const updated = rooms.map(r =>
      r.id === activeRoom.id
        ? {
            ...r,
            kursiPerMeja: perTable,
            kursiList: r.kursiList.map((k, idx) => ({
              nomorKursi: idx + 1,
              siswaId: k.siswaId,
              namaSiswa: k.namaSiswa,
              kelasSiswa: k.kelasSiswa,
              nomorPeserta: k.nomorPeserta
            })),
            tableOffsets: {},
            seatOffsets: {},
            updatedAt: new Date().toISOString()
          }
        : r
    );
    persistRooms(updated);
    setSwapSourceSeat(null);
  };

  const getElementOffset = (
    room: DenahRuangItem | undefined,
    kind: 'pengawas' | 'table' | 'seat',
    key: string
  ): DenahPosOffset => {
    if (activeDrag && activeDrag.kind === kind && activeDrag.key === key) {
      return { x: activeDrag.x, y: activeDrag.y };
    }
    if (!room) return { x: 0, y: 0 };
    if (kind === 'pengawas') {
      return room.pengawasOffset || { x: 0, y: 0 };
    }
    if (kind === 'table') {
      return room.tableOffsets?.[key] || { x: 0, y: 0 };
    }
    return room.seatOffsets?.[key] || { x: 0, y: 0 };
  };

  const hasCustomLayoutPositions = useMemo(() => {
    if (!activeRoom) return false;
    const pOff = activeRoom.pengawasOffset;
    if (pOff && (pOff.x !== 0 || pOff.y !== 0)) return true;
    if (
      activeRoom.tableOffsets &&
      Object.values(activeRoom.tableOffsets).some(o => o && (o.x !== 0 || o.y !== 0))
    ) {
      return true;
    }
    if (
      activeRoom.seatOffsets &&
      Object.values(activeRoom.seatOffsets).some(o => o && (o.x !== 0 || o.y !== 0))
    ) {
      return true;
    }
    return false;
  }, [activeRoom]);

  const handleResetLayoutPositions = () => {
    if (!canEdit || !activeRoom) return;
    const updated = rooms.map(r =>
      r.id === activeRoom.id
        ? {
            ...r,
            pengawasOffset: { x: 0, y: 0 },
            tableOffsets: {},
            seatOffsets: {},
            updatedAt: new Date().toISOString()
          }
        : r
    );
    persistRooms(updated);
    showToast(`Posisi meja dan kursi di ${activeRoom.namaRuang} dikembalikan ke tata letak awal.`);
  };

  const startDragMove = (
    e: React.PointerEvent<HTMLElement>,
    kind: 'pengawas' | 'table' | 'seat',
    key: string
  ) => {
    if (!canEdit || !dragMoveEnabled || viewMode !== 'detail' || !activeRoom) return;
    if (e.button !== 0) return;
    // Do not hijack clicks on delete (X) buttons inside tables
    const targetEl = e.target as HTMLElement | null;
    if (targetEl?.closest('[data-no-drag="true"]')) return;
    // Allow Seat Swap clicks to stay clean without dragging chairs
    if (kind === 'seat' && swapSourceSeat !== null) return;

    e.stopPropagation();

    const startClientX = e.clientX;
    const startClientY = e.clientY;
    const baseOffset = getElementOffset(activeRoom, kind, key);
    const roomId = activeRoom.id;
    let dragged = false;
    let latestX = baseOffset.x;
    let latestY = baseOffset.y;

    const frameRect = floorplanFrameRef.current?.getBoundingClientRect();
    const maxRangeX = frameRect ? Math.max(320, Math.round(frameRect.width * 0.72)) : 520;
    const maxRangeY = frameRect ? Math.max(320, Math.round(frameRect.height * 0.75)) : 520;

    const handlePointerMove = (moveEvt: PointerEvent) => {
      const dx = moveEvt.clientX - startClientX;
      const dy = moveEvt.clientY - startClientY;
      if (!dragged && Math.hypot(dx, dy) < 5) return;

      if (!dragged) {
        dragged = true;
        document.body.style.userSelect = 'none';
      }

      // Snap gently to 4px grid for tidy alignment while feeling smooth
      const snappedX = Math.round((baseOffset.x + dx) / 4) * 4;
      const snappedY = Math.round((baseOffset.y + dy) / 4) * 4;
      latestX = Math.max(-maxRangeX, Math.min(maxRangeX, snappedX));
      latestY = Math.max(-maxRangeY, Math.min(maxRangeY, snappedY));
      setActiveDrag({ kind, key, x: latestX, y: latestY });
    };

    const handlePointerUp = () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.userSelect = '';

      if (dragged) {
        suppressNextClickRef.current = true;
        window.setTimeout(() => {
          suppressNextClickRef.current = false;
        }, 120);

        const nextRooms = roomsRef.current.map(r => {
          if (r.id !== roomId) return r;
          if (kind === 'pengawas') {
            return {
              ...r,
              pengawasOffset: { x: latestX, y: latestY },
              updatedAt: new Date().toISOString()
            };
          }
          if (kind === 'table') {
            return {
              ...r,
              tableOffsets: {
                ...(r.tableOffsets || {}),
                [key]: { x: latestX, y: latestY }
              },
              updatedAt: new Date().toISOString()
            };
          }
          return {
            ...r,
            seatOffsets: {
              ...(r.seatOffsets || {}),
              [key]: { x: latestX, y: latestY }
            },
            updatedAt: new Date().toISOString()
          };
        });
        persistRooms(nextRooms);
      }
      setActiveDrag(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
  };

  // Click on a blue chair
  const handleSeatClick = (seat: DenahKursi) => {
    if (suppressNextClickRef.current) return;
    if (!canEdit || !activeRoom) return;

    // If swap mode is active, perform swap
    if (swapSourceSeat !== null) {
      if (swapSourceSeat === seat.nomorKursi) {
        setSwapSourceSeat(null);
        return;
      }
      const updated = rooms.map(r => {
        if (r.id !== activeRoom.id) return r;
        const src = r.kursiList.find(k => k.nomorKursi === swapSourceSeat);
        const dst = r.kursiList.find(k => k.nomorKursi === seat.nomorKursi);
        if (!src || !dst) return r;
        return {
          ...r,
          kursiList: r.kursiList.map(k => {
            if (k.nomorKursi === swapSourceSeat) {
              return {
                ...k,
                nomorKursi: swapSourceSeat,
                siswaId: dst.siswaId,
                namaSiswa: dst.namaSiswa,
                kelasSiswa: dst.kelasSiswa,
                nomorPeserta: dst.nomorPeserta
              };
            }
            if (k.nomorKursi === seat.nomorKursi) {
              return {
                ...k,
                nomorKursi: seat.nomorKursi,
                siswaId: src.siswaId,
                namaSiswa: src.namaSiswa,
                kelasSiswa: src.kelasSiswa,
                nomorPeserta: src.nomorPeserta
              };
            }
            return k;
          }),
          updatedAt: new Date().toISOString()
        };
      });
      persistRooms(updated);
      showToast(`Posisi Kursi #${swapSourceSeat} berhasil ditukar dengan Kursi #${seat.nomorKursi}.`);
      setSwapSourceSeat(null);
      return;
    }

    // Open seat editor modal
    setEditingSeatNo(seat.nomorKursi);
    setSeatManualNama(seat.namaSiswa || '');
    setSeatManualKelas(seat.kelasSiswa || '');
    setSeatManualNoPeserta(seat.nomorPeserta || '');
    setSeatSelectedSiswaId(seat.siswaId);
    setSeatSearchStudent('');
    setSeatFilterKelas('Semua');
  };

  const handleSaveSeatEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeRoom || editingSeatNo === null) return;
    const updated = rooms.map(r => {
      if (r.id !== activeRoom.id) return r;
      return {
        ...r,
        kursiList: r.kursiList.map(k =>
          k.nomorKursi === editingSeatNo
            ? {
                ...k,
                nomorKursi: editingSeatNo,
                siswaId: seatSelectedSiswaId,
                namaSiswa: seatManualNama.trim(),
                kelasSiswa: seatManualKelas.trim(),
                nomorPeserta: seatManualNoPeserta.trim()
              }
            : k
        ),
        updatedAt: new Date().toISOString()
      };
    });
    persistRooms(updated);
    setEditingSeatNo(null);
    showToast(`Kursi #${editingSeatNo} di ${activeRoom.namaRuang} berhasil diperbarui.`);
  };

  const handleClearSingleSeat = () => {
    if (!activeRoom || editingSeatNo === null) return;
    const updated = rooms.map(r => {
      if (r.id !== activeRoom.id) return r;
      return {
        ...r,
        kursiList: r.kursiList.map(k =>
          k.nomorKursi === editingSeatNo
            ? { ...k, nomorKursi: editingSeatNo, siswaId: undefined, namaSiswa: '', kelasSiswa: '', nomorPeserta: '' }
            : k
        ),
        updatedAt: new Date().toISOString()
      };
    });
    persistRooms(updated);
    setEditingSeatNo(null);
    showToast(`Kursi #${editingSeatNo} dikosongkan.`);
  };

  const handlePickStudentForSeat = (s: Siswa) => {
    setSeatSelectedSiswaId(s.id);
    setSeatManualNama(s.nama);
    setSeatManualKelas(s.kelas);
    setSeatManualNoPeserta(s.nis || s.nisn || '');
  };

  // Room Add / Edit Modal Handlers
  const openAddRoomModal = () => {
    const nextIdx = rooms.length + 1;
    setIsAddingRoom(true);
    setRoomForm({
      namaRuang: `Ruang ${nextIdx}`,
      pengawas: guruList[(nextIdx - 1) % Math.max(guruList.length, 1)]?.nama || `Pengawas Ruang ${nextIdx}`,
      jumlahKursi: 16,
      kursiPerMeja: 4,
      judulUjian: activeRoom?.judulUjian || DEFAULT_JUDUL_UJIAN,
      labelPintu: 'Pintu (di sebelah kiri)',
      labelJendela: 'Jendela (samping kiri)',
      ketentuanTambahan: activeRoom?.ketentuanTambahan || 'Jaga ketertiban dan ikuti arahan pengawas.'
    });
    setShowRoomModal(true);
  };

  const openEditRoomModal = () => {
    if (!activeRoom) return;
    setIsAddingRoom(false);
    setRoomForm({
      namaRuang: activeRoom.namaRuang,
      pengawas: activeRoom.pengawas,
      jumlahKursi: activeRoom.jumlahKursi,
      kursiPerMeja: activeRoom.kursiPerMeja,
      judulUjian: activeRoom.judulUjian,
      labelPintu: activeRoom.labelPintu,
      labelJendela: activeRoom.labelJendela,
      ketentuanTambahan: activeRoom.ketentuanTambahan
    });
    setShowRoomModal(true);
  };

  const handleSaveRoomModal = (e: React.FormEvent) => {
    e.preventDefault();
    const safeKursi = Math.min(Math.max(Number(roomForm.jumlahKursi) || 16, 1), 80);
    if (isAddingRoom) {
      const newRoom: DenahRuangItem = {
        id: `denah-ruang-${Date.now()}`,
        namaRuang: roomForm.namaRuang.trim() || `Ruang ${rooms.length + 1}`,
        pengawas: roomForm.pengawas.trim() || 'Pengawas Ujian',
        jumlahKursi: safeKursi,
        kursiPerMeja: roomForm.kursiPerMeja,
        judulUjian: roomForm.judulUjian.trim() || DEFAULT_JUDUL_UJIAN,
        labelPintu: roomForm.labelPintu.trim() || 'Pintu (di sebelah kiri)',
        labelJendela: roomForm.labelJendela.trim() || 'Jendela (samping kiri)',
        ketentuanTambahan: roomForm.ketentuanTambahan.trim() || 'Jaga ketertiban dan ikuti arahan pengawas.',
        kursiList: createEmptySeats(safeKursi),
        updatedAt: new Date().toISOString()
      };
      const next = [...rooms, newRoom];
      persistRooms(next);
      setSelectedRoomId(newRoom.id);
      setShowRoomModal(false);
      showToast(`Berhasil menambahkan ${newRoom.namaRuang} (${safeKursi} kursi).`);
    } else if (activeRoom) {
      const next = rooms.map(r => {
        if (r.id !== activeRoom.id) {
          // Keep exam title synced across rooms for consistent header banner
          return { ...r, judulUjian: roomForm.judulUjian.trim() || r.judulUjian };
        }
        const perTableChanged = r.kursiPerMeja !== roomForm.kursiPerMeja;
        const baseUpdated: DenahRuangItem = {
          ...r,
          namaRuang: roomForm.namaRuang.trim() || r.namaRuang,
          pengawas: roomForm.pengawas.trim() || r.pengawas,
          kursiPerMeja: roomForm.kursiPerMeja,
          judulUjian: roomForm.judulUjian.trim() || DEFAULT_JUDUL_UJIAN,
          labelPintu: roomForm.labelPintu.trim() || 'Pintu (di sebelah kiri)',
          labelJendela: roomForm.labelJendela.trim() || 'Jendela (samping kiri)',
          ketentuanTambahan: roomForm.ketentuanTambahan.trim() || 'Jaga ketertiban dan ikuti arahan pengawas.',
          updatedAt: new Date().toISOString()
        };
        if (perTableChanged) {
          return {
            ...baseUpdated,
            jumlahKursi: safeKursi,
            kursiList: createEmptySeats(
              safeKursi,
              r.kursiList.map(k => ({
                nomorKursi: k.nomorKursi,
                siswaId: k.siswaId,
                namaSiswa: k.namaSiswa,
                kelasSiswa: k.kelasSiswa,
                nomorPeserta: k.nomorPeserta
              }))
            ),
            tableOffsets: {},
            seatOffsets: {}
          };
        }
        return safeKursi === r.kursiList.length
          ? { ...baseUpdated, jumlahKursi: r.kursiList.length }
          : resizeRoomSeatsPreservingLayout(baseUpdated, safeKursi);
      });
      persistRooms(next);
      setShowRoomModal(false);
      showToast(`Pengaturan ${roomForm.namaRuang} berhasil disimpan.`);
    }
  };

  const handleConfirmDeleteRoom = () => {
    if (!deleteConfirmRoom || rooms.length <= 1) return;
    const next = rooms.filter(r => r.id !== deleteConfirmRoom.id);
    persistRooms(next);
    if (selectedRoomId === deleteConfirmRoom.id) {
      setSelectedRoomId(next[0].id);
    }
    showToast(`${deleteConfirmRoom.namaRuang} telah dihapus.`);
    setDeleteConfirmRoom(null);
  };

  // Auto-Fill Student Seating
  const handleRunAutoFill = () => {
    const activeStudents = siswaList.filter(s => s.status === 'Aktif');
    let pool = autoFillSelectedClasses.length > 0
      ? activeStudents.filter(s => autoFillSelectedClasses.includes(s.kelas))
      : [...activeStudents];

    if (pool.length === 0) {
      showToast('Tidak ada data siswa yang cocok untuk diisi otomatis.');
      return;
    }

    if (autoFillOrder === 'abjad') {
      pool.sort((a, b) => a.nama.localeCompare(b.nama));
    } else if (autoFillOrder === 'acak') {
      pool = [...pool].sort(() => Math.random() - 0.5);
    } else if (autoFillOrder === 'zigzag') {
      // Group by class and interleave so adjacent seats come from different classes
      const byClass = new Map<string, Siswa[]>();
      pool.forEach(s => {
        const arr = byClass.get(s.kelas) || [];
        arr.push(s);
        byClass.set(s.kelas, arr);
      });
      const queues = Array.from(byClass.values()).map(arr => arr.sort((a, b) => a.nama.localeCompare(b.nama)));
      const interleaved: Siswa[] = [];
      let keepGoing = true;
      while (keepGoing) {
        keepGoing = false;
        for (const q of queues) {
          if (q.length > 0) {
            interleaved.push(q.shift()!);
            keepGoing = true;
          }
        }
      }
      pool = interleaved;
    }

    if (autoFillScope === 'active' && activeRoom) {
      const updated = rooms.map(r => {
        if (r.id !== activeRoom.id) return r;
        const nextSeats: DenahKursi[] = r.kursiList.map((k, idx) => {
          const s = pool[idx];
          return {
            ...k,
            nomorKursi: k.nomorKursi,
            siswaId: s?.id,
            namaSiswa: s?.nama || '',
            kelasSiswa: s?.kelas || '',
            nomorPeserta: s?.nis || ''
          };
        });
        return { ...r, kursiList: nextSeats, updatedAt: new Date().toISOString() };
      });
      persistRooms(updated);
      showToast(`Berhasil mengisi otomatis ${Math.min(pool.length, activeRoom.jumlahKursi)} siswa ke ${activeRoom.namaRuang}.`);
    } else {
      let cursor = 0;
      const updated = rooms.map(r => {
        const nextSeats: DenahKursi[] = r.kursiList.map(k => {
          const s = pool[cursor++];
          return {
            ...k,
            nomorKursi: k.nomorKursi,
            siswaId: s?.id,
            namaSiswa: s?.nama || '',
            kelasSiswa: s?.kelas || '',
            nomorPeserta: s?.nis || ''
          };
        });
        return { ...r, kursiList: nextSeats, updatedAt: new Date().toISOString() };
      });
      persistRooms(updated);
      showToast(`Berhasil mendistribusikan ${Math.min(pool.length, cursor)} siswa ke ${rooms.length} ruang ujian.`);
    }
    setShowAutoFillModal(false);
  };

  const handleClearActiveRoomSeats = () => {
    if (!canEdit || !activeRoom) return;
    const updated = rooms.map(r =>
      r.id === activeRoom.id
        ? {
            ...r,
            kursiList: r.kursiList.map(k => ({
              ...k,
              siswaId: undefined,
              namaSiswa: '',
              kelasSiswa: '',
              nomorPeserta: ''
            })),
            updatedAt: new Date().toISOString()
          }
        : r
    );
    persistRooms(updated);
    showToast(`Seluruh kursi di ${activeRoom.namaRuang} telah dikosongkan.`);
  };

  // Group seats of activeRoom into tables based on explicit tableIndex/slotIndex (or kursiPerMeja fallback)
  const activeRoomTables = useMemo(() => {
    if (!activeRoom) return [];
    const perTable = activeRoom.kursiPerMeja || 4;
    const materialized = materializeSeatLayout(activeRoom.kursiList, perTable);
    const byTable = new Map<number, Array<DenahKursi & { tableIndex: number; slotIndex: number }>>();
    materialized.forEach(seat => {
      const arr = byTable.get(seat.tableIndex) || [];
      arr.push(seat);
      byTable.set(seat.tableIndex, arr);
    });
    const sortedIds = Array.from(byTable.keys()).sort((a, b) => a - b);
    return sortedIds.map(tIdx => {
      const tableSeats = byTable.get(tIdx) || [];
      const slots: Array<DenahKursi | undefined> = Array.from({ length: perTable }, () => undefined);
      tableSeats.forEach(seat => {
        if (seat.slotIndex >= 0 && seat.slotIndex < perTable && !slots[seat.slotIndex]) {
          slots[seat.slotIndex] = seat;
        } else {
          const freeIdx = slots.findIndex(s => !s);
          if (freeIdx !== -1) slots[freeIdx] = seat;
        }
      });
      return {
        tableIndex: tIdx,
        seats: tableSeats,
        slots
      };
    });
  }, [activeRoom]);

  const filledCountActive = useMemo(() => {
    if (!activeRoom) return 0;
    return activeRoom.kursiList.filter(k => k.namaSiswa && k.namaSiswa.trim() !== '').length;
  }, [activeRoom]);

  const emptyCountActive = useMemo(() => {
    if (!activeRoom) return 0;
    return activeRoom.kursiList.length - filledCountActive;
  }, [activeRoom, filledCountActive]);

  const totalCapacityAll = useMemo(() => rooms.reduce((sum, r) => sum + r.jumlahKursi, 0), [rooms]);
  const totalFilledAll = useMemo(
    () => rooms.reduce((sum, r) => sum + r.kursiList.filter(k => k.namaSiswa.trim() !== '').length, 0),
    [rooms]
  );

  // Lookup student record from siswaList to enrich roster rows (NISN, NIS, No. Peserta)
  const siswaLookup = useMemo(() => {
    const byId = new Map<string, Siswa>();
    const byName = new Map<string, Siswa>();
    siswaList.forEach(s => {
      byId.set(s.id, s);
      if (s.nama) byName.set(s.nama.trim().toLowerCase(), s);
    });
    return { byId, byName };
  }, [siswaList]);

  const enrichSeatRow = (room: DenahRuangItem, seat: DenahKursi) => {
    const perTable = room.kursiPerMeja || 4;
    const tableNo =
      typeof seat.tableIndex === 'number' && seat.tableIndex >= 1
        ? seat.tableIndex
        : Math.floor((seat.nomorKursi - 1) / perTable) + 1;
    const isFilled = Boolean(seat.namaSiswa && seat.namaSiswa.trim());
    const matchedSiswa = isFilled
      ? (seat.siswaId ? siswaLookup.byId.get(seat.siswaId) : undefined) ||
        siswaLookup.byName.get(seat.namaSiswa.trim().toLowerCase())
      : undefined;
    const nisn = matchedSiswa?.nisn || '';
    const nis = matchedSiswa?.nis || seat.nomorPeserta || '';
    const noPeserta = isFilled
      ? (nisn || nis ? `C2026-${(nisn || nis).slice(-4)}` : seat.nomorPeserta || '-')
      : '-';

    return {
      roomId: room.id,
      roomName: room.namaRuang,
      pengawas: room.pengawas,
      seat,
      nomorKursi: seat.nomorKursi,
      tableNo,
      isFilled,
      namaSiswa: seat.namaSiswa.trim(),
      kelasSiswa: (seat.kelasSiswa || matchedSiswa?.kelas || '').trim(),
      nisn,
      nis,
      noPeserta
    };
  };

  const activeRoomRoster = useMemo(() => {
    if (!activeRoom) return [];
    return activeRoom.kursiList.map(seat => enrichSeatRow(activeRoom, seat));
  }, [activeRoom, siswaLookup]);

  const activeRoomClassSummary = useMemo(() => {
    const counts = new Map<string, number>();
    activeRoomRoster.forEach(row => {
      if (!row.isFilled) return;
      const cls = row.kelasSiswa || 'Tanpa Kelas';
      counts.set(cls, (counts.get(cls) || 0) + 1);
    });
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }));
  }, [activeRoomRoster]);

  const allRoomsRoster = useMemo(() => {
    return rooms.flatMap(room => room.kursiList.map(seat => enrichSeatRow(room, seat)));
  }, [rooms, siswaLookup]);

  const scopedRosterBase = useMemo(() => {
    return viewMode === 'roster' && rosterScope === 'all' ? allRoomsRoster : activeRoomRoster;
  }, [viewMode, rosterScope, allRoomsRoster, activeRoomRoster]);

  const availableRosterClasses = useMemo(() => {
    const set = new Set<string>();
    scopedRosterBase.forEach(row => {
      if (row.isFilled && row.kelasSiswa) set.add(row.kelasSiswa);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [scopedRosterBase]);

  const filteredRosterRows = useMemo(() => {
    const q = rosterSearch.trim().toLowerCase();
    return scopedRosterBase.filter(row => {
      if (rosterStatusFilter === 'terisi' && !row.isFilled) return false;
      if (rosterStatusFilter === 'kosong' && row.isFilled) return false;
      if (rosterKelasFilter !== 'Semua' && row.kelasSiswa !== rosterKelasFilter) return false;
      if (q) {
        const seatCode = `#${String(row.nomorKursi).padStart(2, '0')}`;
        const tableLabel = `meja ${row.tableNo}`;
        const hit =
          row.namaSiswa.toLowerCase().includes(q) ||
          row.kelasSiswa.toLowerCase().includes(q) ||
          row.nis.toLowerCase().includes(q) ||
          row.nisn.toLowerCase().includes(q) ||
          row.noPeserta.toLowerCase().includes(q) ||
          row.roomName.toLowerCase().includes(q) ||
          seatCode.includes(q) ||
          String(row.nomorKursi) === q ||
          tableLabel.includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [scopedRosterBase, rosterSearch, rosterKelasFilter, rosterStatusFilter]);

  const handlePrintRoomRoster = (scope: 'active' | 'all' = 'active') => {
    const targetRooms = scope === 'all' ? rooms : activeRoom ? [activeRoom] : [];
    if (targetRooms.length === 0) return;

    const schoolName = (schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase();
    const examTitle =
      activeRoom?.judulUjian && activeRoom.judulUjian !== DEFAULT_JUDUL_UJIAN
        ? activeRoom.judulUjian
        : configuredExamBanner;
    const kota = cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok';
    const kepsekNama = cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah';
    const kepsekNip = (cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '').trim();
    const todayStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const logoTag = schoolSettings?.logoUrl
      ? `<img src="${escapeHtmlStr(schoolSettings.logoUrl)}" alt="Logo" class="kop-logo" referrerpolicy="no-referrer" />`
      : '';
    const sigImgTag = cbtSettings?.ttdKepalaSekolahUrl
      ? `<img src="${escapeHtmlStr(cbtSettings.ttdKepalaSekolahUrl)}" alt="TTD" class="sig-img" referrerpolicy="no-referrer" />`
      : '';

    const daysToPrint: Array<ExamAttendanceDay | null> =
      selectedDaysForOutput && selectedDaysForOutput.length > 0 ? selectedDaysForOutput : [null];

    const pagesHtml = targetRooms
      .flatMap(room => {
        const rows = room.kursiList.map(seat => enrichSeatRow(room, seat));
        const filled = rows.filter(r => r.isFilled).length;
        const totalMeja = getRoomTableCount(room);
        const classCounts = new Map<string, number>();
        rows.forEach(r => {
          if (r.isFilled) {
            const c = r.kelasSiswa || '-';
            classCounts.set(c, (classCounts.get(c) || 0) + 1);
          }
        });
        const classSummaryText = Array.from(classCounts.entries())
          .sort((a, b) => a[0].localeCompare(b[0], undefined, { numeric: true }))
          .map(([k, v]) => `${k}: ${v}`)
          .join(' • ');

        return daysToPrint.map(day => {
          if (!day) {
            const trHtml = rows
              .map(
                (r, idx) => `
                  <tr class="${r.isFilled ? '' : 'empty-seat'}">
                    <td class="c">${idx + 1}</td>
                    <td class="c bold">#${String(r.nomorKursi).padStart(2, '0')}</td>
                    <td class="c">Meja ${r.tableNo}</td>
                    <td class="c mono">${escapeHtmlStr(r.noPeserta)}</td>
                    <td class="bold">${r.isFilled ? escapeHtmlStr(r.namaSiswa) : '<em>(Kursi Kosong)</em>'}</td>
                    <td>${escapeHtmlStr(r.kelasSiswa || '-')}</td>
                    <td class="c mono">${escapeHtmlStr(r.nis || r.nisn || '-')}</td>
                    <td class="ttd-col">${idx % 2 === 0 ? `${idx + 1}.` : `&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;${idx + 1}.`}</td>
                  </tr>`
              )
              .join('');

            return `
              <section class="sheet">
                <header class="kop">
                  ${logoTag}
                  <div class="kop-text">
                    <div class="kop-title">DAFTAR PESERTA &amp; PENEMPATAN DUDUK RUANG UJIAN</div>
                    <div class="kop-exam">${escapeHtmlStr(examTitle)}</div>
                    <div class="kop-school">${escapeHtmlStr(schoolName)}</div>
                  </div>
                  <div class="room-badge">
                    <div class="room-badge-lbl">RUANG UJIAN</div>
                    <div class="room-badge-val">${escapeHtmlStr(room.namaRuang.toUpperCase())}</div>
                  </div>
                </header>

                <div class="meta-bar">
                  <div><strong>Pengawas Ruang:</strong> ${escapeHtmlStr(room.pengawas || '-')}</div>
                  <div><strong>Jumlah Peserta:</strong> ${filled} / ${room.jumlahKursi} Kursi (${totalMeja} Meja)</div>
                </div>

                <table>
                  <thead>
                    <tr>
                      <th style="width:5%">No</th>
                      <th style="width:8%">Kursi</th>
                      <th style="width:9%">Meja</th>
                      <th style="width:13%">No. Peserta</th>
                      <th style="width:30%">Nama Lengkap Siswa</th>
                      <th style="width:13%">Kelas</th>
                      <th style="width:11%">NIS / NISN</th>
                      <th style="width:11%">Paraf</th>
                    </tr>
                  </thead>
                  <tbody>${trHtml}</tbody>
                </table>

                ${
                  classSummaryText
                    ? `<div class="class-rekap"><strong>Rekap per Kelas:</strong> ${escapeHtmlStr(classSummaryText)}</div>`
                    : ''
                }

                <div class="sig-row">
                  <div class="sig-box">
                    <div>Mengetahui,</div>
                    <div class="sig-role">Kepala Sekolah</div>
                    <div class="sig-space">${sigImgTag}</div>
                    <div class="sig-name">${escapeHtmlStr(kepsekNama)}</div>
                    ${kepsekNip && kepsekNip !== '-' ? `<div class="sig-nip">NIP. ${escapeHtmlStr(kepsekNip)}</div>` : ''}
                  </div>
                  <div class="sig-box">
                    <div>${escapeHtmlStr(kota)}, ${escapeHtmlStr(todayStr)}</div>
                    <div class="sig-role">Pengawas ${escapeHtmlStr(room.namaRuang)}</div>
                    <div class="sig-space"></div>
                    <div class="sig-name">${escapeHtmlStr(room.pengawas || '....................................')}</div>
                  </div>
                </div>
              </section>`;
          }

          const sessions = day.sessions.slice(0, 4);
          const sessionHeaders =
            sessions.length <= 1
              ? `<th style="width:24%">PARAF${sessions[0] ? `<div class="th-sub">${escapeHtmlStr(abbreviateMapel(sessions[0].mataPelajaran))}</div>` : ''}</th><th style="width:11%">KET.<div class="th-sub">H/S/I/A</div></th>`
              : `${sessions
                  .map(
                    (s, i) =>
                      `<th style="width:${sessions.length === 2 ? '13.5%' : sessions.length === 3 ? '9.6%' : '7.2%'}">SESI ${i + 1}<div class="th-sub">${escapeHtmlStr(abbreviateMapel(s.mataPelajaran))}</div></th>`
                  )
                  .join('')}<th style="width:${sessions.length === 2 ? '8%' : '6.2%'}">KET.<div class="th-sub">H/S/I/A</div></th>`;

          const sessionColCount = Math.max(1, sessions.length);
          const trHtml = rows
            .map((r, idx) => {
              const parafCells = Array.from({ length: sessionColCount })
                .map(
                  () =>
                    `<td class="ttd-col">${idx % 2 === 0 ? `${idx + 1}.` : `&nbsp;&nbsp;&nbsp;&nbsp;${idx + 1}.`}</td>`
                )
                .join('');
              return `
                <tr class="${r.isFilled ? '' : 'empty-seat'}">
                  <td class="c">${idx + 1}</td>
                  <td class="c bold">#${String(r.nomorKursi).padStart(2, '0')}</td>
                  <td class="c">M${r.tableNo}</td>
                  <td class="c mono">${escapeHtmlStr(r.noPeserta)}</td>
                  <td class="bold">${r.isFilled ? escapeHtmlStr(r.namaSiswa) : '<em>(Kursi Kosong)</em>'}</td>
                  <td>${escapeHtmlStr(r.kelasSiswa || '-')}</td>
                  ${parafCells}
                  <td></td>
                </tr>`;
            })
            .join('');

          const scheduleText =
            day.sessions.length > 0
              ? day.sessions
                  .map(
                    (s, i) =>
                      `Sesi ${i + 1}: ${s.mataPelajaran}${s.jamMulai ? ` (${s.jamMulai}-${s.jamSelesai})` : ''}`
                  )
                  .join(' • ')
              : 'Sesuai jadwal ujian harian';

          return `
            <section class="sheet">
              <header class="kop">
                ${logoTag}
                <div class="kop-text">
                  <div class="kop-title">DAFTAR HADIR PESERTA UJIAN (ABSENSI HARIAN)</div>
                  <div class="kop-exam">${escapeHtmlStr(examTitle)}</div>
                  <div class="kop-school">${escapeHtmlStr(schoolName)}</div>
                </div>
                <div class="room-badge">
                  <div class="room-badge-lbl">RUANG UJIAN</div>
                  <div class="room-badge-val">${escapeHtmlStr(room.namaRuang.toUpperCase())}</div>
                  <div class="day-pill">HARI KE-${day.dayIndex}</div>
                </div>
              </header>

              <div class="meta-bar daily-meta">
                <div class="meta-row">
                  <div><strong>Hari / Tanggal:</strong> ${escapeHtmlStr(day.hariTanggalLabel)}</div>
                  <div><strong>Jumlah Peserta:</strong> ${filled} / ${room.jumlahKursi} Kursi (${totalMeja} Meja)</div>
                </div>
                <div class="meta-row">
                  <div><strong>Pengawas Ruang:</strong> ${escapeHtmlStr(room.pengawas || '-')}</div>
                  <div><strong>${day.sessions.length > 0 ? `${day.sessions.length} Mata Pelajaran` : 'Absensi Harian'}</strong></div>
                </div>
                <div class="meta-schedule"><strong>Jadwal Sesi:</strong> ${escapeHtmlStr(scheduleText)}</div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th style="width:4%">No</th>
                    <th style="width:6.2%">Kursi</th>
                    <th style="width:5.4%">Meja</th>
                    <th style="width:11.4%">No. Peserta</th>
                    <th style="width:26%">Nama Lengkap Siswa</th>
                    <th style="width:12%">Kelas</th>
                    ${sessionHeaders}
                  </tr>
                </thead>
                <tbody>${trHtml}</tbody>
              </table>

              <div class="hadir-rekap">
                <strong>Rekap Kehadiran Harian:</strong>
                &nbsp;&nbsp;Terdaftar: <strong>${filled}</strong>
                &nbsp;&nbsp;|&nbsp;&nbsp;Hadir: ..........
                &nbsp;&nbsp;|&nbsp;&nbsp;Sakit: ..........
                &nbsp;&nbsp;|&nbsp;&nbsp;Izin: ..........
                &nbsp;&nbsp;|&nbsp;&nbsp;Alfa: ..........
              </div>

              ${
                classSummaryText
                  ? `<div class="class-rekap"><strong>Rekap per Kelas:</strong> ${escapeHtmlStr(classSummaryText)}</div>`
                  : ''
              }

              <div class="sig-row">
                <div class="sig-box">
                  <div>Mengetahui,</div>
                  <div class="sig-role">Kepala Sekolah</div>
                  <div class="sig-space">${sigImgTag}</div>
                  <div class="sig-name">${escapeHtmlStr(kepsekNama)}</div>
                  ${kepsekNip && kepsekNip !== '-' ? `<div class="sig-nip">NIP. ${escapeHtmlStr(kepsekNip)}</div>` : ''}
                </div>
                <div class="sig-box">
                  <div>${escapeHtmlStr(kota)}, ${escapeHtmlStr(day.tanggalPenetapanLabel)}</div>
                  <div class="sig-role">Pengawas ${escapeHtmlStr(room.namaRuang)}</div>
                  <div class="sig-space"></div>
                  <div class="sig-name">${escapeHtmlStr(room.pengawas || '....................................')}</div>
                </div>
              </div>
            </section>`;
        });
      })
      .join('');

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Absensi Ujian Per Hari — Daftar Nama Siswa</title>
  <style>
    @page { size: A4 portrait; margin: 10mm 11mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; background: #fff; font-size: 8.6pt; }
    .sheet { page-break-after: always; }
    .sheet:last-child { page-break-after: auto; }
    .kop { display: flex; align-items: center; gap: 12px; border-bottom: 2.5px solid #082f63; padding-bottom: 7px; margin-bottom: 7px; }
    .kop-logo { width: 46px; height: 46px; object-fit: contain; flex-shrink: 0; }
    .kop-text { flex: 1; text-align: center; }
    .kop-title { font-size: 11pt; font-weight: 900; color: #082f63; letter-spacing: 0.3px; }
    .kop-exam { font-size: 8.6pt; font-weight: 800; color: #1e293b; margin-top: 2px; }
    .kop-school { font-size: 9.6pt; font-weight: 900; color: #0f172a; margin-top: 1px; }
    .room-badge { border: 2px solid #082f63; border-radius: 6px; padding: 4px 10px; text-align: center; background: #f0f9ff; flex-shrink: 0; min-width: 96px; }
    .room-badge-lbl { font-size: 6.2pt; font-weight: 800; color: #475569; }
    .room-badge-val { font-size: 10.5pt; font-weight: 900; color: #082f63; }
    .day-pill { margin-top: 2px; background: #082f63; color: #fde047; font-size: 6.4pt; font-weight: 800; border-radius: 3px; padding: 1px 6px; }
    .meta-bar { display: flex; justify-content: space-between; font-size: 8.2pt; background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 5px 9px; margin-bottom: 7px; }
    .daily-meta { flex-direction: column; gap: 3px; }
    .meta-row { display: flex; justify-content: space-between; gap: 8px; }
    .meta-schedule { font-size: 7.6pt; color: #334155; border-top: 1px dashed #cbd5e1; padding-top: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 8pt; }
    th, td { border: 1px solid #94a3b8; padding: 3.5px 5px; text-align: left; }
    thead th { background: #082f63; color: #fff; font-weight: 800; text-transform: uppercase; font-size: 7.1pt; text-align: center; line-height: 1.2; }
    .th-sub { font-size: 6.2pt; font-weight: 600; color: #e0f2fe; text-transform: none; margin-top: 1px; }
    tbody tr:nth-child(even) { background: #f8fafc; }
    tbody tr.empty-seat { color: #94a3b8; }
    .c { text-align: center; }
    .bold { font-weight: 700; }
    .mono { font-variant-numeric: tabular-nums; font-weight: 600; }
    .ttd-col { color: #94a3b8; font-size: 7pt; }
    .hadir-rekap { margin-top: 6px; font-size: 7.9pt; color: #0f172a; background: #f0f9ff; padding: 5px 8px; border-radius: 5px; border: 1px solid #93c5fd; }
    .class-rekap { margin-top: 5px; font-size: 7.6pt; color: #334155; background: #f1f5f9; padding: 4px 8px; border-radius: 5px; border: 1px solid #cbd5e1; }
    .sig-row { display: flex; justify-content: space-between; margin-top: 14px; padding: 0 18px; font-size: 8.2pt; }
    .sig-box { width: 42%; text-align: center; }
    .sig-role { font-weight: 700; margin-top: 2px; }
    .sig-space { height: 42px; display: flex; align-items: center; justify-content: center; }
    .sig-img { max-height: 40px; max-width: 120px; object-fit: contain; }
    .sig-name { font-weight: 800; text-decoration: underline; }
    .sig-nip { font-size: 7.4pt; color: #475569; margin-top: 2px; }
  </style>
</head>
<body>${pagesHtml}</body>
</html>`;

    printHtmlViaHiddenIframe(html);
  };

  const handleExportRoomRosterCsv = (scope: 'active' | 'all' = 'active') => {
    const rows = scope === 'all' ? allRoomsRoster : activeRoomRoster;
    const headers = ['Ruang Ujian', 'Pengawas', 'No Kursi', 'Meja', 'No Peserta', 'Nama Lengkap Siswa', 'Kelas', 'NIS', 'NISN', 'Status'];
    const csvEscape = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const lines = [
      headers.map(csvEscape).join(','),
      ...rows.map(r =>
        [
          r.roomName,
          r.pengawas,
          `#${String(r.nomorKursi).padStart(2, '0')}`,
          `Meja ${r.tableNo}`,
          r.noPeserta,
          r.isFilled ? r.namaSiswa : '(Kosong)',
          r.kelasSiswa || '-',
          r.nis || '-',
          r.nisn || '-',
          r.isFilled ? 'Terisi' : 'Kosong'
        ]
          .map(csvEscape)
          .join(',')
      )
    ];
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const fileLabel =
      scope === 'all'
        ? 'daftar-siswa-semua-ruang-ujian'
        : `daftar-siswa-${(activeRoom?.namaRuang || 'ruang').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
    link.href = url;
    link.download = `${fileLabel}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast(`Berhasil mengunduh ${fileLabel}.csv (${rows.filter(r => r.isFilled).length} siswa).`);
  };

  const handleDownloadRoomRosterPdf = async (scope: 'active' | 'all' = 'active') => {
    if (isDownloadingRosterPdf) return;
    const targetRooms = scope === 'all' ? rooms : activeRoom ? [activeRoom] : [];
    if (targetRooms.length === 0) return;

    const q = rosterSearch.trim().toLowerCase();
    const hasFilter =
      rosterKelasFilter !== 'Semua' || rosterStatusFilter !== 'semua' || Boolean(q);

    const pdfRooms: DaftarSiswaPdfRoom[] = [];
    for (const room of targetRooms) {
      let rows = room.kursiList.map(seat => enrichSeatRow(room, seat));
      if (hasFilter) {
        rows = rows.filter(row => {
          if (rosterStatusFilter === 'terisi' && !row.isFilled) return false;
          if (rosterStatusFilter === 'kosong' && row.isFilled) return false;
          if (rosterKelasFilter !== 'Semua' && row.kelasSiswa !== rosterKelasFilter) return false;
          if (q) {
            const seatCode = `#${String(row.nomorKursi).padStart(2, '0')}`;
            const tableLabel = `meja ${row.tableNo}`;
            const hit =
              row.namaSiswa.toLowerCase().includes(q) ||
              row.kelasSiswa.toLowerCase().includes(q) ||
              row.nis.toLowerCase().includes(q) ||
              row.nisn.toLowerCase().includes(q) ||
              row.noPeserta.toLowerCase().includes(q) ||
              row.roomName.toLowerCase().includes(q) ||
              seatCode.includes(q) ||
              String(row.nomorKursi) === q ||
              tableLabel.includes(q);
            if (!hit) return false;
          }
          return true;
        });
      }
      if (!hasFilter || rows.length > 0) {
        pdfRooms.push({
          roomName: room.namaRuang,
          pengawas: room.pengawas,
          jumlahKursi: room.jumlahKursi,
          kursiPerMeja: room.kursiPerMeja || 4,
          rows: rows.map(r => ({
            nomorKursi: r.nomorKursi,
            tableNo: r.tableNo,
            noPeserta: r.noPeserta,
            namaSiswa: r.namaSiswa,
            kelasSiswa: r.kelasSiswa,
            nis: r.nis,
            nisn: r.nisn,
            isFilled: r.isFilled
          }))
        });
      }
    }

    if (pdfRooms.length === 0) {
      showToast('Tidak ada data siswa yang cocok dengan filter untuk diunduh ke PDF.');
      return;
    }

    const filterParts: string[] = [];
    if (rosterKelasFilter !== 'Semua') filterParts.push(`Kelas ${rosterKelasFilter}`);
    if (rosterStatusFilter !== 'semua') {
      filterParts.push(rosterStatusFilter === 'terisi' ? 'Kursi Terisi' : 'Kursi Kosong');
    }
    if (rosterSearch.trim()) filterParts.push(`Pencarian "${rosterSearch.trim()}"`);

    const schoolName = (schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase();
    const examTitle =
      activeRoom?.judulUjian && activeRoom.judulUjian !== DEFAULT_JUDUL_UJIAN
        ? activeRoom.judulUjian
        : configuredExamBanner;
    const kota = cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok';
    const kepsekNama = cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah';
    const kepsekNip = (cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '').trim();

    const roomSlug =
      scope === 'all'
        ? 'semua-ruang'
        : (activeRoom?.namaRuang || 'ruang').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const daySlug =
      selectedAttendanceDay === 'general'
        ? `daftar-siswa-${roomSlug}`
        : selectedAttendanceDay === 'all_days'
        ? `absensi-ujian-perhari-${roomSlug}`
        : `absensi-ujian-${selectedAttendanceDay}-${roomSlug}`;

    setIsDownloadingRosterPdf(true);
    try {
      await downloadDaftarSiswaRuangPdf({
        rooms: pdfRooms,
        attendanceDays: selectedDaysForOutput,
        schoolName,
        examTitle,
        kota,
        kepsekNama,
        kepsekNip,
        logoUrl: schoolSettings?.logoUrl,
        ttdKepalaSekolahUrl: cbtSettings?.ttdKepalaSekolahUrl,
        filterNote: filterParts.length > 0 ? filterParts.join(' · ') : undefined,
        fileName: `${daySlug}.pdf`
      });
      const totalSiswa = pdfRooms.reduce(
        (sum, r) => sum + r.rows.filter(row => row.isFilled).length,
        0
      );
      const dayInfo = selectedDaysForOutput
        ? ` · ${selectedDaysForOutput.length} hari ujian`
        : '';
      showToast(`Berhasil mengunduh ${daySlug}.pdf (${totalSiswa} siswa${dayInfo}).`);
    } catch (err) {
      console.error('Gagal mengunduh PDF daftar nama siswa:', err);
      showToast('Gagal membuat file PDF daftar nama siswa.');
    } finally {
      setIsDownloadingRosterPdf(false);
    }
  };

  // Direct PDF download for the visual floorplan poster (Denah Ruang Ujian)
  const handleDownloadDenahPdf = async () => {
    if (isDownloadingDenahPdf) return;
    setIsDownloadingDenahPdf(true);
    setSwapSourceSeat(null);
    setActiveDrag(null);

    const wasRosterMode = viewMode === 'roster';
    if (wasRosterMode) {
      setViewMode('detail');
      await new Promise(resolve => setTimeout(resolve, 180));
    } else {
      await new Promise(resolve => requestAnimationFrame(() => resolve(undefined)));
    }

    try {
      const posterEl = denahPosterRef.current;
      if (!posterEl) {
        showToast('Tampilan denah belum siap untuk diunduh.');
        return;
      }

      const effectiveMode = wasRosterMode ? 'detail' : viewMode;
      const roomSlug = (activeRoom?.namaRuang || 'ruang')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      const fileName =
        effectiveMode === 'overview'
          ? 'denah-semua-ruang-ujian.pdf'
          : `denah-ruang-ujian-${roomSlug || 'ruang'}.pdf`;

      const rosterEl =
        effectiveMode === 'detail' && showRosterInPoster ? denahPosterRosterRef.current : null;

      const { usedOrientation } = await downloadDenahRuangPdf({
        posterEl,
        rosterEl,
        fileName,
        orientation: pdfOrientation
      });

      const orientLabel = usedOrientation === 'portrait' ? 'A4 Portrait' : 'A4 Landscape';
      showToast(
        rosterEl
          ? `Berhasil mengunduh ${fileName} (${orientLabel} · Denah + Daftar Nama Siswa).`
          : `Berhasil mengunduh ${fileName} (${orientLabel} · Ukuran Penuh HVS A4).`
      );
    } catch (err) {
      console.error('Gagal mengunduh PDF denah ruang ujian:', err);
      showToast('Gagal membuat file PDF denah ruang ujian.');
    } finally {
      setIsDownloadingDenahPdf(false);
    }
  };

  // Filtered students for seat picker modal
  const filteredModalStudents = useMemo(() => {
    const q = seatSearchStudent.trim().toLowerCase();
    return siswaList
      .filter(s => s.status === 'Aktif')
      .filter(s => seatFilterKelas === 'Semua' || s.kelas === seatFilterKelas)
      .filter(s => !q || s.nama.toLowerCase().includes(q) || (s.nis || '').toLowerCase().includes(q) || (s.kelas || '').toLowerCase().includes(q))
      .sort((a, b) => a.nama.localeCompare(b.nama));
  }, [siswaList, seatSearchStudent, seatFilterKelas]);

  const renderChairButton = (seat: DenahKursi, orientation: 'top' | 'bottom' | 'left' | 'right' | 'single') => {
    const isFilled = Boolean(seat.namaSiswa && seat.namaSiswa.trim());
    const isSwapSource = swapSourceSeat === seat.nomorKursi;
    const q = searchQuery.trim().toLowerCase();
    const isSearchHit = Boolean(q && isFilled && (
      seat.namaSiswa.toLowerCase().includes(q) ||
      (seat.nomorPeserta || '').toLowerCase().includes(q) ||
      (seat.kelasSiswa || '').toLowerCase().includes(q)
    ));
    const isMySeat = Boolean(myStudentName && isFilled && seat.namaSiswa.toLowerCase() === myStudentName.toLowerCase());

    const shortName = isFilled
      ? seat.namaSiswa.split(' ').slice(0, 2).join(' ')
      : 'Kosong';

    const shapeClasses =
      orientation === 'left'
        ? 'rounded-l-xl rounded-r-md'
        : orientation === 'right'
        ? 'rounded-r-xl rounded-l-md'
        : orientation === 'top'
        ? 'rounded-t-xl rounded-b-md'
        : 'rounded-b-xl rounded-t-md';

    const seatKey = String(seat.nomorKursi);
    const seatOffset = getElementOffset(activeRoom, 'seat', seatKey);
    const isDraggingThisSeat = activeDrag?.kind === 'seat' && activeDrag.key === seatKey;
    const canDragSeat = canEdit && dragMoveEnabled && viewMode === 'detail' && swapSourceSeat === null;
    const canDeleteSeat = canEdit && viewMode === 'detail' && Boolean(activeRoom && activeRoom.kursiList.length > 1);

    return (
      <div
        key={seat.nomorKursi}
        role={canEdit ? 'button' : undefined}
        tabIndex={canEdit ? 0 : undefined}
        onPointerDown={e => startDragMove(e, 'seat', seatKey)}
        onClick={() => handleSeatClick(seat)}
        onKeyDown={e => {
          if (canEdit && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleSeatClick(seat);
          }
        }}
        style={{
          transform:
            seatOffset.x !== 0 || seatOffset.y !== 0
              ? `translate3d(${seatOffset.x}px, ${seatOffset.y}px, 0)`
              : undefined
        }}
        title={
          isFilled
            ? `Kursi #${seat.nomorKursi}: ${seat.namaSiswa} (${seat.kelasSiswa || '-'})${
                canDragSeat
                  ? ' — Klik untuk edit, tahan & geser untuk pindah, klik × untuk hapus kursi'
                  : canEdit
                  ? ' — Klik untuk edit, klik × untuk hapus kursi'
                  : ''
              }`
            : `Kursi #${seat.nomorKursi}: Kosong${
                canDragSeat
                  ? ' — Klik untuk pilih siswa, tahan & geser untuk pindah, klik × untuk hapus kursi'
                  : canEdit
                  ? ' — Klik untuk pilih siswa, klik × untuk hapus kursi'
                  : ''
              }`
        }
        className={`group/seat relative border-[1.5px] text-left flex flex-col justify-center select-none ${
          isDraggingThisSeat
            ? 'transition-none z-50 ring-3 ring-sky-300 shadow-2xl scale-[1.03]'
            : 'transition-[background,box-shadow,border-color] duration-150 hover:z-30'
        } ${shapeClasses} ${
          isSwapSource
            ? 'bg-amber-500 border-amber-900 text-white ring-3 ring-amber-300 scale-105 z-20'
            : isSearchHit || isMySeat
            ? 'bg-emerald-600 border-emerald-950 text-white ring-3 ring-emerald-300 scale-105 z-20'
            : isFilled
            ? 'bg-gradient-to-b from-[#2563eb] to-[#1d4ed8] hover:from-[#3b82f6] hover:to-[#1d4ed8] border-slate-900 text-white shadow-[0_2px_0_#0f172a]'
            : 'bg-gradient-to-b from-[#60a5fa]/75 to-[#3b82f6]/85 hover:from-[#3b82f6] hover:to-[#2563eb] border-slate-800/80 border-dashed text-white/95 shadow-[0_1.5px_0_#1e3a8a]'
        } ${
          canDragSeat
            ? isDraggingThisSeat
              ? 'cursor-grabbing touch-none'
              : 'cursor-grab touch-none'
            : canEdit
            ? 'cursor-pointer active:translate-y-0.5'
            : 'cursor-default'
        } ${
          orientation === 'left' || orientation === 'right'
            ? 'w-[94px] min-h-[46px] px-2 py-1'
            : orientation === 'single'
            ? 'w-full min-h-[46px] px-2 py-1'
            : 'w-[122px] min-h-[44px] px-2 py-1'
        }`}
      >
        {canDeleteSeat && (
          <button
            type="button"
            data-no-drag="true"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => {
              e.stopPropagation();
              handleDeleteSeat(seat.nomorKursi);
            }}
            title={`Hapus Kursi Biru #${String(seat.nomorKursi).padStart(2, '0')}`}
            aria-label={`Hapus Kursi #${seat.nomorKursi}`}
            className="print:hidden opacity-0 group-hover/seat:opacity-100 focus:opacity-100 transition-opacity absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white border border-white shadow-md flex items-center justify-center cursor-pointer z-30"
          >
            <X className="w-2.5 h-2.5 stroke-[3]" />
          </button>
        )}
        <div className="flex items-center justify-between gap-0.5">
          <span className="text-[9.5px] font-black tracking-tight bg-slate-950/35 px-1 py-0 rounded tabular-nums leading-tight">
            #{String(seat.nomorKursi).padStart(2, '0')}
          </span>
          <div className="flex items-center gap-0.5 min-w-0">
            {seat.kelasSiswa && (
              <span className="text-[8.5px] font-bold text-sky-100 truncate max-w-[56px] leading-tight">
                {seat.kelasSiswa.split(' - ')[0]}
              </span>
            )}
            {canDragSeat && (
              <Move className="w-2 h-2 text-sky-100/80 opacity-0 group-hover/seat:opacity-100 transition-opacity shrink-0 print:hidden" />
            )}
          </div>
        </div>
        <div className={`text-[11px] leading-tight mt-0.5 truncate ${isFilled ? 'font-extrabold text-white' : 'font-semibold text-blue-50 italic'}`}>
          {shortName}
        </div>
        {seat.nomorPeserta && isFilled && (
          <div className="text-[8.5px] leading-tight text-blue-100/90 font-mono truncate tabular-nums">
            {seat.nomorPeserta}
          </div>
        )}
      </div>
    );
  };

  if (!activeRoom) return null;

  const schoolDisplayName = (schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase();

  return (
    <div className="space-y-5">
      {/* Floating Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[120] bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-400/50 flex items-center gap-2.5 text-xs font-bold print:hidden">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Control Toolbar (hidden on print) */}
      <div className="bg-[#121212] rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4 print:hidden">
        {/* Top Row: View Mode + Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <LayoutGrid className="w-5 h-5 text-sky-400" />
              <span>Denah Ruang & Penempatan Duduk Peserta Ujian</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
              Total {rooms.length} ruang ujian · {totalFilledAll} dari {totalCapacityAll} kursi terisi · Klik kursi biru mana saja untuk mengedit nama siswa
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Mode Switcher */}
            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
              <button
                type="button"
                onClick={() => setViewMode('detail')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'detail'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Denah ({activeRoom.namaRuang})
              </button>
              <button
                type="button"
                onClick={() => setViewMode('roster')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                  viewMode === 'roster'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <ClipboardList className="w-3.5 h-3.5" />
                <span>Daftar Siswa ({filledCountActive})</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  viewMode === 'overview'
                    ? 'bg-sky-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Semua Ruang ({rooms.length})
              </button>
            </div>

            {canEdit && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setAutoFillSelectedClasses([]);
                    setShowAutoFillModal(true);
                  }}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Isi Otomatis</span>
                </button>
                <button
                  type="button"
                  onClick={openAddRoomModal}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Ruang</span>
                </button>
              </>
            )}

            {viewMode === 'detail' && (
              <button
                type="button"
                onClick={() => setShowRosterInPoster(prev => !prev)}
                className={`px-3 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer border whitespace-nowrap ${
                  showRosterInPoster
                    ? 'bg-sky-950/70 text-sky-200 border-sky-500/50 hover:bg-sky-900/70'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Tampilkan atau sembunyikan tabel daftar nama siswa pada poster denah"
              >
                {showRosterInPoster ? <Eye className="w-3.5 h-3.5 text-sky-400" /> : <EyeOff className="w-3.5 h-3.5" />}
                <span>Daftar di Denah</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handlePrintRoomRoster(viewMode === 'roster' ? rosterScope : 'active')}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-md whitespace-nowrap"
            >
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Cetak Daftar Siswa</span>
            </button>

            <div className="flex items-center rounded-xl overflow-hidden shadow-md border border-rose-500/40 bg-slate-900">
              <select
                value={pdfOrientation}
                onChange={e => setPdfOrientation(e.target.value as DenahPdfOrientation)}
                title="Pilih ukuran & orientasi kertas HVS A4 untuk PDF Denah"
                className="bg-slate-900 text-rose-200 text-xs font-bold pl-2.5 pr-1.5 py-2 focus:outline-none cursor-pointer border-r border-slate-700"
              >
                <option value="auto" className="bg-slate-900 text-white">A4 Auto</option>
                <option value="portrait" className="bg-slate-900 text-white">A4 Portrait</option>
                <option value="landscape" className="bg-slate-900 text-white">A4 Landscape</option>
              </select>
              <button
                type="button"
                onClick={handleDownloadDenahPdf}
                disabled={isDownloadingDenahPdf}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="Unduh denah ruang ujian langsung dalam format PDF penuh kertas HVS A4"
              >
                {isDownloadingDenahPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{isDownloadingDenahPdf ? 'Menyiapkan PDF...' : 'Unduh Denah PDF'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Cetak Denah</span>
            </button>
          </div>
        </div>

        {/* Room Tabs + Student Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {rooms.map(r => {
              const filled = r.kursiList.filter(k => k.namaSiswa.trim() !== '').length;
              const isSelected = r.id === activeRoom.id;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    setSelectedRoomId(r.id);
                    setSwapSourceSeat(null);
                    if (viewMode === 'overview') setViewMode('detail');
                  }}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center gap-2 ${
                    isSelected
                      ? 'bg-sky-600/20 border-sky-400 text-sky-200 shadow-sm'
                      : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <span>{r.namaRuang}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono tabular-nums ${
                    isSelected ? 'bg-sky-500/30 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                    {filled}/{r.jumlahKursi}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Student Search Locator */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa / NIS duduk di mana..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Search Results Quick Jump Strip */}
        {searchQuery.trim() && (
          <div className="bg-slate-900/90 border border-slate-700 rounded-xl p-3 text-xs">
            {searchMatches.length === 0 ? (
              <div className="text-slate-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                <span>Siswa "{searchQuery}" belum ditempatkan di kursi ruang ujian mana pun.</span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-emerald-400 font-bold">Ditemukan ({searchMatches.length}):</span>
                {searchMatches.slice(0, 8).map(m => (
                  <button
                    key={`${m.roomId}-${m.seatNo}`}
                    type="button"
                    onClick={() => {
                      setSelectedRoomId(m.roomId);
                      setViewMode('detail');
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600/20 border border-emerald-500/40 text-emerald-200 hover:bg-emerald-600/35 font-semibold cursor-pointer"
                  >
                    {m.nama} → {m.roomName} · Kursi #{String(m.seatNo).padStart(2, '0')}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Active Room Quick Seat Count & Layout Bar (Editable by Admin/Guru) */}
        {canEdit && viewMode === 'detail' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-3">
              {/* Add / Remove Table Controls */}
              <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/40 rounded-xl px-3 py-1.5">
                <span className="text-xs font-bold text-amber-300 tabular-nums">
                  {activeRoomTables.length} Meja
                </span>
                <button
                  type="button"
                  onClick={handleAddTable}
                  disabled={activeRoom.jumlahKursi >= 80}
                  className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-extrabold flex items-center gap-1 cursor-pointer transition-all shadow-sm whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Meja</span>
                </button>
                {activeRoomTables.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTable(activeRoomTables.length)}
                    className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-red-900/70 text-slate-300 hover:text-red-200 flex items-center justify-center cursor-pointer transition-colors"
                    title={`Hapus Meja ${activeRoomTables.length}`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Chair Count Stepper */}
              <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                <Armchair className="w-4 h-4 text-sky-400" />
                <span className="text-xs font-bold text-slate-300">Jumlah Kursi:</span>
                <button
                  type="button"
                  onClick={() => handleChangeChairCount(activeRoom.jumlahKursi - 1)}
                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                  title="Kurangi 1 kursi"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={activeRoom.jumlahKursi}
                  onChange={e => handleChangeChairCount(Number(e.target.value))}
                  className="w-12 text-center bg-slate-950 border border-slate-700 rounded-lg py-0.5 text-xs font-extrabold text-sky-300 tabular-nums"
                />
                <button
                  type="button"
                  onClick={() => handleChangeChairCount(activeRoom.jumlahKursi + 1)}
                  className="w-6 h-6 rounded-lg bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center cursor-pointer"
                  title="Tambah 1 kursi"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <div className="hidden xl:flex items-center gap-1 ml-1 pl-2 border-l border-slate-700">
                  {[12, 16, 20, 24, 32].map(preset => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleChangeChairCount(preset)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold cursor-pointer transition-colors ${
                        activeRoom.jumlahKursi === preset
                          ? 'bg-sky-600 text-white'
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* Chairs per Table Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5">
                <span className="text-xs font-bold text-slate-300">Kursi / Meja:</span>
                {([4, 2, 1] as const).map(n => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => handleChangeChairsPerTable(n)}
                    className={`px-2.5 py-0.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      activeRoom.kursiPerMeja === n
                        ? 'bg-amber-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDragMoveEnabled(prev => {
                    const next = !prev;
                    showToast(
                      next
                        ? 'Mode Geser aktif: tahan & seret Meja Pengawas, Meja, atau Kursi untuk mengatur posisi.'
                        : 'Mode Geser dikunci: posisi meja dan kursi terkunci.'
                    );
                    return next;
                  });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                  dragMoveEnabled
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 hover:bg-cyan-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
                title="Aktifkan atau kunci fitur geser posisi meja & kursi"
              >
                <Move className="w-3.5 h-3.5" />
                <span>{dragMoveEnabled ? 'Geser Meja & Kursi: Aktif' : 'Geser Meja & Kursi: Terkunci'}</span>
              </button>

              {hasCustomLayoutPositions && (
                <button
                  type="button"
                  onClick={handleResetLayoutPositions}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-sky-950/70 text-sky-200 border border-sky-500/50 hover:bg-sky-900/70 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Kembalikan posisi semua meja & kursi ke tata letak awal"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Posisi</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  if (swapSourceSeat !== null) {
                    setSwapSourceSeat(null);
                  } else {
                    setSwapSourceSeat(activeRoom.kursiList[0]?.nomorKursi || 1);
                    showToast('Mode Tukar Kursi aktif: klik kursi lain untuk menukar posisi duduk.');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                  swapSourceSeat !== null
                    ? 'bg-amber-500 text-slate-950 border-amber-400'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>{swapSourceSeat !== null ? `Tukar dari #${swapSourceSeat} (Batal)` : 'Tukar Kursi'}</span>
              </button>

              <button
                type="button"
                onClick={openEditRoomModal}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500 flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Edit Ruang & Header</span>
              </button>

              {emptyCountActive > 0 && filledCountActive > 0 && (
                <button
                  type="button"
                  onClick={handleDeleteEmptySeats}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-950/60 text-rose-200 border border-rose-700/60 hover:bg-rose-900/70 flex items-center gap-1.5 cursor-pointer transition-colors"
                  title="Hapus semua kursi biru yang masih kosong di ruang ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus {emptyCountActive} Kursi Kosong</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClearActiveRoomSeats}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-amber-300 border border-slate-700 hover:bg-amber-500/15 flex items-center gap-1.5 cursor-pointer"
                title="Kosongkan semua nama siswa di ruang ini"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Kosongkan</span>
              </button>

              {rooms.length > 1 && (
                <button
                  type="button"
                  onClick={() => setDeleteConfirmRoom(activeRoom)}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-red-950/50 text-red-300 border border-red-800/60 hover:bg-red-900/60 flex items-center gap-1 cursor-pointer"
                  title="Hapus Ruang Ini"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* =====================================================================
          PRINTABLE POSTER AREA — FAITHFUL TO AL FAKHIR SEATING PLAN REFERENCE
         ===================================================================== */}
      {viewMode !== 'roster' && (
      <div
        id="printable-denah-ruang"
        className="bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-300 p-4 sm:p-6 overflow-x-auto"
      >
        <div className="min-w-[960px] max-w-[1060px] mx-auto space-y-4">
          <div ref={denahPosterRef} className="space-y-3 bg-white">
          {/* 1. NAVY HEADER BANNER (Matching Reference Image) */}
          <div
            data-denah-banner="true"
            className="bg-gradient-to-r from-[#082f63] via-[#0c3f7e] to-[#082f63] rounded-2xl px-6 py-4 flex items-center gap-5 shadow-md border-2 border-[#06234a]"
          >
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white p-1.5 flex items-center justify-center shrink-0 shadow-md">
              <img
                src={schoolSettings?.logoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%230c3f7e"/><text x="50" y="60" font-size="40" fill="white" text-anchor="middle" font-weight="bold">AF</text></svg>'}
                alt={schoolDisplayName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-contain"
              />
            </div>
            <div data-denah-banner-text="true" className="flex-1 text-center pr-0 sm:pr-12">
              <h1 className="text-lg sm:text-2xl font-black text-white tracking-wide uppercase leading-tight">
                DENAH PENEMPATAN DUDUK PESERTA UJIAN
                {viewMode === 'detail' ? ` — ${activeRoom.namaRuang.toUpperCase()}` : ''}
              </h1>
              <p className="text-sm sm:text-lg font-extrabold text-[#fde047] uppercase tracking-wide mt-0.5">
                {activeRoom.judulUjian && activeRoom.judulUjian !== DEFAULT_JUDUL_UJIAN
                  ? activeRoom.judulUjian
                  : configuredExamBanner}
              </p>
              <p className="text-base sm:text-xl font-black text-white uppercase tracking-wider mt-0.5">
                {schoolDisplayName}
              </p>
            </div>
          </div>

          {/* 2. MAIN BODY: WIDE FLOORPLAN ROOM + RIGHT LEGEND/RULES */}
          <div data-denah-body="true" className="grid grid-cols-[1fr_194px] gap-3 items-stretch">
            {/* CENTER FLOORPLAN ROOM FRAME */}
            <div
              ref={floorplanFrameRef}
              data-denah-floorplan="true"
              className="relative rounded-lg border-[8px] border-[#64748b] shadow-[inset_0_0_0_2px_#1e293b,0_10px_25px_rgba(15,23,42,0.12)] bg-[#f8fafc] bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] [background-size:36px_36px] min-h-[540px] flex flex-col justify-between p-4"
            >
              {/* Left-wall architectural Door */}
              <div className="absolute -left-[6px] top-3 z-10 pointer-events-none flex flex-col items-start">
                <DoorSvg className="w-10 h-24 drop-shadow" />
              </div>

              {/* TOP ZONE: Corner Plants + Meja Pengawas */}
              <div className="relative flex items-start justify-between pl-14 pr-4 pt-1 pb-4">
                <PottedPlantSvg className="w-11 h-11" />

                {/* Meja Pengawas (Draggable) */}
                {(() => {
                  const pengawasOffset = getElementOffset(activeRoom, 'pengawas', 'pengawas');
                  const isDraggingPengawas = activeDrag?.kind === 'pengawas';
                  const canDragPengawas = canEdit && dragMoveEnabled && viewMode === 'detail';
                  return (
                    <div
                      onPointerDown={e => startDragMove(e, 'pengawas', 'pengawas')}
                      style={{
                        transform:
                          pengawasOffset.x !== 0 || pengawasOffset.y !== 0
                            ? `translate3d(${pengawasOffset.x}px, ${pengawasOffset.y}px, 0)`
                            : undefined
                      }}
                      title={
                        canDragPengawas
                          ? 'Tahan & geser untuk memindahkan posisi Meja Pengawas'
                          : undefined
                      }
                      className={`group/pengawas flex flex-col items-center select-none ${
                        isDraggingPengawas ? 'z-50' : 'z-10'
                      } ${
                        canDragPengawas
                          ? isDraggingPengawas
                            ? 'cursor-grabbing touch-none'
                            : 'cursor-grab touch-none'
                          : ''
                      }`}
                    >
                      {/* Black supervisor chair behind desk */}
                      <div className="w-16 h-7 rounded-t-xl bg-gradient-to-b from-slate-600 to-slate-900 border-2 border-slate-950 -mb-2 z-0 shadow" />
                      <div
                        className={`relative z-10 bg-gradient-to-b from-[#f3b562] to-[#e49b3e] border-2 border-slate-900 rounded-lg px-7 py-2.5 shadow-[0_5px_0_#92591b] flex items-center gap-3 min-w-[270px] justify-center ${
                          isDraggingPengawas ? 'ring-4 ring-amber-400 shadow-2xl' : ''
                        }`}
                      >
                        {canDragPengawas && (
                          <span className="print:hidden opacity-0 group-hover/pengawas:opacity-100 transition-opacity absolute top-1.5 right-2 text-amber-950/75">
                            <Move className="w-3.5 h-3.5" />
                          </span>
                        )}
                        <PottedPlantSvg className="w-7 h-7 -ml-3 shrink-0" />
                        <div className="text-center">
                          <div className="bg-white/95 px-4 py-0.5 rounded-md border border-amber-700/20 text-xs font-black tracking-wider text-slate-900 uppercase">
                            MEJA PENGAWAS
                          </div>
                          <div className="text-[11px] font-bold text-amber-950 mt-0.5">
                            {activeRoom.pengawas}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <PottedPlantSvg className="w-11 h-11" />
              </div>

              {/* MIDDLE ZONE: SEATING CLUSTERS OR OVERVIEW ROOMS */}
              {viewMode === 'detail' ? (
                <div className="flex-1 flex flex-col items-center justify-center px-2 py-2 gap-4">
                  {activeRoom.kursiPerMeja === 4 ? (
                    /* 4-SEAT CLUSTER TABLES (Exact Match to Reference Image, Draggable Tables & Chairs!) */
                    <div className="grid grid-cols-2 gap-x-5 gap-y-6 w-full place-items-center">
                      {activeRoomTables.map(table => {
                        const [topSeat, leftSeat, rightSeat, bottomSeat] = table.slots;
                        const tableKey = String(table.tableIndex);
                        const tableOffset = getElementOffset(activeRoom, 'table', tableKey);
                        const isDraggingTable = activeDrag?.kind === 'table' && activeDrag.key === tableKey;
                        const canDragTable = canEdit && dragMoveEnabled;
                        const canRestoreChair = canEdit && activeRoom.kursiList.length < 80;

                        const renderAddSlotBtn = (slotIdx: number, slotClass: string, label: string) =>
                          canRestoreChair ? (
                            <button
                              type="button"
                              data-no-drag="true"
                              onClick={() => handleAddSeatToTable(table.tableIndex, slotIdx)}
                              title={`Tambah kursi biru di posisi ${label} Meja ${table.tableIndex}`}
                              className={`print:hidden opacity-0 group-hover/table:opacity-100 focus:opacity-100 transition-opacity border border-dashed border-sky-400/80 bg-sky-50/70 hover:bg-sky-100 text-sky-700 flex items-center justify-center gap-1 text-[9px] font-bold cursor-pointer ${slotClass}`}
                            >
                              <Plus className="w-3 h-3" />
                              <span>Kursi</span>
                            </button>
                          ) : null;

                        return (
                          <div
                            key={table.tableIndex}
                            style={{
                              transform:
                                tableOffset.x !== 0 || tableOffset.y !== 0
                                  ? `translate3d(${tableOffset.x}px, ${tableOffset.y}px, 0)`
                                  : undefined
                            }}
                            className={`group/table flex flex-col items-center gap-1 relative ${
                              isDraggingTable ? 'z-50' : 'z-10'
                            }`}
                          >
                            {/* Top Chair */}
                            <div className="min-h-[44px] flex items-end justify-center">
                              {topSeat
                                ? renderChairButton(topSeat, 'top')
                                : renderAddSlotBtn(0, 'w-[122px] h-[38px] rounded-t-xl rounded-b-md', 'atas')}
                            </div>

                            {/* Middle Row: Left Chair + Wooden Table + Right Chair */}
                            <div className="flex items-center gap-1">
                              <div className="w-[94px] flex justify-end shrink-0">
                                {leftSeat
                                  ? renderChairButton(leftSeat, 'left')
                                  : renderAddSlotBtn(1, 'w-[94px] h-[42px] rounded-l-xl rounded-r-md', 'kiri')}
                              </div>

                              {/* Wooden Cluster Table (Drag here to move table + chairs together) */}
                              <div
                                onPointerDown={e => startDragMove(e, 'table', tableKey)}
                                title={
                                  canDragTable
                                    ? `Tahan & geser Meja ${table.tableIndex} untuk memindah meja beserta kursinya`
                                    : undefined
                                }
                                className={`relative w-[120px] h-[88px] shrink-0 rounded-xl bg-gradient-to-b from-[#f3b562] to-[#e49b3e] border-2 border-slate-900 shadow-[0_5px_0_#92591b] flex flex-col items-center justify-center p-2 select-none ${
                                  isDraggingTable ? 'ring-4 ring-amber-400 shadow-2xl scale-[1.03]' : ''
                                } ${
                                  canDragTable
                                    ? isDraggingTable
                                      ? 'cursor-grabbing touch-none'
                                      : 'cursor-grab touch-none'
                                    : ''
                                }`}
                              >
                                {canDragTable && (
                                  <span className="print:hidden opacity-0 group-hover/table:opacity-100 transition-opacity absolute top-1 left-1.5 text-amber-950/70">
                                    <Move className="w-3 h-3" />
                                  </span>
                                )}
                                {canEdit && activeRoomTables.length > 1 && (
                                  <button
                                    type="button"
                                    data-no-drag="true"
                                    onClick={() => handleRemoveTable(table.tableIndex)}
                                    title={`Hapus Meja ${table.tableIndex}`}
                                    className="print:hidden opacity-0 group-hover/table:opacity-100 focus:opacity-100 transition-opacity absolute -top-2.5 -right-2.5 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white border border-white shadow flex items-center justify-center cursor-pointer z-20"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                                <div className="bg-white/95 px-2.5 py-0.5 rounded-lg border border-amber-700/20 text-[13px] font-black text-slate-900 shadow-sm whitespace-nowrap">
                                  Meja {table.tableIndex}
                                </div>
                                <div className="text-[11px] font-bold text-amber-950 mt-1 tabular-nums whitespace-nowrap">
                                  {table.seats.filter(s => s.namaSiswa.trim()).length}/{table.seats.length} Peserta
                                </div>
                              </div>

                              <div className="w-[94px] flex justify-start shrink-0">
                                {rightSeat
                                  ? renderChairButton(rightSeat, 'right')
                                  : renderAddSlotBtn(2, 'w-[94px] h-[42px] rounded-r-xl rounded-l-md', 'kanan')}
                              </div>
                            </div>

                            {/* Bottom Chair */}
                            <div className="min-h-[44px] flex items-start justify-center">
                              {bottomSeat
                                ? renderChairButton(bottomSeat, 'bottom')
                                : renderAddSlotBtn(3, 'w-[122px] h-[38px] rounded-b-xl rounded-t-md', 'bawah')}
                            </div>
                          </div>
                        );
                      })}

                      {/* Direct + Tambah Meja Card on Canvas (Hidden on Print) */}
                      {canEdit && activeRoom.jumlahKursi < 80 && (
                        <button
                          type="button"
                          onClick={handleAddTable}
                          className="print:hidden w-[220px] h-[140px] rounded-2xl border-2 border-dashed border-amber-500/80 bg-amber-50/70 hover:bg-amber-100/90 hover:border-amber-600 text-amber-900 flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm active:scale-[0.98]"
                        >
                          <div className="w-10 h-10 rounded-full bg-amber-500 text-white flex items-center justify-center shadow">
                            <Plus className="w-5 h-5" />
                          </div>
                          <span className="text-xs font-black">
                            Tambah Meja {activeRoomTables.length + 1}
                          </span>
                          <span className="text-[10px] font-semibold text-amber-800">
                            +{Math.min(activeRoom.kursiPerMeja, 80 - activeRoom.jumlahKursi)} Kursi Peserta
                          </span>
                        </button>
                      )}
                    </div>
                  ) : activeRoom.kursiPerMeja === 2 ? (
                    /* 2-SEAT EXAM DESKS (Draggable Tables & Chairs) */
                    <div className="grid grid-cols-3 gap-5 w-full">
                      {activeRoomTables.map(table => {
                        const tableKey = String(table.tableIndex);
                        const tableOffset = getElementOffset(activeRoom, 'table', tableKey);
                        const isDraggingTable = activeDrag?.kind === 'table' && activeDrag.key === tableKey;
                        const canDragTable = canEdit && dragMoveEnabled;
                        const canRestoreChair = canEdit && activeRoom.kursiList.length < 80;

                        return (
                          <div
                            key={table.tableIndex}
                            style={{
                              transform:
                                tableOffset.x !== 0 || tableOffset.y !== 0
                                  ? `translate3d(${tableOffset.x}px, ${tableOffset.y}px, 0)`
                                  : undefined
                            }}
                            className={`group/table flex flex-col items-center gap-1.5 relative ${
                              isDraggingTable ? 'z-50' : 'z-10'
                            }`}
                          >
                            <div
                              onPointerDown={e => startDragMove(e, 'table', tableKey)}
                              title={
                                canDragTable
                                  ? `Tahan & geser Meja ${table.tableIndex} untuk memindah meja beserta kursinya`
                                  : undefined
                              }
                              className={`relative w-full rounded-xl bg-gradient-to-b from-[#f3b562] to-[#e49b3e] border-2 border-slate-900 shadow-[0_4px_0_#92591b] py-2 px-3 flex items-center justify-between select-none ${
                                isDraggingTable ? 'ring-4 ring-amber-400 shadow-2xl' : ''
                              } ${
                                canDragTable
                                  ? isDraggingTable
                                    ? 'cursor-grabbing touch-none'
                                    : 'cursor-grab touch-none'
                                  : ''
                              }`}
                            >
                              {canEdit && activeRoomTables.length > 1 && (
                                <button
                                  type="button"
                                  data-no-drag="true"
                                  onClick={() => handleRemoveTable(table.tableIndex)}
                                  title={`Hapus Meja ${table.tableIndex}`}
                                  className="print:hidden opacity-0 group-hover/table:opacity-100 focus:opacity-100 transition-opacity absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-600 hover:bg-red-500 text-white border border-white shadow flex items-center justify-center cursor-pointer z-20"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                              <span className="bg-white/95 px-2.5 py-0.5 rounded text-[11px] font-black text-slate-900 flex items-center gap-1">
                                {canDragTable && <Move className="w-3 h-3 text-amber-700 print:hidden" />}
                                Meja {table.tableIndex}
                              </span>
                              <span className="text-[10px] font-bold text-amber-950 tabular-nums">
                                {table.seats.filter(s => s.namaSiswa.trim()).length}/{table.seats.length}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 w-full">
                              {table.slots.map((slotSeat, slotIdx) =>
                                slotSeat ? (
                                  renderChairButton(slotSeat, 'single')
                                ) : canRestoreChair ? (
                                  <button
                                    key={`empty-slot-${table.tableIndex}-${slotIdx}`}
                                    type="button"
                                    data-no-drag="true"
                                    onClick={() => handleAddSeatToTable(table.tableIndex, slotIdx)}
                                    title={`Tambah kursi biru di Meja ${table.tableIndex}`}
                                    className="print:hidden opacity-0 group-hover/table:opacity-100 focus:opacity-100 transition-opacity min-h-[42px] rounded-b-xl rounded-t-md border border-dashed border-sky-400/80 bg-sky-50/70 hover:bg-sky-100 text-sky-700 flex items-center justify-center gap-1 text-[10px] font-bold cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" />
                                    <span>Kursi</span>
                                  </button>
                                ) : (
                                  <div key={`spacer-slot-${table.tableIndex}-${slotIdx}`} className="min-h-[42px]" />
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {canEdit && activeRoom.jumlahKursi < 80 && (
                        <button
                          type="button"
                          onClick={handleAddTable}
                          className="print:hidden min-h-[104px] rounded-xl border-2 border-dashed border-amber-500/80 bg-amber-50/70 hover:bg-amber-100/90 text-amber-900 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-5 h-5 text-amber-600" />
                          <span className="text-xs font-black">Tambah Meja {activeRoomTables.length + 1}</span>
                          <span className="text-[10px] font-semibold text-amber-800">+2 Kursi</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    /* 1-SEAT INDIVIDUAL DESKS (Draggable Tables & Chairs) */
                    <div className="grid grid-cols-4 gap-3.5 w-full">
                      {activeRoomTables.map(table => {
                        const seat = table.seats[0];
                        if (!seat) return null;
                        const tableKey = String(table.tableIndex);
                        const tableOffset = getElementOffset(activeRoom, 'table', tableKey);
                        const isDraggingTable = activeDrag?.kind === 'table' && activeDrag.key === tableKey;
                        const canDragTable = canEdit && dragMoveEnabled;

                        return (
                          <div
                            key={seat.nomorKursi}
                            style={{
                              transform:
                                tableOffset.x !== 0 || tableOffset.y !== 0
                                  ? `translate3d(${tableOffset.x}px, ${tableOffset.y}px, 0)`
                                  : undefined
                            }}
                            className={`group/table flex flex-col items-center gap-1 relative ${
                              isDraggingTable ? 'z-50' : 'z-10'
                            }`}
                          >
                            <div
                              onPointerDown={e => startDragMove(e, 'table', tableKey)}
                              title={
                                canDragTable
                                  ? `Tahan & geser Meja ${table.tableIndex} untuk memindah meja beserta kursinya`
                                  : undefined
                              }
                              className={`relative w-full h-7 rounded-lg bg-gradient-to-b from-[#f3b562] to-[#e49b3e] border-2 border-slate-900 shadow-[0_3px_0_#92591b] flex items-center justify-center select-none ${
                                isDraggingTable ? 'ring-4 ring-amber-400 shadow-2xl' : ''
                              } ${
                                canDragTable
                                  ? isDraggingTable
                                    ? 'cursor-grabbing touch-none'
                                    : 'cursor-grab touch-none'
                                  : ''
                              }`}
                            >
                              {canEdit && activeRoomTables.length > 1 && (
                                <button
                                  type="button"
                                  data-no-drag="true"
                                  onClick={() => handleRemoveTable(table.tableIndex)}
                                  title={`Hapus Meja ${table.tableIndex}`}
                                  className="print:hidden opacity-0 group-hover/table:opacity-100 focus:opacity-100 transition-opacity absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-600 hover:bg-red-500 text-white border border-white shadow flex items-center justify-center cursor-pointer z-20"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              )}
                              <span className="bg-white/95 px-2 py-0.2 rounded text-[10px] font-black text-slate-900 flex items-center gap-1">
                                {canDragTable && <Move className="w-2.5 h-2.5 text-amber-700 print:hidden" />}
                                Meja {table.tableIndex}
                              </span>
                            </div>
                            {renderChairButton(seat, 'single')}
                          </div>
                        );
                      })}

                      {canEdit && activeRoom.jumlahKursi < 80 && (
                        <button
                          type="button"
                          onClick={handleAddTable}
                          className="print:hidden min-h-[90px] rounded-xl border-2 border-dashed border-amber-500/80 bg-amber-50/70 hover:bg-amber-100/90 text-amber-900 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <Plus className="w-5 h-5 text-amber-600" />
                          <span className="text-xs font-black">Tambah Meja</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* OVERVIEW MODE: ALL ROOMS POSTER (Matches Reference Image 6-Room Overview!) */
                <div className="flex-1 flex items-center justify-center pl-10 pr-3 py-4">
                  <div className="grid grid-cols-3 gap-x-8 gap-y-10 w-full place-items-center">
                    {rooms.map(r => {
                      const filled = r.kursiList.filter(k => k.namaSiswa.trim() !== '').length;
                      const isCurrent = r.id === activeRoom.id;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => {
                            setSelectedRoomId(r.id);
                            setViewMode('detail');
                          }}
                          className={`group flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-105 ${
                            isCurrent ? 'scale-[1.03]' : ''
                          }`}
                          title={`Klik untuk membuka & mengedit denah kursi ${r.namaRuang}`}
                        >
                          {/* Top decorative blue chair */}
                          <div className="w-12 h-5 rounded-t-xl bg-[#1d4ed8] border-2 border-slate-900" />
                          <div className="flex items-center gap-1">
                            {/* Left decorative blue chair */}
                            <div className="w-6 h-12 rounded-l-xl bg-[#1d4ed8] border-2 border-slate-900" />
                            {/* Room Wood Table */}
                            <div className={`w-40 h-24 rounded-xl bg-gradient-to-b from-[#f3b562] to-[#e49b3e] border-2 shadow-[0_5px_0_#92591b] flex flex-col items-center justify-center p-2 ${
                              isCurrent ? 'border-sky-600 ring-4 ring-sky-300' : 'border-slate-900'
                            }`}>
                              <div className="bg-white px-4 py-1 rounded-lg text-sm font-black text-slate-900 shadow-sm">
                                {r.namaRuang}
                              </div>
                              <div className="text-[11px] font-extrabold text-amber-950 mt-1 tabular-nums">
                                {filled} / {r.jumlahKursi} Kursi
                              </div>
                              <div className="text-[9px] font-semibold text-amber-950/90 truncate max-w-[140px]">
                                {r.pengawas}
                              </div>
                            </div>
                            {/* Right decorative blue chair */}
                            <div className="w-6 h-12 rounded-r-xl bg-[#1d4ed8] border-2 border-slate-900" />
                          </div>
                          {/* Bottom decorative blue chair */}
                          <div className="w-12 h-5 rounded-b-xl bg-[#1d4ed8] border-2 border-slate-900" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Bottom Room Wall Baseboard Bar */}
              <div className="mt-2 pt-2 border-t border-slate-300/80 flex items-center justify-between text-[11px] font-bold text-slate-600 pl-10">
                <span>
                  {viewMode === 'detail'
                    ? `${activeRoom.namaRuang} · Terisi ${filledCountActive} dari ${activeRoom.jumlahKursi} Kursi`
                    : `Total ${rooms.length} Ruang Ujian · ${totalFilledAll} / ${totalCapacityAll} Peserta`}
                </span>
                <span className="print:hidden text-sky-700 font-semibold">
                  {canEdit
                    ? viewMode === 'detail'
                      ? dragMoveEnabled
                        ? 'Tip: Geser Meja/Kursi untuk atur posisi · Klik kursi biru untuk edit siswa · Arahkan ke kursi biru & klik × untuk hapus kursi'
                        : 'Tip: Klik kursi biru untuk edit siswa · Arahkan ke kursi biru & klik × untuk hapus kursi'
                      : 'Tip: Klik salah satu ruang untuk mengatur kursi & siswa'
                    : 'Mode Lihat Denah Peserta'}
                </span>
              </div>
            </div>

            {/* RIGHT SIDEBAR: KETERANGAN & KETENTUAN (Exact Match to Reference Image!) */}
            <div data-denah-legend="true" className="flex flex-col gap-3">
              {/* Box 1: Keterangan */}
              <div className="rounded-2xl border-2 border-[#0a366b] overflow-hidden bg-white shadow-sm">
                <div className="bg-[#0a366b] text-white px-4 py-2 text-sm font-black tracking-wide">
                  Keterangan :
                </div>
                <div data-denah-legend-items="true" className="p-3 flex flex-col gap-2.5 text-xs font-bold text-slate-800">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-7 rounded-md bg-gradient-to-b from-[#f3b562] to-[#e49b3e] border-2 border-slate-900 shrink-0" />
                    <div className="leading-tight">
                      : Meja Peserta<br />
                      <span className="text-slate-600">({activeRoom.kursiPerMeja} Peserta)</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <LegendChairIcon />
                    <div>: Kursi Peserta</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-6 rounded bg-gradient-to-b from-[#f3b562] to-[#e49b3e] border-2 border-slate-900 shrink-0" />
                    <div>: Meja Pengawas</div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <DoorSvg className="w-7 h-9 shrink-0" />
                    <div>: Pintu Masuk</div>
                  </div>
                </div>
              </div>

              {/* Box 2: Ketentuan */}
              <div
                data-denah-ketentuan="true"
                className="rounded-2xl border-2 border-[#a16207] overflow-hidden bg-[#fef9c3] shadow-sm flex-1 flex flex-col"
              >
                <div className="bg-[#facc15] text-slate-950 px-4 py-2 text-sm font-black tracking-wide border-b border-[#ca8a04] text-center">
                  Ketentuan :
                </div>
                <ol className="p-3 space-y-2 text-xs font-bold text-slate-900 list-decimal list-inside leading-snug">
                  <li>
                    Setiap meja peserta diisi oleh{' '}
                    <span className="text-red-600 font-black">{activeRoom.kursiPerMeja} peserta</span> ujian.
                  </li>
                  <li>
                    Total kapasitas {activeRoom.namaRuang} :{' '}
                    <span className="tabular-nums">
                      {activeRoomTables.length} meja
                    </span>{' '}
                    ={' '}
                    <span className="text-red-600 font-black tabular-nums">
                      {activeRoom.jumlahKursi} kursi
                    </span>{' '}
                    <span className="text-slate-700 font-semibold">
                      (terisi {filledCountActive} siswa).
                    </span>
                  </li>
                  <li>{activeRoom.ketentuanTambahan || 'Jaga ketertiban dan ikuti arahan pengawas.'}</li>
                </ol>
              </div>
            </div>
          </div>
          </div>

          {/* 3. DAFTAR NAMA SISWA DI RUANG UJIAN (Tampil & Tercetak Langsung di Bawah Denah) */}
          {viewMode === 'detail' && showRosterInPoster && (
            <div ref={denahPosterRosterRef} className="rounded-2xl border-2 border-[#0a366b] overflow-hidden bg-white shadow-sm">
              <div className="bg-gradient-to-r from-[#082f63] via-[#0c3f7e] to-[#082f63] text-white px-4 py-2.5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-[#fde047] shrink-0" />
                  <span className="text-sm font-black uppercase tracking-wide">
                    Daftar Nama Siswa Peserta Ujian — {activeRoom.namaRuang}
                  </span>
                </div>
                <div className="text-xs font-bold text-sky-100 tabular-nums">
                  Pengawas: <span className="text-[#fde047]">{activeRoom.pengawas}</span> · Terisi{' '}
                  <span className="text-white font-black">{filledCountActive}</span> / {activeRoom.jumlahKursi} Siswa
                </div>
              </div>

              <div className="p-3 bg-white">
                {activeRoomRoster.length > 8 ? (
                  (() => {
                    const half = Math.ceil(activeRoomRoster.length / 2);
                    const chunks = [activeRoomRoster.slice(0, half), activeRoomRoster.slice(half)];
                    const q = searchQuery.trim().toLowerCase();
                    return (
                      <div className="grid grid-cols-2 gap-3 items-start">
                        {chunks.map((rows, chunkIdx) => (
                          <table
                            key={chunkIdx}
                            className="w-full text-left border-collapse border border-slate-300 text-xs table-fixed"
                          >
                            <thead>
                              <tr className="bg-slate-100 text-slate-800 uppercase text-[10px] font-extrabold">
                                <th className="border border-slate-300 px-2 py-1.5 text-center w-[11%]">Kursi</th>
                                <th className="border border-slate-300 px-1.5 py-1.5 text-center w-[10%]">Meja</th>
                                <th className="border border-slate-300 px-2 py-1.5 w-[44%]">Nama Lengkap Siswa</th>
                                <th className="border border-slate-300 px-2 py-1.5 w-[18%]">Kelas</th>
                                <th className="border border-slate-300 px-2 py-1.5 text-center w-[17%]">NIS / No.</th>
                              </tr>
                            </thead>
                            <tbody>
                              {rows.map(row => {
                                const isHit = Boolean(
                                  q &&
                                    row.isFilled &&
                                    (row.namaSiswa.toLowerCase().includes(q) ||
                                      row.kelasSiswa.toLowerCase().includes(q) ||
                                      row.nis.toLowerCase().includes(q))
                                );
                                const isSwap = swapSourceSeat === row.nomorKursi;
                                return (
                                  <tr
                                    key={row.nomorKursi}
                                    onClick={() => canEdit && handleSeatClick(row.seat)}
                                    className={`${canEdit ? 'cursor-pointer hover:bg-sky-50' : ''} ${
                                      isSwap
                                        ? 'bg-amber-100'
                                        : isHit
                                        ? 'bg-emerald-100'
                                        : row.nomorKursi % 2 === 0
                                        ? 'bg-slate-50/70'
                                        : 'bg-white'
                                    }`}
                                  >
                                    <td className="border border-slate-300 px-1.5 py-1 text-center font-black text-[#082f63] tabular-nums">
                                      #{String(row.nomorKursi).padStart(2, '0')}
                                    </td>
                                    <td className="border border-slate-300 px-1 py-1 text-center font-bold text-amber-800 tabular-nums">
                                      M{row.tableNo}
                                    </td>
                                    <td
                                      className={`border border-slate-300 px-2 py-1 truncate ${
                                        row.isFilled ? 'font-bold text-slate-900' : 'italic text-slate-400'
                                      }`}
                                      title={row.isFilled ? row.namaSiswa : 'Kursi Kosong'}
                                    >
                                      {row.isFilled ? row.namaSiswa : '(Kosong)'}
                                    </td>
                                    <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-700 truncate">
                                      {row.kelasSiswa || '-'}
                                    </td>
                                    <td className="border border-slate-300 px-1.5 py-1 text-center font-semibold text-slate-700 tabular-nums truncate">
                                      {row.nis || row.nisn || '-'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <table className="w-full text-left border-collapse border border-slate-300 text-xs table-fixed">
                    <thead>
                      <tr className="bg-slate-100 text-slate-800 uppercase text-[10px] font-extrabold">
                        <th className="border border-slate-300 px-2 py-1.5 text-center w-[9%]">Kursi</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center w-[9%]">Meja</th>
                        <th className="border border-slate-300 px-2 py-1.5 w-[44%]">Nama Lengkap Siswa</th>
                        <th className="border border-slate-300 px-2 py-1.5 w-[20%]">Kelas</th>
                        <th className="border border-slate-300 px-2 py-1.5 text-center w-[18%]">NIS / No. Peserta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeRoomRoster.map(row => (
                        <tr
                          key={row.nomorKursi}
                          onClick={() => canEdit && handleSeatClick(row.seat)}
                          className={`${canEdit ? 'cursor-pointer hover:bg-sky-50' : ''} ${
                            row.nomorKursi % 2 === 0 ? 'bg-slate-50/70' : 'bg-white'
                          }`}
                        >
                          <td className="border border-slate-300 px-2 py-1 text-center font-black text-[#082f63] tabular-nums">
                            #{String(row.nomorKursi).padStart(2, '0')}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-bold text-amber-800 tabular-nums">
                            Meja {row.tableNo}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-1 truncate ${
                              row.isFilled ? 'font-bold text-slate-900' : 'italic text-slate-400'
                            }`}
                          >
                            {row.isFilled ? row.namaSiswa : '(Kosong)'}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 font-semibold text-slate-700 truncate">
                            {row.kelasSiswa || '-'}
                          </td>
                          <td className="border border-slate-300 px-2 py-1 text-center font-semibold text-slate-700 tabular-nums truncate">
                            {row.nis || row.nisn || '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {activeRoomClassSummary.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="font-extrabold text-slate-700 uppercase">Rekap Kelas:</span>
                      {activeRoomClassSummary.map(([cls, count]) => (
                        <span
                          key={cls}
                          className="px-2 py-0.5 rounded-md bg-sky-50 border border-sky-200 text-[#082f63] font-bold tabular-nums"
                        >
                          {cls}: {count}
                        </span>
                      ))}
                    </div>
                    <span className="text-slate-500 font-semibold print:hidden">
                      {canEdit ? 'Klik baris siswa untuk mengubah kursi' : ''}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}

      {/* =====================================================================
          INTERACTIVE DAFTAR NAMA SISWA DI RUANG UJIAN (Search, Filter, Print, CSV)
         ===================================================================== */}
      {(viewMode === 'detail' || viewMode === 'roster') && (
        <div className="bg-[#121212] rounded-2xl p-5 border border-slate-800 shadow-xl space-y-4 print:hidden">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-4">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                <span>
                  Daftar Nama Siswa —{' '}
                  {viewMode === 'roster' && rosterScope === 'all'
                    ? `Semua Ruang (${rooms.length} Ruang)`
                    : activeRoom.namaRuang}
                </span>
              </h4>
              <p className="text-xs text-slate-400 mt-0.5 tabular-nums">
                Menampilkan {filteredRosterRows.length} dari {scopedRosterBase.length} kursi ·{' '}
                <span className="text-emerald-400 font-semibold">
                  {scopedRosterBase.filter(r => r.isFilled).length} terisi
                </span>{' '}
                ·{' '}
                <span className="text-slate-400">
                  {scopedRosterBase.filter(r => !r.isFilled).length} kosong
                </span>
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {viewMode === 'roster' && (
                <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setRosterScope('active');
                      setRosterKelasFilter('Semua');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      rosterScope === 'active'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {activeRoom.namaRuang}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRosterScope('all');
                      setRosterKelasFilter('Semua');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                      rosterScope === 'all'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Semua Ruang
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1">
                <CalendarDays className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <select
                  value={selectedAttendanceDay}
                  onChange={e => setSelectedAttendanceDay(e.target.value)}
                  className="bg-transparent text-xs font-bold text-amber-200 focus:outline-none cursor-pointer pr-1"
                  title="Pilih format absensi ujian per hari untuk Cetak & Unduh PDF"
                >
                  <option value="all_days" className="bg-slate-900 text-white">
                    Absensi Per Hari ({examAttendanceDays.length} Hari)
                  </option>
                  {examAttendanceDays.map(d => (
                    <option key={d.tanggal} value={d.tanggal} className="bg-slate-900 text-white">
                      Hari {d.dayIndex} · {d.shortLabel} ({d.sessions.length || 1} Sesi)
                    </option>
                  ))}
                  <option value="general" className="bg-slate-900 text-white">
                    Daftar Umum (1 Lembar)
                  </option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => handlePrintRoomRoster(viewMode === 'roster' ? rosterScope : 'active')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Daftar &amp; Absensi</span>
              </button>

              <button
                type="button"
                disabled={isDownloadingRosterPdf}
                onClick={() => handleDownloadRoomRosterPdf(viewMode === 'roster' ? rosterScope : 'active')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 disabled:opacity-60 text-white flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap transition-colors"
                title="Unduh langsung absensi ujian per hari dalam format PDF siap cetak (A4)"
              >
                {isDownloadingRosterPdf ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileDown className="w-3.5 h-3.5" />
                )}
                <span>{isDownloadingRosterPdf ? 'Membuat PDF...' : 'Unduh PDF Absensi'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleExportRoomRosterCsv(viewMode === 'roster' ? rosterScope : 'active')}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 cursor-pointer shadow-sm whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh Excel (CSV)</span>
              </button>
            </div>
          </div>

          {/* Filter Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={rosterSearch}
                onChange={e => setRosterSearch(e.target.value)}
                placeholder="Cari nama siswa, kelas, NIS, no. peserta, atau nomor kursi..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-8 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
              {rosterSearch && (
                <button
                  type="button"
                  onClick={() => setRosterSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <select
              value={rosterKelasFilter}
              onChange={e => setRosterKelasFilter(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-sky-400"
            >
              <option value="Semua">Semua Kelas ({availableRosterClasses.length})</option>
              {availableRosterClasses.map(k => (
                <option key={k} value={k}>
                  Kelas {k}
                </option>
              ))}
            </select>

            <div className="flex items-center bg-slate-900 border border-slate-700 rounded-xl p-1 shrink-0">
              {(
                [
                  { id: 'semua', label: 'Semua' },
                  { id: 'terisi', label: 'Terisi' },
                  { id: 'kosong', label: 'Kosong' }
                ] as const
              ).map(opt => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setRosterStatusFilter(opt.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    rosterStatusFilter === opt.id
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Class Summary Pills */}
          {activeRoomClassSummary.length > 0 && !(viewMode === 'roster' && rosterScope === 'all') && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-400 mr-1">Sebaran Kelas:</span>
              {activeRoomClassSummary.map(([cls, count]) => (
                <button
                  key={cls}
                  type="button"
                  onClick={() => setRosterKelasFilter(prev => (prev === cls ? 'Semua' : cls))}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer tabular-nums ${
                    rosterKelasFilter === cls
                      ? 'bg-sky-600 text-white border-sky-400'
                      : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-sky-500/60'
                  }`}
                >
                  {cls} ({count})
                </button>
              ))}
            </div>
          )}

          {/* Structured Student Roster Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-900/95 text-slate-300 uppercase text-[10px] font-extrabold border-b border-slate-800">
                  <th className="px-3 py-2.5 w-12 text-center">No</th>
                  {viewMode === 'roster' && rosterScope === 'all' && (
                    <th className="px-3 py-2.5">Ruang</th>
                  )}
                  <th className="px-3 py-2.5 w-20 text-center">Kursi</th>
                  <th className="px-3 py-2.5 w-20 text-center">Meja</th>
                  <th className="px-3 py-2.5 w-28">No. Peserta</th>
                  <th className="px-3 py-2.5">Nama Lengkap Siswa</th>
                  <th className="px-3 py-2.5">Kelas</th>
                  <th className="px-3 py-2.5">NIS / NISN</th>
                  {canEdit && <th className="px-3 py-2.5 w-32 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredRosterRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={canEdit ? (viewMode === 'roster' && rosterScope === 'all' ? 9 : 8) : 7}
                      className="px-4 py-8 text-center text-slate-500 italic"
                    >
                      Tidak ada data siswa yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredRosterRows.map((row, idx) => (
                    <tr
                      key={`${row.roomId}-${row.nomorKursi}`}
                      className={`transition-colors ${
                        row.isFilled
                          ? 'bg-slate-950/40 hover:bg-slate-900/80'
                          : 'bg-slate-950/20 hover:bg-slate-900/50'
                      }`}
                    >
                      <td className="px-3 py-2 text-center text-slate-500 font-semibold tabular-nums">
                        {idx + 1}
                      </td>
                      {viewMode === 'roster' && rosterScope === 'all' && (
                        <td className="px-3 py-2 font-bold text-sky-300 whitespace-nowrap">
                          {row.roomName}
                        </td>
                      )}
                      <td className="px-3 py-2 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-sky-300 font-black tabular-nums">
                          #{String(row.nomorKursi).padStart(2, '0')}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-amber-300 tabular-nums whitespace-nowrap">
                        Meja {row.tableNo}
                      </td>
                      <td className="px-3 py-2 font-bold text-indigo-300 tabular-nums whitespace-nowrap">
                        {row.noPeserta}
                      </td>
                      <td className="px-3 py-2">
                        {row.isFilled ? (
                          <span className="font-bold text-white">{row.namaSiswa}</span>
                        ) : (
                          <span className="text-slate-500 italic">Kursi belum diisi</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-slate-300 font-semibold whitespace-nowrap">
                        {row.kelasSiswa || '-'}
                      </td>
                      <td className="px-3 py-2 text-slate-400 tabular-nums whitespace-nowrap">
                        {row.nis || row.nisn ? (
                          <span>
                            {row.nis || '-'}
                            {row.nisn && row.nisn !== row.nis ? ` / ${row.nisn}` : ''}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      {canEdit && (
                        <td className="px-3 py-2 text-right">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (row.roomId !== activeRoom.id) {
                                  setSelectedRoomId(row.roomId);
                                }
                                setEditingSeatNo(row.seat.nomorKursi);
                                setSeatManualNama(row.seat.namaSiswa || '');
                                setSeatManualKelas(row.seat.kelasSiswa || '');
                                setSeatManualNoPeserta(row.seat.nomorPeserta || '');
                                setSeatSelectedSiswaId(row.seat.siswaId);
                                setSeatSearchStudent('');
                                setSeatFilterKelas('Semua');
                              }}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-800 hover:bg-sky-600 text-slate-200 hover:text-white inline-flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>{row.isFilled ? 'Edit' : 'Isi'}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteSeat(row.seat.nomorKursi, row.roomId)}
                              title={`Hapus Kursi #${String(row.nomorKursi).padStart(2, '0')}`}
                              className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-600 text-red-300 hover:text-white border border-red-800/50 inline-flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 1: EDIT KURSI & PILIH SISWA
         ===================================================================== */}
      {editingSeatNo !== null && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#141923] border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-sky-400" />
                  <span>Edit Kursi #{String(editingSeatNo).padStart(2, '0')} — {activeRoom.namaRuang}</span>
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih siswa dari database sekolah atau ketik nama peserta secara manual
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingSeatNo(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSeatEdit} className="p-5 space-y-4 overflow-y-auto">
              {/* Manual / Selected Fields */}
              <div className="space-y-3 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Nama Siswa / Peserta Ujian
                  </label>
                  <input
                    type="text"
                    value={seatManualNama}
                    onChange={e => {
                      setSeatManualNama(e.target.value);
                      setSeatSelectedSiswaId(undefined);
                    }}
                    placeholder="Ketik nama siswa atau pilih dari daftar di bawah..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">Kelas</label>
                    <input
                      type="text"
                      value={seatManualKelas}
                      onChange={e => setSeatManualKelas(e.target.value)}
                      placeholder="Contoh: VIII - Al Biruni"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 mb-1">NIS / No. Peserta</label>
                    <input
                      type="text"
                      value={seatManualNoPeserta}
                      onChange={e => setSeatManualNoPeserta(e.target.value)}
                      placeholder="Opsional"
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                </div>
              </div>

              {/* Pick from Database Siswa */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200">Pilih Cepat dari Database Siswa</span>
                  <span className="text-[10px] text-slate-400 tabular-nums">{filteredModalStudents.length} siswa</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={seatSearchStudent}
                      onChange={e => setSeatSearchStudent(e.target.value)}
                      placeholder="Cari nama / NIS..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
                    />
                  </div>
                  <select
                    value={seatFilterKelas}
                    onChange={e => setSeatFilterKelas(e.target.value)}
                    className="bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-sky-400"
                  >
                    <option value="Semua">Semua Kelas</option>
                    {kelasList.map(k => (
                      <option key={k} value={k}>{k}</option>
                    ))}
                  </select>
                </div>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {filteredModalStudents.length === 0 ? (
                    <div className="text-center py-6 text-xs text-slate-500">
                      Tidak ada siswa ditemukan. Anda tetap bisa mengetik nama manual di atas.
                    </div>
                  ) : (
                    filteredModalStudents.map(s => {
                      const alreadyAt = seatedLookup.byId.get(s.id) || seatedLookup.byName.get(s.nama.trim().toLowerCase());
                      const isSelectedHere = seatSelectedSiswaId === s.id || seatManualNama.trim().toLowerCase() === s.nama.trim().toLowerCase();
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => handlePickStudentForSeat(s)}
                          className={`w-full px-3 py-2 rounded-xl border text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                            isSelectedHere
                              ? 'bg-sky-600/25 border-sky-400 text-white'
                              : 'bg-slate-900/70 border-slate-800 hover:border-slate-600 text-slate-200'
                          }`}
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{s.nama}</div>
                            <div className="text-[10px] text-slate-400 tabular-nums">
                              {s.kelas} · NIS: {s.nis || '-'}
                            </div>
                          </div>
                          {alreadyAt ? (
                            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap shrink-0">
                              Di {alreadyAt.roomName} #{alreadyAt.seatNo}
                            </span>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-semibold whitespace-nowrap shrink-0">
                              Belum duduk
                            </span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Action Footer */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleClearSingleSeat}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    title="Kosongkan nama siswa namun kursi tetap ada"
                  >
                    <UserMinus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Kosongkan</span>
                  </button>
                  <button
                    type="button"
                    disabled={activeRoom.kursiList.length <= 1}
                    onClick={() => editingSeatNo !== null && handleDeleteSeat(editingSeatNo)}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold bg-red-950/70 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-red-200 hover:text-white border border-red-800/70 flex items-center gap-1.5 cursor-pointer transition-colors"
                    title="Hapus kursi biru ini dari denah ruang"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus Kursi</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const seatNo = editingSeatNo;
                      setEditingSeatNo(null);
                      setSwapSourceSeat(seatNo);
                      showToast(`Klik kursi tujuan di denah untuk menukar posisi dengan Kursi #${seatNo}.`);
                    }}
                    className="px-2.5 py-2 rounded-xl text-xs font-bold bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Tukar</span>
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSeatNo(null)}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Kursi</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: TAMBAH / EDIT PENGATURAN RUANG & HEADER DENAH
         ===================================================================== */}
      {showRoomModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#141923] border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-sky-400" />
                <span>{isAddingRoom ? 'Tambah Ruang Ujian Baru' : `Edit Pengaturan ${activeRoom.namaRuang}`}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowRoomModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRoomModal} className="p-5 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama Ruang</label>
                  <input
                    type="text"
                    required
                    value={roomForm.namaRuang}
                    onChange={e => setRoomForm(f => ({ ...f, namaRuang: e.target.value }))}
                    placeholder="Contoh: Ruang 1 / Lab CBT"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Nama Pengawas</label>
                  <input
                    type="text"
                    value={roomForm.pengawas}
                    onChange={e => setRoomForm(f => ({ ...f, pengawas: e.target.value }))}
                    placeholder="Nama guru pengawas..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    Jumlah Kursi (1–80)
                    <span className="ml-1.5 text-amber-400 font-semibold tabular-nums">
                      ≈ {Math.max(1, Math.ceil((roomForm.jumlahKursi || 1) / (roomForm.kursiPerMeja || 4)))} Meja
                    </span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    required
                    value={roomForm.jumlahKursi}
                    onChange={e => setRoomForm(f => ({ ...f, jumlahKursi: Number(e.target.value) }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">Jumlah Kursi per Meja</label>
                  <select
                    value={roomForm.kursiPerMeja}
                    onChange={e => setRoomForm(f => ({ ...f, kursiPerMeja: Number(e.target.value) as 1 | 2 | 4 }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-bold focus:outline-none focus:border-sky-400"
                  >
                    <option value={4}>4 Kursi per Meja (Cluster seperti contoh)</option>
                    <option value={2}>2 Kursi per Meja (Meja Ganda)</option>
                    <option value={1}>1 Kursi per Meja (Meja Tunggal)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Judul Ujian (Banner Kuning)</label>
                <input
                  type="text"
                  value={roomForm.judulUjian}
                  onChange={e => setRoomForm(f => ({ ...f, judulUjian: e.target.value }))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-sky-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowRoomModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-lg"
                >
                  {isAddingRoom ? 'Buat Ruang' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: ISI OTOMATIS SISWA KE KURSI UJIAN
         ===================================================================== */}
      {showAutoFillModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#141923] border border-slate-700 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Isi Kursi Ujian Otomatis dari Database</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAutoFillModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Target Pengisian</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoFillScope('active')}
                    className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                      autoFillScope === 'active'
                        ? 'bg-emerald-600/20 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    {activeRoom.namaRuang} Saja
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoFillScope('all')}
                    className={`p-2.5 rounded-xl border text-xs font-bold cursor-pointer ${
                      autoFillScope === 'all'
                        ? 'bg-emerald-600/20 border-emerald-400 text-emerald-200'
                        : 'bg-slate-900 border-slate-700 text-slate-400'
                    }`}
                  >
                    Semua {rooms.length} Ruang
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">Pola Urutan Duduk</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'abjad', label: 'Urut A–Z' },
                    { id: 'zigzag', label: 'Selang Kelas' },
                    { id: 'acak', label: 'Acak' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setAutoFillOrder(opt.id as any)}
                      className={`py-2 px-2 rounded-xl border text-xs font-bold cursor-pointer ${
                        autoFillOrder === opt.id
                          ? 'bg-sky-600/25 border-sky-400 text-sky-200'
                          : 'bg-slate-900 border-slate-700 text-slate-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Filter Kelas (Kosongkan untuk semua kelas)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                  {kelasList.map(k => {
                    const checked = autoFillSelectedClasses.includes(k);
                    return (
                      <button
                        key={k}
                        type="button"
                        onClick={() =>
                          setAutoFillSelectedClasses(prev =>
                            prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]
                          )
                        }
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                          checked
                            ? 'bg-sky-600 text-white border-sky-400'
                            : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                        }`}
                      >
                        {checked ? `✓ ${k}` : k}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAutoFillModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleRunAutoFill}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-lg"
                >
                  Terapkan Penempatan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: KONFIRMASI HAPUS RUANG
         ===================================================================== */}
      {deleteConfirmRoom && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#141923] border border-slate-700 rounded-2xl max-w-sm w-full p-5 space-y-4 shadow-2xl">
            <h3 className="text-sm font-bold text-white">Hapus {deleteConfirmRoom.namaRuang}?</h3>
            <p className="text-xs text-slate-400">
              Data penempatan kursi pada ruang ini akan dihapus secara permanen.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmRoom(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 text-slate-300 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteRoom}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-red-600 hover:bg-red-500 text-white cursor-pointer"
              >
                Ya, Hapus Ruang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
