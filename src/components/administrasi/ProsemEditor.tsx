import React, { useState } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  Calendar,
  BookMarked,
  AlertCircle,
  Grid,
} from 'lucide-react';
import {
  ProsemData,
  ProsemMatrixRow,
  ProsemPekanEfektifRow,
  PROSEM_WEEKS,
  buildOfficialProsemData,
  calculateProsemSummary,
  getProsemMonths,
  getProsemWeekKey,
  isStructuredProsemData,
} from '../../lib/prosemHelper';
import { Guru, MataPelajaranItem, SchoolSettings } from '../../types/school';

interface ProsemEditorProps {
  initialData?: Partial<ProsemData> | Record<string, any> | null;
  onClose: () => void;
  onSave: (data: ProsemData) => void;
  schoolSettings?: SchoolSettings;
  guruList?: Guru[];
  mapelList?: MataPelajaranItem[];
  defaultMapel?: string;
  defaultKelas?: string;
  defaultPenyusun?: string;
}

export const ProsemEditor: React.FC<ProsemEditorProps> = ({
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

  const initialSeed = isStructuredProsemData(initialData)
    ? initialData
    : buildOfficialProsemData({
        mataPelajaran:
          initialData?.identitas?.mataPelajaran ||
          defaultMapel ||
          availableMapels[0] ||
          'Informatika',
        kelas: initialData?.identitas?.kelas || defaultKelas || 'VII',
        semester: initialData?.identitas?.semester || 'Ganjil',
        topik: initialData?.identitas?.fokusSemester || '',
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

  const [formData, setFormData] = useState<ProsemData>(initialSeed);
  const [activeTab, setActiveTab] = useState<'identitas' | 'rpe' | 'matriks' | 'catatan'>('identitas');

  const summary = calculateProsemSummary(formData);
  const months = getProsemMonths(formData.identitas.semester);
  const jpPerMinggu = Number(formData.identitas.jpPerMinggu) || 3;

  const updateIdentitas = (field: keyof ProsemData['identitas'], value: string | number) => {
    if (field === 'semester' && (value === 'Ganjil' || value === 'Genap') && value !== formData.identitas.semester) {
      // Automatically regenerate RPE and semester units when switching between Ganjil and Genap
      const regenerated = buildOfficialProsemData({
        mataPelajaran: formData.identitas.mataPelajaran,
        kelas: formData.identitas.kelas,
        semester: value,
        tahunAjaran: formData.identitas.tahunAjaran,
        namaPenyusun: formData.identitas.namaPenyusun,
        satuanPendidikan: formData.identitas.satuanPendidikan,
        jpPerMinggu: formData.identitas.jpPerMinggu,
      });
      setFormData(regenerated);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      identitas: {
        ...prev.identitas,
        [field]: value,
      },
    }));
  };

  const handleAutoFillTemplate = () => {
    const generated = buildOfficialProsemData({
      mataPelajaran: formData.identitas.mataPelajaran,
      kelas: formData.identitas.kelas,
      semester: formData.identitas.semester,
      topik: formData.identitas.fokusSemester,
      tahunAjaran: formData.identitas.tahunAjaran,
      namaPenyusun: formData.identitas.namaPenyusun,
      satuanPendidikan: formData.identitas.satuanPendidikan,
    });
    setFormData(generated);
  };

  const updateRpe = (index: number, field: keyof ProsemPekanEfektifRow, value: string | number) => {
    const next = formData.rincianPekanEfektif.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    setFormData({ ...formData, rincianPekanEfektif: next });
  };

  const updateUnit = (index: number, field: keyof ProsemMatrixRow, value: any) => {
    const next = formData.distribusiMingguan.map((row, i) =>
      i === index ? { ...row, [field]: value } : row
    );
    setFormData({ ...formData, distribusiMingguan: next });
  };

  const toggleMatrixCell = (rowIndex: number, bulan: string, minggu: number) => {
    const key = getProsemWeekKey(bulan, minggu);
    const next = formData.distribusiMingguan.map((row, i) => {
      if (i !== rowIndex) return row;
      const nextWeeks = { ...(row.mingguAktif || {}) };
      if (nextWeeks[key] && nextWeeks[key] > 0) {
        delete nextWeeks[key];
      } else {
        nextWeeks[key] = jpPerMinggu;
      }
      const newJp = Object.values(nextWeeks).reduce((s, v) => s + (Number(v) || 0), 0);
      return {
        ...row,
        mingguAktif: nextWeeks,
        alokasiJp: newJp,
      };
    });
    setFormData({ ...formData, distribusiMingguan: next });
  };

  const addUnit = () => {
    const newRow: ProsemMatrixRow = {
      elemen: `Unit / Materi Baru`,
      tujuanPembelajaran: 'Rumusan Alur Tujuan Pembelajaran / lingkup materi pokok...',
      alokasiJp: jpPerMinggu * 2,
      mingguAktif: {
        [getProsemWeekKey(months[2], 1)]: jpPerMinggu,
        [getProsemWeekKey(months[2], 2)]: jpPerMinggu,
      },
      jenisKegiatan: 'Intrakurikuler',
      keterangan: 'Intrakurikuler',
    };
    setFormData({
      ...formData,
      distribusiMingguan: [...formData.distribusiMingguan, newRow],
    });
  };

  const removeUnit = (index: number) => {
    setFormData({
      ...formData,
      distribusiMingguan: formData.distribusiMingguan.filter((_, i) => i !== index),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: ProsemData = {
      ...formData,
      formatType: 'prosem_resmi',
      distribusiMingguan: formData.distribusiMingguan.filter(
        (r) => r.elemen.trim() || r.tujuanPembelajaran.trim()
      ),
    };
    onSave(cleaned);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl max-w-6xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
              <Grid className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Editor Resmi Program Semester (PROSEM)</h3>
              <p className="text-[11px] text-slate-300">
                Rincian Pekan Efektif (RPE) &amp; Matriks Jadwal Mingguan Interaktif (Bulan &times; M1–M4)
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

        {/* Live RPE & JP Strip */}
        <div className="px-6 py-2.5 bg-emerald-950 text-emerald-50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Semester:{' '}
              <strong className="text-emerald-300">
                {formData.identitas.semester === 'Ganjil' ? 'I (Ganjil • Jul–Des)' : 'II (Genap • Jan–Jun)'}
              </strong>
            </span>
            <span>
              Pekan Efektif: <strong className="text-sky-300">{summary.totalPekanEfektif} Pekan</strong> ({summary.targetJpEfektif} JP)
            </span>
            <span>
              Terjadwal di Matriks:{' '}
              <strong className="text-white">{summary.totalJpMatriks} JP</strong> ({summary.jumlahUnit} Unit)
            </span>
          </div>
          {summary.totalJpMatriks === summary.targetJpEfektif ? (
            <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Matriks 100% Sesuai RPE
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
              <AlertCircle className="w-3.5 h-3.5" /> Selisih {summary.totalJpMatriks - summary.targetJpEfektif} JP dari target RPE
            </span>
          )}
        </div>

        {/* Tabs & Auto-Fill */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'identitas', label: '1. Identitas & Semester' },
              { id: 'rpe', label: `2. Rincian Pekan Efektif (${summary.totalPekanEfektif} Mg)` },
              { id: 'matriks', label: `3. Matriks Mingguan (${summary.jumlahUnit} Unit)` },
              { id: 'catatan', label: '4. Catatan & Nilai Islami' },
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
            title="Isi ulang RPE, Matriks Jadwal Mingguan, dan Ayat Al-Qur'an sesuai mapel & semester"
          >
            <Sparkles className="w-3.5 h-3.5" /> Isi Template Sesuai Mapel
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
          {activeTab === 'identitas' && (
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
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Kelas / Fase</label>
                <select
                  value={formData.identitas.kelas}
                  onChange={(e) => updateIdentitas('kelas', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                >
                  <option value="VII">Kelas VII (Fase D)</option>
                  <option value="VIII">Kelas VIII (Fase D)</option>
                  <option value="IX">Kelas IX (Fase D)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Semester</label>
                <select
                  value={formData.identitas.semester}
                  onChange={(e) => updateIdentitas('semester', e.target.value as 'Ganjil' | 'Genap')}
                  className="w-full p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs font-bold text-emerald-950"
                >
                  <option value="Ganjil">Semester I (Ganjil • Juli – Desember)</option>
                  <option value="Genap">Semester II (Genap • Januari – Juni)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Tahun Ajaran</label>
                <input
                  type="text"
                  value={formData.identitas.tahunAjaran}
                  onChange={(e) => updateIdentitas('tahunAjaran', e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Beban Belajar (JP / Minggu)</label>
                <input
                  type="number"
                  min={1}
                  max={12}
                  value={formData.identitas.jpPerMinggu}
                  onChange={(e) => updateIdentitas('jpPerMinggu', Math.max(1, Number(e.target.value) || 2))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-emerald-800"
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

              <div className="md:col-span-3">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">Fokus / Tema Semester</label>
                <input
                  type="text"
                  value={formData.identitas.fokusSemester}
                  onChange={(e) => updateIdentitas('fokusSemester', e.target.value)}
                  placeholder="Contoh: Distribusi Mingguan Informatika Kelas VII Semester Ganjil"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                />
              </div>
            </div>
          )}

          {activeTab === 'rpe' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Rincian Pekan Efektif (RPE) — Semester {formData.identitas.semester}
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Atur jumlah pekan dan pekan tidak efektif per bulan (libur sekolah, MPLS, pengolahan rapor, hari besar) untuk menghitung target JP efektif.
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="py-2.5 px-3 font-bold w-32">Bulan</th>
                      <th className="py-2.5 px-3 font-bold text-center w-28">Total Pekan</th>
                      <th className="py-2.5 px-3 font-bold text-center w-32">Tidak Efektif</th>
                      <th className="py-2.5 px-3 font-bold text-center w-28">Pekan Efektif</th>
                      <th className="py-2.5 px-3 font-bold text-center w-28">Jam Efektif</th>
                      <th className="py-2.5 px-3 font-bold">Keterangan Libur / Kegiatan Sekolah</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {formData.rincianPekanEfektif.map((row, idx) => {
                      const efektif = Math.max(0, (Number(row.jumlahPekan) || 0) - (Number(row.pekanTidakEfektif) || 0));
                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                          <td className="py-2 px-3 font-bold text-slate-900">{row.bulan}</td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min={3}
                              max={5}
                              value={row.jumlahPekan}
                              onChange={(e) => updateRpe(idx, 'jumlahPekan', Math.max(3, Number(e.target.value) || 4))}
                              className="w-16 p-1.5 text-center bg-white border border-slate-300 rounded-lg font-bold text-slate-900"
                            />
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min={0}
                              max={5}
                              value={row.pekanTidakEfektif}
                              onChange={(e) => updateRpe(idx, 'pekanTidakEfektif', Math.max(0, Number(e.target.value) || 0))}
                              className="w-16 p-1.5 text-center bg-white border border-rose-200 rounded-lg font-bold text-rose-700"
                            />
                          </td>
                          <td className="py-2 px-3 text-center font-black text-emerald-800">{efektif} Mg</td>
                          <td className="py-2 px-3 text-center font-black text-blue-800">{efektif * jpPerMinggu} JP</td>
                          <td className="py-2 px-3">
                            <input
                              type="text"
                              value={row.keteranganTidakEfektif}
                              onChange={(e) => updateRpe(idx, 'keteranganTidakEfektif', e.target.value)}
                              className="w-full p-1.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                            />
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-emerald-50 font-bold text-emerald-950 border-t-2 border-emerald-200">
                      <td className="py-2.5 px-3 uppercase">TOTAL</td>
                      <td className="py-2.5 px-3 text-center">{summary.totalPekan} Mg</td>
                      <td className="py-2.5 px-3 text-center text-rose-700">{summary.totalPekanTidakEfektif} Mg</td>
                      <td className="py-2.5 px-3 text-center text-emerald-800 font-black">{summary.totalPekanEfektif} Mg</td>
                      <td className="py-2.5 px-3 text-center text-blue-800 font-black">{summary.targetJpEfektif} JP</td>
                      <td className="py-2.5 px-3 text-[11px] text-emerald-800">
                        {summary.totalPekanEfektif} Pekan Efektif &times; {jpPerMinggu} JP/Minggu = {summary.targetJpEfektif} JP
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'matriks' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">
                    Matriks Jadwal Mingguan Interaktif ({months[0]} – {months[months.length - 1]})
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Klik kotak pekan (<strong>M1–M4</strong>) pada setiap bulan untuk menjadwalkan atau menghapus <strong>{jpPerMinggu} JP</strong> secara langsung. Total JP per unit otomatis dihitung.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addUnit}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Tambah Unit / Kegiatan
                </button>
              </div>

              <div className="space-y-4">
                {formData.distribusiMingguan.map((row, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0">
                          Unit #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={row.elemen}
                          onChange={(e) => updateUnit(idx, 'elemen', e.target.value)}
                          placeholder="Nama Elemen / Bab / Asesmen"
                          className="flex-1 min-w-[180px] p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                        />
                        <select
                          value={row.jenisKegiatan}
                          onChange={(e) => updateUnit(idx, 'jenisKegiatan', e.target.value)}
                          className="p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
                        >
                          <option value="Intrakurikuler">Intrakurikuler</option>
                          <option value="Asesmen">Asesmen (ASTS/SAS)</option>
                          <option value="Proyek">Proyek / Kokurikuler</option>
                          <option value="Remedial">Remedial / Pengayaan</option>
                        </select>
                        <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-emerald-400 font-black text-xs shrink-0">
                          {row.alokasiJp} JP
                        </span>
                      </div>
                      {formData.distribusiMingguan.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeUnit(idx)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                          title="Hapus Unit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2">
                        <input
                          type="text"
                          value={row.tujuanPembelajaran}
                          onChange={(e) => updateUnit(idx, 'tujuanPembelajaran', e.target.value)}
                          placeholder="Uraian Alur Tujuan Pembelajaran (ATP) / Materi Pokok..."
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          value={row.keterangan}
                          onChange={(e) => updateUnit(idx, 'keterangan', e.target.value)}
                          placeholder="Keterangan singkat..."
                          className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Interactive 6-Month x 4-Week Clickable Matrix */}
                    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                      <table className="w-full border-collapse text-[10px] min-w-[660px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                            {months.map((bulan) => (
                              <th
                                key={bulan}
                                colSpan={4}
                                className="py-1.5 px-1 text-center font-black uppercase border-r border-slate-200 last:border-r-0"
                              >
                                {bulan}
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-slate-50 text-slate-500 border-b border-slate-200">
                            {months.map((bulan) =>
                              PROSEM_WEEKS.map((m) => (
                                <th
                                  key={`${bulan}_h_${m}`}
                                  className={`py-1 text-center font-bold border-r border-slate-200 ${
                                    m === 4 ? 'border-r-slate-300' : ''
                                  }`}
                                >
                                  {m}
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            {months.map((bulan) =>
                              PROSEM_WEEKS.map((m) => {
                                const key = getProsemWeekKey(bulan, m);
                                const val = row.mingguAktif?.[key] || 0;
                                const isActive = val > 0;
                                const activeColor =
                                  row.jenisKegiatan === 'Asesmen'
                                    ? 'bg-amber-500 text-slate-950 hover:bg-amber-400'
                                    : row.jenisKegiatan === 'Proyek'
                                    ? 'bg-blue-600 text-white hover:bg-blue-500'
                                    : row.jenisKegiatan === 'Remedial'
                                    ? 'bg-rose-500 text-white hover:bg-rose-400'
                                    : 'bg-emerald-600 text-white hover:bg-emerald-500';
                                return (
                                  <td
                                    key={key}
                                    className={`p-0.5 text-center border-r border-slate-200 ${
                                      m === 4 ? 'border-r-slate-300' : ''
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => toggleMatrixCell(idx, bulan, m)}
                                      className={`w-full h-7 rounded font-black text-[10px] transition-all ${
                                        isActive
                                          ? activeColor
                                          : 'bg-slate-50 hover:bg-slate-200 text-slate-300'
                                      }`}
                                      title={`${bulan} Minggu ${m}: ${isActive ? `${val} JP (klik untuk hapus)` : `Klik untuk tambah ${jpPerMinggu} JP`}`}
                                    >
                                      {isActive ? val : '·'}
                                    </button>
                                  </td>
                                );
                              })
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'catatan' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Catatan Pelaksanaan &amp; Fleksibilitas Kalender Semester
                </label>
                <textarea
                  rows={3}
                  value={formData.catatanPelaksanaan}
                  onChange={(e) => setFormData({ ...formData, catatanPelaksanaan: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed"
                />
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
                    Relevansi terhadap Program Semester
                  </label>
                  <textarea
                    rows={2}
                    value={formData.integrasiNilaiIslami.relevansiProsem}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integrasiNilaiIslami: {
                          ...formData.integrasiNilaiIslami,
                          relevansiProsem: e.target.value,
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
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Tersimpan dalam format Matriks Mingguan Resmi PROSEM (siap cetak &amp; ekspor .DOC)</span>
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
              <Save className="w-4 h-4" /> Simpan Dokumen PROSEM
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
