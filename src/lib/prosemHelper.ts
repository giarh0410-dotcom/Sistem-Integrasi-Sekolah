import { suggestAyatForMateri } from './quranAyatPresets';
import { normalizeFaseFromKelas } from './capaianPembelajaranHelper';
import { buildOfficialProtaData } from './protaHelper';

export const PROSEM_MONTHS_GANJIL = [
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export const PROSEM_MONTHS_GENAP = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
] as const;

export const PROSEM_WEEKS = [1, 2, 3, 4] as const;

export interface ProsemPekanEfektifRow {
  bulan: string;
  jumlahPekan: number;
  pekanTidakEfektif: number;
  keteranganTidakEfektif: string;
}

export interface ProsemMatrixRow {
  elemen: string;
  tujuanPembelajaran: string;
  alokasiJp: number;
  mingguAktif: Record<string, number>;
  jenisKegiatan: 'Intrakurikuler' | 'Asesmen' | 'Proyek' | 'Remedial';
  keterangan: string;
}

export interface ProsemData {
  formatType: 'prosem_resmi';
  identitas: {
    mataPelajaran: string;
    satuanPendidikan: string;
    fase: string;
    kelas: string;
    semester: 'Ganjil' | 'Genap';
    tahunAjaran: string;
    namaPenyusun: string;
    jpPerMinggu: number;
    fokusSemester: string;
    referensiRegulasi: string;
  };
  rincianPekanEfektif: ProsemPekanEfektifRow[];
  distribusiMingguan: ProsemMatrixRow[];
  catatanPelaksanaan: string;
  integrasiNilaiIslami: {
    surahAyat: string;
    teksArab: string;
    terjemahan: string;
    relevansiProsem: string;
  };
}

export interface ProsemSummary {
  totalPekan: number;
  totalPekanTidakEfektif: number;
  totalPekanEfektif: number;
  targetJpEfektif: number;
  totalJpTerjadwal: number;
  totalJpMatriks: number;
  jumlahUnit: number;
}

export function getProsemMonths(semester: string): readonly string[] {
  return semester === 'Genap' ? PROSEM_MONTHS_GENAP : PROSEM_MONTHS_GANJIL;
}

export function getProsemWeekKey(bulan: string, minggu: number): string {
  return `${bulan}_M${minggu}`;
}

export function isStructuredProsemData(data: any): data is ProsemData {
  return Boolean(
    data &&
      data.formatType === 'prosem_resmi' &&
      data.identitas &&
      Array.isArray(data.rincianPekanEfektif) &&
      Array.isArray(data.distribusiMingguan)
  );
}

export function calculateProsemSummary(prosem: ProsemData): ProsemSummary {
  const totalPekan = prosem.rincianPekanEfektif.reduce(
    (acc, r) => acc + (Number(r.jumlahPekan) || 0),
    0
  );
  const totalPekanTidakEfektif = prosem.rincianPekanEfektif.reduce(
    (acc, r) => acc + (Number(r.pekanTidakEfektif) || 0),
    0
  );
  const totalPekanEfektif = Math.max(0, totalPekan - totalPekanTidakEfektif);
  const jpPerMinggu = Number(prosem.identitas.jpPerMinggu) || 3;
  const targetJpEfektif = totalPekanEfektif * jpPerMinggu;

  const totalJpTerjadwal = prosem.distribusiMingguan.reduce(
    (acc, r) => acc + (Number(r.alokasiJp) || 0),
    0
  );
  const totalJpMatriks = prosem.distribusiMingguan.reduce((acc, r) => {
    const rowSum = Object.values(r.mingguAktif || {}).reduce(
      (s, v) => s + (Number(v) || 0),
      0
    );
    return acc + rowSum;
  }, 0);

  return {
    totalPekan,
    totalPekanTidakEfektif,
    totalPekanEfektif,
    targetJpEfektif,
    totalJpTerjadwal,
    totalJpMatriks,
    jumlahUnit: prosem.distribusiMingguan.length,
  };
}

