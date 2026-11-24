import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  Sparkles, 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  Calendar, 
  X,
  Upload,
  FileSpreadsheet,
  FileCode,
  FolderDown,
  Award,
  Edit3,
  Save,
  Check,
  FileDown,
  GraduationCap,
  Trash2,
  FolderOpen,
  RefreshCw,
  RotateCcw,
  Copy,
  BookMarked,
  Layers,
  ClipboardCheck,
  Grid,
  GitBranch
} from 'lucide-react';
import { AdministrasiGuru, TipeAdministrasi, Role, Guru, MataPelajaranItem, RombelKelas, AdministrasiSubTab, Siswa, AbsensiSiswaKelas, SchoolSettings, ModulAjarContent } from '../types/school';
import { dbSaveCollection, dbDeleteItem, dbClearCollection } from '../lib/firebaseSync';
import { suggestAyatForMateri, PRINSIP_PEMBELAJARAN_MENDALAM } from '../lib/quranAyatPresets';
import {
  buildOfficialCpData,
  formatCpToPlainText,
  isStructuredCpData,
  CapaianPembelajaranData,
} from '../lib/capaianPembelajaranHelper';
import {
  buildOfficialKktpData,
  formatKktpToPlainText,
  isStructuredKktpData,
  KktpData,
} from '../lib/kktpHelper';
import {
  buildOfficialProtaData,
  calculateProtaSummary,
  formatProtaToPlainText,
  isStructuredProtaData,
  ProtaData,
} from '../lib/protaHelper';
import {
  buildOfficialProsemData,
  calculateProsemSummary,
  formatProsemToPlainText,
  getProsemMonths,
  getProsemWeekKey,
  isStructuredProsemData,
  PROSEM_WEEKS,
  ProsemData,
} from '../lib/prosemHelper';
import {
  buildOfficialAtpData,
  calculateAtpSummary,
  formatAtpToPlainText,
  isStructuredAtpData,
  AtpData,
} from '../lib/atpHelper';
import { JadwalMengajar } from './administrasi/JadwalMengajar';
import { KalenderPendidikan } from './administrasi/KalenderPendidikan';
import { JurnalGuru } from './administrasi/JurnalGuru';
import { RekapJurnal } from './administrasi/RekapJurnal';
import { ModulAjarEditor } from './administrasi/ModulAjarEditor';
import { KktpEditor } from './administrasi/KktpEditor';
import { ProtaEditor } from './administrasi/ProtaEditor';
import { ProsemEditor } from './administrasi/ProsemEditor';
import { AtpEditor } from './administrasi/AtpEditor';

interface AdministrasiGuruViewProps {
  administrasiList: AdministrasiGuru[];
  setAdministrasiList: React.Dispatch<React.SetStateAction<AdministrasiGuru[]>>;
  currentRole?: Role;
  userEmail?: string;
  guruList?: Guru[];
  mapelList?: MataPelajaranItem[];
  rombelList?: RombelKelas[];
  siswaList?: Siswa[];
  absensiKelasList?: AbsensiSiswaKelas[];
  setAbsensiKelasList?: React.Dispatch<React.SetStateAction<AbsensiSiswaKelas[]>>;
  subTab?: AdministrasiSubTab;
  setSubTab?: (subTab: AdministrasiSubTab) => void;
  userGoogleToken?: string;
  schoolSettings?: SchoolSettings;
  absensiHarian?: any[];
  stafList?: any[];
}

export function generateModulAjarTemplateText(
  mapel: string, 
  kelas: string, 
  topik: string,
  namaPenyusun: string = 'Aulia Safitri, S.Pd',
  namaKepalaSekolah: string = 'Deni Rahmat, S.Sos.I',
  nipKepalaSekolah: string = '19820412 200801 1 003',
  nipPenyusun: string = '19900524 201503 2 004'
) {
  const normalizedMapel = mapel ? mapel.toLowerCase() : '';
  let defaultTopik = topik;
  let kompetensiAwal = '';
  let tujuanPembelajaran = '';
  let pemahamanBermakna = '';
  let pertanyaanPemantik = '';
  let kegiatanInti = '';
  let integrasiNilai = '';

  if (normalizedMapel.includes('indonesia')) {
    defaultTopik = topik || 'Teks Deskripsi';
    kompetensiAwal = 'Peserta didik telah memahami konsep dasar paragraf dan mampu mengidentifikasi ide pokok dari sebuah bacaan sederhana. Murid juga telah terbiasa menulis kalimat sederhana secara mandiri.';
    tujuanPembelajaran = '1. Mengidentifikasi ciri-ciri dan struktur teks deskripsi secara tepat.\n2. Menganalisis perbedaan teks deskripsi dengan teks lainnya secara bernalar kritis.\n3. Menyusun teks deskripsi tertulis secara mandiri dengan adab berbahasa santun.';
    pemahamanBermakna = 'Keterampilan mendeskripsikan objek secara detail membantu kita mengomunikasikan keindahan ciptaan Allah dan menyampaikan informasi secara informatif kepada orang lain.';
    pertanyaanPemantik = '1. Pernahkah kamu menceritakan keindahan tempat liburanmu kepada temanmu hingga dia sangat ingin ke sana?\n2. Bagaimana cara terbaik menggambarkan suatu benda agar orang lain bisa langsung membayangkannya?';
    kegiatanInti = '1. Murid membaca contoh teks deskripsi keindahan lingkungan sekolah Al Fakhir.\n2. Murid berkelompok mengamati objek sekitar sekolah (taman, perpustakaan, atau masjid).\n3. Murid berdiskusi menyusun mind map/peta konsep deskripsi objek tersebut.\n4. Murid menyusun draf teks deskripsi bersama kelompok dengan ejaan yang disempurnakan.\n5. Presentasi hasil karya kelompok di depan kelas dan saling memberi umpan balik santun.';
    integrasiNilai = 'QS. Al-Hujurat (49): 13 (Saling mengenal dan menghargai keragaman serta keindahan ciptaan Allah SWT).';
  } else if (normalizedMapel.includes('matematika')) {
    defaultTopik = topik || 'Aritmetika Sosial';
    kompetensiAwal = 'Peserta didik telah memahami operasi hitung bilangan bulat, pecahan, serta konsep persen sederhana yang diperoleh dari jenjang SD.';
    tujuanPembelajaran = '1. Menentukan harga pembelian, harga penjualan, untung, atau rugi dari sebuah transaksi.\n2. Menghitung persentase untung, rugi, atau diskon secara akurat.\n3. Memecahkan masalah nyata aritmetika sosial dengan mengintegrasikan nilai kejujuran.';
    pemahamanBermakna = 'Memahami aritmetika sosial membekali kita untuk bertransaksi secara jujur, adil, serta mampu mengelola keuangan pribadi sesuai dengan syariat Islam.';
    pertanyaanPemantik = '1. Pernahkah kamu membantu orang tuamu berjualan atau membeli sesuatu dan menghitung kembaliannya?\n2. Mengapa seorang pedagang harus jujur dalam menimbang barang dagangannya?';
    kegiatanInti = '1. Murid menyimak simulasi jual-beli interaktif di kelas.\n2. Murid berkelompok menganalisis studi kasus transaksi pasar dan diskon barang.\n3. Murid berdiskusi menghitung harga beli, harga jual, untung, rugi, dan diskon wajar.\n4. Murid mengerjakan lembar kerja kolaboratif tentang persentase untung/rugi.\n5. Presentasi hasil diskusi kelompok dan evaluasi bersama guru.';
    integrasiNilai = 'QS. An-Nisa (4): 29 (Jual beli suka sama suka), QS. Al-Muthaffifin: 1-3 (Kejujuran timbangan).';
  } else if (normalizedMapel.includes('ipa') || normalizedMapel.includes('alam')) {
    defaultTopik = topik || 'Struktur Sel dan Mikroskop';
    kompetensiAwal = 'Peserta didik telah memahami konsep makhluk hidup dan benda mati, serta memiliki rasa ingin tahu tinggi terhadap fenomena alam di sekitar mereka.';
    tujuanPembelajaran = '1. Mengidentifikasi bagian-bagian mikroskop dan fungsinya secara tepat.\n2. Menjelaskan perbedaan sel hewan dan sel tumbuhan menggunakan diagram.\n3. Melakukan pengamatan preparat sel secara kolaboratif.';
    pemahamanBermakna = 'Mempelajari sel menyadarkan kita akan betapa rapi dan dahsyatnya ciptaan Allah bahkan pada tingkat mikroskopis yang paling kecil sekalipun.';
    pertanyaanPemantik = '1. Tubuh kita sangat besar, menurutmu terbuat dari apakah bagian terkecil tubuh kita?\n2. Mengapa kita memerlukan mikroskop untuk melihat kuman atau bakteri?';
    kegiatanInti = '1. Guru mendemonstrasikan bagian-bagian mikroskop dan cara fokusnya.\n2. Murid dibagi dalam kelompok praktikum untuk mengamati preparat bawang merah.\n3. Murid berdiskusi mengidentifikasi dinding sel dan inti sel.\n4. Murid menggambar hasil pengamatan mereka di lembar kerja siswa.\n5. Diskusi kelas mengenai perbedaan sel tumbuhan dan sel hewan serta fungsinya.';
    integrasiNilai = 'QS. Al-Furqan (25): 2 (Allah menciptakan segala sesuatu dengan ukuran yang rapi dan detail).';
  } else if (normalizedMapel.includes('ips') || normalizedMapel.includes('sosial')) {
    defaultTopik = topik || 'Interaksi Sosial';
    kompetensiAwal = 'Peserta didik telah memahami lingkungan sosial terdekat mereka (keluarga dan tetangga) serta bentuk-bentuk interaksi sederhana.';
    tujuanPembelajaran = '1. Menjelaskan pengertian interaksi sosial dan syarat-syarat terjadinya.\n2. Menganalisis bentuk-bentuk interaksi sosial (asosiatif & disosiatif) di masyarakat.\n3. Menyajikan laporan hasil observasi interaksi sosial di lingkungan sekolah.';
    pemahamanBermakna = 'Manusia adalah makhluk sosial yang selalu membutuhkan interaksi dengan orang lain; interaksi yang positif akan melahirkan keharmonisan dan kedamaian.';
    pertanyaanPemantik = '1. Apa yang terjadi jika kita hidup sendirian di hutan tanpa pernah bertemu manusia lain?\n2. Bagaimana cara kalian menyapa teman baru di kelas agar terjalin hubungan yang akrab?';
    kegiatanInti = '1. Murid mengamati gambar situasi interaksi sosial di kelas dan di pasar.\n2. Murid mendiskusikan syarat interaksi sosial (kontak sosial & komunikasi).\n3. Murid bermain peran (role play) situasi interaksi sosial asosiatif (gotong royong).\n4. Murid menganalisis kasus konflik sederhana sebagai bentuk disosiatif.\n5. Refleksi bersama mengenai cara berinteraksi yang santun dan menjunjung adab.';
    integrasiNilai = 'QS. Ali Imran (3): 103 (Pentingnya menjaga persatuan, silaturahmi, dan tali persaudaraan).';
  } else if (normalizedMapel.includes('inggris')) {
    defaultTopik = topik || 'Describing People';
    kompetensiAwal = 'Peserta didik telah menguasai kosakata dasar (basic adjectives and nouns) dan mampu memperkenalkan diri secara sederhana.';
    tujuanPembelajaran = '1. Identify common adjectives to describe people\'s physical appearance and character.\n2. Write simple descriptive paragraphs about a person with correct grammar.\n3. Present oral description about a family member clearly and confidently.';
    pemahamanBermakna = 'Describing others allows us to appreciate differences in physical appearances and personality, helping us to connect better globally and show respect.';
    pertanyaanPemantik = '1. Look at your friend. How would you describe his/her hair and eyes?\n2. Is physical appearance more important than personality? Why?';
    kegiatanInti = '1. Students learn physical appearance vocabulary (tall, short, curly, smart) using visual cards.\n2. In pairs, students describe each other\'s physical features in English.\n3. Students read a sample descriptive text about a famous inspiring figure.\n4. Students write a short paragraph describing their favorite teacher or parents.\n5. Peer-review session with partners and oral reading of the description.';
    integrasiNilai = 'HR. Bukhari (Berkata baik atau diam / Speak good words or keep silent).';
  } else if (normalizedMapel.includes('informatika') || normalizedMapel.includes('komputer')) {
    defaultTopik = topik || 'Berpikir Komputasional';
    kompetensiAwal = 'Peserta didik telah terbiasa menggunakan gawai untuk komunikasi dasar dan mampu mengoperasikan komputer sederhana.';
    tujuanPembelajaran = '1. Menjelaskan konsep berpikir komputasional dan empat pilar utamanya.\n2. Merancang langkah-langkah algoritma sederhana untuk menyelesaikan masalah harian.\n3. Menguji kebenaran alur algoritma secara sistematis.';
    pemahamanBermakna = 'Berpikir komputasional melatih otak kita untuk memecahkan masalah besar secara logis, terstruktur, dan efisien.';
    pertanyaanPemantik = '1. Bagaimana cara kalian merencanakan rute tercepat untuk pergi ke sekolah setiap pagi?\n2. Apakah komputer bisa menyelesaikan masalah tanpa instruksi manusia?';
    kegiatanInti = '1. Guru membagikan teka-teki logika sederhana kepada kelas.\n2. Murid berkelompok menganalisis teka-teki menggunakan prinsip dekomposisi.\n3. Murid merancang urutan langkah (algoritma) pemecahan teka-teki tersebut.\n4. Murid mempresentasikan alur pemikiran algoritma mereka.\n5. Guru memberikan penguatan konsep Berpikir Komputasional dan relevansinya.';
    integrasiNilai = 'Pentingnya memanfaatkan teknologi untuk kemaslahatan umat dan menghindari tabzir waktu (menyia-nyiakan waktu secara sia-sia).';
  } else if (normalizedMapel.includes('agama') || normalizedMapel.includes('pai')) {
    defaultTopik = topik || 'Adab Bergaul dan Toleransi';
    kompetensiAwal = 'Peserta didik telah memahami rukun Islam dan rukun Iman serta terbiasa melakukan ibadah wajib secara mandiri.';
    tujuanPembelajaran = '1. Menjelaskan pentingnya adab bergaul dan toleransi dalam Islam.\n2. Menganalisis dalil-dalil Al-Qur\'an terkait toleransi secara mendalam.\n3. Mensimulasikan sikap saling menghargai perbedaan di lingkungan sekolah.';
    pemahamanBermakna = 'Penerapan adab bergaul yang Islami menciptakan ukhuwah islamiyah dan lingkungan yang damai, harmonis, serta mendapat berkah Allah SWT.';
    pertanyaanPemantik = '1. Bagaimana perasaanmu ketika ada orang yang tidak mendengarkan pendapatmu?\n2. Mengapa Rasulullah SAW sangat dihormati bahkan oleh orang-orang yang berbeda keyakinan?';
    kegiatanInti = '1. Murid menyimak kisah keteladanan toleransi Rasulullah SAW di Madinah.\n2. Murid berkelompok mendiskusikan QS. Al-Hujurat ayat 10 dan adab bergaul.\n3. Murid berdiskusi merancang simulasi penyelesaian konflik pertemanan di sekolah.\n4. Kelompok mensimulasikan adab bergaul yang santun di depan kelas.\n5. Guru memberikan kesimpulan akhlakul karimah dan doa ukhuwah.';
    integrasiNilai = 'QS. Al-Kafirun ayat 1-6 (Toleransi beragama), QS. Al-Hujurat ayat 10 (Persaudaraan sesama muslim).';
  } else if (normalizedMapel.includes('pancasila') || normalizedMapel.includes('pkn')) {
    defaultTopik = topik || 'Penerapan Nilai-Nilai Pancasila';
    kompetensiAwal = 'Peserta didik telah mengenal dasar negara Pancasila dan terbiasa melaksanakan musyawarah sederhana di keluarga.';
    tujuanPembelajaran = '1. Menjelaskan nilai-nilai yang terkandung dalam setiap sila Pancasila.\n2. Menganalisis contoh penerapan nilai Pancasila dalam kehidupan sehari-hari.\n3. Berpartisipasi aktif dalam pengambilan keputusan kelas melalui musyawarah.';
    pemahamanBermakna = 'Pancasila bukan sekadar hafalan, melainkan panduan moral kita untuk bersikap adil, rukun, menghargai sesama, dan toleran dalam bermasyarakat.';
    pertanyaanPemantik = '1. Mengapa di kelas kita perlu membuat kesepakatan bersama?\n2. Bagaimana sikapmu jika keputusan rapat kelas berbeda dengan pendapat pribadimu?';
    kegiatanInti = '1. Murid mengamati video penerapan nilai Pancasila dalam keseharian.\n2. Murid berdiskusi kelompok mengidentifikasi adab musyawarah yang baik.\n3. Murid merumuskan contoh penerapan sila Pancasila dalam bentuk poster.\n4. Presentasi poster hasil karya kelompok di depan kelas.\n5. Penyusunan kesepakatan adab kelas bersama-sama.';
    integrasiNilai = 'Prinsip Syura (Musyawarah) dalam Islam sesuai tuntunan QS. Asy-Syura (42): 38.';
  } else if (normalizedMapel.includes('seni') || normalizedMapel.includes('budaya')) {
    defaultTopik = topik || 'Ragam Hias Geometris';
    kompetensiAwal = 'Peserta didik menyukai aktivitas seni visual dan mampu mengenali berbagai bentuk geometris sederhana.';
    tujuanPembelajaran = '1. Menjelaskan pengertian dan jenis-jenis ragam hias geometris.\n2. Merancang pola gambar ragam hias geometris pada kertas gambar secara presisi.\n3. Mewarnai karya ragam hias dengan kombinasi warna yang estetis.';
    pemahamanBermakna = 'Seni menggambar mengekspresikan rasa syukur kita atas keindahan alam ciptaan Allah serta melatih kepekaan estetika diri.';
    pertanyaanPemantik = '1. Pernahkah kamu melihat motif batik di bajumu? Bentuk geometri apa saja yang ada di sana?\n2. Bagaimana warna bisa mengubah perasaan seseorang yang melihat sebuah lukisan?';
    kegiatanInti = '1. Guru menampilkan berbagai contoh pola ragam hias geometris nusantara.\n2. Murid menggambar sketsa pola geometris dasar menggunakan penggaris dan jangka.\n3. Murid berdiskusi menentukan skema kombinasi warna kontras dan harmonis.\n4. Murid mewarnai sketsa secara teliti, rapi, dan sabar.\n5. Gallery Walk: memajang karya di dinding kelas dan saling memberi penilaian positif.';
    integrasiNilai = 'Keindahan adalah bagian dari ciptaan Allah SWT (HR. Muslim: "Sesungguhnya Allah itu indah dan menyukai keindahan").';
  } else if (normalizedMapel.includes('jasmani') || normalizedMapel.includes('pjok') || normalizedMapel.includes('olahraga')) {
    defaultTopik = topik || 'Kebugaran Jasmani';
    kompetensiAwal = 'Peserta didik memiliki energi fisik yang baik dan menyukai aktivitas olahraga, serta memahami cara menjaga kesehatan secara umum.';
    tujuanPembelajaran = '1. Menjelaskan konsep dan komponen kebugaran jasmani terkait kesehatan jantung.\n2. Melakukan rangkaian latihan fisik untuk melatih kekuatan dan daya tahan tubuh.\n3. Menunjukkan sikap sportivitas, disiplin, dan gotong royong selama aktivitas fisik.';
    pemahamanBermakna = 'Menjaga kebugaran jasmani adalah bentuk rasa syukur atas amanah fisik yang diberikan Allah agar kita senantiasa kuat beribadah dan berkarya.';
    pertanyaanPemantik = '1. Mengapa tubuh kita terasa segar setelah berolahraga secara teratur?\n2. Apa perbedaan antara lelah biasa dengan sesak napas saat beraktivitas fisik?';
    kegiatanInti = '1. Murid melakukan pemanasan dinamis yang dipimpin oleh ketua kelas.\n2. Guru mencontohkan teknik pengukuran denyut nadi sebelum latihan fisik.\n3. Murid melakukan latihan sirkuit (circuit training: push up, sit up, shuttle run).\n4. Murid berpasangan mengukur kembali denyut nadi pasca-latihan sirkuit.\n5. Pendinginan dan evaluasi teknik menjaga daya tahan jantung serta paru.';
    integrasiNilai = 'HR. Muslim: "Mukmin yang kuat lebih dicintai Allah SWT daripada mukmin yang lemah".';
  } else {
    defaultTopik = topik || 'Konsep Dasar & Pembelajaran';
    kompetensiAwal = 'Peserta didik memiliki pengetahuan dasar tentang materi pokok yang akan dibahas dan siap mengembangkan kompetensi barunya.';
    tujuanPembelajaran = '1. Memahami konsep utama dari materi pokok secara mendalam.\n2. Mengaplikasikan kompetensi dasar untuk menyelesaikan masalah sederhana.\n3. Merancang produk kreatif atau hasil karya terkait materi pembelajaran.';
    pemahamanBermakna = 'Penguasaan konsep ini memampukan kita menghadapi tantangan nyata sehari-hari dengan bijak dan bersikap solutif.';
    pertanyaanPemantik = '1. Pernahkah Anda menjumpai masalah yang berhubungan dengan materi ini dalam kehidupan sehari-hari?\n2. Mengapa penting bagi kita untuk mempelajari konsep ini sekarang?';
    kegiatanInti = '1. Murid mengamati materi pemicu yang disajikan oleh guru.\n2. Murid berkelompok mendiskusikan solusi pemecahan masalah nyata.\n3. Murid merancang draf laporan atau karya kolaboratif terkait materi.\n4. Presentasi hasil karya kelompok di hadapan kelas untuk didiskusikan.\n5. Penilaian sejawat dan umpan balik konstruktif dari guru.';
    integrasiNilai = 'Menggunakan ilmu pengetahuan untuk memberikan manfaat nyata bagi sesama (Rahmatan lil \'Alamin).';
  }

  return `MODUL AJAR (RPP PLUS)
SMP ISLAM MODERN AL FAKHIR
TAHUN AJARAN 2026 / 2027

A. INFORMASI UMUM
Nama Penyusun      : ${namaPenyusun}
Nama Sekolah       : SMP Islam Modern Al Fakhir
Mata Pelajaran     : ${mapel}
Fase/Kelas         : D / ${kelas || 'VII'}
Semester           : I (Ganjil)
Tahun Ajaran       : 2026/2027
Alokasi Waktu      : 2 x 40 Menit (2 Pertemuan)
Materi Pokok       : ${defaultTopik}

B. KOMPETENSI AWAL
${kompetensiAwal}

C. PROFIL PELAJAR PANCASILA (YANG DITUJU)
1. Beriman, Bertakwa kepada Tuhan YME, dan Berakhlak Mulia (menerapkan kejujuran dan adab Islami selama pembelajaran)
2. Bernalar Kritis (menganalisis masalah dan merancang solusi secara logis)
3. Mandiri (bertanggung jawab atas proses dan hasil belajarnya)
4. Gotong Royong (berkolaborasi aktif dalam kelompok diskusi)

D. SARANA DAN PRASARANA
1. Sarana: Laptop, LCD Proyektor, Jaringan Internet, Buku Paket Pendukung, Media Gambar Kontekstual.
2. Prasarana: Ruang Kelas, Lingkungan Sekolah, Perpustakaan, atau Laboratorium Terkait.

E. TARGET PESERSA DIDIK
Reguler (Siswa umum tanpa kesulitan belajar khusus / 28 Siswa)

F. MODEL PEMBELAJARAN
Problem Based Learning (PBL) secara tatap muka (luring)

G. TUJUAN PEMBELAJARAN
${tujuanPembelajaran}

H. PEMAHAMAN BERMAKNA
${pemahamanBermakna}

I. PERTANYAAN PEMANTIK
${pertanyaanPemantik}

J. KEGIATAN PEMBELAJARAN
1. Pendahuluan (10 Menit):
Salam, berdoa bersama dipimpin murid secara bergantian, presensi kelas, apersepsi mengaitkan materi dengan kehidupan nyata atau kisah adab Islami, penyampaian tujuan pembelajaran, serta melontarkan pertanyaan pemantik.

2. Kegiatan Inti (60 Menit):
${kegiatanInti}

3. Penutup (10 Menit):
Refleksi bersama "Apa yang paling berkesan hari ini?", merumuskan kesimpulan materi secara kolaboratif, pengumuman tindak lanjut (tugas mandiri/bacaan), doa penutup majelis, dan salam.

K. ASESMEN
1. Asesmen Diagnostik (Non-Kognitif): Kuesioner minat belajar siswa dan kesiapan awal.
2. Asesmen Formatif: Observasi keaktifan diskusi, kualitas kerjasama tim, dan ketepatan pengisian LKPD kelompok.
3. Asesmen Sumatif: Penilaian produk/laporan hasil karya mandiri berlandaskan rubrik penilaian baku.
Teknik Asesmen: Observasi dan Tes Tertulis/Performa
Instrumen Asesmen: Lembar Pengamatan & Soal Esai Evaluatif

L. DIFERENSIASI PEMBELAJARAN
1. Diferensiasi Konten: Menyediakan bahan bacaan pendukung dengan tingkat kerumitan bervariasi (termasuk media visual/kartu gambar untuk siswa pendampingan khusus).
2. Diferensiasi Proses: Menyediakan bimbingan terfokus (scaffolding) untuk kelompok murid yang membutuhkan bantuan lebih, serta tutor sebaya untuk kelompok cakap.
3. Diferensiasi Produk: Membebaskan siswa memilih format penyajian hasil karya (tulisan, infografis/poster, atau presentasi lisan).

M. REMEDIAL
Pembelajaran ulang konsep inti secara interaktif, pendampingan khusus guru, penyederhanaan latihan soal cerita, dan bantuan tutor sebaya.

N. PENGAYAAN
Pemberian studi kasus kontekstual berskala lebih luas, tugas analisis kritis mandiri, atau penugasan memimpin diskusi kelompok sebaya.

O. REFLEKSI GURU
1. Apakah 100% siswa mencapai target tujuan pembelajaran?
2. Apa kendala utama yang dijumpai selama pembelajaran hari ini?
3. Langkah inovatif apa yang dapat diterapkan pada pertemuan selanjutnya untuk hasil yang lebih baik?

P. REFLEKSI PESERTA DIDIK
1. Bagian pembelajaran mana yang paling membuatmu tertarik hari ini? Mengapa?
2. Apakah ada konsep atau penjelasan yang masih membingungkanmu?
3. Sikap baik/adab apa yang berhasil kamu latih dan terapkan hari ini selama berkolaborasi?

Q. LAMPIRAN
1. Lembar Kerja Peserta Didik (LKPD) mandiri & kelompok.
2. Rubrik Penilaian Portofolio/Performa Hasil Karya.
3. Bahan Bacaan Guru & Peserta Didik terkait materi pokok.
4. Integrasi Nilai Islami: ${integrasiNilai}
5. Daftar Pustaka Pendukung Kurikulum Merdeka.

Sawangan, ...................... 2027
Mengetahui,

Kepala Sekolah                               Guru Mata Pelajaran


${namaKepalaSekolah.padEnd(45, ' ')}${namaPenyusun}
NIP: ${nipKepalaSekolah.padEnd(40, ' ')}NIP: ${nipPenyusun}`;
}

