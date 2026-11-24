import { AyatAlQuranIntegrasi } from '../types/school';

export const DIMENSI_PROFIL_LULUSAN: string[] = [
  'Keimanan dan Ketakwaan terhadap Tuhan YME',
  'Kewargaan',
  'Penalaran Kritis',
  'Kreativitas',
  'Kolaborasi',
  'Kemandirian',
  'Kesehatan',
  'Komunikasi',
];

export const PRINSIP_PEMBELAJARAN_MENDALAM: string[] = [
  'Berkesadaran (Mindful)',
  'Bermakna (Meaningful)',
  'Menggembirakan (Joyful)',
];

export interface AyatAlQuranPreset extends AyatAlQuranIntegrasi {
  id: string;
  kategori: string;
  keywords: string[];
}

export const QURAN_AYAT_PRESETS: AyatAlQuranPreset[] = [
  {
    id: 'hujurat-13-jaringan',
    kategori: 'Informatika • Jaringan & Konektivitas',
    keywords: ['jaringan', 'topologi', 'tologi', 'internet', 'lan', 'wan', 'komunikasi data', 'protokol', 'server', 'klien', 'router', 'networking', 'konektivitas'],
    surahAyat: 'QS. Al-Hujurat (49): 13',
    teksArab: 'يَا أَيُّهَا النَّاسُ إِنَّا خَلَقْنَاكُمْ مِنْ ذَكَرٍ وَأُنْثَىٰ وَجَعَلْنَاكُمْ شُعُوبًا وَقَبَائِلَ لِتَعَارَفُوا ۚ إِنَّ أَكْرَمَكُمْ عِنْدَ اللَّهِ أَتْقَاكُمْ ۚ إِنَّ اللَّهَ عَلِيمٌ خَبِيرٌ',
    terjemahan: 'Wahai manusia! Sungguh, Kami telah menciptakan kamu dari seorang laki-laki dan seorang perempuan, kemudian Kami jadikan kamu berbangsa-bangsa dan bersuku-suku agar kamu saling mengenal. Sungguh, yang paling mulia di antara kamu di sisi Allah ialah orang yang paling bertakwa. Sungguh, Allah Maha Mengetahui, Maha Teliti.',
    kaitanMateri: 'Sebagaimana Allah menciptakan manusia beragam agar saling terhubung dan mengenal (ta\'aruf), arsitektur dan topologi jaringan komputer dirancang agar berbagai perangkat yang berbeda dapat saling terhubung, bertukar informasi secara teratur, dan membangun kolaborasi yang membawa kemaslahatan bersama.',
  },
  {
    id: 'hujurat-6-informasi',
    kategori: 'Informatika • Literasi Digital & Keamanan Data',
    keywords: ['informatika', 'komputer', 'algoritma', 'data', 'coding', 'pemrograman', 'sistem', 'digital', 'keamanan', 'siber', 'hoaks', 'informasi', 'tik', 'komputasional', 'ai'],
    surahAyat: 'QS. Al-Hujurat (49): 6',
    teksArab: 'يَا أَيُّهَا الَّذِينَ آمَنُوا إِنْ جَاءَكُمْ فَاسِقٌ بِنَبَإٍ فَتَبَيَّنُوا أَنْ تُصِيبُوا قَوْمًا بِجَهَالَةٍ فَتُصْبِحُوا عَلَىٰ مَا فَعَلْتُمْ نَادِمِينَ',
    terjemahan: 'Wahai orang-orang yang beriman! Jika seseorang yang fasik datang kepadamu membawa suatu berita, maka telitilah kebenarannya (tabayyun), agar kamu tidak mencelakakan suatu kaum karena kebodohan (kecerobohan), yang akhirnya kamu menyesali perbuatanmu itu.',
    kaitanMateri: 'Prinsip tabayyun dalam ayat ini selaras dengan etika informatika, validasi data, integritas informasi, dan berpikir komputasional: setiap data maupun pesan digital yang diterima melalui sistem komputer harus diverifikasi kebenarannya secara kritis sebelum diproses atau disebarluaskan.',
  },
  {
    id: 'ar-rahman-33-iptek',
    kategori: 'Teknologi & Sains • Eksplorasi Ilmu',
    keywords: ['teknologi', 'robotik', 'astronomi', 'ruang angkasa', 'inovasi', 'rekayasa', 'fisika', 'energi', 'gelombang', 'listrik'],
    surahAyat: 'QS. Ar-Rahman (55): 33',
    teksArab: 'يَا مَعْشَرَ الْجِنِّ وَالْإِنْسِ إِنِ اسْتَطَعْتُمْ أَنْ تَنْفُذُوا مِنْ أَقْطَارِ السَّمَاوَاتِ وَالْأَرْضِ فَانْفُذُوا ۚ لَا تَنْفُذُونَ إِلَّا بِسُلْطَانٍ',
    terjemahan: 'Wahai golongan jin dan manusia! Jika kamu sanggup menembus (melintasi) penjuru langit dan bumi, maka tembuslah. Kamu tidak akan mampu menembusnya kecuali dengan kekuatan (ilmu pengetahuan dan teknologi).',
    kaitanMateri: 'Ayat ini memotivasi peserta didik bahwa penguasaan ilmu pengetahuan dan teknologi (sulthan) adalah kunci untuk memecahkan tantangan modern, merancang inovasi yang bermanfaat, dan memakmurkan bumi dengan tetap rendah hati kepada Allah SWT.',
  },
  {
    id: 'al-qamar-49-matematika',
    kategori: 'Matematika • Ukuran, Pola & Logika',
    keywords: ['matematika', 'aljabar', 'geometri', 'bilangan', 'persamaan', 'fungsi', 'statistika', 'peluang', 'trigonometri', 'pythagoras', 'pecahan', 'himpunan', 'koordinat', 'kalkulus'],
    surahAyat: 'QS. Al-Qamar (54): 49',
    teksArab: 'إِنَّا كُلَّ شَيْءٍ خَلَقْنَاهُ بِقَدَرٍ',
    terjemahan: 'Sungguh, Kami menciptakan segala sesuatu menurut ukuran (ketetapan yang terukur).',
    kaitanMateri: 'Alam semesta dibangun di atas keteraturan, proporsi, dan perhitungan yang sangat presisi. Mempelajari matematika melatih ketelitian, logika deduktif, dan apresiasi terhadap keteraturan hukum ciptaan Allah SWT.',
  },
  {
    id: 'al-muthaffifin-aritmetika',
    kategori: 'Matematika & IPS • Aritmetika Sosial & Ekonomi',
    keywords: ['aritmetika', 'ekonomi', 'jual beli', 'transaksi', 'uang', 'perdagangan', 'pasar', 'untung', 'rugi', 'diskon', 'timbangan', 'pajak', 'bisnis', 'koperasi'],
    surahAyat: 'QS. Al-Muthaffifin (83): 1–3',
    teksArab: 'وَيْلٌ لِلْمُطَفِّفِينَ ۝ الَّذِينَ إِذَا اكْتَالُوا عَلَى النَّاسِ يَسْتَوْفُونَ ۝ وَإِذَا كَالُوهُمْ أَوْ وَزَنُوهُمْ يُخْسِرُونَ',
    terjemahan: 'Celakalah bagi orang-orang yang curang (dalam menakar dan menimbang)! (Yaitu) orang-orang yang apabila menerima takaran dari orang lain mereka minta dicukupkan, dan apabila mereka menakar atau menimbang (untuk orang lain), mereka mengurangi.',
    kaitanMateri: 'Perhitungan ekonomi, harga, diskon, dan transaksi sosial tidak hanya menuntut akurasi matematis, tetapi juga integritas dan kejujuran agar setiap aktivitas muamalah membawa keberkahan dan keadilan sosial.',
  },
  {
    id: 'ali-imran-190-ipa',
    kategori: 'IPA • Sains, Biologi & Fenomena Alam',
    keywords: ['ipa', 'biologi', 'kimia', 'sel', 'ekosistem', 'tumbuhan', 'hewan', 'alam', 'lingkungan', 'bumi', 'tata surya', 'fotosintesis', 'mikroskop', 'zat', 'suhu', 'kalor', 'organ'],
    surahAyat: 'QS. Ali \'Imran (3): 190–191',
    teksArab: 'إِنَّ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ وَاخْتِلَافِ اللَّيْلِ وَالنَّهَارِ لَآيَاتٍ لِأُولِي الْأَلْبَابِ ۝ الَّذِينَ يَذْكُرُونَ اللَّهَ قِيَامًا وَقُعُودًا وَعَلَىٰ جُنُوبِهِمْ وَيَتَفَكَّرُونَ فِي خَلْقِ السَّمَاوَاتِ وَالْأَرْضِ رَبَّنَا مَا خَلَقْتَ هَٰذَا بَاطِلًا سُبْحَانَكَ فَقِنَا عَذَابَ النَّارِ',
    terjemahan: 'Sesungguhnya dalam penciptaan langit dan bumi, dan pergantian malam dan siang terdapat tanda-tanda (kebesaran Allah) bagi orang yang berakal, (yaitu) orang-orang yang mengingat Allah sambil berdiri, duduk, atau dalam keadaan berbaring, dan mereka memikirkan tentang penciptaan langit dan bumi (seraya berkata), "Ya Tuhan kami, tidaklah Engkau menciptakan semua ini sia-sia; Mahasuci Engkau, lindungilah kami dari azab neraka."',
    kaitanMateri: 'Proses penyelidikan ilmiah (observasi, eksperimen, dan analisis fenomena alam) merupakan wujud karakter ulul albab yang memadukan zikir dan pikir, sehingga peserta didik menyadari bahwa tidak ada satu pun fenomena alam yang diciptakan secara sia-sia.',
  },
  {
    id: 'al-alaq-bahasa',
    kategori: 'Bahasa • Literasi, Membaca & Menulis',
    keywords: ['bahasa', 'indonesia', 'inggris', 'arab', 'jepang', 'teks', 'deskripsi', 'narasi', 'eksposisi', 'puisi', 'cerpen', 'literasi', 'membaca', 'menulis', 'komunikasi', 'berbicara', 'pidato', 'report'],
    surahAyat: 'QS. Al-\'Alaq (96): 1–5',
    teksArab: 'اقْرَأْ بِاسْمِ رَبِّكَ الَّذِي خَلَقَ ۝ خَلَقَ الْإِنْسَانَ مِنْ عَلَقٍ ۝ اقْرَأْ وَرَبُّكَ الْأَكْرَمُ ۝ الَّذِي عَلَّمَ بِالْقَلَمِ ۝ عَلَّمَ الْإِنْسَانَ مَا لَمْ يَعْلَمْ',
    terjemahan: 'Bacalah dengan (menyebut) nama Tuhanmu yang menciptakan. Dia telah menciptakan manusia dari segumpal darah. Bacalah, dan Tuhanmulah Yang Mahamulia, yang mengajar (manusia) dengan pena. Dia mengajarkan manusia apa yang tidak diketahuinya.',
    kaitanMateri: 'Wahyu pertama ini menegaskan bahwa kemampuan literasi—membaca secara mendalam, memahami makna teks, dan mengekspresikan gagasan melalui tulisan—adalah fondasi utama peradaban dan sarana berbagi ilmu yang bermanfaat.',
  },
  {
    id: 'al-hasyr-18-ips',
    kategori: 'IPS • Sejarah, Geografi & Interaksi Sosial',
    keywords: ['ips', 'sejarah', 'sosial', 'interaksi', 'geografi', 'masyarakat', 'budaya', 'kerajaan', 'kemerdekaan', 'peradaban', 'globalisasi', 'wilayah', 'penduduk'],
    surahAyat: 'QS. Al-Hasyr (59): 18',
    teksArab: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ وَلْتَنْظُرْ نَفْسٌ مَا قَدَّمَتْ لِغَدٍ ۖ وَاتَّقُوا اللَّهَ ۚ إِنَّ اللَّهَ خَبِيرٌ بِمَا تَعْمَلُونَ',
    terjemahan: 'Wahai orang-orang yang beriman! Bertakwalah kepada Allah dan hendaklah setiap orang memperhatikan apa yang telah diperbuatnya untuk hari esok (akhirat), dan bertakwalah kepada Allah. Sungguh, Allah Mahateliti terhadap apa yang kamu kerjakan.',
    kaitanMateri: 'Mempelajari dinamika sosial, peristiwa sejarah, dan kondisi geografis mengajarkan peserta didik untuk mengambil hikmah dari masa lalu guna merancang tindakan sosial yang bijak dan bertanggung jawab bagi masa depan.',
  },
  {
    id: 'asy-syura-38-ppkn',
    kategori: 'Pendidikan Pancasila • Kewargaan & Musyawarah',
    keywords: ['pancasila', 'ppkn', 'pkn', 'kewargaan', 'demokrasi', 'musyawarah', 'hukum', 'konstitusi', 'uud', 'norma', 'hak', 'kewajiban', 'negara', 'persatuan'],
    surahAyat: 'QS. Asy-Syura (42): 38',
    teksArab: 'وَالَّذِينَ اسْتَجَابُوا لِرَبِّهِمْ وَأَقَامُوا الصَّلَاةَ وَأَمْرُهُمْ شُورَىٰ بَيْنَهُمْ وَمِمَّا رَزَقْنَاهُمْ يُنْفِقُونَ',
    terjemahan: 'Dan (bagi) orang-orang yang menerima (mematuhi) seruan Tuhan dan melaksanakan salat, sedang urusan mereka (diputuskan) dengan musyawarah antara mereka; dan mereka menginfakkan sebagian dari rezeki yang Kami berikan kepada mereka.',
    kaitanMateri: 'Nilai musyawarah (syura), kepatuhan pada norma, dan kepedulian sosial dalam ayat ini menjadi landasan kokoh bagi pengamalan nilai-nilai Pancasila, demokrasi yang beradab, dan kewargaan yang aktif.',
  },
  {
    id: 'al-qalam-4-pai',
    kategori: 'PAI & Budi Pekerti • Akhlak & Keteladanan',
    keywords: ['pai', 'agama', 'islam', 'akhlak', 'adab', 'fiqih', 'ibadah', 'aqidah', 'alquran', 'hadis', 'sirah', 'nabi', 'toleransi', 'iman', 'takwa', 'salat', 'puasa', 'zakat'],
    surahAyat: 'QS. Al-Qalam (68): 4',
    teksArab: 'وَإِنَّكَ لَعَلَىٰ خُلُقٍ عَظِيمٍ',
    terjemahan: 'Dan sesungguhnya engkau (Muhammad) benar-benar berbudi pekerti yang luhur.',
    kaitanMateri: 'Puncak dari setiap pembelajaran agama dan budi pekerti adalah terwujudnya akhlakul karimah dalam keseharian—meneladani kejujuran, kasih sayang, amanah, dan tanggung jawab Rasulullah SAW.',
  },
  {
    id: 'al-baqarah-168-pjok',
    kategori: 'PJOK • Kesehatan & Kebugaran Jasmani',
    keywords: ['pjok', 'olahraga', 'jasmani', 'kesehatan', 'kebugaran', 'senam', 'bola', 'atletik', 'renang', 'gizi', 'nutrisi', 'fisik'],
    surahAyat: 'QS. Al-Baqarah (2): 168',
    teksArab: 'يَا أَيُّهَا النَّاسُ كُلُوا مِمَّا فِي الْأَرْضِ حَلَالًا طَيِّبًا وَلَا تَتَّبِعُوا خُطُوَاتِ الشَّيْطَانِ ۚ إِنَّهُ لَكُمْ عَدُوٌّ مُبِينٌ',
    terjemahan: 'Wahai manusia! Makanlah dari (makanan) yang halal dan baik yang terdapat di bumi, dan janganlah kamu mengikuti langkah-langkah setan. Sungguh, setan itu musuh yang nyata bagimu.',
    kaitanMateri: 'Merawat kebugaran tubuh melalui aktivitas jasmani yang teratur dan pola hidup sehat (halalan thayyiban) merupakan wujud rasa syukur atas nikmat kesehatan agar kuat dalam beribadah dan berkarya.',
  },
  {
    id: 'al-mulk-3-seni',
    kategori: 'Seni Budaya & Prakarya • Estetika & Kreativitas',
    keywords: ['seni', 'budaya', 'prakarya', 'gambar', 'lukis', 'musik', 'tari', 'teater', 'desain', 'ragam hias', 'kerajinan', 'estetika', 'karya'],
    surahAyat: 'QS. Al-Mulk (67): 3',
    teksArab: 'الَّذِي خَلَقَ سَبْعَ سَمَاوَاتٍ طِبَاقًا ۖ مَا تَرَىٰ فِي خَلْقِ الرَّحْمَٰنِ مِنْ تَفَاوُتٍ ۖ فَارْجِعِ الْبَصَرَ هَلْ تَرَىٰ مِنْ فُطُورٍ',
    terjemahan: 'Yang menciptakan tujuh langit berlapis-lapis. Tidak akan kamu lihat sesuatu yang tidak seimbang pada ciptaan Tuhan Yang Maha Pengasih. Maka lihatlah sekali lagi, adakah kamu lihat sesuatu yang cacat?',
    kaitanMateri: 'Keselarasan, keseimbangan, dan kesempurnaan estetika ciptaan Allah SWT menginspirasi peserta didik untuk berkarya seni dan prakarya dengan penuh ketelitian, kreativitas, dan cita rasa keindahan yang luhur.',
  },
  {
    id: 'al-mujadilah-11-umum',
    kategori: 'Umum • Kemuliaan Ilmu & Pembelajaran Mendalam',
    keywords: ['ilmu', 'belajar', 'umum', 'pengetahuan', 'riset', 'proyek'],
    surahAyat: 'QS. Al-Mujadilah (58): 11',
    teksArab: 'يَرْفَعِ اللَّهُ الَّذِينَ آمَنُوا مِنْكُمْ وَالَّذِينَ أُوتُوا الْعِلْمَ دَرَجَاتٍ ۚ وَاللَّهُ بِمَا تَعْمَلُونَ خَبِيرٌ',
    terjemahan: 'Niscaya Allah akan mengangkat (derajat) orang-orang yang beriman di antaramu dan orang-orang yang diberi ilmu beberapa derajat. Dan Allah Mahateliti terhadap apa yang kamu kerjakan.',
    kaitanMateri: 'Kesungguhan dalam mempelajari materi secara mendalam dengan niat yang ikhlas akan mengangkat derajat peserta didik, memadukan kecerdasan intelektual dengan ketakwaan kepada Allah SWT.',
  },
  {
    id: 'taha-114-doa-ilmu',
    kategori: 'Umum • Doa & Semangat Menuntut Ilmu',
    keywords: ['doa', 'refleksi', 'motivasi'],
    surahAyat: 'QS. Taha (20): 114',
    teksArab: 'وَقُلْ رَبِّ زِدْنِي عِلْمًا',
    terjemahan: 'Dan katakanlah, "Ya Tuhanku, tambahkanlah ilmu kepadaku."',
    kaitanMateri: 'Menjadi pembelajar sepanjang hayat (lifelong learner) dimulai dari kerendahan hati untuk senantiasa memohon tambahan ilmu yang bermanfaat dan mengamalkannya dalam kehidupan nyata.',
  },
];