export function buildDefaultRpe(semester: 'Ganjil' | 'Genap'): ProsemPekanEfektifRow[] {
  if (semester === 'Genap') {
    return [
      { bulan: 'Januari', jumlahPekan: 4, pekanTidakEfektif: 1, keteranganTidakEfektif: 'Libur Awal Tahun & Persiapan Semester II' },
      { bulan: 'Februari', jumlahPekan: 4, pekanTidakEfektif: 0, keteranganTidakEfektif: 'Aktif penuh pembelajaran intrakurikuler' },
      { bulan: 'Maret', jumlahPekan: 4, pekanTidakEfektif: 1, keteranganTidakEfektif: 'Libur Awal Ramadhan / Pesantren Kilat' },
      { bulan: 'April', jumlahPekan: 4, pekanTidakEfektif: 1, keteranganTidakEfektif: 'Libur Idul Fitri / Kegiatan Keagamaan' },
      { bulan: 'Mei', jumlahPekan: 4, pekanTidakEfektif: 0, keteranganTidakEfektif: 'Aktif penuh + proyek akhir tahun' },
      { bulan: 'Juni', jumlahPekan: 4, pekanTidakEfektif: 3, keteranganTidakEfektif: 'Pengolahan nilai, pembagian rapor & libur kenaikan kelas' },
    ];
  }
  return [
    { bulan: 'Juli', jumlahPekan: 4, pekanTidakEfektif: 2, keteranganTidakEfektif: 'Libur awal tahun ajaran & MPLS siswa baru' },
    { bulan: 'Agustus', jumlahPekan: 4, pekanTidakEfektif: 0, keteranganTidakEfektif: 'Aktif penuh pembelajaran intrakurikuler' },
    { bulan: 'September', jumlahPekan: 4, pekanTidakEfektif: 0, keteranganTidakEfektif: 'Aktif penuh (termasuk ASTS Ganjil)' },
    { bulan: 'Oktober', jumlahPekan: 4, pekanTidakEfektif: 0, keteranganTidakEfektif: 'Aktif penuh pembelajaran intrakurikuler' },
    { bulan: 'November', jumlahPekan: 4, pekanTidakEfektif: 0, keteranganTidakEfektif: 'Aktif penuh + penyelesaian proyek semester' },
    { bulan: 'Desember', jumlahPekan: 4, pekanTidakEfektif: 4, keteranganTidakEfektif: 'Classmeeting, pengolahan rapor & libur semester I' },
  ];
}

function getEffectiveWeekSlots(semester: 'Ganjil' | 'Genap'): string[] {
  if (semester === 'Genap') {
    // 18 effective week slots across Jan–Jun
    return [
      'Januari_M2', 'Januari_M3', 'Januari_M4',
      'Februari_M1', 'Februari_M2', 'Februari_M3', 'Februari_M4',
      'Maret_M1', 'Maret_M2', 'Maret_M3',
      'April_M2', 'April_M3', 'April_M4',
      'Mei_M1', 'Mei_M2', 'Mei_M3', 'Mei_M4',
      'Juni_M1',
    ];
  }
  // 18 effective week slots across Jul–Des
  return [
    'Juli_M3', 'Juli_M4',
    'Agustus_M1', 'Agustus_M2', 'Agustus_M3', 'Agustus_M4',
    'September_M1', 'September_M2', 'September_M3', 'September_M4',
    'Oktober_M1', 'Oktober_M2', 'Oktober_M3', 'Oktober_M4',
    'November_M1', 'November_M2', 'November_M3', 'November_M4',
  ];
}

