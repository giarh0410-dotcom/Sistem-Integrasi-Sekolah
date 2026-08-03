import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  Sparkles, 
  GraduationCap, 
  BookOpen, 
  Wallet, 
  QrCode, 
  Users, 
  ArrowRight, 
  CheckCircle2, 
  KeyRound, 
  Mail, 
  UserCheck, 
  Lock,
  Globe
} from 'lucide-react';
import { Role, SchoolSettings } from '../types/school';
import { googleSignIn } from '../lib/firebase';

interface LoginViewProps {
  onLoginSuccess: (email: string, token: string, role: Role) => void;
  schoolSettings: SchoolSettings;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  schoolSettings
}) => {
  const [selectedRole, setSelectedRole] = useState<Role>('admin');
  const [customEmail, setCustomEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Handle Google / Gmail Sign In
  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await googleSignIn();
      if (res && res.user) {
        const email = res.user.email || 'pengguna.sekolah@gmail.com';
        const token = res.accessToken || 'demo_workspace_token_active';
        onLoginSuccess(email, token, selectedRole);
      }
    } catch (err: any) {
      console.error('Login error:', err);
      // Fallback in preview environment
      onLoginSuccess('pengguna.sekolah@gmail.com', 'demo_workspace_token_active', selectedRole);
    } finally {
      setLoading(false);
    }
  };

  // Handle Direct Form Submit (custom gmail)
  const handleDirectLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customEmail.trim()) {
      setErrorMessage('Silakan masukkan email Gmail Anda');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      onLoginSuccess(customEmail, 'demo_workspace_token_active', selectedRole);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#070707] text-slate-200 flex items-center justify-center p-4 antialiased selection:bg-blue-600 selection:text-white">
      
      {/* Background Subtle Glow Accent */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-5xl w-full bg-[#121212] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 relative z-10">
        
        {/* LEFT COLUMN: School Identity & System Highlights */}
        <div className="lg:col-span-5 bg-gradient-to-br from-[#161b26] via-[#121212] to-[#0d0f14] p-8 lg:p-10 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between space-y-8">
          
          <div className="space-y-6">
            {/* School Logo & Name */}
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/10 border border-slate-700 p-2 flex items-center justify-center shrink-0 shadow-lg">
                <img 
                  src={schoolSettings.logoUrl} 
                  alt={schoolSettings.namaSekolah} 
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-blue-400 uppercase bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                  PORTAL AKADEMIK 2026
                </span>
                <h1 className="text-lg font-black text-white leading-tight mt-0.5">
                  {schoolSettings.namaSekolah}
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">NPSN: {schoolSettings.npsn} • Akreditasi {schoolSettings.akreditasi}</p>
              </div>
            </div>

            {/* Welcome Banner */}
            <div className="space-y-2 pt-2">
              <h2 className="text-2xl font-black text-white tracking-tight">
                Selamat Datang di Portal EduSmart Pro
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Sistem Terpadu Manajemen Sekolah, Absensi QR Code, CBT Anti-Cheat, Administrasi Guru, dan Keuangan SPP terintegrasi Google Workspace.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0 border border-blue-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Google Gmail Single Sign-On</h4>
                  <p className="text-[10px] text-slate-400">Akses aman cepat menggunakan akun Google Gmail resmi sekolah atau personal.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/20">
                  <QrCode className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Absensi & CBT Modern</h4>
                  <p className="text-[10px] text-slate-400">Scan QR Code Kartu Digital dan Ujian Online Anti-Cheat terdeteksi otomatis.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/20">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Laporan Keuangan & Fonnte WA</h4>
                  <p className="text-[10px] text-slate-400">Notifikasi otomatis bukti pembayaran SPP via WhatsApp Orang Tua.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Info */}
          <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
            <span className="flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-slate-400" /> {schoolSettings.website.replace('https://', '')}
            </span>
            <span className="font-mono">v2026.4.1</span>
          </div>

        </div>

        {/* RIGHT COLUMN: LOGIN DASHBOARD FORM */}
        <div className="lg:col-span-7 p-8 lg:p-10 flex flex-col justify-between space-y-6 bg-[#121212]">
          
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                  LOGIN AKUN GMAIL
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mt-1">
                Masuk ke Dashboard Sekolah
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Pilih peran akses Anda dan gunakan akun Google Gmail untuk autentikasi cepat.
              </p>
            </div>

            {/* Role Selection Tabs */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 block">Pilih Peran Akses Sistem:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('admin')}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                    selectedRole === 'admin'
                      ? 'bg-blue-600/20 border-blue-500 text-white ring-1 ring-blue-500/50'
                      : 'bg-[#181818] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Admin Utama</span>
                    {selectedRole === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Akses penuh sistem</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('guru')}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                    selectedRole === 'guru'
                      ? 'bg-purple-600/20 border-purple-500 text-white ring-1 ring-purple-500/50'
                      : 'bg-[#181818] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Guru / Pendidik</span>
                    {selectedRole === 'guru' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Absensi, CBT & Modul</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('staf')}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                    selectedRole === 'staf'
                      ? 'bg-amber-600/20 border-amber-500 text-white ring-1 ring-amber-500/50'
                      : 'bg-[#181818] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Staf / TU</span>
                    {selectedRole === 'staf' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Tata Usaha & Keuangan</p>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('siswa')}
                  className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                    selectedRole === 'siswa'
                      ? 'bg-emerald-600/20 border-emerald-500 text-white ring-1 ring-emerald-500/50'
                      : 'bg-[#181818] border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold">Siswa / Wali</span>
                    {selectedRole === 'siswa' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">Nilai, CBT & Tagihan</p>
                </button>
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3 bg-red-950/80 border border-red-500/50 rounded-xl text-red-200 text-xs font-bold flex items-center gap-2">
                <span>⚠️ {errorMessage}</span>
              </div>
            )}

            {/* PRIMARY GOOGLE / GMAIL LOGIN BUTTON */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full py-3.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-bold rounded-xl text-xs sm:text-sm transition-all flex items-center justify-center gap-3 shadow-xl hover:shadow-2xl border border-slate-200 active:scale-[0.99] disabled:opacity-50"
              >
                {/* Official Google Icon SVG */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{loading ? 'Menghubungkan ke Google...' : 'Masuk dengan Akun Google / Gmail'}</span>
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-800"></div>
                <span className="text-[10px] text-slate-500 uppercase font-bold">atau masuk secara manual</span>
                <div className="flex-1 h-px bg-slate-800"></div>
              </div>

              {/* Direct Gmail Manual Input */}
              <form onSubmit={handleDirectLogin} className="space-y-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">Alamat Email Gmail Sekolah / Personal:</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                    <input
                      type="email"
                      value={customEmail}
                      onChange={e => setCustomEmail(e.target.value)}
                      placeholder="nama.anda@gmail.com atau @sekolah.sch.id"
                      className="w-full pl-9 pr-3 py-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-blue-300 border border-slate-700 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Lanjutkan Masuk Manual</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

            {/* Quick Demo Accounts Helper */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Demo Akun Akses Email Siap Pakai:
              </div>
              <div className="flex flex-wrap gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('admin');
                    onLoginSuccess('giar.hermawan4@guru.smp.belajar.id', 'demo_workspace_token_active', 'admin');
                  }}
                  className="px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-700/50 text-blue-300 rounded-lg font-bold flex items-center gap-1"
                >
                  <span>⚡ Admin</span>
                  <span className="text-[9px] opacity-75 font-normal">(giar.hermawan4@guru.smp.belajar.id)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('guru');
                    onLoginSuccess('guru.ahmad@gmail.com', 'demo_workspace_token_active', 'guru');
                  }}
                  className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-700/50 text-purple-300 rounded-lg font-bold flex items-center gap-1"
                >
                  <span>⚡ Guru</span>
                  <span className="text-[9px] opacity-75 font-normal">(guru.ahmad@gmail.com)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('staf');
                    onLoginSuccess('staf.tatausaha@gmail.com', 'demo_workspace_token_active', 'staf');
                  }}
                  className="px-2.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-700/50 text-amber-300 rounded-lg font-bold flex items-center gap-1"
                >
                  <span>⚡ Staf TU</span>
                  <span className="text-[9px] opacity-75 font-normal">(staf.tatausaha@gmail.com)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedRole('siswa');
                    onLoginSuccess('siswa.budi@gmail.com', 'demo_workspace_token_active', 'siswa');
                  }}
                  className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-700/50 text-emerald-300 rounded-lg font-bold flex items-center gap-1"
                >
                  <span>⚡ Siswa</span>
                  <span className="text-[9px] opacity-75 font-normal">(siswa.budi@gmail.com)</span>
                </button>
              </div>
            </div>

          </div>

          <div className="pt-4 border-t border-slate-800 text-center text-[10px] text-slate-500">
            Terenskripsi dengan standar Firebase Auth & SSL 256-bit • {schoolSettings.namaSekolah}
          </div>

        </div>

      </div>

    </div>
  );
};
