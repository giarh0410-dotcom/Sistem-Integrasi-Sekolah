import React, { useState } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  ClipboardCheck,
  BookMarked,
  Sliders,
} from 'lucide-react';
import {
  KktpData,
  KktpRubrikRow,
  KktpIntervalRow,
  buildOfficialKktpData,
  isStructuredKktpData,
} from '../../lib/kktpHelper';
import { Guru, MataPelajaranItem, SchoolSettings } from '../../types/school';

interface KktpEditorProps {
  initialData?: Partial<KktpData> | Record<string, any> | null;
  onClose: () => void;
  onSave: (data: KktpData) => void;
  schoolSettings?: SchoolSettings;
  guruList?: Guru[];
  mapelList?: MataPelajaranItem[];
  defaultMapel?: string;
  defaultKelas?: string;
  defaultPenyusun?: string;
}

export const KktpEditor: React.FC<KktpEditorProps> = ({
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

  const initialSeed = isStructuredKktpData(initialData)
    ? initialData
    : buildOfficialKktpData({
        mataPelajaran:
          initialData?.identitas?.mataPelajaran ||
          defaultMapel ||
          availableMapels[0] ||
          'Informatika',
        kelas: initialData?.identitas?.kelas || defaultKelas || 'VII',
        topik: initialData?.identitas?.topikMateri || '',
        tahunAjaran: initialData?.identitas?.tahunAjaran || '2026/2027',
        semester: initialData?.identitas?.semester || 'Ganjil',
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

  const [formData, setFormData] = useState<KktpData>(initialSeed);
  const [activeTab, setActiveTab] = useState<'identitas' | 'rubrik' | 'interval' | 'ketuntasan'>('identitas');

  const updateIdentitas = (field: keyof KktpData['identitas'], value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      identitas: {
        ...prev.identitas,
        [field]: value,
      },
    }));
  };

  const handleAutoFillTemplate = () => {
    const generated = buildOfficialKktpData({
      mataPelajaran: formData.identitas.mataPelajaran,
      kelas: formData.identitas.kelas,
      topik: formData.identitas.topikMateri,
      tahunAjaran: formData.identitas.tahunAjaran,
      semester: formData.identitas.semester,
      namaPenyusun: formData.identitas.namaPenyusun,
      satuanPendidikan: formData.identitas.satuanPendidikan,
      pendekatanUtama: formData.identitas.pendekatanUtama,
      batasMinimalPersen: formData.identitas.batasMinimalPersen,
    });
    setFormData(generated);
  };

  const updateTp = (index: number, value: string) => {
    const next = [...formData.tujuanPembelajaran];
    next[index] = value;
    setFormData({ ...formData, tujuanPembelajaran: next });
  };

  const addTp = () => {
    const nextNum = formData.tujuanPembelajaran.length + 1;
    setFormData({
      ...formData,
      tujuanPembelajaran: [...formData.tujuanPembelajaran, `TP ${nextNum}: `],
    });
  };

  const removeTp = (index: number) => {
    setFormData({
      ...formData,
      tujuanPembelajaran: formData.tujuanPembelajaran.filter((_, i) => i !== index),
    });
  };

  const updateRubrik = (index: number, field: keyof KktpRubrikRow, value: string) => {
    const next = formData.rubrikPenilaian.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    const nextDeskripsi = next.map((r) => ({
      kriteria: r.aspek,
      targetMemadai: r.cakap,
    }));
    setFormData({
      ...formData,
      rubrikPenilaian: next,
      deskripsiKriteria: nextDeskripsi,
    });
  };

  const addRubrikRow = () => {
    const newRow: KktpRubrikRow = {
      aspek: 'Aspek Penilaian Baru',
      baruBerkembang: 'Memerlukan bimbingan intensif untuk memahami dasar kompetensi.',
      layak: 'Mampu menunjukkan sebagian indikator dasar dengan panduan.',
      cakap: 'Mampu mencapai indikator kompetensi secara tepat dan mandiri.',
      mahir: 'Mampu melampaui target kompetensi secara kreatif dan konsisten.',
    };
    const next = [...formData.rubrikPenilaian, newRow];
    setFormData({
      ...formData,
      rubrikPenilaian: next,
      deskripsiKriteria: next.map((r) => ({ kriteria: r.aspek, targetMemadai: r.cakap })),
    });
  };

  const removeRubrikRow = (index: number) => {
    const next = formData.rubrikPenilaian.filter((_, i) => i !== index);
    setFormData({
      ...formData,
      rubrikPenilaian: next,
      deskripsiKriteria: next.map((r) => ({ kriteria: r.aspek, targetMemadai: r.cakap })),
    });
  };

  const updateInterval = (index: number, field: keyof KktpIntervalRow, value: string) => {
    const next = formData.intervalNilai.map((row, i) =>
      i === index ? { ...row, [field]: value as any } : row
    );
    setFormData({ ...formData, intervalNilai: next });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: KktpData = {
      ...formData,
      formatType: 'kktp_resmi',
      tujuanPembelajaran: formData.tujuanPembelajaran.map((t) => t.trim()).filter(Boolean),
      rubrikPenilaian: formData.rubrikPenilaian.filter((r) => r.aspek.trim()),
      deskripsiKriteria: formData.rubrikPenilaian
        .filter((r) => r.aspek.trim())
        .map((r) => ({ kriteria: r.aspek, targetMemadai: r.cakap })),
    };
    onSave(cleaned);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Editor Resmi KKTP (Kriteria Ketercapaian Tujuan Pembelajaran)</h3>
              <p className="text-[11px] text-slate-300">
                Standar Panduan Pembelajaran &amp; Asesmen (PPA) Kemendikdasmen • Rubrik 4 Level &amp; Interval Nilai
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Tabs & Quick Auto-Fill */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'identitas', label: '1. Identitas & TP' },
              { id: 'rubrik', label: `2. Rubrik 4 Level (${formData.rubrikPenilaian.length})` },
              { id: 'interval', label: '3. Interval Nilai & Intervensi' },
              { id: 'ketuntasan', label: '4. Keputusan & Nilai Islami' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleAutoFillTemplate}
            className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold flex items-center gap-1.5 transition-all"
            title="Isi ulang rubrik, TP, dan ayat secara otomatis berdasarkan Mata Pelajaran & Topik saat ini"
          >
            <Sparkles className="w-3.5 h-3.5" /> Isi Template Sesuai Mapel
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {activeTab === 'identitas' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Mata Pelajaran</label>
                  <select
                    value={formData.identitas.mataPelajaran}
                    onChange={(e) => updateIdentitas('mataPelajaran', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    {availableMapels.length > 0 ? (
                      availableMapels.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))
                    ) : (
                      <option value={formData.identitas.mataPelajaran}>
                        {formData.identitas.mataPelajaran}
                      </option>
                    )}
                    {availableMapels.length > 0 &&
                      !availableMapels.includes(formData.identitas.mataPelajaran) && (
                        <option value={formData.identitas.mataPelajaran}>
                          {formData.identitas.mataPelajaran}
                        </option>
                      )}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Kelas</label>
                  <select
                    value={formData.identitas.kelas}
                    onChange={(e) => updateIdentitas('kelas', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="VII">Kelas VII</option>
                    <option value="VIII">Kelas VIII</option>
                    <option value="IX">Kelas IX</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Semester &amp; Tahun Ajaran</label>
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={formData.identitas.semester}
                      onChange={(e) => updateIdentitas('semester', e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                    <input
                      type="text"
                      value={formData.identitas.tahunAjaran}
                      onChange={(e) => updateIdentitas('tahunAjaran', e.target.value)}
                      className="p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Topik / Lingkup Materi</label>
                  <input
                    type="text"
                    required
                    value={formData.identitas.topikMateri}
                    onChange={(e) => updateIdentitas('topikMateri', e.target.value)}
                    placeholder="Contoh: Struktur Data, Topologi Jaringan, Aritmetika Sosial..."
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Guru Penyusun</label>
                  <input
                    type="text"
                    value={formData.identitas.namaPenyusun}
                    onChange={(e) => updateIdentitas('namaPenyusun', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Pendekatan KKTP</label>
                  <select
                    value={formData.identitas.pendekatanUtama}
                    onChange={(e) => updateIdentitas('pendekatanUtama', e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  >
                    <option value="Kombinasi Rubrik 4 Level, Interval Nilai, & Deskripsi Kriteria">
                      Kombinasi Rubrik 4 Level, Interval Nilai, &amp; Deskripsi Kriteria (Lengkap)
                    </option>
                    <option value="Pendekatan Rubrik (4 Level Penguasaan)">
                      Pendekatan Rubrik (4 Level Penguasaan)
                    </option>
                    <option value="Pendekatan Interval Nilai (Persentase Ketuntasan)">
                      Pendekatan Interval Nilai (Persentase Ketuntasan)
                    </option>
                    <option value="Pendekatan Deskripsi Kriteria (Memadai / Tidak Memadai)">
                      Pendekatan Deskripsi Kriteria (Memadai / Tidak Memadai)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1 flex items-center gap-1">
                    <Sliders className="w-3.5 h-3.5 text-emerald-600" /> Batas Minimal Ketuntasan (%)
                  </label>
                  <input
                    type="number"
                    min={50}
                    max={95}
                    value={formData.identitas.batasMinimalPersen}
                    onChange={(e) => updateIdentitas('batasMinimalPersen', Number(e.target.value) || 66)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Capaian Pembelajaran (CP) Ringkas
                </label>
                <textarea
                  rows={2}
                  value={formData.capaianPembelajaranRingkas}
                  onChange={(e) =>
                    setFormData({ ...formData, capaianPembelajaranRingkas: e.target.value })
                  }
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">
                    Daftar Tujuan Pembelajaran (TP) yang Diukur
                  </label>
                  <button
                    type="button"
                    onClick={addTp}
                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[11px] font-bold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah TP
                  </button>
                </div>
                {formData.tujuanPembelajaran.map((tp, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-lg bg-slate-100 text-slate-600 font-bold text-[11px] flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={tp}
                      onChange={(e) => updateTp(idx, e.target.value)}
                      className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800"
                    />
                    {formData.tujuanPembelajaran.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTp(idx)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'rubrik' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Rubrik Ketercapaian (4 Level Penguasaan)</h4>
                  <p className="text-[11px] text-slate-500">
                    Tentukan deskripsi bukti ketercapaian dari level Baru Berkembang hingga Mahir untuk setiap aspek.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRubrikRow}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Aspek Rubrik
                </button>
              </div>

              <div className="space-y-4">
                {formData.rubrikPenilaian.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                          Aspek #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={row.aspek}
                          onChange={(e) => updateRubrik(idx, 'aspek', e.target.value)}
                          placeholder="Nama Aspek / Indikator Penilaian"
                          className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                      </div>
                      {formData.rubrikPenilaian.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeRubrikRow(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-rose-700 uppercase block mb-1">
                          Baru Berkembang (1)
                        </label>
                        <textarea
                          rows={3}
                          value={row.baruBerkembang}
                          onChange={(e) => updateRubrik(idx, 'baruBerkembang', e.target.value)}
                          className="w-full p-2 bg-white border border-rose-200 rounded-lg text-[11px] text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-amber-700 uppercase block mb-1">
                          Layak (2)
                        </label>
                        <textarea
                          rows={3}
                          value={row.layak}
                          onChange={(e) => updateRubrik(idx, 'layak', e.target.value)}
                          className="w-full p-2 bg-white border border-amber-200 rounded-lg text-[11px] text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-blue-700 uppercase block mb-1">
                          Cakap (3 — Tuntas)
                        </label>
                        <textarea
                          rows={3}
                          value={row.cakap}
                          onChange={(e) => updateRubrik(idx, 'cakap', e.target.value)}
                          className="w-full p-2 bg-white border border-blue-200 rounded-lg text-[11px] text-slate-700"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-emerald-700 uppercase block mb-1">
                          Mahir (4 — Unggul)
                        </label>
                        <textarea
                          rows={3}
                          value={row.mahir}
                          onChange={(e) => updateRubrik(idx, 'mahir', e.target.value)}
                          className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-[11px] text-slate-700"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'interval' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Skala Interval Nilai &amp; Tindak Lanjut Intervensi
                </h4>
                <p className="text-[11px] text-slate-500">
                  Sesuai Panduan Pembelajaran &amp; Asesmen (PPA), interval nilai tidak bersifat kaku satu angka KKM, melainkan memuat rencana intervensi pembelajaran.
                </p>
              </div>

              <div className="space-y-3">
                {formData.intervalNilai.map((iv, idx) => (
                  <div
                    key={idx}
                    className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 items-start"
                  >
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Rentang
                      </label>
                      <input
                        type="text"
                        value={iv.rentang}
                        onChange={(e) => updateInterval(idx, 'rentang', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Predikat
                      </label>
                      <input
                        type="text"
                        value={iv.predikat}
                        onChange={(e) => updateInterval(idx, 'predikat', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Status
                      </label>
                      <select
                        value={iv.ketuntasan}
                        onChange={(e) => updateInterval(idx, 'ketuntasan', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800"
                      >
                        <option value="Belum Tuntas">Belum Tuntas</option>
                        <option value="Tuntas">Tuntas</option>
                      </select>
                    </div>
                    <div className="md:col-span-5">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                        Tindak Lanjut / Intervensi Guru
                      </label>
                      <textarea
                        rows={2}
                        value={iv.tindakLanjut}
                        onChange={(e) => updateInterval(idx, 'tindakLanjut', e.target.value)}
                        className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'ketuntasan' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Kesimpulan &amp; Keputusan Ketuntasan KKTP
                </label>
                <textarea
                  rows={3}
                  value={formData.keputusanKetuntasan}
                  onChange={(e) => setFormData({ ...formData, keputusanKetuntasan: e.target.value })}
                  className="w-full p-3 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs text-slate-800 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Strategi Program Remedial
                  </label>
                  <textarea
                    rows={3}
                    value={formData.strategiRemedial}
                    onChange={(e) => setFormData({ ...formData, strategiRemedial: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-800 block mb-1">
                    Strategi Program Pengayaan
                  </label>
                  <textarea
                    rows={3}
                    value={formData.strategiPengayaan}
                    onChange={(e) => setFormData({ ...formData, strategiPengayaan: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed"
                  />
                </div>
              </div>

              {/* Integrasi Nilai Islami */}
              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-xs">
                  <BookMarked className="w-4 h-4 text-emerald-600" />
                  Integrasi Nilai Islami / Ayat Al-Qur&apos;an Relevan
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
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
                      className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs font-bold text-emerald-950"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                      Teks Arab (RTL)
                    </label>
                    <input
                      type="text"
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
                      className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-sm font-serif text-right text-emerald-950"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                    Terjemahan
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
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs text-slate-700"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-emerald-800 uppercase block mb-1">
                    Relevansi dengan Ketercapaian Pembelajaran
                  </label>
                  <textarea
                    rows={2}
                    value={formData.integrasiNilaiIslami.relevansiKktp}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integrasiNilaiIslami: {
                          ...formData.integrasiNilaiIslami,
                          relevansiKktp: e.target.value,
                        },
                      })
                    }
                    className="w-full p-2 bg-white border border-emerald-200 rounded-lg text-xs text-slate-700"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Tersimpan langsung dalam format tabel resmi KKTP (siap cetak &amp; ekspor .DOC)</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            >
              <Save className="w-4 h-4" /> Simpan Dokumen KKTP
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
