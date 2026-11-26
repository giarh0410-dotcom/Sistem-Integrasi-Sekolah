import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  Filter,
  Grid,
  HelpCircle,
  KeyRound,
  LayoutList,
  Lock,
  MapPin,
  MessageSquare,
  MonitorCheck,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  ShieldCheck,
  StopCircle,
  Unlock,
  UserCheck,
  UserX,
  Users,
  X
} from 'lucide-react';
import {
  BankSoal,
  CbtExamSettings,
  CbtSesiAktif,
  CbtSubTab,
  HasilUjian,
  Siswa,
  StatusSesiCbt
} from '../../types/school';
import {
  dbDeleteItem,
  dbFetchCollection,
  dbSaveItem,
  dbSubscribeCollection
} from '../../lib/firebaseSync';
import { safeSetStorageJson } from '../../utils/safeStorage';
import type { DenahRuangItem } from './DenahRuangUjian';

export const CBT_SESI_AKTIF_STORAGE_KEY = 'edu_cbtSesiAktifList';
export const CBT_MONITOR_CHANNEL_NAME = 'edu_cbt_live_monitor';

interface MonitoringUjianCbtProps {
  siswaList: Siswa[];
  bankSoalList: BankSoal[];
  hasilUjianList: HasilUjian[];
  availableKelasList: string[];
  availableMapelList: string[];
  cbtSettings?: CbtExamSettings;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onNavigateSubTab?: (subTab: CbtSubTab) => void;
}

type ViewMode = 'tabel' | 'grid' | 'belum_mulai';

