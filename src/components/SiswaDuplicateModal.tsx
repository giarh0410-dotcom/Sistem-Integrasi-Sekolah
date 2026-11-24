import React, { useMemo, useState } from 'react';
import {
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Edit,
  GitMerge,
  Sparkles,
  Download,
  CheckSquare,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  Calendar,
  Layers
} from 'lucide-react';
import { Siswa } from '../types/school';
import {
  DuplicateGroup,
  DuplicateReasonType,
  DuplicateSummary,
  mergeSiswaRecords
} from '../lib/duplicateSiswa';
import { exportSiswaToExcel } from '../lib/exportSiswa';

interface SiswaDuplicateModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaList: Siswa[];
  summary: DuplicateSummary;
  onDeleteStudents: (idsToDelete: string[], toastText: string) => void;
  onMergeGroup: (mergedKeep: Siswa, idsToRemove: string[], toastText: string) => void;
  onBulkAutoClean: (
    updates: Map<string, Siswa>,
    idsToRemove: string[],
    toastText: string
  ) => void;
  onEditStudent: (siswa: Siswa) => void;
  onSelectDuplicatesInTable: (ids: string[]) => void;
  onNotify: (text: string, type?: 'success' | 'warning' | 'error') => void;
}

type FilterTab = 'all' | DuplicateReasonType;

