import { Siswa } from '../types/school';

export type DuplicateReasonType = 'nisn' | 'nis' | 'nik' | 'nama';

export interface DuplicateReason {
  type: DuplicateReasonType;
  label: string;
  value: string;
}

export interface CompletenessScore {
  filled: number;
  total: number;
}

export interface DuplicateGroup {
  id: string;
  reasons: DuplicateReason[];
  students: Siswa[];
  severity: 'high' | 'medium';
  recommendedKeepId: string;
  completenessMap: Record<string, CompletenessScore>;
}

export interface DuplicateSummary {
  allGroups: DuplicateGroup[];
  groupsByType: Record<DuplicateReasonType, DuplicateGroup[]>;
  totalGroups: number;
  totalDuplicateRows: number;
  totalRedundantRows: number;
}

const PLACEHOLDER_VALUES = new Set([
  '',
  '-',
  '--',
  '---',
  '0',
  '00',
  '000',
  '0000',
  'n/a',
  'na',
  'null',
  'undefined',
  'belum ada',
  'belum diisi',
  'kosong'
]);

function isMeaningfulString(val: unknown): boolean {
  if (val === null || val === undefined) return false;
  const s = String(val).trim();
  if (!s) return false;
  return !PLACEHOLDER_VALUES.has(s.toLowerCase());
}

export function normalizeIdCode(val?: string | null): string {
  if (!val) return '';
  const cleaned = String(val)
    .trim()
    .toLowerCase()
    .replace(/[\s\-_./]+/g, '');
  if (!cleaned || PLACEHOLDER_VALUES.has(cleaned)) return '';
  if (/^0+$/.test(cleaned)) return '';
  if (cleaned.length < 3) return '';
  return cleaned;
}

