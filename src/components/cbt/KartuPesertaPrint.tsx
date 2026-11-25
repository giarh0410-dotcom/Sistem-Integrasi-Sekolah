import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Building2,
  User,
  Printer,
  X,
  Scissors,
  ZoomIn,
  ZoomOut,
  FileStack,
  Info,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download
} from 'lucide-react';
import {
  Siswa,
  JadwalUjianItem,
  RombelKelas,
  SchoolSettings,
  CbtExamSettings
} from '../../types/school';
import { useEnhancedSignature } from './signatureUtils';

export interface KartuPesertaCardProps {
  siswa: Siswa;
  jadwalList: JadwalUjianItem[];
  rombelList: RombelKelas[];
  schoolSettings?: SchoolSettings;
  cbtSettings: CbtExamSettings;
  showCutGuide?: boolean;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatTanggalPenetapan(rawDate?: string): string {
  const dt = rawDate ? new Date(rawDate) : new Date();
  if (Number.isNaN(dt.getTime())) {
    return new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }
  return dt.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function getSortedJadwal(jadwalList: JadwalUjianItem[]): JadwalUjianItem[] {
  return [...jadwalList].sort((a, b) => {
    const cmpDate = (a.tanggal || '').localeCompare(b.tanggal || '');
    if (cmpDate !== 0) return cmpDate;
    return (a.jamMulai || '').localeCompare(b.jamMulai || '');
  });
}

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const HARI_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

function parseTanggalLocal(tanggal?: string): Date | null {
  const tgl = (tanggal || '').trim();
  if (!tgl) return null;
  const isoMatch = tgl.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const dt = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  const dmyMatch = tgl.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const dt = new Date(Number(dmyMatch[3]), Number(dmyMatch[2]) - 1, Number(dmyMatch[1]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
  return null;
}

function formatHariFromTanggal(tanggal?: string, short = false): string {
  const dt = parseTanggalLocal(tanggal);
  if (!dt) return '-';
  return short ? HARI_SHORT_ID[dt.getDay()] : HARI_ID[dt.getDay()];
}

function formatTanggalDMY(tanggal?: string, omitYear = false): string {
  const tgl = (tanggal || '').trim();
  if (!tgl) return '-';
  const isoMatch = tgl.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const d = isoMatch[3].padStart(2, '0');
    const m = isoMatch[2].padStart(2, '0');
    return omitYear ? `${d}/${m}` : `${d}/${m}/${isoMatch[1]}`;
  }
  const dmyMatch = tgl.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const d = dmyMatch[1].padStart(2, '0');
    const m = dmyMatch[2].padStart(2, '0');
    return omitYear ? `${d}/${m}` : `${d}/${m}/${dmyMatch[3]}`;
  }
  return tgl;
}

function formatJamRange(jamMulai?: string, jamSelesai?: string): string {
  const mulai = (jamMulai || '').trim();
  const selesai = (jamSelesai || '').trim();
  if (mulai && selesai) return `${mulai}-${selesai}`;
  return mulai || selesai || '-';
}

export function chunkSiswaIntoA4Sheets(list: Siswa[], perSheet = 4): Siswa[][] {
  const pages: Siswa[][] = [];
  for (let i = 0; i < list.length; i += perSheet) {
    pages.push(list.slice(i, i + perSheet));
  }
  return pages;
}

/**
 * Generates a 100% self-contained A4 Portrait HTML document where each card is
 * strictly 100mm (10cm) wide x 130mm (13cm) tall, arranged 2x2 (4 cards/sheet).
 * Prints cleanly inside a hidden iframe without popup blockers, flex clipping,
 * or global @page margin conflicts.
 */
export function buildKartuA4PrintHtml(params: {
  siswaList: Siswa[];
  jadwalList: JadwalUjianItem[];
  rombelList: RombelKelas[];
  schoolSettings?: SchoolSettings;
  cbtSettings: CbtExamSettings;
  showCutGuide: boolean;
}): string {
  const { siswaList, jadwalList, rombelList, schoolSettings, cbtSettings, showCutGuide } = params;
  const pages = chunkSiswaIntoA4Sheets(siswaList, 4);
  const sortedJadwal = getSortedJadwal(jadwalList);
  const tanggalStr = formatTanggalPenetapan(cbtSettings.tanggalPenetapan);
  const schoolName = schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR';
  const examName = cbtSettings.namaUjian || 'UJIAN CBT';
  const semester = (cbtSettings.semester || 'Ganjil').toUpperCase();
  const tahunAjaran = cbtSettings.tahunAjaran || '2026/2027';
  const kota = cbtSettings.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok';
  const kepsekNama = cbtSettings.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Nurhidayati, S.Pd';
  const rawNip = (cbtSettings.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '').trim();
  const showNip = rawNip !== '' && rawNip !== '-';

  const totalMapel = sortedJadwal.length;
  const isCompactMode = totalMapel > 8;
  const isDenseMode = totalMapel > 12 && totalMapel <= 16;
  const isTwoColMode = totalMapel > 16;
  const isUltraTwoCol = totalMapel > 24;

  const scheduleTableHtml = (() => {
    if (totalMapel === 0) {
      return `
        <table class="schedule-table">
          <thead>
            <tr>
              <th class="col-day">HARI</th>
              <th class="col-date">TANGGAL</th>
              <th class="col-time">WAKTU</th>
              <th class="col-mapel">MATA PELAJARAN</th>
            </tr>
          </thead>
          <tbody>
            <tr><td colspan="4" class="empty-row">Belum ada jadwal ujian terjadwal</td></tr>
          </tbody>
        </table>`;
    }

    if (isTwoColMode) {
      const half = Math.ceil(totalMapel / 2);
      const leftItems = sortedJadwal.slice(0, half);
      const rightItems = sortedJadwal.slice(half);
      const buildHalfTable = (items: JadwalUjianItem[]) => `
        <table class="schedule-table schedule-table-2col ${isUltraTwoCol ? 'ultra' : ''}">
          <thead>
            <tr>
              <th class="col-date-2c">HARI, TGL &amp; WAKTU</th>
              <th class="col-mapel-2c">MATA PELAJARAN</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                j => `
              <tr>
                <td class="col-date-2c">${escapeHtml(`${formatHariFromTanggal(j.tanggal, true)}, ${formatTanggalDMY(j.tanggal, true)} ${formatJamRange(j.jamMulai, j.jamSelesai)}`)}</td>
                <td class="col-mapel-2c">${escapeHtml(j.mataPelajaran || '-')}</td>
              </tr>`
              )
              .join('')}
          </tbody>
        </table>`;

      return `<div class="schedule-2col-grid">${buildHalfTable(leftItems)}${buildHalfTable(rightItems)}</div>`;
    }

    const rowsHtml = sortedJadwal
      .map(
        j => `
          <tr>
            <td class="col-day">${escapeHtml(formatHariFromTanggal(j.tanggal))}</td>
            <td class="col-date">${escapeHtml(formatTanggalDMY(j.tanggal))}</td>
            <td class="col-time">${escapeHtml(formatJamRange(j.jamMulai, j.jamSelesai))}</td>
            <td class="col-mapel">${escapeHtml(j.mataPelajaran || '-')}</td>
          </tr>`
      )
      .join('');

    return `
      <table class="schedule-table ${isCompactMode ? 'compact' : ''} ${isDenseMode ? 'dense' : ''}">
        <thead>
          <tr>
            <th class="col-day">HARI</th>
            <th class="col-date">TANGGAL</th>
            <th class="col-time">WAKTU</th>
            <th class="col-mapel">MATA PELAJARAN</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>`;
  })();

  const logoHtml = schoolSettings?.logoUrl
    ? `<img src="${escapeHtml(schoolSettings.logoUrl)}" alt="Logo" class="logo-img" referrerpolicy="no-referrer" />`
    : `<div class="logo-fallback">AF</div>`;

  const signatureHtml = cbtSettings.ttdKepalaSekolahUrl
    ? `<img src="${escapeHtml(cbtSettings.ttdKepalaSekolahUrl)}" alt="TTD Kepala Sekolah" class="ttd-img" referrerpolicy="no-referrer" />`
    : '';

  const sheetsHtml = pages
    .map(pageSiswa => {
      const cardsHtml = pageSiswa
        .map(siswa => {
          const noPeserta = `C2026-${(siswa.nisn || siswa.nis || '0000').slice(-4)}`;
          const barcodeText = siswa.kodeBarcode || `SIS-${siswa.nisn || siswa.nis || ''}`;
          const photoHtml = siswa.fotoUrl
            ? `<img src="${escapeHtml(siswa.fotoUrl)}" alt="${escapeHtml(siswa.nama)}" class="photo-img" referrerpolicy="no-referrer" />`
            : `<div class="photo-placeholder">
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" class="photo-icon">
                   <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                   <circle cx="12" cy="7" r="4"></circle>
                 </svg>
                 <span>FOTO 3x4</span>
               </div>`;

          return `
            <div class="kartu-slot ${showCutGuide ? 'with-cut-guide' : ''} ${isCompactMode ? 'is-compact' : ''}">
              <div class="kartu-inner">
                <div class="kartu-header">
                  <div class="logo-box">${logoHtml}</div>
                  <div class="header-text">
                    <div class="exam-title">KARTU PESERTA — ${escapeHtml(examName)}</div>
                    <div class="school-name">${escapeHtml(schoolName)}</div>
                    <div class="school-meta">SEMESTER ${escapeHtml(semester)} &bull; TP ${escapeHtml(tahunAjaran)}</div>
                  </div>
                  <div class="no-peserta-box">
                    <div class="no-peserta-label">NO PESERTA</div>
                    <div class="no-peserta-val">${escapeHtml(noPeserta)}</div>
                  </div>
                </div>

                <div class="identity-section">
                  <div class="photo-box">
                    ${photoHtml}
                  </div>
                  <div class="identity-details">
                    <div class="field-block">
                      <div class="field-label">NAMA PESERTA:</div>
                      <div class="student-name">${escapeHtml(siswa.nama || '-')}</div>
                    </div>
                    <div class="field-row-2">
                      <div class="field-block">
                        <div class="field-label">NISN / NIS:</div>
                        <div class="field-val mono">${escapeHtml(siswa.nisn || '-')} / ${escapeHtml(siswa.nis || '-')}</div>
                      </div>
                    </div>
                    <div class="field-block">
                      <div class="field-label">KELAS:</div>
                      <div class="field-val">${escapeHtml(siswa.kelas || '-')}</div>
                    </div>
                  </div>
                </div>

                <div class="schedule-section">
                  <div class="schedule-heading">
                    <span>JADWAL SESI UJIAN TERJADWAL:</span>
                    ${totalMapel > 0 ? `<span class="more-note">${totalMapel} Mapel</span>` : ''}
                  </div>
                  ${scheduleTableHtml}
                </div>

                <div class="kartu-footer">
                  <div class="sig-block">
                    <div class="sig-date">${escapeHtml(kota)}, ${escapeHtml(tanggalStr)}</div>
                    <div class="sig-role">Kepala Sekolah,</div>
                    <div class="sig-img-wrap">${signatureHtml}</div>
                    <div class="sig-name">${escapeHtml(kepsekNama)}</div>
                    ${showNip ? `<div class="sig-nip">NIP. ${escapeHtml(rawNip)}</div>` : ''}
                  </div>
                  <div class="barcode-block">
                    <div class="barcode-bars">|||||| |||| ||||| |||||||</div>
                    <div class="barcode-text">${escapeHtml(barcodeText)}</div>
                  </div>
                </div>
              </div>
            </div>
          `;
        })
        .join('');

      return `<div class="a4-sheet">${cardsHtml}</div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <title>Cetak Kartu Peserta Ujian CBT (HVS A4 - 10x13 cm)</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background: #ffffff;
      color: #000000;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    .a4-sheet {
      width: 210mm;
      height: 296mm;
      padding: 14mm 4mm;
      background: #ffffff;
      display: grid;
      grid-template-columns: 100mm 100mm;
      grid-template-rows: 130mm 130mm;
      column-gap: 2mm;
      row-gap: 7mm;
      align-content: start;
      justify-content: center;
      overflow: hidden;
      page-break-after: always;
      break-after: page;
    }
    .a4-sheet:last-child {
      page-break-after: auto;
      break-after: auto;
    }
    .kartu-slot {
      width: 100mm;
      height: 130mm;
      padding: 2.8mm;
      background: #ffffff;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .kartu-slot.with-cut-guide {
      border: 0.35mm dashed #64748b;
    }
    .kartu-inner {
      width: 100%;
      height: 100%;
      border: 0.45mm solid #000000;
      border-radius: 2mm;
      padding: 2.8mm;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      background: #ffffff;
      overflow: hidden;
    }
    .kartu-header {
      display: flex;
      align-items: center;
      gap: 2mm;
      border-bottom: 0.45mm solid #000000;
      padding-bottom: 1.8mm;
      flex-shrink: 0;
    }
    .logo-box {
      width: 9.5mm;
      height: 9.5mm;
      border-radius: 1.5mm;
      background: transparent;
      color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      flex-shrink: 0;
    }
    .logo-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
    .logo-fallback {
      font-size: 9pt;
      font-weight: 800;
    }
    .header-text {
      flex: 1;
      min-width: 0;
    }
    .exam-title {
      font-size: 8.2pt;
      font-weight: 900;
      text-transform: uppercase;
      line-height: 1.15;
      color: #000000;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .school-name {
      font-size: 7.2pt;
      font-weight: 800;
      text-transform: uppercase;
      color: #000000;
      line-height: 1.18;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 0.3mm;
    }
    .school-meta {
      font-size: 6.4pt;
      font-weight: 700;
      color: #000000;
      text-transform: uppercase;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .no-peserta-box {
      text-align: right;
      border-left: 0.45mm solid #000000;
      padding-left: 2mm;
      flex-shrink: 0;
    }
    .no-peserta-label {
      font-size: 6pt;
      font-weight: 800;
      color: #000000;
      text-transform: uppercase;
      line-height: 1;
    }
    .no-peserta-val {
      font-size: 8.6pt;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
      color: #000000;
      margin-top: 0.6mm;
      line-height: 1;
    }
    .identity-section {
      display: flex;
      gap: 2.5mm;
      align-items: flex-start;
      padding-top: 2mm;
      flex-shrink: 0;
    }
    .photo-box {
      width: 17mm;
      height: 23mm;
      border: 0.45mm solid #000000;
      border-radius: 1.2mm;
      background: #f8fafc;
      overflow: hidden;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .photo-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .photo-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #000000;
      font-size: 5.8pt;
      font-weight: 800;
      text-align: center;
    }
    .photo-icon {
      width: 6mm;
      height: 6mm;
      color: #334155;
      margin-bottom: 0.6mm;
    }
    .identity-details {
      flex: 1;
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 1.2mm;
    }
    .field-block {
      min-width: 0;
    }
    .field-label {
      font-size: 6.1pt;
      font-weight: 800;
      color: #000000;
      text-transform: uppercase;
      line-height: 1;
    }
    .student-name {
      font-size: 9.6pt;
      font-weight: 900;
      color: #000000;
      line-height: 1.14;
      margin-top: 0.35mm;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .field-val {
      font-size: 8pt;
      font-weight: 800;
      color: #000000;
      line-height: 1.18;
      margin-top: 0.25mm;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .field-val.mono {
      font-variant-numeric: tabular-nums;
    }
    .cred-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5mm;
      padding-top: 1.1mm;
      border-top: 0.25mm solid #94a3b8;
    }
    .cred-pill {
      display: inline-block;
      max-width: 100%;
      margin-top: 0.45mm;
      padding: 0.45mm 1.6mm;
      border-radius: 1mm;
      font-size: 8pt;
      font-weight: 900;
      font-variant-numeric: tabular-nums;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .cred-user {
      background: #f1f5f9;
      color: #000000;
      border: 0.3mm solid #000000;
    }
    .cred-pass {
      background: #f1f5f9;
      color: #000000;
      border: 0.3mm solid #000000;
    }
    .schedule-section {
      flex: 1;
      min-height: 0;
      overflow: hidden;
      padding-top: 1.8mm;
    }
    .schedule-heading {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 6.8pt;
      font-weight: 900;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin-bottom: 1mm;
    }
    .more-note {
      font-weight: 800;
      color: #000000;
      text-transform: none;
    }
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 7.4pt;
      table-layout: fixed;
    }
    .schedule-table th,
    .schedule-table td {
      border: 0.25mm solid #64748b;
      padding: 0.75mm 1mm;
      text-align: left;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: #000000;
    }
    .schedule-table thead th {
      background: #e2e8f0;
      font-weight: 900;
      color: #000000;
      font-size: 6.8pt;
    }
    .schedule-table .col-day {
      width: 13.5%;
      font-weight: 800;
      color: #000000;
    }
    .schedule-table .col-date {
      width: 18%;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: #000000;
      letter-spacing: 0.1px;
    }
    .schedule-table .col-time {
      width: 20.5%;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: #000000;
      letter-spacing: 0.1px;
    }
    .schedule-table .col-mapel {
      width: 48%;
      font-weight: 800;
      color: #000000;
    }
    .schedule-table .empty-row {
      text-align: center;
      color: #000000;
      font-style: italic;
      padding: 2mm;
    }
    .kartu-footer {
      display: flex;
      align-items: flex-end;
      justify-content: space-between;
      gap: 2mm;
      padding-top: 1.6mm;
      margin-top: 1.5mm;
      border-top: 0.45mm solid #000000;
      flex-shrink: 0;
    }
    .sig-block {
      font-size: 6.6pt;
      font-weight: 600;
      color: #000000;
      line-height: 1.2;
      min-width: 0;
    }
    .sig-role {
      font-weight: 800;
      color: #000000;
      position: relative;
      z-index: 1;
    }
    .sig-img-wrap {
      height: 12.8mm;
      display: flex;
      align-items: center;
      margin: 0.2mm 0;
      overflow: visible;
    }
    .ttd-img {
      height: 16mm;
      max-height: 16mm;
      width: auto;
      max-width: 60mm;
      object-fit: contain;
      object-position: left center;
      mix-blend-mode: multiply;
      margin: -1.4mm 0;
      image-rendering: -webkit-optimize-contrast;
    }
    .sig-name {
      font-size: 7.6pt;
      font-weight: 900;
      color: #000000;
      text-decoration: underline;
      position: relative;
      z-index: 1;
    }
    .sig-nip {
      font-size: 6.2pt;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      color: #000000;
    }
    .barcode-block {
      text-align: center;
      flex-shrink: 0;
    }
    .barcode-bars {
      background: #000000;
      color: #ffffff;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 7.4pt;
      font-weight: 800;
      letter-spacing: 1.2px;
      padding: 0.8mm 2mm;
      border-radius: 1mm;
    }
    .barcode-text {
      font-size: 6.2pt;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: #000000;
      margin-top: 0.5mm;
    }
    /* Compact layout when > 8 subjects so ALL subjects fit cleanly inside 10x13cm */
    .kartu-slot.is-compact {
      padding: 1.8mm;
    }
    .kartu-slot.is-compact .kartu-inner {
      padding: 1.8mm 2mm;
    }
    .kartu-slot.is-compact .kartu-header {
      padding-bottom: 1.1mm;
      gap: 1.6mm;
    }
    .kartu-slot.is-compact .logo-box {
      width: 8mm;
      height: 8mm;
    }
    .kartu-slot.is-compact .exam-title {
      font-size: 7.4pt;
      line-height: 1.1;
    }
    .kartu-slot.is-compact .school-name {
      font-size: 6.6pt;
    }
    .kartu-slot.is-compact .school-meta {
      font-size: 5.9pt;
    }
    .kartu-slot.is-compact .no-peserta-label {
      font-size: 5.6pt;
    }
    .kartu-slot.is-compact .no-peserta-val {
      font-size: 8pt;
    }
    .kartu-slot.is-compact .identity-section {
      padding-top: 1.2mm;
      gap: 2mm;
    }
    .kartu-slot.is-compact .photo-box {
      width: 15mm;
      height: 20mm;
    }
    .kartu-slot.is-compact .photo-icon {
      width: 5mm;
      height: 5mm;
    }
    .kartu-slot.is-compact .identity-details {
      gap: 0.65mm;
    }
    .kartu-slot.is-compact .field-label {
      font-size: 5.6pt;
    }
    .kartu-slot.is-compact .student-name {
      font-size: 8.8pt;
      margin-top: 0.15mm;
      -webkit-line-clamp: 1;
    }
    .kartu-slot.is-compact .field-val {
      font-size: 7.3pt;
      margin-top: 0.15mm;
    }
    .kartu-slot.is-compact .cred-grid {
      padding-top: 0.65mm;
      gap: 1.2mm;
    }
    .kartu-slot.is-compact .cred-pill {
      font-size: 7.3pt;
      padding: 0.25mm 1.2mm;
      margin-top: 0.25mm;
    }
    .kartu-slot.is-compact .schedule-section {
      padding-top: 1.1mm;
    }
    .kartu-slot.is-compact .schedule-heading {
      font-size: 6.2pt;
      margin-bottom: 0.6mm;
    }
    .schedule-table.compact {
      font-size: 6.8pt;
    }
    .schedule-table.compact thead th {
      font-size: 6.2pt;
      padding: 0.5mm 0.8mm;
    }
    .schedule-table.compact td {
      padding: 0.48mm 0.8mm;
      line-height: 1.1;
    }
    .schedule-table.compact .col-day {
      width: 13.5%;
    }
    .schedule-table.compact .col-date {
      width: 18%;
    }
    .schedule-table.compact .col-time {
      width: 20.5%;
    }
    .schedule-table.compact .col-mapel {
      width: 48%;
    }
    .schedule-table.dense {
      font-size: 6.35pt;
    }
    .schedule-table.dense thead th {
      font-size: 5.8pt;
      padding: 0.34mm 0.7mm;
    }
    .schedule-table.dense td {
      padding: 0.31mm 0.7mm;
      line-height: 1.05;
    }
    .schedule-2col-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.2mm;
      align-items: start;
    }
    .schedule-table-2col {
      font-size: 5pt;
    }
    .schedule-table-2col thead th {
      font-size: 4.7pt;
      padding: 0.36mm 0.4mm;
    }
    .schedule-table-2col td {
      padding: 0.34mm 0.4mm;
      line-height: 1.06;
    }
    .schedule-table-2col.ultra {
      font-size: 4.4pt;
    }
    .schedule-table-2col.ultra td,
    .schedule-table-2col.ultra thead th {
      padding: 0.24mm 0.35mm;
      line-height: 1.04;
    }
    .schedule-table-2col .col-date-2c {
      width: 53%;
      font-weight: 800;
      font-variant-numeric: tabular-nums;
      color: #000000;
    }
    .schedule-table-2col .col-mapel-2c {
      width: 47%;
      font-weight: 800;
      color: #000000;
    }
    .kartu-slot.is-compact .kartu-footer {
      padding-top: 1mm;
      margin-top: 0.8mm;
    }
    .kartu-slot.is-compact .sig-block {
      font-size: 6pt;
      line-height: 1.15;
    }
    .kartu-slot.is-compact .sig-img-wrap {
      height: 11.2mm;
      margin: 0.2mm 0;
      overflow: visible;
    }
    .kartu-slot.is-compact .ttd-img {
      height: 14.2mm;
      max-height: 14.2mm;
      width: auto;
      max-width: 54mm;
      margin: -1.3mm 0;
      image-rendering: -webkit-optimize-contrast;
    }
    .kartu-slot.is-compact .sig-name {
      font-size: 7pt;
    }
    .kartu-slot.is-compact .sig-nip {
      font-size: 5.7pt;
    }
    .kartu-slot.is-compact .barcode-bars {
      font-size: 6.6pt;
      padding: 0.6mm 1.6mm;
    }
    .kartu-slot.is-compact .barcode-text {
      font-size: 5.7pt;
    }
  </style>
</head>
<body>
  ${sheetsHtml}
</body>
</html>`;
}

/**
 * Prints the A4 10x13cm sheets using an isolated hidden iframe so that:
 * - Zero popup blockers (no window.open)
 * - Exact @page { size: A4 portrait; margin: 0; } without global CSS conflicts
 * - Full multi-page pagination (1 to 100+ sheets) without flex/overflow clipping
 * Falls back to body-portaled window.print() if iframe print throws.
 */
export function printKartuViaHiddenIframe(
  html: string,
  onFallback?: () => void,
  onDone?: () => void
): void {
  try {
    const existing = document.getElementById('cbt-kartu-print-iframe');
    if (existing) existing.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'cbt-kartu-print-iframe';
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';

    document.body.appendChild(iframe);

    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc || !iframe.contentWindow) {
      iframe.remove();
      onFallback?.();
      onDone?.();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    let printed = false;
    const executePrint = () => {
      if (printed) return;
      printed = true;
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        onFallback?.();
      } finally {
        onDone?.();
        setTimeout(() => {
          iframe.remove();
        }, 60000);
      }
    };

    const images = Array.from(doc.querySelectorAll('img'));
    if (images.length === 0) {
      setTimeout(executePrint, 100);
      return;
    }

    let pending = images.length;
    const markReady = () => {
      pending -= 1;
      if (pending <= 0) {
        setTimeout(executePrint, 80);
      }
    };

    images.forEach(img => {
      if (img.complete) {
        markReady();
      } else {
        img.addEventListener('load', markReady, { once: true });
        img.addEventListener('error', markReady, { once: true });
      }
    });

    // Safety cap so slow/broken external photos never stall the print dialog
    setTimeout(executePrint, 1800);
  } catch {
    onFallback?.();
    onDone?.();
  }
}

export const KartuPesertaCard: React.FC<KartuPesertaCardProps> = ({
  siswa,
  jadwalList,
  rombelList,
  schoolSettings,
  cbtSettings,
  showCutGuide = false
}) => {
  const sortedJadwal = useMemo(() => getSortedJadwal(jadwalList), [jadwalList]);

  const formattedTanggalPenetapan = useMemo(
    () => formatTanggalPenetapan(cbtSettings.tanggalPenetapan),
    [cbtSettings.tanggalPenetapan]
  );

  const noPeserta = `C2026-${(siswa.nisn || siswa.nis || '0000').slice(-4)}`;
  const rawNip = (cbtSettings.kepalaSekolahNip || schoolSettings?.nipKepalaSekolah || '').trim();
  const showNip = rawNip !== '' && rawNip !== '-';
  const sharpSignatureUrl = useEnhancedSignature(cbtSettings.ttdKepalaSekolahUrl);

  const totalMapel = sortedJadwal.length;
  const isCompactMode = totalMapel > 8;
  const isDenseMode = totalMapel > 12 && totalMapel <= 16;
  const isTwoColMode = totalMapel > 16;
  const isUltraTwoCol = totalMapel > 24;
  const halfCount = Math.ceil(totalMapel / 2);

  return (
    <div
      className={`kartu-peserta-10x13 bg-white text-black flex flex-col justify-between ${
        isCompactMode ? 'p-[2mm]' : 'p-[2.8mm]'
      } ${showCutGuide ? 'border border-dashed border-slate-500' : ''}`}
    >
      <div
        className={`w-full h-full border-[1.5px] border-black rounded-md flex flex-col justify-between bg-white overflow-hidden ${
          isCompactMode ? 'p-[2mm]' : 'p-[2.8mm]'
        }`}
      >
        {/* Header Kartu */}
        <div
          className={`flex items-center border-b-[1.5px] border-black shrink-0 ${
            isCompactMode ? 'gap-1.5 pb-1' : 'gap-2 pb-1.5'
          }`}
        >
          <div
            className={`${
              isCompactMode ? 'w-7 h-7' : 'w-9 h-9'
            } bg-transparent rounded-md text-black font-bold flex items-center justify-center shrink-0 overflow-hidden`}
          >
            {schoolSettings?.logoUrl ? (
              <img
                src={schoolSettings.logoUrl}
                alt="Logo"
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            ) : (
              <Building2 className={isCompactMode ? 'w-4 h-4' : 'w-5 h-5'} />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h4
              className={`font-black text-black uppercase tracking-wide leading-tight line-clamp-2 ${
                isCompactMode ? 'text-[9.5px]' : 'text-[10.5px]'
              }`}
            >
              KARTU PESERTA — {cbtSettings.namaUjian || 'UJIAN CBT'}
            </h4>
            <p
              className={`font-extrabold text-black uppercase leading-tight truncate mt-0.5 ${
                isCompactMode ? 'text-[8.5px]' : 'text-[9.5px]'
              }`}
            >
              {schoolSettings?.namaSekolah || 'SMP ISLAM MODERN AL FAKHIR'}
            </p>
            <p
              className={`font-bold text-black uppercase leading-tight truncate ${
                isCompactMode ? 'text-[7.5px]' : 'text-[8.5px]'
              }`}
            >
              SEMESTER {cbtSettings.semester.toUpperCase()} • TP {cbtSettings.tahunAjaran}
            </p>
          </div>
          <div className="text-right border-l-[1.5px] border-black pl-2 shrink-0">
            <div className="text-[7.2px] font-extrabold text-black uppercase leading-none">NO PESERTA</div>
            <div
              className={`font-sans font-black tabular-nums text-black mt-0.5 leading-none ${
                isCompactMode ? 'text-[10.5px]' : 'text-[11.5px]'
              }`}
            >
              {noPeserta}
            </div>
          </div>
        </div>

        {/* Identity + Photo + Credentials */}
        <div
          className={`flex items-start shrink-0 ${
            isCompactMode ? 'gap-2 pt-1' : 'gap-2.5 pt-1.5'
          }`}
        >
          {/* Pasfoto 3x4 */}
          <div
            className={`${
              isCompactMode ? 'w-[56px] h-[75px]' : 'w-[64px] h-[86px]'
            } shrink-0 border-[1.5px] border-black rounded overflow-hidden bg-slate-50 flex flex-col items-center justify-center relative`}
          >
            {siswa.fotoUrl ? (
              <img
                src={siswa.fotoUrl}
                alt={siswa.nama}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-black p-1 text-center">
                <User className={isCompactMode ? 'w-5 h-5 text-slate-700 mb-0.5' : 'w-6 h-6 text-slate-700 mb-0.5'} />
                <span className="text-[7px] font-extrabold uppercase tracking-wider text-black">
                  FOTO 3x4
                </span>
              </div>
            )}
          </div>

          {/* Identity Fields */}
          <div className={`flex-1 min-w-0 ${isCompactMode ? 'space-y-0.5' : 'space-y-1'}`}>
            <div>
              <span className="text-[7.2px] font-extrabold text-black uppercase block leading-none">
                Nama Peserta:
              </span>
              <span
                className={`font-black text-black leading-tight block mt-0.5 ${
                  isCompactMode ? 'text-[11px] truncate' : 'text-[12px] line-clamp-2'
                }`}
              >
                {siswa.nama}
              </span>
            </div>

            <div>
              <span className="text-[7.2px] font-extrabold text-black uppercase block leading-none">
                NISN / NIS:
              </span>
              <span
                className={`font-sans font-extrabold tabular-nums text-black leading-tight block truncate mt-0.5 ${
                  isCompactMode ? 'text-[9.2px]' : 'text-[10px]'
                }`}
              >
                {siswa.nisn || '-'} / {siswa.nis || '-'}
              </span>
            </div>

            <div>
              <span className="text-[7.2px] font-extrabold text-black uppercase block leading-none">
                Kelas:
              </span>
              <span
                className={`font-extrabold text-black leading-tight block truncate mt-0.5 ${
                  isCompactMode ? 'text-[9.2px]' : 'text-[10px]'
                }`}
              >
                {siswa.kelas}
              </span>
            </div>
          </div>
        </div>

        {/* Jadwal Sesi Ujian Terjadwal (Semua Mata Pelajaran) */}
        <div className={`flex-1 min-h-0 overflow-hidden ${isCompactMode ? 'pt-1' : 'pt-1.5'}`}>
          <div className={`flex items-center justify-between ${isCompactMode ? 'mb-0.5' : 'mb-1'}`}>
            <span
              className={`font-black text-black uppercase tracking-wider ${
                isCompactMode ? 'text-[8px]' : 'text-[8.8px]'
              }`}
            >
              Jadwal Sesi Ujian Terjadwal:
            </span>
            {totalMapel > 0 && (
              <span className="text-[7.5px] font-extrabold text-black">
                {totalMapel} Mapel
              </span>
            )}
          </div>

          {totalMapel === 0 ? (
            <table className="w-full text-left text-[9.5px] border-collapse border border-slate-500 table-fixed text-black">
              <thead className="bg-slate-200 font-black uppercase text-black">
                <tr>
                  <th className="border border-slate-500 px-1 py-[2px] w-[13.5%]">Hari</th>
                  <th className="border border-slate-500 px-1 py-[2px] w-[18%]">Tanggal</th>
                  <th className="border border-slate-500 px-1 py-[2px] w-[20.5%]">Waktu</th>
                  <th className="border border-slate-500 px-1 py-[2px] w-[48%]">Mata Pelajaran</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={4} className="border border-slate-500 px-1 py-2 text-center text-black italic">
                    Belum ada jadwal ujian terjadwal
                  </td>
                </tr>
              </tbody>
            </table>
          ) : isTwoColMode ? (
            <div className="grid grid-cols-2 gap-1 items-start">
              {[sortedJadwal.slice(0, halfCount), sortedJadwal.slice(halfCount)].map((colItems, colIdx) => (
                <table
                  key={colIdx}
                  className={`w-full text-left border-collapse border border-slate-500 table-fixed text-black ${
                    isUltraTwoCol ? 'text-[6px] leading-[1.06]' : 'text-[6.5px] leading-[1.1]'
                  }`}
                >
                  <thead className="bg-slate-200 font-black uppercase text-black">
                    <tr>
                      <th className="border border-slate-500 px-0.5 py-[1px] w-[53%]">Hari, Tgl &amp; Waktu</th>
                      <th className="border border-slate-500 px-0.5 py-[1px] w-[47%]">Mata Pelajaran</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colItems.map(j => (
                      <tr key={j.id}>
                        <td className="border border-slate-500 px-0.5 py-[1px] font-sans font-extrabold tabular-nums text-black truncate">
                          {formatHariFromTanggal(j.tanggal, true)}, {formatTanggalDMY(j.tanggal, true)}{' '}
                          {formatJamRange(j.jamMulai, j.jamSelesai)}
                        </td>
                        <td className="border border-slate-500 px-0.5 py-[1px] font-extrabold text-black truncate">
                          {j.mataPelajaran}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ))}
            </div>
          ) : (
            <table
              className={`w-full text-left border-collapse border border-slate-500 table-fixed text-black ${
                isDenseMode
                  ? 'text-[8.4px] leading-[1.1]'
                  : isCompactMode
                  ? 'text-[9.1px] leading-[1.16]'
                  : 'text-[9.8px] leading-[1.2]'
              }`}
            >
              <thead className="bg-slate-200 font-black uppercase text-black">
                <tr>
                  <th
                    className={`border border-slate-500 w-[13.5%] ${
                      isDenseMode
                        ? 'px-1 py-[1px]'
                        : isCompactMode
                        ? 'px-1 py-[1.8px]'
                        : 'px-1 py-[2.2px]'
                    }`}
                  >
                    Hari
                  </th>
                  <th
                    className={`border border-slate-500 w-[18%] ${
                      isDenseMode
                        ? 'px-1 py-[1px]'
                        : isCompactMode
                        ? 'px-1 py-[1.8px]'
                        : 'px-1 py-[2.2px]'
                    }`}
                  >
                    Tanggal
                  </th>
                  <th
                    className={`border border-slate-500 w-[20.5%] ${
                      isDenseMode
                        ? 'px-1 py-[1px]'
                        : isCompactMode
                        ? 'px-1 py-[1.8px]'
                        : 'px-1 py-[2.2px]'
                    }`}
                  >
                    Waktu
                  </th>
                  <th
                    className={`border border-slate-500 w-[48%] ${
                      isDenseMode
                        ? 'px-1 py-[1px]'
                        : isCompactMode
                        ? 'px-1 py-[1.8px]'
                        : 'px-1 py-[2.2px]'
                    }`}
                  >
                    Mata Pelajaran
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedJadwal.map(j => (
                  <tr key={j.id}>
                    <td
                      className={`border border-slate-500 font-extrabold text-black truncate ${
                        isDenseMode
                          ? 'px-1 py-[0.85px]'
                          : isCompactMode
                          ? 'px-1 py-[1.6px]'
                          : 'px-1 py-[2.2px]'
                      }`}
                    >
                      {formatHariFromTanggal(j.tanggal)}
                    </td>
                    <td
                      className={`border border-slate-500 font-sans font-extrabold tabular-nums text-black tracking-[0.01em] truncate ${
                        isDenseMode
                          ? 'px-1 py-[0.85px]'
                          : isCompactMode
                          ? 'px-1 py-[1.6px]'
                          : 'px-1 py-[2.2px]'
                      }`}
                    >
                      {formatTanggalDMY(j.tanggal)}
                    </td>
                    <td
                      className={`border border-slate-500 font-sans font-extrabold tabular-nums text-black tracking-[0.01em] truncate ${
                        isDenseMode
                          ? 'px-1 py-[0.85px]'
                          : isCompactMode
                          ? 'px-1 py-[1.6px]'
                          : 'px-1 py-[2.2px]'
                      }`}
                    >
                      {formatJamRange(j.jamMulai, j.jamSelesai)}
                    </td>
                    <td
                      className={`border border-slate-500 font-extrabold text-black truncate ${
                        isDenseMode
                          ? 'px-1 py-[0.85px]'
                          : isCompactMode
                          ? 'px-1 py-[1.6px]'
                          : 'px-1 py-[2.2px]'
                      }`}
                    >
                      {j.mataPelajaran}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Pengesahan & Barcode */}
        <div
          className={`flex items-end justify-between border-t-[1.5px] border-black text-black shrink-0 ${
            isCompactMode ? 'pt-1 mt-1 text-[7.8px]' : 'pt-1.5 mt-1.5 text-[8.6px]'
          }`}
        >
          <div className="min-w-0">
            <p className="leading-tight font-semibold text-black">
              {cbtSettings.kotaPenetapan || schoolSettings?.kotaKabupaten || 'Depok'},{' '}
              {formattedTanggalPenetapan}
            </p>
            <p className="font-extrabold text-black leading-tight relative z-10">Kepala Sekolah,</p>
            <div
              className={`flex items-center justify-start relative overflow-visible ${
                isCompactMode ? 'h-[43px] my-[1px]' : 'h-[49px] my-[1px]'
              }`}
            >
              {sharpSignatureUrl ? (
                <img
                  src={sharpSignatureUrl}
                  alt="Tanda Tangan Kepala Sekolah"
                  className={`${
                    isCompactMode
                      ? 'h-[53px] max-h-[53px] max-w-[205px] -my-1'
                      : 'h-[61px] max-h-[61px] max-w-[230px] -my-1.5'
                  } w-auto object-contain object-left mix-blend-multiply pointer-events-none select-none`}
                  referrerPolicy="no-referrer"
                />
              ) : null}
            </div>
            <p
              className={`font-black text-black underline leading-tight relative z-10 ${
                isCompactMode ? 'text-[9px]' : 'text-[9.8px]'
              }`}
            >
              {cbtSettings.kepalaSekolahNama || schoolSettings?.kepalaSekolah || 'Nurhidayati, S.Pd'}
            </p>
            {showNip && (
              <p className="text-[7.2px] font-sans font-bold tabular-nums text-black leading-tight">
                NIP. {rawNip}
              </p>
            )}
          </div>

          <div className="text-center font-mono shrink-0">
            <div
              className={`bg-black text-white font-mono font-extrabold tracking-widest rounded ${
                isCompactMode ? 'px-1.5 py-0.5 text-[8.5px]' : 'px-2 py-0.5 text-[9.5px]'
              }`}
            >
              |||||| |||| ||||| |||||||
            </div>
            <div className={`mt-0.5 font-sans font-extrabold tabular-nums text-black ${isCompactMode ? 'text-[7.2px]' : 'text-[7.8px]'}`}>
              {siswa.kodeBarcode || `SIS-${siswa.nisn || siswa.nis}`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KartuPesertaBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  siswaList: Siswa[];
  jadwalList: JadwalUjianItem[];
  rombelList: RombelKelas[];
  schoolSettings?: SchoolSettings;
  cbtSettings: CbtExamSettings;
  showCutGuide: boolean;
  onToggleCutGuide: () => void;
  onTriggerPrint: (targetList: Siswa[]) => void;
  onTriggerDownloadPdf: (targetList: Siswa[], rangeLabel?: string) => void;
  isPrinting?: boolean;
  isDownloadingPdf?: boolean;
  downloadProgress?: { current: number; total: number } | null;
}

const ZOOM_PRESETS = [
  { label: '55%', wrapperClass: 'w-[115.5mm] h-[162.8mm]', scaleClass: 'scale-[0.55] origin-top-left' },
  { label: '70%', wrapperClass: 'w-[147mm] h-[207.2mm]', scaleClass: 'scale-[0.7] origin-top-left' },
  { label: '85%', wrapperClass: 'w-[178.5mm] h-[251.6mm]', scaleClass: 'scale-[0.85] origin-top-left' },
  { label: '100%', wrapperClass: 'w-[210mm] h-[296mm]', scaleClass: 'scale-100 origin-top-left' }
] as const;

export const KartuPesertaBatchModal: React.FC<KartuPesertaBatchModalProps> = ({
  isOpen,
  onClose,
  siswaList,
  jadwalList,
  rombelList,
  schoolSettings,
  cbtSettings,
  showCutGuide,
  onToggleCutGuide,
  onTriggerPrint,
  onTriggerDownloadPdf,
  isPrinting = false,
  isDownloadingPdf = false,
  downloadProgress = null
}) => {
  const [zoomIdx, setZoomIdx] = useState<number>(1);
  const [activePageIdx, setActivePageIdx] = useState<number>(0);
  const [printFromPage, setPrintFromPage] = useState<number>(1);
  const [printToPage, setPrintToPage] = useState<number>(1);

  const currentZoom = ZOOM_PRESETS[zoomIdx] || ZOOM_PRESETS[1];
  const pages = useMemo(() => chunkSiswaIntoA4Sheets(siswaList, 4), [siswaList]);

  useEffect(() => {
    if (isOpen) {
      setActivePageIdx(0);
      setPrintFromPage(1);
      setPrintToPage(Math.max(1, pages.length));
    }
  }, [isOpen, pages.length]);

  const safeFrom = Math.max(1, Math.min(printFromPage, Math.max(1, pages.length)));
  const safeTo = Math.max(safeFrom, Math.min(printToPage, Math.max(1, pages.length)));

  const rangedSiswaList = useMemo(() => {
    if (pages.length === 0) return [];
    return pages.slice(safeFrom - 1, safeTo).flat();
  }, [pages, safeFrom, safeTo]);

  const rangedSheetCount = pages.length === 0 ? 0 : safeTo - safeFrom + 1;
  const currentPageSiswa = pages[activePageIdx] || [];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col p-3 sm:p-5 print:hidden">
      <div className="bg-[#121212] border border-slate-800 rounded-2xl w-full max-w-6xl mx-auto flex flex-col max-h-full shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-3.5 border-b border-slate-800 shrink-0">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30 shrink-0">
              <FileStack className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-base">
                Pratinjau Cetak Banyak Kartu Peserta (HVS A4 • 10 × 13 cm)
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Total <strong className="text-white">{siswaList.length} Kartu</strong> tersusun dalam{' '}
                <strong className="text-purple-300">{pages.length} Lembar Kertas HVS A4</strong> (2 kolom × 2 baris = 4 kartu/lembar, ukuran pas 10 cm × 13 cm).
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Cut Guide Toggle */}
            <button
              type="button"
              onClick={onToggleCutGuide}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-colors cursor-pointer ${
                showCutGuide
                  ? 'bg-purple-600/20 border-purple-500/40 text-purple-300'
                  : 'bg-[#181818] border-slate-700 text-slate-400 hover:text-white'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              Garis Potong: {showCutGuide ? 'Aktif' : 'Nonaktif'}
            </button>

            {/* Preview Zoom */}
            <div className="flex items-center bg-[#181818] border border-slate-800 rounded-lg p-0.5">
              <button
                type="button"
                onClick={() => setZoomIdx(i => Math.max(0, i - 1))}
                disabled={zoomIdx === 0}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Perkecil pratinjau"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-[11px] font-mono text-slate-300">
                {currentZoom.label}
              </span>
              <button
                type="button"
                onClick={() => setZoomIdx(i => Math.min(ZOOM_PRESETS.length - 1, i + 1))}
                disabled={zoomIdx === ZOOM_PRESETS.length - 1}
                className="p-1.5 text-slate-400 hover:text-white disabled:opacity-40 cursor-pointer"
                title="Perbesar pratinjau"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              aria-label="Tutup pratinjau"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Page Navigator & Print Range Bar */}
        {pages.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-2.5 bg-[#161616] border-b border-slate-800 text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-[11px] font-semibold">Pratinjau Halaman:</span>
              <button
                type="button"
                onClick={() => setActivePageIdx(i => Math.max(0, i - 1))}
                disabled={activePageIdx === 0}
                className="p-1 rounded-lg bg-[#1f1f1f] border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <select
                value={activePageIdx}
                onChange={e => setActivePageIdx(Number(e.target.value))}
                className="bg-[#1f1f1f] border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono cursor-pointer focus:outline-none focus:border-purple-500"
              >
                {pages.map((p, idx) => (
                  <option key={idx} value={idx}>
                    Halaman {idx + 1} / {pages.length} ({p.length} kartu)
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setActivePageIdx(i => Math.min(pages.length - 1, i + 1))}
                disabled={activePageIdx >= pages.length - 1}
                className="p-1 rounded-lg bg-[#1f1f1f] border border-slate-700 text-slate-300 hover:text-white disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <span className="text-slate-400 font-semibold">Rentang Cetak Lembar A4:</span>
              <input
                type="number"
                min={1}
                max={pages.length}
                value={printFromPage}
                onChange={e => setPrintFromPage(Math.max(1, Number(e.target.value) || 1))}
                className="w-16 px-2 py-1 bg-[#1f1f1f] border border-slate-700 rounded-lg text-white font-mono text-center focus:outline-none focus:border-purple-500"
              />
              <span className="text-slate-500">s/d</span>
              <input
                type="number"
                min={1}
                max={pages.length}
                value={printToPage}
                onChange={e => setPrintToPage(Math.min(pages.length, Math.max(1, Number(e.target.value) || 1)))}
                className="w-16 px-2 py-1 bg-[#1f1f1f] border border-slate-700 rounded-lg text-white font-mono text-center focus:outline-none focus:border-purple-500"
              />
              {(safeFrom !== 1 || safeTo !== pages.length) && (
                <button
                  type="button"
                  onClick={() => {
                    setPrintFromPage(1);
                    setPrintToPage(pages.length);
                  }}
                  className="text-purple-400 hover:text-purple-300 font-semibold underline cursor-pointer"
                >
                  Semua ({pages.length})
                </button>
              )}
            </div>
          </div>
        )}

        {/* Scrollable A4 Preview Area (renders active A4 sheet cleanly without browser lag) */}
        <div className="flex-1 overflow-auto bg-slate-950/90 p-5">
          {pages.length > 0 && (
            <div className="flex flex-col items-center space-y-2.5">
              <div className="text-[11px] font-mono text-slate-400 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold">
                  Halaman {activePageIdx + 1} / {pages.length}
                </span>
                <span>Kertas HVS A4 Portrait (21 × 29,7 cm) • {currentPageSiswa.length} Kartu (10 × 13 cm)</span>
              </div>

              {/* Scaled Visual Wrapper */}
              <div
                className={`relative shrink-0 shadow-2xl rounded-sm overflow-hidden border border-slate-700 bg-white ${currentZoom.wrapperClass}`}
              >
                <div className={`kartu-a4-sheet ${currentZoom.scaleClass}`}>
                  {currentPageSiswa.map(siswa => (
                    <KartuPesertaCard
                      key={siswa.id}
                      siswa={siswa}
                      jadwalList={jadwalList}
                      rombelList={rombelList}
                      schoolSettings={schoolSettings}
                      cbtSettings={cbtSettings}
                      showCutGuide={showCutGuide}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5 border-t border-slate-800 bg-[#141414] shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <Info className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              Pada dialog cetak, pilih kertas <strong className="text-slate-200">A4 Portrait</strong>, skala{' '}
              <strong className="text-slate-200">100% (Actual Size)</strong>, dan margin{' '}
              <strong className="text-slate-200">None</strong> agar hasil potong tepat 10 × 13 cm.
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#1c1c1c] hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                const rangeSuffix =
                  safeFrom !== 1 || safeTo !== pages.length
                    ? `Hal-${safeFrom}-${safeTo}`
                    : `${rangedSiswaList.length}-Siswa`;
                onTriggerDownloadPdf(rangedSiswaList, rangeSuffix);
              }}
              disabled={rangedSiswaList.length === 0 || isDownloadingPdf || isPrinting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              {isDownloadingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {downloadProgress
                    ? `Membuat PDF (${downloadProgress.current}/${downloadProgress.total})...`
                    : 'Membuat PDF...'}
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  Unduh PDF ({rangedSheetCount} Lembar A4)
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => onTriggerPrint(rangedSiswaList)}
              disabled={rangedSiswaList.length === 0 || isPrinting || isDownloadingPdf}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg cursor-pointer"
            >
              {isPrinting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyiapkan Cetak...
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  Cetak {rangedSiswaList.length} Kartu ({rangedSheetCount} Lembar A4)
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

interface KartuPesertaPrintContainerProps {
  siswaList: Siswa[];
  jadwalList: JadwalUjianItem[];
  rombelList: RombelKelas[];
  schoolSettings?: SchoolSettings;
  cbtSettings: CbtExamSettings;
  showCutGuide: boolean;
}

export const KartuPesertaPrintContainer: React.FC<KartuPesertaPrintContainerProps> = ({
  siswaList,
  jadwalList,
  rombelList,
  schoolSettings,
  cbtSettings,
  showCutGuide
}) => {
  const pages = useMemo(() => chunkSiswaIntoA4Sheets(siswaList, 4), [siswaList]);
  if (siswaList.length === 0 || typeof document === 'undefined') return null;

  return createPortal(
    <div id="printable-kartu-a4" className="hidden print:block bg-white text-slate-900">
      {pages.map((pageSiswa, pageIdx) => (
        <div key={pageIdx} className="kartu-a4-sheet">
          {pageSiswa.map(siswa => (
            <KartuPesertaCard
              key={siswa.id}
              siswa={siswa}
              jadwalList={jadwalList}
              rombelList={rombelList}
              schoolSettings={schoolSettings}
              cbtSettings={cbtSettings}
              showCutGuide={showCutGuide}
            />
          ))}
        </div>
      ))}
    </div>,
    document.body
  );
};