export const SiswaDuplicateModal: React.FC<SiswaDuplicateModalProps> = ({
  isOpen,
  onClose,
  siswaList,
  summary,
  onDeleteStudents,
  onMergeGroup,
  onBulkAutoClean,
  onEditStudent,
  onSelectDuplicatesInTable,
  onNotify
}) => {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmMergeGroupId, setConfirmMergeGroupId] = useState<string | null>(null);
  const [confirmBulkMode, setConfirmBulkMode] = useState<'high' | 'tab' | null>(null);
  const [isExportingReport, setIsExportingReport] = useState(false);

  const activeGroups = useMemo(() => {
    const baseGroups =
      activeTab === 'all' ? summary.allGroups : summary.groupsByType[activeTab];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return baseGroups;
    return baseGroups.filter(group =>
      group.students.some(
        s =>
          (s.nama || '').toLowerCase().includes(q) ||
          (s.nisn || '').toLowerCase().includes(q) ||
          (s.nis || '').toLowerCase().includes(q) ||
          (s.nik || '').toLowerCase().includes(q) ||
          (s.kelas || '').toLowerCase().includes(q)
      )
    );
  }, [activeTab, summary, searchQuery]);

  const highSeverityGroups = useMemo(
    () => activeGroups.filter(g => g.severity === 'high'),
    [activeGroups]
  );

  const highSeverityRedundantCount = useMemo(
    () => highSeverityGroups.reduce((acc, g) => acc + Math.max(0, g.students.length - 1), 0),
    [highSeverityGroups]
  );

  const activeTabRedundantCount = useMemo(
    () => activeGroups.reduce((acc, g) => acc + Math.max(0, g.students.length - 1), 0),
    [activeGroups]
  );

  if (!isOpen) return null;

  const handleKeepSpecificStudent = (group: DuplicateGroup, keepStudent: Siswa) => {
    const others = group.students.filter(s => s.id !== keepStudent.id);
    if (others.length === 0) return;
    const merged = mergeSiswaRecords(keepStudent, others);
    const idsToRemove = others.map(s => s.id);
    onMergeGroup(
      merged,
      idsToRemove,
      `Berhasil menggabungkan data dan mempertahankan "${merged.nama}" (${idsToRemove.length} data ganda dihapus).`
    );
    setConfirmMergeGroupId(null);
    setConfirmDeleteId(null);
  };

  const handleDeleteSingleStudent = (siswa: Siswa) => {
    onDeleteStudents(
      [siswa.id],
      `Data ganda "${siswa.nama}" (${siswa.nisn || siswa.nis || 'tanpa NISN'}) berhasil dihapus.`
    );
    setConfirmDeleteId(null);
  };

  const executeBulkAutoClean = (mode: 'high' | 'tab') => {
    const targetGroups = mode === 'high' ? highSeverityGroups : activeGroups;
    if (targetGroups.length === 0) {
      setConfirmBulkMode(null);
      return;
    }

    const updates = new Map<string, Siswa>();
    const idsToRemoveSet = new Set<string>();

    for (const group of targetGroups) {
      const keep =
        group.students.find(s => s.id === group.recommendedKeepId) || group.students[0];
      if (!keep || idsToRemoveSet.has(keep.id)) continue;
      const others = group.students.filter(
        s => s.id !== keep.id && !idsToRemoveSet.has(s.id)
      );
      if (others.length === 0) continue;

      const baseRecord = updates.get(keep.id) || keep;
      const merged = mergeSiswaRecords(baseRecord, others);
      updates.set(keep.id, merged);
      others.forEach(o => idsToRemoveSet.add(o.id));
    }

    const idsToRemove = Array.from(idsToRemoveSet);
    if (idsToRemove.length === 0) {
      setConfirmBulkMode(null);
      return;
    }

    onBulkAutoClean(
      updates,
      idsToRemove,
      `Pembersihan selesai! ${idsToRemove.length} baris ganda digabungkan & dihapus dari ${updates.size} grup.`
    );
    setConfirmBulkMode(null);
  };

  const handleExportDuplicateExcel = async () => {
    const uniqueStudents = new Map<string, Siswa>();
    activeGroups.forEach(g => {
      g.students.forEach(s => uniqueStudents.set(s.id, s));
    });
    const list = Array.from(uniqueStudents.values());
    if (list.length === 0) {
      onNotify('Tidak ada data ganda untuk diunduh.', 'warning');
      return;
    }
    setIsExportingReport(true);
    try {
      const tabNameMap: Record<FilterTab, string> = {
        all: 'Semua Indikasi Ganda',
        nisn: 'NISN Sama',
        nis: 'NIS Sama',
        nik: 'NIK Sama',
        nama: 'Nama Sama'
      };
      const fileName = await exportSiswaToExcel(list, {
        filterLabel: `Laporan Data Ganda (${tabNameMap[activeTab]})`,
        fileNamePrefix: 'laporan_data_ganda_siswa'
      });
      onNotify(`Berhasil mengunduh laporan ${list.length} siswa ganda (${fileName}).`, 'success');
    } catch (err) {
      console.error('Gagal mengunduh laporan ganda:', err);
      onNotify('Gagal mengunduh laporan data ganda.', 'error');
    } finally {
      setIsExportingReport(false);
    }
  };

  const handleMarkInTable = () => {
    const ids = new Set<string>();
    activeGroups.forEach(g => g.students.forEach(s => ids.add(s.id)));
    if (ids.size === 0) return;
    onSelectDuplicatesInTable(Array.from(ids));
    onClose();
  };

  const tabs: Array<{ id: FilterTab; label: string; count: number }> = [
    { id: 'all', label: 'Semua Ganda', count: summary.allGroups.length },
    { id: 'nisn', label: 'NISN Sama', count: summary.groupsByType.nisn.length },
    { id: 'nis', label: 'NIS Sama', count: summary.groupsByType.nis.length },
    { id: 'nik', label: 'NIK Sama', count: summary.groupsByType.nik.length },
    { id: 'nama', label: 'Nama Sama', count: summary.groupsByType.nama.length }
  ];

  const getReasonBadgeStyle = (type: DuplicateReasonType) => {
    switch (type) {
      case 'nisn':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/35';
      case 'nis':
        return 'bg-orange-500/15 text-orange-300 border-orange-500/35';
      case 'nik':
        return 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/35';
      case 'nama':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/35';
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#121212] border border-slate-800 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden text-white">
        {/* HEADER */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#161922] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                summary.totalGroups > 0
                  ? 'bg-amber-500/15 border-amber-500/35 text-amber-400'
                  : 'bg-emerald-500/15 border-emerald-500/35 text-emerald-400'
              }`}
            >
              {summary.totalGroups > 0 ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <ShieldCheck className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-base text-white flex items-center gap-2 flex-wrap">
                Cek Data Ganda Siswa
                {summary.totalGroups > 0 ? (
                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[11px] font-bold">
                    {summary.totalGroups} Grup Terdeteksi
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold">
                    Bersih
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                Pemindaian otomatis berdasarkan NISN, NIS, NIK, dan kesamaan Nama Lengkap dari{' '}
                {siswaList.length} siswa
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* KPI SUMMARY ROW */}
        <div className="px-5 py-3.5 border-b border-slate-800/80 bg-[#14171f] grid grid-cols-2 sm:grid-cols-4 gap-2.5 shrink-0">
          <div className="bg-[#181c26] border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Grup Ganda
            </p>
            <p
              className={`text-xl font-black mt-1 ${
                summary.totalGroups > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {summary.totalGroups}
              <span className="text-xs font-medium text-slate-500 ml-1">grup</span>
            </p>
          </div>
          <div className="bg-[#181c26] border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Baris Terindikasi
            </p>
            <p className="text-xl font-black mt-1 text-slate-100">
              {summary.totalDuplicateRows}
              <span className="text-xs font-medium text-slate-500 ml-1">baris</span>
            </p>
          </div>
          <div className="bg-[#181c26] border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Potensi Berlebih
            </p>
            <p
              className={`text-xl font-black mt-1 ${
                summary.totalRedundantRows > 0 ? 'text-rose-400' : 'text-slate-300'
              }`}
            >
              {summary.totalRedundantRows}
              <span className="text-xs font-medium text-slate-500 ml-1">duplikat</span>
            </p>
          </div>
          <div className="bg-[#181c26] border border-slate-800 rounded-xl p-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Status Integritas
            </p>
            <p
              className={`text-sm font-bold mt-1.5 flex items-center gap-1.5 ${
                summary.totalGroups === 0 ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {summary.totalGroups === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 shrink-0" /> Tidak Ada Ganda
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 shrink-0" /> Perlu Peninjauan
                </>
              )}
            </p>
          </div>
        </div>

        {/* FILTER TABS + SEARCH + BULK TOOLS */}
        <div className="px-5 py-3 border-b border-slate-800 bg-[#12151c] space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {tabs.map(tab => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(tab.id);
                      setConfirmBulkMode(null);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border ${
                      isActive
                        ? 'bg-amber-500/20 text-amber-200 border-amber-500/50'
                        : 'bg-[#181b24] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[10px] font-black leading-none ${
                        tab.count > 0
                          ? isActive
                            ? 'bg-amber-500 text-slate-950'
                            : 'bg-slate-800 text-amber-300'
                          : 'bg-slate-800/70 text-slate-500'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeGroups.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleExportDuplicateExcel}
                  disabled={isExportingReport}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                  title="Unduh daftar siswa ganda ke Excel sebelum dibersihkan"
                >
                  <Download className="w-3.5 h-3.5 text-cyan-400" />
                  Unduh Laporan
                </button>
                <button
                  type="button"
                  onClick={handleMarkInTable}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Centang semua baris ganda di tabel utama"
                >
                  <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                  Tandai di Tabel
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setConfirmBulkMode(prev =>
                      prev ? null : highSeverityRedundantCount > 0 ? 'high' : 'tab'
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  title="Gabungkan field kosong lalu pertahankan 1 data terlengkap per grup"
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Bersihkan Otomatis
                </button>
              </div>
            )}
          </div>

          {summary.totalGroups > 0 && (
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari di dalam daftar data ganda (nama, NISN, NIS, NIK, kelas)..."
                className="w-full pl-8 pr-8 py-1.5 bg-[#181b24] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-amber-500 focus:border-amber-500/60 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* INLINE BULK CLEANUP CONFIRMATION BANNER */}
          {confirmBulkMode && activeGroups.length > 0 && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-emerald-200 flex items-center gap-1.5">
                  <GitMerge className="w-4 h-4 text-emerald-400 shrink-0" />
                  Konfirmasi Pembersihan & Penggabungan Otomatis
                </p>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Sistem akan <strong className="text-white">menggabungkan field yang terisi</strong>{' '}
                  ke baris terlengkap pada setiap grup, lalu menghapus baris berlebih. Pilih cakupan:
                </p>
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {highSeverityRedundantCount > 0 && (
                    <button
                      type="button"
                      onClick={() => setConfirmBulkMode('high')}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                        confirmBulkMode === 'high'
                          ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60'
                          : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Hanya Duplikat Identik ({highSeverityGroups.length} grup • hapus{' '}
                      {highSeverityRedundantCount} baris)
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setConfirmBulkMode('tab')}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold border transition-colors ${
                      confirmBulkMode === 'tab'
                        ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400/60'
                        : 'bg-slate-900/80 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    Semua di Tab Ini ({activeGroups.length} grup • hapus {activeTabRedundantCount}{' '}
                    baris)
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setConfirmBulkMode(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={() => executeBulkAutoClean(confirmBulkMode)}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-900/40"
                >
                  <GitMerge className="w-3.5 h-3.5" />
                  Ya, Gabung & Bersihkan
                </button>
              </div>
            </div>
          )}
        </div>

        {/* BODY: DUPLICATE GROUPS LIST */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#0f1117]">
          {activeGroups.length === 0 ? (
            <div className="py-14 px-6 flex flex-col items-center justify-center text-center bg-[#14171f] border border-slate-800/80 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <h4 className="text-base font-bold text-white">
                {summary.totalGroups === 0
                  ? 'Database Siswa Bersih dari Data Ganda!'
                  : searchQuery.trim()
                  ? 'Tidak Ada Grup Ganda yang Cocok dengan Pencarian'
                  : 'Tidak Ada Data Ganda pada Kategori Ini'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
                {summary.totalGroups === 0
                  ? `Seluruh ${siswaList.length} data siswa telah diperiksa berdasarkan kesamaan NISN, NIS, NIK, dan Nama Lengkap. Tidak ditemukan entri duplikat.`
                  : 'Coba ganti tab kategori filter atau hapus kata kunci pencarian untuk melihat indikasi ganda lainnya.'}
              </p>
            </div>
          ) : (
            activeGroups.map((group, groupIdx) => {
              const reasonTypes = new Set(group.reasons.map(r => r.type));
              const recommendedStudent =
                group.students.find(s => s.id === group.recommendedKeepId) ||
                group.students[0];

              return (
                <div
                  key={group.id}
                  className={`rounded-xl border overflow-hidden bg-[#141821] ${
                    group.severity === 'high'
                      ? 'border-amber-500/35'
                      : 'border-slate-700/80'
                  }`}
                >
                  {/* GROUP HEADER */}
                  <div className="px-4 py-2.5 bg-[#191e2a] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <span className="text-[11px] font-black text-slate-400 mr-1">
                        #{groupIdx + 1}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide border ${
                          group.severity === 'high'
                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/35'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/35'
                        }`}
                      >
                        {group.severity === 'high' ? 'Duplikat Identik' : 'Perlu Verifikasi'}
                      </span>

                      {group.reasons.map((r, rIdx) => (
                        <span
                          key={`${r.type}-${rIdx}`}
                          className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${getReasonBadgeStyle(
                            r.type
                          )}`}
                        >
                          {r.label}: <span className="text-white">{r.value}</span>
                        </span>
                      ))}

                      <span className="text-[11px] text-slate-400 font-semibold ml-1">
                        ({group.students.length} baris)
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {confirmMergeGroupId === group.id ? (
                        <div className="flex items-center gap-1.5 bg-emerald-950/70 border border-emerald-500/40 rounded-lg px-2 py-1">
                          <span className="text-[11px] text-emerald-200 font-semibold">
                            Pertahankan 1 terlengkap?
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleKeepSpecificStudent(group, recommendedStudent)
                            }
                            className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                          >
                            Ya, Gabung
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmMergeGroupId(null)}
                            className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold"
                          >
                            Batal
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmMergeGroupId(group.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/35 text-[11px] font-bold flex items-center gap-1.5 transition-colors"
                          title="Gabungkan field kosong ke data terlengkap lalu hapus duplikat di grup ini"
                        >
                          <GitMerge className="w-3.5 h-3.5" />
                          Gabung & Pertahankan Terlengkap
                        </button>
                      )}
                    </div>
                  </div>

                  {/* GROUP STUDENT ROWS */}
                  <div className="divide-y divide-slate-800/80">
                    {group.students.map(student => {
                      const score = group.completenessMap[student.id] || {
                        filled: 0,
                        total: 18
                      };
                      const isRecommended = student.id === group.recommendedKeepId;
                      const ttlText = [student.tempatLahir, student.tanggalLahir]
                        .filter(Boolean)
                        .join(', ');
                      const waliName =
                        student.namaWali || student.namaAyah || student.namaIbu || '-';
                      const alamatText = student.alamatLengkap || student.alamat || '-';

                      return (
                        <div
                          key={student.id}
                          className={`p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 transition-colors ${
                            isRecommended
                              ? 'bg-emerald-950/15 hover:bg-emerald-950/25'
                              : 'hover:bg-slate-900/50'
                          }`}
                        >
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            {/* Avatar */}
                            {student.fotoUrl ? (
                              <img
                                src={student.fotoUrl}
                                alt={student.nama}
                                className="w-10 h-10 rounded-full object-cover border border-slate-700 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold text-sm shrink-0">
                                {(student.nama || '?').charAt(0).toUpperCase()}
                              </div>
                            )}

                            <div className="min-w-0 flex-1 space-y-1.5">
                              {/* Top Line: Name + badges */}
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span
                                  className={`font-bold text-sm ${
                                    reasonTypes.has('nama')
                                      ? 'text-amber-200'
                                      : 'text-white'
                                  }`}
                                >
                                  {student.nama || '(Tanpa Nama)'}
                                </span>

                                <span className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <Layers className="w-2.5 h-2.5" />
                                  {student.kelas || 'Belum Ada Kelas'}
                                </span>

                                <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold">
                                  {student.jenisKelamin || '-'}
                                </span>

                                <span className="px-2 py-0.5 rounded bg-slate-800/90 text-slate-300 border border-slate-700 text-[10px] font-semibold">
                                  Kelengkapan: {score.filled}/{score.total}
                                </span>

                                {isRecommended && (
                                  <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Terlengkap
                                  </span>
                                )}
                              </div>

                              {/* ID Codes Strip */}
                              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                                <span
                                  className={`px-2 py-0.5 rounded border font-mono ${
                                    reasonTypes.has('nisn')
                                      ? 'bg-rose-500/15 text-rose-200 border-rose-500/40 font-bold'
                                      : 'bg-[#181c26] text-slate-300 border-slate-800'
                                  }`}
                                >
                                  NISN: {student.nisn || '-'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded border font-mono ${
                                    reasonTypes.has('nis')
                                      ? 'bg-orange-500/15 text-orange-200 border-orange-500/40 font-bold'
                                      : 'bg-[#181c26] text-slate-300 border-slate-800'
                                  }`}
                                >
                                  NIS: {student.nis || '-'}
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded border font-mono ${
                                    reasonTypes.has('nik')
                                      ? 'bg-fuchsia-500/15 text-fuchsia-200 border-fuchsia-500/40 font-bold'
                                      : 'bg-[#181c26] text-slate-300 border-slate-800'
                                  }`}
                                >
                                  NIK: {student.nik || '-'}
                                </span>
                              </div>

                              {/* Secondary Metadata Strip */}
                              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3 text-slate-500" />
                                  Wali: <strong className="text-slate-300 font-medium">{waliName}</strong>
                                </span>
                                <span className="flex items-center gap-1">
                                  <Phone className="w-3 h-3 text-slate-500" />
                                  {student.teleponWali || '-'}
                                </span>
                                {ttlText && (
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3 text-slate-500" />
                                    {ttlText}
                                  </span>
                                )}
                                <span className="flex items-center gap-1 truncate max-w-xs">
                                  <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                                  <span className="truncate">{alamatText}</span>
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ROW ACTIONS */}
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0 lg:justify-end">
                            <button
                              type="button"
                              onClick={() => handleKeepSpecificStudent(group, student)}
                              className="px-2.5 py-1.5 rounded-lg bg-blue-600/15 hover:bg-blue-600/25 text-blue-300 border border-blue-500/35 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Pertahankan baris ini (gabungkan data kosong dari baris duplikat lain, lalu hapus yang lain)"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Pertahankan Ini
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEditStudent(student);
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold flex items-center gap-1 transition-colors"
                              title="Edit biodata siswa ini"
                            >
                              <Edit className="w-3.5 h-3.5 text-slate-300" />
                              Edit
                            </button>

                            {confirmDeleteId === student.id ? (
                              <div className="flex items-center gap-1 bg-rose-950/80 border border-rose-500/50 rounded-lg px-2 py-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSingleStudent(student)}
                                  className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                                >
                                  Ya, Hapus
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setConfirmDeleteId(student.id);
                                  setConfirmMergeGroupId(null);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-[11px] font-bold flex items-center gap-1 transition-colors"
                                title="Hapus hanya baris siswa ini"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* FOOTER */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#161922] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <p className="text-[11px] text-slate-400">
            Tip: Opsi <strong className="text-slate-200">Pertahankan / Gabung</strong> otomatis
            melengkapi kolom yang kosong dari salinan duplikat sebelum menghapusnya agar tidak ada
            data penting yang hilang.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
