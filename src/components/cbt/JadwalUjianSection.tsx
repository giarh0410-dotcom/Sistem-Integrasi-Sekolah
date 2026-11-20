import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  Check,
  Download,
  Edit2,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import {
  BankSoal,
  CbtExamSettings,
  Guru,
  JadwalUjianItem,
  MataPelajaranItem,
  Role,
  RombelKelas,
  SchoolSettings,
  Siswa,
  Staf,
  UjianCBT
} from '../../types/school';
import { dbFetchCollection } from '../../lib/firebaseSync';

interface DenahRoomSummary {
  id: string;
  namaRuang: string;
  pengawas?: string;
}

interface JadwalUjianSectionProps {
  jadwalList: JadwalUjianItem[];
  onSaveJadwalList: (newList: JadwalUjianItem[]) => void;
  ujianList: UjianCBT[];
  bankSoalList: BankSoal[];
  mapelList: MataPelajaranItem[];
  rombelList: RombelKelas[];
  siswaList: Siswa[];
  guruList: Guru[];
  stafList?: Staf[];
  schoolSettings?: SchoolSettings;
  cbtSettings?: CbtExamSettings;
  currentRole?: Role;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const CUSTOM_VALUE = '__custom__';

const normalizeTingkat = (raw: string): string => {
  const s = (raw || '').trim();
  if (!s) return '';
  if (/^(kelas\s*)?(vii|7)\b/i.test(s)) return 'Kelas VII';
  if (/^(kelas\s*)?(viii|8)\b/i.test(s)) return 'Kelas VIII';
  if (/^(kelas\s*)?(ix|9)\b/i.test(s)) return 'Kelas IX';
  if (/^(kelas\s*)?(x|10)\b/i.test(s)) return 'Kelas X';
  if (/^(kelas\s*)?(xi|11)\b/i.test(s)) return 'Kelas XI';
  if (/^(kelas\s*)?(xii|12)\b/i.test(s)) return 'Kelas XII';
  if (/semua/i.test(s)) return 'Semua Tingkat';
  return s;
};

const inferTingkatFromRombel = (rombel: string): string => {
  const r = (rombel || '').trim();
  if (!r) return '';
  if (/^(vii|7)\b/i.test(r)) return 'Kelas VII';
  if (/^(viii|8)\b/i.test(r)) return 'Kelas VIII';
  if (/^(ix|9)\b/i.test(r)) return 'Kelas IX';
  if (/^(x|10)\b/i.test(r)) return 'Kelas X';
  if (/^(xi|11)\b/i.test(r)) return 'Kelas XI';
  if (/^(xii|12)\b/i.test(r)) return 'Kelas XII';
  return '';
};

const formatTanggalIndo = (isoDate: string): string => {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  if (parts.length !== 3) return isoDate;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const parseTimeToMinutes = (t: string): number => {
  const [h, m] = (t || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return -1;
  return h * 60 + m;
};

const escapeCsv = (value: string): string => {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

const parseCsvLine = (line: string): string[] => {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
};

export const JadwalUjianSection: React.FC<JadwalUjianSectionProps> = ({
  jadwalList,
  onSaveJadwalList,
  ujianList,
  bankSoalList,
  mapelList,
  rombelList,
  siswaList,
  guruList,
  stafList = [],
  schoolSettings,
  cbtSettings,
  currentRole = 'admin',
  showToast
}) => {
  const canEdit = currentRole !== 'siswa';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync rooms from Denah Ruang Ujian so Ruangan dropdown stays connected
  const [denahRooms, setDenahRooms] = useState<DenahRoomSummary[]>(() => {
    try {
      const saved = localStorage.getItem('edu_denahRuangList');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map((r: any) => ({
            id: r.id || r.namaRuang,
            namaRuang: r.namaRuang || '',
            pengawas: r.pengawas || ''
          })).filter((r: DenahRoomSummary) => r.namaRuang);
        }
      }
    } catch {
      // ignore localStorage read errors
    }
    return [];
  });

  useEffect(() => {
    let mounted = true;
    const loadDenahRooms = async () => {
      try {
        const remote = await dbFetchCollection<any>('edu_denahRuangList');
        if (mounted && Array.isArray(remote) && remote.length > 0) {
          setDenahRooms(
            remote
              .map((r: any) => ({
                id: r.id || r.namaRuang,
                namaRuang: r.namaRuang || '',
                pengawas: r.pengawas || ''
              }))
              .filter((r: DenahRoomSummary) => r.namaRuang)
          );
        }
      } catch {
        // fallback to localStorage rooms
      }
    };
    loadDenahRooms();
    return () => {
      mounted = false;
    };
  }, []);

  // --- Filter & Search State ---
  const [searchQuery, setSearchQuery] = useState('');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterRuang, setFilterRuang] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Mendatang' | 'Aktif' | 'Selesai'>('Semua');

  // --- Modal Add / Edit State ---
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');
  const [customMapelMode, setCustomMapelMode] = useState(false);
  const [customRuangMode, setCustomRuangMode] = useState(false);

  const [form, setForm] = useState({
    mataPelajaran: '',
    tingkatKelas: '',
    rombel: '',
    tanggal: new Date().toISOString().split('T')[0],
    ruang: '',
    jamMulai: '07:30',
    jamSelesai: '09:00'
  });

  // --- Delete Modals ---
  const [deleteTarget, setDeleteTarget] = useState<JadwalUjianItem | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);

