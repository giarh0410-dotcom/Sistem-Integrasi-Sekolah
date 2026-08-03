import React from 'react';
import { 
  LayoutDashboard, 
  Users, 
  CalendarCheck, 
  Laptop, 
  FileText, 
  Wallet,
  Sparkles,
  Settings,
  GraduationCap,
  ShieldCheck,
  UserCheck,
  ChevronDown,
  Layers,
  BookOpen
} from 'lucide-react';
import { Role, SubTab } from '../types/school';

export type TabType = 'dashboard' | 'database' | 'absensi' | 'cbt' | 'administrasi' | 'keuangan' | 'pengaturan';

interface SidebarProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  userGoogleToken: string;
  currentRole?: Role;
  databaseSubTab: SubTab;
  setDatabaseSubTab: (subTab: SubTab) => void;
  siswaCount: number;
  guruCount: number;
  stafCount: number;
  rombelCount: number;
  mapelCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  userGoogleToken,
  currentRole = 'admin',
  databaseSubTab,
  setDatabaseSubTab,
  siswaCount,
  guruCount,
  stafCount,
  rombelCount,
  mapelCount
}) => {
  const allMenuItems: { id: TabType; label: string; icon: React.ReactNode; badge?: string; desc: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard Overview',
      icon: <LayoutDashboard className="w-5 h-5" />,
      desc: 'Ringkasan Statistik'
    },
    {
      id: 'database',
      label: 'Database Sekolah',
      icon: <Users className="w-5 h-5" />,
      desc: 'Siswa, Guru, Staf'
    },
    {
      id: 'absensi',
      label: currentRole === 'guru' ? 'Absensi Kelas & Mapel' : 'Absensi Terpadu',
      icon: <CalendarCheck className="w-5 h-5" />,
      desc: currentRole === 'guru' ? 'Presensi Siswa Per Kelas' : 'Harian, Mapel & Guru'
    },
    {
      id: 'cbt',
      label: 'CBT Ujian & Soal',
      icon: <Laptop className="w-5 h-5" />,
      badge: 'Bank Soal',
      desc: 'PG, Isian, Esai'
    },
    {
      id: 'administrasi',
      label: 'Administrasi Guru',
      icon: <FileText className="w-5 h-5" />,
      desc: 'Modul Ajar, ATP, Prota'
    },
    {
      id: 'keuangan',
      label: 'Keuangan & Sheets',
      icon: <Wallet className="w-5 h-5" />,
      badge: userGoogleToken ? 'Drive Ready' : 'Sheets',
      desc: 'SPP, UKT & Drive'
    },
    {
      id: 'pengaturan',
      label: 'Pengaturan Sekolah',
      icon: <Settings className="w-5 h-5" />,
      desc: 'Identitas & Logo'
    },
  ];

  // Filter menu items based on role
  const menuItems = allMenuItems.filter((item) => {
    if (currentRole === 'guru') {
      // Guru ONLY gets: absensi kelas, administrasi guru, cbt ujian (bank soal)
      return item.id === 'absensi' || item.id === 'administrasi' || item.id === 'cbt';
    }
    if (currentRole === 'staf') {
      return item.id === 'dashboard' || item.id === 'database' || item.id === 'absensi' || item.id === 'keuangan';
    }
    if (currentRole === 'siswa') {
      return item.id === 'dashboard' || item.id === 'absensi' || item.id === 'cbt' || item.id === 'keuangan';
    }
    // Admin gets all
    return true;
  });

  return (
    <aside className="w-full md:w-64 bg-[#121212] border border-slate-800 text-slate-300 flex-shrink-0 rounded-2xl p-4">
      <div className="space-y-3">
        {/* Active Role Indicator Box */}
        <div className={`p-3 rounded-xl border flex items-center justify-between ${
          currentRole === 'guru' ? 'bg-purple-950/40 border-purple-800/60 text-purple-300' :
          currentRole === 'admin' ? 'bg-blue-950/40 border-blue-800/60 text-blue-300' :
          currentRole === 'staf' ? 'bg-amber-950/40 border-amber-800/60 text-amber-300' :
          'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
        }`}>
          <div className="flex items-center gap-2">
            {currentRole === 'guru' && <GraduationCap className="w-4 h-4 text-purple-400" />}
            {currentRole === 'admin' && <ShieldCheck className="w-4 h-4 text-blue-400" />}
            {currentRole === 'staf' && <UserCheck className="w-4 h-4 text-amber-400" />}
            {currentRole === 'siswa' && <Users className="w-4 h-4 text-emerald-400" />}
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400 leading-tight">Akses Peran</div>
              <div className="text-xs font-black uppercase tracking-wide">
                {currentRole === 'guru' ? 'Guru / Pendidik' : currentRole === 'staf' ? 'Staf / Tata Usaha' : currentRole === 'siswa' ? 'Siswa / Wali' : 'Administrator'}
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] font-bold tracking-widest text-slate-500 uppercase px-1 pt-1">
          Menu Akses Fitur ({menuItems.length})
        </div>
        
        <div className="space-y-1.5">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            
            if (item.id === 'database') {
              return (
                <div key={item.id} className="space-y-1">
                  <button
                    onClick={() => {
                      setActiveTab('database');
                    }}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                      isActive
                        ? 'bg-slate-800/90 text-blue-400 font-bold border border-slate-700/80 shadow-md ring-1 ring-blue-500/20'
                        : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                        {item.icon}
                      </div>
                      <div>
                        <div className="text-xs font-bold leading-none">{item.label}</div>
                        <div className={`text-[10px] mt-1 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <ChevronDown className={`w-4 h-4 text-slate-500 group-hover:text-slate-300 transition-transform duration-300 ${isActive ? 'transform rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown nested items */}
                  {isActive && (
                    <div className="pl-3 pr-1 py-1 space-y-1 border-l border-slate-800 ml-6 mt-1 transition-all">
                      <button
                        onClick={() => setDatabaseSubTab('siswa')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-all ${
                          databaseSubTab === 'siswa'
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <GraduationCap className="w-3.5 h-3.5" />
                          <span>Data Siswa</span>
                        </div>
                        <span className="text-[9px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {siswaCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setDatabaseSubTab('guru')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-all ${
                          databaseSubTab === 'guru'
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Data Guru</span>
                        </div>
                        <span className="text-[9px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {guruCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setDatabaseSubTab('staf')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-all ${
                          databaseSubTab === 'staf'
                            ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Users className="w-3.5 h-3.5" />
                          <span>Data Staf</span>
                        </div>
                        <span className="text-[9px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {stafCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setDatabaseSubTab('rombel')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-all ${
                          databaseSubTab === 'rombel'
                            ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Layers className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Rombel & Kelas</span>
                        </div>
                        <span className="text-[9px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {rombelCount}
                        </span>
                      </button>

                      <button
                        onClick={() => setDatabaseSubTab('mapel')}
                        className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-semibold flex items-center justify-between transition-all ${
                          databaseSubTab === 'mapel'
                            ? 'bg-amber-600/10 text-amber-400 border border-amber-500/20 shadow-sm'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/30'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                          <span>Mata Pelajaran</span>
                        </div>
                        <span className="text-[9px] bg-slate-800/80 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                          {mapelCount}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            }

            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between group ${
                  isActive
                    ? 'bg-slate-800/90 text-blue-400 font-bold border border-slate-700/80 shadow-md ring-1 ring-blue-500/20'
                    : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`${isActive ? 'text-blue-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
                    {item.icon}
                  </div>
                  <div>
                    <div className="text-xs font-bold leading-none">{item.label}</div>
                    <div className={`text-[10px] mt-1 ${isActive ? 'text-slate-300' : 'text-slate-500'}`}>
                      {item.desc}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                    isActive
                      ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Integration Callout */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 px-0.5">
          <div className="bg-[#0A0A0A] rounded-xl p-3 border border-slate-800 text-xs">
            <div className="flex items-center gap-1.5 font-semibold text-blue-400 mb-1">
              <Sparkles className="w-3.5 h-3.5" /> Workspace Sekolah 2026
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              {currentRole === 'guru' 
                ? 'Terhubung dengan Google Drive untuk menyimpan Modul Ajar, ATP & Bank Soal Ujian.'
                : 'Ekspor rekap keuangan & absensi langsung ke Google Drive & Spreadsheet secara otomatis.'}
            </p>
          </div>
        </div>

      </div>
    </aside>
  );
};