export function normalizeStudentName(val?: string | null): string {
  if (!val) return '';
  const cleaned = String(val)
    .trim()
    .toLowerCase()
    .replace(/[.,'`"()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || PLACEHOLDER_VALUES.has(cleaned) || cleaned.length < 3) return '';
  return cleaned;
}

export function computeSiswaCompleteness(s: Siswa): CompletenessScore {
  const checks: boolean[] = [
    isMeaningfulString(s.nama),
    normalizeIdCode(s.nisn) !== '',
    normalizeIdCode(s.nis) !== '',
    normalizeIdCode(s.nik) !== '',
    isMeaningfulString(s.kelas) && s.kelas.toLowerCase() !== 'belum ada kelas',
    s.jenisKelamin === 'L' || s.jenisKelamin === 'P',
    isMeaningfulString(s.tempatLahir),
    isMeaningfulString(s.tanggalLahir),
    isMeaningfulString(s.agama),
    isMeaningfulString(s.alamatLengkap || s.alamat),
    isMeaningfulString(s.namaAyah),
    isMeaningfulString(s.namaIbu),
    isMeaningfulString(s.namaWali),
    isMeaningfulString(s.teleponWali),
    isMeaningfulString(s.asalSekolah),
    isMeaningfulString(s.email),
    isMeaningfulString(s.fotoUrl),
    isMeaningfulString(s.golonganDarah)
  ];

  return {
    filled: checks.filter(Boolean).length,
    total: checks.length
  };
}

function getReasonLabel(type: DuplicateReasonType): string {
  switch (type) {
    case 'nisn':
      return 'NISN Sama';
    case 'nis':
      return 'NIS Sama';
    case 'nik':
      return 'NIK Sama';
    case 'nama':
      return 'Nama Sama';
  }
}

function getNormalizedKey(s: Siswa, type: DuplicateReasonType): string {
  switch (type) {
    case 'nisn':
      return normalizeIdCode(s.nisn);
    case 'nis':
      return normalizeIdCode(s.nis);
    case 'nik':
      return normalizeIdCode(s.nik);
    case 'nama':
      return normalizeStudentName(s.nama);
  }
}

function getRawDisplayValue(s: Siswa, type: DuplicateReasonType): string {
  switch (type) {
    case 'nisn':
      return (s.nisn || '').trim();
    case 'nis':
      return (s.nis || '').trim();
    case 'nik':
      return (s.nik || '').trim();
    case 'nama':
      return (s.nama || '').trim();
  }
}

function collectSharedReasons(students: Siswa[]): DuplicateReason[] {
  const types: DuplicateReasonType[] = ['nisn', 'nis', 'nik', 'nama'];
  const reasons: DuplicateReason[] = [];

  for (const type of types) {
    const counts = new Map<string, { count: number; display: string }>();
    for (const s of students) {
      const key = getNormalizedKey(s, type);
      if (!key) continue;
      const existing = counts.get(key);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(key, { count: 1, display: getRawDisplayValue(s, type) });
      }
    }
    for (const [, info] of counts.entries()) {
      if (info.count >= 2) {
        reasons.push({
          type,
          label: getReasonLabel(type),
          value: info.display
        });
      }
    }
  }

  return reasons;
}

function buildGroupFromStudents(
  students: Siswa[],
  fallbackId: string,
  primaryReason?: DuplicateReason
): DuplicateGroup {
  const completenessMap: Record<string, CompletenessScore> = {};
  students.forEach(s => {
    completenessMap[s.id] = computeSiswaCompleteness(s);
  });

  const sortedStudents = [...students].sort((a, b) => {
    const scoreDiff = completenessMap[b.id].filled - completenessMap[a.id].filled;
    if (scoreDiff !== 0) return scoreDiff;
    if (a.status === 'Aktif' && b.status !== 'Aktif') return -1;
    if (b.status === 'Aktif' && a.status !== 'Aktif') return 1;
    return (a.nama || '').localeCompare(b.nama || '');
  });

  const sharedReasons = collectSharedReasons(sortedStudents);
  const reasons =
    sharedReasons.length > 0
      ? sharedReasons
      : primaryReason
      ? [primaryReason]
      : [];

  const hasIdCollision = reasons.some(
    r => r.type === 'nisn' || r.type === 'nis' || r.type === 'nik'
  );

  // Also flag as high severity if same name AND same class (or same parent/phone)
  const sameNamaAndKelas = (() => {
    if (!reasons.some(r => r.type === 'nama')) return false;
    const kelasSet = new Set<string>();
    for (const s of sortedStudents) {
      const k = (s.kelas || '').trim().toLowerCase();
      if (k && kelasSet.has(k)) return true;
      if (k) kelasSet.add(k);
    }
    return false;
  })();

  const severity: 'high' | 'medium' =
    hasIdCollision || reasons.length >= 2 || sameNamaAndKelas ? 'high' : 'medium';

  return {
    id: fallbackId,
    reasons,
    students: sortedStudents,
    severity,
    recommendedKeepId: sortedStudents[0]?.id || '',
    completenessMap
  };
}

function detectBySingleType(
  siswaList: Siswa[],
  type: DuplicateReasonType
): DuplicateGroup[] {
  const buckets = new Map<string, Siswa[]>();
  for (const s of siswaList) {
    const key = getNormalizedKey(s, type);
    if (!key) continue;
    const arr = buckets.get(key);
    if (arr) {
      arr.push(s);
    } else {
      buckets.set(key, [s]);
    }
  }

  const groups: DuplicateGroup[] = [];
  for (const [key, list] of buckets.entries()) {
    if (list.length < 2) continue;
    groups.push(
      buildGroupFromStudents(list, `${type}:${key}`, {
        type,
        label: getReasonLabel(type),
        value: getRawDisplayValue(list[0], type)
      })
    );
  }

  return sortGroups(groups);
}

function sortGroups(groups: DuplicateGroup[]): DuplicateGroup[] {
  return [...groups].sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
    if (b.students.length !== a.students.length) return b.students.length - a.students.length;
    return (a.students[0]?.nama || '').localeCompare(b.students[0]?.nama || '');
  });
}

