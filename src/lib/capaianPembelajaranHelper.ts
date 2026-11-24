import { suggestAyatForMateri, DIMENSI_PROFIL_LULUSAN } from './quranAyatPresets';

export interface CapaianPembelajaranElemen {
  elemen: string;
  deskripsiCp: string;
  kompetensiInti: string;
  lingkupMateri: string;
}

export interface CapaianPembelajaranData {
  formatType: 'cp_resmi';
  identitas: {
    mataPelajaran: string;
    satuanPendidikan: string;
    fase: string;
    kelas: string;
    tahunAjaran: string;
    semester: string;
    namaPenyusun: string;
    topikFokus: string;
    referensiRegulasi: string;
  };
  rasional: string;
  tujuanMataPelajaran: string[];
  karakteristik: string;
  capaianUmumFase: string;
  elemenList: CapaianPembelajaranElemen[];
  dimensiProfilLulusan: string[];
  integrasiNilaiIslami: {
    surahAyat: string;
    teksArab: string;
    terjemahan: string;
    relevansiCp: string;
  };
}

export function isStructuredCpData(data: any): data is CapaianPembelajaranData {
  return Boolean(data && data.formatType === 'cp_resmi' && Array.isArray(data.elemenList));
}

export function normalizeFaseFromKelas(kelas?: string): string {
  const k = (kelas || '').toUpperCase();
  if (k.includes('X') && !k.includes('IX')) return 'Fase E / F';
  if (k.includes('VII') || k.includes('VIII') || k.includes('IX') || k.includes('7') || k.includes('8') || k.includes('9')) {
    return 'Fase D (Kelas VII–IX SMP)';
  }
  return 'Fase D (Kelas VII–IX SMP)';
}

