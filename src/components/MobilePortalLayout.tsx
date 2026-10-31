import React, { useState } from 'react';
import { 
  BookOpen, 
  Wallet, 
  Laptop, 
  Award, 
  TrendingUp, 
  Bell, 
  CreditCard, 
  FileText, 
  Trophy, 
  Grid, 
  QrCode, 
  Sun, 
  Moon, 
  Home, 
  ShoppingBag, 
  Calendar, 
  User,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';
import { Role, Siswa, SchoolSettings } from '../types/school';

interface MobilePortalLayoutProps {
  onNavigateTab: (tab: string) => void;
  currentRole?: Role;
  schoolSettings?: SchoolSettings;
  siswaList?: Siswa[];
}

export const MobilePortalLayout: React.FC<MobilePortalLayoutProps> = ({
  onNavigateTab,
  currentRole = 'siswa',
  schoolSettings,
  siswaList = []
}) => {
  const [activeBottomTab, setActiveBottomTab] = useState<'beranda' | 'ekantin' | 'qrpay' | 'jadwal' | 'profil'>('beranda');
  const [mobileTheme, setMobileTheme] = useState<'dark' | 'light'>('dark');

  const studentName = currentRole === 'admin' ? 'Administrator SIM' : currentRole === 'guru' ? 'Bapak/Ibu Guru' : 'Ahmad Siswa';
  const studentNisn = '123456789';
  const studentClass = 'X-A • IPA';

  const menuItems = [
    { title: 'LMS Belajar', icon: BookOpen, bg: 'bg-blue-500/10 text-blue-400', badge: 2, tab: 'cbt' },
    { title: 'Tabungan', icon: Wallet, bg: 'bg-emerald-500/10 text-emerald-400', badge: null, tab: 'keuangan' },
    { title: 'Materi Modul', icon: BookOpen, bg: 'bg-purple-500/10 text-purple-400', badge: 4, tab: 'administrasi' },
    { title: 'Ujian CBT', icon: Laptop, bg: 'bg-amber-500/10 text-amber-400', badge: null, tab: 'cbt' },
    { title: 'E-Raport', icon: Award, bg: 'bg-cyan-500/10 text-cyan-400', badge: null, tab: 'administrasi' },
    { title: 'Laporan Nilai', icon: TrendingUp, bg: 'bg-indigo-500/10 text-indigo-400', badge: null, tab: 'cbt' },
    { title: 'Pengumuman', icon: Bell, bg: 'bg-rose-500/10 text-rose-400', badge: 5, tab: 'beranda' },
    { title: 'Tagihan & SPP', icon: CreditCard, bg: 'bg-emerald-500/10 text-emerald-400', badge: 8, tab: 'keuangan' },
    { title: 'Pengajuan Izin', icon: FileText, bg: 'bg-blue-500/10 text-blue-400', badge: null, tab: 'absensi' },
    { title: 'E-Library', icon: BookOpen, bg: 'bg-amber-500/10 text-amber-400', badge: null, tab: 'beranda' },
    { title: 'Leaderboard', icon: Trophy, bg: 'bg-yellow-500/10 text-yellow-400', badge: null, tab: 'beranda' },
    { title: 'Semua Menu', icon: Grid, bg: 'bg-slate-700/30 text-slate-300', badge: null, tab: 'beranda' },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-6 px-2 w-full">
      {/* Smartphone Frame Container */}
      <div className="relative w-full max-w-[420px] bg-[#090d16] border-[10px] border-[#1e293b] rounded-[48px] shadow-2xl overflow-hidden text-slate-100 flex flex-col font-sans select-none">
        
        {/* Phone Status Bar */}
        <div className="bg-[#0b132b] px-6 py-2.5 flex items-center justify-between text-[11px] font-semibold text-slate-300 border-b border-slate-800/60">
          <span>19:49</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px]">5G</span>
            <div className="w-5 h-2.5 border border-slate-400 rounded-sm p-0.5 flex items-center">
              <div className="h-full w-3/4 bg-slate-200 rounded-2xs"></div>
            </div>
            <span className="text-[10px]">100%</span>
          </div>
        </div>

        {/* App Header */}
        <div className="bg-[#0b132b] px-5 py-3 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-md">
              {studentName.charAt(0)}
            </div>
            <div>
              <p className="text-[10px] text-slate-400 tracking-wider uppercase">Dashboard</p>
              <h2 className="text-xs font-bold text-white">{studentName}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setMobileTheme(mobileTheme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full bg-slate-800/80 text-amber-400 hover:bg-slate-700 transition-colors"
            >
              {mobileTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <div className="relative p-2 rounded-full bg-slate-800/80 text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer">
              <Bell className="w-4 h-4" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                7
              </span>
            </div>
          </div>
        </div>

        {/* Scrollable Mobile Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[620px] bg-[#0b0f19]">
          
          {/* Top Profile / Welcome Card */}
          <div className="relative bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-5 text-white shadow-xl overflow-hidden border border-blue-500/30">
            <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[11px] text-blue-200 font-medium">Selamat Malam,</p>
                <h3 className="text-lg font-black tracking-tight">{studentName}</h3>
              </div>
              <button 
                onClick={() => onNavigateTab('absensi')}
                className="px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-[11px] font-bold flex items-center gap-1.5 border border-white/20 shadow-lg transition-all"
              >
                <QrCode className="w-3.5 h-3.5 text-blue-200" /> QR Absen
              </button>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-950/60 text-blue-200 text-[10px] font-bold border border-blue-400/30">
                {studentClass}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-300 text-[10px] font-bold border border-emerald-400/30">
                Aktif (2026)
              </span>
            </div>

            {/* Stats Sub-Card */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/15 text-center">
              <div className="bg-blue-950/40 rounded-xl p-2 border border-white/1">
                <p className="text-[9px] text-blue-200 uppercase font-semibold">NISN</p>
                <p className="text-xs font-black tracking-wider mt-0.5">{studentNisn}</p>
              </div>
              <div className="bg-blue-950/40 rounded-xl p-2 border border-white/1">
                <p className="text-[9px] text-blue-200 uppercase font-semibold">Kehadiran</p>
                <p className="text-xs font-black text-emerald-300 mt-0.5">0%</p>
              </div>
              <div className="bg-blue-950/40 rounded-xl p-2 border border-white/1">
                <p className="text-[9px] text-blue-200 uppercase font-semibold">Tabungan</p>
                <p className="text-xs font-black text-amber-300 mt-0.5">Rp 0</p>
              </div>
            </div>
          </div>

          {/* Menu Portal Siswa Section */}
          <div className="bg-[#121826] rounded-2xl p-4 border border-slate-800 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Grid className="w-3.5 h-3.5 text-blue-400" /> Menu Portal Siswa
              </h4>
              <span className="text-[11px] font-semibold text-blue-400 hover:underline cursor-pointer">Lihat Semua &gt;</span>
            </div>

            {/* Grid 4x3 */}
            <div className="grid grid-cols-4 gap-2.5 pt-1">
              {menuItems.map((item, idx) => {
                const IconComponent = item.icon;
                return (
                  <div 
                    key={idx}
                    onClick={() => onNavigateTab(item.tab)}
                    className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#1a2234] hover:bg-[#222d44] border border-slate-800/80 transition-all cursor-pointer group relative"
                  >
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center shadow">
                        {item.badge}
                      </span>
                    )}
                    <div className={`p-2.5 rounded-xl ${item.bg} group-hover:scale-110 transition-transform`}>
                      <IconComponent className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-medium text-slate-300 mt-1.5 text-center leading-tight truncate w-full">
                      {item.title}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Summary Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#121826] rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Rata-rata Nilai</p>
                <p className="text-sm font-bold text-white mt-1">50 Nilai</p>
              </div>
              <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>

            <div className="bg-[#121826] rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between relative">
              <span className="absolute -top-1 -right-1 bg-amber-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                2
              </span>
              <div>
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Tugas</p>
                <p className="text-sm font-bold text-amber-300 mt-1">Belum Selesai</p>
              </div>
              <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-xl">
                <Clock className="w-4 h-4" />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom Navigation Bar */}
        <div className="bg-[#0b132b] px-3 py-2 border-t border-slate-800 flex items-center justify-around relative">
          <button 
            onClick={() => setActiveBottomTab('beranda')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${activeBottomTab === 'beranda' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Home className="w-5 h-5" />
            <span>Beranda</span>
          </button>

          <button 
            onClick={() => setActiveBottomTab('ekantin')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${activeBottomTab === 'ekantin' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <ShoppingBag className="w-5 h-5" />
            <span>E-Kantin</span>
          </button>

          {/* Center Floating QR PAY Button */}
          <div className="relative -top-4">
            <button 
              onClick={() => onNavigateTab('keuangan')}
              className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-lg shadow-blue-600/50 hover:scale-105 transition-transform border-2 border-[#0b132b]"
            >
              <QrCode className="w-6 h-6" />
            </button>
            <span className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[9px] font-bold text-blue-400 tracking-wider whitespace-nowrap">
              QR PAY
            </span>
          </div>

          <button 
            onClick={() => setActiveBottomTab('jadwal')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${activeBottomTab === 'jadwal' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <Calendar className="w-5 h-5" />
            <span>Jadwal</span>
          </button>

          <button 
            onClick={() => setActiveBottomTab('profil')}
            className={`flex flex-col items-center gap-0.5 text-[10px] font-medium transition-colors ${activeBottomTab === 'profil' ? 'text-blue-400 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <User className="w-5 h-5" />
            <span>Profil</span>
          </button>
        </div>

        {/* Home Indicator Bar */}
        <div className="bg-[#0b132b] pb-2 flex justify-center">
          <div className="w-32 h-1 bg-slate-600 rounded-full"></div>
        </div>

      </div>
    </div>
  );
};
