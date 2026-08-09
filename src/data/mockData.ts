import {
  Siswa,
  Guru,
  Staf,
  RombelKelas,
  MataPelajaranItem,
  ScheduleSlot,
  AbsensiSiswaHarian,
  AbsensiSiswaKelas,
  AbsensiGuru,
  BankSoal,
  UjianCBT,
  HasilUjian,
  AdministrasiGuru,
  TagihanKeuangan,
  TransaksiKeuangan,
  JadwalUjianItem,
  FonnteConfig,
  SchoolSettings,
  TarifBiaya
} from '../types/school';

export const INITIAL_ROMBEL: RombelKelas[] = [];

export const INITIAL_SISWA: Siswa[] = [];

export const INITIAL_GURU: Guru[] = [];

export const INITIAL_STAF: Staf[] = [];

export const INITIAL_ABSENSI_GURU: AbsensiGuru[] = [];

export const INITIAL_ABSENSI_SISWA_HARIAN: AbsensiSiswaHarian[] = [];

export const INITIAL_ABSENSI_SISWA_KELAS: AbsensiSiswaKelas[] = [];

export const INITIAL_BANK_SOAL: BankSoal[] = [];

export const INITIAL_UJIAN: UjianCBT[] = [];

export const INITIAL_JADWAL_UJIAN: JadwalUjianItem[] = [];

export const INITIAL_ADMINISTRASI: AdministrasiGuru[] = [];

export const INITIAL_TAGIHAN: TagihanKeuangan[] = [];

export const INITIAL_TRANSAKSI: TransaksiKeuangan[] = [];

export const INITIAL_FONNTE_CONFIG: FonnteConfig = {
  apiKey: 'FONNTE_EDU_TOKEN_2026_SMP_MODERN_AL_FAKHIR',
  senderName: 'SMP Modern Al Fakhir',
  enabled: true,
  autoSendAbsensi: true,
  autoSendKeuangan: true,
  templateAbsensiMasuk: `*PRESENSI SEKOLAH - NOTIFIKASI MASUK*

Yth. Bapak/Ibu Wali dari *{NAMA_SISWA}* (*Kelas {KELAS}*),

Kami menginformasikan bahwa siswa/i atas nama *{NAMA_SISWA}* telah *HADIR & MELAKUKAN PRESENSI MASUK* di sekolah pada:
🗓 Tanggal: *{TANGGAL}*
⏰ Jam Scan: *{JAM_SCAN} WIB*
📍 Status: *Hadir Tepat Waktu*

Terima kasih atas perhatian dan kerja sama Bapak/Ibu Wali Murid.

_{NAMA_SEKOLAH}_`,
  templateAbsensiPulang: `*PRESENSI SEKOLAH - NOTIFIKASI PULANG*

Yth. Bapak/Ibu Wali dari *{NAMA_SISWA}* (*Kelas {KELAS}*),

Kami menginformasikan bahwa siswa/i atas nama *{NAMA_SISWA}* telah *SELESAI KBM & PRESENSI PULANG* dari sekolah pada:
🗓 Tanggal: *{TANGGAL}*
⏰ Jam Scan: *{JAM_SCAN} WIB*
📍 Status: *Sudah Pulang*

Terima kasih dan selamat beristirahat.

_{NAMA_SEKOLAH}_`,
  templateReminder: `Yth. Bapak/Ibu Wali dari {NAMA_SISWA} ({KELAS}),

Menginformasikan tagihan {TAGIHAN} sebesar Rp {NOMINAL} akan jatuh tempo pada {JATUH_TEMPO}.
Status saat ini: {STATUS}.
Mohon dapat melakukan pembayaran melalui Rekening Kasir Sekolah / QRIS / Transfer Bank.

Terima kasih atas perhatian Bapak/Ibu.
- Bendahara {NAMA_SEKOLAH}`,
  templateReceipt: `Yth. Bapak/Ibu Wali dari {NAMA_SISWA} ({KELAS}),

Terima kasih, pembayaran {TAGIHAN} sebesar Rp {NOMINAL} telah KAMI TERIMA dengan baik pada {TANGGAL_BAYAR}.
No. Bukti / Transaksi: {NO_TRANSAKSI}
Metode: {METODE_BAYAR}

Status Tagihan: LUNAS.
- Bendahara {NAMA_SEKOLAH}`
};

export const INITIAL_SCHOOL_SETTINGS: SchoolSettings = {
  namaSekolah: 'SMP Modern Al Fakhir',
  npsn: '70048660',
  bentukPendidikan: 'SMP',
  statusSekolah: 'Swasta',
  akreditasi: 'A (Unggul)',
  alamat: 'Jl. Education No. 123, Kebayoran Baru',
  rtRw: '005 / 002',
  kelurahan: 'Kebayoran Baru',
  kecamatan: 'Kebayoran Baru',
  kotaKabupaten: 'Kota Jakarta Selatan',
  provinsi: 'DKI Jakarta',
  kodePos: '12110',
  telepon: '(021) 555-0199',
  email: 'info@smpmodernalfakhir.sch.id',
  website: 'https://smpmodernalfakhir.sch.id',
  kepalaSekolah: 'Dr. H. Ahmad Dahlan, M.Pd.',
  nipKepalaSekolah: '197501152000031001',
  tahunAjaran: '2026/2027',
  semesterAktif: 'Ganjil',
  logoUrl: 'https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=120&auto=format&fit=crop&q=80',
  fonnteToken: 'FONNTE_EDU_TOKEN_2026_SMP_MODERN_AL_FAKHIR',
  fonnteConfig: INITIAL_FONNTE_CONFIG,
  jadwalPresensi: {
    jamMasuk: '07:00',
    jamToleransi: '07:15',
    jamPulang: '14:30',
    hariKerja: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'],
    autoSwitchScanMode: true
  },
  googleSyncEmail: '',
  adminEmails: [],
  googleSyncEnabled: false,
  googleSyncSpreadsheetId: '',
  googleSyncSpreadsheetUrl: '',
  googleSyncLastTime: '',
  googleSyncStatus: 'idle'
};

export const INITIAL_MAPEL: MataPelajaranItem[] = [];

export const INITIAL_TARIF_BIAYA: TarifBiaya[] = [];