export function buildOfficialCpData(params: {
  mataPelajaran?: string;
  kelas?: string;
  topik?: string;
  tahunAjaran?: string;
  semester?: string;
  namaPenyusun?: string;
  satuanPendidikan?: string;
}): CapaianPembelajaranData {
  const mapel = (params.mataPelajaran || 'Umum').trim();
  const kelas = (params.kelas || 'VII').trim();
  const topik = (params.topik || '').trim();
  const tahunAjaran = params.tahunAjaran || '2026/2027';
  const semester = params.semester || 'Ganjil';
  const namaPenyusun = params.namaPenyusun || 'Guru Mata Pelajaran';
  const satuanPendidikan = params.satuanPendidikan || 'SMP Islam Modern Al Fakhir';
  const fase = normalizeFaseFromKelas(kelas);

  const normMapel = mapel.toLowerCase();
  const ayat = suggestAyatForMateri(mapel, topik || mapel);
  const topikSuffix = topik ? ` dengan penekanan khusus pada materi ${topik}` : '';

  let rasional = `Mata pelajaran ${mapel} berperan strategis dalam membangun nalar kritis, kreativitas, kemandirian, dan keterampilan pemecahan masalah peserta didik pada ${fase}. Melalui pembelajaran mendalam yang kontekstual${topikSuffix}, peserta didik dibekali kompetensi esensial untuk berkontribusi secara produktif, etis, dan berakhlak mulia di tengah perkembangan ilmu pengetahuan dan masyarakat modern.`;

  let tujuanMataPelajaran: string[] = [
    `Memahami konsep esensial, prinsip, dan keterkaitan materi ${mapel}${topik ? ` khususnya pada topik ${topik}` : ''} secara mendalam dan bermakna.`,
    `Menerapkan penalaran kritis, analitis, dan kreatif untuk memecahkan permasalahan nyata sehari-hari secara sistematis.`,
    `Berkolaborasi dan mengomunikasikan gagasan maupun hasil karya secara santun, efektif, dan bertanggung jawab.`,
    `Menginternalisasi nilai keimanan, ketakwaan, serta 8 Dimensi Profil Lulusan dalam setiap aktivitas belajar.`,
  ];

  let karakteristik = `Pembelajaran ${mapel} pada ${fase} menekankan keseimbangan antara penguasaan pemahaman konsep mendalam, keterampilan proses/praktik aplikatif, serta refleksi kebermanfaatan ilmu dalam kehidupan nyata dan nilai-nilai keislaman.`;

  let capaianUmumFase = `Pada akhir Fase D, peserta didik mampu memahami konsep esensial ${mapel}${topikSuffix}, menganalisis permasalahan kontekstual secara sistematis, merancang serta menyajikan solusi atau karya kolaboratif secara kreatif, dan merefleksikan penerapannya secara etis sesuai nilai-nilai Islam dan 8 Dimensi Profil Lulusan.`;

  let elemenList: CapaianPembelajaranElemen[] = [];

  if (normMapel.includes('informatika') || normMapel.includes('komputer') || normMapel.includes('tik')) {
    rasional = `Informatika merupakan bidang ilmu mengenai studi, perancangan, dan pembuatan sistem komputasi, serta prinsip-prinsip yang menjadi dasar perancangan tersebut. Pembelajaran Informatika pada ${fase}${topikSuffix} membekali peserta didik kemampuan berpikir komputasional (computational thinking), literasi digital yang beretika, analisis data, serta algoritma dan pemrograman agar siap menghadapi tantangan masyarakat digital 5.0 secara produktif, aman, dan berakhlak mulia.`;
    tujuanMataPelajaran = [
      `Berpikir komputasional secara sistematis dalam menyelesaikan persoalan kompleks secara efisien, termasuk mengorganisasi informasi melalui ${topik || 'struktur data dan algoritma'}.`,
      `Memahami cara kerja sistem komputer, jaringan lokal/internet, serta mekanisme pengolahan data digital secara bertanggung jawab.`,
      `Terampil memanfaatkan perkakas digital, menganalisis data terstruktur, dan merancang solusi komputasi/program sederhana secara kreatif.`,
      `Menerapkan etika digital, keamanan informasi, dan prinsip tabayyun dalam berkolaborasi di ruang siber.`,
    ];
    karakteristik = `Mata pelajaran Informatika pada ${fase} mengintegrasikan aspek teoritis dan praktis melalui empat elemen utama yang saling terkait: Berpikir Komputasional (BK), Literasi Digital (LD), Analisis Data (AD), serta Algoritma dan Pemrograman (AP). Pembelajaran dapat dilaksanakan secara plugged (menggunakan komputer) maupun unplugged (tanpa komputer) dengan pendekatan Pembelajaran Mendalam.`;
    capaianUmumFase = `Pada akhir Fase D, peserta didik mampu menerapkan proses berpikir komputasional secara mandiri untuk menyelesaikan persoalan dengan data diskrit bervolume kecil (termasuk pemodelan ${topik || 'struktur data, algoritma, dan representasi data'}), mendisposisikan berpikir komputasional dalam bidang lain, memanfaatkan aplikasi digital secara terintegrasi, mengelola dan menganalisis data secara sistematis, serta memahami dampak sosial informatika dan etika keamanan digital.`;
    elemenList = [
      {
        elemen: 'Berpikir Komputasional (BK)',
        deskripsiCp: `Peserta didik mampu memahami konsep himpunan data terstruktur dalam kehidupan sehari-hari, memahami konsep lembar kerja pengolah data, menerapkan berpikir komputasional dalam menyelesaikan persoalan yang mengandung himpunan data berstruktur sederhana dengan volume kecil, serta mendisposisikan berpikir komputasional yang diperlukan pada berbagai bidang${topik ? `, termasuk penerapan ${topik}` : ''}.`,
        kompetensiInti: 'Dekomposisi, pengenalan pola, abstraksi, dan perancangan solusi algoritmik',
        lingkupMateri: topik
          ? `${topik} (daftar/list, antrean/queue, tumpukan/stack, pohon/tree, graf), optimasi penjadwalan, dan representasi data`
          : 'Struktur data dasar (daftar, tumpukan, antrean, pohon, graf), algoritma pencarian & pengurutan, representasi data biner',
      },
      {
        elemen: 'Literasi Digital (LD)',
        deskripsiCp: 'Peserta didik mampu memahami cara kerja dan penggunaan mesin pencari di internet, mengetahui kualitas informasi dan kredibilitas sumber digital, mengenal ekosistem media pers digital, membedakan fakta dan opini, memahami pemanfaatan perkakas teknologi digital untuk membuat laporan, presentasi, serta memahami keamanan data pribadi dan etika berinteraksi di ruang digital.',
        kompetensiInti: 'Evaluasi kredibilitas informasi (tabayyun digital), kolaborasi konten, dan keamanan siber dasar',
        lingkupMateri: 'Sistem komputer, jaringan komputer & topologi, integrasi aplikasi perkantoran, jejak digital, dan keamanan informasi',
      },
      {
        elemen: 'Analisis Data (AD)',
        deskripsiCp: 'Peserta didik mampu mengakses, mengolah, mengelola, dan menganalisis data secara efisien, terstruktur, dan sistematis untuk menginterpretasi dan memprediksi sekumpulan data dari situasi konkret sehari-hari dengan menggunakan perkakas TIK atau manual.',
        kompetensiInti: 'Pengolahan, peringkasan, visualisasi, dan interpretasi data terstruktur',
        lingkupMateri: 'Pengorganisasian tabel data, fungsi agregasi & pencarian pada spreadsheet, visualisasi grafik, dan penarikan kesimpulan',
      },
      {
        elemen: 'Algoritma dan Pemrograman (AP)',
        deskripsiCp: `Peserta didik mampu memahami objek-objek dan instruksi dalam sebuah lingkungan pemrograman blok (visual) maupun tekstual dasar untuk mengembangkan program visual sederhana berdasarkan contoh-contoh yang diberikan, mengembangkan karya digital kreatif, serta mengimplementasikan ${topik || 'struktur data dan alur logika'} dalam pemrograman terstruktur.`,
        kompetensiInti: 'Perancangan alur logika, percabangan, perulangan, variabel, dan pengujian program',
        lingkupMateri: `Flowchart & pseudocode, variabel, kontrol alur, fungsi sederhana, serta implementasi ${topik || 'struktur data dasar'}`,
      },
    ];
  } else if (normMapel.includes('matematika')) {
    rasional = `Matematika merupakan ilmu universal yang melandasi perkembangan teknologi modern serta berperan penting dalam melatih daya pikir logis, analitis, sistematis, kritis, dan kreatif. Pembelajaran Matematika pada ${fase}${topikSuffix} membekali peserta didik kemampuan pemodelan matematis dan pemecahan masalah nyata secara akurat dan jujur.`;
    tujuanMataPelajaran = [
      `Memahami fakta, konsep, prinsip, operasi, dan relasi matematis secara mendalam${topik ? ` termasuk pada materi ${topik}` : ''}.`,
      'Menggunakan penalaran pada pola dan sifat, melakukan manipulasi matematis dalam membuat generalisasi, dan menyusun pembuktian logis.',
      'Memecahkan masalah matematis kontekstual yang meliputi kemampuan memahami masalah, merancang model, menyelesaikan, dan menafsirkan solusi.',
      'Mengomunikasikan gagasan matematis dengan simbol, tabel, diagram, atau media lain untuk memperjelas keadaan atau masalah.',
    ];
    karakteristik = `Matematika pada ${fase} mengorganisasikan kompetensi melalui lima elemen konten (Bilangan, Aljabar, Pengukuran, Geometri, serta Analisis Data dan Peluang) yang dipadukan dengan elemen proses penalaran, pemecahan masalah, komunikasi, dan representasi matematis.`;
    capaianUmumFase = `Pada akhir Fase D, peserta didik dapat menyelesaikan masalah kontekstual dengan menggunakan konsep dan keterampilan matematika yang dipelajari pada fase ini${topikSuffix}, meliputi bilangan rasional, aljabar linear, pengukuran bangun ruang, geometri transformasi, serta analisis data dan peluang.`;
    elemenList = [
      {
        elemen: 'Bilangan',
        deskripsiCp: 'Peserta didik dapat membaca, menulis, dan membandingkan bilangan bulat, bilangan rasional dan irasional, bilangan desimal, bilangan berpangkat bulat dan akar, serta menggunakannya dalam menyelesaikan masalah aritmetika sosial, rasio, dan proporsi.',
        kompetensiInti: 'Operasi hitung, estimasi, proporsi, dan pemecahan masalah numerik',
        lingkupMateri: topik || 'Bilangan bulat & pecahan, perpangkatan, notasi ilmiah, rasio, dan aritmetika sosial',
      },
      {
        elemen: 'Aljabar',
        deskripsiCp: 'Peserta didik dapat mengenali, memprediksi, dan menggeneralisasi pola dalam bentuk susunan benda dan bilangan, menyatakan suatu situasi ke dalam bentuk aljabar, serta menyelesaikan persamaan dan pertidaksamaan linear satu variabel dan sistem persamaan linear dua variabel.',
        kompetensiInti: 'Pemodelan aljabar, relasi & fungsi, dan penyelesaian sistem persamaan',
        lingkupMateri: 'Bentuk aljabar, PLSV/PtLSV, relasi & fungsi, persamaan garis lurus, dan SPLDV',
      },
      {
        elemen: 'Pengukuran & Geometri',
        deskripsiCp: 'Peserta didik dapat menjelaskan cara menentukan luas lingkaran, luas permukaan dan volume bangun ruang, menggunakan hubungan antar-sudut, menerapkan teorema Pythagoras, serta melakukan transformasi geometri tunggal pada bidang koordinat Kartesius.',
        kompetensiInti: 'Visualisasi spasial, pengukuran presisi, dan pembuktian geometris',
        lingkupMateri: 'Garis & sudut, kesebangunan & kekongruenan, teorema Pythagoras, bangun ruang sisi datar/lengkung, transformasi',
      },
      {
        elemen: 'Analisis Data dan Peluang',
        deskripsiCp: 'Peserta didik dapat merumuskan pertanyaan, mengumpulkan, menyajikan, dan menganalisis data menggunakan diagram serta ukuran pemusatan (mean, median, modus), dan menentukan peluang empiris serta teoretis suatu kejadian sederhana.',
        kompetensiInti: 'Literasi statistika, interpretasi data, dan estimasi peluang',
        lingkupMateri: 'Penyajian diagram, ukuran pemusatan & penyebaran data, dan peluang kejadian',
      },
    ];
  } else if (normMapel.includes('ipa') || normMapel.includes('alam') || normMapel.includes('biologi') || normMapel.includes('fisika') || normMapel.includes('kimia')) {
    rasional = `Ilmu Pengetahuan Alam (IPA) melatih peserta didik memahami fenomena alam semesta secara ilmiah melalui penyelidikan sistematis, sekaligus menumbuhkan rasa syukur dan kekaguman terhadap kebesaran ciptaan Allah SWT. Pembelajaran IPA pada ${fase}${topikSuffix} memperkuat literasi sains dan tanggung jawab pelestarian lingkungan.`;
    tujuanMataPelajaran = [
      `Mengembangkan ketertarikan dan rasa ingin tahu untuk mengkaji fenomena alam dan konsep ${topik || 'sains terpadu'} secara mendalam.`,
      'Berperan aktif dalam memelihara, menjaga, dan melestarikan lingkungan alam serta mengelola sumber daya secara bijak.',
      'Mengembangkan keterampilan proses inkuiri untuk merumuskan masalah, menyelidiki secara ilmiah, dan mengambil keputusan berbasis bukti.',
    ];
    karakteristik = `IPA pada ${fase} diselenggarakan secara terpadu dengan memadukan dua elemen utama yang tidak terpisahkan, yakni Pemahaman IPA (konsep biologi, fisika, kimia, dan kebumian) serta Keterampilan Proses inkuiri ilmiah.`;
    capaianUmumFase = `Pada akhir Fase D, peserta didik mampu melakukan penyelidikan ilmiah terhadap fenomena alam, menguasai konsep esensial IPA${topikSuffix}, serta menerapkan pengetahuan sains untuk memecahkan masalah sehari-hari dan menjaga keseimbangan ekosistem.`;
    elemenList = [
      {
        elemen: 'Pemahaman IPA',
        deskripsiCp: `Peserta didik memahami proses identifikasi makhluk hidup, sistem organisasi kehidupan (sel, jaringan, organ), interaksi ekosistem, sifat dan perubahan zat, energi, gaya & gerak, listrik & magnet, serta sistem tata surya${topik ? `, dengan pendalaman pada ${topik}` : ''}.`,
        kompetensiInti: 'Penguasaan konsep sains terpadu, keterkaitan struktur-fungsi, dan hukum alam',
        lingkupMateri: topik || 'Hakikat sains, sel & sistem organ, klasifikasi & ekosistem, zat & kalor, gaya, energi, listrik, tata surya',
      },
      {
        elemen: 'Keterampilan Proses (Inkuiri Ilmiah)',
        deskripsiCp: 'Peserta didik mampu mengamati fenomena menggunakan pancaindra dan alat ukur, mempertanyakan dan memprediksi berbasis pengetahuan ilmiah, merencanakan serta melakukan percobaan terkontrol, memproses dan menganalisis data, mengevaluasi hasil penyelidikan, serta mengomunikasikan temuan secara sistematis.',
        kompetensiInti: 'Observasi, hipotesis, eksperimen, analisis bukti, refleksi, dan komunikasi ilmiah',
        lingkupMateri: 'Metode ilmiah, pengukuran presisi, praktikum laboratorium, penyajian tabel/grafik, dan laporan ilmiah',
      },
    ];
  } else if (normMapel.includes('indonesia')) {
    rasional = `Bahasa Indonesia merupakan wahana utama pengembangan literasi, berpikir kritis, kreativitas, serta karakter kebangsaan. Pembelajaran Bahasa Indonesia pada ${fase}${topikSuffix} membekali peserta didik kecakapan berbahasa dan bersastra secara santun, logis, dan efektif.`;
    tujuanMataPelajaran = [
      'Memiliki kemampuan berbahasa Indonesia yang santun, kritis, dan kreatif untuk berbagai tujuan komunikasi.',
      `Memahami, menganalisis, dan memproduksi beragam jenis teks multimodal${topik ? ` termasuk ${topik}` : ''}.`,
      'Mengapresiasi karya sastra dan budaya literasi sebagai sarana memperluas wawasan dan empati sosial.',
    ];
    karakteristik = `Pembelajaran Bahasa Indonesia pada ${fase} berfokus pada empat keterampilan berbahasa yang terpadu: Menyimak, Membaca dan Memirsa, Berbicara dan Mempresentasikan, serta Menulis dengan pendekatan berbasis genre teks.`;
    capaianUmumFase = `Pada akhir Fase D, peserta didik memiliki kemampuan berbahasa untuk berkomunikasi dan bernalar sesuai dengan tujuan, konteks sosial, dan akademis${topikSuffix}, serta mampu memahami, mengolah, menginterpretasi, dan memproduksi berbagai teks fiksi maupun nonfiksi secara akurat dan santun.`;
    elemenList = [
      {
        elemen: 'Menyimak',
        deskripsiCp: `Peserta didik mampu menganalisis dan memaknai informasi berupa gagasan, pikiran, perasaan, pandangan, arahan, atau pesan yang tepat dari berbagai tipe teks audiovisual dan aural${topik ? ` termasuk ${topik}` : ''}.`,
        kompetensiInti: 'Analisis pesan lisan, identifikasi gagasan pokok, dan evaluasi informasi',
        lingkupMateri: topik || 'Teks deskripsi, narasi, prosedur, berita, laporan hasil observasi, dan pidato',
      },
      {
        elemen: 'Membaca dan Memirsa',
        deskripsiCp: 'Peserta didik memahami informasi berupa gagasan, pikiran, pandangan, arahan, atau pesan dari teks visual dan audiovisual untuk menemukan makna tersurat dan tersirat, serta mengevaluasi kualitas dan kredibilitas sumber informasi.',
        kompetensiInti: 'Pemahaman literal, inferensial, dan evaluatif terhadap teks multimodal',
        lingkupMateri: 'Struktur & kaidah kebahasaan teks, kosakata denotatif-konotatif, dan literasi kritis',
      },
      {
        elemen: 'Berbicara dan Mempresentasikan',
        deskripsiCp: 'Peserta didik mampu menyampaikan gagasan, pikiran, pandangan, arahan, atau pesan untuk tujuan pengajuan usul, pemecahan masalah, dan pemberian solusi secara lisan dalam bentuk monolog dan dialog logis, kritis, dan kreatif.',
        kompetensiInti: 'Artikulasi gagasan, argumentasi santun, dan presentasi efektif',
        lingkupMateri: 'Diskusi kelompok, presentasi multimedia, debat santun, dan bercerita/berpidato',
      },
      {
        elemen: 'Menulis',
        deskripsiCp: `Peserta didik mampu menulis gagasan, pikiran, pandangan, arahan, atau pesan tertulis untuk berbagai tujuan secara logis, kritis, dan kreatif dengan memperhatikan struktur teks dan kaidah EYD${topik ? `, khususnya penulisan ${topik}` : ''}.`,
        kompetensiInti: 'Perencanaan, penyusunan draf, penyuntingan, dan publikasi karya tulis',
        lingkupMateri: topik ? `Penyusunan dan penyuntingan ${topik}` : 'Menulis teks deskripsi, eksposisi, persuasi, artikel ilmiah populer, dan karya sastra',
      },
    ];
  } else if (normMapel.includes('agama') || normMapel.includes('pai')) {
    rasional = `Pendidikan Agama Islam dan Budi Pekerti membimbing peserta didik menjadi insan beriman, bertakwa kepada Allah SWT, berakhlak mulia, moderat, dan rahmatan lil 'alamin. Pada ${fase}${topikSuffix}, pembelajaran diarahkan pada pemahaman ajaran Islam yang utuh dan pengamalan nyata dalam keseharian.`;
    tujuanMataPelajaran = [
      'Menumbuhkembangkan akidah melalui pemberian, pemupukan, dan pengembangan pengetahuan serta pengamalan ajaran Islam.',
      `Memahami dan mengamalkan nilai Al-Qur'an, Hadis, fikih ibadah, serta akhlakul karimah${topik ? ` khususnya pada materi ${topik}` : ''}.`,
      'Membentuk pribadi moderat, toleran, peduli sesama, dan mencintai tanah air dalam bingkai ukhuwah.',
    ];
    karakteristik = `PAI dan Budi Pekerti pada ${fase} mencakup lima elemen keilmuan Islam yang terpadu: Al-Qur'an dan Hadis, Akidah, Akhlak, Fikih, serta Sejarah Peradaban Islam.`;
    capaianUmumFase = `Pada akhir Fase D, peserta didik mampu membaca, menghafal, dan memahami kandungan Al-Qur'an dan Hadis pilihan, mengokohkan keimanan, membiasakan akhlak terpuji, melaksanakan ibadah dan muamalah sesuai tuntunan syariat, serta meneladani sejarah peradaban Islam${topikSuffix}.`;
    elemenList = [
      {
        elemen: 'Al-Qur\'an dan Hadis',
        deskripsiCp: 'Peserta didik memahami definisi Al-Qur\'an dan Hadis Nabi serta posisinya sebagai sumber ajaran agama Islam, mampu membaca sesuai kaidah tajwid, menghafal, dan mengamalkan kandungan ayat pilihan dalam kehidupan sehari-hari.',
        kompetensiInti: 'Tilawah tartil, pemahaman tafsir ringkas, dan pengamalan dalil naqli',
        lingkupMateri: topik || 'Hukum tajwid, ayat-ayat tentang ilmu, toleransi, moderasi, dan kepedulian sosial',
      },
      {
        elemen: 'Akidah & Akhlak',
        deskripsiCp: 'Peserta didik mendalami enam rukun iman dan sifat-sifat Allah SWT, serta membiasakan akhlak terpuji (jujur, amanah, adil, toleran, hormat kepada orang tua dan guru) dan menjauhi perilaku tercela.',
        kompetensiInti: 'Penghayatan tauhid dan pembiasaan akhlakul karimah',
        lingkupMateri: 'Iman kepada Allah, malaikat, kitab, rasul, hari akhir, qada-qadar, serta adab pergaulan Islami',
      },
      {
        elemen: 'Fikih & Sejarah Peradaban Islam',
        deskripsiCp: 'Peserta didik memahami ketentuan bersuci, salat wajib dan sunah, puasa, zakat, makanan halal-haram, serta muamalah, dan mengambil ibrah dari sejarah dakwah Rasulullah SAW, Khulafaur Rasyidin, hingga peradaban Islam klasik dan Nusantara.',
        kompetensiInti: 'Praktik ibadah sahih, muamalah halal, dan keteladanan sejarah',
        lingkupMateri: 'Thaharah, ibadah mahdhah, muamalah syar\'i, dan sejarah peradaban Islam',
      },
    ];
  } else if (normMapel.includes('ips') || normMapel.includes('sosial')) {
    elemenList = [
      {
        elemen: 'Pemahaman Konsep IPS',
        deskripsiCp: `Peserta didik memahami kondisi geografis Nusantara dan potensi sumber daya alamnya, dinamika interaksi sosial, kegiatan ekonomi masyarakat, serta perjalanan sejarah bangsa Indonesia dan keterhubungannya dengan dunia global${topik ? `, termasuk pendalaman ${topik}` : ''}.`,
        kompetensiInti: 'Analisis ruang, waktu, interaksi sosial, dan literasi ekonomi',
        lingkupMateri: topik || 'Kondisi geografis, interaksi sosial, lembaga sosial, kegiatan ekonomi, dan sejarah nasional',
      },
      {
        elemen: 'Keterampilan Proses Sosial',
        deskripsiCp: 'Peserta didik mampu mengamati fenomena sosial-ekonomi di lingkungan sekitar, menanya, mengumpulkan informasi dari berbagai sumber, menganalisis dampak perubahan sosial, serta mengomunikasikan gagasan solusi masalah kemasyarakatan secara kolaboratif.',
        kompetensiInti: 'Investigasi sosial, pengolahan informasi, refleksi, dan aksi sosial',
        lingkupMateri: 'Studi kasus lingkungan sekitar, observasi lapangan, presentasi proyek sosial',
      },
    ];
  } else if (normMapel.includes('inggris')) {
    elemenList = [
      {
        elemen: 'Menyimak – Berbicara (Listening – Speaking)',
        deskripsiCp: `Peserta didik menggunakan bahasa Inggris untuk berinteraksi dan saling bertukar ide, pengalaman, minat, dan pendapat dengan guru, teman sebaya, dan orang lain dalam konteks familiar maupun formal sederhana${topik ? `, termasuk topik ${topik}` : ''}.`,
        kompetensiInti: 'Interaksi lisan, pemahaman ujaran kontekstual, dan komunikasi percaya diri',
        lingkupMateri: topik || 'Transactional & interpersonal conversations, describing people/places, recount, narrative',
      },
      {
        elemen: 'Membaca – Memirsa (Reading – Viewing)',
        deskripsiCp: 'Peserta didik membaca dan merespons berbagai teks familiar maupun tidak familiar (deskriptif, recount, naratif, prosedur, report) untuk menemukan ide utama, informasi rinci, serta makna tersirat dari teks cetak maupun digital.',
        kompetensiInti: 'Pemahaman bacaan, kosakata kontekstual, dan literasi multimodal',
        lingkupMateri: 'Descriptive, Recount, Narrative, Procedure, and Report texts',
      },
      {
        elemen: 'Menulis – Mempresentasikan (Writing – Presenting)',
        deskripsiCp: 'Peserta didik mengomunikasikan ide dan pengalaman mereka melalui paragraf sederhana dan terstruktur, menunjukkan perkembangan penggunaan kosakata spesifik dan tata bahasa yang tepat sesuai jenis teks.',
        kompetensiInti: 'Penulisan terstruktur, akurasi tata bahasa, dan presentasi kreatif',
        lingkupMateri: 'Paragraph organization, grammar in context, multimodal presentation',
      },
    ];
  } else if (normMapel.includes('pancasila') || normMapel.includes('pkn')) {
    elemenList = [
      {
        elemen: 'Pancasila',
        deskripsiCp: 'Peserta didik memahami sejarah kelahiran, kedudukan, fungsi Pancasila sebagai dasar negara, pandangan hidup bangsa, dan ideologi negara, serta mengamalkan nilai-nilai Pancasila dalam kehidupan bermasyarakat, berbangsa, dan bernegara.',
        kompetensiInti: 'Penghayatan ideologi dan pengamalan nilai luhur Pancasila',
        lingkupMateri: topik || 'Sejarah perumusan Pancasila, nilai sila 1–5, dan keteladanan kewargaan',
      },
      {
        elemen: 'UUD NRI Tahun 1945 & Norma',
        deskripsiCp: 'Peserta didik memahami periodisasi pemberlakuan dan perubahan UUD NRI Tahun 1945, hak dan kewajiban warga negara, serta ketaatan terhadap norma hukum dan musyawarah mufakat.',
        kompetensiInti: 'Kesadaran konstitusi, ketaatan norma, dan praktik demokrasi',
        lingkupMateri: 'Norma & keadilan, UUD 1945, hak & kewajiban warga negara, dan musyawarah',
      },
      {
        elemen: 'Bhinneka Tunggal Ika & NKRI',
        deskripsiCp: 'Peserta didik mengidentifikasi keberagaman suku, agama, ras, dan antargolongan dalam bingkai Bhinneka Tunggal Ika, serta menunjukkan komitmen menjaga keutuhan wilayah dan persatuan Negara Kesatuan Republik Indonesia.',
        kompetensiInti: 'Toleransi keberagaman, gotong royong, dan bela negara',
        lingkupMateri: 'Keberagaman budaya, harmoni sosial, wawasan Nusantara, dan keutuhan NKRI',
      },
    ];
  } else {
    elemenList = [
      {
        elemen: `Pemahaman Konsep Esensial ${mapel}`,
        deskripsiCp: `Peserta didik mampu memahami, mengidentifikasi, dan menjelaskan konsep-konsep esensial pada mata pelajaran ${mapel}${topik ? `, khususnya terkait materi ${topik}` : ''}, serta menghubungkannya dengan konteks kehidupan sehari-hari secara bermakna.`,
        kompetensiInti: 'Penguasaan konsep kunci, penalaran logis, dan pemaknaan kontekstual',
        lingkupMateri: topik || `Konsep dasar, prinsip utama, dan terminologi ${mapel}`,
      },
      {
        elemen: `Keterampilan Aplikasi & Pemecahan Masalah`,
        deskripsiCp: `Peserta didik mampu menerapkan pengetahuan dan keterampilan ${mapel}${topik ? ` pada materi ${topik}` : ''} untuk menganalisis studi kasus nyata, merancang solusi kreatif, dan menghasilkan karya kolaboratif yang bermanfaat.`,
        kompetensiInti: 'Analisis kasus, penerapan praktis, kolaborasi, dan kreasi produk',
        lingkupMateri: topik ? `Praktik terapan dan studi kasus ${topik}` : `Praktik terapan, proyek kolaboratif, dan simulasi ${mapel}`,
      },
      {
        elemen: 'Refleksi, Komunikasi & Sikap Ilmiah',
        deskripsiCp: 'Peserta didik mampu mengomunikasikan hasil belajar secara runtut dan santun, merefleksikan proses dan kebermanfaatan ilmu yang diperoleh, serta mengamalkan nilai-nilai akhlak mulia dalam keseharian.',
        kompetensiInti: 'Komunikasi efektif, evaluasi diri metakognitif, dan penguatan karakter',
        lingkupMateri: 'Presentasi karya, umpan balik sejawat, refleksi pembelajaran mendalam, dan integrasi nilai Islami',
      },
    ];
  }

  return {
    formatType: 'cp_resmi',
    identitas: {
      mataPelajaran: mapel,
      satuanPendidikan,
      fase,
      kelas,
      tahunAjaran,
      semester,
      namaPenyusun,
      topikFokus: topik || `Seluruh Elemen ${mapel}`,
      referensiRegulasi: 'Standar Capaian Pembelajaran (CP) BSKAP Kemendikdasmen — Pembelajaran Mendalam',
    },
    rasional,
    tujuanMataPelajaran,
    karakteristik,
    capaianUmumFase,
    elemenList,
    dimensiProfilLulusan: [
      DIMENSI_PROFIL_LULUSAN[0], // Keimanan & Ketakwaan
      DIMENSI_PROFIL_LULUSAN[2], // Penalaran Kritis
      DIMENSI_PROFIL_LULUSAN[3], // Kreativitas
      DIMENSI_PROFIL_LULUSAN[4], // Kolaborasi
      DIMENSI_PROFIL_LULUSAN[7], // Komunikasi
    ],
    integrasiNilaiIslami: {
      surahAyat: ayat.surahAyat,
      teksArab: ayat.teksArab,
      terjemahan: ayat.terjemahan,
      relevansiCp: ayat.kaitanMateri,
    },
  };
}

