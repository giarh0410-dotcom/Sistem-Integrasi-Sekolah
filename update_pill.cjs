const fs = require('fs');

const path = 'src/components/AbsensiView.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetRegex = /<span className="font-bold text-blue-400 flex items-center gap-1\.5 shrink-0">\s*<Clock className="w-4 h-4 text-blue-400" \/> Jadwal Presensi Aktif:\s*<\/span>\s*<div className="flex flex-wrap items-center gap-2 font-mono text-\[11px\]">\s*<span className="bg-emerald-950\/60 border border-emerald-500\/30 text-emerald-300 px-2\.5 py-0\.5 rounded-md font-bold flex items-center gap-1">\s*<LogIn className="w-3 h-3 text-emerald-400" \/> Masuk: \{schoolSettings\?\.jadwalPresensi\?\.jamMasuk \|\| localJadwal\.jamMasuk\} WIB\s*<\/span>\s*<span className="bg-amber-950\/60 border border-amber-500\/30 text-amber-300 px-2\.5 py-0\.5 rounded-md font-bold">\s*Toleransi: \{schoolSettings\?\.jadwalPresensi\?\.jamToleransi \|\| localJadwal\.jamToleransi\} WIB\s*<\/span>\s*<span className="bg-blue-950\/60 border border-blue-500\/30 text-blue-300 px-2\.5 py-0\.5 rounded-md font-bold flex items-center gap-1">\s*<LogOut className="w-3 h-3 text-blue-400" \/> Pulang: \{schoolSettings\?\.jadwalPresensi\?\.jamPulang \|\| localJadwal\.jamPulang\} WIB\s*<\/span>\s*<\/div>/g;

const match = content.match(targetRegex);
if(match) {
  const replacement = `<span className="font-bold text-blue-400 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-4 h-4 text-blue-400" /> Jadwal {scanTargetType === 'siswa' ? 'Siswa' : 'Guru & Staf'}:
                </span>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
                  <span className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <LogIn className="w-3 h-3 text-emerald-400" /> Masuk: {scanTargetType === 'siswa' ? (schoolSettings?.jadwalPresensi?.jamMasuk || localJadwal.jamMasuk) : (schoolSettings?.jadwalPresensi?.jamMasukGuru || localJadwal.jamMasukGuru || '06:45')} WIB
                  </span>
                  <span className="bg-amber-950/60 border border-amber-500/30 text-amber-300 px-2.5 py-0.5 rounded-md font-bold">
                    Toleransi: {scanTargetType === 'siswa' ? (schoolSettings?.jadwalPresensi?.jamToleransi || localJadwal.jamToleransi) : (schoolSettings?.jadwalPresensi?.jamToleransiGuru || localJadwal.jamToleransiGuru || '07:00')} WIB
                  </span>
                  <span className="bg-blue-950/60 border border-blue-500/30 text-blue-300 px-2.5 py-0.5 rounded-md font-bold flex items-center gap-1">
                    <LogOut className="w-3 h-3 text-blue-400" /> Pulang: {scanTargetType === 'siswa' ? (schoolSettings?.jadwalPresensi?.jamPulang || localJadwal.jamPulang) : (schoolSettings?.jadwalPresensi?.jamPulangGuru || localJadwal.jamPulangGuru || '15:00')} WIB
                  </span>
                </div>`;
  content = content.replace(targetRegex, replacement);
  fs.writeFileSync(path, content);
  console.log('Successfully updated pills');
} else {
  console.log('Regex match failed');
}

