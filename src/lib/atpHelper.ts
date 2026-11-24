import { suggestAyatForMateri } from './quranAyatPresets';
import { normalizeFaseFromKelas } from './capaianPembelajaranHelper';

export interface AtpUnitRow {
  kodeTp: string;
  semester: 'Ganjil' | 'Genap';
  elemen: string;
  tujuanPembelajaran: string;
  materiEsensial: string;
  alokasiJp: number;
  dimensiProfil: string;
  kataKunci: string;
  strategiAsesmen: string;
}

export interface AtpGlosariumItem {
  istilah: string;
  definisi: string;
}

export interface AtpData {
  formatType: 'atp_resmi';
  identitas: {
    mataPelajaran: string;
    satuanPendidikan: string;
    fase: string;
    kelas: string;
    tahunAjaran: string;
    namaPenyusun: string;
    jpPerMinggu: number;
    fokusTopik: string;
    referensiRegulasi: string;
  };
  rasionalAlur: string;
  capaianPembelajaranUmum: string;
  daftarAlur: AtpUnitRow[];
  glosarium: AtpGlosariumItem[];
  catatanImplementasi: string;
  integrasiNilaiIslami: {
    surahAyat: string;
    teksArab: string;
    terjemahan: string;
    relevansiAtp: string;
  };
}

export interface AtpSummary {
  totalTp: number;
  tpGanjil: number;
  tpGenap: number;
  totalJpGanjil: number;
  totalJpGenap: number;
  totalJp: number;
  jumlahElemen: number;
}

export function isStructuredAtpData(data: any): data is AtpData {
  return Boolean(
    data &&
      data.formatType === 'atp_resmi' &&
      data.identitas &&
      Array.isArray(data.daftarAlur)
  );
}

export function calculateAtpSummary(atp: AtpData): AtpSummary {
  const ganjil = atp.daftarAlur.filter((r) => r.semester === 'Ganjil');
  const genap = atp.daftarAlur.filter((r) => r.semester === 'Genap');
  const totalJpGanjil = ganjil.reduce((acc, r) => acc + (Number(r.alokasiJp) || 0), 0);
  const totalJpGenap = genap.reduce((acc, r) => acc + (Number(r.alokasiJp) || 0), 0);
  const elemenSet = new Set(
    atp.daftarAlur.map((r) => (r.elemen || '').trim()).filter(Boolean)
  );

  return {
    totalTp: atp.daftarAlur.length,
    tpGanjil: ganjil.length,
    tpGenap: genap.length,
    totalJpGanjil,
    totalJpGenap,
    totalJp: totalJpGanjil + totalJpGenap,
    jumlahElemen: elemenSet.size,
  };
}

function getDefaultJpPerMinggu(mapel: string): number {
  const m = mapel.toLowerCase();
  if (m.includes('indonesia')) return 6;
  if (m.includes('matematika') || m.includes('ipa') || m.includes('alam')) return 5;
  if (m.includes('inggris') || m.includes('ips') || m.includes('sosial')) return 4;
  if (
    m.includes('informatika') ||
    m.includes('komputer') ||
    m.includes('tik') ||
    m.includes('agama') ||
    m.includes('pai') ||
    m.includes('pancasila') ||
    m.includes('pkn') ||
    m.includes('pjok') ||
    m.includes('jasmani')
  ) {
    return 3;
  }
  return 2;
}

function getKelasNumber(kelas: string): string {
  const upper = (kelas || '').toUpperCase();
  if (upper.includes('IX') || upper.includes('9')) return '9';
  if (upper.includes('VIII') || upper.includes('8')) return '8';
  return '7';
}

function getMapelPrefix(mapel: string): string {
  const m = mapel.toLowerCase();
  if (m.includes('informatika') || m.includes('komputer') || m.includes('tik')) return 'INF';
  if (m.includes('matematika')) return 'MAT';
  if (m.includes('ipa') || m.includes('alam')) return 'IPA';
  if (m.includes('ips') || m.includes('sosial')) return 'IPS';
  if (m.includes('indonesia')) return 'BIN';
  if (m.includes('inggris')) return 'BIG';
  if (m.includes('agama') || m.includes('pai')) return 'PAI';
  if (m.includes('pancasila') || m.includes('pkn')) return 'PPK';
  if (m.includes('pjok') || m.includes('jasmani')) return 'PJK';
  if (m.includes('seni')) return 'SBD';
  if (m.includes('arab')) return 'BAR';
  const letters = mapel.replace(/[^a-zA-Z]/g, '').toUpperCase();
  return (letters.slice(0, 3) || 'TP').padEnd(2, 'X');
}

