import React, { useState } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  BookMarked,
  Clock,
  GitBranch,
  ArrowUp,
  ArrowDown,
  BookOpen,
} from 'lucide-react';
import {
  AtpData,
  AtpUnitRow,
  AtpGlosariumItem,
  buildOfficialAtpData,
  calculateAtpSummary,
  isStructuredAtpData,
} from '../../lib/atpHelper';
import { normalizeFaseFromKelas } from '../../lib/capaianPembelajaranHelper';
import { Guru, MataPelajaranItem, SchoolSettings } from '../../types/school';

interface AtpEditorProps {
  initialData?: Partial<AtpData> | Record<string, any> | null;
  onClose: () => void;
  onSave: (data: AtpData) => void;
  schoolSettings?: SchoolSettings;
  guruList?: Guru[];
  mapelList?: MataPelajaranItem[];
  defaultMapel?: string;
  defaultKelas?: string;
  defaultPenyusun?: string;
}

export const AtpEditor: React.FC<AtpEditorProps> = ({
  initialData,
  onClose,
  onSave,
  schoolSettings,
  guruList = [],
  mapelList = [],
  defaultMapel,
  defaultKelas,
  defaultPenyusun,
}) => {
  const availableMapels = Array.from(
    new Set(
      mapelList
        .map((m) => (m.namaMapel || (m as any).nama || '').trim())
        .filter(Boolean)
    )
  ).sort();

  const initialSeed = isStructuredAtpData(initialData)
    ? initialData
    : buildOfficialAtpData({
        mataPelajaran:
          initialData?.identitas?.mataPelajaran ||
          defaultMapel ||
          availableMapels[0] ||
          'Informatika',
        kelas: initialData?.identitas?.kelas || defaultKelas || 'VII',
        topik: initialData?.identitas?.fokusTopik || '',
        tahunAjaran: initialData?.identitas?.tahunAjaran || '2026/2027',
        namaPenyusun:
          initialData?.identitas?.namaPenyusun ||
          defaultPenyusun ||
          guruList[0]?.nama ||
          'Guru Mata Pelajaran',
        satuanPendidikan:
          initialData?.identitas?.satuanPendidikan ||
          schoolSettings?.namaSekolah ||
          'SMP Islam Modern Al Fakhir',
      });

  const [formData, setFormData] = useState<AtpData>(initialSeed);
  const [activeTab, setActiveTab] = useState<'identitas' | 'ganjil' | 'genap' | 'glosarium'>('identitas');

  const summary = calculateAtpSummary(formData);
  const ganjilItems = formData.daftarAlur
    .map((row, idx) => ({ row, idx }))
    .filter((item) => item.row.semester === 'Ganjil');
  const genapItems = formData.daftarAlur
    .map((row, idx) => ({ row, idx }))
    .filter((item) => item.row.semester === 'Genap');

  const updateIdentitas = (field: keyof AtpData['identitas'], value: string | number) => {
    setFormData((prev) => {
      const nextIdentitas = {
        ...prev.identitas,
        [field]: value,
      };
      if (field === 'kelas') {
        nextIdentitas.fase = normalizeFaseFromKelas(String(value));
      }
      return {
        ...prev,
        identitas: nextIdentitas,
      };
    });
  };

  const handleAutoFillTemplate = () => {
    const generated = buildOfficialAtpData({
      mataPelajaran: formData.identitas.mataPelajaran,
      kelas: formData.identitas.kelas,
      topik: formData.identitas.fokusTopik,
      tahunAjaran: formData.identitas.tahunAjaran,
      namaPenyusun: formData.identitas.namaPenyusun,
      satuanPendidikan: formData.identitas.satuanPendidikan,
      jpPerMinggu: formData.identitas.jpPerMinggu,
    });
    setFormData(generated);
  };

  const updateRow = (globalIndex: number, field: keyof AtpUnitRow, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      daftarAlur: prev.daftarAlur.map((r, i) =>
        i === globalIndex ? { ...r, [field]: value } : r
      ),
    }));
  };

  const addRow = (semester: 'Ganjil' | 'Genap') => {
    const nextNum = formData.daftarAlur.length + 1;
    const prefix =
      (formData.identitas.mataPelajaran || 'TP')
        .replace(/[^a-zA-Z]/g, '')
        .toUpperCase()
        .slice(0, 3) || 'TP';
    const kNum = formData.identitas.kelas.includes('IX')
      ? '9'
      : formData.identitas.kelas.includes('VIII')
      ? '8'
      : '7';
    const newRow: AtpUnitRow = {
      kodeTp: `${prefix}-${kNum}.${nextNum}`,
      semester,
      elemen: `Elemen / Unit Baru (${semester})`,
      tujuanPembelajaran: 'Peserta didik mampu memahami dan menerapkan kompetensi inti secara bermakna...',
      materiEsensial: 'Ruang lingkup materi pokok dan sub-topik utama...',
      alokasiJp: (formData.identitas.jpPerMinggu || 3) * 3,
      dimensiProfil: 'Penalaran Kritis, Kreativitas, Kolaborasi',
      kataKunci: 'Konsep Inti, Aplikasi, Refleksi',
      strategiAsesmen: 'LKPD kontekstual, observasi praktik, dan rubrik penilaian sumatif.',
    };
    setFormData((prev) => ({
      ...prev,
      daftarAlur: [...prev.daftarAlur, newRow],
    }));
  };

  const removeRow = (globalIndex: number) => {
    setFormData((prev) => ({
      ...prev,
      daftarAlur: prev.daftarAlur.filter((_, i) => i !== globalIndex),
    }));
  };

  const moveRowWithinSemester = (
    semester: 'Ganjil' | 'Genap',
    localPos: number,
    direction: -1 | 1
  ) => {
    const indices = formData.daftarAlur
      .map((row, idx) => ({ row, idx }))
      .filter((x) => x.row.semester === semester)
      .map((x) => x.idx);
    const targetLocalPos = localPos + direction;
    if (targetLocalPos < 0 || targetLocalPos >= indices.length) return;
    const fromIdx = indices[localPos];
    const toIdx = indices[targetLocalPos];
    const next = [...formData.daftarAlur];
    const tmp = next[fromIdx];
    next[fromIdx] = next[toIdx];
    next[toIdx] = tmp;
    setFormData((prev) => ({ ...prev, daftarAlur: next }));
  };

  const updateGlosarium = (idx: number, field: keyof AtpGlosariumItem, value: string) => {
    setFormData((prev) => ({
      ...prev,
      glosarium: prev.glosarium.map((g, i) => (i === idx ? { ...g, [field]: value } : g)),
    }));
  };

  const addGlosarium = () => {
    setFormData((prev) => ({
      ...prev,
      glosarium: [...prev.glosarium, { istilah: '', definisi: '' }],
    }));
  };

  const removeGlosarium = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      glosarium: prev.glosarium.filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: AtpData = {
      ...formData,
      formatType: 'atp_resmi',
      daftarAlur: formData.daftarAlur.filter(
        (r) => r.tujuanPembelajaran.trim() || r.elemen.trim()
      ),
      glosarium: formData.glosarium.filter(
        (g) => g.istilah.trim() || g.definisi.trim()
      ),
    };
    onSave(cleaned);
  };

  const renderSemesterSection = (
    semester: 'Ganjil' | 'Genap',
    items: { row: AtpUnitRow; idx: number }[]
  ) => {
    const totalJpSem = semester === 'Ganjil' ? summary.totalJpGanjil : summary.totalJpGenap;
    const accent = semester === 'Ganjil' ? 'indigo' : 'blue';

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Alur Tujuan Pembelajaran — Semester {semester === 'Ganjil' ? 'I (Ganjil)' : 'II (Genap)'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Clock className={`w-3.5 h-3.5 text-${accent}-600`} />
              Total Semester {semester}: <strong className="text-slate-900">{items.length} TP</strong> •{' '}
              <strong className="text-indigo-700">{totalJpSem} JP</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={() => addRow(semester)}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah TP {semester}
          </button>
        </div>

        <div className="space-y-3">
          {items.map(({ row, idx }, displayIdx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/75 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[240px]">
                  <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-bold text-[11px] shrink-0">
                    Alur #{displayIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={row.kodeTp}
                    onChange={(e) => updateRow(idx, 'kodeTp', e.target.value)}
                    placeholder="Kode TP (mis. INF-7.1)"
                    className="w-28 p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold text-indigo-800"
                  />
                  <input
                    type="text"
                    value={row.elemen}
                    onChange={(e) => updateRow(idx, 'elemen', e.target.value)}
                    placeholder="Elemen CP"
                    className="flex-1 min-w-[180px] p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveRowWithinSemester(semester, displayIdx, -1)}
                    disabled={displayIdx === 0}
                    className="p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 rounded-lg"
                    title="Geser ke atas"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveRowWithinSemester(semester, displayIdx, 1)}
                    disabled={displayIdx === items.length - 1}
                    className="p-1.5 text-slate-500 hover:bg-slate-200 disabled:opacity-30 rounded-lg"
                    title="Geser ke bawah"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRow(idx)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                      title="Hapus TP"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Rumusan Tujuan Pembelajaran (Kompetensi + Lingkup Materi)
                </label>
                <textarea
                  rows={2}
                  value={row.tujuanPembelajaran}
                  onChange={(e) => updateRow(idx, 'tujuanPembelajaran', e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="md:col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Materi Esensial / Ruang Lingkup Topik
                  </label>
                  <input
                    type="text"
                    value={row.materiEsensial}
                    onChange={(e) => updateRow(idx, 'materiEsensial', e.target.value)}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Alokasi Waktu (JP)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={row.alokasiJp}
                    onChange={(e) =>
                      updateRow(idx, 'alokasiJp', Math.max(1, Number(e.target.value) || 0))
                    }
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-indigo-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Dimensi Profil Lulusan
                  </label>
                  <input
                    type="text"
                    value={row.dimensiProfil}
                    onChange={(e) => updateRow(idx, 'dimensiProfil', e.target.value)}
                    placeholder="Penalaran Kritis, Kolaborasi..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Kata Kunci
                  </label>
                  <input
                    type="text"
                    value={row.kataKunci}
                    onChange={(e) => updateRow(idx, 'kataKunci', e.target.value)}
                    placeholder="Algoritma, Dekomposisi..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Strategi &amp; Asesmen Mendalam
                  </label>
                  <input
                    type="text"
                    value={row.strategiAsesmen}
                    onChange={(e) => updateRow(idx, 'strategiAsesmen', e.target.value)}
                    placeholder="LKPD, Praktikum, Rubrik..."
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/75 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[92vh] overflow-hidden shadow-2xl border border-slate-200 flex flex-col text-slate-800">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-indigo-900 via-blue-900 to-slate-900 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-400/20 text-indigo-200 text-[10px] font-bold uppercase tracking-wider border border-indigo-400/30">
                Standar Kurikulum Nasional • Pembelajaran Mendalam
              </span>
            </div>
            <h3 className="text-lg font-extrabold flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-indigo-300" />
              Editor Alur Tujuan Pembelajaran (ATP)
            </h3>
            <p className="text-xs text-indigo-100/80 mt-0.5">
              Susun urutan TP lintas semester lengkap dengan Kode TP, Elemen CP, Materi Esensial, Alokasi JP, Profil Lulusan, Asesmen, dan Ayat Al-Qur&apos;an.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between gap-2 px-5 pt-3 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'identitas', label: '1. Identitas & Rasional' },
              { id: 'ganjil', label: `2. Semester I (${ganjilItems.length} TP • ${summary.totalJpGanjil} JP)` },
              { id: 'genap', label: `3. Semester II (${genapItems.length} TP • ${summary.totalJpGenap} JP)` },
              { id: 'glosarium', label: '4. Glosarium & Nilai Islami' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3.5 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="hidden lg:flex items-center gap-2 pb-2 text-[11px] font-bold text-slate-600">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-800 border border-indigo-200">
              Total: {summary.totalTp} TP • {summary.totalJp} JP/Tahun
            </span>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {activeTab === 'identitas' && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3.5">
                <div className="text-xs text-indigo-900">
                  <strong>Isi Otomatis Template ATP Resmi:</strong> Pilih mata pelajaran, kelas, dan fokus topik lalu klik tombol di samping untuk mengisi struktur ATP Kurikulum Nasional otomatis.
                </div>
                <button
                  type="button"
                  onClick={handleAutoFillTemplate}
                  className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Isi Template ATP Resmi
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Mata Pelajaran
                  </label>
                  {availableMapels.length > 0 ? (
                    <select
                      value={formData.identitas.mataPelajaran}
                      onChange={(e) => updateIdentitas('mataPelajaran', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      {!availableMapels.includes(formData.identitas.mataPelajaran) && (
                        <option value={formData.identitas.mataPelajaran}>
                          {formData.identitas.mataPelajaran}
                        </option>
                      )}
                      {availableMapels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.identitas.mataPelajaran}
                      onChange={(e) => updateIdentitas('mataPelajaran', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Kelas (SMP Fase D)
                  </label>
                  <select
                    value={formData.identitas.kelas}
                    onChange={(e) => updateIdentitas('kelas', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value="VII">Kelas VII (Fase D)</option>
                    <option value="VIII">Kelas VIII (Fase D)</option>
                    <option value="IX">Kelas IX (Fase D)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Tahun Ajaran
                  </label>
                  <input
                    type="text"
                    value={formData.identitas.tahunAjaran}
                    onChange={(e) => updateIdentitas('tahunAjaran', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Guru Penyusun
                  </label>
                  {guruList.length > 0 ? (
                    <select
                      value={formData.identitas.namaPenyusun}
                      onChange={(e) => updateIdentitas('namaPenyusun', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    >
                      {!guruList.some((g) => g.nama === formData.identitas.namaPenyusun) && (
                        <option value={formData.identitas.namaPenyusun}>
                          {formData.identitas.namaPenyusun}
                        </option>
                      )}
                      {guruList.map((g) => (
                        <option key={g.id} value={g.nama}>
                          {g.nama}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      value={formData.identitas.namaPenyusun}
                      onChange={(e) => updateIdentitas('namaPenyusun', e.target.value)}
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                    />
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Beban Belajar (JP / Minggu)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={formData.identitas.jpPerMinggu}
                    onChange={(e) =>
                      updateIdentitas('jpPerMinggu', Math.max(1, Number(e.target.value) || 2))
                    }
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-indigo-800"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    Fokus Topik / Materi Utama
                  </label>
                  <input
                    type="text"
                    value={formData.identitas.fokusTopik}
                    onChange={(e) => updateIdentitas('fokusTopik', e.target.value)}
                    placeholder="Contoh: Algoritma & Berpikir Komputasional"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  A. Rasional Pengurutan Alur Tujuan Pembelajaran (ATP)
                </label>
                <textarea
                  rows={3}
                  value={formData.rasionalAlur}
                  onChange={(e) => setFormData({ ...formData, rasionalAlur: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  B. Capaian Pembelajaran (CP) Umum Fase
                </label>
                <textarea
                  rows={3}
                  value={formData.capaianPembelajaranUmum}
                  onChange={(e) =>
                    setFormData({ ...formData, capaianPembelajaranUmum: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'ganjil' && renderSemesterSection('Ganjil', ganjilItems)}
          {activeTab === 'genap' && renderSemesterSection('Genap', genapItems)}

          {activeTab === 'glosarium' && (
            <div className="space-y-5">
              {/* Glosarium */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold text-slate-900 uppercase flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4 text-indigo-600" /> Glosarium Istilah Kunci
                  </h4>
                  <button
                    type="button"
                    onClick={addGlosarium}
                    className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Tambah Istilah
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.glosarium.map((g, i) => (
                    <div key={i} className="grid grid-cols-1 md:grid-cols-12 gap-2 items-start">
                      <input
                        type="text"
                        value={g.istilah}
                        onChange={(e) => updateGlosarium(i, 'istilah', e.target.value)}
                        placeholder="Istilah..."
                        className="md:col-span-3 p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                      <input
                        type="text"
                        value={g.definisi}
                        onChange={(e) => updateGlosarium(i, 'definisi', e.target.value)}
                        placeholder="Definisi singkat..."
                        className="md:col-span-8 p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                      />
                      <button
                        type="button"
                        onClick={() => removeGlosarium(i)}
                        className="md:col-span-1 p-2 text-rose-500 hover:bg-rose-50 rounded-lg flex justify-center"
                        title="Hapus istilah"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Catatan Implementasi */}
              <div>
                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                  Catatan Implementasi, Diferensiasi &amp; Fleksibilitas ATP
                </label>
                <textarea
                  rows={3}
                  value={formData.catatanImplementasi}
                  onChange={(e) =>
                    setFormData({ ...formData, catatanImplementasi: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed"
                />
              </div>

              {/* Integrasi Ayat Al-Qur'an */}
              <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-xs uppercase">
                  <BookMarked className="w-4 h-4 text-emerald-600" />
                  Integrasi Nilai Islami &amp; Ayat Al-Qur&apos;an
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 block mb-1">
                      Surah &amp; Ayat
                    </label>
                    <input
                      type="text"
                      value={formData.integrasiNilaiIslami.surahAyat}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integrasiNilaiIslami: {
                            ...formData.integrasiNilaiIslami,
                            surahAyat: e.target.value,
                          },
                        })
                      }
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-emerald-950"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 block mb-1">
                      Relevansi dengan ATP
                    </label>
                    <input
                      type="text"
                      value={formData.integrasiNilaiIslami.relevansiAtp}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          integrasiNilaiIslami: {
                            ...formData.integrasiNilaiIslami,
                            relevansiAtp: e.target.value,
                          },
                        })
                      }
                      className="w-full p-2 bg-white border border-emerald-300 rounded-lg text-xs text-slate-800"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-800 block mb-1">
                    Teks Arab (RTL)
                  </label>
                  <textarea
                    rows={2}
                    dir="rtl"
                    value={formData.integrasiNilaiIslami.teksArab}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integrasiNilaiIslami: {
                          ...formData.integrasiNilaiIslami,
                          teksArab: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-base font-serif text-right text-emerald-950 leading-loose"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-800 block mb-1">
                    Terjemahan Bahasa Indonesia
                  </label>
                  <textarea
                    rows={2}
                    value={formData.integrasiNilaiIslami.terjemahan}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integrasiNilaiIslami: {
                          ...formData.integrasiNilaiIslami,
                          terjemahan: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2.5 bg-white border border-emerald-300 rounded-lg text-xs italic text-slate-800"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Sticky Footer */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-200">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <CheckCircle2 className="w-4 h-4 text-indigo-600" />
              <span>
                <strong>{summary.totalTp} TP</strong> ({summary.jumlahElemen} Elemen •{' '}
                <strong>{summary.totalJp} JP/Tahun</strong>)
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> Simpan ATP Resmi
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
