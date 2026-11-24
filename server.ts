import express from 'express';
import path from 'path';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { suggestAyatForMateri, PRINSIP_PEMBELAJARAN_MENDALAM } from './src/lib/quranAyatPresets';
import { buildOfficialCpData, formatCpToPlainText } from './src/lib/capaianPembelajaranHelper';
import { buildOfficialAtpData, formatAtpToPlainText } from './src/lib/atpHelper';
import { buildOfficialKktpData, formatKktpToPlainText } from './src/lib/kktpHelper';
import { buildOfficialProtaData, formatProtaToPlainText } from './src/lib/protaHelper';
import { buildOfficialProsemData, formatProsemToPlainText } from './src/lib/prosemHelper';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function getGenAI() {
  const currentKey = process.env.GEMINI_API_KEY || '';
  return new GoogleGenAI({
    apiKey: currentKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// Helper function to safely call Gemini generateContent with fallback models in case of high demand (503/429/etc.)
async function generateContentWithFallback(options: { model: string; contents: string; config?: any }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '' || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'YOUR_API_KEY' || apiKey.startsWith('MY_') || apiKey.includes('invalid')) {
    const err = new Error('GEMINI_API_KEY_NOT_CONFIGURED');
    (err as any).isKeyConfigError = true;
    throw err;
  }

  const client = getGenAI();
  const primaryModel = options.model || 'gemini-4-hydrogen';
  const models = [primaryModel, 'gemini-3.1-flash-lite'];
  const uniqueModels = Array.from(new Set(models.filter(Boolean)));
  
  let lastError: any = null;
  for (const model of uniqueModels) {
    try {
      const res = await client.models.generateContent({
        ...options,
        model: model,
      });
      return res;
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isKeyInvalid = errMsg.includes('API key not valid') || errMsg.includes('API_KEY_INVALID') || err?.status === 'INVALID_ARGUMENT';
      if (isKeyInvalid) {
        // Stop immediately without retrying secondary models with the same invalid key
        const keyErr = new Error('GEMINI_API_KEY_INVALID');
        (keyErr as any).isKeyConfigError = true;
        throw keyErr;
      }
      // For temporary server overload (503/429), pause 500ms before trying fallback model
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw lastError;
}

// 1. Google Workspace Export to Google Sheets & Google Drive
app.post('/api/export-sheets', async (req, res) => {
  try {
    const { accessToken, title, sheetName, columns, rows } = req.body;

    if (!accessToken) {
      return res.status(400).json({
        success: false,
        message: 'Token Akses Google (OAuth) diperlukan. Silakan klik tombol "Sign in with Google" di sudut kanan atas terlebih dahulu.'
      });
    }

    const { google } = await import('googleapis');
    const oauth2Client = new google.auth.OAuth2();
    oauth2Client.setCredentials({ access_token: accessToken });

    const sheets = google.sheets({ version: 'v4', auth: oauth2Client });
        
    // Create new Google Spreadsheet
    const createRes = await sheets.spreadsheets.create({
      requestBody: {
        properties: {
          title: title || 'Laporan Keuangan & Administrasi Sekolah',
        },
        sheets: [
          {
            properties: {
              title: sheetName || 'Ringkasan Data',
              gridProperties: {
                frozenRowCount: 1,
              }
            },
          },
        ],
      },
    });

    const spreadsheetId = createRes.data.spreadsheetId;
    const spreadsheetUrl = createRes.data.spreadsheetUrl;

    if (!spreadsheetId) {
      throw new Error('Gagal membuat Spreadsheet di Google Drive.');
    }

    // Populate data
    const values = [columns, ...(rows || [])];
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName || 'Ringkasan Data'}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values,
      },
    });

    return res.json({
      success: true,
      spreadsheetId,
      spreadsheetUrl,
      message: 'Berhasil mengekspor spreadsheet ke Google Drive Anda!'
    });
  } catch (error: any) {
    return res.json({
      success: true,
      isDemo: true,
      spreadsheetUrl: null,
      spreadsheetId: null,
      message: "Mode Ekspor Offline: Silakan unduh file rekapitulasi dalam format CSV / Excel secara langsung."
    });
  }
});

