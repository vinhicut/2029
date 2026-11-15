/**
 * Session & UI State Persistence Hooks
 * - `usePersistedState`: Debounced Web Storage state with TTL, sanitization & logout cleanup
 * - `useFormDraft`: Auto-saving form drafts with sensitive-field exclusion & clear-on-submit
 * - `useUrlQueryState`: Bidirectional URL Query String synchronization (?tab=...&page=...&search=...)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import {
  isSensitiveKey,
  readPersistedItem,
  removePersistedItem,
  sanitizeForStorage,
  writePersistedItem,
} from './storageManager';

const DEFAULT_STATE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function resolveInitial(valueOrFn) {
  return typeof valueOrFn === 'function' ? valueOrFn() : valueOrFn;
}

/**
 * Persists UI/workflow state (tabs, filters, accordion/modal/drawer open state, pagination)
 * into sessionStorage or localStorage with debounce, TTL, and logout cleanup.
 */
export function usePersistedState(
  key,
  defaultValue,
  {
    storage = 'session',
    ttlMs = DEFAULT_STATE_TTL_MS,
    debounceMs = 200,
    scopeToRoute = false,
    clearOnLogout = true,
  } = {}
) {
  const { pathname } = useLocation();
  const storageKey = scopeToRoute ? `state:${pathname}::${key}` : `state:${key}`;

  const [state, setState] = useState(() => {
    const fallback = resolveInitial(defaultValue);
    const saved = readPersistedItem(storageKey, { storage, fallback: undefined });
    return saved !== undefined ? saved : fallback;
  });

  const timerRef = useRef(null);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  // Debounced write to storage
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (debounceMs <= 0) {
      writePersistedItem(storageKey, state, { storage, ttlMs });
      return undefined;
    }

    timerRef.current = setTimeout(() => {
      writePersistedItem(storageKey, latestStateRef.current, { storage, ttlMs });
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, state, storage, ttlMs, debounceMs]);

  // Flush pending write on pagehide
  useEffect(() => {
    const handlePageHide = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      writePersistedItem(storageKey, latestStateRef.current, { storage, ttlMs });
    };
    window.addEventListener('pagehide', handlePageHide);
    return () => window.removeEventListener('pagehide', handlePageHide);
  }, [storageKey, storage, ttlMs]);

  // Reset state on logout if enabled
  useEffect(() => {
    if (!clearOnLogout) return undefined;
    const handleClear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      removePersistedItem(storageKey, { storage });
      setState(resolveInitial(defaultValue));
    };
    window.addEventListener('tuvi:auth-logout', handleClear);
    window.addEventListener('tuvi:persistence-clear', handleClear);
    return () => {
      window.removeEventListener('tuvi:auth-logout', handleClear);
      window.removeEventListener('tuvi:persistence-clear', handleClear);
    };
  }, [clearOnLogout, storageKey, storage, defaultValue]);

  const clearState = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    removePersistedItem(storageKey, { storage });
    setState(resolveInitial(defaultValue));
  }, [storageKey, storage, defaultValue]);

  return [state, setState, clearState];
}

/**
 * Form Draft Persistence Hook
 * - Automatically excludes sensitive fields (password, otp, card, cvv, token, etc.)
 * - Debounces storage writes (250ms default)
 * - Call `clearDraft()` after successful submission
 */
