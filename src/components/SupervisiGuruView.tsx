import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Award, 
  FileText, 
  UserCheck, 
  Calendar, 
  Plus, 
  Search, 
  Filter, 
  Printer, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  BookOpen, 
  Check, 
  Star,
  FileSpreadsheet,
  Download
} from 'lucide-react';
import { Guru, SchoolSettings } from '../types/school';

export interface SupervisiRecord {
  id: string;
  guruId: string;
  namaGuru: string;
  mataPelajaran: string;
  kelasObservasi: string;
  tanggalObservasi: string;
  supervisor: string;
  
  // Penilaian 1 - 4 (skala 1 - 100)
  nilaiPerangkat: number; // Modul Ajar, Prota, Prosem
  nilaiPenyampaian: number; // Pendahuluan & Penguasaan Materi
  nilaiMetodeMedia: number; // Strategi, Interaksi & Media IT
  nilaiEvaluasi: number; // Asesmen & Refleksi

  catatanPositif: string;
  catatanPerbaikan: string;
  rekomendasi: string;
  status: 'Sudah Disupervisi' | 'Jadwal Ulang' | 'Belum Disupervisi';
}

interface SupervisiGuruViewProps {
  guruList?: Guru[];
  schoolSettings?: SchoolSettings;
}

const INITIAL_SUPERVISI: SupervisiRecord[] = [
  {
    id: 'sup-1',
    guruId: 'g-1',
    namaGuru: 'Aulia Safitri, S.Pd',
    mataPelajaran: 'Bahasa Indonesia',
    kelasObservasi: 'X-A',
    tanggalObservasi: '2026-04-12',
    supervisor: 'Deni Rahmat, S.Sos.I (Kepala Sekolah)',
    nilaiPerangkat: 90,
    nilaiPenyampaian: 88,
    nilaiMetodeMedia: 92,
    nilaiEvaluasi: 85,
    catatanPositif: 'Penyampaian materi sangat interaktif dan melibatkan siswa aktif berdiskusi.',
    catatanPerbaikan: 'Tingkatkan penggunaan media digital interaktif pada saat pendahuluan.',
    rekomendasi: 'Pertahankan metode pembelajaran berdiferensiasi.',
    status: 'Sudah Disupervisi'
  },
  {
    id: 'sup-2',
    guruId: 'g-2',
    namaGuru: 'Ahmad Fauzi, M.Pd',
    mataPelajaran: 'Matematika',
    kelasObservasi: 'XI-IPA-1',
    tanggalObservasi: '2026-04-14',
    supervisor: 'Deni Rahmat, S.Sos.I (Kepala Sekolah)',
    nilaiPerangkat: 95,
    nilaiPenyampaian: 92,
    nilaiMetodeMedia: 90,
    nilaiEvaluasi: 94,
    catatanPositif: 'Penguasaan konsep matematika sangat matang dengan pendekatan realistik.',
    catatanPerbaikan: 'Manajemen waktu pengerjaan latihan soal di akhir sesi agar lebih efisien.',
    rekomendasi: 'Layak dijadikan teladan best practice pembelajaran numerasi.',
    status: 'Sudah Disupervisi'
  },
  {
    id: 'sup-3',
    guruId: 'g-3',
    namaGuru: 'Siti Aminah, S.Ag',
    mataPelajaran: 'Pendidikan Agama Islam',
    kelasObservasi: 'XII-IPS-2',
    tanggalObservasi: '2026-04-20',
    supervisor: 'Dr. H. M. Ridwan, M.Pd (Pengawas Pembina)',
    nilaiPerangkat: 88,
    nilaiPenyampaian: 90,
    nilaiMetodeMedia: 85,
    nilaiEvaluasi: 88,
    catatanPositif: 'Integrasi nilai akhlakul karimah sangat kuat dalam setiap topik bahasan.',
    catatanPerbaikan: 'Variasikan metode tanya jawab dengan game quiz interaktif.',
    rekomendasi: 'Tingkatkan pengayaan modul ajar berbasis proyek keagamaan.',
    status: 'Sudah Disupervisi'
  }
];

