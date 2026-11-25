const EVICTABLE_CACHE_KEYS = [
  'edu_administrasiList',
  'edu_hasilUjianList',
  'edu_bankSoalList',
  'edu_absensiHarian',
  'edu_absensiKelasList',
  'edu_absensiGuruList',
  'edu_transaksiList',
  'edu_tagihanList',
  'edu_gajiList',
  'edu_raporList',
  'edu_raporTahfidzList',
  'edu_stafList',
  'edu_guruList',
  'edu_siswaList',
];

function isQuotaError(err: unknown): boolean {
  if (!err) return false;
  if (err instanceof DOMException) {
    return (
      err.name === 'QuotaExceededError' ||
      err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
      err.code === 22 ||
      err.code === 1014
    );
  }
  const msg = String(err);
  return msg.includes('QuotaExceededError') || msg.includes('exceeded the quota');
}

export function safeSetStorageItem(key: string, value: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;

  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch (err) {
    if (!isQuotaError(err)) {
      console.warn(`Failed to write localStorage key "${key}":`, err);
      return false;
    }

    const keyPriorityIdx = EVICTABLE_CACHE_KEYS.indexOf(key);
    const isHeavyCache = keyPriorityIdx !== -1;

    if (isHeavyCache) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // ignore cleanup error
      }
    }

    const maxEvictIdx = isHeavyCache ? keyPriorityIdx : EVICTABLE_CACHE_KEYS.length;

    for (let i = 0; i < maxEvictIdx; i++) {
      const evictKey = EVICTABLE_CACHE_KEYS[i];
      if (evictKey === key) continue;
      try {
        if (window.localStorage.getItem(evictKey) !== null) {
          window.localStorage.removeItem(evictKey);
          window.localStorage.setItem(key, value);
          return true;
        }
      } catch {
        // Keep evicting lower-priority caches if still over quota
      }
    }

    try {
      window.localStorage.setItem(key, value);
      return true;
    } catch {
      console.warn(
        `localStorage quota exceeded for "${key}" (${Math.round(value.length / 1024)} KB). Continuing with in-memory & Firebase persistence.`
      );
      return false;
    }
  }
}

export function safeSetStorageJson(key: string, data: unknown): boolean {
  try {
    return safeSetStorageItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Failed to serialize localStorage key "${key}":`, err);
    return false;
  }
}
