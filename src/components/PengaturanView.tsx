import React, { useState, useRef } from 'react';
import { 
  Building2, 
  Image as ImageIcon, 
  Upload, 
  Save, 
  CheckCircle2, 
  RotateCcw, 
  Sparkles, 
  School, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  UserCheck, 
  Award, 
  Calendar,
  CreditCard,
  Laptop,
  Check,
  FileText,
  Cloud,
  Loader2,
  LogIn,
  ExternalLink,
  ShieldAlert,
  AlertCircle,
  Database,
  RefreshCw
} from 'lucide-react';
import { SchoolSettings, Siswa, Guru, Staf, RombelKelas, MataPelajaranItem, AbsensiSiswaHarian, AbsensiSiswaKelas } from '../types/school';
import { exportAllToGoogleSheets } from '../lib/googleDriveSync';
import { googleSignIn, googleSignOut } from '../lib/firebase';

interface PengaturanViewProps {
  schoolSettings: SchoolSettings;
  setSchoolSettings: React.Dispatch<React.SetStateAction<SchoolSettings>>;
  currentRole?: string;
  userGoogleToken?: string;
  setUserGoogleToken?: (token: string) => void;
  userEmail?: string;
  setUserEmail?: (email: string) => void;
  siswaList?: Siswa[];
  guruList?: Guru[];
  stafList?: Staf[];
  rombelList?: RombelKelas[];
  mapelList?: MataPelajaranItem[];
  absensiHarian?: AbsensiSiswaHarian[];
  absensiKelasList?: AbsensiSiswaKelas[];
}