export function buildOfficialProsemData(params: {
  mataPelajaran?: string;
  kelas?: string;
  semester?: string;
  topik?: string;
  tahunAjaran?: string;
  namaPenyusun?: string;
  satuanPendidikan?: string;
  jpPerMinggu?: number;
}): ProsemData {
  const semester: 'Ganjil' | 'Genap' =
    params.semester && params.semester.toLowerCase().includes('genap') ? 'Genap' : 'Ganjil';
  const mapel = (params.mataPelajaran || 'Informatika').trim();
  const kelas = (params.kelas || 'VII').trim();
  const tahunAjaran = params.tahunAjaran || '2026/2027';
  const namaPenyusun = params.namaPenyusun || 'Guru Mata Pelajaran';
  const satuanPendidikan = params.satuanPendidikan || 'SMP Islam Modern Al Fakhir';
  const fase = normalizeFaseFromKelas(kelas);

  // Leverage official Prota units for the requested semester so Prota & Prosem stay 100% aligned!
  const protaSeed = buildOfficialProtaData({
    mataPelajaran: mapel,
    kelas,
    topik: params.topik,
    tahunAjaran,
    namaPenyusun,
    satuanPendidikan,
    jpPerMinggu: params.jpPerMinggu,
  });

  const jpPerMinggu = params.jpPerMinggu || protaSeed.identitas.jpPerMinggu;
  const semUnits = protaSeed.distribusiSemester.filter((u) => u.semester === semester);
  const weekSlots = getEffectiveWeekSlots(semester);
  const rpe = buildDefaultRpe(semester);

  // Allocate consecutive effective week slots proportional to each unit's alokasiJp
  let cursor = 0;
  const distribusiMingguan: ProsemMatrixRow[] = semUnits.map((unit, idx) => {
    const isLast = idx === semUnits.length - 1;
    const rawWeeks = Math.max(1, Math.round(unit.alokasiJp / jpPerMinggu));
    const remainingSlots = Math.max(1, weekSlots.length - cursor);
    const remainingUnitsAfter = semUnits.length - 1 - idx;
    const maxAllowed = Math.max(1, remainingSlots - remainingUnitsAfter);
    const allocatedWeeks = isLast ? remainingSlots : Math.min(rawWeeks, maxAllowed);

    const mingguAktif: Record<string, number> = {};
    let rowJpTotal = 0;
    for (let w = 0; w < allocatedWeeks && cursor < weekSlots.length; w++) {
      mingguAktif[weekSlots[cursor]] = jpPerMinggu;
      rowJpTotal += jpPerMinggu;
      cursor++;
    }

    const lowerEl = unit.elemen.toLowerCase();
    const jenisKegiatan: ProsemMatrixRow['jenisKegiatan'] =
      lowerEl.includes('asesmen') || lowerEl.includes('sumatif') || lowerEl.includes('asts') || lowerEl.includes('sas') || lowerEl.includes('sat')
        ? 'Asesmen'
        : lowerEl.includes('proyek') || lowerEl.includes('plb') || lowerEl.includes('kokurikuler')
        ? 'Proyek'
        : lowerEl.includes('remedial')
        ? 'Remedial'
        : 'Intrakurikuler';

    return {
      elemen: unit.elemen,
      tujuanPembelajaran: unit.tujuanPembelajaran,
      alokasiJp: rowJpTotal || unit.alokasiJp,
      mingguAktif,
      jenisKegiatan,
      keterangan: unit.keterangan,
    };
  });

  const fokusSemester =
    (params.topik || '').trim() ||
    `Distribusi Mingguan ${mapel} Kelas ${kelas} Semester ${semester}`;
  const ayat = suggestAyatForMateri(mapel, fokusSemester);

  return {
    formatType: 'prosem_resmi',
    identitas: {
      mataPelajaran: mapel,
      satuanPendidikan,
      fase,
      kelas,
      semester,
      tahunAjaran,
      namaPenyusun,
      jpPerMinggu,
      fokusSemester,
      referensiRegulasi: `Struktur Kurikulum Nasional Kemendikdasmen • Program Semester ${semester === 'Ganjil' ? 'I (Ganjil)' : 'II (Genap)'}`,
    },
    rincianPekanEfektif: rpe,
    distribusiMingguan,
    catatanPelaksanaan: `Program Semester ${semester} ini disusun selaras dengan Program Tahunan (PROTA) dan Kalender Pendidikan ${satuanPendidikan} Tahun Ajaran ${tahunAjaran} dengan beban belajar ${jpPerMinggu} JP/minggu. Guru dapat menyesuaikan pergeseran pekan aktif apabila terdapat agenda sekolah, PHBI, atau kebutuhan diferensiasi siswa.`,
    integrasiNilaiIslami: {
      surahAyat: ayat.surahAyat,
      teksArab: ayat.teksArab,
      terjemahan: ayat.terjemahan,
      relevansiProsem: ayat.kaitanMateri,
    },
  };
}