export function summarizeSiswaDuplicates(siswaList: Siswa[]): DuplicateSummary {
  const groupsByType: Record<DuplicateReasonType, DuplicateGroup[]> = {
    nisn: detectBySingleType(siswaList, 'nisn'),
    nis: detectBySingleType(siswaList, 'nis'),
    nik: detectBySingleType(siswaList, 'nik'),
    nama: detectBySingleType(siswaList, 'nama')
  };

  // Union-Find across all duplicate criteria so overlapping rows form one unified group
  const indexById = new Map<string, number>();
  siswaList.forEach((s, i) => indexById.set(s.id, i));

  const parent = siswaList.map((_, i) => i);
  const find = (x: number): number => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]];
      x = parent[x];
    }
    return x;
  };
  const union = (a: number, b: number) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[rb] = ra;
  };

  const types: DuplicateReasonType[] = ['nisn', 'nis', 'nik', 'nama'];
  for (const type of types) {
    for (const g of groupsByType[type]) {
      const firstIdx = indexById.get(g.students[0].id);
      if (firstIdx === undefined) continue;
      for (let i = 1; i < g.students.length; i++) {
        const idx = indexById.get(g.students[i].id);
        if (idx !== undefined) union(firstIdx, idx);
      }
    }
  }

  const componentMap = new Map<number, Siswa[]>();
  siswaList.forEach((s, i) => {
    const root = find(i);
    const arr = componentMap.get(root);
    if (arr) {
      arr.push(s);
    } else {
      componentMap.set(root, [s]);
    }
  });

  const allGroups: DuplicateGroup[] = [];
  for (const [root, members] of componentMap.entries()) {
    if (members.length < 2) continue;
    allGroups.push(buildGroupFromStudents(members, `group:${root}`));
  }

  const sortedAll = sortGroups(allGroups);
  const totalDuplicateRows = sortedAll.reduce((sum, g) => sum + g.students.length, 0);
  const totalRedundantRows = sortedAll.reduce((sum, g) => sum + Math.max(0, g.students.length - 1), 0);

  return {
    allGroups: sortedAll,
    groupsByType,
    totalGroups: sortedAll.length,
    totalDuplicateRows,
    totalRedundantRows
  };
}

/**
 * Losslessly merges non-empty fields from redundant duplicate records into the primary kept record.
 */
export function mergeSiswaRecords(primary: Siswa, others: Siswa[]): Siswa {
  const merged: Siswa = { ...primary };

  const stringFields: Array<keyof Siswa> = [
    'nis',
    'nisn',
    'nik',
    'nama',
    'kelas',
    'rombel',
    'tempatLahir',
    'tanggalLahir',
    'agama',
    'alamat',
    'alamatLengkap',
    'namaWali',
    'teleponWali',
    'fotoUrl',
    'email',
    'asalSekolah',
    'golonganDarah',
    'namaAyah',
    'nikAyah',
    'tempatLahirAyah',
    'tanggalLahirAyah',
    'pendidikanAyah',
    'pekerjaanAyah',
    'penghasilanAyah',
    'namaIbu',
    'nikIbu',
    'tempatLahirIbu',
    'tanggalLahirIbu',
    'pendidikanIbu',
    'pekerjaanIbu',
    'penghasilanIbu',
    'tempatLahirOrtu',
    'tanggalLahirOrtu',
    'pendidikanOrtu',
    'pekerjaanOrtu',
    'nikOrtu'
  ];

  for (const field of stringFields) {
    const currentVal = merged[field];
    const isEmptyCurrent =
      !isMeaningfulString(currentVal) ||
      (field === 'kelas' && String(currentVal || '').toLowerCase() === 'belum ada kelas');

    if (isEmptyCurrent) {
      for (const other of others) {
        const candidate = other[field];
        const isGoodCandidate =
          isMeaningfulString(candidate) &&
          !(field === 'kelas' && String(candidate || '').toLowerCase() === 'belum ada kelas');
        if (isGoodCandidate) {
          (merged as unknown as Record<string, unknown>)[field] = candidate;
          break;
        }
      }
    }
  }

  const numberFields: Array<keyof Siswa> = [
    'beratBadan',
    'tinggiBadan',
    'anakKe',
    'jumlahSaudara'
  ];
  for (const field of numberFields) {
    const cur = merged[field] as number | undefined;
    if (!cur || cur <= 0) {
      for (const other of others) {
        const cand = other[field] as number | undefined;
        if (cand && cand > 0) {
          (merged as unknown as Record<string, unknown>)[field] = cand;
          break;
        }
      }
    }
  }

  return merged;
}