/**
 * Memilih Ayat Al-Qur'an yang paling relevan dengan Mata Pelajaran dan Topik/Materi yang diajarkan.
 */
export function suggestAyatForMateri(mapel?: string, materi?: string): AyatAlQuranIntegrasi {
  const combined = `${materi || ''} ${mapel || ''}`.toLowerCase();
  const topicText = (materi || '').trim();
  const subjectText = (mapel || '').trim();

  let bestMatch: AyatAlQuranPreset | null = null;
  let bestScore = 0;

  for (const preset of QURAN_AYAT_PRESETS) {
    let score = 0;
    for (const kw of preset.keywords) {
      if (topicText.toLowerCase().includes(kw)) {
        score += 3; // Prioritas lebih tinggi jika cocok dengan topik/materi spesifik
      } else if (combined.includes(kw)) {
        score += 1;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = preset;
    }
  }

  const chosen = bestMatch || QURAN_AYAT_PRESETS.find(p => p.id === 'al-mujadilah-11-umum') || QURAN_AYAT_PRESETS[0];

  const contextualKaitan = topicText
    ? `${chosen.kaitanMateri} Dalam pembelajaran materi "${topicText}"${subjectText ? ` (${subjectText})` : ''}, peserta didik diajak mentadabburi nilai ayat ini dan menerapkannya secara nyata dalam pemecahan masalah dan sikap sehari-hari.`
    : chosen.kaitanMateri;

  return {
    surahAyat: chosen.surahAyat,
    teksArab: chosen.teksArab,
    terjemahan: chosen.terjemahan,
    kaitanMateri: contextualKaitan,
  };
}
