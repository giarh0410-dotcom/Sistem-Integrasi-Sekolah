import { suggestAyatForMateri } from './quranAyatPresets';
import { normalizeFaseFromKelas } from './capaianPembelajaranHelper';

export interface KktpRubrikRow {
  aspek: string;
  baruBerkembang: string;
  layak: string;
  cakap: string;
  mahir: string;
}

export interface KktpIntervalRow {
  rentang: string;
  predikat: string;
  ketuntasan: 'Belum Tuntas' | 'Tuntas';
  tindakLanjut: string;
}

export interface KktpDeskripsiRow {
  kriteria: string;
  targetMemadai: string;
}

export interface KktpData {
  formatType: 'kktp_resmi';
  identitas: {
    mataPelajaran: string;
    satuanPendidikan: string;
    fase: string;
    kelas: string;
    tahunAjaran: string;
    semester: string;
    namaPenyusun: string;
    topikMateri: string;
    pendekatanUtama: string;
    batasMinimalPersen: number;
    referensiRegulasi: string;
  };
  capaianPembelajaranRingkas: string;
  tujuanPembelajaran: string[];
  rubrikPenilaian: KktpRubrikRow[];
  intervalNilai: KktpIntervalRow[];
  deskripsiKriteria: KktpDeskripsiRow[];
  keputusanKetuntasan: string;
  strategiRemedial: string;
  strategiPengayaan: string;
  integrasiNilaiIslami: {
    surahAyat: string;
    teksArab: string;
    terjemahan: string;
    relevansiKktp: string;
  };
}

export function isStructuredKktpData(data: any): data is KktpData {
  return Boolean(
    data &&
      data.formatType === 'kktp_resmi' &&
      Array.isArray(data.rubrikPenilaian) &&
      Array.isArray(data.intervalNilai)
  );
}

export const DEFAULT_KKTP_INTERVALS: KktpIntervalRow[] = [
  {
    rentang: '0 – 40%',
    predikat: 'Baru Berkembang (Perlu Bimbingan)',
    ketuntasan: 'Belum Tuntas',
    tindakLanjut: 'Remedial di seluruh bagian: bimbingan intensif ulang konsep dasar dengan media visual konkret.',
  },
  {
    rentang: '41 – 65%',
    predikat: 'Layak (Cukup Memahami)',
    ketuntasan: 'Belum Tuntas',
    tindakLanjut: 'Remedial di bagian yang diperlukan: latihan terpandu (scaffolding) dan tutor sebaya pada indikator yang belum tuntas.',
  },
  {
    rentang: '66 – 85%',
    predikat: 'Cakap (Mencapai Tujuan)',
    ketuntasan: 'Tuntas',
    tindakLanjut: 'Tidak perlu remedial: penguatan pemahaman bermakna dan umpan balik apresiatif.',
  },
  {
    rentang: '86 – 100%',
    predikat: 'Mahir (Melampaui Target)',
    ketuntasan: 'Tuntas',
    tindakLanjut: 'Perlu pengayaan atau tantangan lebih: eksplorasi studi kasus HOTS, proyek lanjutan, atau menjadi mentor sebaya.',
  },
];