export const PengaturanView: React.FC<PengaturanViewProps> = ({
  schoolSettings,
  setSchoolSettings,
  currentRole,
  userGoogleToken,
  setUserGoogleToken,
  userEmail,
  setUserEmail,
  siswaList,
  guruList,
  stafList,
  rombelList,
  mapelList,
  absensiHarian,
  absensiKelasList
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'identitas' | 'logo' | 'google_drive'>('identitas');
  const [formData, setFormData] = useState<SchoolSettings>({ ...schoolSettings });
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSyncingManual, setIsSyncingManual] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal form state when prop settings change
  React.useEffect(() => {
    setFormData({ ...schoolSettings });
  }, [schoolSettings]);

  if (currentRole !== 'admin') {
    return (
      <div className="bg-[#121212] border border-red-950/50 rounded-2xl p-10 text-center max-w-xl mx-auto space-y-6 my-16 shadow-2xl">
        <div className="w-16 h-16 rounded-full bg-red-950/40 text-red-500 flex items-center justify-center mx-auto border border-red-900/40">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold text-white">Akses Terbatas: Hanya Admin</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Halaman pengaturan sistem, identitas sekolah, dan konfigurasi sinkronisasi Google Drive hanya diperuntukkan bagi akun dengan peran **ADMIN**.
          </p>
        </div>
        <div className="pt-2">
          <p className="text-[10px] text-slate-500">
            Peran Anda saat ini: <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-bold uppercase">{currentRole || 'Siswa'}</span>
          </p>
        </div>
      </div>
    );
  }

  // Preset Logos List
  const presetLogos = [
    {
      id: 'tutwuri',
      nama: 'Tut Wuri Handayani (Kemendikdasmen)',
      url: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80',
      tag: 'Kementerian'
    },
    {
      id: 'shield_gold',
      nama: 'Perisai Gold Pendidikan',
      url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?w=150&auto=format&fit=crop&q=80',
      tag: 'Prestasi'
    },
    {
      id: 'torch_blue',
      nama: 'Obor Cendekia Biru',
      url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=150&auto=format&fit=crop&q=80',
      tag: 'Akademik'
    },
    {
      id: 'crest_emerald',
      nama: 'Emblem Hijau Islami/Modren',
      url: 'https://images.unsplash.com/photo-1562774053-701939374585?w=150&auto=format&fit=crop&q=80',
      tag: 'Nasional'
    }
  ];

  const handleInputChange = (field: keyof SchoolSettings, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSchoolSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Mohon pilih file gambar yang valid (PNG, JPG, WEBP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64Url = event.target?.result as string;
      if (base64Url) {
        setFormData(prev => ({ ...prev, logoUrl: base64Url }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogo = () => {
    setFormData(prev => ({
      ...prev,
      logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=150&auto=format&fit=crop&q=80'
    }));
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Navigation Banner */}
      <div className="bg-[#121212] rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-wider border border-blue-500/30">
              SISTEM MASTER DATA
            </span>
          </div>
          <h2 className="text-xl font-bold text-white mt-1 flex items-center gap-2">
            <Building2 className="w-6 h-6 text-blue-500" /> Pengaturan Identitas & Logo Sekolah
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Kelola profil resmi sekolah, alamat, kepala sekolah, serta logo yang otomatis muncul pada KOP surat, kartu ujian, dan laporan CBT.
          </p>
        </div>

        {/* Subtab Toggle Buttons */}
        <div className="flex items-center bg-[#181818] p-1 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveSubTab('identitas')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'identitas'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <School className="w-4 h-4" /> Identitas Sekolah
          </button>
          <button
            onClick={() => setActiveSubTab('logo')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'logo'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ImageIcon className="w-4 h-4" /> Logo Sekolah
          </button>
          <button
            onClick={() => setActiveSubTab('google_drive')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'google_drive'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4" /> Google Drive & Auto-Sync
          </button>
        </div>
      </div>

      {/* Save Success Toast Banner */}
      {savedSuccess && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center justify-between gap-3 shadow-xl animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>Berhasil menyimpan Pengaturan Identitas & Logo Sekolah! Seluruh dokumen resmi otomatis terintegrasi.</span>
          </div>
          <button onClick={() => setSavedSuccess(false)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* SUBTAB 1: IDENTITAS SEKOLAH FORM */}
      {activeSubTab === 'identitas' && (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            
            {/* Section 1: Profil Utama */}
            <div>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
                <School className="w-4 h-4" /> Profil Utama Sekolah
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nama Resmi Sekolah / Satuan Pendidikan *</label>
                  <input
                    type="text"
                    required
                    value={formData.namaSekolah}
                    onChange={e => handleInputChange('namaSekolah', e.target.value)}
                    placeholder="Contoh: SMA PERMATA BANGSA"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">NPSN (Nomor Pokok Sekolah Nasional) *</label>
                  <input
                    type="text"
                    required
                    value={formData.npsn}
                    onChange={e => handleInputChange('npsn', e.target.value)}
                    placeholder="Contoh: 20109876"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Bentuk Pendidikan</label>
                  <select
                    value={formData.bentukPendidikan}
                    onChange={e => handleInputChange('bentukPendidikan', e.target.value)}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="SMA">SMA (Sekolah Menengah Atas)</option>
                    <option value="SMK">SMK (Sekolah Menengah Kejuruan)</option>
                    <option value="MA">MA (Madrasah Aliyah)</option>
                    <option value="SMP">SMP (Sekolah Menengah Pertama)</option>
                    <option value="MTs">MTs (Madrasah Tsanawiyah)</option>
                    <option value="SD">SD / MI</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Status Sekolah</label>
                  <select
                    value={formData.statusSekolah}
                    onChange={e => handleInputChange('statusSekolah', e.target.value)}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Swasta">Swasta</option>
                    <option value="Negeri">Negeri</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Status Akreditasi</label>
                  <input
                    type="text"
                    value={formData.akreditasi}
                    onChange={e => handleInputChange('akreditasi', e.target.value)}
                    placeholder="A (Unggul)"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Alamat & Kontak */}
            <div>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
                <MapPin className="w-4 h-4" /> Alamat & Kontak Resmi
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">Jalan / Alamat Lengkap *</label>
                  <input
                    type="text"
                    required
                    value={formData.alamat}
                    onChange={e => handleInputChange('alamat', e.target.value)}
                    placeholder="Jl. Education No. 123"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">RT / RW</label>
                  <input
                    type="text"
                    value={formData.rtRw}
                    onChange={e => handleInputChange('rtRw', e.target.value)}
                    placeholder="005 / 002"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kelurahan / Desa</label>
                  <input
                    type="text"
                    value={formData.kelurahan}
                    onChange={e => handleInputChange('kelurahan', e.target.value)}
                    placeholder="Kebayoran Baru"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kecamatan</label>
                  <input
                    type="text"
                    value={formData.kecamatan}
                    onChange={e => handleInputChange('kecamatan', e.target.value)}
                    placeholder="Kebayoran Baru"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kota / Kabupaten</label>
                  <input
                    type="text"
                    value={formData.kotaKabupaten}
                    onChange={e => handleInputChange('kotaKabupaten', e.target.value)}
                    placeholder="Kota Jakarta Selatan"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Provinsi</label>
                  <input
                    type="text"
                    value={formData.provinsi}
                    onChange={e => handleInputChange('provinsi', e.target.value)}
                    placeholder="DKI Jakarta"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Kode Pos</label>
                  <input
                    type="text"
                    value={formData.kodePos}
                    onChange={e => handleInputChange('kodePos', e.target.value)}
                    placeholder="12110"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nomor Telepon / WA Center</label>
                  <input
                    type="text"
                    value={formData.telepon}
                    onChange={e => handleInputChange('telepon', e.target.value)}
                    placeholder="(021) 555-0199"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Email Resmi Sekolah</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={e => handleInputChange('email', e.target.value)}
                    placeholder="info@permatabangsa.sch.id"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Website Sekolah</label>
                  <input
                    type="text"
                    value={formData.website}
                    onChange={e => handleInputChange('website', e.target.value)}
                    placeholder="https://permatabangsa.sch.id"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Pimpinan & Tahun Ajaran */}
            <div>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 mb-4">
                <UserCheck className="w-4 h-4" /> Pimpinan Sekolah & Tahun Ajaran
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nama Kepala Sekolah (Lengkap Gelar)</label>
                  <input
                    type="text"
                    value={formData.kepalaSekolah}
                    onChange={e => handleInputChange('kepalaSekolah', e.target.value)}
                    placeholder="Dr. H. Ahmad Dahlan, M.Pd."
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">NUPTK Kepala Sekolah</label>
                  <input
                    type="text"
                    value={formData.nipKepalaSekolah}
                    onChange={e => handleInputChange('nipKepalaSekolah', e.target.value)}
                    placeholder="197501152000031001"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Tahun Ajaran Aktif</label>
                  <input
                    type="text"
                    value={formData.tahunAjaran}
                    onChange={e => handleInputChange('tahunAjaran', e.target.value)}
                    placeholder="2026/2027"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Semester Aktif</label>
                  <select
                    value={formData.semesterAktif}
                    onChange={e => handleInputChange('semesterAktif', e.target.value)}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Ganjil">Semester Ganjil</option>
                    <option value="Genap">Semester Genap</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Nama Kasir (Untuk Kuitansi)</label>
                  <input
                    type="text"
                    value={formData.namaKasir || ''}
                    onChange={e => handleInputChange('namaKasir', e.target.value)}
                    placeholder="Contoh: Bendahara TU"
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bottom Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <Save className="w-4 h-4" /> Simpan Identitas Sekolah
              </button>
            </div>

          </div>
        </form>
      )}

      {/* SUBTAB 2: GANTI LOGO SEKOLAH */}
      {activeSubTab === 'logo' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Upload & Options */}
          <div className="lg:col-span-2 bg-[#121212] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            
            <div>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                <Upload className="w-4 h-4" /> Upload Logo Baru Sekolah
              </h3>
              <p className="text-xs text-slate-400 mb-4">
                Unggah gambar logo sekolah dari komputer/HP Anda. Format yang didukung: PNG, JPG, WEBP, atau SVG.
              </p>

              {/* Hidden File Input */}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="image/*"
                className="hidden"
              />

              {/* Dropzone Container */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-blue-500 bg-[#181818] hover:bg-slate-800/60 rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3 group"
              >
                <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/30 rounded-2xl flex items-center justify-center mx-auto text-blue-400 group-hover:scale-110 transition-all">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Klik untuk Pilih Gambar Logo dari Perangkat</p>
                  <p className="text-[10px] text-slate-500 mt-1">Disarankan gambar berlatar transparan (.PNG) ukuran persegi (1:1)</p>
                </div>
              </div>
            </div>

            {/* Custom URL Option */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-bold text-slate-300 block">Atau Masukkan URL Gambar Logo Online:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.logoUrl}
                  onChange={e => handleInputChange('logoUrl', e.target.value)}
                  placeholder="https://domain-sekolah.sch.id/logo.png"
                  className="flex-1 p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleResetLogo}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all border border-slate-700 shrink-0"
                  title="Kembalikan Logo Default"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            </div>

            {/* Preset Logos Library */}
            <div className="pt-2 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Pilihan Preset Logo Standar Pendidikan
              </h4>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {presetLogos.map(preset => {
                  const isSelected = formData.logoUrl === preset.url;
                  return (
                    <div
                      key={preset.id}
                      onClick={() => setFormData(prev => ({ ...prev, logoUrl: preset.url }))}
                      className={`p-3 bg-[#181818] rounded-xl border cursor-pointer transition-all space-y-2 relative group text-center ${
                        isSelected
                          ? 'border-blue-500 bg-blue-950/20 ring-2 ring-blue-500/40'
                          : 'border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px]">
                          ✓
                        </span>
                      )}
                      <img
                        src={preset.url}
                        alt={preset.nama}
                        className="w-12 h-12 object-contain mx-auto rounded-lg bg-white/10 p-1"
                      />
                      <div>
                        <div className="text-[11px] font-bold text-white line-clamp-1">{preset.nama}</div>
                        <span className="text-[9px] text-slate-500 uppercase font-semibold block mt-0.5">{preset.tag}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-lg shadow-blue-600/30"
              >
                <Save className="w-4 h-4" /> Simpan Perubahan Logo
              </button>
            </div>

          </div>

          {/* Right Column: Live Preview Cards */}
          <div className="space-y-4">
            <div className="bg-[#121212] border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2">
                <Sparkles className="w-4 h-4 text-amber-400" /> Live Preview Logo Sekolah
              </h3>

              {/* Header Preview */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">1. Tampilan Header Aplikasi:</span>
                <div className="p-3 bg-[#0A0A0A] rounded-xl border border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 border border-slate-700 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                    <img src={formData.logoUrl} alt="Logo Preview" className="w-full h-full object-contain" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase">{formData.namaSekolah}</h4>
                    <p className="text-[9px] text-slate-500">NPSN: {formData.npsn} • Akreditasi {formData.akreditasi}</p>
                  </div>
                </div>
              </div>

              {/* Student Card Preview */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">2. Tampilan KOP Kartu Peserta Ujian:</span>
                <div className="p-3 bg-white text-slate-900 rounded-xl border border-slate-300 space-y-2">
                  <div className="flex items-center gap-2.5 border-b border-slate-300 pb-2">
                    <img src={formData.logoUrl} alt="Logo Kartu" className="w-8 h-8 object-contain shrink-0" />
                    <div>
                      <h5 className="text-[11px] font-black uppercase leading-tight">{formData.namaSekolah}</h5>
                      <p className="text-[8px] font-bold text-slate-600">KARTU UJIAN CBT • T.A {formData.tahunAjaran}</p>
                    </div>
                  </div>
                  <div className="text-[9px] text-slate-600 flex justify-between font-mono">
                    <span>Siswa: Ahmad Rizky</span>
                    <span>Kelas: X-IPA-1</span>
                  </div>
                </div>
              </div>

              {/* Print Document Preview */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-500 font-bold uppercase">3. Tampilan Dokumen Modul / KOP Surat:</span>
                <div className="p-3 bg-slate-100 text-slate-900 rounded-xl border border-slate-300 text-center space-y-1">
                  <img src={formData.logoUrl} alt="Logo Doc" className="w-7 h-7 object-contain mx-auto" />
                  <h6 className="text-[10px] font-extrabold uppercase tracking-wide leading-tight">{formData.namaSekolah}</h6>
                  <p className="text-[8px] text-slate-600">{formData.alamat} • Telp: {formData.telepon}</p>
                </div>
              </div>

            </div>
          </div>

        </div>
      )}

      {activeSubTab === 'google_drive' && (
        <div className="space-y-6">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
            <div>
              <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                <Cloud className="w-4 h-4" /> Integrasi & Auto-Sync Google Drive
              </h3>
              <p className="text-xs text-slate-400">
                Hubungkan sistem informasi sekolah dengan Google Drive Anda. Setiap ada perubahan data siswa atau data sekolah lainnya, sistem akan secara otomatis mensinkronkan data tersebut ke file Google Sheets di Drive Anda secara aman.
              </p>
            </div>

            {/* Sync Configuration Panel */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Account Authorization Card */}
              <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">1. Akun Google Tersambung</span>
                  {schoolSettings.googleSyncEmail ? (
                    <div className="flex items-center gap-3 p-3 bg-blue-950/20 border border-blue-500/20 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400">
                        <Check className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{schoolSettings.googleSyncEmail}</p>
                        <p className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> Google Drive Terhubung
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 bg-amber-950/10 border border-amber-500/20 rounded-xl">
                      <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
                        <AlertCircle className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">Akun Belum Terhubung</p>
                        <p className="text-[10px] text-slate-500">Hubungkan akun Gmail Anda untuk mengaktifkan sinkronisasi otomatis.</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="pt-2">
                  {schoolSettings.googleSyncEmail ? (
                    <button
                      type="button"
                      onClick={async () => {
                        const confirmed = window.confirm('Apakah Anda yakin ingin memutuskan sambungan Google Drive?');
                        if (!confirmed) return;
                        setFormData(prev => ({
                          ...prev,
                          googleSyncEmail: '',
                          googleSyncEnabled: false,
                          googleSyncSpreadsheetId: '',
                          googleSyncSpreadsheetUrl: ''
                        }));
                        setSchoolSettings(prev => ({
                          ...prev,
                          googleSyncEmail: '',
                          googleSyncEnabled: false,
                          googleSyncSpreadsheetId: '',
                          googleSyncSpreadsheetUrl: ''
                        }));
                        if (setUserGoogleToken) setUserGoogleToken('');
                        if (setUserEmail) setUserEmail('');
                        await googleSignOut();
                      }}
                      className="w-full py-2.5 bg-red-950/30 hover:bg-red-950/60 text-red-400 hover:text-red-300 font-bold rounded-xl text-xs transition-all border border-red-500/20"
                    >
                      Putuskan Akun Google
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await googleSignIn();
                          if (res) {
                            const { user, accessToken } = res;
                            setFormData(prev => ({
                              ...prev,
                              googleSyncEmail: user.email || 'pengguna.sekolah@gmail.com',
                              googleSyncEnabled: true
                            }));
                            setSchoolSettings(prev => ({
                              ...prev,
                              googleSyncEmail: user.email || 'pengguna.sekolah@gmail.com',
                              googleSyncEnabled: true
                            }));
                            if (setUserGoogleToken) setUserGoogleToken(accessToken);
                            if (setUserEmail) setUserEmail(user.email || 'pengguna.sekolah@gmail.com');
                          }
                        } catch (e) {
                          alert('Gagal menghubungkan akun Google. Mohon coba lagi.');
                        }
                      }}
                      className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                    >
                      <LogIn className="w-4 h-4" /> Hubungkan Akun Google Drive (Gmail)
                    </button>
                  )}
                </div>
              </div>

              {/* Auto Sync Toggle Card */}
              <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">2. Status Sinkronisasi Otomatis</span>
                  <div className="flex items-center justify-between p-3 bg-[#121212] border border-slate-800 rounded-xl">
                    <div>
                      <h4 className="text-xs font-bold text-white">Auto-Sync Google Drive</h4>
                      <p className="text-[10px] text-slate-500">Sinkronkan data ke Drive secara berkala saat disimpan.</p>
                    </div>
                    <div>
                      <button
                        type="button"
                        disabled={!schoolSettings.googleSyncEmail}
                        onClick={() => {
                          const nextVal = !formData.googleSyncEnabled;
                          setFormData(prev => ({ ...prev, googleSyncEnabled: nextVal }));
                          setSchoolSettings(prev => ({ ...prev, googleSyncEnabled: nextVal }));
                        }}
                        className={`w-12 h-6 rounded-full p-1 transition-colors duration-200 focus:outline-none ${
                          formData.googleSyncEnabled ? 'bg-blue-600' : 'bg-slate-700 opacity-60'
                        } ${!schoolSettings.googleSyncEmail ? 'cursor-not-allowed opacity-40' : ''}`}
                      >
                        <div
                          className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                            formData.googleSyncEnabled ? 'translate-x-6' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500 italic">
                  * Memerlukan akun Google yang terhubung. Ketika diaktifkan, seluruh perubahan data secara otomatis disinkronkan ke dokumen Google Sheets.
                </div>
              </div>
            </div>

            {/* Spreadsheet Sync Info Card */}
            {schoolSettings.googleSyncEmail && (
              <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Database className="w-4 h-4 text-blue-400" /> Dokumen Spreadsheet di Google Drive
                    </h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Spreadsheet berisi seluruh tabel database: Siswa, Guru, Staf, Kelas, Mapel, Absensi, dan Jurnal.
                    </p>
                  </div>

                  {schoolSettings.googleSyncSpreadsheetUrl && (
                    <a
                      href={schoolSettings.googleSyncSpreadsheetUrl}
                      target="_blank"
                      referrerPolicy="no-referrer"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-md shrink-0 self-start sm:self-center"
                    >
                      Buka Spreadsheet <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                  <div className="p-3 bg-[#121212] border border-slate-800 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Tipe File</span>
                    <p className="font-bold text-white">Google Sheets (Spreadsheet)</p>
                  </div>
                  <div className="p-3 bg-[#121212] border border-slate-800 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Sinkronisasi Terakhir</span>
                    <p className="font-bold text-white">{schoolSettings.googleSyncLastTime || 'Belum pernah'}</p>
                  </div>
                  <div className="p-3 bg-[#121212] border border-slate-800 rounded-xl space-y-0.5">
                    <span className="text-[10px] text-slate-500 uppercase font-semibold">Status</span>
                    <p className={`font-bold uppercase ${
                      schoolSettings.googleSyncStatus === 'success' ? 'text-emerald-400' :
                      schoolSettings.googleSyncStatus === 'syncing' ? 'text-blue-400' :
                      schoolSettings.googleSyncStatus === 'failed' ? 'text-red-400' : 'text-slate-400'
                    }`}>
                      {schoolSettings.googleSyncStatus === 'success' ? 'Berhasil' :
                       schoolSettings.googleSyncStatus === 'syncing' ? 'Mensinkronkan...' :
                       schoolSettings.googleSyncStatus === 'failed' ? 'Gagal' : 'Idle'}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={isSyncingManual}
                    onClick={async () => {
                      setIsSyncingManual(true);
                      setSchoolSettings(prev => ({ ...prev, googleSyncStatus: 'syncing' }));
                      try {
                        const syncData = {
                          siswaList: siswaList || [],
                          guruList: guruList || [],
                          stafList: stafList || [],
                          rombelList: rombelList || [],
                          mapelList: mapelList || [],
                          absensiHarian: absensiHarian || [],
                          absensiKelasList: absensiKelasList || []
                        };
                        const res = await exportAllToGoogleSheets(
                          userGoogleToken || 'demo_workspace_token_active',
                          syncData,
                          schoolSettings.googleSyncSpreadsheetId
                        );

                        const nowStr = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
                        if (res.success) {
                          setFormData(prev => ({
                            ...prev,
                            googleSyncSpreadsheetId: res.spreadsheetId || '',
                            googleSyncSpreadsheetUrl: res.url || '',
                            googleSyncLastTime: nowStr,
                            googleSyncStatus: 'success'
                          }));
                          setSchoolSettings(prev => ({
                            ...prev,
                            googleSyncSpreadsheetId: res.spreadsheetId || '',
                            googleSyncSpreadsheetUrl: res.url || '',
                            googleSyncLastTime: nowStr,
                            googleSyncStatus: 'success'
                          }));
                          alert(res.message);
                        } else {
                          setSchoolSettings(prev => ({ ...prev, googleSyncStatus: 'failed' }));
                          alert('Gagal sinkronisasi: ' + res.message);
                        }
                      } catch (e: any) {
                        setSchoolSettings(prev => ({ ...prev, googleSyncStatus: 'failed' }));
                        alert('Error saat sinkronisasi: ' + e.message);
                      } finally {
                        setIsSyncingManual(false);
                      }
                    }}
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shrink-0"
                  >
                    {isSyncingManual ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Mensinkronkan...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" /> Sinkronkan Sekarang
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
};
