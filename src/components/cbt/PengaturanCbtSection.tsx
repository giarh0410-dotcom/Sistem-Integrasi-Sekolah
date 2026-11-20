import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Check,
  Eraser,
  FileSignature,
  PenTool,
  RotateCcw,
  Save,
  Trash2,
  Upload
} from 'lucide-react';
import { CbtExamSettings, Role, SchoolSettings } from '../../types/school';
import { processSignatureForStorage } from './signatureUtils';

interface PengaturanCbtSectionProps {
  cbtSettings: CbtExamSettings;
  onSaveSettings: (next: CbtExamSettings) => void;
  schoolSettings?: SchoolSettings;
  currentRole?: Role;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const EXAM_NAME_PRESETS = [
  'Sumatif Akhir Semester (SAS)',
  'Sumatif Tengah Semester (STS)',
  'Penilaian Tengah Semester (PTS)',
  'Asesmen Sumatif Akhir Tahun (ASAT)',
  'Ujian Sekolah (US)',
  'Try Out Asesmen Nasional'
];

const TAHUN_AJARAN_OPTIONS = [
  '2024/2025',
  '2025/2026',
  '2026/2027',
  '2027/2028',
  '2028/2029'
];

const formatDateId = (iso?: string): string => {
  if (!iso) {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  const parts = iso.split('-');
  if (parts.length !== 3) return iso;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

export const PengaturanCbtSection: React.FC<PengaturanCbtSectionProps> = ({
  cbtSettings,
  onSaveSettings,
  schoolSettings,
  currentRole = 'admin',
  showToast
}) => {
  const canEdit = currentRole !== 'siswa';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [form, setForm] = useState<CbtExamSettings>(cbtSettings);
  const [customTahunMode, setCustomTahunMode] = useState(
    !TAHUN_AJARAN_OPTIONS.includes(cbtSettings.tahunAjaran)
  );
  const [sigMode, setSigMode] = useState<'upload' | 'draw'>('upload');
  const [inkColor, setInkColor] = useState<'#0f172a' | '#1e3a8a'>('#0f172a');
  const [penSize, setPenSize] = useState<number>(2.5);
  const [hasCanvasStrokes, setHasCanvasStrokes] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Keep local form synced if remote Firestore finishes loading while form isn't dirty
  useEffect(() => {
    if (!isDirty) {
      setForm(cbtSettings);
      setCustomTahunMode(!TAHUN_AJARAN_OPTIONS.includes(cbtSettings.tahunAjaran));
    }
  }, [cbtSettings, isDirty]);

  const updateField = <K extends keyof CbtExamSettings>(key: K, value: CbtExamSettings[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  // --- Image Upload (High-Res Crisp PNG with Auto-Trim, Firestore-safe) ---
  const handleUploadSignature = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar (PNG, JPG, atau WebP).', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async ev => {
      const src = String(ev.target?.result || '');
      try {
        const processed = await processSignatureForStorage(src);
        updateField('ttdKepalaSekolahUrl', processed);
        showToast('Gambar tanda tangan kepala sekolah berhasil diunggah dalam resolusi tajam.');
      } catch {
        showToast('Gagal memproses file gambar tanda tangan.', 'error');
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // --- Interactive Signature Drawing Canvas ---
  const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!canEdit) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const pt = getCanvasPoint(e);
    if (!pt) return;
    isDrawingRef.current = true;
    lastPointRef.current = pt;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = inkColor;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, penSize, 0, Math.PI * 2);
      ctx.fill();
      setHasCanvasStrokes(true);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current || !canEdit) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pt = getCanvasPoint(e);
    const prev = lastPointRef.current;
    if (!pt || !prev) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = penSize * 2;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pt.x, pt.y);
      ctx.stroke();
      setHasCanvasStrokes(true);
    }
    lastPointRef.current = pt;
  };

  const handlePointerUp = () => {
    isDrawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasCanvasStrokes(false);
  };

