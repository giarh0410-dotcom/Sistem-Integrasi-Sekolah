import React, { useState } from 'react';
import { 
  HeartHandshake, 
  Users, 
  Calendar, 
  AlertTriangle, 
  Award, 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  Download,
  ShieldAlert,
  BookOpen,
  MessageSquare
} from 'lucide-react';
import { Siswa, SchoolSettings, Role, RombelKelas, Guru } from '../types/school';

export interface KonselingRecord {
  id: string;
  siswaId: string;
  namaSiswa: string;
  kelas: string;
  jenisBimbingan: 'Akademik' | 'Pribadi' | 'Sosial' | 'Karir' | 'Pelanggaran Kedisiplinan';
  tanggal: string;
  guruBk: string;
  permasalahan: string;
  hasilKonseling: string;
  tindakLanjut: string;
  status: 'Selesai' | 'Dalam Penanganan' | 'Rujukan';
  poinPelanggaran?: number;
}

export interface JadwalTemuBK {
  id: string;
  namaSiswa: string;
  kelas: string;
  tanggal: string;
  jam: string;
  keperluan: string;
  status: 'Dijadwalkan' | 'Selesai' | 'Dibatalkan';
}

interface BimbinganKonselingViewProps {
  siswaList: Siswa[];
  rombelList?: RombelKelas[];
  guruList?: Guru[];
  schoolSettings?: SchoolSettings;
  currentRole?: Role;
  subTab?: 'catatan' | 'janji' | 'pelanggaran' | 'karir';
  setSubTab?: (subTab: 'catatan' | 'janji' | 'pelanggaran' | 'karir') => void;
}

const INITIAL_KONSELING: KonselingRecord[] = [
  {
    id: 'bk-1',
    siswaId: 's-1',
    namaSiswa: 'Ahmad Fauzan',
    kelas: 'X-A',
    jenisBimbingan: 'Akademik',
    tanggal: '2026-04-10',
    guruBk: 'Dra. Hj. Nurul Hidayah, M.Pd.',
    permasalahan: 'Penurunan nilai mata pelajaran Matematika dan Fisika pada UTS semester ini.',
    hasilKonseling: 'Siswa mengakui kurang fokus saat belajar mandiri di rumah dan sering tidur larut malam.',
    tindakLanjut: 'Diberikan jadwal bimbingan belajar tambahan dan konseling motivasi belajar.',
    status: 'Dalam Penanganan'
  },
  {
    id: 'bk-2',
    siswaId: 's-2',
    namaSiswa: 'Siti Rahma',
    kelas: 'XI-IPA-1',
    jenisBimbingan: 'Karir',
    tanggal: '2026-04-12',
    guruBk: 'Dra. Hj. Nurul Hidayah, M.Pd.',
    permasalahan: 'Konsultasi pemilihan jurusan kuliah dan persiapan SNBP / UTBK.',
    hasilKonseling: 'Siswa berminat di bidang Kedokteran dan Teknik Informatika. Telah dipetakan nilai rapor semester 1-4.',
    tindakLanjut: 'Mengikuti tryout UTBK berkala dan pendalaman materi saintek.',
    status: 'Selesai'
  },
  {
    id: 'bk-3',
    siswaId: 's-3',
    namaSiswa: 'Rizky Pratama',
    kelas: 'XII-IPS-2',
    jenisBimbingan: 'Pelanggaran Kedisiplinan',
    tanggal: '2026-04-14',
    guruBk: 'Dra. Hj. Nurul Hidayah, M.Pd.',
    permasalahan: 'Terlambat hadir ke sekolah 3 kali berturut-turut tanpa keterangan valid.',
    hasilKonseling: 'Kendala transportasi akibat jarak rumah yang jauh dan sering kesiangan bangun.',
    tindakLanjut: 'Peringatan lisan 1 dan pemanggilan orang tua untuk koordinasi jam berangkat.',
    status: 'Selesai',
    poinPelanggaran: 15
  }
];

const INITIAL_APPOINTMENTS: JadwalTemuBK[] = [
  {
    id: 'apt-1',
    namaSiswa: 'Dimas Anggara',
    kelas: 'X-B',
    tanggal: '2026-04-18',
    jam: '09:00',
    keperluan: 'Konsultasi pemilihan ekstrakurikuler dan penyesuaian kelas.',
    status: 'Dijadwalkan'
  },
  {
    id: 'apt-2',
    namaSiswa: 'Dewi Lestari',
    kelas: 'XII-IPA-2',
    tanggal: '2026-04-19',
    jam: '10:30',
    keperluan: 'Bimbingan beasiswa kuliah luar negeri.',
    status: 'Dijadwalkan'
  }
];

