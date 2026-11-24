import React, { useMemo, useState, useEffect } from 'react';
import {
  Printer,
  User,
  Grid,
  Clock,
  Info,
  CalendarDays,
  Move,
  ArrowLeftRight,
  Plus,
  Trash2,
  X,
  GripVertical,
  GripHorizontal,
  PackageOpen,
  Layers,
  AlertTriangle,
  CheckCircle2,
  Undo2,
  Settings2,
  FileDown,
  Search,
  Sparkles,
  Pencil,
  Lock,
  Unlock,
  RotateCcw,
  Coffee,
  BookOpen,
  Gauge,
} from 'lucide-react';
import {
  TEACHER_MAPPINGS,
  SCHEDULE_CLASSES,
  TIME_SLOTS,
  MASTER_SCHEDULE,
  PIKET_SCHEDULE,
  ScheduleEntry,
  TeacherMapping,
  ScheduleClassItem,
  ScheduleHeaderConfig,
  DockScheduleCard,
  BebanJpConfig,
  DEFAULT_BEBAN_JP_CONFIG,
  calculateSlotJp,
} from '../../types/scheduleData';
import {
  downloadMasterJadwalPdf,
  downloadPersonalJadwalPdf,
  printJadwalViaIframe,
} from '../../lib/jadwalPdf';
import { INITIAL_SCHOOL_SETTINGS } from '../../data/mockData';

export interface CellCoord {
  day: string;
  time: string;
  classId: string;
  className: string;
}

export interface CellPayload {
  subject: string;
  teacherCode: string;
  guruName: string;
}

export interface JadwalReviewProps {
  timeSlots?: string[];
  teacherMappings?: TeacherMapping[];
  masterSchedule?: ScheduleEntry[];
  scheduleClasses?: ScheduleClassItem[];
  headerConfig?: ScheduleHeaderConfig;
  logoUrl?: string;
  dockItems?: DockScheduleCard[];
  mapelOptions?: string[];
  bebanJpConfig?: BebanJpConfig;
  initialTeacherCode?: string;
  onOpenBebanJp?: () => void;
  canEdit?: boolean;
  onUpsertCell?: (coord: CellCoord, payload: CellPayload, existingId?: string) => Promise<string | void>;
  onDeleteCell?: (entryId: string) => Promise<void>;
  onMoveOrSwapCells?: (params: {
    sourceCoord: CellCoord;
    sourceEntry: ScheduleEntry;
    targetCoord: CellCoord;
    targetEntry?: ScheduleEntry;
  }) => Promise<void>;
  onSetRowActivity?: (params: {
    day: string;
    time: string;
    activityName: string | null;
    existingActivityIds: string[];
  }) => Promise<void>;
  onUpdateClasses?: (nextClasses: ScheduleClassItem[]) => Promise<void>;
  onUpdateTimeSlots?: (nextSlots: string[]) => Promise<void>;
  onUpdateHeader?: (nextHeader: ScheduleHeaderConfig) => Promise<void>;
  onUpdateDockItems?: (nextDock: DockScheduleCard[]) => Promise<void>;
  onResetLayoutDefaults?: () => Promise<void>;
}

type DragPayload =
  | { kind: 'cell'; coord: CellCoord; entry: ScheduleEntry }
  | { kind: 'dock'; card: DockScheduleCard }
  | { kind: 'bank'; card: Omit<DockScheduleCard, 'id'> }
  | { kind: 'col'; classId: string }
  | { kind: 'row'; slotIndex: number };

const DEFAULT_HEADER: ScheduleHeaderConfig = {
  judul: 'JADWAL PELAJARAN',
  namaSekolah: 'SMP ISLAM MODERN AL FAKHIR',
  semester: 'SEMESTER GANJIL',
  tahunAjaran: '2026/2027',
};

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

const KEGIATAN_PRESETS = [
  'UPACARA',
  'SHOLAT DHUHA & MURAJA\'AH',
  'ISTIRAHAT KE-1',
  'ISTIRAHAT KE-2',
  'PRAMUKA',
  'MUHADHOROH',
  'TEMU WALAS',
  'EKSTRAKURIKULER',
];