  // --- Dynamic Options ---
  const availableMapelOptions = useMemo(() => {
    const set = new Set<string>();
    mapelList.forEach(m => {
      const name = m.namaMapel || (m as any).nama;
      if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
    });
    bankSoalList.forEach(b => {
      if (b.mataPelajaran?.trim()) set.add(b.mataPelajaran.trim());
    });
    ujianList.forEach(u => {
      if (u.mataPelajaran?.trim()) set.add(u.mataPelajaran.trim());
    });
    guruList.forEach(g => {
      if (g.mataPelajaran?.trim()) set.add(g.mataPelajaran.trim());
    });
    jadwalList.forEach(j => {
      if (j.mataPelajaran?.trim()) set.add(j.mataPelajaran.trim());
    });
    if (set.size === 0) {
      [
        'Matematika',
        'Bahasa Indonesia',
        'Bahasa Inggris',
        'Ilmu Pengetahuan Alam (IPA)',
        'Ilmu Pengetahuan Sosial (IPS)',
        'Pendidikan Agama Islam',
        'Pendidikan Pancasila',
        'Informatika',
        'Bahasa Arab',
        'Tahfidz Al-Qur\'an'
      ].forEach(m => set.add(m));
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [mapelList, bankSoalList, ujianList, guruList, jadwalList]);

  const allRombelRecords = useMemo(() => {
    const map = new Map<string, { namaRombel: string; tingkatKelas: string }>();
    rombelList.forEach(r => {
      const nama = (r.namaRombel || '').trim();
      if (!nama) return;
      const tingkat = normalizeTingkat(r.tingkatKelas || inferTingkatFromRombel(nama));
      map.set(nama, { namaRombel: nama, tingkatKelas: tingkat || 'Lainnya' });
    });
    siswaList.forEach(s => {
      const nama = (s.kelas || s.rombel || '').trim();
      if (!nama || map.has(nama)) return;
      const tingkat = normalizeTingkat(s.tingkatKelas || inferTingkatFromRombel(nama));
      map.set(nama, { namaRombel: nama, tingkatKelas: tingkat || 'Lainnya' });
    });
    if (map.size === 0) {
      [
        { namaRombel: 'VII - Ibnu Sina', tingkatKelas: 'Kelas VII' },
        { namaRombel: 'VII - Ibnu Khaldun', tingkatKelas: 'Kelas VII' },
        { namaRombel: 'VII - Ibnu Al Haytam', tingkatKelas: 'Kelas VII' },
        { namaRombel: 'VIII - Al Biruni', tingkatKelas: 'Kelas VIII' },
        { namaRombel: 'VIII - Al Farabi', tingkatKelas: 'Kelas VIII' },
        { namaRombel: 'VIII - Al Khawarizmi', tingkatKelas: 'Kelas VIII' },
        { namaRombel: 'IX - Umar bin Khattab', tingkatKelas: 'Kelas IX' },
        { namaRombel: 'IX - Utsman bin Affan', tingkatKelas: 'Kelas IX' }
      ].forEach(item => map.set(item.namaRombel, item));
    }
    return Array.from(map.values()).sort((a, b) =>
      a.namaRombel.localeCompare(b.namaRombel, undefined, { numeric: true })
    );
  }, [rombelList, siswaList]);

  const tingkatOptions = useMemo(() => {
    const set = new Set<string>(['Kelas VII', 'Kelas VIII', 'Kelas IX']);
    allRombelRecords.forEach(r => {
      if (r.tingkatKelas && r.tingkatKelas !== 'Lainnya') {
        set.add(r.tingkatKelas);
      }
    });
    const order = ['Kelas VII', 'Kelas VIII', 'Kelas IX', 'Kelas X', 'Kelas XI', 'Kelas XII'];
    const sorted = Array.from(set).sort((a, b) => {
      const ia = order.indexOf(a);
      const ib = order.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b);
    });
    return ['Semua Tingkat', ...sorted];
  }, [allRombelRecords]);

  const filteredRombelOptions = useMemo(() => {
    if (!form.tingkatKelas || form.tingkatKelas === 'Semua Tingkat') {
      return allRombelRecords.map(r => r.namaRombel);
    }
    const matching = allRombelRecords
      .filter(r => r.tingkatKelas === form.tingkatKelas)
      .map(r => r.namaRombel);
    return matching.length > 0 ? matching : allRombelRecords.map(r => r.namaRombel);
  }, [allRombelRecords, form.tingkatKelas]);

  const ruanganOptions = useMemo(() => {
    const set = new Set<string>();
    denahRooms.forEach(r => {
      if (r.namaRuang.trim()) set.add(r.namaRuang.trim());
    });
    rombelList.forEach(r => {
      if (r.ruangan?.trim()) set.add(r.ruangan.trim());
    });
    jadwalList.forEach(j => {
      if (j.ruang?.trim()) set.add(j.ruang.trim());
    });
    ['Ruang 1', 'Ruang 2', 'Ruang 3', 'Ruang 4', 'Ruang 5', 'Ruang 6', 'Lab Komputer 01'].forEach(r => {
      if (set.size < 12) set.add(r);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [denahRooms, rombelList, jadwalList]);

  // --- Filtered & Sorted Schedule List ---
  const filteredJadwalList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return jadwalList
      .filter(item => {
        const tingkat = item.tingkatKelas || inferTingkatFromRombel(item.rombel || item.kelasTarget);
        const rombel = item.rombel || item.kelasTarget;

        const matchKelas =
          filterKelas === 'Semua' ||
          tingkat === filterKelas ||
          rombel === filterKelas ||
          item.kelasTarget.toLowerCase().includes(filterKelas.toLowerCase());

        const matchRuang = filterRuang === 'Semua' || item.ruang === filterRuang;
        const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;

        const matchQuery =
          !q ||
          item.mataPelajaran.toLowerCase().includes(q) ||
          item.judulUjian.toLowerCase().includes(q) ||
          item.kelasTarget.toLowerCase().includes(q) ||
          (item.tingkatKelas || '').toLowerCase().includes(q) ||
          (item.rombel || '').toLowerCase().includes(q) ||
          item.ruang.toLowerCase().includes(q) ||
          item.tanggal.toLowerCase().includes(q);

        return matchKelas && matchRuang && matchStatus && matchQuery;
      })
      .sort((a, b) => {
        const dateCmp = (a.tanggal || '').localeCompare(b.tanggal || '');
        if (dateCmp !== 0) return dateCmp;
        return (a.jamMulai || '').localeCompare(b.jamMulai || '');
      });
  }, [jadwalList, searchQuery, filterKelas, filterRuang, filterStatus]);

  // --- Conflict Check inside Modal ---
  const scheduleConflict = useMemo(() => {
    if (!showModal || !form.tanggal || !form.ruang || !form.jamMulai || !form.jamSelesai) return null;
    const startA = parseTimeToMinutes(form.jamMulai);
    const endA = parseTimeToMinutes(form.jamSelesai);
    if (startA < 0 || endA < 0 || endA <= startA) return null;

    return jadwalList.find(j => {
      if (editingId && j.id === editingId) return false;
      if (j.tanggal !== form.tanggal) return false;
      if (j.ruang.trim().toLowerCase() !== form.ruang.trim().toLowerCase()) return false;
      const startB = parseTimeToMinutes(j.jamMulai);
      const endB = parseTimeToMinutes(j.jamSelesai);
      if (startB < 0 || endB < 0) return false;
      return startA < endB && endA > startB;
    }) || null;
  }, [showModal, form.tanggal, form.ruang, form.jamMulai, form.jamSelesai, jadwalList, editingId]);

  // --- Handlers ---
  const openAddModal = () => {
    setEditingId(null);
    setFormError('');
    setCustomMapelMode(false);
    setCustomRuangMode(false);
    setForm({
      mataPelajaran: '',
      tingkatKelas: '',
      rombel: '',
      tanggal: new Date().toISOString().split('T')[0],
      ruang: '',
      jamMulai: '07:30',
      jamSelesai: '09:00'
    });
    setShowModal(true);
  };

  const openEditModal = (item: JadwalUjianItem) => {
    setEditingId(item.id);
    setFormError('');
    const detectedTingkat = item.tingkatKelas || inferTingkatFromRombel(item.rombel || item.kelasTarget) || 'Semua Tingkat';
    const detectedRombel = item.rombel || (item.kelasTarget === 'Semua Kelas' ? 'Semua Rombel' : item.kelasTarget);

    setCustomMapelMode(Boolean(item.mataPelajaran) && !availableMapelOptions.includes(item.mataPelajaran));
    setCustomRuangMode(Boolean(item.ruang) && !ruanganOptions.includes(item.ruang));

    setForm({
      mataPelajaran: item.mataPelajaran || '',
      tingkatKelas: detectedTingkat,
      rombel: detectedRombel,
      tanggal: item.tanggal || '',
      ruang: item.ruang || '',
      jamMulai: item.jamMulai || '07:30',
      jamSelesai: item.jamSelesai || '09:00'
    });
    setShowModal(true);
  };

  const handleSelectRoom = (val: string) => {
    if (val === CUSTOM_VALUE) {
      setCustomRuangMode(true);
      setForm(prev => ({ ...prev, ruang: '' }));
      return;
    }
    setCustomRuangMode(false);
    setForm(prev => ({ ...prev, ruang: val }));
  };

  const handleSelectMapel = (val: string) => {
    if (val === CUSTOM_VALUE) {
      setCustomMapelMode(true);
      setForm(prev => ({ ...prev, mataPelajaran: '' }));
      return;
    }
    setCustomMapelMode(false);
    setForm(prev => ({ ...prev, mataPelajaran: val }));
  };

  const handleSelectTingkat = (val: string) => {
    setForm(prev => {
      const nextRombels =
        !val || val === 'Semua Tingkat'
          ? allRombelRecords.map(r => r.namaRombel)
          : allRombelRecords.filter(r => r.tingkatKelas === val).map(r => r.namaRombel);
      const keepRombel =
        prev.rombel === 'Semua Rombel' || nextRombels.includes(prev.rombel);
      return {
        ...prev,
        tingkatKelas: val,
        rombel: keepRombel ? prev.rombel : ''
      };
    });
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!form.mataPelajaran.trim()) {
      setFormError('Mata pelajaran harus dipilih atau diisi.');
      return;
    }
    if (!form.tingkatKelas.trim()) {
      setFormError('Tingkat kelas harus dipilih.');
      return;
    }
    if (!form.rombel.trim()) {
      setFormError('Rombongan belajar (rombel) harus dipilih.');
      return;
    }
    if (!form.tanggal) {
      setFormError('Tanggal pelaksanaan ujian harus dipilih.');
      return;
    }
    if (!form.ruang.trim()) {
      setFormError('Ruangan ujian harus dipilih atau diisi.');
      return;
    }
    if (!form.jamMulai || !form.jamSelesai) {
      setFormError('Jam mulai dan jam selesai harus diisi.');
      return;
    }
    const startMin = parseTimeToMinutes(form.jamMulai);
    const endMin = parseTimeToMinutes(form.jamSelesai);
    if (endMin <= startMin) {
      setFormError('Jam selesai harus lebih akhir dari jam mulai.');
      return;
    }

    const existingItem = editingId ? jadwalList.find(j => j.id === editingId) : undefined;
    const combinedKelasTarget =
      form.rombel === 'Semua Rombel'
        ? form.tingkatKelas === 'Semua Tingkat'
          ? 'Semua Kelas'
          : `${form.tingkatKelas} (Semua Rombel)`
        : form.rombel;

    const computedTitle =
      `${cbtSettings?.namaUjian || 'Ujian'} ${form.mataPelajaran.trim()} — ${combinedKelasTarget}`;

    const record: JadwalUjianItem = {
      id: editingId || `jdw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
      ujianId: existingItem?.ujianId || '',
      judulUjian: computedTitle,
      mataPelajaran: form.mataPelajaran.trim(),
      tingkatKelas: form.tingkatKelas.trim(),
      rombel: form.rombel.trim(),
      kelasTarget: combinedKelasTarget,
      tanggal: form.tanggal,
      jamMulai: form.jamMulai,
      jamSelesai: form.jamSelesai,
      ruang: form.ruang.trim(),
      pengawas: existingItem?.pengawas || '-',
      status: existingItem?.status || 'Mendatang'
    };

    if (editingId) {
      onSaveJadwalList(jadwalList.map(j => (j.id === editingId ? record : j)));
      showToast('Data jadwal ujian berhasil diperbarui.');
    } else {
      onSaveJadwalList([record, ...jadwalList]);
      showToast('Data jadwal ujian baru berhasil disimpan.');
    }

    setShowModal(false);
  };

  const handleToggleStatus = (item: JadwalUjianItem) => {
    if (!canEdit) return;
    const nextStatus: 'Aktif' | 'Mendatang' | 'Selesai' =
      item.status === 'Mendatang'
        ? 'Aktif'
        : item.status === 'Aktif'
        ? 'Selesai'
        : 'Mendatang';
    onSaveJadwalList(
      jadwalList.map(j => (j.id === item.id ? { ...j, status: nextStatus } : j))
    );
    showToast(`Status jadwal diubah menjadi ${nextStatus}.`);
  };

  const handleConfirmDeleteOne = () => {
    if (!deleteTarget) return;
    onSaveJadwalList(jadwalList.filter(j => j.id !== deleteTarget.id));
    showToast(`Jadwal "${deleteTarget.mataPelajaran}" berhasil dihapus.`);
    setDeleteTarget(null);
  };

  const handleConfirmDeleteAll = () => {
    onSaveJadwalList([]);
    setShowDeleteAllConfirm(false);
    showToast('Seluruh data jadwal ujian telah dikosongkan.');
  };

  // --- Template, Export & Import CSV ---
  const handleDownloadTemplate = () => {
    const header = [
      'Mata Pelajaran',
      'Tingkat Kelas',
      'Rombel',
      'Tanggal (YYYY-MM-DD)',
      'Jam Mulai',
      'Jam Selesai',
      'Ruangan'
    ];
    const sample1 = [
      'Matematika',
      'Kelas VII',
      'VII - Ibnu Sina',
      new Date().toISOString().split('T')[0],
      '07:30',
      '09:00',
      'Ruang 1'
    ];
    const sample2 = [
      'Bahasa Indonesia',
      'Kelas VIII',
      'VIII - Al Biruni',
      new Date().toISOString().split('T')[0],
      '09:30',
      '11:00',
      'Ruang 2'
    ];
    const csv = [header, sample1, sample2].map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Jadwal_Ujian.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('Template CSV Jadwal Ujian berhasil diunduh.');
  };

  const handleExportCsv = () => {
    if (filteredJadwalList.length === 0) {
      showToast('Tidak ada data jadwal ujian untuk diekspor.', 'error');
      return;
    }
    const header = [
      'Mata Pelajaran',
      'Tingkat Kelas',
      'Rombel',
      'Tanggal',
      'Jam Mulai',
      'Jam Selesai',
      'Ruangan',
      'Status'
    ];
    const rows = filteredJadwalList.map(j => [
      j.mataPelajaran,
      j.tingkatKelas || inferTingkatFromRombel(j.rombel || j.kelasTarget) || '-',
      j.rombel || j.kelasTarget,
      j.tanggal,
      j.jamMulai,
      j.jamSelesai,
      j.ruang,
      j.status
    ]);
    const csv = [header, ...rows].map(row => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Jadwal_Ujian_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`${filteredJadwalList.length} jadwal ujian berhasil diekspor ke CSV.`);
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const text = String(ev.target?.result || '').replace(/^\uFEFF/, '');
        const lines = text
          .split(/\r?\n/)
          .map(l => l.trim())
          .filter(Boolean);
        if (lines.length < 2) {
          showToast('File CSV kosong atau tidak memiliki baris data.', 'error');
          return;
        }
        const imported: JadwalUjianItem[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const mapel = cols[0]?.trim();
          if (!mapel) continue;
          const tingkat = normalizeTingkat(cols[1] || '') || inferTingkatFromRombel(cols[2] || '') || 'Semua Tingkat';
          const rombel = cols[2]?.trim() || 'Semua Rombel';
          const tanggal = cols[3]?.trim() || new Date().toISOString().split('T')[0];
          const jamMulai = cols[4]?.trim() || '07:30';
          const jamSelesai = cols[5]?.trim() || '09:00';
          const ruang = cols[6]?.trim() || 'Ruang 1';
          const kelasTarget = rombel === 'Semua Rombel' ? tingkat : rombel;
          const judulUjian = `${cbtSettings?.namaUjian || 'Ujian'} ${mapel} — ${kelasTarget}`;
          const rawStatus = cols[7]?.trim();
          const status: 'Aktif' | 'Selesai' | 'Mendatang' =
            rawStatus === 'Aktif' || rawStatus === 'Selesai' || rawStatus === 'Mendatang'
              ? rawStatus
              : 'Mendatang';

          imported.push({
            id: `jdw-imp-${Date.now().toString(36)}-${i}`,
            ujianId: '',
            judulUjian,
            mataPelajaran: mapel,
            tingkatKelas: tingkat,
            rombel,
            kelasTarget,
            tanggal,
            jamMulai,
            jamSelesai,
            ruang,
            pengawas: '-',
            status
          });
        }
        if (imported.length === 0) {
          showToast('Tidak ada baris jadwal yang valid pada file CSV.', 'error');
          return;
        }
        onSaveJadwalList([...imported, ...jadwalList]);
        showToast(`${imported.length} jadwal ujian berhasil diimpor dari CSV.`);
      } catch {
        showToast('Gagal membaca file CSV. Pastikan format sesuai template.', 'error');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePrintJadwal = () => {
    window.print();
  };

  // --- Filter dropdown options for Kelas ---
  const filterKelasOptions = useMemo(() => {
    const items: string[] = [];
    tingkatOptions
      .filter(t => t !== 'Semua Tingkat')
      .forEach(t => items.push(t));
    allRombelRecords.forEach(r => items.push(r.namaRombel));
    return items;
  }, [tingkatOptions, allRombelRecords]);

  return (
    <div className="space-y-4">
      {/* Hidden file input for CSV Import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,text/csv"
        onChange={handleImportCsv}
        className="hidden"
      />

      {/* =====================================================================
          MAIN MANAGEMENT CARD (Dark Theme)
         ===================================================================== */}
      <div className="bg-[#121212] text-slate-100 rounded-2xl border border-slate-800 shadow-xl overflow-hidden print:hidden">
        {/* Card Header + Search */}
        <div className="px-6 py-5 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-lg font-bold tracking-tight text-white">
              Manajemen Jadwal Ujian
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="font-medium text-slate-200">
                {cbtSettings?.namaUjian || 'Sumatif Akhir Semester (SAS)'}
              </span>
              <span aria-hidden="true">·</span>
              <span>Semester {cbtSettings?.semester || schoolSettings?.semesterAktif || 'Ganjil'}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">
                TP {cbtSettings?.tahunAjaran || schoolSettings?.tahunAjaran || '2026/2027'}
              </span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums font-medium text-cyan-400">
                {jadwalList.length} sesi terjadwal
              </span>
            </div>
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari mapel, rombel, ruangan, tanggal..."
              className="w-full pl-9 pr-8 py-2 bg-[#181818] border border-slate-800 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:bg-[#1e1e1e] focus:border-cyan-500/60 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                aria-label="Hapus pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3.5 bg-[#161822]/80 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          {/* Left: Template, Import, Export, Cetak */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
              <span>Template</span>
            </button>

            {canEdit && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import CSV</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-300" />
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={handlePrintJadwal}
              className="px-3.5 py-2 rounded-xl bg-[#181818] hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-700/80 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-300" />
              <span>Cetak Jadwal</span>
            </button>
          </div>

          {/* Right: Hapus Semua + Tambah Data */}
          {canEdit && (
            <div className="flex items-center gap-2">
              {jadwalList.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowDeleteAllConfirm(true)}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Semua</span>
                </button>
              )}

              <button
                type="button"
                onClick={openAddModal}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Data</span>
              </button>
            </div>
          )}
        </div>

        {/* Filter Bar */}
        <div className="px-6 py-3.5 border-b border-slate-800/80 bg-[#121212] flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Filter Kelas
              </label>
              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="bg-[#181818] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500/60 min-w-[140px] [color-scheme:dark]"
              >
                <option value="Semua">Semua Kelas</option>
                <optgroup label="Tingkat Kelas">
                  {tingkatOptions
                    .filter(t => t !== 'Semua Tingkat')
                    .map(t => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                </optgroup>
                <optgroup label="Rombongan Belajar">
                  {filterKelasOptions
                    .filter(k => !tingkatOptions.includes(k))
                    .map(r => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                Filter Ruangan
              </label>
              <select
                value={filterRuang}
                onChange={e => setFilterRuang(e.target.value)}
                className="bg-[#181818] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-100 focus:outline-none focus:border-cyan-500/60 min-w-[135px] [color-scheme:dark]"
              >
                <option value="Semua">Semua Ruangan</option>
                {ruanganOptions.map(r => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-slate-400 mb-1">
                Status
              </span>
              <div className="inline-flex items-center p-0.5 bg-[#181818] rounded-lg border border-slate-800">
                {(['Semua', 'Mendatang', 'Aktif', 'Selesai'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      filterStatus === st
                        ? 'bg-slate-800 text-white shadow-xs border border-slate-700/70'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-400 tabular-nums">
            Menampilkan <span className="font-semibold text-white">{filteredJadwalList.length}</span> dari{' '}
            <span className="font-semibold text-white">{jadwalList.length}</span> jadwal
          </div>
        </div>

        {/* Schedule Data Table */}
        <div className="overflow-x-auto">
          {filteredJadwalList.length === 0 ? (
            <div className="px-6 py-14 text-center space-y-3">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-[#181818] border border-slate-800 flex items-center justify-center text-slate-400">
                <Calendar className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md mx-auto">
                <p className="text-sm font-bold text-slate-100">
                  {jadwalList.length === 0
                    ? 'Belum ada data jadwal ujian'
                    : 'Tidak ada jadwal yang sesuai filter'}
                </p>
                <p className="text-xs text-slate-400">
                  {jadwalList.length === 0
                    ? 'Tambahkan jadwal mata pelajaran, tingkat kelas, rombel, tanggal, ruangan, dan waktu ujian.'
                    : 'Ubah kata kunci pencarian atau reset filter kelas dan ruangan untuk melihat jadwal lainnya.'}
                </p>
              </div>
              <div className="pt-1 flex items-center justify-center gap-2">
                {jadwalList.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchQuery('');
                      setFilterKelas('Semua');
                      setFilterRuang('Semua');
                      setFilterStatus('Semua');
                    }}
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Reset Filter
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Data Baru</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#181b26] border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                  <th className="py-3 pl-6 pr-3 w-10">No</th>
                  <th className="py-3 px-3">Mata Pelajaran</th>
                  <th className="py-3 px-3">Tingkat &amp; Rombel</th>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Waktu</th>
                  <th className="py-3 px-3">Ruangan</th>
                  <th className="py-3 px-3">Status</th>
                  {canEdit && <th className="py-3 pl-3 pr-6 text-right">Aksi</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 text-xs">
                {filteredJadwalList.map((item, idx) => {
                  const displayTingkat =
                    item.tingkatKelas ||
                    inferTingkatFromRombel(item.rombel || item.kelasTarget) ||
                    '-';
                  const displayRombel = item.rombel || item.kelasTarget;
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/40 transition-colors"
                    >
                      <td className="py-3.5 pl-6 pr-3 text-slate-500 font-mono tabular-nums">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-100">
                          {item.mataPelajaran}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="font-medium text-slate-200">{displayRombel}</div>
                        <div className="text-[11px] text-slate-400 mt-0.5">{displayTingkat}</div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="font-medium text-slate-200 tabular-nums">
                          {formatTanggalIndo(item.tanggal)}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                          {item.tanggal}
                        </div>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono tabular-nums text-slate-200">
                        <span className="font-semibold text-white">{item.jamMulai}</span>
                        <span className="text-slate-500 mx-1">–</span>
                        <span className="font-semibold text-white">{item.jamSelesai}</span>
                        <span className="text-[10px] text-slate-500 ml-1">WIB</span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-medium text-slate-200">{item.ruang}</span>
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(item)}
                          disabled={!canEdit}
                          title={canEdit ? 'Klik untuk mengganti status' : undefined}
                          className={`text-xs font-semibold transition-colors ${
                            canEdit ? 'cursor-pointer hover:underline' : 'cursor-default'
                          } ${
                            item.status === 'Aktif'
                              ? 'text-emerald-400'
                              : item.status === 'Mendatang'
                              ? 'text-amber-400'
                              : 'text-slate-400'
                          }`}
                        >
                          {item.status}
                        </button>
                      </td>
                      {canEdit && (
                        <td className="py-3.5 pl-3 pr-6 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEditModal(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors cursor-pointer"
                              title="Edit jadwal ujian"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(item)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              title="Hapus jadwal ujian"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* =====================================================================
          PRINTABLE JADWAL UJIAN DOCUMENT (Only visible during print)
         ===================================================================== */}
      <div id="printable-jadwal-ujian" className="hidden print:block bg-white text-black p-6">
        <div className="border-b-2 border-black pb-3 mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold uppercase">
              {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}
            </h2>
            <p className="text-xs font-bold uppercase text-slate-900 mt-0.5">
              JADWAL {cbtSettings?.namaUjian || 'PELAKSANAAN UJIAN'} · SEMESTER {cbtSettings?.semester || schoolSettings?.semesterAktif || 'GANJIL'}
            </p>
            <p className="text-xs text-slate-700">
              Tahun Pelajaran {cbtSettings?.tahunAjaran || schoolSettings?.tahunAjaran || '2026/2027'}
            </p>
          </div>
          <div className="text-right text-xs">
            <div>Total Sesi: {filteredJadwalList.length}</div>
            {filterKelas !== 'Semua' && <div>Filter Kelas: {filterKelas}</div>}
          </div>
        </div>

        <table className="w-full text-left text-xs border-collapse border border-slate-800">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-800 px-2 py-1.5">No</th>
              <th className="border border-slate-800 px-2 py-1.5">Tanggal</th>
              <th className="border border-slate-800 px-2 py-1.5">Waktu</th>
              <th className="border border-slate-800 px-2 py-1.5">Mata Pelajaran</th>
              <th className="border border-slate-800 px-2 py-1.5">Tingkat / Rombel</th>
              <th className="border border-slate-800 px-2 py-1.5">Ruangan</th>
            </tr>
          </thead>
          <tbody>
            {filteredJadwalList.map((j, idx) => (
              <tr key={j.id}>
                <td className="border border-slate-800 px-2 py-1.5 text-center">{idx + 1}</td>
                <td className="border border-slate-800 px-2 py-1.5 whitespace-nowrap">
                  {formatTanggalIndo(j.tanggal)}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 whitespace-nowrap font-mono">
                  {j.jamMulai} - {j.jamSelesai}
                </td>
                <td className="border border-slate-800 px-2 py-1.5 font-semibold">{j.mataPelajaran}</td>
                <td className="border border-slate-800 px-2 py-1.5">
                  {j.rombel || j.kelasTarget}
                </td>
                <td className="border border-slate-800 px-2 py-1.5">{j.ruang}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-8 flex justify-end text-xs">
          <div className="text-center w-60">
            <p>
              {cbtSettings?.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok'},{' '}
              {cbtSettings?.tanggalPenetapan
                ? formatTanggalIndo(cbtSettings.tanggalPenetapan)
                : new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="font-semibold">Kepala Sekolah,</p>
            <div className="h-16 flex items-center justify-center my-1">
              {cbtSettings?.ttdKepalaSekolahUrl && (
                <img
                  src={cbtSettings.ttdKepalaSekolahUrl}
                  alt="Tanda Tangan Kepala Sekolah"
                  className="max-h-16 max-w-[170px] object-contain"
                  referrerPolicy="no-referrer"
                />
              )}
            </div>
            <p className="font-bold underline">
              {cbtSettings?.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Nurhidayati, S.Pd'}
            </p>
            {(cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah) && (
              <p className="text-[11px]">
                NIP. {cbtSettings?.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL: TAMBAH / EDIT DATA JADWAL UJIAN (Dark Theme)
         ===================================================================== */}
      {showModal && (
        <div className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#121212] text-slate-100 rounded-2xl max-w-xl w-full shadow-2xl border border-slate-800 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <h3 className="text-base font-bold text-white tracking-tight">
                {editingId ? 'Edit Data Jadwal Ujian' : 'Tambah Data Jadwal Ujian'}
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Tutup modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitForm} className="flex flex-col flex-1 min-h-0">
              <div className="p-6 overflow-y-auto space-y-5 flex-1">
                {formError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{formError}</span>
                  </div>
                )}

                {scheduleConflict && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                    <div>
                      <span className="font-semibold text-amber-300">Perhatian jadwal bentrok:</span>{' '}
                      {scheduleConflict.ruang} pada {formatTanggalIndo(scheduleConflict.tanggal)} sudah digunakan untuk{' '}
                      <span className="font-semibold text-white">{scheduleConflict.mataPelajaran}</span> ({scheduleConflict.jamMulai}–{scheduleConflict.jamSelesai}).
                    </div>
                  </div>
                )}

                {/* SECTION 1: INFORMASI JADWAL UJIAN */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-400 text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                      1
                    </span>
                    <span className="text-xs font-bold tracking-wide text-slate-200">
                      Informasi Jadwal Ujian
                    </span>
                  </div>

                  <div className="rounded-xl border border-slate-800 bg-[#181818]/80 p-5 space-y-4">
                    {/* 1. MATA PELAJARAN */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                        Mata Pelajaran <span className="text-rose-400">*</span>
                      </label>
                      <select
                        value={customMapelMode ? CUSTOM_VALUE : form.mataPelajaran}
                        onChange={e => handleSelectMapel(e.target.value)}
                        className="w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 transition-colors [color-scheme:dark]"
                      >
                        <option value="">Pilih Mata Pelajaran</option>
                        {availableMapelOptions.map(m => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                        <option value={CUSTOM_VALUE}>+ Tulis Mata Pelajaran Lainnya...</option>
                      </select>
                      {customMapelMode && (
                        <input
                          type="text"
                          value={form.mataPelajaran}
                          onChange={e => setForm(prev => ({ ...prev, mataPelajaran: e.target.value }))}
                          placeholder="Ketik nama mata pelajaran..."
                          className="mt-2 w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
                        />
                      )}
                    </div>

                    {/* 2. TINGKAT KELAS & ROMBONGAN BELAJAR (ROMBEL) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          Tingkat Kelas <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={form.tingkatKelas}
                          onChange={e => handleSelectTingkat(e.target.value)}
                          className="w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 transition-colors [color-scheme:dark]"
                        >
                          <option value="">Pilih Kelas</option>
                          {tingkatOptions.map(t => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          Rombongan Belajar (Rombel) <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={form.rombel}
                          onChange={e => setForm(prev => ({ ...prev, rombel: e.target.value }))}
                          className="w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 transition-colors [color-scheme:dark]"
                        >
                          <option value="">Pilih Rombel</option>
                          <option value="Semua Rombel">Semua Rombel</option>
                          {filteredRombelOptions.map(r => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* 3. TANGGAL & RUANGAN */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          Tanggal <span className="text-rose-400">*</span>
                        </label>
                        <div className="relative">
                          <input
                            type="date"
                            value={form.tanggal}
                            onChange={e => setForm(prev => ({ ...prev, tanggal: e.target.value }))}
                            className="w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-cyan-500/60 transition-colors [color-scheme:dark]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          Ruangan <span className="text-rose-400">*</span>
                        </label>
                        <select
                          value={customRuangMode ? CUSTOM_VALUE : form.ruang}
                          onChange={e => handleSelectRoom(e.target.value)}
                          className="w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500/60 transition-colors [color-scheme:dark]"
                        >
                          <option value="">Pilih Ruang</option>
                          {ruanganOptions.map(r => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                          <option value={CUSTOM_VALUE}>+ Tulis Ruangan Lainnya...</option>
                        </select>
                        {customRuangMode && (
                          <input
                            type="text"
                            value={form.ruang}
                            onChange={e => setForm(prev => ({ ...prev, ruang: e.target.value }))}
                            placeholder="Contoh: Lab Komputer 02"
                            className="mt-2 w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/60"
                          />
                        )}
                      </div>
                    </div>

                    {/* 4. JAM MULAI & JAM SELESAI */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          Jam Mulai <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="time"
                          value={form.jamMulai}
                          onChange={e => setForm(prev => ({ ...prev, jamMulai: e.target.value }))}
                          className="w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-cyan-500/60 transition-colors [color-scheme:dark]"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                          Jam Selesai <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="time"
                          value={form.jamSelesai}
                          onChange={e => setForm(prev => ({ ...prev, jamSelesai: e.target.value }))}
                          className="w-full bg-[#121212] border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 tabular-nums focus:outline-none focus:border-cyan-500/60 transition-colors [color-scheme:dark]"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sticky Footer */}
              <div className="px-6 py-4 border-t border-slate-800 bg-[#161822]/90 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:scale-[0.98] text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-lg shadow-cyan-950/40 transition-all cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Simpan Perubahan' : 'Simpan Data'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL KONFIRMASI HAPUS SATU JADWAL
         ===================================================================== */}
      {deleteTarget && (
        <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#121212] text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Hapus Data Jadwal Ujian?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Jadwal ujian <span className="font-semibold text-white">{deleteTarget.mataPelajaran}</span> untuk{' '}
                <span className="font-semibold text-white">{deleteTarget.rombel || deleteTarget.kelasTarget}</span> pada{' '}
                <span className="tabular-nums font-medium text-slate-200">{formatTanggalIndo(deleteTarget.tanggal)}</span> ({deleteTarget.jamMulai}–{deleteTarget.jamSelesai}) di{' '}
                <span className="font-medium text-slate-200">{deleteTarget.ruang}</span> akan dihapus permanen.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOne}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Ya, Hapus Data
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL KONFIRMASI HAPUS SEMUA JADWAL
         ===================================================================== */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 z-[110] bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-[#121212] text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-800 space-y-4">
            <div className="space-y-1.5">
              <h3 className="text-base font-bold text-white">Hapus Semua Jadwal Ujian?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tindakan ini akan menghapus seluruh{' '}
                <span className="font-bold text-rose-400 tabular-nums">{jadwalList.length}</span> data jadwal ujian yang tersimpan. Pastikan Anda sudah mengekspor data jika masih diperlukan.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAll}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
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
