import React, { useState, useEffect, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Search,
  Edit3,
  Trash2,
  Download,
  Eye,
  X,
  CheckCircle2,
  FileText,
  BookOpen,
  RefreshCw,
  Copy,
  ChevronUp,
  ChevronDown,
  FileSpreadsheet,
  Sparkles,
  Layers,
  KeyRound,
  AlertTriangle
} from 'lucide-react';
import {
  BankSoal,
  SoalCBT,
  Guru,
  MataPelajaranItem,
  RombelKelas,
  SchoolSettings,
  CbtExamSettings,
  Role,
  KisiKisiSoalDoc,
  KisiKisiButirItem,
  LevelKognitifKisi,
  BentukSoalKisi
} from '../../types/school';
import { dbFetchCollection, dbSaveCollection } from '../../lib/firebaseSync';
import { downloadKisiKisiPdf } from './kisiKisiPdf';

interface KisiKisiSoalProps {
  bankSoalList: BankSoal[];
  guruList: Guru[];
  mapelList: MataPelajaranItem[];
  rombelList: RombelKelas[];
  schoolSettings?: SchoolSettings;
  cbtSettings: CbtExamSettings;
  currentRole: Role;
  userEmail?: string;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const STORAGE_KEY = 'edu_kisiKisiSoalList';
const LEVEL_OPTIONS: LevelKognitifKisi[] = ['L1 (C1-C2)', 'L2 (C3)', 'L3 (C4-C6)'];
const BENTUK_OPTIONS: BentukSoalKisi[] = ['PG', 'PG Kompleks', 'Isian Singkat', 'Uraian / Esai'];

function mapTipeSoalToBentuk(tipe: SoalCBT['tipe']): BentukSoalKisi {
  switch (String(tipe || '').toLowerCase()) {
    case 'pg':
      return 'PG';
    case 'multiple_choice':
      return 'PG Kompleks';
    case 'isian':
      return 'Isian Singkat';
    case 'esai':
      return 'Uraian / Esai';
    default:
      return 'PG';
  }
}

function stripHtmlAndTrim(raw: string): string {
  return (raw || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferLevelKognitif(soal: SoalCBT): LevelKognitifKisi {
  const txt = stripHtmlAndTrim(soal.pertanyaan).toLowerCase();
  const tipeLower = String(soal.tipe || '').toLowerCase();
  if (
    tipeLower === 'esai' ||
    tipeLower === 'multiple_choice' ||
    /\b(analisis|bandingkan|evaluasi|simpulkan|mengapa|buktikan|rancang|manakah pernyataan yang benar|pernyataan berikut)\b/.test(txt)
  ) {
    return 'L3 (C4-C6)';
  }
  if (
    /\b(hitung|tentukan|berapakah|hasil dari|turunan|nilai dari|selesaikan|ubah|konversi)\b/.test(txt)
  ) {
    return 'L2 (C3)';
  }
  return 'L1 (C1-C2)';
}

function formatKunciJawaban(kunci: string | string[] | undefined): string {
  if (!kunci) return '-';
  if (Array.isArray(kunci)) return kunci.filter(Boolean).join(', ') || '-';
  return String(kunci).trim() || '-';
}

function buildButirFromSoal(soal: SoalCBT, index: number, mapel: string): KisiKisiButirItem {
  const cleanQ = stripHtmlAndTrim(soal.pertanyaan);
  const snippet = cleanQ.length > 95 ? `${cleanQ.slice(0, 92).trimEnd()}...` : cleanQ;
  const level = inferLevelKognitif(soal);
  const bentuk = mapTipeSoalToBentuk(soal.tipe);
  const actionVerb =
    level === 'L3 (C4-C6)'
      ? 'menganalisis dan menyimpulkan'
      : level === 'L2 (C3)'
      ? 'menerapkan konsep untuk menentukan'
      : 'mengidentifikasi dan memahami';

  return {
    id: `butir-${soal.id || index + 1}-${Date.now()}-${index}`,
    nomorSoal: index + 1,
    capaianPembelajaran: `Peserta didik mampu memahami dan menerapkan konsep ${mapel || 'materi pembelajaran'} sesuai tujuan pembelajaran.`,
    materi: mapel ? `Pokok Bahasan ${mapel}` : 'Materi Pokok',
    indikatorSoal: snippet
      ? `Disajikan permasalahan mengenai "${snippet}", peserta didik dapat ${actionVerb} jawaban yang tepat.`
      : `Peserta didik dapat ${actionVerb} jawaban soal nomor ${index + 1} dengan tepat.`,
    levelKognitif: level,
    bentukSoal: bentuk,
    bobot: soal.bobot || 0,
    kunciJawaban: formatKunciJawaban(soal.kunciJawaban)
  };
}

function inferFaseFromKelas(kelas: string): string {
  const k = (kelas || '').toUpperCase();
  if (/\b(XII|XI|11|12)\b/.test(k)) return 'Fase F';
  if (/\b(X|10)\b/.test(k)) return 'Fase E';
  if (/\b(VII|VIII|IX|7|8|9)\b/.test(k)) return 'Fase D';
  if (/\b(V|VI|5|6)\b/.test(k)) return 'Fase C';
  return 'Fase D';
}

function slugifyFileName(str: string): string {
  return (str || 'kisi-kisi-soal')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

function formatTanggalIndo(isoDate?: string): string {
  if (!isoDate) {
    const now = new Date();
    return `${now.getDate()} ${BULAN_ID[now.getMonth()]} ${now.getFullYear()}`;
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoDate.trim());
  if (!m) return isoDate;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  if (Number.isNaN(d.getTime())) return isoDate;
  return `${d.getDate()} ${BULAN_ID[d.getMonth()]} ${d.getFullYear()}`;
}

export const KisiKisiSoal: React.FC<KisiKisiSoalProps> = ({
  bankSoalList,
  guruList,
  mapelList,
  rombelList,
  schoolSettings,
  cbtSettings,
  currentRole,
  userEmail = '',
  showToast
}) => {
  const [kisiList, setKisiList] = useState<KisiKisiSoalDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState<string>('');

  // List filters
  const [searchDoc, setSearchDoc] = useState('');
  const [filterMapel, setFilterMapel] = useState('Semua');
  const [filterStatus, setFilterStatus] = useState<'Semua' | 'Draft' | 'Final'>('Semua');

  // Row filters inside active doc
  const [searchRow, setSearchRow] = useState('');
  const [filterLevel, setFilterLevel] = useState<'Semua' | LevelKognitifKisi>('Semua');
  const [filterBentuk, setFilterBentuk] = useState<'Semua' | BentukSoalKisi>('Semua');

  // Modals
  const [showImportBankModal, setShowImportBankModal] = useState(false);
  const [showDocModal, setShowDocModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<KisiKisiSoalDoc | null>(null);
  const [showButirModal, setShowButirModal] = useState(false);
  const [editingButir, setEditingButir] = useState<KisiKisiButirItem | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewWithKunci, setPreviewWithKunci] = useState(false);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<KisiKisiSoalDoc | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Doc Form State
  const [docForm, setDocForm] = useState<Omit<KisiKisiSoalDoc, 'id' | 'butirKisi' | 'updatedAt'>>({
    bankSoalId: '',
    judul: '',
    mataPelajaran: '',
    kelas: '',
    fase: 'Fase D',
    kurikulum: 'Kurikulum Merdeka',
    semester: cbtSettings.semester || 'Ganjil',
    tahunAjaran: cbtSettings.tahunAjaran || schoolSettings?.tahunAjaran || '2026/2027',
    alokasiWaktu: '90 Menit',
    penyusunNama: '',
    penyusunNip: '',
    tanggalPenyusunan: new Date().toISOString().slice(0, 10),
    status: 'Draft'
  });

  // Butir Form State
  const [butirForm, setButirForm] = useState<Omit<KisiKisiButirItem, 'id'>>({
    nomorSoal: 1,
    capaianPembelajaran: '',
    materi: '',
    indikatorSoal: '',
    levelKognitif: 'L2 (C3)',
    bentukSoal: 'PG',
    bobot: 2,
    kunciJawaban: ''
  });

  // Find logged-in teacher profile if guru
  const currentGuruProfile = useMemo(() => {
    if (!userEmail) return null;
    const emailLower = userEmail.toLowerCase();
    return guruList.find(g => (g.email || '').toLowerCase() === emailLower) || null;
  }, [guruList, userEmail]);

  // Load Kisi-Kisi list from localStorage & Firestore
  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      setLoading(true);
      let initial: KisiKisiSoalDoc[] = [];
      try {
        const cached = localStorage.getItem(STORAGE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) initial = parsed;
        }
      } catch {
        // ignore cache parse error
      }

      if (mounted && initial.length > 0) {
        setKisiList(initial);
        setSelectedDocId(prev => prev || initial[0].id);
      }

      try {
        const remote = await dbFetchCollection<KisiKisiSoalDoc>(STORAGE_KEY);
        if (mounted && Array.isArray(remote) && remote.length > 0) {
          setKisiList(remote);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(remote));
          setSelectedDocId(prev =>
            prev && remote.some(d => d.id === prev) ? prev : remote[0].id
          );
        }
      } catch (err) {
        console.error('Failed to fetch edu_kisiKisiSoalList:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, []);

  const persistList = async (next: KisiKisiSoalDoc[], toastMsg?: string) => {
    setKisiList(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore quota error
    }
    setSaving(true);
    try {
      await dbSaveCollection(STORAGE_KEY, next);
      if (toastMsg) showToast(toastMsg, 'success');
    } catch (err) {
      console.error('Failed to save kisi-kisi list:', err);
      showToast('Tersimpan lokal, sinkronisasi cloud tertunda.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filtered docs for left sidebar
  const availableMapels = useMemo(() => {
    const set = new Set<string>();
    kisiList.forEach(k => k.mataPelajaran && set.add(k.mataPelajaran));
    bankSoalList.forEach(b => b.mataPelajaran && set.add(b.mataPelajaran));
    mapelList.forEach(m => m.namaMapel && set.add(m.namaMapel));
    return Array.from(set).sort();
  }, [kisiList, bankSoalList, mapelList]);

  const filteredDocs = useMemo(() => {
    const q = searchDoc.trim().toLowerCase();
    return kisiList.filter(d => {
      const matchSearch =
        !q ||
        d.judul.toLowerCase().includes(q) ||
        d.mataPelajaran.toLowerCase().includes(q) ||
        d.kelas.toLowerCase().includes(q) ||
        d.penyusunNama.toLowerCase().includes(q);
      const matchMapel = filterMapel === 'Semua' || d.mataPelajaran === filterMapel;
      const matchStatus = filterStatus === 'Semua' || d.status === filterStatus;
      return matchSearch && matchMapel && matchStatus;
    });
  }, [kisiList, searchDoc, filterMapel, filterStatus]);

  const activeDoc = useMemo(() => {
    return kisiList.find(d => d.id === selectedDocId) || filteredDocs[0] || null;
  }, [kisiList, selectedDocId, filteredDocs]);

  const linkedBankSoal = useMemo(() => {
    if (!activeDoc?.bankSoalId) return null;
    return bankSoalList.find(b => b.id === activeDoc.bankSoalId) || null;
  }, [activeDoc, bankSoalList]);

  // Filtered rows inside active doc
  const filteredButir = useMemo(() => {
    if (!activeDoc) return [];
    const q = searchRow.trim().toLowerCase();
    return [...(activeDoc.butirKisi || [])]
      .sort((a, b) => a.nomorSoal - b.nomorSoal)
      .filter(b => {
        const matchQ =
          !q ||
          String(b.nomorSoal).includes(q) ||
          b.capaianPembelajaran.toLowerCase().includes(q) ||
          b.materi.toLowerCase().includes(q) ||
          b.indikatorSoal.toLowerCase().includes(q);
        const matchLv = filterLevel === 'Semua' || b.levelKognitif === filterLevel;
        const matchBk = filterBentuk === 'Semua' || b.bentukSoal === filterBentuk;
        return matchQ && matchLv && matchBk;
      });
  }, [activeDoc, searchRow, filterLevel, filterBentuk]);

  // Analytics for active doc
  const stats = useMemo(() => {
    const rows = activeDoc?.butirKisi || [];
    const total = rows.length;
    const l1 = rows.filter(r => r.levelKognitif === 'L1 (C1-C2)').length;
    const l2 = rows.filter(r => r.levelKognitif === 'L2 (C3)').length;
    const l3 = rows.filter(r => r.levelKognitif === 'L3 (C4-C6)').length;
    const pg = rows.filter(r => r.bentukSoal === 'PG').length;
    const pgk = rows.filter(r => r.bentukSoal === 'PG Kompleks').length;
    const isian = rows.filter(r => r.bentukSoal === 'Isian Singkat').length;
    const esai = rows.filter(r => r.bentukSoal === 'Uraian / Esai').length;
    const totalBobot = rows.reduce((sum, r) => sum + (Number(r.bobot) || 0), 0);
    return {
      total,
      l1,
      l2,
      l3,
      pctL1: total ? Math.round((l1 / total) * 100) : 0,
      pctL2: total ? Math.round((l2 / total) * 100) : 0,
      pctL3: total ? Math.round((l3 / total) * 100) : 0,
      pg,
      pgk,
      isian,
      esai,
      totalBobot
    };
  }, [activeDoc]);

  // Create Kisi-Kisi from Bank Soal
  const handleGenerateFromBankSoal = async (bank: BankSoal) => {
    const matchedGuru = guruList.find(
      g => g.nama.trim().toLowerCase() === (bank.dibuatOleh || '').trim().toLowerCase()
    );
    const butirKisi: KisiKisiButirItem[] = (bank.daftarSoal || []).map((soal, idx) =>
      buildButirFromSoal(soal, idx, bank.mataPelajaran)
    );

    const newDoc: KisiKisiSoalDoc = {
      id: `kisi-${Date.now()}`,
      bankSoalId: bank.id,
      judul: `Kisi-Kisi ${bank.judul}`,
      mataPelajaran: bank.mataPelajaran || bank.mapel || 'Umum',
      kelas: bank.kelas || 'Semua Kelas',
      fase: inferFaseFromKelas(bank.kelas || ''),
      kurikulum: 'Kurikulum Merdeka',
      semester: cbtSettings.semester || 'Ganjil',
      tahunAjaran: cbtSettings.tahunAjaran || schoolSettings?.tahunAjaran || '2026/2027',
      alokasiWaktu: `${bank.durasiMenit || 90} Menit`,
      penyusunNama: bank.dibuatOleh || currentGuruProfile?.nama || 'Guru Mata Pelajaran',
      penyusunNip: matchedGuru?.nip || currentGuruProfile?.nip || '',
      tanggalPenyusunan: new Date().toISOString().slice(0, 10),
      status: 'Draft',
      butirKisi,
      updatedAt: new Date().toISOString()
    };

    const next = [newDoc, ...kisiList];
    setSelectedDocId(newDoc.id);
    setShowImportBankModal(false);
    await persistList(
      next,
      `Kisi-kisi berhasil dibuat dari Bank Soal "${bank.judul}" (${butirKisi.length} butir).`
    );
  };

  // Sync missing questions from linked Bank Soal
  const handleSyncLinkedBank = async () => {
    if (!activeDoc || !linkedBankSoal) return;
    const existingNums = new Set(activeDoc.butirKisi.map(b => b.nomorSoal));
    const added: KisiKisiButirItem[] = [];
    (linkedBankSoal.daftarSoal || []).forEach((soal, idx) => {
      const nomor = idx + 1;
      if (!existingNums.has(nomor)) {
        added.push(buildButirFromSoal(soal, idx, activeDoc.mataPelajaran));
      }
    });

    if (added.length === 0) {
      showToast('Semua butir soal dari Bank Soal terkait sudah tersinkronisasi.', 'success');
      return;
    }

    const updatedDoc: KisiKisiSoalDoc = {
      ...activeDoc,
      butirKisi: [...activeDoc.butirKisi, ...added].sort((a, b) => a.nomorSoal - b.nomorSoal),
      updatedAt: new Date().toISOString()
    };
    const next = kisiList.map(d => (d.id === activeDoc.id ? updatedDoc : d));
    await persistList(next, `${added.length} butir soal baru berhasil ditarik dari Bank Soal.`);
  };

  // Open create/edit doc modal
  const openCreateDocModal = () => {
    setEditingDoc(null);
    setDocForm({
      bankSoalId: '',
      judul: '',
      mataPelajaran: currentGuruProfile?.mataPelajaran || availableMapels[0] || '',
      kelas: rombelList[0]?.namaRombel || 'Kelas IX',
      fase: 'Fase D',
      kurikulum: 'Kurikulum Merdeka',
      semester: cbtSettings.semester || 'Ganjil',
      tahunAjaran: cbtSettings.tahunAjaran || schoolSettings?.tahunAjaran || '2026/2027',
      alokasiWaktu: '90 Menit',
      penyusunNama: currentGuruProfile?.nama || '',
      penyusunNip: currentGuruProfile?.nip || '',
      tanggalPenyusunan: new Date().toISOString().slice(0, 10),
      status: 'Draft'
    });
    setShowDocModal(true);
  };

  const openEditDocModal = (doc: KisiKisiSoalDoc) => {
    setEditingDoc(doc);
    setDocForm({
      bankSoalId: doc.bankSoalId || '',
      judul: doc.judul,
      mataPelajaran: doc.mataPelajaran,
      kelas: doc.kelas,
      fase: doc.fase || 'Fase D',
      kurikulum: doc.kurikulum,
      semester: doc.semester,
      tahunAjaran: doc.tahunAjaran,
      alokasiWaktu: doc.alokasiWaktu,
      penyusunNama: doc.penyusunNama,
      penyusunNip: doc.penyusunNip || '',
      tanggalPenyusunan: doc.tanggalPenyusunan || new Date().toISOString().slice(0, 10),
      status: doc.status
    });
    setShowDocModal(true);
  };

  const handleSaveDocForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docForm.judul.trim() || !docForm.mataPelajaran.trim()) {
      showToast('Judul Kisi-Kisi dan Mata Pelajaran wajib diisi.', 'error');
      return;
    }

    if (editingDoc) {
      const updated: KisiKisiSoalDoc = {
        ...editingDoc,
        ...docForm,
        judul: docForm.judul.trim(),
        mataPelajaran: docForm.mataPelajaran.trim(),
        kelas: docForm.kelas.trim() || 'Semua Kelas',
        penyusunNama: docForm.penyusunNama.trim() || 'Guru Mata Pelajaran',
        updatedAt: new Date().toISOString()
      };
      const next = kisiList.map(d => (d.id === editingDoc.id ? updated : d));
      setShowDocModal(false);
      await persistList(next, 'Identitas kisi-kisi berhasil diperbarui.');
    } else {
      let initialButir: KisiKisiButirItem[] = [];
      if (docForm.bankSoalId) {
        const bank = bankSoalList.find(b => b.id === docForm.bankSoalId);
        if (bank) {
          initialButir = (bank.daftarSoal || []).map((s, idx) =>
            buildButirFromSoal(s, idx, docForm.mataPelajaran.trim() || bank.mataPelajaran)
          );
        }
      }
      const created: KisiKisiSoalDoc = {
        id: `kisi-${Date.now()}`,
        ...docForm,
        judul: docForm.judul.trim(),
        mataPelajaran: docForm.mataPelajaran.trim(),
        kelas: docForm.kelas.trim() || 'Semua Kelas',
        penyusunNama: docForm.penyusunNama.trim() || 'Guru Mata Pelajaran',
        butirKisi: initialButir,
        updatedAt: new Date().toISOString()
      };
      const next = [created, ...kisiList];
      setSelectedDocId(created.id);
      setShowDocModal(false);
      await persistList(next, 'Dokumen kisi-kisi baru berhasil dibuat.');
    }
  };

  const handleToggleStatus = async () => {
    if (!activeDoc) return;
    const nextStatus: 'Draft' | 'Final' = activeDoc.status === 'Final' ? 'Draft' : 'Final';
    const next: KisiKisiSoalDoc[] = kisiList.map(d =>
      d.id === activeDoc.id ? { ...d, status: nextStatus, updatedAt: new Date().toISOString() } : d
    );
    await persistList(next, `Status kisi-kisi diubah menjadi ${nextStatus}.`);
  };

  const handleDeleteDoc = async (doc: KisiKisiSoalDoc) => {
    const next = kisiList.filter(d => d.id !== doc.id);
    setConfirmDeleteDoc(null);
    if (selectedDocId === doc.id) {
      setSelectedDocId(next[0]?.id || '');
    }
    await persistList(next, `Kisi-kisi "${doc.judul}" telah dihapus.`);
  };

  // Butir CRUD
  const openAddButirModal = () => {
    if (!activeDoc) return;
    const maxNo = activeDoc.butirKisi.reduce((m, b) => Math.max(m, b.nomorSoal), 0);
    const lastButir = activeDoc.butirKisi[activeDoc.butirKisi.length - 1];
    setEditingButir(null);
    setButirForm({
      nomorSoal: maxNo + 1,
      capaianPembelajaran: lastButir?.capaianPembelajaran || '',
      materi: lastButir?.materi || '',
      indikatorSoal: '',
      levelKognitif: 'L2 (C3)',
      bentukSoal: lastButir?.bentukSoal || 'PG',
      bobot: lastButir?.bobot ?? 2,
      kunciJawaban: ''
    });
    setShowButirModal(true);
  };

  const openEditButirModal = (item: KisiKisiButirItem) => {
    setEditingButir(item);
    setButirForm({
      nomorSoal: item.nomorSoal,
      capaianPembelajaran: item.capaianPembelajaran,
      materi: item.materi,
      indikatorSoal: item.indikatorSoal,
      levelKognitif: item.levelKognitif,
      bentukSoal: item.bentukSoal,
      bobot: item.bobot ?? 0,
      kunciJawaban: item.kunciJawaban || ''
    });
    setShowButirModal(true);
  };

  const handleSaveButir = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDoc) return;
    if (!butirForm.indikatorSoal.trim() || !butirForm.materi.trim()) {
      showToast('Materi Pokok dan Indikator Soal wajib diisi.', 'error');
      return;
    }

    let nextButir: KisiKisiButirItem[];
    if (editingButir) {
      nextButir = activeDoc.butirKisi.map(b =>
        b.id === editingButir.id
          ? {
              ...b,
              ...butirForm,
              capaianPembelajaran: butirForm.capaianPembelajaran.trim() || '-',
              materi: butirForm.materi.trim(),
              indikatorSoal: butirForm.indikatorSoal.trim(),
              kunciJawaban: butirForm.kunciJawaban?.trim() || ''
            }
          : b
      );
    } else {
      const created: KisiKisiButirItem = {
        id: `butir-${Date.now()}`,
        ...butirForm,
        capaianPembelajaran: butirForm.capaianPembelajaran.trim() || '-',
        materi: butirForm.materi.trim(),
        indikatorSoal: butirForm.indikatorSoal.trim(),
        kunciJawaban: butirForm.kunciJawaban?.trim() || ''
      };
      nextButir = [...activeDoc.butirKisi, created];
    }

    nextButir.sort((a, b) => a.nomorSoal - b.nomorSoal);
    const next = kisiList.map(d =>
      d.id === activeDoc.id ? { ...d, butirKisi: nextButir, updatedAt: new Date().toISOString() } : d
    );
    setShowButirModal(false);
    await persistList(next, editingButir ? 'Butir kisi-kisi diperbarui.' : 'Butir kisi-kisi ditambahkan.');
  };

  const handleDuplicateButir = async (item: KisiKisiButirItem) => {
    if (!activeDoc) return;
    const maxNo = activeDoc.butirKisi.reduce((m, b) => Math.max(m, b.nomorSoal), 0);
    const copy: KisiKisiButirItem = {
      ...item,
      id: `butir-${Date.now()}`,
      nomorSoal: maxNo + 1
    };
    const nextButir = [...activeDoc.butirKisi, copy].sort((a, b) => a.nomorSoal - b.nomorSoal);
    const next = kisiList.map(d =>
      d.id === activeDoc.id ? { ...d, butirKisi: nextButir, updatedAt: new Date().toISOString() } : d
    );
    await persistList(next, `Butir soal #${item.nomorSoal} diduplikasi ke #${copy.nomorSoal}.`);
  };

  const handleDeleteButir = async (id: string) => {
    if (!activeDoc) return;
    const remaining = activeDoc.butirKisi
      .filter(b => b.id !== id)
      .sort((a, b) => a.nomorSoal - b.nomorSoal)
      .map((b, i) => ({ ...b, nomorSoal: i + 1 }));
    const next = kisiList.map(d =>
      d.id === activeDoc.id ? { ...d, butirKisi: remaining, updatedAt: new Date().toISOString() } : d
    );
    await persistList(next, 'Butir kisi-kisi dihapus & nomor soal dirapikan.');
  };

  const handleMoveButir = async (id: string, dir: -1 | 1) => {
    if (!activeDoc) return;
    const sorted = [...activeDoc.butirKisi].sort((a, b) => a.nomorSoal - b.nomorSoal);
    const idx = sorted.findIndex(b => b.id === id);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= sorted.length) return;
    const swapped = [...sorted];
    [swapped[idx], swapped[targetIdx]] = [swapped[targetIdx], swapped[idx]];
    const renumbered = swapped.map((b, i) => ({ ...b, nomorSoal: i + 1 }));
    const next = kisiList.map(d =>
      d.id === activeDoc.id ? { ...d, butirKisi: renumbered, updatedAt: new Date().toISOString() } : d
    );
    await persistList(next);
  };

  // Export PDF
  const handleDownloadPdf = async (includeKunci: boolean) => {
    if (!activeDoc) return;
    setExportingPdf(true);
    try {
      await downloadKisiKisiPdf({
        docData: activeDoc,
        schoolName: schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR',
        schoolAddress: schoolSettings?.alamat || '',
        schoolNpsn: schoolSettings?.npsn || '',
        examTitle: cbtSettings.namaUjian || 'Sumatif Akhir Semester (SAS)',
        kota: cbtSettings.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok',
        kepsekNama: cbtSettings.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah',
        kepsekNip: cbtSettings.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '',
        logoUrl: schoolSettings?.logoUrl || '',
        ttdKepalaSekolahUrl: cbtSettings.ttdKepalaSekolahUrl || '',
        includeKunci,
        fileName: `${slugifyFileName(activeDoc.judul)}${includeKunci ? '-dengan-kunci' : ''}.pdf`
      });
      showToast(
        includeKunci
          ? 'PDF Kisi-Kisi (lengkap dengan Bobot & Kunci) berhasil diunduh.'
          : 'PDF Kisi-Kisi Penulisan Soal berhasil diunduh.',
        'success'
      );
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('Gagal membuat file PDF Kisi-Kisi.', 'error');
    } finally {
      setExportingPdf(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!activeDoc) return;
    const headers = [
      'No',
      'Tujuan Pembelajaran / CP',
      'Materi Pokok',
      'Indikator Soal',
      'Level Kognitif',
      'Bentuk Soal',
      'Nomor Soal',
      'Bobot',
      'Kunci Jawaban'
    ];
    const esc = (v: string | number | undefined) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = [...activeDoc.butirKisi]
      .sort((a, b) => a.nomorSoal - b.nomorSoal)
      .map((b, i) =>
        [
          i + 1,
          b.capaianPembelajaran,
          b.materi,
          b.indikatorSoal,
          b.levelKognitif,
          b.bentukSoal,
          b.nomorSoal,
          b.bobot ?? '',
          b.kunciJawaban ?? ''
        ]
          .map(esc)
          .join(',')
      );
    const csv = '\uFEFF' + [headers.map(esc).join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${slugifyFileName(activeDoc.judul)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('File CSV Kisi-Kisi berhasil diunduh.', 'success');
  };

  const levelBadgeClass = (lv: LevelKognitifKisi) => {
    if (lv.startsWith('L1')) return 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30';
    if (lv.startsWith('L3')) return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
    return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
  };

  const bentukBadgeClass = (bk: BentukSoalKisi) => {
    switch (bk) {
      case 'PG':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'PG Kompleks':
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
      case 'Isian Singkat':
        return 'bg-sky-500/15 text-sky-300 border-sky-500/30';
      case 'Uraian / Esai':
        return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* Header Control Bar */}
      <div className="bg-[#121212] border border-slate-800 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-lg font-bold text-white flex items-center gap-2.5 flex-wrap">
            <ClipboardList className="w-5 h-5 text-teal-400 shrink-0" />
            <span>Kisi-Kisi Penulisan Soal</span>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/25">
              {kisiList.length} Dokumen
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Susun pemetaan Capaian Pembelajaran (CP), Materi Pokok, Indikator Soal, Level Kognitif (L1–L3), dan sinkronkan langsung dari Bank Soal CBT.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowImportBankModal(true)}
            className="px-3.5 py-2 bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/35 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" /> Tarik dari Bank Soal ({bankSoalList.length})
          </button>
          <button
            type="button"
            onClick={openCreateDocModal}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-600/20 transition-all"
          >
            <Plus className="w-4 h-4" /> Buat Kisi-Kisi Baru
          </button>
        </div>
      </div>

      {/* Main Split Workspace */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: Daftar Dokumen Kisi-Kisi */}
        <div className="xl:col-span-4 space-y-3 bg-[#121212] border border-slate-800 rounded-xl p-4">
          <div className="space-y-2.5">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchDoc}
                onChange={e => setSearchDoc(e.target.value)}
                placeholder="Cari judul, mapel, kelas, penyusun..."
                className="w-full pl-8 pr-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={filterMapel}
                onChange={e => setFilterMapel(e.target.value)}
                className="flex-1 min-w-[130px] bg-[#181818] border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-[11px] font-medium focus:ring-1 focus:ring-teal-500 focus:outline-none"
              >
                <option value="Semua">Semua Mapel</option>
                {availableMapels.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <div className="flex items-center bg-[#181818] border border-slate-800 rounded-lg p-0.5 text-[11px]">
                {(['Semua', 'Draft', 'Final'] as const).map(st => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => setFilterStatus(st)}
                    className={`px-2 py-1 rounded-md font-semibold transition-all ${
                      filterStatus === st
                        ? 'bg-teal-600/20 text-teal-300 border border-teal-500/30'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document Cards */}
          <div className="space-y-2.5 max-h-[620px] overflow-y-auto pr-0.5">
            {loading ? (
              <div className="py-10 text-center text-xs text-slate-500">Memuat data kisi-kisi...</div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-10 px-4 text-center border border-dashed border-slate-800 rounded-xl bg-[#161616]">
                <ClipboardList className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">Belum ada dokumen kisi-kisi</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Klik <strong className="text-emerald-400">Tarik dari Bank Soal</strong> untuk membuat otomatis dari paket soal yang sudah ada, atau buat manual.
                </p>
              </div>
            ) : (
              filteredDocs.map(doc => {
                const isActive = activeDoc?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDocId(doc.id)}
                    className={`cursor-pointer p-3.5 rounded-xl border transition-all ${
                      isActive
                        ? 'bg-teal-950/25 border-teal-500/50 shadow-md shadow-teal-950/30'
                        : 'bg-[#171717] border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-xs font-bold leading-snug ${isActive ? 'text-teal-300' : 'text-white'}`}>
                        {doc.judul}
                      </h4>
                      <span
                        className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          doc.status === 'Final'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 mt-1">
                      {doc.mataPelajaran} • {doc.kelas}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-1 truncate">
                      Penyusun: {doc.penyusunNama}
                    </p>

                    <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-slate-800/80">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-[10px] font-mono text-teal-300">
                          {doc.butirKisi.length} Butir
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                          {doc.kurikulum === 'Kurikulum Merdeka' ? 'Kurmer' : 'K13'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => openEditDocModal(doc)}
                          title="Edit Identitas Kisi-Kisi"
                          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-blue-600/20 text-slate-300 hover:text-blue-300 border border-slate-700/60 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteDoc(doc)}
                          title="Hapus Kisi-Kisi"
                          className="p-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 border border-rose-800/40 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Active Kisi-Kisi Editor & Blueprint Table */}
        <div className="xl:col-span-8 space-y-4 min-w-0">
          {!activeDoc ? (
            <div className="bg-[#121212] border border-slate-800 rounded-xl p-10 text-center">
              <BookOpen className="w-10 h-10 text-teal-500/40 mx-auto mb-3" />
              <h4 className="text-sm font-bold text-white">Pilih atau Buat Dokumen Kisi-Kisi Soal</h4>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Anda dapat menarik langsung seluruh daftar soal dari <strong>Bank Soal Ujian</strong> yang sudah tersedia untuk menghasilkan draf kisi-kisi secara instan, lalu melengkapi CP, Materi Pokok, dan Indikator Soal sebelum mengunduh PDF resminya.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2.5 mt-5">
                <button
                  type="button"
                  onClick={() => setShowImportBankModal(true)}
                  className="px-4 py-2 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4" /> Tarik dari Bank Soal
                </button>
                <button
                  type="button"
                  onClick={openCreateDocModal}
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Buat Kisi-Kisi Manual
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Active Doc Metadata & Export Toolbar */}
              <div className="bg-[#121212] border border-slate-800 rounded-xl p-4 sm:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-base font-bold text-white">{activeDoc.judul}</h4>
                      <button
                        type="button"
                        onClick={handleToggleStatus}
                        title="Klik untuk ubah status Draft / Final"
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border transition-all flex items-center gap-1 ${
                          activeDoc.status === 'Final'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/25'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/35 hover:bg-amber-500/25'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3" /> {activeDoc.status}
                      </button>
                      {saving && (
                        <span className="text-[10px] text-slate-400">Menyimpan...</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400 mt-1.5">
                      <span>Mapel: <strong className="text-slate-200">{activeDoc.mataPelajaran}</strong></span>
                      <span>•</span>
                      <span>Kelas: <strong className="text-slate-200">{activeDoc.kelas}</strong>{activeDoc.fase ? ` (${activeDoc.fase})` : ''}</span>
                      <span>•</span>
                      <span>{activeDoc.kurikulum}</span>
                      <span>•</span>
                      <span>{activeDoc.alokasiWaktu}</span>
                      <span>•</span>
                      <span>Penyusun: <strong className="text-slate-200">{activeDoc.penyusunNama}</strong></span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => openEditDocModal(activeDoc)}
                    className="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 self-start"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-400" /> Edit Identitas
                  </button>
                </div>

                {/* Sebaran Level Kognitif & Bentuk Soal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
                  <div className="bg-[#171717] border border-slate-800/90 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5 text-teal-400" /> Sebaran Level Kognitif
                      </span>
                      <span className="text-slate-400 font-mono">{stats.total} Butir</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden flex border border-slate-800">
                      <div style={{ width: `${stats.pctL1}%` }} className="bg-cyan-500 h-full transition-all" />
                      <div style={{ width: `${stats.pctL2}%` }} className="bg-blue-500 h-full transition-all" />
                      <div style={{ width: `${stats.pctL3}%` }} className="bg-amber-500 h-full transition-all" />
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[10px]">
                      <span className="text-cyan-300 font-semibold">L1 (C1-C2): {stats.l1} ({stats.pctL1}%)</span>
                      <span className="text-blue-300 font-semibold">L2 (C3): {stats.l2} ({stats.pctL2}%)</span>
                      <span className="text-amber-300 font-semibold">L3 (C4-C6): {stats.l3} ({stats.pctL3}%)</span>
                    </div>
                  </div>

                  <div className="bg-[#171717] border border-slate-800/90 rounded-lg p-3 flex flex-col justify-between gap-2">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-bold text-slate-300">Komposisi Bentuk Soal</span>
                      <span className="text-emerald-300 font-bold font-mono">Total Bobot: {stats.totalBobot}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/25 font-semibold">
                        PG: {stats.pg}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/25 font-semibold">
                        PG Kompleks: {stats.pgk}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/25 font-semibold">
                        Isian: {stats.isian}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-300 border border-purple-500/25 font-semibold">
                        Uraian: {stats.esai}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={openAddButirModal}
                      className="px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Butir
                    </button>

                    {linkedBankSoal && (
                      <button
                        type="button"
                        onClick={handleSyncLinkedBank}
                        title={`Tarik soal baru dari ${linkedBankSoal.judul}`}
                        className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Sinkron Bank Soal
                      </button>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setPreviewWithKunci(false);
                        setShowPreviewModal(true);
                      }}
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5 text-sky-400" /> Pratinjau A4
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(false)}
                      disabled={exportingPdf}
                      className="px-3 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" /> {exportingPdf ? 'Membuat PDF...' : 'Unduh PDF'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDownloadPdf(true)}
                      disabled={exportingPdf}
                      title="Unduh PDF Kisi-Kisi dilengkapi kolom Bobot & Kunci Jawaban (Arsip Guru)"
                      className="px-3 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 disabled:opacity-60 text-indigo-300 border border-indigo-500/35 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <KeyRound className="w-3.5 h-3.5" /> PDF + Kunci
                    </button>
                    <button
                      type="button"
                      onClick={handleExportCsv}
                      className="px-3 py-2 bg-emerald-950/70 hover:bg-emerald-900/70 text-emerald-300 border border-emerald-700/50 rounded-lg text-xs font-bold flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" /> CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Filter & Table of Butir Kisi-Kisi */}
              <div className="bg-[#121212] border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-3.5 border-b border-slate-800 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchRow}
                      onChange={e => setSearchRow(e.target.value)}
                      placeholder="Cari nomor soal, CP, materi, atau indikator..."
                      className="w-full pl-8 pr-3 py-1.5 bg-[#181818] border border-slate-800 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={filterLevel}
                      onChange={e => setFilterLevel(e.target.value as 'Semua' | LevelKognitifKisi)}
                      className="bg-[#181818] border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="Semua">Semua Level</option>
                      {LEVEL_OPTIONS.map(lv => (
                        <option key={lv} value={lv}>{lv}</option>
                      ))}
                    </select>
                    <select
                      value={filterBentuk}
                      onChange={e => setFilterBentuk(e.target.value as 'Semua' | BentukSoalKisi)}
                      className="bg-[#181818] border border-slate-800 text-slate-300 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="Semua">Semua Bentuk</option>
                      {BENTUK_OPTIONS.map(bk => (
                        <option key={bk} value={bk}>{bk}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-[#181818] border-b border-slate-800 text-[10px] uppercase tracking-wider text-slate-400">
                      <tr>
                        <th className="px-3 py-3 text-center w-14">No. Soal</th>
                        <th className="px-3 py-3 min-w-[180px]">Tujuan Pembelajaran / CP</th>
                        <th className="px-3 py-3 min-w-[130px]">Materi Pokok</th>
                        <th className="px-3 py-3 min-w-[210px]">Indikator Soal</th>
                        <th className="px-3 py-3 text-center whitespace-nowrap">Level & Bentuk</th>
                        <th className="px-3 py-3 text-right w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {filteredButir.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                            {activeDoc.butirKisi.length === 0
                              ? 'Belum ada butir kisi-kisi. Klik "+ Tambah Butir" untuk mulai menyusun.'
                              : 'Tidak ada butir kisi-kisi yang cocok dengan filter.'}
                          </td>
                        </tr>
                      ) : (
                        filteredButir.map((row, idx) => (
                          <tr key={row.id} className="hover:bg-slate-800/25 align-top transition-colors">
                            <td className="px-3 py-3 text-center">
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-teal-500/15 text-teal-300 border border-teal-500/30 font-mono font-bold text-xs">
                                {row.nomorSoal}
                              </span>
                              {row.bobot ? (
                                <div className="text-[10px] text-slate-500 mt-1">{row.bobot} pt</div>
                              ) : null}
                            </td>
                            <td className="px-3 py-3 text-[11px] leading-relaxed text-slate-300">
                              {row.capaianPembelajaran}
                            </td>
                            <td className="px-3 py-3 text-[11px] font-semibold text-white">
                              {row.materi}
                              {row.kunciJawaban && row.kunciJawaban !== '-' && (
                                <div className="mt-1 text-[10px] font-normal text-emerald-400">
                                  Kunci: <span className="font-mono font-bold">{row.kunciJawaban}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 text-[11px] leading-relaxed text-slate-300">
                              {row.indikatorSoal}
                            </td>
                            <td className="px-3 py-3 text-center">
                              <div className="flex flex-col items-center gap-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border whitespace-nowrap ${levelBadgeClass(row.levelKognitif)}`}>
                                  {row.levelKognitif}
                                </span>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border whitespace-nowrap ${bentukBadgeClass(row.bentukSoal)}`}>
                                  {row.bentukSoal}
                                </span>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleMoveButir(row.id, -1)}
                                  disabled={idx === 0}
                                  title="Geser ke atas"
                                  className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                                >
                                  <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleMoveButir(row.id, 1)}
                                  disabled={idx === filteredButir.length - 1}
                                  title="Geser ke bawah"
                                  className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 disabled:opacity-30 text-slate-300"
                                >
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openEditButirModal(row)}
                                  title="Edit Butir"
                                  className="p-1 rounded bg-blue-600/20 hover:bg-blue-600/35 text-blue-300"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDuplicateButir(row)}
                                  title="Duplikat Butir"
                                  className="p-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300"
                                >
                                  <Copy className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteButir(row.id)}
                                  title="Hapus Butir"
                                  className="p-1 rounded bg-rose-950/50 hover:bg-rose-900/70 text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* MODAL: Tarik Otomatis dari Bank Soal */}
      {showImportBankModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl w-full max-w-xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-400" /> Tarik Kisi-Kisi dari Bank Soal CBT
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Pilih paket Bank Soal untuk memetakan seluruh nomor, bentuk soal, bobot, kunci, dan draf indikator secara otomatis.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowImportBankModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-2.5 overflow-y-auto">
              {bankSoalList.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  Belum ada paket Bank Soal yang tersimpan. Buat Bank Soal terlebih dahulu atau buat Kisi-Kisi secara manual.
                </div>
              ) : (
                bankSoalList.map(bank => {
                  const alreadyExists = kisiList.some(k => k.bankSoalId === bank.id);
                  return (
                    <div
                      key={bank.id}
                      className="p-3.5 rounded-xl bg-[#181818] border border-slate-800 hover:border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h5 className="text-xs font-bold text-white">{bank.judul}</h5>
                          {alreadyExists && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 border border-teal-500/30 font-semibold">
                              Sudah Ada Kisi-Kisi
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {bank.mataPelajaran} • {bank.kelas} • {bank.daftarSoal?.length || bank.jumlahSoal || 0} Soal • {bank.durasiMenit} Menit
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                          Penyusun: {bank.dibuatOleh || '-'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleGenerateFromBankSoal(bank)}
                        className="shrink-0 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                      >
                        <FileText className="w-3.5 h-3.5" /> Buat Kisi-Kisi
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Buat / Edit Identitas Kisi-Kisi */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-teal-400" />
                {editingDoc ? 'Edit Identitas Kisi-Kisi Soal' : 'Buat Dokumen Kisi-Kisi Baru'}
              </h4>
              <button
                type="button"
                onClick={() => setShowDocModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveDocForm} className="p-5 space-y-4 overflow-y-auto text-xs">
              {!editingDoc && bankSoalList.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Tautkan ke Bank Soal (Opsional — otomatis isi butir soal)
                  </label>
                  <select
                    value={docForm.bankSoalId || ''}
                    onChange={e => {
                      const bankId = e.target.value;
                      const bank = bankSoalList.find(b => b.id === bankId);
                      if (bank) {
                        const matchedGuru = guruList.find(
                          g => g.nama.trim().toLowerCase() === (bank.dibuatOleh || '').trim().toLowerCase()
                        );
                        setDocForm(prev => ({
                          ...prev,
                          bankSoalId: bankId,
                          judul: prev.judul || `Kisi-Kisi ${bank.judul}`,
                          mataPelajaran: bank.mataPelajaran || prev.mataPelajaran,
                          kelas: bank.kelas || prev.kelas,
                          fase: inferFaseFromKelas(bank.kelas || ''),
                          alokasiWaktu: `${bank.durasiMenit || 90} Menit`,
                          penyusunNama: bank.dibuatOleh || prev.penyusunNama,
                          penyusunNip: matchedGuru?.nip || prev.penyusunNip
                        }));
                      } else {
                        setDocForm(prev => ({ ...prev, bankSoalId: '' }));
                      }
                    }}
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="">— Tanpa Tautan Bank Soal (Isi Manual) —</option>
                    {bankSoalList.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.judul} ({b.mataPelajaran} • {b.daftarSoal?.length || b.jumlahSoal} Soal)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Judul Kisi-Kisi *</label>
                <input
                  type="text"
                  required
                  value={docForm.judul}
                  onChange={e => setDocForm(prev => ({ ...prev, judul: e.target.value }))}
                  placeholder="Contoh: Kisi-Kisi SAS Ganjil Informatika Kelas IX"
                  className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Mata Pelajaran *</label>
                  <input
                    type="text"
                    required
                    list="kisi-mapel-list"
                    value={docForm.mataPelajaran}
                    onChange={e => setDocForm(prev => ({ ...prev, mataPelajaran: e.target.value }))}
                    placeholder="Contoh: Matematika / Informatika"
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                  <datalist id="kisi-mapel-list">
                    {availableMapels.map(m => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kelas / Target</label>
                  <input
                    type="text"
                    value={docForm.kelas}
                    onChange={e => setDocForm(prev => ({ ...prev, kelas: e.target.value }))}
                    placeholder="Contoh: Kelas IX / Semua Kelas VII"
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Fase</label>
                  <select
                    value={docForm.fase || 'Fase D'}
                    onChange={e => setDocForm(prev => ({ ...prev, fase: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Fase A">Fase A (Kelas I–II)</option>
                    <option value="Fase B">Fase B (Kelas III–IV)</option>
                    <option value="Fase C">Fase C (Kelas V–VI)</option>
                    <option value="Fase D">Fase D (Kelas VII–IX)</option>
                    <option value="Fase E">Fase E (Kelas X)</option>
                    <option value="Fase F">Fase F (Kelas XI–XII)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kurikulum</label>
                  <select
                    value={docForm.kurikulum}
                    onChange={e => setDocForm(prev => ({ ...prev, kurikulum: e.target.value as 'Kurikulum Merdeka' | 'Kurikulum 2013' }))}
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Kurikulum Merdeka">Kurikulum Merdeka</option>
                    <option value="Kurikulum 2013">Kurikulum 2013</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Semester & Tahun Ajaran</label>
                  <div className="flex gap-2">
                    <select
                      value={docForm.semester}
                      onChange={e => setDocForm(prev => ({ ...prev, semester: e.target.value as 'Ganjil' | 'Genap' }))}
                      className="w-28 px-2.5 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    >
                      <option value="Ganjil">Ganjil</option>
                      <option value="Genap">Genap</option>
                    </select>
                    <input
                      type="text"
                      value={docForm.tahunAjaran}
                      onChange={e => setDocForm(prev => ({ ...prev, tahunAjaran: e.target.value }))}
                      placeholder="2026/2027"
                      className="flex-1 px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Alokasi Waktu</label>
                  <input
                    type="text"
                    value={docForm.alokasiWaktu}
                    onChange={e => setDocForm(prev => ({ ...prev, alokasiWaktu: e.target.value }))}
                    placeholder="90 Menit"
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nama Penyusun (Guru Mapel)</label>
                  <input
                    type="text"
                    list="kisi-guru-list"
                    value={docForm.penyusunNama}
                    onChange={e => {
                      const val = e.target.value;
                      const g = guruList.find(item => item.nama === val);
                      setDocForm(prev => ({
                        ...prev,
                        penyusunNama: val,
                        penyusunNip: g ? g.nip : prev.penyusunNip
                      }));
                    }}
                    placeholder="Nama guru penyusun"
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                  <datalist id="kisi-guru-list">
                    {guruList.map(g => (
                      <option key={g.id} value={g.nama} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">NIP Penyusun (Opsional)</label>
                  <input
                    type="text"
                    value={docForm.penyusunNip || ''}
                    onChange={e => setDocForm(prev => ({ ...prev, penyusunNip: e.target.value }))}
                    placeholder="NIP / -"
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Tanggal Penyusunan</label>
                  <input
                    type="date"
                    value={docForm.tanggalPenyusunan || ''}
                    onChange={e => setDocForm(prev => ({ ...prev, tanggalPenyusunan: e.target.value }))}
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Status Dokumen</label>
                  <select
                    value={docForm.status}
                    onChange={e => setDocForm(prev => ({ ...prev, status: e.target.value as 'Draft' | 'Final' }))}
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    <option value="Draft">Draft</option>
                    <option value="Final">Final (Siap Cetak)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowDocModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold"
                >
                  {editingDoc ? 'Simpan Perubahan' : 'Buat Kisi-Kisi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Tambah / Edit Butir Kisi-Kisi */}
      {showButirModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">
                {editingButir ? `Edit Butir Kisi-Kisi — Soal #${editingButir.nomorSoal}` : 'Tambah Butir Kisi-Kisi Soal'}
              </h4>
              <button
                type="button"
                onClick={() => setShowButirModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveButir} className="p-5 space-y-3.5 overflow-y-auto text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Nomor Soal *</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={butirForm.nomorSoal}
                    onChange={e => setButirForm(prev => ({ ...prev, nomorSoal: Math.max(1, Number(e.target.value) || 1) }))}
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Level Kognitif</label>
                  <select
                    value={butirForm.levelKognitif}
                    onChange={e => setButirForm(prev => ({ ...prev, levelKognitif: e.target.value as LevelKognitifKisi }))}
                    className="w-full px-2.5 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    {LEVEL_OPTIONS.map(lv => (
                      <option key={lv} value={lv}>{lv}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bentuk Soal</label>
                  <select
                    value={butirForm.bentukSoal}
                    onChange={e => setButirForm(prev => ({ ...prev, bentukSoal: e.target.value as BentukSoalKisi }))}
                    className="w-full px-2.5 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  >
                    {BENTUK_OPTIONS.map(bk => (
                      <option key={bk} value={bk}>{bk}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Bobot Poin</label>
                  <input
                    type="number"
                    min={0}
                    value={butirForm.bobot ?? 0}
                    onChange={e => setButirForm(prev => ({ ...prev, bobot: Math.max(0, Number(e.target.value) || 0) }))}
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Tujuan Pembelajaran / Capaian Pembelajaran (CP / KD)
                </label>
                <textarea
                  rows={2}
                  value={butirForm.capaianPembelajaran}
                  onChange={e => setButirForm(prev => ({ ...prev, capaianPembelajaran: e.target.value }))}
                  placeholder="Contoh: Peserta didik mampu menerapkan sifat-sifat logaritma dalam menyelesaikan masalah matematis."
                  className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Materi Pokok / Konten *</label>
                  <input
                    type="text"
                    required
                    value={butirForm.materi}
                    onChange={e => setButirForm(prev => ({ ...prev, materi: e.target.value }))}
                    placeholder="Contoh: Sifat-sifat Logaritma"
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">Kunci Jawaban (Opsional)</label>
                  <input
                    type="text"
                    value={butirForm.kunciJawaban || ''}
                    onChange={e => setButirForm(prev => ({ ...prev, kunciJawaban: e.target.value }))}
                    placeholder="A / B / A, C"
                    className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">Indikator Soal *</label>
                <textarea
                  rows={3}
                  required
                  value={butirForm.indikatorSoal}
                  onChange={e => setButirForm(prev => ({ ...prev, indikatorSoal: e.target.value }))}
                  placeholder="Contoh: Disajikan nilai log 2 dan log 3, peserta didik dapat menentukan nilai log 12 menggunakan sifat perkalian logaritma."
                  className="w-full px-3 py-2 bg-[#181818] border border-slate-800 rounded-lg text-slate-200 focus:ring-1 focus:ring-teal-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowButirModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-lg font-bold"
                >
                  {editingButir ? 'Simpan Butir' : 'Tambahkan Butir'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Pratinjau Dokumen Resmi A4 Landscape */}
      {showPreviewModal && activeDoc && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl w-full max-w-6xl max-h-[92vh] flex flex-col shadow-2xl">
            <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Eye className="w-4 h-4 text-sky-400" /> Pratinjau Kisi-Kisi Penulisan Soal (A4 Landscape)
                </h4>
                <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={previewWithKunci}
                    onChange={e => setPreviewWithKunci(e.target.checked)}
                    className="rounded accent-teal-500"
                  />
                  Tampilkan Bobot & Kunci
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadPdf(previewWithKunci)}
                  disabled={exportingPdf}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" /> Unduh PDF
                </button>
                <button
                  type="button"
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 overflow-auto bg-slate-900/70">
              <div className="bg-white text-slate-900 mx-auto max-w-[1050px] p-7 sm:p-9 rounded-lg shadow-xl text-[11px] leading-snug">
                {/* Kop Surat */}
                <div className="relative flex items-center justify-center pb-3 border-b-4 border-double border-[#0f2a56]">
                  {schoolSettings?.logoUrl && (
                    <img
                      src={schoolSettings.logoUrl}
                      alt="Logo Sekolah"
                      className="w-14 h-14 object-contain absolute left-0 top-0"
                    />
                  )}
                  <div className="text-center px-16">
                    <div className="text-base font-extrabold tracking-wide text-[#0f2a56]">
                      KISI-KISI PENULISAN SOAL
                    </div>
                    <div className="text-xs font-bold text-[#0f2a56] uppercase mt-0.5">
                      {cbtSettings.namaUjian || 'SUMATIF AKHIR SEMESTER'} — SEMESTER {activeDoc.semester.toUpperCase()} TAHUN PELAJARAN {activeDoc.tahunAjaran}
                    </div>
                    <div className="text-xs font-bold text-slate-900 uppercase mt-0.5">
                      {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}
                    </div>
                    {schoolSettings?.alamat && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        {schoolSettings.alamat}{schoolSettings.npsn ? ` • NPSN: ${schoolSettings.npsn}` : ''}
                      </div>
                    )}
                  </div>
                </div>

                {/* Identitas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1 bg-slate-50 border border-slate-200 rounded-md p-3 my-4 text-[11px]">
                  <div className="grid grid-cols-[125px_1fr]">
                    <span className="font-bold text-[#0f2a56]">Satuan Pendidikan</span>
                    <span>: {schoolSettings?.namaSekolah || '-'}</span>
                  </div>
                  <div className="grid grid-cols-[135px_1fr]">
                    <span className="font-bold text-[#0f2a56]">Tahun Pelajaran / Sem.</span>
                    <span>: {activeDoc.tahunAjaran} / {activeDoc.semester}</span>
                  </div>
                  <div className="grid grid-cols-[125px_1fr]">
                    <span className="font-bold text-[#0f2a56]">Mata Pelajaran</span>
                    <span>: {activeDoc.mataPelajaran}</span>
                  </div>
                  <div className="grid grid-cols-[135px_1fr]">
                    <span className="font-bold text-[#0f2a56]">Alokasi Waktu</span>
                    <span>: {activeDoc.alokasiWaktu}</span>
                  </div>
                  <div className="grid grid-cols-[125px_1fr]">
                    <span className="font-bold text-[#0f2a56]">Kelas / Fase</span>
                    <span>: {activeDoc.kelas}{activeDoc.fase ? ` / ${activeDoc.fase}` : ''}</span>
                  </div>
                  <div className="grid grid-cols-[135px_1fr]">
                    <span className="font-bold text-[#0f2a56]">Jumlah Soal</span>
                    <span>: {activeDoc.butirKisi.length} Butir</span>
                  </div>
                  <div className="grid grid-cols-[125px_1fr]">
                    <span className="font-bold text-[#0f2a56]">Kurikulum</span>
                    <span>: {activeDoc.kurikulum}</span>
                  </div>
                  <div className="grid grid-cols-[135px_1fr]">
                    <span className="font-bold text-[#0f2a56]">Penyusun</span>
                    <span>: {activeDoc.penyusunNama}</span>
                  </div>
                </div>

                {/* Tabel Kisi-Kisi */}
                <table className="w-full border-collapse border border-slate-300 text-[10.5px]">
                  <thead>
                    <tr className="bg-[#0f2a56] text-white text-center">
                      <th className="border border-slate-400 px-2 py-2 w-8">NO</th>
                      <th className="border border-slate-400 px-2 py-2">TUJUAN PEMBELAJARAN / CP</th>
                      <th className="border border-slate-400 px-2 py-2 w-36">MATERI POKOK</th>
                      <th className="border border-slate-400 px-2 py-2">INDIKATOR SOAL</th>
                      <th className="border border-slate-400 px-2 py-2 w-20">LEVEL</th>
                      <th className="border border-slate-400 px-2 py-2 w-24">BENTUK SOAL</th>
                      <th className="border border-slate-400 px-2 py-2 w-14">NO. SOAL</th>
                      {previewWithKunci && (
                        <>
                          <th className="border border-slate-400 px-2 py-2 w-12">BOBOT</th>
                          <th className="border border-slate-400 px-2 py-2 w-16">KUNCI</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {[...activeDoc.butirKisi]
                      .sort((a, b) => a.nomorSoal - b.nomorSoal)
                      .map((b, i) => (
                        <tr key={b.id} className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="border border-slate-300 px-2 py-1.5 text-center">{i + 1}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{b.capaianPembelajaran}</td>
                          <td className="border border-slate-300 px-2 py-1.5 font-medium">{b.materi}</td>
                          <td className="border border-slate-300 px-2 py-1.5">{b.indikatorSoal}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">{b.levelKognitif}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-center">{b.bentukSoal}</td>
                          <td className="border border-slate-300 px-2 py-1.5 text-center font-bold text-[#0f2a56]">{b.nomorSoal}</td>
                          {previewWithKunci && (
                            <>
                              <td className="border border-slate-300 px-2 py-1.5 text-center">{b.bobot ?? '-'}</td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center font-bold">{b.kunciJawaban || '-'}</td>
                            </>
                          )}
                        </tr>
                      ))}
                  </tbody>
                </table>

                {/* Rekap */}
                <div className="mt-3 p-2.5 bg-slate-50 border border-slate-200 rounded text-[10.5px] flex flex-wrap gap-x-4 gap-y-1">
                  <strong className="text-[#0f2a56]">REKAP SEBARAN:</strong>
                  <span>L1 (C1-C2): <strong>{stats.l1}</strong> ({stats.pctL1}%)</span>
                  <span>L2 (C3): <strong>{stats.l2}</strong> ({stats.pctL2}%)</span>
                  <span>L3 (C4-C6): <strong>{stats.l3}</strong> ({stats.pctL3}%)</span>
                  <span>Total Bobot: <strong>{stats.totalBobot} Poin</strong></span>
                </div>

                {/* Tanda Tangan */}
                <div className="grid grid-cols-2 gap-8 mt-6 pt-2 text-center text-[11px]">
                  <div>
                    <div>Mengetahui,</div>
                    <div>Kepala Sekolah</div>
                    <div className="h-16 flex items-center justify-center">
                      {cbtSettings.ttdKepalaSekolahUrl && (
                        <img
                          src={cbtSettings.ttdKepalaSekolahUrl}
                          alt="TTD Kepala Sekolah"
                          className="max-h-14 object-contain"
                        />
                      )}
                    </div>
                    <div className="font-bold underline">
                      {cbtSettings.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Kepala Sekolah'}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      NIP. {cbtSettings.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '-'}
                    </div>
                  </div>
                  <div>
                    <div>
                      {cbtSettings.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok'}, {formatTanggalIndo(activeDoc.tanggalPenyusunan)}
                    </div>
                    <div>Guru Mata Pelajaran / Penyusun</div>
                    <div className="h-16" />
                    <div className="font-bold underline">{activeDoc.penyusunNama}</div>
                    <div className="text-[10px] text-slate-600">NIP. {activeDoc.penyusunNip || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Konfirmasi Hapus Dokumen */}
      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#121212] border border-slate-800 rounded-2xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Hapus Dokumen Kisi-Kisi?</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Dokumen <strong className="text-slate-200">{confirmDeleteDoc.judul}</strong> beserta {confirmDeleteDoc.butirKisi.length} butir di dalamnya akan dihapus permanen.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleDeleteDoc(confirmDeleteDoc)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
              >
                Ya, Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
