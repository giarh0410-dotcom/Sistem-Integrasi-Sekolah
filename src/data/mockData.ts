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

export const INITIAL_ROMBEL: RombelKelas[] = [
  {
    id: 'rombel-01',
    namaRombel: 'X-IPA-1',
    tingkatKelas: 'Kelas 10',
    jurusanPeminatan: 'MIPA / Umum',
    waliKelasNama: 'Drs. Hendra Kusuma, M.Pd.',
    ruangan: 'Ruang R.101 (Gedung A Fl.1)',
    kurikulum: 'Kurikulum Merdeka',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    ketuaKelasNama: 'Ahmad Rizky Pratama',
    kapasitas: 36,
    catatan: 'Rombel Digital & Sains'
  },
  {
    id: 'rombel-02',
    namaRombel: 'XI-IPA-2',
    tingkatKelas: 'Kelas 11',
    jurusanPeminatan: 'MIPA',
    waliKelasNama: 'Mutiara Indah Pratiwi, S.Pd',
    ruangan: 'Ruang R.202 (Gedung B Fl.2)',
    kurikulum: 'Kurikulum Merdeka',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    ketuaKelasNama: 'Bagus Dewantara',
    kapasitas: 36,
    catatan: 'Fokus Olimpiade Sains'
  },
  {
    id: 'rombel-03',
    namaRombel: 'XI-IPS-1',
    tingkatKelas: 'Kelas 11',
    jurusanPeminatan: 'IPS',
    waliKelasNama: 'Budi Santoso, S.Kom',
    ruangan: 'Ruang R.205 (Gedung B Fl.2)',
    kurikulum: 'Kurikulum Merdeka',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    ketuaKelasNama: 'Cantika Putri Maharani',
    kapasitas: 36,
    catatan: 'Peminatan Ekonomi & Kewirausahaan'
  },
  {
    id: 'rombel-04',
    namaRombel: 'XII-IPA-1',
    tingkatKelas: 'Kelas 12',
    jurusanPeminatan: 'MIPA',
    waliKelasNama: 'Drs. Hendra Kusuma, M.Pd.',
    ruangan: 'Ruang R.301 (Gedung C Fl.3)',
    kurikulum: 'Kurikulum Merdeka',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    ketuaKelasNama: 'Dian Sastro Wijaya',
    kapasitas: 36,
    catatan: 'Persiapan SNBT & PTN'
  }
];

