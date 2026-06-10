import { useState, useEffect, useCallback, useRef } from 'react';

const CACHE_PREFIX = 'c_';

export const clearPageCache = (key) => {
  if (key) {
    sessionStorage.removeItem(CACHE_PREFIX + key);
  } else {
    Object.keys(sessionStorage)
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => sessionStorage.removeItem(k));
  }
};

export const useCachedData = (cacheKey, fetchFn, options = {}) => {
  const { enabled = true, ttl = null } = options;
  const storageKey = CACHE_PREFIX + cacheKey;

  const getInitialFromCache = () => {
    if (!enabled) return { data: null, hasCache: false };
    try {
      const cached = sessionStorage.getItem(storageKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (ttl === null || Date.now() - parsed.timestamp < ttl) {
          return { data: parsed.data, hasCache: true };
        }
      }
    } catch { /* ignore */ }
    return { data: null, hasCache: false };
  };

  const initial = getInitialFromCache();
  const [data, setData] = useState(initial.data);
  const [isLoading, setIsLoading] = useState(!initial.hasCache);
  const [error, setError] = useState(null);
  const fetchFnRef = useRef(fetchFn);
  const hasCachedRef = useRef(initial.hasCache);

  fetchFnRef.current = fetchFn;

  const load = useCallback(
    async (force = false, silent = false) => {
      if (!enabled) return;

      if (!silent && (force || !hasCachedRef.current)) setIsLoading(true);
      hasCachedRef.current = false;

      try {
        const result = await fetchFnRef.current();
        const payload = result?.data ?? result;
        setData(payload);
        sessionStorage.setItem(
          storageKey,
          JSON.stringify({ data: payload, timestamp: Date.now() })
        );
        setError(null);
      } catch (err) {
        setError(err);
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [enabled, storageKey]
  );

  useEffect(() => {
    load();
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);
  const silentRefresh = useCallback(() => load(true, true), [load]);

  return { data, isLoading, error, refresh, silentRefresh };
};