export const SupervisiGuruView: React.FC<SupervisiGuruViewProps> = ({
  guruList = [],
  schoolSettings
}) => {
  const [supervisiList, setSupervisiList] = useState<SupervisiRecord[]>(() => {
    try {
      const saved = localStorage.getItem('edu_supervisi_list');
      return saved ? JSON.parse(saved) : INITIAL_SUPERVISI;
    } catch {
      return INITIAL_SUPERVISI;
    }
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('Semua');
  const [selectedRecord, setSelectedRecord] = useState<SupervisiRecord | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPrintModal, setIsPrintModal] = useState<SupervisiRecord | null>(null);

  const handleDownloadDoc = () => {
    if (!isPrintModal) return;
    const content = document.getElementById('printable-supervisi')?.innerHTML || '';
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>PKG - ${isPrintModal.namaGuru}</title><style>body{font-family:sans-serif;padding:20px;color:#000;background:#fff;} table{width:100%;border-collapse:collapse;margin-top:15px;} th, td{border:1px solid #333;padding:8px 12px;font-size:12px;} th{background:#f0f0f0;}</style></head><body>${content}</body></html>`;
    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PKG_${isPrintModal.namaGuru.replace(/\s+/g, '_')}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadText = () => {
    if (!isPrintModal) return;
    const text = `LEMBAR PENILAIAN KINERJA GURU (PKG)\n` +
      `Sekolah: ${schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir'}\n` +
      `Nama Guru: ${isPrintModal.namaGuru}\n` +
      `Mata Pelajaran: ${isPrintModal.mataPelajaran}\n` +
      `Kelas Observasi: ${isPrintModal.kelasObservasi}\n` +
      `Tanggal Observasi: ${isPrintModal.tanggalObservasi}\n` +
      `Supervisor: ${isPrintModal.supervisor}\n` +
      `Status: ${isPrintModal.status}\n\n` +
      `KOMPONEN PENILAIAN KINERJA:\n` +
      `1. Perangkat Pembelajaran (Modul Ajar, ATP, Prota): ${isPrintModal.nilaiPerangkat}\n` +
      `2. Penyampaian & Penguasaan Materi Pembelajaran: ${isPrintModal.nilaiPenyampaian}\n` +
      `3. Metode, Interaksi Kelas & Pemanfaatan Media IT: ${isPrintModal.nilaiMetodeMedia}\n` +
      `4. Evaluasi, Asesmen & Tindak Lanjut Pembelajaran: ${isPrintModal.nilaiEvaluasi}\n` +
      `RATA-RATA SKOR AKHIR: ${getAverageScore(isPrintModal)}\n\n` +
      `Catatan Positif & Keunggulan:\n${isPrintModal.catatanPositif || '-'}\n\n` +
      `Catatan Perbaikan & Masukan:\n${isPrintModal.catatanPerbaikan || '-'}\n\n` +
      `Rekomendasi & Tindak Lanjut Pembinaan:\n${isPrintModal.rekomendasi || '-'}\n`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `PKG_${isPrintModal.namaGuru.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Form State for Add / Edit
  const [formData, setFormData] = useState<Partial<SupervisiRecord>>({
    guruId: '',
    namaGuru: '',
    mataPelajaran: '',
    kelasObservasi: 'X-A',
    tanggalObservasi: new Date().toISOString().split('T')[0],
    supervisor: 'Deni Rahmat, S.Sos.I (Kepala Sekolah)',
    nilaiPerangkat: 85,
    nilaiPenyampaian: 85,
    nilaiMetodeMedia: 85,
    nilaiEvaluasi: 85,
    catatanPositif: '',
    catatanPerbaikan: '',
    rekomendasi: '',
    status: 'Sudah Disupervisi'
  });

  const saveToStorage = (list: SupervisiRecord[]) => {
    setSupervisiList(list);
    localStorage.setItem('edu_supervisi_list', JSON.stringify(list));
  };

  const handleOpenAdd = () => {
    setFormData({
      guruId: guruList[0]?.id || '',
      namaGuru: guruList[0]?.nama || '',
      mataPelajaran: guruList[0]?.mataPelajaran || 'Umum',
      kelasObservasi: 'X-A',
      tanggalObservasi: new Date().toISOString().split('T')[0],
      supervisor: 'Deni Rahmat, S.Sos.I (Kepala Sekolah)',
      nilaiPerangkat: 88,
      nilaiPenyampaian: 88,
      nilaiMetodeMedia: 88,
      nilaiEvaluasi: 88,
      catatanPositif: 'Penyampaian materi terstruktur dengan baik.',
      catatanPerbaikan: 'Tingkatkan variasi metode pembelajaran kolaboratif.',
      rekomendasi: 'Pertahankan kualitas mengajar.',
      status: 'Sudah Disupervisi'
    });
    setSelectedRecord(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (rec: SupervisiRecord) => {
    setSelectedRecord(rec);
    setFormData(rec);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Hapus data supervisi guru ini?')) {
      const updated = supervisiList.filter(item => item.id !== id);
      saveToStorage(updated);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.namaGuru) {
      alert('Nama guru wajib diisi!');
      return;
    }

    if (selectedRecord) {
      const updated = supervisiList.map(item => 
        item.id === selectedRecord.id ? { ...item, ...formData } as SupervisiRecord : item
      );
      saveToStorage(updated);
    } else {
      const newRec: SupervisiRecord = {
        id: `sup-${Date.now()}`,
        guruId: formData.guruId || 'g-new',
        namaGuru: formData.namaGuru || '',
        mataPelajaran: formData.mataPelajaran || 'Umum',
        kelasObservasi: formData.kelasObservasi || 'X-A',
        tanggalObservasi: formData.tanggalObservasi || new Date().toISOString().split('T')[0],
        supervisor: formData.supervisor || 'Kepala Sekolah',
        nilaiPerangkat: Number(formData.nilaiPerangkat) || 85,
        nilaiPenyampaian: Number(formData.nilaiPenyampaian) || 85,
        nilaiMetodeMedia: Number(formData.nilaiMetodeMedia) || 85,
        nilaiEvaluasi: Number(formData.nilaiEvaluasi) || 85,
        catatanPositif: formData.catatanPositif || '',
        catatanPerbaikan: formData.catatanPerbaikan || '',
        rekomendasi: formData.rekomendasi || '',
        status: (formData.status as any) || 'Sudah Disupervisi'
      };
      saveToStorage([newRec, ...supervisiList]);
    }

    setIsModalOpen(false);
  };

  const filteredList = supervisiList.filter(item => {
    const matchSearch = item.namaGuru.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.mataPelajaran.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        item.supervisor.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'Semua' || item.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const getAverageScore = (rec: SupervisiRecord) => {
    const avg = (rec.nilaiPerangkat + rec.nilaiPenyampaian + rec.nilaiMetodeMedia + rec.nilaiEvaluasi) / 4;
    return Math.round(avg * 10) / 10;
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold">Amat Baik ({score})</span>;
    if (score >= 80) return <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg text-xs font-bold">Baik ({score})</span>;
    if (score >= 70) return <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-bold">Cukup ({score})</span>;
    return <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold">Kurang ({score})</span>;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-2xl p-6 text-white shadow-xl border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Penilaian Kinerja Guru (PKG)
            </span>
          </div>
          <h2 className="text-2xl font-black tracking-tight">Supervisi & Observasi Pembelajaran</h2>
          <p className="text-slate-300 text-sm max-w-2xl">
            Monitoring kinerja guru secara berkala, penilaian perangkat ajar, observasi kelas, dan catatan pembinaan profesional oleh Kepala Sekolah dan Pengawas.
          </p>
        </div>
        <button
          onClick={handleOpenAdd}
          className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" /> Tambah Catatan Supervisi
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#121826] rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Total Guru Disupervisi</p>
            <p className="text-xl font-black text-white mt-1">{supervisiList.length} Guru</p>
          </div>
          <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl">
            <UserCheck className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121826] rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Rata-rata Skor Sekolah</p>
            <p className="text-xl font-black text-emerald-400 mt-1">
              {supervisiList.length > 0 
                ? Math.round(supervisiList.reduce((acc, curr) => acc + getAverageScore(curr), 0) / supervisiList.length * 10) / 10 
                : 0} / 100
            </p>
          </div>
          <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121826] rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Kategori Amat Baik</p>
            <p className="text-xl font-black text-blue-400 mt-1">
              {supervisiList.filter(s => getAverageScore(s) >= 90).length} Guru
            </p>
          </div>
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl">
            <Star className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#121826] rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-xs text-slate-400 font-semibold uppercase">Status Selesai</p>
            <p className="text-xl font-black text-amber-400 mt-1">
              {supervisiList.filter(s => s.status === 'Sudah Disupervisi').length} Selesai
            </p>
          </div>
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-[#121826] p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nama guru, mapel, supervisor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1a2234] border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-[#1a2234] border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="Semua">Semua Status</option>
            <option value="Sudah Disupervisi">Sudah Disupervisi</option>
            <option value="Jadwal Ulang">Jadwal Ulang</option>
            <option value="Belum Disupervisi">Belum Disupervisi</option>
          </select>
        </div>
      </div>

      {/* Table List */}
      <div className="bg-[#121826] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#1a2234] border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-4">Nama Guru & Mapel</th>
                <th className="py-3.5 px-4">Kelas / Tgl</th>
                <th className="py-3.5 px-4">Supervisor</th>
                <th className="py-3.5 px-4 text-center">Skor PKG</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 text-xs">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Tidak ada data supervisi guru yang ditemukan.
                  </td>
                </tr>
              ) : (
                filteredList.map((rec) => {
                  const avgScore = getAverageScore(rec);
                  return (
                    <tr key={rec.id} className="hover:bg-[#1a2234]/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm">{rec.namaGuru}</div>
                        <div className="text-[11px] text-indigo-400 mt-0.5">{rec.mataPelajaran}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-200 font-medium">Kelas {rec.kelasObservasi}</div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3 text-slate-500" /> {rec.tanggalObservasi}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300 font-medium">{rec.supervisor}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {getScoreBadge(avgScore)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          rec.status === 'Sudah Disupervisi' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' :
                          rec.status === 'Jadwal Ulang' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                          'bg-slate-700/30 text-slate-400'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => setIsPrintModal(rec)}
                          title="Cetak Berita Acara Supervisi"
                          className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(rec)}
                          title="Edit Catatan"
                          className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 transition-colors"
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#121826] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl text-slate-100 my-8">
            <div className="flex items-center justify-between px-6 py-4 bg-[#1a2234] border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                {selectedRecord ? 'Edit Catatan Supervisi Guru' : 'Tambah Catatan Supervisi Baru'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Pilih Guru</label>
                  <select
                    value={formData.namaGuru}
                    onChange={(e) => {
                      const found = guruList.find(g => g.nama === e.target.value);
                      setFormData({
                        ...formData,
                        namaGuru: e.target.value,
                        guruId: found?.id || 'g-1',
                        mataPelajaran: found?.mataPelajaran || formData.mataPelajaran
                      });
                    }}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Pilih Guru dari Database --</option>
                    {guruList.map(g => (
                      <option key={g.id} value={g.nama}>{g.nama} ({g.mataPelajaran})</option>
                    ))}
                    {guruList.length === 0 && (
                      <option value="Aulia Safitri, S.Pd">Aulia Safitri, S.Pd (Bahasa Indonesia)</option>
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={formData.mataPelajaran || ''}
                    onChange={(e) => setFormData({ ...formData, mataPelajaran: e.target.value })}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Matematika / PAI"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Kelas Observasi</label>
                  <input
                    type="text"
                    value={formData.kelasObservasi || ''}
                    onChange={(e) => setFormData({ ...formData, kelasObservasi: e.target.value })}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: X-A / XI-IPA-1"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Tanggal Observasi</label>
                  <input
                    type="date"
                    value={formData.tanggalObservasi || ''}
                    onChange={(e) => setFormData({ ...formData, tanggalObservasi: e.target.value })}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Supervisor / Penilai</label>
                  <input
                    type="text"
                    value={formData.supervisor || ''}
                    onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Status Supervisi</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Sudah Disupervisi">Sudah Disupervisi</option>
                    <option value="Jadwal Ulang">Jadwal Ulang</option>
                    <option value="Belum Disupervisi">Belum Disupervisi</option>
                  </select>
                </div>
              </div>

              {/* Scoring Section */}
              <div className="bg-[#1a2234] p-4 rounded-xl border border-slate-800 space-y-3">
                <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Komponen Penilaian Kinerja (Skala 0 - 100)</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">1. Perangkat Pembelajaran (Modul Ajar, ATP)</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.nilaiPerangkat ?? 85}
                      onChange={(e) => setFormData({ ...formData, nilaiPerangkat: Number(e.target.value) })}
                      className="w-full bg-[#121826] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">2. Penyampaian & Penguasaan Materi</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.nilaiPenyampaian ?? 85}
                      onChange={(e) => setFormData({ ...formData, nilaiPenyampaian: Number(e.target.value) })}
                      className="w-full bg-[#121826] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">3. Metode, Interaksi & Media IT</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.nilaiMetodeMedia ?? 85}
                      onChange={(e) => setFormData({ ...formData, nilaiMetodeMedia: Number(e.target.value) })}
                      className="w-full bg-[#121826] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-300 mb-1">4. Evaluasi & Asesmen Pembelajaran</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={formData.nilaiEvaluasi ?? 85}
                      onChange={(e) => setFormData({ ...formData, nilaiEvaluasi: Number(e.target.value) })}
                      className="w-full bg-[#121826] border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Notes & Feedback */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Catatan Positif / Keunggulan</label>
                  <textarea
                    rows={2}
                    value={formData.catatanPositif || ''}
                    onChange={(e) => setFormData({ ...formData, catatanPositif: e.target.value })}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Tuliskan apresiasi dan keunggulan mengajar guru..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Catatan Perbaikan / Masukan</label>
                  <textarea
                    rows={2}
                    value={formData.catatanPerbaikan || ''}
                    onChange={(e) => setFormData({ ...formData, catatanPerbaikan: e.target.value })}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Tuliskan hal yang perlu ditingkatkan..."
                  ></textarea>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Rekomendasi / Tindak Lanjut</label>
                  <input
                    type="text"
                    value={formData.rekomendasi || ''}
                    onChange={(e) => setFormData({ ...formData, rekomendasi: e.target.value })}
                    className="w-full bg-[#1a2234] border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    placeholder="Contoh: Mengikuti workshop media digital atau peer-teaching"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-bold text-xs transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 transition-all"
                >
                  <Save className="w-4 h-4" /> Simpan Catatan Supervisi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print / Report Preview Modal */}
      {isPrintModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
          <div id="printable-supervisi" className="bg-[#121826]/95 backdrop-blur-xl border border-slate-800 text-slate-100 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl my-auto relative font-sans overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 bg-[#1a2234] border-b border-slate-800 shrink-0 z-10 sticky top-0">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-indigo-400" /> Lembar Penilaian Kinerja Guru (PKG)
              </h3>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={handleDownloadDoc}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/30 transition-all"
                  title="Unduh Dokumen Word / HTML"
                >
                  <Download className="w-4 h-4" /> Unduh Dokumen
                </button>
                <button
                  onClick={handleDownloadText}
                  className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all"
                  title="Unduh Format Teks (.txt)"
                >
                  <FileText className="w-4 h-4" /> Teks
                </button>
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-indigo-600/30 transition-all"
                >
                  <Printer className="w-4 h-4" /> Cetak Dokumen
                </button>
                <button
                  onClick={() => setIsPrintModal(null)}
                  className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-6 overflow-y-auto flex-1 space-y-4">

            {/* Formal Letterhead */}
            <div className="text-center space-y-1 pb-6 border-b border-slate-800">
              <h2 className="text-lg font-black tracking-wider uppercase text-white">{schoolSettings?.namaSekolah || 'SEKOLAH ISLAM AL FAKHIR'}</h2>
              <p className="text-xs text-slate-400">{schoolSettings?.alamat || 'Jl. Pendidikan No. 10, Kota Sukabumi, Jawa Barat'}</p>
              <p className="text-[11px] text-slate-500">Telp: {schoolSettings?.telepon || '0266-123456'} | Email: {schoolSettings?.email || 'info@alfakhir.sch.id'}</p>
            </div>


              <div className="text-center">
                <h3 className="text-sm font-extrabold underline uppercase tracking-wide text-indigo-300">LEMBAR OBSERVASI & PENILAIAN KINERJA GURU (PKG)</h3>
                <p className="text-xs text-slate-400 mt-1">Tahun Ajaran 2025/2026 Semester Genap</p>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs pt-2 bg-[#1a2234]/60 p-4 rounded-xl border border-slate-800">
                <div><span className="font-semibold text-slate-400">Nama Guru:</span> <span className="text-white font-bold">{isPrintModal.namaGuru}</span></div>
                <div><span className="font-semibold text-slate-400">Mata Pelajaran:</span> <span className="text-indigo-400 font-bold">{isPrintModal.mataPelajaran}</span></div>
                <div><span className="font-semibold text-slate-400">Kelas Observasi:</span> <span className="text-white font-medium">Kelas {isPrintModal.kelasObservasi}</span></div>
                <div><span className="font-semibold text-slate-400">Tanggal Observasi:</span> <span className="text-white font-medium">{isPrintModal.tanggalObservasi}</span></div>
                <div><span className="font-semibold text-slate-400">Nama Supervisor:</span> <span className="text-white font-medium">{isPrintModal.supervisor}</span></div>
                <div><span className="font-semibold text-slate-400">Status Penilaian:</span> <span className="text-emerald-400 font-bold">{isPrintModal.status}</span></div>
              </div>

              {/* Table Scores */}
              <div className="pt-2">
                <table className="w-full text-left border-collapse border border-slate-800 text-xs rounded-xl overflow-hidden">
                  <thead>
                    <tr className="bg-[#1a2234] border-b border-slate-800 text-slate-300">
                      <th className="py-2.5 px-3 border-r border-slate-800 font-bold text-center">No</th>
                      <th className="py-2.5 px-3 border-r border-slate-800 font-bold">Komponen Penilaian Kinerja</th>
                      <th className="py-2.5 px-3 text-center font-bold">Skor (0-100)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    <tr className="hover:bg-[#1a2234]/40">
                      <td className="py-2.5 px-3 border-r border-slate-800 text-center text-slate-400">1</td>
                      <td className="py-2.5 px-3 border-r border-slate-800 text-slate-200">Perangkat Pembelajaran (Modul Ajar, ATP, Prota)</td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{isPrintModal.nilaiPerangkat}</td>
                    </tr>
                    <tr className="hover:bg-[#1a2234]/40">
                      <td className="py-2.5 px-3 border-r border-slate-800 text-center text-slate-400">2</td>
                      <td className="py-2.5 px-3 border-r border-slate-800 text-slate-200">Penyampaian & Penguasaan Materi Pembelajaran</td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{isPrintModal.nilaiPenyampaian}</td>
                    </tr>
                    <tr className="hover:bg-[#1a2234]/40">
                      <td className="py-2.5 px-3 border-r border-slate-800 text-center text-slate-400">3</td>
                      <td className="py-2.5 px-3 border-r border-slate-800 text-slate-200">Metode, Interaksi Kelas & Pemanfaatan Media IT</td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{isPrintModal.nilaiMetodeMedia}</td>
                    </tr>
                    <tr className="hover:bg-[#1a2234]/40">
                      <td className="py-2.5 px-3 border-r border-slate-800 text-center text-slate-400">4</td>
                      <td className="py-2.5 px-3 border-r border-slate-800 text-slate-200">Evaluasi, Asesmen & Tindak Lanjut Pembelajaran</td>
                      <td className="py-2.5 px-3 text-center font-bold text-white">{isPrintModal.nilaiEvaluasi}</td>
                    </tr>
                    <tr className="bg-[#1a2234] font-bold">
                      <td colSpan={2} className="py-3 px-3 border-r border-slate-800 text-right text-slate-300">RATA-RATA SKOR AKHIR:</td>
                      <td className="py-3 px-3 text-center text-indigo-400 text-sm">
                        {getAverageScore(isPrintModal)} ({getAverageScore(isPrintModal) >= 90 ? 'Amat Baik' : getAverageScore(isPrintModal) >= 80 ? 'Baik' : 'Cukup'})
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Notes */}
              <div className="space-y-3 pt-2 text-xs">
                <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                  <p className="font-bold text-emerald-400 mb-1">Catatan Positif & Keunggulan:</p>
                  <p className="text-emerald-200/90">{isPrintModal.catatanPositif || '-'}</p>
                </div>

                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <p className="font-bold text-amber-400 mb-1">Catatan Perbaikan & Masukan:</p>
                  <p className="text-amber-200/90">{isPrintModal.catatanPerbaikan || '-'}</p>
                </div>

                <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="font-bold text-blue-400 mb-1">Rekomendasi & Tindak Lanjut Pembinaan:</p>
                  <p className="text-blue-200/90">{isPrintModal.rekomendasi || '-'}</p>
                </div>
              </div>

              {/* Signature Block */}
              <div className="grid grid-cols-2 pt-10 text-center text-xs text-slate-300 pb-4">
                <div>
                  <p className="mb-14 text-slate-400">Guru Yang Disupervisi,</p>
                  <p className="font-bold underline text-white">{isPrintModal.namaGuru}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">NIP. ....................................</p>
                </div>
                <div>
                  <p className="mb-14 text-slate-400">Supervisor / Kepala Sekolah,</p>
                  <p className="font-bold underline text-white">{isPrintModal.supervisor.split('(')[0]}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">NIP. 19820412 200801 1 003</p>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
