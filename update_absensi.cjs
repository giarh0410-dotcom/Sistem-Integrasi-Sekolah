const fs = require('fs');

const path = 'src/components/AbsensiView.tsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update calculateAttendanceStatusLabel
const oldCalc = `  const calculateAttendanceStatusLabel = (timeStr: string, mode: 'Masuk' | 'Pulang') => {
    const jadwal = schoolSettings?.jadwalPresensi || localJadwal;
    const parts = timeStr.split(':').map(Number);
    const curH = parts[0] || 0;
    const curM = parts[1] || 0;
    const curTotalSec = curH * 3600 + curM * 60;

    if (mode === 'Masuk') {
      const [mH, mM] = (jadwal.jamMasuk || '07:00').split(':').map(Number);
      const [tH, tM] = (jadwal.jamToleransi || '07:15').split(':').map(Number);`;

const newCalc = `  const calculateAttendanceStatusLabel = (timeStr: string, mode: 'Masuk' | 'Pulang', userType: 'siswa' | 'guru' | 'staf' = 'siswa') => {
    const jadwal = schoolSettings?.jadwalPresensi || localJadwal;
    const parts = timeStr.split(':').map(Number);
    const curH = parts[0] || 0;
    const curM = parts[1] || 0;
    const curTotalSec = curH * 3600 + curM * 60;

    const jMasuk = userType === 'siswa' ? (jadwal.jamMasuk || '07:00') : (jadwal.jamMasukGuru || '06:45');
    const jToleransi = userType === 'siswa' ? (jadwal.jamToleransi || '07:15') : (jadwal.jamToleransiGuru || '07:00');
    const jPulang = userType === 'siswa' ? (jadwal.jamPulang || '14:30') : (jadwal.jamPulangGuru || '15:00');

    if (mode === 'Masuk') {
      const [mH, mM] = jMasuk.split(':').map(Number);
      const [tH, tM] = jToleransi.split(':').map(Number);`;

content = content.replace(oldCalc, newCalc);

// 2. Update Pulang logic inside calc
const oldPulang = `    } else {
      const [pH, pM] = (jadwal.jamPulang || '16:00').split(':').map(Number);
      const pulangSec = pH * 3600 + pM * 60;`;

const newPulang = `    } else {
      const [pH, pM] = jPulang.split(':').map(Number);
      const pulangSec = pH * 3600 + pM * 60;`;

content = content.replace(oldPulang, newPulang);

// 3. Update call in sendWhatsAppNotif
content = content.replace(
  `const statusInfo = calculateAttendanceStatusLabel(waktu, tipe);`,
  `const statusInfo = calculateAttendanceStatusLabel(waktu, tipe, 'siswa');`
);

// 4. Update getDualStatus
const oldGetDualStatus = `  const getDualStatus = (a: AbsensiGuru) => {`;
const newGetDualStatus = `  const getDualStatus = (a: AbsensiGuru, userType: 'guru' | 'staf' = 'guru') => {`;
content = content.replace(oldGetDualStatus, newGetDualStatus);

const oldDualMasuk = `const res = calculateAttendanceStatusLabel(a.jamMasuk, 'Masuk');`;
const newDualMasuk = `const res = calculateAttendanceStatusLabel(a.jamMasuk, 'Masuk', userType);`;
content = content.replace(oldDualMasuk, newDualMasuk);

const oldDualPulang = `const res = calculateAttendanceStatusLabel(a.jamKeluar, 'Pulang');`;
const newDualPulang = `const res = calculateAttendanceStatusLabel(a.jamKeluar, 'Pulang', userType);`;
content = content.replace(oldDualPulang, newDualPulang);

// 5. Update processSiswaScan
const oldProcessSiswa = `const statusInfo = calculateAttendanceStatusLabel(timeNow, scanMode);`;
const newProcessSiswa = `const statusInfo = calculateAttendanceStatusLabel(timeNow, scanMode, 'siswa');`;
content = content.replace(oldProcessSiswa, newProcessSiswa);

// 6. Update processGuruScan
const oldProcessGuru = `  const processGuruScan = (guru: Guru, timeNow: string, today: string) => {
    const locationStr = gpsCoords ? getFriendlyLocationName(gpsCoords.lat, gpsCoords.lng) : 'Mesin Scan Barcode Utama';`;
const newProcessGuru = `  const processGuruScan = (guru: Guru, timeNow: string, today: string) => {
    const statusInfo = calculateAttendanceStatusLabel(timeNow, scanMode, 'guru');
    const locationStr = gpsCoords ? getFriendlyLocationName(gpsCoords.lat, gpsCoords.lng) : 'Mesin Scan Barcode Utama';`;
content = content.replace(oldProcessGuru, newProcessGuru);

// 7. Update processStafScan
const oldProcessStaf = `  const processStafScan = (staf: Staf, timeNow: string, today: string) => {
    const locationStr = gpsCoords ? getFriendlyLocationName(gpsCoords.lat, gpsCoords.lng) : 'Mesin Scan Barcode Utama';`;
const newProcessStaf = `  const processStafScan = (staf: Staf, timeNow: string, today: string) => {
    const statusInfo = calculateAttendanceStatusLabel(timeNow, scanMode, 'staf');
    const locationStr = gpsCoords ? getFriendlyLocationName(gpsCoords.lat, gpsCoords.lng) : 'Mesin Scan Barcode Utama';`;
content = content.replace(oldProcessStaf, newProcessStaf);


fs.writeFileSync(path, content);
console.log('AbsensiView.tsx updated.');