export function useFormDraft(
  formId,
  initialValues = {},
  {
    storage = 'session',
    ttlMs = DEFAULT_STATE_TTL_MS,
    debounceMs = 250,
    clearOnLogout = true,
  } = {}
) {
  const storageKey = `draft:${formId}`;

  const [values, setValues] = useState(() => {
    const base = resolveInitial(initialValues);
    const saved = readPersistedItem(storageKey, { storage, fallback: null });
    if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
      return { ...base, ...sanitizeForStorage(saved) };
    }
    return base;
  });

  const [hasDraft, setHasDraft] = useState(() => {
    const saved = readPersistedItem(storageKey, { storage, fallback: null });
    return Boolean(saved && typeof saved === 'object' && Object.keys(saved).length > 0);
  });

  const timerRef = useRef(null);
  const latestValuesRef = useRef(values);
  latestValuesRef.current = values;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const sanitized = sanitizeForStorage(latestValuesRef.current);
      writePersistedItem(storageKey, sanitized, { storage, ttlMs, sanitize: false });
      setHasDraft(true);
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [storageKey, values, storage, ttlMs, debounceMs]);

  useEffect(() => {
    if (!clearOnLogout) return undefined;
    const handleClear = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      removePersistedItem(storageKey, { storage });
      setValues(resolveInitial(initialValues));
      setHasDraft(false);
    };
    window.addEventListener('tuvi:auth-logout', handleClear);
    window.addEventListener('tuvi:persistence-clear', handleClear);
    return () => {
      window.removeEventListener('tuvi:auth-logout', handleClear);
      window.removeEventListener('tuvi:persistence-clear', handleClear);
    };
  }, [clearOnLogout, storageKey, storage, initialValues]);

  const updateField = useCallback((fieldName, value) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  const handleInputChange = useCallback((event) => {
    const { name, type, value, checked } = event.target || {};
    if (!name) return;
    const nextVal = type === 'checkbox' ? checked : value;
    setValues((prev) => ({ ...prev, [name]: nextVal }));
  }, []);

  const clearDraft = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    removePersistedItem(storageKey, { storage });
    setValues(resolveInitial(initialValues));
    setHasDraft(false);
  }, [storageKey, storage, initialValues]);

  // Helper to check if a field is protected from persistence
  const isFieldSensitive = useCallback((fieldName) => isSensitiveKey(fieldName), []);

  return {
    values,
    setValues,
    updateField,
    handleInputChange,
    clearDraft,
    hasDraft,
    isFieldSensitive,
  };
}

/**
 * Bidirectional URL Query String State Hook
 * Syncs discrete & filter parameters (?tab=info&page=2&search=abc) with URLSearchParams.
 */
export function useUrlQueryState(defaults = {}, { replace = true } = {}) {
  const [searchParams, setSearchParams] = useSearchParams();

  const queryState = useMemo(() => {
    const resolved = {};
    for (const [key, defaultVal] of Object.entries(defaults)) {
      const raw = searchParams.get(key);
      if (raw === null) {
        resolved[key] = defaultVal;
      } else if (typeof defaultVal === 'number') {
        const parsed = Number(raw);
        resolved[key] = Number.isFinite(parsed) ? parsed : defaultVal;
      } else if (typeof defaultVal === 'boolean') {
        resolved[key] = raw === 'true' || raw === '1';
      } else {
        resolved[key] = raw;
      }
    }
    return resolved;
  }, [searchParams, defaults]);

  const setQueryState = useCallback(
    (patchOrUpdater) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          const currentSnapshot = {};
          for (const [key, defaultVal] of Object.entries(defaults)) {
            const raw = prev.get(key);
            if (raw === null) currentSnapshot[key] = defaultVal;
            else if (typeof defaultVal === 'number') currentSnapshot[key] = Number(raw) || defaultVal;
            else if (typeof defaultVal === 'boolean') currentSnapshot[key] = raw === 'true' || raw === '1';
            else currentSnapshot[key] = raw;
          }

          const patch =
            typeof patchOrUpdater === 'function'
              ? patchOrUpdater(currentSnapshot)
              : patchOrUpdater;

          if (patch && typeof patch === 'object') {
            for (const [key, val] of Object.entries(patch)) {
              if (isSensitiveKey(key)) continue;
              const defaultVal = defaults[key];
              if (val === undefined || val === null || val === '' || val === defaultVal) {
                next.delete(key);
              } else {
                next.set(key, String(val));
              }
            }
          }
          return next;
        },
        { replace }
      );
    },
    [setSearchParams, defaults, replace]
  );

  return [queryState, setQueryState];
}