// Helper: Smart Kurikulum Merdeka Question Generator (supports 1-50 distinct questions across all subjects)
function generateSmartFallbackQuestions(params: {
  mataPelajaran: string;
  kelas: string;
  topik: string;
  jumlahSoal: number;
  tipeSoal: string[];
  tingkatKesulitan: string;
  bobotPerSoal: number;
  existingStems?: string[];
}) {
  const { mataPelajaran, kelas, topik, jumlahSoal, tipeSoal, tingkatKesulitan, bobotPerSoal, existingStems = [] } = params;
  const mpLower = (mataPelajaran || '').toLowerCase();
  const tpLower = (topik || '').toLowerCase();

  const isJepang = mpLower.includes('jepang') || mpLower.includes('japanese') || mpLower.includes('nihongo') || tpLower.includes('hiragana') || tpLower.includes('katakana') || tpLower.includes('aisatsu') || tpLower.includes('jikoshoukai');
  const isArab = mpLower.includes('arab') || mpLower.includes('arabic') || mpLower.includes('nahwu') || mpLower.includes('shorof') || tpLower.includes('ta\'aruf') || tpLower.includes('ismiyah');
  const isDaerah = mpLower.includes('sunda') || mpLower.includes('jawa') || mpLower.includes('daerah') || mpLower.includes('bali') || mpLower.includes('madura') || mpLower.includes('minang');
  const isTahfidz = mpLower.includes('tahfidz') || mpLower.includes('tahfiz') || tpLower.includes('juz 30') || tpLower.includes('juz 29') || tpLower.includes('sambung ayat');
  const isTik = /(?:^|[\s/()_-])tik(?:[\s/()_-]|$)/.test(mpLower);
  const isInfo = mpLower.includes('informatika') || mpLower.includes('komputer') || mpLower.includes('coding') || mpLower.includes('pemrograman') || isTik || tpLower.includes('komputasi') || tpLower.includes('algoritma') || tpLower.includes('biner');
  const isMath = !isInfo && (mpLower.includes('matematik') || mpLower.includes('mtk') || mpLower.includes('kalkulus') || mpLower.includes('aljabar') || tpLower.includes('logaritma') || tpLower.includes('eksponen') || tpLower.includes('trigonometri') || tpLower.includes('spldv'));
  const isFisika = mpLower.includes('fisika') || tpLower.includes('glb') || tpLower.includes('newton') || tpLower.includes('optika');
  const isKimia = mpLower.includes('kimia') || mpLower.includes('stoikiometri') || mpLower.includes('atom') || mpLower.includes('redoks');
  const isBiologi = mpLower.includes('biologi') || mpLower.includes('genetika') || mpLower.includes('metabolisme') || mpLower.includes('organel');
  const isIpa = isFisika || isKimia || isBiologi || /(?:^|[\s/()_-])ipa(?:[\s/()_-]|$)/.test(mpLower) || mpLower.includes('sains') || mpLower.includes('ilmu pengetahuan alam') || tpLower.includes('ekosistem') || tpLower.includes('respirasi');
  const isPai = isTahfidz || /(?:^|[\s/()_-])pai(?:[\s/()_-]|$)/.test(mpLower) || mpLower.includes('agama') || mpLower.includes('islam') || mpLower.includes('fiqih') || mpLower.includes('akidah') || tpLower.includes('tajwid');
  const isIndo = mpLower.includes('indonesia') || /(?:^|[\s/()_-])bindo(?:[\s/()_-]|$)/.test(mpLower) || tpLower.includes('observasi') || tpLower.includes('cerpen') || tpLower.includes('eksplanasi');
  const isInggris = mpLower.includes('inggris') || mpLower.includes('english') || /(?:^|[\s/()_-])bing(?:[\s/()_-]|$)/.test(mpLower) || tpLower.includes('past tense') || tpLower.includes('descriptive');
  const isSejarah = mpLower.includes('sejarah') || tpLower.includes('praaksara') || tpLower.includes('proklamasi');
  const isGeografi = mpLower.includes('geografi') || tpLower.includes('litosfer') || tpLower.includes('atmosfer');
  const isEkonomi = mpLower.includes('ekonomi') || mpLower.includes('akuntansi') || tpLower.includes('moneter') || tpLower.includes('permintaan');
  const isSosiologi = mpLower.includes('sosiologi') || tpLower.includes('stratifikasi');
  const isIps = isSejarah || isGeografi || isEkonomi || isSosiologi || /(?:^|[\s/()_-])ips(?:[\s/()_-]|$)/.test(mpLower) || mpLower.includes('ilmu pengetahuan sosial');
  const isPkn = /(?:^|[\s/()_-])pkn(?:[\s/()_-]|$)/.test(mpLower) || /(?:^|[\s/()_-])ppkn(?:[\s/()_-]|$)/.test(mpLower) || mpLower.includes('pancasila') || mpLower.includes('kewarganegaraan');
  const isPjok = /(?:^|[\s/()_-])pjok(?:[\s/()_-]|$)/.test(mpLower) || mpLower.includes('olahraga') || mpLower.includes('penjas') || mpLower.includes('jasmani');
  const isSeni = mpLower.includes('seni') || mpLower.includes('musik') || mpLower.includes('tari') || mpLower.includes('lukis');
  const isPrakarya = mpLower.includes('prakarya') || mpLower.includes('kewirausahaan') || mpLower.includes('pkwu');

  type ConceptPair = { prompt: string; answer: string; distractors: [string, string, string]; note: string; category: string };
  const makePgFromConcept = (c: ConceptPair, idx: number) => {
    const shift = idx % 4;
    const raw = [c.answer, ...c.distractors];
    const rotated = raw.map((_, i) => raw[(i + (4 - shift)) % 4]);
    const letters = ['A', 'B', 'C', 'D'];
    const correctIdx = rotated.indexOf(c.answer);
    return {
      tipe: 'pg',
      pertanyaan: c.prompt,
      opsi: rotated.map((teks, i) => ({ id: letters[i], teks })),
      kunciJawaban: letters[correctIdx],
      pembahasan: c.note,
      bobot: bobotPerSoal
    };
  };

  const makeIsianFromConcept = (c: ConceptPair) => ({
    tipe: 'isian',
    pertanyaan: `${c.prompt.replace(/\.\.\.$/, '').replace(/\?$/, '').trim()} adalah ...`,
    opsi: [],
    kunciJawaban: c.answer,
    pembahasan: c.note,
    bobot: bobotPerSoal
  });

  const makeMcFromConceptPair = (c1: ConceptPair, c2: ConceptPair, d1: string, d2: string, title: string, idx: number) => {
    const letters = ['A', 'B', 'C', 'D'];
    const arr = idx % 2 === 0
      ? [c1.answer, d1, c2.answer, d2]
      : [d1, c1.answer, d2, c2.answer];
    const keys = idx % 2 === 0 ? ['A', 'C'] : ['B', 'D'];
    return {
      tipe: 'multiple_choice',
      pertanyaan: `${title} (Pilihlah DUA jawaban yang benar)`,
      opsi: arr.map((teks, i) => ({ id: letters[i], teks })),
      kunciJawaban: keys,
      pembahasan: `${c1.note} Selain itu, ${c2.note}`,
      bobot: bobotPerSoal
    };
  };

  let curPool: any[] = [];
  let concepts: ConceptPair[] = [];

  if (isJepang) {
    concepts = [
      { category: 'Aisatsu', prompt: 'Ungkapan salam "Selamat pagi" yang sopan dalam bahasa Jepang adalah ...', answer: 'Ohayou gozaimasu (おはようございます)', distractors: ['Konbanwa (こんばんは)', 'Oyasuminasai (おやすみなさい)', 'Sayounara (さようなら)'], note: '"Ohayou gozaimasu" diucapkan pada pagi hari secara sopan kepada guru atau orang yang lebih tua.' },
      { category: 'Aisatsu', prompt: 'Saat bertemu seseorang pada siang hari di Jepang, salam sapaan yang tepat adalah ...', answer: 'Konnichiwa (こんにちは)', distractors: ['Ohayou (おはよう)', 'Konbanwa (こんばんは)', 'Ittekimasu (いってきます)'], note: '"Konnichiwa" digunakan sebagai sapaan pada siang hingga sore hari.' },
      { category: 'Aisatsu', prompt: 'Ungkapan yang tepat untuk mengucapkan "Terima kasih banyak" dalam bahasa Jepang adalah ...', answer: 'Arigatou gozaimasu (ありがとうございます)', distractors: ['Sumimasen (すみません)', 'Gomennasai (ごめんなさい)', 'Douitashimashite (どういたしまして)'], note: '"Arigatou gozaimasu" adalah bentuk sopan untuk berterima kasih.' },
      { category: 'Aisatsu', prompt: 'Ketika ingin meminta maaf atau permisi dengan sopan dalam bahasa Jepang, kita mengucapkan ...', answer: 'Sumimasen (すみません)', distractors: ['Ogenki desu ka (おげんきですか)', 'Tadaima (ただいま)', 'Okaerinasai (おかえりなさい)'], note: '"Sumimasen" berarti permisi atau mohon maaf secara sopan.' },
      { category: 'Aisatsu', prompt: 'Balasan yang tepat ketika seseorang mengucapkan "Arigatou gozaimasu" adalah ...', answer: 'Douitashimashite (どういたしまして)', distractors: ['Itadakimasu (いただきます)', 'Gochisousama (ごちそうさま)', 'Shitsurei shimasu (しつれいします)'], note: '"Douitashimashite" berarti sama-sama / terima kasih kembali.' },
      { category: 'Jikoshoukai', prompt: 'Kalimat pembuka saat pertama kali berkenalan (Jikoshoukai) dalam bahasa Jepang adalah ...', answer: 'Hajimemashite (はじめまして)', distractors: ['Mata ashita (またあした)', 'Ja mata (じゃまた)', 'Oyasuminasai (おやすみなさい)'], note: '"Hajimemashite" berarti "Perkenalkan / Senang bertemu pertama kali".' },
      { category: 'Jikoshoukai', prompt: 'Arti dari kalimat "Watashi wa Indonesia-jin desu" (わたしはインドネシアじんです) adalah ...', answer: 'Saya adalah orang Indonesia', distractors: ['Saya tinggal di Jepang', 'Saya siswa kelas sepuluh', 'Hobi saya belajar bahasa'], note: 'Akhiran "-jin" setelah nama negara menyatakan kebangsaan/warga negara.' },
      { category: 'Jikoshoukai', prompt: 'Kata tanya dalam bahasa Jepang yang digunakan untuk menanyakan "Siapa" adalah ...', answer: 'Dare / Donata (だれ / どなた)', distractors: ['Doko (どこ)', 'Itsu (いつ)', 'Ikura (いくら)'], note: '"Dare" (atau bentuk sopannya "Donata") berarti siapa.' },
      { category: 'Hiragana', prompt: 'Huruf Hiragana yang dibaca "ka - ki - ku - ke - ko" secara berurutan adalah ...', answer: 'かきくけこ', distractors: ['さしすせそ', 'たちつてと', 'なにぬねの'], note: 'Baris "K" dalam tabel Gojuon Hiragana adalah か (ka), き (ki), く (ku), け (ke), こ (ko).' },
      { category: 'Hiragana', prompt: 'Huruf Hiragana "さくら" dibaca sebagai ...', answer: 'Sakura', distractors: ['Sora', 'Kaze', 'Takara'], note: 'さ (sa) + く (ku) + ら (ra) = Sakura (bunga sakura).' },
      { category: 'Hiragana', prompt: 'Penulisan kata "Sensei" (guru) dalam huruf Hiragana yang benar adalah ...', answer: 'せんせい', distractors: ['せんとせい', 'しんせい', 'さんせい'], note: 'せ (se) + ん (n) + せ (se) + い (i) = せんせい (sensei).' },
      { category: 'Hiragana', prompt: 'Huruf Hiragana "ともだち" memiliki arti ...', answer: 'Teman', distractors: ['Guru', 'Sekolah', 'Keluarga'], note: 'ともだち (tomodachi) berarti teman atau sahabat.' },
      { category: 'Katakana', prompt: 'Kata serapan dalam Katakana "ノート" (nooto) berarti ...', answer: 'Buku catatan', distractors: ['Meja belajar', 'Penghapus karet', 'Tas sekolah'], note: 'ノート berasal dari bahasa Inggris "note/notebook" yang berarti buku catatan.' },
      { category: 'Katakana', prompt: 'Kata serapan "カメラ" dalam huruf Katakana dibaca ...', answer: 'Kamera', distractors: ['Karendaa', 'Kaban', 'Kasa'], note: 'カ (ka) + メ (me) + ラ (ra) = Kamera.' },
      { category: 'Katakana', prompt: 'Penulisan kata "Indonesia" dalam huruf Katakana yang baku adalah ...', answer: 'インドネシア', distractors: ['いんどねしあ', 'インドネシヤ', 'インダネシア'], note: 'Nama negara asing (kecuali yang beraksara Kanji) ditulis dengan Katakana: インドネシア.' },
      { category: 'Partikel', prompt: 'Lengkapi kalimat: "Watashi ___ nihongo o benkyoushimasu." (Saya belajar bahasa Jepang)', answer: 'は (wa)', distractors: ['を (o)', 'へ (e)', 'から (kara)'], note: 'Partikel は (dibaca wa) menandai topik/subjek kalimat.' },
      { category: 'Partikel', prompt: 'Partikel yang menandai objek langsung dari kata kerja transitif seperti "Pan ___ tabemasu" (makan roti) adalah ...', answer: 'を (o / wo)', distractors: ['で (de)', 'の (no)', 'と (to)'], note: 'Partikel を (o) digunakan setelah kata benda sebagai objek langsung kata kerja.' },
      { category: 'Partikel', prompt: 'Lengkapi kalimat kepemilikan: "Kore wa watashi ___ hon desu." (Ini adalah buku milik saya)', answer: 'の (no)', distractors: ['に (ni)', 'が (ga)', 'も (mo)'], note: 'Partikel の (no) menghubungkan dua kata benda untuk menyatakan kepemilikan atau keterangan.' },
      { category: 'Partikel', prompt: 'Partikel yang menyatakan alat transportasi atau tempat berlangsungnya aksi (contoh: "Basu ___ gakkou e ikimasu") adalah ...', answer: 'で (de)', distractors: ['を (o)', 'は (wa)', 'か (ka)'], note: 'Partikel で (de) digunakan untuk menyatakan alat/sarana atau tempat aktivitas.' },
      { category: 'Partikel', prompt: 'Partikel di akhir kalimat tanya seperti "Anata wa gakusei desu ___?" adalah ...', answer: 'か (ka)', distractors: ['ね (ne)', 'よ (yo)', 'の (no)'], note: 'Partikel か (ka) di akhir kalimat berfungsi mengubah kalimat pernyataan menjadi pertanyaan.' },
      { category: 'Kata Tunjuk', prompt: 'Kata tunjuk benda yang dekat dengan pembicara ("Ini") dalam bahasa Jepang adalah ...', answer: 'Kore (これ)', distractors: ['Sore (それ)', 'Are (あれ)', 'Dore (どれ)'], note: 'Kore = ini (dekat pembicara), Sore = itu (dekat lawan bicara), Are = itu (jauh dari keduanya).' },
      { category: 'Kata Tunjuk', prompt: 'Kata tunjuk tempat yang berarti "Di sana (jauh dari pembicara dan lawan bicara)" adalah ...', answer: 'Asoko (あそこ)', distractors: ['Koko (ここ)', 'Soko (そこ)', 'Doko (どこ)'], note: 'Koko = di sini, Soko = di situ, Asoko = di sana, Doko = di mana.' },
      { category: 'Angka & Waktu', prompt: 'Penyebutan jam "07.00" (pukul tujuh) dalam bahasa Jepang yang benar adalah ...', answer: 'Shichi-ji (しちじ)', distractors: ['Yo-ji (よじ)', 'Ku-ji (くじ)', 'Hachi-ji (はちじ)'], note: 'Pukul 7 = Shichi-ji (7 + ji), pukul 4 = Yo-ji, pukul 9 = Ku-ji.' },
      { category: 'Angka & Waktu', prompt: 'Nama hari "Senin" dalam bahasa Jepang disebut ...', answer: 'Getsuyoubi (げつようび)', distractors: ['Nichiyoubi (にちようび)', 'Kayoubi (かようび)', 'Suiyoubi (すいようび)'], note: 'Nichiyoubi (Minggu), Getsuyoubi (Senin), Kayoubi (Selasa), Suiyoubi (Rabu).' },
      { category: 'Angka & Waktu', prompt: 'Nama hari "Jumat" dalam bahasa Jepang disebut ...', answer: 'Kinyoubi (きんようび)', distractors: ['Mokuyoubi (もくようび)', 'Doyoubi (どようび)', 'Suiyoubi (すいようび)'], note: 'Mokuyoubi (Kamis), Kinyoubi (Jumat), Doyoubi (Sabtu).' },
      { category: 'Kata Sifat', prompt: 'Kata sifat golongan -i (I-Keiyoushi) yang berarti "Enak / Lezat" adalah ...', answer: 'Oishii (おいしい)', distractors: ['Takai (たかい)', 'Yasui (やすい)', 'Atarashii (あたらしい)'], note: 'Oishii = enak, Takai = mahal/tinggi, Yasui = murah, Atarashii = baru.' },
      { category: 'Kata Sifat', prompt: 'Bentuk negatif sopan dari kata sifat "Takai desu" (mahal) adalah ...', answer: 'Takakunai desu (たかくないです)', distractors: ['Takai ja arimasen', 'Takakatta desu', 'Takakute desu'], note: 'Untuk kata sifat -i, akhiran "-i" diganti menjadi "-kunai desu" untuk bentuk negatif.' },
      { category: 'Kata Sifat', prompt: 'Contoh kata sifat golongan -na (Na-Keiyoushi) yang berarti "Indah / Bersih" adalah ...', answer: 'Kirei [na] (きれい)', distractors: ['Ooki [i] (おおきい)', 'Chiisai (ちいさい)', 'Omoshiroi (おもしろい)'], note: 'Kirei meskipun berakhiran bunyi -i termasuk golongan Na-Keiyoushi.' },
      { category: 'Kata Kerja', prompt: 'Bentuk negatif dari kata kerja "Tabemasu" (makan) adalah ...', answer: 'Tabemasen (たべません)', distractors: ['Tabemashita (たべました)', 'Tabemashou (たべましょう)', 'Tabete (たべて)'], note: 'Akhiran "-masu" diubah menjadi "-masen" untuk bentuk negatif sekarang/kebiasaan.' },
      { category: 'Kata Kerja', prompt: 'Kata kerja bahasa Jepang yang berarti "Pergi" dalam bentuk sopan (-masu) adalah ...', answer: 'Ikimasu (いきます)', distractors: ['Kimasu (きます)', 'Kaerimasu (かえります)', 'Mimasu (みます)'], note: 'Ikimasu = pergi, Kimasu = datang, Kaerimasu = pulang, Mimasu = melihat.' },
      { category: 'Kata Kerja', prompt: 'Arti dari kalimat "Mainichi nihongo o yomimasu" adalah ...', answer: 'Setiap hari membaca bahasa Jepang', distractors: ['Kemarin menulis surat Jepang', 'Besok pergi ke Jepang', 'Setiap pagi minum teh Jepang'], note: 'Mainichi = setiap hari, yomimasu = membaca.' },
      { category: 'Kazoku', prompt: 'Sebutan untuk "Ayah sendiri" saat berbicara dengan orang lain dalam bahasa Jepang adalah ...', answer: 'Chichi (ちち)', distractors: ['Otousan (おとうさん)', 'Okaasan (おかあさん)', 'Oniisan (おにいさん)'], note: 'Chichi = ayah sendiri, Otousan = ayah orang lain (atau sapaan langsung).' },
      { category: 'Kazoku', prompt: 'Sebutan untuk "Ibu sendiri" dalam bahasa Jepang adalah ...', answer: 'Haha (はは)', distractors: ['Okaasan (おかあさん)', 'Imouto (いもうと)', 'Obaasan (おばあさん)'], note: 'Haha = ibu sendiri, Okaasan = ibu orang lain.' },
      { category: 'Kanji N5', prompt: 'Huruf Kanji "山" dibaca "yama" dan memiliki arti ...', answer: 'Gunung', distractors: ['Sungai', 'Pohon', 'Matahari'], note: '山 (yama) = gunung, 川 (kawa) = sungai, 木 (ki) = pohon, 日 (hi) = matahari/hari.' },
      { category: 'Kanji N5', prompt: 'Huruf Kanji "先生" (sensei) memiliki arti ...', answer: 'Guru / Pengajar', distractors: ['Murid / Pelajar', 'Dokter Rumah Sakit', 'Kepala Sekolah'], note: '先生 (sensei) berarti guru atau pengajar.' },
      { category: 'Kanji N5', prompt: 'Huruf Kanji untuk angka "100" adalah ...', answer: '百 (hyaku)', distractors: ['十 (juu)', '千 (sen)', '万 (man)'], note: '十 = 10, 百 = 100, 千 = 1000, 万 = 10.000.' }
    ];

    curPool.push(
      {
        tipe: 'esai',
        pertanyaan: `Buatlah sebuah teks perkenalan diri (Jikoshoukai) singkat dalam bahasa Jepang (menggunakan romaji atau hiragana) sebanyak 4 kalimat yang memuat salam pembuka, nama, asal sekolah/kelas, dan salam penutup!`,
        opsi: [],
        kunciJawaban: 'Hajimemashite. Watashi wa [Nama] desu. [Nama Sekolah] no juunensei desu. Douzo yoroshiku onegaishimasu.',
        pembahasan: 'Struktur Jikoshoukai standar terdiri atas Hajimemashite, Watashi wa [nama] desu, keterangan sekolah/asal, dan ditutup Douzo yoroshiku onegaishimasu.',
        bobot: bobotPerSoal
      },
      {
        tipe: 'esai',
        pertanyaan: `Jelaskan perbedaan fungsi partikel は (wa), を (o), dan で (de) dalam kalimat bahasa Jepang serta berikan masing-masing satu contoh kalimat sederhana!`,
        opsi: [],
        kunciJawaban: 'Partikel は menandai topik kalimat (Watashi wa gakusei desu), を menandai objek langsung (Pan o tabemasu), dan で menandai tempat aktivitas atau alat (Toshokan de benkyoushimasu).',
        pembahasan: 'Penguasaan partikel dasar adalah kunci menyusun kalimat bahasa Jepang yang berterima sesuai pola S-O-P (Subjek-Objek-Predikat).',
        bobot: bobotPerSoal
      },
      {
        tipe: 'esai',
        pertanyaan: `Jelaskan perbedaan penggunaan huruf Hiragana dan huruf Katakana dalam sistem penulisan bahasa Jepang beserta masing-masing 2 contoh kata!`,
        opsi: [],
        kunciJawaban: 'Hiragana digunakan untuk menulis kata asli bahasa Jepang dan partikel tata bahasa (contoh: さくら, ともだち), sedangkan Katakana digunakan untuk menulis kata serapan bahasa asing dan nama orang/negara asing (contoh: カメラ, インドネシア).',
        pembahasan: 'Sistem penulisan Jepang memadukan Kanji, Hiragana, dan Katakana dengan fungsi linguistik yang berbeda.',
        bobot: bobotPerSoal
      }
    );
  } else if (isInfo) {
    concepts = [
      { category: 'Berpikir Komputasional', prompt: 'Proses memecah masalah kompleks menjadi bagian-bagian kecil agar mudah diselesaikan disebut ...', answer: 'Dekomposisi (Decomposition)', distractors: ['Abstraksi', 'Pengenalan Pola', 'Enkripsi Data'], note: 'Dekomposisi membagi persoalan besar menjadi sub-masalah terkelola.' },
      { category: 'Berpikir Komputasional', prompt: 'Proses menyaring informasi yang tidak relevan dan hanya mengambil inti permasalahan disebut ...', answer: 'Abstraksi (Abstraction)', distractors: ['Dekomposisi', 'Iterasi', 'Kompilasi'], note: 'Abstraksi berfokus pada detail penting dan mengabaikan detail yang tidak diperlukan.' },
      { category: 'Sistem Bilangan', prompt: 'Nilai bilangan desimal dari bilangan biner 1011 adalah ...', answer: '11', distractors: ['9', '13', '14'], note: '1011₂ = (1×8) + (0×4) + (1×2) + (1×1) = 11.' },
      { category: 'Sistem Bilangan', prompt: 'Konversi bilangan desimal 19 ke dalam sistem bilangan biner adalah ...', answer: '10011', distractors: ['10101', '11001', '10001'], note: '19 = 16 + 2 + 1 = 10011₂.' },
      { category: 'Sistem Bilangan', prompt: 'Basis yang digunakan pada sistem bilangan heksadesimal adalah ...', answer: 'Basis 16 (0–9 dan A–F)', distractors: ['Basis 2 (0 dan 1)', 'Basis 8 (0–7)', 'Basis 10 (0–9)'], note: 'Heksadesimal menggunakan 16 simbol unik: 0–9 dan A–F.' },
      { category: 'Jaringan Komputer', prompt: 'Perangkat jaringan yang berfungsi meneruskan paket data antar jaringan berbeda berdasarkan alamat IP adalah ...', answer: 'Router', distractors: ['Hub', 'Repeater', 'Modem Analog'], note: 'Router bekerja di Layer 3 (Network) untuk merutekan paket antar jaringan.' },
      { category: 'Jaringan Komputer', prompt: 'Topologi jaringan yang setiap perangkatnya terhubung ke satu perangkat konsentrator (Switch) di tengah disebut ...', answer: 'Topologi Star (Bintang)', distractors: ['Topologi Bus', 'Topologi Ring', 'Topologi Mesh'], note: 'Pada topologi Star, seluruh node terhubung ke satu Switch pusat.' },
      { category: 'Pemrograman', prompt: 'Struktur kontrol pemrograman yang menjalankan blok kode berulang kali selama kondisi bernilai benar disebut ...', answer: 'Perulangan (Looping / For-While)', distractors: ['Percabangan If-Else', 'Variabel Konstanta', 'Deklarasi Array'], note: 'Looping (For/While) mengulang eksekusi instruksi hingga kondisi berhenti tercapai.' },
      { category: 'Spreadsheet', prompt: 'Fungsi pada aplikasi pengolah angka (Spreadsheet) untuk menghitung rata-rata sekumpulan data angka adalah ...', answer: '=AVERAGE()', distractors: ['=SUM()', '=COUNTIF()', '=VLOOKUP()'], note: 'AVERAGE menghitung nilai rata-rata aritmetika dari rentang sel.' },
      { category: 'Keamanan Siber', prompt: 'Teknik kejahatan siber yang menyamar sebagai lembaga resmi untuk mencuri kata sandi atau data pribadi korban disebut ...', answer: 'Phishing', distractors: ['Firewall', 'Backup Cloud', 'Two-Factor Auth'], note: 'Phishing menggunakan rekayasa sosial untuk menipu pengguna agar menyerahkan kredensial.' },
      { category: 'Sistem Operasi', prompt: 'Perangkat lunak sistem utama yang mengelola perangkat keras, memori, dan menjalankan aplikasi pengguna adalah ...', answer: 'Sistem Operasi (Operating System)', distractors: ['Compiler Bahasa', 'Browser Web', 'Aplikasi Pengolah Kata'], note: 'OS seperti Linux, Windows, dan macOS menjadi jembatan antara hardware dan software aplikasi.' },
      { category: 'Perangkat Keras', prompt: 'Komponen utama komputer yang bertugas mengeksekusi instruksi program dan melakukan operasi aritmetika-logika adalah ...', answer: 'CPU (Central Processing Unit)', distractors: ['Hard Disk Drive', 'Power Supply Unit', 'Monitor LCD'], note: 'CPU adalah otak pemroses instruksi utama dalam arsitektur komputer.' }
    ];
    curPool.push(
      {
        tipe: 'esai',
        pertanyaan: `Jelaskan perbedaan mendasar antara struktur kontrol Percabangan (If-Else) dan Perulangan (For/While) dalam algoritma pemrograman serta berikan contoh penerapannya!`,
        opsi: [],
        kunciJawaban: 'Percabangan memilih salah satu jalur eksekusi berdasarkan kondisi boolean (contoh: menentukan lulus jika nilai >= 75), sedangkan perulangan mengulang blok kode berkali-kali selama syarat terpenuhi (contoh: mencetak daftar 30 siswa).',
        pembahasan: 'Percabangan mengatur pengambilan keputusan, sedangkan perulangan mengatur efisiensi eksekusi berulang.',
        bobot: bobotPerSoal
      }
    );
  } else if (isMath) {
    concepts = [
      { category: 'Logaritma', prompt: 'Diberikan log 2 = 0,301 dan log 3 = 0,477. Nilai dari log 12 adalah ...', answer: '1,079', distractors: ['0,778', '1,255', '0,903'], note: 'log 12 = log(2² × 3) = 2 log 2 + log 3 = 0,602 + 0,477 = 1,079.' },
      { category: 'Eksponen', prompt: 'Jika 2^(3x - 1) = 32, maka nilai x yang memenuhi adalah ...', answer: '2', distractors: ['3', '4', '1'], note: '32 = 2⁵, sehingga 3x - 1 = 5 → 3x = 6 → x = 2.' },
      { category: 'Eksponen', prompt: 'Bentuk sederhana dari (a³ × a⁵) / a² untuk a ≠ 0 adalah ...', answer: 'a⁶', distractors: ['a¹⁰', 'a⁴', 'a¹⁵'], note: 'a^(3+5-2) = a⁶.' },
      { category: 'SPLDV', prompt: 'Jika 2x + y = 11 dan x - y = 1, maka nilai x + y adalah ...', answer: '7', distractors: ['5', '9', '6'], note: 'Jumlahkan kedua persamaan: 3x = 12 → x = 4, maka y = 3, sehingga x + y = 7.' },
      { category: 'Persamaan Kuadrat', prompt: 'Akar-akar persamaan kuadrat x² - 5x + 6 = 0 adalah ...', answer: 'x = 2 atau x = 3', distractors: ['x = -2 atau x = -3', 'x = 1 atau x = 6', 'x = -1 atau x = 6'], note: '(x - 2)(x - 3) = 0 → x = 2 atau x = 3.' },
      { category: 'Trigonometri', prompt: 'Pada segitiga siku-siku dengan sisi depan 3 cm dan sisi miring 5 cm, nilai sin θ adalah ...', answer: '3/5 (0,6)', distractors: ['4/5 (0,8)', '3/4 (0,75)', '5/3'], note: 'sin θ = sisi depan / sisi miring = 3/5.' },
      { category: 'Pythagoras', prompt: 'Panjang sisi miring segitiga siku-siku dengan panjang sisi siku-siku 6 cm dan 8 cm adalah ...', answer: '10 cm', distractors: ['12 cm', '14 cm', '9 cm'], note: 'c = √(6² + 8²) = √(36 + 64) = √100 = 10 cm.' },
      { category: 'Statistika', prompt: 'Mean (rata-rata) dari data nilai 70, 80, 85, 85, 90 adalah ...', answer: '82', distractors: ['85', '80', '84'], note: '(70+80+85+85+90)/5 = 410/5 = 82.' },
      { category: 'Peluang', prompt: 'Peluang munculnya mata dadu bilangan prima pada pelemparan sebuah dadu bersisi enam adalah ...', answer: '1/2', distractors: ['1/3', '2/3', '1/6'], note: 'Bilangan prima pada dadu = {2, 3, 5} (3 kejadian dari 6), P = 3/6 = 1/2.' },
      { category: 'Transformasi', prompt: 'Bayangan titik A(3, -2) jika ditranslasikan oleh T(4, 5) adalah ...', answer: 'A\'(7, 3)', distractors: ['A\'(-1, 3)', 'A\'(7, -7)', 'A\'(1, 7)'], note: 'A\' = (3+4, -2+5) = (7, 3).' },
      { category: 'Bangun Ruang', prompt: 'Volume tabung dengan jari-jari 7 cm dan tinggi 10 cm (π = 22/7) adalah ...', answer: '1.540 cm³', distractors: ['770 cm³', '440 cm³', '3.080 cm³'], note: 'V = π r² t = (22/7) × 49 × 10 = 1.540 cm³.' },
      { category: 'Fungsi Kuadrat', prompt: 'Sumbu simetri dari grafik fungsi kuadrat f(x) = x² - 6x + 8 adalah ...', answer: 'x = 3', distractors: ['x = -3', 'x = 6', 'x = 4'], note: 'x = -b/(2a) = -(-6)/(2×1) = 3.' }
    ];
    curPool.push({
      tipe: 'esai',
      pertanyaan: `Jelaskan langkah-langkah menentukan himpunan penyelesaian dari pertidaksamaan eksponen 3^(2x) - 4·3^x + 3 < 0!`,
      opsi: [],
      kunciJawaban: 'Misalkan y = 3^x, maka y² - 4y + 3 < 0 → (y - 1)(y - 3) < 0 → 1 < y < 3 → 3⁰ < 3^x < 3¹ → 0 < x < 1.',
      pembahasan: 'Substitusi y = 3^x mengubah pertidaksamaan eksponen menjadi pertidaksamaan kuadrat yang mudah difaktorkan.',
      bobot: bobotPerSoal
    });
  } else if (isIpa) {
    concepts = [
      { category: 'Ekosistem', prompt: 'Komponen biotik yang berperan sebagai produsen primer pada ekosistem kolam adalah ...', answer: 'Fitoplankton dan tumbuhan air', distractors: ['Zooplankton dan udang', 'Ikan karnivora dan katak', 'Jamur dan bakteri pengurai'], note: 'Produsen primer memiliki klorofil untuk melakukan fotosintesis.' },
      { category: 'Sel', prompt: 'Organel sel yang berfungsi sebagai tempat respirasi seluler dan penghasil ATP adalah ...', answer: 'Mitokondria', distractors: ['Ribosom', 'Lisosom', 'Badan Golgi'], note: 'Mitokondria menghasilkan energi kimia ATP melalui respirasi aerob.' },
      { category: 'Fisika Gerak', prompt: 'Satuan SI untuk gaya sesuai Hukum II Newton (F = m · a) adalah ...', answer: 'Newton (kg·m/s²)', distractors: ['Joule (N·m)', 'Watt (J/s)', 'Pascal (N/m²)'], note: '1 Newton setara dengan gaya yang memberi percepatan 1 m/s² pada massa 1 kg.' },
      { category: 'Energi', prompt: 'Energi yang dimiliki benda karena posisinya terhadap ketinggian permukaan bumi adalah ...', answer: 'Energi Potensial Gravitasi', distractors: ['Energi Kinetik', 'Energi Kalor', 'Energi Bunyi'], note: 'Ep = m · g · h bergantung pada massa, gravitasi, dan ketinggian.' },
      { category: 'Listrik', prompt: 'Hukum Ohm menyatakan hubungan antara tegangan (V), kuat arus (I), dan hambatan (R) dengan rumus ...', answer: 'V = I × R', distractors: ['V = I / R', 'I = V × R', 'R = V × I'], note: 'Tegangan listrik berbanding lurus dengan kuat arus dan hambatan.' },
      { category: 'Peredaran Darah', prompt: 'Pembuluh darah yang membawa darah kaya oksigen keluar dari bilik kiri jantung ke seluruh tubuh adalah ...', answer: 'Aorta (Arteri besar)', distractors: ['Vena cava superior', 'Arteri pulmonalis', 'Kapiler limfa'], note: 'Aorta memompa darah kaya O₂ dari ventrikel kiri ke peredaran sistemik.' },
      { category: 'Pencernaan', prompt: 'Enzim amilase (ptialin) di rongga mulut berfungsi mengubah amilum menjadi ...', answer: 'Maltosa (gula sederhana)', distractors: ['Asam amino', 'Asam lemak dan gliserol', 'Pepton'], note: 'Pencernaan kimiawi karbohidrat dimulai di mulut oleh enzim amilase.' },
      { category: 'Kimia Atom', prompt: 'Partikel penyusun inti atom yang bermuatan listrik positif disebut ...', answer: 'Proton', distractors: ['Elektron', 'Neutron', 'Foton'], note: 'Inti atom terdiri atas proton (+) dan neutron (netral), dikelilingi elektron (-).' },
      { category: 'Genetika', prompt: 'Rasio fenotipe pada persilangan monohibrid dominasi penuh F2 (Aa × Aa) adalah ...', answer: '3 : 1', distractors: ['1 : 2 : 1', '9 : 3 : 3 : 1', '1 : 1'], note: 'Individu AA, Aa, Aa menunjukkan sifat dominan (3) dan aa resesif (1).' },
      { category: 'Tekanan', prompt: 'Tekanan hidrostatis pada zat cair bermassa jenis ρ di kedalaman h dinyatakan dengan persamaan ...', answer: 'Ph = ρ · g · h', distractors: ['Ph = m · g · h', 'Ph = F / A²', 'Ph = ½ m · v²'], note: 'Tekanan hidrostatis meningkat seiring kedalaman dan massa jenis fluida.' }
    ];
  } else if (isPai) {
    concepts = [
      { category: 'Tajwid', prompt: 'Hukum bacaan apabila Nun Sukun (نْ) atau Tanwin bertemu huruf Ba (ب) adalah ...', answer: 'Iqlab', distractors: ['Izhar Halqi', 'Idgham Bilaghunnah', 'Ikhfa Haqiqi'], note: 'Iqlab berarti membalik bunyi nun sukun/tanwin menjadi mim disertai dengung.' },
      { category: 'Tajwid', prompt: 'Panjang bacaan Mad Thabi\'i (Mad Asli) yang standar adalah ...', answer: '2 harakat (1 alif)', distractors: ['4 harakat', '5 harakat', '6 harakat'], note: 'Mad Thabi\'i dibaca panjang tepat 2 harakat.' },
      { category: 'Akhlak', prompt: 'Sikap toleransi, tenggang rasa, dan menghargai perbedaan dalam Islam disebut ...', answer: 'Tasamuh', distractors: ['Takabur', 'Riya', 'Hasad'], note: 'Tasamuh adalah sikap lapang dada dan saling menghormati sesama manusia.' },
      { category: 'Tahfidz', prompt: 'Surat Al-Qur\'an yang berada di urutan pertama Juz 30 dan berjumlah 40 ayat adalah ...', answer: 'An-Naba', distractors: ['An-Nazi\'at', 'Al-Mulk', 'Al-A\'la'], note: 'Juz 30 (Juz Amma) diawali oleh Surat An-Naba ayat 1–40.' },
      { category: 'Tahfidz', prompt: 'Surat pertama dalam Juz 29 yang memiliki keutamaan sebagai pelindung dari siksa kubur adalah ...', answer: 'Al-Mulk', distractors: ['Al-Qalam', 'Al-Haqqah', 'Yasin'], note: 'Juz 29 dibuka dengan Surat Al-Mulk (Tabarak) yang terdiri atas 30 ayat.' },
      { category: 'Ibadah', prompt: 'Golongan orang yang berhak menerima zakat berjumlah delapan asnaf, sebagaimana tercantum dalam ...', answer: 'QS. At-Taubah ayat 60', distractors: ['QS. Al-Baqarah ayat 183', 'QS. Al-Ma\'un ayat 1–7', 'QS. Al-Ikhlas ayat 1–4'], note: 'QS. At-Taubah: 60 merinci 8 golongan mustahik zakat.' },
      { category: 'Aqidah', prompt: 'Asmaul Husna "Al-\'Alim" memiliki arti bahwa Allah SWT Maha ...', answer: 'Mengetahui segala sesuatu', distractors: ['Mendengar seluruh doa', 'Melihat setiap perbuatan', 'Memelihara alam semesta'], note: 'Al-\'Alim berarti Allah Maha Mengetahui baik yang tampak maupun yang ghaib.' },
      { category: 'Tarikh', prompt: 'Perjanjian damai antara kaum Muslimin Madinah dan kaum Quraisy Mekah pada tahun 6 H dikenal sebagai ...', answer: 'Perjanjian Hudaibiyah', distractors: ['Piagam Madinah', 'Fathu Makkah', 'Perang Khandaq'], note: 'Perjanjian Hudaibiyah menjadi titik balik kemenangan dakwah Islam secara damai.' }
    ];
  } else if (isArab) {
    concepts = [
      { category: 'Ta\'aruf', prompt: 'Ungkapan sapaan "Selamat pagi" (صباح الخير) dalam bahasa Arab dijawab dengan ...', answer: 'صباح النور (Shabahun-nur)', distractors: ['مساء الخير (Masa\'ul khair)', 'مع السلامة (Ma\'as-salamah)', 'إلى اللقاء (Ilal-liqa)'], note: 'Shabahul khair dijawab Shabahun-nur.' },
      { category: 'Dhamir', prompt: 'Kata ganti orang (Dhamir Munfashil) yang berarti "Saya / Aku" dalam bahasa Arab adalah ...', answer: 'أنا (Ana)', distractors: ['أنتَ (Anta)', 'هو (Huwa)', 'نحن (Nahnu)'], note: 'Ana = saya, Anta = kamu (lk), Anti = kamu (pr), Huwa = dia (lk), Nahnu = kami.' },
      { category: 'Mufrodat', prompt: 'Arti dari kata "مَدْرَسَةٌ" (Madrasatun) dalam bahasa Indonesia adalah ...', answer: 'Sekolah', distractors: ['Masjid', 'Pasar', 'Rumah'], note: 'Madrasatun = sekolah, Faslun = kelas, Maktabatun = perpustakaan.' },
      { category: 'Mufrodat', prompt: 'Kata benda bahasa Arab yang memiliki arti "Buku tulis / Kitab" adalah ...', answer: 'كِتَابٌ (Kitabun)', distractors: ['قَلَمٌ (Qalamun)', 'كُرْسِيٌّ (Kursiyyun)', 'بَابٌ (Babun)'], note: 'Kitabun = buku, Qalamun = pena, Kursiyyun = kursi, Babun = pintu.' },
      { category: 'Qawaid', prompt: 'Kalimat bahasa Arab yang diawali oleh kata benda (Isim) dan tersusun atas Mubtada serta Khabar disebut ...', answer: 'Jumlah Ismiyah', distractors: ['Jumlah Fi\'liyah', 'Idhafah', 'Na\'at Man\'ut'], note: 'Jumlah Ismiyah dimulai dengan Isim (subjek/mubtada) diikuti Khabar (predikat).' },
      { category: 'Qawaid', prompt: 'Kata kerja yang menunjukkan perbuatan yang telah terjadi di masa lampau disebut ...', answer: 'Fi\'il Madhi', distractors: ['Fi\'il Mudhari\'', 'Fi\'il Amr', 'Isim Fa\'il'], note: 'Fi\'il Madhi = lampau, Fi\'il Mudhari\' = sedang/akan datang, Fi\'il Amr = kata perintah.' },
      { category: 'Al-Arqam', prompt: 'Bilangan bahasa Arab untuk angka "Sepuluh (10)" adalah ...', answer: 'عَشَرَةٌ (\'Asyaratun)', distractors: ['خَمْسَةٌ (Khamsatun)', 'سَبْعَةٌ (Sab\'atun)', 'تِسْعَةٌ (Tis\'atun)'], note: 'Wahid (1) sampai \'Asyarah (10).' },
      { category: 'Al-Alwan', prompt: 'Kata warna dalam bahasa Arab yang berarti "Putih" (untuk mudzakkar) adalah ...', answer: 'أَبْيَضُ (Abyadhu)', distractors: ['أَسْوَدُ (Aswadu)', 'أَحْمَرُ (Ahmaru)', 'أَخْضَرُ (Akhdharu)'], note: 'Abyadhu = putih, Aswadu = hitam, Ahmaru = merah, Akhdharu = hijau.' }
    ];
  } else if (isInggris) {
    concepts = [
      { category: 'Grammar', prompt: 'Which sentence uses the Simple Past Tense correctly?', answer: 'She visited the museum yesterday.', distractors: ['She visits the museum yesterday.', 'She is visiting the museum yesterday.', 'She will visit the museum yesterday.'], note: 'Time marker "yesterday" requires past verb V2 (visited).' },
      { category: 'Text Type', prompt: 'The main social function of a Descriptive Text is to ...', answer: 'Describe a particular person, place, or thing in detail', distractors: ['Retell past events in chronological order', 'Explain how to make or operate something', 'Amuse readers with fictional stories'], note: 'Descriptive text uses identification and description to depict a specific object.' },
      { category: 'Text Type', prompt: 'Which generic structure belongs to a Narrative Text?', answer: 'Orientation – Complication – Resolution', distractors: ['Goal – Materials – Steps', 'Identification – Description', 'Thesis – Arguments – Reiteration'], note: 'Narrative stories develop through Orientation, Complication, and Resolution.' },
      { category: 'Grammar', prompt: 'Change into Passive Voice: "Students clean the classroom every morning."', answer: 'The classroom is cleaned by students every morning.', distractors: ['The classroom was cleaned by students every morning.', 'The classroom is cleaning by students every morning.', 'Students are cleaned the classroom every morning.'], note: 'Present passive uses is/are + V3 (is cleaned).' },
      { category: 'Expression', prompt: 'Which expression is used to ask for someone\'s opinion politely?', answer: 'What do you think about our school project?', distractors: ['Close the door right now!', 'Congratulation on your graduation!', 'I am sorry to hear that.'], note: '"What do you think about...?" asks for an opinion.' },
      { category: 'Grammar', prompt: 'The past participle (V3) form of the irregular verb "write" is ...', answer: 'written', distractors: ['wrote', 'writed', 'writing'], note: 'write (V1) - wrote (V2) - written (V3).' },
      { category: 'Procedure Text', prompt: 'Imperative verbs (action commands) such as "Slice", "Boil", and "Mix" are predominantly found in ...', answer: 'Procedure Text', distractors: ['Narrative Text', 'Recount Text', 'Descriptive Text'], note: 'Procedure texts guide readers through step-by-step commands.' },
      { category: 'Recount Text', prompt: 'The social function of a Recount Text is to ...', answer: 'Retell past experiences or events in sequence', distractors: ['Persuade readers to buy a product', 'Describe general scientific classifications', 'Give instructions on safety rules'], note: 'Recount texts narrate past events chronologically.' }
    ];
  } else if (isIndo) {
    concepts = [
      { category: 'Teks LHO', prompt: 'Teks yang menyajikan fakta objektif tentang suatu objek berdasarkan hasil pengamatan sistematis adalah ...', answer: 'Teks Laporan Hasil Observasi (LHO)', distractors: ['Teks Cerpen', 'Teks Negosiasi', 'Teks Anekdot'], note: 'Teks LHO bersifat objektif, faktual, dan disusun berdasarkan pengamatan langsung.' },
      { category: 'Teks Eksplanasi', prompt: 'Struktur utama Teks Eksplanasi yang menjelaskan proses terjadinya fenomena alam atau sosial secara berurutan adalah ...', answer: 'Deretan Penjelas (Urutan Sebab-Akibat)', distractors: ['Orientasi Tokoh', 'Abstraksi Masalah', 'Koda Penutup'], note: 'Teks eksplanasi tersusun atas Pernyataan Umum, Deretan Penjelas, dan Interpretasi.' },
      { category: 'Cerpen', prompt: 'Sudut pandang penceritaan di mana pengarang menggunakan kata ganti "aku" atau "saya" disebut ...', answer: 'Sudut pandang orang pertama', distractors: ['Sudut pandang orang ketiga serba tahu', 'Alur sorot balik (flashback)', 'Amanat cerita'], note: 'Penggunaan kata ganti "aku/saya" menandai sudut pandang orang pertama.' },
      { category: 'Kebahasaan', prompt: 'Penulisan kata baku yang sesuai dengan Pedoman Umum Ejaan Bahasa Indonesia (EYD V) adalah ...', answer: 'Aktivitas dan Analisis', distractors: ['Aktifitas dan Analisa', 'Praktek dan Sistim', 'Resiko dan Jadual'], note: 'Bentuk baku dalam KBBI adalah aktivitas, analisis, praktik, sistem, risiko, dan jadwal.' },
      { category: 'Pidato', prompt: 'Bagian pidato persuasif yang berisi ajakan kuat agar pendengar melakukan tindakan positif disebut ...', answer: 'Persuasi / Ajakan', distractors: ['Salam Pembuka', 'Latar Belakang', 'Daftar Pustaka'], note: 'Pidato persuasif bertujuan meyakinkan dan mengajak audiens.' },
      { category: 'Puisi Rakyat', prompt: 'Puisi lama yang terdiri atas 4 baris per bait, bersajak a-b-a-b, serta memiliki sampiran dan isi adalah ...', answer: 'Pantun', distractors: ['Gurindam', 'Syair', 'Soneta'], note: 'Pantun bersajak a-b-a-b dengan baris 1-2 sampiran dan baris 3-4 isi.' },
      { category: 'Teks Prosedur', prompt: 'Kata kerja yang menyatakan perintah atau instruksi langsung dalam teks prosedur disebut ...', answer: 'Verba Imperatif', distractors: ['Verba Mental', 'Konjungsi Kausalitas', 'Nomina Abstrak'], note: 'Contoh verba imperatif: potonglah, tuangkan, aduklah.' },
      { category: 'Kalimat Efektif', prompt: 'Syarat utama kalimat efektif agar mudah dipahami pembaca tanpa makna ganda adalah ...', answer: 'Tidak bermakna ambigu (kejelasan struktur S-P dan kehematan kata)', distractors: ['Menggunakan banyak kata mubazir', 'Mengulang subjek berulang kali', 'Menghilangkan tanda baca titik'], note: 'Kalimat efektif hemat kata, logis, sejajar, dan tidak ambigu.' }
    ];
  } else if (isIps) {
    concepts = [
      { category: 'ASEAN', prompt: 'Organisasi kerja sama regional negara-negara Asia Tenggara yang berdiri pada 8 Agustus 1967 adalah ...', answer: 'ASEAN', distractors: ['APEC', 'OPEC', 'UNESCO'], note: 'ASEAN didirikan melalui Deklarasi Bangkok pada 8 Agustus 1967.' },
      { category: 'Ekonomi', prompt: 'Hukum permintaan menyatakan bahwa apabila harga suatu barang naik (ceteris paribus), maka jumlah barang yang diminta akan ...', answer: 'Menurun', distractors: ['Meningkat tajam', 'Tetap tidak berubah', 'Menjadi tak terhingga'], note: 'Harga dan jumlah barang yang diminta berbanding terbalik.' },
      { category: 'Sejarah', prompt: 'Peristiwa penculikan Soekarno dan Hatta oleh golongan muda pada 16 Agustus 1945 untuk mempercepat proklamasi disebut ...', answer: 'Peristiwa Rengasdengklok', distractors: ['Sumpah Pemuda', 'Agresi Militer I', 'Konferensi Meja Bundar'], note: 'Rengasdengklok bertujuan menjauhkan Soekarno-Hatta dari pengaruh Jepang.' },
      { category: 'Geografi', prompt: 'Lapisan kerak bumi paling luar yang tersusun atas lempeng batuan padat disebut ...', answer: 'Litosfer', distractors: ['Atmosfer', 'Hidrosfer', 'Biosfer'], note: 'Litosfer adalah lapisan batuan pembentuk kulit bumi.' },
      { category: 'Sosiologi', prompt: 'Proses individu mempelajari nilai, norma, dan kebudayaan masyarakat sejak kecil disebut ...', answer: 'Sosialisasi', distractors: ['Urbanisasi', 'Konsolidasi', 'Akomodasi'], note: 'Sosialisasi membentuk kepribadian individu sesuai norma sosial.' },
      { category: 'Ekonomi', prompt: 'Masalah pokok ekonomi modern akibat keterbatasan sumber daya dibandingkan kebutuhan manusia yang tak terbatas disebut ...', answer: 'Kelangkaan (Scarcity)', distractors: ['Inflasi Moneter', 'Surplus Anggaran', 'Monopoli Pasar'], note: 'Kelangkaan memaksa manusia menentukan pilihan dan skala prioritas.' },
      { category: 'Geografi', prompt: 'Perbandingan jarak pada peta dengan jarak sebenarnya di permukaan bumi disebut ...', answer: 'Skala Peta', distractors: ['Legenda Peta', 'Garis Kontur', 'Proyeksi Azimuth'], note: 'Skala menunjukkan rasio pengecilan objek geografis pada peta.' },
      { category: 'Sejarah', prompt: 'Kongres Pemuda II yang melahirkan ikrar Sumpah Pemuda diselenggarakan pada tanggal ...', answer: '28 Oktober 1928', distractors: ['20 Mei 1908', '17 Agustus 1945', '10 November 1945'], note: '28 Oktober 1928 diperingati sebagai Hari Sumpah Pemuda.' }
    ];
  } else if (isPkn) {
    concepts = [
      { category: 'Pancasila', prompt: 'Sila Pancasila yang menjadi landasan persatuan bangsa di tengah keberagaman suku, agama, dan budaya adalah ...', answer: 'Sila ke-3: Persatuan Indonesia', distractors: ['Sila ke-1: Ketuhanan Yang Maha Esa', 'Sila ke-2: Kemanusiaan yang Adil dan Beradab', 'Sila ke-5: Keadilan Sosial'], note: 'Sila ketiga menegaskan persatuan Indonesia dan Bhinneka Tunggal Ika.' },
      { category: 'Konstitusi', prompt: 'Hukum dasar tertulis tertinggi yang menjadi sumber hukum nasional di Indonesia adalah ...', answer: 'UUD NRI Tahun 1945', distractors: ['Peraturan Daerah', 'Keputusan Menteri', 'Tata Tertib Sekolah'], note: 'UUD NRI 1945 menempati posisi puncak dalam tata urutan perundang-undangan.' },
      { category: 'Norma', prompt: 'Norma yang bersumber dari aturan negara dan memiliki sanksi tegas serta memaksa adalah ...', answer: 'Norma Hukum', distractors: ['Norma Kesopanan', 'Norma Kebiasaan', 'Norma Mode'], note: 'Norma hukum bersifat mengikat dengan sanksi resmi dari aparat penegak hukum.' },
      { category: 'Demokrasi', prompt: 'Semboyan negara Indonesia yang berarti "Berbeda-beda tetapi tetap satu jua" adalah ...', answer: 'Bhinneka Tunggal Ika', distractors: ['Tut Wuri Handayani', 'Ing Ngarsa Sung Tuladha', 'Gemah Ripah Loh Jinawi'], note: 'Bhinneka Tunggal Ika berasal dari kitab Sutasoma karya Mpu Tantular.' }
    ];
  } else if (isPjok) {
    concepts = [
      { category: 'Bola Voli', prompt: 'Teknik dasar permainan bola voli yang digunakan untuk menerima servis lawan dan mengumpan dari bawah disebut ...', answer: 'Passing Bawah', distractors: ['Smash Keras', 'Blocking Net', 'Lay-up Shoot'], note: 'Passing bawah menahan dan mengarahkan bola datang dari servis lawan.' },
      { category: 'Kebugaran', prompt: 'Kemampuan tubuh untuk melakukan aktivitas fisik dalam waktu lama tanpa kelelahan berarti disebut ...', answer: 'Daya Tahan (Endurance)', distractors: ['Kelentukan', 'Keseimbangan', 'Kecepatan Reaksi'], note: 'Daya tahan kardiorespirasi dapat dilatih melalui lari jarak menengah atau bersepeda.' },
      { category: 'Senam Lantai', prompt: 'Gerakan menggulingkan badan ke depan di atas matras dengan tumpuan tengkuk dan punggung disebut ...', answer: 'Roll Depan (Forward Roll)', distractors: ['Sikap Lilin', 'Meroda (Cartwheel)', 'Lompat Harimau'], note: 'Roll depan membulatkan badan sehingga tengkuk hingga punggung bergulir mulus.' },
      { category: 'Atletik', prompt: 'Jenis start yang wajib digunakan dalam perlombaan lari jarak pendek (sprint 100 meter) adalah ...', answer: 'Start Jongkok (Crouch Start)', distractors: ['Start Berdiri', 'Start Melayang', 'Start Duduk'], note: 'Start jongkok menghasilkan tolakan eksplosif di awal sprint.' }
    ];
  } else if (isSeni) {
    concepts = [
      { category: 'Seni Rupa', prompt: 'Unsur seni rupa yang berkaitan dengan kesan gelap-terang untuk menciptakan dimensi pada gambar model adalah ...', answer: 'Pencahayaan / Gelap-Terang (Value)', distractors: ['Ritme Nada', 'Tempo Gerak', 'Harmoni Vokal'], note: 'Gradasi gelap-terang memberi efek volume tiga dimensi pada objek dua dimensi.' },
      { category: 'Seni Musik', prompt: 'Alat musik tradisional Jawa Barat berbahan bambu yang dimainkan dengan cara digoyangkan adalah ...', answer: 'Angklung', distractors: ['Sasando', 'Kolintang', 'Tifa'], note: 'Angklung diakui UNESCO sebagai warisan budaya takbenda asal Indonesia.' },
      { category: 'Seni Rupa', prompt: 'Motif ragam hias yang mengambil inspirasi dari bentuk tumbuh-tumbuhan seperti daun dan bunga disebut ragam hias ...', answer: 'Flora (Vegetal)', distractors: ['Fauna (Animal)', 'Geometris', 'Figuratif'], note: 'Ragam hias flora memodifikasi bentuk daun, sulur, dan bunga.' },
      { category: 'Seni Tari', prompt: 'Unsur utama dalam seni tari yang mengatur cepat-lambatnya gerakan penari disebut ...', answer: 'Tempo / Wirama', distractors: ['Wirupa', 'Tekstur Kanvas', 'Perspektif Garis'], note: 'Wirama mengatur keselarasan gerak tari dengan iringan musik.' }
    ];
  } else if (isPrakarya) {
    concepts = [
      { category: 'Pengolahan', prompt: 'Teknik memasak bahan pangan menggunakan uap air panas tanpa merendam langsung bahan makanan disebut ...', answer: 'Mengukus (Steaming)', distractors: ['Menggoreng (Deep Frying)', 'Membakar (Grilling)', 'Menyangrai'], note: 'Mengukus menjaga kandungan vitamin larut air pada sayuran.' },
      { category: 'Kerajinan', prompt: 'Serat alam yang berasal dari bagian batang atau pelepah tumbuhan untuk bahan kerajinan anyaman adalah ...', answer: 'Serat Enceng Gondok dan Pelepah Pisang', distractors: ['Serat Nilon Sintetis', 'Serat Poliester', 'Logam Aluminium'], note: 'Enceng gondok dan pelepah pisang merupakan serat alam nabati ramah lingkungan.' },
      { category: 'Budidaya', prompt: 'Teknik budidaya tanaman sayuran tanpa menggunakan media tanah melainkan larutan nutrisi mineral disebut ...', answer: 'Hidroponik', distractors: ['Tumpang Sari', 'Terasering', 'Rotasi Lahan'], note: 'Hidroponik memanfaatkan air bernutrisi dan media tanam seperti rockwool/hidroton.' },
      { category: 'Kewirausahaan', prompt: 'Fungsi utama kemasan (packaging) pada produk pangan atau kerajinan wirausaha adalah ...', answer: 'Melindungi produk, menjaga kualitas, dan menarik minat konsumen', distractors: ['Mengurangi kualitas produk', 'Menghilangkan informasi kedaluwarsa', 'Menyulitkan distribusi'], note: 'Kemasan berperan sebagai pelindung fisik sekaligus media promosi dan informasi produk.' }
    ];
  } else if (isDaerah) {
    concepts = [
      { category: 'Ragam Bahasa', prompt: 'Tingkatan tutur kata bahasa daerah yang digunakan untuk menghormati orang tua atau guru disebut ...', answer: 'Ragam Bahasa Halus / Krama / Lemes', distractors: ['Ragam Bahasa Kasar / Ngoko', 'Bahasa Slang Gaul', 'Singkatan Informal'], note: 'Penggunaan ragam halus mencerminkan tata krama dan unggah-ungguh.' },
      { category: 'Sastra Daerah', prompt: 'Cerita turun-temurun masyarakat daerah tentang asal-usul suatu tempat atau tokoh disebut ...', answer: 'Legenda / Cerita Rakyat', distractors: ['Laporan Keuangan', 'Teks Berita Aktual', 'Surat Resmi'], note: 'Legenda merupakan bagian kekayaan sastra lisan Nusantara.' },
      { category: 'Aksara Daerah', prompt: 'Fungsi utama pembelajaran aksara tradisional Nusantara di sekolah adalah ...', answer: 'Melestarikan warisan budaya tulis lokal dan literasi daerah', distractors: ['Menggantikan seluruh huruf Latin secara nasional', 'Menghapus kosakata daerah', 'Membatasi komunikasi antardaerah'], note: 'Aksara daerah merupakan identitas sejarah dan budaya masyarakat.' },
      { category: 'Ungkapan', prompt: 'Ungkapan tradisional berisi nasihat kehidupan yang menjadi kearifan lokal masyarakat disebut ...', answer: 'Peribahasa / Paribasan / Babasan', distractors: ['Kalimat Perintah', 'Kata Sandang', 'Istilah Teknis'], note: 'Peribahasa menyampaikan nilai moral secara bijak dan turun-temurun.' }
    ];
  } else {
    concepts = [
      { category: topik, prompt: `Dalam mata pelajaran "${mataPelajaran}" topik "${topik}", kompetensi inti yang ditekankan pada Kurikulum Merdeka untuk ${kelas} adalah ...`, answer: 'Memahami konsep esensial dan menerapkannya secara kritis dalam konteks nyata', distractors: ['Menghafal definisi tanpa memahami makna', 'Menjawab soal tanpa analisis alasan', 'Mengabaikan keterkaitan antar konsep'], note: `Kurikulum Merdeka berfokus pada pemahaman mendalam (deep learning) pada ${mataPelajaran}.` },
      { category: topik, prompt: `Pendekatan paling efektif untuk menganalisis permasalahan pada materi "${topik}" dalam ${mataPelajaran} adalah ...`, answer: 'Mengidentifikasi fakta kunci, menelaah prinsip dasar, dan menarik kesimpulan logis', distractors: ['Menebak jawaban tanpa data pendukung', 'Mengabaikan konteks studi kasus', 'Menghindari evaluasi kritis'], note: `Analisis berbasis fakta dan konsep memperkuat penalaran kritis siswa pada ${topik}.` },
      { category: topik, prompt: `Manfaat utama menguasai materi "${topik}" pada mata pelajaran ${mataPelajaran} bagi peserta didik adalah ...`, answer: 'Mampu memecahkan persoalan sehari-hari secara kreatif, mandiri, dan terstruktur', distractors: ['Sekadar menggugurkan kewajiban absensi', 'Tidak relevan dengan kehidupan nyata', 'Membatasi wawasan berpikir'], note: `Penguasaan ${topik} membekali keterampilan aplikatif bagi siswa ${kelas}.` },
      { category: topik, prompt: `Dalam mengevaluasi pemahaman materi "${topik}" (${tingkatKesulitan}), indikator keberhasilan siswa ditunjukkan oleh ...`, answer: 'Ketepatan menjelaskan hubungan konsep, prosedur, dan alasan di balik solusi', distractors: ['Kecepatan menyalin teks tanpa memahami isi', 'Menghindari diskusi kelompok', 'Mengandalkan hafalan semata'], note: `Pemahaman konseptual menjadi tolok ukur keberhasilan belajar ${mataPelajaran}.` }
    ];
  }

  // Build candidate questions from concepts across all requested types
  const candidates: any[] = [...curPool];

  // Prioritize concepts matching topik keywords first
  const tpTokens = tpLower.split(/[\s,()/-]+/).filter(w => w.length >= 3);
  const sortedConcepts = [...concepts].sort((a, b) => {
    const aText = `${a.category} ${a.prompt} ${a.answer}`.toLowerCase();
    const bText = `${b.category} ${b.prompt} ${b.answer}`.toLowerCase();
    const aScore = tpTokens.reduce((acc, tk) => acc + (aText.includes(tk) ? 1 : 0), 0);
    const bScore = tpTokens.reduce((acc, tk) => acc + (bText.includes(tk) ? 1 : 0), 0);
    return bScore - aScore;
  });

  // 1. Add PG questions from every concept
  sortedConcepts.forEach((c, idx) => {
    candidates.push(makePgFromConcept(c, idx));
  });

  // 2. Add Multiple Choice questions from pairs of concepts
  for (let i = 0; i + 1 < sortedConcepts.length; i += 2) {
    const c1 = sortedConcepts[i];
    const c2 = sortedConcepts[i + 1];
    candidates.push(
      makeMcFromConceptPair(
        c1,
        c2,
        c1.distractors[0],
        c2.distractors[1],
        `Dalam materi ${mataPelajaran} (${c1.category} & ${c2.category}), manakah DUA pernyataan/jawaban yang TEPAT?`,
        i
      )
    );
  }

  // 3. Add Isian Singkat questions from every concept
  sortedConcepts.forEach((c) => {
    candidates.push(makeIsianFromConcept(c));
  });

  // 4. Add Esai questions from concepts & topic
  sortedConcepts.slice(0, 8).forEach((c) => {
    candidates.push({
      tipe: 'esai',
      pertanyaan: `Jelaskan konsep dan alasan ilmiah/kaidah yang mendasari pernyataan berikut pada materi ${mataPelajaran} (${c.category}): "${c.prompt.replace(/\.\.\.$/, c.answer)}"`,
      opsi: [],
      kunciJawaban: `${c.answer}. ${c.note}`,
      pembahasan: c.note,
      bobot: bobotPerSoal
    });
  });

  // Filter strictly by requested tipeSoal
  const requestedSet = new Set(tipeSoal);
  const matchingByType = candidates.filter(item => requestedSet.has(item.tipe));
  const poolToUse = matchingByType.length > 0 ? matchingByType : candidates;

  // Deduplicate against existingStems and distribute fairly across requested types
  const seenStems = new Set(existingStems.map(s => s.trim().toLowerCase()));
  const selected: any[] = [];
  const byType: Record<string, any[]> = {};
  for (const t of tipeSoal) byType[t] = [];
  for (const item of poolToUse) {
    const stemKey = (item.pertanyaan || '').trim().toLowerCase();
    if (seenStems.has(stemKey)) continue;
    if (!byType[item.tipe]) byType[item.tipe] = [];
    byType[item.tipe].push(item);
  }

  // Round-robin pick across requested types so user gets balanced question types
  let progress = true;
  while (selected.length < jumlahSoal && progress) {
    progress = false;
    for (const t of tipeSoal) {
      if (selected.length >= jumlahSoal) break;
      const arr = byType[t];
      if (arr && arr.length > 0) {
        const nextItem = arr.shift()!;
        const stemKey = (nextItem.pertanyaan || '').trim().toLowerCase();
        if (!seenStems.has(stemKey)) {
          seenStems.add(stemKey);
          selected.push(nextItem);
          progress = true;
        }
      }
    }
  }

  // If caller asked for more questions (up to 50) than unique pool entries, synthesize distinct HOTS/Application variations
  let variantIdx = 1;
  while (selected.length < jumlahSoal) {
    const targetTipe = tipeSoal[selected.length % tipeSoal.length] || 'pg';
    const baseConcept = sortedConcepts[(selected.length + variantIdx) % sortedConcepts.length];
    const contextLabel = `${mataPelajaran} — ${topik || baseConcept.category}`;

    let generatedItem: any;
    if (targetTipe === 'pg') {
      generatedItem = makePgFromConcept(
        {
          ...baseConcept,
          prompt: `[Studi Kasus #${variantIdx}] Dalam pembelajaran ${contextLabel} untuk ${kelas}, ${baseConcept.prompt.charAt(0).toLowerCase()}${baseConcept.prompt.slice(1)}`
        },
        selected.length + variantIdx
      );
    } else if (targetTipe === 'multiple_choice') {
      const altConcept = sortedConcepts[(selected.length + variantIdx + 1) % sortedConcepts.length];
      generatedItem = makeMcFromConceptPair(
        baseConcept,
        altConcept,
        baseConcept.distractors[1],
        altConcept.distractors[2],
        `[Analisis Konsep #${variantIdx}] Berdasarkan materi ${contextLabel}, pilihlah DUA informasi yang benar:`,
        selected.length + variantIdx
      );
    } else if (targetTipe === 'isian') {
      generatedItem = {
        tipe: 'isian',
        pertanyaan: `[Latihan #${variantIdx}] Tuliskan jawaban yang tepat untuk materi ${contextLabel}: ${baseConcept.prompt}`,
        opsi: [],
        kunciJawaban: baseConcept.answer,
        pembahasan: baseConcept.note,
        bobot: bobotPerSoal
      };
    } else {
      generatedItem = {
        tipe: 'esai',
        pertanyaan: `[Uraian #${variantIdx}] Berikan penjelasan dan contoh penerapan nyata dari konsep "${baseConcept.category}: ${baseConcept.answer}" dalam mata pelajaran ${mataPelajaran} (${kelas})!`,
        opsi: [],
        kunciJawaban: `${baseConcept.answer}. ${baseConcept.note}`,
        pembahasan: `Penerapan kontekstual ${baseConcept.category} membantu penguasaan materi ${topik}.`,
        bobot: bobotPerSoal
      };
    }

    const stemKey = generatedItem.pertanyaan.trim().toLowerCase();
    if (!seenStems.has(stemKey)) {
      seenStems.add(stemKey);
      selected.push(generatedItem);
    }
    variantIdx++;
  }

  return selected.slice(0, jumlahSoal);
}