export const INITIAL_SISWA: Siswa[] = [
  {
    id: 'sis-01',
    nisn: '0081234561',
    nis: '20261001',
    nik: '3171011405080001',
    nama: 'Ahmad Rizky Pratama',
    kelas: 'X-IPA-1',
    jenisKelamin: 'L',
    tempatLahir: 'Jakarta',
    tanggalLahir: '2008-05-14',
    agama: 'Islam',
    alamat: 'Jl. Merdeka No. 12, Jakarta Selatan',
    alamatLengkap: 'Jl. Merdeka No. 12, RT 004 / RW 002, Kel. Kebayoran Baru, Jakarta Selatan',
    namaWali: 'Budi Pratama',
    teleponWali: '081298765432',
    status: 'Aktif',
    golonganDarah: 'O',
    kodeBarcode: 'SIS-0081234561',
    fotoUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'sis-02',
    nisn: '0081234562',
    nis: '20261002',
    nik: '3273022208080002',
    nama: 'Siti Nurhaliza',
    kelas: 'X-IPA-1',
    jenisKelamin: 'P',
    tempatLahir: 'Bandung',
    tanggalLahir: '2008-08-22',
    agama: 'Islam',
    alamat: 'Jl. Sunda No. 45, Bandung',
    alamatLengkap: 'Jl. Sunda No. 45, RT 001 / RW 005, Sumur Bandung, Kota Bandung',
    namaWali: 'Asep Ridwan',
    teleponWali: '081311223344',
    status: 'Aktif',
    golonganDarah: 'A',
    kodeBarcode: 'SIS-0081234562',
    fotoUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'sis-03',
    nisn: '0081234563',
    nis: '20261003',
    nik: '3471031003070003',
    nama: 'Bagus Dewantara',
    kelas: 'XI-IPA-2',
    jenisKelamin: 'L',
    tempatLahir: 'Yogyakarta',
    tanggalLahir: '2007-03-10',
    agama: 'Islam',
    alamat: 'Jl. Malioboro No. 88, Yogyakarta',
    alamatLengkap: 'Jl. Malioboro No. 88, Sosromenduran, Gedongtengen, Kota Yogyakarta',
    namaWali: 'Suryo Dewanto',
    teleponWali: '085677889900',
    status: 'Aktif',
    golonganDarah: 'B',
    kodeBarcode: 'SIS-0081234563',
    fotoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'sis-04',
    nisn: '0081234564',
    nis: '20261004',
    nik: '3578040511070004',
    nama: 'Cantika Putri Maharani',
    kelas: 'XI-IPS-1',
    jenisKelamin: 'P',
    tempatLahir: 'Surabaya',
    tanggalLahir: '2007-11-05',
    agama: 'Kristen',
    alamat: 'Jl. Pemuda No. 101, Surabaya',
    alamatLengkap: 'Jl. Pemuda No. 101, Embong Kaliasin, Genteng, Kota Surabaya',
    namaWali: 'Bambang Maharani',
    teleponWali: '081900112233',
    status: 'Aktif',
    golonganDarah: 'AB',
    kodeBarcode: 'SIS-0081234564',
    fotoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'sis-05',
    nisn: '0081234565',
    nis: '20261005',
    nik: '3374053001060005',
    nama: 'Dian Sastro Wijaya',
    kelas: 'XII-IPA-1',
    jenisKelamin: 'P',
    tempatLahir: 'Semarang',
    tanggalLahir: '2006-01-30',
    agama: 'Islam',
    alamat: 'Jl. Pandanaran No. 15, Semarang',
    alamatLengkap: 'Jl. Pandanaran No. 15, Pekunden, Semarang Tengah',
    namaWali: 'Hendra Wijaya',
    teleponWali: '082133445566',
    status: 'Aktif',
    golonganDarah: 'O',
    kodeBarcode: 'SIS-0081234565',
    fotoUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_GURU: Guru[] = [
  {
    id: 'gur-01',
    nip: '198501152010011002',
    nik: '3171051501850001',
    nama: 'Drs. Hendra Kusuma, M.Pd.',
    gelarDepan: 'Drs.',
    gelarBelakang: 'M.Pd.',
    mataPelajaran: 'Matematika Tingkat Lanjut',
    jabatan: 'Guru Pembina / Wakasek Kurikulum',
    email: 'hendra.kusuma@sekolah.sch.id',
    telepon: '081234567890',
    jenisKelamin: 'L',
    tempatLahir: 'Jakarta',
    tanggalLahir: '1985-01-15',
    agama: 'Islam',
    alamatLengkap: 'Komp. Pendidikan No. 4, Jakarta Selatan',
    pendidikanTerakhir: 'S2 Magister Pendidikan Matematika (UNJ)',
    sertifikasiGuru: true,
    status: 'PNS',
    kodeBarcode: 'GUR-198501152010011002',
    fotoUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'gur-02',
    nip: '199003202015022005',
    nik: '3171052003900002',
    nama: 'Siti Rahmawati, S.Si., M.Sc.',
    gelarBelakang: 'S.Si., M.Sc.',
    mataPelajaran: 'Fisika & Informatika',
    jabatan: 'Kepala Laboratorium Komputer',
    email: 'siti.rahmawati@sekolah.sch.id',
    telepon: '081398765432',
    jenisKelamin: 'P',
    tempatLahir: 'Bandung',
    tanggalLahir: '1990-03-20',
    agama: 'Islam',
    alamatLengkap: 'Jl. Tubagus Ismail No. 18, Bandung',
    pendidikanTerakhir: 'S2 Master of Science in Physics (ITB)',
    sertifikasiGuru: true,
    status: 'PNS',
    kodeBarcode: 'GUR-199003202015022005',
    fotoUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'gur-03',
    nip: '199508122020011008',
    nik: '3171051208950003',
    nama: 'Rian Hidayat, S.Pd.',
    gelarBelakang: 'S.Pd.',
    mataPelajaran: 'Bahasa Indonesia & Sastra',
    jabatan: 'Wali Kelas X-IPA-1',
    email: 'rian.hidayat@sekolah.sch.id',
    telepon: '085712345678',
    jenisKelamin: 'L',
    tempatLahir: 'Bogor',
    tanggalLahir: '1995-08-12',
    agama: 'Islam',
    alamatLengkap: 'Jl. Pajajaran No. 77, Bogor',
    pendidikanTerakhir: 'S1 Pendidikan Bahasa Indonesia (IPB)',
    sertifikasiGuru: true,
    status: 'GTY',
    kodeBarcode: 'GUR-199508122020011008',
    fotoUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_STAF: Staf[] = [
  {
    id: 'stf-01',
    nik: '3201123456780001',
    nama: 'Budi Santoso, A.Md.',
    bagian: 'Kepala Tata Usaha (TU)',
    email: 'budi.tu@sekolah.sch.id',
    telepon: '081211112222',
    jenisKelamin: 'L',
    tempatLahir: 'Jakarta',
    tanggalLahir: '1982-04-10',
    agama: 'Islam',
    alamatLengkap: 'Jl. Cempaka Putih Timur No. 12, Jakarta',
    pendidikanTerakhir: 'D3 Administrasi Perkantoran',
    status: 'Tetap',
    kodeBarcode: 'STF-3201123456780001',
    fotoUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stf-02',
    nik: '3201123456780002',
    nama: 'Ratna Pertiwi, S.Ak.',
    bagian: 'Bendahara / Keuangan',
    email: 'ratna.keuangan@sekolah.sch.id',
    telepon: '081333334444',
    jenisKelamin: 'P',
    tempatLahir: 'Depok',
    tanggalLahir: '1992-09-15',
    agama: 'Islam',
    alamatLengkap: 'Jl. Margonda Raya No. 44, Depok',
    pendidikanTerakhir: 'S1 Akuntansi (UI)',
    status: 'Tetap',
    kodeBarcode: 'STF-3201123456780002',
    fotoUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80'
  },
  {
    id: 'stf-03',
    nik: '3201123456780003',
    nama: 'Eko Prasetyo',
    bagian: 'Laboran & IT Support',
    email: 'eko.it@sekolah.sch.id',
    telepon: '085655556666',
    jenisKelamin: 'L',
    tempatLahir: 'Bekasi',
    tanggalLahir: '1997-12-01',
    agama: 'Islam',
    alamatLengkap: 'Jl. Ahmad Yani No. 80, Bekasi',
    pendidikanTerakhir: 'D3 Teknik Informatika',
    status: 'Kontrak',
    kodeBarcode: 'STF-3201123456780003',
    fotoUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80'
  }
];

export const INITIAL_ABSENSI_GURU: AbsensiGuru[] = [
  {
    id: 'abg-01',
    guruId: 'gur-01',
    guruNama: 'Drs. Hendra Kusuma, M.Pd.',
    tanggal: '2026-07-31',
    jamMasuk: '06:45',
    jamKeluar: '15:30',
    status: 'Hadir',
    statusIzin: 'Disetujui',
    lokasiIn: 'Gerbang Utama Sekolah (-6.200000, 106.816666)',
    metodeIn: 'Barcode / QR'
  },
  {
    id: 'abg-02',
    guruId: 'gur-02',
    guruNama: 'Siti Rahmawati, S.Si., M.Sc.',
    tanggal: '2026-07-31',
    jamMasuk: '06:50',
    jamKeluar: '15:15',
    status: 'Hadir',
    statusIzin: 'Disetujui',
    lokasiIn: 'Lobby Gedung B (-6.200000, 106.816666)',
    metodeIn: 'Barcode / QR'
  },
  {
    id: 'abg-03',
    guruId: 'gur-03',
    guruNama: 'Rian Hidayat, S.Pd.',
    tanggal: '2026-07-31',
    status: 'Izin',
    keteranganIzin: 'Mendampingi Lomba Debat Bahasa Indonesia Tingkat Provinsi',
    statusIzin: 'Disetujui',
    metodeIn: 'Manual'
  }
];

export const INITIAL_ABSENSI_SISWA_HARIAN: AbsensiSiswaHarian[] = [
  { id: 'abh-01', siswaId: 'sis-01', tanggal: '2026-07-31', status: 'Hadir', jamScan: '06:58', metodeScan: 'Barcode / QR' },
  { id: 'abh-02', siswaId: 'sis-02', tanggal: '2026-07-31', status: 'Hadir', jamScan: '07:01', metodeScan: 'Barcode / QR' },
  { id: 'abh-03', siswaId: 'sis-03', tanggal: '2026-07-31', status: 'Sakit', keterangan: 'Demam tinggi' },
  { id: 'abh-04', siswaId: 'sis-04', tanggal: '2026-07-31', status: 'Hadir', jamScan: '07:05', metodeScan: 'Barcode / QR' },
  { id: 'abh-05', siswaId: 'sis-05', tanggal: '2026-07-31', status: 'Izin', keterangan: 'Acara keluarga' }
];

export const INITIAL_ABSENSI_SISWA_KELAS: AbsensiSiswaKelas[] = [
  {
    id: 'abk-01',
    kelas: 'X-IPA-1',
    mataPelajaran: 'Fisika & Informatika',
    guruNama: 'Siti Rahmawati, S.Si., M.Sc.',
    tanggal: '2026-07-31',
    jamKe: '1 - 2 (07:00 - 08:30)',
    materi: 'Hukum Newton II dan Aplikasi Praktikum Gelombang',
    kehadiranMap: {
      'sis-01': 'Hadir',
      'sis-02': 'Hadir'
    },
    catatan: 'Siswa antusias mengikuti eksperimen di laboratorium.'
  },
  {
    id: 'abk-02',
    kelas: 'X-IPA-1',
    mataPelajaran: 'Matematika Tingkat Lanjut',
    guruNama: 'Drs. Hendra Kusuma, M.Pd.',
    tanggal: '2026-07-31',
    jamKe: '3 - 4 (08:45 - 10:15)',
    materi: 'Persamaan Trigonometri dan Aplikasi Real-World',
    kehadiranMap: {
      'sis-01': 'Hadir',
      'sis-02': 'Izin'
    },
    catatan: 'Siti izin ke ruang UKS di pertengahan jam.'
  }
];

export const INITIAL_BANK_SOAL: BankSoal[] = [
  {
    id: 'bs-01',
    judul: 'Asesmen Sumatif Akhir Semester - Matematika Kurikulum Merdeka',
    kode: 'MAT-X-2026',
    mataPelajaran: 'Matematika Tingkat Lanjut',
    kelas: 'X-IPA-1',
    durasiMenit: 90,
    jumlahSoal: 4,
    dibuatOleh: 'Drs. Hendra Kusuma, M.Pd.',
    tanggalDibuat: '2026-07-25',
    daftarSoal: [
      {
        id: 'soal-1',
        tipe: 'pg',
        pertanyaan: 'Jika log 2 = 0.301 dan log 3 = 0.477, berapakah nilai dari log 12?',
        opsi: [
          { id: 'A', teks: '0.778' },
          { id: 'B', teks: '1.079' },
          { id: 'C', teks: '1.255' },
          { id: 'D', teks: '0.903' }
        ],
        kunciJawaban: 'B',
        pembahasan: 'log 12 = log (2^2 * 3) = 2 log 2 + log 3 = 2(0.301) + 0.477 = 0.602 + 0.477 = 1.079',
        bobot: 20
      },
      {
        id: 'soal-2',
        tipe: 'multiple_choice',
        pertanyaan: 'Manakah di antara pernyataan berikut yang BENAR mengenai sifat-sifat fungsi eksponen y = a^x (a > 1)? (Pilih lebih dari satu)',
        opsi: [
          { id: 'A', teks: 'Fungsi selalu monoton naik' },
          { id: 'B', teks: 'Memotong sumbu Y di titik (0,1)' },
          { id: 'C', teks: 'Memiliki asimtot mendatar sumbu X (y=0)' },
          { id: 'D', teks: 'Selalu memotong sumbu X di titik (1,0)' }
        ],
        kunciJawaban: ['A', 'B', 'C'],
        pembahasan: 'Pernyataan A, B, dan C benar. D salah karena fungsi eksponen tidak pernah memotong sumbu X.',
        bobot: 25
      },
      {
        id: 'soal-3',
        tipe: 'isian',
        pertanyaan: 'Turunan pertama dari fungsi f(x) = 3x^2 - 5x + 8 terhadap x adalah...',
        kunciJawaban: '6x - 5',
        pembahasan: 'f\'(x) = d/dx (3x^2) - d/dx (5x) + d/dx (8) = 6x - 5.',
        bobot: 25
      },
      {
        id: 'soal-4',
        tipe: 'esai',
        pertanyaan: 'Jelaskan penerapan konsep matriks dan sistem persamaan linear dalam penyelesaian masalah alokasi sumber daya industri!',
        kunciJawaban: 'Matriks digunakan untuk merepresentasikan koefisien variabel produksi...',
        pembahasan: 'Penilaian berdasarkan kejelasan variabel, penyusunan persamaan matriks, dan analisis penyelesaian.',
        bobot: 30
      }
    ]
  }
];

export const INITIAL_UJIAN: UjianCBT[] = [
  {
    id: 'uj-01',
    bankSoalId: 'bs-01',
    judulUjian: 'Penilaian Tengah Semester (PTS) Matematika Kelas X',
    mataPelajaran: 'Matematika Tingkat Lanjut',
    kelasTarget: 'X-IPA-1',
    waktuMulai: '2026-08-01T07:30:00',
    waktuSelesai: '2026-08-01T09:00:00',
    durasiMenit: 90,
    acakSoal: true,
    modeAntiCheat: true,
    status: 'Aktif'
  }
];

export const INITIAL_JADWAL_UJIAN: JadwalUjianItem[] = [
  {
    id: 'jdw-01',
    ujianId: 'uj-01',
    judulUjian: 'PTS Matematika Tingkat Lanjut',
    mataPelajaran: 'Matematika Tingkat Lanjut',
    kelasTarget: 'X-IPA-1',
    tanggal: '2026-08-01',
    jamMulai: '07:30',
    jamSelesai: '09:00',
    ruang: 'Lab Komputer 01',
    pengawas: 'Siti Rahmawati, S.Si., M.Sc.',
    status: 'Aktif'
  },
  {
    id: 'jdw-02',
    ujianId: 'uj-02',
    judulUjian: 'PTS Bahasa Indonesia Fase E',
    mataPelajaran: 'Bahasa Indonesia',
    kelasTarget: 'X-IPA-1',
    tanggal: '2026-08-01',
    jamMulai: '09:30',
    jamSelesai: '11:00',
    ruang: 'Lab Komputer 01',
    pengawas: 'Rian Hidayat, S.Pd.',
    status: 'Mendatang'
  },
  {
    id: 'jdw-03',
    ujianId: 'uj-03',
    judulUjian: 'PTS Fisika Terpadu',
    mataPelajaran: 'Fisika',
    kelasTarget: 'XI-IPA-2',
    tanggal: '2026-08-02',
    jamMulai: '07:30',
    jamSelesai: '09:00',
    ruang: 'Lab Fisika',
    pengawas: 'Drs. Hendra Kusuma, M.Pd.',
    status: 'Mendatang'
  }
];

export const INITIAL_ADMINISTRASI: AdministrasiGuru[] = [
  {
    id: 'adm-01',
    tipe: 'modul_ajar',
    guruNama: 'Mutiara Indah Pratiwi, S.Pd',
    mataPelajaran: 'Pendidikan Agama dan Budi Pekerti (PABP)',
    kelas: 'VII (Fase D)',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    judul: 'Modul Ajar Deep Learning & Inklusi: Bab I - Al-Qur\'an dan Sunnah Sebagai Pedoman Hidup',
    deskripsi: 'Modul Ajar SMP Islam Modern Al Fakhir T.A. 2026/2027 lengkap dengan Karakteristik Inklusif, Integrasi Nilai Islami, Prinsip Deep Learning (Mindful, Meaningful, Joyful), dan Asesmen Berdiferensiasi.',
    content: `MODUL AJAR
SMP ISLAM MODERN AL FAKHIR
TAHUN AJARAN 2026 / 2027

A. IDENTITAS
Nama Penyusun      : Mutiara Indah Pratiwi, S.Pd
Nama Sekolah       : SMP Islam Modern Al Fakhir
Mata Pelajaran     : Pendidikan Agama dan Budi Pekerti (PABP)
Fase/Kelas         : D/VII
Semester           : I (Ganjil)
Materi             : Bab I – Al-Qur’an dan Sunnah Sebagai Pedoman Hidup
Alokasi Waktu      : 2 x 40 menit
Tahun Pelajaran    : 2026-2027

B. KARAKTERISTIK PESERTA DIDIK
1. Karakteristik Peserta Didik Reguler
   • Kemampuan awal: Rata-rata peserta didik telah mengenal konsep dasar ketuhanan dan nama-nama ciptaan Allah Swt. (langit, bumi, matahari, bulan, bintang, hewan, tumbuhan) dari jenjang SD/MI.
   • Kesiapan belajar: Berada pada tahap operasional konkret menuju formal (usia 12–13 tahun), mampu berpikir hipotetis sederhana namun masih membutuhkan contoh konkret dan visual.
   • Minat: Menyukai kegiatan visual, diskusi kelompok, eksplorasi lingkungan, dan presentasi kreatif (poster, infografis, video pendek).
   • Gaya belajar: Bervariasi – visual (melihat gambar/video), auditori (mendengarkan penjelasan dan bacaan ayat), dan kinestetik (mengamati langsung lingkungan sekitar sekolah).
   • Kemampuan sosial: Sudah mampu bekerja sama dalam kelompok kecil, meski masih memerlukan bimbingan dalam pembagian peran yang adil.
   • Kemampuan komunikasi: Mampu menyampaikan pendapat secara lisan dan tulisan sederhana, mulai mampu menyusun argumen singkat yang runtut.

2. Karakteristik Peserta Didik Inklusif
   - A.B (Slow Learner): Tekun & ramah. Butuh langkah kecil & repetisi. Pendampingan terstruktur, evaluasi lisan bertahap.
   - G.A (Disleksia ringan): Daya ingat visual baik, aktif berbicara. Kesulitan membaca teks panjang & ayat Arab-Latin. Minat menggambar. Teks diperbesar, dibacakan, kartu bergambar, waktu tambahan.
   - M.A (ADHD): Energik, cepat tanggap bila diberi tugas gerak. Sulit fokus > 10 menit, mudah terdistraksi. Minat observasi lapangan. Instruksi singkat bertahap, jeda gerak, tempat duduk depan, task analysis.
   - Inklusi C (Autisme ringan - spektrum derajat 1): Teliti, konsisten ikuti rutinitas. Sulit dengan perubahan mendadak & kontak sosial spontan. Minat pola & klasifikasi. Jadwal visual, instruksi tertulis + gambar, buddy system.

C. KOMPONEN INTI
1. DIMENSI PROFIL LULUSAN
   a. Keimanan dan Ketakwaan terhadap Tuhan YME
      Peserta didik memahami alam semesta sebagai ciptaan Allah Swt. dan tanda kekuasaan-Nya, sehingga tumbuh keimanan, rasa kagum, dan syukur kepada Allah Swt.
   b. Mandiri dan Bertanggung Jawab
      Peserta didik menunjukkan sikap tanggung jawab menjaga dan melestarikan lingkungan sebagai bentuk pengamalan iman kepada Allah Swt. dalam kehidupan sehari-hari.
   c. Bernalar Kritis dan Kreatif
      Peserta didik mengamati dan menganalisis fenomena alam sebagai tanda kekuasaan Allah Swt., serta menyajikan hasilnya dalam bentuk gagasan, diskusi, atau karya sederhana.

2. TUJUAN PEMBELAJARAN (TP)
   • Target Peserta Didik Reguler:
     a. Menjelaskan makna alam semesta sebagai ciptaan dan tanda kekuasaan Allah Swt. berdasarkan Q.S. Al-A'rāf/7:54 dan Q.S. Al-Anbiyā'/21:30 dengan benar setelah berdiskusi;
     b. Mengidentifikasi minimal 3 fenomena alam di lingkungan sekitar sebagai bukti kekuasaan Allah Swt. dengan teliti setelah melakukan pengamatan;
     c. Menunjukkan sikap syukur, kagum, dan tanggung jawab menjaga kelestarian alam sebagai wujud keimanan dalam kehidupan sehari-hari;
     d. Menyajikan hasil pengamatan/analisis ayat dalam bentuk karya (tulisan, gambar, atau presentasi) secara kreatif dan percaya diri.
   • Target Peserta Didik Inklusi:
     - Target Inklusi Ringan: Menjelaskan sederhana alam semesta ciptaan Allah Swt. dengan bantuan gambar & teks diperbesar; mengidentifikasi minimal 2 fenomena alam dengan buddy; menunjukkan sikap syukur lisan/tulisan.
     - Target Inklusi Sedang: Mengenali konsep utama ciptaan Allah Swt. via media visual; mengikuti pengamatan dengan instruksi bertahap; menyebutkan 1-2 contoh ciptaan menggunakan kartu bergambar.
     - Target Individual (mengacu pada PPI): Mampu menunjuk 1 gambar ciptaan Allah Swt. dari 2 pilihan gambar; duduk mengikuti pengamatan minimal 10 menit dengan 1 kali jeda gerak terjadwal.

3. KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)
   • Peserta Didik Reguler: Mampu mendaftarkan minimal 3 fenomena alam hasil observasi beserta kaitannya dengan kandungan ayat Al-Qur'an tentang kekuasaan Allah Swt., serta menunjukkan sikap syukur dan tanggung jawab menjaga lingkungan dalam bentuk rencana aksi nyata.
   • Peserta Didik Inklusi Ringan: Mampu menyebutkan minimal 2 contoh ciptaan Allah Swt. di lingkungan sekitar dan menjelaskan secara sederhana kaitannya dengan rasa syukur, dengan bantuan gambar.
   • Peserta Didik Inklusi Sedang: Mampu menyebutkan minimal 1–2 contoh ciptaan Allah Swt. di lingkungan sekitar dan menunjukkan sikap syukur sederhana (verbal/gestur) sesuai kemampuan individu.

4. INTEGRASI NILAI ISLAMI
   Q.S. Al-A'rāf/7:54
   إِنَّ رَبَّكُمُ اللَّهُ الَّذِي خَلَقَ السَّمَاوَاتِ وَالْأَرْضَ فِي سِتَّةِ أَيَّامٍ ثُمَّ اسْتَوَىٰ عَلَى الْعَرْشِ يُغْشِي اللَّيْلَ النَّهَارَ يَطْلُبُهُ حَثِيثًا وَالشَّمْسَ وَالْقَمَرَ وَالنُّجُومَ مُسَخَّرَاتٍ بِأَمْرِهِ ۗ أَلَا لَهُ الْخَلْقُ وَالْأَمْرُ ۗ تَبَارَكَ اللَّهُ رَبُّ الْعَالَمِينَ
   Artinya: “Sesungguhnya Tuhanmu adalah Allah yang telah menciptakan langit dan bumi dalam enam masa, kemudian Dia berkuasa atas 'Arasy. Dia menutupkan malam pada siang yang mengikutinya dengan cepat. (Dia ciptakan) matahari, bulan, dan bintang-bintang tunduk pada perintah-Nya. Ingatlah! Hanya milik-Nyalah segala penciptaan dan urusan. Maha berlimpah anugerah Allah, Tuhan semesta alam.”

   Q.S. Al-Anbiyā'/21:30
   أَوَلَمْ يَرَ الَّذِينَ كَفَرُوا أَنَّ السَّمَاوَاتِ وَالْأَرْضَ كَانَتَا رَتْقًا فَفَتَقْنَاهُمَا ۖ وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ ۖ أَفَلَا يُؤْمِنُونَ
   Artinya: “Apakah orang-orang kafir tidak mengetahui bahwa langit dan bumi, keduanya, dahulu menyatu, kemudian Kami memisahkan keduanya dan Kami menjadikan segala sesuatu yang hidup berasal dari air? Maka, mengapa mereka tidak beriman?”

   Nilai-nilai Karakter Islami yang Ditanamkan:
   • Tauhid Rubūbiyah — meyakini Allah Swt. sebagai satu-satunya Pencipta dan Pengatur alam semesta.
   • Tafakur — merenungkan ciptaan Allah Swt. untuk menumbuhkan keyakinan dan ketundukan.
   • Syukur — mengungkapkan rasa terima kasih atas keteraturan dan keindahan alam.
   • Tanggung Jawab sebagai Khalifah fil Ardh — menjaga kelestarian lingkungan sebagai wujud nyata keimanan.

D. PRINSIP PEMBELAJARAN (DEEP LEARNING)
1. Mindful (Berkesadaran): Pembelajaran diawali dengan momen menghadirkan kesadaran penuh – tadabbur alam melalui latihan pernapasan singkat & mengamati suara alam. Untuk siswa inklusi disederhanakan dengan melihat 1 gambar alam sambil narik napas pelan.
2. Meaningful (Bermakna): Fenomena alam lingkungan sekolah dihubungkan dengan Q.S. Al-A'rāf/7:54 & Q.S. Al-Anbiyā'/21:30. Siswa inklusi diajak menggunakan kartu bergambar konkret (pohon, matahari, hewan).
3. Joyful (Menyenangkan): Eksplorasi lingkungan, kerja kelompok, presentasi karya, & penguatan positif (positive reinforcement) secara rutin.

E. ALUR PEMBELAJARAN
● Pertemuan 1 — Mengamati dan Merenungkan Alam Semesta (2 JP)
  - Tahap 1: Memahami — Mindful (10 menit): Latihan pernapasan & tadabbur alam, video keindahan alam semesta, penyampaian tujuan pembelajaran.
  - Tahap 2: Mengaplikasikan — Meaningful (40 menit): Penjelasan kekuasaan Allah & Q.S. Al-A'rāf/7:54, observasi lingkungan sekolah, presentasi kelompok, diferensiasi sketsa/puisi/deskripsi.
  - Tahap 3: Merefleksi — Joyful (10 menit): Refleksi singkat rasa syukur, apresiasi, tugas mencari ayat relevan.
  - Penyesuaian Inklusi: Kartu bergambar, pendampingan buddy system, instruksi bertahap.

● Pertemuan 2 — Analisis Ayat-Ayat Al-Qur'an tentang Alam Semesta (2 JP)
  - Tahap 1: Memahami — Mindful (10 menit): Merekap pengamatan sebelumnya dengan gambar & bacaan ayat.
  - Tahap 2: Mengaplikasikan — Meaningful (40 menit): Kajian Q.S. Al-A'rāf/7:54 & Q.S. Al-Anbiyā'/21:30, presentasi karya (infografis/video/drama).
  - Tahap 3: Merefleksi — Joyful (10 menit): Refleksi pemahaman ayat Al-Qur'an & tugas penyiapan karya.
  - Penyesuaian Inklusi: Teks ayat disederhanakan dalam kartu ringkas, pendampingan khusus.

● Pertemuan 3 — Mengaplikasikan Pemahaman dalam Kehidupan Sehari-hari (2 JP)
  - Tahap 1: Memahami — Mindful (10 menit): Membayangkan kontribusi nyata menjaga kelestarian alam.
  - Tahap 2: Mengaplikasikan — Meaningful (40 menit): Presentasi karya kekaguman alam & penyusunan rencana aksi nyata menjaga lingkungan.
  - Tahap 3: Merefleksi — Joyful (10 menit): Refleksi akhir bab & motivasi menjaga alam wujud keimanan.
  - Penyesuaian Inklusi: Rencana aksi 1 tindakan sederhana (membuang sampah), gambar/ungkapan lisan.

F. PENGUATAN LITERASI DAN NUMERASI
1. Literasi: Membaca & menelaah teks ayat Al-Qur'an + terjemahan, menyusun laporan observasi tertulis.
2. Numerasi: Mencatat & menghitung data sederhana hasil observasi (jumlah jenis makhluk hidup, waktu pengamatan).

G. ASESMEN
1. Asesmen Diagnostik: Observasi partisipasi, wawancara singkat, kuesioner pra-tes.
2. Asesmen Formatif: Catatan observasi, penilaian diskusi kelompok, presentasi karya.
3. Asesmen Sumatif (Contoh Pilihan Ganda):
   1) Q.S. Al-Anbiya'/21:30 "...أَوَلَمْ يَرَ الَّذِينَ كَفَرُوا..." artinya: C. Apakah orang-orang kafir tidak mengetahui
   2) Q.S. Al-Anbiya'/21:30 "...وَجَعَلْنَا مِنَ الْمَاءِ كُلَّ شَيْءٍ حَيٍّ..." artinya: C. Dan Kami jadikan segala sesuatu yang hidup berasal dari air
   3) Narasi Boni di tempat wisata: B. Mendiamkan temannya yang membuang sampah sembarangan (sikap yang tidak seharusnya).
   4) Sikap yang mencerminkan keimanan pada kekuasaan Allah: B. 1) dan 3).
4. Penyesuaian Asesmen Inklusi: Soal disederhanakan, jumlah soal dikurangi (10 jadi 5), jawaban lisan/gambar, penilaian praktik & observasi, tambahan waktu 10-15 menit, penggunaan media visual.

H. REFLEKSI
1. Refleksi Guru: Evaluasi pencapaian 4 kelompok sasaran, kendala utama, efektivitas diferensiasi, internalisasi nilai islami, fasilitas GPK/buddy, proporsi alokasi waktu, tindak lanjut KKTP.
2. Refleksi Siswa Reguler: Hal baru dipelajari, bagian disukai, bagian sulit, bantuan dibutuhkan, perasaan keagungan ciptaan Allah Swt.
3. Refleksi Siswa Inklusi: Topik dipelajari (pilih gambar), kegiatan disukai (gestur/lisan), perasaan (pilih emoji ekspresi), bantuan guru/buddy.

Sawangan, 15 Juli 2026

Mengetahui,
Kepala Sekolah                                  Guru Mata Pelajaran

Deni Rahmat, S.Sos.I                            Mutiara Indah Pratiwi, S.Pd`,
    tanggalInput: '2026-07-20',
    status: 'Disetujui Kepala Sekolah',
    fileType: 'template_kemendikdasmen',
    fileName: 'Modul_Ajar_SMP_Islam_Modern_Al_Fakhir_2026.docx'
  },
  {
    id: 'adm-02',
    tipe: 'atp',
    guruNama: 'Siti Rahmawati, S.Si., M.Sc.',
    mataPelajaran: 'Fisika',
    kelas: 'X',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    judul: 'Alur Tujuan Pembelajaran (ATP) Pengukuran & Vektor',
    deskripsi: 'ATP dengan jam pelajaran 72 JP mencakup domain Pemahaman Fisika dan Keterampilan Proses.',
    tanggalInput: '2026-07-22',
    status: 'Final',
    fileType: 'template_kemendikdasmen',
    fileName: 'ATP_Fisika_FaseE_2026.xlsx'
  },
  {
    id: 'adm-03',
    tipe: 'jurnal',
    guruNama: 'Rian Hidayat, S.Pd.',
    mataPelajaran: 'Bahasa Indonesia',
    kelas: 'X-IPA-1',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    judul: 'Jurnal Mengajar Harian - Teks Laporan Hasil Observasi',
    deskripsi: 'Diskusi kelompok pembuatan infografis hasil observasi lingkungan sekolah.',
    tanggalInput: '2026-07-30',
    status: 'Final',
    fileType: 'template_kemendikdasmen'
  },
  {
    id: 'adm-04',
    tipe: 'prota',
    guruNama: 'Drs. Hendra Kusuma, M.Pd.',
    mataPelajaran: 'Matematika',
    kelas: 'X',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    judul: 'Program Tahunan (Prota) Matematika Fase E SMA Tahun 2026/2027',
    deskripsi: 'Perhitungan alokasi waktu tahunan total 108 JP terbagi ganjil dan genap.',
    tanggalInput: '2026-07-15',
    status: 'Disetujui Kepala Sekolah',
    fileType: 'template_kemendikdasmen'
  },
  {
    id: 'adm-05',
    tipe: 'prosem',
    guruNama: 'Drs. Hendra Kusuma, M.Pd.',
    mataPelajaran: 'Matematika',
    kelas: 'X',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    judul: 'Program Semester (Prosem) Ganjil T.A. 2026/2027',
    deskripsi: 'Rincian distribusi minggu efektif, Penilaian Harian, PTS, dan PAS.',
    tanggalInput: '2026-07-18',
    status: 'Disetujui Kepala Sekolah',
    fileType: 'template_kemendikdasmen'
  },
  {
    id: 'adm-06',
    tipe: 'kaldik',
    guruNama: 'Tim Kurikulum',
    mataPelajaran: 'Umum',
    kelas: 'Semua Kelas',
    tahunAjaran: '2026/2027',
    semester: 'Ganjil',
    judul: 'Kalender Pendidikan Sekolah T.A. 2026/2027 Kemendikdasmen',
    deskripsi: 'Jadwal Hari Efektif Belajar (HEB), Ujian, Libur Semester, dan Kegiatan Ekstrakurikuler.',
    tanggalInput: '2026-07-10',
    status: 'Disetujui Kepala Sekolah',
    fileType: 'template_kemendikdasmen'
  }
];

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
  googleSyncEnabled: false,
  googleSyncSpreadsheetId: '',
  googleSyncSpreadsheetUrl: '',
  googleSyncLastTime: '',
  googleSyncStatus: 'idle'
};

export const INITIAL_MAPEL: MataPelajaranItem[] = [
  {
    id: 'mapel-01',
    kodeMapel: 'MP-MAT-01',
    namaMapel: 'Matematika Tingkat Lanjut',
    kategori: 'Wajib Umum',
    tingkatKelas: 'Kelas 10 & 11',
    guruPengampuNama: 'Drs. Hendra Kusuma, M.Pd.',
    nipGuru: '198501152010011002',
    alokasiJamPerMinggu: 4,
    kkm: 75,
    kurikulum: 'Kurikulum Merdeka',
    catatan: 'Pendalaman Trigonometri, Aljabar Linear & Kalkulus Dasar',
    jadwalMengajar: [
      { id: 'js-1', hari: 'Senin', jamMulai: '07:30', jamSelesai: '09:00', kelasTarget: 'X-IPA-1', ruangan: 'Ruang R.101 (Gedung A)' },
      { id: 'js-2', hari: 'Rabu', jamMulai: '09:15', jamSelesai: '10:45', kelasTarget: 'XI-IPA-2', ruangan: 'Ruang R.202 (Gedung B)' },
      { id: 'js-3', hari: 'Kamis', jamMulai: '11:00', jamSelesai: '12:30', kelasTarget: 'XII-IPA-1', ruangan: 'Ruang R.301 (Gedung C)' }
    ]
  },
  {
    id: 'mapel-02',
    kodeMapel: 'MP-FIS-02',
    namaMapel: 'Fisika & Informatika',
    kategori: 'Peminatan MIPA',
    tingkatKelas: 'Kelas 10 & 11',
    guruPengampuNama: 'Siti Rahmawati, S.Si., M.Sc.',
    nipGuru: '199003202015022005',
    alokasiJamPerMinggu: 4,
    kkm: 78,
    kurikulum: 'Kurikulum Merdeka',
    catatan: 'Integrasi Pemrograman Simulasi Fisika & Sensor IoT Laboratory',
    jadwalMengajar: [
      { id: 'js-4', hari: 'Selasa', jamMulai: '08:00', jamSelesai: '10:00', kelasTarget: 'X-IPA-1', ruangan: 'Lab Komputer Utama' },
      { id: 'js-5', hari: 'Kamis', jamMulai: '10:00', jamSelesai: '12:00', kelasTarget: 'XI-IPA-2', ruangan: 'Lab Fisika Modern' }
    ]
  },
  {
    id: 'mapel-03',
    kodeMapel: 'MP-IND-03',
    namaMapel: 'Bahasa Indonesia & Sastra',
    kategori: 'Wajib Umum',
    tingkatKelas: 'Semua Tingkat',
    guruPengampuNama: 'Rian Hidayat, S.Pd.',
    nipGuru: '199508122020011008',
    alokasiJamPerMinggu: 3,
    kkm: 75,
    kurikulum: 'Kurikulum Merdeka',
    catatan: 'Pengembangan Literasi Digital & Penulisan Essay Ilmiah',
    jadwalMengajar: [
      { id: 'js-6', hari: 'Senin', jamMulai: '09:15', jamSelesai: '11:15', kelasTarget: 'X-IPA-1', ruangan: 'Ruang R.101 (Gedung A)' },
      { id: 'js-7', hari: 'Jumat', jamMulai: '07:30', jamSelesai: '09:30', kelasTarget: 'XI-IPS-1', ruangan: 'Ruang R.205 (Gedung B)' }
    ]
  },
  {
    id: 'mapel-04',
    kodeMapel: 'MP-PAI-04',
    namaMapel: 'Pendidikan Agama Islam & Budi Pekerti',
    kategori: 'Wajib Umum',
    tingkatKelas: 'Semua Tingkat',
    guruPengampuNama: 'Ahmad Hidayat, S.Pd.I',
    nipGuru: '198804102012011004',
    alokasiJamPerMinggu: 3,
    kkm: 80,
    kurikulum: 'Kurikulum Merdeka',
    catatan: 'Tahfidz Al-Qur\'an, Fiqih Muamalah & Karakter Akhlakul Karimah',
    jadwalMengajar: [
      { id: 'js-8', hari: 'Selasa', jamMulai: '10:15', jamSelesai: '11:45', kelasTarget: 'X-IPA-1', ruangan: 'Ruang R.101 (Gedung A)' },
      { id: 'js-9', hari: 'Kamis', jamMulai: '07:30', jamSelesai: '09:00', kelasTarget: 'XII-IPA-1', ruangan: 'Ruang R.301 (Gedung C)' }
    ]
  },
  {
    id: 'mapel-05',
    kodeMapel: 'MP-EKO-05',
    namaMapel: 'Ekonomi & Kewirausahaan',
    kategori: 'Peminatan IPS',
    tingkatKelas: 'Kelas 11 & 12',
    guruPengampuNama: 'Budi Santoso, S.Kom',
    nipGuru: '199205112019031002',
    alokasiJamPerMinggu: 3,
    kkm: 75,
    kurikulum: 'Kurikulum Merdeka',
    catatan: 'Praktek Bisnis Startup Sekolah & Laporan Keuangan Digital',
    jadwalMengajar: [
      { id: 'js-10', hari: 'Senin', jamMulai: '10:00', jamSelesai: '12:00', kelasTarget: 'XI-IPS-1', ruangan: 'Ruang R.205 (Gedung B)' },
      { id: 'js-11', hari: 'Rabu', jamMulai: '13:00', jamSelesai: '14:30', kelasTarget: 'XII-IPA-1', ruangan: 'Ruang R.301 (Gedung C)' }
    ]
  }
];

export const INITIAL_TARIF_BIAYA: TarifBiaya[] = [
  {
    id: 'trf-01',
    namaBiaya: 'SPP Bulanan Kelas 7 (Tingkat VII)',
    tipe: 'spp',
    tingkatKelas: 'Kelas 7',
    nominal: 100000,
    periode: 'Bulanan',
    keterangan: 'Tarif SPP standar bulanan siswa kelas VII (7)',
    status: 'Aktif'
  },
  {
    id: 'trf-02',
    namaBiaya: 'SPP Bulanan Kelas 8 (Tingkat VIII)',
    tipe: 'spp',
    tingkatKelas: 'Kelas 8',
    nominal: 110000,
    periode: 'Bulanan',
    keterangan: 'Tarif SPP standar bulanan siswa kelas VIII (8)',
    status: 'Aktif'
  },
  {
    id: 'trf-03',
    namaBiaya: 'SPP Bulanan Kelas 9 (Tingkat IX)',
    tipe: 'spp',
    tingkatKelas: 'Kelas 9',
    nominal: 120000,
    periode: 'Bulanan',
    keterangan: 'Tarif SPP standar bulanan siswa kelas IX (9)',
    status: 'Aktif'
  },
  {
    id: 'trf-04',
    namaBiaya: 'SPP Bulanan Kelas 10 (Tingkat X)',
    tipe: 'spp',
    tingkatKelas: 'Kelas 10',
    nominal: 125000,
    periode: 'Bulanan',
    keterangan: 'Tarif SPP standar bulanan siswa kelas X',
    status: 'Aktif'
  },
  {
    id: 'trf-05',
    namaBiaya: 'Uang Gedung & Pengembangan (UKT)',
    tipe: 'ukt',
    tingkatKelas: 'Siswa Baru (Kelas 7)',
    nominal: 2500000,
    periode: 'Sekali Bayar (Uang Masuk / UKT)',
    keterangan: 'DSP / UKT Pembangunan Fasilitas Laboratorium & Kelas',
    status: 'Aktif'
  },
  {
    id: 'trf-06',
    namaBiaya: 'Seragam & Atribut Lengkap Sekolah',
    tipe: 'ukt',
    tingkatKelas: 'Siswa Baru (Kelas 7)',
    nominal: 750000,
    periode: 'Sekali Bayar (Uang Masuk / UKT)',
    keterangan: 'Paket 5 Stel Seragam, Batik, Olahraga & Atribut Pramuka',
    status: 'Aktif'
  },
  {
    id: 'trf-07',
    namaBiaya: 'Uang Pendaftaran & Administrasi Masuk',
    tipe: 'ukt',
    tingkatKelas: 'Siswa Baru (Kelas 7)',
    nominal: 300000,
    periode: 'Sekali Bayar (Uang Masuk / UKT)',
    keterangan: 'Biaya Administrasi Daftar Ulang & Masa Orientasi Siswa',
    status: 'Aktif'
  },
  {
    id: 'trf-08',
    namaBiaya: 'Iuran Wajib Kegiatan Pramuka',
    tipe: 'ekskul',
    tingkatKelas: 'Semua Tingkat',
    nominal: 30000,
    periode: 'Per Semester',
    keterangan: 'Kemah & Sertifikasi Kecakapan Pramuka Wajib',
    status: 'Aktif'
  },
  {
    id: 'trf-09',
    namaBiaya: 'Iuran Ekskul Olahraga & Futsal / Basket',
    tipe: 'ekskul',
    tingkatKelas: 'Peserta Ekskul',
    nominal: 50000,
    periode: 'Bulanan',
    keterangan: 'Sewa Lapangan & Pelatih Professional',
    status: 'Aktif'
  },
  {
    id: 'trf-10',
    namaBiaya: 'Iuran Ekskul Coding & IT Club',
    tipe: 'ekskul',
    tingkatKelas: 'Peserta Ekskul',
    nominal: 75000,
    periode: 'Bulanan',
    keterangan: 'Modul Pemrograman & Sertifikasi IT Studio',
    status: 'Aktif'
  }
];

