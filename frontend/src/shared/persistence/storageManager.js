/**
 * Storage Manager for Scroll Restoration & Session State Persistence
 * - Safe Web Storage wrapper (sessionStorage / localStorage)
 * - TTL expiration & LRU eviction to prevent QuotaExceededError
 * - Sensitive field sanitization (passwords, OTPs, payment cards, tokens)
 */

const NAMESPACE = 'tvha_persist:';
const INDEX_KEY = `${NAMESPACE}__index__`;
const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_ENTRIES = 80;

const SENSITIVE_KEY_PATTERNS = [
  /pass(word|code|phrase)?/i,
  /otp/i,
  /pin(_?code)?/i,
  /cvv|cvc/i,
  /card(_?number|_?exp|_?holder)?/i,
  /credit|debit/i,
  /secret/i,
  /token/i,
  /auth(orization)?/i,
  /private_?key/i,
  /cccd|cmnd/i,
];

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function getStorage(type = 'session') {
  if (!isBrowser()) return null;
  try {
    return type === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

export function isSensitiveKey(key) {
  if (typeof key !== 'string') return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Recursively strips sensitive fields before persisting to Web Storage.
 */
export function sanitizeForStorage(value, depth = 0) {
  if (depth > 10 || value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForStorage(item, depth + 1));
  }

  const sanitized = {};
  for (const [k, v] of Object.entries(value)) {
    if (isSensitiveKey(k)) continue;
    if (typeof v === 'function' || typeof v === 'symbol') continue;
    sanitized[k] = sanitizeForStorage(v, depth + 1);
  }
  return sanitized;
}

function safeParse(raw) {
  if (!raw || typeof raw !== 'string') return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function readIndex(storage) {
  const parsed = safeParse(storage.getItem(INDEX_KEY));
  return Array.isArray(parsed) ? parsed : [];
}

function writeIndex(storage, entries) {
  try {
    storage.setItem(INDEX_KEY, JSON.stringify(entries));
  } catch {
    /* ignore index write errors */
  }
}

function touchIndex(storage, fullKey, maxEntries = MAX_ENTRIES) {
  const now = Date.now();
  const entries = readIndex(storage).filter((entry) => entry && entry.k !== fullKey);
  entries.push({ k: fullKey, t: now });

  // Evict oldest entries if exceeding maxEntries
  while (entries.length > maxEntries) {
    const oldest = entries.shift();
    if (oldest?.k) {
      try {
        storage.removeItem(oldest.k);
      } catch {
        /* ignore */
      }
    }
  }
  writeIndex(storage, entries);
}

function evictOldestBatch(storage, ratio = 0.25) {
  const entries = readIndex(storage);
  if (entries.length === 0) {
    // Fallback: sweep any namespaced keys
    const keysToRemove = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k && k.startsWith(NAMESPACE) && k !== INDEX_KEY) {
        keysToRemove.push(k);
      }
    }
    const count = Math.max(1, Math.ceil(keysToRemove.length * ratio));
    keysToRemove.slice(0, count).forEach((k) => storage.removeItem(k));
    return;
  }

  const removeCount = Math.max(1, Math.ceil(entries.length * ratio));
  const removed = entries.splice(0, removeCount);
  removed.forEach((entry) => {
    if (entry?.k) {
      try {
        storage.removeItem(entry.k);
      } catch {
        /* ignore */
      }
    }
  });
  writeIndex(storage, entries);
}

/**
 * Purge expired entries across storage.
 */
export function purgeExpiredEntries(storageType = 'session') {
  const storage = getStorage(storageType);
  if (!storage) return;

  const now = Date.now();
  const entries = readIndex(storage);
  const validEntries = [];

  for (const entry of entries) {
    if (!entry?.k) continue;
    const record = safeParse(storage.getItem(entry.k));
    if (!record || (typeof record.exp === 'number' && record.exp > 0 && record.exp < now)) {
      try {
        storage.removeItem(entry.k);
      } catch {
        /* ignore */
      }
    } else {
      validEntries.push(entry);
    }
  }

  writeIndex(storage, validEntries);
}

export function buildStorageKey(key) {
  return key.startsWith(NAMESPACE) ? key : `${NAMESPACE}${key}`;
}

export function writePersistedItem(
  key,
  data,
  { storage: storageType = 'session', ttlMs = DEFAULT_TTL_MS, sanitize = true } = {}
) {
  const storage = getStorage(storageType);
  if (!storage) return false;

  const fullKey = buildStorageKey(key);
  const payload = sanitize ? sanitizeForStorage(data) : data;
  const record = {
    v: 1,
    ts: Date.now(),
    exp: ttlMs > 0 ? Date.now() + ttlMs : 0,
    data: payload,
  };

  let serialized;
  try {
    serialized = JSON.stringify(record);
  } catch {
    return false;
  }

  try {
    storage.setItem(fullKey, serialized);
    touchIndex(storage, fullKey);
    return true;
  } catch (err) {
    const isQuotaError =
      err?.name === 'QuotaExceededError' ||
      err?.code === 22 ||
      err?.code === 1014;
    if (isQuotaError) {
      evictOldestBatch(storage, 0.3);
      try {
        storage.setItem(fullKey, serialized);
        touchIndex(storage, fullKey);
        return true;
      } catch {
        return false;
      }
    }
    return false;
  }
}

export function readPersistedItem(key, { storage: storageType = 'session', fallback = null } = {}) {
  const storage = getStorage(storageType);
  if (!storage) return fallback;

  const fullKey = buildStorageKey(key);
  const raw = storage.getItem(fullKey);
  if (!raw) return fallback;

  const record = safeParse(raw);
  if (!record || typeof record !== 'object' || !('data' in record)) {
    // Corrupted JSON or invalid envelope -> auto-clean
    try {
      storage.removeItem(fullKey);
    } catch {
      /* ignore */
    }
    return fallback;
  }

  if (typeof record.exp === 'number' && record.exp > 0 && record.exp < Date.now()) {
    try {
      storage.removeItem(fullKey);
    } catch {
      /* ignore */
    }
    return fallback;
  }

  return record.data;
}

export function removePersistedItem(key, { storage: storageType = 'session' } = {}) {
  const storage = getStorage(storageType);
  if (!storage) return;

  const fullKey = buildStorageKey(key);
  try {
    storage.removeItem(fullKey);
    const entries = readIndex(storage).filter((e) => e?.k !== fullKey);
    writeIndex(storage, entries);
  } catch {
    /* ignore */
  }
}

/**
 * Clears persisted session/UI state (e.g. on logout or workflow reset).
 * Preserves authentication/static app settings outside the `tvha_persist:` namespace.
 */
export function clearAllPersistedState({ prefix = '', includeLocal = true } = {}) {
  const targetPrefix = `${NAMESPACE}${prefix}`;
  const types = includeLocal ? ['session', 'local'] : ['session'];

  for (const type of types) {
    const storage = getStorage(type);
    if (!storage) continue;
    const keysToRemove = [];
    for (let i = 0; i < storage.length; i += 1) {
      const k = storage.key(i);
      if (k && k.startsWith(targetPrefix)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => {
      try {
        storage.removeItem(k);
      } catch {
        /* ignore */
      }
    });
    if (!prefix) {
      try {
        storage.removeItem(INDEX_KEY);
      } catch {
        /* ignore */
      }
    }
  }
}
