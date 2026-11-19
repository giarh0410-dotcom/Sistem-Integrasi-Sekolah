import React, { useState } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  GraduationCap, 
  BookOpen, 
  Wallet, 
  QrCode, 
  Users, 
  CheckCircle2, 
  KeyRound, 
  UserCheck, 
  Lock,
  Globe,
  ArrowRight,
  Eye,
  EyeOff,
  AlertCircle
} from 'lucide-react';
import { Role, SchoolSettings, Guru, Staf, Siswa } from '../types/school';

interface LoginViewProps {
  onLoginSuccess: (email: string, token: string, role: Role) => void;
  onOpenPublicSlip?: (slipId?: string) => void;
  schoolSettings: SchoolSettings;
  guruList?: Guru[];
  stafList?: Staf[];
  siswaList?: Siswa[];
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onOpenPublicSlip,
  schoolSettings,
  guruList = [],
  stafList = [],
  siswaList = []
}) => {
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [selectedRole, setSelectedRole] = useState<Role>('admin');

  // Dynamic demo helpers based on current lists
  const activeStafKeuangan = stafList.find(s => s.bagian === 'Bendahara / Keuangan') || stafList[0];
  const demoStafUser = activeStafKeuangan?.username || 'nurhidayati';
  const demoStafPass = activeStafKeuangan?.password || 'password';

  const activeGuru = guruList[0];
  const demoGuruUser = activeGuru?.username || 'budi';
  const demoGuruPass = activeGuru?.password || 'password123';

  const activeSiswa = siswaList[0];
  const demoSiswaUser = activeSiswa?.username || 'bayu';
  const demoSiswaPass = activeSiswa?.password || 'password123';

  const demoKepsekUser = 'kepsek';
  const demoKepsekPass = 'kepsek123';

  // Quick fill demo accounts helper
  const handleFillDemo = (role: Role) => {
    setSelectedRole(role);
    if (role === 'admin') {
      setEmailInput('admin');
      setPasswordInput('admin');
    } else if (role === 'kepsek') {
      setEmailInput(demoKepsekUser);
      setPasswordInput(demoKepsekPass);
    } else if (role === 'guru') {
      setEmailInput(demoGuruUser);
      setPasswordInput(demoGuruPass);
    } else if (role === 'staf') {
      setEmailInput(demoStafUser);
      setPasswordInput(demoStafPass);
    } else if (role === 'petugas_absensi') {
      setEmailInput('petugas');
      setPasswordInput('petugas123');
    } else if (role === 'guru_bk') {
      setEmailInput('bk');
      setPasswordInput('bk123');
    } else if (role === 'siswa') {
      setEmailInput(demoSiswaUser);
      setPasswordInput(demoSiswaPass);
    }
    setErrorMessage(null);
  };

  // Handle Manual Login Form Submit
  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const inputIdOrEmail = emailInput.trim().toLowerCase();
    const password = passwordInput.trim();

    if (!inputIdOrEmail) {
      setErrorMessage('Silakan masukkan Username atau Email akun Anda.');
      return;
    }
    if (!password) {
      setErrorMessage('Silakan masukkan kata sandi (password) akun Anda.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    setTimeout(() => {
      // A. Check Kepala Sekolah
      const isKepsekUser = 
        inputIdOrEmail === 'kepsek' ||
        inputIdOrEmail === 'kepala.sekolah' ||
        inputIdOrEmail === 'kepala_sekolah' ||
        inputIdOrEmail === 'ahmad.dahlan' ||
        inputIdOrEmail === '197501152000031001' ||
        inputIdOrEmail === 'kepsek@sekolah.sch.id' ||
        inputIdOrEmail === 'kepala.sekolah@sekolah.sch.id' ||
        (schoolSettings.nipKepalaSekolah && inputIdOrEmail === schoolSettings.nipKepalaSekolah.toLowerCase().trim()) ||
        (schoolSettings.kepalaSekolah && inputIdOrEmail === schoolSettings.kepalaSekolah.toLowerCase().trim());

      if (isKepsekUser) {
        const isValidKepsekPassword = 
          password === 'kepsek' ||
          password === 'kepsek123' ||
          password === 'password' || 
          password === 'password123' || 
          password === 'admin123' ||
          password === '123456';

        if (!isValidKepsekPassword) {
          setErrorMessage('Kata sandi salah untuk akun Kepala Sekolah ini.');
          setLoading(false);
          return;
        }

        onLoginSuccess('kepala.sekolah@sekolah.sch.id', 'gmail_oauth_token_active', 'kepsek');
        setLoading(false);
        return;
      }

      // B. Check Admin
      const adminEmails = (schoolSettings.adminEmails || []).map(e => e.toLowerCase());
      const isAdminUser = 
        inputIdOrEmail === 'admin' ||
        inputIdOrEmail === 'giarh0410' ||
        inputIdOrEmail === 'giarh0410@gmail.com' ||
        adminEmails.includes(inputIdOrEmail) ||
        inputIdOrEmail.includes('giarh0410');

      // C. Check Staf
      const foundStaf = stafList.find(st => 
        (st.username && st.username.toLowerCase() === inputIdOrEmail) ||
        (st.email && st.email.toLowerCase() === inputIdOrEmail)
      );

      // D. Check Guru
      const foundGuru = guruList.find(g => 
        (g.username && g.username.toLowerCase() === inputIdOrEmail) ||
        (g.email && g.email.toLowerCase() === inputIdOrEmail)
      );

      // E. Check Siswa
      const foundSiswa = siswaList.find(s => 
        (s.username && s.username.toLowerCase() === inputIdOrEmail) ||
        (s.email && s.email.toLowerCase() === inputIdOrEmail) ||
        (s.nis && s.nis.toLowerCase() === inputIdOrEmail) ||
        (s.nisn && s.nisn.toLowerCase() === inputIdOrEmail)
      );

      if (isAdminUser) {
        const isValidAdminPassword = 
          password === 'admin' ||
          password === 'admin123' || 
          password === 'password' || 
          password === 'password123' || 
          password === '123456';

        if (!isValidAdminPassword) {
          setErrorMessage('Kata sandi salah untuk akun Admin Sekolah ini.');
          setLoading(false);
          return;
        }

        onLoginSuccess('giarh0410@gmail.com', 'gmail_oauth_token_active', 'admin');
        setLoading(false);
        return;
      }

      if (foundStaf) {
        const expectedPassword = foundStaf.password || 'password';
        if (password !== expectedPassword && password !== inputIdOrEmail) {
          setErrorMessage('Kata sandi salah untuk akun Staf TU / Keuangan ini.');
          setLoading(false);
          return;
        }
        onLoginSuccess(foundStaf.email || `${foundStaf.username || 'staf'}@staf.sch.id`, 'gmail_oauth_token_active', 'staf');
        setLoading(false);
        return;
      }

      if (foundGuru) {
        const expectedPassword = foundGuru.password || 'password123';
        if (password !== expectedPassword && password !== inputIdOrEmail) {
          setErrorMessage('Kata sandi salah untuk akun Guru ini.');
          setLoading(false);
          return;
        }
        onLoginSuccess(foundGuru.email || `${foundGuru.username || 'guru'}@guru.sch.id`, 'gmail_oauth_token_active', 'guru');
        setLoading(false);
        return;
      }

      if (foundSiswa) {
        const expectedPassword = foundSiswa.password || 'password123';
        if (password !== expectedPassword && password !== 'password' && password !== 'password123' && password !== '123456' && password !== inputIdOrEmail) {
          setErrorMessage('Kata sandi salah untuk akun Siswa ini.');
          setLoading(false);
          return;
        }
        onLoginSuccess(foundSiswa.email || `${foundSiswa.nis || foundSiswa.id}@siswa.sch.id`, 'gmail_oauth_token_active', 'siswa');
        setLoading(false);
        return;
      }

      // Hardcoded Fallbacks for demo accounts when database lists are empty
      if (inputIdOrEmail === 'budi') {
        onLoginSuccess('budi@guru.sch.id', 'gmail_oauth_token_active', 'guru');
        setLoading(false);
        return;
      }
      if (inputIdOrEmail === 'nurhidayati' || inputIdOrEmail === 'keuangan' || inputIdOrEmail === 'tatausaha') {
        onLoginSuccess('keuangan@staf.sch.id', 'gmail_oauth_token_active', 'staf');
        setLoading(false);
        return;
      }

      // Fallback for demo student names (e.g. 'bayu', 'bilal', 'siswa', 'cbt', etc.) when testing login
      if (
        inputIdOrEmail === 'bayu' || 
        inputIdOrEmail === 'bilal' || 
        inputIdOrEmail === 'siswa' || 
        inputIdOrEmail === 'cbt' ||
        inputIdOrEmail === 'ujian' ||
        inputIdOrEmail.startsWith('siswa') || 
        inputIdOrEmail.startsWith('cbt') ||
        inputIdOrEmail.startsWith('bayu') || 
        inputIdOrEmail.startsWith('bilal')
      ) {
        onLoginSuccess(`alia.syahira@siswa.sch.id`, 'gmail_oauth_token_active', 'siswa');
        setLoading(false);
        return;
      }

      // Check Petugas Absensi
      const isPetugasAbsensi = 
        inputIdOrEmail === 'petugas' ||
        inputIdOrEmail === 'petugas_absensi' ||
        inputIdOrEmail === 'petugas.absensi' ||
        inputIdOrEmail === 'petugas@sekolah.sch.id' ||
        inputIdOrEmail === 'petugas.absensi@sekolah.sch.id';

      if (isPetugasAbsensi) {
        const isValidPetugasPassword = 
          password === 'petugas' ||
          password === 'petugas123' ||
          password === 'password' ||
          password === 'password123' ||
          password === '123456';

        if (!isValidPetugasPassword) {
          setErrorMessage('Kata sandi salah untuk akun Petugas Absensi ini.');
          setLoading(false);
          return;
        }

        onLoginSuccess('petugas.absensi@sekolah.sch.id', 'gmail_oauth_token_active', 'petugas_absensi');
        setLoading(false);
        return;
      }

      // Check Guru BK
      const isGuruBk = 
        inputIdOrEmail === 'bk' ||
        inputIdOrEmail === 'guru_bk' ||
        inputIdOrEmail === 'bimbingan' ||
        inputIdOrEmail === 'konseling' ||
        inputIdOrEmail === 'guru.bk' ||
        inputIdOrEmail === 'bk@sekolah.sch.id' ||
        inputIdOrEmail === 'bimbingan.konseling@sekolah.sch.id' ||
        guruList.some(g => (g.jabatan && (g.jabatan.toLowerCase().includes('bk') || g.jabatan.toLowerCase().includes('bimbingan') || g.jabatan.toLowerCase().includes('konseling'))) && (g.username?.toLowerCase() === inputIdOrEmail || g.email?.toLowerCase() === inputIdOrEmail));

      if (isGuruBk) {
        const isValidBkPassword = 
          password === 'bk' ||
          password === 'bk123' ||
          password === 'password' ||
          password === 'password123' ||
          password === '123456';

        if (!isValidBkPassword) {
          setErrorMessage('Kata sandi salah untuk akun Guru Bimbingan Konseling ini.');
          setLoading(false);
          return;
        }

        onLoginSuccess('bimbingan.konseling@sekolah.sch.id', 'gmail_oauth_token_active', 'guru_bk');
        setLoading(false);
        return;
      }

      if (inputIdOrEmail.includes('@')) {
        onLoginSuccess(emailInput.trim(), 'gmail_oauth_token_active', selectedRole);
        setLoading(false);
        return;
      }

      setErrorMessage('Akses Ditolak: Akun dengan Username/Email tersebut tidak ditemukan di database.');
      setLoading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#050b18] via-[#09152b] to-[#040812] text-slate-100 flex items-center justify-center p-4 sm:p-6 antialiased selection:bg-sky-500/40 selection:text-white relative overflow-hidden">

      {/* Luminous Ambient Refraction Backdrop so Glass Card Reflects Light */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {/* Primary sapphire crystal light behind upper-left of card */}
        <div className="animate-glossy-orb absolute top-[14%] left-[22%] w-[440px] h-[440px] rounded-full bg-gradient-to-br from-sky-400/35 via-blue-600/25 to-transparent blur-[110px]" />
        {/* Secondary cobalt-teal light behind lower-right of card */}
        <div className="animate-glossy-orb-reverse absolute bottom-[10%] right-[18%] w-[460px] h-[380px] rounded-full bg-gradient-to-tl from-cyan-400/25 via-indigo-500/25 to-transparent blur-[120px]" />
        {/* Focused halo directly behind card center for vivid frosted refraction */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[320px] rounded-full bg-gradient-to-r from-blue-500/25 via-sky-300/20 to-indigo-500/25 blur-[95px]" />
        {/* Crisp top studio overhead reflection beam */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[780px] h-[260px] rounded-full bg-gradient-to-b from-white/12 via-sky-200/8 to-transparent blur-[80px]" />
        {/* Subtle fine architectural sheen grid */}
        <div className="absolute inset-0 opacity-[0.06] bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.85)_1px,transparent_0)] [background-size:28px_28px]" />
      </div>

      {/* Glossy Liquid-Glass Login Card */}
      <div className="max-w-md w-full relative z-10 rounded-[28px] p-[1px] bg-gradient-to-b from-white/55 via-sky-200/25 to-white/10 shadow-[0_32px_80px_-14px_rgba(2,6,23,0.9),0_0_55px_-12px_rgba(56,189,248,0.3)]">
        <div className="relative overflow-hidden rounded-[27px] bg-gradient-to-br from-white/[0.17] via-slate-900/55 to-slate-950/75 backdrop-blur-3xl backdrop-saturate-150 p-6 sm:p-8 space-y-6 text-white shadow-[inset_0_1.5px_1px_rgba(255,255,255,0.6),inset_0_-1px_1px_rgba(255,255,255,0.12)]">

          {/* Curved Top Optical Gloss Reflection */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -left-16 -right-16 h-52 rounded-[100%] bg-gradient-to-b from-white/[0.22] via-white/[0.06] to-transparent blur-[1px]"
          />

          {/* Top Edge Specular Highlight Line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-6 right-6 h-[1.5px] bg-gradient-to-r from-transparent via-white/85 to-transparent"
          />

          {/* Animated Diagonal Glass Sheen Sweep */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-[27px]"
          >
            <div className="animate-glossy-sheen absolute -top-10 bottom-0 w-36 bg-gradient-to-r from-transparent via-white/[0.18] to-transparent blur-[2px]" />
          </div>

          {/* Header: School Logo & Title */}
          <div className="relative z-10 flex items-center gap-4 pb-5 border-b border-white/20">
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-b from-white/30 via-white/12 to-white/5 border border-white/40 p-2.5 flex items-center justify-center shrink-0 shadow-[0_10px_24px_rgba(2,6,23,0.45),inset_0_1.5px_1px_rgba(255,255,255,0.75)] overflow-hidden">
              {/* Mini gloss dome over logo frame */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/35 to-transparent"
              />
              <img
                src={schoolSettings.logoUrl || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%232563eb"/></svg>'}
                alt={schoolSettings.namaSekolah}
                referrerPolicy="no-referrer"
                className="relative z-10 w-full h-full object-contain drop-shadow-[0_2px_6px_rgba(0,0,0,0.4)]"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="%232563eb"/><text x="50" y="58" font-size="45" fill="white" text-anchor="middle" font-weight="bold">S</text></svg>';
                }}
              />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-sky-200/95 tracking-wide flex items-center gap-1.5">
                <span>Portal Akademik</span>
                <span aria-hidden="true" className="text-white/40">·</span>
                <span className="text-emerald-300 font-semibold">Akreditasi A</span>
              </div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-snug mt-0.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">
                {schoolSettings.namaSekolah}
              </h1>
              <p className="text-xs text-slate-300/90 mt-0.5">
                Masuk untuk mengakses sistem sekolah
              </p>
            </div>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              role="alert"
              className="relative z-10 p-3.5 bg-red-500/20 backdrop-blur-md border border-red-300/40 rounded-2xl text-red-100 text-xs font-medium flex items-start gap-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
            >
              <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleManualLogin} className="relative z-10 space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-slate-100 mb-1.5 tracking-[0.01em]">
                Username atau Email
              </label>
              <div className="relative group">
                <UserCheck className="w-4 h-4 text-slate-300/80 group-focus-within:text-sky-300 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-username"
                  type="text"
                  autoComplete="username"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="Masukkan username atau email"
                  className="w-full bg-slate-950/45 hover:bg-slate-950/55 border border-white/25 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder-slate-400 shadow-[inset_0_2px_6px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.16)] focus:outline-none focus:border-sky-300/80 focus:bg-slate-950/60 focus:ring-2 focus:ring-sky-400/35 transition-all duration-150"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-100 mb-1.5 tracking-[0.01em]">
                Kata Sandi
              </label>
              <div className="relative group">
                <Lock className="w-4 h-4 text-slate-300/80 group-focus-within:text-sky-300 transition-colors absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950/45 hover:bg-slate-950/55 border border-white/25 rounded-2xl pl-10 pr-11 py-3 text-sm text-white placeholder-slate-400 shadow-[inset_0_2px_6px_rgba(0,0,0,0.45),0_1px_0_rgba(255,255,255,0.16)] focus:outline-none focus:border-sky-300/80 focus:bg-slate-950/60 focus:ring-2 focus:ring-sky-400/35 transition-all duration-150"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(prev => !prev)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !emailInput.trim() || !passwordInput.trim()}
              className="relative overflow-hidden w-full py-3.5 px-5 mt-1 rounded-2xl text-sm font-semibold text-white bg-gradient-to-b from-sky-400 via-blue-600 to-blue-700 hover:from-sky-300 hover:via-blue-500 hover:to-blue-600 border border-sky-200/45 shadow-[0_14px_30px_-6px_rgba(37,99,235,0.7),inset_0_1.5px_1px_rgba(255,255,255,0.75),inset_0_-2px_5px_rgba(15,23,42,0.4)] active:scale-[0.985] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 flex items-center justify-center gap-2 group cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              {/* Upper liquid gloss reflection dome on button */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-1 top-0.5 h-[48%] rounded-t-xl bg-gradient-to-b from-white/40 via-white/12 to-transparent"
              />
              {/* Hover gloss light swipe */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-[-20deg]"
              />
              <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)] whitespace-nowrap">
                {loading ? 'Memproses Akses...' : 'Masuk ke Dashboard'}
              </span>
              {!loading && (
                <ArrowRight className="relative z-10 w-4 h-4 group-hover:translate-x-0.5 transition-transform drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="relative z-10 pt-4 border-t border-white/15 flex items-center justify-between text-[11px] text-slate-300/80 tabular-nums">
            <span className="font-medium">Gie Technologi</span>
            <span>v2026.4.1</span>
          </div>

        </div>
      </div>
    </div>
  );
};