export function formatCpToPlainText(cp: CapaianPembelajaranData): string {
  const elemenSection = cp.elemenList
    .map(
      (el, idx) =>
        `${idx + 1}. Elemen: ${el.elemen}\n   Capaian Pembelajaran: ${el.deskripsiCp}\n   Kompetensi Inti: ${el.kompetensiInti}\n   Lingkup Materi: ${el.lingkupMateri}`
    )
    .join('\n\n');

  return `CAPAIAN PEMBELAJARAN (CP)
${cp.identitas.satuanPendidikan.toUpperCase()}
TAHUN AJARAN ${cp.identitas.tahunAjaran} (SEMESTER ${cp.identitas.semester.toUpperCase()})

IDENTITAS DOKUMEN
Mata Pelajaran   : ${cp.identitas.mataPelajaran}
Fase / Kelas     : ${cp.identitas.fase} / Kelas ${cp.identitas.kelas}
Fokus Materi     : ${cp.identitas.topikFokus}
Penyusun         : ${cp.identitas.namaPenyusun}
Acuan Kurikulum  : ${cp.identitas.referensiRegulasi}

A. RASIONAL MATA PELAJARAN
${cp.rasional}

B. TUJUAN MATA PELAJARAN
${cp.tujuanMataPelajaran.map((t, i) => `${i + 1}. ${t}`).join('\n')}

C. KARAKTERISTIK MATA PELAJARAN
${cp.karakteristik}

D. CAPAIAN PEMBELAJARAN UMUM (${cp.identitas.fase.toUpperCase()})
${cp.capaianUmumFase}

E. CAPAIAN PEMBELAJARAN PER ELEMEN
${elemenSection}

F. 8 DIMENSI PROFIL LULUSAN & INTEGRASI NILAI ISLAMI
Dimensi Profil Lulusan: ${cp.dimensiProfilLulusan.join(', ')}
Dalil / Ayat Relevan  : ${cp.integrasiNilaiIslami.surahAyat}
Teks Arab             : ${cp.integrasiNilaiIslami.teksArab}
Terjemahan            : "${cp.integrasiNilaiIslami.terjemahan}"
Relevansi terhadap CP : ${cp.integrasiNilaiIslami.relevansiCp}`;
}