// 2. Gemini AI Assistant Endpoint for CBT Question Generator
app.post('/api/ai/generate-questions', async (req, res) => {
  let mataPelajaran = '';
  let kelas = '';
  let topik = '';
  let jumlahSoal = 10;
  let tipeSoal: string[] = ['pg', 'multiple_choice', 'isian', 'esai'];
  let tingkatKesulitan = 'Sedang (C3: Aplikasi Konsep)';
  let instruksiTambahan = '';
  let bobotPerSoal = 10;

  try {
    const body = req.body || {};
    mataPelajaran = body.mataPelajaran || 'Mata Pelajaran Umum';
    kelas = body.kelas || 'Kelas VII';
    topik = body.topik || 'Capaian Pembelajaran Kurikulum Merdeka';
    jumlahSoal = Math.min(Math.max(Number(body.jumlahSoal) || 10, 1), 50);
    tipeSoal = body.tipeSoal && Array.isArray(body.tipeSoal) && body.tipeSoal.length > 0 ? body.tipeSoal : ['pg', 'multiple_choice', 'isian', 'esai'];
    tingkatKesulitan = body.tingkatKesulitan || 'Sedang (C3: Aplikasi Konsep)';
    instruksiTambahan = body.instruksiTambahan || '';
    bobotPerSoal = Number(body.bobotPerSoal) || 10;

    const tipeSoalMap: Record<string, string> = {
      'pg': '- Pilihan Ganda (pg): memiliki 4 opsi jawaban (A, B, C, D) dengan tepat SATU jawaban benar.',
      'multiple_choice': '- Pilihan Ganda Kompleks (multiple_choice): memiliki 4 opsi jawaban (A, B, C, D) dengan LEBIH DARI SATU jawaban benar (contoh kunciJawaban: ["A", "C"]).',
      'isian': '- Isian Singkat (isian): pertanyaan langsung, kunciJawaban berupa kata/frasa/angka singkat yang tepat, tanpa opsi.',
      'esai': '- Esai / Uraian (esai): pertanyaan analitis/pemecahan masalah, kunciJawaban berupa rangkuman jawaban ideal, tanpa opsi.'
    };
    const tipeSoalListText = tipeSoal.map(t => tipeSoalMap[t] || `- ${t}`).join('\n');

    // Batch generation in chunks of up to 20 questions so large requests (e.g. 30-50) never truncate JSON
    const allGenerated: any[] = [];
    const batchSizeLimit = 20;
    let remaining = jumlahSoal;
    let batchNumber = 1;

    while (remaining > 0 && batchNumber <= 4) {
      const currentBatchCount = Math.min(remaining, batchSizeLimit);
      const existingTopicsNote = allGenerated.length > 0
        ? `\nCATATAN PENTING ANTI-DUPLIKASI: Anda sudah membuat ${allGenerated.length} soal sebelumnya. JANGAN mengulang pertanyaan berikut:\n${allGenerated.slice(-15).map((q, i) => `${i + 1}. ${String(q.pertanyaan || '').slice(0, 90)}`).join('\n')}`
        : '';

      const prompt = `Anda adalah pakar pembuat soal Asesmen / CBT Kurikulum Merdeka Indonesia jenjang SMP/SMA.
Tugas Anda: Buat TEPAT ${currentBatchCount} butir soal berkualitas tinggi yang SEPENUHNYA SESUAI dengan:
- Mata Pelajaran: "${mataPelajaran}"
- Tingkat / Kelas: "${kelas}"
- Topik / Materi: "${topik}"
- Tingkat Kesulitan: "${tingkatKesulitan}"
${instruksiTambahan ? `- Instruksi Khusus Guru: "${instruksiTambahan}"` : ''}${existingTopicsNote}

Ketentuan Tipe Soal yang Diminta:
${tipeSoalListText}

PANDUAN PEMBUATAN SOAL:
1. Soal harus 100% relevan dengan mata pelajaran "${mataPelajaran}" dan materi "${topik}" (jangan mencampur dengan materi mapel lain).
2. Buat tepat ${currentBatchCount} soal yang unik dan bervariasi. Gunakan stimulus yang bermakna.
3. Hanya buat soal dengan tipe yang diminta (${tipeSoal.join(', ')}).
4. Untuk 'pg', berikan opsi A, B, C, D dan kunciJawaban adalah string tunggal huruf kapital ("A", "B", "C", atau "D").
5. Untuk 'multiple_choice', berikan opsi A, B, C, D dan kunciJawaban adalah array string minimal 2 jawaban benar (misal ["A", "C"]).
6. Untuk 'isian' dan 'esai', opsi harus berupa array kosong []. Kunci jawaban berisi teks jawaban yang akurat.
7. Sertakan pembahasan yang jelas dan edukatif untuk setiap soal.
8. Berikan bobot: ${bobotPerSoal} untuk setiap soal.

KEMBALIKAN HANYA ARRAY JSON VALID (tanpa teks pengantar / penutup):
[
  {
    "tipe": "pg",
    "pertanyaan": "Teks soal lengkap...",
    "opsi": [
      { "id": "A", "teks": "Pilihan A" },
      { "id": "B", "teks": "Pilihan B" },
      { "id": "C", "teks": "Pilihan C" },
      { "id": "D", "teks": "Pilihan D" }
    ],
    "kunciJawaban": "A",
    "pembahasan": "Penjelasan detail kunci jawaban...",
    "bobot": ${bobotPerSoal}
  }
]`;

      const response = await generateContentWithFallback({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          maxOutputTokens: 16384
        }
      });

      const aiResponseText = response.text || '';
      const jsonString = aiResponseText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedBatch = JSON.parse(jsonString);

      if (!Array.isArray(parsedBatch) || parsedBatch.length === 0) {
        if (allGenerated.length === 0) {
          throw new Error('Format respon Gemini bukan array valid.');
        }
        break;
      }

      allGenerated.push(...parsedBatch);
      remaining = jumlahSoal - allGenerated.length;
      batchNumber++;
    }

    if (allGenerated.length > 0) {
      // Top up with smart subject-specific templates if Gemini returned slightly fewer than requested
      if (allGenerated.length < jumlahSoal) {
        const extra = generateSmartFallbackQuestions({
          mataPelajaran,
          kelas,
          topik,
          jumlahSoal: jumlahSoal - allGenerated.length,
          tipeSoal,
          tingkatKesulitan,
          bobotPerSoal,
          existingStems: allGenerated.map(q => String(q.pertanyaan || ''))
        });
        allGenerated.push(...extra);
      }
      return res.json({ success: true, soalList: allGenerated.slice(0, jumlahSoal), source: 'gemini-ai' });
    }
    throw new Error('Format respon Gemini bukan array valid.');

  } catch (error: any) {
    const isKeyIssue = error?.isKeyConfigError || (error?.message && (error.message.includes('API key') || error.message.includes('API_KEY')));
    if (isKeyIssue) {
      console.log('[CBT AI Generator] Gemini API key not configured or needs activation in Settings > Secrets. Using Kurikulum Merdeka smart template generator.');
    } else {
      console.log('[CBT AI Generator] Using Kurikulum Merdeka smart generator fallback:', error?.message || 'Standard fallback');
    }

    const result = generateSmartFallbackQuestions({
      mataPelajaran,
      kelas,
      topik,
      jumlahSoal,
      tipeSoal,
      tingkatKesulitan,
      bobotPerSoal
    });

    return res.json({ success: true, soalList: result, isFallback: true, source: 'smart-template' });
  }
});

