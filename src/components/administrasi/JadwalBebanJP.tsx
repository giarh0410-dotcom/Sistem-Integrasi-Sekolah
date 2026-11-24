import React, { useMemo, useState } from 'react';
import {
  Gauge,
  Users,
  BookOpen,
  School,
  Search,
  SlidersHorizontal,
  FileDown,
  Printer,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Pencil,
  X,
  Save,
  Clock,
  Award,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  BebanJpConfig,
  DEFAULT_BEBAN_JP_CONFIG,
  ScheduleClassItem,
  ScheduleEntry,
  ScheduleHeaderConfig,
  TeacherBebanJpOverride,
  TeacherMapping,
  TUGAS_TAMBAHAN_PRESETS,
  calculateSlotJp,
  parseTimeRangeMinutes,
} from '../../types/scheduleData';
import { SchoolSettings } from '../../types/school';
import { INITIAL_SCHOOL_SETTINGS } from '../../data/mockData';
import {
  BebanJpRowExport,
  downloadBebanJpPdf,
  printBebanJpViaIframe,
} from '../../lib/jadwalPdf';

interface JadwalBebanJPProps {
  timeSlots: string[];
  teacherMappings: TeacherMapping[];
  masterSchedule: ScheduleEntry[];
  scheduleClasses: ScheduleClassItem[];
  headerConfig: ScheduleHeaderConfig;
  bebanJpConfig: BebanJpConfig;
  schoolSettings?: SchoolSettings;
  canEdit?: boolean;
  onUpdateBebanJpConfig?: (next: BebanJpConfig) => Promise<void>;
  onJumpToTeacherOnBoard?: (teacherCode: string) => void;
}

const DAYS_LIST = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];

const SPECIAL_ACTIVITY_KEYWORDS = [
  'UPACARA',
  'SHOLAT',
  'ISTIRAHAT',
  'PRAMUKA',
  'MUHADHOROH',
  'TEMU WALAS',
  'EKSTRAKURIKULER',
  'EKSKUL',
];

