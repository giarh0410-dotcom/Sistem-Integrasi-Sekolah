import { suggestAyatForMateri } from './quranAyatPresets';
import { normalizeFaseFromKelas } from './capaianPembelajaranHelper';

export interface ProtaItemRow {
  semester: 'Ganjil' | 'Genap';
  elemen: string;
  tujuanPembelajaran: string;
  alokasiJp: number;
  bulanPelaksanaan: string;
  keterangan: string;
}

export interface ProtaData {
  formatType: 'prota_resmi';
  identitas: {
    mataPelajaran: string;
    satuanPendidikan: string;
    fase: string;
    kelas: string;
    tahunAjaran: string;
    namaPenyusun: string;
    jpPerMinggu: number;
    mingguEfektifGanjil: number;
    mingguEfektifGenap: number;
    fokusTahunan: string;
    referensiRegulasi: string;
  };
  capaianUmumTahunan: string;
  distribusiSemester: ProtaItemRow[];
  catatanPelaksanaan: string;
  integrasiNilaiIslami: {
    surahAyat: string;
    teksArab: string;
    terjemahan: string;
    relevansiProta: string;
  };
}

export interface ProtaSummary {
  totalJpGanjil: number;
  totalJpGenap: number;
  totalJpTahunan: number;
  targetJpGanjil: number;
  targetJpGenap: number;
  targetJpTahunan: number;
  jumlahUnitGanjil: number;
  jumlahUnitGenap: number;
}

export function isStructuredProtaData(data: any): data is ProtaData {
  return Boolean(
    data &&
      data.formatType === 'prota_resmi' &&
      data.identitas &&
      Array.isArray(data.distribusiSemester)
  );
}

export function calculateProtaSummary(prota: ProtaData): ProtaSummary {
  const ganjilRows = prota.distribusiSemester.filter((r) => r.semester === 'Ganjil');
  const genapRows = prota.distribusiSemester.filter((r) => r.semester === 'Genap');

  const totalJpGanjil = ganjilRows.reduce((acc, r) => acc + (Number(r.alokasiJp) || 0), 0);
  const totalJpGenap = genapRows.reduce((acc, r) => acc + (Number(r.alokasiJp) || 0), 0);
  const jpPerMinggu = Number(prota.identitas.jpPerMinggu) || 3;
  const meGanjil = Number(prota.identitas.mingguEfektifGanjil) || 18;
  const meGenap = Number(prota.identitas.mingguEfektifGenap) || 18;

  return {
    totalJpGanjil,
    totalJpGenap,
    totalJpTahunan: totalJpGanjil + totalJpGenap,
    targetJpGanjil: jpPerMinggu * meGanjil,
    targetJpGenap: jpPerMinggu * meGenap,
    targetJpTahunan: jpPerMinggu * (meGanjil + meGenap),
    jumlahUnitGanjil: ganjilRows.length,
    jumlahUnitGenap: genapRows.length,
  };
}

function getDefaultJpPerMinggu(mapel: string): number {
  const m = mapel.toLowerCase();
  if (m.includes('indonesia')) return 6;
  if (m.includes('matematika') || m.includes('ipa') || m.includes('alam')) return 5;
  if (m.includes('inggris') || m.includes('ips') || m.includes('sosial')) return 4;
  if (m.includes('informatika') || m.includes('komputer') || m.includes('tik')) return 3;
  if (m.includes('agama') || m.includes('pai') || m.includes('pancasila') || m.includes('pkn') || m.includes('pjok') || m.includes('jasmani')) return 3;
  if (m.includes('seni') || m.includes('prakarya') || m.includes('jepang') || m.includes('arab') || m.includes('daerah')) return 2;
  return 3;
}