export function buildOfficialKktpData(params: {
  mataPelajaran?: string;
  kelas?: string;
  topik?: string;
  tahunAjaran?: string;
  semester?: string;
  namaPenyusun?: string;
  satuanPendidikan?: string;
  pendekatanUtama?: string;
  batasMinimalPersen?: number;
}): KktpData {
  const mapel = (params.mataPelajaran || 'Informatika').trim();
  const kelas = (params.kelas || 'VII').trim();
  const topik = (params.topik || '').trim();
  const tahunAjaran = params.tahunAjaran || '2026/2027';
  const semester = params.semester || 'Ganjil';
  const namaPenyusun = params.namaPenyusun || 'Guru Mata Pelajaran';
  const satuanPendidikan = params.satuanPendidikan || 'SMP Islam Modern Al Fakhir';
  const fase = normalizeFaseFromKelas(kelas);
  const batasMinimalPersen = params.batasMinimalPersen ?? 66;
  const pendekatanUtama =
    params.pendekatanUtama || 'Kombinasi Rubrik 4 Level, Interval Nilai, & Deskripsi Kriteria';

  const normMapel = mapel.toLowerCase();
  const topikLabel =
    topik ||
    (normMapel.includes('informatika')
      ? 'Berpikir Komputasional & Struktur Data'
      : normMapel.includes('matematika')
      ? 'Bilangan Rasional & Aljabar Linear'
      : normMapel.includes('ipa')
      ? 'Klasifikasi Makhluk Hidup & Sistem Organ'
      : normMapel.includes('indonesia')
      ? 'Teks Deskripsi & Laporan Hasil Observasi'
      : normMapel.includes('agama') || normMapel.includes('pai')
      ? 'Al-Qur\'an Hadis & Akhlakul Karimah'
      : normMapel.includes('inggris')
      ? 'Descriptive & Recount Text'
      : `Materi Esensial ${mapel}`);

  const ayat = suggestAyatForMateri(mapel, topikLabel);

  let capaianPembelajaranRingkas = `Pada akhir ${fase}, peserta didik mampu memahami konsep esensial ${mapel} khususnya pada topik ${topikLabel}, menganalisis permasalahan kontekstual secara sistematis, serta mengaplikasikan solusi kreatif secara kolaboratif dan beretika.`;

  let tujuanPembelajaran: string[] = [
    `TP 1: Menjelaskan konsep esensial dan prinsip dasar ${topikLabel} secara runtut dan bermakna.`,
    `TP 2: Menganalisis studi kasus nyata terkait ${topikLabel} dengan penalaran kritis berbasis bukti.`,
    `TP 3: Menerapkan atau menghasilkan karya/solusi kolaboratif pada materi ${topikLabel} secara tepat.`,
    `TP 4: Merefleksikan kebermanfaatan ${topikLabel} dan mengaitkannya dengan nilai akhlak mulia serta ${ayat.surahAyat}.`,
  ];

  let rubrikPenilaian: KktpRubrikRow[] = [
    {
      aspek: `Pemahaman Konsep (${topikLabel})`,
      baruBerkembang: `Belum mampu menyebutkan atau menjelaskan konsep dasar ${topikLabel} tanpa bantuan penuh guru.`,
      layak: `Mampu menyebutkan definisi dasar ${topikLabel} secara literal, namun belum menjelaskan keterkaitan antarkonsep.`,
      cakap: `Mampu menjelaskan konsep esensial ${topikLabel} secara lengkap, runtut, dan memberi contoh kontekstual yang tepat.`,
      mahir: `Mampu menguraikan konsep ${topikLabel} secara mendalam, mengaitkannya lintas disiplin, dan menjelaskan alasan logisnya secara mandiri.`,
    },
    {
      aspek: 'Penalaran Kritis & Analisis Kasus',
      baruBerkembang: 'Kesulitan mengidentifikasi inti permasalahan pada studi kasus yang diberikan.',
      layak: 'Mampu mengidentifikasi sebagian fakta masalah dengan bimbingan, namun analisis sebab-akibat belum utuh.',
      cakap: 'Mampu menganalisis inti permasalahan secara sistematis dan menyusun langkah penyelesaian yang logis.',
      mahir: 'Mampu mengevaluasi beragam alternatif solusi, mendeteksi kekeliruan logika, dan merumuskan solusi paling efisien.',
    },
    {
      aspek: 'Keterampilan Praktik / Unjuk Karya',
      baruBerkembang: 'Produk/praktik belum selesai atau langkah kerja belum sesuai prosedur dasar.',
      layak: 'Menyelesaikan praktik/karya sesuai contoh dasar dengan beberapa koreksi dari guru atau teman.',
      cakap: 'Menghasilkan karya/praktik yang rapi, akurat, sesuai prosedur, dan dipresentasikan dengan jelas.',
      mahir: 'Menghasilkan karya orisinal, inovatif, melampaui standar rubrik, serta aktif membimbing rekan sekelompok.',
    },
    {
      aspek: 'Refleksi, Kolaborasi & Nilai Islami',
      baruBerkembang: 'Pasif dalam diskusi kelompok dan belum mampu menuliskan refleksi belajar.',
      layak: 'Berpartisipasi saat diminta dan menuliskan refleksi singkat tentang materi yang dipelajari.',
      cakap: 'Aktif berkolaborasi secara santun, jujur, serta mampu merefleksikan makna belajar dan nilai Islami.',
      mahir: 'Menunjukkan kepemimpinan kolaboratif, empati tinggi, serta meneladankan adab Islami dan tadabbur ayat secara konsisten.',
    },
  ];

  if (normMapel.includes('informatika') || normMapel.includes('komputer') || normMapel.includes('tik')) {
    capaianPembelajaranRingkas = `Pada akhir ${fase}, peserta didik mampu menerapkan proses berpikir komputasional secara mandiri untuk menyelesaikan persoalan data diskrit (termasuk ${topikLabel}), memanfaatkan perkakas digital secara efisien, serta menerapkan etika dan keamanan digital.`;
    tujuanPembelajaran = [
      `TP 1: Memahami konsep dan representasi ${topikLabel} dalam konteks persoalan komputasi sehari-hari.`,
      `TP 2: Menerapkan dekomposisi, pengenalan pola, abstraksi, dan algoritma untuk memecahkan masalah terkait ${topikLabel}.`,
      `TP 3: Merancang dan menguji implementasi sederhana ${topikLabel} menggunakan lembar kerja/diagram alir/kode secara sistematis.`,
      `TP 4: Menunjukkan sikap amanah, kolaboratif, dan beretika digital selaras dengan nilai ${ayat.surahAyat}.`,
    ];
    rubrikPenilaian = [
      {
        aspek: `Pemahaman Konsep ${topikLabel}`,
        baruBerkembang: `Belum mampu membedakan komponen dasar ${topikLabel} dan masih memerlukan bimbingan penuh.`,
        layak: `Mampu mengenali istilah dasar ${topikLabel} dan memberi 1 contoh sederhana dengan bantuan panduan.`,
        cakap: `Mampu menjelaskan cara kerja ${topikLabel} secara akurat beserta kelebihan dan penerapannya dalam kehidupan sehari-hari.`,
        mahir: `Mampu membandingkan beberapa pendekatan ${topikLabel}, memilih representasi paling efisien, dan menjelaskannya secara sistematis.`,
      },
      {
        aspek: 'Berpikir Komputasional & Perancangan Algoritma',
        baruBerkembang: 'Langkah penyelesaian masalah belum runtut dan belum memanfaatkan pemecahan sub-masalah.',
        layak: 'Mampu memecah masalah sederhana menjadi beberapa langkah berurutan meski masih ada langkah kurang efisien.',
        cakap: 'Mampu menyusun dekomposisi dan algoritma/diagram alir yang runtut, logis, dan bebas kesalahan alur utama.',
        mahir: 'Mampu mengoptimalkan algoritma untuk berbagai skenario uji (edge cases) secara mandiri dan terstruktur.',
      },
      {
        aspek: 'Implementasi & Pengujian Solusi Digital',
        baruBerkembang: 'Implementasi pada lembar kerja/aplikasi belum berjalan sesuai instruksi tugas.',
        layak: 'Implementasi berjalan untuk kasus dasar setelah dilakukan perbaikan dengan bantuan guru/teman.',
        cakap: 'Implementasi berjalan akurat sesuai spesifikasi tugas dan berhasil melewati uji coba kasus standar.',
        mahir: 'Implementasi sangat rapi, terdokumentasi baik, kreatif, dan diuji pada skenario kompleks dengan hasil optimal.',
      },
      {
        aspek: 'Kolaborasi, Etika Digital & Integrasi Islami',
        baruBerkembang: 'Kurang berkontribusi dalam tim dan belum menunjukkan kesadaran etika penggunaan perangkat/informasi.',
        layak: 'Mengikuti aturan lab/kelas dan berkontribusi pada tugas kelompok saat diarahkan.',
        cakap: 'Berkolaborasi aktif, menjaga etika digital (tabayyun & jujur karya), serta merefleksikan manfaat teknologi.',
        mahir: 'Menjadi teladan kolaborasi, membantu rekan yang kesulitan, dan merancang karya digital bermanfaat bagi sesama.',
      },
    ];
  } else if (normMapel.includes('matematika')) {
    capaianPembelajaranRingkas = `Pada akhir ${fase}, peserta didik mampu menyelesaikan masalah kontekstual menggunakan konsep ${topikLabel}, melakukan penalaran dan pemodelan matematis secara akurat, serta mengomunikasikan solusi secara logis.`;
    tujuanPembelajaran = [
      `TP 1: Memahami konsep, sifat, dan operasi dasar pada materi ${topikLabel}.`,
      `TP 2: Menerjemahkan permasalahan kontekstual sehari-hari ke dalam model matematis ${topikLabel}.`,
      `TP 3: Menyelesaikan perhitungan dan pembuktian prosedural ${topikLabel} secara teliti dan akurat.`,
      `TP 4: Menafsirkan hasil solusi serta membiasakan sikap teliti, jujur, dan adil sesuai nilai ${ayat.surahAyat}.`,
    ];
  } else if (normMapel.includes('ipa') || normMapel.includes('alam')) {
    capaianPembelajaranRingkas = `Pada akhir ${fase}, peserta didik mampu memahami konsep sains terpadu pada materi ${topikLabel} serta melakukan penyelidikan ilmiah (mengamati, menanya, bereksperimen, menganalisis data, dan mengomunikasikan hasil).`;
    tujuanPembelajaran = [
      `TP 1: Menjelaskan konsep dan prinsip ilmiah yang mendasari fenomena ${topikLabel}.`,
      `TP 2: Merancang dan melaksanakan pengamatan/percobaan sederhana terkait ${topikLabel} sesuai prosedur keselamatan.`,
      `TP 3: Mengolah data hasil pengamatan ke dalam tabel/grafik dan menarik kesimpulan berbasis bukti ilmiah.`,
      `TP 4: Menumbuhkan rasa syukur atas keteraturan ciptaan Allah SWT melalui tadabbur ${ayat.surahAyat}.`,
    ];
  }

  const deskripsiKriteria: KktpDeskripsiRow[] = rubrikPenilaian.map((r) => ({
    kriteria: r.aspek,
    targetMemadai: r.cakap,
  }));

  const keputusanKetuntasan = `Peserta didik dinyatakan MENCAPAI KETERCAPAIAN TUJUAN PEMBELAJARAN (TUNTAS) apabila memperoleh minimal predikat "CAKAP" pada sekurang-kurangnya 3 dari ${rubrikPenilaian.length} aspek rubrik (atau kriteria "Memadai" pada ≥ 75% indikator), yang setara dengan capaian interval nilai ≥ ${batasMinimalPersen}%.`;

  const strategiRemedial = `Bagi peserta didik dengan capaian < ${batasMinimalPersen}% (Baru Berkembang / Layak): diberikan pembelajaran ulang konsep inti ${topikLabel} dalam kelompok kecil, latihan bertahap (scaffolding) berbasis contoh konkret, serta bimbingan tutor sebaya pada indikator spesifik yang belum tercapai.`;

  const strategiPengayaan = `Bagi peserta didik dengan capaian ≥ 86% (Mahir): diberikan tantangan studi kasus HOTS lanjutan pada materi ${topikLabel}, proyek eksplorasi lintas disiplin, atau peran sebagai mentor sebaya dalam diskusi kelompok.`;

  return {
    formatType: 'kktp_resmi',
    identitas: {
      mataPelajaran: mapel,
      satuanPendidikan,
      fase,
      kelas,
      tahunAjaran,
      semester,
      namaPenyusun,
      topikMateri: topikLabel,
      pendekatanUtama,
      batasMinimalPersen,
      referensiRegulasi: 'Panduan Pembelajaran dan Asesmen (PPA) BSKAP Kemendikdasmen — Pembelajaran Mendalam',
    },
    capaianPembelajaranRingkas,
    tujuanPembelajaran,
    rubrikPenilaian,
    intervalNilai: DEFAULT_KKTP_INTERVALS.map((row) => ({ ...row })),
    deskripsiKriteria,
    keputusanKetuntasan,
    strategiRemedial,
    strategiPengayaan,
    integrasiNilaiIslami: {
      surahAyat: ayat.surahAyat,
      teksArab: ayat.teksArab,
      terjemahan: ayat.terjemahan,
      relevansiKktp: ayat.kaitanMateri,
    },
  };
}