export function buildOfficialAtpData(params: {
  mataPelajaran?: string;
  kelas?: string;
  topik?: string;
  tahunAjaran?: string;
  namaPenyusun?: string;
  satuanPendidikan?: string;
  jpPerMinggu?: number;
}): AtpData {
  const mapel = (params.mataPelajaran || 'Informatika').trim();
  const kelas = (params.kelas || 'VII').trim();
  const kNum = getKelasNumber(kelas);
  const prefix = getMapelPrefix(mapel);
  const fokusTopik =
    (params.topik || '').trim() || `Penguasaan Kompetensi Esensial ${mapel} Kelas ${kelas}`;
  const tahunAjaran = params.tahunAjaran || '2026/2027';
  const namaPenyusun = params.namaPenyusun || 'Guru Mata Pelajaran';
  const satuanPendidikan = params.satuanPendidikan || 'SMP Islam Modern Al Fakhir';
  const fase = normalizeFaseFromKelas(kelas);
  const jpPerMinggu = params.jpPerMinggu || getDefaultJpPerMinggu(mapel);

  const m = mapel.toLowerCase();
  const ayat = suggestAyatForMateri(mapel, fokusTopik);

  let rasionalAlur = `Alur Tujuan Pembelajaran (ATP) ${mapel} Kelas ${kelas} (${fase}) disusun secara sistematis dan progresif dari konsep konkret menuju abstrak, serta dari pemahaman konseptual menuju aplikasi dan refleksi mendalam. Pengurutan ini mendukung Pembelajaran Mendalam (Berkesadaran, Bermakna, Menggembirakan) yang menumbuhkan 8 Dimensi Profil Lulusan dan akhlak Islami.`;

  let capaianPembelajaranUmum = `Pada akhir ${fase}, peserta didik mampu memahami konsep esensial, menerapkan keterampilan proses, menganalisis persoalan kontekstual, serta mengomunikasikan solusi secara kolaboratif, kreatif, dan bertanggung jawab dalam bidang ${mapel}.`;

  let daftarAlur: AtpUnitRow[] = [];
  let glosarium: AtpGlosariumItem[] = [];

  if (m.includes('informatika') || m.includes('komputer') || m.includes('tik')) {
    rasionalAlur = `Alur Tujuan Pembelajaran Informatika Kelas ${kelas} (${fase}) diurutkan mulai dari fondasi Berpikir Komputasional (BK) dan literasi TIK sebagai prasyarat bernalar sistematis, dilanjutkan pemahaman arsitektur Sistem Komputer (SK) dan Jaringan Komputer & Internet (JKI), kemudian pengolahan Analisis Data (AD), Algoritma & Pemrograman (AP), hingga proyek integratif Dampak Sosial Informatika (DSI) & Praktik Lintas Bidang (PLB). Fokus penguatan tahun ini meliputi: ${fokusTopik}.`;
    capaianPembelajaranUmum = `Pada akhir ${fase}, peserta didik mampu menerapkan berpikir komputasional secara mandiri dalam menyelesaikan persoalan data diskrit bervolume kecil, memanfaatkan aplikasi perkantoran dan kolaborasi digital, memahami sistem komputer serta konektivitas jaringan aman, menganalisis data sederhana, menyusun algoritma & program dasar, serta beretika digital Islami.`;
    daftarAlur = [
      {
        kodeTp: `${prefix}-${kNum}.1`,
        semester: 'Ganjil',
        elemen: 'Berpikir Komputasional (BK)',
        tujuanPembelajaran: `Peserta didik mampu menerapkan dekomposisi, pengenalan pola, abstraksi, dan perancangan algoritma langkah demi langkah untuk menyelesaikan persoalan logika dan struktur data sederhana (${fokusTopik}).`,
        materiEsensial: 'Dekomposisi masalah, pengenalan pola, abstraksi, optimasi penjadwalan, dan struktur data daftar/antrean.',
        alokasiJp: 12,
        dimensiProfil: 'Penalaran Kritis, Kemandirian, Kreativitas',
        kataKunci: 'Dekomposisi, Pola, Abstraksi, Algoritma',
        strategiAsesmen: 'Unplugged Computational Thinking (Bebras), LKPD pemecahan masalah, dan rubrik observasi.',
      },
      {
        kodeTp: `${prefix}-${kNum}.2`,
        semester: 'Ganjil',
        elemen: 'Teknologi Informasi & Komunikasi (TIK)',
        tujuanPembelajaran: 'Peserta didik mampu memanfaatkan aplikasi pengolah kata, presentasi, surel, dan pengelolaan berkas/folder awan secara efektif, terstruktur, dan kolaboratif.',
        materiEsensial: 'Integrasi konten antar aplikasi perkantoran, tata kelola folder digital, surel resmi, dan pencarian informasi kredibel.',
        alokasiJp: 12,
        dimensiProfil: 'Kolaborasi, Komunikasi, Kemandirian',
        kataKunci: 'Aplikasi Perkantoran, Cloud Storage, Integrasi Konten',
        strategiAsesmen: 'Praktik lab komputer, penilaian portofolio dokumen terintegrasi, dan umpan balik sejawat.',
      },
      {
        kodeTp: `${prefix}-${kNum}.3`,
        semester: 'Ganjil',
        elemen: 'Sistem Komputer (SK)',
        tujuanPembelajaran: 'Peserta didik mampu mengidentifikasi fungsi perangkat keras (input-proses-output-storage), perangkat lunak, sistem operasi, serta konversi representasi data biner dasar.',
        materiEsensial: 'Arsitektur perangkat keras, interaksi hardware-OS-aplikasi, sistem bilangan biner & desimal, serta identifikasi kendala komputer.',
        alokasiJp: 12,
        dimensiProfil: 'Penalaran Kritis, Keimanan & Ketakwaan',
        kataKunci: 'Hardware, Software, Sistem Operasi, Bilangan Biner',
        strategiAsesmen: 'Identifikasi komponen nyata/simulasi, kuis konversi biner, dan asesmen sumatif tengah/akhir semester.',
      },
      {
        kodeTp: `${prefix}-${kNum}.4`,
        semester: 'Genap',
        elemen: 'Jaringan Komputer & Internet (JKI)',
        tujuanPembelajaran: 'Peserta didik mampu menjelaskan konektivitas jaringan lokal (LAN) dan internet, topologi jaringan, mekanisme enkripsi sederhana, serta proteksi keamanan data pribadi.',
        materiEsensial: 'Koneksi LAN/Wi-Fi, IP address dasar, topologi jaringan, enkripsi sandi Caesar, dan keamanan siber dasar.',
        alokasiJp: 12,
        dimensiProfil: 'Kewargaan, Penalaran Kritis, Kemandirian',
        kataKunci: 'Jaringan Lokal, Internet, Topologi, Enkripsi, Keamanan Data',
        strategiAsesmen: 'Simulasi topologi jaringan, studi kasus phishing/privasi, dan proyek poster keamanan digital.',
      },
      {
        kodeTp: `${prefix}-${kNum}.5`,
        semester: 'Genap',
        elemen: 'Analisis Data (AD)',
        tujuanPembelajaran: 'Peserta didik mampu mengolah, menyaring, merangkum, dan memvisualisasikan sekumpulan data menggunakan lembar kerja (spreadsheet) untuk mendukung pengambilan keputusan.',
        materiEsensial: 'Fungsi statistik dasar (SUM, AVERAGE, COUNTIF, IF), sortir & filter data, serta pembuatan grafik informatif.',
        alokasiJp: 12,
        dimensiProfil: 'Penalaran Kritis, Kreativitas, Komunikasi',
        kataKunci: 'Spreadsheet, Rumus Logika, Visualisasi Data, Grafik',
        strategiAsesmen: 'Proyek olah data survei sekolah, rubrik ketepatan rumus, dan presentasi interpretasi grafik.',
      },
      {
        kodeTp: `${prefix}-${kNum}.6`,
        semester: 'Genap',
        elemen: 'Algoritma & Pemrograman (AP)',
        tujuanPembelajaran: `Peserta didik mampu merancang diagram alir (flowchart), menuliskan pseudocode, dan mengembangkan program visual/teks sederhana menggunakan variabel, percabangan, dan perulangan (${fokusTopik}).`,
        materiEsensial: 'Flowchart, pseudocode, variabel, tipe data, struktur kontrol percabangan (IF-ELSE), perulangan (LOOP), dan debugging.',
        alokasiJp: 15,
        dimensiProfil: 'Penalaran Kritis, Kreativitas, Kemandirian',
        kataKunci: 'Flowchart, Pseudocode, Variabel, Percabangan, Perulangan',
        strategiAsesmen: 'Praktikum coding (Scratch/Blockly/Python dasar), pengujian test-case, dan rubrik proyek aplikasi mini.',
      },
      {
        kodeTp: `${prefix}-${kNum}.7`,
        semester: 'Genap',
        elemen: 'Dampak Sosial Informatika (DSI) & PLB',
        tujuanPembelajaran: 'Peserta didik mampu menerapkan etika bermedia sosial Islami (tabayyun, anti-hoaks, menghargai hak cipta) dan berkolaborasi menyajikan artefak komputasional lintas bidang.',
        materiEsensial: 'Jejak digital, verifikasi informasi (tabayyun), lisensi hak cipta, kolaborasi tim, dan gelar karya proyek PLB.',
        alokasiJp: 9,
        dimensiProfil: 'Keimanan & Ketakwaan, Kewargaan, Kolaborasi, Komunikasi',
        kataKunci: 'Etika Digital, Tabayyun, Hak Cipta, Artefak Komputasional',
        strategiAsesmen: 'Proyek lintas bidang kelompok, rubrik kolaborasi, presentasi gelar karya, dan refleksi diri.',
      },
    ];
    glosarium = [
      { istilah: 'Algoritma', definisi: 'Urutan langkah-langkah logis dan sistematis yang disusun untuk menyelesaikan suatu permasalahan.' },
      { istilah: 'Dekomposisi', definisi: 'Proses memecah persoalan besar atau kompleks menjadi beberapa sub-masalah kecil agar lebih mudah diselesaikan.' },
      { istilah: 'Flowchart', definisi: 'Diagram alir yang menggambarkan alur logika algoritma menggunakan simbol-simbol standar.' },
      { istilah: 'Enkripsi', definisi: 'Proses penyandian data atau pesan agar hanya dapat dibaca oleh pihak yang berwenang.' },
      { istilah: 'Artefak Komputasional', definisi: 'Produk digital hasil karya komputasi seperti program, simulasi, visualisasi data, atau aplikasi interaktif.' },
    ];
  } else if (m.includes('matematika')) {
    rasionalAlur = `Alur Tujuan Pembelajaran Matematika Kelas ${kelas} (${fase}) disusun berjenjang dari penguatan konsep Bilangan dan Aljabar sebagai bahasa pemodelan, dilanjutkan Rasio & Aritmetika Sosial yang dekat dengan keseharian, kemudian Geometri, Pengukuran Bangun Ruang, hingga Analisis Data & Peluang untuk melatih penalaran logis dan literasi numerasi mendalam.`;
    capaianPembelajaranUmum = `Pada akhir ${fase}, peserta didik mampu mengoperasikan bilangan rasional, memodelkan serta menyelesaikan persamaan/pertidaksamaan linear, menganalisis sifat geometri datar dan ruang, serta menafsirkan data dan peluang secara kritis dan akurat.`;
    daftarAlur = [
      {
        kodeTp: `${prefix}-${kNum}.1`,
        semester: 'Ganjil',
        elemen: 'Bilangan',
        tujuanPembelajaran: 'Peserta didik mampu membaca, membandingkan, dan menyelesaikan operasi hitung bilangan bulat, bilangan rasional (pecahan & desimal), serta faktorisasi prima dalam masalah kontekstual.',
        materiEsensial: 'Operasi bilangan bulat, pecahan, desimal, bilangan berpangkat sederhana, KPK, dan FPB.',
        alokasiJp: 25,
        dimensiProfil: 'Penalaran Kritis, Kemandirian',
        kataKunci: 'Bilangan Bulat, Bilangan Rasional, FPB, KPK',
        strategiAsesmen: 'Asesmen diagnostik numerasi, LKPD eksplorasi kontekstual, dan kuis pemecahan masalah.',
      },
      {
        kodeTp: `${prefix}-${kNum}.2`,
        semester: 'Ganjil',
        elemen: 'Aljabar',
        tujuanPembelajaran: 'Peserta didik mampu memodelkan situasi sehari-hari ke dalam bentuk aljabar, menyederhanakan suku sejenis, serta menyelesaikan persamaan dan pertidaksamaan linear satu variabel.',
        materiEsensial: 'Variabel, koefisien, konstanta, operasi bentuk aljabar, PLSV, dan PtLSV.',
        alokasiJp: 25,
        dimensiProfil: 'Penalaran Kritis, Kreativitas',
        kataKunci: 'Bentuk Aljabar, Variabel, PLSV, PtLSV',
        strategiAsesmen: 'Pemodelan soal cerita nyata, diskusi kelompok, dan tes formatif terstruktur.',
      },
      {
        kodeTp: `${prefix}-${kNum}.3`,
        semester: 'Ganjil',
        elemen: 'Bilangan & Aljabar (Rasio dan Aritmetika Sosial)',
        tujuanPembelajaran: 'Peserta didik mampu menggunakan konsep rasio, skala, perbandingan senilai/berbalik nilai, serta memecahkan persoalan aritmetika sosial (untung, rugi, diskon, zakat/infak) secara jujur.',
        materiEsensial: 'Rasio, skala peta/denah, perbandingan senilai-berbalik nilai, bruto-netto-tara, diskon, dan transaksi syariah.',
        alokasiJp: 20,
        dimensiProfil: 'Keimanan & Ketakwaan, Penalaran Kritis, Kolaborasi',
        kataKunci: 'Rasio, Proporsi, Skala, Aritmetika Sosial',
        strategiAsesmen: 'Simulasi transaksi bazar kelas, proyek perhitungan anggaran kegiatan, dan sumatif akhir semester.',
      },
      {
        kodeTp: `${prefix}-${kNum}.4`,
        semester: 'Genap',
        elemen: 'Geometri',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis hubungan antarsudut pada garis sejajar berpotongan serta membuktikan sifat-sifat segitiga dan segiempat dalam konteks arsitektur sekitar.',
        materiEsensial: 'Hubungan garis dan sudut, jenis & sifat segitiga/segiempat, kesebangunan dasar, dan keliling-luas bangun datar.',
        alokasiJp: 25,
        dimensiProfil: 'Penalaran Kritis, Kreativitas, Komunikasi',
        kataKunci: 'Garis Sejajar, Sudut, Segitiga, Segiempat',
        strategiAsesmen: 'Eksplorasi geometri berbasis alat ukur/GeoGebra, unjuk pembuktian, dan tes tertulis.',
      },
      {
        kodeTp: `${prefix}-${kNum}.5`,
        semester: 'Genap',
        elemen: 'Pengukuran',
        tujuanPembelajaran: 'Peserta didik mampu menentukan jaring-jaring, luas permukaan, dan volume bangun ruang sisi datar maupun lengkung untuk menyelesaikan masalah desain kemasan dan kapasitas ruang.',
        materiEsensial: 'Jaring-jaring bangun ruang, luas permukaan, volume prisma/limas/tabung, dan masalah optimasi bahan.',
        alokasiJp: 20,
        dimensiProfil: 'Kreativitas, Kolaborasi, Penalaran Kritis',
        kataKunci: 'Jaring-jaring, Luas Permukaan, Volume, Bangun Ruang',
        strategiAsesmen: 'Proyek pembuatan miniatur kemasan ramah lingkungan, rubrik ketepatan hitung, dan presentasi.',
      },
      {
        kodeTp: `${prefix}-${kNum}.6`,
        semester: 'Genap',
        elemen: 'Analisis Data dan Peluang',
        tujuanPembelajaran: 'Peserta didik mampu merancang pengumpulan data sederhana, menyajikan data dalam diagram batang/garis/lingkaran, serta menafsirkan mean, median, modus, dan peluang empiris.',
        materiEsensial: 'Pengumpulan data, penyajian diagram, ukuran pemusatan data, dan peluang kejadian sederhana.',
        alokasiJp: 20,
        dimensiProfil: 'Penalaran Kritis, Komunikasi, Kewargaan',
        kataKunci: 'Statistika, Diagram, Mean, Median, Modus, Peluang',
        strategiAsesmen: 'Proyek survei literasi/kesehatan siswa, infografis data, dan asesmen sumatif akhir tahun.',
      },
    ];
    glosarium = [
      { istilah: 'Bilangan Rasional', definisi: 'Bilangan yang dapat dinyatakan dalam bentuk perbandingan a/b dengan a dan b bilangan bulat serta b tidak sama dengan nol.' },
      { istilah: 'PLSV', definisi: 'Persamaan Linear Satu Variabel, yaitu kalimat terbuka yang dihubungkan tanda sama dengan dan memiliki satu variabel berpangkat satu.' },
      { istilah: 'Aritmetika Sosial', definisi: 'Penerapan operasi hitung matematika dalam aktivitas jual beli, diskon, pajak, dan keuangan sehari-hari.' },
      { istilah: 'Ukuran Pemusatan Data', definisi: 'Nilai representatif dari sekumpulan data berupa rata-rata (mean), nilai tengah (median), dan nilai terbanyak (modus).' },
    ];
  } else if (m.includes('ipa') || m.includes('alam')) {
    rasionalAlur = `Alur Tujuan Pembelajaran IPA Kelas ${kelas} (${fase}) dirancang mengintegrasikan pemahaman konsep sains dengan keterampilan proses inkuiri ilmiah (mengamati, mempertanyakan, merencanakan penyelidikan, menganalisis data, hingga mengomunikasikan). Urutan dimulai dari Hakikat Sains & Pengukuran, Materi & Energi, berlanjut ke Sistem Kehidupan & Ekologi, serta Bumi dan Tata Surya sebagai sarana tadabbur ayat kauniyah.`;
    capaianPembelajaranUmum = `Pada akhir ${fase}, peserta didik mampu melakukan pengukuran besaran fisis, menganalisis sifat zat dan perubahannya, menjelaskan kalor-gerak-gaya, mengidentifikasi sel dan interaksi ekosistem, serta memahami sistem tata surya melalui penyelidikan ilmiah sistematis.`;
    daftarAlur = [
      {
        kodeTp: `${prefix}-${kNum}.1`,
        semester: 'Ganjil',
        elemen: 'Pemahaman IPA & Keterampilan Proses (Hakikat Sains)',
        tujuanPembelajaran: 'Peserta didik mampu merancang langkah metode ilmiah, menggunakan alat ukur besaran pokok dan turunan secara teliti, serta menyajikan hasil pengukuran sesuai satuan SI.',
        materiEsensial: 'Keselamatan laboratorium, metode ilmiah, besaran pokok/turunan, satuan SI, dan penggunaan jangka sorong/neraca.',
        alokasiJp: 20,
        dimensiProfil: 'Penalaran Kritis, Kemandirian, Kesehatan',
        kataKunci: 'Metode Ilmiah, Besaran, Satuan SI, Pengukuran',
        strategiAsesmen: 'Praktikum pengukuran di lab IPA, laporan hasil pengamatan, dan rubrik ketelitian.',
      },
      {
        kodeTp: `${prefix}-${kNum}.2`,
        semester: 'Ganjil',
        elemen: 'Pemahaman IPA (Zat dan Perubahannya)',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis model partikel wujud zat, menghitung massa jenis benda, serta membedakan perubahan fisika dan perubahan kimia melalui eksperimen sederhana.',
        materiEsensial: 'Wujud zat & sifat partikel, perubahan wujud, massa jenis, serta ciri perubahan fisika dan reaksi kimia.',
        alokasiJp: 25,
        dimensiProfil: 'Penalaran Kritis, Kolaborasi, Kreativitas',
        kataKunci: 'Partikel Zat, Massa Jenis, Perubahan Fisika, Perubahan Kimia',
        strategiAsesmen: 'Eksperimen massa jenis & reaksi sederhana, jurnal praktikum, dan tes formatif.',
      },
      {
        kodeTp: `${prefix}-${kNum}.3`,
        semester: 'Ganjil',
        elemen: 'Pemahaman IPA (Suhu, Kalor, Gerak & Gaya)',
        tujuanPembelajaran: 'Peserta didik mampu menyelidiki perpindahan kalor, fenomena pemuaian, serta menganalisis pengaruh gaya terhadap gerak benda berdasarkan Hukum Newton dalam kehidupan sehari-hari.',
        materiEsensial: 'Skala termometer, kalor & asas Black dasar, pemuaian, kecepatan, percepatan, dan Hukum I–III Newton.',
        alokasiJp: 25,
        dimensiProfil: 'Penalaran Kritis, Kreativitas, Komunikasi',
        kataKunci: 'Suhu, Kalor, Pemuaian, Gaya, Hukum Newton',
        strategiAsesmen: 'Praktikum perpindahan kalor, proyek termos sederhana, dan sumatif akhir semester.',
      },
      {
        kodeTp: `${prefix}-${kNum}.4`,
        semester: 'Genap',
        elemen: 'Pemahaman IPA (Klasifikasi Makhluk Hidup & Sel)',
        tujuanPembelajaran: 'Peserta didik mampu mengklasifikasikan makhluk hidup menggunakan kunci dikotomi serta mengamati perbedaan struktur sel hewan dan sel tumbuhan menggunakan mikroskop.',
        materiEsensial: 'Ciri makhluk hidup, taksonomi 5 kingdom, kunci determinasi, bagian mikroskop, dan organel sel.',
        alokasiJp: 25,
        dimensiProfil: 'Keimanan & Ketakwaan, Penalaran Kritis, Kemandirian',
        kataKunci: 'Taksonomi, Kunci Dikotomi, Mikroskop, Sel',
        strategiAsesmen: 'Praktikum pengamatan preparat sel, gambar sketsa ilmiah, dan kuis identifikasi.',
      },
      {
        kodeTp: `${prefix}-${kNum}.5`,
        semester: 'Genap',
        elemen: 'Pemahaman IPA (Ekologi & Keanekaragaman Hayati)',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis interaksi komponen biotik-abiotik, rantai makanan, serta merancang aksi nyata pelestarian lingkungan sebagai wujud amanah khalifah di bumi.',
        materiEsensial: 'Komponen ekosistem, jaring-jaring makanan, simbiosis, pencemaran lingkungan, dan konservasi hayati.',
        alokasiJp: 20,
        dimensiProfil: 'Keimanan & Ketakwaan, Kewargaan, Kolaborasi',
        kataKunci: 'Ekosistem, Biotik, Abiotik, Konservasi, Ekologi',
        strategiAsesmen: 'Observasi ekosistem sekolah, kampanye pengurangan sampah, dan penilaian proyek.',
      },
      {
        kodeTp: `${prefix}-${kNum}.6`,
        semester: 'Genap',
        elemen: 'Pemahaman IPA (Bumi dan Tata Surya)',
        tujuanPembelajaran: 'Peserta didik mampu mendeskripsikan karakteristik planet tata surya, dampak rotasi-revolusi bumi, fase bulan, dan peristiwa gerhana disertai refleksi kebesaran Allah SWT.',
        materiEsensial: 'Anggota tata surya, rotasi & revolusi bumi, penanggalan Masehi-Hijriah, fase bulan, dan gerhana.',
        alokasiJp: 20,
        dimensiProfil: 'Keimanan & Ketakwaan, Kreativitas, Komunikasi',
        kataKunci: 'Tata Surya, Rotasi, Revolusi, Gerhana, Hijriah',
        strategiAsesmen: 'Pembuatan model tata surya 3D/poster interaktif, presentasi, dan sumatif akhir tahun.',
      },
    ];
    glosarium = [
      { istilah: 'Inkuiri Ilmiah', definisi: 'Proses penyelidikan terstruktur yang melibatkan pengamatan, perumusan hipotesis, eksperimen, analisis data, dan kesimpulan.' },
      { istilah: 'Massa Jenis', definisi: 'Perbandingan antara massa suatu zat dengan volumenya (ρ = m/V).' },
      { istilah: 'Kunci Dikotomi', definisi: 'Alat identifikasi makhluk hidup berbasis pasangan ciri yang berlawanan secara bertahap.' },
      { istilah: 'Ekosistem', definisi: 'Sistem ekologi yang terbentuk dari hubungan timbal balik tak terpisahkan antara makhluk hidup dan lingkungannya.' },
    ];
  } else if (m.includes('agama') || m.includes('pai')) {
    rasionalAlur = `Alur Tujuan Pembelajaran Pendidikan Agama Islam & Budi Pekerti Kelas ${kelas} (${fase}) disusun seimbang meliputi 5 elemen utama (Al-Qur'an dan Hadis, Akidah, Akhlak, Fikih, dan Sejarah Peradaban Islam) agar peserta didik tidak hanya memahami ilmu agama secara kognitif, tetapi menghayati dan mengamalkannya dalam pembiasaan ibadah dan akhlak sehari-hari.`;
    capaianPembelajaranUmum = `Pada akhir ${fase}, peserta didik mampu membaca dan menghafal ayat Al-Qur'an sesuai kaidah tajwid, meyakini akidah Islam melalui Asmaul Husna dan rukun iman, membiasakan akhlak terpuji, melaksanakan ibadah fikih dengan benar, serta meneladani sejarah peradaban Islam.`;
    daftarAlur = [
      {
        kodeTp: `${prefix}-${kNum}.1`,
        semester: 'Ganjil',
        elemen: 'Al-Qur\'an dan Hadis',
        tujuanPembelajaran: 'Peserta didik mampu membaca dengan tartil (kaidah tajwid Al-Syamsiyah & Al-Qamariyah), menghafal, serta mengamalkan kandungan ayat Al-Qur\'an tentang semangat menuntut ilmu.',
        materiEsensial: 'QS. Al-Mujadalah ayat 11, QS. Ar-Rahman ayat 33, hukum bacaan Alif Lam, dan adab penuntut ilmu.',
        alokasiJp: 15,
        dimensiProfil: 'Keimanan & Ketakwaan, Kemandirian, Komunikasi',
        kataKunci: 'Tartil, Tajwid, Alif Lam, Menuntut Ilmu',
        strategiAsesmen: 'Uji praktik tilawah & tahfidz, lembar cek tajwid, dan jurnal tadabbur.',
      },
      {
        kodeTp: `${prefix}-${kNum}.2`,
        semester: 'Ganjil',
        elemen: 'Akidah',
        tujuanPembelajaran: 'Peserta didik mampu memahami makna Asmaul Husna (Al-\'Alim, Al-Khabir, As-Sami\', Al-Bashir) dan merefleksikan perilaku muraqabah (merasa diawasi Allah) dalam keseharian.',
        materiEsensial: 'Makna dan dalil 4 Asmaul Husna pilihan serta implementasi sikap jujur, teliti, dan berhati-hati.',
        alokasiJp: 12,
        dimensiProfil: 'Keimanan & Ketakwaan, Penalaran Kritis',
        kataKunci: 'Asmaul Husna, Muraqabah, Akidah, Kejujuran',
        strategiAsesmen: 'Refleksi kasus kejujuran akademik, peta konsep Asmaul Husna, dan tes formatif.',
      },
      {
        kodeTp: `${prefix}-${kNum}.3`,
        semester: 'Ganjil',
        elemen: 'Akhlak & Fikih Ibadah',
        tujuanPembelajaran: 'Peserta didik mampu mempraktikkan ketentuan thaharah (wudhu, tayamum, mandi wajib), salat wajib berjamaah, serta membiasakan zikir dan bakti kepada orang tua & guru.',
        materiEsensial: 'Tata cara bersuci, syarat & rukun salat berjamaah, zikir setelah salat, serta birrul walidain.',
        alokasiJp: 18,
        dimensiProfil: 'Keimanan & Ketakwaan, Kesehatan, Kolaborasi',
        kataKunci: 'Thaharah, Salat Berjamaah, Zikir, Birrul Walidain',
        strategiAsesmen: 'Demonstrasi praktik wudhu/salat, mutaba\'ah ibadah harian, dan sumatif semester I.',
      },
      {
        kodeTp: `${prefix}-${kNum}.4`,
        semester: 'Genap',
        elemen: 'Al-Qur\'an dan Hadis (Ukhuwah & Toleransi)',
        tujuanPembelajaran: 'Peserta didik mampu menelaah ayat Al-Qur\'an tentang persaudaraan (ukhuwah), menjauhi ghibah/prasangka buruk, dan mempraktikkan tabayyun di era media sosial.',
        materiEsensial: 'QS. Al-Hujurat ayat 10–13, hukum nun sukun/tanwin, adab bermedia sosial, dan ukhuwah Islamiyah.',
        alokasiJp: 15,
        dimensiProfil: 'Keimanan & Ketakwaan, Kewargaan, Komunikasi',
        kataKunci: 'Ukhuwah, Tabayyun, Tasamuh, Tajwid Nun Sukun',
        strategiAsesmen: 'Uji bacaan & hafalan, diskusi studi kasus etika digital, dan proyek kampanye adab.',
      },
      {
        kodeTp: `${prefix}-${kNum}.5`,
        semester: 'Genap',
        elemen: 'Fikih (Rukhsah Ibadah)',
        tujuanPembelajaran: 'Peserta didik mampu memahami ketentuan dan mempraktikkan tata cara salat Jumat, rukhsah salat jamak-qasar saat safar, serta ketentuan puasa wajib dan sunah.',
        materiEsensial: 'Ketentuan salat Jumat, syarat & tata cara jamak taqdim/ta\'khir dan qasar, serta hikmah puasa.',
        alokasiJp: 15,
        dimensiProfil: 'Keimanan & Ketakwaan, Kemandirian, Penalaran Kritis',
        kataKunci: 'Rukhsah, Salat Jumat, Jamak Qasar, Puasa',
        strategiAsesmen: 'Simulasi praktik salat jamak-qasar, kuis studi kasus safar, dan rubrik kinerja.',
      },
      {
        kodeTp: `${prefix}-${kNum}.6`,
        semester: 'Genap',
        elemen: 'Sejarah Peradaban Islam (SPI)',
        tujuanPembelajaran: 'Peserta didik mampu menganalisis strategi dakwah Rasulullah SAW dan kemajuan ilmu pengetahuan pada masa keemasan peradaban Islam untuk menumbuhkan etos berkarya.',
        materiEsensial: 'Dakwah periode Makkah-Madinah, Piagam Madinah, ilmuwan Muslim (Al-Khawarizmi, Ibnu Sina, Al-Biruni), dan ibrah perjuangan.',
        alokasiJp: 12,
        dimensiProfil: 'Keimanan & Ketakwaan, Kewargaan, Kreativitas',
        kataKunci: 'Sirah Nabawiyah, Piagam Madinah, Ilmuwan Muslim, Ibrah',
        strategiAsesmen: 'Proyek linimasa peradaban Islam, presentasi biografi tokoh, dan sumatif akhir tahun.',
      },
    ];
    glosarium = [
      { istilah: 'Tartil', definisi: 'Membaca Al-Qur\'an secara perlahan, jelas makhraj hurufnya, dan sesuai kaidah ilmu tajwid.' },
      { istilah: 'Muraqabah', definisi: 'Kesadaran mendalam bahwa setiap ucapan dan perbuatan senantiasa diketahui dan diawasi oleh Allah SWT.' },
      { istilah: 'Rukhsah', definisi: 'Keringanan syariat yang diberikan Allah SWT kepada hamba-Nya dalam kondisi tertentu seperti safar atau sakit.' },
      { istilah: 'Tabayyun', definisi: 'Sikap memeriksa dan memverifikasi kebenaran suatu berita sebelum mempercayai atau menyebarkannya.' },
    ];
  } else {
    const unitJp = jpPerMinggu * 5;
    const midJp = jpPerMinggu * 4;
    daftarAlur = [
      {
        kodeTp: `${prefix}-${kNum}.1`,
        semester: 'Ganjil',
        elemen: `Elemen 1 • Fondasi Konsep ${mapel}`,
        tujuanPembelajaran: `Peserta didik mampu memahami dan menjelaskan konsep fundamental, terminologi inti, serta ruang lingkup ${mapel} (${fokusTopik}) secara berkesadaran dan bermakna.`,
        materiEsensial: `Konsep dasar ${mapel}, ruang lingkup ${fokusTopik}, dan identifikasi fenomena kontekstual di sekitar siswa.`,
        alokasiJp: unitJp,
        dimensiProfil: 'Penalaran Kritis, Kemandirian',
        kataKunci: `Konsep Dasar, ${fokusTopik}, Pemahaman Bermakna`,
        strategiAsesmen: 'Asesmen awal diagnostik, peta konsep visual, dan kuis pemahaman konseptual.',
      },
      {
        kodeTp: `${prefix}-${kNum}.2`,
        semester: 'Ganjil',
        elemen: `Elemen 2 • Analisis & Eksplorasi Kontekstual`,
        tujuanPembelajaran: `Peserta didik mampu menganalisis permasalahan nyata terkait ${mapel} melalui penyelidikan terstruktur dan diskusi kolaboratif yang santun.`,
        materiEsensial: `Studi kasus aplikatif ${mapel}, analisis sebab-akibat, dan verifikasi sumber belajar kredibel.`,
        alokasiJp: unitJp,
        dimensiProfil: 'Penalaran Kritis, Kolaborasi, Komunikasi',
        kataKunci: 'Studi Kasus, Analisis Kritis, Kolaborasi',
        strategiAsesmen: 'LKPD berbasis Problem-Based Learning, observasi diskusi, dan presentasi temuan.',
      },
      {
        kodeTp: `${prefix}-${kNum}.3`,
        semester: 'Ganjil',
        elemen: `Elemen 3 • Aplikasi & Unjuk Karya Semester I`,
        tujuanPembelajaran: `Peserta didik mampu menerapkan kompetensi inti ${mapel} untuk merancang dan menyajikan karya/produk aplikatif sederhana secara mandiri maupun berkelompok.`,
        materiEsensial: `Perancangan proyek mini ${mapel}, penyusunan laporan terstruktur, dan refleksi proses belajar.`,
        alokasiJp: midJp,
        dimensiProfil: 'Kreativitas, Kemandirian, Komunikasi',
        kataKunci: 'Aplikasi, Proyek Mini, Refleksi',
        strategiAsesmen: 'Penilaian produk/portofolio semester ganjil dan asesmen sumatif akhir semester I.',
      },
      {
        kodeTp: `${prefix}-${kNum}.4`,
        semester: 'Genap',
        elemen: `Elemen 4 • Pendalaman Materi Lanjutan`,
        tujuanPembelajaran: `Peserta didik mampu mengkaji konsep lanjutan ${mapel} Kelas ${kelas} serta mengaitkannya dengan lintas disiplin ilmu dan nilai kehidupan nyata.`,
        materiEsensial: `Materi pengembangan lanjutan ${mapel} dan keterkaitan lintas bidang (interdisipliner).`,
        alokasiJp: unitJp,
        dimensiProfil: 'Penalaran Kritis, Kreativitas',
        kataKunci: 'Pendalaman Konsep, Lintas Disiplin, Transfer Pengetahuan',
        strategiAsesmen: 'Eksplorasi terbimbing, jurnal refleksi mendalam, dan tes formatif berkala.',
      },
      {
        kodeTp: `${prefix}-${kNum}.5`,
        semester: 'Genap',
        elemen: `Elemen 5 • Pemecahan Masalah HOTS`,
        tujuanPembelajaran: `Peserta didik mampu mengevaluasi alternatif solusi dan memecahkan persoalan kompleks berbasis penalaran tingkat tinggi (HOTS) pada bidang ${mapel}.`,
        materiEsensial: `Pemecahan masalah terbuka (open-ended), evaluasi argumen, dan pengambilan keputusan berbasis bukti.`,
        alokasiJp: unitJp,
        dimensiProfil: 'Penalaran Kritis, Kewargaan, Kolaborasi',
        kataKunci: 'HOTS, Evaluasi Solusi, Penalaran Berbasis Bukti',
        strategiAsesmen: 'Studi kasus HOTS, debat/presentasi argumentatif, dan rubrik analitik.',
      },
      {
        kodeTp: `${prefix}-${kNum}.6`,
        semester: 'Genap',
        elemen: `Elemen 6 • Proyek Integratif & Penguatan Karakter`,
        tujuanPembelajaran: `Peserta didik mampu menghasilkan karya akhir tahun ${mapel} yang memberi kebermanfaatan bagi lingkungan sekolah/masyarakat berlandaskan nilai Islami.`,
        materiEsensial: `Proyek akhir kolaboratif ${mapel}, pameran/gelar karya, dan evaluasi diri akhir tahun.`,
        alokasiJp: midJp,
        dimensiProfil: 'Keimanan & Ketakwaan, Kreativitas, Kolaborasi, Komunikasi',
        kataKunci: 'Proyek Akhir, Gelar Karya, Kebermanfaatan Sosial',
        strategiAsesmen: 'Rubrik proyek akhir, gelar karya kelas, dan asesmen sumatif akhir tahun (SAT).',
      },
    ];
    glosarium = [
      { istilah: 'Tujuan Pembelajaran (TP)', definisi: 'Deskripsi pencapaian kompetensi dan lingkup materi yang perlu dikuasai peserta didik dalam satu unit pembelajaran.' },
      { istilah: 'Alur Tujuan Pembelajaran (ATP)', definisi: 'Rangkaian Tujuan Pembelajaran yang tersusun sistematis dan logis sepanjang fase/tahun ajaran sebagai peta jalan belajar.' },
      { istilah: 'Pembelajaran Mendalam', definisi: 'Pendekatan belajar berkesadaran, bermakna, dan menggembirakan melalui siklus Memahami, Mengaplikasi, dan Merefleksi.' },
    ];
  }

  return {
    formatType: 'atp_resmi',
    identitas: {
      mataPelajaran: mapel,
      satuanPendidikan,
      fase,
      kelas,
      tahunAjaran,
      namaPenyusun,
      jpPerMinggu,
      fokusTopik,
      referensiRegulasi: 'Panduan Pembelajaran & Asesmen Kurikulum Nasional Kemendikdasmen • Pembelajaran Mendalam',
    },
    rasionalAlur,
    capaianPembelajaranUmum,
    daftarAlur,
    glosarium,
    catatanImplementasi: `Alur Tujuan Pembelajaran (ATP) ini menjadi acuan penyusunan Program Tahunan (PROTA), Program Semester (PROSEM), KKTP, dan Modul Ajar Mendalam di ${satuanPendidikan}. Guru dapat menyesuaikan kedalaman materi, diferensiasi proses/produk, dan alokasi JP sesuai hasil asesmen awal peserta didik.`,
    integrasiNilaiIslami: {
      surahAyat: ayat.surahAyat,
      teksArab: ayat.teksArab,
      terjemahan: ayat.terjemahan,
      relevansiAtp: ayat.kaitanMateri,
    },
  };
}

