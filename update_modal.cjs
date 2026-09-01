const fs = require('fs');

const path = 'src/components/AbsensiView.tsx';
let content = fs.readFileSync(path, 'utf8');

const targetStr = `              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-emerald-400 block">Jam Masuk Utama (WIB) *</label>
                  <input
                    type="time"
                    value={localJadwal.jamMasuk}
                    onChange={e => setLocalJadwal(prev => ({ ...prev, jamMasuk: e.target.value }))}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Scan sebelum jam ini: Hadir Tepat Waktu</p>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-amber-400 block">Batas Toleransi (WIB) *</label>
                  <input
                    type="time"
                    value={localJadwal.jamToleransi}
                    onChange={e => setLocalJadwal(prev => ({ ...prev, jamToleransi: e.target.value }))}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Scan setelah jam ini: Terlambat</p>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-blue-400 block">Jam Pulang Sekolah (WIB) *</label>
                <input
                  type="time"
                  value={localJadwal.jamPulang}
                  onChange={e => setLocalJadwal(prev => ({ ...prev, jamPulang: e.target.value }))}
                  className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-300 focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-500">Scan sebelum jam ini: Pulang Cepat</p>
              </div>`;

const newStr = `              <div className="bg-[#121212] p-3 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Jadwal Siswa</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-400 block">Jam Masuk Utama (WIB) *</label>
                    <input
                      type="time"
                      value={localJadwal.jamMasuk}
                      onChange={e => setLocalJadwal(prev => ({ ...prev, jamMasuk: e.target.value }))}
                      className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500">Scan sebelum jam ini: Hadir Tepat Waktu</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-400 block">Batas Toleransi (WIB) *</label>
                    <input
                      type="time"
                      value={localJadwal.jamToleransi}
                      onChange={e => setLocalJadwal(prev => ({ ...prev, jamToleransi: e.target.value }))}
                      className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500">Scan setelah jam ini: Terlambat</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-400 block">Jam Pulang Siswa (WIB) *</label>
                  <input
                    type="time"
                    value={localJadwal.jamPulang}
                    onChange={e => setLocalJadwal(prev => ({ ...prev, jamPulang: e.target.value }))}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-300 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Scan sebelum jam ini: Pulang Cepat</p>
                </div>
              </div>

              <div className="bg-[#121212] p-3 rounded-xl border border-slate-800 space-y-4">
                <h4 className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Jadwal Guru & Staf</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-emerald-400 block">Jam Masuk Utama (WIB) *</label>
                    <input
                      type="time"
                      value={localJadwal.jamMasukGuru || '06:45'}
                      onChange={e => setLocalJadwal(prev => ({ ...prev, jamMasukGuru: e.target.value }))}
                      className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:border-blue-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500">Hadir Tepat Waktu</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-amber-400 block">Batas Toleransi (WIB) *</label>
                    <input
                      type="time"
                      value={localJadwal.jamToleransiGuru || '07:00'}
                      onChange={e => setLocalJadwal(prev => ({ ...prev, jamToleransiGuru: e.target.value }))}
                      className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[10px] text-slate-500">Terlambat</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-blue-400 block">Jam Pulang Guru (WIB) *</label>
                  <input
                    type="time"
                    value={localJadwal.jamPulangGuru || '15:00'}
                    onChange={e => setLocalJadwal(prev => ({ ...prev, jamPulangGuru: e.target.value }))}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-blue-300 focus:border-blue-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500">Pulang Cepat</p>
                </div>
              </div>`;

content = content.replace(targetStr, newStr);

fs.writeFileSync(path, content);
console.log('Jadwal Modal updated.');