export function formatKktpToPlainText(kktp: KktpData): string {
  const rubrikText = kktp.rubrikPenilaian
    .map(
      (r, i) =>
        `${i + 1}. Aspek: ${r.aspek}\n   - Baru Berkembang (1): ${r.baruBerkembang}\n   - Layak (2)          : ${r.layak}\n   - Cakap (3)          : ${r.cakap}\n   - Mahir (4)          : ${r.mahir}`
    )
    .join('\n\n');

  const intervalText = kktp.intervalNilai
    .map(
      (iv, i) =>
        `${i + 1}. ${iv.rentang} | ${iv.predikat} (${iv.ketuntasan})\n   Tindak Lanjut: ${iv.tindakLanjut}`
    )
    .join('\n');

  const deskripsiText = kktp.deskripsiKriteria
    .map((d, i) => `${i + 1}. ${d.kriteria}: ${d.targetMemadai} [Memadai / Tidak Memadai]`)
    .join('\n');

  return `KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)
${kktp.identitas.satuanPendidikan.toUpperCase()}
TAHUN AJARAN ${kktp.identitas.tahunAjaran} (SEMESTER ${kktp.identitas.semester.toUpperCase()})

IDENTITAS DOKUMEN KKTP
Mata Pelajaran     : ${kktp.identitas.mataPelajaran}
Fase / Kelas       : ${kktp.identitas.fase} / Kelas ${kktp.identitas.kelas}
Topik / Materi     : ${kktp.identitas.topikMateri}
Pendekatan KKTP    : ${kktp.identitas.pendekatanUtama}
Batas Ketuntasan   : Minimal Cakap (Interval >= ${kktp.identitas.batasMinimalPersen}%)
Guru Penyusun      : ${kktp.identitas.namaPenyusun}
Acuan Regulasi     : ${kktp.identitas.referensiRegulasi}

A. CAPAIAN & TUJUAN PEMBELAJARAN YANG DIUKUR
Capaian Pembelajaran (CP):
${kktp.capaianPembelajaranRingkas}

Tujuan Pembelajaran (TP):
${kktp.tujuanPembelajaran.map((tp, i) => `${i + 1}. ${tp}`).join('\n')}

B. RUBRIK KETERCAPAIAN TUJUAN PEMBELAJARAN (4 LEVEL PENGUASAAN)
${rubrikText}

C. SKALA INTERVAL NILAI & TINDAK LANJUT INTERVENSI
${intervalText}

D. DESKRIPSI KRITERIA KETERCAPAIAN (CEKLIS MEMADAI / TIDAK MEMADAI)
${deskripsiText}

E. KEPUTUSAN KETUNTASAN & PROGRAM TINDAK LANJUT
Keputusan Ketuntasan:
${kktp.keputusanKetuntasan}

Program Remedial:
${kktp.strategiRemedial}

Program Pengayaan:
${kktp.strategiPengayaan}

F. INTEGRASI NILAI ISLAMI (${kktp.integrasiNilaiIslami.surahAyat})
Teks Arab : ${kktp.integrasiNilaiIslami.teksArab}
Terjemahan: "${kktp.integrasiNilaiIslami.terjemahan}"
Relevansi : ${kktp.integrasiNilaiIslami.relevansiKktp}`;
}