function timeToMinutes(t: string): number {
  if (!t) return 0;
  const clean = t.replace(/[:.]/g, '.').trim();
  const [h, m] = clean.split('.').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function isSpecialEntry(entry: ScheduleEntry): boolean {
  if (entry.isKegiatan) return true;
  const clsUpper = (entry.classId || '').trim().toUpperCase();
  if (clsUpper === 'SEMUA KELAS' || clsUpper === 'SEMUA') return true;
  const subjUpper = (entry.subject || '').toUpperCase();
  return SPECIAL_ACTIVITY_KEYWORDS.some((kw) => subjUpper.includes(kw));
}

function classMatchesEntry(entryClassRaw: string | undefined, cls: ScheduleClassItem): boolean {
  const eClass = (entryClassRaw || '').trim().toLowerCase();
  if (!eClass || eClass === 'semua kelas' || eClass === 'semua') return false;
  const targetId = cls.id.trim().toLowerCase();
  const targetName = cls.name.trim().toLowerCase();
  if (eClass === targetId || eClass === targetName) return true;

  const targetSuffix = targetName.includes('-')
    ? targetName.split('-').slice(1).join('-').trim()
    : targetName;
  const entrySuffix = eClass.includes('-')
    ? eClass.split('-').slice(1).join('-').trim()
    : eClass;

  if (targetSuffix.length >= 4 && entrySuffix === targetSuffix) {
    const gradeOf = (s: string) => {
      if (/\bviii\b/i.test(s)) return '8';
      if (/\bvii\b/i.test(s)) return '7';
      if (/\bix\b/i.test(s)) return '9';
      return '';
    };
    const g1 = gradeOf(eClass);
    const g2 = gradeOf(targetName);
    if (!g1 || !g2 || g1 === g2) return true;
  }
  return false;
}

interface TeacherWorkloadStat {
  teacher: TeacherMapping;
  dailyJp: Record<string, number>;
  sesiCount: number;
  jpTatapMuka: number;
  totalMinutes: number;
  tugasTambahan: string;
  ekuivalensiJp: number;
  totalJp: number;
  targetMinJp: number;
  targetMaxJp: number;
  catatan: string;
  statusKey: 'kosong' | 'kurang' | 'ideal' | 'overload';
  statusLabel: string;
  classesMap: Record<string, { jp: number; subjects: Set<string> }>;
  subjectsMap: Record<string, number>;
  sessions: Array<{ day: string; time: string; className: string; subject: string; jp: number }>;
}

export const JadwalBebanJP: React.FC<JadwalBebanJPProps> = ({
  timeSlots,
  teacherMappings,
  masterSchedule,
  scheduleClasses,
  headerConfig,
  bebanJpConfig = DEFAULT_BEBAN_JP_CONFIG,
  schoolSettings,
  canEdit = false,
  onUpdateBebanJpConfig,
  onJumpToTeacherOnBoard,
}) => {
  const [subView, setSubView] = useState<'guru' | 'kelas' | 'mapel'>('guru');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'semua' | 'ideal' | 'kurang' | 'overload' | 'kosong'>('semua');
  const [sortBy, setSortBy] = useState<'code' | 'jp_desc' | 'jp_asc' | 'name'>('code');
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [expandedTeacherCode, setExpandedTeacherCode] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'info'; text: string } | null>(null);

  // Modal edit target & tugas tambahan per guru
  const [editingTeacher, setEditingTeacher] = useState<TeacherWorkloadStat | null>(null);
  const [overrideForm, setOverrideForm] = useState<TeacherBebanJpOverride>({
    targetJp: bebanJpConfig.defaultMinJp,
    maxJp: bebanJpConfig.defaultMaxJp,
    tugasTambahan: '',
    ekuivalensiJp: 0,
    catatan: '',
  });

  // Draft config state for standards panel
  const [draftConfig, setDraftConfig] = useState({
    menitPerJp: bebanJpConfig.menitPerJp,
    hitungMode: bebanJpConfig.hitungMode,
    defaultMinJp: bebanJpConfig.defaultMinJp,
    defaultMaxJp: bebanJpConfig.defaultMaxJp,
    targetJpPerKelas: bebanJpConfig.targetJpPerKelas,
  });

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  const resolveTeacherCode = (entry: ScheduleEntry | undefined): string => {
    if (!entry) return '';
    if (entry.teacherCode && entry.teacherCode !== '-' && entry.teacherCode !== '') {
      return entry.teacherCode;
    }
    const mappingByName = teacherMappings.find(
      (t) => t.name.trim().toUpperCase() === (entry.guruName || '').trim().toUpperCase()
    );
    if (mappingByName) return mappingByName.code;

    const subject = (entry.subject || '').toUpperCase();
    const mappingBySubject =
      teacherMappings.find((t) => {
        const tSub = t.subject.toUpperCase();
        if (subject === 'BAHASA INDONESIA' && tSub.includes('BAHASA INDONESIA 7,8')) return true;
        return tSub === subject || tSub.startsWith(subject + ' ');
      }) ||
      teacherMappings.find((t) => {
        const tSub = t.subject.toUpperCase();
        return tSub.includes(subject) || subject.includes(tSub.split(' ')[0]);
      });

    return mappingBySubject?.code || '';
  };

  // Core calculation across all days, time slots, and classes (exact match with JadwalReview grid)
  const analytics = useMemo(() => {
    const teacherMap = new Map<string, TeacherWorkloadStat>();

    teacherMappings.forEach((t) => {
      const ov = bebanJpConfig.overrides?.[t.code];
      const targetMin = ov?.targetJp ?? bebanJpConfig.defaultMinJp;
      const targetMax = ov?.maxJp ?? bebanJpConfig.defaultMaxJp;
      teacherMap.set(t.code, {
        teacher: t,
        dailyJp: { SENIN: 0, SELASA: 0, RABU: 0, KAMIS: 0, JUMAT: 0 },
        sesiCount: 0,
        jpTatapMuka: 0,
        totalMinutes: 0,
        tugasTambahan: ov?.tugasTambahan || '',
        ekuivalensiJp: ov?.ekuivalensiJp || 0,
        totalJp: ov?.ekuivalensiJp || 0,
        targetMinJp: targetMin,
        targetMaxJp: targetMax,
        catatan: ov?.catatan || '',
        statusKey: 'kosong',
        statusLabel: 'Belum Terjadwal',
        classesMap: {},
        subjectsMap: {},
        sessions: [],
      });
    });

    const classStatsMap = new Map<
      string,
      {
        cls: ScheduleClassItem;
        totalJp: number;
        totalSesi: number;
        totalMinutes: number;
        dailyJp: Record<string, number>;
        subjects: Record<string, { jp: number; teachers: Set<string> }>;
      }
    >();

    scheduleClasses.forEach((cls) => {
      classStatsMap.set(cls.id, {
        cls,
        totalJp: 0,
        totalSesi: 0,
        totalMinutes: 0,
        dailyJp: { SENIN: 0, SELASA: 0, RABU: 0, KAMIS: 0, JUMAT: 0 },
        subjects: {},
      });
    });

    const subjectStatsMap = new Map<
      string,
      {
        subject: string;
        totalJp: number;
        totalSesi: number;
        grade7Jp: number;
        grade8Jp: number;
        grade9Jp: number;
        otherGradeJp: number;
        classes: Set<string>;
        teachers: Set<string>;
      }
    >();

    let totalAvailableLessonCells = 0;
    let totalFilledLessonCells = 0;

    DAYS_LIST.forEach((day) => {
      timeSlots.forEach((slot) => {
        const [sStartStr, sEndStr] = slot.split(' - ');
        const sS = timeToMinutes(sStartStr);
        const sE = timeToMinutes(sEndStr);

        const rowEntries = masterSchedule.filter((e) => {
          if ((e.day || '').trim().toUpperCase() !== day) return false;
          const [eStartStr, eEndStr] = (e.time || '').split(' - ');
          const eS = timeToMinutes(eStartStr);
          const eE = timeToMinutes(eEndStr);
          return eS < sE && eE > sS;
        });

        const special = rowEntries.find((e) => isSpecialEntry(e));
        if (special) return;

        const slotJp = calculateSlotJp(slot, bebanJpConfig);
        const slotMins = parseTimeRangeMinutes(slot);

        scheduleClasses.forEach((cls) => {
          totalAvailableLessonCells += 1;
          const entry = rowEntries.find((e) => !isSpecialEntry(e) && classMatchesEntry(e.classId, cls));
          if (!entry) return;

          totalFilledLessonCells += 1;
          const code = resolveTeacherCode(entry);
          const subjectName = (entry.subject || 'Mata Pelajaran').trim();

          // Update Class Stats
          const cStat = classStatsMap.get(cls.id);
          if (cStat) {
            cStat.totalJp += slotJp;
            cStat.totalSesi += 1;
            cStat.totalMinutes += slotMins;
            cStat.dailyJp[day] = (cStat.dailyJp[day] || 0) + slotJp;
            if (!cStat.subjects[subjectName]) {
              cStat.subjects[subjectName] = { jp: 0, teachers: new Set() };
            }
            cStat.subjects[subjectName].jp += slotJp;
            if (code) cStat.subjects[subjectName].teachers.add(code);
          }

          // Update Subject Stats
          const subjKey = subjectName.toUpperCase();
          if (!subjectStatsMap.has(subjKey)) {
            subjectStatsMap.set(subjKey, {
              subject: subjectName,
              totalJp: 0,
              totalSesi: 0,
              grade7Jp: 0,
              grade8Jp: 0,
              grade9Jp: 0,
              otherGradeJp: 0,
              classes: new Set(),
              teachers: new Set(),
            });
          }
          const sStat = subjectStatsMap.get(subjKey)!;
          sStat.totalJp += slotJp;
          sStat.totalSesi += 1;
          sStat.classes.add(cls.name);
          if (code) {
            const tm = teacherMappings.find((t) => t.code === code);
            sStat.teachers.add(tm ? `${tm.code} - ${tm.name}` : code);
          }
          const clsUp = cls.name.toUpperCase();
          if (/\bVIII\b/.test(clsUp)) sStat.grade8Jp += slotJp;
          else if (/\bVII\b/.test(clsUp)) sStat.grade7Jp += slotJp;
          else if (/\bIX\b/.test(clsUp)) sStat.grade9Jp += slotJp;
          else sStat.otherGradeJp += slotJp;

          // Update Teacher Stats
          if (code && code !== '-') {
            if (!teacherMap.has(code)) {
              const ov = bebanJpConfig.overrides?.[code];
              teacherMap.set(code, {
                teacher: { code, name: entry.guruName || `Guru (${code})`, subject: subjectName },
                dailyJp: { SENIN: 0, SELASA: 0, RABU: 0, KAMIS: 0, JUMAT: 0 },
                sesiCount: 0,
                jpTatapMuka: 0,
                totalMinutes: 0,
                tugasTambahan: ov?.tugasTambahan || '',
                ekuivalensiJp: ov?.ekuivalensiJp || 0,
                totalJp: ov?.ekuivalensiJp || 0,
                targetMinJp: ov?.targetJp ?? bebanJpConfig.defaultMinJp,
                targetMaxJp: ov?.maxJp ?? bebanJpConfig.defaultMaxJp,
                catatan: ov?.catatan || '',
                statusKey: 'kosong',
                statusLabel: 'Belum Terjadwal',
                classesMap: {},
                subjectsMap: {},
                sessions: [],
              });
            }
            const tStat = teacherMap.get(code)!;
            tStat.dailyJp[day] = (tStat.dailyJp[day] || 0) + slotJp;
            tStat.sesiCount += 1;
            tStat.jpTatapMuka += slotJp;
            tStat.totalMinutes += slotMins;
            tStat.subjectsMap[subjectName] = (tStat.subjectsMap[subjectName] || 0) + slotJp;
            if (!tStat.classesMap[cls.name]) {
              tStat.classesMap[cls.name] = { jp: 0, subjects: new Set() };
            }
            tStat.classesMap[cls.name].jp += slotJp;
            tStat.classesMap[cls.name].subjects.add(subjectName);
            tStat.sessions.push({ day, time: slot, className: cls.name, subject: subjectName, jp: slotJp });
          }
        });
      });
    });

    // Finalize teacher totals and compliance statuses
    const teacherList: TeacherWorkloadStat[] = Array.from(teacherMap.values()).map((stat) => {
      const totalJp = stat.jpTatapMuka + stat.ekuivalensiJp;
      let statusKey: TeacherWorkloadStat['statusKey'] = 'kosong';
      let statusLabel = 'Belum Terjadwal';

      if (totalJp === 0) {
        statusKey = 'kosong';
        statusLabel = 'Belum Terjadwal';
      } else if (totalJp < stat.targetMinJp) {
        statusKey = 'kurang';
        statusLabel = `Kurang ${stat.targetMinJp - totalJp} JP`;
      } else if (totalJp > stat.targetMaxJp) {
        statusKey = 'overload';
        statusLabel = `Overload +${totalJp - stat.targetMaxJp} JP`;
      } else {
        statusKey = 'ideal';
        statusLabel = 'Memenuhi Target';
      }

      return { ...stat, totalJp, statusKey, statusLabel };
    });

    const classList = Array.from(classStatsMap.values());
    const subjectList = Array.from(subjectStatsMap.values()).sort((a, b) => b.totalJp - a.totalJp);

    const totalJpTatapMuka = teacherList.reduce((sum, t) => sum + t.jpTatapMuka, 0);
    const totalJpTambahan = teacherList.reduce((sum, t) => sum + t.ekuivalensiJp, 0);
    const totalJpKeseluruhan = teacherList.reduce((sum, t) => sum + t.totalJp, 0);
    const totalSesi = teacherList.reduce((sum, t) => sum + t.sesiCount, 0);
    const totalMinutesAll = teacherList.reduce((sum, t) => sum + t.totalMinutes, 0);
    const activeTeachers = teacherList.filter((t) => t.totalJp > 0).length;
    const idealCount = teacherList.filter((t) => t.statusKey === 'ideal').length;
    const kurangCount = teacherList.filter((t) => t.statusKey === 'kurang').length;
    const overloadCount = teacherList.filter((t) => t.statusKey === 'overload').length;
    const kosongCount = teacherList.filter((t) => t.statusKey === 'kosong').length;
    const avgJpPerTeacher = teacherList.length > 0 ? totalJpKeseluruhan / teacherList.length : 0;
    const avgJpPerClass =
      classList.length > 0
        ? classList.reduce((s, c) => s + c.totalJp, 0) / classList.length
        : 0;

    return {
      teacherList,
      classList,
      subjectList,
      totalJpTatapMuka,
      totalJpTambahan,
      totalJpKeseluruhan,
      totalSesi,
      totalMinutesAll,
      activeTeachers,
      idealCount,
      kurangCount,
      overloadCount,
      kosongCount,
      avgJpPerTeacher,
      avgJpPerClass,
      totalAvailableLessonCells,
      totalFilledLessonCells,
    };
  }, [masterSchedule, timeSlots, scheduleClasses, teacherMappings, bebanJpConfig]);

  // Filtered & sorted teachers
  const filteredTeachers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = analytics.teacherList.filter((t) => {
      if (statusFilter !== 'semua' && t.statusKey !== statusFilter) return false;
      if (!q) return true;
      return (
        t.teacher.code.toLowerCase().includes(q) ||
        t.teacher.name.toLowerCase().includes(q) ||
        t.teacher.subject.toLowerCase().includes(q) ||
        t.tugasTambahan.toLowerCase().includes(q)
      );
    });

    list = [...list].sort((a, b) => {
      if (sortBy === 'jp_desc') return b.totalJp - a.totalJp || a.teacher.code.localeCompare(b.teacher.code);
      if (sortBy === 'jp_asc') return a.totalJp - b.totalJp || a.teacher.code.localeCompare(b.teacher.code);
      if (sortBy === 'name') return a.teacher.name.localeCompare(b.teacher.name);
      return a.teacher.code.localeCompare(b.teacher.code, undefined, { numeric: true });
    });

    return list;
  }, [analytics.teacherList, searchQuery, statusFilter, sortBy]);

  // Save global JP standards
  const handleSaveStandards = async () => {
    if (!onUpdateBebanJpConfig) return;
    const menit = Math.max(15, Math.min(90, Number(draftConfig.menitPerJp) || 40));
    const minJp = Math.max(1, Math.min(60, Number(draftConfig.defaultMinJp) || 24));
    const maxJp = Math.max(minJp, Math.min(80, Number(draftConfig.defaultMaxJp) || 36));
    const targetKelas = Math.max(10, Math.min(70, Number(draftConfig.targetJpPerKelas) || 40));

    await onUpdateBebanJpConfig({
      ...bebanJpConfig,
      menitPerJp: menit,
      hitungMode: draftConfig.hitungMode,
      defaultMinJp: minJp,
      defaultMaxJp: maxJp,
      targetJpPerKelas: targetKelas,
    });
    setShowConfigPanel(false);
    showToast('Standar perhitungan Beban JP berhasil disimpan ke database.');
  };

  // Open teacher override modal
  const openTeacherModal = (stat: TeacherWorkloadStat) => {
    setEditingTeacher(stat);
    setOverrideForm({
      targetJp: stat.targetMinJp,
      maxJp: stat.targetMaxJp,
      tugasTambahan: stat.tugasTambahan,
      ekuivalensiJp: stat.ekuivalensiJp,
      catatan: stat.catatan,
    });
  };

  const handleSaveTeacherOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeacher || !onUpdateBebanJpConfig) return;
    const code = editingTeacher.teacher.code;
    const minVal = Math.max(1, Number(overrideForm.targetJp) || bebanJpConfig.defaultMinJp);
    const maxVal = Math.max(minVal, Number(overrideForm.maxJp) || bebanJpConfig.defaultMaxJp);
    const ekuiVal = Math.max(0, Math.min(36, Number(overrideForm.ekuivalensiJp) || 0));

    const nextOverrides: Record<string, TeacherBebanJpOverride> = {
      ...(bebanJpConfig.overrides || {}),
      [code]: {
        targetJp: minVal,
        maxJp: maxVal,
        tugasTambahan: (overrideForm.tugasTambahan || '').trim(),
        ekuivalensiJp: ekuiVal,
        catatan: (overrideForm.catatan || '').trim(),
      },
    };

    await onUpdateBebanJpConfig({
      ...bebanJpConfig,
      overrides: nextOverrides,
    });
    setEditingTeacher(null);
    showToast(`Target & Tugas Tambahan ${editingTeacher.teacher.name} berhasil diperbarui.`);
  };

  // Export helpers
  const buildExportRows = (): BebanJpRowExport[] =>
    filteredTeachers.map((t) => ({
      code: t.teacher.code,
      name: t.teacher.name,
      subject: t.teacher.subject,
      dailyJp: t.dailyJp,
      sesiCount: t.sesiCount,
      jpTatapMuka: t.jpTatapMuka,
      tugasTambahan: t.tugasTambahan,
      ekuivalensiJp: t.ekuivalensiJp,
      totalJp: t.totalJp,
      targetMinJp: t.targetMinJp,
      targetMaxJp: t.targetMaxJp,
      statusLabel: t.statusLabel,
      statusKey: t.statusKey,
    }));

  const exportParams = {
    header: headerConfig,
    logoUrl: schoolSettings?.logoUrl || INITIAL_SCHOOL_SETTINGS.logoUrl,
    kepalaSekolah: schoolSettings?.kepalaSekolah || INITIAL_SCHOOL_SETTINGS.kepalaSekolah,
    nipKepalaSekolah: schoolSettings?.nipKepalaSekolah || INITIAL_SCHOOL_SETTINGS.nipKepalaSekolah,
    menitPerJp: bebanJpConfig.menitPerJp,
    hitungMode: bebanJpConfig.hitungMode,
    defaultMinJp: bebanJpConfig.defaultMinJp,
    defaultMaxJp: bebanJpConfig.defaultMaxJp,
    rows: buildExportRows(),
  };

  const handleExportPdf = async () => {
    await downloadBebanJpPdf(exportParams);
    showToast('PDF Rekap Beban JP Guru berhasil diunduh.');
  };

  const handlePrint = () => {
    printBebanJpViaIframe(exportParams);
  };

  const handleExportCsv = () => {
    const headers = [
      'No',
      'Kode',
      'Nama Guru',
      'Mata Pelajaran',
      'Senin (JP)',
      'Selasa (JP)',
      'Rabu (JP)',
      'Kamis (JP)',
      'Jumat (JP)',
      'JP Tatap Muka',
      'Tugas Tambahan',
      'Ekuivalensi (+JP)',
      'Total Beban JP',
      'Target Min JP',
      'Batas Maks JP',
      'Status',
    ];
    const escapeCsv = (val: string | number) => `"${String(val).replace(/"/g, '""')}"`;
    const csvLines = [
      headers.map(escapeCsv).join(','),
      ...filteredTeachers.map((t, i) =>
        [
          i + 1,
          t.teacher.code,
          t.teacher.name,
          t.teacher.subject,
          t.dailyJp.SENIN || 0,
          t.dailyJp.SELASA || 0,
          t.dailyJp.RABU || 0,
          t.dailyJp.KAMIS || 0,
          t.dailyJp.JUMAT || 0,
          t.jpTatapMuka,
          t.tugasTambahan || '-',
          t.ekuivalensiJp,
          t.totalJp,
          t.targetMinJp,
          t.targetMaxJp,
          t.statusLabel,
        ]
          .map(escapeCsv)
          .join(',')
      ),
    ];

    const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap_Beban_JP_${headerConfig.tahunAjaran.replace(/[^a-zA-Z0-9_-]/g, '_')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('File CSV Rekap Beban JP berhasil diunduh.');
  };

  const getClassHeaderBadge = (className: string) => {
    const up = className.toUpperCase();
    if (up.includes('VIII')) return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
    if (up.includes('VII')) return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    if (up.includes('IX')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-slate-900 text-slate-200 border-slate-800';
  };

  const maxSubjectJp = Math.max(1, ...analytics.subjectList.map((s) => s.totalJp));

  return (
    <div className="space-y-5">
      {/* Floating Toast */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-xl bg-emerald-950 text-emerald-100 border border-emerald-500/60 shadow-2xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* =====================================================================
          DARK HEADER CONTROL BAR (CONSISTENT WITH PAPAN JADWAL INTERAKTIF)
         ===================================================================== */}
      <div className="bg-slate-950 text-white p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-lg space-y-4">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 rounded-xl">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight flex flex-wrap items-center gap-2">
                <span>Beban Jam Pelajaran (JP) Guru</span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-extrabold uppercase">
                  {bebanJpConfig.hitungMode === 'durasi'
                    ? `1 JP = ${bebanJpConfig.menitPerJp} Menit`
                    : '1 Slot = 1 JP'}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-extrabold uppercase">
                  Standar {bebanJpConfig.defaultMinJp}–{bebanJpConfig.defaultMaxJp} JP/Mg
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Rekap otomatis dari Papan Jadwal • {headerConfig.semester} • T.A. {headerConfig.tahunAjaran} •{' '}
                {headerConfig.namaSekolah}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setDraftConfig({
                    menitPerJp: bebanJpConfig.menitPerJp,
                    hitungMode: bebanJpConfig.hitungMode,
                    defaultMinJp: bebanJpConfig.defaultMinJp,
                    defaultMaxJp: bebanJpConfig.defaultMaxJp,
                    targetJpPerKelas: bebanJpConfig.targetJpPerKelas,
                  });
                  setShowConfigPanel((p) => !p);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  showConfigPanel
                    ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border-slate-600'
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Standar JP</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleExportCsv}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Collapsible Standards Config Drawer */}
        {canEdit && showConfigPanel && (
          <div className="p-4 rounded-xl bg-slate-900 border border-cyan-500/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Konfigurasi Standar Perhitungan Beban JP (Tersimpan di Database)</span>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigPanel(false)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Mode Hitung JP</label>
                <select
                  value={draftConfig.hitungMode}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, hitungMode: e.target.value as 'durasi' | 'slot' })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none focus:border-cyan-400"
                >
                  <option value="durasi">Otomatis per Durasi Menit</option>
                  <option value="slot">1 Slot Jadwal = 1 JP</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Durasi 1 JP (Menit)
                </label>
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    min={15}
                    max={90}
                    disabled={draftConfig.hitungMode === 'slot'}
                    value={draftConfig.menitPerJp}
                    onChange={(e) =>
                      setDraftConfig({ ...draftConfig, menitPerJp: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none focus:border-cyan-400 disabled:opacity-40"
                  />
                  {[35, 40, 45].map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={draftConfig.hitungMode === 'slot'}
                      onClick={() => setDraftConfig({ ...draftConfig, menitPerJp: m })}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black border cursor-pointer disabled:opacity-40 ${
                        draftConfig.menitPerJp === m
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Target Minimal Guru (JP/Mg)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={draftConfig.defaultMinJp}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, defaultMinJp: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Batas Maksimal Guru (JP/Mg)
                </label>
                <input
                  type="number"
                  min={1}
                  max={80}
                  value={draftConfig.defaultMaxJp}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, defaultMaxJp: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">
                  Target JP per Kelas/Mg
                </label>
                <input
                  type="number"
                  min={10}
                  max={70}
                  value={draftConfig.targetJpPerKelas}
                  onChange={(e) =>
                    setDraftConfig({ ...draftConfig, targetJpPerKelas: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs font-bold text-white outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800">
              <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                <span>
                  Pada mode durasi 40 menit/JP, slot <b>07.35 - 08.55</b> (80 mnt) otomatis dihitung <b>2 JP</b>, sedangkan slot 40 menit dihitung <b>1 JP</b>.
                </span>
              </p>
              <button
                type="button"
                onClick={handleSaveStandards}
                className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Standar JP</span>
              </button>
            </div>
          </div>
        )}

        {/* Sub-View Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSubView('guru')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'guru'
                  ? 'bg-sky-600/25 border-sky-400 text-sky-200 shadow-sm'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Beban JP per Guru ({analytics.teacherList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('kelas')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'kelas'
                  ? 'bg-sky-600/25 border-sky-400 text-sky-200 shadow-sm'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <School className="w-3.5 h-3.5" />
              <span>Rekap JP per Kelas ({analytics.classList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSubView('mapel')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                subView === 'mapel'
                  ? 'bg-sky-600/25 border-sky-400 text-sky-200 shadow-sm'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Rekap JP per Mapel ({analytics.subjectList.length})</span>
            </button>
          </div>

          <div className="text-[11px] font-bold text-slate-400 flex items-center gap-3">
            <span>
              Slot Terisi:{' '}
              <b className="text-white">
                {analytics.totalFilledLessonCells} / {analytics.totalAvailableLessonCells}
              </b>
            </span>
            <span>•</span>
            <span>
              Jam Efektif:{' '}
              <b className="text-emerald-300">
                {(analytics.totalMinutesAll / 60).toFixed(1)} Jam/Mg
              </b>
            </span>
          </div>
        </div>
      </div>

      {/* =====================================================================
          4 KPI SUMMARY METRIC CARDS (DARK THEME)
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Beban JP / Minggu
            </span>
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/30">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tabular-nums">
              {analytics.totalJpKeseluruhan}
            </span>
            <span className="text-xs font-bold text-sky-400">JP Total</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Tatap muka: <b className="text-slate-200">{analytics.totalJpTatapMuka} JP</b> • Tambahan:{' '}
            <b className="text-emerald-400">+{analytics.totalJpTambahan} JP</b>
          </p>
        </div>

        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Rata-Rata Beban / Guru
            </span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tabular-nums">
              {analytics.avgJpPerTeacher.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-cyan-400">JP / Guru</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            <b className="text-slate-200">{analytics.activeTeachers}</b> dari{' '}
            <b className="text-slate-200">{analytics.teacherList.length}</b> guru sudah memiliki beban JP
          </p>
        </div>

        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Status Kepatuhan JP
            </span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-black">
              {analytics.idealCount} Ideal
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 text-xs font-black">
              {analytics.kurangCount} Kurang
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-xs font-black">
              {analytics.overloadCount} Overload
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1.5 font-medium">
            Belum terjadwal: <b className="text-slate-200">{analytics.kosongCount} guru</b>
          </p>
        </div>

        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Rata-Rata JP / Kelas
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white tabular-nums">
              {analytics.avgJpPerClass.toFixed(1)}
            </span>
            <span className="text-xs font-bold text-indigo-400">
              / {bebanJpConfig.targetJpPerKelas} JP Target
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 font-medium">
            Mencakup <b className="text-slate-200">{analytics.classList.length} rombel</b> &amp;{' '}
            <b className="text-slate-200">{analytics.subjectList.length} mapel</b> aktif
          </p>
        </div>
      </div>

      {/* =====================================================================
          SUB-VIEW 1: BEBAN JP PER GURU (DARK TABLE + DETAIL + OVERRIDE MODAL)
         ===================================================================== */}
      {subView === 'guru' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
          {/* Filter & Search Bar */}
          <div className="p-4 bg-slate-900/70 border-b border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kode guru, nama guru, mapel, atau tugas tambahan..."
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-semibold text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                {(
                  [
                    { id: 'semua', label: 'Semua', count: analytics.teacherList.length },
                    { id: 'ideal', label: 'Ideal', count: analytics.idealCount },
                    { id: 'kurang', label: 'Kurang JP', count: analytics.kurangCount },
                    { id: 'overload', label: 'Overload', count: analytics.overloadCount },
                    { id: 'kosong', label: 'Kosong', count: analytics.kosongCount },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setStatusFilter(tab.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer border ${
                      statusFilter === tab.id
                        ? 'bg-sky-500/20 text-cyan-300 border-cyan-500/40 shadow-xs'
                        : 'border-transparent text-slate-400 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    {tab.label} <span className="opacity-75">({tab.count})</span>
                  </button>
                ))}
              </div>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-slate-200 outline-none focus:border-cyan-400"
              >
                <option value="code">Urut: Kode Guru</option>
                <option value="jp_desc">Urut: Total JP Tertinggi</option>
                <option value="jp_asc">Urut: Total JP Terendah</option>
                <option value="name">Urut: Nama A–Z</option>
              </select>
            </div>
          </div>

          {/* Main Teacher Beban JP Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase text-slate-400">
                  <th className="p-3 text-left w-10">No</th>
                  <th className="p-3 text-left min-w-[210px]">Guru &amp; Mata Pelajaran</th>
                  <th className="p-2 text-center">Sen</th>
                  <th className="p-2 text-center">Sel</th>
                  <th className="p-2 text-center">Rab</th>
                  <th className="p-2 text-center">Kam</th>
                  <th className="p-2 text-center">Jum</th>
                  <th className="p-3 text-center">Tatap Muka</th>
                  <th className="p-3 text-left min-w-[140px]">Tugas Tambahan</th>
                  <th className="p-3 text-left min-w-[165px]">Total Beban vs Target</th>
                  <th className="p-3 text-center">Status</th>
                  <th className="p-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredTeachers.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="p-10 text-center text-slate-500 font-semibold">
                      Tidak ada data guru yang sesuai dengan filter pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredTeachers.map((row, idx) => {
                    const pct = Math.min(100, Math.round((row.totalJp / Math.max(1, row.targetMinJp)) * 100));
                    const isExpanded = expandedTeacherCode === row.teacher.code;
                    const barColor =
                      row.statusKey === 'ideal'
                        ? 'bg-emerald-500'
                        : row.statusKey === 'overload'
                        ? 'bg-rose-500'
                        : row.statusKey === 'kurang'
                        ? 'bg-amber-400'
                        : 'bg-slate-700';

                    const badgeClass =
                      row.statusKey === 'ideal'
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : row.statusKey === 'overload'
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : row.statusKey === 'kurang'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-slate-800 text-slate-400 border-slate-700';

                    return (
                      <React.Fragment key={row.teacher.code}>
                        <tr className="hover:bg-slate-900/70 transition-colors">
                          <td className="p-3 text-slate-500 font-bold">{idx + 1}</td>
                          <td className="p-3">
                            <div className="flex items-start gap-2.5">
                              <span className="px-2 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 font-black text-[11px] shrink-0">
                                {row.teacher.code}
                              </span>
                              <div className="min-w-0">
                                <div className="font-bold text-slate-100 leading-snug">
                                  {row.teacher.name}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate max-w-[230px]">
                                  {row.teacher.subject || '-'}
                                </div>
                              </div>
                            </div>
                          </td>
                          {DAYS_LIST.map((day) => {
                            const val = row.dailyJp[day] || 0;
                            return (
                              <td key={day} className="p-2 text-center">
                                <span
                                  className={`inline-flex items-center justify-center w-7 h-7 rounded-lg text-[11px] font-black tabular-nums ${
                                    val > 0
                                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                                      : 'text-slate-600'
                                  }`}
                                >
                                  {val}
                                </span>
                              </td>
                            );
                          })}
                          <td className="p-3 text-center">
                            <div className="font-black text-white text-sm tabular-nums">
                              {row.jpTatapMuka} JP
                            </div>
                            <div className="text-[10px] text-slate-400 font-semibold">
                              {row.sesiCount} sesi
                            </div>
                          </td>
                          <td className="p-3">
                            {row.tugasTambahan || row.ekuivalensiJp > 0 ? (
                              <div>
                                <div className="font-bold text-slate-200 text-[11px] leading-tight">
                                  {row.tugasTambahan || 'Tugas Tambahan'}
                                </div>
                                <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-black">
                                  +{row.ekuivalensiJp} JP
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-600 text-[11px] italic">—</span>
                            )}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-between text-[11px] mb-1">
                              <span className="font-black text-white tabular-nums">
                                {row.totalJp} JP
                              </span>
                              <span className="text-slate-400 font-bold tabular-nums">
                                Target {row.targetMinJp}–{row.targetMaxJp}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${barColor}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[10px] font-black whitespace-nowrap ${badgeClass}`}
                            >
                              {row.statusKey === 'ideal' && <CheckCircle2 className="w-3 h-3" />}
                              {(row.statusKey === 'overload' || row.statusKey === 'kurang') && (
                                <AlertTriangle className="w-3 h-3" />
                              )}
                              <span>{row.statusLabel}</span>
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTeacherCode(isExpanded ? null : row.teacher.code)
                                }
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
                                title="Lihat rincian kelas & mapel"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                              {canEdit && (
                                <button
                                  type="button"
                                  onClick={() => openTeacherModal(row)}
                                  className="p-1.5 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 cursor-pointer"
                                  title="Atur Target JP & Tugas Tambahan"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {onJumpToTeacherOnBoard && (
                                <button
                                  type="button"
                                  onClick={() => onJumpToTeacherOnBoard(row.teacher.code)}
                                  className="p-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 cursor-pointer"
                                  title="Sorot guru ini di Papan Jadwal"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>

                        {/* Expandable Breakdown Row */}
                        {isExpanded && (
                          <tr className="bg-slate-900/90">
                            <td colSpan={12} className="p-4 border-t border-slate-800">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-[11px] font-black uppercase text-slate-400 mb-2">
                                    Rincian Beban JP per Kelas / Rombel
                                  </div>
                                  {Object.keys(row.classesMap).length === 0 ? (
                                    <p className="text-xs text-slate-500 italic">
                                      Belum ada jadwal tatap muka di papan jadwal.
                                    </p>
                                  ) : (
                                    <div className="flex flex-wrap gap-2">
                                      {Object.entries(row.classesMap).map(([clsName, info]) => (
                                        <div
                                          key={clsName}
                                          className="px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 shadow-xs"
                                        >
                                          <div className="text-xs font-black text-slate-100">
                                            {clsName}{' '}
                                            <span className="text-cyan-400">({info.jp} JP)</span>
                                          </div>
                                          <div className="text-[10px] text-slate-400 mt-0.5">
                                            {Array.from(info.subjects).join(', ')}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                <div>
                                  <div className="text-[11px] font-black uppercase text-slate-400 mb-2">
                                    Ringkasan Waktu &amp; Catatan
                                  </div>
                                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs text-slate-300">
                                    <div>
                                      Total Durasi Tatap Muka:{' '}
                                      <b className="text-white">
                                        {row.totalMinutes} menit ({(row.totalMinutes / 60).toFixed(1)}{' '}
                                        jam)
                                      </b>
                                    </div>
                                    <div>
                                      Jumlah Rombel Diampu:{' '}
                                      <b className="text-white">{Object.keys(row.classesMap).length} kelas</b>
                                    </div>
                                    {row.catatan && (
                                      <div className="text-slate-400 italic pt-1 border-t border-slate-800">
                                        Catatan: {row.catatan}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 2: REKAP JP PER KELAS / ROMBEL (DARK CARDS)
         ===================================================================== */}
      {subView === 'kelas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {analytics.classList.map((c) => {
            const pct = Math.min(
              100,
              Math.round((c.totalJp / Math.max(1, bebanJpConfig.targetJpPerKelas)) * 100)
            );
            const subjectEntries = Object.entries(c.subjects).sort((a, b) => b[1].jp - a[1].jp);

            return (
              <div
                key={c.cls.id}
                className="bg-slate-950 rounded-2xl border border-slate-800 shadow-md overflow-hidden flex flex-col"
              >
                <div
                  className={`px-4 py-3 border-b flex items-center justify-between ${getClassHeaderBadge(
                    c.cls.name
                  )}`}
                >
                  <div>
                    <h4 className="font-black text-sm">{c.cls.name}</h4>
                    <p className="text-[11px] opacity-80 font-semibold">
                      {subjectEntries.length} Mata Pelajaran • {c.totalSesi} Sesi/Mg
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black tabular-nums">{c.totalJp} JP</div>
                    <div className="text-[10px] font-bold opacity-80">
                      Target {bebanJpConfig.targetJpPerKelas} JP
                    </div>
                  </div>
                </div>

                <div className="p-4 space-y-3 flex-1">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-[11px] font-bold text-slate-400 mb-1">
                      <span>Keterisian Beban JP Kelas</span>
                      <span className="text-slate-200">{pct}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          c.totalJp >= bebanJpConfig.targetJpPerKelas
                            ? 'bg-emerald-500'
                            : 'bg-cyan-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {/* Daily Strip */}
                  <div className="grid grid-cols-5 gap-1.5 text-center">
                    {DAYS_LIST.map((d) => (
                      <div
                        key={d}
                        className="py-1.5 rounded-lg bg-slate-900 border border-slate-800"
                      >
                        <div className="text-[9px] font-extrabold text-slate-500">{d.slice(0, 3)}</div>
                        <div className="text-xs font-black text-slate-100 tabular-nums">
                          {c.dailyJp[d] || 0}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Subject Breakdown */}
                  <div className="pt-2 border-t border-slate-800">
                    <div className="text-[10px] font-black uppercase text-slate-500 mb-2">
                      Distribusi Mata Pelajaran
                    </div>
                    {subjectEntries.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2 text-center">
                        Belum ada mata pelajaran terjadwal.
                      </p>
                    ) : (
                      <div className="space-y-1.5 max-h-[210px] overflow-y-auto pr-1">
                        {subjectEntries.map(([subj, info]) => (
                          <div
                            key={subj}
                            className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-lg bg-slate-900/90 border border-slate-800/80"
                          >
                            <span className="font-bold text-slate-200 truncate pr-2">{subj}</span>
                            <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 font-black text-cyan-300 text-[11px] shrink-0 tabular-nums">
                              {info.jp} JP
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* =====================================================================
          SUB-VIEW 3: REKAP JP PER MATA PELAJARAN (DARK TABLE)
         ===================================================================== */}
      {subView === 'mapel' && (
        <div className="bg-slate-950 rounded-2xl border border-slate-800 shadow-lg overflow-hidden">
          <div className="p-4 bg-slate-900/70 border-b border-slate-800 flex items-center justify-between">
            <h4 className="text-sm font-black text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span>Distribusi Beban JP per Mata Pelajaran (Lintas Tingkat VII–IX)</span>
            </h4>
            <span className="text-xs font-bold text-slate-400">
              Total <b className="text-cyan-300">{analytics.totalJpTatapMuka} JP</b> Tatap Muka
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-900 border-b border-slate-800 text-[11px] uppercase text-slate-400">
                  <th className="p-3 text-left w-10">No</th>
                  <th className="p-3 text-left min-w-[200px]">Mata Pelajaran</th>
                  <th className="p-3 text-center">Kelas VII</th>
                  <th className="p-3 text-center">Kelas VIII</th>
                  <th className="p-3 text-center">Kelas IX</th>
                  <th className="p-3 text-center">Rombel</th>
                  <th className="p-3 text-center">Guru Pengampu</th>
                  <th className="p-3 text-left min-w-[180px]">Total JP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {analytics.subjectList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-slate-500 font-semibold">
                      Belum ada jadwal mata pelajaran yang terpasang pada Papan Jadwal.
                    </td>
                  </tr>
                ) : (
                  analytics.subjectList.map((s, i) => {
                    const barW = Math.round((s.totalJp / maxSubjectJp) * 100);
                    return (
                      <tr key={s.subject} className="hover:bg-slate-900/70 transition-colors">
                        <td className="p-3 text-slate-500 font-bold">{i + 1}</td>
                        <td className="p-3 font-black text-slate-100">{s.subject}</td>
                        <td className="p-3 text-center font-bold text-rose-400 tabular-nums">
                          {s.grade7Jp} JP
                        </td>
                        <td className="p-3 text-center font-bold text-sky-400 tabular-nums">
                          {s.grade8Jp} JP
                        </td>
                        <td className="p-3 text-center font-bold text-amber-400 tabular-nums">
                          {s.grade9Jp} JP
                        </td>
                        <td className="p-3 text-center font-bold text-slate-300">
                          {s.classes.size} kelas
                        </td>
                        <td className="p-3 text-center font-bold text-slate-300">
                          {s.teachers.size} guru
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-2.5 bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full"
                                style={{ width: `${barW}%` }}
                              />
                            </div>
                            <span className="font-black text-white tabular-nums w-14 text-right">
                              {s.totalJp} JP
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL: EDIT TARGET JP & TUGAS TAMBAHAN PER GURU (DARK MODAL)
         ===================================================================== */}
      {editingTeacher && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-slate-950 rounded-2xl border border-slate-700 shadow-2xl w-full max-w-md overflow-hidden text-slate-100">
            <div className="px-5 py-4 bg-slate-900 border-b border-slate-800 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black">Atur Target &amp; Ekuivalensi Beban JP</h4>
                <p className="text-[11px] text-cyan-300 font-semibold mt-0.5">
                  [{editingTeacher.teacher.code}] {editingTeacher.teacher.name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingTeacher(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTeacherOverride} className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs">
                <span className="font-bold text-slate-400">JP Tatap Muka Saat Ini:</span>
                <span className="text-sm font-black text-cyan-400">
                  {editingTeacher.jpTatapMuka} JP ({editingTeacher.sesiCount} sesi)
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1.5">
                  Preset Tugas Tambahan (Ekuivalensi JP)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {TUGAS_TAMBAHAN_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() =>
                        setOverrideForm((prev) => ({
                          ...prev,
                          tugasTambahan: p.jp === 0 ? '' : p.label,
                          ekuivalensiJp: p.jp,
                        }))
                      }
                      className={`px-2 py-1 rounded-lg text-[10px] font-bold border cursor-pointer transition-all ${
                        (p.jp === 0 && !overrideForm.tugasTambahan && !overrideForm.ekuivalensiJp) ||
                        overrideForm.tugasTambahan === p.label
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                          : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      {p.label} {p.jp > 0 ? `(+${p.jp} JP)` : ''}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Nama Tugas Tambahan
                  </label>
                  <input
                    type="text"
                    value={overrideForm.tugasTambahan || ''}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, tugasTambahan: e.target.value })
                    }
                    placeholder="Contoh: Wali Kelas VII Ibnu Sina"
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Ekuivalen (+JP)
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={36}
                    value={overrideForm.ekuivalensiJp ?? 0}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, ekuivalensiJp: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-black text-indigo-300 focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Target Minimal (JP/Mg)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={overrideForm.targetJp}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, targetJp: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-1">
                    Batas Maksimal (JP/Mg)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={80}
                    value={overrideForm.maxJp ?? bebanJpConfig.defaultMaxJp}
                    onChange={(e) =>
                      setOverrideForm({ ...overrideForm, maxJp: Number(e.target.value) })
                    }
                    className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">
                  Catatan SK / Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  value={overrideForm.catatan || ''}
                  onChange={(e) => setOverrideForm({ ...overrideForm, catatan: e.target.value })}
                  placeholder="Misal: Guru Tidak Tetap / Sertifikasi"
                  className="w-full p-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs font-semibold text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs">
                <span className="font-bold text-emerald-200">Proyeksi Total Beban JP:</span>
                <span className="text-base font-black text-emerald-300">
                  {editingTeacher.jpTatapMuka + (Number(overrideForm.ekuivalensiJp) || 0)} JP / Minggu
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingTeacher(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-black shadow-sm flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Beban JP</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
