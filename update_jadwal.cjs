const fs = require('fs');

const path = 'src/components/PengaturanView.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `            {/* Main Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Jam Masuk Utama */}`;

const newStr = `            {/* Jadwal Siswa */}
            <div className="pt-2">
              <h4 className="text-sm font-bold text-white mb-3">Jadwal Siswa</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card 1: Jam Masuk Utama */}
                <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <LogIn className="w-4 h-4 text-emerald-400" /> Jam Masuk Utama
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Target Masuk
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Target Jam Masuk (WIB) *</label>
                    <input
                      type="time"
                      value={formData.jadwalPresensi?.jamMasuk || '07:00'}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          jadwalPresensi: {
                            ...(prev.jadwalPresensi || { jamMasuk: '07:00', jamToleransi: '07:15', jamPulang: '14:30', hariKerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] }),
                            jamMasuk: val
                          }
                        }));
                      }}
                      className="w-full p-2.5 bg-[#121212] border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Siswa yang scan sebelum jam ini dicatat sebagai <span className="text-emerald-400 font-bold">Hadir Tepat Waktu</span>.
                    </p>
                  </div>
                </div>

                {/* Card 2: Batas Toleransi Terlambat */}
                <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-amber-400" /> Batas Toleransi
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      Batas Maksimal
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Jam Batas Toleransi (WIB) *</label>
                    <input
                      type="time"
                      value={formData.jadwalPresensi?.jamToleransi || '07:15'}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          jadwalPresensi: {
                            ...(prev.jadwalPresensi || { jamMasuk: '07:00', jamToleransi: '07:15', jamPulang: '14:30', hariKerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] }),
                            jamToleransi: val
                          }
                        }));
                      }}
                      className="w-full p-2.5 bg-[#121212] border border-slate-700 rounded-xl text-sm font-mono font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Scan setelah jam ini dicatat sebagai <span className="text-rose-400 font-bold">Terlambat</span>.
                    </p>
                  </div>
                </div>

                {/* Card 3: Jam Pulang Sekolah */}
                <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-400" /> Jam Pulang Sekolah
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                      Target Pulang
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Jam Pulang Resmi (WIB) *</label>
                    <input
                      type="time"
                      value={formData.jadwalPresensi?.jamPulang || '14:30'}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          jadwalPresensi: {
                            ...(prev.jadwalPresensi || { jamMasuk: '07:00', jamToleransi: '07:15', jamPulang: '14:30', hariKerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] }),
                            jamPulang: val
                          }
                        }));
                      }}
                      className="w-full p-2.5 bg-[#121212] border border-slate-700 rounded-xl text-sm font-mono font-bold text-blue-300 focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Scan sebelum jam ini dicatat <span className="text-amber-300 font-bold">Pulang Cepat</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Jadwal Guru & Staf */}
            <div className="pt-2">
              <h4 className="text-sm font-bold text-white mb-3">Jadwal Guru & Staf</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Card 1: Jam Masuk Utama */}
                <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                      <LogIn className="w-4 h-4 text-emerald-400" /> Jam Masuk Utama
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Target Masuk
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Target Jam Masuk (WIB) *</label>
                    <input
                      type="time"
                      value={formData.jadwalPresensi?.jamMasukGuru || '06:45'}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          jadwalPresensi: {
                            ...(prev.jadwalPresensi || { jamMasuk: '07:00', jamToleransi: '07:15', jamPulang: '14:30', jamMasukGuru: '06:45', jamToleransiGuru: '07:00', jamPulangGuru: '15:00', hariKerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] }),
                            jamMasukGuru: val
                          }
                        }));
                      }}
                      className="w-full p-2.5 bg-[#121212] border border-slate-700 rounded-xl text-sm font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Guru/Staf yang scan sebelum jam ini dicatat sebagai <span className="text-emerald-400 font-bold">Hadir Tepat Waktu</span>.
                    </p>
                  </div>
                </div>

                {/* Card 2: Batas Toleransi Terlambat */}
                <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Timer className="w-4 h-4 text-amber-400" /> Batas Toleransi
                    </span>
                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                      Batas Maksimal
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Jam Batas Toleransi (WIB) *</label>
                    <input
                      type="time"
                      value={formData.jadwalPresensi?.jamToleransiGuru || '07:00'}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          jadwalPresensi: {
                            ...(prev.jadwalPresensi || { jamMasuk: '07:00', jamToleransi: '07:15', jamPulang: '14:30', jamMasukGuru: '06:45', jamToleransiGuru: '07:00', jamPulangGuru: '15:00', hariKerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] }),
                            jamToleransiGuru: val
                          }
                        }));
                      }}
                      className="w-full p-2.5 bg-[#121212] border border-slate-700 rounded-xl text-sm font-mono font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Scan setelah jam ini dicatat sebagai <span className="text-rose-400 font-bold">Terlambat</span>.
                    </p>
                  </div>
                </div>

                {/* Card 3: Jam Pulang Sekolah */}
                <div className="bg-[#181818] border border-slate-800 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-400" /> Jam Pulang
                    </span>
                    <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                      Target Pulang
                    </span>
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 block mb-1">Jam Pulang Resmi (WIB) *</label>
                    <input
                      type="time"
                      value={formData.jadwalPresensi?.jamPulangGuru || '15:00'}
                      onChange={e => {
                        const val = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          jadwalPresensi: {
                            ...(prev.jadwalPresensi || { jamMasuk: '07:00', jamToleransi: '07:15', jamPulang: '14:30', jamMasukGuru: '06:45', jamToleransiGuru: '07:00', jamPulangGuru: '15:00', hariKerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] }),
                            jamPulangGuru: val
                          }
                        }));
                      }}
                      className="w-full p-2.5 bg-[#121212] border border-slate-700 rounded-xl text-sm font-mono font-bold text-blue-300 focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Scan sebelum jam ini dicatat <span className="text-amber-300 font-bold">Pulang Cepat</span>.
                    </p>
                  </div>
                </div>
              </div>
            </div>`;

// Use regex to replace the entire grid section
const startRegex = /\s*\{\/\* Main Form Fields \*\/\}\s*<div className="grid grid-cols-1 md:grid-cols-3 gap-6">/;
const endStr = `            {/* Hari Kerja Operasional & Auto Switch */}`;

const startIndex = content.search(startRegex);
const endIndex = content.indexOf(endStr, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
  content = content.substring(0, startIndex) + '\n' + newStr + '\n\n' + content.substring(endIndex);
  fs.writeFileSync(path, content);
  console.log('Successfully updated PengaturanView.tsx (Main Form Fields)');
} else {
  console.log('Could not find boundaries for replacement.');
}
