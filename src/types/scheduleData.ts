import { Guru } from './school';

export interface ScheduleEntry {
  id?: string;
  day: string;
  time: string;
  classId: string;
  subject: string;
  teacherCode: string;
  guruName?: string;
  isKegiatan?: boolean;
  kelas?: string;
  ruang?: string;
}

export interface ScheduleClassItem {
  id: string;
  name: string;
}

export interface ScheduleHeaderConfig {
  judul: string;
  namaSekolah: string;
  semester: string;
  tahunAjaran: string;
}

export interface DockScheduleCard {
  id: string;
  subject: string;
  teacherCode: string;
  guruName: string;
  fromLabel?: string;
}

export interface TeacherMapping {
  code: string;
  name: string;
  subject: string;
}

export interface PiketSchedule {
  day: string;
  jamKe: string;
  gedungSmp: string;
  gedungSd: string;
}

export interface TeacherBebanJpOverride {
  targetJp: number;
  maxJp?: number;
  tugasTambahan?: string;
  ekuivalensiJp?: number;
  catatan?: string;
}

export interface BebanJpConfig {
  menitPerJp: number;
  hitungMode: 'durasi' | 'slot';
  defaultMinJp: number;
  defaultMaxJp: number;
  targetJpPerKelas: number;
  overrides: Record<string, TeacherBebanJpOverride>;
}

export const DEFAULT_BEBAN_JP_CONFIG: BebanJpConfig = {
  menitPerJp: 40,
  hitungMode: 'durasi',
  defaultMinJp: 24,
  defaultMaxJp: 36,
  targetJpPerKelas: 40,
  overrides: {},
};

export const TUGAS_TAMBAHAN_PRESETS: Array<{ label: string; jp: number }> = [
  { label: 'Tidak Ada', jp: 0 },
  { label: 'Wali Kelas', jp: 2 },
  { label: 'Pembina Ekstrakurikuler', jp: 2 },
  { label: 'Koordinator P5 / Proyek', jp: 2 },
  { label: 'Guru Piket', jp: 1 },
  { label: 'Waka Kurikulum', jp: 12 },
  { label: 'Waka Kesiswaan', jp: 12 },
  { label: 'Waka Sarpras / Humas', jp: 12 },
  { label: 'Kepala Laboratorium', jp: 12 },
  { label: 'Kepala Perpustakaan', jp: 12 },
];

export function parseTimeRangeMinutes(timeRange: string): number {
  if (!timeRange) return 0;
  const parts = timeRange.split('-').map((p) => p.trim());
  if (parts.length < 2) return 0;
  const toMin = (str: string) => {
    const clean = str.replace(/[:.]/g, '.').trim();
    const [h, m] = clean.split('.').map(Number);
    if (isNaN(h) || isNaN(m)) return 0;
    return h * 60 + m;
  };
  const diff = toMin(parts[1]) - toMin(parts[0]);
  return diff > 0 ? diff : 0;
}

export function calculateSlotJp(timeRange: string, config: BebanJpConfig = DEFAULT_BEBAN_JP_CONFIG): number {
  if (config.hitungMode === 'slot') return 1;
  const minutes = parseTimeRangeMinutes(timeRange);
  const unit = config.menitPerJp > 0 ? config.menitPerJp : 40;
  if (minutes <= 0) return 1;
  return Math.max(1, Math.round(minutes / unit));
}