export const BimbinganKonselingView: React.FC<BimbinganKonselingViewProps> = ({
  siswaList,
  rombelList = [],
  guruList = [],
  schoolSettings,
  currentRole = 'admin',
  subTab,
  setSubTab
}) => {
  const [konselingList, setKonselingList] = useState<KonselingRecord[]>(() => {
    try {
      const saved = localStorage.getItem('edu_bk_konseling_list');
      return saved ? JSON.parse(saved) : INITIAL_KONSELING;
    } catch {
      return INITIAL_KONSELING;
    }
  });

  const [appointmentList, setAppointmentList] = useState<JadwalTemuBK[]>(() => {
    try {
      const saved = localStorage.getItem('edu_bk_appointment_list');
      return saved ? JSON.parse(saved) : INITIAL_APPOINTMENTS;
    } catch {
      return INITIAL_APPOINTMENTS;
    }
  });

  const [internalActiveTab, setInternalActiveTab] = useState<'catatan' | 'janji' | 'pelanggaran' | 'karir'>('catatan');
  const activeTab = subTab || internalActiveTab;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKategori, setFilterKategori] = useState('Semua');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<KonselingRecord | null>(null);
  const [formData, setFormData] = useState<Partial<KonselingRecord>>({
    namaSiswa: '',
    kelas: 'X-A',
    jenisBimbingan: 'Akademik',
    tanggal: new Date().toISOString().split('T')[0],
    guruBk: 'Dra. Hj. Nurul Hidayah, M.Pd.',
    permasalahan: '',
    hasilKonseling: '',
    tindakLanjut: '',
    status: 'Dalam Penanganan',
    poinPelanggaran: 0
  });

  const [isPrintModal, setIsPrintModal] = useState<KonselingRecord | null>(null);

  const saveToStorage = (list: KonselingRecord[]) => {
    setKonselingList(list);
    localStorage.setItem('edu_bk_konseling_list', JSON.stringify(list));
  };

  const handleOpenAdd = () => {
    setSelectedRecord(null);
    setFormData({
      namaSiswa: siswaList[0]?.nama || '',
      kelas: siswaList[0]?.kelas || 'X-A',
      jenisBimbingan: 'Akademik',
      tanggal: new Date().toISOString().split('T')[0],
      guruBk: 'Dra. Hj. Nurul Hidayah, M.Pd.',
      permasalahan: '',
      hasilKonseling: '',
      tindakLanjut: '',
      status: 'Dalam Penanganan',
      poinPelanggaran: 0
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: KonselingRecord) => {
    setSelectedRecord(rec);
    setFormData(rec);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus catatan bimbingan konseling ini?')) {
      const updated = konselingList.filter(item => item.id !== id);
      saveToStorage(updated);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaSiswa || !formData.permasalahan) {
      alert('Nama siswa dan permasalahan wajib diisi!');
      return;
    }

    if (selectedRecord) {
      const updated = konselingList.map(item =>
        item.id === selectedRecord.id ? ({ ...item, ...formData } as KonselingRecord) : item
      );
      saveToStorage(updated);
    } else {
      const newRec: KonselingRecord = {
        id: `bk-${Date.now()}`,
        siswaId: `s-${Date.now()}`,
        namaSiswa: formData.namaSiswa || '',
        kelas: formData.kelas || 'X-A',
        jenisBimbingan: formData.jenisBimbingan || 'Akademik',
        tanggal: formData.tanggal || new Date().toISOString().split('T')[0],
        guruBk: formData.guruBk || 'Guru BK',
        permasalahan: formData.permasalahan || '',
        hasilKonseling: formData.hasilKonseling || '',
        tindakLanjut: formData.tindakLanjut || '',
        status: formData.status || 'Dalam Penanganan',
        poinPelanggaran: Number(formData.poinPelanggaran) || 0
      };
      saveToStorage([newRec, ...konselingList]);
    }
    setIsModalOpen(false);
  };

  const filteredKonseling = konselingList.filter(item => {
    const matchSearch = item.namaSiswa.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.permasalahan.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.guruBk.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = filterKategori === 'Semua' || item.jenisBimbingan === filterKategori;
    return matchSearch && matchCat;
  });

  const totalKasus = konselingList.length;
  const kasusSelesai = konselingList.filter(k => k.status === 'Selesai').length;
  const kasusPenanganan = konselingList.filter(k => k.status === 'Dalam Penanganan').length;
  const totalPoinPelanggaran = konselingList.reduce((acc, curr) => acc + (curr.poinPelanggaran || 0), 0);

  const handleDownloadDoc = () => {
    if (!isPrintModal) return;
    const content = document.getElementById('printable-bk')?.innerHTML || '';
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>BK - ${isPrintModal.namaSiswa}</title><style>body{font-family:sans-serif;padding:20px;color:#000;background:#fff;} table{width:100%;border-collapse:collapse;margin-top:15px;} th, td{border:1px solid #333;padding:8px 12px;font-size:12px;} th{background:#f0f0f0;}</style></head><body>${content}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BK_${isPrintModal.namaSiswa.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-teal-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-teal-500/20 border border-teal-400/40 text-teal-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <HeartHandshake className="w-3.5 h-3.5" /> Layanan Bimbingan Konseling (BK)
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Manajemen Konseling & Pembinaan Siswa</h2>
          <p className="text-slate-300 text-sm max-w-2xl">
            Pusat layanan bimbingan akademik, karir, pribadi, sosial, pencatatan pelanggaran kedisiplinan, janji temu siswa, dan rekapitulasi penanganan kasus secara komprehensif.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-teal-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Catat Sesi Konseling Baru
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Sesi Konseling</p>
            <p className="text-xl font-black text-white mt-1">{totalKasus} Kasus</p>
          </div>
          <div className="p-3 bg-teal-500/10 text-teal-400 rounded-xl border border-teal-500/20">
            <HeartHandshake className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Kasus Selesai</p>
            <p className="text-xl font-black text-emerald-400 mt-1">{kasusSelesai} Selesai</p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Dalam Penanganan</p>
            <p className="text-xl font-black text-amber-400 mt-1">{kasusPenanganan} Aktif</p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20">
            <Clock className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl p-4 border border-slate-800 flex items-center justify-between shadow-xl">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Akumulasi Poin Pelanggaran</p>
            <p className="text-xl font-black text-rose-400 mt-1">{totalPoinPelanggaran} Poin</p>
          </div>
          <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20">
            <ShieldAlert className="w-6 h-6" />
          </div>
        </div>
      </div>



      {/* Tab 1: Catatan Sesi Konseling */}
      {activeTab === 'catatan' && (
        <div className="space-y-4">
          <div className="bg-slate-900/75 backdrop-blur-md p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Cari siswa, permasalahan, guru BK..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <Filter className="w-4 h-4 text-slate-400" />
              <select
                value={filterKategori}
                onChange={(e) => setFilterKategori(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
              >
                <option value="Semua">Semua Kategori</option>
                <option value="Akademik">Akademik</option>
                <option value="Pribadi">Pribadi</option>
                <option value="Sosial">Sosial</option>
                <option value="Karir">Karir</option>
                <option value="Pelanggaran Kedisiplinan">Pelanggaran Kedisiplinan</option>
              </select>
            </div>
          </div>

          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nama Siswa & Kelas</th>
                    <th className="py-3.5 px-4">Jenis Bimbingan</th>
                    <th className="py-3.5 px-4">Permasalahan & Tindak Lanjut</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-xs">
                  {filteredKonseling.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-500">
                        Tidak ada catatan konseling yang ditemukan.
                      </td>
                    </tr>
                  ) : (
                    filteredKonseling.map(rec => (
                      <tr key={rec.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-white text-sm">{rec.namaSiswa}</div>
                          <div className="text-[11px] text-teal-400 mt-0.5">Kelas {rec.kelas} • {rec.tanggal}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-teal-500/10 text-teal-300 border border-teal-500/20">
                            {rec.jenisBimbingan}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="text-slate-200 font-medium truncate">{rec.permasalahan}</div>
                          <div className="text-[11px] text-slate-400 truncate mt-0.5">Tindak Lanjut: {rec.tindakLanjut}</div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            rec.status === 'Selesai' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                            rec.status === 'Dalam Penanganan' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                            'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                          }`}>
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <button
                            onClick={() => setIsPrintModal(rec)}
                            title="Cetak Berita Acara Konseling"
                            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEdit(rec)}
                            title="Edit Catatan"
                            className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(rec.id)}
                            title="Hapus"
                            className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Janji Temu */}
      {activeTab === 'janji' && (
        <div className="space-y-4">
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" /> Jadwal Janji Temu Siswa & Guru BK
              </h3>
              <button
                onClick={() => {
                  const nama = prompt('Masukkan nama siswa:');
                  const kelas = prompt('Masukkan kelas:');
                  const keperluan = prompt('Masukkan keperluan konsultasi:');
                  if (nama && keperluan) {
                    const newApt: JadwalTemuBK = {
                      id: `apt-${Date.now()}`,
                      namaSiswa: nama,
                      kelas: kelas || 'X-A',
                      tanggal: new Date().toISOString().split('T')[0],
                      jam: '10:00',
                      keperluan,
                      status: 'Dijadwalkan'
                    };
                    setAppointmentList([newApt, ...appointmentList]);
                  }
                }}
                className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                + Buat Janji Temu
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {appointmentList.map(apt => (
                <div key={apt.id} className="bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-white text-sm">{apt.namaSiswa}</h4>
                      <p className="text-xs text-teal-400">Kelas {apt.kelas}</p>
                    </div>
                    <span className="px-2.5 py-1 bg-teal-500/10 text-teal-300 border border-teal-500/30 rounded-lg text-[10px] font-bold">
                      {apt.tanggal} • {apt.jam}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    <span className="font-semibold text-slate-400">Keperluan:</span> {apt.keperluan}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-emerald-400 font-bold uppercase">{apt.status}</span>
                    <button
                      onClick={() => setAppointmentList(appointmentList.filter(a => a.id !== apt.id))}
                      className="text-rose-400 hover:text-rose-300 text-xs font-semibold"
                    >
                      Batalkan / Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Pelanggaran & Tata Tertib */}
      {activeTab === 'pelanggaran' && (
        <div className="space-y-4">
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" /> Rekapitulasi Poin Pelanggaran Kedisiplinan Siswa
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Akumulasi poin pelanggaran kedisiplinan siswa digunakan sebagai bahan evaluasi pembinaan karakter. Batas maksimal poin peringatan adalah 100 poin sebelum tindakan skorsing atau pengembalian kepada orang tua.
            </p>

            <div className="flex items-center justify-between pb-2">
              <span className="text-xs text-slate-400">Daftar pelanggaran siswa dan akumulasi poin kedisiplinan.</span>
              <button
                onClick={() => {
                  setFormData({
                    namaSiswa: '',
                    kelas: 'X-A',
                    jenisBimbingan: 'Pelanggaran Kedisiplinan',
                    tanggal: new Date().toISOString().split('T')[0],
                    guruBk: 'Dra. Hj. Nurul Hidayah, M.Pd.',
                    permasalahan: '',
                    hasilKonseling: '',
                    tindakLanjut: 'Peringatan lisan 1',
                    status: 'Dalam Penanganan',
                    poinPelanggaran: 10
                  });
                  setSelectedRecord(null);
                  setIsModalOpen(true);
                }}
                className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Catat Pelanggaran Siswa
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase">
                    <th className="py-3 px-4">Nama Siswa</th>
                    <th className="py-3 px-4">Kelas</th>
                    <th className="py-3 px-4">Jenis Pelanggaran</th>
                    <th className="py-3 px-4 text-center">Poin</th>
                    <th className="py-3 px-4 text-center">Tindakan Pembinaan</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {konselingList.filter(k => k.poinPelanggaran && k.poinPelanggaran > 0).map(rec => (
                    <tr key={rec.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-bold text-white">{rec.namaSiswa}</td>
                      <td className="py-3 px-4 text-slate-300">Kelas {rec.kelas}</td>
                      <td className="py-3 px-4 text-slate-300">{rec.permasalahan}</td>
                      <td className="py-3 px-4 text-center font-black text-rose-400">{rec.poinPelanggaran} Poin</td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-lg text-[10px] font-bold">
                          {rec.tindakLanjut}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          title="Edit Poin & Pelanggaran"
                          className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 hover:bg-teal-500/20 transition-colors"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(rec.id)}
                          title="Hapus"
                          className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {konselingList.filter(k => k.poinPelanggaran && k.poinPelanggaran > 0).length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Belum ada catatan pelanggaran kedisiplinan tercatat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Bimbingan Karir & Studi Lanjut */}
      {activeTab === 'karir' && (
        <div className="space-y-4">
          <div className="bg-slate-900/75 backdrop-blur-md rounded-2xl border border-slate-800 p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-teal-400" /> Pemetaan Studi Lanjut & Karir Alumni Siswa
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Layanan bimbingan karir membantu siswa kelas akhir merencanakan masa depan melalui penelusuran bakat minat, bimbingan masuk Perguruan Tinggi (SNBP, SNBT, Mandiri), atau persiapan kerja mandiri.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 w-fit rounded-lg">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Persiapan PTN / Kedinasan</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Bimbingan intensif tryout UTBK, pemilihan jurusan sesuai rata-rata rapor, dan pendampingan pendaftaran.</p>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 w-fit rounded-lg">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Bimbingan Psikologis & Sosial</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Pengembangan soft skills, komunikasi efektif, manajemen stres menghadapi ujian, dan penyesuaian sosial.</p>
              </div>

              <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="p-2.5 bg-amber-500/10 text-amber-400 w-fit rounded-lg">
                  <Award className="w-5 h-5" />
                </div>
                <h4 className="font-bold text-white text-sm">Penyaluran Kerja & Wirausaha</h4>
                <p className="text-xs text-slate-400 leading-relaxed">Pelatihan keterampilan kerja dasar, magang industri mitra sekolah, dan inkubasi wirausaha muda.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HeartHandshake className="w-4 h-4 text-teal-400" />
                {selectedRecord ? 'Edit Catatan Bimbingan Konseling' : 'Tambah Sesi Konseling Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg flex items-center justify-center"
                title="Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Nama Siswa</label>
                  <select
                    value={formData.namaSiswa || ''}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const found = siswaList.find(s => s.nama === selectedName);
                      setFormData({
                        ...formData,
                        namaSiswa: selectedName,
                        kelas: found ? found.kelas : (formData.kelas || 'X-A')
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    required
                  >
                    <option value="">-- Pilih Siswa dari Database --</option>
                    {siswaList.map(s => (
                      <option key={s.id || s.nisn} value={s.nama}>
                        {s.nama} ({s.kelas} - {s.nisn || s.nis || 'Siswa'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Kelas</label>
                  <select
                    value={formData.kelas || ''}
                    onChange={(e) => setFormData({ ...formData, kelas: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Pilih Kelas dari Database --</option>
                    {(rombelList && rombelList.length > 0 ? rombelList.map(r => r.namaRombel) : Array.from(new Set(siswaList.map(s => s.kelas)))).map(cls => (
                      <option key={cls} value={cls}>{cls}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Jenis Bimbingan</label>
                  <select
                    value={formData.jenisBimbingan || 'Akademik'}
                    onChange={(e) => setFormData({ ...formData, jenisBimbingan: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Akademik">Akademik</option>
                    <option value="Pribadi">Pribadi</option>
                    <option value="Sosial">Sosial</option>
                    <option value="Karir">Karir</option>
                    <option value="Pelanggaran Kedisiplinan">Pelanggaran Kedisiplinan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Tanggal Konseling</label>
                  <input
                    type="date"
                    value={formData.tanggal || ''}
                    onChange={(e) => setFormData({ ...formData, tanggal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Guru BK / Konselor</label>
                  <select
                    value={formData.guruBk || ''}
                    onChange={(e) => setFormData({ ...formData, guruBk: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Pilih Guru / Konselor --</option>
                    {guruList.map(g => (
                      <option key={g.id || g.nip} value={g.nama}>
                        {g.nama} ({g.mataPelajaran || g.nip || 'Guru'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Status Penanganan</label>
                  <select
                    value={formData.status || 'Dalam Penanganan'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="Dalam Penanganan">Dalam Penanganan</option>
                    <option value="Selesai">Selesai</option>
                    <option value="Rujukan">Rujukan</option>
                  </select>
                </div>
              </div>

              {formData.jenisBimbingan === 'Pelanggaran Kedisiplinan' && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Poin Pelanggaran</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.poinPelanggaran || 0}
                    onChange={(e) => setFormData({ ...formData, poinPelanggaran: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    placeholder="Contoh: 10"
                  />
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Permasalahan / Kendala Siswa</label>
                  <textarea
                    rows={2}
                    value={formData.permasalahan || ''}
                    onChange={(e) => setFormData({ ...formData, permasalahan: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                    placeholder="Uraikan kendala atau kasus siswa..."
                    required
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Hasil Konseling / Analisis</label>
                  <textarea
                    rows={2}
                    value={formData.hasilKonseling || ''}
                    onChange={(e) => setFormData({ ...formData, hasilKonseling: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-teal-500"
                    placeholder="Hasil wawancara dan temuan konselor..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tindak Lanjut / Rekomendasi Pembinaan</label>
                  <input
                    type="text"
                    value={formData.tindakLanjut || ''}
                    onChange={(e) => setFormData({ ...formData, tindakLanjut: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-teal-500"
                    placeholder="Contoh: Bimbingan belajar tambahan / pemanggilan orang tua"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-teal-600/30 flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" /> Simpan Sesi Konseling
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print / Report Preview Modal */}
      {isPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div id="printable-bk" className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl my-auto relative font-sans overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-slate-950 border-b border-slate-800 shrink-0 z-10 sticky top-0">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-teal-400" /> Berita Acara Bimbingan Konseling Siswa
              </h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleDownloadDoc}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                  title="Unduh Dokumen Word"
                >
                  <Download className="w-4 h-4" /> Unduh Dokumen
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-600/30 transition-all"
                >
                  <Printer className="w-4 h-4" /> Cetak Berita Acara
                </button>
                <button
                  onClick={() => setIsPrintModal(null)}
                  className="p-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold transition-all shadow-lg flex items-center justify-center"
                  title="Tutup"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="text-center space-y-1 pb-6 border-b border-slate-800">
                <h2 className="text-lg font-black tracking-wider uppercase text-white">{schoolSettings?.namaSekolah || 'SEKOLAH ISLAM AL FAKHIR'}</h2>
                <p className="text-xs text-slate-400">{schoolSettings?.alamat || 'Jl. Pendidikan No. 10, Kota Sukabumi, Jawa Barat'}</p>
                <p className="text-[11px] text-slate-500">Telp: {schoolSettings?.telepon || '0266-123456'} | Email: {schoolSettings?.email || 'info@alfakhir.sch.id'}</p>
              </div>

              <div className="text-center pt-2">
                <h3 className="text-sm font-extrabold underline uppercase tracking-wide text-teal-300">SURAT KETERANGAN / BERITA ACARA BIMBINGAN KONSELING</h3>
                <p className="text-xs text-slate-400 mt-1">Layanan Unit Bimbingan Konseling (BK) Sekolah</p>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs pt-2 bg-slate-950 p-4 rounded-xl border border-slate-800">
                <div><span className="font-semibold text-slate-400">Nama Siswa:</span> <span className="text-white font-bold">{isPrintModal.namaSiswa}</span></div>
                <div><span className="font-semibold text-slate-400">Kelas:</span> <span className="text-teal-400 font-bold">Kelas {isPrintModal.kelas}</span></div>
                <div><span className="font-semibold text-slate-400">Jenis Bimbingan:</span> <span className="text-white font-medium">{isPrintModal.jenisBimbingan}</span></div>
                <div><span className="font-semibold text-slate-400">Tanggal Sesi:</span> <span className="text-white font-medium">{isPrintModal.tanggal}</span></div>
                <div><span className="font-semibold text-slate-400">Konselor / Guru BK:</span> <span className="text-white font-medium">{isPrintModal.guruBk}</span></div>
                <div><span className="font-semibold text-slate-400">Status Kasus:</span> <span className="text-emerald-400 font-bold">{isPrintModal.status}</span></div>
              </div>

              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <p className="font-bold text-teal-400">Uraian Permasalahan / Kasus:</p>
                  <p className="text-slate-200 leading-relaxed">{isPrintModal.permasalahan}</p>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <p className="font-bold text-teal-400">Hasil Analisis & Wawancara:</p>
                  <p className="text-slate-200 leading-relaxed">{isPrintModal.hasilKonseling || '-'}</p>
                </div>

                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <p className="font-bold text-teal-400">Tindak Lanjut / Rekomendasi:</p>
                  <p className="text-slate-200 leading-relaxed">{isPrintModal.tindakLanjut || '-'}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 pt-12 text-center text-xs text-slate-300 pb-4">
                <div>
                  <p className="mb-14 text-slate-400">Siswa Yang Bersangkutan,</p>
                  <p className="font-bold underline text-white">{isPrintModal.namaSiswa}</p>
                </div>
                <div>
                  <p className="mb-14 text-slate-400">Konselor / Guru BK,</p>
                  <p className="font-bold underline text-white">{isPrintModal.guruBk}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