// 3. Gemini AI Endpoint for Administrasi Guru (Modul Ajar Deep Learning & Inklusi / ATP / Jurnal / Prota / Prosem)
app.post('/api/ai/generate-administrasi', async (req, res) => {
  let tipe = '';
  let mataPelajaran = '';
  let kelas = '';
  let topik = '';
  let tahunAjaran = '';
  let semester = 'Ganjil';
  try {
    const body = req.body || {};
    tipe = body.tipe;
    mataPelajaran = body.mataPelajaran;
    kelas = body.kelas;
    topik = body.topik;
    tahunAjaran = body.tahunAjaran;
    semester = body.semester || 'Ganjil';

    const apiKey = process.env.GEMINI_API_KEY;

    if (tipe === 'modul_ajar') {
      const suggestedAyat = suggestAyatForMateri(mataPelajaran, topik);
      const topikLabel = topik || 'Materi Pokok Kurikulum Nasional';
      const prompt = `Anda adalah pakar Pembelajaran Mendalam (Deep Learning) Kemendikdasmen RI sekaligus pendidik di SMP Islam Modern Al Fakhir.
Buatkan **Modul Ajar Pembelajaran Mendalam (Deep Learning)** yang sangat detail, profesional, ramah inklusi, berlandaskan 3 prinsip Pembelajaran Mendalam (Berkesadaran/Mindful, Bermakna/Meaningful, Menggembirakan/Joyful), mengacu pada **8 Dimensi Profil Lulusan**, menggunakan pengalaman belajar bertahap (**Memahami, Mengaplikasi, Merefleksi**), serta **WAJIB menyisipkan 1 Ayat Al-Qur'an yang sahih, tepat, dan benar-benar relevan dengan materi yang diajarkan** dalam format JSON terstruktur yang valid.

Mata Pelajaran: "${mataPelajaran}"
Kelas: "${kelas}"
Topik/Materi: "${topikLabel}"
Tahun Ajaran: "${tahunAjaran || '2026/2027'}"

Ketentuan Integrasi Ayat Al-Qur'an:
- Pilih ayat Al-Qur'an yang paling kontekstual dengan materi "${topikLabel}" pada mata pelajaran "${mataPelajaran}" (jika relevan boleh merujuk seperti ${suggestedAyat.surahAyat} atau ayat Al-Qur'an sahih lainnya yang lebih spesifik).
- Pastikan "teksArab" ditulis dengan huruf Arab Al-Qur'an berharakat yang benar dan sahih.
- Pastikan "terjemahan" akurat sesuai terjemahan Al-Qur'an Kemenag RI.
- Pastikan "kaitanMateri" menjelaskan secara mendalam hubungan/tadabbur ayat tersebut dengan materi "${topikLabel}" dan bagaimana nilai ayat dihidupkan selama pembelajaran.

Ketentuan 8 Dimensi Profil Lulusan (pilih 3-5 yang paling relevan dari daftar ini):
["Keimanan dan Ketakwaan terhadap Tuhan YME", "Kewargaan", "Penalaran Kritis", "Kreativitas", "Kolaborasi", "Kemandirian", "Kesehatan", "Komunikasi"]

Format output HARUS berupa JSON object valid yang memiliki struktur berikut (jangan gunakan pembungkus markdown, langsung kembalikan raw JSON):
{
  "informasiUmum": {
    "namaPenyusun": "[Nama Penyusun Guru]",
    "namaSekolah": "SMP Islam Modern Al Fakhir",
    "mataPelajaran": "${mataPelajaran}",
    "fase": "D",
    "kelas": "${kelas}",
    "semester": "Ganjil",
    "tahunAjaran": "${tahunAjaran || '2026/2027'}",
    "alokasiWaktu": "2 JP (2 x 40 Menit)",
    "materi": "${topikLabel}"
  },
  "ayatAlQuran": {
    "surahAyat": "Contoh: QS. Nama Surah (No): Ayat",
    "teksArab": "Teks Arab ayat Al-Qur'an berharakat lengkap dan sahih",
    "terjemahan": "Terjemahan Bahasa Indonesia yang akurat sesuai Kemenag RI",
    "kaitanMateri": "Uraian tadabbur mendalam mengenai kaitan ayat Al-Qur'an dengan materi ${topikLabel} dan penerapannya dalam pembelajaran."
  },
  "kompetensiAwal": "Identifikasi kesiapan belajar, pengetahuan prasyarat, minat, dan kebutuhan inklusi peserta didik sebelum mempelajari ${topikLabel}.",
  "dimensiProfilLulusan": ["Keimanan dan Ketakwaan terhadap Tuhan YME", "Penalaran Kritis", "Kreativitas", "Kolaborasi", "Komunikasi"],
  "profilPelajarPancasila": ["Keimanan dan Ketakwaan terhadap Tuhan YME", "Penalaran Kritis", "Kreativitas", "Kolaborasi", "Komunikasi"],
  "capaianPembelajaran": "Uraian Capaian Pembelajaran (CP) Fase D yang relevan untuk mata pelajaran ${mataPelajaran} pada materi ${topikLabel}.",
  "lintasDisiplinIlmu": "Keterkaitan materi ${topikLabel} dengan mata pelajaran/disiplin ilmu lain (termasuk PAI & Budi Pekerti serta konteks kehidupan nyata).",
  "kerangkaPembelajaran": {
    "praktikPedagogis": "Model dan strategi pedagogis mendalam (misalnya Problem-Based / Inquiry / Project-Based Learning) yang menumbuhkan pemahaman bermakna.",
    "kemitraanPembelajaran": "Kolaborasi dengan guru mapel serumpun, orang tua, praktisi, atau komunitas sekolah.",
    "lingkunganPembelajaran": "Pengaturan ruang fisik (kelas/lab/lingkungan sekolah), ruang virtual, serta budaya belajar yang aman, inklusif, dan saling menghargai.",
    "pemanfaatanDigital": "Pemanfaatan media digital interaktif, simulasi, LKPD digital, atau platform asesmen daring yang mendukung pembelajaran."
  },
  "saranaPrasarana": ["Laptop/Chromebook", "Koneksi Internet", "Proyektor LCD", "Slide Presentasi & Simulasi Interaktif", "Mushaf Al-Qur'an / Aplikasi Qur'an Digital", "LKPD Pembelajaran Mendalam"],
  "targetPesertaDidik": "Reguler",
  "modelPembelajaran": "Problem Based Learning (Pembelajaran Mendalam)",
  "tujuanPembelajaran": [
    "Menjelaskan konsep esensial ${topikLabel} serta mengaitkannya dengan nilai ayat Al-Qur'an secara mendalam.",
    "Menganalisis dan mengaplikasikan konsep ${topikLabel} untuk memecahkan permasalahan nyata secara kolaboratif.",
    "Merefleksikan makna pembelajaran ${topikLabel} dan menumbuhkan karakter unggul sesuai Dimensi Profil Lulusan."
  ],
  "pemahamanBermakna": "Penjelasan kontekstual mengapa penguasaan ${topikLabel} sangat bermakna bagi kehidupan peserta didik dan kontribusinya bagi kemaslahatan umat.",
  "pertanyaanPemantik": [
    "Pertanyaan pemantik berbasis fenomena nyata terkait ${topikLabel} yang mendorong rasa ingin tahu?",
    "Bagaimana nilai ayat Al-Qur'an yang kita tadabburi hari ini membimbing sikap kita saat menerapkan ${topikLabel}?"
  ],
  "pengalamanBelajarMendalam": {
    "prinsipPembelajaran": ["Berkesadaran (Mindful)", "Bermakna (Meaningful)", "Menggembirakan (Joyful)"],
    "memahami": "Tahap Memahami (Berkesadaran & Bermakna): Aktivitas mengkonstruksi konsep esensial ${topikLabel} secara mendalam melalui pengamatan kasus nyata, tadabbur ayat Al-Qur'an, dan diskusi konsep.",
    "mengaplikasi": "Tahap Mengaplikasi (Bermakna & Menggembirakan): Aktivitas menerapkan konsep ${topikLabel} pada konteks/proyek nyata secara kolaboratif, eksploratif, dan terdiferensiasi.",
    "merefleksi": "Tahap Merefleksi (Berkesadaran & Bermakna): Aktivitas mengevaluasi proses dan hasil belajar, memaknai hikmah ayat Al-Qur'an, serta merencanakan tindak lanjut pengembangan diri."
  },
  "kegiatanPembelajaran": {
    "pendahuluan": { "deskripsi": "1. Salam, doa bersama, dan pengkondisian suasana kelas yang nyaman serta berkesadaran (Mindful).\\n2. Tadabbur singkat Ayat Al-Qur'an yang relevan dengan materi ${topikLabel}.\\n3. Apersepsi kontekstual, pertanyaan pemantik, dan asesmen awal kesiapan belajar.\\n4. Penyampaian tujuan pembelajaran mendalam dan alur aktivitas hari ini.", "durasi": "15 Menit" },
    "inti": { "deskripsi": "A. TAHAP MEMAHAMI (Berkesadaran & Bermakna)\\n- Peserta didik mengeksplorasi konsep esensial ${topikLabel} melalui studi kasus/simulasi interaktif dan diskusi terpimpin.\\n\\nB. TAHAP MENGAPLIKASI (Bermakna & Menggembirakan)\\n- Peserta didik bekerja dalam kelompok inklusif untuk merancang solusi/proyek nyata berbasis ${topikLabel} dengan diferensiasi proses dan produk.\\n- Kelompok mempresentasikan karya dan menerima umpan balik konstruktif.\\n\\nC. TAHAP MEREFLEKSI (Berkesadaran)\\n- Peserta didik menguji kembali pemahaman, mengaitkan temuan dengan tadabbur ayat Al-Qur'an, dan menyimpulkan nilai guna materi.", "durasi": "50 Menit" },
    "penutup": { "deskripsi": "1. Guru bersama peserta didik merangkum konsep inti dan hikmah ayat Al-Qur'an.\\n2. Refleksi diri peserta didik terkait pengalaman belajar (Mindful, Meaningful, Joyful).\\n3. Tindak lanjut (pengayaan/remedial) dan informasi materi pertemuan berikutnya.\\n4. Doa penutup majelis dan salam.", "durasi": "15 Menit" }
  },
  "asesmen": {
    "diagnostik": "Asesmen pada Awal Pembelajaran: Tanya jawab pemantik, kuis singkat prasyarat, dan pemetaan kesiapan serta gaya belajar peserta didik.",
    "formatif": "Asesmen pada Proses Pembelajaran: Observasi penalaran kritis, kolaborasi kelompok, umpan balik sejawat, dan pemeriksaan LKPD selama tahap Memahami & Mengaplikasi.",
    "sumatif": "Asesmen pada Akhir Pembelajaran: Evaluasi proyek/unjuk karya nyata dan soal studi kasus HOTS mengenai ${topikLabel}.",
    "teknik": "Observasi Kinerja, Penilaian Proyek/Produk, dan Tes Uraian Kontekstual",
    "instrumen": "LKPD Pembelajaran Mendalam, Lembar Observasi Dimensi Profil Lulusan, dan Rubrik Analitik",
    "rubrik": "Mahir (Skor 4): Menguasai konsep ${topikLabel} secara mendalam, mampu mengaplikasikan pada kasus baru, dan mengaitkannya dengan nilai Al-Qur'an.\\nCakap (Skor 3): Memahami konsep inti dengan tepat dan mampu menerapkannya dalam diskusi/proyek.\\nLayak (Skor 2): Memahami sebagian konsep dasar namun masih memerlukan bimbingan saat aplikasi.\\nBaru Berkembang (Skor 1): Membutuhkan pendampingan intensif untuk memahami konsep dasar.",
    "kriteriaPenilaian": "Peserta didik dinyatakan tuntas mencapai tujuan pembelajaran mendalam jika minimal mencapai predikat Cakap (Skor 3) pada aspek Memahami, Mengaplikasi, dan Merefleksi."
  },
  "diferensiasi": {
    "konten": "Menyediakan variasi sumber belajar (teks terstruktur, infografis visual, simulasi digital, serta panduan audio) sesuai kesiapan dan profil belajar.",
    "proses": "Pendampingan scaffolding bagi peserta didik yang membutuhkan dukungan tambahan (inklusi) serta tantangan eksplorasi terbuka bagi peserta didik dengan kesiapan tinggi.",
    "produk": "Peserta didik memilih bentuk karya akhir yang sesuai minat (laporan analisis, poster infografis, simulasi digital, atau presentasi lisan)."
  },
  "remedial": "Pendampingan personal atau kelompok kecil menggunakan media visual konkret dan penyederhanaan tahapan latihan hingga peserta didik menguasai konsep inti ${topikLabel}.",
  "pengayaan": "Tantangan proyek eksploratif lanjutan berupa studi kasus lintas disiplin atau peran sebagai tutor sebaya dalam diskusi kelas.",
  "refleksiGuru": "1. Sejauh mana prinsip Berkesadaran, Bermakna, dan Menggembirakan terwujud sepanjang sesi?\\n2. Apakah integrasi tadabbur Ayat Al-Qur'an membantu siswa memaknai materi ${topikLabel} lebih dalam?\\n3. Bagian mana yang perlu disesuaikan agar peserta didik inklusi lebih optimal berpartisipasi?",
  "refleksiPesertaDidik": "1. Pemahaman baru apa yang paling bermakna dari materi ${topikLabel} hari ini?\\n2. Hikmah apa yang kamu petik dari Ayat Al-Qur'an yang dibahas bersama?\\n3. Bagaimana kamu akan menerapkan ilmu ini dalam kehidupan sehari-hari?",
  "lampiran": {
    "lkpd": "Lembar Kerja Pembelajaran Mendalam (Tahap Memahami, Mengaplikasi, dan Merefleksi) beserta kolom tadabbur nilai Al-Qur'an untuk materi ${topikLabel}.",
    "bahanBacaan": "Ringkasan konsep esensial ${topikLabel}, glosarium istilah kunci, dan catatan tadabbur Ayat Al-Qur'an relevan.",
    "rubrik": "Rubrik Penilaian Analitik (Baru Berkembang, Layak, Cakap, Mahir) untuk asesmen proses, produk, dan dimensi profil lulusan.",
    "instrumenAsesmen": "3 soal penalaran HOTS kontekstual dan 1 tugas proyek kolaboratif tentang ${topikLabel}.",
    "daftarPustaka": "Buku Panduan Guru & Siswa ${mataPelajaran} Kemendikdasmen, Panduan Pembelajaran Mendalam (Deep Learning) Kemendikdasmen 2025, serta Al-Qur'an dan Terjemahannya Kemenag RI."
  }
}

Pastikan seluruh isi Modul Ajar Pembelajaran Mendalam benar-benar spesifik, mendalam, aplikatif untuk materi "${topikLabel}", dan menggunakan Bahasa Indonesia yang profesional. Jangan tambahkan komentar teks apapun di luar JSON tersebut agar JSON dapat diparse langsung.`;

      const response = await generateContentWithFallback({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsedData = JSON.parse(response.text || '{}');
      // Pastikan integrasi Ayat Al-Qur'an & field Pembelajaran Mendalam selalu terisi valid
      if (!parsedData.ayatAlQuran || !parsedData.ayatAlQuran.surahAyat || !parsedData.ayatAlQuran.teksArab) {
        parsedData.ayatAlQuran = {
          surahAyat: parsedData.ayatAlQuran?.surahAyat || suggestedAyat.surahAyat,
          teksArab: parsedData.ayatAlQuran?.teksArab || suggestedAyat.teksArab,
          terjemahan: parsedData.ayatAlQuran?.terjemahan || suggestedAyat.terjemahan,
          kaitanMateri: parsedData.ayatAlQuran?.kaitanMateri || suggestedAyat.kaitanMateri,
        };
      }
      if (!Array.isArray(parsedData.dimensiProfilLulusan) || parsedData.dimensiProfilLulusan.length === 0) {
        parsedData.dimensiProfilLulusan = parsedData.profilPelajarPancasila?.length
          ? parsedData.profilPelajarPancasila
          : ['Keimanan dan Ketakwaan terhadap Tuhan YME', 'Penalaran Kritis', 'Kreativitas', 'Kolaborasi', 'Komunikasi'];
      }
      if (!parsedData.pengalamanBelajarMendalam) {
        parsedData.pengalamanBelajarMendalam = {
          prinsipPembelajaran: [...PRINSIP_PEMBELAJARAN_MENDALAM],
          memahami: `Peserta didik mengeksplorasi konsep inti ${topikLabel} dan mentadabburi ${parsedData.ayatAlQuran.surahAyat} secara berkesadaran dan bermakna.`,
          mengaplikasi: `Peserta didik menerapkan konsep ${topikLabel} untuk memecahkan studi kasus/proyek nyata secara kolaboratif dan menggembirakan.`,
          merefleksi: `Peserta didik merefleksikan pemahaman, sikap, dan kebermanfaatan ${topikLabel} dalam kehidupan sehari-hari.`,
        };
      }
      return res.json({ success: true, isJson: true, data: parsedData });
    }

    if (tipe === 'cp') {
      const baseCp = buildOfficialCpData({
        mataPelajaran,
        kelas,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      const prompt = `Anda adalah pakar Kurikulum Nasional & BSKAP Kemendikdasmen RI sekaligus pendidik di SMP Islam Modern Al Fakhir.
Buatkan dokumen **CAPAIAN PEMBELAJARAN (CP)** resmi standar BSKAP Kemendikdasmen (Pendekatan Pembelajaran Mendalam) dalam format JSON valid yang rapi dan kontekstual.

Mata Pelajaran: "${mataPelajaran}"
Kelas / Fase: "${kelas}" (${baseCp.identitas.fase})
Fokus Materi / Topik: "${topik || 'Seluruh Elemen Fase D'}"
Tahun Ajaran: "${tahunAjaran || '2026/2027'}"

PENTING:
- Ini adalah dokumen CAPAIAN PEMBELAJARAN (CP), BUKAN Modul Ajar/RPP. Jangan sertakan identitas modul atau langkah pendahuluan/inti/penutup!
- Gunakan struktur resmi BSKAP Kemendikdasmen: Rasional, Tujuan Mata Pelajaran, Karakteristik, Capaian Pembelajaran Umum Akhir Fase, Capaian Pembelajaran Per Elemen (minimal 3–4 elemen resmi mata pelajaran ${mataPelajaran}, dengan penekanan khusus pada topik "${topik || mataPelajaran}"), 8 Dimensi Profil Lulusan, serta Integrasi Nilai Islami (Ayat Al-Qur'an relevan).
- Kembalikan RAW JSON valid tanpa markdown fence sesuai skema berikut:
{
  "formatType": "cp_resmi",
  "identitas": {
    "mataPelajaran": "${mataPelajaran}",
    "satuanPendidikan": "SMP Islam Modern Al Fakhir",
    "fase": "${baseCp.identitas.fase}",
    "kelas": "${kelas}",
    "tahunAjaran": "${tahunAjaran || '2026/2027'}",
    "semester": "Ganjil",
    "namaPenyusun": "Guru Mata Pelajaran",
    "topikFokus": "${topik || `Seluruh Elemen ${mataPelajaran}`}",
    "referensiRegulasi": "Standar Capaian Pembelajaran (CP) BSKAP Kemendikdasmen — Pembelajaran Mendalam"
  },
  "rasional": "Uraian mendalam rasional mata pelajaran dan urgensi topik ${topik || mataPelajaran}.",
  "tujuanMataPelajaran": ["Tujuan 1", "Tujuan 2", "Tujuan 3", "Tujuan 4"],
  "karakteristik": "Karakteristik khas mata pelajaran ${mataPelajaran} beserta penjelasan ruang lingkup elemennya.",
  "capaianUmumFase": "Pada akhir ${baseCp.identitas.fase}, peserta didik mampu ...",
  "elemenList": [
    {
      "elemen": "Nama Elemen Resmi BSKAP",
      "deskripsiCp": "Rumusan Capaian Pembelajaran resmi dan mendalam untuk elemen ini (kaitkan dengan ${topik || mataPelajaran}).",
      "kompetensiInti": "Ringkasan kompetensi kunci",
      "lingkupMateri": "Lingkup materi utama terkait"
    }
  ],
  "dimensiProfilLulusan": ["Keimanan dan Ketakwaan terhadap Tuhan YME", "Penalaran Kritis", "Kreativitas", "Kolaborasi", "Komunikasi"],
  "integrasiNilaiIslami": {
    "surahAyat": "${baseCp.integrasiNilaiIslami.surahAyat}",
    "teksArab": "${baseCp.integrasiNilaiIslami.teksArab}",
    "terjemahan": "${baseCp.integrasiNilaiIslami.terjemahan}",
    "relevansiCp": "Keterkaitan ayat Al-Qur'an dengan pencapaian kompetensi pada mata pelajaran ${mataPelajaran} topik ${topik || mataPelajaran}."
  }
}`;

      const response = await generateContentWithFallback({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const parsedCp = JSON.parse(response.text || '{}');
      const finalCp = {
        formatType: 'cp_resmi' as const,
        identitas: {
          ...baseCp.identitas,
          ...(parsedCp.identitas || {}),
          mataPelajaran: mataPelajaran || baseCp.identitas.mataPelajaran,
          kelas: kelas || baseCp.identitas.kelas,
          topikFokus: topik || parsedCp.identitas?.topikFokus || baseCp.identitas.topikFokus,
        },
        rasional: parsedCp.rasional || baseCp.rasional,
        tujuanMataPelajaran: Array.isArray(parsedCp.tujuanMataPelajaran) && parsedCp.tujuanMataPelajaran.length > 0
          ? parsedCp.tujuanMataPelajaran
          : baseCp.tujuanMataPelajaran,
        karakteristik: parsedCp.karakteristik || baseCp.karakteristik,
        capaianUmumFase: parsedCp.capaianUmumFase || baseCp.capaianUmumFase,
        elemenList: Array.isArray(parsedCp.elemenList) && parsedCp.elemenList.length > 0
          ? parsedCp.elemenList
          : baseCp.elemenList,
        dimensiProfilLulusan: Array.isArray(parsedCp.dimensiProfilLulusan) && parsedCp.dimensiProfilLulusan.length > 0
          ? parsedCp.dimensiProfilLulusan
          : baseCp.dimensiProfilLulusan,
        integrasiNilaiIslami: {
          surahAyat: parsedCp.integrasiNilaiIslami?.surahAyat || baseCp.integrasiNilaiIslami.surahAyat,
          teksArab: parsedCp.integrasiNilaiIslami?.teksArab || baseCp.integrasiNilaiIslami.teksArab,
          terjemahan: parsedCp.integrasiNilaiIslami?.terjemahan || baseCp.integrasiNilaiIslami.terjemahan,
          relevansiCp: parsedCp.integrasiNilaiIslami?.relevansiCp || baseCp.integrasiNilaiIslami.relevansiCp,
        },
      };

      return res.json({
        success: true,
        isJson: true,
        formatType: 'cp_resmi',
        data: finalCp,
        content: formatCpToPlainText(finalCp),
      });
    }

    if (tipe === 'atp') {
      const baseAtp = buildOfficialAtpData({
        mataPelajaran,
        kelas,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      const prompt = `Anda adalah pakar Kurikulum Nasional & BSKAP Kemendikdasmen RI sekaligus pendidik di SMP Islam Modern Al Fakhir.
Buatkan dokumen resmi **ALUR TUJUAN PEMBELAJARAN (ATP)** yang terstruktur, logis, berjenjang dari konkret ke abstrak, dan siap cetak dalam format JSON valid.

Mata Pelajaran: "${mataPelajaran}"
Kelas / Fase: "${kelas}" (${baseAtp.identitas.fase})
Fokus Topik / Materi Utama: "${topik || baseAtp.identitas.fokusTopik}"
Beban Belajar Standar: ${baseAtp.identitas.jpPerMinggu} JP / Minggu
Tahun Ajaran: "${tahunAjaran || '2026/2027'}"

PENTING:
- Ini adalah dokumen resmi ALUR TUJUAN PEMBELAJARAN (ATP), BUKAN Modul Ajar.
- Susun minimal 3–4 Tujuan Pembelajaran (TP) untuk Semester "Ganjil" dan 3–4 TP untuk Semester "Genap" yang selaras dengan Elemen CP Fase D dan fokus topik "${topik || baseAtp.identitas.fokusTopik}".
- Setiap TP wajib memiliki kodeTp unik (contoh: INF-7.1), rumusan kompetensi + lingkup materi operasional, materiEsensial, alokasiJp realistis, dimensiProfil (dari 8 Dimensi Profil Lulusan), kataKunci, dan strategiAsesmen.
- Sertakan 4–6 istilah kunci pada "glosarium" dan integrasi ayat Al-Qur'an yang relevan dengan materi.
- Kembalikan RAW JSON valid tanpa markdown fence sesuai skema berikut:
{
  "formatType": "atp_resmi",
  "identitas": {
    "mataPelajaran": "${mataPelajaran}",
    "satuanPendidikan": "SMP Islam Modern Al Fakhir",
    "fase": "${baseAtp.identitas.fase}",
    "kelas": "${kelas}",
    "tahunAjaran": "${tahunAjaran || '2026/2027'}",
    "namaPenyusun": "Guru Mata Pelajaran",
    "jpPerMinggu": ${baseAtp.identitas.jpPerMinggu},
    "fokusTopik": "${topik || baseAtp.identitas.fokusTopik}",
    "referensiRegulasi": "Panduan Pembelajaran & Asesmen Kurikulum Nasional Kemendikdasmen • Pembelajaran Mendalam"
  },
  "rasionalAlur": "Penjelasan logika pengurutan ATP dari konsep fondasi menuju aplikasi mendalam.",
  "capaianPembelajaranUmum": "Ringkasan Capaian Pembelajaran (CP) umum Fase D untuk mata pelajaran ini.",
  "daftarAlur": [
    {
      "kodeTp": "TP-1",
      "semester": "Ganjil",
      "elemen": "Nama Elemen CP",
      "tujuanPembelajaran": "Peserta didik mampu ...",
      "materiEsensial": "Lingkup materi pokok dan sub-topik",
      "alokasiJp": 12,
      "dimensiProfil": "Penalaran Kritis, Kreativitas, Kolaborasi",
      "kataKunci": "Kata kunci 1, Kata kunci 2",
      "strategiAsesmen": "Strategi pembelajaran mendalam dan asesmen formatif/sumatif"
    }
  ],
  "glosarium": [
    { "istilah": "Istilah Kunci", "definisi": "Definisi singkat dan jelas." }
  ],
  "catatanImplementasi": "Catatan diferensiasi, fleksibilitas pengurutan, dan keterkaitan dengan Modul Ajar/KKTP.",
  "integrasiNilaiIslami": {
    "surahAyat": "${baseAtp.integrasiNilaiIslami.surahAyat}",
    "teksArab": "${baseAtp.integrasiNilaiIslami.teksArab}",
    "terjemahan": "${baseAtp.integrasiNilaiIslami.terjemahan}",
    "relevansiAtp": "Relevansi ayat Al-Qur'an terhadap alur tujuan pembelajaran."
  }
}`;

      const response = await generateContentWithFallback({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsedAtp = JSON.parse(response.text || '{}');
      const normalizedAlur =
        Array.isArray(parsedAtp.daftarAlur) && parsedAtp.daftarAlur.length >= 3
          ? parsedAtp.daftarAlur.map((row: any, idx: number) => ({
              kodeTp: String(row.kodeTp || `TP-${idx + 1}`),
              semester:
                row.semester === 'Genap' ||
                String(row.semester).toLowerCase().includes('genap') ||
                String(row.semester) === '2' ||
                String(row.semester) === 'II'
                  ? ('Genap' as const)
                  : ('Ganjil' as const),
              elemen: String(row.elemen || `Elemen ${idx + 1}`),
              tujuanPembelajaran: String(row.tujuanPembelajaran || '-'),
              materiEsensial: String(row.materiEsensial || '-'),
              alokasiJp: Math.max(2, Number(row.alokasiJp) || baseAtp.identitas.jpPerMinggu * 3),
              dimensiProfil: String(row.dimensiProfil || 'Penalaran Kritis, Kreativitas'),
              kataKunci: String(row.kataKunci || '-'),
              strategiAsesmen: String(row.strategiAsesmen || 'Asesmen formatif, LKPD, dan rubrik proyek.'),
            }))
          : baseAtp.daftarAlur;

      const normalizedGlosarium =
        Array.isArray(parsedAtp.glosarium) && parsedAtp.glosarium.length > 0
          ? parsedAtp.glosarium
              .map((g: any) => ({
                istilah: String(g.istilah || '').trim(),
                definisi: String(g.definisi || '').trim(),
              }))
              .filter((g: any) => g.istilah || g.definisi)
          : baseAtp.glosarium;

      const finalAtp = {
        formatType: 'atp_resmi' as const,
        identitas: {
          ...baseAtp.identitas,
          ...(parsedAtp.identitas || {}),
          mataPelajaran: mataPelajaran || baseAtp.identitas.mataPelajaran,
          kelas: kelas || baseAtp.identitas.kelas,
          jpPerMinggu: Number(parsedAtp.identitas?.jpPerMinggu) || baseAtp.identitas.jpPerMinggu,
          fokusTopik: topik || parsedAtp.identitas?.fokusTopik || baseAtp.identitas.fokusTopik,
        },
        rasionalAlur: parsedAtp.rasionalAlur || baseAtp.rasionalAlur,
        capaianPembelajaranUmum:
          parsedAtp.capaianPembelajaranUmum || baseAtp.capaianPembelajaranUmum,
        daftarAlur: normalizedAlur,
        glosarium: normalizedGlosarium,
        catatanImplementasi: parsedAtp.catatanImplementasi || baseAtp.catatanImplementasi,
        integrasiNilaiIslami: {
          surahAyat:
            parsedAtp.integrasiNilaiIslami?.surahAyat || baseAtp.integrasiNilaiIslami.surahAyat,
          teksArab:
            parsedAtp.integrasiNilaiIslami?.teksArab || baseAtp.integrasiNilaiIslami.teksArab,
          terjemahan:
            parsedAtp.integrasiNilaiIslami?.terjemahan || baseAtp.integrasiNilaiIslami.terjemahan,
          relevansiAtp:
            parsedAtp.integrasiNilaiIslami?.relevansiAtp ||
            baseAtp.integrasiNilaiIslami.relevansiAtp,
        },
      };

      return res.json({
        success: true,
        isJson: true,
        formatType: 'atp_resmi',
        data: finalAtp,
        content: formatAtpToPlainText(finalAtp),
      });
    }

    if (tipe === 'kktp') {
      const baseKktp = buildOfficialKktpData({
        mataPelajaran,
        kelas,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      const prompt = `Anda adalah pakar Asesmen Kurikulum Nasional & Panduan Pembelajaran dan Asesmen (PPA) BSKAP Kemendikdasmen RI sekaligus pendidik di SMP Islam Modern Al Fakhir.
Buatkan dokumen resmi **KKTP (KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN)** dalam format JSON valid yang terstruktur, spesifik, dan siap digunakan oleh guru.

Mata Pelajaran: "${mataPelajaran}"
Kelas / Fase: "${kelas}" (${baseKktp.identitas.fase})
Topik / Materi Pokok: "${topik || baseKktp.identitas.topikMateri}"
Tahun Ajaran: "${tahunAjaran || '2026/2027'}"

PENTING:
- Ini adalah dokumen resmi KKTP (Kriteria Ketercapaian Tujuan Pembelajaran), BUKAN Modul Ajar.
- Susun lengkap mengikuti 3 pendekatan resmi PPA Kemendikdasmen:
  1. Tujuan Pembelajaran (TP) spesifik yang diukur (3–4 TP operasional).
  2. Rubrik Penilaian 4 Level Penguasaan (Baru Berkembang, Layak, Cakap, Mahir) dengan 4 aspek penilaian yang konkret dan terukur sesuai materi "${topik || baseKktp.identitas.topikMateri}".
  3. Skala Interval Nilai (0–40%, 41–65%, 66–85%, 86–100%) lengkap dengan predikat, status ketuntasan ("Belum Tuntas" atau "Tuntas"), dan rencana tindak lanjut intervensi yang spesifik.
  4. Deskripsi Kriteria (Memadai / Tidak Memadai), Keputusan Ketuntasan, Strategi Remedial & Pengayaan, serta Integrasi Nilai Islami (Ayat Al-Qur'an relevan).
- Kembalikan RAW JSON valid tanpa markdown fence sesuai skema berikut:
{
  "formatType": "kktp_resmi",
  "identitas": {
    "mataPelajaran": "${mataPelajaran}",
    "satuanPendidikan": "SMP Islam Modern Al Fakhir",
    "fase": "${baseKktp.identitas.fase}",
    "kelas": "${kelas}",
    "tahunAjaran": "${tahunAjaran || '2026/2027'}",
    "semester": "Ganjil",
    "namaPenyusun": "Guru Mata Pelajaran",
    "topikMateri": "${topik || baseKktp.identitas.topikMateri}",
    "pendekatanUtama": "Kombinasi Rubrik 4 Level, Interval Nilai, & Deskripsi Kriteria",
    "batasMinimalPersen": 66,
    "referensiRegulasi": "Panduan Pembelajaran dan Asesmen (PPA) BSKAP Kemendikdasmen — Pembelajaran Mendalam"
  },
  "capaianPembelajaranRingkas": "Rumusan CP ringkas yang menjadi acuan KKTP ini.",
  "tujuanPembelajaran": ["TP 1: ...", "TP 2: ...", "TP 3: ...", "TP 4: ..."],
  "rubrikPenilaian": [
    {
      "aspek": "Nama Aspek / Indikator Penilaian",
      "baruBerkembang": "Deskripsi level Baru Berkembang (Skor 1)",
      "layak": "Deskripsi level Layak (Skor 2)",
      "cakap": "Deskripsi level Cakap / Tuntas (Skor 3)",
      "mahir": "Deskripsi level Mahir / Melampaui (Skor 4)"
    }
  ],
  "intervalNilai": [
    {
      "rentang": "0 – 40%",
      "predikat": "Baru Berkembang (Perlu Bimbingan)",
      "ketuntasan": "Belum Tuntas",
      "tindakLanjut": "Remedial di seluruh bagian..."
    }
  ],
  "deskripsiKriteria": [
    {
      "kriteria": "Nama Aspek",
      "targetMemadai": "Bukti ketercapaian kategori Memadai"
    }
  ],
  "keputusanKetuntasan": "Ketentuan pengambilan keputusan ketercapaian tujuan pembelajaran.",
  "strategiRemedial": "Rencana program remedial spesifik untuk materi ${topik || baseKktp.identitas.topikMateri}.",
  "strategiPengayaan": "Rencana program pengayaan HOTS untuk materi ${topik || baseKktp.identitas.topikMateri}.",
  "integrasiNilaiIslami": {
    "surahAyat": "${baseKktp.integrasiNilaiIslami.surahAyat}",
    "teksArab": "${baseKktp.integrasiNilaiIslami.teksArab}",
    "terjemahan": "${baseKktp.integrasiNilaiIslami.terjemahan}",
    "relevansiKktp": "Relevansi ayat dengan ketuntasan kompetensi dan akhlak belajar."
  }
}`;

      const response = await generateContentWithFallback({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsedKktp = JSON.parse(response.text || '{}');
      const rubrikFinal =
        Array.isArray(parsedKktp.rubrikPenilaian) && parsedKktp.rubrikPenilaian.length > 0
          ? parsedKktp.rubrikPenilaian
          : baseKktp.rubrikPenilaian;

      const finalKktp = {
        formatType: 'kktp_resmi' as const,
        identitas: {
          ...baseKktp.identitas,
          ...(parsedKktp.identitas || {}),
          mataPelajaran: mataPelajaran || baseKktp.identitas.mataPelajaran,
          kelas: kelas || baseKktp.identitas.kelas,
          topikMateri: topik || parsedKktp.identitas?.topikMateri || baseKktp.identitas.topikMateri,
          batasMinimalPersen: Number(parsedKktp.identitas?.batasMinimalPersen) || 66,
        },
        capaianPembelajaranRingkas:
          parsedKktp.capaianPembelajaranRingkas || baseKktp.capaianPembelajaranRingkas,
        tujuanPembelajaran:
          Array.isArray(parsedKktp.tujuanPembelajaran) && parsedKktp.tujuanPembelajaran.length > 0
            ? parsedKktp.tujuanPembelajaran
            : baseKktp.tujuanPembelajaran,
        rubrikPenilaian: rubrikFinal,
        intervalNilai:
          Array.isArray(parsedKktp.intervalNilai) && parsedKktp.intervalNilai.length > 0
            ? parsedKktp.intervalNilai
            : baseKktp.intervalNilai,
        deskripsiKriteria:
          Array.isArray(parsedKktp.deskripsiKriteria) && parsedKktp.deskripsiKriteria.length > 0
            ? parsedKktp.deskripsiKriteria
            : rubrikFinal.map((r: any) => ({ kriteria: r.aspek, targetMemadai: r.cakap })),
        keputusanKetuntasan: parsedKktp.keputusanKetuntasan || baseKktp.keputusanKetuntasan,
        strategiRemedial: parsedKktp.strategiRemedial || baseKktp.strategiRemedial,
        strategiPengayaan: parsedKktp.strategiPengayaan || baseKktp.strategiPengayaan,
        integrasiNilaiIslami: {
          surahAyat: parsedKktp.integrasiNilaiIslami?.surahAyat || baseKktp.integrasiNilaiIslami.surahAyat,
          teksArab: parsedKktp.integrasiNilaiIslami?.teksArab || baseKktp.integrasiNilaiIslami.teksArab,
          terjemahan: parsedKktp.integrasiNilaiIslami?.terjemahan || baseKktp.integrasiNilaiIslami.terjemahan,
          relevansiKktp:
            parsedKktp.integrasiNilaiIslami?.relevansiKktp || baseKktp.integrasiNilaiIslami.relevansiKktp,
        },
      };

      return res.json({
        success: true,
        isJson: true,
        formatType: 'kktp_resmi',
        data: finalKktp,
        content: formatKktpToPlainText(finalKktp),
      });
    }

    if (tipe === 'prota') {
      const baseProta = buildOfficialProtaData({
        mataPelajaran,
        kelas,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      const prompt = `Anda adalah pakar Kurikulum Nasional & BSKAP Kemendikdasmen RI sekaligus pendidik di SMP Islam Modern Al Fakhir.
Buatkan dokumen resmi **PROGRAM TAHUNAN (PROTA)** 1 Tahun Pelajaran (Semester I Ganjil & Semester II Genap) dalam format JSON valid yang terstruktur, realistis sesuai kalender pendidikan 36 minggu efektif (18 minggu Ganjil + 18 minggu Genap), dan siap cetak.

Mata Pelajaran: "${mataPelajaran}"
Kelas / Fase: "${kelas}" (${baseProta.identitas.fase})
Fokus / Tema Tahunan: "${topik || baseProta.identitas.fokusTahunan}"
Beban Belajar Standar: ${baseProta.identitas.jpPerMinggu} JP / Minggu (Target Semester Ganjil: ${baseProta.identitas.jpPerMinggu * baseProta.identitas.mingguEfektifGanjil} JP, Semester Genap: ${baseProta.identitas.jpPerMinggu * baseProta.identitas.mingguEfektifGenap} JP)
Tahun Ajaran: "${tahunAjaran || '2026/2027'}"

PENTING:
- Ini adalah dokumen resmi PROGRAM TAHUNAN (PROTA), BUKAN Modul Ajar.
- Susun minimal 4–6 baris unit untuk Semester "Ganjil" (Juli–Desember) dan minimal 4–6 baris unit untuk Semester "Genap" (Januari–Juni), termasuk ASTS dan SAS/SAT.
- Pastikan jumlah alokasiJp seluruh baris Semester Ganjil mendekati/sama dengan ${baseProta.identitas.jpPerMinggu * baseProta.identitas.mingguEfektifGanjil} JP dan Semester Genap mendekati/sama dengan ${baseProta.identitas.jpPerMinggu * baseProta.identitas.mingguEfektifGenap} JP.
- Kembalikan RAW JSON valid tanpa markdown fence sesuai skema berikut:
{
  "formatType": "prota_resmi",
  "identitas": {
    "mataPelajaran": "${mataPelajaran}",
    "satuanPendidikan": "SMP Islam Modern Al Fakhir",
    "fase": "${baseProta.identitas.fase}",
    "kelas": "${kelas}",
    "tahunAjaran": "${tahunAjaran || '2026/2027'}",
    "namaPenyusun": "Guru Mata Pelajaran",
    "jpPerMinggu": ${baseProta.identitas.jpPerMinggu},
    "mingguEfektifGanjil": ${baseProta.identitas.mingguEfektifGanjil},
    "mingguEfektifGenap": ${baseProta.identitas.mingguEfektifGenap},
    "fokusTahunan": "${topik || baseProta.identitas.fokusTahunan}",
    "referensiRegulasi": "Struktur Kurikulum Nasional Kemendikdasmen • 36 Minggu Efektif Pertahun Ajaran"
  },
  "capaianUmumTahunan": "Ringkasan capaian kompetensi peserta didik selama 1 tahun pelajaran.",
  "distribusiSemester": [
    {
      "semester": "Ganjil",
      "elemen": "Nama Elemen / Bab",
      "tujuanPembelajaran": "Uraian Alur Tujuan Pembelajaran / lingkup materi pokok",
      "alokasiJp": 12,
      "bulanPelaksanaan": "Juli – Agustus",
      "keterangan": "Intrakurikuler • Modul Mendalam"
    }
  ],
  "catatanPelaksanaan": "Catatan kalender pendidikan dan fleksibilitas pelaksanaan Prota.",
  "integrasiNilaiIslami": {
    "surahAyat": "${baseProta.integrasiNilaiIslami.surahAyat}",
    "teksArab": "${baseProta.integrasiNilaiIslami.teksArab}",
    "terjemahan": "${baseProta.integrasiNilaiIslami.terjemahan}",
    "relevansiProta": "Relevansi ayat Al-Qur'an terhadap perencanaan pembelajaran selama 1 tahun."
  }
}`;

      const response = await generateContentWithFallback({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsedProta = JSON.parse(response.text || '{}');
      const normalizedRows =
        Array.isArray(parsedProta.distribusiSemester) && parsedProta.distribusiSemester.length >= 4
          ? parsedProta.distribusiSemester.map((row: any) => ({
              semester: (row.semester === 'Genap' || String(row.semester).toLowerCase().includes('genap') || String(row.semester) === '2' || String(row.semester) === 'II') ? 'Genap' as const : 'Ganjil' as const,
              elemen: String(row.elemen || 'Unit Pembelajaran'),
              tujuanPembelajaran: String(row.tujuanPembelajaran || '-'),
              alokasiJp: Math.max(2, Number(row.alokasiJp) || baseProta.identitas.jpPerMinggu * 2),
              bulanPelaksanaan: String(row.bulanPelaksanaan || '-'),
              keterangan: String(row.keterangan || 'Intrakurikuler'),
            }))
          : baseProta.distribusiSemester;

      const finalProta = {
        formatType: 'prota_resmi' as const,
        identitas: {
          ...baseProta.identitas,
          ...(parsedProta.identitas || {}),
          mataPelajaran: mataPelajaran || baseProta.identitas.mataPelajaran,
          kelas: kelas || baseProta.identitas.kelas,
          jpPerMinggu: Number(parsedProta.identitas?.jpPerMinggu) || baseProta.identitas.jpPerMinggu,
          mingguEfektifGanjil: Number(parsedProta.identitas?.mingguEfektifGanjil) || baseProta.identitas.mingguEfektifGanjil,
          mingguEfektifGenap: Number(parsedProta.identitas?.mingguEfektifGenap) || baseProta.identitas.mingguEfektifGenap,
          fokusTahunan: topik || parsedProta.identitas?.fokusTahunan || baseProta.identitas.fokusTahunan,
        },
        capaianUmumTahunan: parsedProta.capaianUmumTahunan || baseProta.capaianUmumTahunan,
        distribusiSemester: normalizedRows,
        catatanPelaksanaan: parsedProta.catatanPelaksanaan || baseProta.catatanPelaksanaan,
        integrasiNilaiIslami: {
          surahAyat: parsedProta.integrasiNilaiIslami?.surahAyat || baseProta.integrasiNilaiIslami.surahAyat,
          teksArab: parsedProta.integrasiNilaiIslami?.teksArab || baseProta.integrasiNilaiIslami.teksArab,
          terjemahan: parsedProta.integrasiNilaiIslami?.terjemahan || baseProta.integrasiNilaiIslami.terjemahan,
          relevansiProta: parsedProta.integrasiNilaiIslami?.relevansiProta || baseProta.integrasiNilaiIslami.relevansiProta,
        },
      };

      return res.json({
        success: true,
        isJson: true,
        formatType: 'prota_resmi',
        data: finalProta,
        content: formatProtaToPlainText(finalProta),
      });
    }

    if (tipe === 'prosem') {
      const baseProsem = buildOfficialProsemData({
        mataPelajaran,
        kelas,
        semester,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      const semMonths =
        baseProsem.identitas.semester === 'Genap'
          ? ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']
          : ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

      const prompt = `Anda adalah pakar Kurikulum Nasional & BSKAP Kemendikdasmen RI sekaligus pendidik di SMP Islam Modern Al Fakhir.
Buatkan dokumen resmi **PROGRAM SEMESTER (PROSEM)** Semester ${baseProsem.identitas.semester} (${semMonths.join(', ')}) dalam format JSON valid yang memuat **Rincian Pekan Efektif (RPE)** dan **Matriks Distribusi Mingguan (Bulan × M1..M4)** yang siap cetak.

Mata Pelajaran: "${mataPelajaran}"
Kelas / Fase: "${kelas}" (${baseProsem.identitas.fase})
Semester: "${baseProsem.identitas.semester}" (${semMonths[0]} s.d. ${semMonths[semMonths.length - 1]})
Beban Belajar Standar: ${baseProsem.identitas.jpPerMinggu} JP / Minggu
Fokus Semester: "${topik || baseProsem.identitas.fokusSemester}"
Tahun Ajaran: "${tahunAjaran || '2026/2027'}"

PENTING:
- Ini adalah dokumen resmi PROGRAM SEMESTER (PROSEM), BUKAN Modul Ajar.
- Format key pada objek "mingguAktif" HARUS menggunakan format "<NamaBulan>_M<1|2|3|4>", contoh: "${semMonths[0]}_M3": ${baseProsem.identitas.jpPerMinggu}, "${semMonths[1]}_M1": ${baseProsem.identitas.jpPerMinggu}.
- Total minggu efektif (jumlah seluruh pekan efektif di rincianPekanEfektif) idealnya 18 pekan (= ${18 * baseProsem.identitas.jpPerMinggu} JP).
- Kembalikan RAW JSON valid tanpa markdown fence sesuai skema berikut:
{
  "formatType": "prosem_resmi",
  "identitas": {
    "mataPelajaran": "${mataPelajaran}",
    "satuanPendidikan": "SMP Islam Modern Al Fakhir",
    "fase": "${baseProsem.identitas.fase}",
    "kelas": "${kelas}",
    "semester": "${baseProsem.identitas.semester}",
    "tahunAjaran": "${tahunAjaran || '2026/2027'}",
    "namaPenyusun": "Guru Mata Pelajaran",
    "jpPerMinggu": ${baseProsem.identitas.jpPerMinggu},
    "fokusSemester": "${topik || baseProsem.identitas.fokusSemester}",
    "referensiRegulasi": "${baseProsem.identitas.referensiRegulasi}"
  },
  "rincianPekanEfektif": ${JSON.stringify(baseProsem.rincianPekanEfektif)},
  "distribusiMingguan": [
    {
      "elemen": "Nama Elemen / Unit",
      "tujuanPembelajaran": "Rumusan ATP / lingkup materi pokok",
      "alokasiJp": ${baseProsem.identitas.jpPerMinggu * 4},
      "mingguAktif": { "${semMonths[0]}_M3": ${baseProsem.identitas.jpPerMinggu}, "${semMonths[0]}_M4": ${baseProsem.identitas.jpPerMinggu}, "${semMonths[1]}_M1": ${baseProsem.identitas.jpPerMinggu}, "${semMonths[1]}_M2": ${baseProsem.identitas.jpPerMinggu} },
      "jenisKegiatan": "Intrakurikuler",
      "keterangan": "Intrakurikuler • Modul Mendalam"
    }
  ],
  "catatanPelaksanaan": "Catatan kalender pendidikan dan fleksibilitas pelaksanaan Prosem.",
  "integrasiNilaiIslami": {
    "surahAyat": "${baseProsem.integrasiNilaiIslami.surahAyat}",
    "teksArab": "${baseProsem.integrasiNilaiIslami.teksArab}",
    "terjemahan": "${baseProsem.integrasiNilaiIslami.terjemahan}",
    "relevansiProsem": "Relevansi ayat Al-Qur'an terhadap pelaksanaan pembelajaran semester ini."
  }
}`;

      const response = await generateContentWithFallback({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
        },
      });

      const parsedProsem = JSON.parse(response.text || '{}');
      const jpMg = Number(parsedProsem.identitas?.jpPerMinggu) || baseProsem.identitas.jpPerMinggu;

      const normalizedDistribusi =
        Array.isArray(parsedProsem.distribusiMingguan) && parsedProsem.distribusiMingguan.length >= 3
          ? parsedProsem.distribusiMingguan.map((row: any, idx: number) => {
              const rawWeeks = row.mingguAktif && typeof row.mingguAktif === 'object' ? row.mingguAktif : {};
              const cleanedWeeks: Record<string, number> = {};
              Object.entries(rawWeeks).forEach(([k, v]) => {
                const num = Number(v);
                if (num > 0) cleanedWeeks[k] = num;
              });
              const fallbackRow = baseProsem.distribusiMingguan[idx % baseProsem.distribusiMingguan.length];
              const finalWeeks =
                Object.keys(cleanedWeeks).length > 0 ? cleanedWeeks : fallbackRow.mingguAktif;
              const sumJp = Object.values(finalWeeks).reduce((s, v) => s + v, 0);
              const rawJenis = String(row.jenisKegiatan || '');
              const jenisKegiatan: 'Intrakurikuler' | 'Asesmen' | 'Proyek' | 'Remedial' =
                rawJenis === 'Asesmen' || rawJenis === 'Proyek' || rawJenis === 'Remedial'
                  ? rawJenis
                  : 'Intrakurikuler';
              return {
                elemen: String(row.elemen || fallbackRow.elemen),
                tujuanPembelajaran: String(row.tujuanPembelajaran || fallbackRow.tujuanPembelajaran),
                alokasiJp: sumJp || Number(row.alokasiJp) || jpMg * 2,
                mingguAktif: finalWeeks,
                jenisKegiatan,
                keterangan: String(row.keterangan || 'Intrakurikuler'),
              };
            })
          : baseProsem.distribusiMingguan;

      const finalProsem = {
        formatType: 'prosem_resmi' as const,
        identitas: {
          ...baseProsem.identitas,
          ...(parsedProsem.identitas || {}),
          mataPelajaran: mataPelajaran || baseProsem.identitas.mataPelajaran,
          kelas: kelas || baseProsem.identitas.kelas,
          semester: baseProsem.identitas.semester,
          jpPerMinggu: jpMg,
          fokusSemester: topik || parsedProsem.identitas?.fokusSemester || baseProsem.identitas.fokusSemester,
        },
        rincianPekanEfektif:
          Array.isArray(parsedProsem.rincianPekanEfektif) && parsedProsem.rincianPekanEfektif.length === 6
            ? parsedProsem.rincianPekanEfektif
            : baseProsem.rincianPekanEfektif,
        distribusiMingguan: normalizedDistribusi,
        catatanPelaksanaan: parsedProsem.catatanPelaksanaan || baseProsem.catatanPelaksanaan,
        integrasiNilaiIslami: {
          surahAyat: parsedProsem.integrasiNilaiIslami?.surahAyat || baseProsem.integrasiNilaiIslami.surahAyat,
          teksArab: parsedProsem.integrasiNilaiIslami?.teksArab || baseProsem.integrasiNilaiIslami.teksArab,
          terjemahan: parsedProsem.integrasiNilaiIslami?.terjemahan || baseProsem.integrasiNilaiIslami.terjemahan,
          relevansiProsem: parsedProsem.integrasiNilaiIslami?.relevansiProsem || baseProsem.integrasiNilaiIslami.relevansiProsem,
        },
      };

      return res.json({
        success: true,
        isJson: true,
        formatType: 'prosem_resmi',
        data: finalProsem,
        content: formatProsemToPlainText(finalProsem),
      });
    }

    let customInstructions = '';
    if (tipe === 'modul_ajar') {
      // Fallback for non-JSON or other logic paths
      customInstructions = `Format WAJIB Mengikuti Standar Template Modul Ajar Pembelajaran Mendalam (Deep Learning) & Inklusif 2026/2027 dengan sisipan Ayat Al-Qur'an sesuai materi.`;
    }
 else {
      customInstructions = `Berikan isi dokumen resmi yang rapi, profesional, terstruktur dengan huruf kapital untuk judul bagian (tanpa simbol markdown # atau **), sesuai standar administrasi Kurikulum Nasional (Identitas, Uraian Inti sesuai jenis dokumen "${tipe}", serta Pengesahan).`;
    }

    const prompt = `Anda adalah konsultan Kurikulum Nasional & Pembelajaran Mendalam Kementerian Pendidikan Indonesia.
Buatkan draf dokumen Administrasi Guru tipe: "${tipe}" untuk Mata Pelajaran "${mataPelajaran}", Kelas "${kelas}", Topik/Capaian "${topik || 'Standard Kurikulum Nasional'}", Tahun Ajaran "${tahunAjaran || '2026/2027'}".

${customInstructions}

Format output lengkap dalam Bahasa Indonesia yang sangat rapi, jelas, dan siap pakai.`;

    const response = await generateContentWithFallback({
      model: 'gemini-4-hydrogen',
      contents: prompt,
    });

    return res.json({ success: true, content: response.text });

  } catch (error: any) {
    console.log('[Administrasi AI Generator] Using Pembelajaran Mendalam smart template generator.');
    
    if (tipe === 'modul_ajar') {
      const topikLabel = topik || 'Materi Pokok';
      const mapelLabel = mataPelajaran || 'Umum';
      const ayat = suggestAyatForMateri(mapelLabel, topikLabel);
      const fallbackData = {
        informasiUmum: {
          namaPenyusun: "Guru Pengampu Mapel",
          namaSekolah: "SMP Islam Modern Al Fakhir",
          mataPelajaran: mapelLabel,
          fase: "D",
          kelas: kelas || "VII",
          semester: "Ganjil",
          tahunAjaran: tahunAjaran || "2026/2027",
          alokasiWaktu: "2 JP (2 x 40 Menit)",
          materi: topikLabel
        },
        ayatAlQuran: ayat,
        kompetensiAwal: `Peserta didik telah memiliki pengetahuan awal terkait dasar-dasar ${mapelLabel} dan kesiapan belajar untuk mendalami materi ${topikLabel} secara kontekstual serta inklusif.`,
        dimensiProfilLulusan: [
          "Keimanan dan Ketakwaan terhadap Tuhan YME",
          "Penalaran Kritis",
          "Kreativitas",
          "Kolaborasi",
          "Komunikasi"
        ],
        profilPelajarPancasila: [
          "Keimanan dan Ketakwaan terhadap Tuhan YME",
          "Penalaran Kritis",
          "Kreativitas",
          "Kolaborasi",
          "Komunikasi"
        ],
        capaianPembelajaran: `Peserta didik mampu memahami konsep esensial, menganalisis permasalahan nyata, serta mengaplikasikan materi ${topikLabel} dalam mata pelajaran ${mapelLabel} secara kritis, kreatif, dan bertanggung jawab.`,
        lintasDisiplinIlmu: `Terintegrasi dengan Pendidikan Agama Islam (tadabbur ${ayat.surahAyat}), Bahasa Indonesia (komunikasi presentasi), serta literasi digital dalam kehidupan sehari-hari.`,
        kerangkaPembelajaran: {
          praktikPedagogis: `Problem-Based Learning & Inquiry terintegrasi Pembelajaran Mendalam (Memahami, Mengaplikasi, Merefleksi) untuk materi ${topikLabel}.`,
          kemitraanPembelajaran: "Kolaborasi antar-peserta didik (tutor sebaya), guru mata pelajaran serumpun, dan dukungan orang tua dalam refleksi di rumah.",
          lingkunganPembelajaran: "Ruang kelas/laboratorium yang kondusif, inklusif, aman untuk berpendapat, serta mendukung interaksi kolaboratif dan budaya tadabbur.",
          pemanfaatanDigital: "Penggunaan presentasi interaktif, simulasi/video pembelajaran, Al-Qur'an digital, serta LKPD digital untuk mendokumentasikan karya."
        },
        saranaPrasarana: ["Laptop/Chromebook", "Koneksi Internet", "Proyektor LCD", "Al-Qur'an / Aplikasi Qur'an Digital", "LKPD Pembelajaran Mendalam"],
        targetPesertaDidik: "Reguler",
        modelPembelajaran: "Problem Based Learning (Pembelajaran Mendalam)",
        tujuanPembelajaran: [
          `Menjelaskan konsep esensial ${topikLabel} secara mendalam dan mengaitkannya dengan pesan ${ayat.surahAyat}.`,
          `Menganalisis dan mengaplikasikan ${topikLabel} untuk menyelesaikan studi kasus nyata secara kolaboratif.`,
          `Merefleksikan kebermanfaatan ${topikLabel} dengan menunjukkan penalaran kritis, kreativitas, dan akhlak mulia.`
        ],
        pemahamanBermakna: `Penguasaan materi ${topikLabel} membekali peserta didik untuk berpikir sistematis, memecahkan masalah nyata secara bijak, serta mengamalkan nilai ${ayat.surahAyat} demi kemaslahatan bersama.`,
        pertanyaanPemantik: [
          `Bagaimana peran ${topikLabel} dalam aktivitas kita sehari-hari, dan apa dampaknya jika tidak dipahami dengan baik?`,
          `Apa hikmah yang dapat kita ambil dari ${ayat.surahAyat} untuk diterapkan saat mempelajari dan mempraktikkan ${topikLabel}?`
        ],
        pengalamanBelajarMendalam: {
          prinsipPembelajaran: [...PRINSIP_PEMBELAJARAN_MENDALAM],
          memahami: `Berkesadaran & Bermakna: Peserta didik mengkaji konsep inti ${topikLabel} melalui studi fenomena nyata, pembacaan serta tadabbur ${ayat.surahAyat}, dan tanya jawab konseptual untuk membangun pemahaman mendalam.`,
          mengaplikasi: `Bermakna & Menggembirakan: Peserta didik berkolaborasi dalam kelompok inklusif untuk mempraktikkan/merancang solusi kasus nyata berbasis ${topikLabel}, kemudian menyajikan karyanya secara interaktif.`,
          merefleksi: `Berkesadaran & Bermakna: Peserta didik mengevaluasi proses belajar, menuliskan pemahaman kunci serta nilai iman dari ${ayat.surahAyat}, dan merumuskan aksi nyata penerapan materi.`
        },
        kegiatanPembelajaran: {
          pendahuluan: {
            deskripsi: `1. Guru membuka kelas dengan salam, doa, dan latihan fokus singkat agar siswa belajar secara berkesadaran (Mindful).\n2. Tadabbur Ayat Al-Qur'an: Membaca dan mengaitkan pesan ${ayat.surahAyat} dengan materi ${topikLabel}.\n3. Apersepsi kontekstual, asesmen awal kesiapan belajar, dan penyampaian tujuan pembelajaran mendalam.`,
            durasi: "15 Menit"
          },
          inti: {
            deskripsi: `A. TAHAP MEMAHAMI (Berkesadaran & Bermakna)\n1. Peserta didik mengamati studi kasus nyata tentang ${topikLabel} dan mengidentifikasi konsep kuncinya.\n2. Diskusi terpimpin untuk menghubungkan konsep materi dengan pengalaman sehari-hari dan nilai ${ayat.surahAyat}.\n\nB. TAHAP MENGAPLIKASI (Bermakna & Menggembirakan)\n3. Dalam kelompok kolaboratif inklusif, peserta didik menyelesaikan tantangan/proyek nyata berbasis ${topikLabel} dengan diferensiasi proses & produk.\n4. Presentasi karya kelompok dan saling memberi umpan balik konstruktif.\n\nC. TAHAP MEREFLEKSI (Berkesadaran)\n5. Peserta didik mengonfirmasi pemahaman baru, mengevaluasi strategi pemecahan masalah, dan menyimpulkan makna pembelajaran.`,
            durasi: "50 Menit"
          },
          penutup: {
            deskripsi: `1. Guru dan peserta didik menyimpulkan konsep inti ${topikLabel} beserta hikmah ${ayat.surahAyat}.\n2. Refleksi pribadi peserta didik mengenai hal paling bermakna dan menggembirakan hari ini.\n3. Penyampaian umpan balik, tindak lanjut (remedial/pengayaan), doa penutup, dan salam.`,
            durasi: "15 Menit"
          }
        },
        asesmen: {
          diagnostik: "Asesmen Awal: Pertanyaan pemantik lisan dan kuis singkat untuk memetakan pengetahuan prasyarat serta gaya belajar siswa.",
          formatif: "Asesmen Proses: Observasi penalaran kritis, kolaborasi kelompok, keaktifan diskusi, dan umpan balik pada LKPD.",
          sumatif: `Asesmen Akhir: Penilaian produk/unjuk karya penyelesaian kasus nyata dan tes uraian HOTS materi ${topikLabel}.`,
          teknik: "Observasi Kinerja, Penilaian Produk, dan Tes Uraian Kontekstual",
          instrumen: "LKPD Pembelajaran Mendalam, Lembar Observasi Profil Lulusan, dan Rubrik Analitik",
          rubrik: "Mahir (Skor 4): Memahami konsep mendalam, mampu mengaplikasikan pada kasus baru, dan mengaitkan nilai Al-Qur'an.\nCakap (Skor 3): Memahami konsep inti dengan tepat dan menerapkannya dalam kelompok.\nLayak (Skor 2): Memahami sebagian konsep dasar dengan bantuan.\nBaru Berkembang (Skor 1): Memerlukan bimbingan intensif.",
          kriteriaPenilaian: "Peserta didik dinyatakan tuntas jika mencapai minimal predikat Cakap (Skor 3) pada tahap Memahami, Mengaplikasi, dan Merefleksi."
        },
        diferensiasi: {
          konten: "Menyediakan bahan bacaan berjenjang, infografis visual, serta video/simulasi interaktif sesuai kesiapan belajar.",
          proses: "Pendampingan bertahap (scaffolding) bagi peserta didik inklusi/butuh bimbingan dan eksplorasi mandiri bagi peserta didik mahir.",
          produk: "Peserta didik memilih format sajian hasil karya berupa poster infografis, presentasi digital, diagram konsep, atau laporan tertulis."
        },
        remedial: `Bimbingan kelompok kecil dengan media visual konkret dan latihan terpandu untuk menguatkan konsep dasar ${topikLabel}.`,
        pengayaan: `Eksplorasi studi kasus lanjutan lintas disiplin terkait ${topikLabel} dan penugasan sebagai mentor sebaya.`,
        refleksiGuru: "Apakah 3 prinsip Pembelajaran Mendalam (Berkesadaran, Bermakna, Menggembirakan) dan tadabbur Ayat Al-Qur'an berjalan optimal? Apa perbaikan untuk pertemuan berikutnya?",
        refleksiPesertaDidik: `Apa pemahaman baru paling bermakna tentang ${topikLabel} hari ini, dan bagaimana hikmah ${ayat.surahAyat} menginspirasi sikapmu?`,
        lampiran: {
          lkpd: `LKPD Pembelajaran Mendalam (Tahap Memahami, Mengaplikasi, Merefleksi) dan lembar tadabbur ${ayat.surahAyat} untuk materi ${topikLabel}.`,
          bahanBacaan: `Ringkasan materi esensial ${topikLabel}, glosarium istilah kunci, dan catatan tadabbur ${ayat.surahAyat}.`,
          rubrik: "Rubrik Analitik Pembelajaran Mendalam (Baru Berkembang, Layak, Cakap, Mahir) dan lembar observasi 8 Dimensi Profil Lulusan.",
          instrumenAsesmen: `3 soal studi kasus HOTS dan 1 tugas proyek kolaboratif tentang ${topikLabel}.`,
          daftarPustaka: `Buku Panduan Guru & Siswa ${mapelLabel} Kemendikdasmen, Panduan Pembelajaran Mendalam (Deep Learning) Kemendikdasmen 2025, serta Al-Qur'an dan Terjemahannya Kemenag RI.`
        }
      };
      return res.json({ success: true, isJson: true, data: fallbackData, isFallback: true });
    }

    if (tipe === 'cp') {
      const fallbackCp = buildOfficialCpData({
        mataPelajaran,
        kelas,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      return res.json({
        success: true,
        isJson: true,
        formatType: 'cp_resmi',
        data: fallbackCp,
        content: formatCpToPlainText(fallbackCp),
        isFallback: true,
      });
    }

    if (tipe === 'atp') {
      const fallbackAtp = buildOfficialAtpData({
        mataPelajaran,
        kelas,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      return res.json({
        success: true,
        isJson: true,
        formatType: 'atp_resmi',
        data: fallbackAtp,
        content: formatAtpToPlainText(fallbackAtp),
        isFallback: true,
      });
    }

    if (tipe === 'kktp') {
      const fallbackKktp = buildOfficialKktpData({
        mataPelajaran,
        kelas,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      return res.json({
        success: true,
        isJson: true,
        formatType: 'kktp_resmi',
        data: fallbackKktp,
        content: formatKktpToPlainText(fallbackKktp),
        isFallback: true,
      });
    }

    if (tipe === 'prota') {
      const fallbackProta = buildOfficialProtaData({
        mataPelajaran,
        kelas,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      return res.json({
        success: true,
        isJson: true,
        formatType: 'prota_resmi',
        data: fallbackProta,
        content: formatProtaToPlainText(fallbackProta),
        isFallback: true,
      });
    }

    if (tipe === 'prosem') {
      const fallbackProsem = buildOfficialProsemData({
        mataPelajaran,
        kelas,
        semester,
        topik,
        tahunAjaran: tahunAjaran || '2026/2027',
      });
      return res.json({
        success: true,
        isJson: true,
        formatType: 'prosem_resmi',
        data: fallbackProsem,
        content: formatProsemToPlainText(fallbackProsem),
        isFallback: true,
      });
    }

    const tipeLabelMap: Record<string, string> = {
      atp: 'ALUR TUJUAN PEMBELAJARAN (ATP)',
      kktp: 'KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP)',
      prota: 'PROGRAM TAHUNAN (PROTA)',
      prosem: 'PROGRAM SEMESTER (PROSEM)',
      jurnal: 'JURNAL MENGAJAR HARIAN',
    };
    const docHeaderTitle = tipeLabelMap[tipe] || `DOKUMEN ADMINISTRASI GURU (${(tipe || 'UMUM').toUpperCase()})`;
    const mapelLabel = mataPelajaran || 'Umum';
    const kelasLabel = kelas || 'VII';
    const topikLabel = topik || `Materi Pokok ${mapelLabel}`;

    const fallbackContent = `${docHeaderTitle}
SMP ISLAM MODERN AL FAKHIR
TAHUN AJARAN ${tahunAjaran || '2026/2027'}

IDENTITAS DOKUMEN
Mata Pelajaran   : ${mapelLabel}
Fase / Kelas     : Fase D / Kelas ${kelasLabel}
Fokus Topik      : ${topikLabel}
Satuan Pendidikan: SMP Islam Modern Al Fakhir

A. LANDASAN & CAPAIAN KOMPETENSI
Peserta didik mampu memahami konsep esensial, menganalisis permasalahan nyata, dan mengaplikasikan kompetensi ${mapelLabel} khususnya pada topik ${topikLabel} secara mendalam (Berkesadaran, Bermakna, Menggembirakan) serta mengintegrasikan 8 Dimensi Profil Lulusan dan nilai keislaman.

B. RINCIAN TARGET & INDIKATOR PEMBELAJARAN
1. Memahami konsep fundamental dan ruang lingkup ${topikLabel} secara sistematis.
2. Menganalisis studi kasus kontekstual yang berkaitan dengan ${topikLabel} secara kritis dan kolaboratif.
3. Mengaplikasikan pengetahuan dan keterampilan ${topikLabel} dalam proyek nyata serta merefleksikan kebermanfaatannya.

C. STRATEGI ASESMEN & TINDAK LANJUT
- Asesmen Awal (Diagnostik): Pemetaan kesiapan belajar dan pengetahuan prasyarat peserta didik.
- Asesmen Proses (Formatif): Observasi diskusi kolaboratif, unjuk kerja, dan umpan balik LKPD.
- Asesmen Akhir (Sumatif): Evaluasi produk/proyek serta soal pemecahan masalah HOTS.`;

    return res.json({ success: true, content: fallbackContent, isFallback: true });
  }
});

// Vite & Static file handling
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  let vite: Awaited<ReturnType<typeof import('vite')['createServer']>> | null = null;

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Sistem Informasi Sekolah berjalan di http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    console.error('Server error:', err);
    process.exit(1);
  });

  const shutdown = async () => {
    server.close();
    if (vite) {
      try {
        await vite.close();
      } catch {
        // ignore close errors on shutdown
      }
    }
    process.exit(0);
  };

  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