  const handleApplyCanvasSignature = async () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasCanvasStrokes) {
      showToast('Silakan goreskan tanda tangan pada kanvas terlebih dahulu.', 'error');
      return;
    }
    const rawDataUrl = canvas.toDataURL('image/png');
    const processed = await processSignatureForStorage(rawDataUrl);
    updateField('ttdKepalaSekolahUrl', processed);
    showToast('Tanda tangan dari kanvas diterapkan. Klik Simpan Pengaturan untuk menyimpan.');
  };

  const handleRemoveSignature = () => {
    updateField('ttdKepalaSekolahUrl', '');
    handleClearCanvas();
    showToast('Tanda tangan digital dihapus.');
  };

  const handleResetToSchoolDefault = () => {
    const defaultSemester =
      (schoolSettings?.semesterAktif || schoolSettings?.semester || 'Ganjil')
        .toLowerCase()
        .includes('genap')
        ? 'Genap'
        : 'Ganjil';

    setForm(prev => ({
      ...prev,
      namaUjian: 'Sumatif Akhir Semester (SAS)',
      tahunAjaran: schoolSettings?.tahunAjaran || '2026/2027',
      semester: defaultSemester,
      kepalaSekolahNama: schoolSettings?.kepalaSekolah || 'Nurhidayati, S.Pd',
      kepalaSekolahNip: schoolSettings?.nipKepalaSekolah || '',
      kotaPenetapan: schoolSettings?.kotaKabupaten || 'Depok'
    }));
    setCustomTahunMode(
      !TAHUN_AJARAN_OPTIONS.includes(schoolSettings?.tahunAjaran || '2026/2027')
    );
    setIsDirty(true);
    showToast('Nilai pengaturan disinkronkan dari profil sekolah.');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.namaUjian.trim()) {
      showToast('Nama ujian tidak boleh kosong.', 'error');
      return;
    }
    if (!form.tahunAjaran.trim()) {
      showToast('Tahun ajaran tidak boleh kosong.', 'error');
      return;
    }
    if (!form.kepalaSekolahNama.trim()) {
      showToast('Nama kepala sekolah tidak boleh kosong.', 'error');
      return;
    }

    const payload: CbtExamSettings = {
      id: 'default',
      namaUjian: form.namaUjian.trim(),
      tahunAjaran: form.tahunAjaran.trim(),
      semester: form.semester,
      kepalaSekolahNama: form.kepalaSekolahNama.trim(),
      kepalaSekolahNip: (form.kepalaSekolahNip || '').trim(),
      kotaPenetapan: (form.kotaPenetapan || '').trim() || schoolSettings?.kotaKabupaten || 'Depok',
      tanggalPenetapan: form.tanggalPenetapan || '',
      ttdKepalaSekolahUrl: form.ttdKepalaSekolahUrl || '',
      updatedAt: new Date().toISOString()
    };

    onSaveSettings(payload);
    setIsDirty(false);
    showToast('Pengaturan CBT Ujian berhasil disimpan & diterapkan ke seluruh dokumen ujian.');
  };

  return (
    <div className="space-y-6">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleUploadSignature}
        className="hidden"
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr] gap-6 items-start">
        {/* =================================================================
            LEFT COLUMN: PENGATURAN FORM
           ================================================================= */}
        <form
          onSubmit={handleSubmit}
          className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
        >
          {/* Card Header */}
          <div className="px-6 py-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold tracking-tight text-slate-900">
                Pengaturan Pelaksanaan Ujian CBT
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Atur identitas ujian, tahun ajaran, semester, dan tanda tangan resmi Kepala Sekolah.
              </p>
            </div>
            {canEdit && (
              <button
                type="button"
                onClick={handleResetToSchoolDefault}
                className="px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Sinkron Profil Sekolah</span>
              </button>
            )}
          </div>

          <div className="p-6 space-y-6">
            {/* SECTION 1: IDENTITAS UJIAN */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                  1
                </span>
                <span className="text-xs font-bold tracking-wide text-slate-800">
                  Identitas Ujian &amp; Periode Akademik
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 space-y-4">
                {/* Nama Ujian */}
                <div className="space-y-2">
                  <label className="block text-[11px] font-semibold text-slate-600">
                    Nama Ujian <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!canEdit}
                    value={form.namaUjian}
                    onChange={e => updateField('namaUjian', e.target.value)}
                    placeholder="Contoh: Sumatif Akhir Semester (SAS)"
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-500 transition-colors disabled:bg-slate-50"
                  />
                  {canEdit && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      {EXAM_NAME_PRESETS.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => updateField('namaUjian', preset)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            form.namaUjian === preset
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tahun Ajaran & Semester */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      Tahun Ajaran <span className="text-rose-500">*</span>
                    </label>
                    <select
                      disabled={!canEdit}
                      value={customTahunMode ? '__custom__' : form.tahunAjaran}
                      onChange={e => {
                        if (e.target.value === '__custom__') {
                          setCustomTahunMode(true);
                        } else {
                          setCustomTahunMode(false);
                          updateField('tahunAjaran', e.target.value);
                        }
                      }}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 tabular-nums focus:outline-none focus:border-slate-500 transition-colors disabled:bg-slate-50"
                    >
                      {TAHUN_AJARAN_OPTIONS.map(ta => (
                        <option key={ta} value={ta}>
                          {ta}
                        </option>
                      ))}
                      <option value="__custom__">+ Tulis Tahun Ajaran Lainnya...</option>
                    </select>
                    {customTahunMode && (
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={form.tahunAjaran}
                        onChange={e => updateField('tahunAjaran', e.target.value)}
                        placeholder="Contoh: 2026/2027"
                        className="mt-2 w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs text-slate-900 tabular-nums focus:outline-none focus:bg-white focus:border-slate-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      Semester <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl border border-slate-200">
                      {(['Ganjil', 'Genap'] as const).map(sem => (
                        <button
                          key={sem}
                          type="button"
                          disabled={!canEdit}
                          onClick={() => updateField('semester', sem)}
                          className={`py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                            form.semester === sem
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          Semester {sem}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: TANDA TANGAN KEPALA SEKOLAH */}
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                  2
                </span>
                <span className="text-xs font-bold tracking-wide text-slate-800">
                  Pengesahan &amp; Tanda Tangan Kepala Sekolah
                </span>
              </div>

              <div className="rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      Nama Kepala Sekolah <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      disabled={!canEdit}
                      value={form.kepalaSekolahNama}
                      onChange={e => updateField('kepalaSekolahNama', e.target.value)}
                      placeholder="Contoh: Nurhidayati, S.Pd"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-500 transition-colors disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      NIP / NIY Kepala Sekolah
                    </label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={form.kepalaSekolahNip || ''}
                      onChange={e => updateField('kepalaSekolahNip', e.target.value)}
                      placeholder="Opsional, misal: 19800101 200501 2 001"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-900 tabular-nums focus:outline-none focus:border-slate-500 transition-colors disabled:bg-slate-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      Kota / Tempat Penetapan
                    </label>
                    <input
                      type="text"
                      disabled={!canEdit}
                      value={form.kotaPenetapan || ''}
                      onChange={e => updateField('kotaPenetapan', e.target.value)}
                      placeholder="Contoh: Depok"
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-500 transition-colors disabled:bg-slate-50"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                      Tanggal Penetapan (Opsional)
                    </label>
                    <input
                      type="date"
                      disabled={!canEdit}
                      value={form.tanggalPenetapan || ''}
                      onChange={e => updateField('tanggalPenetapan', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 tabular-nums focus:outline-none focus:border-slate-500 transition-colors disabled:bg-slate-50"
                    />
                  </div>
                </div>

                {/* Signature Input Switcher */}
                <div className="space-y-3 pt-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="text-[11px] font-semibold text-slate-600">
                      Tanda Tangan Digital Kepala Sekolah
                    </label>
                    {canEdit && (
                      <div className="inline-flex items-center p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => setSigMode('upload')}
                          className={`px-3 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            sigMode === 'upload'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <Upload className="w-3 h-3" />
                          <span>Upload Gambar</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setSigMode('draw')}
                          className={`px-3 py-1 rounded-md text-[11px] font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                            sigMode === 'draw'
                              ? 'bg-white text-slate-900 shadow-xs'
                              : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          <PenTool className="w-3 h-3" />
                          <span>Tulis di Kanvas</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {sigMode === 'upload' ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-5">
                      {form.ttdKepalaSekolahUrl ? (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                          <div className="bg-white border border-slate-200 rounded-xl px-5 py-3 flex items-center justify-center min-w-[200px] h-24">
                            <img
                              src={form.ttdKepalaSekolahUrl}
                              alt="Tanda Tangan Kepala Sekolah"
                              className="max-h-20 max-w-[220px] object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          {canEdit && (
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Upload className="w-3.5 h-3.5" />
                                <span>Ganti Gambar</span>
                              </button>
                              <button
                                type="button"
                                onClick={handleRemoveSignature}
                                className="px-3.5 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Hapus TTD</span>
                              </button>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-center space-y-2.5 py-2">
                          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 mx-auto flex items-center justify-center">
                            <FileSignature className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-800">
                              Unggah scan atau PNG tanda tangan Kepala Sekolah
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Format PNG transparan disarankan agar menyatu rapi saat dicetak.
                            </p>
                          </div>
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="px-4 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Pilih File Gambar TTD</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 font-medium">Warna Tinta:</span>
                          <button
                            type="button"
                            onClick={() => setInkColor('#0f172a')}
                            className={`px-2 py-1 rounded-md font-semibold border cursor-pointer ${
                              inkColor === '#0f172a'
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            Hitam
                          </button>
                          <button
                            type="button"
                            onClick={() => setInkColor('#1e3a8a')}
                            className={`px-2 py-1 rounded-md font-semibold border cursor-pointer ${
                              inkColor === '#1e3a8a'
                                ? 'bg-blue-900 text-white border-blue-900'
                                : 'bg-white text-slate-700 border-slate-200'
                            }`}
                          >
                            Biru Tinta
                          </button>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500 font-medium">Tebal:</span>
                          {[
                            { label: 'Tipis', val: 1.8 },
                            { label: 'Sedang', val: 2.5 },
                            { label: 'Tebal', val: 3.8 }
                          ].map(opt => (
                            <button
                              key={opt.label}
                              type="button"
                              onClick={() => setPenSize(opt.val)}
                              className={`px-2 py-1 rounded-md font-semibold border cursor-pointer ${
                                penSize === opt.val
                                  ? 'bg-slate-800 text-white border-slate-800'
                                  : 'bg-white text-slate-600 border-slate-200'
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-300 overflow-hidden relative">
                        <canvas
                          ref={canvasRef}
                          width={1040}
                          height={360}
                          onPointerDown={handlePointerDown}
                          onPointerMove={handlePointerMove}
                          onPointerUp={handlePointerUp}
                          onPointerLeave={handlePointerUp}
                          className="w-full h-40 touch-none cursor-crosshair block"
                        />
                        {!hasCanvasStrokes && (
                          <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-slate-400">
                            Goreskan tanda tangan Kepala Sekolah di area ini
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={handleClearCanvas}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eraser className="w-3.5 h-3.5" />
                          <span>Bersihkan Kanvas</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleApplyCanvasSignature}
                          className="px-3.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Terapkan Tanda Tangan</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Card Footer */}
          {canEdit && (
            <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3">
              <span className="text-[11px] text-slate-500">
                {isDirty
                  ? 'Ada perubahan yang belum disimpan.'
                  : form.updatedAt
                  ? `Terakhir diperbarui · ${new Date(form.updatedAt).toLocaleString('id-ID')}`
                  : 'Pengaturan aktif & tersinkronisasi.'}
              </span>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:scale-[0.98] text-white text-xs font-semibold inline-flex items-center gap-2 shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Ujian</span>
              </button>
            </div>
          )}
        </form>

        {/* =================================================================
            RIGHT COLUMN: LIVE DOCUMENT PREVIEW
           ================================================================= */}
        <div className="bg-white text-slate-900 rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h4 className="text-sm font-bold text-slate-900">
              Pratinjau Dokumen Ujian
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Tampilan kop &amp; pengesahan otomatis pada Kartu Peserta, Jadwal Ujian, dan Denah Ruang.
            </p>
          </div>

          <div className="p-6 space-y-5 bg-slate-50/50">
            {/* Mock Official Paper Sheet */}
            <div className="bg-white rounded-xl border-2 border-slate-900 p-5 space-y-5 shadow-xs">
              {/* Official Exam Header Preview */}
              <div className="flex items-center gap-3.5 border-b-2 border-slate-900 pb-3.5">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 overflow-hidden">
                  {schoolSettings?.logoUrl ? (
                    <img
                      src={schoolSettings.logoUrl}
                      alt="Logo Sekolah"
                      className="w-full h-full object-contain p-1"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Building2 className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-600 uppercase tracking-wide truncate">
                    {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}
                  </div>
                  <div className="text-sm font-black text-slate-950 uppercase leading-tight mt-0.5">
                    {form.namaUjian || 'SUMATIF AKHIR SEMESTER (SAS)'}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-700 mt-0.5 tabular-nums">
                    Semester {form.semester} · Tahun Pelajaran {form.tahunAjaran || '2026/2027'}
                  </div>
                </div>
              </div>

              {/* Sample Document Summary */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 rounded-lg p-3 border border-slate-200">
                <div>
                  <div className="text-[10px] font-semibold text-slate-500">Nama Ujian</div>
                  <div className="font-bold text-slate-900 mt-0.5">
                    {form.namaUjian || '-'}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500">Periode</div>
                  <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                    {form.semester} · {form.tahunAjaran || '-'}
                  </div>
                </div>
              </div>

              {/* Principal Signature Block Preview */}
              <div className="pt-2 flex justify-end">
                <div className="text-center min-w-[200px] text-xs">
                  <p className="text-slate-600">
                    {form.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok'},{' '}
                    {formatDateId(form.tanggalPenetapan)}
                  </p>
                  <p className="font-semibold text-slate-800 mt-0.5">Kepala Sekolah,</p>

                  <div className="h-20 flex items-center justify-center my-1">
                    {form.ttdKepalaSekolahUrl ? (
                      <img
                        src={form.ttdKepalaSekolahUrl}
                        alt="Tanda Tangan Kepala Sekolah"
                        className="max-h-18 max-w-[180px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-36 h-12 rounded-lg border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                        Belum ada TTD digital
                      </div>
                    )}
                  </div>

                  <p className="font-bold text-slate-950 underline underline-offset-2">
                    {form.kepalaSekolahNama || 'Nama Kepala Sekolah'}
                  </p>
                  {form.kepalaSekolahNip && (
                    <p className="text-[11px] text-slate-600 font-mono tabular-nums mt-0.5">
                      NIP. {form.kepalaSekolahNip}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Integration Info */}
            <div className="space-y-2 text-xs text-slate-600">
              <p className="font-semibold text-slate-800">Terhubung otomatis ke:</p>
              <ul className="space-y-1 list-disc list-inside text-[11px] text-slate-600">
                <li>Kop &amp; Tanda Tangan Kepala Sekolah pada <strong>Kartu Peserta Ujian</strong></li>
                <li>Kop &amp; Lembar Cetak <strong>Jadwal Pelaksanaan Ujian</strong></li>
                <li>Banner default judul ujian pada <strong>Denah Ruang Ujian</strong></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