export function formatProsemToPlainText(prosem: ProsemData): string {
  const summary = calculateProsemSummary(prosem);
  const months = getProsemMonths(prosem.identitas.semester);

  const rpeLines = prosem.rincianPekanEfektif
    .map((r, i) => {
      const efektif = Math.max(0, r.jumlahPekan - r.pekanTidakEfektif);
      return `${i + 1}. ${r.bulan.padEnd(10, ' ')} | Total: ${r.jumlahPekan} Pekan | Tidak Efektif: ${r.pekanTidakEfektif} | Efektif: ${efektif} Pekan (${efektif * prosem.identitas.jpPerMinggu} JP) — ${r.keteranganTidakEfektif}`;
    })
    .join('\n');

  const unitLines = prosem.distribusiMingguan
    .map((row, idx) => {
      const activeList: string[] = [];
      months.forEach((m) => {
        PROSEM_WEEKS.forEach((w) => {
          const val = row.mingguAktif?.[getProsemWeekKey(m, w)];
          if (val && val > 0) {
            activeList.push(`${m.slice(0, 3)} M${w}(${val}JP)`);
          }
        });
      });
      return `${idx + 1}. [${row.jenisKegiatan}] ${row.elemen} — ${row.alokasiJp} JP\n   ATP/Materi    : ${row.tujuanPembelajaran}\n   Jadwal Pekan  : ${activeList.join(', ') || '-'}\n   Keterangan    : ${row.keterangan}`;
    })
    .join('\n\n');

  return `PROGRAM SEMESTER (PROSEM)
${prosem.identitas.satuanPendidikan.toUpperCase()}
SEMESTER ${prosem.identitas.semester.toUpperCase()} • TAHUN AJARAN ${prosem.identitas.tahunAjaran}

IDENTITAS DOKUMEN PROSEM
Mata Pelajaran        : ${prosem.identitas.mataPelajaran}
Fase / Kelas          : ${prosem.identitas.fase} / Kelas ${prosem.identitas.kelas}
Semester              : ${prosem.identitas.semester === 'Ganjil' ? 'I (Ganjil — Juli s.d. Desember)' : 'II (Genap — Januari s.d. Juni)'}
Beban Belajar         : ${prosem.identitas.jpPerMinggu} JP / Minggu
Total Pekan Efektif   : ${summary.totalPekanEfektif} Pekan (${summary.targetJpEfektif} JP)
Total JP Terjadwal    : ${summary.totalJpTerjadwal} JP (${summary.jumlahUnit} Unit)
Guru Penyusun         : ${prosem.identitas.namaPenyusun}
Acuan Regulasi        : ${prosem.identitas.referensiRegulasi}

A. RINCIAN PEKAN EFEKTIF (RPE)
${rpeLines}
TOTAL PEKAN EFEKTIF: ${summary.totalPekanEfektif} Pekan = ${summary.targetJpEfektif} JP

B. MATRIKS DISTRIBUSI MINGGUAN ALUR TUJUAN PEMBELAJARAN
${unitLines}

TOTAL ALOKASI WAKTU SEMESTER ${prosem.identitas.semester.toUpperCase()}: ${summary.totalJpTerjadwal} JP

C. CATATAN PELAKSANAAN & FLEKSIBILITAS KALENDER
${prosem.catatanPelaksanaan}

D. INTEGRASI NILAI ISLAMI (${prosem.integrasiNilaiIslami.surahAyat})
Teks Arab : ${prosem.integrasiNilaiIslami.teksArab}
Terjemahan: "${prosem.integrasiNilaiIslami.terjemahan}"
Relevansi : ${prosem.integrasiNilaiIslami.relevansiProsem}`;
}
