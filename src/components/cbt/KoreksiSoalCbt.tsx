import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Edit3,
  FileText,
  Filter,
  HelpCircle,
  Layers,
  ListChecks,
  Play,
  RefreshCw,
  Save,
  Search,
  Sparkles,
  User,
  Users
} from 'lucide-react';
import { BankSoal, HasilUjian, JawabanSiswa, SoalCBT } from '../../types/school';
import { sortSoalByTipeOrder } from './bankSoalWord';

interface KoreksiSoalCbtProps {
  hasilUjianList: HasilUjian[];
  onUpdateHasilUjian: (updated: HasilUjian) => void;
  onBatchUpdateHasilUjian?: (updatedItems: HasilUjian[]) => void;
  bankSoalList: BankSoal[];
  availableKelasList: string[];
  availableMapelList: string[];
  resolveHasilMapel: (h: HasilUjian) => string;
  initialSelectedHasilId?: string | null;
  onNavigateToSimulasi: () => void;
  korektorNama: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

interface DraftButirNilai {
  nilai: number;
  sudahDikoreksi: boolean;
  catatanGuru: string;
}

function formatJawabanText(jawaban: string | string[] | undefined, soal?: SoalCBT): string {
  if (jawaban === undefined || jawaban === null) return '';
  if (Array.isArray(jawaban)) {
    if (jawaban.length === 0) return '';
    if (soal?.opsi && soal.opsi.length > 0) {
      return jawaban
        .map(id => {
          const opt = soal.opsi?.find(o => o.id.toUpperCase() === String(id).toUpperCase());
          return opt ? `${opt.id}. ${opt.teks}` : String(id);
        })
        .join(' | ');
    }
    return jawaban.join(', ');
  }
  const str = String(jawaban).trim();
  if (!str) return '';
  if (soal?.opsi && soal.opsi.length > 0 && (soal.tipe === 'pg' || soal.tipe === 'multiple_choice')) {
    const opt = soal.opsi.find(o => o.id.toUpperCase() === str.toUpperCase());
    if (opt) return `${opt.id}. ${opt.teks}`;
  }
  return str;
}

function formatKunciText(kunci: string | string[] | undefined, soal?: SoalCBT): string {
  if (kunci === undefined || kunci === null) return '-';
  if (Array.isArray(kunci)) {
    if (kunci.length === 0) return '-';
    if (soal?.opsi && soal.opsi.length > 0) {
      return kunci
        .map(id => {
          const opt = soal.opsi?.find(o => o.id.toUpperCase() === String(id).toUpperCase());
          return opt ? `${opt.id}. ${opt.teks}` : String(id);
        })
        .join(' | ');
    }
    return kunci.join(', ');
  }
  const str = String(kunci).trim();
  if (!str) return '-';
  if (soal?.opsi && soal.opsi.length > 0 && soal.tipe === 'pg') {
    const opt = soal.opsi.find(o => o.id.toUpperCase() === str.toUpperCase());
    if (opt) return `${opt.id}. ${opt.teks}`;
  }
  return str;
}

function autoEvaluateObjectiveScore(soal: SoalCBT, ansObj?: JawabanSiswa): DraftButirNilai {
  const bobot = Math.max(1, Number(soal.bobot) || 10);
  const rawAns = ansObj?.jawaban;

  if (ansObj && typeof ansObj.nilai === 'number' && !Number.isNaN(ansObj.nilai)) {
    const clamped = Math.max(0, Math.min(bobot, ansObj.nilai));
    const alreadyChecked =
      ansObj.sudahDikoreksi !== undefined ? ansObj.sudahDikoreksi : soal.tipe !== 'esai';
    return {
      nilai: clamped,
      sudahDikoreksi: alreadyChecked,
      catatanGuru: ansObj.catatanGuru || ''
    };
  }

  if (soal.tipe === 'pg') {
    const u = String(rawAns || '').trim().toUpperCase();
    const k = String(soal.kunciJawaban || '').trim().toUpperCase();
    return {
      nilai: u && k && u === k ? bobot : 0,
      sudahDikoreksi: true,
      catatanGuru: ansObj?.catatanGuru || ''
    };
  }

  if (soal.tipe === 'multiple_choice') {
    const uArr = Array.isArray(rawAns)
      ? rawAns.map(x => String(x).trim().toUpperCase()).sort()
      : [];
    const kArr = Array.isArray(soal.kunciJawaban)
      ? soal.kunciJawaban.map(x => String(x).trim().toUpperCase()).sort()
      : String(soal.kunciJawaban || '')
          .split(/[,;]/)
          .map(x => x.trim().toUpperCase())
          .filter(Boolean)
          .sort();
    const match = uArr.length > 0 && uArr.length === kArr.length && uArr.every((v, i) => v === kArr[i]);
    return {
      nilai: match ? bobot : 0,
      sudahDikoreksi: true,
      catatanGuru: ansObj?.catatanGuru || ''
    };
  }

  if (soal.tipe === 'isian') {
    const u = String(rawAns || '').trim().toLowerCase();
    const k = String(soal.kunciJawaban || '').trim().toLowerCase();
    if (!u) {
      return {
        nilai: 0,
        sudahDikoreksi: true,
        catatanGuru: ansObj?.catatanGuru || ''
      };
    }
    const exactMatch = Boolean(k && u === k);
    return {
      nilai: exactMatch ? bobot : 0,
      sudahDikoreksi: exactMatch,
      catatanGuru: ansObj?.catatanGuru || ''
    };
  }

  // Esai
  const uEsai = String(rawAns || '').trim();
  return {
    nilai: 0,
    sudahDikoreksi: uEsai === '',
    catatanGuru: ansObj?.catatanGuru || ''
  };
}

function getTipeBadgeInfo(tipe: SoalCBT['tipe']): { label: string; className: string } {
  switch (tipe) {
    case 'pg':
      return {
        label: 'PG',
        className: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      };
    case 'multiple_choice':
      return {
        label: 'GANDA KOMPLEKS',
        className: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
      };
    case 'isian':
      return {
        label: 'ISIAN SINGKAT',
        className: 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      };
    case 'esai':
      return {
        label: 'ESAI',
        className: 'bg-rose-500/15 text-rose-300 border-rose-500/30'
      };
  }
}

export const KoreksiSoalCbt: React.FC<KoreksiSoalCbtProps> = ({
  hasilUjianList,
  onUpdateHasilUjian,
  onBatchUpdateHasilUjian,
  bankSoalList,
  availableKelasList,
  availableMapelList,
  resolveHasilMapel,
  initialSelectedHasilId,
  onNavigateToSimulasi,
  korektorNama,
  showToast
}) => {
  const [koreksiMode, setKoreksiMode] = useState<'per_siswa' | 'per_soal'>('per_siswa');

  // Filters for student sheets
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Perlu Koreksi Manual' | 'Selesai'>('Semua');
  const [filterMapel, setFilterMapel] = useState<string>('Semua');
  const [filterKelas, setFilterKelas] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Selected student sheet
  const [selectedHasilId, setSelectedHasilId] = useState<string>(
    initialSelectedHasilId || hasilUjianList[0]?.id || ''
  );

  // Draft grading state for active sheet
  const [draftScores, setDraftScores] = useState<Record<string, DraftButirNilai>>({});
  const [catatanKorektor, setCatatanKorektor] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [soalViewFilter, setSoalViewFilter] = useState<'semua' | 'subjektif' | 'belum' | 'salah'>('semua');

  // AI grading state (single sheet)
  const [aiGradingLoading, setAiGradingLoading] = useState(false);
  const [aiGradingError, setAiGradingError] = useState<string | null>(null);

  // Batch (per-soal across students) state
  const [batchBankId, setBatchBankId] = useState<string>(bankSoalList[0]?.id || '');
  const [batchSoalId, setBatchSoalId] = useState<string>('');
  const [batchDraftByHasilId, setBatchDraftByHasilId] = useState<Record<string, DraftButirNilai>>({});
  const [batchDirty, setBatchDirty] = useState(false);
  const [batchAiLoading, setBatchAiLoading] = useState(false);
  const [batchAiError, setBatchAiError] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedHasilId) {
      setSelectedHasilId(initialSelectedHasilId);
      setKoreksiMode('per_siswa');
    }
  }, [initialSelectedHasilId]);

  useEffect(() => {
    if (!hasilUjianList.some(h => h.id === selectedHasilId)) {
      setSelectedHasilId(hasilUjianList[0]?.id || '');
    }
  }, [hasilUjianList, selectedHasilId]);

  useEffect(() => {
    if (!bankSoalList.some(b => b.id === batchBankId) && bankSoalList.length > 0) {
      setBatchBankId(bankSoalList[0].id);
    }
  }, [bankSoalList, batchBankId]);

  const resolveBankForHasil = (h: HasilUjian): BankSoal | undefined => {
    const byId = bankSoalList.find(b => b.id === h.ujianId);
    if (byId) return byId;
    if (h.judulUjian) {
      const byJudul = bankSoalList.find(b => b.judul === h.judulUjian);
      if (byJudul) return byJudul;
    }
    const mapel = resolveHasilMapel(h);
    if (mapel && mapel !== 'Umum') {
      return bankSoalList.find(b => b.mataPelajaran.toLowerCase() === mapel.toLowerCase());
    }
    return undefined;
  };

  const getQuestionsForHasil = (h: HasilUjian): SoalCBT[] => {
    const bank = resolveBankForHasil(h);
    const orderedBankSoal = bank ? sortSoalByTipeOrder(bank.daftarSoal || []) : [];
    const knownIds = new Set(orderedBankSoal.map(s => s.id));
    const fallbackEntries: SoalCBT[] = Object.entries(h.jawaban || {})
      .filter(([soalId]) => !knownIds.has(soalId))
      .map(([soalId, ans], idx) => ({
        id: soalId,
        tipe: Array.isArray(ans.jawaban) ? 'multiple_choice' : 'esai',
        pertanyaan: `Butir Soal #${orderedBankSoal.length + idx + 1} (ID: ${soalId})`,
        kunciJawaban: '',
        pembahasan: '',
        bobot: 10
      }));
    return [...orderedBankSoal, ...fallbackEntries];
  };

  const filteredHasilList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return hasilUjianList.filter(h => {
      if (filterStatus !== 'Semua' && h.statusPenilaian !== filterStatus) return false;
      const mapel = resolveHasilMapel(h) || 'Umum';
      if (filterMapel !== 'Semua' && mapel.toLowerCase() !== filterMapel.toLowerCase()) return false;
      if (filterKelas !== 'Semua' && h.kelas !== filterKelas) return false;
      if (q) {
        const hay = `${h.siswaNama} ${h.nis} ${h.kelas} ${mapel} ${h.judulUjian || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [hasilUjianList, filterStatus, filterMapel, filterKelas, searchQuery, resolveHasilMapel]);

  const activeHasil = useMemo(
    () => hasilUjianList.find(h => h.id === selectedHasilId) || filteredHasilList[0] || null,
    [hasilUjianList, selectedHasilId, filteredHasilList]
  );

  const activeQuestions = useMemo(
    () => (activeHasil ? getQuestionsForHasil(activeHasil) : []),
    [activeHasil, bankSoalList]
  );

  // Initialize draftScores whenever activeHasil changes
  useEffect(() => {
    setAiGradingError(null);
    if (!activeHasil) {
      setDraftScores({});
      setCatatanKorektor('');
      setIsDirty(false);
      return;
    }
    const questions = getQuestionsForHasil(activeHasil);
    const nextDraft: Record<string, DraftButirNilai> = {};
    questions.forEach(s => {
      nextDraft[s.id] = autoEvaluateObjectiveScore(s, activeHasil.jawaban?.[s.id]);
    });
    setDraftScores(nextDraft);
    setCatatanKorektor(activeHasil.catatanKorektor || '');
    setIsDirty(false);
  }, [activeHasil?.id]);

  // Summary statistics for top cards
  const pendingCount = useMemo(
    () => hasilUjianList.filter(h => h.statusPenilaian === 'Perlu Koreksi Manual').length,
    [hasilUjianList]
  );
  const doneCount = useMemo(
    () => hasilUjianList.filter(h => h.statusPenilaian === 'Selesai').length,
    [hasilUjianList]
  );
  const avgScore = useMemo(() => {
    if (hasilUjianList.length === 0) return 0;
    return Math.round(hasilUjianList.reduce((acc, h) => acc + (h.nilaiTotal || 0), 0) / hasilUjianList.length);
  }, [hasilUjianList]);

  // Live totals for active student sheet
  const activeTotals = useMemo(() => {
    let earned = 0;
    let maxBobot = 0;
    let ungradedCount = 0;
    let subjectiveCount = 0;
    let wrongOrEmptyCount = 0;

    activeQuestions.forEach(s => {
      const bobot = Math.max(1, Number(s.bobot) || 10);
      maxBobot += bobot;
      const entry = draftScores[s.id] || autoEvaluateObjectiveScore(s, activeHasil?.jawaban?.[s.id]);
      earned += Number(entry.nilai) || 0;
      if (!entry.sudahDikoreksi) ungradedCount++;
      if (s.tipe === 'esai' || s.tipe === 'isian') subjectiveCount++;
      if ((Number(entry.nilai) || 0) < bobot) wrongOrEmptyCount++;
    });

    const nilai100 = maxBobot > 0 ? Math.min(100, Math.max(0, Math.round((earned / maxBobot) * 100))) : 0;
    return { earned, maxBobot, nilai100, ungradedCount, subjectiveCount, wrongOrEmptyCount };
  }, [activeQuestions, draftScores, activeHasil]);

  const displayedSheetQuestions = useMemo(() => {
    return activeQuestions
      .map((soal, idx) => ({ soal, nomorAsli: idx + 1 }))
      .filter(({ soal }) => {
        const entry = draftScores[soal.id];
        const bobot = Math.max(1, Number(soal.bobot) || 10);
        if (soalViewFilter === 'subjektif') {
          return soal.tipe === 'esai' || soal.tipe === 'isian';
        }
        if (soalViewFilter === 'belum') {
          return entry ? !entry.sudahDikoreksi : soal.tipe === 'esai';
        }
        if (soalViewFilter === 'salah') {
          return (entry?.nilai || 0) < bobot;
        }
        return true;
      });
  }, [activeQuestions, draftScores, soalViewFilter]);

  const handleSetQuestionDraft = (soalId: string, patch: Partial<DraftButirNilai>) => {
    setDraftScores(prev => {
      const existing = prev[soalId] || { nilai: 0, sudahDikoreksi: true, catatanGuru: '' };
      return {
        ...prev,
        [soalId]: {
          ...existing,
          ...patch
        }
      };
    });
    setIsDirty(true);
  };

  const handleAutoGradeObjectiveInSheet = () => {
    if (!activeHasil) return;
    const nextDraft: Record<string, DraftButirNilai> = { ...draftScores };
    let updatedCount = 0;
    activeQuestions.forEach(s => {
      if (s.tipe === 'pg' || s.tipe === 'multiple_choice' || s.tipe === 'isian') {
        const evaluated = autoEvaluateObjectiveScore(s, {
          soalId: s.id,
          jawaban: activeHasil.jawaban?.[s.id]?.jawaban || (s.tipe === 'multiple_choice' ? [] : ''),
          raguRagu: activeHasil.jawaban?.[s.id]?.raguRagu
        });
        nextDraft[s.id] = {
          ...evaluated,
          catatanGuru: nextDraft[s.id]?.catatanGuru || evaluated.catatanGuru
        };
        updatedCount++;
      }
    });
    setDraftScores(nextDraft);
    setIsDirty(true);
    showToast(`Koreksi otomatis diterapkan untuk ${updatedCount} butir soal PG / Ganda Kompleks / Isian.`);
  };

  const handleAiGradeActiveSheet = async () => {
    if (!activeHasil) return;
    setAiGradingError(null);

    const targetQuestions = activeQuestions.filter(s => s.tipe === 'esai' || s.tipe === 'isian');
    if (targetQuestions.length === 0) {
      setAiGradingError('Paket soal ini tidak memiliki soal Esai atau Isian Singkat untuk dikoreksi AI.');
      return;
    }

    const itemsPayload = targetQuestions.map(s => ({
      itemKey: s.id,
      tipe: s.tipe,
      pertanyaan: s.pertanyaan,
      kunciJawaban: formatKunciText(s.kunciJawaban, s),
      pembahasan: s.pembahasan || '',
      bobot: Math.max(1, Number(s.bobot) || 10),
      jawabanSiswa: formatJawabanText(activeHasil.jawaban?.[s.id]?.jawaban, s)
    }));

    setAiGradingLoading(true);
    try {
      const res = await fetch('/api/ai/grade-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mataPelajaran: resolveHasilMapel(activeHasil) || 'Umum',
          items: itemsPayload
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.results)) {
        setAiGradingError(data?.message || 'Gagal menjalankan koreksi AI. Silakan coba lagi atau nilai secara manual.');
        return;
      }

      setDraftScores(prev => {
        const next = { ...prev };
        data.results.forEach((r: { itemKey: string; skorDisarankan: number; alasanPenilaian: string }) => {
          const existing = next[r.itemKey] || { nilai: 0, sudahDikoreksi: true, catatanGuru: '' };
          next[r.itemKey] = {
            ...existing,
            nilai: r.skorDisarankan,
            sudahDikoreksi: true,
            catatanGuru: r.alasanPenilaian || existing.catatanGuru
          };
        });
        return next;
      });
      setIsDirty(true);
      showToast(`AI berhasil memberi saran skor untuk ${data.results.length} soal Esai & Isian! Silakan tinjau lalu simpan.`);
    } catch (err: any) {
      setAiGradingError(err?.message || 'Gagal menghubungi server untuk koreksi AI.');
    } finally {
      setAiGradingLoading(false);
    }
  };

  const buildUpdatedHasil = (markAllFinal: boolean): HasilUjian | null => {
    if (!activeHasil) return null;
    const nextJawaban: Record<string, JawabanSiswa> = { ...(activeHasil.jawaban || {}) };
    let earned = 0;
    let maxBobot = 0;
    let anyUnchecked = false;

    activeQuestions.forEach(s => {
      const bobot = Math.max(1, Number(s.bobot) || 10);
      maxBobot += bobot;
      const draft = draftScores[s.id] || autoEvaluateObjectiveScore(s, nextJawaban[s.id]);
      const clampedNilai = Math.max(0, Math.min(bobot, Math.round(Number(draft.nilai) || 0)));
      const checked = markAllFinal ? true : Boolean(draft.sudahDikoreksi);
      if (!checked) anyUnchecked = true;
      earned += clampedNilai;

      const prevAns = nextJawaban[s.id];
      nextJawaban[s.id] = {
        soalId: s.id,
        jawaban: prevAns?.jawaban ?? (s.tipe === 'multiple_choice' ? [] : ''),
        raguRagu: prevAns?.raguRagu || false,
        nilai: clampedNilai,
        catatanGuru: draft.catatanGuru?.trim() || undefined,
        sudahDikoreksi: checked
      };
    });

    const nilaiTotal100 =
      maxBobot > 0 ? Math.min(100, Math.max(0, Math.round((earned / maxBobot) * 100))) : 0;

    return {
      ...activeHasil,
      jawaban: nextJawaban,
      nilaiTotal: nilaiTotal100,
      statusPenilaian: anyUnchecked ? 'Perlu Koreksi Manual' : 'Selesai',
      dikoreksiOleh: korektorNama,
      waktuKoreksi: new Date().toISOString(),
      catatanKorektor: catatanKorektor.trim() || undefined
    };
  };

  const handleSaveSheet = (advanceNext: boolean) => {
    const updated = buildUpdatedHasil(true);
    if (!updated) return;

    // Also reflect marked-as-checked in local draft
    setDraftScores(prev => {
      const next = { ...prev };
      Object.keys(next).forEach(k => {
        next[k] = { ...next[k], sudahDikoreksi: true };
      });
      return next;
    });

    onUpdateHasilUjian(updated);
    setIsDirty(false);
    showToast(`Koreksi untuk ${updated.siswaNama} disimpan! Nilai Akhir: ${updated.nilaiTotal}/100.`);

    if (advanceNext) {
      const currentIdx = filteredHasilList.findIndex(h => h.id === updated.id);
      const nextPending = filteredHasilList.find(
        (h, idx) => idx > currentIdx && h.statusPenilaian === 'Perlu Koreksi Manual'
      );
      const nextItem =
        nextPending ||
        filteredHasilList[currentIdx + 1] ||
        filteredHasilList.find(h => h.id !== updated.id && h.statusPenilaian === 'Perlu Koreksi Manual');
      if (nextItem) {
        setSelectedHasilId(nextItem.id);
      }
    }
  };

  // --- Mode 2: Koreksi Per Butir Soal Lintas Siswa ---
  const activeBatchBank = useMemo(
    () => bankSoalList.find(b => b.id === batchBankId) || bankSoalList[0] || null,
    [bankSoalList, batchBankId]
  );

  const orderedBatchBankQuestions = useMemo(
    () => (activeBatchBank ? sortSoalByTipeOrder(activeBatchBank.daftarSoal || []) : []),
    [activeBatchBank]
  );

  useEffect(() => {
    if (orderedBatchBankQuestions.length === 0) {
      setBatchSoalId('');
      return;
    }
    if (!orderedBatchBankQuestions.some(s => s.id === batchSoalId)) {
      const firstSubjective =
        orderedBatchBankQuestions.find(s => s.tipe === 'esai' || s.tipe === 'isian') ||
        orderedBatchBankQuestions[0];
      setBatchSoalId(firstSubjective.id);
    }
  }, [orderedBatchBankQuestions, batchSoalId]);

  const activeBatchSoal = useMemo(
    () => orderedBatchBankQuestions.find(s => s.id === batchSoalId) || null,
    [orderedBatchBankQuestions, batchSoalId]
  );

  const batchMatchingHasilList = useMemo(() => {
    if (!activeBatchBank || !activeBatchSoal) return [];
    return hasilUjianList.filter(h => {
      const bank = resolveBankForHasil(h);
      if (bank?.id === activeBatchBank.id) return true;
      return Boolean(h.jawaban && h.jawaban[activeBatchSoal.id]);
    });
  }, [hasilUjianList, activeBatchBank, activeBatchSoal, bankSoalList]);

  useEffect(() => {
    setBatchAiError(null);
    if (!activeBatchSoal || batchMatchingHasilList.length === 0) {
      setBatchDraftByHasilId({});
      setBatchDirty(false);
      return;
    }
    const nextMap: Record<string, DraftButirNilai> = {};
    batchMatchingHasilList.forEach(h => {
      nextMap[h.id] = autoEvaluateObjectiveScore(activeBatchSoal, h.jawaban?.[activeBatchSoal.id]);
    });
    setBatchDraftByHasilId(nextMap);
    setBatchDirty(false);
  }, [activeBatchSoal?.id, batchMatchingHasilList.length]);

  const handleSetBatchStudentScore = (hasilId: string, patch: Partial<DraftButirNilai>) => {
    setBatchDraftByHasilId(prev => {
      const cur = prev[hasilId] || { nilai: 0, sudahDikoreksi: true, catatanGuru: '' };
      return {
        ...prev,
        [hasilId]: { ...cur, ...patch }
      };
    });
    setBatchDirty(true);
  };

  const handleAiGradeBatchQuestion = async () => {
    if (!activeBatchSoal || batchMatchingHasilList.length === 0) return;
    setBatchAiError(null);

    const itemsPayload = batchMatchingHasilList.map(h => ({
      itemKey: h.id,
      tipe: activeBatchSoal.tipe,
      pertanyaan: activeBatchSoal.pertanyaan,
      kunciJawaban: formatKunciText(activeBatchSoal.kunciJawaban, activeBatchSoal),
      pembahasan: activeBatchSoal.pembahasan || '',
      bobot: Math.max(1, Number(activeBatchSoal.bobot) || 10),
      jawabanSiswa: formatJawabanText(h.jawaban?.[activeBatchSoal.id]?.jawaban, activeBatchSoal)
    }));

    setBatchAiLoading(true);
    try {
      const res = await fetch('/api/ai/grade-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mataPelajaran: activeBatchBank?.mataPelajaran || 'Umum',
          items: itemsPayload
        })
      });
      const data = await res.json();
      if (!res.ok || !data.success || !Array.isArray(data.results)) {
        setBatchAiError(data?.message || 'Gagal melakukan koreksi AI massal.');
        return;
      }
      setBatchDraftByHasilId(prev => {
        const next = { ...prev };
        data.results.forEach((r: { itemKey: string; skorDisarankan: number; alasanPenilaian: string }) => {
          const cur = next[r.itemKey] || { nilai: 0, sudahDikoreksi: true, catatanGuru: '' };
          next[r.itemKey] = {
            ...cur,
            nilai: r.skorDisarankan,
            sudahDikoreksi: true,
            catatanGuru: r.alasanPenilaian || cur.catatanGuru
          };
        });
        return next;
      });
      setBatchDirty(true);
      showToast(`AI berhasil mengoreksi jawaban ${data.results.length} siswa untuk butir soal ini!`);
    } catch (err: any) {
      setBatchAiError(err?.message || 'Terjadi kesalahan saat menghubungi layanan AI.');
    } finally {
      setBatchAiLoading(false);
    }
  };

  const handleSaveBatchQuestionScores = () => {
    if (!activeBatchSoal || batchMatchingHasilList.length === 0) return;
    const maxBobotSoal = Math.max(1, Number(activeBatchSoal.bobot) || 10);

    const updatedItems: HasilUjian[] = batchMatchingHasilList.map(h => {
      const questions = getQuestionsForHasil(h);
      const nextJawaban: Record<string, JawabanSiswa> = { ...(h.jawaban || {}) };
      const draftForThisSoal =
        batchDraftByHasilId[h.id] || autoEvaluateObjectiveScore(activeBatchSoal, nextJawaban[activeBatchSoal.id]);
      const clampedSoalScore = Math.max(
        0,
        Math.min(maxBobotSoal, Math.round(Number(draftForThisSoal.nilai) || 0))
      );

      const prevAns = nextJawaban[activeBatchSoal.id];
      nextJawaban[activeBatchSoal.id] = {
        soalId: activeBatchSoal.id,
        jawaban: prevAns?.jawaban ?? (activeBatchSoal.tipe === 'multiple_choice' ? [] : ''),
        raguRagu: prevAns?.raguRagu || false,
        nilai: clampedSoalScore,
        catatanGuru: draftForThisSoal.catatanGuru?.trim() || undefined,
        sudahDikoreksi: true
      };

      let earnedTotal = 0;
      let maxTotal = 0;
      let anyUnchecked = false;
      questions.forEach(q => {
        const b = Math.max(1, Number(q.bobot) || 10);
        maxTotal += b;
        const evalQ = autoEvaluateObjectiveScore(q, nextJawaban[q.id]);
        nextJawaban[q.id] = {
          soalId: q.id,
          jawaban: nextJawaban[q.id]?.jawaban ?? (q.tipe === 'multiple_choice' ? [] : ''),
          raguRagu: nextJawaban[q.id]?.raguRagu || false,
          nilai: evalQ.nilai,
          catatanGuru: nextJawaban[q.id]?.catatanGuru,
          sudahDikoreksi: evalQ.sudahDikoreksi
        };
        earnedTotal += evalQ.nilai;
        if (!evalQ.sudahDikoreksi) anyUnchecked = true;
      });

      const nilai100 =
        maxTotal > 0 ? Math.min(100, Math.max(0, Math.round((earnedTotal / maxTotal) * 100))) : 0;

      return {
        ...h,
        jawaban: nextJawaban,
        nilaiTotal: nilai100,
        statusPenilaian: anyUnchecked ? 'Perlu Koreksi Manual' : 'Selesai',
        dikoreksiOleh: korektorNama,
        waktuKoreksi: new Date().toISOString()
      };
    });

    if (onBatchUpdateHasilUjian) {
      onBatchUpdateHasilUjian(updatedItems);
    } else {
      updatedItems.forEach(item => onUpdateHasilUjian(item));
    }

    setBatchDirty(false);
    showToast(`Nilai soal untuk ${updatedItems.length} siswa berhasil disimpan ke database!`);
  };

  return (
    <div className="space-y-6">
      {/* Header & Mode Switcher */}
      <div className="bg-[#121212] text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="font-extrabold text-white text-base flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-emerald-400" />
              Koreksi Soal & Penilaian Jawaban CBT
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Periksa jawaban siswa per lembar atau per butir soal (PG, Ganda Kompleks, Isian Singkat, & Esai) beserta bantuan koreksi AI Gemini.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-[#181818] p-1 rounded-xl border border-slate-800 self-start md:self-auto">
            <button
              type="button"
              onClick={() => setKoreksiMode('per_siswa')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                koreksiMode === 'per_siswa'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Koreksi Per Siswa</span>
            </button>
            <button
              type="button"
              onClick={() => setKoreksiMode('per_soal')}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                koreksiMode === 'per_soal'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Koreksi Per Butir Soal</span>
            </button>
          </div>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[#181818] rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/15 text-blue-400 border border-blue-500/30 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Lembar</span>
              <span className="text-base font-extrabold text-white">{hasilUjianList.length} Siswa</span>
            </div>
          </div>
          <div className="p-3.5 bg-[#181818] rounded-xl border border-amber-500/25 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Perlu Koreksi</span>
              <span className="text-base font-extrabold text-amber-300">{pendingCount} Lembar</span>
            </div>
          </div>
          <div className="p-3.5 bg-[#181818] rounded-xl border border-emerald-500/25 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Selesai Dikoreksi</span>
              <span className="text-base font-extrabold text-emerald-300">{doneCount} Lembar</span>
            </div>
          </div>
          <div className="p-3.5 bg-[#181818] rounded-xl border border-slate-800 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
              <ListChecks className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase block">Rata-Rata Nilai</span>
              <span className="text-base font-extrabold text-white">{avgScore} / 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State if no exam results yet */}
      {hasilUjianList.length === 0 ? (
        <div className="bg-[#121212] rounded-2xl p-10 border border-dashed border-slate-700 text-center space-y-3">
          <ClipboardCheck className="w-12 h-12 text-slate-600 mx-auto" />
          <h4 className="text-sm font-extrabold text-white">Belum Ada Jawaban Ujian Siswa untuk Dikoreksi</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
            Lembar jawaban siswa akan muncul otomatis di sini setelah siswa menyelesaikan ujian pada{' '}
            <strong className="text-slate-200">Simulasi CBT Anti-Cheat</strong>.
          </p>
          <button
            type="button"
            onClick={onNavigateToSimulasi}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5" /> Buka Simulasi CBT
          </button>
        </div>
      ) : koreksiMode === 'per_siswa' ? (
        /* MODE 1: KOREKSI PER LEMBAR SISWA */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Panel: Student Queue */}
          <div className="lg:col-span-4 bg-[#121212] rounded-2xl p-4 border border-slate-800 shadow-xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-emerald-400" />
                Daftar Lembar Siswa ({filteredHasilList.length})
              </h4>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Cari nama siswa, NIS, atau mapel..."
                className="w-full pl-8 pr-3 py-2 bg-[#181818] border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-1 gap-2">
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e.target.value as any)}
                className="p-2 bg-[#181818] border border-slate-700 rounded-xl text-[11px] font-bold text-slate-200 outline-none focus:border-emerald-500/60"
              >
                <option value="Semua">Semua Status ({hasilUjianList.length})</option>
                <option value="Perlu Koreksi Manual">Perlu Koreksi Manual ({pendingCount})</option>
                <option value="Selesai">Selesai ({doneCount})</option>
              </select>

              <select
                value={filterMapel}
                onChange={e => setFilterMapel(e.target.value)}
                className="p-2 bg-[#181818] border border-slate-700 rounded-xl text-[11px] font-bold text-slate-200 outline-none focus:border-emerald-500/60"
              >
                <option value="Semua">Semua Mapel</option>
                {availableMapelList.map(m => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={filterKelas}
                onChange={e => setFilterKelas(e.target.value)}
                className="p-2 bg-[#181818] border border-slate-700 rounded-xl text-[11px] font-bold text-slate-200 outline-none focus:border-emerald-500/60"
              >
                <option value="Semua">Semua Kelas</option>
                {availableKelasList.map(k => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
              {filteredHasilList.length === 0 ? (
                <div className="p-5 text-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-400">
                  Tidak ada lembar ujian sesuai filter.
                </div>
              ) : (
                filteredHasilList.map(h => {
                  const isActive = activeHasil?.id === h.id;
                  const mapelLabel = resolveHasilMapel(h) || 'Umum';
                  return (
                    <button
                      key={h.id}
                      type="button"
                      onClick={() => setSelectedHasilId(h.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer space-y-1.5 ${
                        isActive
                          ? 'bg-emerald-500/15 border-emerald-500/60 shadow-sm'
                          : 'bg-[#181818] border-slate-800 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-extrabold text-white truncate">{h.siswaNama}</div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {h.kelas} • NIS {h.nis}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-black shrink-0 px-2 py-0.5 rounded-lg ${
                            h.nilaiTotal >= 75
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-amber-500/15 text-amber-300'
                          }`}
                        >
                          {h.nilaiTotal}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 border border-indigo-500/25 px-1.5 py-0.5 rounded">
                          {mapelLabel}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                            h.statusPenilaian === 'Selesai'
                              ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                              : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                          }`}
                        >
                          {h.statusPenilaian}
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Panel: Interactive Answer Sheet */}
          <div className="lg:col-span-8 bg-[#121212] rounded-2xl p-5 sm:p-6 border border-slate-800 shadow-xl space-y-5">
            {!activeHasil ? (
              <div className="p-8 text-center text-xs text-slate-400">
                Pilih salah satu lembar jawaban siswa di sebelah kiri untuk memulai koreksi.
              </div>
            ) : (
              <>
                {/* Sheet Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-extrabold text-white">{activeHasil.siswaNama}</h4>
                      <span className="text-[10px] font-mono bg-slate-800 border border-slate-700 text-slate-300 px-2 py-0.5 rounded">
                        {activeHasil.kelas} • NIS {activeHasil.nis}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          activeHasil.statusPenilaian === 'Selesai'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {activeHasil.statusPenilaian}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      <span className="text-indigo-300 font-bold">{resolveHasilMapel(activeHasil)}</span> •{' '}
                      {activeHasil.judulUjian || 'Ujian CBT'} • Submit:{' '}
                      {new Date(activeHasil.waktuSubmit).toLocaleString('id-ID')}
                    </p>
                    {activeHasil.dikoreksiOleh && (
                      <p className="text-[10px] text-emerald-400">
                        Terakhir dikoreksi oleh <strong>{activeHasil.dikoreksiOleh}</strong>
                        {activeHasil.waktuKoreksi
                          ? ` pada ${new Date(activeHasil.waktuKoreksi).toLocaleString('id-ID')}`
                          : ''}
                      </p>
                    )}
                  </div>

                  {/* Score Box */}
                  <div className="flex items-center gap-3 bg-[#181818] border border-slate-700 rounded-2xl px-4 py-3 shrink-0">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">
                        Skor Total ({activeTotals.earned}/{activeTotals.maxBobot} Poin)
                      </span>
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`text-2xl font-black ${
                            activeTotals.nilai100 >= 75 ? 'text-emerald-400' : 'text-amber-400'
                          }`}
                        >
                          {activeTotals.nilai100}
                        </span>
                        <span className="text-xs font-bold text-slate-400">/ 100</span>
                      </div>
                    </div>
                    {isDirty && (
                      <span className="px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                        Belum Disimpan
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2.5 bg-[#181818] p-3 rounded-xl border border-slate-800">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAutoGradeObjectiveInSheet}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Hitung ulang skor PG, Ganda Kompleks, dan Isian Singkat sesuai kunci jawaban terbaru"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Koreksi Otomatis PG & Isian</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleAiGradeActiveSheet}
                      disabled={aiGradingLoading}
                      className="px-3 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-60 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                      title="Gunakan Gemini AI untuk menilai jawaban Esai & Isian Singkat"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>{aiGradingLoading ? 'Menilai Jawaban...' : 'Bantu Koreksi AI (Esai & Isian)'}</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSheet(false)}
                      className="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Simpan Koreksi</span>
                    </button>
                    {filteredHasilList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleSaveSheet(true)}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                      >
                        <span>Simpan & Lanjut</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {aiGradingError && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>{aiGradingError}</span>
                  </div>
                )}

                {/* Question Type Filter & Sheet Note */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      { id: 'semua', label: `Semua Soal (${activeQuestions.length})` },
                      { id: 'subjektif', label: `Esai & Isian (${activeTotals.subjectiveCount})` },
                      { id: 'belum', label: `Perlu Koreksi (${activeTotals.ungradedCount})` },
                      { id: 'salah', label: `Skor Belum Penuh (${activeTotals.wrongOrEmptyCount})` }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setSoalViewFilter(tab.id as any)}
                        className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                          soalViewFilter === tab.id
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                            : 'bg-[#181818] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Overall Teacher Comment for Student Sheet */}
                <div className="bg-[#181818] p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 block">
                    Catatan Umum Korektor untuk Siswa (Opsional)
                  </label>
                  <input
                    type="text"
                    value={catatanKorektor}
                    onChange={e => {
                      setCatatanKorektor(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Contoh: Pemahaman konsep sudah baik, tingkatkan ketelitian pada uraian..."
                    className="w-full p-2.5 bg-[#121212] border border-slate-700 rounded-xl text-xs text-slate-100 placeholder-slate-500 outline-none focus:border-emerald-500/60"
                  />
                </div>

                {/* Question-by-Question Grading List */}
                <div className="space-y-4">
                  {displayedSheetQuestions.length === 0 ? (
                    <div className="p-6 text-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-400">
                      Tidak ada butir soal pada kategori filter ini.
                    </div>
                  ) : (
                    displayedSheetQuestions.map(({ soal, nomorAsli }) => {
                      const bobot = Math.max(1, Number(soal.bobot) || 10);
                      const ansObj = activeHasil.jawaban?.[soal.id];
                      const draft = draftScores[soal.id] || autoEvaluateObjectiveScore(soal, ansObj);
                      const badge = getTipeBadgeInfo(soal.tipe);
                      const jawabanText = formatJawabanText(ansObj?.jawaban, soal);
                      const kunciText = formatKunciText(soal.kunciJawaban, soal);
                      const isFull = draft.nilai >= bobot;
                      const isZero = draft.nilai <= 0;

                      return (
                        <div
                          key={soal.id}
                          className={`p-4 rounded-xl border space-y-3 ${
                            !draft.sudahDikoreksi
                              ? 'border-amber-500/40 bg-amber-950/10'
                              : isFull
                              ? 'border-emerald-500/30 bg-[#181818]'
                              : 'border-slate-800 bg-[#181818]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 font-mono font-bold rounded text-[10px]">
                                Soal #{nomorAsli}
                              </span>
                              <span className={`px-2 py-0.5 rounded border text-[10px] font-bold ${badge.className}`}>
                                {badge.label}
                              </span>
                              {!draft.sudahDikoreksi ? (
                                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-bold flex items-center gap-1">
                                  <HelpCircle className="w-3 h-3" /> Perlu Koreksi
                                </span>
                              ) : isFull ? (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                                  <Check className="w-3 h-3" /> Benar Penuh
                                </span>
                              ) : isZero ? (
                                <span className="px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[10px] font-bold">
                                  Salah / Skor 0
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300 border border-sky-500/30 text-[10px] font-bold">
                                  Skor Sebagian
                                </span>
                              )}
                            </div>

                            <div className="text-xs font-extrabold text-white bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-lg">
                              Skor:{' '}
                              <span className={isFull ? 'text-emerald-400' : isZero ? 'text-rose-400' : 'text-amber-300'}>
                                {draft.nilai}
                              </span>{' '}
                              / {bobot}
                            </div>
                          </div>

                          <p className="text-xs font-bold text-slate-100 leading-relaxed">{soal.pertanyaan}</p>

                          {soal.imageUrl && (
                            <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-1.5 max-w-sm">
                              <img
                                src={soal.imageUrl}
                                alt={`Media Soal #${nomorAsli}`}
                                className="max-h-40 w-full object-contain rounded-lg"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="p-3 rounded-xl bg-[#121212] border border-slate-800 space-y-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                                Jawaban Siswa
                              </span>
                              <p
                                className={`text-xs leading-relaxed whitespace-pre-wrap ${
                                  jawabanText ? 'text-slate-100 font-medium' : 'text-slate-500 italic'
                                }`}
                              >
                                {jawabanText || '(Siswa tidak menjawab soal ini)'}
                              </p>
                            </div>

                            <div className="p-3 rounded-xl bg-emerald-950/25 border border-emerald-500/25 space-y-1">
                              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-400 block">
                                Kunci / Pedoman Jawaban
                              </span>
                              <p className="text-xs text-emerald-200 leading-relaxed whitespace-pre-wrap">
                                {kunciText}
                              </p>
                              {soal.pembahasan && (
                                <p className="text-[10px] text-emerald-300/80 pt-1 border-t border-emerald-500/20">
                                  Pembahasan: {soal.pembahasan}
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Teacher Scoring Bar */}
                          <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-bold text-slate-400 mr-1">Beri Skor:</span>
                              {[
                                { label: '0 (Salah)', val: 0 },
                                { label: '50%', val: Math.round(bobot * 0.5) },
                                { label: '75%', val: Math.round(bobot * 0.75) },
                                { label: `Benar (${bobot})`, val: bobot }
                              ].map(preset => (
                                <button
                                  key={preset.label}
                                  type="button"
                                  onClick={() =>
                                    handleSetQuestionDraft(soal.id, {
                                      nilai: preset.val,
                                      sudahDikoreksi: true
                                    })
                                  }
                                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                    draft.nilai === preset.val && draft.sudahDikoreksi
                                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                      : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                  }`}
                                >
                                  {preset.label}
                                </button>
                              ))}

                              <div className="flex items-center gap-1 ml-1">
                                <input
                                  type="number"
                                  min={0}
                                  max={bobot}
                                  value={draft.nilai}
                                  onChange={e => {
                                    const raw = Number(e.target.value);
                                    const clamped = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(bobot, raw));
                                    handleSetQuestionDraft(soal.id, {
                                      nilai: clamped,
                                      sudahDikoreksi: true
                                    });
                                  }}
                                  className="w-16 p-1 bg-[#121212] border border-slate-700 rounded-lg text-xs font-bold text-center text-white outline-none focus:border-emerald-500"
                                />
                                <span className="text-[10px] text-slate-400">/ {bobot}</span>
                              </div>
                            </div>

                            <input
                              type="text"
                              value={draft.catatanGuru}
                              onChange={e =>
                                handleSetQuestionDraft(soal.id, {
                                  catatanGuru: e.target.value,
                                  sudahDikoreksi: true
                                })
                              }
                              placeholder="Catatan koreksi butir soal ini..."
                              className="sm:w-64 p-1.5 bg-[#121212] border border-slate-700 rounded-lg text-[11px] text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/60"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Save Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-800">
                  <div className="text-xs text-slate-300">
                    Nilai Akhir Tersimpan:{' '}
                    <strong className="text-emerald-400 text-sm">{activeTotals.nilai100} / 100</strong>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleSaveSheet(false)}
                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" /> Simpan & Selesaikan Koreksi
                    </button>
                    {filteredHasilList.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleSaveSheet(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <span>Simpan & Siswa Berikutnya</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      ) : (
        /* MODE 2: KOREKSI PER BUTIR SOAL (LINTAS SEMUA SISWA) */
        <div className="bg-[#121212] text-slate-100 rounded-2xl p-6 border border-slate-800 shadow-xl space-y-5">
          {bankSoalList.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Belum ada Paket Bank Soal tersedia untuk mode koreksi per butir soal.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-emerald-400" />
                    Pilih Paket Bank Soal
                  </label>
                  <select
                    value={activeBatchBank?.id || ''}
                    onChange={e => setBatchBankId(e.target.value)}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500"
                  >
                    {bankSoalList.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.judul} ({b.mataPelajaran} • {b.daftarSoal.length} Soal)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold uppercase text-slate-400 flex items-center gap-1.5">
                    <ListChecks className="w-3.5 h-3.5 text-indigo-400" />
                    Pilih Butir Soal yang Dikoreksi
                  </label>
                  <select
                    value={activeBatchSoal?.id || ''}
                    onChange={e => setBatchSoalId(e.target.value)}
                    className="w-full p-2.5 bg-[#181818] border border-slate-700 rounded-xl text-xs font-bold text-white outline-none focus:border-indigo-500"
                  >
                    {orderedBatchBankQuestions.map((s, idx) => (
                      <option key={s.id} value={s.id}>
                        Soal #{idx + 1} [{s.tipe.toUpperCase()}] — {s.pertanyaan.slice(0, 65)}
                        {s.pertanyaan.length > 65 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {activeBatchSoal && (
                <div className="p-4 rounded-xl bg-[#181818] border border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded border text-[10px] font-bold ${
                          getTipeBadgeInfo(activeBatchSoal.tipe).className
                        }`}
                      >
                        {getTipeBadgeInfo(activeBatchSoal.tipe).label}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">
                        Bobot Maksimal: {activeBatchSoal.bobot} Poin
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleAiGradeBatchQuestion}
                        disabled={batchAiLoading || batchMatchingHasilList.length === 0}
                        className="px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                        <span>
                          {batchAiLoading ? 'Menilai Semua Siswa...' : 'Bantu Koreksi AI Semua Siswa'}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveBatchQuestionScores}
                        disabled={batchMatchingHasilList.length === 0}
                        className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Simpan Semua ({batchMatchingHasilList.length} Siswa)</span>
                      </button>
                    </div>
                  </div>

                  <p className="text-xs font-bold text-white leading-relaxed">{activeBatchSoal.pertanyaan}</p>
                  <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/25 text-xs text-emerald-200">
                    <strong className="text-emerald-300">Kunci / Pedoman Jawaban:</strong>{' '}
                    {formatKunciText(activeBatchSoal.kunciJawaban, activeBatchSoal)}
                  </div>

                  {batchAiError && (
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      <span>{batchAiError}</span>
                    </div>
                  )}
                </div>
              )}

              {batchDirty && (
                <div className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs font-bold">
                  Ada perubahan skor yang belum disimpan. Tekan &quot;Simpan Semua&quot; untuk memperbarui nilai siswa.
                </div>
              )}

              {batchMatchingHasilList.length === 0 ? (
                <div className="p-6 text-center rounded-xl border border-dashed border-slate-700 text-xs text-slate-400">
                  Belum ada siswa yang mengerjakan paket ujian ini.
                </div>
              ) : (
                <div className="space-y-3">
                  {batchMatchingHasilList.map(h => {
                    const bobot = Math.max(1, Number(activeBatchSoal?.bobot) || 10);
                    const draft =
                      batchDraftByHasilId[h.id] ||
                      (activeBatchSoal
                        ? autoEvaluateObjectiveScore(activeBatchSoal, h.jawaban?.[activeBatchSoal.id])
                        : { nilai: 0, sudahDikoreksi: true, catatanGuru: '' });
                    const jawabanStr = activeBatchSoal
                      ? formatJawabanText(h.jawaban?.[activeBatchSoal.id]?.jawaban, activeBatchSoal)
                      : '';
                    return (
                      <div
                        key={h.id}
                        className="p-4 rounded-xl bg-[#181818] border border-slate-800 space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-extrabold text-white">{h.siswaNama}</span>
                            <span className="text-[11px] text-slate-400 ml-2">
                              {h.kelas} • NIS {h.nis}
                            </span>
                          </div>
                          <div className="text-xs font-bold text-slate-300">
                            Skor butir ini:{' '}
                            <span className="text-emerald-400 font-extrabold">
                              {draft.nilai} / {bobot}
                            </span>
                          </div>
                        </div>

                        <div className="p-3 rounded-xl bg-[#121212] border border-slate-800 text-xs text-slate-100 whitespace-pre-wrap">
                          {jawabanStr || (
                            <span className="text-slate-500 italic">(Siswa tidak menjawab soal ini)</span>
                          )}
                        </div>

                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-1.5">
                            {[
                              { label: '0', val: 0 },
                              { label: '50%', val: Math.round(bobot * 0.5) },
                              { label: '75%', val: Math.round(bobot * 0.75) },
                              { label: `Benar (${bobot})`, val: bobot }
                            ].map(preset => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() =>
                                  handleSetBatchStudentScore(h.id, {
                                    nilai: preset.val,
                                    sudahDikoreksi: true
                                  })
                                }
                                className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border cursor-pointer ${
                                  draft.nilai === preset.val
                                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                            <input
                              type="number"
                              min={0}
                              max={bobot}
                              value={draft.nilai}
                              onChange={e => {
                                const raw = Number(e.target.value);
                                const clamped = Number.isNaN(raw) ? 0 : Math.max(0, Math.min(bobot, raw));
                                handleSetBatchStudentScore(h.id, {
                                  nilai: clamped,
                                  sudahDikoreksi: true
                                });
                              }}
                              className="w-16 p-1 bg-[#121212] border border-slate-700 rounded-lg text-xs font-bold text-center text-white outline-none focus:border-emerald-500"
                            />
                          </div>

                          <input
                            type="text"
                            value={draft.catatanGuru}
                            onChange={e =>
                              handleSetBatchStudentScore(h.id, {
                                catatanGuru: e.target.value,
                                sudahDikoreksi: true
                              })
                            }
                            placeholder="Catatan untuk jawaban siswa ini..."
                            className="sm:w-64 p-1.5 bg-[#121212] border border-slate-700 rounded-lg text-[11px] text-slate-200 placeholder-slate-500 outline-none focus:border-emerald-500/60"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};