export const AdministrasiGuruView: React.FC<AdministrasiGuruViewProps> = ({
  administrasiList,
  setAdministrasiList,
  currentRole = 'admin',
  userEmail = '',
  guruList = [],
  mapelList = [],
  rombelList = [],
  siswaList = [],
  absensiKelasList = [],
  setAbsensiKelasList = () => {},
  subTab,
  setSubTab,
  userGoogleToken,
  schoolSettings,
  absensiHarian = [],
  stafList = []
}) => {
  const [filterTipe, setFilterTipe] = useState<string>('Semua');
  const [search, setSearch] = useState('');
  const [localSubTab, setLocalSubTab] = useState<AdministrasiSubTab>('perangkat' as any);
  
  const activeSubTab = subTab || localSubTab;
  const setActiveSubTab = (t: AdministrasiSubTab) => {
    if (setSubTab) setSubTab(t);
    setLocalSubTab(t);
  };

  const availableMapelList = React.useMemo(() => {
    const set = new Set<string>();
    mapelList.forEach(m => {
      const name = m.namaMapel || (m as any).nama;
      if (name && typeof name === 'string' && name.trim()) set.add(name.trim());
    });
    return Array.from(set).sort();
  }, [mapelList]);

  // Find active teacher based on email or default
  const activeTeacher = guruList.find(g => g.email.toLowerCase() === userEmail.toLowerCase());
  const fallbackMapel = availableMapelList.length > 0 ? availableMapelList[0] : 'Umum';
  const initialMapel = activeTeacher?.mataPelajaran || (userEmail.includes('guru.ahmad') ? fallbackMapel : currentRole === 'guru' ? fallbackMapel : 'Semua');

  const [selectedMapelFilter, setSelectedMapelFilter] = useState<string>(initialMapel);

  // Find headmaster/principal from guruList
  const principal = guruList?.find(g => 
    g.jabatan.toLowerCase().includes('kepala sekolah') || 
    g.jabatan.toLowerCase() === 'kepala sekolah'
  );
  const principalName = principal ? principal.nama : 'Deni Rahmat, S.Sos.I';
  const principalNip = principal ? (principal.nip || '19820412 200801 1 003') : '19820412 200801 1 003';

  // Find teacher for the currently selected template subject
  const getTemplateTeacherInfo = (mapelName: string) => {
    const teacher = guruList?.find(g => 
      g.mataPelajaran.toLowerCase().includes(mapelName.toLowerCase()) || 
      mapelName.toLowerCase().includes(g.mataPelajaran.toLowerCase())
    ) || activeTeacher || guruList?.[0];

    return {
      nama: teacher ? teacher.nama : '',
      nip: teacher ? (teacher.nip || '') : ''
    };
  };

  useEffect(() => {
    if (currentRole === 'guru' && selectedMapelFilter === 'Semua') {
      setSelectedMapelFilter(initialMapel);
    }
  }, [currentRole, userEmail]);

  // AI Generator & Structured Editors Modal
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isModulEditorOpen, setIsModulEditorOpen] = useState(false);
  const [editingModulDoc, setEditingModulDoc] = useState<AdministrasiGuru | null>(null);
  const [isKktpEditorOpen, setIsKktpEditorOpen] = useState(false);
  const [editingKktpDoc, setEditingKktpDoc] = useState<AdministrasiGuru | null>(null);
  const [isProtaEditorOpen, setIsProtaEditorOpen] = useState(false);
  const [editingProtaDoc, setEditingProtaDoc] = useState<AdministrasiGuru | null>(null);
  const [isProsemEditorOpen, setIsProsemEditorOpen] = useState(false);
  const [editingProsemDoc, setEditingProsemDoc] = useState<AdministrasiGuru | null>(null);
  const [isAtpEditorOpen, setIsAtpEditorOpen] = useState(false);
  const [editingAtpDoc, setEditingAtpDoc] = useState<AdministrasiGuru | null>(null);
  const [aiTipe, setAiTipe] = useState<TipeAdministrasi>('modul_ajar');
  const [aiMapel, setAiMapel] = useState(selectedMapelFilter !== 'Semua' ? selectedMapelFilter : fallbackMapel);
  const [aiKelas, setAiKelas] = useState('VII');
  const [aiSemester, setAiSemester] = useState<'Ganjil' | 'Genap'>('Ganjil');
  const [aiTopik, setAiTopik] = useState('');
  const [loadingAi, setLoadingAi] = useState(false);

  const resolveModulAyat = (q?: Partial<ModulAjarContent> | Record<string, any> | null, fallbackMapelName?: string, fallbackMateriName?: string) => {
    if (q?.ayatAlQuran && q.ayatAlQuran.surahAyat && q.ayatAlQuran.teksArab) {
      return q.ayatAlQuran;
    }
    return suggestAyatForMateri(
      q?.informasiUmum?.mataPelajaran || fallbackMapelName || '',
      q?.informasiUmum?.materi || fallbackMateriName || ''
    );
  };

  const isLegacyBrokenCpText = (text?: string) => {
    if (!text) return true;
    return (
      text.includes('MODE FALLBACK PINTAR') ||
      text.includes('# DOKUMEN ADMINISTRASI') ||
      text.includes('### A. IDENTITAS MODUL') ||
      text.includes('**Mata Pelajaran:**')
    );
  };

  const extractCpTopic = (doc: AdministrasiGuru) => {
    const rawTitle = doc.judul || '';
    if (rawTitle.includes(' - ')) {
      return rawTitle.split(' - ').slice(1).join(' - ').trim();
    }
    const cleaned = rawTitle.replace(/^CP\s*:?\s*/i, '').trim();
    if (cleaned.toLowerCase() === (doc.mataPelajaran || '').toLowerCase()) return '';
    return cleaned;
  };

  const resolveCpData = (doc: AdministrasiGuru): CapaianPembelajaranData => {
    if (isStructuredCpData(doc.kontenJson)) {
      return doc.kontenJson;
    }
    return buildOfficialCpData({
      mataPelajaran: doc.mataPelajaran,
      kelas: doc.kelas,
      topik: extractCpTopic(doc),
      tahunAjaran: doc.tahunAjaran,
      semester: doc.semester,
      namaPenyusun: doc.guruNama,
      satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
    });
  };

  const shouldRenderStructuredCp = (doc: AdministrasiGuru) => {
    if (doc.tipe !== 'cp') return false;
    return isStructuredCpData(doc.kontenJson) || isLegacyBrokenCpText(doc.content || doc.deskripsi);
  };

  const isLegacyBrokenAtpText = (text?: string) => {
    if (!text) return true;
    return (
      isLegacyBrokenCpText(text) ||
      text.includes('A. LANDASAN & CAPAIAN KOMPETENSI') ||
      text.includes('B. ALUR DAN TUJUAN PEMBELAJARAN (ATP) SEMESTER I') ||
      text.includes('Draf administrasi pembelajaran ATP')
    );
  };

  const extractAtpFocus = (doc: AdministrasiGuru) => {
    const rawTitle = doc.judul || '';
    if (rawTitle.includes(' - ')) {
      const part = rawTitle.split(' - ').slice(1).join(' - ').trim();
      if (/^kelas\s+(vii|viii|ix|7|8|9)/i.test(part)) return '';
      return part.replace(/\s*\(kelas\s+(vii|viii|ix|7|8|9)[^)]*\)\s*$/i, '').trim();
    }
    const cleaned = rawTitle.replace(/^ATP\s*:?\s*/i, '').trim();
    if (cleaned.toLowerCase() === (doc.mataPelajaran || '').toLowerCase()) return '';
    return cleaned;
  };

  const resolveAtpData = (doc: AdministrasiGuru): AtpData => {
    if (isStructuredAtpData(doc.kontenJson)) {
      return doc.kontenJson;
    }
    return buildOfficialAtpData({
      mataPelajaran: doc.mataPelajaran,
      kelas: doc.kelas,
      topik: extractAtpFocus(doc),
      tahunAjaran: doc.tahunAjaran,
      namaPenyusun: doc.guruNama,
      satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
    });
  };

  const shouldRenderStructuredAtp = (doc: AdministrasiGuru) => {
    if (doc.tipe !== 'atp') return false;
    return isStructuredAtpData(doc.kontenJson) || isLegacyBrokenAtpText(doc.content || doc.deskripsi);
  };

  const extractKktpTopic = (doc: AdministrasiGuru) => {
    const rawTitle = doc.judul || '';
    if (rawTitle.includes(' - ')) {
      return rawTitle.split(' - ').slice(1).join(' - ').trim();
    }
    const cleaned = rawTitle.replace(/^KKTP\s*:?\s*/i, '').trim();
    if (cleaned.toLowerCase() === (doc.mataPelajaran || '').toLowerCase()) return '';
    return cleaned;
  };

  const resolveKktpData = (doc: AdministrasiGuru): KktpData => {
    if (isStructuredKktpData(doc.kontenJson)) {
      return doc.kontenJson;
    }
    return buildOfficialKktpData({
      mataPelajaran: doc.mataPelajaran,
      kelas: doc.kelas,
      topik: extractKktpTopic(doc),
      tahunAjaran: doc.tahunAjaran,
      semester: doc.semester,
      namaPenyusun: doc.guruNama,
      satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
    });
  };

  const shouldRenderStructuredKktp = (doc: AdministrasiGuru) => {
    if (doc.tipe !== 'kktp') return false;
    return isStructuredKktpData(doc.kontenJson) || isLegacyBrokenCpText(doc.content || doc.deskripsi);
  };

  const extractProtaFocus = (doc: AdministrasiGuru) => {
    const rawTitle = doc.judul || '';
    if (rawTitle.includes(' - ')) {
      return rawTitle.split(' - ').slice(1).join(' - ').trim();
    }
    const cleaned = rawTitle.replace(/^PROTA\s*:?\s*/i, '').trim();
    if (cleaned.toLowerCase() === (doc.mataPelajaran || '').toLowerCase()) return '';
    return cleaned;
  };

  const resolveProtaData = (doc: AdministrasiGuru): ProtaData => {
    if (isStructuredProtaData(doc.kontenJson)) {
      return doc.kontenJson;
    }
    return buildOfficialProtaData({
      mataPelajaran: doc.mataPelajaran,
      kelas: doc.kelas,
      topik: extractProtaFocus(doc),
      tahunAjaran: doc.tahunAjaran,
      namaPenyusun: doc.guruNama,
      satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
    });
  };

  const shouldRenderStructuredProta = (doc: AdministrasiGuru) => {
    if (doc.tipe !== 'prota') return false;
    return isStructuredProtaData(doc.kontenJson) || isLegacyBrokenCpText(doc.content || doc.deskripsi);
  };

  const extractProsemFocus = (doc: AdministrasiGuru) => {
    const rawTitle = doc.judul || '';
    if (rawTitle.includes(' - ')) {
      return rawTitle.split(' - ').slice(1).join(' - ').trim();
    }
    const cleaned = rawTitle.replace(/^PROSEM\s*:?\s*/i, '').trim();
    if (cleaned.toLowerCase() === (doc.mataPelajaran || '').toLowerCase()) return '';
    return cleaned;
  };

  const resolveProsemData = (doc: AdministrasiGuru): ProsemData => {
    if (isStructuredProsemData(doc.kontenJson)) {
      return doc.kontenJson;
    }
    return buildOfficialProsemData({
      mataPelajaran: doc.mataPelajaran,
      kelas: doc.kelas,
      semester: doc.semester === 'Genap' ? 'Genap' : 'Ganjil',
      topik: extractProsemFocus(doc),
      tahunAjaran: doc.tahunAjaran,
      namaPenyusun: doc.guruNama,
      satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
    });
  };

  const shouldRenderStructuredProsem = (doc: AdministrasiGuru) => {
    if (doc.tipe !== 'prosem') return false;
    return isStructuredProsemData(doc.kontenJson) || isLegacyBrokenCpText(doc.content || doc.deskripsi);
  };

  useEffect(() => {
    if (selectedMapelFilter !== 'Semua') {
      setAiMapel(selectedMapelFilter);
    }
  }, [selectedMapelFilter]);

  // Workspace States
  const [workspaceMapel, setWorkspaceMapel] = useState<string>(selectedMapelFilter !== 'Semua' ? selectedMapelFilter : (availableMapelList[0] || 'Bahasa Indonesia'));
  const [workspaceTipe, setWorkspaceTipe] = useState<TipeAdministrasi>(
    ['modul_ajar', 'cp', 'atp', 'kktp', 'prota', 'prosem'].includes(activeSubTab as any) 
      ? (activeSubTab as TipeAdministrasi) 
      : 'modul_ajar'
  );
  const [workspaceKelas, setWorkspaceKelas] = useState<string>('Kelas VII (SMP)');
  const [workspaceFase, setWorkspaceFase] = useState<string>('Fase D (Kelas 7-9 SMP)');
  const [workspaceText, setWorkspaceText] = useState<string>('');
  const [activeWorkspaceDocId, setActiveWorkspaceDocId] = useState<string | null>(null);
  const [lastSavedText, setLastSavedText] = useState<string>('');
  const [isSavingWorkspace, setIsSavingWorkspace] = useState<boolean>(false);
  const [saveSuccessNotification, setSaveSuccessNotification] = useState<string | null>(null);
  const [showSaveModal, setShowSaveModal] = useState<boolean>(false);
  const [customDocTitle, setCustomDocTitle] = useState<string>('');
  const [isSaveAsNew, setIsSaveAsNew] = useState<boolean>(false);

  // Auto-dismiss save notification after 3.5s
  useEffect(() => {
    if (saveSuccessNotification) {
      const timer = setTimeout(() => {
        setSaveSuccessNotification(null);
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [saveSuccessNotification]);

  // Sync workspaceMapel with selectedMapelFilter when it changes and is not 'Semua'
  useEffect(() => {
    if (selectedMapelFilter !== 'Semua') {
      setWorkspaceMapel(selectedMapelFilter);
    }
  }, [selectedMapelFilter]);

  // Sync workspaceTipe with activeSubTab
  useEffect(() => {
    if (['modul_ajar', 'cp', 'atp', 'kktp', 'prota', 'prosem'].includes(activeSubTab as any)) {
      setWorkspaceTipe(activeSubTab as TipeAdministrasi);
    }
  }, [activeSubTab]);

  const getWorkspaceTemplateText = (
    tipe: TipeAdministrasi,
    mapel: string,
    kelas: string,
    fase: string
  ) => {
    const teacherInfo = getTemplateTeacherInfo(mapel);
    const teacherName = teacherInfo.nama || activeTeacher?.nama || 'Aulia Safitri, S.Pd';
    const principalNameVal = principalName;
    const principalNipVal = principalNip;
    const teacherNip = teacherInfo.nip || '19900524 201503 2 004';

    if (tipe === 'modul_ajar') {
      const normalizedMapel = mapel ? mapel.toLowerCase() : '';
      let defaultTopic = 'Aritmetika Sosial';
      if (normalizedMapel.includes('indonesia')) defaultTopic = 'Teks Deskripsi';
      else if (normalizedMapel.includes('ipa') || normalizedMapel.includes('alam')) defaultTopic = 'Struktur Sel dan Mikroskop';
      else if (normalizedMapel.includes('ips') || normalizedMapel.includes('sosial')) defaultTopic = 'Interaksi Sosial';
      else if (normalizedMapel.includes('inggris')) defaultTopic = 'Describing People';
      else if (normalizedMapel.includes('informatika') || normalizedMapel.includes('komputer')) defaultTopic = 'Berpikir Komputasional';
      else if (normalizedMapel.includes('agama') || normalizedMapel.includes('pai')) defaultTopic = 'Adab Bergaul dan Toleransi';
      else if (normalizedMapel.includes('pancasila') || normalizedMapel.includes('pkn')) defaultTopic = 'Penerapan Nilai-Nilai Pancasila';
      else if (normalizedMapel.includes('seni') || normalizedMapel.includes('budaya')) defaultTopic = 'Ragam Hias Geometris';
      else if (normalizedMapel.includes('jasmani') || normalizedMapel.includes('pjok') || normalizedMapel.includes('olahraga')) defaultTopic = 'Kebugaran Jasmani';

      return generateModulAjarTemplateText(mapel, kelas, defaultTopic, teacherName, principalNameVal, principalNipVal, teacherNip);
    } else if (tipe === 'atp') {
      const atpTemplate = buildOfficialAtpData({
        mataPelajaran: mapel,
        kelas,
        tahunAjaran: '2026/2027',
        namaPenyusun: teacherName,
        satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
      });
      return `${formatAtpToPlainText(atpTemplate)}

Mengetahui,
Kepala Sekolah                            Guru Mata Pelajaran

${principalNameVal.padEnd(42, ' ')}${teacherName}
NIP: ${principalNipVal.padEnd(37, ' ')}NIP: ${teacherNip}`;
    } else if (tipe === 'cp') {
      const cpTemplate = buildOfficialCpData({
        mataPelajaran: mapel,
        kelas,
        tahunAjaran: '2026/2027',
        semester: 'Ganjil',
        namaPenyusun: teacherName,
        satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
      });
      return `${formatCpToPlainText(cpTemplate)}

Mengetahui,
Kepala Sekolah                            Guru Mata Pelajaran

${principalNameVal.padEnd(42, ' ')}${teacherName}
NIP: ${principalNipVal.padEnd(37, ' ')}NIP: ${teacherNip}`;
    } else if (tipe === 'kktp') {
      const kktpTemplate = buildOfficialKktpData({
        mataPelajaran: mapel,
        kelas,
        tahunAjaran: '2026/2027',
        semester: 'Ganjil',
        namaPenyusun: teacherName,
        satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
      });
      return `${formatKktpToPlainText(kktpTemplate)}

Mengetahui,
Kepala Sekolah                            Guru Mata Pelajaran

${principalNameVal.padEnd(42, ' ')}${teacherName}
NIP: ${principalNipVal.padEnd(37, ' ')}NIP: ${teacherNip}`;
    } else if (tipe === 'prota') {
      const protaTemplate = buildOfficialProtaData({
        mataPelajaran: mapel,
        kelas,
        tahunAjaran: '2026/2027',
        namaPenyusun: teacherName,
        satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
      });
      return `${formatProtaToPlainText(protaTemplate)}

Mengetahui,
Kepala Sekolah                            Guru Mata Pelajaran

${principalNameVal.padEnd(42, ' ')}${teacherName}
NIP: ${principalNipVal.padEnd(37, ' ')}NIP: ${teacherNip}`;
    } else if (tipe === 'prosem') {
      const prosemTemplate = buildOfficialProsemData({
        mataPelajaran: mapel,
        kelas,
        semester: 'Ganjil',
        tahunAjaran: '2026/2027',
        namaPenyusun: teacherName,
        satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
      });
      return `${formatProsemToPlainText(prosemTemplate)}

Mengetahui,
Kepala Sekolah                            Guru Mata Pelajaran

${principalNameVal.padEnd(42, ' ')}${teacherName}
NIP: ${principalNipVal.padEnd(37, ' ')}NIP: ${teacherNip}`;
    }
    return `DOKUMEN: ${mapel} Kelas ${kelas}`;
  };

  // Helper to find matching document in archive
  const findMatchingArchivedDoc = (tipe: TipeAdministrasi, mapel: string, kelasStr: string) => {
    const rawClass = kelasStr.includes('VII') ? 'VII' : kelasStr.includes('VIII') ? 'VIII' : 'IX';
    const normMapel = mapel.toLowerCase().trim();
    return administrasiList.find(d => {
      const dMapel = d.mataPelajaran.toLowerCase().trim();
      const matchTipe = d.tipe === tipe;
      const matchMapel = dMapel === normMapel || dMapel.includes(normMapel) || normMapel.includes(dMapel);
      const matchClass = d.kelas.includes(rawClass) || rawClass.includes(d.kelas);
      return matchTipe && matchMapel && matchClass;
    });
  };

  const loadStandardWorkspaceText = () => {
    const rawClass = workspaceKelas.includes('VII') ? 'VII' : workspaceKelas.includes('VIII') ? 'VIII' : 'IX';
    const existingDoc = findMatchingArchivedDoc(workspaceTipe, workspaceMapel, workspaceKelas);

    if (existingDoc && (existingDoc.content || existingDoc.deskripsi)) {
      const docContent = existingDoc.content || existingDoc.deskripsi;
      setWorkspaceText(docContent);
      setActiveWorkspaceDocId(existingDoc.id);
      setLastSavedText(docContent);
    } else {
      const txt = getWorkspaceTemplateText(workspaceTipe, workspaceMapel, rawClass, workspaceFase);
      setWorkspaceText(txt);
      setActiveWorkspaceDocId(null);
      setLastSavedText(txt);
    }
  };

  // Auto-sync workspace text when user changes selection filters
  useEffect(() => {
    loadStandardWorkspaceText();
  }, [workspaceMapel, workspaceTipe, workspaceKelas, workspaceFase]);

  // Check if workspace has unsaved changes relative to last saved state
  const hasUnsavedChanges = workspaceText !== lastSavedText && workspaceText.trim().length > 0;

  const handleDownloadWorkspaceDoc = () => {
    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${workspaceTipe.toUpperCase()} - ${workspaceMapel}</title>
        <style>
          @page { margin: 2cm; }
          body { font-family: 'Arial', sans-serif; font-size: 10pt; line-height: 1.4; color: #000; }
          pre { font-family: 'Arial', sans-serif; font-size: 10pt; white-space: pre-wrap; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 14pt; font-weight: bold; text-transform: uppercase;">${workspaceTipe.replace('_', ' ')}</div>
          <div style="font-size: 12pt; font-weight: bold;">SMP ISLAM MODERN AL FAKHIR</div>
          <div style="font-size: 11pt; font-weight: bold;">TAHUN AJARAN 2026 / 2027</div>
        </div>
        <pre>${workspaceText}</pre>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspaceTipe}_${workspaceMapel.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    a.click();
  };

  const handleDownloadWorkspaceTxt = () => {
    const blob = new Blob([workspaceText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${workspaceTipe}_${workspaceMapel.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    a.click();
  };

  const handlePrintWorkspace = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
      <head>
        <title>Cetak ${workspaceTipe.toUpperCase()} - ${workspaceMapel}</title>
        <style>
          @page { size: A4; margin: 20mm; }
          body { font-family: 'Arial', sans-serif; font-size: 11pt; line-height: 1.6; color: #1e293b; margin: 0; padding: 0; }
          .kop-surat { text-align: center; border-bottom: 4px double #059669; padding-bottom: 12px; margin-bottom: 25px; }
          .kop-sekolah { font-size: 16pt; font-weight: 900; color: #065f46; letter-spacing: 0.05em; }
          .kop-sub { font-size: 9pt; color: #475569; margin-top: 2px; }
          pre { font-family: 'Arial', sans-serif; font-size: 11pt; white-space: pre-wrap; line-height: 1.6; }
        </style>
      </head>
      <body>
        <div class="kop-surat">
          <div class="kop-sekolah">SMP ISLAM MODERN AL FAKHIR</div>
          <div class="kop-sub">NPSN: 69978521 • Terakreditasi A • Jl. Raya Sawangan No. 45, Depok</div>
          <div class="kop-sub">Email: info@alfakhir.sch.id • Telp: (021) 77889922</div>
        </div>
        <pre>\${workspaceText}</pre>
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSaveWorkspaceToArsip = async (overrideTitle?: string, forceNew: boolean = false) => {
    setIsSavingWorkspace(true);
    try {
      const rawClass = workspaceKelas.includes('VII') ? 'VII' : workspaceKelas.includes('VIII') ? 'VIII' : 'IX';
      const teacherInfo = getTemplateTeacherInfo(workspaceMapel);
      const teacherName = teacherInfo.nama || activeTeacher?.nama || 'Guru Pengampu Mapel';
      const defaultDocTitle = `${workspaceTipe.toUpperCase().replace('_', ' ')}: ${workspaceMapel} - Kelas ${rawClass}`;
      const docTitle = (overrideTitle && overrideTitle.trim()) ? overrideTitle.trim() : defaultDocTitle;

      let kontenJsonObj: any = undefined;
      if (workspaceTipe === 'modul_ajar') {
        try {
          // Parse the raw text to structured JSON to maintain compatibility with "Buat Manual" view & edit flows
          const sections: { [key: string]: string } = {};
          const lines = workspaceText.split('\n');
          let currentLetter = '';
          let currentLines: string[] = [];
          
          for (const line of lines) {
            const match = line.match(/^([A-Q])\.\s+(.+)$/);
            if (match) {
              if (currentLetter) {
                sections[currentLetter] = currentLines.join('\n').trim();
              }
              currentLetter = match[1];
              currentLines = [];
            } else {
              currentLines.push(line);
            }
          }
          if (currentLetter) {
            sections[currentLetter] = currentLines.join('\n').trim();
          }

          const parseLines = (secText: string) => secText ? secText.split('\n').map(l => l.trim()).filter(Boolean) : [];
          const infoText = sections['A'] || '';
          const getInfoField = (label: string, fallback: string = '') => {
            const match = infoText.match(new RegExp(`${label}\\s*:\\s*(.+)`, 'i'));
            return match ? match[1].trim() : fallback;
          };

          const informasiUmum = {
            namaPenyusun: getInfoField('Nama Penyusun', teacherName),
            namaSekolah: getInfoField('Nama Sekolah', 'SMP Islam Modern Al Fakhir'),
            mataPelajaran: getInfoField('Mata Pelajaran', workspaceMapel),
            fase: getInfoField('Fase/Kelas', 'D / ' + rawClass).split('/')[0]?.trim() || 'D',
            kelas: getInfoField('Fase/Kelas', 'D / ' + rawClass).split('/')[1]?.trim() || rawClass,
            semester: getInfoField('Semester', 'I (Ganjil)'),
            tahunAjaran: getInfoField('Tahun Ajaran', '2026/2027'),
            alokasiWaktu: getInfoField('Alokasi Waktu', '2 x 40 Menit'),
            materi: getInfoField('Materi Pokok', docTitle),
          };

          const getKegiatanSection = (prefix: string) => {
            const regex = new RegExp(`(?:\\d+)\\.\\s*(${prefix}[^\\n]*)\\n([\\s\\S]*?)(?=(?:\\d+)\\.\\s*|$)`, 'i');
            const match = (sections['J'] || '').match(regex);
            if (match) {
              const fullMatch = match[0];
              const durMatch = fullMatch.match(/\((\d+)\s*Menit\)/i);
              const duration = durMatch ? `${durMatch[1]} Menit` : '10 Menit';
              const desc = match[2].trim();
              return { deskripsi: desc, durasi: duration };
            }
            return { deskripsi: '', durasi: '10 Menit' };
          };

          const lampiranText = sections['Q'] || '';
          const getLampiranField = (num: string, fallback: string = '') => {
            const regex = new RegExp(`(?:${num})\\.\\s*([^\\n]+)`, 'i');
            const match = lampiranText.match(regex);
            return match ? match[1].trim() : fallback;
          };

          kontenJsonObj = {
            informasiUmum,
            kompetensiAwal: sections['B'] || '',
            profilPelajarPancasila: parseLines(sections['C']),
            saranaPrasarana: parseLines(sections['D']),
            targetPesertaDidik: 'Reguler',
            modelPembelajaran: sections['F'] || 'Problem Based Learning (PBL)',
            tujuanPembelajaran: parseLines(sections['G']),
            pemahamanBermakna: sections['H'] || '',
            pertanyaanPemantik: parseLines(sections['I']),
            kegiatanPembelajaran: {
              pendahuluan: getKegiatanSection('Pendahuluan'),
              inti: getKegiatanSection('Inti'),
              penutup: getKegiatanSection('Penutup')
            },
            asesmen: {
              diagnostik: 'Kuesioner kesiapan awal',
              formatif: 'Observasi keaktifan diskusi',
              sumatif: 'Penilaian produk hasil karya',
              teknik: 'Observasi dan Tes Tertulis',
              instrumen: 'Lembar Pengamatan & Soal Esai Evaluatif',
              rubrik: sections['K'] || 'Kriteria Penilaian Baku',
              kriteriaPenilaian: 'Ketepatan & Nilai Islami'
            },
            diferensiasi: {
              konten: 'Bahan bacaan tingkat kerumitan bervariasi',
              proses: 'Scaffolding dan tutor sebaya',
              produk: 'Penyajian karya dalam tulisan, poster, atau presentasi'
            },
            remedial: sections['M'] || '',
            pengayaan: sections['N'] || '',
            refleksiGuru: sections['O'] || '',
            refleksiPesertaDidik: sections['P'] || '',
            lampiran: {
              lkpd: getLampiranField('1', 'Lembar Kerja Peserta Didik (LKPD) mandiri & kelompok.'),
              bahanBacaan: getLampiranField('3', 'Bahan Bacaan Guru & Peserta Didik terkait materi pokok.'),
              rubrik: getLampiranField('2', 'Rubrik Penilaian Portofolio/Performa Hasil Karya.'),
              instrumenAsesmen: getLampiranField('4', 'Integrasi Nilai Islami'),
              daftarPustaka: getLampiranField('5', 'Daftar Pustaka Pendikulum Merdeka.')
            }
          };
        } catch (parseErr) {
          console.error('Failed to parse workspace text to JSON structured content:', parseErr);
        }
      }

      // Find existing document in archive if updating
      const existingDoc = (!forceNew && activeWorkspaceDocId)
        ? administrasiList.find(d => d.id === activeWorkspaceDocId)
        : (!forceNew ? findMatchingArchivedDoc(workspaceTipe, workspaceMapel, workspaceKelas) : null);

      if (existingDoc) {
        // Update existing document in archive
        const updatedDoc: AdministrasiGuru = {
          ...existingDoc,
          judul: overrideTitle ? docTitle : (existingDoc.judul || docTitle),
          deskripsi: workspaceText.length > 150 ? workspaceText.substring(0, 150) + '...' : workspaceText,
          content: workspaceText,
          kontenJson: kontenJsonObj || existingDoc.kontenJson,
          tanggalInput: new Date().toISOString().split('T')[0],
          status: 'Final'
        };

        const updatedList = administrasiList.map(d => d.id === existingDoc.id ? updatedDoc : d);
        setAdministrasiList(updatedList);
        await dbSaveCollection('edu_administrasiList', updatedList);
        setActiveWorkspaceDocId(existingDoc.id);
        setLastSavedText(workspaceText);
        setSaveSuccessNotification(`Perubahan dokumen "${updatedDoc.judul}" berhasil disimpan ke Arsip!`);
      } else {
        // Create new document in archive
        const newDoc: AdministrasiGuru = {
          id: `adm-${Date.now()}`,
          tipe: workspaceTipe,
          guruNama: teacherName,
          mataPelajaran: workspaceMapel,
          kelas: rawClass,
          tahunAjaran: '2026/2027',
          semester: 'Ganjil',
          judul: docTitle,
          deskripsi: workspaceText.length > 150 ? workspaceText.substring(0, 150) + '...' : workspaceText,
          content: workspaceText,
          kontenJson: kontenJsonObj,
          tanggalInput: new Date().toISOString().split('T')[0],
          status: 'Final'
        };

        const newList = [newDoc, ...administrasiList];
        setAdministrasiList(newList);
        await dbSaveCollection('edu_administrasiList', newList);
        setActiveWorkspaceDocId(newDoc.id);
        setLastSavedText(workspaceText);
        setSaveSuccessNotification(`Dokumen "${newDoc.judul}" berhasil disimpan ke Arsip Sekolah!`);
      }
    } catch (err) {
      console.error('Error saving workspace to archive:', err);
      alert('Gagal menyimpan dokumen ke arsip. Silakan coba lagi.');
    } finally {
      setIsSavingWorkspace(false);
      setShowSaveModal(false);
    }
  };

  // View Document Modal State
  const [activeDoc, setActiveDoc] = useState<AdministrasiGuru | null>(null);
  const [isEditingActiveDoc, setIsEditingActiveDoc] = useState(false);
  const [editedContent, setEditedContent] = useState('');

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string | 'all'; judul: string } | null>(null);

  const openDocModal = (doc: AdministrasiGuru) => {
    setActiveDoc(doc);
    if (shouldRenderStructuredCp(doc)) {
      setEditedContent(formatCpToPlainText(resolveCpData(doc)));
    } else if (shouldRenderStructuredAtp(doc)) {
      setEditedContent(formatAtpToPlainText(resolveAtpData(doc)));
    } else if (shouldRenderStructuredKktp(doc)) {
      setEditedContent(formatKktpToPlainText(resolveKktpData(doc)));
    } else if (shouldRenderStructuredProta(doc)) {
      setEditedContent(formatProtaToPlainText(resolveProtaData(doc)));
    } else if (shouldRenderStructuredProsem(doc)) {
      setEditedContent(formatProsemToPlainText(resolveProsemData(doc)));
    } else {
      setEditedContent(doc.content || doc.deskripsi);
    }
    setIsEditingActiveDoc(false);
  };

  const handleUpgradeLegacyCpDoc = async () => {
    if (!activeDoc || activeDoc.tipe !== 'cp') return;
    const cpData = resolveCpData(activeDoc);
    const cleanText = formatCpToPlainText(cpData);
    const updatedDoc: AdministrasiGuru = {
      ...activeDoc,
      deskripsi: `Capaian Pembelajaran (CP) resmi ${cpData.identitas.mataPelajaran} ${cpData.identitas.fase} (${cpData.elemenList.length} Elemen) — Fokus: ${cpData.identitas.topikFokus}`,
      content: cleanText,
      kontenJson: cpData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const updatedList = administrasiList.map(d => d.id === activeDoc.id ? updatedDoc : d);
    setAdministrasiList(updatedList);
    await dbSaveCollection('edu_administrasiList', updatedList);
    setActiveDoc(updatedDoc);
    setEditedContent(cleanText);
    setSaveSuccessNotification(`Format resmi Capaian Pembelajaran "${updatedDoc.judul}" berhasil disimpan ke Arsip!`);
  };

  const handleUpgradeLegacyKktpDoc = async () => {
    if (!activeDoc || activeDoc.tipe !== 'kktp') return;
    const kktpData = resolveKktpData(activeDoc);
    const cleanText = formatKktpToPlainText(kktpData);
    const updatedDoc: AdministrasiGuru = {
      ...activeDoc,
      deskripsi: `KKTP resmi ${kktpData.identitas.mataPelajaran} ${kktpData.identitas.fase} (${kktpData.rubrikPenilaian.length} Aspek Rubrik • Tuntas >= ${kktpData.identitas.batasMinimalPersen}%)`,
      content: cleanText,
      kontenJson: kktpData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const updatedList = administrasiList.map(d => d.id === activeDoc.id ? updatedDoc : d);
    setAdministrasiList(updatedList);
    await dbSaveCollection('edu_administrasiList', updatedList);
    setActiveDoc(updatedDoc);
    setEditedContent(cleanText);
    setSaveSuccessNotification(`Format resmi KKTP "${updatedDoc.judul}" berhasil disimpan ke Arsip!`);
  };

  const handleUpgradeLegacyProtaDoc = async () => {
    if (!activeDoc || activeDoc.tipe !== 'prota') return;
    const protaData = resolveProtaData(activeDoc);
    const summary = calculateProtaSummary(protaData);
    const cleanText = formatProtaToPlainText(protaData);
    const updatedDoc: AdministrasiGuru = {
      ...activeDoc,
      deskripsi: `Prota resmi ${protaData.identitas.mataPelajaran} Kelas ${protaData.identitas.kelas} (Sem I: ${summary.totalJpGanjil} JP • Sem II: ${summary.totalJpGenap} JP • Total ${summary.totalJpTahunan} JP/Tahun)`,
      content: cleanText,
      kontenJson: protaData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const updatedList = administrasiList.map(d => d.id === activeDoc.id ? updatedDoc : d);
    setAdministrasiList(updatedList);
    await dbSaveCollection('edu_administrasiList', updatedList);
    setActiveDoc(updatedDoc);
    setEditedContent(cleanText);
    setSaveSuccessNotification(`Format resmi Program Tahunan "${updatedDoc.judul}" berhasil disimpan ke Arsip!`);
  };

  const handleUpgradeLegacyProsemDoc = async () => {
    if (!activeDoc || activeDoc.tipe !== 'prosem') return;
    const prosemData = resolveProsemData(activeDoc);
    const summary = calculateProsemSummary(prosemData);
    const cleanText = formatProsemToPlainText(prosemData);
    const updatedDoc: AdministrasiGuru = {
      ...activeDoc,
      semester: prosemData.identitas.semester,
      deskripsi: `Prosem resmi ${prosemData.identitas.mataPelajaran} Kelas ${prosemData.identitas.kelas} Sem ${prosemData.identitas.semester} (${summary.totalPekanEfektif} Pekan Efektif • Total ${summary.totalJpMatriks} JP)`,
      content: cleanText,
      kontenJson: prosemData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const updatedList = administrasiList.map(d => d.id === activeDoc.id ? updatedDoc : d);
    setAdministrasiList(updatedList);
    await dbSaveCollection('edu_administrasiList', updatedList);
    setActiveDoc(updatedDoc);
    setEditedContent(cleanText);
    setSaveSuccessNotification(`Format resmi Program Semester "${updatedDoc.judul}" berhasil disimpan ke Arsip!`);
  };

  const handleUpgradeLegacyAtpDoc = async () => {
    if (!activeDoc || activeDoc.tipe !== 'atp') return;
    const atpData = resolveAtpData(activeDoc);
    const summary = calculateAtpSummary(atpData);
    const cleanText = formatAtpToPlainText(atpData);
    const updatedDoc: AdministrasiGuru = {
      ...activeDoc,
      deskripsi: `ATP resmi ${atpData.identitas.mataPelajaran} Kelas ${atpData.identitas.kelas} ${atpData.identitas.fase} (${summary.totalTp} TP • ${summary.jumlahElemen} Elemen • Total ${summary.totalJp} JP/Tahun)`,
      content: cleanText,
      kontenJson: atpData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const updatedList = administrasiList.map(d => d.id === activeDoc.id ? updatedDoc : d);
    setAdministrasiList(updatedList);
    await dbSaveCollection('edu_administrasiList', updatedList);
    setActiveDoc(updatedDoc);
    setEditedContent(cleanText);
    setSaveSuccessNotification(`Format resmi Alur Tujuan Pembelajaran "${updatedDoc.judul}" berhasil disimpan ke Arsip!`);
  };

  const handleSaveActiveDoc = async () => {
    if (!activeDoc) return;
    const updatedDoc: AdministrasiGuru = {
      ...activeDoc,
      content: editedContent,
      kontenJson: (activeDoc.tipe === 'cp' || activeDoc.tipe === 'atp' || activeDoc.tipe === 'kktp' || activeDoc.tipe === 'prota' || activeDoc.tipe === 'prosem') ? undefined : activeDoc.kontenJson,
      deskripsi: editedContent.length > 180 ? editedContent.substring(0, 180) + '...' : editedContent,
      tanggalInput: new Date().toISOString().split('T')[0]
    };

    const updatedList = administrasiList.map(d => d.id === activeDoc.id ? updatedDoc : d);
    setAdministrasiList(updatedList);
    await dbSaveCollection('edu_administrasiList', updatedList);

    setActiveDoc(updatedDoc);

    // If currently editing the same document in workspace, sync it
    if (activeWorkspaceDocId === activeDoc.id) {
      setWorkspaceText(editedContent);
      setLastSavedText(editedContent);
    }

    setIsEditingActiveDoc(false);
    setSaveSuccessNotification(`Perubahan dokumen "${updatedDoc.judul}" berhasil disimpan ke Arsip!`);
  };

  const handleDownloadDocx = () => {
    if (!activeDoc) return;
    const text = activeDoc.content || activeDoc.deskripsi;
    
    // Find teacher of active document in guruList to get their actual NIP / NUPTK
    const docGuru = guruList?.find(g => g.nama.toLowerCase() === activeDoc.guruNama.toLowerCase());
    const docGuruNip = docGuru ? (docGuru.nip || '-') : '-';

    let finalHtmlContent = '';

    if (shouldRenderStructuredCp(activeDoc)) {
      const cp = resolveCpData(activeDoc);
      finalHtmlContent = `
        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">IDENTITAS DOKUMEN CAPAIAN PEMBELAJARAN (CP)</div>
        <table>
          <tr><td class="label-cell">Satuan Pendidikan</td><td class="val-cell">${cp.identitas.satuanPendidikan}</td></tr>
          <tr><td class="label-cell">Mata Pelajaran</td><td class="val-cell"><b>${cp.identitas.mataPelajaran}</b></td></tr>
          <tr><td class="label-cell">Fase / Kelas</td><td class="val-cell">${cp.identitas.fase} / Kelas ${cp.identitas.kelas}</td></tr>
          <tr><td class="label-cell">Fokus Materi</td><td class="val-cell"><b>${cp.identitas.topikFokus}</b></td></tr>
          <tr><td class="label-cell">Tahun Ajaran / Semester</td><td class="val-cell">${cp.identitas.tahunAjaran} (${cp.identitas.semester})</td></tr>
          <tr><td class="label-cell">Guru Penyusun</td><td class="val-cell">${cp.identitas.namaPenyusun}</td></tr>
          <tr><td class="label-cell">Acuan Kurikulum</td><td class="val-cell">${cp.identitas.referensiRegulasi}</td></tr>
        </table>

        <div class="section-header">A. RASIONAL MATA PELAJARAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px; text-align: justify;">${cp.rasional}</div>

        <div class="section-header">B. TUJUAN MATA PELAJARAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <ol style="margin: 0; padding-left: 20px;">
            ${cp.tujuanMataPelajaran.map((t) => `<li style="margin-bottom: 4px;">${t}</li>`).join('')}
          </ol>
        </div>

        <div class="section-header">C. KARAKTERISTIK MATA PELAJARAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px; text-align: justify;">${cp.karakteristik}</div>

        <div class="section-header">D. CAPAIAN PEMBELAJARAN UMUM (${cp.identitas.fase.toUpperCase()})</div>
        <div style="padding: 10px; border: 1.5px solid #15803D; background-color: #F0FDF4; margin-bottom: 10px; text-align: justify;">${cp.capaianUmumFase}</div>

        <div class="section-header">E. CAPAIAN PEMBELAJARAN PER ELEMEN</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 6%;">No</th>
              <th class="inklusi-header" style="width: 20%;">Elemen</th>
              <th class="inklusi-header" style="width: 44%;">Capaian Pembelajaran (CP)</th>
              <th class="inklusi-header" style="width: 30%;">Kompetensi Inti &amp; Lingkup Materi</th>
            </tr>
          </thead>
          <tbody>
            ${cp.elemenList
              .map(
                (el, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="font-weight: bold;">${el.elemen}</td>
                <td style="text-align: justify;">${el.deskripsiCp}</td>
                <td>
                  <div><b>Kompetensi:</b> ${el.kompetensiInti}</div>
                  <div style="margin-top: 4px;"><b>Materi:</b> ${el.lingkupMateri}</div>
                </td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">F. 8 DIMENSI PROFIL LULUSAN &amp; INTEGRASI NILAI ISLAMI (${cp.integrasiNilaiIslami.surahAyat})</div>
        <div style="padding: 12px; border: 1.5px solid #15803D; background-color: #F0FDF4; margin-bottom: 12px;">
          <p style="margin: 0 0 8px 0;"><b>Dimensi Profil Lulusan:</b> ${cp.dimensiProfilLulusan.join(' • ')}</p>
          <div dir="rtl" style="font-family: 'Traditional Arabic', 'Times New Roman', serif; font-size: 16pt; line-height: 1.8; text-align: right; color: #064E3B; margin-bottom: 8px;">${cp.integrasiNilaiIslami.teksArab}</div>
          <p style="margin: 4px 0;"><b>Artinya (${cp.integrasiNilaiIslami.surahAyat}):</b> <i>"${cp.integrasiNilaiIslami.terjemahan}"</i></p>
          <p style="margin: 6px 0 0 0;"><b>Relevansi Nilai Islami terhadap CP:</b> ${cp.integrasiNilaiIslami.relevansiCp}</p>
        </div>
      `;
    } else if (shouldRenderStructuredKktp(activeDoc)) {
      const kktp = resolveKktpData(activeDoc);
      finalHtmlContent = `
        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">IDENTITAS DOKUMEN KKTP</div>
        <table>
          <tr><td class="label-cell">Satuan Pendidikan</td><td class="val-cell">${kktp.identitas.satuanPendidikan}</td></tr>
          <tr><td class="label-cell">Mata Pelajaran</td><td class="val-cell"><b>${kktp.identitas.mataPelajaran}</b></td></tr>
          <tr><td class="label-cell">Fase / Kelas</td><td class="val-cell">${kktp.identitas.fase} / Kelas ${kktp.identitas.kelas}</td></tr>
          <tr><td class="label-cell">Topik / Lingkup Materi</td><td class="val-cell"><b>${kktp.identitas.topikMateri}</b></td></tr>
          <tr><td class="label-cell">Pendekatan KKTP</td><td class="val-cell">${kktp.identitas.pendekatanUtama}</td></tr>
          <tr><td class="label-cell">Batas Ketuntasan Minimal</td><td class="val-cell"><b>Predikat Cakap (Interval &ge; ${kktp.identitas.batasMinimalPersen}%)</b></td></tr>
          <tr><td class="label-cell">Guru Penyusun</td><td class="val-cell">${kktp.identitas.namaPenyusun}</td></tr>
          <tr><td class="label-cell">Acuan Regulasi</td><td class="val-cell">${kktp.identitas.referensiRegulasi}</td></tr>
        </table>

        <div class="section-header">A. CAPAIAN &amp; TUJUAN PEMBELAJARAN YANG DIUKUR</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <p style="margin: 0 0 8px 0;"><b>Capaian Pembelajaran (CP):</b> ${kktp.capaianPembelajaranRingkas}</p>
          <p style="margin: 0 0 4px 0;"><b>Tujuan Pembelajaran (TP):</b></p>
          <ol style="margin: 0; padding-left: 20px;">
            ${kktp.tujuanPembelajaran.map((tp) => `<li style="margin-bottom: 4px;">${tp}</li>`).join('')}
          </ol>
        </div>

        <div class="section-header">B. PENDEKATAN RUBRIK KETERCAPAIAN (4 LEVEL PENGUASAAN)</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 5%;">No</th>
              <th class="inklusi-header" style="width: 19%;">Aspek / Indikator</th>
              <th class="inklusi-header" style="width: 19%; background-color: #FECDD3;">Baru Berkembang (1)</th>
              <th class="inklusi-header" style="width: 19%; background-color: #FDE68A;">Layak (2)</th>
              <th class="inklusi-header" style="width: 19%; background-color: #BFDBFE;">Cakap (3 — Tuntas)</th>
              <th class="inklusi-header" style="width: 19%; background-color: #BBF7D0;">Mahir (4 — Unggul)</th>
            </tr>
          </thead>
          <tbody>
            ${kktp.rubrikPenilaian
              .map(
                (r, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="font-weight: bold;">${r.aspek}</td>
                <td>${r.baruBerkembang}</td>
                <td>${r.layak}</td>
                <td>${r.cakap}</td>
                <td>${r.mahir}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <div class="section-header">C. PENDEKATAN INTERVAL NILAI &amp; TINDAK LANJUT INTERVENSI</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 14%;">Interval Nilai</th>
              <th class="inklusi-header" style="width: 24%;">Predikat Penguasaan</th>
              <th class="inklusi-header" style="width: 16%;">Ketuntasan</th>
              <th class="inklusi-header" style="width: 46%;">Tindak Lanjut / Intervensi Guru</th>
            </tr>
          </thead>
          <tbody>
            ${kktp.intervalNilai
              .map(
                (iv) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${iv.rentang}</td>
                <td style="font-weight: bold;">${iv.predikat}</td>
                <td style="text-align: center; font-weight: bold; color: ${iv.ketuntasan === 'Tuntas' ? '#15803D' : '#B91C1C'};">${iv.ketuntasan}</td>
                <td>${iv.tindakLanjut}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <div class="section-header">D. PENDEKATAN DESKRIPSI KRITERIA (CEKLIS KETERCAPAIAN)</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 6%;">No</th>
              <th class="inklusi-header" style="width: 26%;">Kriteria Penilaian</th>
              <th class="inklusi-header" style="width: 44%;">Indikator Bukti Memadai</th>
              <th class="inklusi-header" style="width: 12%;">Memadai</th>
              <th class="inklusi-header" style="width: 12%;">Tidak Memadai</th>
            </tr>
          </thead>
          <tbody>
            ${kktp.deskripsiKriteria
              .map(
                (d, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="font-weight: bold;">${d.kriteria}</td>
                <td>${d.targetMemadai}</td>
                <td style="text-align: center;">&#9744;</td>
                <td style="text-align: center;">&#9744;</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>

        <div class="section-header">E. KEPUTUSAN KETUNTASAN &amp; PROGRAM TINDAK LANJUT</div>
        <div style="padding: 10px; border: 1.5px solid #15803D; background-color: #F0FDF4; margin-bottom: 10px;">
          <p style="margin: 0 0 6px 0;"><b>Kesimpulan Ketuntasan:</b> ${kktp.keputusanKetuntasan}</p>
          <p style="margin: 0 0 6px 0;"><b>Program Remedial:</b> ${kktp.strategiRemedial}</p>
          <p style="margin: 0;"><b>Program Pengayaan:</b> ${kktp.strategiPengayaan}</p>
        </div>

        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">F. INTEGRASI NILAI ISLAMI (${kktp.integrasiNilaiIslami.surahAyat})</div>
        <div style="padding: 12px; border: 1.5px solid #15803D; background-color: #F0FDF4; margin-bottom: 12px;">
          <div dir="rtl" style="font-family: 'Traditional Arabic', 'Times New Roman', serif; font-size: 16pt; line-height: 1.8; text-align: right; color: #064E3B; margin-bottom: 8px;">${kktp.integrasiNilaiIslami.teksArab}</div>
          <p style="margin: 4px 0;"><b>Artinya (${kktp.integrasiNilaiIslami.surahAyat}):</b> <i>"${kktp.integrasiNilaiIslami.terjemahan}"</i></p>
          <p style="margin: 6px 0 0 0;"><b>Relevansi terhadap KKTP:</b> ${kktp.integrasiNilaiIslami.relevansiKktp}</p>
        </div>
      `;
    } else if (shouldRenderStructuredAtp(activeDoc)) {
      const atp = resolveAtpData(activeDoc);
      const summary = calculateAtpSummary(atp);
      const ganjilRows = atp.daftarAlur.filter((r) => r.semester === 'Ganjil');
      const genapRows = atp.daftarAlur.filter((r) => r.semester === 'Genap');
      const renderAtpDocxRows = (rows: typeof ganjilRows) =>
        rows
          .map(
            (r) => `
          <tr>
            <td style="text-align: center; font-weight: bold;">${r.kodeTp}</td>
            <td style="font-weight: bold;">${r.elemen}</td>
            <td>${r.tujuanPembelajaran}</td>
            <td>${r.materiEsensial}</td>
            <td style="text-align: center; font-weight: bold;">${r.alokasiJp} JP</td>
            <td>${r.dimensiProfil}</td>
            <td>${r.strategiAsesmen}<br/><i>Kata Kunci: ${r.kataKunci}</i></td>
          </tr>`
          )
          .join('');
      finalHtmlContent = `
        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">IDENTITAS ALUR TUJUAN PEMBELAJARAN (ATP)</div>
        <table>
          <tr><td class="label-cell">Satuan Pendidikan</td><td class="val-cell">${atp.identitas.satuanPendidikan}</td></tr>
          <tr><td class="label-cell">Mata Pelajaran</td><td class="val-cell"><b>${atp.identitas.mataPelajaran}</b></td></tr>
          <tr><td class="label-cell">Fase / Kelas</td><td class="val-cell">${atp.identitas.fase} / Kelas ${atp.identitas.kelas}</td></tr>
          <tr><td class="label-cell">Tahun Ajaran</td><td class="val-cell">${atp.identitas.tahunAjaran}</td></tr>
          <tr><td class="label-cell">Fokus / Tema Utama</td><td class="val-cell">${atp.identitas.fokusTopik}</td></tr>
          <tr><td class="label-cell">Total TP &amp; Alokasi JP</td><td class="val-cell"><b>${summary.totalTp} TP • ${summary.totalJp} JP/Tahun</b> (Sem. I: ${summary.tpGanjil} TP / ${summary.totalJpGanjil} JP • Sem. II: ${summary.tpGenap} TP / ${summary.totalJpGenap} JP • Beban: ${atp.identitas.jpPerMinggu} JP/Minggu)</td></tr>
          <tr><td class="label-cell">Guru Penyusun</td><td class="val-cell">${atp.identitas.namaPenyusun}</td></tr>
          <tr><td class="label-cell">Referensi Regulasi</td><td class="val-cell">${atp.identitas.referensiRegulasi}</td></tr>
        </table>

        <div class="section-header">A. RASIONAL PENYUSUNAN ALUR TUJUAN PEMBELAJARAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px; text-align: justify;">${atp.rasionalAlur}</div>

        <div class="section-header">B. CAPAIAN PEMBELAJARAN UMUM (${atp.identitas.fase.toUpperCase()})</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px; text-align: justify; background-color: #F0FDF4;">${atp.capaianPembelajaranUmum}</div>

        <div class="section-header">C. MATRIKS ALUR TUJUAN PEMBELAJARAN — SEMESTER I (GANJIL)</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 9%;">Kode TP</th>
              <th class="inklusi-header" style="width: 14%;">Elemen CP</th>
              <th class="inklusi-header" style="width: 26%;">Rumusan Tujuan Pembelajaran (TP)</th>
              <th class="inklusi-header" style="width: 15%;">Materi Esensial</th>
              <th class="inklusi-header" style="width: 7%;">JP</th>
              <th class="inklusi-header" style="width: 13%;">Dimensi Profil Lulusan</th>
              <th class="inklusi-header" style="width: 16%;">Asesmen &amp; Kata Kunci</th>
            </tr>
          </thead>
          <tbody>
            ${renderAtpDocxRows(ganjilRows)}
            <tr style="background-color: #ECFDF5; font-weight: bold;">
              <td colspan="4" style="text-align: right;">SUBTOTAL SEMESTER I (GANJIL) — ${summary.tpGanjil} TP</td>
              <td style="text-align: center;">${summary.totalJpGanjil} JP</td>
              <td colspan="2">Tersinkronisasi dengan Prota &amp; Prosem</td>
            </tr>
          </tbody>
        </table>

        <div class="section-header">D. MATRIKS ALUR TUJUAN PEMBELAJARAN — SEMESTER II (GENAP)</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 9%;">Kode TP</th>
              <th class="inklusi-header" style="width: 14%;">Elemen CP</th>
              <th class="inklusi-header" style="width: 26%;">Rumusan Tujuan Pembelajaran (TP)</th>
              <th class="inklusi-header" style="width: 15%;">Materi Esensial</th>
              <th class="inklusi-header" style="width: 7%;">JP</th>
              <th class="inklusi-header" style="width: 13%;">Dimensi Profil Lulusan</th>
              <th class="inklusi-header" style="width: 16%;">Asesmen &amp; Kata Kunci</th>
            </tr>
          </thead>
          <tbody>
            ${renderAtpDocxRows(genapRows)}
            <tr style="background-color: #ECFDF5; font-weight: bold;">
              <td colspan="4" style="text-align: right;">SUBTOTAL SEMESTER II (GENAP) — ${summary.tpGenap} TP</td>
              <td style="text-align: center;">${summary.totalJpGenap} JP</td>
              <td colspan="2">Total 1 Tahun: ${summary.totalTp} TP • ${summary.totalJp} JP</td>
            </tr>
          </tbody>
        </table>

        <div class="section-header">E. GLOSARIUM ISTILAH KUNCI &amp; CATATAN IMPLEMENTASI</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 6%;">No</th>
              <th class="inklusi-header" style="width: 26%;">Istilah Kunci</th>
              <th class="inklusi-header" style="width: 68%;">Definisi Operasional</th>
            </tr>
          </thead>
          <tbody>
            ${atp.glosarium
              .map(
                (g, i) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${i + 1}</td>
                <td style="font-weight: bold;">${g.istilah}</td>
                <td>${g.definisi}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px; text-align: justify;"><b>Catatan Implementasi Pembelajaran Mendalam:</b> ${atp.catatanImplementasi}</div>

        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">F. INTEGRASI NILAI ISLAMI (${atp.integrasiNilaiIslami.surahAyat})</div>
        <div style="padding: 12px; border: 1.5px solid #15803D; background-color: #F0FDF4; margin-bottom: 12px;">
          <div dir="rtl" style="font-family: 'Traditional Arabic', 'Times New Roman', serif; font-size: 16pt; line-height: 1.8; text-align: right; color: #064E3B; margin-bottom: 8px;">${atp.integrasiNilaiIslami.teksArab}</div>
          <p style="margin: 4px 0;"><b>Artinya (${atp.integrasiNilaiIslami.surahAyat}):</b> <i>"${atp.integrasiNilaiIslami.terjemahan}"</i></p>
          <p style="margin: 6px 0 0 0;"><b>Relevansi terhadap ATP:</b> ${atp.integrasiNilaiIslami.relevansiAtp}</p>
        </div>
      `;
    } else if (shouldRenderStructuredProta(activeDoc)) {
      const prota = resolveProtaData(activeDoc);
      const summary = calculateProtaSummary(prota);
      const ganjilRows = prota.distribusiSemester.filter((r) => r.semester === 'Ganjil');
      const genapRows = prota.distribusiSemester.filter((r) => r.semester === 'Genap');
      finalHtmlContent = `
        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">IDENTITAS PROGRAM TAHUNAN (PROTA)</div>
        <table>
          <tr><td class="label-cell">Satuan Pendidikan</td><td class="val-cell">${prota.identitas.satuanPendidikan}</td></tr>
          <tr><td class="label-cell">Mata Pelajaran</td><td class="val-cell"><b>${prota.identitas.mataPelajaran}</b></td></tr>
          <tr><td class="label-cell">Fase / Kelas</td><td class="val-cell">${prota.identitas.fase} / Kelas ${prota.identitas.kelas}</td></tr>
          <tr><td class="label-cell">Tahun Ajaran</td><td class="val-cell">${prota.identitas.tahunAjaran}</td></tr>
          <tr><td class="label-cell">Beban Belajar</td><td class="val-cell"><b>${prota.identitas.jpPerMinggu} JP / Minggu</b> (Sem. Ganjil: ${prota.identitas.mingguEfektifGanjil} Minggu • Sem. Genap: ${prota.identitas.mingguEfektifGenap} Minggu)</td></tr>
          <tr><td class="label-cell">Total Alokasi Waktu</td><td class="val-cell"><b>${summary.totalJpTahunan} JP / Tahun</b> (Sem. I: ${summary.totalJpGanjil} JP • Sem. II: ${summary.totalJpGenap} JP)</td></tr>
          <tr><td class="label-cell">Guru Penyusun</td><td class="val-cell">${prota.identitas.namaPenyusun}</td></tr>
        </table>

        <div class="section-header">A. CAPAIAN PEMBELAJARAN UMUM TAHUNAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px; text-align: justify;">${prota.capaianUmumTahunan}</div>

        <div class="section-header">B. DISTRIBUSI ALUR TUJUAN PEMBELAJARAN — SEMESTER I (GANJIL)</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 5%;">No</th>
              <th class="inklusi-header" style="width: 22%;">Elemen / Unit</th>
              <th class="inklusi-header" style="width: 40%;">Alur Tujuan Pembelajaran (ATP) / Materi Pokok</th>
              <th class="inklusi-header" style="width: 9%;">JP</th>
              <th class="inklusi-header" style="width: 12%;">Bulan</th>
              <th class="inklusi-header" style="width: 12%;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${ganjilRows
              .map(
                (r, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="font-weight: bold;">${r.elemen}</td>
                <td>${r.tujuanPembelajaran}</td>
                <td style="text-align: center; font-weight: bold;">${r.alokasiJp} JP</td>
                <td>${r.bulanPelaksanaan}</td>
                <td>${r.keterangan}</td>
              </tr>`
              )
              .join('')}
            <tr style="background-color: #ECFDF5; font-weight: bold;">
              <td colspan="3" style="text-align: right;">SUBTOTAL SEMESTER I (GANJIL)</td>
              <td style="text-align: center;">${summary.totalJpGanjil} JP</td>
              <td colspan="2">${prota.identitas.mingguEfektifGanjil} Minggu Efektif</td>
            </tr>
          </tbody>
        </table>

        <div class="section-header">C. DISTRIBUSI ALUR TUJUAN PEMBELAJARAN — SEMESTER II (GENAP)</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 5%;">No</th>
              <th class="inklusi-header" style="width: 22%;">Elemen / Unit</th>
              <th class="inklusi-header" style="width: 40%;">Alur Tujuan Pembelajaran (ATP) / Materi Pokok</th>
              <th class="inklusi-header" style="width: 9%;">JP</th>
              <th class="inklusi-header" style="width: 12%;">Bulan</th>
              <th class="inklusi-header" style="width: 12%;">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            ${genapRows
              .map(
                (r, idx) => `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="font-weight: bold;">${r.elemen}</td>
                <td>${r.tujuanPembelajaran}</td>
                <td style="text-align: center; font-weight: bold;">${r.alokasiJp} JP</td>
                <td>${r.bulanPelaksanaan}</td>
                <td>${r.keterangan}</td>
              </tr>`
              )
              .join('')}
            <tr style="background-color: #ECFDF5; font-weight: bold;">
              <td colspan="3" style="text-align: right;">SUBTOTAL SEMESTER II (GENAP)</td>
              <td style="text-align: center;">${summary.totalJpGenap} JP</td>
              <td colspan="2">${prota.identitas.mingguEfektifGenap} Minggu Efektif</td>
            </tr>
            <tr style="background-color: #D9EAD3; font-weight: bold;">
              <td colspan="3" style="text-align: right;">TOTAL ALOKASI WAKTU 1 TAHUN PELAJARAN</td>
              <td style="text-align: center;">${summary.totalJpTahunan} JP</td>
              <td colspan="2">${prota.identitas.mingguEfektifGanjil + prota.identitas.mingguEfektifGenap} Minggu Efektif / Tahun</td>
            </tr>
          </tbody>
        </table>

        <div class="section-header">D. CATATAN KALENDER PENDIDIKAN &amp; PELAKSANAAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px; text-align: justify;">${prota.catatanPelaksanaan}</div>

        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">E. INTEGRASI NILAI ISLAMI (${prota.integrasiNilaiIslami.surahAyat})</div>
        <div style="padding: 12px; border: 1.5px solid #15803D; background-color: #F0FDF4; margin-bottom: 12px;">
          <div dir="rtl" style="font-family: 'Traditional Arabic', 'Times New Roman', serif; font-size: 16pt; line-height: 1.8; text-align: right; color: #064E3B; margin-bottom: 8px;">${prota.integrasiNilaiIslami.teksArab}</div>
          <p style="margin: 4px 0;"><b>Artinya (${prota.integrasiNilaiIslami.surahAyat}):</b> <i>"${prota.integrasiNilaiIslami.terjemahan}"</i></p>
          <p style="margin: 6px 0 0 0;"><b>Relevansi terhadap Program Tahunan:</b> ${prota.integrasiNilaiIslami.relevansiProta}</p>
        </div>
      `;
    } else if (shouldRenderStructuredProsem(activeDoc)) {
      const prosem = resolveProsemData(activeDoc);
      const summary = calculateProsemSummary(prosem);
      const months = getProsemMonths(prosem.identitas.semester);
      const jpPerMinggu = Number(prosem.identitas.jpPerMinggu) || 3;
      const cellBgByJenis = (jenis: string) =>
        jenis === 'Asesmen'
          ? '#FEF3C7'
          : jenis === 'Proyek'
          ? '#DBEAFE'
          : jenis === 'Remedial'
          ? '#F3E8FF'
          : '#D1FAE5';
      finalHtmlContent = `
        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">IDENTITAS PROGRAM SEMESTER (PROSEM)</div>
        <table>
          <tr><td class="label-cell">Satuan Pendidikan</td><td class="val-cell">${prosem.identitas.satuanPendidikan}</td></tr>
          <tr><td class="label-cell">Mata Pelajaran</td><td class="val-cell"><b>${prosem.identitas.mataPelajaran}</b></td></tr>
          <tr><td class="label-cell">Fase / Kelas</td><td class="val-cell">${prosem.identitas.fase} / Kelas ${prosem.identitas.kelas}</td></tr>
          <tr><td class="label-cell">Semester / Tahun Ajaran</td><td class="val-cell"><b>Semester ${prosem.identitas.semester}</b> / ${prosem.identitas.tahunAjaran}</td></tr>
          <tr><td class="label-cell">Beban Belajar</td><td class="val-cell"><b>${jpPerMinggu} JP / Minggu</b> (${summary.totalPekanEfektif} Pekan Efektif &bull; Target ${summary.targetJpEfektif} JP)</td></tr>
          <tr><td class="label-cell">Total Terjadwal di Matriks</td><td class="val-cell"><b>${summary.totalJpMatriks} JP</b> (${summary.jumlahUnit} Unit ATP / Kegiatan)</td></tr>
          <tr><td class="label-cell">Fokus Semester</td><td class="val-cell">${prosem.identitas.fokusSemester}</td></tr>
          <tr><td class="label-cell">Guru Penyusun</td><td class="val-cell">${prosem.identitas.namaPenyusun}</td></tr>
        </table>

        <div class="section-header">A. RINCIAN PEKAN EFEKTIF (RPE) — SEMESTER ${prosem.identitas.semester.toUpperCase()}</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" style="width: 6%;">No</th>
              <th class="inklusi-header" style="width: 18%;">Bulan</th>
              <th class="inklusi-header" style="width: 12%;">Jml Pekan</th>
              <th class="inklusi-header" style="width: 14%;">Tdk Efektif</th>
              <th class="inklusi-header" style="width: 12%;">Efektif</th>
              <th class="inklusi-header" style="width: 12%;">Jam Efektif</th>
              <th class="inklusi-header" style="width: 26%;">Keterangan Kalender</th>
            </tr>
          </thead>
          <tbody>
            ${prosem.rincianPekanEfektif
              .map((r, idx) => {
                const efektif = Math.max(0, (Number(r.jumlahPekan) || 0) - (Number(r.pekanTidakEfektif) || 0));
                return `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td style="font-weight: bold;">${r.bulan}</td>
                <td style="text-align: center;">${r.jumlahPekan}</td>
                <td style="text-align: center;">${r.pekanTidakEfektif}</td>
                <td style="text-align: center; font-weight: bold; color: #15803D;">${efektif}</td>
                <td style="text-align: center; font-weight: bold;">${efektif * jpPerMinggu} JP</td>
                <td>${r.keteranganTidakEfektif || '-'}</td>
              </tr>`;
              })
              .join('')}
            <tr style="background-color: #ECFDF5; font-weight: bold;">
              <td colspan="2" style="text-align: right;">TOTAL SEMESTER ${prosem.identitas.semester.toUpperCase()}</td>
              <td style="text-align: center;">${summary.totalPekan}</td>
              <td style="text-align: center;">${summary.totalPekanTidakEfektif}</td>
              <td style="text-align: center; color: #15803D;">${summary.totalPekanEfektif}</td>
              <td style="text-align: center; color: #15803D;">${summary.targetJpEfektif} JP</td>
              <td>${jpPerMinggu} JP / Pekan Efektif</td>
            </tr>
          </tbody>
        </table>

        <div class="section-header">B. MATRIKS DISTRIBUSI MINGGUAN (BULAN &times; PEKAN M1–M4)</div>
        <table>
          <thead>
            <tr>
              <th class="inklusi-header" rowspan="2" style="width: 4%;">No</th>
              <th class="inklusi-header" rowspan="2" style="width: 26%;">Elemen / Tujuan Pembelajaran (ATP)</th>
              <th class="inklusi-header" rowspan="2" style="width: 6%;">JP</th>
              ${months.map((m) => `<th class="inklusi-header" colspan="4" style="font-size: 8pt;">${m.substring(0, 3)}</th>`).join('')}
            </tr>
            <tr>
              ${months
                .map(() =>
                  PROSEM_WEEKS.map((w) => `<th class="inklusi-header" style="font-size: 7pt; padding: 2px;">${w}</th>`).join('')
                )
                .join('')}
            </tr>
          </thead>
          <tbody>
            ${prosem.distribusiMingguan
              .map((row, idx) => {
                const rowSum = Object.values(row.mingguAktif || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                const bg = cellBgByJenis(row.jenisKegiatan);
                return `
              <tr>
                <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                <td><b>${row.elemen}</b> <span style="font-size: 7.5pt; color: #475569;">(${row.jenisKegiatan})</span><br/>${row.tujuanPembelajaran}</td>
                <td style="text-align: center; font-weight: bold;">${rowSum || row.alokasiJp}</td>
                ${months
                  .map((m) =>
                    PROSEM_WEEKS.map((w) => {
                      const val = row.mingguAktif?.[getProsemWeekKey(m, w)] || 0;
                      return `<td style="text-align: center; font-size: 7.5pt; padding: 2px; ${val > 0 ? `background-color: ${bg}; font-weight: bold;` : ''}">${val > 0 ? val : ''}</td>`;
                    }).join('')
                  )
                  .join('')}
              </tr>`;
              })
              .join('')}
            <tr style="background-color: #D9EAD3; font-weight: bold;">
              <td colspan="2" style="text-align: right;">TOTAL ALOKASI WAKTU MATRIKS SEMESTER ${prosem.identitas.semester.toUpperCase()}</td>
              <td style="text-align: center;">${summary.totalJpMatriks} JP</td>
              <td colspan="${months.length * 4}" style="text-align: left;">Target RPE: ${summary.targetJpEfektif} JP (${summary.totalPekanEfektif} Pekan Efektif &times; ${jpPerMinggu} JP/Mg)</td>
            </tr>
          </tbody>
        </table>

        <div class="section-header">C. CATATAN PELAKSANAAN &amp; FLEKSIBILITAS KALENDER</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px; text-align: justify;">${prosem.catatanPelaksanaan}</div>

        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">D. INTEGRASI NILAI ISLAMI (${prosem.integrasiNilaiIslami.surahAyat})</div>
        <div style="padding: 12px; border: 1.5px solid #15803D; background-color: #F0FDF4; margin-bottom: 12px;">
          <div dir="rtl" style="font-family: 'Traditional Arabic', 'Times New Roman', serif; font-size: 16pt; line-height: 1.8; text-align: right; color: #064E3B; margin-bottom: 8px;">${prosem.integrasiNilaiIslami.teksArab}</div>
          <p style="margin: 4px 0;"><b>Artinya (${prosem.integrasiNilaiIslami.surahAyat}):</b> <i>"${prosem.integrasiNilaiIslami.terjemahan}"</i></p>
          <p style="margin: 6px 0 0 0;"><b>Relevansi terhadap Program Semester:</b> ${prosem.integrasiNilaiIslami.relevansiProsem}</p>
        </div>
      `;
    } else if (activeDoc.kontenJson && activeDoc.kontenJson.informasiUmum) {
      const q = activeDoc.kontenJson;
      const ayat = resolveModulAyat(q, activeDoc.mataPelajaran, activeDoc.judul.replace(/^MODUL AJAR.*?:\s*/i, ''));
      const dimensiList = (q.dimensiProfilLulusan && q.dimensiProfilLulusan.length > 0)
        ? q.dimensiProfilLulusan
        : (q.profilPelajarPancasila || []);
      const prinsipList = q.pengalamanBelajarMendalam?.prinsipPembelajaran?.length
        ? q.pengalamanBelajarMendalam.prinsipPembelajaran
        : PRINSIP_PEMBELAJARAN_MENDALAM;

      finalHtmlContent = `
        <div class="section-header">A. INFORMASI UMUM</div>
        <table>
          <tr><td class="label-cell">Nama Penyusun</td><td class="val-cell">${q.informasiUmum.namaPenyusun || activeDoc.guruNama}</td></tr>
          <tr><td class="label-cell">Nama Sekolah</td><td class="val-cell">${q.informasiUmum.namaSekolah}</td></tr>
          <tr><td class="label-cell">Mata Pelajaran</td><td class="val-cell">${q.informasiUmum.mataPelajaran}</td></tr>
          <tr><td class="label-cell">Fase / Kelas</td><td class="val-cell">Fase ${q.informasiUmum.fase} / Kelas ${q.informasiUmum.kelas}</td></tr>
          <tr><td class="label-cell">Semester</td><td class="val-cell">${q.informasiUmum.semester}</td></tr>
          <tr><td class="label-cell">Tahun Ajaran</td><td class="val-cell">${q.informasiUmum.tahunAjaran}</td></tr>
          <tr><td class="label-cell">Alokasi Waktu</td><td class="val-cell">${q.informasiUmum.alokasiWaktu}</td></tr>
          <tr><td class="label-cell">Materi Pokok</td><td class="val-cell"><b>${q.informasiUmum.materi}</b></td></tr>
        </table>

        <div class="section-header" style="background-color: #D9EAD3; color: #14532D;">INTEGRASI AYAT AL-QUR'AN SESUAI MATERI (${ayat.surahAyat})</div>
        <div style="padding: 12px; border: 1.5px solid #15803D; background-color: #F0FDF4; margin-bottom: 12px;">
          <div dir="rtl" style="font-family: 'Traditional Arabic', 'Times New Roman', serif; font-size: 16pt; line-height: 1.8; text-align: right; color: #064E3B; margin-bottom: 8px;">${ayat.teksArab}</div>
          <p style="margin: 4px 0;"><b>Artinya (${ayat.surahAyat}):</b> <i>"${ayat.terjemahan}"</i></p>
          <p style="margin: 6px 0 0 0;"><b>Tadabbur &amp; Relevansi Materi:</b> ${(ayat.kaitanMateri || '-').replace(/\n/g, '<br/>')}</p>
        </div>

        <div class="section-header">B. IDENTIFIKASI KESIAPAN &amp; KOMPETENSI AWAL</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">${(q.kompetensiAwal || '-').replace(/\n/g, '<br/>')}</div>

        <div class="section-header">C. 8 DIMENSI PROFIL LULUSAN (PEMBELAJARAN MENDALAM)</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <ul>
            ${dimensiList.map((p: string) => `<li>${p}</li>`).join('') || '<li>-</li>'}
          </ul>
        </div>

        <div class="section-header">D. SARANA DAN PRASARANA</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <ul>
            ${(q.saranaPrasarana || []).map((s: string) => `<li>${s}</li>`).join('') || '<li>-</li>'}
          </ul>
        </div>

        <div class="section-header">E. TARGET PESERTA DIDIK</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">Target: <b>${q.targetPesertaDidik || 'Reguler'}</b></div>

        <div class="section-header">F. DESAIN &amp; KERANGKA PEMBELAJARAN MENDALAM</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <p><b>Model Pembelajaran:</b> ${q.modelPembelajaran || 'Problem Based Learning (Pembelajaran Mendalam)'}</p>
          ${q.capaianPembelajaran ? `<p><b>Capaian Pembelajaran (CP):</b> ${q.capaianPembelajaran.replace(/\n/g, '<br/>')}</p>` : ''}
          ${q.lintasDisiplinIlmu ? `<p><b>Lintas Disiplin Ilmu:</b> ${q.lintasDisiplinIlmu.replace(/\n/g, '<br/>')}</p>` : ''}
          ${q.kerangkaPembelajaran ? `
            <p><b>1. Praktik Pedagogis:</b> ${q.kerangkaPembelajaran.praktikPedagogis || '-'}</p>
            <p><b>2. Kemitraan Pembelajaran:</b> ${q.kerangkaPembelajaran.kemitraanPembelajaran || '-'}</p>
            <p><b>3. Lingkungan Pembelajaran:</b> ${q.kerangkaPembelajaran.lingkunganPembelajaran || '-'}</p>
            <p><b>4. Pemanfaatan Digital:</b> ${q.kerangkaPembelajaran.pemanfaatanDigital || '-'}</p>
          ` : ''}
        </div>

        <div class="section-header">G. TUJUAN PEMBELAJARAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <ol>
            ${(q.tujuanPembelajaran || []).map((tp: string) => `<li>${tp}</li>`).join('') || '<li>-</li>'}
          </ol>
        </div>

        <div class="section-header">H. PEMAHAMAN BERMAKNA</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">${(q.pemahamanBermakna || '-').replace(/\n/g, '<br/>')}</div>

        <div class="section-header">I. PERTANYAAN PEMANTIK</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <ul>
            ${(q.pertanyaanPemantik || []).map((pp: string) => `<li>${pp}</li>`).join('') || '<li>-</li>'}
          </ul>
        </div>

        <div class="section-header">J. PENGALAMAN BELAJAR MENDALAM &amp; KEGIATAN PEMBELAJARAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <p><b>Prinsip Pembelajaran Mendalam:</b> ${prinsipList.join(' • ')}</p>
          ${q.pengalamanBelajarMendalam ? `
            <p><b>• Tahap Memahami:</b> ${(q.pengalamanBelajarMendalam.memahami || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>• Tahap Mengaplikasi:</b> ${(q.pengalamanBelajarMendalam.mengaplikasi || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>• Tahap Merefleksi:</b> ${(q.pengalamanBelajarMendalam.merefleksi || '-').replace(/\n/g, '<br/>')}</p>
            <hr/>
          ` : ''}
          <p><b>1. Pendahuluan (${q.kegiatanPembelajaran.pendahuluan.durasi || '15 Menit'}):</b></p>
          <p>${(q.kegiatanPembelajaran.pendahuluan.deskripsi || '-').replace(/\n/g, '<br/>')}</p>
          
          <p><b>2. Kegiatan Inti (${q.kegiatanPembelajaran.inti.durasi || '50 Menit'}):</b></p>
          <p>${(q.kegiatanPembelajaran.inti.deskripsi || '-').replace(/\n/g, '<br/>')}</p>

          <p><b>3. Penutup (${q.kegiatanPembelajaran.penutup.durasi || '15 Menit'}):</b></p>
          <p>${(q.kegiatanPembelajaran.penutup.deskripsi || '-').replace(/\n/g, '<br/>')}</p>
        </div>

        <div class="section-header">K. ASESMEN PEMBELAJARAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <p><b>Asesmen Awal (Diagnostik):</b> ${(q.asesmen.diagnostik || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Asesmen Proses (Formatif):</b> ${(q.asesmen.formatif || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Asesmen Akhir (Sumatif):</b> ${(q.asesmen.sumatif || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Teknik Asesmen:</b> ${q.asesmen.teknik || '-'}</p>
          <p><b>Instrumen:</b> ${q.asesmen.instrumen || '-'}</p>
          <p><b>Rubrik Penilaian:</b> ${(q.asesmen.rubrik || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Kriteria Penilaian:</b> ${(q.asesmen.kriteriaPenilaian || '-').replace(/\n/g, '<br/>')}</p>
        </div>

        <div class="section-header">L. DIFERENSIASI &amp; INKLUSI PEMBELAJARAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <p><b>Diferensiasi Konten:</b> ${(q.diferensiasi.konten || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Diferensiasi Proses:</b> ${(q.diferensiasi.proses || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Diferensiasi Produk:</b> ${(q.diferensiasi.produk || '-').replace(/\n/g, '<br/>')}</p>
        </div>

        <div class="section-header">M. REMEDIAL</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">${(q.remedial || '-').replace(/\n/g, '<br/>')}</div>

        <div class="section-header">N. PENGAYAAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">${(q.pengayaan || '-').replace(/\n/g, '<br/>')}</div>

        <div class="section-header">O. REFLEKSI GURU</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">${(q.refleksiGuru || '-').replace(/\n/g, '<br/>')}</div>

        <div class="section-header">P. REFLEKSI PESERTA DIDIK</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">${(q.refleksiPesertaDidik || '-').replace(/\n/g, '<br/>')}</div>

        <div class="section-header">Q. LAMPIRAN</div>
        <div style="padding: 10px; border: 1px solid #000; margin-bottom: 10px;">
          <p><b>LKPD:</b> ${(q.lampiran.lkpd || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Bahan Bacaan Guru &amp; Peserta Didik:</b> ${(q.lampiran.bahanBacaan || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Rubrik Penilaian:</b> ${(q.lampiran.rubrik || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Instrumen Asesmen:</b> ${(q.lampiran.instrumenAsesmen || '-').replace(/\n/g, '<br/>')}</p>
          <p><b>Daftar Pustaka:</b> ${(q.lampiran.daftarPustaka || '-').replace(/\n/g, '<br/>')}</p>
        </div>
      `;
    } else {
      // Process content: Replace section headers with styled divs
      let processedContent = text;
      const sectionList = [
        'A. IDENTITAS', 
        'B. IDENTIFIKASI', 
        'C. DESAIN PEMBELAJARAN', 
        'D. PENGALAMAN BELAJAR', 
        'E. ASESMEN', 
        'F. RENCANA REMEDIAL DAN PENGAYAAN', 
        'G. PENYESUAIAN ASESMEN UNTUK PESERTA DIDIK INKLUSI', 
        'I. REFLEKSI'
      ];

      sectionList.forEach(s => {
        processedContent = processedContent.replace(new RegExp(`^${s.replace('.', '\\.')}`, 'gm'), `|||SECTION|||${s}|||`);
      });

      // Helper to format tables in the text
      const formatTables = (content: string) => {
        return content.replace(/^(.+?\|.+?)\n[|\s-]+\n((?:.*\|.*\n?)*)/gm, (match, header, body) => {
          const rows = body.trim().split('\n');
          const headerCols = header.split('|').map(c => `<td class="inklusi-header">${c.trim()}</td>`).join('');
          const bodyRows = rows.map(r => `<tr>${r.split('|').map(c => `<td>${c.trim()}</td>`).join('')}</tr>`).join('');
          return `<table style="width:100%; border-collapse:collapse; border:1px solid #000; margin:10px 0;"><thead><tr>${headerCols}</tr></thead><tbody>${bodyRows}</tbody></table>`;
        });
      };

      const sections = processedContent.split('|||SECTION|||');

      sections.forEach(section => {
        if (!section.trim()) return;
        if (section.startsWith('A. IDENTITAS') || section.startsWith('B. IDENTIFIKASI') || section.startsWith('C. DESAIN PEMBELAJARAN') || section.startsWith('D. PENGALAMAN BELAJAR') || section.startsWith('E. ASESMEN') || section.startsWith('F. RENCANA REMEDIAL DAN PENGAYAAN') || section.startsWith('G. PENYESUAIAN ASESMEN UNTUK PESERTA DIDIK INKLUSI') || section.startsWith('I. REFLEKSI')) {
          const [title, ...contentLines] = section.split('|||');
          const content = contentLines.join('|||').trim();
          finalHtmlContent += `<div class="section-header">${title}</div>`;
          
          if (title.includes('A. IDENTITAS')) {
            // Format Identitas as a specific table
            const lines = content.split('\n');
            let tableHtml = '<table>';
            lines.forEach(line => {
              if (line.includes(':')) {
                const [label, val] = line.split(':');
                tableHtml += `<tr><td class="label-cell">${label.trim()}</td><td class="val-cell">${val.trim()}</td></tr>`;
              }
            });
            tableHtml += '</table>';
            finalHtmlContent += tableHtml;
          } else {
            finalHtmlContent += `<div style="margin-bottom:15px; padding-left:5px;">${formatTables(content).replace(/\n/g, '<br/>')}</div>`;
          }
        } else {
          finalHtmlContent += `<div>${formatTables(section).replace(/\n/g, '<br/>')}</div>`;
        }
      });
    }

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <title>${activeDoc.judul}</title>
        <style>
          @page { margin: 2cm; }
          body { font-family: 'Arial', sans-serif; font-size: 10pt; line-height: 1.4; color: #000; }
          .header-table { width: 100%; border: none; margin-bottom: 20px; }
          .header-table td { border: none !important; padding: 0 !important; }
          .section-header { 
            background-color: #92D050; 
            font-weight: bold; 
            padding: 5px 10px; 
            border: 1px solid #000;
            margin-top: 15px;
            margin-bottom: 8px;
            text-transform: uppercase;
            font-size: 11pt;
          }
          table { width: 100%; border-collapse: collapse; margin-top: 5px; }
          table, th, td { border: 1px solid #000; }
          td { padding: 5px 8px; vertical-align: top; font-size: 9pt; }
          .label-cell { background-color: #FFFF00; font-weight: bold; width: 30%; }
          .val-cell { width: 70%; }
          .inklusi-header { background-color: #B4C6E7; font-weight: bold; text-align: center; }
          .footer-table { border: none !important; margin-top: 40px; }
          .footer-table td { border: none !important; text-align: center; font-size: 10pt; padding: 10px !important; }
        </style>
      </head>
      <body>
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="font-size: 14pt; font-weight: bold;">${
            activeDoc.tipe === 'cp'
              ? 'CAPAIAN PEMBELAJARAN (CP)'
              : activeDoc.tipe === 'atp'
              ? 'ALUR TUJUAN PEMBELAJARAN (ATP)'
              : activeDoc.tipe === 'kktp'
              ? 'KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)'
              : activeDoc.tipe === 'prota'
              ? 'PROGRAM TAHUNAN (PROTA)'
              : activeDoc.tipe === 'prosem'
              ? 'PROGRAM SEMESTER (PROSEM)'
              : activeDoc.tipe === 'modul_ajar'
              ? 'MODUL AJAR PEMBELAJARAN MENDALAM (DEEP LEARNING)'
              : activeDoc.tipe.toUpperCase().replace('_', ' ')
          }</div>
          <div style="font-size: 10pt; font-weight: bold; color: #15803D;">${
            activeDoc.tipe === 'cp'
              ? 'STANDAR BSKAP KEMENDIKDASMEN • PENDEKATAN PEMBELAJARAN MENDALAM'
              : activeDoc.tipe === 'atp'
              ? 'SEKUENSIAL KOMPETENSI, ALOKASI JP, 8 DIMENSI PROFIL LULUSAN &amp; ASESMEN'
              : activeDoc.tipe === 'kktp'
              ? 'PANDUAN PEMBELAJARAN &amp; ASESMEN (PPA) BSKAP KEMENDIKDASMEN'
              : activeDoc.tipe === 'prota'
              ? 'DISTRIBUSI ALUR TUJUAN PEMBELAJARAN &amp; ALOKASI WAKTU 1 TAHUN PELAJARAN'
              : activeDoc.tipe === 'prosem'
              ? 'RINCIAN PEKAN EFEKTIF (RPE) &amp; MATRIKS DISTRIBUSI MINGGUAN'
              : activeDoc.tipe === 'modul_ajar'
              ? 'TERINTEGRASI AYAT AL-QUR\'AN &amp; 8 DIMENSI PROFIL LULUSAN'
              : 'PERANGKAT ADMINISTRASI GURU • KURIKULUM NASIONAL'
          }</div>
          <div style="font-size: 12pt; font-weight: bold; margin-top: 4px;">${(schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase()}</div>
          <div style="font-size: 11pt; font-weight: bold;">TAHUN AJARAN ${activeDoc.tahunAjaran} (${activeDoc.semester.toUpperCase()})</div>
        </div>

        ${finalHtmlContent}

        <table class="footer-table" style="width: 100%;">
          <tr>
            <td style="width: 50%;">
              <p>Mengetahui,</p>
              <p><b>Kepala Sekolah</b></p>
              <br /><br /><br /><br />
              <p><u>${principalName}</u></p>
              <p>NIP. ${principalNip}</p>
            </td>
            <td style="width: 50%;">
              <p>Sawangan, ${new Date(activeDoc.tanggalInput).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><b>Guru Mata Pelajaran</b></p>
              <br /><br /><br /><br />
              <p><u>${activeDoc.guruNama}</u></p>
              <p>NIP. ${docGuruNip}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.judul.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    a.click();
  };

  const handleDownloadTxt = () => {
    if (!activeDoc) return;
    const text = shouldRenderStructuredCp(activeDoc)
      ? formatCpToPlainText(resolveCpData(activeDoc))
      : shouldRenderStructuredAtp(activeDoc)
      ? formatAtpToPlainText(resolveAtpData(activeDoc))
      : shouldRenderStructuredKktp(activeDoc)
      ? formatKktpToPlainText(resolveKktpData(activeDoc))
      : shouldRenderStructuredProta(activeDoc)
      ? formatProtaToPlainText(resolveProtaData(activeDoc))
      : shouldRenderStructuredProsem(activeDoc)
      ? formatProsemToPlainText(resolveProsemData(activeDoc))
      : (activeDoc.content || activeDoc.deskripsi);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.judul.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    a.click();
  };

  const writePrintContent = (doc: Document, text: string) => {
    if (!activeDoc) return;

    // Find teacher of active document in guruList to get their actual NIP / NUPTK
    const docGuru = guruList?.find(g => g.nama.toLowerCase() === activeDoc.guruNama.toLowerCase());
    const docGuruNip = docGuru ? (docGuru.nip || '-') : '-';

    doc.write(`
      <html>
      <head>
        <title>${activeDoc.judul}</title>
        <style>
          @page {
            size: A4;
            margin: 20mm;
          }
          body {
            font-family: 'Arial', 'Helvetica Neue', sans-serif;
            color: #1e293b;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #fff;
          }
          .kop-surat {
            text-align: center;
            border-bottom: 4px double #059669;
            padding-bottom: 12px;
            margin-bottom: 25px;
          }
          .kop-surat h1 {
            font-size: 16pt;
            margin: 0;
            color: #059669;
            text-transform: uppercase;
            font-weight: bold;
          }
          .kop-surat h2 {
            font-size: 11pt;
            margin: 4px 0 0 0;
            color: #475569;
            font-weight: normal;
            letter-spacing: 0.5px;
          }
          .document-title {
            text-align: center;
            font-size: 14pt;
            font-weight: bold;
            color: #0f172a;
            margin: 10px 0 20px 0;
            text-transform: uppercase;
          }
          .table-info {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
            font-size: 10pt;
          }
          .table-info td {
            padding: 6px 4px;
            vertical-align: top;
          }
          .table-info td.label {
            font-weight: bold;
            width: 25%;
            color: #334155;
          }
          .table-info td.colon {
            width: 3%;
            text-align: center;
            color: #64748b;
          }
          .table-info td.val {
            color: #0f172a;
          }
          .content-title {
            font-size: 12pt;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 2px solid #10b981;
            padding-bottom: 4px;
            margin-top: 25px;
            margin-bottom: 12px;
            text-transform: uppercase;
          }
          .content-box {
            font-family: 'Consolas', 'Courier New', monospace;
            white-space: pre-wrap;
            font-size: 9.5pt;
            background: #fafafa;
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 8px;
            line-height: 1.6;
            color: #1e293b;
          }
          .cp-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 9.5pt;
          }
          .cp-table th {
            background: #065f46;
            color: #ffffff;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #064e3b;
            font-weight: bold;
          }
          .cp-table td {
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            vertical-align: top;
            line-height: 1.5;
          }
          .cp-table tr {
            page-break-inside: avoid;
          }
          .signatures {
            width: 100%;
            margin-top: 50px;
            border: none;
            page-break-inside: avoid;
          }
          .signatures td {
            width: 50%;
            text-align: center;
            font-size: 10pt;
            color: #1e293b;
          }
          .signatures p {
            margin: 4px 0;
          }
        </style>
      </head>
      <body>
        <div class="kop-surat">
          <h1>${(schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR').toUpperCase()}</h1>
          <h2>${
            activeDoc.tipe === 'cp'
              ? 'CAPAIAN PEMBELAJARAN (CP) • STANDAR BSKAP KEMENDIKDASMEN'
              : activeDoc.tipe === 'atp'
              ? 'ALUR TUJUAN PEMBELAJARAN (ATP) • SEKUENSIAL KOMPETENSI, ALOKASI JP &amp; PROFIL LULUSAN'
              : activeDoc.tipe === 'kktp'
              ? 'KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP) • PANDUAN PEMBELAJARAN &amp; ASESMEN'
              : activeDoc.tipe === 'prota'
              ? 'PROGRAM TAHUNAN (PROTA) • DISTRIBUSI ALUR TUJUAN PEMBELAJARAN &amp; ALOKASI WAKTU'
              : activeDoc.tipe === 'prosem'
              ? 'PROGRAM SEMESTER (PROSEM) • RINCIAN PEKAN EFEKTIF &amp; MATRIKS DISTRIBUSI MINGGUAN'
              : activeDoc.tipe === 'modul_ajar'
              ? 'MODUL AJAR PEMBELAJARAN MENDALAM (DEEP LEARNING) • TERINTEGRASI AYAT AL-QUR\'AN'
              : 'PERANGKAT ADMINISTRASI GURU • STANDAR KURIKULUM NASIONAL'
          }</h2>
        </div>
        
        <div class="document-title">
          ${activeDoc.judul}
        </div>
        
        <table class="table-info">
          <tr>
            <td class="label">Mata Pelajaran</td>
            <td class="colon">:</td>
            <td class="val" style="font-weight: bold; color: #059669;">${activeDoc.mataPelajaran}</td>
          </tr>
          <tr>
            <td class="label">Kelas / Rombel</td>
            <td class="colon">:</td>
            <td class="val">Kelas ${activeDoc.kelas}</td>
          </tr>
          <tr>
            <td class="label">Jenis Perangkat</td>
            <td class="colon">:</td>
            <td class="val" style="text-transform: uppercase;">${
              activeDoc.tipe === 'cp'
                ? 'CAPAIAN PEMBELAJARAN (CP)'
                : activeDoc.tipe === 'atp'
                ? 'ALUR TUJUAN PEMBELAJARAN (ATP)'
                : activeDoc.tipe === 'kktp'
                ? 'KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)'
                : activeDoc.tipe === 'prota'
                ? 'PROGRAM TAHUNAN (PROTA)'
                : activeDoc.tipe === 'prosem'
                ? 'PROGRAM SEMESTER (PROSEM)'
                : activeDoc.tipe === 'modul_ajar'
                ? 'MODUL AJAR PEMBELAJARAN MENDALAM'
                : activeDoc.tipe.replace('_', ' ')
            }</td>
          </tr>
          <tr>
            <td class="label">Tahun Ajaran</td>
            <td class="colon">:</td>
            <td class="val">${activeDoc.tahunAjaran} (${activeDoc.semester})</td>
          </tr>
          <tr>
            <td class="label">Guru Penyusun</td>
            <td class="colon">:</td>
            <td class="val" style="font-weight: bold;">${activeDoc.guruNama}</td>
          </tr>
          <tr>
            <td class="label">Status Pengesahan</td>
            <td class="colon">:</td>
            <td class="val" style="font-weight: bold; color: #15803d;">${activeDoc.status}</td>
          </tr>
        </table>
        
        ${shouldRenderStructuredCp(activeDoc) ? (() => {
          const cp = resolveCpData(activeDoc);
          return `
          <div class="content-title">A. RASIONAL MATA PELAJARAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; text-align: justify;">${cp.rasional}</div>

          <div class="content-title">B. TUJUAN MATA PELAJARAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <ol style="margin: 0; padding-left: 20px;">
              ${cp.tujuanMataPelajaran.map((t) => `<li style="margin-bottom: 4px;">${t}</li>`).join('')}
            </ol>
          </div>

          <div class="content-title">C. KARAKTERISTIK MATA PELAJARAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; text-align: justify;">${cp.karakteristik}</div>

          <div class="content-title">D. CAPAIAN PEMBELAJARAN UMUM (${cp.identitas.fase.toUpperCase()})</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; background: #ecfdf5; border: 1.5px solid #10b981; text-align: justify;">${cp.capaianUmumFase}</div>

          <div class="content-title">E. CAPAIAN PEMBELAJARAN PER ELEMEN</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 6%; text-align: center;">No</th>
                <th style="width: 22%;">Elemen</th>
                <th style="width: 44%;">Capaian Pembelajaran (CP)</th>
                <th style="width: 28%;">Kompetensi &amp; Lingkup Materi</th>
              </tr>
            </thead>
            <tbody>
              ${cp.elemenList
                .map(
                  (el, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: bold; color: #065f46;">${el.elemen}</td>
                  <td style="text-align: justify;">${el.deskripsiCp}</td>
                  <td>
                    <div><b>Kompetensi:</b> ${el.kompetensiInti}</div>
                    <div style="margin-top: 4px;"><b>Materi:</b> ${el.lingkupMateri}</div>
                  </td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>

          <div class="content-title" style="color: #065f46; border-bottom-color: #059669;">F. 8 DIMENSI PROFIL LULUSAN &amp; INTEGRASI NILAI ISLAMI (${cp.integrasiNilaiIslami.surahAyat})</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; background: #ecfdf5; border: 1.5px solid #10b981;">
            <p style="margin: 0 0 8px 0;"><b>Dimensi Profil Lulusan:</b> ${cp.dimensiProfilLulusan.join(' • ')}</p>
            <div dir="rtl" style="font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif; font-size: 18pt; line-height: 2; text-align: right; color: #064e3b; margin-bottom: 10px;">${cp.integrasiNilaiIslami.teksArab}</div>
            <p style="margin: 0 0 8px 0; font-style: italic; color: #065f46;"><b>Artinya (${cp.integrasiNilaiIslami.surahAyat}):</b> "${cp.integrasiNilaiIslami.terjemahan}"</p>
            <p style="margin: 0; color: #1e293b;"><b>Relevansi terhadap CP:</b> ${cp.integrasiNilaiIslami.relevansiCp}</p>
          </div>
          `;
        })() : shouldRenderStructuredKktp(activeDoc) ? (() => {
          const kktp = resolveKktpData(activeDoc);
          return `
          <div class="content-title">A. CAPAIAN &amp; TUJUAN PEMBELAJARAN YANG DIUKUR</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <p style="margin: 0 0 8px 0;"><b>Topik / Materi:</b> ${kktp.identitas.topikMateri} &nbsp;|&nbsp; <b>Batas Ketuntasan:</b> Minimal Cakap (&ge; ${kktp.identitas.batasMinimalPersen}%)</p>
            <p style="margin: 0 0 8px 0; text-align: justify;"><b>Capaian Pembelajaran (CP):</b> ${kktp.capaianPembelajaranRingkas}</p>
            <p style="margin: 0 0 4px 0;"><b>Tujuan Pembelajaran (TP):</b></p>
            <ol style="margin: 0; padding-left: 20px;">
              ${kktp.tujuanPembelajaran.map((tp) => `<li style="margin-bottom: 4px;">${tp}</li>`).join('')}
            </ol>
          </div>

          <div class="content-title">B. RUBRIK KETERCAPAIAN TUJUAN PEMBELAJARAN (4 LEVEL PENGUASAAN)</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">No</th>
                <th style="width: 19%;">Aspek / Indikator</th>
                <th style="width: 19%; background: #9f1239;">Baru Berkembang (1)</th>
                <th style="width: 19%; background: #b45309;">Layak (2)</th>
                <th style="width: 19%; background: #1d4ed8;">Cakap (3 — Tuntas)</th>
                <th style="width: 19%; background: #065f46;">Mahir (4 — Unggul)</th>
              </tr>
            </thead>
            <tbody>
              ${kktp.rubrikPenilaian
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: bold; color: #0f172a;">${r.aspek}</td>
                  <td>${r.baruBerkembang}</td>
                  <td>${r.layak}</td>
                  <td>${r.cakap}</td>
                  <td>${r.mahir}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>

          <div class="content-title">C. SKALA INTERVAL NILAI &amp; TINDAK LANJUT INTERVENSI</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 14%; text-align: center;">Interval Nilai</th>
                <th style="width: 24%;">Predikat</th>
                <th style="width: 16%; text-align: center;">Ketuntasan</th>
                <th style="width: 46%;">Tindak Lanjut / Intervensi Guru</th>
              </tr>
            </thead>
            <tbody>
              ${kktp.intervalNilai
                .map(
                  (iv) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${iv.rentang}</td>
                  <td style="font-weight: bold;">${iv.predikat}</td>
                  <td style="text-align: center; font-weight: bold; color: ${iv.ketuntasan === 'Tuntas' ? '#047857' : '#be123c'};">${iv.ketuntasan}</td>
                  <td>${iv.tindakLanjut}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>

          <div class="content-title">D. DESKRIPSI KRITERIA KETERCAPAIAN (CEKLIS)</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 6%; text-align: center;">No</th>
                <th style="width: 26%;">Kriteria Penilaian</th>
                <th style="width: 44%;">Bukti Ketercapaian (Memadai)</th>
                <th style="width: 12%; text-align: center;">Memadai</th>
                <th style="width: 12%; text-align: center;">Tidak</th>
              </tr>
            </thead>
            <tbody>
              ${kktp.deskripsiKriteria
                .map(
                  (d, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: bold;">${d.kriteria}</td>
                  <td>${d.targetMemadai}</td>
                  <td style="text-align: center;">&#9744;</td>
                  <td style="text-align: center;">&#9744;</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>

          <div class="content-title">E. KEPUTUSAN KETUNTASAN &amp; TINDAK LANJUT</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; background: #ecfdf5; border: 1.5px solid #10b981;">
            <p style="margin: 0 0 8px 0;"><b>Keputusan Ketuntasan:</b> ${kktp.keputusanKetuntasan}</p>
            <p style="margin: 0 0 8px 0;"><b>Program Remedial:</b> ${kktp.strategiRemedial}</p>
            <p style="margin: 0;"><b>Program Pengayaan:</b> ${kktp.strategiPengayaan}</p>
          </div>

          <div class="content-title" style="color: #065f46; border-bottom-color: #059669;">F. INTEGRASI NILAI ISLAMI (${kktp.integrasiNilaiIslami.surahAyat})</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; background: #ecfdf5; border: 1.5px solid #10b981;">
            <div dir="rtl" style="font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif; font-size: 18pt; line-height: 2; text-align: right; color: #064e3b; margin-bottom: 10px;">${kktp.integrasiNilaiIslami.teksArab}</div>
            <p style="margin: 0 0 8px 0; font-style: italic; color: #065f46;"><b>Artinya (${kktp.integrasiNilaiIslami.surahAyat}):</b> "${kktp.integrasiNilaiIslami.terjemahan}"</p>
            <p style="margin: 0; color: #1e293b;"><b>Relevansi terhadap KKTP:</b> ${kktp.integrasiNilaiIslami.relevansiKktp}</p>
          </div>
          `;
        })() : shouldRenderStructuredAtp(activeDoc) ? (() => {
          const atp = resolveAtpData(activeDoc);
          const summary = calculateAtpSummary(atp);
          const ganjilRows = atp.daftarAlur.filter((r) => r.semester === 'Ganjil');
          const genapRows = atp.daftarAlur.filter((r) => r.semester === 'Genap');
          const renderPrintAtpRows = (rows: typeof ganjilRows) =>
            rows
              .map(
                (r) => `
              <tr>
                <td style="text-align: center; font-weight: bold; color: #065f46;">${r.kodeTp}</td>
                <td style="font-weight: bold; color: #0f172a;">${r.elemen}</td>
                <td>${r.tujuanPembelajaran}</td>
                <td>${r.materiEsensial}</td>
                <td style="text-align: center; font-weight: bold;">${r.alokasiJp} JP</td>
                <td>${r.dimensiProfil}</td>
                <td><div>${r.strategiAsesmen}</div><div style="font-size: 8pt; color: #475569; margin-top: 3px;"><i>Kata Kunci: ${r.kataKunci}</i></div></td>
              </tr>`
              )
              .join('');
          return `
          <div class="content-title">A. RASIONAL ALUR &amp; CAPAIAN PEMBELAJARAN UMUM (${atp.identitas.fase.toUpperCase()})</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <p style="margin: 0 0 8px 0;"><b>Total TP:</b> ${summary.totalTp} TP (${summary.jumlahElemen} Elemen) &nbsp;|&nbsp; <b>Alokasi Waktu:</b> ${summary.totalJp} JP/Tahun (Sem. I: ${summary.totalJpGanjil} JP • Sem. II: ${summary.totalJpGenap} JP) &nbsp;|&nbsp; <b>Beban:</b> ${atp.identitas.jpPerMinggu} JP/Minggu</p>
            <p style="margin: 0 0 8px 0; text-align: justify;"><b>Rasional Alur:</b> ${atp.rasionalAlur}</p>
            <p style="margin: 0; text-align: justify;"><b>CP Umum:</b> ${atp.capaianPembelajaranUmum}</p>
          </div>

          <div class="content-title">B. MATRIKS ALUR TUJUAN PEMBELAJARAN — SEMESTER I (GANJIL)</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 9%; text-align: center;">Kode TP</th>
                <th style="width: 14%;">Elemen CP</th>
                <th style="width: 26%;">Rumusan Tujuan Pembelajaran (TP)</th>
                <th style="width: 15%;">Materi Esensial</th>
                <th style="width: 7%; text-align: center;">JP</th>
                <th style="width: 13%;">Profil Lulusan</th>
                <th style="width: 16%;">Asesmen &amp; Kata Kunci</th>
              </tr>
            </thead>
            <tbody>
              ${renderPrintAtpRows(ganjilRows)}
              <tr style="background: #ecfdf5; font-weight: bold;">
                <td colspan="4" style="text-align: right;">SUBTOTAL SEMESTER I (GANJIL) — ${summary.tpGanjil} TP</td>
                <td style="text-align: center; color: #047857;">${summary.totalJpGanjil} JP</td>
                <td colspan="2">Tersinkronisasi dengan Prota &amp; Prosem</td>
              </tr>
            </tbody>
          </table>

          <div class="content-title">C. MATRIKS ALUR TUJUAN PEMBELAJARAN — SEMESTER II (GENAP)</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 9%; text-align: center;">Kode TP</th>
                <th style="width: 14%;">Elemen CP</th>
                <th style="width: 26%;">Rumusan Tujuan Pembelajaran (TP)</th>
                <th style="width: 15%;">Materi Esensial</th>
                <th style="width: 7%; text-align: center;">JP</th>
                <th style="width: 13%;">Profil Lulusan</th>
                <th style="width: 16%;">Asesmen &amp; Kata Kunci</th>
              </tr>
            </thead>
            <tbody>
              ${renderPrintAtpRows(genapRows)}
              <tr style="background: #ecfdf5; font-weight: bold;">
                <td colspan="4" style="text-align: right;">SUBTOTAL SEMESTER II (GENAP) — ${summary.tpGenap} TP</td>
                <td style="text-align: center; color: #047857;">${summary.totalJpGenap} JP</td>
                <td colspan="2">Total 1 Tahun: ${summary.totalTp} TP • ${summary.totalJp} JP</td>
              </tr>
            </tbody>
          </table>

          <div class="content-title">D. GLOSARIUM ISTILAH KUNCI &amp; CATATAN IMPLEMENTASI</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 6%; text-align: center;">No</th>
                <th style="width: 26%;">Istilah Kunci</th>
                <th style="width: 68%;">Definisi Operasional</th>
              </tr>
            </thead>
            <tbody>
              ${atp.glosarium
                .map(
                  (g, i) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${i + 1}</td>
                  <td style="font-weight: bold;">${g.istilah}</td>
                  <td>${g.definisi}</td>
                </tr>`
                )
                .join('')}
            </tbody>
          </table>
          <div class="content-box" style="font-family: inherit; font-size: 9.5pt; margin-top: 8px;">
            <b>Catatan Implementasi Pembelajaran Mendalam:</b> ${atp.catatanImplementasi}
          </div>

          <div class="content-title" style="color: #065f46; border-bottom-color: #059669;">E. INTEGRASI NILAI ISLAMI (${atp.integrasiNilaiIslami.surahAyat})</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; background: #ecfdf5; border: 1.5px solid #10b981;">
            <div dir="rtl" style="font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif; font-size: 18pt; line-height: 2; text-align: right; color: #064e3b; margin-bottom: 10px;">${atp.integrasiNilaiIslami.teksArab}</div>
            <p style="margin: 0 0 8px 0; font-style: italic; color: #065f46;"><b>Artinya (${atp.integrasiNilaiIslami.surahAyat}):</b> "${atp.integrasiNilaiIslami.terjemahan}"</p>
            <p style="margin: 0; color: #1e293b;"><b>Relevansi terhadap ATP:</b> ${atp.integrasiNilaiIslami.relevansiAtp}</p>
          </div>
          `;
        })() : shouldRenderStructuredProta(activeDoc) ? (() => {
          const prota = resolveProtaData(activeDoc);
          const summary = calculateProtaSummary(prota);
          const ganjilRows = prota.distribusiSemester.filter((r) => r.semester === 'Ganjil');
          const genapRows = prota.distribusiSemester.filter((r) => r.semester === 'Genap');
          return `
          <div class="content-title">A. RINGKASAN BEBAN BELAJAR &amp; CAPAIAN TAHUNAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <p style="margin: 0 0 8px 0;"><b>Beban Belajar:</b> ${prota.identitas.jpPerMinggu} JP/Minggu &nbsp;|&nbsp; <b>Minggu Efektif:</b> Sem. I (${prota.identitas.mingguEfektifGanjil} Mg) + Sem. II (${prota.identitas.mingguEfektifGenap} Mg) &nbsp;|&nbsp; <b>Total:</b> ${summary.totalJpTahunan} JP/Tahun</p>
            <p style="margin: 0; text-align: justify;">${prota.capaianUmumTahunan}</p>
          </div>

          <div class="content-title">B. DISTRIBUSI ALUR TUJUAN PEMBELAJARAN — SEMESTER I (GANJIL)</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">No</th>
                <th style="width: 22%;">Elemen / Unit</th>
                <th style="width: 40%;">Alur Tujuan Pembelajaran (ATP) / Materi Pokok</th>
                <th style="width: 9%; text-align: center;">Alokasi</th>
                <th style="width: 12%;">Bulan</th>
                <th style="width: 12%;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${ganjilRows
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: bold; color: #065f46;">${r.elemen}</td>
                  <td>${r.tujuanPembelajaran}</td>
                  <td style="text-align: center; font-weight: bold;">${r.alokasiJp} JP</td>
                  <td>${r.bulanPelaksanaan}</td>
                  <td>${r.keterangan}</td>
                </tr>`
                )
                .join('')}
              <tr style="background: #ecfdf5; font-weight: bold;">
                <td colspan="3" style="text-align: right;">SUBTOTAL SEMESTER I (GANJIL)</td>
                <td style="text-align: center; color: #065f46;">${summary.totalJpGanjil} JP</td>
                <td colspan="2">${prota.identitas.mingguEfektifGanjil} Minggu Efektif</td>
              </tr>
            </tbody>
          </table>

          <div class="content-title">C. DISTRIBUSI ALUR TUJUAN PEMBELAJARAN — SEMESTER II (GENAP)</div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 5%; text-align: center;">No</th>
                <th style="width: 22%;">Elemen / Unit</th>
                <th style="width: 40%;">Alur Tujuan Pembelajaran (ATP) / Materi Pokok</th>
                <th style="width: 9%; text-align: center;">Alokasi</th>
                <th style="width: 12%;">Bulan</th>
                <th style="width: 12%;">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              ${genapRows
                .map(
                  (r, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: bold; color: #1d4ed8;">${r.elemen}</td>
                  <td>${r.tujuanPembelajaran}</td>
                  <td style="text-align: center; font-weight: bold;">${r.alokasiJp} JP</td>
                  <td>${r.bulanPelaksanaan}</td>
                  <td>${r.keterangan}</td>
                </tr>`
                )
                .join('')}
              <tr style="background: #eff6ff; font-weight: bold;">
                <td colspan="3" style="text-align: right;">SUBTOTAL SEMESTER II (GENAP)</td>
                <td style="text-align: center; color: #1d4ed8;">${summary.totalJpGenap} JP</td>
                <td colspan="2">${prota.identitas.mingguEfektifGenap} Minggu Efektif</td>
              </tr>
              <tr style="background: #d1fae5; font-weight: bold;">
                <td colspan="3" style="text-align: right;">TOTAL ALOKASI WAKTU 1 TAHUN PELAJARAN</td>
                <td style="text-align: center; color: #065f46;">${summary.totalJpTahunan} JP</td>
                <td colspan="2">${prota.identitas.mingguEfektifGanjil + prota.identitas.mingguEfektifGenap} Minggu Efektif / Tahun</td>
              </tr>
            </tbody>
          </table>

          <div class="content-title">D. CATATAN KALENDER PENDIDIKAN &amp; FLEKSIBILITAS</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; text-align: justify;">${prota.catatanPelaksanaan}</div>

          <div class="content-title" style="color: #065f46; border-bottom-color: #059669;">E. INTEGRASI NILAI ISLAMI (${prota.integrasiNilaiIslami.surahAyat})</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; background: #ecfdf5; border: 1.5px solid #10b981;">
            <div dir="rtl" style="font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif; font-size: 18pt; line-height: 2; text-align: right; color: #064e3b; margin-bottom: 10px;">${prota.integrasiNilaiIslami.teksArab}</div>
            <p style="margin: 0 0 8px 0; font-style: italic; color: #065f46;"><b>Artinya (${prota.integrasiNilaiIslami.surahAyat}):</b> "${prota.integrasiNilaiIslami.terjemahan}"</p>
            <p style="margin: 0; color: #1e293b;"><b>Relevansi terhadap Program Tahunan:</b> ${prota.integrasiNilaiIslami.relevansiProta}</p>
          </div>
          `;
        })() : shouldRenderStructuredProsem(activeDoc) ? (() => {
          const prosem = resolveProsemData(activeDoc);
          const summary = calculateProsemSummary(prosem);
          const months = getProsemMonths(prosem.identitas.semester);
          const jpPerMinggu = Number(prosem.identitas.jpPerMinggu) || 3;
          const cellBgByJenis = (jenis: string) =>
            jenis === 'Asesmen'
              ? '#fef3c7'
              : jenis === 'Proyek'
              ? '#dbeafe'
              : jenis === 'Remedial'
              ? '#f3e8ff'
              : '#d1fae5';
          const cellTextByJenis = (jenis: string) =>
            jenis === 'Asesmen'
              ? '#92400e'
              : jenis === 'Proyek'
              ? '#1e40af'
              : jenis === 'Remedial'
              ? '#6b21a8'
              : '#065f46';
          return `
          <div class="content-title">A. RINCIAN PEKAN EFEKTIF (RPE) — SEMESTER ${prosem.identitas.semester.toUpperCase()}</div>
          <div class="content-box" style="font-family: inherit; font-size: 9.5pt; margin-bottom: 10px;">
            <p style="margin: 0;"><b>Beban Belajar:</b> ${jpPerMinggu} JP/Minggu &nbsp;|&nbsp; <b>Pekan Efektif:</b> ${summary.totalPekanEfektif} Pekan (Target ${summary.targetJpEfektif} JP) &nbsp;|&nbsp; <b>Total Matriks:</b> ${summary.totalJpMatriks} JP &nbsp;|&nbsp; <b>Fokus:</b> ${prosem.identitas.fokusSemester}</p>
          </div>
          <table class="cp-table">
            <thead>
              <tr>
                <th style="width: 6%; text-align: center;">No</th>
                <th style="width: 18%;">Bulan</th>
                <th style="width: 11%; text-align: center;">Jml Pekan</th>
                <th style="width: 13%; text-align: center;">Tdk Efektif</th>
                <th style="width: 11%; text-align: center;">Efektif</th>
                <th style="width: 13%; text-align: center;">Jam Efektif</th>
                <th style="width: 28%;">Keterangan Kalender</th>
              </tr>
            </thead>
            <tbody>
              ${prosem.rincianPekanEfektif
                .map((r, idx) => {
                  const efektif = Math.max(0, (Number(r.jumlahPekan) || 0) - (Number(r.pekanTidakEfektif) || 0));
                  return `
                <tr>
                  <td style="text-align: center; font-weight: bold;">${idx + 1}</td>
                  <td style="font-weight: bold; color: #065f46;">${r.bulan}</td>
                  <td style="text-align: center;">${r.jumlahPekan}</td>
                  <td style="text-align: center;">${r.pekanTidakEfektif}</td>
                  <td style="text-align: center; font-weight: bold; color: #047857;">${efektif}</td>
                  <td style="text-align: center; font-weight: bold;">${efektif * jpPerMinggu} JP</td>
                  <td>${r.keteranganTidakEfektif || '-'}</td>
                </tr>`;
                })
                .join('')}
              <tr style="background: #ecfdf5; font-weight: bold;">
                <td colspan="2" style="text-align: right;">TOTAL SEMESTER ${prosem.identitas.semester.toUpperCase()}</td>
                <td style="text-align: center;">${summary.totalPekan}</td>
                <td style="text-align: center;">${summary.totalPekanTidakEfektif}</td>
                <td style="text-align: center; color: #065f46;">${summary.totalPekanEfektif}</td>
                <td style="text-align: center; color: #065f46;">${summary.targetJpEfektif} JP</td>
                <td>${jpPerMinggu} JP / Pekan Efektif</td>
              </tr>
            </tbody>
          </table>

          <div class="content-title">B. MATRIKS DISTRIBUSI MINGGUAN (BULAN &times; PEKAN M1–M4)</div>
          <table class="cp-table" style="font-size: 8pt;">
            <thead>
              <tr>
                <th rowspan="2" style="width: 4%; text-align: center; padding: 4px;">No</th>
                <th rowspan="2" style="width: 30%; padding: 4px 6px;">Elemen / Tujuan Pembelajaran (ATP)</th>
                <th rowspan="2" style="width: 6%; text-align: center; padding: 4px;">JP</th>
                ${months.map((m) => `<th colspan="4" style="text-align: center; padding: 3px 2px; font-size: 7.5pt;">${m.substring(0, 3)}</th>`).join('')}
              </tr>
              <tr>
                ${months
                  .map(() =>
                    PROSEM_WEEKS.map((w) => `<th style="text-align: center; padding: 2px; font-size: 7pt; background: #047857;">${w}</th>`).join('')
                  )
                  .join('')}
              </tr>
            </thead>
            <tbody>
              ${prosem.distribusiMingguan
                .map((row, idx) => {
                  const rowSum = Object.values(row.mingguAktif || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                  const bg = cellBgByJenis(row.jenisKegiatan);
                  const fg = cellTextByJenis(row.jenisKegiatan);
                  return `
                <tr>
                  <td style="text-align: center; font-weight: bold; padding: 4px;">${idx + 1}</td>
                  <td style="padding: 4px 6px;"><b style="color: #065f46;">${row.elemen}</b> <span style="color: #64748b; font-size: 7pt;">(${row.jenisKegiatan})</span><br/>${row.tujuanPembelajaran}</td>
                  <td style="text-align: center; font-weight: bold; padding: 4px;">${rowSum || row.alokasiJp}</td>
                  ${months
                    .map((m) =>
                      PROSEM_WEEKS.map((w) => {
                        const val = row.mingguAktif?.[getProsemWeekKey(m, w)] || 0;
                        return `<td style="text-align: center; padding: 2px; font-size: 7.5pt; ${val > 0 ? `background: ${bg}; color: ${fg}; font-weight: bold;` : ''}">${val > 0 ? val : ''}</td>`;
                      }).join('')
                    )
                    .join('')}
                </tr>`;
                })
                .join('')}
              <tr style="background: #d1fae5; font-weight: bold;">
                <td colspan="2" style="text-align: right; padding: 5px 6px;">TOTAL ALOKASI WAKTU MATRIKS SEMESTER ${prosem.identitas.semester.toUpperCase()}</td>
                <td style="text-align: center; color: #065f46; padding: 5px;">${summary.totalJpMatriks} JP</td>
                <td colspan="${months.length * 4}" style="padding: 5px 6px; color: #065f46;">Target RPE: ${summary.targetJpEfektif} JP (${summary.totalPekanEfektif} Pekan Efektif &times; ${jpPerMinggu} JP/Mg)</td>
              </tr>
            </tbody>
          </table>

          <div class="content-title">C. CATATAN PELAKSANAAN &amp; FLEKSIBILITAS KALENDER</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; text-align: justify;">${prosem.catatanPelaksanaan}</div>

          <div class="content-title" style="color: #065f46; border-bottom-color: #059669;">D. INTEGRASI NILAI ISLAMI (${prosem.integrasiNilaiIslami.surahAyat})</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; background: #ecfdf5; border: 1.5px solid #10b981;">
            <div dir="rtl" style="font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif; font-size: 18pt; line-height: 2; text-align: right; color: #064e3b; margin-bottom: 10px;">${prosem.integrasiNilaiIslami.teksArab}</div>
            <p style="margin: 0 0 8px 0; font-style: italic; color: #065f46;"><b>Artinya (${prosem.integrasiNilaiIslami.surahAyat}):</b> "${prosem.integrasiNilaiIslami.terjemahan}"</p>
            <p style="margin: 0; color: #1e293b;"><b>Relevansi terhadap Program Semester:</b> ${prosem.integrasiNilaiIslami.relevansiProsem}</p>
          </div>
          `;
        })() : (activeDoc.kontenJson && activeDoc.kontenJson.informasiUmum) ? (() => {
          const q = activeDoc.kontenJson;
          const ayat = resolveModulAyat(q, activeDoc.mataPelajaran, activeDoc.judul.replace(/^MODUL AJAR.*?:\s*/i, ''));
          const dimensiList = (q.dimensiProfilLulusan && q.dimensiProfilLulusan.length > 0)
            ? q.dimensiProfilLulusan
            : (q.profilPelajarPancasila || []);
          const prinsipList = q.pengalamanBelajarMendalam?.prinsipPembelajaran?.length
            ? q.pengalamanBelajarMendalam.prinsipPembelajaran
            : PRINSIP_PEMBELAJARAN_MENDALAM;

          return `
          <div class="content-title">A. INFORMASI UMUM</div>
          <div class="content-box">
            <table class="table-info" style="margin-bottom: 0;">
              <tr><td class="label" style="width: 30%;">Nama Penyusun</td><td class="colon">:</td><td class="val">${q.informasiUmum.namaPenyusun || activeDoc.guruNama}</td></tr>
              <tr><td class="label">Nama Sekolah</td><td class="colon">:</td><td class="val">${q.informasiUmum.namaSekolah}</td></tr>
              <tr><td class="label">Mata Pelajaran</td><td class="colon">:</td><td class="val">${q.informasiUmum.mataPelajaran}</td></tr>
              <tr><td class="label">Fase / Kelas</td><td class="colon">:</td><td class="val">Fase ${q.informasiUmum.fase} / Kelas ${q.informasiUmum.kelas}</td></tr>
              <tr><td class="label">Semester</td><td class="colon">:</td><td class="val">${q.informasiUmum.semester}</td></tr>
              <tr><td class="label">Tahun Ajaran</td><td class="colon">:</td><td class="val">${q.informasiUmum.tahunAjaran}</td></tr>
              <tr><td class="label">Alokasi Waktu</td><td class="colon">:</td><td class="val">${q.informasiUmum.alokasiWaktu}</td></tr>
              <tr><td class="label">Materi Pokok</td><td class="colon">:</td><td class="val"><b>${q.informasiUmum.materi}</b></td></tr>
            </table>
          </div>

          <div class="content-title" style="color: #065f46; border-bottom-color: #059669;">INTEGRASI AYAT AL-QUR'AN SESUAI MATERI (${ayat.surahAyat})</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt; background: #ecfdf5; border: 1.5px solid #10b981;">
            <div dir="rtl" style="font-family: 'Traditional Arabic', 'Amiri', 'Times New Roman', serif; font-size: 18pt; line-height: 2; text-align: right; color: #064e3b; margin-bottom: 10px;">${ayat.teksArab}</div>
            <p style="margin: 0 0 8px 0; font-style: italic; color: #065f46;"><b>Artinya (${ayat.surahAyat}):</b> "${ayat.terjemahan}"</p>
            <p style="margin: 0; color: #1e293b;"><b>Tadabbur &amp; Relevansi Materi:</b> ${(ayat.kaitanMateri || '-').replace(/\n/g, '<br/>')}</p>
          </div>

          <div class="content-title">B. IDENTIFIKASI KESIAPAN &amp; KOMPETENSI AWAL</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">${(q.kompetensiAwal || '-').replace(/\n/g, '<br/>')}</div>

          <div class="content-title">C. 8 DIMENSI PROFIL LULUSAN (PEMBELAJARAN MENDALAM)</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <ul style="margin: 0; padding-left: 20px;">
              ${dimensiList.map((p: string) => `<li>${p}</li>`).join('') || '<li>-</li>'}
            </ul>
          </div>

          <div class="content-title">D. SARANA DAN PRASARANA</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <ul style="margin: 0; padding-left: 20px;">
              ${(q.saranaPrasarana || []).map((s: string) => `<li>${s}</li>`).join('') || '<li>-</li>'}
            </ul>
          </div>

          <div class="content-title">E. TARGET PESERTA DIDIK</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">Target: <b>${q.targetPesertaDidik || 'Reguler'}</b></div>

          <div class="content-title">F. DESAIN &amp; KERANGKA PEMBELAJARAN MENDALAM</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <p><b>Model Pembelajaran:</b> ${q.modelPembelajaran || 'Problem Based Learning (Pembelajaran Mendalam)'}</p>
            ${q.capaianPembelajaran ? `<p><b>Capaian Pembelajaran (CP):</b> ${q.capaianPembelajaran.replace(/\n/g, '<br/>')}</p>` : ''}
            ${q.lintasDisiplinIlmu ? `<p><b>Lintas Disiplin Ilmu:</b> ${q.lintasDisiplinIlmu.replace(/\n/g, '<br/>')}</p>` : ''}
            ${q.kerangkaPembelajaran ? `
              <p><b>1. Praktik Pedagogis:</b> ${q.kerangkaPembelajaran.praktikPedagogis || '-'}</p>
              <p><b>2. Kemitraan Pembelajaran:</b> ${q.kerangkaPembelajaran.kemitraanPembelajaran || '-'}</p>
              <p><b>3. Lingkungan Pembelajaran:</b> ${q.kerangkaPembelajaran.lingkunganPembelajaran || '-'}</p>
              <p><b>4. Pemanfaatan Digital:</b> ${q.kerangkaPembelajaran.pemanfaatanDigital || '-'}</p>
            ` : ''}
          </div>

          <div class="content-title">G. TUJUAN PEMBELAJARAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <ol style="margin: 0; padding-left: 20px;">
              ${(q.tujuanPembelajaran || []).map((tp: string) => `<li>${tp}</li>`).join('') || '<li>-</li>'}
            </ol>
          </div>

          <div class="content-title">H. PEMAHAMAN BERMAKNA</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">${(q.pemahamanBermakna || '-').replace(/\n/g, '<br/>')}</div>

          <div class="content-title">I. PERTANYAAN PEMANTIK</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <ul style="margin: 0; padding-left: 20px;">
              ${(q.pertanyaanPemantik || []).map((pp: string) => `<li>${pp}</li>`).join('') || '<li>-</li>'}
            </ul>
          </div>

          <div class="content-title">J. PENGALAMAN BELAJAR MENDALAM &amp; KEGIATAN PEMBELAJARAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <p><b>Prinsip Pembelajaran Mendalam:</b> ${prinsipList.join(' • ')}</p>
            ${q.pengalamanBelajarMendalam ? `
              <div style="background: #f8fafc; border-left: 3px solid #059669; padding: 8px 12px; margin-bottom: 12px;">
                <p style="margin: 0 0 6px 0;"><b>• Tahap Memahami:</b> ${(q.pengalamanBelajarMendalam.memahami || '-').replace(/\n/g, '<br/>')}</p>
                <p style="margin: 0 0 6px 0;"><b>• Tahap Mengaplikasi:</b> ${(q.pengalamanBelajarMendalam.mengaplikasi || '-').replace(/\n/g, '<br/>')}</p>
                <p style="margin: 0;"><b>• Tahap Merefleksi:</b> ${(q.pengalamanBelajarMendalam.merefleksi || '-').replace(/\n/g, '<br/>')}</p>
              </div>
            ` : ''}
            <p><b>1. Pendahuluan (${q.kegiatanPembelajaran.pendahuluan.durasi || '15 Menit'}):</b></p>
            <div style="margin-left: 15px; margin-bottom: 15px;">${(q.kegiatanPembelajaran.pendahuluan.deskripsi || '-').replace(/\n/g, '<br/>')}</div>
            
            <p><b>2. Kegiatan Inti (${q.kegiatanPembelajaran.inti.durasi || '50 Menit'}):</b></p>
            <div style="margin-left: 15px; margin-bottom: 15px;">${(q.kegiatanPembelajaran.inti.deskripsi || '-').replace(/\n/g, '<br/>')}</div>

            <p><b>3. Penutup (${q.kegiatanPembelajaran.penutup.durasi || '15 Menit'}):</b></p>
            <div style="margin-left: 15px;">${(q.kegiatanPembelajaran.penutup.deskripsi || '-').replace(/\n/g, '<br/>')}</div>
          </div>

          <div class="content-title">K. ASESMEN PEMBELAJARAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <p><b>Asesmen Awal (Diagnostik):</b> ${(q.asesmen.diagnostik || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Asesmen Proses (Formatif):</b> ${(q.asesmen.formatif || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Asesmen Akhir (Sumatif):</b> ${(q.asesmen.sumatif || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Teknik Asesmen:</b> ${q.asesmen.teknik || '-'}</p>
            <p><b>Instrumen:</b> ${q.asesmen.instrumen || '-'}</p>
            <p><b>Rubrik Penilaian:</b> ${(q.asesmen.rubrik || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Kriteria Penilaian:</b> ${(q.asesmen.kriteriaPenilaian || '-').replace(/\n/g, '<br/>')}</p>
          </div>

          <div class="content-title">L. DIFERENSIASI &amp; INKLUSI PEMBELAJARAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <p><b>Diferensiasi Konten:</b> ${(q.diferensiasi.konten || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Diferensiasi Proses:</b> ${(q.diferensiasi.proses || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Diferensiasi Produk:</b> ${(q.diferensiasi.produk || '-').replace(/\n/g, '<br/>')}</p>
          </div>

          <div class="content-title">M. REMEDIAL</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">${(q.remedial || '-').replace(/\n/g, '<br/>')}</div>

          <div class="content-title">N. PENGAYAAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">${(q.pengayaan || '-').replace(/\n/g, '<br/>')}</div>

          <div class="content-title">O. REFLEKSI GURU</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">${(q.refleksiGuru || '-').replace(/\n/g, '<br/>')}</div>

          <div class="content-title">P. REFLEKSI PESERTA DIDIK</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">${(q.refleksiPesertaDidik || '-').replace(/\n/g, '<br/>')}</div>

          <div class="content-title">Q. LAMPIRAN</div>
          <div class="content-box" style="font-family: inherit; font-size: 10pt;">
            <p><b>LKPD:</b> ${(q.lampiran.lkpd || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Bahan Bacaan Guru &amp; Peserta Didik:</b> ${(q.lampiran.bahanBacaan || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Rubrik Penilaian:</b> ${(q.lampiran.rubrik || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Instrumen Asesmen:</b> ${(q.lampiran.instrumenAsesmen || '-').replace(/\n/g, '<br/>')}</p>
            <p><b>Daftar Pustaka:</b> ${(q.lampiran.daftarPustaka || '-').replace(/\n/g, '<br/>')}</p>
          </div>
        `;
        })() : `
          <div class="content-title">Isi / Uraian Dokumen Administrasi</div>
          <div class="content-box">${text}</div>
        `}
        
        <table class="signatures">
          <tr>
            <td>
              <p>Mengetahui,</p>
              <p><b>Kepala Sekolah SMP Islam Modern Al Fakhir</b></p>
              <br /><br /><br /><br />
              <p><u>${principalName}</u></p>
              <p>NUPTK / NIP. ${principalNip}</p>
            </td>
            <td>
              <p>Jakarta, ${new Date(activeDoc.tanggalInput).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
              <p><b>Guru Pengampu Mata Pelajaran</b></p>
              <br /><br /><br /><br />
              <p><u>${activeDoc.guruNama}</u></p>
              <p>NUPTK / NIP. ${docGuruNip}</p>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `);
  };

  const handlePrintDoc = () => {
    if (!activeDoc) return;
    const text = activeDoc.content || activeDoc.deskripsi;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // In case popup is blocked (which is highly likely in iframes), use the hidden iframe approach
      const iframe = document.createElement('iframe');
      iframe.name = 'print_iframe';
      iframe.style.position = 'absolute';
      iframe.style.width = '0px';
      iframe.style.height = '0px';
      iframe.style.border = '0px';
      iframe.style.top = '-1000px';
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        writePrintContent(doc, text);
        iframe.contentWindow?.focus();
        setTimeout(() => {
          iframe.contentWindow?.print();
          document.body.removeChild(iframe);
        }, 500);
      } else {
        alert('Gagal membuka jendela cetak. Silakan periksa izin browser Anda.');
      }
      return;
    }

    writePrintContent(printWindow.document, text);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  // Sample official Kemendikdasmen 2026 subjects list
  const kemendikdasmenMapelList = availableMapelList.length > 0 ? availableMapelList : [
    'Pendidikan Agama Islam',
    'Fisika & Informatika',
    'Bahasa Indonesia Fase E/F',
    'Matematika Tingkat Lanjut',
    'Kimia Praktikum',
    'Biologi & Lingkungan',
    'Bahasa Inggris Komunikasi',
    'Ekonomi & Bisnis',
    'Sosiologi & Sejarah',
    'PPKn & Pancasila'
  ];


  const filteredDocs = administrasiList.filter(d => {
    const matchTipe = filterTipe === 'Semua' || d.tipe === filterTipe;
    const matchSearch = d.judul.toLowerCase().includes(search.toLowerCase()) || 
                        d.guruNama.toLowerCase().includes(search.toLowerCase()) || 
                        d.mataPelajaran.toLowerCase().includes(search.toLowerCase());
    
    let matchMapel = true;
    if (selectedMapelFilter !== 'Semua') {
      const target = selectedMapelFilter.toLowerCase();
      const docMap = d.mataPelajaran.toLowerCase();
      matchMapel = docMap.includes(target) || target.includes(docMap) ||
        (target.includes('agama') && docMap.includes('agama')) ||
        (target.includes('fisika') && docMap.includes('fisika')) ||
        (target.includes('indonesia') && docMap.includes('indonesia'));
    }

    return matchTipe && matchSearch && matchMapel;
  });

  const handleSaveModulAjar = async (data: ModulAjarContent) => {
    const teacherName = data.informasiUmum.namaPenyusun || activeTeacher?.nama || 'Guru Pengampu Mapel';
    const ayat = resolveModulAyat(data);
    const enrichedData: ModulAjarContent = {
      ...data,
      ayatAlQuran: ayat,
    };
    const dimensiList = (enrichedData.dimensiProfilLulusan && enrichedData.dimensiProfilLulusan.length > 0)
      ? enrichedData.dimensiProfilLulusan
      : enrichedData.profilPelajarPancasila;
    
    const readableContent = `
MODUL AJAR PEMBELAJARAN MENDALAM: ${enrichedData.informasiUmum.materi}
Penyusun: ${teacherName}
Sekolah: ${enrichedData.informasiUmum.namaSekolah}
Mapel: ${enrichedData.informasiUmum.mataPelajaran}
Kelas: ${enrichedData.informasiUmum.kelas}

INTEGRASI AYAT AL-QUR'AN (${ayat.surahAyat}):
${ayat.teksArab}
Artinya: "${ayat.terjemahan}"
Tadabbur & Relevansi: ${ayat.kaitanMateri}

8 DIMENSI PROFIL LULUSAN:
${dimensiList.map((d, i) => `${i + 1}. ${d}`).join('\n')}

TUJUAN PEMBELAJARAN:
${enrichedData.tujuanPembelajaran.map((tp, i) => `${i + 1}. ${tp}`).join('\n')}

KEGIATAN INTI (MEMAHAMI, MENGAPLIKASI, MEREFLEKSI):
${enrichedData.kegiatanPembelajaran.inti.deskripsi}
    `.trim();

    if (editingModulDoc) {
      const updatedDoc: AdministrasiGuru = {
        ...editingModulDoc,
        guruNama: teacherName,
        mataPelajaran: enrichedData.informasiUmum.mataPelajaran,
        kelas: enrichedData.informasiUmum.kelas,
        tahunAjaran: enrichedData.informasiUmum.tahunAjaran,
        semester: enrichedData.informasiUmum.semester as any,
        judul: `MODUL AJAR MENDALAM: ${enrichedData.informasiUmum.materi}`,
        deskripsi: `Modul Ajar Pembelajaran Mendalam terintegrasi ${ayat.surahAyat} untuk materi ${enrichedData.informasiUmum.materi}`,
        content: readableContent,
        kontenJson: enrichedData,
        tanggalInput: new Date().toISOString().split('T')[0],
        status: 'Final'
      };
      const updatedList = administrasiList.map(d => d.id === editingModulDoc.id ? updatedDoc : d);
      setAdministrasiList(updatedList);
      await dbSaveCollection('edu_administrasiList', updatedList);
      setIsModulEditorOpen(false);
      setEditingModulDoc(null);
      if (activeDoc?.id === updatedDoc.id) {
        setActiveDoc(updatedDoc);
        setEditedContent(readableContent);
      }
      setSaveSuccessNotification(`Modul Ajar Pembelajaran Mendalam "${updatedDoc.judul}" berhasil diperbarui!`);
      return;
    }

    const newDoc: AdministrasiGuru = {
      id: `adm-${Date.now()}`,
      tipe: 'modul_ajar',
      guruNama: teacherName,
      mataPelajaran: enrichedData.informasiUmum.mataPelajaran,
      kelas: enrichedData.informasiUmum.kelas,
      tahunAjaran: enrichedData.informasiUmum.tahunAjaran,
      semester: enrichedData.informasiUmum.semester as any,
      judul: `MODUL AJAR MENDALAM: ${enrichedData.informasiUmum.materi}`,
      deskripsi: `Modul Ajar Pembelajaran Mendalam terintegrasi ${ayat.surahAyat} untuk materi ${enrichedData.informasiUmum.materi}`,
      content: readableContent,
      kontenJson: enrichedData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final'
    };

    const newList = [newDoc, ...administrasiList];
    setAdministrasiList(newList);
    await dbSaveCollection('edu_administrasiList', newList);
    setIsModulEditorOpen(false);
    setSaveSuccessNotification(`Modul Ajar Pembelajaran Mendalam "${newDoc.judul}" berhasil disimpan!`);
  };

  const handleSaveKktp = async (kktpData: KktpData) => {
    const teacherName = kktpData.identitas.namaPenyusun || activeTeacher?.nama || 'Guru Pengampu Mapel';
    const cleanText = formatKktpToPlainText(kktpData);
    const titleDoc = `KKTP: ${kktpData.identitas.mataPelajaran} - ${kktpData.identitas.topikMateri}`;
    const descDoc = `KKTP resmi ${kktpData.identitas.mataPelajaran} ${kktpData.identitas.fase} (${kktpData.rubrikPenilaian.length} Aspek Rubrik • Tuntas >= ${kktpData.identitas.batasMinimalPersen}%)`;

    if (editingKktpDoc) {
      const updatedDoc: AdministrasiGuru = {
        ...editingKktpDoc,
        guruNama: teacherName,
        mataPelajaran: kktpData.identitas.mataPelajaran,
        kelas: kktpData.identitas.kelas,
        tahunAjaran: kktpData.identitas.tahunAjaran,
        semester: kktpData.identitas.semester as any,
        judul: titleDoc,
        deskripsi: descDoc,
        content: cleanText,
        kontenJson: kktpData,
        tanggalInput: new Date().toISOString().split('T')[0],
        status: 'Final',
      };
      const updatedList = administrasiList.map((d) => (d.id === editingKktpDoc.id ? updatedDoc : d));
      setAdministrasiList(updatedList);
      await dbSaveCollection('edu_administrasiList', updatedList);
      setIsKktpEditorOpen(false);
      setEditingKktpDoc(null);
      if (activeDoc?.id === updatedDoc.id) {
        setActiveDoc(updatedDoc);
        setEditedContent(cleanText);
      }
      setSaveSuccessNotification(`Dokumen KKTP "${updatedDoc.judul}" berhasil diperbarui!`);
      return;
    }

    const newDoc: AdministrasiGuru = {
      id: `adm-${Date.now()}`,
      tipe: 'kktp',
      guruNama: teacherName,
      mataPelajaran: kktpData.identitas.mataPelajaran,
      kelas: kktpData.identitas.kelas,
      tahunAjaran: kktpData.identitas.tahunAjaran,
      semester: kktpData.identitas.semester as any,
      judul: titleDoc,
      deskripsi: descDoc,
      content: cleanText,
      kontenJson: kktpData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const newList = [newDoc, ...administrasiList];
    setAdministrasiList(newList);
    await dbSaveCollection('edu_administrasiList', newList);
    setIsKktpEditorOpen(false);
    openDocModal(newDoc);
    setSaveSuccessNotification(`Dokumen KKTP resmi "${newDoc.judul}" berhasil disimpan!`);
  };

  const handleSaveProta = async (protaData: ProtaData) => {
    const teacherName = protaData.identitas.namaPenyusun || activeTeacher?.nama || 'Guru Pengampu Mapel';
    const summary = calculateProtaSummary(protaData);
    const cleanText = formatProtaToPlainText(protaData);
    const titleDoc = `PROTA: ${protaData.identitas.mataPelajaran} - Kelas ${protaData.identitas.kelas} (${protaData.identitas.tahunAjaran})`;
    const descDoc = `Program Tahunan resmi ${protaData.identitas.mataPelajaran} Kelas ${protaData.identitas.kelas} (Sem I: ${summary.totalJpGanjil} JP • Sem II: ${summary.totalJpGenap} JP • Total ${summary.totalJpTahunan} JP/Tahun)`;

    if (editingProtaDoc) {
      const updatedDoc: AdministrasiGuru = {
        ...editingProtaDoc,
        guruNama: teacherName,
        mataPelajaran: protaData.identitas.mataPelajaran,
        kelas: protaData.identitas.kelas,
        tahunAjaran: protaData.identitas.tahunAjaran,
        semester: 'Ganjil',
        judul: titleDoc,
        deskripsi: descDoc,
        content: cleanText,
        kontenJson: protaData,
        tanggalInput: new Date().toISOString().split('T')[0],
        status: 'Final',
      };
      const updatedList = administrasiList.map((d) => (d.id === editingProtaDoc.id ? updatedDoc : d));
      setAdministrasiList(updatedList);
      await dbSaveCollection('edu_administrasiList', updatedList);
      setIsProtaEditorOpen(false);
      setEditingProtaDoc(null);
      if (activeDoc?.id === updatedDoc.id) {
        setActiveDoc(updatedDoc);
        setEditedContent(cleanText);
      }
      setSaveSuccessNotification(`Dokumen Program Tahunan "${updatedDoc.judul}" berhasil diperbarui!`);
      return;
    }

    const newDoc: AdministrasiGuru = {
      id: `adm-${Date.now()}`,
      tipe: 'prota',
      guruNama: teacherName,
      mataPelajaran: protaData.identitas.mataPelajaran,
      kelas: protaData.identitas.kelas,
      tahunAjaran: protaData.identitas.tahunAjaran,
      semester: 'Ganjil',
      judul: titleDoc,
      deskripsi: descDoc,
      content: cleanText,
      kontenJson: protaData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const newList = [newDoc, ...administrasiList];
    setAdministrasiList(newList);
    await dbSaveCollection('edu_administrasiList', newList);
    setIsProtaEditorOpen(false);
    openDocModal(newDoc);
    setSaveSuccessNotification(`Dokumen Program Tahunan resmi "${newDoc.judul}" berhasil disimpan!`);
  };

  const handleSaveProsem = async (prosemData: ProsemData) => {
    const teacherName = prosemData.identitas.namaPenyusun || activeTeacher?.nama || 'Guru Pengampu Mapel';
    const summary = calculateProsemSummary(prosemData);
    const cleanText = formatProsemToPlainText(prosemData);
    const titleDoc = `PROSEM: ${prosemData.identitas.mataPelajaran} - Kelas ${prosemData.identitas.kelas} (Sem. ${prosemData.identitas.semester} ${prosemData.identitas.tahunAjaran})`;
    const descDoc = `Program Semester resmi ${prosemData.identitas.mataPelajaran} Kelas ${prosemData.identitas.kelas} Sem ${prosemData.identitas.semester} (${summary.totalPekanEfektif} Pekan Efektif • Total ${summary.totalJpMatriks} JP)`;

    if (editingProsemDoc) {
      const updatedDoc: AdministrasiGuru = {
        ...editingProsemDoc,
        guruNama: teacherName,
        mataPelajaran: prosemData.identitas.mataPelajaran,
        kelas: prosemData.identitas.kelas,
        tahunAjaran: prosemData.identitas.tahunAjaran,
        semester: prosemData.identitas.semester,
        judul: titleDoc,
        deskripsi: descDoc,
        content: cleanText,
        kontenJson: prosemData,
        tanggalInput: new Date().toISOString().split('T')[0],
        status: 'Final',
      };
      const updatedList = administrasiList.map((d) => (d.id === editingProsemDoc.id ? updatedDoc : d));
      setAdministrasiList(updatedList);
      await dbSaveCollection('edu_administrasiList', updatedList);
      setIsProsemEditorOpen(false);
      setEditingProsemDoc(null);
      if (activeDoc?.id === updatedDoc.id) {
        setActiveDoc(updatedDoc);
        setEditedContent(cleanText);
      }
      setSaveSuccessNotification(`Dokumen Program Semester "${updatedDoc.judul}" berhasil diperbarui!`);
      return;
    }

    const newDoc: AdministrasiGuru = {
      id: `adm-${Date.now()}`,
      tipe: 'prosem',
      guruNama: teacherName,
      mataPelajaran: prosemData.identitas.mataPelajaran,
      kelas: prosemData.identitas.kelas,
      tahunAjaran: prosemData.identitas.tahunAjaran,
      semester: prosemData.identitas.semester,
      judul: titleDoc,
      deskripsi: descDoc,
      content: cleanText,
      kontenJson: prosemData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const newList = [newDoc, ...administrasiList];
    setAdministrasiList(newList);
    await dbSaveCollection('edu_administrasiList', newList);
    setIsProsemEditorOpen(false);
    openDocModal(newDoc);
    setSaveSuccessNotification(`Dokumen Program Semester resmi "${newDoc.judul}" berhasil disimpan!`);
  };

  const handleSaveAtp = async (atpData: AtpData) => {
    const teacherName = atpData.identitas.namaPenyusun || activeTeacher?.nama || 'Guru Pengampu Mapel';
    const summary = calculateAtpSummary(atpData);
    const cleanText = formatAtpToPlainText(atpData);
    const fokus = atpData.identitas.fokusTopik?.trim();
    const titleDoc =
      fokus && !fokus.toLowerCase().startsWith('alur tujuan pembelajaran')
        ? `ATP: ${atpData.identitas.mataPelajaran} - ${fokus} (Kelas ${atpData.identitas.kelas})`
        : `ATP: ${atpData.identitas.mataPelajaran} - Kelas ${atpData.identitas.kelas} (${atpData.identitas.tahunAjaran})`;
    const descDoc = `ATP resmi ${atpData.identitas.mataPelajaran} Kelas ${atpData.identitas.kelas} ${atpData.identitas.fase} (${summary.totalTp} TP • ${summary.jumlahElemen} Elemen • Total ${summary.totalJp} JP/Tahun)`;

    if (editingAtpDoc) {
      const updatedDoc: AdministrasiGuru = {
        ...editingAtpDoc,
        guruNama: teacherName,
        mataPelajaran: atpData.identitas.mataPelajaran,
        kelas: atpData.identitas.kelas,
        tahunAjaran: atpData.identitas.tahunAjaran,
        semester: 'Ganjil',
        judul: titleDoc,
        deskripsi: descDoc,
        content: cleanText,
        kontenJson: atpData,
        tanggalInput: new Date().toISOString().split('T')[0],
        status: 'Final',
      };
      const updatedList = administrasiList.map((d) => (d.id === editingAtpDoc.id ? updatedDoc : d));
      setAdministrasiList(updatedList);
      await dbSaveCollection('edu_administrasiList', updatedList);
      setIsAtpEditorOpen(false);
      setEditingAtpDoc(null);
      if (activeDoc?.id === updatedDoc.id) {
        setActiveDoc(updatedDoc);
        setEditedContent(cleanText);
      }
      setSaveSuccessNotification(`Dokumen Alur Tujuan Pembelajaran "${updatedDoc.judul}" berhasil diperbarui!`);
      return;
    }

    const newDoc: AdministrasiGuru = {
      id: `adm-${Date.now()}`,
      tipe: 'atp',
      guruNama: teacherName,
      mataPelajaran: atpData.identitas.mataPelajaran,
      kelas: atpData.identitas.kelas,
      tahunAjaran: atpData.identitas.tahunAjaran,
      semester: 'Ganjil',
      judul: titleDoc,
      deskripsi: descDoc,
      content: cleanText,
      kontenJson: atpData,
      tanggalInput: new Date().toISOString().split('T')[0],
      status: 'Final',
    };

    const newList = [newDoc, ...administrasiList];
    setAdministrasiList(newList);
    await dbSaveCollection('edu_administrasiList', newList);
    setIsAtpEditorOpen(false);
    openDocModal(newDoc);
    setSaveSuccessNotification(`Dokumen Alur Tujuan Pembelajaran resmi "${newDoc.judul}" berhasil disimpan!`);
  };

  const handleGenerateAiDoc = async () => {
    setLoadingAi(true);
    try {
      const teacherName = activeTeacher?.nama || 'Guru Pengampu Mapel';
      const res = await fetch('/api/ai/generate-administrasi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipe: aiTipe,
          mataPelajaran: aiMapel,
          kelas: aiKelas,
          semester: aiSemester,
          topik: aiTopik
        })
      });
      const data = await res.json();
      if (data.success) {
        let fullContent = '';
        let kontenJsonObj: any = undefined;
        let titleDoc = `${aiTipe.toUpperCase().replace('_', ' ')}: ${aiMapel} - ${aiTopik}`;
        let descDoc = `Draf administrasi pembelajaran ${aiTipe.toUpperCase().replace('_', ' ')} Kurikulum Nasional.`;

        if (aiTipe === 'modul_ajar' && data.isJson) {
          kontenJsonObj = data.data;
          if (kontenJsonObj.informasiUmum) {
            kontenJsonObj.informasiUmum.namaPenyusun = teacherName;
            kontenJsonObj.informasiUmum.mataPelajaran = aiMapel;
            kontenJsonObj.informasiUmum.kelas = aiKelas;
            const materiTitle = kontenJsonObj.informasiUmum.materi || aiTopik || 'Materi Pokok';
            const ayat = resolveModulAyat(kontenJsonObj, aiMapel, materiTitle);
            kontenJsonObj.ayatAlQuran = ayat;
            
            titleDoc = `MODUL AJAR MENDALAM: ${materiTitle}`;
            descDoc = `Modul Ajar Pembelajaran Mendalam terintegrasi ${ayat.surahAyat} untuk materi ${materiTitle}`;
            
            const tps = Array.isArray(kontenJsonObj.tujuanPembelajaran) ? kontenJsonObj.tujuanPembelajaran : [];
            const intiDeskripsi = kontenJsonObj.kegiatanPembelajaran?.inti?.deskripsi || '-';
            
            fullContent = `
MODUL AJAR PEMBELAJARAN MENDALAM: ${materiTitle}
Penyusun: ${teacherName}
Sekolah: ${kontenJsonObj.informasiUmum.namaSekolah || 'SMP Islam Modern Al Fakhir'}
Mapel: ${aiMapel}
Kelas: ${aiKelas}

INTEGRASI AYAT AL-QUR'AN (${ayat.surahAyat}):
${ayat.teksArab}
Artinya: "${ayat.terjemahan}"
Tadabbur & Relevansi: ${ayat.kaitanMateri}

TUJUAN PEMBELAJARAN:
${tps.map((tp: string, i: number) => `${i + 1}. ${tp}`).join('\n')}

KEGIATAN INTI (MEMAHAMI, MENGAPLIKASI, MEREFLEKSI):
${intiDeskripsi}
            `.trim();
          } else {
            fullContent = typeof data.content === 'string' ? data.content : JSON.stringify(data.data, null, 2);
          }
        } else if (aiTipe === 'cp') {
          const cpData: CapaianPembelajaranData =
            data.isJson && isStructuredCpData(data.data)
              ? {
                  ...data.data,
                  identitas: {
                    ...data.data.identitas,
                    namaPenyusun: teacherName,
                    mataPelajaran: aiMapel,
                    kelas: aiKelas,
                    satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                  },
                }
              : buildOfficialCpData({
                  mataPelajaran: aiMapel,
                  kelas: aiKelas,
                  topik: aiTopik,
                  tahunAjaran: '2026/2027',
                  semester: 'Ganjil',
                  namaPenyusun: teacherName,
                  satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                });

          kontenJsonObj = cpData;
          fullContent = formatCpToPlainText(cpData);
          titleDoc = aiTopik?.trim()
            ? `CP: ${aiMapel} - ${aiTopik.trim()}`
            : `CP: ${aiMapel} (${cpData.identitas.fase})`;
          descDoc = `Capaian Pembelajaran (CP) resmi ${aiMapel} ${cpData.identitas.fase} (${cpData.elemenList.length} Elemen) terintegrasi ${cpData.integrasiNilaiIslami.surahAyat}`;
        } else if (aiTipe === 'atp') {
          const atpData: AtpData =
            data.isJson && isStructuredAtpData(data.data)
              ? {
                  ...data.data,
                  identitas: {
                    ...data.data.identitas,
                    namaPenyusun: teacherName,
                    mataPelajaran: aiMapel,
                    kelas: aiKelas,
                    satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                  },
                }
              : buildOfficialAtpData({
                  mataPelajaran: aiMapel,
                  kelas: aiKelas,
                  topik: aiTopik,
                  tahunAjaran: '2026/2027',
                  namaPenyusun: teacherName,
                  satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                });

          const atpSummary = calculateAtpSummary(atpData);
          kontenJsonObj = atpData;
          fullContent = formatAtpToPlainText(atpData);
          titleDoc = aiTopik?.trim()
            ? `ATP: ${aiMapel} - ${aiTopik.trim()} (Kelas ${aiKelas})`
            : `ATP: ${aiMapel} - Kelas ${aiKelas} (${atpData.identitas.tahunAjaran})`;
          descDoc = `ATP resmi ${aiMapel} Kelas ${aiKelas} ${atpData.identitas.fase} (${atpSummary.totalTp} TP • ${atpSummary.jumlahElemen} Elemen • Total ${atpSummary.totalJp} JP/Tahun)`;
        } else if (aiTipe === 'kktp') {
          const kktpData: KktpData =
            data.isJson && isStructuredKktpData(data.data)
              ? {
                  ...data.data,
                  identitas: {
                    ...data.data.identitas,
                    namaPenyusun: teacherName,
                    mataPelajaran: aiMapel,
                    kelas: aiKelas,
                    satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                  },
                }
              : buildOfficialKktpData({
                  mataPelajaran: aiMapel,
                  kelas: aiKelas,
                  topik: aiTopik,
                  tahunAjaran: '2026/2027',
                  semester: 'Ganjil',
                  namaPenyusun: teacherName,
                  satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                });

          kontenJsonObj = kktpData;
          fullContent = formatKktpToPlainText(kktpData);
          titleDoc = `KKTP: ${aiMapel} - ${kktpData.identitas.topikMateri}`;
          descDoc = `KKTP resmi ${aiMapel} ${kktpData.identitas.fase} (${kktpData.rubrikPenilaian.length} Aspek Rubrik • Tuntas >= ${kktpData.identitas.batasMinimalPersen}%)`;
        } else if (aiTipe === 'prota') {
          const protaData: ProtaData =
            data.isJson && isStructuredProtaData(data.data)
              ? {
                  ...data.data,
                  identitas: {
                    ...data.data.identitas,
                    namaPenyusun: teacherName,
                    mataPelajaran: aiMapel,
                    kelas: aiKelas,
                    satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                  },
                }
              : buildOfficialProtaData({
                  mataPelajaran: aiMapel,
                  kelas: aiKelas,
                  topik: aiTopik,
                  tahunAjaran: '2026/2027',
                  namaPenyusun: teacherName,
                  satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                });

          const protaSummary = calculateProtaSummary(protaData);
          kontenJsonObj = protaData;
          fullContent = formatProtaToPlainText(protaData);
          titleDoc = aiTopik?.trim()
            ? `PROTA: ${aiMapel} - ${aiTopik.trim()} (Kelas ${aiKelas})`
            : `PROTA: ${aiMapel} - Kelas ${aiKelas} (${protaData.identitas.tahunAjaran})`;
          descDoc = `Program Tahunan resmi ${aiMapel} Kelas ${aiKelas} (Sem I: ${protaSummary.totalJpGanjil} JP • Sem II: ${protaSummary.totalJpGenap} JP • Total ${protaSummary.totalJpTahunan} JP/Tahun)`;
        } else if (aiTipe === 'prosem') {
          const prosemData: ProsemData =
            data.isJson && isStructuredProsemData(data.data)
              ? {
                  ...data.data,
                  identitas: {
                    ...data.data.identitas,
                    namaPenyusun: teacherName,
                    mataPelajaran: aiMapel,
                    kelas: aiKelas,
                    semester: aiSemester,
                    satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                  },
                }
              : buildOfficialProsemData({
                  mataPelajaran: aiMapel,
                  kelas: aiKelas,
                  semester: aiSemester,
                  topik: aiTopik,
                  tahunAjaran: '2026/2027',
                  namaPenyusun: teacherName,
                  satuanPendidikan: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
                });

          const prosemSummary = calculateProsemSummary(prosemData);
          kontenJsonObj = prosemData;
          fullContent = formatProsemToPlainText(prosemData);
          titleDoc = aiTopik?.trim()
            ? `PROSEM: ${aiMapel} - ${aiTopik.trim()} (Kelas ${aiKelas} Sem. ${prosemData.identitas.semester})`
            : `PROSEM: ${aiMapel} - Kelas ${aiKelas} (Sem. ${prosemData.identitas.semester} ${prosemData.identitas.tahunAjaran})`;
          descDoc = `Program Semester resmi ${aiMapel} Kelas ${aiKelas} Sem ${prosemData.identitas.semester} (${prosemSummary.totalPekanEfektif} Pekan Efektif • Total ${prosemSummary.totalJpMatriks} JP)`;
        } else {
          fullContent = data.content;
          descDoc = fullContent.length > 200 ? fullContent.substring(0, 200) + '...' : fullContent;
        }

        const newDoc: AdministrasiGuru = {
          id: `adm-${Date.now()}`,
          tipe: aiTipe,
          guruNama: teacherName,
          mataPelajaran: aiMapel,
          kelas: aiKelas,
          tahunAjaran: '2026/2027',
          semester: aiTipe === 'prosem' ? aiSemester : 'Ganjil',
          judul: titleDoc,
          deskripsi: descDoc,
          content: fullContent,
          kontenJson: kontenJsonObj,
          tanggalInput: new Date().toISOString().split('T')[0],
          status: 'Final'
        };

        const newList = [newDoc, ...administrasiList];
        setAdministrasiList(newList);
        dbSaveCollection('edu_administrasiList', newList);
        setIsAiModalOpen(false);
        openDocModal(newDoc);
        setSaveSuccessNotification(
          aiTipe === 'modul_ajar'
            ? `Modul Ajar Pembelajaran Mendalam (${aiMapel}) terintegrasi Ayat Al-Qur'an berhasil dibuat!`
            : aiTipe === 'cp'
            ? `Capaian Pembelajaran (CP) resmi (${aiMapel}) berhasil disusun sesuai format BSKAP!`
            : aiTipe === 'kktp'
            ? `KKTP resmi (${aiMapel}) lengkap dengan Rubrik 4 Level & Interval Nilai berhasil dibuat!`
            : aiTipe === 'prota'
            ? `Program Tahunan (PROTA) resmi (${aiMapel}) lengkap dengan Distribusi JP Semester I & II berhasil dibuat!`
            : aiTipe === 'prosem'
            ? `Program Semester (PROSEM) resmi (${aiMapel} Sem. ${aiSemester}) lengkap dengan RPE & Matriks Mingguan berhasil dibuat!`
            : `Dokumen ${aiTipe.toUpperCase()} (${aiMapel}) berhasil di-generate!`
        );
      } else {
        setSaveSuccessNotification('Gagal membuat dokumen AI. Silakan coba lagi.');
      }
    } catch (err: any) {
      console.error(err);
      setSaveSuccessNotification('Terjadi kesalahan sistem saat generate dokumen.');
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header */}
      {activeSubTab !== 'jurnal_guru' && activeSubTab !== 'kalender' && (
      <div
        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl border shadow-sm ${
          activeSubTab === 'jadwal'
            ? 'bg-slate-950 border-slate-800 text-white shadow-lg'
            : 'bg-white border-slate-200/80'
        }`}
      >
        <div>
          <h2
            className={`text-xl font-bold flex items-center gap-2 ${
              activeSubTab === 'jadwal' ? 'text-white' : 'text-slate-900'
            }`}
          >
            {['modul_ajar', 'cp', 'atp', 'kktp', 'prota', 'prosem'].includes(activeSubTab || '') && <FolderOpen className="w-5 h-5 text-blue-600" />}
            {activeSubTab === 'jadwal' ? 'Jadwal Mengajar Guru' :
             activeSubTab === 'modul_ajar' ? 'Modul Ajar Pembelajaran Mendalam' :
             activeSubTab === 'cp' ? 'Capaian Pembelajaran (CP)' :
             activeSubTab === 'atp' ? 'Alur Tujuan Pembelajaran (ATP)' :
             activeSubTab === 'kktp' ? 'KKTP / Kriteria Ketercapaian' :
             activeSubTab === 'prota' ? 'Program Tahunan (Prota)' :
             activeSubTab === 'prosem' ? 'Program Semester (Prosem)' :
             'Perangkat Administrasi Guru'}
          </h2>
          <p className={`text-xs mt-1 ${activeSubTab === 'jadwal' ? 'text-slate-400' : 'text-slate-500'}`}>
            {activeSubTab === 'modul_ajar' ? 'Perangkat Pembelajaran Mendalam (Deep Learning) Terintegrasi Ayat Al-Qur\'an & 8 Dimensi Profil Lulusan' :
             activeSubTab === 'cp' ? 'Dokumen Resmi Capaian Pembelajaran (CP) Standar BSKAP Kemendikdasmen per Elemen & Nilai Islami' :
             activeSubTab === 'kktp' ? 'Kriteria Ketercapaian Tujuan Pembelajaran (PPA Kemendikdasmen) • Rubrik 4 Level, Interval Nilai & Tindak Lanjut' :
             activeSubTab === 'prota' ? 'Distribusi Alur Tujuan Pembelajaran & Alokasi Waktu (JP) Semester I (Ganjil) & Semester II (Genap) — 36 Minggu Efektif' :
             activeSubTab === 'prosem' ? 'Rincian Pekan Efektif (RPE) & Matriks Distribusi Mingguan (Bulan × Pekan M1–M4) per Semester' :
             activeSubTab === 'atp' ? 'Alur Tujuan Pembelajaran (ATP) Sekuensial Semester I & II • Kode TP, Elemen CP, Materi Esensial, Alokasi JP, Profil Lulusan & Glosarium' :
             activeSubTab === 'jadwal' ? 'Jadwal Mengajar Guru SMP Islam Modern Al Fakhir' :
             'Dokumen dan Perangkat Administrasi Guru Sekolah'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {['modul_ajar', 'cp', 'atp', 'kktp', 'prota', 'prosem'].includes(activeSubTab || '') && (
            <div className="flex flex-wrap items-center gap-2">
              {administrasiList.some(d => d.tipe === activeSubTab) && (
                <button 
                  onClick={() =>
                    setConfirmDelete({
                      id: `all:${activeSubTab}`,
                      judul: `SEMUA dokumen ${activeSubTab?.toUpperCase().replace('_', ' ')}`,
                    })
                  }
                  className="px-4 py-2.5 bg-rose-50 text-rose-600 border border-rose-100 font-bold rounded-xl text-xs transition-all flex items-center gap-2 hover:bg-rose-100"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Hapus Semua
                </button>
              )}
              {activeSubTab === 'modul_ajar' && (
                <button
                  onClick={() => {
                    setEditingModulDoc(null);
                    setIsModulEditorOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Buat Manual (Mendalam)
                </button>
              )}
              {activeSubTab === 'atp' && (
                <button
                  onClick={() => {
                    setEditingAtpDoc(null);
                    setIsAtpEditorOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Buat Manual ATP
                </button>
              )}
              {activeSubTab === 'kktp' && (
                <button
                  onClick={() => {
                    setEditingKktpDoc(null);
                    setIsKktpEditorOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Buat Manual KKTP
                </button>
              )}
              {activeSubTab === 'prota' && (
                <button
                  onClick={() => {
                    setEditingProtaDoc(null);
                    setIsProtaEditorOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Buat Manual PROTA
                </button>
              )}
              {activeSubTab === 'prosem' && (
                <button
                  onClick={() => {
                    setEditingProsemDoc(null);
                    setIsProsemEditorOpen(true);
                  }}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-blue-500/20"
                >
                  <Plus className="w-4 h-4" /> Buat Manual PROSEM
                </button>
              )}
              <button
                onClick={() => {
                  setAiTipe(activeSubTab as TipeAdministrasi);
                  if (workspaceMapel && workspaceMapel !== 'Semua') {
                    setAiMapel(workspaceMapel);
                  }
                  const rawKelas = workspaceKelas.includes('IX')
                    ? 'IX'
                    : workspaceKelas.includes('VIII')
                    ? 'VIII'
                    : 'VII';
                  setAiKelas(rawKelas);
                  setIsAiModalOpen(true);
                }}
                className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-2 shadow-md shadow-emerald-500/20"
              >
                <Sparkles className="w-4 h-4" /> {activeSubTab === 'modul_ajar' ? 'Generate Modul Mendalam AI' : `Generate ${activeSubTab?.toUpperCase()} AI`}
              </button>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Content Area */}
      {activeSubTab === 'jadwal' && (
        <JadwalMengajar guruList={guruList} mapelList={mapelList} rombelList={rombelList} currentRole={currentRole} schoolSettings={schoolSettings} />
      )}

      {activeSubTab === 'kalender' && (
        <KalenderPendidikan />
      )}

      {activeSubTab === 'jurnal_guru' && (
        <JurnalGuru 
          siswaList={siswaList}
          guruList={guruList}
          rombelList={rombelList}
          mapelList={mapelList}
          absensiKelasList={absensiKelasList}
          setAbsensiKelasList={setAbsensiKelasList}
          userGoogleToken={userGoogleToken}
          schoolSettings={schoolSettings}
          absensiHarian={absensiHarian}
          stafList={stafList}
        />
      )}

      {activeSubTab === 'rekap_jurnal' as any && (
        <RekapJurnal 
          absensiKelasList={absensiKelasList}
          siswaList={siswaList}
          guruList={guruList}
          rombelList={rombelList}
          mapelList={mapelList}
        />
      )}

      {['modul_ajar', 'cp', 'atp', 'kktp', 'prota', 'prosem'].includes(activeSubTab || '') && (
        <div className="space-y-6">
          {/* Sisma Sekolah Workspace Selectors (Pilih Mata Pelajaran, Jenis Dokumen, Kelas, Fase) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-900 p-5 rounded-2xl border border-slate-800 shadow-xl">
            {/* PILIH MATA PELAJARAN */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Pilih Mata Pelajaran</label>
              <select
                value={workspaceMapel}
                onChange={e => {
                  setWorkspaceMapel(e.target.value);
                  if (e.target.value !== 'Semua') {
                    setSelectedMapelFilter(e.target.value);
                  }
                }}
                className="w-full p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-slate-100 outline-none transition-all cursor-pointer"
              >
                {availableMapelList.map(m => (
                  <option key={m} value={m} className="bg-slate-900 text-slate-100">{m}</option>
                ))}
              </select>
            </div>

            {/* PILIH JENIS DOKUMEN */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Pilih Jenis Dokumen</label>
              <select
                value={workspaceTipe}
                onChange={e => {
                  const val = e.target.value as TipeAdministrasi;
                  setWorkspaceTipe(val);
                  setActiveSubTab(val as AdministrasiSubTab);
                }}
                className="w-full p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-slate-100 outline-none transition-all cursor-pointer"
              >
                <option value="modul_ajar" className="bg-slate-900 text-slate-100">Modul Ajar Pembelajaran Mendalam (Deep Learning)</option>
                <option value="atp" className="bg-slate-900 text-slate-100">Alur Tujuan Pembelajaran (ATP)</option>
                <option value="cp" className="bg-slate-900 text-slate-100">Capaian Pembelajaran (CP)</option>
                <option value="kktp" className="bg-slate-900 text-slate-100">KKTP / Kriteria Ketercapaian</option>
                <option value="prota" className="bg-slate-900 text-slate-100">Program Tahunan (Prota)</option>
                <option value="prosem" className="bg-slate-900 text-slate-100">Program Semester (Prosem)</option>
              </select>
            </div>

            {/* PILIH KELAS */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Pilih Kelas</label>
              <select
                value={workspaceKelas}
                onChange={e => setWorkspaceKelas(e.target.value)}
                className="w-full p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-slate-100 outline-none transition-all cursor-pointer"
              >
                <option value="Kelas VII (SMP)" className="bg-slate-900 text-slate-100">Kelas VII (SMP)</option>
                <option value="Kelas VIII (SMP)" className="bg-slate-900 text-slate-100">Kelas VIII (SMP)</option>
                <option value="Kelas IX (SMP)" className="bg-slate-900 text-slate-100">Kelas IX (SMP)</option>
              </select>
            </div>

            {/* PILIH FASE */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black tracking-wider text-slate-400 uppercase">Pilih Fase</label>
              <select
                value={workspaceFase}
                onChange={e => setWorkspaceFase(e.target.value)}
                className="w-full p-3 bg-slate-950/80 hover:bg-slate-950 border border-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-slate-100 outline-none transition-all cursor-pointer"
              >
                <option value="Fase D (Kelas 7-9 SMP)" className="bg-slate-900 text-slate-100">Fase D (Kelas 7-9 SMP)</option>
              </select>
            </div>
          </div>


          {/* Filter and Search Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari judul dokumen atau mata pelajaran..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-600">Menampilkan {activeSubTab?.toUpperCase().replace('_', ' ')}</span>
            </div>
          </div>

          {/* Document Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocs.filter(d => d.tipe === activeSubTab).length === 0 ? (
              <div className="col-span-full py-12 px-6 flex flex-col items-center justify-center bg-white rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 text-center">
                <FolderOpen className="w-12 h-12 mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">
                  Belum ada dokumen{' '}
                  {activeSubTab === 'atp'
                    ? 'ATP (Alur Tujuan Pembelajaran)'
                    : activeSubTab === 'kktp'
                    ? 'KKTP (Kriteria Ketercapaian Tujuan Pembelajaran)'
                    : activeSubTab === 'prota'
                    ? 'PROTA (Program Tahunan)'
                    : activeSubTab === 'prosem'
                    ? 'PROSEM (Program Semester)'
                    : activeSubTab?.toUpperCase().replace('_', ' ')}
                </p>
                <p className="text-xs text-slate-500 mt-1 max-w-md">
                  {activeSubTab === 'atp'
                    ? 'Susun Alur Tujuan Pembelajaran (ATP) resmi yang runtut per Semester I & II lengkap dengan Kode TP, Elemen CP, Materi Esensial, Alokasi JP, 8 Dimensi Profil Lulusan, Strategi Asesmen, dan Glosarium.'
                    : activeSubTab === 'kktp'
                    ? 'Susun KKTP resmi lengkap dengan Rubrik 4 Level (Baru Berkembang–Mahir), Skala Interval Nilai & Tindak Lanjut, serta Deskripsi Kriteria.'
                    : activeSubTab === 'prota'
                    ? 'Susun Program Tahunan (PROTA) resmi lengkap dengan kalkulasi otomatis JP Semester I (Ganjil) & Semester II (Genap) sesuai 36 Minggu Efektif.'
                    : activeSubTab === 'prosem'
                    ? 'Susun Program Semester (PROSEM) resmi lengkap dengan Rincian Pekan Efektif (RPE) 6 bulan dan Matriks Jadwal Mingguan (Bulan × M1–M4).'
                    : 'Gunakan tombol di bawah untuk membuat dokumen secara otomatis menggunakan AI maupun manual.'}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2.5 mt-4">
                  {activeSubTab === 'atp' && (
                    <button
                      onClick={() => {
                        setEditingAtpDoc(null);
                        setIsAtpEditorOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Buat Manual ATP
                    </button>
                  )}
                  {activeSubTab === 'kktp' && (
                    <button
                      onClick={() => {
                        setEditingKktpDoc(null);
                        setIsKktpEditorOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Buat Manual KKTP
                    </button>
                  )}
                  {activeSubTab === 'prota' && (
                    <button
                      onClick={() => {
                        setEditingProtaDoc(null);
                        setIsProtaEditorOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Buat Manual PROTA
                    </button>
                  )}
                  {activeSubTab === 'prosem' && (
                    <button
                      onClick={() => {
                        setEditingProsemDoc(null);
                        setIsProsemEditorOpen(true);
                      }}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-4 h-4" /> Buat Manual PROSEM
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setAiTipe(activeSubTab as TipeAdministrasi);
                      if (workspaceMapel && workspaceMapel !== 'Semua') {
                        setAiMapel(workspaceMapel);
                      }
                      const rawKelas = workspaceKelas.includes('IX')
                        ? 'IX'
                        : workspaceKelas.includes('VIII')
                        ? 'VIII'
                        : 'VII';
                      setAiKelas(rawKelas);
                      setIsAiModalOpen(true);
                    }}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                  >
                    <Sparkles className="w-4 h-4" /> Generate {activeSubTab?.toUpperCase().replace('_', ' ')} AI
                  </button>
                </div>
              </div>
            ) : (
              filteredDocs
                .filter(d => d.tipe === activeSubTab)
                .map(doc => {
                  const docAyat = doc.tipe === 'modul_ajar'
                    ? resolveModulAyat(doc.kontenJson, doc.mataPelajaran, doc.judul.replace(/^MODUL AJAR.*?:\s*/i, ''))
                    : null;
                  const docCpPreview = doc.tipe === 'cp' ? resolveCpData(doc) : null;
                  const docAtpPreview = doc.tipe === 'atp' ? resolveAtpData(doc) : null;
                  const docAtpSummary = docAtpPreview ? calculateAtpSummary(docAtpPreview) : null;
                  const docKktpPreview = doc.tipe === 'kktp' ? resolveKktpData(doc) : null;
                  const docProtaPreview = doc.tipe === 'prota' ? resolveProtaData(doc) : null;
                  const docProtaSummary = docProtaPreview ? calculateProtaSummary(docProtaPreview) : null;
                  const docProsemPreview = doc.tipe === 'prosem' ? resolveProsemData(doc) : null;
                  const docProsemSummary = docProsemPreview ? calculateProsemSummary(docProsemPreview) : null;
                  const cleanCardDesc =
                    doc.tipe === 'cp' && isLegacyBrokenCpText(doc.deskripsi)
                      ? `Capaian Pembelajaran (CP) resmi ${doc.mataPelajaran} ${docCpPreview?.identitas.fase || 'Fase D'} (${docCpPreview?.elemenList.length || 0} Elemen) — Standar BSKAP Kemendikdasmen`
                      : doc.tipe === 'atp' && isLegacyBrokenAtpText(doc.deskripsi)
                      ? `ATP resmi ${doc.mataPelajaran} Kelas ${doc.kelas} ${docAtpPreview?.identitas.fase || 'Fase D'} (${docAtpSummary?.totalTp || 0} TP • ${docAtpSummary?.jumlahElemen || 0} Elemen • Total ${docAtpSummary?.totalJp || 0} JP/Tahun)`
                      : doc.tipe === 'kktp' && isLegacyBrokenCpText(doc.deskripsi)
                      ? `KKTP resmi ${doc.mataPelajaran} ${docKktpPreview?.identitas.fase || 'Fase D'} (${docKktpPreview?.rubrikPenilaian.length || 4} Aspek Rubrik • Tuntas >= ${docKktpPreview?.identitas.batasMinimalPersen || 66}%)`
                      : doc.tipe === 'prota' && isLegacyBrokenCpText(doc.deskripsi)
                      ? `Program Tahunan resmi ${doc.mataPelajaran} Kelas ${doc.kelas} (Sem I: ${docProtaSummary?.totalJpGanjil || 0} JP • Sem II: ${docProtaSummary?.totalJpGenap || 0} JP • Total ${docProtaSummary?.totalJpTahunan || 0} JP/Tahun)`
                      : doc.tipe === 'prosem' && isLegacyBrokenCpText(doc.deskripsi)
                      ? `Program Semester resmi ${doc.mataPelajaran} Kelas ${doc.kelas} Sem ${docProsemPreview?.identitas.semester || 'Ganjil'} (${docProsemSummary?.totalPekanEfektif || 18} Pekan Efektif • Total ${docProsemSummary?.totalJpMatriks || 0} JP)`
                      : doc.deskripsi;
                  return (
                  <div key={doc.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-all space-y-3 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 font-bold text-[10px] uppercase border border-blue-200">
                          {doc.tipe === 'modul_ajar'
                            ? 'MODUL MENDALAM'
                            : doc.tipe === 'cp'
                            ? 'CP RESMI BSKAP'
                            : doc.tipe === 'atp'
                            ? 'ATP RESMI'
                            : doc.tipe === 'kktp'
                            ? 'KKTP RESMI PPA'
                            : doc.tipe === 'prota'
                            ? 'PROTA RESMI'
                            : doc.tipe === 'prosem'
                            ? 'PROSEM RESMI'
                            : doc.tipe.replace('_', ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          doc.status === 'Disetujui Kepala Sekolah'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {doc.status}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-sm mt-3 leading-snug">{doc.judul}</h4>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">{cleanCardDesc}</p>
                      {docAyat && (
                        <div className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                          <BookMarked className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{docAyat.surahAyat}</span>
                        </div>
                      )}
                      {docCpPreview && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-800 text-[10px] font-bold">
                            <Layers className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{docCpPreview.elemenList.length} Elemen CP</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                            <BookMarked className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>{docCpPreview.integrasiNilaiIslami.surahAyat}</span>
                          </span>
                        </div>
                      )}
                      {docAtpPreview && docAtpSummary && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-800 text-[10px] font-bold">
                            <GitBranch className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{docAtpSummary.totalTp} TP • {docAtpSummary.jumlahElemen} Elemen</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Total {docAtpSummary.totalJp} JP / Tahun</span>
                          </span>
                        </div>
                      )}
                      {docKktpPreview && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-800 text-[10px] font-bold">
                            <ClipboardCheck className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>{docKktpPreview.rubrikPenilaian.length} Aspek Rubrik</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Tuntas &ge; {docKktpPreview.identitas.batasMinimalPersen}%</span>
                          </span>
                        </div>
                      )}
                      {docProtaPreview && docProtaSummary && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                            <Calendar className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Total {docProtaSummary.totalJpTahunan} JP / Tahun</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-800 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>Sem I: {docProtaSummary.totalJpGanjil} • Sem II: {docProtaSummary.totalJpGenap} JP</span>
                          </span>
                        </div>
                      )}
                      {docProsemPreview && docProsemSummary && (
                        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200/80 text-emerald-800 text-[10px] font-bold">
                            <Grid className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>Sem {docProsemPreview.identitas.semester} • {docProsemSummary.totalPekanEfektif} Pekan Efektif</span>
                          </span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 border border-blue-200/80 text-blue-800 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-blue-600 shrink-0" />
                            <span>Total {docProsemSummary.totalJpMatriks} JP</span>
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-slate-500 min-w-0">
                        <div className="font-semibold text-slate-800 truncate">{doc.guruNama}</div>
                        <div className="truncate">{doc.mataPelajaran} • Kelas {doc.kelas}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {doc.tipe === 'modul_ajar' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingModulDoc(doc);
                              setIsModulEditorOpen(true);
                            }}
                            className="p-2 rounded-xl transition-all border shadow-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200"
                            title="Edit Modul Mendalam & Ayat Al-Qur'an"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {doc.tipe === 'atp' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingAtpDoc(doc);
                              setIsAtpEditorOpen(true);
                            }}
                            className="p-2 rounded-xl transition-all border shadow-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200"
                            title="Edit ATP (Urutan TP, Alokasi JP, Dimensi Profil & Glosarium)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {doc.tipe === 'kktp' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingKktpDoc(doc);
                              setIsKktpEditorOpen(true);
                            }}
                            className="p-2 rounded-xl transition-all border shadow-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200"
                            title="Edit KKTP (Rubrik 4 Level & Interval Nilai)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {doc.tipe === 'prota' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProtaDoc(doc);
                              setIsProtaEditorOpen(true);
                            }}
                            className="p-2 rounded-xl transition-all border shadow-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200"
                            title="Edit Program Tahunan (Distribusi JP & Unit Semester)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        {doc.tipe === 'prosem' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProsemDoc(doc);
                              setIsProsemEditorOpen(true);
                            }}
                            className="p-2 rounded-xl transition-all border shadow-sm text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100 hover:border-blue-200"
                            title="Edit Program Semester (RPE & Matriks Mingguan)"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete({ id: doc.id, judul: doc.judul });
                          }}
                          disabled={deletingId === doc.id}
                          className={`p-2 rounded-xl transition-all border shadow-sm ${
                            deletingId === doc.id 
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                              : 'text-rose-500 bg-rose-50 hover:bg-rose-100 border-rose-100 hover:border-rose-200'
                          }`}
                          title="Hapus Dokumen"
                        >
                          <Trash2 className={`w-4 h-4 ${deletingId === doc.id ? 'animate-pulse' : ''}`} />
                        </button>
                        <button
                          onClick={() => openDocModal(doc)}
                          className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" /> Lihat / Cetak
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })
            )}
          </div>
        </div>
      )}

      {/* Modul Ajar Editor Modal */}
      {isModulEditorOpen && (
        <ModulAjarEditor 
          initialData={editingModulDoc?.kontenJson || (editingModulDoc ? {
            informasiUmum: {
              namaPenyusun: editingModulDoc.guruNama,
              namaSekolah: schoolSettings?.namaSekolah || 'SMP Islam Modern Al Fakhir',
              mataPelajaran: editingModulDoc.mataPelajaran,
              fase: 'D',
              kelas: editingModulDoc.kelas,
              semester: editingModulDoc.semester,
              tahunAjaran: editingModulDoc.tahunAjaran,
              alokasiWaktu: '2 JP (2 x 40 Menit)',
              materi: editingModulDoc.judul.replace(/^MODUL AJAR.*?:\s*/i, ''),
            }
          } : undefined)}
          onClose={() => {
            setIsModulEditorOpen(false);
            setEditingModulDoc(null);
          }}
          onSave={handleSaveModulAjar}
          schoolSettings={schoolSettings}
          guruList={guruList}
          mapelList={mapelList}
          defaultMapel={selectedMapelFilter !== 'Semua' ? selectedMapelFilter : undefined}
        />
      )}

      {/* ATP Editor Modal */}
      {isAtpEditorOpen && (
        <AtpEditor
          initialData={editingAtpDoc ? resolveAtpData(editingAtpDoc) : undefined}
          onClose={() => {
            setIsAtpEditorOpen(false);
            setEditingAtpDoc(null);
          }}
          onSave={handleSaveAtp}
          schoolSettings={schoolSettings}
          guruList={guruList}
          mapelList={mapelList}
          defaultMapel={workspaceMapel !== 'Semua' ? workspaceMapel : undefined}
          defaultKelas={
            workspaceKelas.includes('IX')
              ? 'IX'
              : workspaceKelas.includes('VIII')
              ? 'VIII'
              : 'VII'
          }
          defaultPenyusun={activeTeacher?.nama || getTemplateTeacherInfo(workspaceMapel).nama}
        />
      )}

      {/* KKTP Editor Modal */}
      {isKktpEditorOpen && (
        <KktpEditor
          initialData={editingKktpDoc ? resolveKktpData(editingKktpDoc) : undefined}
          onClose={() => {
            setIsKktpEditorOpen(false);
            setEditingKktpDoc(null);
          }}
          onSave={handleSaveKktp}
          schoolSettings={schoolSettings}
          guruList={guruList}
          mapelList={mapelList}
          defaultMapel={workspaceMapel !== 'Semua' ? workspaceMapel : undefined}
          defaultKelas={
            workspaceKelas.includes('IX')
              ? 'IX'
              : workspaceKelas.includes('VIII')
              ? 'VIII'
              : 'VII'
          }
          defaultPenyusun={activeTeacher?.nama || getTemplateTeacherInfo(workspaceMapel).nama}
        />
      )}

      {/* PROTA Editor Modal */}
      {isProtaEditorOpen && (
        <ProtaEditor
          initialData={editingProtaDoc ? resolveProtaData(editingProtaDoc) : undefined}
          onClose={() => {
            setIsProtaEditorOpen(false);
            setEditingProtaDoc(null);
          }}
          onSave={handleSaveProta}
          schoolSettings={schoolSettings}
          guruList={guruList}
          mapelList={mapelList}
          defaultMapel={workspaceMapel !== 'Semua' ? workspaceMapel : undefined}
          defaultKelas={
            workspaceKelas.includes('IX')
              ? 'IX'
              : workspaceKelas.includes('VIII')
              ? 'VIII'
              : 'VII'
          }
          defaultPenyusun={activeTeacher?.nama || getTemplateTeacherInfo(workspaceMapel).nama}
        />
      )}

      {/* PROSEM Editor Modal */}
      {isProsemEditorOpen && (
        <ProsemEditor
          initialData={editingProsemDoc ? resolveProsemData(editingProsemDoc) : undefined}
          onClose={() => {
            setIsProsemEditorOpen(false);
            setEditingProsemDoc(null);
          }}
          onSave={handleSaveProsem}
          schoolSettings={schoolSettings}
          guruList={guruList}
          mapelList={mapelList}
          defaultMapel={workspaceMapel !== 'Semua' ? workspaceMapel : undefined}
          defaultKelas={
            workspaceKelas.includes('IX')
              ? 'IX'
              : workspaceKelas.includes('VIII')
              ? 'VIII'
              : 'VII'
          }
          defaultPenyusun={activeTeacher?.nama || getTemplateTeacherInfo(workspaceMapel).nama}
        />
      )}

      {/* AI GENERATOR MODAL */}
      {isAiModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" /> AI Perangkat Pembelajaran
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-700">Tipe Dokumen</label>
                <select
                  value={aiTipe}
                  onChange={e => setAiTipe(e.target.value as TipeAdministrasi)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none"
                >
                  <option value="modul_ajar">Modul Ajar Pembelajaran Mendalam (Deep Learning + Ayat Al-Qur&apos;an)</option>
                  <option value="atp">Alur Tujuan Pembelajaran (ATP)</option>
                  <option value="cp">Capaian Pembelajaran (CP)</option>
                  <option value="kktp">KKTP</option>
                  <option value="prota">Program Tahunan (Prota)</option>
                  <option value="prosem">Program Semester (Prosem)</option>
                  <option value="jurnal">Jurnal Mengajar Harian</option>
                </select>
              </div>

              {aiTipe === 'modul_ajar' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-900 leading-relaxed flex items-start gap-2">
                  <BookMarked className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Otomatis menyusun <b>Modul Ajar Pembelajaran Mendalam</b> (8 Dimensi Profil Lulusan, 4 Pilar Kerangka Deep Learning, tahap <i>Memahami–Mengaplikasi–Merefleksi</i>) serta menyisipkan <b>Ayat Al-Qur&apos;an + Terjemahan &amp; Tadabbur</b> sesuai topik materi.
                  </span>
                </div>
              )}

              {aiTipe === 'cp' && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-950 leading-relaxed flex items-start gap-2">
                  <Layers className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <span>
                    Otomatis menyusun <b>Capaian Pembelajaran (CP) Resmi BSKAP Kemendikdasmen</b>: Identitas Dokumen, Rasional, Tujuan, Karakteristik, CP Umum Akhir Fase, <b>Tabel CP Per Elemen</b>, 8 Dimensi Profil Lulusan, serta Integrasi Ayat Al-Qur&apos;an.
                  </span>
                </div>
              )}

              {aiTipe === 'atp' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-[11px] text-emerald-950 leading-relaxed flex items-start gap-2">
                  <GitBranch className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Otomatis menyusun <b>Alur Tujuan Pembelajaran (ATP) Resmi 1 Tahun</b>: Rasional Alur, CP Umum, <b>Matriks TP Sekuensial Semester I &amp; II</b> (Kode TP, Elemen CP, Materi Esensial, Alokasi JP, 8 Dimensi Profil Lulusan, Strategi Asesmen), Glosarium, serta Integrasi Ayat Al-Qur&apos;an.
                  </span>
                </div>
              )}

              {aiTipe === 'kktp' && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-[11px] text-indigo-950 leading-relaxed flex items-start gap-2">
                  <ClipboardCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <span>
                    Otomatis menyusun <b>KKTP Resmi (Panduan Pembelajaran &amp; Asesmen Kemendikdasmen)</b>: Daftar Tujuan Pembelajaran (TP), <b>Tabel Rubrik 4 Level</b> (Baru Berkembang–Mahir), <b>Skala Interval Nilai &amp; Intervensi</b>, Deskripsi Kriteria, Program Remedial/Pengayaan, dan Integrasi Nilai Islami.
                  </span>
                </div>
              )}

              {aiTipe === 'prota' && (
                <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-[11px] text-teal-950 leading-relaxed flex items-start gap-2">
                  <Calendar className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <span>
                    Otomatis menyusun <b>Program Tahunan (PROTA) Resmi 1 Tahun Pelajaran</b>: Distribusi <b>Semester I (Ganjil)</b> &amp; <b>Semester II (Genap)</b> lengkap dengan alokasi JP per unit, ASTS/SAS/SAT, 36 Minggu Efektif, serta Integrasi Ayat Al-Qur&apos;an.
                  </span>
                </div>
              )}

              {aiTipe === 'prosem' && (
                <div className="p-3 bg-cyan-50 border border-cyan-200 rounded-xl text-[11px] text-cyan-950 leading-relaxed flex items-start gap-2">
                  <Grid className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                  <span>
                    Otomatis menyusun <b>Program Semester (PROSEM) Resmi</b>: <b>Rincian Pekan Efektif (RPE) 6 Bulan</b> (Jul–Des atau Jan–Jun) &amp; <b>Matriks Distribusi Mingguan (Bulan &times; M1–M4)</b> lengkap dengan alokasi JP per pekan, ASTS/SAS/SAT, serta Integrasi Ayat Al-Qur&apos;an.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Mata Pelajaran</label>
                  <select
                    value={aiMapel}
                    onChange={e => setAiMapel(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none"
                  >
                    {availableMapelList.length > 0 ? (
                      availableMapelList.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))
                    ) : (
                      <option value="Umum">Umum</option>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Kelas / Fase</label>
                  <input
                    type="text"
                    value={aiKelas}
                    onChange={e => setAiKelas(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {aiTipe === 'prosem' && (
                <div>
                  <label className="text-[11px] font-bold text-slate-700">Semester Target</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {(['Ganjil', 'Genap'] as const).map((sem) => (
                      <button
                        key={sem}
                        type="button"
                        onClick={() => setAiSemester(sem)}
                        className={`p-2 rounded-lg text-xs font-bold border transition-all ${
                          aiSemester === sem
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        Semester {sem} ({sem === 'Ganjil' ? 'Jul–Des' : 'Jan–Jun'})
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="text-[11px] font-bold text-slate-700">
                  {aiTipe === 'atp'
                    ? 'Fokus / Tema ATP Tahunan (Opsional)'
                    : aiTipe === 'prota'
                    ? 'Fokus / Tema Tahunan (Opsional)'
                    : aiTipe === 'prosem'
                    ? 'Fokus / Tema Semester (Opsional)'
                    : 'Topik / Materi Pembelajaran'}
                </label>
                <textarea
                  rows={2}
                  value={aiTopik}
                  onChange={e => setAiTopik(e.target.value)}
                  placeholder={
                    aiTipe === 'atp'
                      ? 'Opsional: kosongkan untuk alur lengkap 1 tahun atau isi fokus utama (misal: Algoritma & Berpikir Komputasional)...'
                      : aiTipe === 'prota'
                      ? 'Opsional: kosongkan untuk 1 tahun penuh atau isi fokus khusus (misal: Penguatan Literasi Digital & Proyek Koding)...'
                      : aiTipe === 'prosem'
                      ? 'Opsional: kosongkan untuk distribusi standar 1 semester atau isi fokus khusus (misal: Berpikir Komputasional & Proyek Mini)...'
                      : 'Contoh: Struktur Data, Topologi Jaringan Komputer, Aritmetika Sosial...'
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <button
                onClick={handleGenerateAiDoc}
                disabled={loadingAi}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-md"
              >
                {loadingAi
                  ? aiTipe === 'cp'
                    ? 'Menyusun Capaian Pembelajaran (CP) Resmi...'
                    : aiTipe === 'atp'
                    ? 'Menyusun Alur Tujuan Pembelajaran (ATP) Resmi Sem I & II...'
                    : aiTipe === 'kktp'
                    ? 'Menyusun KKTP Resmi (Rubrik 4 Level & Interval Nilai)...'
                    : aiTipe === 'prota'
                    ? 'Menyusun Program Tahunan (Distribusi JP Sem I & II)...'
                    : aiTipe === 'prosem'
                    ? `Menyusun Program Semester ${aiSemester} (RPE & Matriks Mingguan)...`
                    : aiTipe === 'modul_ajar'
                    ? 'Menyusun Modul Mendalam + Ayat Al-Qur\'an...'
                    : 'Menyusun Dokumen Administrasi...'
                  : 'Generate Dokumen Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW / EDIT / PRINT DOKUMEN MODAL */}
      {activeDoc && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl space-y-4 max-h-[92vh] flex flex-col">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded uppercase">
                    {activeDoc.tipe.replace('_', ' ')}
                  </span>
                  <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-2 py-0.5 rounded">
                    T.A. {activeDoc.tahunAjaran} ({activeDoc.semester})
                  </span>
                </div>
                <h3 className="font-bold text-slate-900 text-lg mt-1">{activeDoc.judul}</h3>
                <p className="text-xs text-slate-500">Penyusun: <span className="font-semibold text-slate-800">{activeDoc.guruNama}</span> • Mapel: <span className="font-semibold text-slate-800">{activeDoc.mataPelajaran}</span> ({activeDoc.kelas})</p>
              </div>
              <button onClick={() => setActiveDoc(null)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Document Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                {activeDoc.tipe === 'modul_ajar' && (
                  <button
                    onClick={() => {
                      setEditingModulDoc(activeDoc);
                      setIsModulEditorOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Layers className="w-3.5 h-3.5" /> Edit Modul &amp; Ayat Al-Qur&apos;an
                  </button>
                )}
                {activeDoc.tipe === 'cp' && !isStructuredCpData(activeDoc.kontenJson) && (
                  <button
                    onClick={handleUpgradeLegacyCpDoc}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                    title="Simpan format resmi Capaian Pembelajaran BSKAP secara permanen ke arsip"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Format CP Resmi
                  </button>
                )}
                {activeDoc.tipe === 'atp' && (
                  <button
                    onClick={() => {
                      setEditingAtpDoc(activeDoc);
                      setIsAtpEditorOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <GitBranch className="w-3.5 h-3.5" /> Edit Alur &amp; JP ATP
                  </button>
                )}
                {activeDoc.tipe === 'atp' && !isStructuredAtpData(activeDoc.kontenJson) && (
                  <button
                    onClick={handleUpgradeLegacyAtpDoc}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                    title="Simpan format resmi Alur Tujuan Pembelajaran (ATP) secara permanen ke arsip"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Format ATP Resmi
                  </button>
                )}
                {activeDoc.tipe === 'kktp' && (
                  <button
                    onClick={() => {
                      setEditingKktpDoc(activeDoc);
                      setIsKktpEditorOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" /> Edit Rubrik &amp; Interval KKTP
                  </button>
                )}
                {activeDoc.tipe === 'kktp' && !isStructuredKktpData(activeDoc.kontenJson) && (
                  <button
                    onClick={handleUpgradeLegacyKktpDoc}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Format KKTP Resmi
                  </button>
                )}
                {activeDoc.tipe === 'prota' && (
                  <button
                    onClick={() => {
                      setEditingProtaDoc(activeDoc);
                      setIsProtaEditorOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Calendar className="w-3.5 h-3.5" /> Edit Tabel &amp; JP Prota
                  </button>
                )}
                {activeDoc.tipe === 'prota' && !isStructuredProtaData(activeDoc.kontenJson) && (
                  <button
                    onClick={handleUpgradeLegacyProtaDoc}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Format Prota Resmi
                  </button>
                )}
                {activeDoc.tipe === 'prosem' && (
                  <button
                    onClick={() => {
                      setEditingProsemDoc(activeDoc);
                      setIsProsemEditorOpen(true);
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <Grid className="w-3.5 h-3.5" /> Edit Matriks &amp; RPE Prosem
                  </button>
                )}
                {activeDoc.tipe === 'prosem' && !isStructuredProsemData(activeDoc.kontenJson) && (
                  <button
                    onClick={handleUpgradeLegacyProsemDoc}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm transition-all"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Simpan Format Prosem Resmi
                  </button>
                )}
                <button
                  onClick={() => setIsEditingActiveDoc(!isEditingActiveDoc)}
                  className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                    isEditingActiveDoc
                      ? 'bg-amber-500 text-slate-950'
                      : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  {isEditingActiveDoc ? 'Batal Edit' : 'Edit Teks Ringkas'}
                </button>

                {isEditingActiveDoc && (
                  <button
                    onClick={handleSaveActiveDoc}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <Save className="w-3.5 h-3.5" /> Simpan Perubahan
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDownloadDocx}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 font-bold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" /> .DOC
                </button>
                <button
                  onClick={handleDownloadTxt}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 font-bold rounded-lg flex items-center gap-1.5 transition-all"
                >
                  <FileText className="w-3.5 h-3.5 text-slate-500" /> .TXT
                </button>
                <button
                  onClick={handlePrintDoc}
                  className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-lg flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak Sekarang
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-y-auto min-h-0 pt-2 bg-slate-50/50 rounded-xl">
              {shouldRenderStructuredCp(activeDoc) && !isEditingActiveDoc ? (() => {
                const cp = resolveCpData(activeDoc);
                return (
                <div className="p-6 sm:p-8 space-y-6 bg-white min-h-full rounded-xl border border-slate-200/80">
                  {/* Kop Resmi Dokumen CP */}
                  <div className="text-center border-b-2 border-emerald-600 pb-4 space-y-1">
                    <p className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
                      {cp.identitas.satuanPendidikan}
                    </p>
                    <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                      CAPAIAN PEMBELAJARAN (CP)
                    </h4>
                    <p className="text-xs font-semibold text-slate-600">
                      {cp.identitas.referensiRegulasi}
                    </p>
                  </div>

                  {/* Identitas Dokumen CP */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Mata Pelajaran</span>
                        <span className="font-bold text-emerald-800">: {cp.identitas.mataPelajaran}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Fase / Kelas</span>
                        <span className="font-semibold text-slate-800">: {cp.identitas.fase} / Kelas {cp.identitas.kelas}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Fokus Materi</span>
                        <span className="font-bold text-slate-900">: {cp.identitas.topikFokus}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Tahun Ajaran</span>
                        <span className="font-semibold text-slate-800">: {cp.identitas.tahunAjaran} ({cp.identitas.semester})</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Guru Penyusun</span>
                        <span className="font-semibold text-slate-800">: {cp.identitas.namaPenyusun}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Satuan Pendidikan</span>
                        <span className="font-semibold text-slate-800">: {cp.identitas.satuanPendidikan}</span>
                      </div>
                    </div>
                  </div>

                  {/* A. Rasional Mata Pelajaran */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-emerald-600 pl-3 uppercase">
                      A. Rasional Mata Pelajaran
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed text-justify">
                      {cp.rasional}
                    </p>
                  </div>

                  {/* B. Tujuan Mata Pelajaran */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-blue-600 pl-3 uppercase">
                      B. Tujuan Mata Pelajaran
                    </h5>
                    <ol className="list-decimal list-outside pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
                      {cp.tujuanMataPelajaran.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ol>
                  </div>

                  {/* C. Karakteristik Mata Pelajaran */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-indigo-600 pl-3 uppercase">
                      C. Karakteristik Mata Pelajaran
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed text-justify">
                      {cp.karakteristik}
                    </p>
                  </div>

                  {/* D. Capaian Pembelajaran Umum */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-teal-600 pl-3 uppercase">
                      D. Capaian Pembelajaran Umum ({cp.identitas.fase})
                    </h5>
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 leading-relaxed text-justify font-medium">
                      {cp.capaianUmumFase}
                    </div>
                  </div>

                  {/* E. Tabel Capaian Pembelajaran Per Elemen */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-amber-500 pl-3 uppercase">
                      E. Capaian Pembelajaran Per Elemen
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-emerald-800 text-white">
                            <th className="py-2.5 px-3 font-bold text-center w-10 border-r border-emerald-700">No</th>
                            <th className="py-2.5 px-3 font-bold w-44 border-r border-emerald-700">Elemen</th>
                            <th className="py-2.5 px-3 font-bold border-r border-emerald-700">Capaian Pembelajaran (CP)</th>
                            <th className="py-2.5 px-3 font-bold w-56">Kompetensi &amp; Lingkup Materi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {cp.elemenList.map((el, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-3 px-3 text-center font-bold text-slate-600 align-top border-r border-slate-200">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3 font-bold text-emerald-900 align-top border-r border-slate-200">
                                {el.elemen}
                              </td>
                              <td className="py-3 px-3 text-slate-700 leading-relaxed text-justify align-top border-r border-slate-200">
                                {el.deskripsiCp}
                              </td>
                              <td className="py-3 px-3 text-slate-700 leading-relaxed align-top space-y-1.5">
                                <div>
                                  <span className="font-bold text-slate-800">Kompetensi: </span>
                                  <span>{el.kompetensiInti}</span>
                                </div>
                                <div>
                                  <span className="font-bold text-slate-800">Materi: </span>
                                  <span>{el.lingkupMateri}</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* F. 8 Dimensi Profil Lulusan & Integrasi Nilai Islami */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-black text-emerald-950 uppercase flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-emerald-600" />
                        F. 8 Dimensi Profil Lulusan &amp; Integrasi Nilai Islami
                      </h5>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {cp.integrasiNilaiIslami.surahAyat}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {cp.dimensiProfilLulusan.map((dim) => (
                        <span key={dim} className="px-2.5 py-1 bg-white text-emerald-800 text-[10px] font-bold rounded-lg border border-emerald-200">
                          {dim}
                        </span>
                      ))}
                    </div>

                    <div
                      dir="rtl"
                      className="p-4 rounded-xl bg-white border border-emerald-100 text-right font-serif text-xl sm:text-2xl leading-[2.1] text-emerald-950"
                    >
                      {cp.integrasiNilaiIslami.teksArab}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="text-emerald-900 italic leading-relaxed">
                        <span className="font-bold not-italic text-emerald-800">Artinya ({cp.integrasiNilaiIslami.surahAyat}): </span>
                        &ldquo;{cp.integrasiNilaiIslami.terjemahan}&rdquo;
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-emerald-800">Relevansi terhadap CP: </span>
                        {cp.integrasiNilaiIslami.relevansiCp}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic text-center pt-2">
                    --- Dokumen Resmi Capaian Pembelajaran (CP) Standar BSKAP Kemendikdasmen ---
                  </p>
                </div>
                );
              })() : shouldRenderStructuredAtp(activeDoc) && !isEditingActiveDoc ? (() => {
                const atp = resolveAtpData(activeDoc);
                const summary = calculateAtpSummary(atp);
                const ganjilRows = atp.daftarAlur.filter((r) => r.semester === 'Ganjil');
                const genapRows = atp.daftarAlur.filter((r) => r.semester === 'Genap');
                const renderAtpTable = (rows: typeof ganjilRows, semLabel: string, subtotalTp: number, subtotalJp: number) => (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-emerald-800 text-white">
                          <th className="py-2.5 px-3 font-bold text-center w-24 border-r border-emerald-700">Kode TP</th>
                          <th className="py-2.5 px-3 font-bold w-36 border-r border-emerald-700">Elemen CP</th>
                          <th className="py-2.5 px-3 font-bold border-r border-emerald-700">Rumusan Tujuan Pembelajaran (TP)</th>
                          <th className="py-2.5 px-3 font-bold w-40 border-r border-emerald-700">Materi Esensial</th>
                          <th className="py-2.5 px-3 font-bold text-center w-16 border-r border-emerald-700">JP</th>
                          <th className="py-2.5 px-3 font-bold w-36 border-r border-emerald-700">Profil Lulusan</th>
                          <th className="py-2.5 px-3 font-bold w-44">Asesmen &amp; Kata Kunci</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {rows.map((row, idx) => (
                          <tr key={`${row.kodeTp}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                            <td className="py-3 px-3 text-center font-black text-emerald-800 align-top border-r border-slate-200 whitespace-nowrap">
                              {row.kodeTp}
                            </td>
                            <td className="py-3 px-3 font-bold text-slate-900 align-top border-r border-slate-200">
                              {row.elemen}
                            </td>
                            <td className="py-3 px-3 text-slate-700 leading-relaxed text-justify align-top border-r border-slate-200">
                              {row.tujuanPembelajaran}
                            </td>
                            <td className="py-3 px-3 text-slate-700 font-medium align-top border-r border-slate-200">
                              {row.materiEsensial}
                            </td>
                            <td className="py-3 px-3 text-center font-black text-blue-700 align-top border-r border-slate-200 whitespace-nowrap">
                              {row.alokasiJp} JP
                            </td>
                            <td className="py-3 px-3 text-slate-700 align-top border-r border-slate-200">
                              {row.dimensiProfil}
                            </td>
                            <td className="py-3 px-3 text-slate-700 align-top space-y-1.5">
                              <div>{row.strategiAsesmen}</div>
                              {row.kataKunci && (
                                <div className="text-[10px] text-slate-500 italic">
                                  <span className="font-bold not-italic text-slate-600">Kata Kunci: </span>
                                  {row.kataKunci}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-emerald-50 font-black text-emerald-950">
                          <td colSpan={4} className="py-2.5 px-3 text-right uppercase border-r border-emerald-200">
                            Subtotal {semLabel} ({subtotalTp} TP)
                          </td>
                          <td className="py-2.5 px-3 text-center text-emerald-800 border-r border-emerald-200">
                            {subtotalJp} JP
                          </td>
                          <td colSpan={2} className="py-2.5 px-3 text-[11px] font-bold text-emerald-800">
                            Selaras Prota &amp; Prosem Kurikulum Nasional
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                );
                return (
                <div className="p-6 sm:p-8 space-y-6 bg-white min-h-full rounded-xl border border-slate-200/80">
                  {/* Kop Resmi Dokumen ATP */}
                  <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-black uppercase tracking-wider mb-1">
                      <GitBranch className="w-3.5 h-3.5" /> Kurikulum Nasional • Pendekatan Pembelajaran Mendalam
                    </div>
                    <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                      ALUR TUJUAN PEMBELAJARAN (ATP)
                    </h4>
                    <p className="text-xs font-bold text-emerald-700 uppercase">
                      {atp.identitas.mataPelajaran} • {atp.identitas.fase} (Kelas {atp.identitas.kelas})
                    </p>
                    <p className="text-[11px] font-semibold text-slate-600">
                      {atp.identitas.satuanPendidikan} • Tahun Ajaran {atp.identitas.tahunAjaran}
                    </p>
                  </div>

                  {!isStructuredAtpData(activeDoc.kontenJson) && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                      <span>
                        <b>Peningkatan Format Otomatis:</b> Dokumen ATP lama ini telah ditampilkan dalam format resmi lengkap (Matriks TP Sem I &amp; II, Alokasi JP, Profil Lulusan, Glosarium). Klik <b>Simpan Format ATP Resmi</b> di atas agar perubahan tersimpan permanen.
                      </span>
                    </div>
                  )}

                  {/* KPI Ringkasan ATP */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="text-[10px] font-bold uppercase text-emerald-700">Total Tujuan (TP)</div>
                      <div className="text-lg font-black text-emerald-950 mt-0.5">{summary.totalTp} TP</div>
                      <div className="text-[10px] text-emerald-700">{summary.jumlahElemen} Elemen CP</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="text-[10px] font-bold uppercase text-blue-700">Semester I (Ganjil)</div>
                      <div className="text-lg font-black text-blue-950 mt-0.5">{summary.totalJpGanjil} JP</div>
                      <div className="text-[10px] text-blue-700">{summary.tpGanjil} Tujuan Pembelajaran</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200">
                      <div className="text-[10px] font-bold uppercase text-indigo-700">Semester II (Genap)</div>
                      <div className="text-lg font-black text-indigo-950 mt-0.5">{summary.totalJpGenap} JP</div>
                      <div className="text-[10px] text-indigo-700">{summary.tpGenap} Tujuan Pembelajaran</div>
                    </div>
                    <div className="p-3.5 rounded-xl bg-slate-900 text-white border border-slate-800">
                      <div className="text-[10px] font-bold uppercase text-emerald-300">Total Alokasi Waktu</div>
                      <div className="text-lg font-black text-white mt-0.5">{summary.totalJp} JP</div>
                      <div className="text-[10px] text-slate-300">{atp.identitas.jpPerMinggu} JP / Minggu</div>
                    </div>
                  </div>

                  {/* Identitas Dokumen */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Satuan Pendidikan</span>
                        <span className="text-slate-900 font-semibold">: {atp.identitas.satuanPendidikan}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Mata Pelajaran</span>
                        <span className="text-emerald-700 font-bold">: {atp.identitas.mataPelajaran}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Fase / Kelas</span>
                        <span className="text-slate-900 font-semibold">: {atp.identitas.fase} / Kelas {atp.identitas.kelas}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Tahun Ajaran</span>
                        <span className="text-slate-900 font-semibold">: {atp.identitas.tahunAjaran}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Fokus / Tema</span>
                        <span className="text-slate-900 font-semibold">: {atp.identitas.fokusTopik}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Guru Penyusun</span>
                        <span className="text-slate-900 font-semibold">: {atp.identitas.namaPenyusun}</span>
                      </div>
                      <div className="flex gap-2 sm:col-span-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Referensi Regulasi</span>
                        <span className="text-slate-700">: {atp.identitas.referensiRegulasi}</span>
                      </div>
                    </div>
                  </div>

                  {/* A. Rasional Alur */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-emerald-600 pl-3 uppercase">
                      A. Rasional Penyusunan Alur Tujuan Pembelajaran
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed text-justify">
                      {atp.rasionalAlur}
                    </p>
                  </div>

                  {/* B. Capaian Pembelajaran Umum */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-teal-600 pl-3 uppercase">
                      B. Capaian Pembelajaran Umum ({atp.identitas.fase})
                    </h5>
                    <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 leading-relaxed text-justify font-medium">
                      {atp.capaianPembelajaranUmum}
                    </div>
                  </div>

                  {/* C. Matriks ATP Semester I (Ganjil) */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-blue-600 pl-3 uppercase">
                      C. Matriks Alur Tujuan Pembelajaran — Semester I (Ganjil)
                    </h5>
                    {renderAtpTable(ganjilRows, 'Semester I (Ganjil)', summary.tpGanjil, summary.totalJpGanjil)}
                  </div>

                  {/* D. Matriks ATP Semester II (Genap) */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-indigo-600 pl-3 uppercase">
                      D. Matriks Alur Tujuan Pembelajaran — Semester II (Genap)
                    </h5>
                    {renderAtpTable(genapRows, 'Semester II (Genap)', summary.tpGenap, summary.totalJpGenap)}
                  </div>

                  {/* E. Glosarium & Catatan Implementasi */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-amber-500 pl-3 uppercase">
                      E. Glosarium Istilah Kunci &amp; Catatan Implementasi
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-800 text-white">
                            <th className="py-2 px-3 font-bold text-center w-10 border-r border-slate-700">No</th>
                            <th className="py-2 px-3 font-bold w-48 border-r border-slate-700">Istilah Kunci</th>
                            <th className="py-2 px-3 font-bold">Definisi Operasional</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {atp.glosarium.map((item, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-500 border-r border-slate-200">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200">{item.istilah}</td>
                              <td className="py-2.5 px-3 text-slate-700 leading-relaxed">{item.definisi}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed text-justify">
                      <span className="font-bold text-slate-900">Catatan Implementasi Pembelajaran Mendalam: </span>
                      {atp.catatanImplementasi}
                    </div>
                  </div>

                  {/* F. Integrasi Nilai Islami */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-black text-emerald-950 uppercase flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-emerald-600" />
                        F. Integrasi Nilai Islami &amp; Ayat Al-Qur&apos;an
                      </h5>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {atp.integrasiNilaiIslami.surahAyat}
                      </span>
                    </div>

                    <div
                      dir="rtl"
                      className="p-4 rounded-xl bg-white border border-emerald-100 text-right font-serif text-xl sm:text-2xl leading-[2.1] text-emerald-950"
                    >
                      {atp.integrasiNilaiIslami.teksArab}
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <p className="text-emerald-900 italic leading-relaxed">
                        <span className="font-bold not-italic text-emerald-800">Artinya ({atp.integrasiNilaiIslami.surahAyat}): </span>
                        &ldquo;{atp.integrasiNilaiIslami.terjemahan}&rdquo;
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-emerald-800">Relevansi terhadap ATP: </span>
                        {atp.integrasiNilaiIslami.relevansiAtp}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic text-center pt-2">
                    --- Dokumen Resmi Alur Tujuan Pembelajaran (ATP) Kurikulum Nasional • Pembelajaran Mendalam ---
                  </p>
                </div>
                );
              })() : shouldRenderStructuredKktp(activeDoc) && !isEditingActiveDoc ? (() => {
                const kktp = resolveKktpData(activeDoc);
                return (
                <div className="p-6 sm:p-8 space-y-6 bg-white min-h-full rounded-xl border border-slate-200/80">
                  {/* Kop Resmi Dokumen KKTP */}
                  <div className="text-center border-b-2 border-emerald-600 pb-4 space-y-1">
                    <p className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
                      {kktp.identitas.satuanPendidikan}
                    </p>
                    <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                      KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)
                    </h4>
                    <p className="text-xs font-semibold text-slate-600">
                      {kktp.identitas.referensiRegulasi}
                    </p>
                  </div>

                  {/* Identitas Dokumen KKTP */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Mata Pelajaran</span>
                        <span className="font-bold text-emerald-800">: {kktp.identitas.mataPelajaran}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Fase / Kelas</span>
                        <span className="font-semibold text-slate-800">: {kktp.identitas.fase} / Kelas {kktp.identitas.kelas}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Topik / Materi</span>
                        <span className="font-bold text-slate-900">: {kktp.identitas.topikMateri}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Batas Ketuntasan</span>
                        <span className="font-bold text-blue-800">: Minimal Cakap (&ge; {kktp.identitas.batasMinimalPersen}%)</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Pendekatan KKTP</span>
                        <span className="font-semibold text-slate-800">: {kktp.identitas.pendekatanUtama}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Guru Penyusun</span>
                        <span className="font-semibold text-slate-800">: {kktp.identitas.namaPenyusun}</span>
                      </div>
                    </div>
                  </div>

                  {/* A. Capaian & Tujuan Pembelajaran */}
                  <div className="space-y-2.5">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-emerald-600 pl-3 uppercase">
                      A. Capaian &amp; Tujuan Pembelajaran yang Diukur
                    </h5>
                    <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed text-justify">
                      <span className="font-bold text-slate-900">Capaian Pembelajaran (CP): </span>
                      {kktp.capaianPembelajaranRingkas}
                    </div>
                    <ol className="list-decimal list-outside pl-5 space-y-1.5 text-xs text-slate-700 leading-relaxed">
                      {kktp.tujuanPembelajaran.map((tp, idx) => (
                        <li key={idx} className="font-medium">{tp}</li>
                      ))}
                    </ol>
                  </div>

                  {/* B. Tabel Rubrik 4 Level */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-blue-600 pl-3 uppercase">
                      B. Pendekatan Rubrik Ketercapaian (4 Level Penguasaan)
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-[11px] min-w-[700px]">
                        <thead>
                          <tr>
                            <th className="py-2.5 px-2.5 bg-slate-800 text-white font-bold text-center w-9 border-r border-slate-700">No</th>
                            <th className="py-2.5 px-3 bg-slate-800 text-white font-bold w-40 border-r border-slate-700">Aspek / Indikator</th>
                            <th className="py-2.5 px-3 bg-rose-700 text-white font-bold border-r border-rose-600">Baru Berkembang (1)</th>
                            <th className="py-2.5 px-3 bg-amber-600 text-white font-bold border-r border-amber-500">Layak (2)</th>
                            <th className="py-2.5 px-3 bg-blue-700 text-white font-bold border-r border-blue-600">Cakap (3 — Tuntas)</th>
                            <th className="py-2.5 px-3 bg-emerald-700 text-white font-bold">Mahir (4 — Unggul)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {kktp.rubrikPenilaian.map((r, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-3 px-2.5 text-center font-bold text-slate-600 align-top border-r border-slate-200">{idx + 1}</td>
                              <td className="py-3 px-3 font-bold text-slate-900 align-top border-r border-slate-200">{r.aspek}</td>
                              <td className="py-3 px-3 text-slate-700 leading-relaxed align-top border-r border-slate-200">{r.baruBerkembang}</td>
                              <td className="py-3 px-3 text-slate-700 leading-relaxed align-top border-r border-slate-200">{r.layak}</td>
                              <td className="py-3 px-3 text-slate-800 leading-relaxed align-top border-r border-slate-200 bg-blue-50/30">{r.cakap}</td>
                              <td className="py-3 px-3 text-slate-800 leading-relaxed align-top bg-emerald-50/30">{r.mahir}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* C. Tabel Interval Nilai & Tindak Lanjut */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-indigo-600 pl-3 uppercase">
                      C. Skala Interval Nilai &amp; Tindak Lanjut Intervensi
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-800 text-white">
                            <th className="py-2.5 px-3 font-bold text-center w-28 border-r border-slate-700">Interval</th>
                            <th className="py-2.5 px-3 font-bold w-48 border-r border-slate-700">Predikat Penguasaan</th>
                            <th className="py-2.5 px-3 font-bold text-center w-32 border-r border-slate-700">Status</th>
                            <th className="py-2.5 px-3 font-bold">Tindak Lanjut / Intervensi Guru</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {kktp.intervalNilai.map((iv, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-3 text-center font-black text-slate-900 border-r border-slate-200">{iv.rentang}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-800 border-r border-slate-200">{iv.predikat}</td>
                              <td className="py-2.5 px-3 text-center border-r border-slate-200">
                                <span
                                  className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                    iv.ketuntasan === 'Tuntas'
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-rose-100 text-rose-800 border border-rose-200'
                                  }`}
                                >
                                  {iv.ketuntasan}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-slate-700 leading-relaxed">{iv.tindakLanjut}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* D. Deskripsi Kriteria (Ceklis Memadai / Tidak Memadai) */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-amber-500 pl-3 uppercase">
                      D. Deskripsi Kriteria Ketercapaian (Ceklis Observasi)
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-slate-100 text-slate-800 border-b border-slate-200">
                            <th className="py-2.5 px-3 font-bold text-center w-10 border-r border-slate-200">No</th>
                            <th className="py-2.5 px-3 font-bold w-48 border-r border-slate-200">Kriteria Penilaian</th>
                            <th className="py-2.5 px-3 font-bold border-r border-slate-200">Bukti Ketercapaian (Memadai)</th>
                            <th className="py-2.5 px-3 font-bold text-center w-24 border-r border-slate-200">Memadai</th>
                            <th className="py-2.5 px-3 font-bold text-center w-28">Tidak Memadai</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {kktp.deskripsiKriteria.map((d, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-600 border-r border-slate-200">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-900 border-r border-slate-200">{d.kriteria}</td>
                              <td className="py-2.5 px-3 text-slate-700 leading-relaxed border-r border-slate-200">{d.targetMemadai}</td>
                              <td className="py-2.5 px-3 text-center text-slate-400 border-r border-slate-200">&#9744;</td>
                              <td className="py-2.5 px-3 text-center text-slate-400">&#9744;</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* E. Keputusan Ketuntasan & Tindak Lanjut */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-teal-600 pl-3 uppercase">
                      E. Keputusan Ketuntasan &amp; Program Tindak Lanjut
                    </h5>
                    <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-950 font-medium leading-relaxed">
                      <span className="font-black text-emerald-800">Keputusan Ketuntasan: </span>
                      {kktp.keputusanKetuntasan}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200">
                        <p className="font-bold text-amber-900 mb-1">Program Remedial</p>
                        <p className="text-slate-700 leading-relaxed">{kktp.strategiRemedial}</p>
                      </div>
                      <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200">
                        <p className="font-bold text-blue-900 mb-1">Program Pengayaan</p>
                        <p className="text-slate-700 leading-relaxed">{kktp.strategiPengayaan}</p>
                      </div>
                    </div>
                  </div>

                  {/* F. Integrasi Nilai Islami */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-black text-emerald-950 uppercase flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-emerald-600" />
                        F. Integrasi Nilai Islami dalam Asesmen
                      </h5>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {kktp.integrasiNilaiIslami.surahAyat}
                      </span>
                    </div>
                    <div
                      dir="rtl"
                      className="p-4 rounded-xl bg-white border border-emerald-100 text-right font-serif text-xl sm:text-2xl leading-[2.1] text-emerald-950"
                    >
                      {kktp.integrasiNilaiIslami.teksArab}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <p className="text-emerald-900 italic leading-relaxed">
                        <span className="font-bold not-italic text-emerald-800">Artinya ({kktp.integrasiNilaiIslami.surahAyat}): </span>
                        &ldquo;{kktp.integrasiNilaiIslami.terjemahan}&rdquo;
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-emerald-800">Relevansi terhadap KKTP: </span>
                        {kktp.integrasiNilaiIslami.relevansiKktp}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic text-center pt-2">
                    --- Dokumen Resmi KKTP Standar Panduan Pembelajaran &amp; Asesmen (PPA) Kemendikdasmen ---
                  </p>
                </div>
                );
              })() : shouldRenderStructuredProta(activeDoc) && !isEditingActiveDoc ? (() => {
                const prota = resolveProtaData(activeDoc);
                const summary = calculateProtaSummary(prota);
                const ganjilRows = prota.distribusiSemester.filter((r) => r.semester === 'Ganjil');
                const genapRows = prota.distribusiSemester.filter((r) => r.semester === 'Genap');
                return (
                <div className="p-6 sm:p-8 space-y-6 bg-white min-h-full rounded-xl border border-slate-200/80">
                  {/* Kop Resmi PROTA */}
                  <div className="text-center border-b-2 border-emerald-600 pb-4 space-y-1">
                    <p className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
                      {prota.identitas.satuanPendidikan}
                    </p>
                    <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                      PROGRAM TAHUNAN (PROTA)
                    </h4>
                    <p className="text-xs font-semibold text-slate-600">
                      {prota.identitas.referensiRegulasi}
                    </p>
                  </div>

                  {/* Identitas & Ringkasan KPI JP */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Mata Pelajaran</span>
                        <span className="font-bold text-emerald-800">: {prota.identitas.mataPelajaran}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Fase / Kelas</span>
                        <span className="font-semibold text-slate-800">: {prota.identitas.fase} / Kelas {prota.identitas.kelas}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Tahun Ajaran</span>
                        <span className="font-semibold text-slate-800">: {prota.identitas.tahunAjaran}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Guru Penyusun</span>
                        <span className="font-semibold text-slate-800">: {prota.identitas.namaPenyusun}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Beban Belajar</p>
                        <p className="text-base font-black text-slate-900 mt-0.5">{prota.identitas.jpPerMinggu} JP / Mg</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Semester I (Ganjil)</p>
                        <p className="text-base font-black text-emerald-900 mt-0.5">{summary.totalJpGanjil} JP</p>
                        <p className="text-[10px] text-emerald-700">{prota.identitas.mingguEfektifGanjil} Minggu Efektif</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-[10px] font-bold text-blue-700 uppercase">Semester II (Genap)</p>
                        <p className="text-base font-black text-blue-900 mt-0.5">{summary.totalJpGenap} JP</p>
                        <p className="text-[10px] text-blue-700">{prota.identitas.mingguEfektifGenap} Minggu Efektif</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 text-white">
                        <p className="text-[10px] font-bold text-slate-300 uppercase">Total 1 Tahun</p>
                        <p className="text-base font-black text-emerald-400 mt-0.5">{summary.totalJpTahunan} JP</p>
                        <p className="text-[10px] text-slate-300">Target: {summary.targetJpTahunan} JP</p>
                      </div>
                    </div>
                  </div>

                  {/* A. Capaian Umum Tahunan */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-emerald-600 pl-3 uppercase">
                      A. Capaian Pembelajaran Umum Tahunan
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed text-justify p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                      {prota.capaianUmumTahunan}
                    </p>
                  </div>

                  {/* B. Tabel Semester I (Ganjil) */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-emerald-600 pl-3 uppercase">
                      B. Distribusi Alur Tujuan Pembelajaran — Semester I (Ganjil)
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs min-w-[680px]">
                        <thead>
                          <tr className="bg-emerald-800 text-white">
                            <th className="py-2.5 px-2.5 font-bold text-center w-10 border-r border-emerald-700">No</th>
                            <th className="py-2.5 px-3 font-bold w-44 border-r border-emerald-700">Elemen / Unit</th>
                            <th className="py-2.5 px-3 font-bold border-r border-emerald-700">Alur Tujuan Pembelajaran (ATP) / Materi Pokok</th>
                            <th className="py-2.5 px-2.5 font-bold text-center w-20 border-r border-emerald-700">Alokasi</th>
                            <th className="py-2.5 px-3 font-bold w-32 border-r border-emerald-700">Bulan</th>
                            <th className="py-2.5 px-3 font-bold w-36">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {ganjilRows.map((r, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-600 align-top border-r border-slate-200">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-emerald-900 align-top border-r border-slate-200">{r.elemen}</td>
                              <td className="py-2.5 px-3 text-slate-700 leading-relaxed align-top border-r border-slate-200">{r.tujuanPembelajaran}</td>
                              <td className="py-2.5 px-2.5 text-center font-black text-emerald-800 align-top border-r border-slate-200">{r.alokasiJp} JP</td>
                              <td className="py-2.5 px-3 text-slate-700 align-top border-r border-slate-200">{r.bulanPelaksanaan}</td>
                              <td className="py-2.5 px-3 text-slate-600 align-top text-[11px]">{r.keterangan}</td>
                            </tr>
                          ))}
                          <tr className="bg-emerald-50 font-bold text-emerald-950 border-t-2 border-emerald-200">
                            <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px]">
                              Subtotal Semester I (Ganjil)
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-black text-emerald-800">
                              {summary.totalJpGanjil} JP
                            </td>
                            <td colSpan={2} className="py-2.5 px-3 text-[11px] text-emerald-800">
                              {prota.identitas.mingguEfektifGanjil} Minggu Efektif ({summary.jumlahUnitGanjil} Unit)
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* C. Tabel Semester II (Genap) */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-blue-600 pl-3 uppercase">
                      C. Distribusi Alur Tujuan Pembelajaran — Semester II (Genap)
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs min-w-[680px]">
                        <thead>
                          <tr className="bg-blue-800 text-white">
                            <th className="py-2.5 px-2.5 font-bold text-center w-10 border-r border-blue-700">No</th>
                            <th className="py-2.5 px-3 font-bold w-44 border-r border-blue-700">Elemen / Unit</th>
                            <th className="py-2.5 px-3 font-bold border-r border-blue-700">Alur Tujuan Pembelajaran (ATP) / Materi Pokok</th>
                            <th className="py-2.5 px-2.5 font-bold text-center w-20 border-r border-blue-700">Alokasi</th>
                            <th className="py-2.5 px-3 font-bold w-32 border-r border-blue-700">Bulan</th>
                            <th className="py-2.5 px-3 font-bold w-36">Keterangan</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {genapRows.map((r, idx) => (
                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                              <td className="py-2.5 px-2.5 text-center font-bold text-slate-600 align-top border-r border-slate-200">{idx + 1}</td>
                              <td className="py-2.5 px-3 font-bold text-blue-900 align-top border-r border-slate-200">{r.elemen}</td>
                              <td className="py-2.5 px-3 text-slate-700 leading-relaxed align-top border-r border-slate-200">{r.tujuanPembelajaran}</td>
                              <td className="py-2.5 px-2.5 text-center font-black text-blue-800 align-top border-r border-slate-200">{r.alokasiJp} JP</td>
                              <td className="py-2.5 px-3 text-slate-700 align-top border-r border-slate-200">{r.bulanPelaksanaan}</td>
                              <td className="py-2.5 px-3 text-slate-600 align-top text-[11px]">{r.keterangan}</td>
                            </tr>
                          ))}
                          <tr className="bg-blue-50 font-bold text-blue-950 border-t-2 border-blue-200">
                            <td colSpan={3} className="py-2.5 px-3 text-right uppercase text-[11px]">
                              Subtotal Semester II (Genap)
                            </td>
                            <td className="py-2.5 px-2.5 text-center font-black text-blue-800">
                              {summary.totalJpGenap} JP
                            </td>
                            <td colSpan={2} className="py-2.5 px-3 text-[11px] text-blue-800">
                              {prota.identitas.mingguEfektifGenap} Minggu Efektif ({summary.jumlahUnitGenap} Unit)
                            </td>
                          </tr>
                          <tr className="bg-slate-900 text-white font-bold">
                            <td colSpan={3} className="py-3 px-3 text-right uppercase text-[11px]">
                              Total Alokasi Waktu 1 Tahun Pelajaran ({prota.identitas.tahunAjaran})
                            </td>
                            <td className="py-3 px-2.5 text-center font-black text-emerald-400">
                              {summary.totalJpTahunan} JP
                            </td>
                            <td colSpan={2} className="py-3 px-3 text-[11px] text-slate-300">
                              {prota.identitas.mingguEfektifGanjil + prota.identitas.mingguEfektifGenap} Minggu Efektif / Tahun
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* D. Catatan Kalender Pendidikan */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-amber-500 pl-3 uppercase">
                      D. Catatan Kalender Pendidikan &amp; Fleksibilitas Pelaksanaan
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed text-justify p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
                      {prota.catatanPelaksanaan}
                    </p>
                  </div>

                  {/* E. Integrasi Nilai Islami */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-black text-emerald-950 uppercase flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-emerald-600" />
                        E. Integrasi Nilai Islami dalam Program Tahunan
                      </h5>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {prota.integrasiNilaiIslami.surahAyat}
                      </span>
                    </div>
                    <div
                      dir="rtl"
                      className="p-4 rounded-xl bg-white border border-emerald-100 text-right font-serif text-xl sm:text-2xl leading-[2.1] text-emerald-950"
                    >
                      {prota.integrasiNilaiIslami.teksArab}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <p className="text-emerald-900 italic leading-relaxed">
                        <span className="font-bold not-italic text-emerald-800">Artinya ({prota.integrasiNilaiIslami.surahAyat}): </span>
                        &ldquo;{prota.integrasiNilaiIslami.terjemahan}&rdquo;
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-emerald-800">Relevansi terhadap Program Tahunan: </span>
                        {prota.integrasiNilaiIslami.relevansiProta}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic text-center pt-2">
                    --- Dokumen Resmi Program Tahunan (PROTA) Standar Kurikulum Nasional ---
                  </p>
                </div>
                );
              })() : shouldRenderStructuredProsem(activeDoc) && !isEditingActiveDoc ? (() => {
                const prosem = resolveProsemData(activeDoc);
                const summary = calculateProsemSummary(prosem);
                const months = getProsemMonths(prosem.identitas.semester);
                const jpPerMinggu = Number(prosem.identitas.jpPerMinggu) || 3;
                const getBadgeStyle = (jenis: string) =>
                  jenis === 'Asesmen'
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : jenis === 'Proyek'
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : jenis === 'Remedial'
                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                    : 'bg-emerald-100 text-emerald-900 border-emerald-300';
                return (
                <div className="p-6 sm:p-8 space-y-6 bg-white min-h-full rounded-xl border border-slate-200/80">
                  {/* Kop Resmi PROSEM */}
                  <div className="text-center border-b-2 border-emerald-600 pb-4 space-y-1">
                    <p className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase">
                      {prosem.identitas.satuanPendidikan}
                    </p>
                    <h4 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-tight">
                      PROGRAM SEMESTER (PROSEM) — SEMESTER {prosem.identitas.semester.toUpperCase()}
                    </h4>
                    <p className="text-xs font-semibold text-slate-600">
                      {prosem.identitas.referensiRegulasi}
                    </p>
                  </div>

                  {/* Identitas & 4 KPI Cards */}
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Mata Pelajaran</span>
                        <span className="font-bold text-emerald-800">: {prosem.identitas.mataPelajaran}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Fase / Kelas</span>
                        <span className="font-semibold text-slate-800">: {prosem.identitas.fase} / Kelas {prosem.identitas.kelas}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Semester / T.A.</span>
                        <span className="font-bold text-blue-800">: Semester {prosem.identitas.semester} ({prosem.identitas.tahunAjaran})</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Guru Penyusun</span>
                        <span className="font-semibold text-slate-800">: {prosem.identitas.namaPenyusun}</span>
                      </div>
                      <div className="flex gap-2 md:col-span-2">
                        <span className="font-bold text-slate-500 w-36 shrink-0">Fokus Semester</span>
                        <span className="font-semibold text-slate-800">: {prosem.identitas.fokusSemester}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-2 border-t border-slate-200">
                      <div className="p-3 rounded-xl bg-white border border-slate-200">
                        <p className="text-[10px] font-bold text-slate-500 uppercase">Beban Belajar</p>
                        <p className="text-base font-black text-slate-900 mt-0.5">{jpPerMinggu} JP / Mg</p>
                      </div>
                      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                        <p className="text-[10px] font-bold text-emerald-700 uppercase">Pekan Efektif</p>
                        <p className="text-base font-black text-emerald-900 mt-0.5">{summary.totalPekanEfektif} Pekan</p>
                        <p className="text-[10px] text-emerald-700">Dari {summary.totalPekan} Pekan Kalender</p>
                      </div>
                      <div className="p-3 rounded-xl bg-blue-50 border border-blue-200">
                        <p className="text-[10px] font-bold text-blue-700 uppercase">Target JP RPE</p>
                        <p className="text-base font-black text-blue-900 mt-0.5">{summary.targetJpEfektif} JP</p>
                        <p className="text-[10px] text-blue-700">{summary.totalPekanEfektif} &times; {jpPerMinggu} JP</p>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-900 text-white">
                        <p className="text-[10px] font-bold text-slate-300 uppercase">Total JP Matriks</p>
                        <p className="text-base font-black text-emerald-400 mt-0.5">{summary.totalJpMatriks} JP</p>
                        <p className="text-[10px] text-slate-300">{summary.jumlahUnit} Unit ATP / Kegiatan</p>
                      </div>
                    </div>
                  </div>

                  {/* A. Tabel Rincian Pekan Efektif (RPE) */}
                  <div className="space-y-3">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-emerald-600 pl-3 uppercase">
                      A. Rincian Pekan Efektif (RPE) — Semester {prosem.identitas.semester}
                    </h5>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-xs min-w-[640px]">
                        <thead>
                          <tr className="bg-emerald-800 text-white">
                            <th className="py-2.5 px-2.5 font-bold text-center w-10 border-r border-emerald-700">No</th>
                            <th className="py-2.5 px-3 font-bold w-32 border-r border-emerald-700">Bulan</th>
                            <th className="py-2.5 px-2.5 font-bold text-center w-24 border-r border-emerald-700">Jml Pekan</th>
                            <th className="py-2.5 px-2.5 font-bold text-center w-24 border-r border-emerald-700">Tdk Efektif</th>
                            <th className="py-2.5 px-2.5 font-bold text-center w-24 border-r border-emerald-700">Efektif</th>
                            <th className="py-2.5 px-2.5 font-bold text-center w-24 border-r border-emerald-700">Jam Efektif</th>
                            <th className="py-2.5 px-3 font-bold">Keterangan Kalender</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {prosem.rincianPekanEfektif.map((r, idx) => {
                            const efektif = Math.max(0, (Number(r.jumlahPekan) || 0) - (Number(r.pekanTidakEfektif) || 0));
                            return (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                <td className="py-2 px-2.5 text-center font-bold text-slate-600 border-r border-slate-200">{idx + 1}</td>
                                <td className="py-2 px-3 font-bold text-emerald-900 border-r border-slate-200">{r.bulan}</td>
                                <td className="py-2 px-2.5 text-center text-slate-700 border-r border-slate-200">{r.jumlahPekan}</td>
                                <td className="py-2 px-2.5 text-center text-rose-700 font-semibold border-r border-slate-200">{r.pekanTidakEfektif}</td>
                                <td className="py-2 px-2.5 text-center font-black text-emerald-800 border-r border-slate-200">{efektif}</td>
                                <td className="py-2 px-2.5 text-center font-bold text-slate-800 border-r border-slate-200">{efektif * jpPerMinggu} JP</td>
                                <td className="py-2 px-3 text-slate-600 text-[11px]">{r.keteranganTidakEfektif || '-'}</td>
                              </tr>
                            );
                          })}
                          <tr className="bg-emerald-50 font-bold text-emerald-950 border-t-2 border-emerald-200">
                            <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[11px]">Total Semester {prosem.identitas.semester}</td>
                            <td className="py-2.5 px-2.5 text-center">{summary.totalPekan}</td>
                            <td className="py-2.5 px-2.5 text-center text-rose-700">{summary.totalPekanTidakEfektif}</td>
                            <td className="py-2.5 px-2.5 text-center font-black text-emerald-800">{summary.totalPekanEfektif}</td>
                            <td className="py-2.5 px-2.5 text-center font-black text-emerald-800">{summary.targetJpEfektif} JP</td>
                            <td className="py-2.5 px-3 text-[11px] text-emerald-800">{jpPerMinggu} JP / Pekan Efektif</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* B. Matriks Distribusi Mingguan (Bulan x M1-M4) */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-black text-slate-900 border-l-4 border-blue-600 pl-3 uppercase">
                        B. Matriks Distribusi Mingguan (Bulan &times; Pekan M1–M4)
                      </h5>
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-bold">
                        <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300">Intrakurikuler</span>
                        <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300">Asesmen</span>
                        <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-900 border border-blue-300">Proyek</span>
                        <span className="px-2 py-0.5 rounded bg-purple-100 text-purple-900 border border-purple-300">Remedial</span>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                      <table className="w-full text-left border-collapse text-[11px] min-w-[920px]">
                        <thead>
                          <tr className="bg-slate-900 text-white">
                            <th rowSpan={2} className="py-2 px-2 font-bold text-center w-8 border-r border-slate-700">No</th>
                            <th rowSpan={2} className="py-2 px-3 font-bold min-w-[230px] border-r border-slate-700">Elemen &amp; Tujuan Pembelajaran (ATP)</th>
                            <th rowSpan={2} className="py-2 px-2 font-bold text-center w-12 border-r border-slate-700">JP</th>
                            {months.map((m) => (
                              <th key={m} colSpan={4} className="py-1.5 px-1 font-bold text-center border-r border-slate-700 text-[10px] uppercase tracking-wider">
                                {m.substring(0, 3)}
                              </th>
                            ))}
                          </tr>
                          <tr className="bg-slate-800 text-slate-200">
                            {months.map((m) =>
                              PROSEM_WEEKS.map((w) => (
                                <th key={`${m}-${w}`} className="py-1 px-1 text-center font-bold text-[9px] w-7 border-r border-slate-700">
                                  {w}
                                </th>
                              ))
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {prosem.distribusiMingguan.map((row, idx) => {
                            const rowSum = Object.values(row.mingguAktif || {}).reduce((a, b) => a + (Number(b) || 0), 0);
                            const badgeStyle = getBadgeStyle(row.jenisKegiatan);
                            return (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                                <td className="py-2.5 px-2 text-center font-bold text-slate-600 align-top border-r border-slate-200">{idx + 1}</td>
                                <td className="py-2.5 px-3 align-top border-r border-slate-200">
                                  <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                                    <span className="font-bold text-slate-900">{row.elemen}</span>
                                    <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${badgeStyle}`}>
                                      {row.jenisKegiatan}
                                    </span>
                                  </div>
                                  <p className="text-slate-600 leading-snug text-[11px]">{row.tujuanPembelajaran}</p>
                                </td>
                                <td className="py-2.5 px-2 text-center font-black text-emerald-800 align-top border-r border-slate-200">
                                  {rowSum || row.alokasiJp}
                                </td>
                                {months.map((m) =>
                                  PROSEM_WEEKS.map((w) => {
                                    const val = row.mingguAktif?.[getProsemWeekKey(m, w)] || 0;
                                    return (
                                      <td
                                        key={`${idx}-${m}-${w}`}
                                        className="p-1 text-center align-middle border-r border-slate-200"
                                      >
                                        {val > 0 ? (
                                          <span className={`inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black border ${badgeStyle}`}>
                                            {val}
                                          </span>
                                        ) : (
                                          <span className="text-slate-200">&middot;</span>
                                        )}
                                      </td>
                                    );
                                  })
                                )}
                              </tr>
                            );
                          })}
                          <tr className="bg-slate-900 text-white font-bold">
                            <td colSpan={2} className="py-2.5 px-3 text-right uppercase text-[10px]">
                              Total JP Terjadwal di Matriks Semester {prosem.identitas.semester}
                            </td>
                            <td className="py-2.5 px-2 text-center font-black text-emerald-400">
                              {summary.totalJpMatriks}
                            </td>
                            <td colSpan={months.length * 4} className="py-2.5 px-3 text-[10px] text-slate-300">
                              Target RPE: {summary.targetJpEfektif} JP ({summary.totalPekanEfektif} Pekan Efektif &times; {jpPerMinggu} JP/Minggu)
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* C. Catatan Pelaksanaan */}
                  <div className="space-y-2">
                    <h5 className="text-sm font-black text-slate-900 border-l-4 border-amber-500 pl-3 uppercase">
                      C. Catatan Pelaksanaan &amp; Fleksibilitas Kalender
                    </h5>
                    <p className="text-xs text-slate-700 leading-relaxed text-justify p-3.5 rounded-xl bg-amber-50/60 border border-amber-200">
                      {prosem.catatanPelaksanaan}
                    </p>
                  </div>

                  {/* D. Integrasi Nilai Islami */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/50 to-white border border-emerald-200 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h5 className="text-sm font-black text-emerald-950 uppercase flex items-center gap-2">
                        <BookMarked className="w-4 h-4 text-emerald-600" />
                        D. Integrasi Nilai Islami dalam Program Semester
                      </h5>
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        {prosem.integrasiNilaiIslami.surahAyat}
                      </span>
                    </div>
                    <div
                      dir="rtl"
                      className="p-4 rounded-xl bg-white border border-emerald-100 text-right font-serif text-xl sm:text-2xl leading-[2.1] text-emerald-950"
                    >
                      {prosem.integrasiNilaiIslami.teksArab}
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <p className="text-emerald-900 italic leading-relaxed">
                        <span className="font-bold not-italic text-emerald-800">Artinya ({prosem.integrasiNilaiIslami.surahAyat}): </span>
                        &ldquo;{prosem.integrasiNilaiIslami.terjemahan}&rdquo;
                      </p>
                      <p className="text-slate-700 leading-relaxed">
                        <span className="font-bold text-emerald-800">Relevansi terhadap Program Semester: </span>
                        {prosem.integrasiNilaiIslami.relevansiProsem}
                      </p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic text-center pt-2">
                    --- Dokumen Resmi Program Semester (PROSEM) Standar Kurikulum Nasional ---
                  </p>
                </div>
                );
              })() : (activeDoc.kontenJson && activeDoc.kontenJson.informasiUmum) && !isEditingActiveDoc ? (() => {
                const q = activeDoc.kontenJson;
                const ayat = resolveModulAyat(q, activeDoc.mataPelajaran, activeDoc.judul.replace(/^MODUL AJAR.*?:\s*/i, ''));
                const dimensiList = (q.dimensiProfilLulusan && q.dimensiProfilLulusan.length > 0)
                  ? q.dimensiProfilLulusan
                  : (q.profilPelajarPancasila || []);
                const prinsipList = q.pengalamanBelajarMendalam?.prinsipPembelajaran?.length
                  ? q.pengalamanBelajarMendalam.prinsipPembelajaran
                  : PRINSIP_PEMBELAJARAN_MENDALAM;

                return (
                <div className="p-8 space-y-8 bg-white min-h-full">
                  {/* A. INFORMASI UMUM */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-black text-slate-900 border-b-2 border-emerald-500 pb-1 inline-block">A. INFORMASI UMUM</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <p><span className="font-bold text-slate-500 uppercase tracking-tighter">Penyusun:</span> {q.informasiUmum.namaPenyusun || activeDoc.guruNama}</p>
                      <p><span className="font-bold text-slate-500 uppercase tracking-tighter">Sekolah:</span> {q.informasiUmum.namaSekolah}</p>
                      <p><span className="font-bold text-slate-500 uppercase tracking-tighter">Mapel:</span> {q.informasiUmum.mataPelajaran}</p>
                      <p><span className="font-bold text-slate-500 uppercase tracking-tighter">Kelas/Fase:</span> {q.informasiUmum.kelas} / Fase {q.informasiUmum.fase}</p>
                      <p><span className="font-bold text-slate-500 uppercase tracking-tighter">Materi:</span> {q.informasiUmum.materi}</p>
                      <p><span className="font-bold text-slate-500 uppercase tracking-tighter">Waktu:</span> {q.informasiUmum.alokasiWaktu}</p>
                    </div>
                  </div>

                  {/* INTEGRASI AYAT AL-QUR'AN SESUAI MATERI */}
                  <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-50 via-teal-50/60 to-white border-2 border-emerald-200 space-y-4 shadow-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center">
                          <BookMarked className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-black text-emerald-950 uppercase tracking-tight">Integrasi Ayat Al-Qur&apos;an Sesuai Materi</h4>
                          <p className="text-[11px] font-semibold text-emerald-700">{ayat.surahAyat}</p>
                        </div>
                      </div>
                      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-200">
                        Tadabbur Pembelajaran Mendalam
                      </span>
                    </div>

                    <div
                      dir="rtl"
                      className="p-4 rounded-xl bg-white/90 border border-emerald-100 text-right font-serif text-2xl leading-[2.1] text-emerald-950"
                    >
                      {ayat.teksArab}
                    </div>

                    <div className="space-y-2 text-xs">
                      <p className="text-emerald-900 italic leading-relaxed">
                        <span className="font-bold not-italic text-emerald-800">Artinya ({ayat.surahAyat}): </span>
                        &ldquo;{ayat.terjemahan}&rdquo;
                      </p>
                      <div className="p-3.5 rounded-xl bg-white border border-emerald-100 text-slate-700 leading-relaxed">
                        <span className="font-bold text-emerald-800">Tadabbur &amp; Relevansi Materi: </span>
                        {ayat.kaitanMateri}
                      </div>
                    </div>
                  </div>

                  {/* B. IDENTIFIKASI KESIAPAN & KOMPETENSI AWAL */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-blue-500 pl-3">B. IDENTIFIKASI KESIAPAN &amp; KOMPETENSI AWAL</h4>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{q.kompetensiAwal || '-'}</p>
                  </div>

                  {/* C. 8 DIMENSI PROFIL LULUSAN */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-emerald-500 pl-3">C. 8 DIMENSI PROFIL LULUSAN (PEMBELAJARAN MENDALAM)</h4>
                    <div className="flex flex-wrap gap-2">
                      {dimensiList.map((p: string) => (
                        <span key={p} className="px-2.5 py-1 bg-emerald-50 text-emerald-800 text-[11px] font-bold rounded-lg border border-emerald-200">{p}</span>
                      ))}
                      {dimensiList.length === 0 && <span className="text-xs text-slate-500 italic">Tidak ada</span>}
                    </div>
                  </div>

                  {/* D. SARANA DAN PRASARANA */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-indigo-500 pl-3">D. SARANA DAN PRASARANA</h4>
                    <div className="flex flex-wrap gap-2">
                      {q.saranaPrasarana?.map((s: string) => (
                        <span key={s} className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold rounded border border-indigo-100">{s}</span>
                      )) || <span className="text-xs text-slate-500 italic">Tidak ada</span>}
                    </div>
                  </div>

                  {/* E. TARGET PESERTA DIDIK */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-rose-500 pl-3">E. TARGET PESERTA DIDIK</h4>
                    <p className="text-xs text-slate-700 font-medium">Target: <span className="px-2.5 py-1 bg-rose-50 text-rose-700 font-bold rounded-lg text-[10px] border border-rose-100">{q.targetPesertaDidik || 'Reguler'}</span></p>
                  </div>

                  {/* F. DESAIN & KERANGKA PEMBELAJARAN MENDALAM */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-cyan-500 pl-3">F. DESAIN &amp; KERANGKA PEMBELAJARAN MENDALAM</h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2.5">
                      <p><span className="font-bold text-slate-700">Model Pembelajaran:</span> <span className="px-2 py-0.5 bg-cyan-50 text-cyan-800 font-bold rounded border border-cyan-200">{q.modelPembelajaran || 'Problem Based Learning (Pembelajaran Mendalam)'}</span></p>
                      {q.capaianPembelajaran && <p><span className="font-bold text-slate-700">Capaian Pembelajaran (CP):</span> {q.capaianPembelajaran}</p>}
                      {q.lintasDisiplinIlmu && <p><span className="font-bold text-slate-700">Lintas Disiplin Ilmu:</span> {q.lintasDisiplinIlmu}</p>}
                      {q.kerangkaPembelajaran && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="font-bold text-cyan-800 mb-1">1. Praktik Pedagogis</p>
                            <p className="text-slate-600">{q.kerangkaPembelajaran.praktikPedagogis || '-'}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="font-bold text-cyan-800 mb-1">2. Kemitraan Pembelajaran</p>
                            <p className="text-slate-600">{q.kerangkaPembelajaran.kemitraanPembelajaran || '-'}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="font-bold text-cyan-800 mb-1">3. Lingkungan Pembelajaran</p>
                            <p className="text-slate-600">{q.kerangkaPembelajaran.lingkunganPembelajaran || '-'}</p>
                          </div>
                          <div className="p-3 bg-white rounded-lg border border-slate-200">
                            <p className="font-bold text-cyan-800 mb-1">4. Pemanfaatan Digital</p>
                            <p className="text-slate-600">{q.kerangkaPembelajaran.pemanfaatanDigital || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* G. TUJUAN PEMBELAJARAN */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-purple-500 pl-3">G. TUJUAN PEMBELAJARAN</h4>
                    <ul className="list-decimal list-inside space-y-1 text-xs text-slate-700">
                      {q.tujuanPembelajaran?.map((tp: string, i: number) => (
                        <li key={i}>{tp}</li>
                      )) || <li className="italic text-slate-400">Tidak ada</li>}
                    </ul>
                  </div>

                  {/* H. PEMAHAMAN BERMAKNA */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-violet-500 pl-3">H. PEMAHAMAN BERMAKNA</h4>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{q.pemahamanBermakna || '-'}</p>
                  </div>

                  {/* I. PERTANYAAN PEMANTIK */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-teal-500 pl-3">I. PERTANYAAN PEMANTIK</h4>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-700">
                      {q.pertanyaanPemantik?.map((pp: string, i: number) => (
                        <li key={i}>{pp}</li>
                      )) || <li className="italic text-slate-400">Tidak ada</li>}
                    </ul>
                  </div>

                  {/* J. PENGALAMAN BELAJAR MENDALAM & KEGIATAN PEMBELAJARAN */}
                  <div className="space-y-4">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-amber-500 pl-3">J. PENGALAMAN BELAJAR MENDALAM &amp; KEGIATAN PEMBELAJARAN</h4>
                    <div className="flex flex-wrap gap-2">
                      {prinsipList.map((pr: string) => (
                        <span key={pr} className="px-2.5 py-1 bg-amber-50 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200">{pr}</span>
                      ))}
                    </div>
                    {q.pengalamanBelajarMendalam && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div className="p-3.5 bg-blue-50/70 rounded-xl border border-blue-200">
                          <p className="font-bold text-blue-900 mb-1">1. Memahami</p>
                          <p className="text-slate-700 whitespace-pre-wrap">{q.pengalamanBelajarMendalam.memahami || '-'}</p>
                        </div>
                        <div className="p-3.5 bg-emerald-50/70 rounded-xl border border-emerald-200">
                          <p className="font-bold text-emerald-900 mb-1">2. Mengaplikasi</p>
                          <p className="text-slate-700 whitespace-pre-wrap">{q.pengalamanBelajarMendalam.mengaplikasi || '-'}</p>
                        </div>
                        <div className="p-3.5 bg-purple-50/70 rounded-xl border border-purple-200">
                          <p className="font-bold text-purple-900 mb-1">3. Merefleksi</p>
                          <p className="text-slate-700 whitespace-pre-wrap">{q.pengalamanBelajarMendalam.merefleksi || '-'}</p>
                        </div>
                      </div>
                    )}
                    <div className="space-y-4 text-xs">
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="font-bold text-slate-800 mb-1">Pendahuluan ({q.kegiatanPembelajaran.pendahuluan.durasi})</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{q.kegiatanPembelajaran.pendahuluan.deskripsi}</p>
                      </div>
                      <div className="p-4 bg-emerald-50/30 rounded-xl border border-emerald-100">
                        <p className="font-bold text-emerald-800 mb-1">Kegiatan Inti ({q.kegiatanPembelajaran.inti.durasi})</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{q.kegiatanPembelajaran.inti.deskripsi}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <p className="font-bold text-slate-800 mb-1">Penutup ({q.kegiatanPembelajaran.penutup.durasi})</p>
                        <p className="text-slate-600 whitespace-pre-wrap">{q.kegiatanPembelajaran.penutup.deskripsi}</p>
                      </div>
                    </div>
                  </div>

                  {/* K. ASESMEN */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-red-500 pl-3">K. ASESMEN PEMBELAJARAN (AWAL, PROSES, AKHIR)</h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-3">
                      <p><span className="font-bold text-slate-700">Asesmen Awal (Diagnostik):</span> {q.asesmen.diagnostik || '-'}</p>
                      <p><span className="font-bold text-slate-700">Asesmen Proses (Formatif):</span> {q.asesmen.formatif || '-'}</p>
                      <p><span className="font-bold text-slate-700">Asesmen Akhir (Sumatif):</span> {q.asesmen.sumatif || '-'}</p>
                      <p><span className="font-bold text-slate-700">Teknik:</span> {q.asesmen.teknik || '-'}</p>
                      <p><span className="font-bold text-slate-700">Instrumen:</span> {q.asesmen.instrumen || '-'}</p>
                      <p><span className="font-bold text-slate-700">Rubrik:</span> {q.asesmen.rubrik || '-'}</p>
                      <p><span className="font-bold text-slate-700">Kriteria Penilaian:</span> {q.asesmen.kriteriaPenilaian || '-'}</p>
                    </div>
                  </div>

                  {/* L. DIFERENSIASI PEMBELAJARAN */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-orange-500 pl-3">L. DIFERENSIASI &amp; INKLUSI PEMBELAJARAN</h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-2">
                      <p><span className="font-bold text-slate-700">Diferensiasi Konten:</span> {q.diferensiasi.konten || '-'}</p>
                      <p><span className="font-bold text-slate-700">Diferensiasi Proses:</span> {q.diferensiasi.proses || '-'}</p>
                      <p><span className="font-bold text-slate-700">Diferensiasi Produk:</span> {q.diferensiasi.produk || '-'}</p>
                    </div>
                  </div>

                  {/* M. REMEDIAL */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-amber-600 pl-3">M. REMEDIAL</h4>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{q.remedial || '-'}</p>
                  </div>

                  {/* N. PENGAYAAN */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-green-600 pl-3">N. PENGAYAAN</h4>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{q.pengayaan || '-'}</p>
                  </div>

                  {/* O. REFLEKSI GURU */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-fuchsia-600 pl-3">O. REFLEKSI GURU</h4>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{q.refleksiGuru || '-'}</p>
                  </div>

                  {/* P. REFLEKSI PESERTA DIDIK */}
                  <div className="space-y-3">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-emerald-600 pl-3">P. REFLEKSI PESERTA DIDIK</h4>
                    <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">{q.refleksiPesertaDidik || '-'}</p>
                  </div>

                  {/* Q. LAMPIRAN */}
                  <div className="space-y-3 pb-8">
                    <h4 className="text-md font-bold text-slate-900 border-l-4 border-slate-600 pl-3">Q. LAMPIRAN</h4>
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-3">
                      <p><span className="font-bold text-slate-700">LKPD (Lembar Kerja Peserta Didik):</span> {q.lampiran.lkpd || '-'}</p>
                      <p><span className="font-bold text-slate-700">Bahan Bacaan Guru &amp; Peserta Didik:</span> {q.lampiran.bahanBacaan || '-'}</p>
                      <p><span className="font-bold text-slate-700">Rubrik Penilaian Lampiran:</span> {q.lampiran.rubrik || '-'}</p>
                      <p><span className="font-bold text-slate-700">Instrumen Asesmen Lampiran:</span> {q.lampiran.instrumenAsesmen || '-'}</p>
                      <p><span className="font-bold text-slate-700">Daftar Pustaka:</span> {q.lampiran.daftarPustaka || '-'}</p>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 italic text-center pt-4">--- Akhir Modul Ajar Pembelajaran Mendalam (Deep Learning) Terintegrasi Ayat Al-Qur&apos;an ---</p>
                </div>
                );
              })() : isEditingActiveDoc ? (
                <textarea
                  value={editedContent}
                  onChange={e => setEditedContent(e.target.value)}
                  className="w-full h-full min-h-[400px] p-5 bg-slate-50 border border-amber-200 rounded-xl text-xs text-slate-800 leading-relaxed font-mono focus:outline-none focus:ring-1 focus:ring-amber-400 shadow-inner"
                />
              ) : (
                <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 leading-relaxed font-mono whitespace-pre-wrap shadow-inner selection:bg-emerald-100">
                  {activeDoc.content || activeDoc.deskripsi}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-3 border-t flex items-center justify-between text-xs text-slate-500">
              <div>Status: <span className="font-bold text-emerald-700">{activeDoc.status}</span> • Terakhir diinput: {activeDoc.tanggalInput}</div>
              <button
                onClick={() => setActiveDoc(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRM DELETE MODAL */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-slate-900 text-base">
                {confirmDelete.id === 'all' || confirmDelete.id.startsWith('all:') ? 'Hapus Semua Dokumen?' : 'Hapus Dokumen?'}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Apakah Anda yakin ingin menghapus <span className="font-semibold text-slate-800">{confirmDelete.id === 'all' || confirmDelete.id.startsWith('all:') ? confirmDelete.judul : `"${confirmDelete.judul}"`}</span> secara permanen? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={async () => {
                  const targetId = confirmDelete.id;
                  setConfirmDelete(null);
                  if (targetId === 'all') {
                    setAdministrasiList([]);
                    await dbClearCollection('edu_administrasiList');
                  } else if (targetId.startsWith('all:')) {
                    const targetTipe = targetId.slice(4);
                    const remainingList = administrasiList.filter(d => d.tipe !== targetTipe);
                    setAdministrasiList(remainingList);
                    if (remainingList.length === 0) {
                      await dbClearCollection('edu_administrasiList');
                    } else {
                      await dbSaveCollection('edu_administrasiList', remainingList);
                    }
                    setSaveSuccessNotification(`Semua dokumen ${targetTipe.toUpperCase().replace('_', ' ')} berhasil dihapus.`);
                  } else {
                    setDeletingId(targetId);
                    try {
                      const newList = administrasiList.filter(d => d.id !== targetId);
                      setAdministrasiList(newList);
                      await dbDeleteItem('edu_administrasiList', targetId);
                    } catch (err) {
                      console.error('Error deleting document:', err);
                      setSaveSuccessNotification('Gagal menghapus dokumen dari server. Silakan coba lagi.');
                    } finally {
                      setDeletingId(null);
                    }
                  }
                }}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-rose-600/10"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
      {/* CUSTOM SAVE MODAL */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[99] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
                <Save className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  {isSaveAsNew ? 'Simpan sebagai Dokumen Baru' : 'Simpan Perubahan ke Arsip'}
                </h3>
                <p className="text-xs text-slate-500">
                  {isSaveAsNew 
                    ? 'Buat salinan baru di arsip administrasi sekolah' 
                    : 'Perbarui dokumen arsip dengan konten draf workspace terkini'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Judul Dokumen di Arsip</label>
              <input
                type="text"
                value={customDocTitle}
                onChange={e => setCustomDocTitle(e.target.value)}
                placeholder="Contoh: Modul Ajar: Matematika - Kelas VII (Revisi)"
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => handleSaveWorkspaceToArsip(customDocTitle, isSaveAsNew)}
                disabled={isSavingWorkspace || !customDocTitle.trim()}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/10 flex items-center justify-center gap-1.5"
              >
                {isSavingWorkspace ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {isSavingWorkspace ? 'Menyimpan...' : 'Simpan Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {saveSuccessNotification && (
        <div className="fixed bottom-6 right-6 z-[100] max-w-md animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <Check className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-100">Berhasil Disimpan</p>
              <p className="text-[11px] text-slate-300 truncate">{saveSuccessNotification}</p>
            </div>
            <button
              onClick={() => setSaveSuccessNotification(null)}
              className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white"
            >
              &times;
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