export function formatAtpToPlainText(atp: AtpData): string {
  const summary = calculateAtpSummary(atp);
  const ganjil = atp.daftarAlur.filter((r) => r.semester === 'Ganjil');
  const genap = atp.daftarAlur.filter((r) => r.semester === 'Genap');

  const formatRows = (rows: AtpUnitRow[]) =>
    rows
      .map(
        (r, i) =>
          `${i + 1}. [${r.kodeTp}] ${r.elemen} (${r.alokasiJp} JP)\n` +
          `   Tujuan Pembelajaran : ${r.tujuanPembelajaran}\n` +
          `   Materi Esensial     : ${r.materiEsensial}\n` +
          `   Profil Lulusan      : ${r.dimensiProfil}\n` +
          `   Kata Kunci          : ${r.kataKunci}\n` +
          `   Strategi & Asesmen  : ${r.strategiAsesmen}`
      )
      .join('\n\n');

  const glosText = (atp.glosarium || [])
    .map((g, i) => `${i + 1}. ${g.istilah}: ${g.definisi}`)
    .join('\n');

  return `ALUR TUJUAN PEMBELAJARAN (ATP)
${atp.identitas.satuanPendidikan.toUpperCase()}
TAHUN AJARAN ${atp.identitas.tahunAjaran}

IDENTITAS DOKUMEN ATP
Mata Pelajaran   : ${atp.identitas.mataPelajaran}
Fase / Kelas     : ${atp.identitas.fase} / Kelas ${atp.identitas.kelas}
Fokus Topik      : ${atp.identitas.fokusTopik}
Beban Belajar    : ${atp.identitas.jpPerMinggu} JP / Minggu (Total ${summary.totalJp} JP • ${summary.totalTp} TP)
Guru Penyusun    : ${atp.identitas.namaPenyusun}
Acuan Regulasi   : ${atp.identitas.referensiRegulasi}

A. RASIONAL PENGURUTAN ALUR TUJUAN PEMBELAJARAN
${atp.rasionalAlur}

B. CAPAIAN PEMBELAJARAN (CP) UMUM FASE
${atp.capaianPembelajaranUmum}

C. ALUR TUJUAN PEMBELAJARAN — SEMESTER I (GANJIL) [${summary.tpGanjil} TP • ${summary.totalJpGanjil} JP]
${formatRows(ganjil)}

D. ALUR TUJUAN PEMBELAJARAN — SEMESTER II (GENAP) [${summary.tpGenap} TP • ${summary.totalJpGenap} JP]
${formatRows(genap)}

E. GLOSARIUM ISTILAH PENTING
${glosText || '-'}

F. CATATAN IMPLEMENTASI & DIFERENSIASI
${atp.catatanImplementasi}

G. INTEGRASI NILAI ISLAMI (${atp.integrasiNilaiIslami.surahAyat})
Teks Arab : ${atp.integrasiNilaiIslami.teksArab}
Terjemahan: "${atp.integrasiNilaiIslami.terjemahan}"
Relevansi : ${atp.integrasiNilaiIslami.relevansiAtp}`;
}
