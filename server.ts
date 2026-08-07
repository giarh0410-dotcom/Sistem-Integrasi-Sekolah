import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { google } from 'googleapis';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

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
    console.error('Error Google Sheets Export:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Terjadi kesalahan saat membuat Google Spreadsheet.',
    });
  }
});

// 2. Gemini AI Assistant Endpoint for CBT Question Generator
app.post('/api/ai/generate-questions', async (req, res) => {
  try {
    const { mataPelajaran, kelas, topik, jumlahSoal } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        success: false,
        message: 'GEMINI_API_KEY belum dikonfigurasi di server.'
      });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Anda adalah pakar pembuat soal Ujian Berbasis Komputer (CBT) Kurikulum Merdeka Indonesia.
Buatkan ${jumlahSoal || 4} soal untuk mata pelajaran: "${mataPelajaran}", Kelas: "${kelas}", Topik: "${topik || 'Umum'}".
Harus mencakup 4 tipe soal:
1. Pilihan Ganda (pg) - 1 jawaban benar dari 4 opsi (A, B, C, D)
2. Pilihan Ganda Kompleks (multiple_choice) - Lebih dari 1 jawaban benar dari 4 opsi (A, B, C, D)
3. Isian Singkat (isian) - Jawaban berupa kata/angka singkat
4. Esai (esai) - Pertanyaan uraian terbuka dengan petunjuk/kunci penilaian

Kembalikan respon DALAM FORMAT JSON SAJA yang valid sesuai struktur array ini (tanpa markdown format codeblock biasa):
[
  {
    "tipe": "pg",
    "pertanyaan": "...",
    "opsi": [{"id": "A", "teks": "..."}, {"id": "B", "teks": "..."}, {"id": "C", "teks": "..."}, {"id": "D", "teks": "..."}],
    "kunciJawaban": "A",
    "pembahasan": "...",
    "bobot": 20
  },
  {
    "tipe": "multiple_choice",
    "pertanyaan": "...",
    "opsi": [{"id": "A", "teks": "..."}, {"id": "B", "teks": "..."}, {"id": "C", "teks": "..."}, {"id": "D", "teks": "..."}],
    "kunciJawaban": ["A", "C"],
    "pembahasan": "...",
    "bobot": 25
  },
  {
    "tipe": "isian",
    "pertanyaan": "...",
    "kunciJawaban": "jawaban singkat",
    "pembahasan": "...",
    "bobot": 25
  },
  {
    "tipe": "esai",
    "pertanyaan": "...",
    "kunciJawaban": "kunci uraian singkat",
    "pembahasan": "...",
    "bobot": 30
  }
]`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text || '';
    const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return res.json({ success: true, soalList: parsed });
  } catch (error: any) {
    console.error('Error generating AI questions:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Gemini AI Endpoint for Administrasi Guru (Modul Ajar Deep Learning & Inklusi / ATP / Jurnal / Prota / Prosem)
app.post('/api/ai/generate-administrasi', async (req, res) => {
  try {
    const { tipe, mataPelajaran, kelas, topik, tahunAjaran } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ success: false, message: 'GEMINI_API_KEY tidak dikonfigurasi.' });
    }

    const ai = new GoogleGenAI({ apiKey });

    let customInstructions = '';
    if (tipe === 'modul_ajar') {
      customInstructions = `Format WAJIB Mengikuti Standar Template Modul Ajar Deep Learning & Inklusif 2026/2027 (9 Komponen Utama):
A. IDENTITAS (Nama Penyusun, Nama Sekolah, Mata Pelajaran, Fase/Kelas, Semester, Materi, Alokasi Waktu, Tahun Pelajaran)
B. KARAKTERISTIK PESERTA DIDIK
   1. Karakteristik Peserta Didik Reguler (Kemampuan awal, kesiapan belajar, minat, gaya belajar, kemampuan sosial & komunikasi)
   2. Karakteristik Peserta Didik Inklusif (Tabel/Rincian: Inisial, Jenis Hambatan mis. Slow Learner/Disleksia/ADHD/Autisme, Kekuatan, Hambatan, Minat, Cara Belajar Efektif, Bentuk Dukungan, Catatan Guru)
C. KOMPONEN INTI
   1. DIMENSI PROFIL LULUSAN (Profil Pelajar Pancasila & Rahmatan Lil Alamin)
   2. TUJUAN PEMBELAJARAN (TP) - Target Reguler, Target Inklusi Ringan/Sedang, & Target Individual PPI
   3. KRITERIA KETERCAPAIAN TUJUAN PEMBELAJARAN (KKTP) - Reguler & Inklusi
   4. INTEGRASI NILAI ISLAMI (Dalil/Ayat Al-Qur'an Arab & Terjemah + Nilai Tauhid Rububiyah, Tafakur, Syukur, Tanggung Jawab Khalifah)
D. PRINSIP PEMBELAJARAN (DEEP LEARNING)
   1. Mindful (Berkesadaran)
   2. Meaningful (Bermakna)
   3. Joyful (Menyenangkan)
E. ALUR PEMBELAJARAN (Pertemuan 1, 2, dst)
   Setiap pertemuan terbagi 3 tahap:
   - Tahap 1: Memahami — Mindful (10 menit)
   - Tahap 2: Mengaplikasikan — Meaningful (40 menit) (dengan diferensiasi proses/produk)
   - Tahap 3: Merefleksi — Joyful (10 menit)
   - Penyesuaian Peserta Didik Inklusi
F. PENGUATAN LITERASI DAN NUMERASI
G. ASESMEN (Asesmen Diagnostik, Formatif, Sumatif Pilihan Ganda & Essay + Penyesuaian Asesmen Inklusi)
I. REFLEKSI (Refleksi Guru 7 pertanyaan, Refleksi Peserta Didik Reguler, Refleksi Peserta Didik Inklusi, dan Lembar Pengesahan Kepala Sekolah & Guru Mata Pelajaran)`;
    } else {
      customInstructions = `Berikan isi dokumen lengkap yang rapi, profesional, terstruktur dengan poin-poin (Identitas, Tujuan Pembelajaran, Asesmen, Langkah Pembelajaran, Media & Sumber Belajar, Refleksi, Pengesahan).`;
    }

    const prompt = `Anda adalah konsultan Kurikulum Merdeka Kementerian Pendidikan Indonesia.
Buatkan draf dokumen Administrasi Guru tipe: "${tipe}" untuk Mata Pelajaran "${mataPelajaran}", Kelas "${kelas}", Topik/Capaian "${topik || 'Standard Kurikulum Merdeka'}", Tahun Ajaran "${tahunAjaran || '2026/2027'}".

${customInstructions}

Format output lengkap dalam Bahasa Indonesia yang sangat rapi, jelas, dan siap pakai.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({ success: true, content: response.text });
  } catch (error: any) {
    console.error('Error generating administrasi:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

// Vite & Static file handling
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
    if (err.code === 'EADDRINUSE') {
      console.log(`Port ${PORT} already in use, cleaning up...`);
      process.exit(0);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
