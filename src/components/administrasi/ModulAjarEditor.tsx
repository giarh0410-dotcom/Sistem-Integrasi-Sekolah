import React, { useState } from 'react';
import { 
  X, Save, Plus, Trash2, Check, ChevronRight, ChevronDown, 
  BookOpen, Users, Layout, Wrench, Target, MessageSquare, 
  Activity, ClipboardCheck, Sparkles, FileText, Info, BookMarked, Wand2, Layers
} from 'lucide-react';
import { ModulAjarContent, SchoolSettings, Guru, MataPelajaranItem } from '../../types/school';
import { 
  DIMENSI_PROFIL_LULUSAN, 
  PRINSIP_PEMBELAJARAN_MENDALAM, 
  QURAN_AYAT_PRESETS, 
  suggestAyatForMateri 
} from '../../lib/quranAyatPresets';
import { motion, AnimatePresence } from 'motion/react';

interface ModulAjarEditorProps {
  initialData?: Partial<ModulAjarContent>;
  onSave: (data: ModulAjarContent) => void;
  onClose: () => void;
  schoolSettings?: SchoolSettings;
  guruList?: Guru[];
  mapelList?: MataPelajaranItem[];
  defaultMapel?: string;
}

export const ModulAjarEditor: React.FC<ModulAjarEditorProps> = ({
  initialData,
  onSave,
  onClose,
  schoolSettings,
  guruList,
  mapelList,
  defaultMapel
}) => {
  const [activeSection, setActiveSection] = useState<string>('A');
  
  const initialMapel = initialData?.informasiUmum?.mataPelajaran || defaultMapel || '';
  const initialMateri = initialData?.informasiUmum?.materi || '';
  const defaultAyat = initialData?.ayatAlQuran?.surahAyat
    ? initialData.ayatAlQuran
    : suggestAyatForMateri(initialMapel, initialMateri);
  const initialDimensi = (initialData?.dimensiProfilLulusan && initialData.dimensiProfilLulusan.length > 0)
    ? initialData.dimensiProfilLulusan
    : ['Keimanan dan Ketakwaan terhadap Tuhan YME', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Komunikasi'];

  const [formData, setFormData] = useState<ModulAjarContent>({
    informasiUmum: {
      namaPenyusun: initialData?.informasiUmum?.namaPenyusun || '',
      namaSekolah: initialData?.informasiUmum?.namaSekolah || schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
      mataPelajaran: initialMapel,
      fase: initialData?.informasiUmum?.fase || 'D',
      kelas: initialData?.informasiUmum?.kelas || '',
      semester: initialData?.informasiUmum?.semester || 'Ganjil',
      tahunAjaran: initialData?.informasiUmum?.tahunAjaran || schoolSettings?.tahunAjaran || '2026/2027',
      alokasiWaktu: initialData?.informasiUmum?.alokasiWaktu || '2 JP (2 x 40 Menit)',
      materi: initialMateri,
    },
    ayatAlQuran: {
      surahAyat: defaultAyat.surahAyat || '',
      teksArab: defaultAyat.teksArab || '',
      terjemahan: defaultAyat.terjemahan || '',
      kaitanMateri: defaultAyat.kaitanMateri || '',
    },
    kompetensiAwal: initialData?.kompetensiAwal || '',
    dimensiProfilLulusan: initialDimensi,
    profilPelajarPancasila: initialData?.profilPelajarPancasila?.length ? initialData.profilPelajarPancasila : initialDimensi,
    capaianPembelajaran: initialData?.capaianPembelajaran || '',
    lintasDisiplinIlmu: initialData?.lintasDisiplinIlmu || '',
    kerangkaPembelajaran: {
      praktikPedagogis: initialData?.kerangkaPembelajaran?.praktikPedagogis || 'Problem-Based Learning / Inquiry Learning berbasis Pembelajaran Mendalam',
      kemitraanPembelajaran: initialData?.kerangkaPembelajaran?.kemitraanPembelajaran || 'Kolaborasi guru mapel serumpun, tutor sebaya, dan dukungan orang tua',
      lingkunganPembelajaran: initialData?.kerangkaPembelajaran?.lingkunganPembelajaran || 'Ruang kelas/lab inklusif, aman berpendapat, dan budaya tadabbur Al-Qur\'an',
      pemanfaatanDigital: initialData?.kerangkaPembelajaran?.pemanfaatanDigital || 'Slide interaktif, simulasi digital, Al-Qur\'an digital, dan LKPD kolaboratif',
    },
    saranaPrasarana: initialData?.saranaPrasarana || ['Laptop', 'Internet', 'Proyektor', 'Mushaf / Qur\'an Digital', 'Buku'],
    targetPesertaDidik: initialData?.targetPesertaDidik || 'Reguler',
    modelPembelajaran: initialData?.modelPembelajaran || 'Problem Based Learning (Pembelajaran Mendalam)',
    tujuanPembelajaran: initialData?.tujuanPembelajaran || [],
    pemahamanBermakna: initialData?.pemahamanBermakna || '',
    pertanyaanPemantik: initialData?.pertanyaanPemantik || [''],
    pengalamanBelajarMendalam: {
      prinsipPembelajaran: initialData?.pengalamanBelajarMendalam?.prinsipPembelajaran?.length
        ? initialData.pengalamanBelajarMendalam.prinsipPembelajaran
        : [...PRINSIP_PEMBELAJARAN_MENDALAM],
      memahami: initialData?.pengalamanBelajarMendalam?.memahami || '',
      mengaplikasi: initialData?.pengalamanBelajarMendalam?.mengaplikasi || '',
      merefleksi: initialData?.pengalamanBelajarMendalam?.merefleksi || '',
    },
    kegiatanPembelajaran: {
      pendahuluan: { deskripsi: initialData?.kegiatanPembelajaran?.pendahuluan?.deskripsi || '', durasi: initialData?.kegiatanPembelajaran?.pendahuluan?.durasi || '15 Menit' },
      inti: { deskripsi: initialData?.kegiatanPembelajaran?.inti?.deskripsi || '', durasi: initialData?.kegiatanPembelajaran?.inti?.durasi || '50 Menit' },
      penutup: { deskripsi: initialData?.kegiatanPembelajaran?.penutup?.deskripsi || '', durasi: initialData?.kegiatanPembelajaran?.penutup?.durasi || '15 Menit' },
    },
    asesmen: {
      diagnostik: initialData?.asesmen?.diagnostik || '',
      formatif: initialData?.asesmen?.formatif || '',
      sumatif: initialData?.asesmen?.sumatif || '',
      teknik: initialData?.asesmen?.teknik || 'Observasi, Proyek & Tes Kontekstual',
      instrumen: initialData?.asesmen?.instrumen || 'LKPD Pembelajaran Mendalam & Rubrik Analitik',
      rubrik: initialData?.asesmen?.rubrik || '',
      kriteriaPenilaian: initialData?.asesmen?.kriteriaPenilaian || '',
    },
    diferensiasi: {
      konten: initialData?.diferensiasi?.konten || '',
      proses: initialData?.diferensiasi?.proses || '',
      produk: initialData?.diferensiasi?.produk || '',
    },
    remedial: initialData?.remedial || '',
    pengayaan: initialData?.pengayaan || '',
    refleksiGuru: initialData?.refleksiGuru || '',
    refleksiPesertaDidik: initialData?.refleksiPesertaDidik || '',
    lampiran: {
      lkpd: initialData?.lampiran?.lkpd || '',
      bahanBacaan: initialData?.lampiran?.bahanBacaan || '',
      rubrik: initialData?.lampiran?.rubrik || '',
      instrumenAsesmen: initialData?.lampiran?.instrumenAsesmen || '',
      daftarPustaka: initialData?.lampiran?.daftarPustaka || '',
    },
  });

  const sections = [
    { id: 'A', title: 'Informasi Umum', icon: <Info className="w-4 h-4" /> },
    { id: 'QURAN', title: 'Integrasi Ayat Al-Qur\'an', icon: <BookMarked className="w-4 h-4" /> },
    { id: 'B', title: 'Identifikasi & Kesiapan', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'C', title: '8 Dimensi Profil Lulusan', icon: <Target className="w-4 h-4" /> },
    { id: 'D', title: 'Sarana & Prasarana', icon: <Wrench className="w-4 h-4" /> },
    { id: 'E', title: 'Target Peserta Didik', icon: <Users className="w-4 h-4" /> },
    { id: 'F', title: 'Desain & Kerangka Mendalam', icon: <Layers className="w-4 h-4" /> },
    { id: 'G', title: 'Tujuan Pembelajaran', icon: <Target className="w-4 h-4" /> },
    { id: 'H', title: 'Pemahaman Bermakna', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'I', title: 'Pertanyaan Pemantik', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'J', title: 'Pengalaman Belajar Mendalam', icon: <Activity className="w-4 h-4" /> },
    { id: 'K', title: 'Asesmen Pembelajaran', icon: <ClipboardCheck className="w-4 h-4" /> },
    { id: 'L', title: 'Diferensiasi & Inklusi', icon: <Users className="w-4 h-4" /> },
    { id: 'M-N', title: 'Remedial & Pengayaan', icon: <Plus className="w-4 h-4" /> },
    { id: 'O-P', title: 'Refleksi Mendalam', icon: <MessageSquare className="w-4 h-4" /> },
    { id: 'Q', title: 'Lampiran', icon: <FileText className="w-4 h-4" /> },
  ];

  const updateInformasiUmum = (field: keyof ModulAjarContent['informasiUmum'], value: string) => {
    setFormData(prev => ({
      ...prev,
      informasiUmum: { ...prev.informasiUmum, [field]: value }
    }));
  };

  const updateAyat = (field: 'surahAyat' | 'teksArab' | 'terjemahan' | 'kaitanMateri', value: string) => {
    setFormData(prev => ({
      ...prev,
      ayatAlQuran: {
        surahAyat: prev.ayatAlQuran?.surahAyat || '',
        teksArab: prev.ayatAlQuran?.teksArab || '',
        terjemahan: prev.ayatAlQuran?.terjemahan || '',
        kaitanMateri: prev.ayatAlQuran?.kaitanMateri || '',
        [field]: value,
      }
    }));
  };

  const handleAutoSuggestAyat = () => {
    const matched = suggestAyatForMateri(formData.informasiUmum.mataPelajaran, formData.informasiUmum.materi);
    setFormData(prev => ({ ...prev, ayatAlQuran: matched }));
  };

  const toggleDimensiProfil = (item: string) => {
    setFormData(prev => {
      const current = prev.dimensiProfilLulusan || [];
      const next = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
      return { ...prev, dimensiProfilLulusan: next, profilPelajarPancasila: next };
    });
  };

  const togglePrinsipMendalam = (item: string) => {
    setFormData(prev => {
      const current = prev.pengalamanBelajarMendalam?.prinsipPembelajaran || [];
      const next = current.includes(item) ? current.filter(i => i !== item) : [...current, item];
      return {
        ...prev,
        pengalamanBelajarMendalam: {
          prinsipPembelajaran: next,
          memahami: prev.pengalamanBelajarMendalam?.memahami || '',
          mengaplikasi: prev.pengalamanBelajarMendalam?.mengaplikasi || '',
          merefleksi: prev.pengalamanBelajarMendalam?.merefleksi || '',
        }
      };
    });
  };

  const toggleArrayItem = (field: 'profilPelajarPancasila' | 'saranaPrasarana', item: string) => {
    setFormData(prev => {
      const current = prev[field];
      if (current.includes(item)) {
        return { ...prev, [field]: current.filter(i => i !== item) };
      } else {
        return { ...prev, [field]: [...current, item] };
      }
    });
  };

  const addListItem = (field: 'tujuanPembelajaran' | 'pertanyaanPemantik') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  const updateListItem = (field: 'tujuanPembelajaran' | 'pertanyaanPemantik', index: number, value: string) => {
    setFormData(prev => {
      const newList = [...prev[field]];
      newList[index] = value;
      return { ...prev, [field]: newList };
    });
  };

  const removeListItem = (field: 'tujuanPembelajaran' | 'pertanyaanPemantik', index: number) => {
    setFormData(prev => ({
      ...prev,
      [field]: prev[field].filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-slate-900 rounded-3xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-800"
      >
        {/* Header */}
        <div className="bg-slate-900 px-8 py-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/20">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">Editor Modul Ajar Pembelajaran Mendalam (Deep Learning)</h2>
              <p className="text-xs text-slate-400 mt-0.5">8 Dimensi Profil Lulusan • Memahami, Mengaplikasi, Merefleksi • Terintegrasi Ayat Al-Qur'an</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-xl transition-all font-bold text-xs"
            >
              Batal
            </button>
            <button 
              onClick={() => onSave(formData)}
              className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/10 transition-all text-xs"
            >
              <Save className="w-4 h-4" /> Simpan Modul
            </button>
          </div>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar Navigation */}
          <div className="w-72 bg-slate-900 border-r border-slate-800 overflow-y-auto p-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-800">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full text-left px-4 py-3 rounded-2xl flex items-center gap-3 transition-all ${
                  activeSection === section.id 
                    ? 'bg-slate-950 text-emerald-400 font-bold border border-slate-800 shadow-inner' 
                    : 'text-slate-400 hover:bg-slate-950/40 hover:text-slate-100 border border-transparent'
                }`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${
                  activeSection === section.id ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' : 'bg-slate-950 text-slate-500 border border-slate-800'
                }`}>
                  {section.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[9px] uppercase tracking-wider opacity-60 font-black">Bagian {section.id}</p>
                  <p className="text-xs truncate">{section.title}</p>
                </div>
                {activeSection === section.id && <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />}
              </button>
            ))}
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto bg-slate-950 p-8 scrollbar-thin scrollbar-thumb-slate-800">
            <div className="max-w-3xl mx-auto space-y-8">
              
              <AnimatePresence mode="wait">
                {activeSection === 'A' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-6"
                  >
                    <SectionTitle title="A. INFORMASI UMUM" desc="Identitas sekolah, penyusun, dan materi pelajaran pokok" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Nama Penyusun">
                        <input 
                          type="text" 
                          value={formData.informasiUmum.namaPenyusun} 
                          onChange={(e) => updateInformasiUmum('namaPenyusun', e.target.value)}
                          placeholder="Contoh: Aulia Safitri, S.Pd"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all placeholder-slate-600"
                        />
                      </InputGroup>
                      <InputGroup label="Nama Sekolah">
                        <input 
                          type="text" 
                          value={formData.informasiUmum.namaSekolah} 
                          onChange={(e) => updateInformasiUmum('namaSekolah', e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all"
                        />
                      </InputGroup>
                      <InputGroup label="Mata Pelajaran">
                        <select 
                          value={formData.informasiUmum.mataPelajaran} 
                          onChange={(e) => updateInformasiUmum('mataPelajaran', e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all cursor-pointer"
                        >
                          <option value="" className="bg-slate-900 text-slate-400">Pilih Mapel</option>
                          {mapelList?.map(m => (
                            <option key={m.id} value={m.namaMapel} className="bg-slate-900 text-slate-100">{m.namaMapel}</option>
                          ))}
                        </select>
                      </InputGroup>
                      <InputGroup label="Materi Pokok">
                        <input 
                          type="text" 
                          value={formData.informasiUmum.materi} 
                          onChange={(e) => updateInformasiUmum('materi', e.target.value)}
                          placeholder="Contoh: Aritmetika Sosial"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all placeholder-slate-600"
                        />
                      </InputGroup>
                      <InputGroup label="Fase">
                        <select 
                          value={formData.informasiUmum.fase} 
                          onChange={(e) => updateInformasiUmum('fase', e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all cursor-pointer"
                        >
                          <option value="A" className="bg-slate-900">Fase A (Kelas 1-2)</option>
                          <option value="B" className="bg-slate-900">Fase B (Kelas 3-4)</option>
                          <option value="C" className="bg-slate-900">Fase C (Kelas 5-6)</option>
                          <option value="D" className="bg-slate-900">Fase D (Kelas 7-9)</option>
                          <option value="E" className="bg-slate-900">Fase E (Kelas 10)</option>
                          <option value="F" className="bg-slate-900">Fase F (Kelas 11-12)</option>
                        </select>
                      </InputGroup>
                      <InputGroup label="Kelas">
                        <input 
                          type="text" 
                          value={formData.informasiUmum.kelas} 
                          onChange={(e) => updateInformasiUmum('kelas', e.target.value)}
                          placeholder="Contoh: VII"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all placeholder-slate-600"
                        />
                      </InputGroup>
                      <InputGroup label="Alokasi Waktu">
                        <input 
                          type="text" 
                          value={formData.informasiUmum.alokasiWaktu} 
                          onChange={(e) => updateInformasiUmum('alokasiWaktu', e.target.value)}
                          placeholder="Contoh: 2 x 40 Menit"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all placeholder-slate-600"
                        />
                      </InputGroup>
                      <InputGroup label="Semester">
                        <select 
                          value={formData.informasiUmum.semester} 
                          onChange={(e) => updateInformasiUmum('semester', e.target.value)}
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all cursor-pointer"
                        >
                          <option value="Ganjil" className="bg-slate-900">Ganjil</option>
                          <option value="Genap" className="bg-slate-900">Genap</option>
                        </select>
                      </InputGroup>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'QURAN' && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <SectionTitle
                        title="INTEGRASI AYAT AL-QUR'AN SESUAI MATERI"
                        desc="Sisipkan ayat Al-Qur'an, terjemahan, dan tadabbur yang kontekstual dengan materi yang diajarkan"
                      />
                      <button
                        type="button"
                        onClick={handleAutoSuggestAyat}
                        className="px-4 py-2.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shrink-0"
                      >
                        <Wand2 className="w-4 h-4" /> Sesuaikan Otomatis dengan Materi
                      </button>
                    </div>

                    {/* Preset Pilihan Cepat */}
                    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                        Pilihan Cepat Ayat Al-Qur&apos;an Berdasarkan Mapel / Topik
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                        {QURAN_AYAT_PRESETS.map(preset => {
                          const isSelected = formData.ayatAlQuran?.surahAyat === preset.surahAyat;
                          return (
                            <button
                              type="button"
                              key={preset.id}
                              onClick={() => setFormData(prev => ({
                                ...prev,
                                ayatAlQuran: {
                                  surahAyat: preset.surahAyat,
                                  teksArab: preset.teksArab,
                                  terjemahan: preset.terjemahan,
                                  kaitanMateri: formData.informasiUmum.materi
                                    ? `${preset.kaitanMateri} Dalam materi "${formData.informasiUmum.materi}", nilai ayat ini diterapkan sebagai penguatan karakter dan pemaknaan belajar.`
                                    : preset.kaitanMateri,
                                }
                              }))}
                              className={`text-left p-3 rounded-xl border transition-all ${
                                isSelected
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="text-[10px] font-bold text-emerald-400">{preset.kategori}</div>
                              <div className="text-xs font-bold mt-0.5">{preset.surahAyat}</div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Form Edit Ayat Al-Qur'an */}
                    <div className="bg-emerald-950/20 border border-emerald-500/25 rounded-3xl p-6 space-y-4">
                      <InputGroup label="Nama Surah & Nomor Ayat">
                        <input
                          type="text"
                          value={formData.ayatAlQuran?.surahAyat || ''}
                          onChange={(e) => updateAyat('surahAyat', e.target.value)}
                          placeholder="Contoh: QS. Al-Hujurat (49): 13"
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 text-slate-100 text-xs font-bold outline-none"
                        />
                      </InputGroup>

                      <InputGroup label="Teks Arab Ayat Al-Qur'an (RTL)">
                        <textarea
                          dir="rtl"
                          rows={3}
                          value={formData.ayatAlQuran?.teksArab || ''}
                          onChange={(e) => updateAyat('teksArab', e.target.value)}
                          placeholder="Masukkan teks Arab ayat Al-Qur'an..."
                          className="w-full px-5 py-4 bg-slate-900 border border-emerald-500/30 rounded-2xl focus:border-emerald-400 text-emerald-100 text-xl leading-loose font-serif outline-none"
                        />
                      </InputGroup>

                      <InputGroup label="Terjemahan Bahasa Indonesia">
                        <textarea
                          rows={3}
                          value={formData.ayatAlQuran?.terjemahan || ''}
                          onChange={(e) => updateAyat('terjemahan', e.target.value)}
                          placeholder="Terjemahan ayat sesuai Kemenag RI..."
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 text-slate-200 text-xs leading-relaxed italic outline-none"
                        />
                      </InputGroup>

                      <InputGroup label="Tadabbur & Relevansi Ayat dengan Materi yang Diajarkan">
                        <textarea
                          rows={4}
                          value={formData.ayatAlQuran?.kaitanMateri || ''}
                          onChange={(e) => updateAyat('kaitanMateri', e.target.value)}
                          placeholder="Jelaskan keterkaitan nilai ayat Al-Qur'an dengan materi pokok dan implementasinya di kelas..."
                          className="w-full px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 text-slate-100 text-xs font-semibold leading-relaxed outline-none"
                        />
                      </InputGroup>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'B' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="B. IDENTIFIKASI KESIAPAN & KOMPETENSI AWAL" desc="Pemetaan kesiapan belajar, pengetahuan prasyarat, minat, dan kebutuhan inklusi peserta didik" />
                    <textarea 
                      value={formData.kompetensiAwal}
                      onChange={(e) => setFormData(prev => ({ ...prev, kompetensiAwal: e.target.value }))}
                      rows={6}
                      placeholder="Tuliskan identifikasi kesiapan peserta didik, pengetahuan awal, dan kebutuhan dukungan inklusi sebelum mempelajari materi..."
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all placeholder-slate-600 resize-none leading-relaxed"
                    />
                  </motion.div>
                )}

                {activeSection === 'C' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="C. 8 DIMENSI PROFIL LULUSAN (PEMBELAJARAN MENDALAM)" desc="Pilih dimensi profil lulusan Kemendikdasmen yang ditumbuhkan secara terintegrasi" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {DIMENSI_PROFIL_LULUSAN.map(item => {
                        const checked = (formData.dimensiProfilLulusan || formData.profilPelajarPancasila || []).includes(item);
                        return (
                          <button
                            type="button"
                            key={item}
                            onClick={() => toggleDimensiProfil(item)}
                            className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all text-left ${
                              checked
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-100'
                            }`}
                          >
                            <div className={`w-5 h-5 rounded-md flex items-center justify-center border shrink-0 transition-all ${
                              checked
                                ? 'bg-emerald-500 border-emerald-600 text-slate-950'
                                : 'bg-slate-950 border-slate-800'
                            }`}>
                              {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="font-bold text-xs">{item}</span>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {activeSection === 'D' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="D. SARANA DAN PRASARANA" desc="Fasilitas pendukung, media, dan alat penunjang proses belajar" />
                    <div className="flex flex-wrap gap-2.5">
                      {['Laptop', 'Internet', 'Proyektor', 'Buku', 'Laboratorium', 'Media pembelajaran', 'HP', 'Papan Tulis', 'Alat Peraga'].map(item => (
                        <button
                          key={item}
                          onClick={() => toggleArrayItem('saranaPrasarana', item)}
                          className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                            formData.saranaPrasarana.includes(item)
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-100'
                          }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                    <p className="text-[10px] text-slate-500 italic">*Pilih sarana dan prasarana yang relevan untuk modul ini</p>
                  </motion.div>
                )}

                {activeSection === 'E' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="E. TARGET PESERTA DIDIK" desc="Karakteristik kelompok murid yang diajar" />
                    <div className="grid grid-cols-3 gap-4">
                      {['Reguler', 'Dukungan tambahan', 'Pengayaan'].map(target => (
                        <button
                          key={target}
                          onClick={() => setFormData(prev => ({ ...prev, targetPesertaDidik: target as any }))}
                          className={`flex flex-col items-center justify-center p-6 rounded-3xl border transition-all ${
                            formData.targetPesertaDidik === target
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 shadow-md shadow-emerald-500/5'
                              : 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700 hover:text-slate-300'
                          }`}
                        >
                          <Users className={`w-7 h-7 mb-3 ${formData.targetPesertaDidik === target ? 'text-emerald-400' : 'text-slate-600'}`} />
                          <span className="font-bold text-xs">{target}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeSection === 'F' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="F. DESAIN & KERANGKA PEMBELAJARAN MENDALAM" desc="Model pedagogis, capaian pembelajaran, lintas disiplin ilmu, serta 4 pilar kerangka Deep Learning" />
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        'Problem Based Learning (Pembelajaran Mendalam)',
                        'Project Based Learning (Pembelajaran Mendalam)',
                        'Discovery Learning',
                        'Inquiry Learning',
                        'Cooperative Learning',
                        'Case-Based & Contextual Learning'
                      ].map(model => (
                        <button
                          type="button"
                          key={model}
                          onClick={() => setFormData(prev => ({ ...prev, modelPembelajaran: model }))}
                          className={`flex items-center gap-3 px-5 py-4 rounded-2xl border transition-all text-left ${
                            formData.modelPembelajaran === model
                              ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                              : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-100'
                          }`}
                        >
                          <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                            formData.modelPembelajaran === model 
                              ? 'border-purple-500 bg-purple-500' 
                              : 'border-slate-700 bg-slate-950'
                          }`}>
                            {formData.modelPembelajaran === model && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                          </div>
                          <span className="font-bold text-xs">{model}</span>
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 gap-4 pt-2">
                      <InputGroup label="Capaian Pembelajaran (CP)">
                        <textarea
                          rows={3}
                          value={formData.capaianPembelajaran || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, capaianPembelajaran: e.target.value }))}
                          placeholder="Tuliskan Capaian Pembelajaran Fase terkait materi ini..."
                          className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                        />
                      </InputGroup>
                      <InputGroup label="Lintas Disiplin Ilmu">
                        <textarea
                          rows={2}
                          value={formData.lintasDisiplinIlmu || ''}
                          onChange={(e) => setFormData(prev => ({ ...prev, lintasDisiplinIlmu: e.target.value }))}
                          placeholder="Contoh: PAI & Budi Pekerti (Tadabbur Al-Qur'an), Bahasa Indonesia, Literasi Digital..."
                          className="w-full p-3.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                        />
                      </InputGroup>
                    </div>

                    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-5 space-y-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-cyan-400">4 Pilar Kerangka Pembelajaran Mendalam</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <InputGroup label="1. Praktik Pedagogis">
                          <textarea
                            rows={2}
                            value={formData.kerangkaPembelajaran?.praktikPedagogis || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              kerangkaPembelajaran: {
                                praktikPedagogis: e.target.value,
                                kemitraanPembelajaran: prev.kerangkaPembelajaran?.kemitraanPembelajaran || '',
                                lingkunganPembelajaran: prev.kerangkaPembelajaran?.lingkunganPembelajaran || '',
                                pemanfaatanDigital: prev.kerangkaPembelajaran?.pemanfaatanDigital || '',
                              }
                            }))}
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                          />
                        </InputGroup>
                        <InputGroup label="2. Kemitraan Pembelajaran">
                          <textarea
                            rows={2}
                            value={formData.kerangkaPembelajaran?.kemitraanPembelajaran || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              kerangkaPembelajaran: {
                                praktikPedagogis: prev.kerangkaPembelajaran?.praktikPedagogis || '',
                                kemitraanPembelajaran: e.target.value,
                                lingkunganPembelajaran: prev.kerangkaPembelajaran?.lingkunganPembelajaran || '',
                                pemanfaatanDigital: prev.kerangkaPembelajaran?.pemanfaatanDigital || '',
                              }
                            }))}
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                          />
                        </InputGroup>
                        <InputGroup label="3. Lingkungan Pembelajaran">
                          <textarea
                            rows={2}
                            value={formData.kerangkaPembelajaran?.lingkunganPembelajaran || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              kerangkaPembelajaran: {
                                praktikPedagogis: prev.kerangkaPembelajaran?.praktikPedagogis || '',
                                kemitraanPembelajaran: prev.kerangkaPembelajaran?.kemitraanPembelajaran || '',
                                lingkunganPembelajaran: e.target.value,
                                pemanfaatanDigital: prev.kerangkaPembelajaran?.pemanfaatanDigital || '',
                              }
                            }))}
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                          />
                        </InputGroup>
                        <InputGroup label="4. Pemanfaatan Digital">
                          <textarea
                            rows={2}
                            value={formData.kerangkaPembelajaran?.pemanfaatanDigital || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              kerangkaPembelajaran: {
                                praktikPedagogis: prev.kerangkaPembelajaran?.praktikPedagogis || '',
                                kemitraanPembelajaran: prev.kerangkaPembelajaran?.kemitraanPembelajaran || '',
                                lingkunganPembelajaran: prev.kerangkaPembelajaran?.lingkunganPembelajaran || '',
                                pemanfaatanDigital: e.target.value,
                              }
                            }))}
                            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                          />
                        </InputGroup>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'G' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="G. TUJUAN PEMBELAJARAN" desc="Target kompetensi yang akan dicapai oleh seluruh peserta didik" />
                    <div className="space-y-3">
                      {formData.tujuanPembelajaran.map((tp, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={tp}
                            onChange={(e) => updateListItem('tujuanPembelajaran', idx, e.target.value)}
                            placeholder={`Tuliskan kriteria/tujuan pembelajaran ke-${idx + 1}...`}
                            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all placeholder-slate-600"
                          />
                          <button 
                            onClick={() => removeListItem('tujuanPembelajaran', idx)} 
                            className="p-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/15"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => addListItem('tujuanPembelajaran')}
                        className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 flex items-center justify-center gap-2 transition-all font-bold text-xs"
                      >
                        <Plus className="w-4 h-4" /> Tambah Tujuan Pembelajaran
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'H' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="H. PEMAHAMAN BERMAKNA" desc="Manfaat riil yang dibawa murid ke dalam kehidupan nyata setelah pembelajaran" />
                    <textarea 
                      value={formData.pemahamanBermakna}
                      onChange={(e) => setFormData(prev => ({ ...prev, pemahamanBermakna: e.target.value }))}
                      rows={4}
                      placeholder="Tuliskan pemahaman bermakna yang kontekstual..."
                      className="w-full px-5 py-4 bg-slate-900 border border-slate-800 rounded-2xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all placeholder-slate-600 resize-none leading-relaxed"
                    />
                  </motion.div>
                )}

                {activeSection === 'I' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="I. PERTANYAAN PEMANTIK" desc="Pertanyaan esensial untuk memantik nalar kritis dan minat belajar" />
                    <div className="space-y-3">
                      {formData.pertanyaanPemantik.map((pp, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input 
                            type="text"
                            value={pp}
                            onChange={(e) => updateListItem('pertanyaanPemantik', idx, e.target.value)}
                            placeholder={`Tuliskan pertanyaan pemantik ke-${idx + 1}...`}
                            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-slate-100 text-xs font-semibold outline-none transition-all placeholder-slate-600"
                          />
                          <button 
                            onClick={() => removeListItem('pertanyaanPemantik', idx)} 
                            className="p-3 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-all border border-transparent hover:border-rose-500/15"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      <button 
                        onClick={() => addListItem('pertanyaanPemantik')}
                        className="w-full py-3 border-2 border-dashed border-slate-800 rounded-xl text-slate-500 hover:text-emerald-400 hover:border-emerald-500/50 flex items-center justify-center gap-2 transition-all font-bold text-xs"
                      >
                        <Plus className="w-4 h-4" /> Tambah Pertanyaan Pemantik
                      </button>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'J' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
                    <SectionTitle title="J. PENGALAMAN BELAJAR MENDALAM & KEGIATAN PEMBELAJARAN" desc="3 Prinsip Deep Learning (Berkesadaran, Bermakna, Menggembirakan) dan 3 Tahap: Memahami, Mengaplikasi, Merefleksi" />
                    
                    {/* Prinsip Pembelajaran Mendalam */}
                    <div className="bg-slate-900 p-5 rounded-3xl border border-slate-800 space-y-4">
                      <p className="text-[11px] font-black uppercase tracking-wider text-emerald-400">Prinsip Pembelajaran Mendalam yang Diterapkan</p>
                      <div className="flex flex-wrap gap-2.5">
                        {PRINSIP_PEMBELAJARAN_MENDALAM.map(prinsip => {
                          const active = (formData.pengalamanBelajarMendalam?.prinsipPembelajaran || []).includes(prinsip);
                          return (
                            <button
                              type="button"
                              key={prinsip}
                              onClick={() => togglePrinsipMendalam(prinsip)}
                              className={`px-4 py-2 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 ${
                                active
                                  ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-100'
                              }`}
                            >
                              {active && <Check className="w-3.5 h-3.5" />}
                              {prinsip}
                            </button>
                          );
                        })}
                      </div>

                      <div className="grid grid-cols-1 gap-4 pt-2">
                        <InputGroup label="Tahap 1: Memahami (Konstruksi Konsep & Tadabbur Ayat)">
                          <textarea
                            rows={3}
                            value={formData.pengalamanBelajarMendalam?.memahami || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              pengalamanBelajarMendalam: {
                                prinsipPembelajaran: prev.pengalamanBelajarMendalam?.prinsipPembelajaran || [...PRINSIP_PEMBELAJARAN_MENDALAM],
                                memahami: e.target.value,
                                mengaplikasi: prev.pengalamanBelajarMendalam?.mengaplikasi || '',
                                merefleksi: prev.pengalamanBelajarMendalam?.merefleksi || '',
                              }
                            }))}
                            placeholder="Aktivitas membangun pemahaman esensial secara berkesadaran dan bermakna..."
                            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                          />
                        </InputGroup>
                        <InputGroup label="Tahap 2: Mengaplikasi (Penerapan Nyata / Proyek Kolaboratif)">
                          <textarea
                            rows={3}
                            value={formData.pengalamanBelajarMendalam?.mengaplikasi || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              pengalamanBelajarMendalam: {
                                prinsipPembelajaran: prev.pengalamanBelajarMendalam?.prinsipPembelajaran || [...PRINSIP_PEMBELAJARAN_MENDALAM],
                                memahami: prev.pengalamanBelajarMendalam?.memahami || '',
                                mengaplikasi: e.target.value,
                                merefleksi: prev.pengalamanBelajarMendalam?.merefleksi || '',
                              }
                            }))}
                            placeholder="Aktivitas menerapkan konsep ke konteks nyata secara bermakna dan menggembirakan..."
                            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                          />
                        </InputGroup>
                        <InputGroup label="Tahap 3: Merefleksi (Evaluasi Diri & Pemaknaan Hikmah)">
                          <textarea
                            rows={3}
                            value={formData.pengalamanBelajarMendalam?.merefleksi || ''}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              pengalamanBelajarMendalam: {
                                prinsipPembelajaran: prev.pengalamanBelajarMendalam?.prinsipPembelajaran || [...PRINSIP_PEMBELAJARAN_MENDALAM],
                                memahami: prev.pengalamanBelajarMendalam?.memahami || '',
                                mengaplikasi: prev.pengalamanBelajarMendalam?.mengaplikasi || '',
                                merefleksi: e.target.value,
                              }
                            }))}
                            placeholder="Aktivitas refleksi metakognitif, hikmah ayat Al-Qur'an, dan rencana aksi nyata..."
                            className="w-full p-3.5 bg-slate-950 border border-slate-800 rounded-2xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500"
                          />
                        </InputGroup>
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-200 flex items-center gap-2.5 text-xs">
                            <div className="w-6 h-6 bg-blue-500/15 border border-blue-500/20 text-blue-400 rounded-lg flex items-center justify-center text-[10px] font-bold">1</div>
                            Pendahuluan (Berkesadaran &amp; Tadabbur Ayat)
                          </h4>
                          <input 
                            type="text" 
                            value={formData.kegiatanPembelajaran.pendahuluan.durasi}
                            onChange={(e) => setFormData(prev => ({ ...prev, kegiatanPembelajaran: { ...prev.kegiatanPembelajaran, pendahuluan: { ...prev.kegiatanPembelajaran.pendahuluan, durasi: e.target.value } } }))}
                            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 outline-none w-28 text-center focus:border-emerald-500 transition-all"
                            placeholder="Durasi"
                          />
                        </div>
                        <textarea 
                          value={formData.kegiatanPembelajaran.pendahuluan.deskripsi}
                          onChange={(e) => setFormData(prev => ({ ...prev, kegiatanPembelajaran: { ...prev.kegiatanPembelajaran, pendahuluan: { ...prev.kegiatanPembelajaran.pendahuluan, deskripsi: e.target.value } } }))}
                          rows={4}
                          className="w-full p-4 bg-slate-950 border border-slate-850 rounded-2xl outline-none text-xs font-semibold text-slate-300 placeholder-slate-600 focus:border-emerald-500/60 leading-relaxed transition-all"
                          placeholder="Salam, doa, tadabbur ayat Al-Qur'an sesuai materi, apersepsi kontekstual, asesmen awal..."
                        />
                      </div>

                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-200 flex items-center gap-2.5 text-xs">
                            <div className="w-6 h-6 bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 rounded-lg flex items-center justify-center text-[10px] font-bold">2</div>
                            Kegiatan Inti (Memahami → Mengaplikasi → Merefleksi)
                          </h4>
                          <input 
                            type="text" 
                            value={formData.kegiatanPembelajaran.inti.durasi}
                            onChange={(e) => setFormData(prev => ({ ...prev, kegiatanPembelajaran: { ...prev.kegiatanPembelajaran, inti: { ...prev.kegiatanPembelajaran.inti, durasi: e.target.value } } }))}
                            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 outline-none w-28 text-center focus:border-emerald-500 transition-all"
                            placeholder="Durasi"
                          />
                        </div>
                        <textarea 
                          value={formData.kegiatanPembelajaran.inti.deskripsi}
                          onChange={(e) => setFormData(prev => ({ ...prev, kegiatanPembelajaran: { ...prev.kegiatanPembelajaran, inti: { ...prev.kegiatanPembelajaran.inti, deskripsi: e.target.value } } }))}
                          rows={8}
                          className="w-full p-4 bg-slate-950 border border-slate-850 rounded-2xl outline-none text-xs font-semibold text-slate-300 placeholder-slate-600 focus:border-emerald-500/60 leading-relaxed transition-all"
                          placeholder="Rincian skenario tahap Memahami, Mengaplikasi, dan Merefleksi secara kolaboratif dan terdiferensiasi..."
                        />
                      </div>

                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-slate-200 flex items-center gap-2.5 text-xs">
                            <div className="w-6 h-6 bg-rose-500/15 border border-rose-500/20 text-rose-400 rounded-lg flex items-center justify-center text-[10px] font-bold">3</div>
                            Penutup (Refleksi &amp; Penguatan Nilai)
                          </h4>
                          <input 
                            type="text" 
                            value={formData.kegiatanPembelajaran.penutup.durasi}
                            onChange={(e) => setFormData(prev => ({ ...prev, kegiatanPembelajaran: { ...prev.kegiatanPembelajaran, penutup: { ...prev.kegiatanPembelajaran.penutup, durasi: e.target.value } } }))}
                            className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs font-bold text-slate-200 outline-none w-28 text-center focus:border-emerald-500 transition-all"
                            placeholder="Durasi"
                          />
                        </div>
                        <textarea 
                          value={formData.kegiatanPembelajaran.penutup.deskripsi}
                          onChange={(e) => setFormData(prev => ({ ...prev, kegiatanPembelajaran: { ...prev.kegiatanPembelajaran, penutup: { ...prev.kegiatanPembelajaran.penutup, deskripsi: e.target.value } } }))}
                          rows={4}
                          className="w-full p-4 bg-slate-950 border border-slate-850 rounded-2xl outline-none text-xs font-semibold text-slate-300 placeholder-slate-600 focus:border-emerald-500/60 leading-relaxed transition-all"
                          placeholder="Kesimpulan bersama, refleksi diri murid, penguatan hikmah ayat Al-Qur'an, tindak lanjut, do'a penutup..."
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'K' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="K. ASESMEN DAN PENILAIAN" desc="Sistem evaluasi perkembangan kompetensi kognitif dan sikap" />
                    
                    <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Asesmen Diagnostik">
                        <textarea 
                          value={formData.asesmen.diagnostik} 
                          onChange={(e) => setFormData(prev => ({ ...prev, asesmen: { ...prev.asesmen, diagnostik: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                          placeholder="Evaluasi minat dan kesiapan sebelum belajar..."
                        />
                      </InputGroup>
                      <InputGroup label="Asesmen Formatif">
                        <textarea 
                          value={formData.asesmen.formatif} 
                          onChange={(e) => setFormData(prev => ({ ...prev, asesmen: { ...prev.asesmen, formatif: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                          placeholder="Observasi unjuk kerja & LKPD selama proses kelas..."
                        />
                      </InputGroup>
                      <InputGroup label="Asesmen Sumatif">
                        <textarea 
                          value={formData.asesmen.sumatif} 
                          onChange={(e) => setFormData(prev => ({ ...prev, asesmen: { ...prev.asesmen, sumatif: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                          placeholder="Ujian tertulis atau proyek akhir kompetensi..."
                        />
                      </InputGroup>
                      <InputGroup label="Teknik Asesmen">
                        <input 
                          type="text" 
                          value={formData.asesmen.teknik} 
                          onChange={(e) => setFormData(prev => ({ ...prev, asesmen: { ...prev.asesmen, teknik: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                        />
                      </InputGroup>
                      <InputGroup label="Instrumen Penilaian">
                        <input 
                          type="text" 
                          value={formData.asesmen.instrumen} 
                          onChange={(e) => setFormData(prev => ({ ...prev, asesmen: { ...prev.asesmen, instrumen: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                        />
                      </InputGroup>
                      <InputGroup label="Kriteria Penilaian / Rubrik">
                        <textarea 
                          value={formData.asesmen.kriteriaPenilaian} 
                          onChange={(e) => setFormData(prev => ({ ...prev, asesmen: { ...prev.asesmen, kriteriaPenilaian: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                          placeholder="Nilai kriteria ketercapaian minimal..."
                        />
                      </InputGroup>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'L' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="L. DIFERENSIASI PEMBELAJARAN" desc="Penerapan pembelajaran berdiferensiasi untuk mengakomodasi kebutuhan murid" />
                    <div className="space-y-4">
                      <InputGroup label="Diferensiasi Konten">
                        <textarea 
                          value={formData.diferensiasi.konten}
                          onChange={(e) => setFormData(prev => ({ ...prev, diferensiasi: { ...prev.diferensiasi, konten: e.target.value } }))}
                          className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600 resize-none"
                          placeholder="Variasi bahan ajar sesuai kesiapan belajar (gambar, video, modul)..."
                        />
                      </InputGroup>
                      <InputGroup label="Diferensiasi Proses">
                        <textarea 
                          value={formData.diferensiasi.proses}
                          onChange={(e) => setFormData(prev => ({ ...prev, diferensiasi: { ...prev.diferensiasi, proses: e.target.value } }))}
                          className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600 resize-none"
                          placeholder="Bimbingan bertahap (scaffolding) atau penugasan mandiri terarah..."
                        />
                      </InputGroup>
                      <InputGroup label="Diferensiasi Produk">
                        <textarea 
                          value={formData.diferensiasi.produk}
                          onChange={(e) => setFormData(prev => ({ ...prev, diferensiasi: { ...prev.diferensiasi, produk: e.target.value } }))}
                          className="w-full p-4 bg-slate-900 border border-slate-800 rounded-2xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600 resize-none"
                          placeholder="Kebebasan menentukan format hasil karya (laporan tertulis, infografis, audio)..."
                        />
                      </InputGroup>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'M-N' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="M & N. REMEDIAL DAN PENGAYAAN" desc="Langkah pembinaan bagi murid yang tertinggal maupun yang butuh pengayaan" />
                    <div className="space-y-6">
                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-slate-200 text-xs">M. Program Remedial</h4>
                        <textarea 
                          value={formData.remedial}
                          onChange={(e) => setFormData(prev => ({ ...prev, remedial: e.target.value }))}
                          rows={4}
                          className="w-full p-4 bg-slate-950 border border-slate-850 rounded-2xl text-slate-100 text-xs font-semibold outline-none placeholder-slate-600 focus:border-emerald-500/60 leading-relaxed transition-all resize-none"
                          placeholder="Bimbingan ulang konsep inti, penyederhanaan latihan soal cerita, tutor sebaya..."
                        />
                      </div>
                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-slate-200 text-xs">N. Program Pengayaan</h4>
                        <textarea 
                          value={formData.pengayaan}
                          onChange={(e) => setFormData(prev => ({ ...prev, pengayaan: e.target.value }))}
                          rows={4}
                          className="w-full p-4 bg-slate-950 border border-slate-850 rounded-2xl text-slate-100 text-xs font-semibold outline-none placeholder-slate-600 focus:border-emerald-500/60 leading-relaxed transition-all resize-none"
                          placeholder="Pemberian analisis kasus nyata skala luas, tantangan memimpin kelompok diskusi..."
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'O-P' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="O & P. REFLEKSI GURU DAN MURID" desc="Evaluasi mendalam pasca-kegiatan pembelajaran" />
                    <div className="space-y-6">
                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-slate-200 text-xs">O. Refleksi Guru</h4>
                        <textarea 
                          value={formData.refleksiGuru}
                          onChange={(e) => setFormData(prev => ({ ...prev, refleksiGuru: e.target.value }))}
                          rows={4}
                          className="w-full p-4 bg-slate-950 border border-slate-850 rounded-2xl text-slate-100 text-xs font-semibold outline-none placeholder-slate-600 focus:border-emerald-500/60 leading-relaxed transition-all resize-none"
                          placeholder="Sejauh mana tujuan tercapai? Apa kendala utama? Perbaikan apa untuk kelas berikutnya?..."
                        />
                      </div>
                      <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-3">
                        <h4 className="font-bold text-slate-200 text-xs">P. Refleksi Peserta Didik</h4>
                        <textarea 
                          value={formData.refleksiPesertaDidik}
                          onChange={(e) => setFormData(prev => ({ ...prev, refleksiPesertaDidik: e.target.value }))}
                          rows={4}
                          className="w-full p-4 bg-slate-950 border border-slate-850 rounded-2xl text-slate-100 text-xs font-semibold outline-none placeholder-slate-600 focus:border-emerald-500/60 leading-relaxed transition-all resize-none"
                          placeholder="Materi apa yang paling menantang atau menarik? Hambatan apa yang kamu hadapi?..."
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeSection === 'Q' && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                    <SectionTitle title="Q. LAMPIRAN MODUL" desc="Lampiran kelengkapan administrasi dan bahan pendukung" />
                    <div className="grid grid-cols-1 gap-4">
                      <InputGroup label="LKPD (Lembar Kerja Peserta Didik)">
                        <textarea 
                          value={formData.lampiran.lkpd} 
                          onChange={(e) => setFormData(prev => ({ ...prev, lampiran: { ...prev.lampiran, lkpd: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                          placeholder="Tugas latihan mandiri atau penugasan kelompok..."
                        />
                      </InputGroup>
                      <InputGroup label="Bahan Bacaan Guru & Peserta Didik">
                        <textarea 
                          value={formData.lampiran.bahanBacaan} 
                          onChange={(e) => setFormData(prev => ({ ...prev, lampiran: { ...prev.lampiran, bahanBacaan: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                          placeholder="Uraian ringkas materi esensial..."
                        />
                      </InputGroup>
                      <InputGroup label="Rubrik Penilaian Detail">
                        <textarea 
                          value={formData.lampiran.rubrik} 
                          onChange={(e) => setFormData(prev => ({ ...prev, lampiran: { ...prev.lampiran, rubrik: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                        />
                      </InputGroup>
                      <InputGroup label="Daftar Pustaka">
                        <textarea 
                          value={formData.lampiran.daftarPustaka} 
                          onChange={(e) => setFormData(prev => ({ ...prev, lampiran: { ...prev.lampiran, daftarPustaka: e.target.value } }))}
                          className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 text-xs font-semibold outline-none focus:border-emerald-500 transition-all placeholder-slate-600"
                          placeholder="Buku acuan, jurnal, atau portal website rujukan..."
                        />
                      </InputGroup>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div className="flex items-center justify-between pt-10 border-t border-slate-800">
                <button 
                  onClick={() => {
                    const idx = sections.findIndex(s => s.id === activeSection);
                    if (idx > 0) setActiveSection(sections[idx - 1].id);
                  }}
                  disabled={activeSection === 'A'}
                  className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 border border-slate-800 text-slate-300 font-bold rounded-2xl hover:bg-slate-850 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs"
                >
                  Sebelumnya
                </button>
                <button 
                  onClick={() => {
                    const idx = sections.findIndex(s => s.id === activeSection);
                    if (idx < sections.length - 1) setActiveSection(sections[idx + 1].id);
                    else onSave(formData);
                  }}
                  className="flex items-center gap-2 px-8 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-2xl transition-all text-xs shadow-lg shadow-emerald-500/5"
                >
                  {activeSection === 'Q' ? 'Simpan & Selesai' : 'Berikutnya'}
                </button>
              </div>

            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const SectionTitle = ({ title, desc }: { title: string; desc: string }) => (
  <div className="space-y-1">
    <h3 className="text-base font-black text-slate-100">{title}</h3>
    <p className="text-xs text-slate-400 leading-relaxed">{desc}</p>
  </div>
);

const InputGroup = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</label>
    {children}
  </div>
);