export const TEACHER_MAPPINGS: TeacherMapping[] = [
  { code: '002', name: 'Deny Rahmat, S.Sos.I', subject: 'Bahasa Indonesia 9' },
  { code: '003', name: 'Arifah Hilyati, S.S, M.Pd', subject: 'Bahasa Inggris 9 & Public Speaking 7,8' },
  { code: '004', name: 'Muhammad Faisal, S.Sos', subject: 'Fiqih 9 & Al Qur\'an 8,9' },
  { code: '005', name: 'Nur Faidah Djaelani, S.Pd', subject: 'Al Qur\'an 7,9' },
  { code: '006', name: 'Aulia Safitri, S.Pd', subject: 'Matematika 7' },
  { code: '008', name: 'Syarifatu Zahro, S.Pd', subject: 'Pendidikan Pancasila 7,8,9' },
  { code: '009', name: 'Mochamad Asroru Pahala, S.Pd', subject: 'IPA 7,8 & Research 8' },
  { code: '010', name: 'Mutiara Indah Pratiwi, S.Pd', subject: 'PABP 7,8,9' },
  { code: '011', name: 'Reny Suci Rochyati, M.Pd', subject: 'Bahasa Jepang 7,8,9' },
  { code: '012', name: 'Nur Alfiyyah Lail, S.Pd', subject: 'Seni Budaya 7,8,9' },
  { code: '013', name: 'Ahmad Marzuki Nasution', subject: 'Fiqih 7,8, Al Qur\'an 7 & Bahasa Arab 7' },
  { code: '014', name: 'Dedi Setiadi', subject: 'Al-Qur\'an 7,8' },
  { code: '015', name: 'Ariyanto, SE', subject: 'Matematika 8,9' },
  { code: '016', name: 'Thio Pratama, S.Kom', subject: 'Informatika 7,8' },
  { code: '018', name: 'Wulan Apriningtyas, S.Pd', subject: 'IPA 9' },
  { code: '021', name: 'Nabilla, S.Pd', subject: 'Bahasa Indonesia 7,8' },
  { code: '022', name: 'Nabilla, S.Pd', subject: 'Fiqih 7,8,9 & Al Qur\'an 8' },
  { code: '023', name: 'Halwa Khalisa, S.Pd', subject: 'Bahasa Inggris 7,8 & Public Speaking 8' },
  { code: '024', name: 'Nazly Qurotul \'Aini', subject: 'Al Qur\'an 7,8,9' },
  { code: '025', name: 'Rizky Dwi Arista, S.Pd', subject: 'IPS 7,8,9 & Kewirausahaan 7' },
  { code: '028', name: 'Abdul Malik', subject: 'Bahasa Arab 8,9' },
  { code: '029', name: 'Nadia Andhalia Salsabila, S.Pd', subject: 'Bahasa Korea 7,8,9' },
  { code: '030', name: 'Giar Hermawan, S.Kom', subject: 'Informatika' },
];

export const SCHEDULE_CLASSES = [
  { id: '7is', name: 'VII - Ibnu Sina' },
  { id: '7ik', name: 'VII - Ibnu Khaldun' },
  { id: '7ih', name: 'VII - Ibnu Al Haytam' },
  { id: '7ir', name: 'VII - Ibnu Rusyd' },
  { id: '8k', name: 'VIII - Al Kindi' },
  { id: '8kh', name: 'VIII - Al Khawarizmi' },
  { id: '8f', name: 'VIII - Al Farabi' },
  { id: '8b', name: 'VIII - Al Biruni' },
  { id: '9u', name: 'IX - Umar bin Khattab' },
  { id: '9ut', name: 'IX - Utsman bin Affan' },
];

export const TIME_SLOTS = [
  '07.15 - 07.35',
  '07.35 - 08.55',
  '08.55 - 09.35',
  '09.35 - 10.15',
  '10.15 - 10.35',
  '10.35 - 11.15',
  '11.15 - 11.55',
  '11.55 - 13.00',
  '13.00 - 13.40',
  '13.40 - 14.20',
  '14.20 - 15.00',
  '15.00 - 15.40',
];

// Simplified mock data based on the image
// I'll only populate some to demonstrate the UI
export const MASTER_SCHEDULE: ScheduleEntry[] = [];

export const PIKET_SCHEDULE: PiketSchedule[] = [
  { day: 'SENIN', jamKe: '1-3', gedungSmp: 'Ust Marzuki', gedungSd: 'Halwa Khalisa, S.Pd' },
  { day: 'SENIN', jamKe: '4-5', gedungSmp: 'Thio Pratama, S.Kom', gedungSd: 'Ust. Dedi Setiadi' },
  { day: 'SELASA', jamKe: '1-3', gedungSmp: 'Nur Alfiyyah Lail, S.Pd', gedungSd: 'Syarifatu Zahro, S.Pd' },
  { day: 'SELASA', jamKe: '4-5', gedungSmp: 'Mutiara Indah Pratiwi, S.Pd', gedungSd: 'Nabila, S.Pd' },
];