const DAYS_LIST = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT'];

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

  // Match suffix after '-' (e.g. "Ibnu Sina" matches "VII - Ibnu Sina") safely
  const targetSuffix = targetName.includes('-')
    ? targetName.split('-').slice(1).join('-').trim()
    : targetName;
  const entrySuffix = eClass.includes('-')
    ? eClass.split('-').slice(1).join('-').trim()
    : eClass;

  if (targetSuffix.length >= 4 && entrySuffix === targetSuffix) {
    // Also verify grade level doesn't conflict if both specify roman numeral
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

export const JadwalReview: React.FC<JadwalReviewProps> = ({
  timeSlots = TIME_SLOTS,
  teacherMappings = TEACHER_MAPPINGS,
  masterSchedule = MASTER_SCHEDULE,
  scheduleClasses = SCHEDULE_CLASSES,
  headerConfig = DEFAULT_HEADER,
  logoUrl = INITIAL_SCHOOL_SETTINGS.logoUrl,
  dockItems = [],
  mapelOptions = [],
  bebanJpConfig = DEFAULT_BEBAN_JP_CONFIG,
  initialTeacherCode = '',
  onOpenBebanJp,
  canEdit = false,
  onUpsertCell,
  onDeleteCell,
  onMoveOrSwapCells,
  onSetRowActivity,
  onUpdateClasses,
  onUpdateTimeSlots,
  onUpdateHeader,
  onUpdateDockItems,
  onResetLayoutDefaults,
}) => {
  const [selectedTeacherCode, setSelectedTeacherCode] = useState<string>(initialTeacherCode);
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>('SEMUA');
  const [viewMode, setViewMode] = useState<'master' | 'personal'>('master');
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    if (initialTeacherCode) {
      setSelectedTeacherCode(initialTeacherCode);
    }
  }, [initialTeacherCode]);

  // Interactive Bongkar Pasang states (inspired by DenahRuangUjian)
  const [dragModeEnabled, setDragModeEnabled] = useState<boolean>(canEdit);
  const [showRack, setShowRack] = useState<boolean>(canEdit);
  const [swapSource, setSwapSource] = useState<{ coord: CellCoord; entry?: ScheduleEntry } | null>(null);
  const [selectedBrush, setSelectedBrush] = useState<{
    source: 'dock' | 'bank';
    dockId?: string;
    subject: string;
    teacherCode: string;
    guruName: string;
  } | null>(null);

  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [hoverCellKey, setHoverCellKey] = useState<string | null>(null);
  const [hoverColId, setHoverColId] = useState<string | null>(null);
  const [hoverRowIdx, setHoverRowIdx] = useState<number | null>(null);
  const [hoverRackDrop, setHoverRackDrop] = useState<boolean>(false);
  const [highlightConflictsOnly, setHighlightConflictsOnly] = useState<boolean>(false);

  // Toast feedback
  const [toast, setToast] = useState<{ type: 'info' | 'success' | 'warn'; text: string } | null>(null);
  const showToast = (text: string, type: 'info' | 'success' | 'warn' = 'info') => {
    setToast({ type, text });
  };
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3800);
    return () => clearTimeout(t);
  }, [toast]);

  // Undo history stack (stores closures that revert the last board action)
  const [undoStack, setUndoStack] = useState<Array<{ label: string; revert: () => Promise<void> }>>([]);
  const [isBusy, setIsBusy] = useState(false);

  // Quick Bank search & custom card builder
  const [bankSearch, setBankSearch] = useState('');
  const [quickBankTeacherCode, setQuickBankTeacherCode] = useState(teacherMappings[0]?.code || '');
  const [quickBankSubject, setQuickBankSubject] = useState('');

  // Modals
  const [editingCell, setEditingCell] = useState<{
    coord: CellCoord;
    entry?: ScheduleEntry;
  } | null>(null);
  const [cellFormTeacherCode, setCellFormTeacherCode] = useState('');
  const [cellFormSubject, setCellFormSubject] = useState('');

  const [editingActivityRow, setEditingActivityRow] = useState<{
    day: string;
    time: string;
    currentName: string;
    existingIds: string[];
  } | null>(null);
  const [activityInputName, setActivityInputName] = useState('');

  const [showAddClassModal, setShowAddClassModal] = useState(false);
  const [classFormMode, setClassFormMode] = useState<'add' | 'rename'>('add');
  const [editingClassId, setEditingClassId] = useState<string | null>(null);
  const [classNameInput, setClassNameInput] = useState('');

  const [showAddSlotModal, setShowAddSlotModal] = useState(false);
  const [slotFormIndex, setSlotFormIndex] = useState<number | null>(null);
  const [slotInputText, setSlotInputText] = useState('');

  const [showHeaderModal, setShowHeaderModal] = useState(false);
  const [headerForm, setHeaderForm] = useState<ScheduleHeaderConfig>(headerConfig);

  const [confirmRemoveClass, setConfirmRemoveClass] = useState<ScheduleClassItem | null>(null);
  const [confirmRemoveSlotIdx, setConfirmRemoveSlotIdx] = useState<number | null>(null);

  useEffect(() => {
    setHeaderForm(headerConfig);
  }, [headerConfig]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const activeDays = useMemo(() => {
    if (selectedDayFilter === 'SEMUA') return DAYS_LIST;
    return [selectedDayFilter];
  }, [selectedDayFilter]);

  const currentDayName = ['MINGGU', 'SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'][
    currentTime.getDay()
  ];
  const currentClock = `${currentTime.getHours().toString().padStart(2, '0')}.${currentTime
    .getMinutes()
    .toString()
    .padStart(2, '0')}`;

  const isCurrentSession = (day: string, timeRange: string) => {
    if (day !== currentDayName) return false;
    const [start, end] = timeRange.split(' - ');
    if (!start || !end) return false;
    const normalize = (t: string) => t.replace(':', '.');
    return normalize(currentClock) >= normalize(start) && normalize(currentClock) <= normalize(end);
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

  const resolveTeacherName = (code: string, fallback?: string): string => {
    const found = teacherMappings.find((t) => t.code === code);
    return found?.name || fallback || '';
  };

  const getRowEntries = (day: string, time: string): ScheduleEntry[] => {
    const [sStartStr, sEndStr] = time.split(' - ');
    const sS = timeToMinutes(sStartStr);
    const sE = timeToMinutes(sEndStr);
    const targetDay = day.trim().toUpperCase();

    return masterSchedule.filter((e) => {
      if ((e.day || '').trim().toUpperCase() !== targetDay) return false;
      const [eStartStr, eEndStr] = (e.time || '').split(' - ');
      const eS = timeToMinutes(eStartStr);
      const eE = timeToMinutes(eEndStr);
      return eS < sE && eE > sS;
    });
  };

  const getSpecialActivity = (day: string, time: string): ScheduleEntry | undefined => {
    const rowEntries = getRowEntries(day, time);
    return rowEntries.find((e) => isSpecialEntry(e));
  };

  const getCellEntry = (day: string, time: string, cls: ScheduleClassItem): ScheduleEntry | undefined => {
    const rowEntries = getRowEntries(day, time);
    return rowEntries.find((e) => !isSpecialEntry(e) && classMatchesEntry(e.classId, cls));
  };

  // Real-time teacher conflict detector across entire week
  const conflictAnalysis = useMemo(() => {
    const conflictingCellKeys = new Set<string>();
    const list: Array<{
      day: string;
      time: string;
      teacherCode: string;
      teacherName: string;
      classes: string[];
    }> = [];

    DAYS_LIST.forEach((day) => {
      timeSlots.forEach((slot) => {
        const special = getSpecialActivity(day, slot);
        if (special) return;

        const byCode = new Map<string, Array<{ cls: ScheduleClassItem; entry: ScheduleEntry }>>();
        scheduleClasses.forEach((cls) => {
          const entry = getCellEntry(day, slot, cls);
          if (!entry) return;
          const code = resolveTeacherCode(entry);
          if (!code || code === '-') return;
          const arr = byCode.get(code) || [];
          arr.push({ cls, entry });
          byCode.set(code, arr);
        });

        byCode.forEach((items, code) => {
          if (items.length > 1) {
            items.forEach(({ cls }) => {
              conflictingCellKeys.add(`${day}|${slot}|${cls.id}`);
            });
            list.push({
              day,
              time: slot,
              teacherCode: code,
              teacherName: resolveTeacherName(code, items[0].entry.guruName),
              classes: items.map((i) => i.cls.name),
            });
          }
        });
      });
    });

    return { conflictingCellKeys, list };
  }, [masterSchedule, timeSlots, scheduleClasses, teacherMappings]);

  // Real-time Beban JP calculator per teacher (synced with bebanJpConfig)
  const bebanJpSummary = useMemo(() => {
    const byTeacher = new Map<
      string,
      {
        jpTatapMuka: number;
        ekuivalensiJp: number;
        totalJp: number;
        targetMin: number;
        targetMax: number;
        status: 'kosong' | 'kurang' | 'ideal' | 'overload';
      }
    >();

    teacherMappings.forEach((t) => {
      const ov = bebanJpConfig.overrides?.[t.code];
      const ekui = ov?.ekuivalensiJp || 0;
      const targetMin = ov?.targetJp ?? bebanJpConfig.defaultMinJp;
      const targetMax = ov?.maxJp ?? bebanJpConfig.defaultMaxJp;
      byTeacher.set(t.code, {
        jpTatapMuka: 0,
        ekuivalensiJp: ekui,
        totalJp: ekui,
        targetMin,
        targetMax,
        status: ekui === 0 ? 'kosong' : ekui < targetMin ? 'kurang' : ekui > targetMax ? 'overload' : 'ideal',
      });
    });

    let totalSchoolJp = 0;

    DAYS_LIST.forEach((day) => {
      timeSlots.forEach((slot) => {
        if (getSpecialActivity(day, slot)) return;
        const slotJp = calculateSlotJp(slot, bebanJpConfig);
        scheduleClasses.forEach((cls) => {
          const entry = getCellEntry(day, slot, cls);
          if (!entry) return;
          totalSchoolJp += slotJp;
          const code = resolveTeacherCode(entry);
          if (!code || code === '-') return;
          const prev = byTeacher.get(code) || {
            jpTatapMuka: 0,
            ekuivalensiJp: bebanJpConfig.overrides?.[code]?.ekuivalensiJp || 0,
            totalJp: bebanJpConfig.overrides?.[code]?.ekuivalensiJp || 0,
            targetMin: bebanJpConfig.overrides?.[code]?.targetJp ?? bebanJpConfig.defaultMinJp,
            targetMax: bebanJpConfig.overrides?.[code]?.maxJp ?? bebanJpConfig.defaultMaxJp,
            status: 'kosong' as const,
          };
          prev.jpTatapMuka += slotJp;
          prev.totalJp = prev.jpTatapMuka + prev.ekuivalensiJp;
          prev.status =
            prev.totalJp === 0
              ? 'kosong'
              : prev.totalJp < prev.targetMin
              ? 'kurang'
              : prev.totalJp > prev.targetMax
              ? 'overload'
              : 'ideal';
          byTeacher.set(code, prev);
        });
      });
    });

    return { byTeacher, totalSchoolJp };
  }, [masterSchedule, timeSlots, scheduleClasses, teacherMappings, bebanJpConfig]);

  const getTeacherColor = (code: string, subject?: string) => {
    if (selectedTeacherCode && selectedTeacherCode !== code) return 'bg-slate-100/80 opacity-25';

    const s = (subject || '').toUpperCase();
    const cInt = parseInt(code, 10);

    if (s.includes('BAHASA INDONESIA')) return 'bg-blue-100 border-blue-200 text-blue-900';
    if (s.includes('MATEMATIKA')) return 'bg-yellow-100 border-yellow-200 text-yellow-900';
    if (s.includes('IPA') || s.includes('ALAM')) return 'bg-green-100 border-green-200 text-green-900';
    if (s.includes('SENI') || s.includes('BUDAYA')) return 'bg-red-100 border-red-200 text-red-900';
    if (s.includes('KOREA')) return 'bg-cyan-100 border-cyan-200 text-cyan-900';
    if (s.includes('JEPANG')) return 'bg-indigo-100 border-indigo-200 text-indigo-900';
    if (s.includes('AGAMA') || s.includes('PABP') || s.includes('FIQIH') || s.includes('QUR'))
      return 'bg-emerald-100 border-emerald-200 text-emerald-900';
    if (s.includes('IPS') || s.includes('SOSIAL')) return 'bg-amber-100 border-amber-200 text-amber-900';
    if (s.includes('INGGRIS')) return 'bg-sky-100 border-sky-200 text-sky-900';
    if (s.includes('INFORMATIKA') || s.includes('TIK'))
      return 'bg-purple-100 border-purple-200 text-purple-900';
    if (s.includes('OLAHRAGA') || s.includes('PJOK')) return 'bg-lime-100 border-lime-200 text-lime-900';
    if (s.includes('ARAB')) return 'bg-teal-100 border-teal-200 text-teal-900';
    if (s.includes('PANCASILA') || s.includes('PKN'))
      return 'bg-slate-200/80 border-slate-300 text-slate-900';

    if (cInt === 29) return 'bg-cyan-100 border-cyan-200 text-cyan-900';
    if (cInt === 11) return 'bg-indigo-100 border-indigo-200 text-indigo-900';
    if (cInt === 9) return 'bg-green-100 border-green-200 text-green-900';
    if (cInt === 6) return 'bg-yellow-100 border-yellow-200 text-yellow-900';
    if (cInt === 12) return 'bg-red-100 border-red-200 text-red-900';
    if (cInt === 21 || cInt === 2) return 'bg-blue-100 border-blue-200 text-blue-900';

    if (!code) return 'bg-slate-50 text-slate-500';
    return 'bg-slate-100 border-slate-200 text-slate-800';
  };

  const getClassColors = (className: string) => {
    const name = className.toUpperCase();
    let gradeColor = 'text-slate-900';

    if (name.includes('VIII')) gradeColor = 'text-blue-700';
    else if (name.includes('VII')) gradeColor = 'text-red-700';
    else if (name.includes('IX')) gradeColor = 'text-orange-700';

    if (name.includes('IBNU SINA')) return `bg-blue-50 ${gradeColor} border-blue-200`;
    if (name.includes('IBNU KHALDUN')) return `bg-indigo-50 ${gradeColor} border-indigo-200`;
    if (name.includes('IBNU AL HAYTAM')) return `bg-sky-50 ${gradeColor} border-sky-200`;
    if (name.includes('IBNU RUSYD')) return `bg-violet-50 ${gradeColor} border-violet-200`;
    if (name.includes('AL KINDI')) return `bg-cyan-50 ${gradeColor} border-cyan-200`;
    if (name.includes('AL KHAWARIZMI')) return `bg-green-50 ${gradeColor} border-green-200`;
    if (name.includes('AL FARABI')) return `bg-emerald-50 ${gradeColor} border-emerald-200`;
    if (name.includes('AL BIRUNI')) return `bg-lime-50 ${gradeColor} border-lime-200`;
    if (name.includes('UMAR BIN KHATTAB')) return `bg-teal-50 ${gradeColor} border-teal-200`;
    if (name.includes('UTSMAN BIN AFFAN')) return `bg-amber-50 ${gradeColor} border-amber-200`;
    return `bg-slate-100 ${gradeColor} border-slate-200`;
  };

  const getColumnTint = (className: string) => {
    const name = className.toUpperCase();
    if (name.includes('IBNU SINA')) return 'bg-blue-50/15';
    if (name.includes('IBNU KHALDUN')) return 'bg-indigo-50/15';
    if (name.includes('IBNU AL HAYTAM')) return 'bg-sky-50/15';
    if (name.includes('IBNU RUSYD')) return 'bg-violet-50/15';
    if (name.includes('AL KINDI')) return 'bg-cyan-50/15';
    if (name.includes('AL KHAWARIZMI')) return 'bg-green-50/15';
    if (name.includes('AL FARABI')) return 'bg-emerald-50/15';
    if (name.includes('AL BIRUNI')) return 'bg-lime-50/15';
    if (name.includes('UMAR BIN KHATTAB')) return 'bg-teal-50/15';
    if (name.includes('UTSMAN BIN AFFAN')) return 'bg-amber-50/15';
    return 'bg-slate-50/15';
  };

  const getSpecialRowStyle = (subject: string, isActive: boolean) => {
    const s = subject.toUpperCase();
    if (isActive) return 'bg-amber-200 text-amber-900';
    if (s.includes('ISTIRAHAT')) return 'bg-slate-100 text-slate-500';
    if (s.includes('UPACARA')) return 'bg-indigo-50 text-indigo-600';
    if (s.includes('SHOLAT')) return 'bg-emerald-50 text-emerald-600';
    if (s.includes('PRAMUKA')) return 'bg-orange-50 text-orange-600';
    if (s.includes('MUHADHOROH')) return 'bg-purple-50 text-purple-600';
    if (s.includes('TEMU WALAS')) return 'bg-sky-50 text-sky-600';
    if (s.includes('EKSTRAKURIKULER') || s.includes('EKSKUL')) return 'bg-pink-50 text-pink-600';
    return 'bg-amber-50 text-amber-700';
  };

  const checkTeacherConflictAt = (
    day: string,
    time: string,
    teacherCode: string,
    ignoreClassId?: string
  ): string | null => {
    if (!teacherCode || teacherCode === '-') return null;
    for (const cls of scheduleClasses) {
      if (cls.id === ignoreClassId) continue;
      const e = getCellEntry(day, time, cls);
      if (!e) continue;
      if (resolveTeacherCode(e) === teacherCode) {
        return cls.name;
      }
    }
    return null;
  };

  const pushUndo = (label: string, revert: () => Promise<void>) => {
    setUndoStack((prev) => [{ label, revert }, ...prev].slice(0, 15));
  };

  const handleUndo = async () => {
    if (undoStack.length === 0 || isBusy) return;
    const [latest, ...rest] = undoStack;
    setIsBusy(true);
    try {
      await latest.revert();
      setUndoStack(rest);
      showToast(`Berhasil mengurungkan: ${latest.label}`, 'success');
    } finally {
      setIsBusy(false);
    }
  };

  // --- Core Bongkar Pasang Mutations ---
  const detachCellToRack = async (coord: CellCoord, entry: ScheduleEntry) => {
    if (!canEdit || !onDeleteCell || !onUpdateDockItems) return;
    if (!entry.id) {
      showToast('Data jadwal bawaan belum tersimpan di database.', 'warn');
      return;
    }
    const code = resolveTeacherCode(entry);
    const guruName = resolveTeacherName(code, entry.guruName);
    const newCard: DockScheduleCard = {
      id: `dock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      subject: entry.subject,
      teacherCode: code,
      guruName,
      fromLabel: `${coord.day} • ${coord.time} • ${coord.className}`,
    };
    const prevDock = [...dockItems];
    const nextDock = [newCard, ...dockItems];

    setIsBusy(true);
    try {
      await onDeleteCell(entry.id);
      await onUpdateDockItems(nextDock);
      setShowRack(true);
      pushUndo(`Bongkar ${entry.subject} dari ${coord.className}`, async () => {
        if (onUpsertCell) {
          await onUpsertCell(coord, {
            subject: entry.subject,
            teacherCode: code,
            guruName,
          });
        }
        await onUpdateDockItems(prevDock);
      });
      showToast(`"${entry.subject}" dibongkar ke Rak Bongkar Pasang.`, 'info');
    } finally {
      setIsBusy(false);
    }
  };

  const placeCardIntoCell = async (
    card: { subject: string; teacherCode: string; guruName: string },
    targetCoord: CellCoord,
    targetEntry: ScheduleEntry | undefined,
    removeFromDockId?: string
  ) => {
    if (!canEdit || !onUpsertCell) return;
    const conflictClass = checkTeacherConflictAt(
      targetCoord.day,
      targetCoord.time,
      card.teacherCode,
      targetCoord.classId
    );

    const prevDock = [...dockItems];
    let nextDock = removeFromDockId
      ? dockItems.filter((d) => d.id !== removeFromDockId)
      : [...dockItems];

    // If cell already occupied, safely pop displaced lesson into the Holding Rack!
    let displacedCard: DockScheduleCard | null = null;
    if (targetEntry) {
      const oldCode = resolveTeacherCode(targetEntry);
      displacedCard = {
        id: `dock-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        subject: targetEntry.subject,
        teacherCode: oldCode,
        guruName: resolveTeacherName(oldCode, targetEntry.guruName),
        fromLabel: `${targetCoord.day} • ${targetCoord.time} • ${targetCoord.className}`,
      };
      nextDock = [displacedCard, ...nextDock];
    }

    setIsBusy(true);
    try {
      const createdOrUpdatedId = await onUpsertCell(targetCoord, card, targetEntry?.id);
      if (onUpdateDockItems && (removeFromDockId || displacedCard)) {
        await onUpdateDockItems(nextDock);
      }

      pushUndo(`Pasang ${card.subject} ke ${targetCoord.className}`, async () => {
        if (targetEntry) {
          await onUpsertCell(
            targetCoord,
            {
              subject: targetEntry.subject,
              teacherCode: resolveTeacherCode(targetEntry),
              guruName: resolveTeacherName(resolveTeacherCode(targetEntry), targetEntry.guruName),
            },
            targetEntry.id
          );
        } else if (createdOrUpdatedId && onDeleteCell) {
          await onDeleteCell(createdOrUpdatedId);
        }
        if (onUpdateDockItems) {
          await onUpdateDockItems(prevDock);
        }
      });

      if (conflictClass) {
        showToast(
          `Dipasang dengan peringatan bentrok! Kode ${card.teacherCode} juga mengajar di ${conflictClass} pada ${targetCoord.day} ${targetCoord.time}.`,
          'warn'
        );
      } else if (displacedCard) {
        showToast(
          `"${card.subject}" dipasang! Jadwal lama "${displacedCard.subject}" dipindahkan ke Rak Bongkar Pasang.`,
          'success'
        );
      } else {
        showToast(`"${card.subject}" berhasil dipasang di ${targetCoord.className}.`, 'success');
      }
    } finally {
      setIsBusy(false);
    }
  };

  const executeMoveOrSwap = async (
    sourceCoord: CellCoord,
    sourceEntry: ScheduleEntry,
    targetCoord: CellCoord,
    targetEntry?: ScheduleEntry
  ) => {
    if (!canEdit || !onMoveOrSwapCells) return;
    if (
      sourceCoord.day === targetCoord.day &&
      sourceCoord.time === targetCoord.time &&
      sourceCoord.classId === targetCoord.classId
    ) {
      return;
    }

    const srcCode = resolveTeacherCode(sourceEntry);
    const conflictTarget = checkTeacherConflictAt(
      targetCoord.day,
      targetCoord.time,
      srcCode,
      targetCoord.classId
    );

    setIsBusy(true);
    try {
      await onMoveOrSwapCells({
        sourceCoord,
        sourceEntry,
        targetCoord,
        targetEntry,
      });

      pushUndo(
        targetEntry
          ? `Tukar ${sourceEntry.subject} ↔ ${targetEntry.subject}`
          : `Geser ${sourceEntry.subject} ke ${targetCoord.className}`,
        async () => {
          await onMoveOrSwapCells({
            sourceCoord: targetCoord,
            sourceEntry,
            targetCoord: sourceCoord,
            targetEntry,
          });
        }
      );

      if (conflictTarget && !(sourceCoord.day === targetCoord.day && sourceCoord.time === targetCoord.time)) {
        showToast(
          `Berhasil dipindah, namun Kode ${srcCode} bentrok dengan ${conflictTarget} pada ${targetCoord.day} ${targetCoord.time}.`,
          'warn'
        );
      } else if (targetEntry) {
        showToast(
          `Posisi "${sourceEntry.subject}" ↔ "${targetEntry.subject}" berhasil ditukar!`,
          'success'
        );
      } else {
        showToast(
          `"${sourceEntry.subject}" digeser ke ${targetCoord.day} ${targetCoord.time} (${targetCoord.className}).`,
          'success'
        );
      }
    } finally {
      setIsBusy(false);
    }
  };

  // --- Drag & Drop Handlers ---
  const handleDropOnCell = async (targetCoord: CellCoord, targetEntry?: ScheduleEntry) => {
    setHoverCellKey(null);
    if (!dragging || !canEdit || !dragModeEnabled) return;

    if (dragging.kind === 'cell') {
      await executeMoveOrSwap(dragging.coord, dragging.entry, targetCoord, targetEntry);
    } else if (dragging.kind === 'dock') {
      await placeCardIntoCell(dragging.card, targetCoord, targetEntry, dragging.card.id);
    } else if (dragging.kind === 'bank') {
      await placeCardIntoCell(dragging.card, targetCoord, targetEntry);
    }
    setDragging(null);
  };

  const handleDropOnRack = async () => {
    setHoverRackDrop(false);
    if (!dragging || !canEdit) return;
    if (dragging.kind === 'cell') {
      await detachCellToRack(dragging.coord, dragging.entry);
    }
    setDragging(null);
  };

  const handleDropColumnReorder = async (targetClassId: string) => {
    setHoverColId(null);
    if (!dragging || dragging.kind !== 'col' || !onUpdateClasses) return;
    const fromIdx = scheduleClasses.findIndex((c) => c.id === dragging.classId);
    const toIdx = scheduleClasses.findIndex((c) => c.id === targetClassId);
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) {
      setDragging(null);
      return;
    }
    const prev = [...scheduleClasses];
    const next = [...scheduleClasses];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setDragging(null);
    await onUpdateClasses(next);
    pushUndo(`Geser kolom ${moved.name}`, async () => {
      await onUpdateClasses(prev);
    });
    showToast(`Urutan kolom "${moved.name}" berhasil digeser.`, 'success');
  };

  const handleDropRowReorder = async (targetSlotIdx: number) => {
    setHoverRowIdx(null);
    if (!dragging || dragging.kind !== 'row' || !onUpdateTimeSlots) return;
    const fromIdx = dragging.slotIndex;
    if (fromIdx === targetSlotIdx) {
      setDragging(null);
      return;
    }
    const prev = [...timeSlots];
    const next = [...timeSlots];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(targetSlotIdx, 0, moved);
    setDragging(null);
    await onUpdateTimeSlots(next);
    pushUndo(`Geser baris waktu ${moved}`, async () => {
      await onUpdateTimeSlots(prev);
    });
    showToast(`Urutan slot waktu "${moved}" berhasil digeser.`, 'success');
  };

  // --- Cell Click (Supports Swap Mode, Brush/Stamp Mode, or Quick Edit Modal) ---
  const handleCellClick = async (coord: CellCoord, entry?: ScheduleEntry) => {
    if (!canEdit) return;

    // 1. If brush/tap-to-place card is selected from Rack or Bank
    if (selectedBrush) {
      await placeCardIntoCell(
        {
          subject: selectedBrush.subject,
          teacherCode: selectedBrush.teacherCode,
          guruName: selectedBrush.guruName,
        },
        coord,
        entry,
        selectedBrush.source === 'dock' ? selectedBrush.dockId : undefined
      );
      if (selectedBrush.source === 'dock') {
        setSelectedBrush(null);
      }
      return;
    }

    // 2. If Swap Mode is active
    if (swapSource) {
      if (
        swapSource.coord.day === coord.day &&
        swapSource.coord.time === coord.time &&
        swapSource.coord.classId === coord.classId
      ) {
        setSwapSource(null);
        return;
      }
      if (swapSource.entry) {
        await executeMoveOrSwap(swapSource.coord, swapSource.entry, coord, entry);
      } else if (entry) {
        await executeMoveOrSwap(coord, entry, swapSource.coord, undefined);
      } else {
        showToast('Kedua sel masih kosong.', 'warn');
      }
      setSwapSource(null);
      return;
    }

    // 3. Otherwise open Quick Cell Editor Modal (like clicking a seat in Denah Ruang Ujian)
    setEditingCell({ coord, entry });
    const code = resolveTeacherCode(entry);
    setCellFormTeacherCode(code);
    setCellFormSubject(entry?.subject || '');
  };

  const handleSaveCellModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCell || !onUpsertCell) return;
    const trimmedSubj = cellFormSubject.trim();
    if (!trimmedSubj) {
      showToast('Harap isi atau pilih Mata Pelajaran.', 'warn');
      return;
    }
    const guruName = resolveTeacherName(cellFormTeacherCode, editingCell.entry?.guruName || '');
    const conflictClass = checkTeacherConflictAt(
      editingCell.coord.day,
      editingCell.coord.time,
      cellFormTeacherCode,
      editingCell.coord.classId
    );
    await onUpsertCell(
      editingCell.coord,
      {
        subject: trimmedSubj,
        teacherCode: cellFormTeacherCode,
        guruName,
      },
      editingCell.entry?.id
    );
    setEditingCell(null);
    if (conflictClass) {
      showToast(
        `Tersimpan dengan peringatan bentrok: Kode ${cellFormTeacherCode} juga mengajar di ${conflictClass}.`,
        'warn'
      );
    } else {
      showToast(
        `Slot ${editingCell.coord.day} ${editingCell.coord.time} (${editingCell.coord.className}) berhasil diperbarui.`,
        'success'
      );
    }
  };

  const handleClearCellModal = async () => {
    if (!editingCell?.entry?.id || !onDeleteCell) {
      setEditingCell(null);
      return;
    }
    const oldEntry = editingCell.entry;
    const oldCoord = editingCell.coord;
    await onDeleteCell(oldEntry.id);
    setEditingCell(null);
    pushUndo(`Kosongkan ${oldEntry.subject}`, async () => {
      if (onUpsertCell) {
        const code = resolveTeacherCode(oldEntry);
        await onUpsertCell(oldCoord, {
          subject: oldEntry.subject,
          teacherCode: code,
          guruName: resolveTeacherName(code, oldEntry.guruName),
        });
      }
    });
    showToast(`Sel ${oldCoord.className} (${oldCoord.time}) dikosongkan.`, 'info');
  };

  // --- Class Column Add/Rename/Delete ---
  const openAddClassModal = () => {
    setClassFormMode('add');
    setEditingClassId(null);
    setClassNameInput('');
    setShowAddClassModal(true);
  };

  const openRenameClassModal = (cls: ScheduleClassItem) => {
    setClassFormMode('rename');
    setEditingClassId(cls.id);
    setClassNameInput(cls.name);
    setShowAddClassModal(true);
  };

  const handleSaveClassModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = classNameInput.trim();
    if (!trimmed || !onUpdateClasses) return;

    if (classFormMode === 'add') {
      const id = `cls-${Date.now()}`;
      const next = [...scheduleClasses, { id, name: trimmed }];
      await onUpdateClasses(next);
      showToast(`Kolom kelas "${trimmed}" berhasil ditambahkan ke papan jadwal.`, 'success');
    } else if (editingClassId) {
      const next = scheduleClasses.map((c) => (c.id === editingClassId ? { ...c, name: trimmed } : c));
      await onUpdateClasses(next);
      showToast(`Nama kolom kelas diperbarui menjadi "${trimmed}".`, 'success');
    }
    setShowAddClassModal(false);
  };

  const handleConfirmRemoveClass = async () => {
    if (!confirmRemoveClass || !onUpdateClasses) return;
    if (scheduleClasses.length <= 1) {
      showToast('Minimal harus ada 1 kolom kelas pada papan jadwal.', 'warn');
      setConfirmRemoveClass(null);
      return;
    }
    const prev = [...scheduleClasses];
    const next = scheduleClasses.filter((c) => c.id !== confirmRemoveClass.id);
    await onUpdateClasses(next);
    pushUndo(`Hapus kolom ${confirmRemoveClass.name}`, async () => {
      await onUpdateClasses(prev);
    });
    showToast(`Kolom "${confirmRemoveClass.name}" dilepas dari papan jadwal.`, 'info');
    setConfirmRemoveClass(null);
  };

  // --- Time Slot Add/Edit/Delete ---
  const openAddSlotModal = () => {
    setSlotFormIndex(null);
    setSlotInputText('');
    setShowAddSlotModal(true);
  };

  const openEditSlotModal = (idx: number) => {
    setSlotFormIndex(idx);
    setSlotInputText(timeSlots[idx]);
    setShowAddSlotModal(true);
  };

  const handleSaveSlotModal = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = slotInputText.trim();
    if (!trimmed || !onUpdateTimeSlots) return;
    const prev = [...timeSlots];
    let next: string[];
    if (slotFormIndex === null) {
      next = [...timeSlots, trimmed];
    } else {
      next = timeSlots.map((s, i) => (i === slotFormIndex ? trimmed : s));
    }
    await onUpdateTimeSlots(next);
    pushUndo(slotFormIndex === null ? `Tambah jam ${trimmed}` : `Ubah jam ${trimmed}`, async () => {
      await onUpdateTimeSlots(prev);
    });
    showToast(
      slotFormIndex === null
        ? `Baris jam "${trimmed}" ditambahkan.`
        : `Baris jam diperbarui menjadi "${trimmed}".`,
      'success'
    );
    setShowAddSlotModal(false);
  };

  const handleConfirmRemoveSlot = async () => {
    if (confirmRemoveSlotIdx === null || !onUpdateTimeSlots) return;
    if (timeSlots.length <= 1) {
      showToast('Minimal harus ada 1 baris jam pelajaran.', 'warn');
      setConfirmRemoveSlotIdx(null);
      return;
    }
    const prev = [...timeSlots];
    const removed = timeSlots[confirmRemoveSlotIdx];
    const next = timeSlots.filter((_, i) => i !== confirmRemoveSlotIdx);
    await onUpdateTimeSlots(next);
    pushUndo(`Hapus jam ${removed}`, async () => {
      await onUpdateTimeSlots(prev);
    });
    showToast(`Baris jam "${removed}" dilepas dari papan jadwal.`, 'info');
    setConfirmRemoveSlotIdx(null);
  };

  // --- Row Activity Toggle / Edit ---
  const openActivityModal = (day: string, time: string) => {
    const rowEntries = getRowEntries(day, time);
    const special = rowEntries.find((e) => isSpecialEntry(e));
    setEditingActivityRow({
      day,
      time,
      currentName: special?.subject || '',
      existingIds: rowEntries.filter((e) => isSpecialEntry(e) && e.id).map((e) => e.id!),
    });
    setActivityInputName(special?.subject || 'ISTIRAHAT');
  };

  const handleSaveActivityRow = async (name: string | null) => {
    if (!editingActivityRow || !onSetRowActivity) return;
    await onSetRowActivity({
      day: editingActivityRow.day,
      time: editingActivityRow.time,
      activityName: name,
      existingActivityIds: editingActivityRow.existingIds,
    });
    setEditingActivityRow(null);
    showToast(
      name
        ? `Baris ${editingActivityRow.day} (${editingActivityRow.time}) diset menjadi "${name}".`
        : `Kegiatan dibongkar — baris ${editingActivityRow.day} (${editingActivityRow.time}) kembali menjadi slot mapel.`,
      'success'
    );
  };

  // --- Personal Schedule Data ---
  const activePersonalTeacher = useMemo(() => {
    if (selectedTeacherCode) {
      return teacherMappings.find((t) => t.code === selectedTeacherCode) || null;
    }
    return teacherMappings[0] || null;
  }, [selectedTeacherCode, teacherMappings]);

  const personalScheduleRows = useMemo(() => {
    if (!activePersonalTeacher) return [];
    const rows: Array<{
      day: string;
      time: string;
      className: string;
      subject: string;
      entry: ScheduleEntry;
    }> = [];
    DAYS_LIST.forEach((day) => {
      timeSlots.forEach((slot) => {
        if (getSpecialActivity(day, slot)) return;
        scheduleClasses.forEach((cls) => {
          const entry = getCellEntry(day, slot, cls);
          if (!entry) return;
          if (resolveTeacherCode(entry) === activePersonalTeacher.code) {
            rows.push({
              day,
              time: slot,
              className: cls.name,
              subject: entry.subject,
              entry,
            });
          }
        });
      });
    });
    return rows;
  }, [activePersonalTeacher, masterSchedule, timeSlots, scheduleClasses]);

  // Quick Bank filtered list
  const filteredBankTeachers = useMemo(() => {
    const q = bankSearch.trim().toLowerCase();
    if (!q) return teacherMappings;
    return teacherMappings.filter(
      (t) =>
        t.code.toLowerCase().includes(q) ||
        t.name.toLowerCase().includes(q) ||
        t.subject.toLowerCase().includes(q)
    );
  }, [teacherMappings, bankSearch]);

  const extractCleanSubjectFromTeacher = (t: TeacherMapping): string => {
    const raw = (t.subject || '').trim();
    if (!raw) return 'Mata Pelajaran';
    // Strip trailing grade numbers like "7,8,9" or "9" so dropped chip is clean
    const firstPart = raw.split('&')[0].trim();
    return firstPart.replace(/\s+[789](?:\s*,\s*[789])*$/g, '').trim() || raw;
  };

  const exportParams = {
    header: headerConfig,
    logoUrl,
    days: activeDays,
    timeSlots,
    classes: scheduleClasses,
    teacherMappings,
    getCellEntry,
    getSpecialActivity,
    resolveTeacherCode,
  };

  const handleExportPdf = async () => {
    if (viewMode === 'personal' && activePersonalTeacher) {
      await downloadPersonalJadwalPdf({
        header: headerConfig,
        logoUrl,
        teacher: activePersonalTeacher,
        rows: personalScheduleRows,
      });
      showToast(`PDF Jadwal Personal ${activePersonalTeacher.name} berhasil diunduh.`, 'success');
    } else {
      await downloadMasterJadwalPdf(exportParams);
      showToast('PDF Jadwal Pelajaran Master berhasil diunduh.', 'success');
    }
  };

  const handlePrint = () => {
    printJadwalViaIframe(exportParams);
  };

  const modalConflictClass =
    editingCell && cellFormTeacherCode
      ? checkTeacherConflictAt(
          editingCell.coord.day,
          editingCell.coord.time,
          cellFormTeacherCode,
          editingCell.coord.classId
        )
      : null;

  return (
    <div className="space-y-4">
      {/* Floating Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 max-w-md px-4 py-3 rounded-xl shadow-2xl border text-xs font-bold flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-3 ${
            toast.type === 'success'
              ? 'bg-emerald-950 text-emerald-100 border-emerald-500/60'
              : toast.type === 'warn'
              ? 'bg-amber-950 text-amber-100 border-amber-500/60'
              : 'bg-slate-900 text-slate-100 border-cyan-500/60'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.type === 'warn' ? (
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <Info className="w-4 h-4 text-cyan-400 shrink-0" />
          )}
          <span className="leading-snug">{toast.text}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="ml-1 opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* =====================================================================
          CONTROL PANEL & BONGKAR PASANG TOOLBAR (INSPIRED BY DENAH RUANG UJIAN)
         ===================================================================== */}
      <div className="bg-slate-950 text-white p-4 rounded-2xl border border-slate-800 shadow-lg space-y-3">
        {/* Top Row: Title + Filter Guru + View Mode + PDF/Print */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl">
              <CalendarDays className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white tracking-tight flex items-center gap-2">
                <span>Papan Jadwal Pelajaran Interaktif</span>
                {canEdit && dragModeEnabled && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-[10px] font-extrabold uppercase">
                    Bongkar Pasang Aktif
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                {headerConfig.semester} • T.A. {headerConfig.tahunAjaran} • {headerConfig.namaSekolah}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Guru */}
            <div className="relative">
              <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <select
                value={selectedTeacherCode}
                onChange={(e) => setSelectedTeacherCode(e.target.value)}
                className="pl-8 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs font-bold text-slate-100 focus:outline-none focus:border-cyan-400 min-w-[210px]"
              >
                <option value="">-- Filter Berdasarkan Guru --</option>
                {teacherMappings.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.code} - {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Master / Personal */}
            <button
              type="button"
              onClick={() => {
                if (viewMode === 'master' && !selectedTeacherCode && teacherMappings[0]) {
                  setSelectedTeacherCode(teacherMappings[0].code);
                }
                setViewMode(viewMode === 'master' ? 'personal' : 'master');
              }}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              {viewMode === 'master' ? <User className="w-3.5 h-3.5 text-cyan-400" /> : <Grid className="w-3.5 h-3.5 text-emerald-400" />}
              <span>{viewMode === 'master' ? 'Lihat Jadwal Personal' : 'Lihat Jadwal Master'}</span>
            </button>

            {/* Unduh PDF */}
            <button
              type="button"
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-md"
              title="Unduh jadwal langsung dalam format PDF siap cetak"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Unduh PDF</span>
            </button>

            {/* Cetak */}
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              title="Cetak Jadwal"
            >
              <Printer className="w-3.5 h-3.5 text-sky-400" />
              <span>Cetak</span>
            </button>
          </div>
        </div>

        {/* Day Filter Tabs + Conflict Indicator */}
        {viewMode === 'master' && (
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/90">
            <div className="flex flex-wrap items-center gap-1.5">
              {['SEMUA', ...DAYS_LIST].map((d) => {
                const active = selectedDayFilter === d;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelectedDayFilter(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      active
                        ? 'bg-sky-600/25 border-sky-400 text-sky-200 shadow-sm'
                        : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {d === 'SEMUA' ? 'Semua Hari (Sen–Jum)' : d}
                  </button>
                );
              })}
            </div>

            {/* Right Status & Beban JP Quick Link */}
            <div className="flex flex-wrap items-center gap-2">
              {onOpenBebanJp && (
                <button
                  type="button"
                  onClick={onOpenBebanJp}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold border bg-cyan-500/15 text-cyan-200 border-cyan-500/40 hover:bg-cyan-500/25 flex items-center gap-1.5 transition-all cursor-pointer"
                  title="Buka tab Rekap & Analisis Beban JP Guru, Kelas, dan Mapel"
                >
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Beban JP: {bebanJpSummary.totalSchoolJp} JP</span>
                </button>
              )}

              {/* Conflict Detector Pill */}
              <button
                type="button"
                onClick={() => {
                  if (conflictAnalysis.list.length > 0) {
                    setHighlightConflictsOnly((p) => !p);
                  } else {
                    showToast('Tidak ada bentrok jadwal guru pada seluruh hari.', 'success');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                  conflictAnalysis.list.length > 0
                    ? highlightConflictsOnly
                      ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                      : 'bg-rose-500/15 text-rose-300 border-rose-500/50 hover:bg-rose-500/25'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                }`}
                title="Deteksi otomatis guru yang terjadwal di 2 kelas bersamaan"
              >
                {conflictAnalysis.list.length > 0 ? (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{conflictAnalysis.list.length} Bentrok Guru Terdeteksi</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>0 Bentrok Guru</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Bongkar Pasang Interactive Action Bar (Admin Only in Master Mode) */}
        {canEdit && viewMode === 'master' && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2.5 border-t border-slate-800/90">
            <div className="flex flex-wrap items-center gap-2">
              {/* Toggle Drag & Drop Mode */}
              <button
                type="button"
                onClick={() => {
                  setDragModeEnabled((prev) => {
                    const next = !prev;
                    if (!next) {
                      setSwapSource(null);
                      setSelectedBrush(null);
                    }
                    showToast(
                      next
                        ? 'Mode Geser & Bongkar Pasang AKTIF: seret kartu mapel antar sel, seret kolom kelas, atau lepas ke Rak.'
                        : 'Mode Geser DIKUNCI: tata letak papan jadwal aman dari geseran tidak sengaja.'
                    );
                    return next;
                  });
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                  dragModeEnabled
                    ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/50 hover:bg-cyan-500/30'
                    : 'bg-slate-900 text-slate-400 border-slate-700 hover:text-white'
                }`}
              >
                {dragModeEnabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>{dragModeEnabled ? 'Geser & Bongkar Pasang: Aktif' : 'Geser & Bongkar Pasang: Terkunci'}</span>
              </button>

              {/* Swap Slot Mode (just like Tukar Kursi in Denah Ruang Ujian) */}
              <button
                type="button"
                onClick={() => {
                  setSelectedBrush(null);
                  if (swapSource) {
                    setSwapSource(null);
                    showToast('Mode Tukar Slot dibatalkan.');
                  } else {
                    setDragModeEnabled(true);
                    setSwapSource({
                      coord: { day: '', time: '', classId: '', className: '' },
                    });
                    showToast('Mode Tukar Slot aktif: klik Sel pertama lalu klik Sel tujuan untuk bertukar posisi.');
                  }
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                  swapSource
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>
                  {swapSource
                    ? swapSource.coord.day
                      ? `Tukar dari ${swapSource.coord.className} (Batal)`
                      : 'Pilih Sel Pertama (Batal)'
                    : 'Tukar Slot'}
                </span>
              </button>

              {/* Toggle Holding Rack */}
              <button
                type="button"
                onClick={() => setShowRack((p) => !p)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
                  showRack
                    ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/50'
                    : 'bg-slate-900 text-slate-300 border-slate-700 hover:text-white'
                }`}
              >
                <PackageOpen className="w-3.5 h-3.5" />
                <span>Rak Bongkar Pasang</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-emerald-100 text-[10px] font-black tabular-nums">
                  {dockItems.length}
                </span>
              </button>

              {/* Add Class Column */}
              <button
                type="button"
                onClick={openAddClassModal}
                className="px-3 py-1.5 rounded-xl text-xs font-extrabold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1 cursor-pointer transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Kelas</span>
              </button>

              {/* Add Time Slot Row */}
              <button
                type="button"
                onClick={openAddSlotModal}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-sky-300 border border-sky-500/40 hover:bg-sky-500/15 flex items-center gap-1 cursor-pointer transition-all"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>+ Tambah Jam</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {undoStack.length > 0 && (
                <button
                  type="button"
                  onClick={handleUndo}
                  disabled={isBusy}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-indigo-600/25 text-indigo-200 border border-indigo-400/50 hover:bg-indigo-600/40 flex items-center gap-1.5 cursor-pointer transition-all"
                  title={`Urungkan: ${undoStack[0].label}`}
                >
                  <Undo2 className="w-3.5 h-3.5" />
                  <span>Urungkan ({undoStack.length})</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowHeaderModal(true)}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-300 border border-slate-700 hover:text-white hover:border-slate-500 flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-sky-400" />
                <span>Edit Header</span>
              </button>

              {onResetLayoutDefaults && (
                <button
                  type="button"
                  onClick={async () => {
                    await onResetLayoutDefaults();
                    showToast('Urutan kolom kelas & jam dikembalikan ke standar awal.', 'info');
                  }}
                  className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-900 text-slate-400 border border-slate-700 hover:text-amber-300 hover:border-amber-500/40 flex items-center gap-1 cursor-pointer"
                  title="Reset urutan kolom kelas dan slot waktu ke default"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Conflict List Banner when toggled */}
      {viewMode === 'master' && highlightConflictsOnly && conflictAnalysis.list.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-800 font-black text-xs uppercase">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <span>Daftar Bentrok Jadwal Guru ({conflictAnalysis.list.length} Slot)</span>
            </div>
            <button
              type="button"
              onClick={() => setHighlightConflictsOnly(false)}
              className="text-xs font-bold text-rose-600 hover:underline cursor-pointer"
            >
              Tutup Ringkasan
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {conflictAnalysis.list.map((c, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setSelectedDayFilter(c.day);
                  setSelectedTeacherCode(c.teacherCode);
                }}
                className="px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-left text-[11px] hover:border-rose-400 transition-all cursor-pointer shadow-xs"
              >
                <span className="font-black text-rose-700">
                  [{c.teacherCode}] {c.teacherName || 'Guru'}
                </span>
                <span className="text-slate-600">
                  {' '}
                  • {c.day} ({c.time}) → <b>{c.classes.join(' & ')}</b>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Active Brush / Tap-to-Place Status Strip */}
      {canEdit && viewMode === 'master' && selectedBrush && (
        <div className="bg-cyan-50 border-2 border-cyan-400 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shadow-sm">
          <div className="flex items-center gap-2 text-xs text-cyan-950 font-bold">
            <Sparkles className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>
              Mode Pasang Cepat Aktif:{' '}
              <span className="px-2 py-0.5 rounded bg-cyan-600 text-white font-black">
                {selectedBrush.subject} ({selectedBrush.teacherCode || '-'})
              </span>{' '}
              — Klik sel mana saja di tabel untuk langsung memasang!
            </span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedBrush(null)}
            className="px-2.5 py-1 rounded-lg bg-white border border-cyan-300 text-cyan-900 text-xs font-bold hover:bg-cyan-100 cursor-pointer"
          >
            Selesai Pasang
          </button>
        </div>
      )}

      {/* =====================================================================
          RAK BONGKAR PASANG (HOLDING DOCK + QUICK TEACHER/SUBJECT PALETTE)
         ===================================================================== */}
      {canEdit && viewMode === 'master' && showRack && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left 5 cols: Holding Dock (Bongkar / Parkir Sementara) */}
          <div
            onDragOver={(e) => {
              if (dragging?.kind === 'cell') {
                e.preventDefault();
                setHoverRackDrop(true);
              }
            }}
            onDragLeave={() => setHoverRackDrop(false)}
            onDrop={(e) => {
              e.preventDefault();
              handleDropOnRack();
            }}
            className={`lg:col-span-5 rounded-2xl border-2 border-dashed p-4 transition-all ${
              hoverRackDrop
                ? 'bg-emerald-50 border-emerald-500 ring-4 ring-emerald-200/70'
                : 'bg-white border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <PackageOpen className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-800">
                  Rak Parkir Bongkar Pasang ({dockItems.length})
                </h4>
              </div>
              {dockItems.length > 0 && onUpdateDockItems && (
                <button
                  type="button"
                  onClick={async () => {
                    const prev = [...dockItems];
                    await onUpdateDockItems([]);
                    pushUndo('Kosongkan Rak Parkir', async () => {
                      await onUpdateDockItems(prev);
                    });
                    showToast('Rak Parkir dikosongkan.', 'info');
                  }}
                  className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer"
                >
                  Kosongkan Rak
                </button>
              )}
            </div>

            {dockItems.length === 0 ? (
              <div className="py-5 px-3 rounded-xl bg-slate-50 border border-slate-200/80 text-center text-xs text-slate-500">
                <p className="font-bold text-slate-700">
                  Seret kartu jadwal dari tabel ke sini untuk membongkar (parkir sementara)
                </p>
                <p className="text-[11px] mt-1">
                  Jadwal yang terbongkar aman tersimpan di sini hingga Anda seret kembali ke hari/jam/kelas tujuan.
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2 max-h-[150px] overflow-y-auto pr-1">
                {dockItems.map((card) => {
                  const isBrush =
                    selectedBrush?.source === 'dock' && selectedBrush.dockId === card.id;
                  return (
                    <div
                      key={card.id}
                      draggable={dragModeEnabled}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDragging({ kind: 'dock', card });
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setHoverCellKey(null);
                      }}
                      onClick={() =>
                        setSelectedBrush(
                          isBrush
                            ? null
                            : {
                                source: 'dock',
                                dockId: card.id,
                                subject: card.subject,
                                teacherCode: card.teacherCode,
                                guruName: card.guruName,
                              }
                        )
                      }
                      className={`group relative px-2.5 py-1.5 rounded-xl border text-left transition-all cursor-grab active:cursor-grabbing flex items-center gap-2 ${getTeacherColor(
                        card.teacherCode,
                        card.subject
                      )} ${isBrush ? 'ring-2 ring-cyan-500 shadow-md scale-[1.02]' : 'hover:shadow-sm'}`}
                      title={`Seret ke sel tabel atau klik untuk Pasang Cepat • Asal: ${card.fromLabel || '-'}`}
                    >
                      <GripVertical className="w-3 h-3 opacity-50 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-[11px] font-black leading-tight flex items-center gap-1.5">
                          <span className="truncate max-w-[130px]">{card.subject}</span>
                          <span className="px-1 py-0.5 rounded bg-white/80 text-[10px] font-black">
                            {card.teacherCode || '-'}
                          </span>
                        </div>
                        {card.fromLabel && (
                          <div className="text-[9px] opacity-70 truncate max-w-[165px]">
                            Asal: {card.fromLabel}
                          </div>
                        )}
                      </div>
                      {onUpdateDockItems && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onUpdateDockItems(dockItems.filter((d) => d.id !== card.id));
                          }}
                          className="p-0.5 rounded hover:bg-rose-600 hover:text-white opacity-60 group-hover:opacity-100 cursor-pointer"
                          title="Hapus kartu dari rak"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right 7 cols: Quick Teacher & Subject Palette (Siap Seret / Pasang) */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-blue-600" />
                <h4 className="text-xs font-black uppercase tracking-wide text-slate-800">
                  Bank Kartu Guru &amp; Mapel (Seret atau Klik ke Tabel)
                </h4>
              </div>
              <div className="relative w-48">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Cari kode / guru / mapel..."
                  className="w-full pl-7 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-[11px] font-medium text-slate-800 focus:outline-none focus:border-blue-400"
                />
              </div>
            </div>

            {/* Quick Custom Card Composer */}
            <div className="flex flex-wrap items-center gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200/80">
              <select
                value={quickBankTeacherCode}
                onChange={(e) => {
                  const code = e.target.value;
                  setQuickBankTeacherCode(code);
                  const found = teacherMappings.find((t) => t.code === code);
                  if (found && !quickBankSubject) {
                    setQuickBankSubject(extractCleanSubjectFromTeacher(found));
                  }
                }}
                className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-blue-400"
              >
                {teacherMappings.map((t) => (
                  <option key={t.code} value={t.code}>
                    [{t.code}] {t.name}
                  </option>
                ))}
              </select>
              <input
                type="text"
                list="jadwal-mapel-datalist"
                value={quickBankSubject}
                onChange={(e) => setQuickBankSubject(e.target.value)}
                placeholder="Nama Mapel (cth: Matematika)"
                className="flex-1 min-w-[140px] px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-800 outline-none focus:border-blue-400"
              />
              <datalist id="jadwal-mapel-datalist">
                {mapelOptions.map((m, i) => (
                  <option key={i} value={m} />
                ))}
              </datalist>
              <div
                draggable={dragModeEnabled && Boolean(quickBankSubject.trim())}
                onDragStart={(e) => {
                  if (!quickBankSubject.trim()) return;
                  const guru = teacherMappings.find((t) => t.code === quickBankTeacherCode);
                  e.dataTransfer.effectAllowed = 'copy';
                  setDragging({
                    kind: 'bank',
                    card: {
                      subject: quickBankSubject.trim(),
                      teacherCode: quickBankTeacherCode,
                      guruName: guru?.name || '',
                    },
                  });
                }}
                onDragEnd={() => {
                  setDragging(null);
                  setHoverCellKey(null);
                }}
                onClick={() => {
                  if (!quickBankSubject.trim()) {
                    showToast('Isi nama mata pelajaran dulu untuk membuat kartu pasang.', 'warn');
                    return;
                  }
                  const guru = teacherMappings.find((t) => t.code === quickBankTeacherCode);
                  setSelectedBrush({
                    source: 'bank',
                    subject: quickBankSubject.trim(),
                    teacherCode: quickBankTeacherCode,
                    guruName: guru?.name || '',
                  });
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-bold flex items-center gap-1 cursor-grab active:cursor-grabbing shadow-xs"
                title="Seret kartu ini langsung ke sel tabel atau klik untuk Pasang Cepat"
              >
                <Move className="w-3 h-3" />
                <span>Seret / Pasang</span>
              </div>
            </div>

            {/* Draggable Teacher+Subject Chips */}
            <div className="flex flex-wrap gap-1.5 max-h-[96px] overflow-y-auto pr-1">
              {filteredBankTeachers.map((t) => {
                const subj = extractCleanSubjectFromTeacher(t);
                const isBrush =
                  selectedBrush?.source === 'bank' &&
                  selectedBrush.teacherCode === t.code &&
                  selectedBrush.subject === subj;
                return (
                  <button
                    key={t.code}
                    type="button"
                    draggable={dragModeEnabled}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'copy';
                      setDragging({
                        kind: 'bank',
                        card: {
                          subject: subj,
                          teacherCode: t.code,
                          guruName: t.name,
                        },
                      });
                    }}
                    onDragEnd={() => {
                      setDragging(null);
                      setHoverCellKey(null);
                    }}
                    onClick={() => {
                      setSelectedBrush(
                        isBrush
                          ? null
                          : {
                              source: 'bank',
                              subject: subj,
                              teacherCode: t.code,
                              guruName: t.name,
                            }
                      );
                    }}
                    className={`px-2 py-1 rounded-lg border text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-grab active:cursor-grabbing ${getTeacherColor(
                      t.code,
                      subj
                    )} ${isBrush ? 'ring-2 ring-cyan-500 shadow-sm' : 'hover:shadow-xs'}`}
                    title={`${t.name} (${t.subject}) — Beban: ${
                      bebanJpSummary.byTeacher.get(t.code)?.totalJp ?? 0
                    }/${bebanJpSummary.byTeacher.get(t.code)?.targetMin ?? bebanJpConfig.defaultMinJp} JP • Seret ke tabel atau klik lalu klik sel`}
                  >
                    <span className="font-black bg-white/80 px-1 rounded">{t.code}</span>
                    <span className="truncate max-w-[100px]">{subj}</span>
                    {(() => {
                      const jpInfo = bebanJpSummary.byTeacher.get(t.code);
                      const total = jpInfo?.totalJp ?? 0;
                      const target = jpInfo?.targetMin ?? bebanJpConfig.defaultMinJp;
                      const pillCls =
                        jpInfo?.status === 'ideal'
                          ? 'bg-emerald-600 text-white'
                          : jpInfo?.status === 'overload'
                          ? 'bg-rose-600 text-white'
                          : total > 0
                          ? 'bg-amber-500/90 text-white'
                          : 'bg-white/70 text-slate-500';
                      return (
                        <span className={`px-1 py-0.5 rounded text-[9px] font-black tabular-nums ${pillCls}`}>
                          {total}/{target}
                        </span>
                      );
                    })()}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          PERSONAL TEACHER SCHEDULE VIEW (FIXED & COMPLETE)
         ===================================================================== */}
      {viewMode === 'personal' ? (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-slate-50 via-emerald-50/40 to-white flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider">
                Jadwal Mengajar Personal Guru
              </span>
              <h2 className="text-xl font-black text-slate-900 mt-1.5">
                {activePersonalTeacher
                  ? `${activePersonalTeacher.name} (Kode ${activePersonalTeacher.code})`
                  : 'Pilih Guru Terlebih Dahulu'}
              </h2>
              <p className="text-xs text-slate-600 mt-0.5">
                {activePersonalTeacher?.subject || 'Bidang studi'} • {headerConfig.semester} • T.A.{' '}
                {headerConfig.tahunAjaran}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              {(() => {
                const jpInfo = activePersonalTeacher
                  ? bebanJpSummary.byTeacher.get(activePersonalTeacher.code)
                  : null;
                return (
                  <div className="px-4 py-2.5 rounded-xl bg-blue-600 text-white text-center shadow-sm">
                    <div className="text-[10px] font-bold uppercase opacity-80">Total Beban JP</div>
                    <div className="text-xl font-black tabular-nums">
                      {jpInfo?.totalJp ?? 0}{' '}
                      <span className="text-xs font-bold opacity-80">
                        / {jpInfo?.targetMin ?? bebanJpConfig.defaultMinJp} JP
                      </span>
                    </div>
                  </div>
                );
              })()}
              <div className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-center shadow-sm">
                <div className="text-[10px] font-bold uppercase opacity-80">Total Sesi / Minggu</div>
                <div className="text-xl font-black tabular-nums">{personalScheduleRows.length}</div>
              </div>
              <div className="px-4 py-2.5 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-center">
                <div className="text-[10px] font-bold uppercase text-blue-600">Jumlah Kelas</div>
                <div className="text-xl font-black tabular-nums">
                  {new Set(personalScheduleRows.map((r) => r.className)).size}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            {personalScheduleRows.length === 0 ? (
              <div className="py-12 text-center text-slate-500 border-2 border-dashed border-slate-200 rounded-2xl">
                <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm font-bold text-slate-700">
                  Belum ada jadwal mengajar untuk guru terpilih.
                </p>
                <p className="text-xs mt-1">
                  Pilih guru lain pada dropdown di atas atau pasang jadwal di tampilan Master.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
                {DAYS_LIST.map((day) => {
                  const dayRows = personalScheduleRows.filter((r) => r.day === day);
                  return (
                    <div
                      key={day}
                      className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden flex flex-col"
                    >
                      <div className="px-3.5 py-2.5 bg-slate-900 text-white flex items-center justify-between">
                        <span className="text-xs font-black tracking-wider">{day}</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/25 text-emerald-300 text-[10px] font-black">
                          {dayRows.length} Sesi
                        </span>
                      </div>
                      <div className="p-2.5 space-y-2 flex-1">
                        {dayRows.length === 0 ? (
                          <div className="py-6 text-center text-[11px] text-slate-400 italic">
                            Tidak ada jam mengajar
                          </div>
                        ) : (
                          dayRows.map((row, idx) => (
                            <div
                              key={idx}
                              className={`p-2.5 rounded-xl border shadow-2xs ${getTeacherColor(
                                activePersonalTeacher?.code || '',
                                row.subject
                              )}`}
                            >
                              <div className="text-[10px] font-black opacity-80 flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{row.time}</span>
                              </div>
                              <div className="text-xs font-black mt-1 leading-snug">
                                {row.subject}
                              </div>
                              <div className="text-[11px] font-bold mt-1 px-2 py-0.5 rounded bg-white/75 w-fit">
                                {row.className}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =====================================================================
           MASTER INTERACTIVE TIMETABLE BOARD (DRAG, SWAP & BONGKAR PASANG)
           ===================================================================== */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden print:shadow-none print:border-none">
          {/* Official Navy Blue School Banner Header */}
          <div className="p-4 sm:p-5 bg-white border-b border-slate-200">
            <div className="bg-gradient-to-r from-[#0A3170] via-[#0C3B87] to-[#0A3170] rounded-2xl px-4 sm:px-7 py-4 sm:py-5 shadow-md flex items-center justify-between gap-4">
              {/* Left School Logo Badge */}
              <div className="w-16 h-16 sm:w-[76px] sm:h-[76px] rounded-2xl bg-white p-1.5 shadow-sm flex items-center justify-center shrink-0">
                <img
                  src={logoUrl || INITIAL_SCHOOL_SETTINGS.logoUrl}
                  alt={`Logo ${headerConfig.namaSekolah}`}
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Center 3-Line Title */}
              <div className="flex-1 text-center space-y-1">
                <h1 className="text-xl sm:text-2xl md:text-[26px] font-black text-white tracking-wide uppercase leading-tight">
                  {headerConfig.judul}
                </h1>
                <p className="text-xs sm:text-sm md:text-[15px] font-black text-yellow-400 tracking-wider uppercase leading-snug">
                  {`${headerConfig.semester} TAHUN AJARAN ${headerConfig.tahunAjaran}`.toUpperCase()}
                </p>
                <h2 className="text-sm sm:text-base md:text-lg font-black text-white tracking-wide uppercase leading-tight">
                  {headerConfig.namaSekolah}
                </h2>
              </div>

              {/* Right Optical Centering Spacer */}
              <div className="hidden sm:block w-[76px] shrink-0" aria-hidden="true" />
            </div>

            {canEdit && dragModeEnabled && (
              <p className="text-[11px] text-cyan-700 font-semibold text-center pt-2.5">
                Tip: Seret sel untuk pindah/tukar jadwal • Seret judul kolom kelas untuk atur urutan • Klik sel untuk edit cepat • Seret ke Rak untuk bongkar sementara
              </p>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[10px] sm:text-[11px] select-none">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-200">
                  <th
                    rowSpan={2}
                    className="p-2 border-r border-slate-200 text-center uppercase font-bold text-slate-600 w-12"
                  >
                    Hari
                  </th>
                  <th
                    rowSpan={2}
                    className="p-2 border-r border-slate-200 text-center uppercase font-bold text-slate-600 w-24"
                  >
                    Waktu
                  </th>
                  {scheduleClasses.map((c) => {
                    const isColHovered = hoverColId === c.id;
                    return (
                      <th
                        key={c.id}
                        colSpan={2}
                        draggable={canEdit && dragModeEnabled}
                        onDragStart={(e) => {
                          e.dataTransfer.effectAllowed = 'move';
                          setDragging({ kind: 'col', classId: c.id });
                        }}
                        onDragOver={(e) => {
                          if (dragging?.kind === 'col' && dragging.classId !== c.id) {
                            e.preventDefault();
                            setHoverColId(c.id);
                          }
                        }}
                        onDragLeave={() => setHoverColId(null)}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropColumnReorder(c.id);
                        }}
                        onDragEnd={() => {
                          setDragging(null);
                          setHoverColId(null);
                        }}
                        className={`group relative p-2 border-r border-slate-200 text-center font-black border-b transition-all ${getClassColors(
                          c.name
                        )} ${canEdit && dragModeEnabled ? 'cursor-grab active:cursor-grabbing' : ''} ${
                          isColHovered ? 'ring-2 ring-inset ring-cyan-500 bg-cyan-100/70' : ''
                        }`}
                      >
                        <div className="flex items-center justify-center gap-1">
                          {canEdit && dragModeEnabled && (
                            <GripHorizontal className="w-3 h-3 opacity-40 group-hover:opacity-100 shrink-0" />
                          )}
                          <span className="leading-tight">{c.name}</span>
                        </div>
                        {canEdit && dragModeEnabled && (
                          <div className="absolute top-0.5 right-0.5 hidden group-hover:flex items-center gap-0.5 bg-white/95 rounded-md shadow-xs border border-slate-200 p-0.5 z-20">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openRenameClassModal(c);
                              }}
                              className="p-0.5 text-blue-600 hover:bg-blue-50 rounded cursor-pointer"
                              title="Ubah nama kolom kelas"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                            {scheduleClasses.length > 1 && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmRemoveClass(c);
                                }}
                                className="p-0.5 text-rose-600 hover:bg-rose-50 rounded cursor-pointer"
                                title="Lepas kolom kelas ini"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </div>
                        )}
                      </th>
                    );
                  })}
                </tr>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {scheduleClasses.map((c) => (
                    <React.Fragment key={c.id}>
                      <th className="p-1 border-r border-slate-200 text-center font-bold text-slate-500 min-w-[76px]">
                        Mapel
                      </th>
                      <th className="p-1 border-r border-slate-200 text-center font-bold text-slate-500 w-10">
                        Kode
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody>
                {activeDays.map((day) => (
                  <React.Fragment key={day}>
                    {timeSlots.map((time, tIdx) => {
                      const specialEntry = getSpecialActivity(day, time);
                      const isActive = isCurrentSession(day, time);
                      const isRowDragOver = hoverRowIdx === tIdx;

                      return (
                        <tr
                          key={`${day}-${time}-${tIdx}`}
                          className={`border-b border-slate-200/80 transition-colors ${
                            isActive ? 'bg-amber-50 ring-2 ring-inset ring-amber-400 z-10' : ''
                          } ${isRowDragOver ? 'ring-2 ring-inset ring-cyan-500 bg-cyan-50/50' : ''}`}
                        >
                          {tIdx === 0 && (
                            <td
                              rowSpan={timeSlots.length}
                              className={`p-2 border-r-2 border-slate-300 text-center font-black text-slate-800 rotate-180 [writing-mode:vertical-lr] tracking-widest ${
                                day === currentDayName ? 'bg-amber-100' : 'bg-slate-100/90'
                              }`}
                            >
                              {day}
                            </td>
                          )}

                          {/* Time Slot Cell — Draggable vertically + Quick Activity/Edit/Delete */}
                          <td
                            draggable={canEdit && dragModeEnabled}
                            onDragStart={(e) => {
                              e.dataTransfer.effectAllowed = 'move';
                              setDragging({ kind: 'row', slotIndex: tIdx });
                            }}
                            onDragOver={(e) => {
                              if (dragging?.kind === 'row' && dragging.slotIndex !== tIdx) {
                                e.preventDefault();
                                setHoverRowIdx(tIdx);
                              }
                            }}
                            onDragLeave={() => setHoverRowIdx(null)}
                            onDrop={(e) => {
                              e.preventDefault();
                              handleDropRowReorder(tIdx);
                            }}
                            onDragEnd={() => {
                              setDragging(null);
                              setHoverRowIdx(null);
                            }}
                            className={`group relative p-1.5 border-r border-slate-200 text-center font-bold whitespace-nowrap ${
                              isActive ? 'bg-amber-400 text-white' : 'bg-slate-50 text-slate-700'
                            } ${canEdit && dragModeEnabled ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          >
                            <div className="flex items-center justify-center gap-1">
                              {canEdit && dragModeEnabled && (
                                <GripVertical className="w-3 h-3 opacity-35 group-hover:opacity-100 shrink-0" />
                              )}
                              <span>{time}</span>
                            </div>

                            {canEdit && dragModeEnabled && (
                              <div className="hidden group-hover:flex items-center justify-center gap-0.5 mt-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openActivityModal(day, time);
                                  }}
                                  className="px-1 py-0.5 rounded bg-indigo-100 hover:bg-indigo-200 text-indigo-700 text-[9px] font-bold cursor-pointer"
                                  title="Jadikan baris Kegiatan Sekolah (Upacara/Istirahat/Dhuha) atau kembalikan ke Mapel"
                                >
                                  <Coffee className="w-2.5 h-2.5 inline" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditSlotModal(tIdx);
                                  }}
                                  className="px-1 py-0.5 rounded bg-blue-100 hover:bg-blue-200 text-blue-700 text-[9px] font-bold cursor-pointer"
                                  title="Ubah rentang jam"
                                >
                                  <Pencil className="w-2.5 h-2.5 inline" />
                                </button>
                                {timeSlots.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmRemoveSlotIdx(tIdx);
                                    }}
                                    className="px-1 py-0.5 rounded bg-rose-100 hover:bg-rose-200 text-rose-700 text-[9px] font-bold cursor-pointer"
                                    title="Hapus baris jam ini"
                                  >
                                    <Trash2 className="w-2.5 h-2.5 inline" />
                                  </button>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Special Activity Row OR Interactive Lesson Cells */}
                          {specialEntry ? (
                            <td
                              colSpan={scheduleClasses.length * 2}
                              onClick={() => {
                                if (canEdit && dragModeEnabled) {
                                  openActivityModal(day, time);
                                }
                              }}
                              className={`group relative p-1.5 text-center font-black uppercase tracking-[0.35em] transition-all ${getSpecialRowStyle(
                                specialEntry.subject,
                                isActive
                              )} ${canEdit && dragModeEnabled ? 'cursor-pointer hover:brightness-95' : ''}`}
                              title={
                                canEdit && dragModeEnabled
                                  ? 'Klik untuk ubah kegiatan atau bongkar kembali menjadi slot mapel'
                                  : specialEntry.subject
                              }
                            >
                              <span>{specialEntry.subject}</span>
                              {canEdit && dragModeEnabled && (
                                <span className="ml-3 hidden group-hover:inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/90 text-slate-700 text-[9px] tracking-normal font-bold border border-slate-300">
                                  <Pencil className="w-2.5 h-2.5" /> Edit / Bongkar Kegiatan
                                </span>
                              )}
                            </td>
                          ) : (
                            scheduleClasses.map((cls) => {
                              const entry = getCellEntry(day, time, cls);
                              const code = resolveTeacherCode(entry);
                              const cellKey = `${day}|${time}|${cls.id}`;
                              const coord: CellCoord = {
                                day,
                                time,
                                classId: cls.id,
                                className: cls.name,
                              };
                              const isConflict = conflictAnalysis.conflictingCellKeys.has(cellKey);
                              const isDropHovered = hoverCellKey === cellKey;
                              const isSwapSelected =
                                swapSource &&
                                swapSource.coord.day === day &&
                                swapSource.coord.time === time &&
                                swapSource.coord.classId === cls.id;
                              const cellColor = entry
                                ? getTeacherColor(code, entry.subject)
                                : 'bg-transparent';
                              const tint = getColumnTint(cls.name);

                              const conflictDimmed = highlightConflictsOnly && !isConflict;

                              return (
                                <td
                                  key={cls.id}
                                  colSpan={2}
                                  draggable={Boolean(canEdit && dragModeEnabled && entry)}
                                  onDragStart={(e) => {
                                    if (!entry || !canEdit || !dragModeEnabled) return;
                                    e.dataTransfer.effectAllowed = 'move';
                                    setDragging({ kind: 'cell', coord, entry });
                                  }}
                                  onDragOver={(e) => {
                                    if (
                                      canEdit &&
                                      dragModeEnabled &&
                                      dragging &&
                                      (dragging.kind === 'cell' ||
                                        dragging.kind === 'dock' ||
                                        dragging.kind === 'bank')
                                    ) {
                                      e.preventDefault();
                                      setHoverCellKey(cellKey);
                                    }
                                  }}
                                  onDragLeave={() => {
                                    if (hoverCellKey === cellKey) setHoverCellKey(null);
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleDropOnCell(coord, entry);
                                  }}
                                  onDragEnd={() => {
                                    setDragging(null);
                                    setHoverCellKey(null);
                                  }}
                                  onClick={() => {
                                    if (swapSource && !swapSource.coord.day) {
                                      setSwapSource({ coord, entry });
                                      showToast(
                                        `Sumber dipilih: ${entry ? entry.subject : 'Slot Kosong'} (${cls.name}). Sekarang klik sel tujuan!`
                                      );
                                      return;
                                    }
                                    handleCellClick(coord, entry);
                                  }}
                                  className={`group relative p-0 border-r border-slate-200 align-middle transition-all ${
                                    entry ? cellColor : tint
                                  } ${
                                    canEdit && dragModeEnabled
                                      ? entry
                                        ? 'cursor-grab active:cursor-grabbing hover:brightness-95'
                                        : 'cursor-pointer hover:bg-cyan-50/70'
                                      : ''
                                  } ${isActive && entry ? 'ring-1 ring-inset ring-amber-500' : ''} ${
                                    isDropHovered
                                      ? 'ring-2 ring-inset ring-cyan-500 bg-cyan-100/80 z-20'
                                      : ''
                                  } ${
                                    isSwapSelected
                                      ? 'ring-2 ring-inset ring-amber-500 bg-amber-100/90 animate-pulse z-20'
                                      : ''
                                  } ${
                                    isConflict
                                      ? 'ring-2 ring-inset ring-rose-500 z-10'
                                      : ''
                                  } ${conflictDimmed ? 'opacity-25' : ''}`}
                                  title={
                                    entry
                                      ? `${entry.subject} — Kode ${code || '-'} (${resolveTeacherName(
                                          code,
                                          entry.guruName
                                        )})${isConflict ? ' ⚠️ BENTROK GURU!' : ''}${
                                          canEdit && dragModeEnabled
                                            ? ' • Seret untuk geser/tukar atau klik untuk edit'
                                            : ''
                                        }`
                                      : canEdit && dragModeEnabled
                                      ? `Slot kosong (${cls.name}) • Klik untuk pasang atau seret kartu ke sini`
                                      : ''
                                  }
                                >
                                  <div className="flex items-stretch min-h-[34px]">
                                    {/* Mapel Half */}
                                    <div className="flex-1 px-1 py-1 border-r border-slate-200/70 flex items-center justify-center text-center font-semibold leading-tight">
                                      {entry ? (
                                        <span className="line-clamp-2">{entry.subject}</span>
                                      ) : canEdit && dragModeEnabled ? (
                                        <span className="text-[9px] text-slate-300 opacity-0 group-hover:opacity-100 font-bold">
                                          + Pasang
                                        </span>
                                      ) : null}
                                    </div>
                                    {/* Kode Half */}
                                    <div className="w-10 px-1 py-1 flex items-center justify-center text-center font-black shrink-0">
                                      {code}
                                    </div>
                                  </div>

                                  {/* Conflict Corner Dot */}
                                  {isConflict && (
                                    <span
                                      className="absolute top-0.5 left-0.5 w-2 h-2 rounded-full bg-rose-600 ring-2 ring-white"
                                      title="Bentrok Guru pada jam yang sama!"
                                    />
                                  )}

                                  {/* Quick Bongkar (Detach to Rack) hover button */}
                                  {canEdit && dragModeEnabled && entry && !swapSource && !selectedBrush && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        detachCellToRack(coord, entry);
                                      }}
                                      className="hidden group-hover:flex absolute -top-1 -right-1 w-4.5 h-4.5 rounded-full bg-slate-900 hover:bg-emerald-600 text-white items-center justify-center shadow-md z-20 cursor-pointer"
                                      title="Bongkar (lepas) ke Rak Bongkar Pasang"
                                    >
                                      <PackageOpen className="w-2.5 h-2.5" />
                                    </button>
                                  )}
                                </td>
                              );
                            })
                          )}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Tables: Teacher List & Piket */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Teacher List Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-blue-500" /> Daftar Guru &amp; Kode
            </h4>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Klik guru untuk menyorot jadwal
            </span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
            <table className="w-full text-xs border-collapse">
              <thead className="sticky top-0 bg-white shadow-sm z-10">
                <tr className="bg-slate-100 border-b border-slate-200">
                  <th className="p-2 border-r border-slate-200 text-left">NO</th>
                  <th className="p-2 border-r border-slate-200 text-left">Kode</th>
                  <th className="p-2 border-r border-slate-200 text-left">Nama Guru</th>
                  <th className="p-2 border-r border-slate-200 text-left">Mata Pelajaran</th>
                  <th className="p-2 text-center">Beban JP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {teacherMappings.map((t, idx) => {
                  const jpInfo = bebanJpSummary.byTeacher.get(t.code);
                  const totalJp = jpInfo?.totalJp ?? 0;
                  const targetMin = jpInfo?.targetMin ?? bebanJpConfig.defaultMinJp;
                  const jpBadgeCls =
                    jpInfo?.status === 'ideal'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                      : jpInfo?.status === 'overload'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : totalJp > 0
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-slate-100 text-slate-500 border-slate-200';
                  return (
                    <tr
                      key={t.code}
                      className={`hover:bg-blue-50 transition-colors cursor-pointer ${
                        selectedTeacherCode === t.code ? 'bg-blue-100 font-bold' : ''
                      }`}
                      onClick={() => setSelectedTeacherCode(t.code === selectedTeacherCode ? '' : t.code)}
                    >
                      <td className="p-2 border-r border-slate-100 text-slate-500">{idx + 1}</td>
                      <td className="p-2 border-r border-slate-100 font-black text-blue-600">{t.code}</td>
                      <td className="p-2 border-r border-slate-100 font-bold text-slate-800">{t.name}</td>
                      <td className="p-2 border-r border-slate-100 text-slate-600 italic">{t.subject}</td>
                      <td className="p-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md border text-[10px] font-black tabular-nums ${jpBadgeCls}`}
                        >
                          {totalJp}/{targetMin} JP
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Piket Schedule Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h4 className="font-bold text-slate-800 flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-emerald-500" /> Jadwal Piket Guru
            </h4>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Gedung SMP &amp; SD
            </span>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-100 border-b border-slate-200">
              <tr>
                <th className="p-2 border-r border-slate-200 text-left">WAKTU</th>
                <th className="p-2 border-r border-slate-200 text-left">JAM KE</th>
                <th className="p-2 border-r border-slate-200 text-left">GEDUNG SMP</th>
                <th className="p-2 text-left">GEDUNG SD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PIKET_SCHEDULE.map((p, idx) => {
                const showDay = idx === 0 || PIKET_SCHEDULE[idx - 1].day !== p.day;
                return (
                  <tr key={idx} className="hover:bg-emerald-50 transition-colors">
                    <td className="p-2 border-r border-slate-100 font-black text-emerald-700">
                      {showDay ? p.day : ''}
                    </td>
                    <td className="p-2 border-r border-slate-100 text-slate-600 font-medium">{p.jamKe}</td>
                    <td className="p-2 border-r border-slate-100 font-bold text-slate-800">{p.gedungSmp}</td>
                    <td className="p-2 text-slate-800">{p.gedungSd}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="p-4 bg-slate-50 border-t border-slate-200 italic text-[10px] text-slate-500 text-center">
            * Jadwal dapat berubah sewaktu-waktu sesuai kebijakan kepala sekolah.
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: QUICK CELL EDITOR (KLIK SEL SEPERTI KURSI DENAH RUANG UJIAN)
         ===================================================================== */}
      {editingCell && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black">
                  {editingCell.entry ? 'Edit / Bongkar Slot Jadwal' : 'Pasang Jadwal Baru'}
                </h4>
                <p className="text-[11px] text-cyan-300 font-semibold mt-0.5">
                  {editingCell.coord.day} • {editingCell.coord.time} • {editingCell.coord.className}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCell(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCellModal} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Guru Pengajar &amp; Kode
                </label>
                <select
                  value={cellFormTeacherCode}
                  onChange={(e) => {
                    const code = e.target.value;
                    setCellFormTeacherCode(code);
                    const found = teacherMappings.find((t) => t.code === code);
                    if (found && !cellFormSubject.trim()) {
                      setCellFormSubject(extractCleanSubjectFromTeacher(found));
                    }
                  }}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Pilih Guru (Opsional) --</option>
                  {teacherMappings.map((t) => (
                    <option key={t.code} value={t.code}>
                      [{t.code}] {t.name} — {t.subject}
                    </option>
                  ))}
                </select>
              </div>

              {modalConflictClass && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>
                    <b>Peringatan Bentrok:</b> Guru kode <b>{cellFormTeacherCode}</b> sudah terjadwal
                    di kelas <b>{modalConflictClass}</b> pada {editingCell.coord.day}{' '}
                    {editingCell.coord.time}.
                  </span>
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Mata Pelajaran *
                </label>
                <input
                  type="text"
                  list="jadwal-modal-mapel-list"
                  value={cellFormSubject}
                  onChange={(e) => setCellFormSubject(e.target.value)}
                  placeholder="Contoh: Matematika, IPA, Bahasa Indonesia..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
                <datalist id="jadwal-modal-mapel-list">
                  {mapelOptions.map((m, i) => (
                    <option key={i} value={m} />
                  ))}
                </datalist>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  {editingCell.entry && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          const { coord, entry } = editingCell;
                          setEditingCell(null);
                          if (entry) await detachCellToRack(coord, entry);
                        }}
                        className="px-3 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <PackageOpen className="w-3.5 h-3.5" /> Bongkar
                      </button>
                      <button
                        type="button"
                        onClick={handleClearCellModal}
                        className="px-3 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Kosongkan
                      </button>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCell(null)}
                    className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm cursor-pointer"
                  >
                    Simpan &amp; Pasang
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: SET / BONGKAR BARIS KEGIATAN SEKOLAH
         ===================================================================== */}
      {editingActivityRow && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h4 className="text-sm font-black">Atur Baris Kegiatan Sekolah</h4>
                <p className="text-[11px] text-amber-300 font-semibold mt-0.5">
                  {editingActivityRow.day} • {editingActivityRow.time}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingActivityRow(null)}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {KEGIATAN_PRESETS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setActivityInputName(k)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                      activityInputName.toUpperCase() === k.toUpperCase()
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Label Kegiatan (Menyeluruh Semua Kelas)
                </label>
                <input
                  type="text"
                  value={activityInputName}
                  onChange={(e) => setActivityInputName(e.target.value)}
                  placeholder="Misal: UPACARA, ISTIRAHAT, SHOLAT DHUHA..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {editingActivityRow.currentName ? (
                  <button
                    type="button"
                    onClick={() => handleSaveActivityRow(null)}
                    className="px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 text-xs font-bold cursor-pointer"
                  >
                    Bongkar → Ubah ke Slot Mapel
                  </button>
                ) : (
                  <span />
                )}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingActivityRow(null)}
                    className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!activityInputName.trim()) return;
                      handleSaveActivityRow(activityInputName.trim());
                    }}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold cursor-pointer"
                  >
                    Terapkan Kegiatan
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: TAMBAH / RENAME KOLOM KELAS
         ===================================================================== */}
      {showAddClassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-black">
                {classFormMode === 'add' ? 'Tambah Kolom Kelas Baru' : 'Ubah Nama Kolom Kelas'}
              </h4>
              <button
                type="button"
                onClick={() => setShowAddClassModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveClassModal} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Nama Kelas / Rombel
                </label>
                <input
                  type="text"
                  value={classNameInput}
                  onChange={(e) => setClassNameInput(e.target.value)}
                  placeholder="Contoh: IX - Ali bin Abi Thalib"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClassModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black cursor-pointer"
                >
                  {classFormMode === 'add' ? 'Tambah ke Papan' : 'Simpan Nama'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: TAMBAH / EDIT BARIS JAM PELAJARAN
         ===================================================================== */}
      {showAddSlotModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-black">
                {slotFormIndex === null ? 'Tambah Baris Jam Pelajaran' : 'Ubah Rentang Waktu'}
              </h4>
              <button
                type="button"
                onClick={() => setShowAddSlotModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveSlotModal} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">
                  Format Waktu (JJ.mm - JJ.mm)
                </label>
                <input
                  type="text"
                  value={slotInputText}
                  onChange={(e) => setSlotInputText(e.target.value)}
                  placeholder="Contoh: 15.40 - 16.20"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddSlotModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Waktu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 5: EDIT HEADER JADWAL
         ===================================================================== */}
      {showHeaderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <h4 className="text-sm font-black">Edit Header Papan Jadwal</h4>
              <button
                type="button"
                onClick={() => setShowHeaderModal(false)}
                className="p-1 rounded-lg hover:bg-slate-800 text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (onUpdateHeader) {
                  await onUpdateHeader(headerForm);
                  showToast('Header papan jadwal berhasil disimpan.', 'success');
                }
                setShowHeaderModal(false);
              }}
              className="p-5 space-y-3"
            >
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Judul Utama</label>
                <input
                  type="text"
                  value={headerForm.judul}
                  onChange={(e) => setHeaderForm({ ...headerForm, judul: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Nama Sekolah</label>
                <input
                  type="text"
                  value={headerForm.namaSekolah}
                  onChange={(e) => setHeaderForm({ ...headerForm, namaSekolah: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Semester</label>
                  <input
                    type="text"
                    value={headerForm.semester}
                    onChange={(e) => setHeaderForm({ ...headerForm, semester: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Tahun Pelajaran</label>
                  <input
                    type="text"
                    value={headerForm.tahunAjaran}
                    onChange={(e) => setHeaderForm({ ...headerForm, tahunAjaran: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowHeaderModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold cursor-pointer"
                >
                  Simpan Header
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =====================================================================
          CONFIRMATION MODALS (NO window.confirm)
         ===================================================================== */}
      {confirmRemoveClass && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-900">Lepas Kolom Kelas?</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Kolom <b>{confirmRemoveClass.name}</b> akan dilepas dari tampilan papan jadwal. Anda
              tetap bisa mengurungkan atau menambahkannya kembali kapan saja.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveClass(null)}
                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveClass}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Lepas Kolom
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmRemoveSlotIdx !== null && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-sm p-5 space-y-4">
            <h4 className="text-sm font-black text-slate-900">Hapus Baris Jam Pelajaran?</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              Slot waktu <b>{timeSlots[confirmRemoveSlotIdx]}</b> akan dilepas dari papan jadwal.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveSlotIdx(null)}
                className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveSlot}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
              >
                Hapus Baris Jam
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