export function buildOfficialProtaData(params: {
  mataPelajaran?: string;
  kelas?: string;
  topik?: string;
  tahunAjaran?: string;
  namaPenyusun?: string;
  satuanPendidikan?: string;
  jpPerMinggu?: number;
  mingguEfektifGanjil?: number;
  mingguEfektifGenap?: number;
}): ProtaData {
  const mapel = (params.mataPelajaran || 'Informatika').trim();
  const kelas = (params.kelas || 'VII').trim();
  const fokusTahunan = (params.topik || '').trim() || `Seluruh Alur Tujuan Pembelajaran ${mapel} Kelas ${kelas}`;
  const tahunAjaran = params.tahunAjaran || '2026/2027';
  const namaPenyusun = params.namaPenyusun || 'Guru Mata Pelajaran';
  const satuanPendidikan = params.satuanPendidikan || 'SMP Islam Modern Al Fakhir';
  const fase = normalizeFaseFromKelas(kelas);
  const jpPerMinggu = params.jpPerMinggu || getDefaultJpPerMinggu(mapel);
  const mingguEfektifGanjil = params.mingguEfektifGanjil || 18;
  const mingguEfektifGenap = params.mingguEfektifGenap || 18;

  const m = mapel.toLowerCase();
  const ayat = suggestAyatForMateri(mapel, fokusTahunan);

  let capaianUmumTahunan = `Selama 1 tahun pelajaran (Semester Ganjil dan Genap) pada ${fase} Kelas ${kelas}, peserta didik mencapai seluruh Tujuan Pembelajaran ${mapel} melalui pendekatan Pembelajaran Mendalam (Berkesadaran, Bermakna, Menggembirakan) yang terintegrasi 8 Dimensi Profil Lulusan dan nilai-nilai Islami.`;

  let distribusiSemester: ProtaItemRow[] = [];

  if (m.includes('informatika') || m.includes('komputer') || m.includes('tik')) {
    capaianUmumTahunan = `Pada akhir tahun ajaran di ${fase} Kelas ${kelas}, peserta didik mampu menerapkan berpikir komputasional untuk menyelesaikan persoalan data diskrit, terampil menggunakan aplikasi perkantoran & kolaborasi digital, memahami arsitektur sistem komputer serta jaringan internet aman, mengolah analisis data sederhana, memprogram blok/teks dasar, dan beretika digital Islami.`;
    distribusiSemester = [
      {
        semester: 'Ganjil',
        elemen: 'Berpikir Komputasional (BK)',
        tujuanPembelajaran: 'Menerapkan dekomposisi, pengenalan pola, abstraksi, dan algoritma pada struktur data sederhana (daftar/antrean/tumpukan) serta representasi biner.',
        alokasiJp: 15,
        bulanPelaksanaan: 'Juli – Agustus',
        keterangan: 'Intrakurikuler • Modul Mendalam 1',
      },
      {
        semester: 'Ganjil',
        elemen: 'Teknologi Informasi & Komunikasi (TIK)',
        tujuanPembelajaran: 'Memanfaatkan aplikasi pengolah kata, presentasi, surel, dan manajemen berkas awan secara terpadu serta kolaboratif.',
        alokasiJp: 15,
        bulanPelaksanaan: 'Agustus – September',
        keterangan: 'Intrakurikuler • Praktik Lab Komputer',
      },
      {
        semester: 'Ganjil',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: 'Evaluasi ketercapaian TP Berpikir Komputasional & TIK serta program remedial/pengayaan terstruktur.',
        alokasiJp: 6,
        bulanPelaksanaan: 'September – Oktober',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Ganjil',
        elemen: 'Sistem Komputer (SK)',
        tujuanPembelajaran: 'Mengidentifikasi komponen perangkat keras, perangkat lunak, interaksi sistem operasi, dan mekanisme pengolahan data dalam komputer.',
        alokasiJp: 12,
        bulanPelaksanaan: 'Oktober – November',
        keterangan: 'Intrakurikuler • Studi Kasus Hardware',
      },
      {
        semester: 'Ganjil',
        elemen: 'Sumatif Akhir Semester (SAS) Ganjil',
        tujuanPembelajaran: 'Asesmen sumatif akhir semester ganjil, penilaian proyek portofolio digital, remedial, dan pengayaan.',
        alokasiJp: 6,
        bulanPelaksanaan: 'Desember',
        keterangan: 'Sumatif Akhir Semester I',
      },
      {
        semester: 'Genap',
        elemen: 'Jaringan Komputer & Internet (JKI)',
        tujuanPembelajaran: 'Memahami konektivitas jaringan lokal dan internet, topologi jaringan, proteksi data pribadi, dan keamanan siber dasar.',
        alokasiJp: 12,
        bulanPelaksanaan: 'Januari – Februari',
        keterangan: 'Intrakurikuler • Simulasi Jaringan',
      },
      {
        semester: 'Genap',
        elemen: 'Analisis Data (AD)',
        tujuanPembelajaran: 'Mengolah, memvisualisasikan, dan menafsirkan sekumpulan data menggunakan lembar kerja (spreadsheet) dengan rumus dan grafik.',
        alokasiJp: 12,
        bulanPelaksanaan: 'Februari – Maret',
        keterangan: 'Intrakurikuler • Proyek Data Sekolah',
      },
      {
        semester: 'Genap',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: 'Evaluasi ketercapaian TP Jaringan Komputer & Analisis Data serta refleksi umpan balik.',
        alokasiJp: 6,
        bulanPelaksanaan: 'Maret',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Genap',
        elemen: 'Algoritma & Pemrograman (AP)',
        tujuanPembelajaran: 'Merancang dan menguji program visual/teks sederhana menggunakan variabel, percabangan, dan perulangan.',
        alokasiJp: 12,
        bulanPelaksanaan: 'April – Mei',
        keterangan: 'Intrakurikuler • Coding Praktikum',
      },
      {
        semester: 'Genap',
        elemen: 'Dampak Sosial Informatika (DSI) & PLB',
        tujuanPembelajaran: 'Menerapkan etika digital Islami (tabayyun, anti-hoaks, hak cipta) dan menyajikan Praktik Lintas Bidang (Proyek Akhir Tahun).',
        alokasiJp: 6,
        bulanPelaksanaan: 'Mei',
        keterangan: 'Kokurikuler / Proyek Lintas Bidang',
      },
      {
        semester: 'Genap',
        elemen: 'Sumatif Akhir Tahun (SAT)',
        tujuanPembelajaran: 'Asesmen sumatif akhir tahun ajaran, pameran karya digital, remedial, dan refleksi akhir tahun.',
        alokasiJp: 6,
        bulanPelaksanaan: 'Juni',
        keterangan: 'Sumatif Akhir Semester II',
      },
    ];
  } else if (m.includes('matematika')) {
    capaianUmumTahunan = `Pada akhir tahun ajaran di ${fase} Kelas ${kelas}, peserta didik mampu bernalar matematis dan memecahkan masalah kontekstual pada ruang lingkup Bilangan, Aljabar, Pengukuran, Geometri, serta Analisis Data dan Peluang secara akurat, jujur, dan sistematis.`;
    distribusiSemester = [
      {
        semester: 'Ganjil',
        elemen: 'Bilangan',
        tujuanPembelajaran: 'Memahami operasi bilangan bulat, bilangan rasional (pecahan & desimal), faktorisasi prima, dan penerapannya dalam masalah sehari-hari.',
        alokasiJp: 25,
        bulanPelaksanaan: 'Juli – Agustus',
        keterangan: 'Intrakurikuler • Modul Mendalam 1',
      },
      {
        semester: 'Ganjil',
        elemen: 'Aljabar',
        tujuanPembelajaran: 'Menyatakan bentuk aljabar, sifat operasi aljabar, serta menyelesaikan persamaan dan pertidaksamaan linear satu variabel.',
        alokasiJp: 25,
        bulanPelaksanaan: 'Agustus – September',
        keterangan: 'Intrakurikuler • Pemodelan Matematis',
      },
      {
        semester: 'Ganjil',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: 'Evaluasi tengah semester materi Bilangan & Aljabar serta pendampingan remedial/pengayaan.',
        alokasiJp: 10,
        bulanPelaksanaan: 'September – Oktober',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Ganjil',
        elemen: 'Rasio, Proporsi & Aritmetika Sosial',
        tujuanPembelajaran: 'Menyelesaikan masalah perbandingan senilai, berbalik nilai, skala, serta transaksi aritmetika sosial berlandaskan kejujuran.',
        alokasiJp: 20,
        bulanPelaksanaan: 'Oktober – November',
        keterangan: 'Intrakurikuler • Studi Kasus Muamalah',
      },
      {
        semester: 'Ganjil',
        elemen: 'Sumatif Akhir Semester (SAS) Ganjil',
        tujuanPembelajaran: 'Asesmen sumatif akhir semester ganjil, evaluasi portofolio pemecahan masalah, dan remedial.',
        alokasiJp: 10,
        bulanPelaksanaan: 'Desember',
        keterangan: 'Sumatif Akhir Semester I',
      },
      {
        semester: 'Genap',
        elemen: 'Geometri (Garis, Sudut & Bangun Datar)',
        tujuanPembelajaran: 'Menganalisis hubungan antarsudut, sifat segitiga/segiempat, serta menentukan keliling dan luas bangun datar gabungan.',
        alokasiJp: 30,
        bulanPelaksanaan: 'Januari – Februari',
        keterangan: 'Intrakurikuler • Eksplorasi Geometri',
      },
      {
        semester: 'Genap',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: 'Evaluasi tengah semester materi Geometri serta penguatan keterampilan pembuktian.',
        alokasiJp: 10,
        bulanPelaksanaan: 'Maret',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Genap',
        elemen: 'Pengukuran & Bangun Ruang',
        tujuanPembelajaran: 'Menentukan luas permukaan dan volume bangun ruang sisi datar/lengkung pada benda kontekstual.',
        alokasiJp: 20,
        bulanPelaksanaan: 'Maret – April',
        keterangan: 'Intrakurikuler • Proyek Miniatur',
      },
      {
        semester: 'Genap',
        elemen: 'Analisis Data & Peluang',
        tujuanPembelajaran: 'Mengumpulkan, menyajikan data dalam diagram (batang, garis, lingkaran), dan menafsirkan ukuran pemusatan data.',
        alokasiJp: 20,
        bulanPelaksanaan: 'April – Mei',
        keterangan: 'Intrakurikuler • Survei Statistika Kelas',
      },
      {
        semester: 'Genap',
        elemen: 'Sumatif Akhir Tahun (SAT)',
        tujuanPembelajaran: 'Asesmen sumatif akhir tahun ajaran, remedial, pengayaan HOTS, dan refleksi.',
        alokasiJp: 10,
        bulanPelaksanaan: 'Juni',
        keterangan: 'Sumatif Akhir Semester II',
      },
    ];
  } else if (m.includes('ipa') || m.includes('alam')) {
    capaianUmumTahunan = `Pada akhir tahun ajaran di ${fase} Kelas ${kelas}, peserta didik mampu memahami konsep sains terpadu (pengukuran, zat & perubahannya, energi, sistem kehidupan, dan tata surya) serta melaksanakan keterampilan proses inkuiri ilmiah secara sistematis.`;
    distribusiSemester = [
      {
        semester: 'Ganjil',
        elemen: 'Hakikat Sains & Pengukuran',
        tujuanPembelajaran: 'Merancang penyelidikan ilmiah sederhana, menggunakan alat ukur baku dengan ketelitian tepat, dan menyajikan data eksperimen.',
        alokasiJp: 20,
        bulanPelaksanaan: 'Juli – Agustus',
        keterangan: 'Intrakurikuler • Praktikum Lab IPA',
      },
      {
        semester: 'Ganjil',
        elemen: 'Zat dan Perubahannya',
        tujuanPembelajaran: 'Menganalisis wujud zat, massa jenis, serta membedakan perubahan fisika dan perubahan kimia dalam kehidupan sehari-hari.',
        alokasiJp: 25,
        bulanPelaksanaan: 'Agustus – September',
        keterangan: 'Intrakurikuler • Eksperimen Zat',
      },
      {
        semester: 'Ganjil',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: 'Evaluasi tengah semester materi Pengukuran & Zat serta bimbingan remedial/pengayaan.',
        alokasiJp: 10,
        bulanPelaksanaan: 'September – Oktober',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Ganjil',
        elemen: 'Suhu, Kalor, Pemuaian & Gerak Gaya',
        tujuanPembelajaran: 'Menyelidiki perpindahan kalor, pemuaian benda, serta hubungan gaya dan gerak berdasarkan Hukum Newton.',
        alokasiJp: 25,
        bulanPelaksanaan: 'Oktober – November',
        keterangan: 'Intrakurikuler • Praktikum Fisika',
      },
      {
        semester: 'Ganjil',
        elemen: 'Sumatif Akhir Semester (SAS) Ganjil',
        tujuanPembelajaran: 'Asesmen sumatif akhir semester ganjil, penilaian laporan praktikum, dan remedial.',
        alokasiJp: 10,
        bulanPelaksanaan: 'Desember',
        keterangan: 'Sumatif Akhir Semester I',
      },
      {
        semester: 'Genap',
        elemen: 'Klasifikasi Makhluk Hidup & Sel',
        tujuanPembelajaran: 'Mengidentifikasi ciri makhluk hidup, kunci determinasi, dan struktur sel melalui pengamatan mikroskop.',
        alokasiJp: 25,
        bulanPelaksanaan: 'Januari – Februari',
        keterangan: 'Intrakurikuler • Praktikum Mikroskop',
      },
      {
        semester: 'Genap',
        elemen: 'Ekologi & Keanekaragaman Hayati',
        tujuanPembelajaran: 'Menganalisis interaksi komponen ekosistem, rantai makanan, serta upaya pelestarian lingkungan sebagai amanah khalifah.',
        alokasiJp: 20,
        bulanPelaksanaan: 'Februari – Maret',
        keterangan: 'Intrakurikuler • Observasi Lingkungan',
      },
      {
        semester: 'Genap',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: 'Evaluasi tengah semester materi Klasifikasi, Sel & Ekologi.',
        alokasiJp: 10,
        bulanPelaksanaan: 'Maret',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Genap',
        elemen: 'Bumi dan Tata Surya',
        tujuanPembelajaran: 'Mendeskripsikan sistem tata surya, rotasi-revolusi bumi, fase bulan, dan fenomena gerhana sebagai tadabbur kebesaran Allah.',
        alokasiJp: 25,
        bulanPelaksanaan: 'April – Mei',
        keterangan: 'Intrakurikuler • Proyek Model Tata Surya',
      },
      {
        semester: 'Genap',
        elemen: 'Sumatif Akhir Tahun (SAT)',
        tujuanPembelajaran: 'Asesmen sumatif akhir tahun ajaran, pameran karya sains, dan refleksi.',
        alokasiJp: 10,
        bulanPelaksanaan: 'Juni',
        keterangan: 'Sumatif Akhir Semester II',
      },
    ];
  } else if (m.includes('agama') || m.includes('pai')) {
    capaianUmumTahunan = `Pada akhir tahun ajaran di ${fase} Kelas ${kelas}, peserta didik mampu membaca, menghafal, dan mentadabburi ayat Al-Qur'an pilihan, mengokohkan aqidah Asmaul Husna, menerapkan fikih ibadah dengan tertib, meneladani akhlakul karimah, serta mengambil ibrah sejarah peradaban Islam.`;
    distribusiSemester = [
      {
        semester: 'Ganjil',
        elemen: 'Al-Qur\'an dan Hadis',
        tujuanPembelajaran: 'Membaca dengan tajwid benar, menghafal, dan mengamalkan kandungan ayat Al-Qur\'an tentang menuntut ilmu dan rendah hati.',
        alokasiJp: 15,
        bulanPelaksanaan: 'Juli – Agustus',
        keterangan: 'Intrakurikuler • Tahsin & Tadabbur',
      },
      {
        semester: 'Ganjil',
        elemen: 'Aqidah',
        tujuanPembelajaran: 'Memahami makna dan meneladani sifat Allah SWT dalam Asmaul Husna (Al-\'Alim, Al-Khabir, As-Sami\', Al-Bashir) dalam kehidupan sehari-hari.',
        alokasiJp: 12,
        bulanPelaksanaan: 'Agustus – September',
        keterangan: 'Intrakurikuler • Refleksi Iman',
      },
      {
        semester: 'Ganjil',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: 'Evaluasi praktik bacaan Al-Qur\'an, pemahaman aqidah, serta bimbingan tahsin.',
        alokasiJp: 6,
        bulanPelaksanaan: 'September – Oktober',
        keterangan: 'Asesmen Sumatif & Praktik',
      },
      {
        semester: 'Ganjil',
        elemen: 'Akhlak & Fikih Ibadah',
        tujuanPembelajaran: 'Menerapkan tata cara bersuci (thaharah), salat wajib berjamaah, serta adab berbakti kepada orang tua dan guru.',
        alokasiJp: 15,
        bulanPelaksanaan: 'Oktober – November',
        keterangan: 'Intrakurikuler • Praktik Ibadah',
      },
      {
        semester: 'Ganjil',
        elemen: 'Sumatif Akhir Semester (SAS) Ganjil',
        tujuanPembelajaran: 'Asesmen tulis & praktik akhir semester ganjil, remedial, dan pengayaan.',
        alokasiJp: 6,
        bulanPelaksanaan: 'Desember',
        keterangan: 'Sumatif Akhir Semester I',
      },
      {
        semester: 'Genap',
        elemen: 'Al-Qur\'an dan Hadis (Toleransi & Ukhuwah)',
        tujuanPembelajaran: 'Menganalisis dalil Al-Qur\'an tentang persaudaraan (ukhuwah) dan toleransi (tasamuh) serta mengamalkannya di lingkungan sekolah.',
        alokasiJp: 15,
        bulanPelaksanaan: 'Januari – Februari',
        keterangan: 'Intrakurikuler • Diskusi Dalil',
      },
      {
        semester: 'Genap',
        elemen: 'Fikih (Salat Jumat, Jamak & Qasar)',
        tujuanPembelajaran: 'Memahami ketentuan dan mempraktikkan salat Jumat, rukhsah salat jamak-qasar, serta ibadah puasa.',
        alokasiJp: 15,
        bulanPelaksanaan: 'Februari – Maret',
        keterangan: 'Intrakurikuler • Simulasi Fikih',
      },
      {
        semester: 'Genap',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: 'Evaluasi tengah semester genap dan uji praktik fikih ibadah.',
        alokasiJp: 6,
        bulanPelaksanaan: 'Maret',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Genap',
        elemen: 'Sejarah Peradaban Islam (SPI)',
        tujuanPembelajaran: 'Menelaah perjuangan dakwah Rasulullah SAW dan masa keemasan peradaban Islam untuk menumbuhkan semangat berkarya.',
        alokasiJp: 12,
        bulanPelaksanaan: 'April – Mei',
        keterangan: 'Intrakurikuler • Proyek Linimasa SPI',
      },
      {
        semester: 'Genap',
        elemen: 'Sumatif Akhir Tahun (SAT)',
        tujuanPembelajaran: 'Asesmen sumatif akhir tahun ajaran, uji hafalan, dan refleksi pembiasaan akhlak.',
        alokasiJp: 6,
        bulanPelaksanaan: 'Juni',
        keterangan: 'Sumatif Akhir Semester II',
      },
    ];
  } else {
    const ganjilTarget = jpPerMinggu * mingguEfektifGanjil;
    const genapTarget = jpPerMinggu * mingguEfektifGenap;
    const u1 = Math.round(ganjilTarget * 0.30);
    const u2 = Math.round(ganjilTarget * 0.30);
    const asts1 = Math.max(jpPerMinggu * 2, Math.round(ganjilTarget * 0.10));
    const sas1 = Math.max(jpPerMinggu * 2, Math.round(ganjilTarget * 0.10));
    const u3 = Math.max(jpPerMinggu * 2, ganjilTarget - u1 - u2 - asts1 - sas1);

    const g1 = Math.round(genapTarget * 0.30);
    const g2 = Math.round(genapTarget * 0.30);
    const asts2 = Math.max(jpPerMinggu * 2, Math.round(genapTarget * 0.10));
    const sat2 = Math.max(jpPerMinggu * 2, Math.round(genapTarget * 0.10));
    const g3 = Math.max(jpPerMinggu * 2, genapTarget - g1 - g2 - asts2 - sat2);

    distribusiSemester = [
      {
        semester: 'Ganjil',
        elemen: `Unit 1 • Fondasi Konsep ${mapel}`,
        tujuanPembelajaran: `Memahami konsep esensial, ruang lingkup, dan prinsip dasar ${mapel} Kelas ${kelas} secara berkesadaran dan bermakna.`,
        alokasiJp: u1,
        bulanPelaksanaan: 'Juli – Agustus',
        keterangan: 'Intrakurikuler • Modul Mendalam 1',
      },
      {
        semester: 'Ganjil',
        elemen: `Unit 2 • Analisis & Penerapan Kontekstual`,
        tujuanPembelajaran: `Menganalisis studi kasus kontekstual dan menerapkan keterampilan inti ${mapel} dalam diskusi kolaboratif.`,
        alokasiJp: u2,
        bulanPelaksanaan: 'Agustus – September',
        keterangan: 'Intrakurikuler • Studi Kasus & LKPD',
      },
      {
        semester: 'Ganjil',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: `Evaluasi ketercapaian tujuan pembelajaran Unit 1–2 ${mapel} serta program remedial dan pengayaan.`,
        alokasiJp: asts1,
        bulanPelaksanaan: 'September – Oktober',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Ganjil',
        elemen: `Unit 3 • Eksplorasi & Unjuk Karya Semester I`,
        tujuanPembelajaran: `Merancang dan menyajikan produk/proyek aplikatif ${mapel} yang mengintegrasikan 8 Dimensi Profil Lulusan.`,
        alokasiJp: u3,
        bulanPelaksanaan: 'Oktober – November',
        keterangan: 'Intrakurikuler • Proyek Kolaboratif',
      },
      {
        semester: 'Ganjil',
        elemen: 'Sumatif Akhir Semester (SAS) Ganjil',
        tujuanPembelajaran: 'Asesmen sumatif akhir semester ganjil, penilaian portofolio, remedial, dan refleksi pembelajaran.',
        alokasiJp: sas1,
        bulanPelaksanaan: 'Desember',
        keterangan: 'Sumatif Akhir Semester I',
      },
      {
        semester: 'Genap',
        elemen: `Unit 4 • Pendalaman Materi Lanjutan ${mapel}`,
        tujuanPembelajaran: `Mengkaji konsep lanjutan ${mapel} Kelas ${kelas} serta menghubungkannya dengan lintas disiplin ilmu.`,
        alokasiJp: g1,
        bulanPelaksanaan: 'Januari – Februari',
        keterangan: 'Intrakurikuler • Modul Mendalam 4',
      },
      {
        semester: 'Genap',
        elemen: `Unit 5 • Pemecahan Masalah HOTS`,
        tujuanPembelajaran: `Menyelesaikan permasalahan nyata berskala kompleks secara kritis, kreatif, dan komunikatif pada bidang ${mapel}.`,
        alokasiJp: g2,
        bulanPelaksanaan: 'Februari – Maret',
        keterangan: 'Intrakurikuler • Problem-Based Learning',
      },
      {
        semester: 'Genap',
        elemen: 'Asesmen Sumatif Tengah Semester (ASTS)',
        tujuanPembelajaran: `Evaluasi ketercapaian tujuan pembelajaran Unit 4–5 ${mapel} beserta umpan balik formatif-sumatif.`,
        alokasiJp: asts2,
        bulanPelaksanaan: 'Maret',
        keterangan: 'Asesmen Sumatif & Intervensi',
      },
      {
        semester: 'Genap',
        elemen: `Unit 6 • Proyek Akhir & Penguatan Karakter`,
        tujuanPembelajaran: `Menghasilkan karya akhir tahun ${mapel} yang bermanfaat bagi lingkungan sekolah dan masyarakat berlandaskan nilai Islami.`,
        alokasiJp: g3,
        bulanPelaksanaan: 'April – Mei',
        keterangan: 'Intrakurikuler / Kokurikuler',
      },
      {
        semester: 'Genap',
        elemen: 'Sumatif Akhir Tahun (SAT)',
        tujuanPembelajaran: 'Asesmen sumatif akhir tahun ajaran, gelar karya, remedial, dan refleksi akhir tahun.',
        alokasiJp: sat2,
        bulanPelaksanaan: 'Juni',
        keterangan: 'Sumatif Akhir Semester II',
      },
    ];
  }

  return {
    formatType: 'prota_resmi',
    identitas: {
      mataPelajaran: mapel,
      satuanPendidikan,
      fase,
      kelas,
      tahunAjaran,
      namaPenyusun,
      jpPerMinggu,
      mingguEfektifGanjil,
      mingguEfektifGenap,
      fokusTahunan,
      referensiRegulasi: 'Struktur Kurikulum Nasional Kemendikdasmen • 36 Minggu Efektif Pertahun Ajaran',
    },
    capaianUmumTahunan,
    distribusiSemester,
    catatanPelaksanaan: `Alokasi waktu disusun berdasarkan Kalender Pendidikan ${satuanPendidikan} Tahun Ajaran ${tahunAjaran} dengan asumsi ${mingguEfektifGanjil} minggu efektif Semester Ganjil dan ${mingguEfektifGenap} minggu efektif Semester Genap (${jpPerMinggu} JP/minggu). Pelaksanaan bersifat fleksibel menyesuaikan agenda kokurikuler, hari libur keagamaan, dan kebutuhan diferensiasi peserta didik.`,
    integrasiNilaiIslami: {
      surahAyat: ayat.surahAyat,
      teksArab: ayat.teksArab,
      terjemahan: ayat.terjemahan,
      relevansiProta: ayat.kaitanMateri,
    },
  };
}

