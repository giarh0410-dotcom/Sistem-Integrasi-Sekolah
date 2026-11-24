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
  Clock,
  AlertCircle,
} from 'lucide-react';
import {
  ProtaData,
  ProtaItemRow,
  buildOfficialProtaData,
  calculateProtaSummary,
  isStructuredProtaData,
} from '../../lib/protaHelper';
import { Guru, MataPelajaranItem, SchoolSettings } from '../../types/school';

interface ProtaEditorProps {
  initialData?: Partial<ProtaData> | Record<string, any> | null;
  onClose: () => void;
  onSave: (data: ProtaData) => void;
  schoolSettings?: SchoolSettings;
  guruList?: Guru[];
  mapelList?: MataPelajaranItem[];
  defaultMapel?: string;
  defaultKelas?: string;
  defaultPenyusun?: string;
}

export const ProtaEditor: React.FC<ProtaEditorProps> = ({
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

  const initialSeed = isStructuredProtaData(initialData)
    ? initialData
    : buildOfficialProtaData({
        mataPelajaran:
          initialData?.identitas?.mataPelajaran ||
          defaultMapel ||
          availableMapels[0] ||
          'Informatika',
        kelas: initialData?.identitas?.kelas || defaultKelas || 'VII',
        topik: initialData?.identitas?.fokusTahunan || '',
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

  const [formData, setFormData] = useState<ProtaData>(initialSeed);
  const [activeTab, setActiveTab] = useState<'identitas' | 'ganjil' | 'genap' | 'catatan'>('identitas');

  const summary = calculateProtaSummary(formData);
  const ganjilIndices = formData.distribusiSemester
    .map((row, idx) => ({ row, idx }))
    .filter((item) => item.row.semester === 'Ganjil');
  const genapIndices = formData.distribusiSemester
    .map((row, idx) => ({ row, idx }))
    .filter((item) => item.row.semester === 'Genap');

  const updateIdentitas = (field: keyof ProtaData['identitas'], value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      identitas: {
        ...prev.identitas,
        [field]: value,
      },
    }));
  };

  const handleAutoFillTemplate = () => {
    const generated = buildOfficialProtaData({
      mataPelajaran: formData.identitas.mataPelajaran,
      kelas: formData.identitas.kelas,
      topik: formData.identitas.fokusTahunan,
      tahunAjaran: formData.identitas.tahunAjaran,
      namaPenyusun: formData.identitas.namaPenyusun,
      satuanPendidikan: formData.identitas.satuanPendidikan,
    });
    setFormData(generated);
  };

  const updateRow = (globalIndex: number, field: keyof ProtaItemRow, value: string | number) => {
    const next = formData.distribusiSemester.map((r, i) =>
      i === globalIndex ? { ...r, [field]: value } : r
    );
    setFormData({ ...formData, distribusiSemester: next });
  };

  const addRow = (semester: 'Ganjil' | 'Genap') => {
    const newRow: ProtaItemRow = {
      semester,
      elemen: `Unit / Elemen Baru (${semester})`,
      tujuanPembelajaran: 'Rumusan Alur Tujuan Pembelajaran dan lingkup materi pokok...',
      alokasiJp: (formData.identitas.jpPerMinggu || 3) * 3,
      bulanPelaksanaan: semester === 'Ganjil' ? 'Oktober – November' : 'April – Mei',
      keterangan: 'Intrakurikuler',
    };
    setFormData({
      ...formData,
      distribusiSemester: [...formData.distribusiSemester, newRow],
    });
  };

  const removeRow = (globalIndex: number) => {
    setFormData({
      ...formData,
      distribusiSemester: formData.distribusiSemester.filter((_, i) => i !== globalIndex),
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned: ProtaData = {
      ...formData,
      formatType: 'prota_resmi',
      distribusiSemester: formData.distribusiSemester.filter(
        (r) => r.elemen.trim() || r.tujuanPembelajaran.trim()
      ),
    };
    onSave(cleaned);
  };

  const renderSemesterRows = (
    semester: 'Ganjil' | 'Genap',
    items: { row: ProtaItemRow; idx: number }[]
  ) => {
    const currentJp = semester === 'Ganjil' ? summary.totalJpGanjil : summary.totalJpGenap;
    const targetJp = semester === 'Ganjil' ? summary.targetJpGanjil : summary.targetJpGenap;
    const diff = currentJp - targetJp;

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Distribusi Alur Tujuan Pembelajaran — Semester {semester === 'Ganjil' ? 'I (Ganjil)' : 'II (Genap)'}
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-600" />
              Terjadwal: <strong className="text-slate-900">{currentJp} JP</strong> dari target kalender{' '}
              <strong className="text-emerald-700">{targetJp} JP</strong>
              {diff !== 0 && (
                <span
                  className={`ml-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    diff > 0
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {diff > 0 ? `+${diff} JP berlebih` : `Kurang ${Math.abs(diff)} JP`}
                </span>
              )}
              {diff === 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                  Pas 100% Sesuai Kalender
                </span>
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={() => addRow(semester)}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" /> Tambah Unit {semester}
          </button>
        </div>

        <div className="space-y-3">
          {items.map(({ row, idx }, displayIdx) => (
            <div
              key={idx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[11px] shrink-0">
                    Unit #{displayIdx + 1}
                  </span>
                  <input
                    type="text"
                    value={row.elemen}
                    onChange={(e) => updateRow(idx, 'elemen', e.target.value)}
                    placeholder="Nama Elemen / Bab / Asesmen"
                    className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                  />
                </div>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeRow(idx)}
                    className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg"
                    title="Hapus Unit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                  Alur Tujuan Pembelajaran (ATP) / Lingkup Materi Pokok
                </label>
                <textarea
                  rows={2}
                  value={row.tujuanPembelajaran}
                  onChange={(e) => updateRow(idx, 'tujuanPembelajaran', e.target.value)}
                  className="w-full p-2.5 bg-white border border-slate-300 rounded-lg text-xs text-slate-800 leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Alokasi Waktu (JP)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={row.alokasiJp}
                    onChange={(e) => updateRow(idx, 'alokasiJp', Math.max(1, Number(e.target.value) || 0))}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-emerald-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Perkiraan Bulan Pelaksanaan
                  </label>
                  <input
                    type="text"
                    value={row.bulanPelaksanaan}
                    onChange={(e) => updateRow(idx, 'bulanPelaksanaan', e.target.value)}
                    placeholder={semester === 'Ganjil' ? 'Contoh: Juli – Agustus' : 'Contoh: Januari – Februari'}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-800"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                    Keterangan / Jenis Kegiatan
                  </label>
                  <input
                    type="text"
                    value={row.keterangan}
                    onChange={(e) => updateRow(idx, 'keterangan', e.target.value)}
                    placeholder="Intrakurikuler / Asesmen / Proyek"
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
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-[60] flex items-center justify-center p-3 sm:p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-400">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base">Editor Resmi Program Tahunan (PROTA)</h3>
              <p className="text-[11px] text-slate-300">
                Standar Kurikulum Nasional • Kalkulasi Otomatis JP Semester Ganjil, Genap &amp; Minggu Efektif
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

        {/* Live JP Telemetry Strip */}
        <div className="px-6 py-2.5 bg-emerald-950 text-emerald-50 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              Semester I: <strong className="text-emerald-300">{summary.totalJpGanjil} JP</strong> ({summary.jumlahUnitGanjil} Unit)
            </span>
            <span>
              Semester II: <strong className="text-sky-300">{summary.totalJpGenap} JP</strong> ({summary.jumlahUnitGenap} Unit)
            </span>
            <span>
              Total Tahunan:{' '}
              <strong className="text-white">{summary.totalJpTahunan} JP</strong> / Target {summary.targetJpTahunan} JP
            </span>
          </div>
          {summary.totalJpTahunan === summary.targetJpTahunan ? (
            <span className="inline-flex items-center gap-1 text-emerald-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Alokasi Seimbang
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-amber-300 font-bold">
              <AlertCircle className="w-3.5 h-3.5" /> Selisih {summary.totalJpTahunan - summary.targetJpTahunan} JP dari target kalender
            </span>
          )}
        </div>

        {/* Tabs & Auto-Fill */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'identitas', label: '1. Identitas & Minggu Efektif' },
              { id: 'ganjil', label: `2. Semester I (${summary.totalJpGanjil} JP)` },
              { id: 'genap', label: `3. Semester II (${summary.totalJpGenap} JP)` },
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
            title="Isi ulang unit Semester Ganjil, Genap, JP/minggu, dan Ayat Al-Qur'an sesuai mata pelajaran"
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
                    <option value="VII">Kelas VII (Fase D)</option>
                    <option value="VIII">Kelas VIII (Fase D)</option>
                    <option value="IX">Kelas IX (Fase D)</option>
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
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Minggu Efektif Sem. Ganjil</label>
                  <input
                    type="number"
                    min={10}
                    max={24}
                    value={formData.identitas.mingguEfektifGanjil}
                    onChange={(e) => updateIdentitas('mingguEfektifGanjil', Math.max(10, Number(e.target.value) || 18))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Minggu Efektif Sem. Genap</label>
                  <input
                    type="number"
                    min={10}
                    max={24}
                    value={formData.identitas.mingguEfektifGenap}
                    onChange={(e) => updateIdentitas('mingguEfektifGenap', Math.max(10, Number(e.target.value) || 18))}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">Fokus / Tema Tahunan</label>
                  <input
                    type="text"
                    value={formData.identitas.fokusTahunan}
                    onChange={(e) => updateIdentitas('fokusTahunan', e.target.value)}
                    placeholder="Contoh: Seluruh Alur Tujuan Pembelajaran Informatika Kelas VII"
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
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Capaian Pembelajaran Umum Tahunan
                </label>
                <textarea
                  rows={3}
                  value={formData.capaianUmumTahunan}
                  onChange={(e) => setFormData({ ...formData, capaianUmumTahunan: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-800 leading-relaxed"
                />
              </div>
            </div>
          )}

          {activeTab === 'ganjil' && renderSemesterRows('Ganjil', ganjilIndices)}

          {activeTab === 'genap' && renderSemesterRows('Genap', genapIndices)}

          {activeTab === 'catatan' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Catatan Kalender Pendidikan &amp; Fleksibilitas Pelaksanaan
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
                    Relevansi terhadap Program Tahunan
                  </label>
                  <textarea
                    rows={2}
                    value={formData.integrasiNilaiIslami.relevansiProta}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        integrasiNilaiIslami: {
                          ...formData.integrasiNilaiIslami,
                          relevansiProta: e.target.value,
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
            <span>Tersimpan dalam format tabel resmi PROTA (siap cetak &amp; ekspor .DOC)</span>
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
              <Save className="w-4 h-4" /> Simpan Dokumen PROTA
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
