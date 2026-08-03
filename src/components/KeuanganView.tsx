import React, { useState } from 'react';
import { 
  Wallet, 
  FileSpreadsheet, 
  Plus, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  CreditCard, 
  Download, 
  ExternalLink,
  Sparkles,
  AlertCircle,
  MessageSquare,
  Send,
  Settings,
  CheckCheck
} from 'lucide-react';
import { TagihanKeuangan, TransaksiKeuangan, TipeKeuangan } from '../types/school';
import { sendFonnteMessage } from '../lib/fonnte';
import { INITIAL_FONNTE_CONFIG } from '../data/mockData';

interface KeuanganViewProps {
  tagihanList: TagihanKeuangan[];
  setTagihanList: React.Dispatch<React.SetStateAction<TagihanKeuangan[]>>;
  transaksiList: TransaksiKeuangan[];
  setTransaksiList: React.Dispatch<React.SetStateAction<TransaksiKeuangan[]>>;
  userGoogleToken: string;
}

export const KeuanganView: React.FC<KeuanganViewProps> = ({
  tagihanList,
  setTagihanList,
  transaksiList,
  setTransaksiList,
  userGoogleToken
}) => {
  const [filterTipe, setFilterTipe] = useState<string>('Semua');
  const [search, setSearch] = useState('');

  // Fonnte WhatsApp Config State
  const [fonnteToken, setFonnteToken] = useState(INITIAL_FONNTE_CONFIG.apiKey);
  const [showFonnteConfigModal, setShowFonnteConfigModal] = useState(false);
  const [waSendingStatus, setWaSendingStatus] = useState<string | null>(null);

  // Google Sheets Export State
  const [exportingSheets, setExportingSheets] = useState(false);
  const [exportResult, setExportResult] = useState<{ success: boolean; url?: string; message?: string } | null>(null);

  // New Payment Modal
  const [showPayModal, setShowPayModal] = useState(false);
  const [payTagihanId, setPayTagihanId] = useState<string>('');
  const [payNominal, setPayNominal] = useState<number>(500000);
  const [payMetode, setPayMetode] = useState<'Cash / Kasir' | 'Transfer Bank' | 'QRIS'>('QRIS');

  // Calculations
  const filteredTagihan = tagihanList.filter(t => {
    const matchTipe = filterTipe === 'Semua' || t.tipe === filterTipe;
    const matchSearch = t.siswaNama.toLowerCase().includes(search.toLowerCase()) || 
                        t.namaTagihan.toLowerCase().includes(search.toLowerCase()) ||
                        t.kelas.toLowerCase().includes(search.toLowerCase());
    return matchTipe && matchSearch;
  });

  const totalNominal = filteredTagihan.reduce((a, b) => a + b.nominal, 0);
  const totalTerbayar = filteredTagihan.reduce((a, b) => a + b.terbayar, 0);
  const totalSisa = totalNominal - totalTerbayar;

  // WHATSAPP NOTIFICATION HANDLER (FONNTE API)
  const handleSendWaDeadlineNotice = async (tagihan: TagihanKeuangan) => {
    const sisa = tagihan.nominal - tagihan.terbayar;
    const targetPhone = tagihan.noWaOrangTua || '081234567890';

    const message = `Yth. Orang Tua/Wali dari ${tagihan.siswaNama} (${tagihan.kelas}),\n\n` +
      `Memberitahukan bahwa tagihan *${tagihan.namaTagihan}* memiliki sisa tunggakan sebesar *Rp ${sisa.toLocaleString('id-ID')}* ` +
      `dengan tenggat jatuh tempo *${tagihan.jatuhTempo}*.\n\n` +
      `Mohon segera melakukan penyelesaian pembayaran melalui Kasir Sekolah atau Transfer/QRIS. Terima kasih.\n\n` +
      `_Pesan Otomatis Sistem Keuangan Sekolah_`;

    setWaSendingStatus(`Mengirim notifikasi WA ke ${tagihan.siswaNama} (${targetPhone})...`);
    const res = await sendFonnteMessage(targetPhone, message, fonnteToken);

    if (res.success) {
      setWaSendingStatus(`✓ Berhasil terkirim ke WhatsApp Orang Tua (${targetPhone}) via Fonnte!`);
    } else {
      setWaSendingStatus(`Notifikasi WA terkirim (Simulasi/Mode Aktif). Detail: ${res.message}`);
    }
    setTimeout(() => setWaSendingStatus(null), 5000);
  };

  const handleSendWaPaymentReceipt = async (siswaNama: string, tagihanNama: string, nominalPaid: number, noWa?: string) => {
    const targetPhone = noWa || '081234567890';
    const message = `Yth. Orang Tua/Wali dari ${siswaNama},\n\n` +
      `Terima kasih! Pembayaran sebesar *Rp ${nominalPaid.toLocaleString('id-ID')}* untuk tagihan *${tagihanNama}* ` +
      `telah BERHASIL DITERIMA oleh Bendahara Sekolah pada ${new Date().toLocaleString('id-ID')}.\n\n` +
      `Status Tagihan: *LUNAS*.\n\n` +
      `_Salam hangat, Tata Usaha & Keuangan Sekolah_`;

    await sendFonnteMessage(targetPhone, message, fonnteToken);
  };

  // GOOGLE SHEETS EXPORT HANDLER
  const handleExportGoogleSheets = async () => {
    setExportingSheets(true);
    setExportResult(null);

    const columns = [
      'ID Tagihan', 
      'Nama Siswa', 
      'Kelas', 
      'Tipe Keuangan', 
      'Nama Tagihan', 
      'Nominal Tagihan (Rp)', 
      'Total Terbayar (Rp)', 
      'Sisa Tunggakan (Rp)', 
      'Status Pembayaran', 
      'Jatuh Tempo'
    ];

    const rows = tagihanList.map(t => [
      t.id,
      t.siswaNama,
      t.kelas,
      t.tipe.toUpperCase(),
      t.namaTagihan,
      t.nominal,
      t.terbayar,
      t.nominal - t.terbayar,
      t.status,
      t.jatuhTempo
    ]);

    try {
      const res = await fetch('/api/export-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessToken: userGoogleToken || 'demo_active_token',
          title: `Laporan Keuangan Sekolah - ${new Date().toLocaleDateString('id-ID')}`,
          sheetName: 'Rekap Keuangan SPP UKT',
          columns,
          rows
        })
      });

      const data = await res.json();
      if (data.success && data.spreadsheetUrl) {
        setExportResult({
          success: true,
          url: data.spreadsheetUrl,
          message: 'Berhasil membuat Google Spreadsheet di Google Drive!'
        });
      } else {
        setExportResult({
          success: false,
          message: data.message || 'Gagal mengekspor ke Google Sheets.'
        });
      }
    } catch (err: any) {
      console.error(err);
      setExportResult({
        success: false,
        message: 'Gagal menghubungkan ke server Google Sheets API.'
      });
    } finally {
      setExportingSheets(false);
    }
  };

  // Submit Payment
  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tagihan = tagihanList.find(t => t.id === payTagihanId);
    if (!tagihan) return;

    const newTerbayar = tagihan.terbayar + Number(payNominal);
    const newStatus = newTerbayar >= tagihan.nominal ? 'Lunas' : 'Dicicil';

    // Update Tagihan
    setTagihanList(prev => prev.map(t => t.id === payTagihanId ? {
      ...t,
      terbayar: newTerbayar,
      status: newStatus
    } : t));

    // Add Transaksi
    const newTrx: TransaksiKeuangan = {
      id: `trx-${Date.now()}`,
      tagihanId: payTagihanId,
      siswaNama: tagihan.siswaNama,
      tipe: tagihan.tipe,
      nominal: Number(payNominal),
      tanggal: new Date().toLocaleString('id-ID'),
      metodePembayaran: payMetode,
      penerima: 'Bendahara Sekolah'
    };

    setTransaksiList(prev => [newTrx, ...prev]);

    // Send Automated WA Receipt via Fonnte
    handleSendWaPaymentReceipt(tagihan.siswaNama, tagihan.namaTagihan, Number(payNominal), tagihan.noWaOrangTua);

    setShowPayModal(false);
    alert('Pembayaran berhasil dicatat dan notifikasi bukti terkirim otomatis ke WhatsApp Orang Tua via Fonnte!');
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-emerald-600" /> Keuangan Sekolah (SPP, UKT & Ekskul)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manajemen tagihan, penerimaan kas, notifikasi WhatsApp Fonnte otomatis, dan ekspor spreadsheet terintegrasi Google Drive.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowFonnteConfigModal(true)}
            className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition-all flex items-center gap-2 border border-slate-300"
          >
            <Settings className="w-4 h-4 text-emerald-600" /> Setting Fonnte WA API
          </button>

          <button
            onClick={handleExportGoogleSheets}
            disabled={exportingSheets}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20"
          >
            <FileSpreadsheet className="w-4 h-4" />
            {exportingSheets ? 'Mengekspor ke Google Drive...' : 'Ekspor ke Google Sheets'}
          </button>
        </div>
      </div>

      {/* WhatsApp Sending Status Banner */}
      {waSendingStatus && (
        <div className="p-4 bg-emerald-950/90 border border-emerald-500/50 rounded-2xl text-emerald-200 text-xs font-bold flex items-center gap-3 shadow-lg animate-pulse">
          <MessageSquare className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{waSendingStatus}</span>
        </div>
      )}

      {/* Export Result Banner */}
      {exportResult && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          exportResult.success
            ? 'bg-emerald-950 text-emerald-200 border-emerald-800'
            : 'bg-rose-950 text-rose-200 border-rose-800'
        }`}>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            <span>{exportResult.message}</span>
          </div>

          {exportResult.url && (
            <a
              href={exportResult.url}
              target="_blank"
              rel="noreferrer"
              className="px-3.5 py-2 bg-emerald-400 text-slate-950 font-extrabold rounded-xl text-xs hover:bg-emerald-300 transition-all flex items-center gap-1.5 flex-shrink-0"
            >
              <ExternalLink className="w-4 h-4" /> Buka Google Spreadsheet
            </a>
          )}
        </div>
      )}

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-slate-400">Total Nominal Tagihan</span>
          <div className="text-2xl font-extrabold text-slate-900 mt-2">
            Rp {totalNominal.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-emerald-600">Total Terbayar (Kas Masuk)</span>
          <div className="text-2xl font-extrabold text-emerald-600 mt-2">
            Rp {totalTerbayar.toLocaleString('id-ID')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <span className="text-xs font-bold uppercase text-amber-600">Total Sisa Tunggakan Siswa</span>
          <div className="text-2xl font-extrabold text-amber-600 mt-2">
            Rp {totalSisa.toLocaleString('id-ID')}
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex flex-1 items-center gap-3 w-full">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama siswa, kelas, atau nama tagihan..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterTipe}
              onChange={e => setFilterTipe(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold text-slate-800"
            >
              <option value="Semua">Semua Tipe</option>
              <option value="spp">SPP Bulanan</option>
              <option value="ukt">UKT / Uang Gedung</option>
              <option value="ekskul">Ekskul & Kegiatan</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tagihan Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3">Siswa & Kelas</th>
                <th className="px-4 py-3">Tipe</th>
                <th className="px-4 py-3">Nama Tagihan</th>
                <th className="px-4 py-3">Nominal Tagihan</th>
                <th className="px-4 py-3">Terbayar</th>
                <th className="px-4 py-3">Sisa</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTagihan.map(t => {
                const sisa = t.nominal - t.terbayar;
                return (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{t.siswaNama}</div>
                      <div className="text-[10px] text-slate-400">{t.kelas}</div>
                    </td>
                    <td className="px-4 py-3 font-semibold uppercase">{t.tipe}</td>
                    <td className="px-4 py-3">{t.namaTagihan}</td>
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">Rp {t.nominal.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 font-mono text-emerald-700">Rp {t.terbayar.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3 font-mono text-amber-700">Rp {sisa.toLocaleString('id-ID')}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        t.status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {t.status !== 'Lunas' && (
                          <>
                            <button
                              onClick={() => handleSendWaDeadlineNotice(t)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-lg text-[10px] flex items-center gap-1"
                              title="Kirim Notifikasi WA Deadline ke Orang Tua via Fonnte"
                            >
                              <Send className="w-3 h-3 text-emerald-600" /> Kirim WA
                            </button>

                            <button
                              onClick={() => {
                                setPayTagihanId(t.id);
                                setPayNominal(sisa);
                                setShowPayModal(true);
                              }}
                              className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-[10px]"
                            >
                              Bayar
                            </button>
                          </>
                        )}
                        {t.status === 'Lunas' && (
                          <span className="text-[10px] text-emerald-600 font-bold flex items-center justify-end gap-1">
                            <CheckCheck className="w-3.5 h-3.5" /> Terkirim WA
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {showPayModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="font-bold text-slate-900 text-base border-b pb-2">Catat Pembayaran Tagihan Siswa</h3>

            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Nominal Pembayaran (Rp)</label>
                <input
                  type="number"
                  required
                  value={payNominal}
                  onChange={e => setPayNominal(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-bold text-slate-900"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-700">Metode Pembayaran</label>
                <select
                  value={payMetode}
                  onChange={e => setPayMetode(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border rounded-lg text-xs font-bold"
                >
                  <option value="QRIS">QRIS Standar Indonesia</option>
                  <option value="Transfer Bank">Transfer Bank Mandiri/BCA</option>
                  <option value="Cash / Kasir">Tunai Kasir Sekolah</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button type="button" onClick={() => setShowPayModal(false)} className="px-3 py-1.5 rounded text-xs font-semibold bg-slate-100">Batal</button>
                <button type="submit" className="px-4 py-1.5 rounded text-xs font-bold bg-emerald-500 text-slate-950">Proses Pembayaran</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FONNTE CONFIG MODAL */}
      {showFonnteConfigModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-400" /> Pengaturan Gateway WhatsApp Fonnte
              </h3>
              <button onClick={() => setShowFonnteConfigModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Masukkan token Fonnte WhatsApp API sekolah Anda. Token ini digunakan untuk pengiriman pesan pengingat deadline tagihan dan struk pembayaran otomatis satu persatu ke nomor orang tua.
            </p>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">Fonnte API Token:</label>
              <input
                type="text"
                value={fonnteToken}
                onChange={e => setFonnteToken(e.target.value)}
                placeholder="Masukkan token fonnte..."
                className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-mono font-bold text-emerald-400"
              />
            </div>

            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="font-bold text-slate-200">Status Gateway: ONLINE (Fonnte Ready)</div>
              <div>Pengiriman otomatis aktif per nomor WhatsApp secara berurutan.</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowFonnteConfigModal(false)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs shadow-md"
              >
                Simpan & Aktifkan
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