export function formatProtaToPlainText(prota: ProtaData): string {
  const summary = calculateProtaSummary(prota);
  const ganjilRows = prota.distribusiSemester.filter((r) => r.semester === 'Ganjil');
  const genapRows = prota.distribusiSemester.filter((r) => r.semester === 'Genap');

  const formatRows = (rows: ProtaItemRow[]) =>
    rows
      .map(
        (r, i) =>
          `${i + 1}. [${r.elemen}] (${r.alokasiJp} JP | ${r.bulanPelaksanaan})\n   ATP/Materi : ${r.tujuanPembelajaran}\n   Keterangan : ${r.keterangan}`
      )
      .join('\n\n');

  return `PROGRAM TAHUNAN (PROTA)
${prota.identitas.satuanPendidikan.toUpperCase()}
TAHUN AJARAN ${prota.identitas.tahunAjaran}

IDENTITAS DOKUMEN PROTA
Mata Pelajaran        : ${prota.identitas.mataPelajaran}
Fase / Kelas          : ${prota.identitas.fase} / Kelas ${prota.identitas.kelas}
Beban Belajar         : ${prota.identitas.jpPerMinggu} JP / Minggu
Minggu Efektif        : Semester Ganjil ${prota.identitas.mingguEfektifGanjil} Minggu | Semester Genap ${prota.identitas.mingguEfektifGenap} Minggu
Total Alokasi Waktu   : ${summary.totalJpTahunan} JP / Tahun (Target Kalender: ${summary.targetJpTahunan} JP)
Guru Penyusun         : ${prota.identitas.namaPenyusun}
Acuan Regulasi        : ${prota.identitas.referensiRegulasi}

A. CAPAIAN PEMBELAJARAN UMUM TAHUNAN
${prota.capaianUmumTahunan}

B. DISTRIBUSI ALUR TUJUAN PEMBELAJARAN — SEMESTER I (GANJIL)
${formatRows(ganjilRows)}
Subtotal Semester I (Ganjil): ${summary.totalJpGanjil} JP (${summary.jumlahUnitGanjil} Unit)

C. DISTRIBUSI ALUR TUJUAN PEMBELAJARAN — SEMESTER II (GENAP)
${formatRows(genapRows)}
Subtotal Semester II (Genap): ${summary.totalJpGenap} JP (${summary.jumlahUnitGenap} Unit)

TOTAL ALOKASI WAKTU 1 TAHUN PELAJARAN: ${summary.totalJpTahunan} JP

D. CATATAN KALENDER PENDIDIKAN & FLEKSIBILITAS PELAKSANAAN
${prota.catatanPelaksanaan}

E. INTEGRASI NILAI ISLAMI (${prota.integrasiNilaiIslami.surahAyat})
Teks Arab : ${prota.integrasiNilaiIslami.teksArab}
Terjemahan: "${prota.integrasiNilaiIslami.terjemahan}"
Relevansi : ${prota.integrasiNilaiIslami.relevansiProta}`;
}