function readLocalSesiList(): CbtSesiAktif[] {
  try {
    const raw = localStorage.getItem(CBT_SESI_AKTIF_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeSesiLists(primary: CbtSesiAktif[], secondary: CbtSesiAktif[]): CbtSesiAktif[] {
  const byId = new Map<string, CbtSesiAktif>();
  [...secondary, ...primary].forEach(item => {
    if (!item?.id) return;
    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      return;
    }
    const tExisting = new Date(existing.updatedAt || existing.lastHeartbeat || 0).getTime();
    const tIncoming = new Date(item.updatedAt || item.lastHeartbeat || 0).getTime();
    if (tIncoming >= tExisting) {
      byId.set(item.id, item);
    }
  });
  return Array.from(byId.values()).sort((a, b) => {
    const tA = new Date(a.updatedAt || a.lastHeartbeat || 0).getTime();
    const tB = new Date(b.updatedAt || b.lastHeartbeat || 0).getTime();
    return tB - tA;
  });
}

function formatRemainingTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatClock(iso?: string): string {
  if (!iso) return '-';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export const MonitoringUjianCbt: React.FC<MonitoringUjianCbtProps> = ({
  siswaList,
  bankSoalList,
  hasilUjianList,
  availableKelasList,
  availableMapelList,
  cbtSettings,
  showToast,
  onNavigateSubTab
}) => {
  const [sesiList, setSesiList] = useState<CbtSesiAktif[]>(() => readLocalSesiList());
  const [denahRuangList, setDenahRuangList] = useState<DenahRuangItem[]>(() => {
    try {
      const raw = localStorage.getItem('edu_denahRuangList');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [viewMode, setViewMode] = useState<ViewMode>('tabel');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMapel, setFilterMapel] = useState('Semua');
  const [filterPaketId, setFilterPaketId] = useState('Semua');
  const [filterKelas, setFilterKelas] = useState('Semua');
  const [filterRuang, setFilterRuang] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | StatusSesiCbt>('Semua');
  const [selectedSesiId, setSelectedSesiId] = useState<string | null>(null);
  const [pesanInput, setPesanInput] = useState('');
  const [confirmAction, setConfirmAction] = useState<{
    sesiId: string;
    type: 'kunci' | 'lanjut' | 'reset_pelanggaran' | 'paksa_submit' | 'hapus';
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // Live 1-second clock tick for smooth countdown estimation & idle connection detection
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load denah ruang for room assignment mapping
  useEffect(() => {
    let active = true;
    dbFetchCollection<DenahRuangItem>('edu_denahRuangList')
      .then(items => {
        if (active && items.length > 0) {
          setDenahRuangList(items);
          safeSetStorageJson('edu_denahRuangList', items);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Subscribe to real-time Firestore collection + BroadcastChannel + StorageEvent
  useEffect(() => {
    const unsubscribe = dbSubscribeCollection<CbtSesiAktif>(
      'edu_cbtSesiAktifList',
      remoteItems => {
        setSesiList(prev => {
          const merged = mergeSesiLists(remoteItems, prev.filter(p => remoteItems.some(r => r.id === p.id)));
          const finalList = remoteItems.length > 0 ? merged : [];
          safeSetStorageJson(CBT_SESI_AKTIF_STORAGE_KEY, finalList);
          return finalList;
        });
      },
      () => {
        // Fallback silently to localStorage/BroadcastChannel if Firestore listener fails
      }
    );

    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel(CBT_MONITOR_CHANNEL_NAME);
      bc.onmessage = event => {
        const data = event.data;
        if (!data || typeof data !== 'object') return;
        if (data.type === 'SESI_UPSERT' && data.payload) {
          const incoming = data.payload as CbtSesiAktif;
          setSesiList(prev => {
            const merged = mergeSesiLists([incoming], prev);
            safeSetStorageJson(CBT_SESI_AKTIF_STORAGE_KEY, merged);
            return merged;
          });
        } else if (data.type === 'SESI_DELETE' && data.sesiId) {
          setSesiList(prev => {
            const next = prev.filter(item => item.id !== data.sesiId);
            safeSetStorageJson(CBT_SESI_AKTIF_STORAGE_KEY, next);
            return next;
          });
        }
      };
    }

    const onStorage = (e: StorageEvent) => {
      if (e.key === CBT_SESI_AKTIF_STORAGE_KEY) {
        setSesiList(readLocalSesiList());
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      unsubscribe();
      if (bc) bc.close();
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      const remote = await dbFetchCollection<CbtSesiAktif>('edu_cbtSesiAktifList');
      const local = readLocalSesiList();
      const merged = remote.length > 0 ? mergeSesiLists(remote, local) : local;
      setSesiList(merged);
      safeSetStorageJson(CBT_SESI_AKTIF_STORAGE_KEY, merged);
      showToast('Data monitoring live berhasil disinkronkan.');
    } catch {
      showToast('Gagal menyegarkan data monitoring.', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  // Map student ID / NIS / name to room name from DenahRuangUjian
  const studentRoomMap = useMemo(() => {
    const map = new Map<string, string>();
    denahRuangList.forEach(ruang => {
      const namaRuang = ruang.namaRuang || ruang.id;
      (ruang.kursiList || []).forEach(kursi => {
        if (kursi.siswaId) map.set(kursi.siswaId, namaRuang);
        if (kursi.namaSiswa) map.set(kursi.namaSiswa.trim().toLowerCase(), namaRuang);
      });
    });
    return map;
  }, [denahRuangList]);

  const siswaById = useMemo(() => {
    const map = new Map<string, Siswa>();
    siswaList.forEach(s => map.set(s.id, s));
    return map;
  }, [siswaList]);

  const resolveRuang = (sesi: CbtSesiAktif): string => {
    if (sesi.ruang && sesi.ruang.trim() && sesi.ruang !== '-') return sesi.ruang;
    return (
      studentRoomMap.get(sesi.siswaId) ||
      studentRoomMap.get((sesi.siswaNama || '').trim().toLowerCase()) ||
      '-'
    );
  };

  const resolveLiveRemainingSeconds = (sesi: CbtSesiAktif): number => {
    if (sesi.status === 'Selesai' || sesi.status === 'Dikunci Pengawas') {
      return Math.max(0, sesi.sisaDetik);
    }
    const hbTime = new Date(sesi.lastHeartbeat || sesi.updatedAt || 0).getTime();
    if (Number.isNaN(hbTime) || hbTime <= 0) return Math.max(0, sesi.sisaDetik);
    const elapsedSinceHeartbeat = Math.max(0, Math.floor((nowMs - hbTime) / 1000));
    // Cap drift estimation at 90s if tab stopped heartbeating
    const cappedDrift = Math.min(elapsedSinceHeartbeat, 90);
    return Math.max(0, sesi.sisaDetik - cappedDrift);
  };

  const isConnectionStale = (sesi: CbtSesiAktif): boolean => {
    if (sesi.status === 'Selesai') return false;
    const hbTime = new Date(sesi.lastHeartbeat || sesi.updatedAt || 0).getTime();
    if (Number.isNaN(hbTime) || hbTime <= 0) return true;
    return nowMs - hbTime > 45000; // > 45 detik tidak ada heartbeat
  };

  const ruangOptions = useMemo(() => {
    const set = new Set<string>();
    denahRuangList.forEach(r => {
      if (r.namaRuang) set.add(r.namaRuang);
    });
    sesiList.forEach(s => {
      const r = resolveRuang(s);
      if (r && r !== '-') set.add(r);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }));
  }, [denahRuangList, sesiList]);

  const mapelOptions = useMemo(() => {
    const set = new Set<string>(availableMapelList);
    sesiList.forEach(s => {
      if (s.mataPelajaran) set.add(s.mataPelajaran);
    });
    return Array.from(set).filter(Boolean).sort();
  }, [availableMapelList, sesiList]);

  // Enrich sesiList with resolved room and filtered view
  const filteredSesiList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sesiList.filter(s => {
      const ruang = resolveRuang(s);
      if (filterMapel !== 'Semua' && s.mataPelajaran !== filterMapel) return false;
      if (filterPaketId !== 'Semua' && s.ujianId !== filterPaketId) return false;
      if (filterKelas !== 'Semua' && s.kelas !== filterKelas) return false;
      if (filterRuang !== 'Semua' && ruang !== filterRuang) return false;
      if (filterStatus !== 'Semua' && s.status !== filterStatus) return false;
      if (q) {
        const hay = `${s.siswaNama} ${s.nis} ${s.kelas} ${s.mataPelajaran} ${s.judulUjian} ${ruang}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [sesiList, searchQuery, filterMapel, filterPaketId, filterKelas, filterRuang, filterStatus, studentRoomMap]);

  // Students who have NOT started (checked against active sessions & submitted HasilUjian)
  const belumMulaiSiswaList = useMemo(() => {
    const activeSiswaIds = new Set<string>();
    sesiList.forEach(s => {
      if (filterPaketId !== 'Semua' && s.ujianId !== filterPaketId) return;
      if (filterMapel !== 'Semua' && s.mataPelajaran !== filterMapel) return;
      activeSiswaIds.add(s.siswaId);
    });
    hasilUjianList.forEach(h => {
      if (filterPaketId !== 'Semua' && h.ujianId !== filterPaketId) return;
      if (filterMapel !== 'Semua' && h.mataPelajaran && h.mataPelajaran !== filterMapel) return;
      activeSiswaIds.add(h.siswaId);
    });

    const q = searchQuery.trim().toLowerCase();
    return siswaList.filter(siswa => {
      if (activeSiswaIds.has(siswa.id)) return false;
      const kelas = siswa.kelas || siswa.rombel || '-';
      const ruang = studentRoomMap.get(siswa.id) || studentRoomMap.get(siswa.nama.trim().toLowerCase()) || '-';
      if (filterKelas !== 'Semua' && kelas !== filterKelas) return false;
      if (filterRuang !== 'Semua' && ruang !== filterRuang) return false;
      if (q) {
        const hay = `${siswa.nama} ${siswa.nis} ${siswa.nisn} ${kelas} ${ruang}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [siswaList, sesiList, hasilUjianList, filterPaketId, filterMapel, filterKelas, filterRuang, searchQuery, studentRoomMap]);

  // KPI summary
  const kpiStats = useMemo(() => {
    const scope = sesiList.filter(s => {
      if (filterMapel !== 'Semua' && s.mataPelajaran !== filterMapel) return false;
      if (filterPaketId !== 'Semua' && s.ujianId !== filterPaketId) return false;
      if (filterKelas !== 'Semua' && s.kelas !== filterKelas) return false;
      return true;
    });
    const sedangMengerjakan = scope.filter(s => s.status === 'Mengerjakan').length;
    const peringatan = scope.filter(s => s.status === 'Peringatan Pelanggaran' || (s.pelanggaranCount > 0 && s.status !== 'Selesai' && s.status !== 'Dikunci Pengawas')).length;
    const dikunci = scope.filter(s => s.status === 'Dikunci Pengawas').length;
    const selesai = scope.filter(s => s.status === 'Selesai').length;
    return {
      sedangMengerjakan,
      peringatan,
      dikunci,
      selesai,
      belumMulai: belumMulaiSiswaList.length
    };
  }, [sesiList, belumMulaiSiswaList, filterMapel, filterPaketId, filterKelas]);

  const selectedSesi = useMemo(
    () => sesiList.find(s => s.id === selectedSesiId) || null,
    [sesiList, selectedSesiId]
  );

  // Publish proctor command to Firestore + BroadcastChannel + localStorage
  const sendProctorCommand = async (
    sesi: CbtSesiAktif,
    patch: Partial<CbtSesiAktif>,
    toastMsg: string
  ) => {
    const nowIso = new Date().toISOString();
    const updated: CbtSesiAktif = {
      ...sesi,
      ...patch,
      updatedAt: nowIso
    };

    setSesiList(prev => {
      const next = mergeSesiLists([updated], prev);
      safeSetStorageJson(CBT_SESI_AKTIF_STORAGE_KEY, next);
      return next;
    });

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel(CBT_MONITOR_CHANNEL_NAME);
        bc.postMessage({ type: 'SESI_UPSERT', payload: updated });
        bc.close();
      } catch {
        // ignore
      }
    }

    try {
      await dbSaveItem('edu_cbtSesiAktifList', updated);
    } catch {
      // handled gracefully via local sync
    }
    setConfirmAction(null);
    showToast(toastMsg);
  };

  const handleDeleteSession = async (sesiId: string) => {
    setSesiList(prev => {
      const next = prev.filter(s => s.id !== sesiId);
      safeSetStorageJson(CBT_SESI_AKTIF_STORAGE_KEY, next);
      return next;
    });
    if (selectedSesiId === sesiId) setSelectedSesiId(null);

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel(CBT_MONITOR_CHANNEL_NAME);
        bc.postMessage({ type: 'SESI_DELETE', sesiId });
        bc.close();
      } catch {
        // ignore
      }
    }

    try {
      await dbDeleteItem('edu_cbtSesiAktifList', sesiId);
    } catch {
      // ignore
    }
    setConfirmAction(null);
    showToast('Catatan sesi monitoring siswa dihapus.');
  };

  const handleSendMessageToStudent = async (sesi: CbtSesiAktif) => {
    const trimmed = pesanInput.trim();
    if (!trimmed) {
      showToast('Ketik pesan pengawas terlebih dahulu.', 'error');
      return;
    }
    await sendProctorCommand(
      sesi,
      { pesanPengawas: trimmed },
      `Pesan pengawas dikirim ke ${sesi.siswaNama}.`
    );
    setPesanInput('');
  };

  const getStatusBadge = (sesi: CbtSesiAktif) => {
    if (sesi.status === 'Dikunci Pengawas') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/35">
          <Lock className="w-3 h-3" /> Dikunci Pengawas
        </span>
      );
    }
    if (sesi.status === 'Selesai') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/35">
          <CheckCircle2 className="w-3 h-3" /> Selesai Submit
        </span>
      );
    }
    if (sesi.status === 'Peringatan Pelanggaran' || sesi.pelanggaranCount > 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/35">
          <AlertTriangle className="w-3 h-3 animate-pulse" /> Peringatan ({sesi.pelanggaranCount}x)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-500/15 text-cyan-300 border border-cyan-500/35">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping inline-block" />
        Mengerjakan
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* Header Control Bar */}
      <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-white tracking-tight">
                  Monitoring Ujian CBT Live
                </h3>
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Realtime
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {cbtSettings?.namaUjian || 'Pelaksanaan Ujian CBT'} • Pantau progres soal, sisa waktu, log anti-cheat, dan kendalikan sesi peserta secara langsung.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onNavigateSubTab && (
            <button
              type="button"
              onClick={() => onNavigateSubTab('koreksi_soal')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Koreksi Soal
            </button>
          )}
          <button
            type="button"
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-950/50 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Sinkronkan
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => {
            setViewMode('tabel');
            setFilterStatus(prev => (prev === 'Mengerjakan' ? 'Semua' : 'Mengerjakan'));
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            viewMode !== 'belum_mulai' && filterStatus === 'Mengerjakan'
              ? 'bg-cyan-950/50 border-cyan-500/60 shadow-md shadow-cyan-950/30'
              : 'bg-[#121212] border-slate-800 hover:border-cyan-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sedang Mengerjakan</span>
            <MonitorCheck className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white mt-2">{kpiStats.sedangMengerjakan}</div>
          <div className="text-[11px] text-cyan-400 font-semibold mt-0.5">Peserta aktif live</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('tabel');
            setFilterStatus(prev => (prev === 'Peringatan Pelanggaran' ? 'Semua' : 'Peringatan Pelanggaran'));
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            viewMode !== 'belum_mulai' && filterStatus === 'Peringatan Pelanggaran'
              ? 'bg-amber-950/50 border-amber-500/60 shadow-md shadow-amber-950/30'
              : 'bg-[#121212] border-slate-800 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pelanggaran</span>
            <ShieldAlert className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400 mt-2">{kpiStats.peringatan}</div>
          <div className="text-[11px] text-amber-300/80 font-semibold mt-0.5">Terindikasi pindah tab</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('tabel');
            setFilterStatus(prev => (prev === 'Dikunci Pengawas' ? 'Semua' : 'Dikunci Pengawas'));
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            viewMode !== 'belum_mulai' && filterStatus === 'Dikunci Pengawas'
              ? 'bg-rose-950/50 border-rose-500/60 shadow-md shadow-rose-950/30'
              : 'bg-[#121212] border-slate-800 hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dikunci Pengawas</span>
            <Lock className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-rose-400 mt-2">{kpiStats.dikunci}</div>
          <div className="text-[11px] text-rose-300/80 font-semibold mt-0.5">Menunggu buka kunci</div>
        </button>

        <button
          type="button"
          onClick={() => {
            setViewMode('tabel');
            setFilterStatus(prev => (prev === 'Selesai' ? 'Semua' : 'Selesai'));
          }}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            viewMode !== 'belum_mulai' && filterStatus === 'Selesai'
              ? 'bg-emerald-950/50 border-emerald-500/60 shadow-md shadow-emerald-950/30'
              : 'bg-[#121212] border-slate-800 hover:border-emerald-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Sudah Selesai</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400 mt-2">{kpiStats.selesai}</div>
          <div className="text-[11px] text-emerald-300/80 font-semibold mt-0.5">Jawaban terkirim</div>
        </button>

        <button
          type="button"
          onClick={() => setViewMode(prev => (prev === 'belum_mulai' ? 'tabel' : 'belum_mulai'))}
          className={`text-left p-4 rounded-2xl border transition-all cursor-pointer ${
            viewMode === 'belum_mulai'
              ? 'bg-indigo-950/50 border-indigo-500/60 shadow-md shadow-indigo-950/30'
              : 'bg-[#121212] border-slate-800 hover:border-indigo-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Belum Mulai</span>
            <UserX className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-200 mt-2">{kpiStats.belumMulai}</div>
          <div className="text-[11px] text-slate-400 font-semibold mt-0.5">Belum masuk ujian</div>
        </button>
      </div>

      {/* Filter & View Switcher */}
      <div className="bg-[#121212] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
          <div className="lg:col-span-2 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Cari nama siswa, NIS, kelas, ruang, mapel..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={filterMapel}
            onChange={e => {
              setFilterMapel(e.target.value);
              setFilterPaketId('Semua');
            }}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="Semua">Semua Mata Pelajaran</option>
            {mapelOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          <select
            value={filterPaketId}
            onChange={e => setFilterPaketId(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="Semua">Semua Paket Soal</option>
            {bankSoalList
              .filter(b => filterMapel === 'Semua' || b.mataPelajaran === filterMapel)
              .map(b => (
                <option key={b.id} value={b.id}>
                  {b.judul} ({b.mataPelajaran})
                </option>
              ))}
          </select>

          <select
            value={filterKelas}
            onChange={e => setFilterKelas(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="Semua">Semua Kelas</option>
            {availableKelasList.map(k => (
              <option key={k} value={k}>{k}</option>
            ))}
          </select>

          <select
            value={filterRuang}
            onChange={e => setFilterRuang(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 font-semibold focus:outline-none focus:border-cyan-500"
          >
            <option value="Semua">Semua Ruang</option>
            {ruangOptions.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" /> Status:
            </span>
            {(['Semua', 'Mengerjakan', 'Peringatan Pelanggaran', 'Dikunci Pengawas', 'Selesai'] as const).map(st => (
              <button
                key={st}
                type="button"
                onClick={() => {
                  setFilterStatus(st);
                  if (viewMode === 'belum_mulai') setViewMode('tabel');
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  filterStatus === st && viewMode !== 'belum_mulai'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('tabel')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'tabel' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutList className="w-3.5 h-3.5" /> Tabel Live
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'grid' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Grid className="w-3.5 h-3.5" /> Kartu
            </button>
            <button
              type="button"
              onClick={() => setViewMode('belum_mulai')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                viewMode === 'belum_mulai' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" /> Belum Mulai ({belumMulaiSiswaList.length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'belum_mulai' ? (
        <div className="bg-[#121212] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <UserX className="w-4 h-4 text-slate-400" /> Daftar Peserta Belum Memulai Ujian ({belumMulaiSiswaList.length})
            </h4>
          </div>
          {belumMulaiSiswaList.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <UserCheck className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-white">Semua peserta pada filter ini sudah masuk atau menyelesaikan ujian.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="px-4 py-3">No</th>
                    <th className="px-4 py-3">Nama Siswa</th>
                    <th className="px-4 py-3">NIS / NISN</th>
                    <th className="px-4 py-3">Kelas</th>
                    <th className="px-4 py-3">Ruang Ujian</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {belumMulaiSiswaList.map((s, idx) => {
                    const ruang = studentRoomMap.get(s.id) || studentRoomMap.get(s.nama.trim().toLowerCase()) || '-';
                    return (
                      <tr key={s.id} className="hover:bg-slate-900/40">
                        <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                        <td className="px-4 py-3 font-bold text-white">{s.nama}</td>
                        <td className="px-4 py-3 text-slate-300 font-mono">{s.nis || s.nisn || '-'}</td>
                        <td className="px-4 py-3 text-slate-300">{s.kelas || s.rombel || '-'}</td>
                        <td className="px-4 py-3 text-cyan-300 font-semibold">{ruang}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold border border-slate-700">
                            Belum Login / Belum Mulai
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : filteredSesiList.length === 0 ? (
        <div className="bg-[#121212] border border-slate-800 rounded-2xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-cyan-400">
            <Activity className="w-7 h-7" />
          </div>
          <h4 className="text-base font-extrabold text-white">Belum Ada Siswa yang Sedang Mengerjakan CBT</h4>
          <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
            Saat siswa menekan tombol <span className="text-white font-semibold">"Mulai Kerjakan Soal Sekarang"</span> pada menu Simulasi CBT Anti-Cheat, progres soal, sisa waktu, status ragu-ragu, dan peringatan anti-cheat akan langsung tampil secara real-time di layar ini.
          </p>
        </div>
      ) : viewMode === 'tabel' ? (
        <div className="bg-[#121212] border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/90 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Peserta</th>
                  <th className="px-4 py-3.5">Kelas / Ruang</th>
                  <th className="px-4 py-3.5">Mapel & Paket Ujian</th>
                  <th className="px-4 py-3.5">Progres Soal</th>
                  <th className="px-4 py-3.5">Sisa Waktu</th>
                  <th className="px-4 py-3.5">Status & Anti-Cheat</th>
                  <th className="px-4 py-3.5 text-right">Kontrol Pengawas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {filteredSesiList.map(sesi => {
                  const ruang = resolveRuang(sesi);
                  const liveSeconds = resolveLiveRemainingSeconds(sesi);
                  const stale = isConnectionStale(sesi);
                  const total = Math.max(1, sesi.totalSoal || 1);
                  const pct = Math.min(100, Math.round((sesi.terjawabCount / total) * 100));
                  const matchedSiswa = siswaById.get(sesi.siswaId);

                  return (
                    <tr key={sesi.id} className="hover:bg-slate-900/50 transition-colors">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center shrink-0">
                            {matchedSiswa?.fotoUrl ? (
                              <img src={matchedSiswa.fotoUrl} alt={sesi.siswaNama} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <span className="text-xs font-black text-cyan-400">
                                {(sesi.siswaNama || 'S').slice(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-xs">{sesi.siswaNama}</div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              NIS: {sesi.nis || '-'}
                              {stale && sesi.status !== 'Selesai' && (
                                <span className="ml-2 text-amber-400 font-sans font-semibold">• Tidak ada sinyal &gt;45d</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-200">{sesi.kelas || '-'}</div>
                        <div className="text-[11px] text-cyan-300 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" /> {ruang}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-[210px]">
                        <div className="font-bold text-white truncate">{sesi.mataPelajaran}</div>
                        <div className="text-[11px] text-slate-400 truncate" title={sesi.judulUjian}>
                          {sesi.judulUjian}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 min-w-[170px]">
                        <div className="flex items-center justify-between text-[11px] mb-1">
                          <span className="font-bold text-slate-200">
                            Soal #{sesi.soalAktifNo} • {sesi.terjawabCount}/{sesi.totalSoal}
                          </span>
                          <span className="font-mono font-bold text-cyan-400">{pct}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-500 ${
                              sesi.status === 'Selesai'
                                ? 'bg-emerald-500'
                                : sesi.status === 'Dikunci Pengawas'
                                ? 'bg-rose-500'
                                : 'bg-cyan-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        {sesi.raguCount > 0 && (
                          <div className="text-[10px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
                            <HelpCircle className="w-3 h-3" /> {sesi.raguCount} soal ragu-ragu
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className={`font-mono font-bold text-xs flex items-center gap-1.5 ${
                          liveSeconds <= 300 && sesi.status !== 'Selesai' ? 'text-rose-400' : 'text-amber-300'
                        }`}>
                          <Clock className="w-3.5 h-3.5" />
                          {sesi.status === 'Selesai' ? 'Selesai' : formatRemainingTime(liveSeconds)}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Update: {formatClock(sesi.lastHeartbeat)}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 space-y-1">
                        <div>{getStatusBadge(sesi)}</div>
                        {sesi.status === 'Selesai' && typeof sesi.nilaiSementara === 'number' && (
                          <div className="text-[11px] font-bold text-emerald-400">
                            Skor Akhir: {sesi.nilaiSementara}/100
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedSesiId(sesi.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                            title="Detail Progres & Log Anti-Cheat"
                          >
                            <Eye className="w-3.5 h-3.5 text-cyan-400" /> Detail
                          </button>

                          {sesi.status !== 'Selesai' && (
                            <>
                              {sesi.status === 'Dikunci Pengawas' ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    sendProctorCommand(
                                      sesi,
                                      {
                                        status: sesi.pelanggaranCount > 0 ? 'Peringatan Pelanggaran' : 'Mengerjakan',
                                        instruksiPengawas: 'lanjut',
                                        pesanPengawas: 'Sesi ujian Anda telah dibuka kembali oleh pengawas.'
                                      },
                                      `Kunci sesi ${sesi.siswaNama} dibuka kembali.`
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Unlock className="w-3.5 h-3.5" /> Buka
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() =>
                                    sendProctorCommand(
                                      sesi,
                                      {
                                        status: 'Dikunci Pengawas',
                                        instruksiPengawas: 'kunci',
                                        pesanPengawas: 'Layar ujian dikunci sementara oleh pengawas. Silakan tunggu arahan pengawas.'
                                      },
                                      `Sesi ujian ${sesi.siswaNama} dikunci sementara.`
                                    )
                                  }
                                  className="px-2.5 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600/35 text-rose-300 border border-rose-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Lock className="w-3.5 h-3.5" /> Kunci
                                </button>
                              )}

                              {confirmAction?.sesiId === sesi.id && confirmAction.type === 'paksa_submit' ? (
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      sendProctorCommand(
                                        sesi,
                                        {
                                          instruksiPengawas: 'paksa_submit',
                                          pesanPengawas: 'Ujian dihentikan dan dikumpulkan otomatis oleh pengawas.'
                                        },
                                        `Perintah paksa submit dikirim ke ${sesi.siswaNama}.`
                                      )
                                    }
                                    className="px-2 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold cursor-pointer"
                                  >
                                    Ya, Submit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setConfirmAction(null)}
                                    className="px-2 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setConfirmAction({ sesiId: sesi.id, type: 'paksa_submit' })}
                                  className="px-2.5 py-1.5 rounded-lg bg-amber-600/20 hover:bg-amber-600/35 text-amber-300 border border-amber-500/40 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                                  title="Paksa Kumpulkan Ujian"
                                >
                                  <StopCircle className="w-3.5 h-3.5" /> Submit
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Grid Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredSesiList.map(sesi => {
            const ruang = resolveRuang(sesi);
            const liveSeconds = resolveLiveRemainingSeconds(sesi);
            const total = Math.max(1, sesi.totalSoal || 1);
            const pct = Math.min(100, Math.round((sesi.terjawabCount / total) * 100));

            return (
              <div
                key={sesi.id}
                className={`bg-[#121212] rounded-2xl p-4 border space-y-3 shadow-md transition-all ${
                  sesi.status === 'Dikunci Pengawas'
                    ? 'border-rose-500/50'
                    : sesi.status === 'Peringatan Pelanggaran' || sesi.pelanggaranCount > 0
                    ? 'border-amber-500/50'
                    : sesi.status === 'Selesai'
                    ? 'border-emerald-500/40'
                    : 'border-slate-800 hover:border-cyan-500/40'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-extrabold text-white text-sm">{sesi.siswaNama}</h4>
                    <p className="text-[11px] text-slate-400">
                      {sesi.kelas} • <span className="text-cyan-300 font-semibold">{ruang}</span> • NIS {sesi.nis || '-'}
                    </p>
                  </div>
                  {getStatusBadge(sesi)}
                </div>

                <div className="bg-slate-900/70 rounded-xl p-3 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-300 font-bold truncate">{sesi.mataPelajaran}</span>
                    <span className="font-mono font-bold text-amber-300">
                      {sesi.status === 'Selesai' ? 'Selesai' : formatRemainingTime(liveSeconds)}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 flex items-center justify-between">
                    <span>Aktif: Soal No.{sesi.soalAktifNo}</span>
                    <span className="text-cyan-400 font-bold">{sesi.terjawabCount}/{sesi.totalSoal} ({pct}%)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        sesi.status === 'Selesai' ? 'bg-emerald-500' : 'bg-cyan-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-[10px] text-slate-500">Heartbeat: {formatClock(sesi.lastHeartbeat)}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedSesiId(sesi.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" /> Kontrol
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail & Proctor Control Modal */}
      {selectedSesi && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-extrabold text-white">{selectedSesi.siswaNama}</h4>
                  {getStatusBadge(selectedSesi)}
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  NIS: {selectedSesi.nis || '-'} • Kelas: {selectedSesi.kelas} • Ruang: {resolveRuang(selectedSesi)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedSesiId(null);
                  setConfirmAction(null);
                }}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Soal Aktif</div>
                <div className="text-lg font-black text-white mt-0.5">No.{selectedSesi.soalAktifNo}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Terjawab</div>
                <div className="text-lg font-black text-cyan-400 mt-0.5">
                  {selectedSesi.terjawabCount}/{selectedSesi.totalSoal}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Ragu-Ragu</div>
                <div className="text-lg font-black text-amber-400 mt-0.5">{selectedSesi.raguCount}</div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Sisa Waktu</div>
                <div className="text-lg font-black text-emerald-400 font-mono mt-0.5">
                  {selectedSesi.status === 'Selesai'
                    ? '00:00'
                    : formatRemainingTime(resolveLiveRemainingSeconds(selectedSesi))}
                </div>
              </div>
            </div>

            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-3.5 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Mata Pelajaran:</span>
                <span className="font-bold text-white">{selectedSesi.mataPelajaran}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400 shrink-0">Paket Ujian:</span>
                <span className="font-semibold text-slate-200 text-right">{selectedSesi.judulUjian}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Waktu Mulai:</span>
                <span className="font-mono text-slate-300">{formatClock(selectedSesi.waktuMulai)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Heartbeat Terakhir:</span>
                <span className="font-mono text-slate-300">{formatClock(selectedSesi.lastHeartbeat)}</span>
              </div>
            </div>

            {/* Anti-Cheat Log */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" /> Log Deteksi Anti-Cheat ({selectedSesi.pelanggaranCount}x)
                </h5>
                {selectedSesi.pelanggaranCount > 0 && selectedSesi.status !== 'Selesai' && (
                  <button
                    type="button"
                    onClick={() =>
                      sendProctorCommand(
                        selectedSesi,
                        {
                          pelanggaranCount: 0,
                          logKecurangan: [],
                          status: selectedSesi.status === 'Dikunci Pengawas' ? 'Dikunci Pengawas' : 'Mengerjakan',
                          instruksiPengawas: 'reset_pelanggaran',
                          pesanPengawas: 'Hitungan pelanggaran Anda telah direset oleh pengawas.'
                        },
                        `Hitungan pelanggaran ${selectedSesi.siswaNama} berhasil direset.`
                      )
                    }
                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" /> Reset Pelanggaran
                  </button>
                )}
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 max-h-36 overflow-y-auto space-y-1.5">
                {!selectedSesi.logKecurangan || selectedSesi.logKecurangan.length === 0 ? (
                  <p className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Tidak ada aktivitas mencurigakan terdeteksi.
                  </p>
                ) : (
                  selectedSesi.logKecurangan.map((log, i) => (
                    <div key={i} className="text-[11px] text-rose-300 font-mono border-b border-slate-900 pb-1 last:border-0 last:pb-0">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Send message to student screen */}
            {selectedSesi.status !== 'Selesai' && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-cyan-400" /> Kirim Pesan ke Layar Siswa
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={pesanInput}
                    onChange={e => setPesanInput(e.target.value)}
                    placeholder="Contoh: Harap fokus ke soal, sisa waktu 10 menit lagi."
                    className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleSendMessageToStudent(selectedSesi)}
                    className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Kirim
                  </button>
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800">
              {confirmAction?.sesiId === selectedSesi.id && confirmAction.type === 'hapus' ? (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-rose-300 font-semibold">Hapus catatan sesi ini?</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteSession(selectedSesi.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                  >
                    Ya, Hapus
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmAction(null)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-[11px] font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmAction({ sesiId: selectedSesi.id, type: 'hapus' })}
                  className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-rose-400 border border-slate-800 text-xs font-bold cursor-pointer"
                >
                  Hapus Log Sesi
                </button>
              )}

              {selectedSesi.status !== 'Selesai' && (
                <div className="flex flex-wrap items-center gap-2">
                  {selectedSesi.status === 'Dikunci Pengawas' ? (
                    <button
                      type="button"
                      onClick={() =>
                        sendProctorCommand(
                          selectedSesi,
                          {
                            status: selectedSesi.pelanggaranCount > 0 ? 'Peringatan Pelanggaran' : 'Mengerjakan',
                            instruksiPengawas: 'lanjut',
                            pesanPengawas: 'Kunci layar dibuka oleh pengawas. Silakan lanjutkan ujian.'
                          },
                          `Layar ujian ${selectedSesi.siswaNama} dibuka kembali.`
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> Buka Kunci & Lanjutkan
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        sendProctorCommand(
                          selectedSesi,
                          {
                            status: 'Dikunci Pengawas',
                            instruksiPengawas: 'kunci',
                            pesanPengawas: 'Ujian Anda dikunci sementara oleh pengawas.'
                          },
                          `Layar ujian ${selectedSesi.siswaNama} berhasil dikunci.`
                        )
                      }
                      className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5" /> Kunci Layar Siswa
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      sendProctorCommand(
                        selectedSesi,
                        {
                          instruksiPengawas: 'paksa_submit',
                          pesanPengawas: 'Ujian diselesaikan otomatis oleh pengawas.'
                        },
                        `Perintah paksa submit dikirim ke ${selectedSesi.siswaNama}.`
                      )
                    }
                    className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <StopCircle className="w-3.5 h-3.5" /> Paksa Selesaikan
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
