(() => {
  const DEFAULT_STATE = Object.freeze({
    dailyLimit: 60,
    usedToday: 0,
    lastReset: 0,
    emergencyCount: 0,
    emergencyActiveUntil: 0
  });
  const STATE_KEYS = Object.keys(DEFAULT_STATE);

  const EMERGENCY_LIMIT_PER_DAY = 3;
  const EMERGENCY_DURATION_MS = 5 * 60 * 1000;
  const ONE_MINUTE_MS = 60 * 1000;
  const THEME_STORAGE_KEY = "themePreference";
  const THEME_PREFERENCES = Object.freeze({
    AUTO: "auto",
    LIGHT: "light",
    DARK: "dark"
  });

  function toSafeNumber(value, fallback = 0) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function normalizeThemePreference(value) {
    if (value === THEME_PREFERENCES.LIGHT || value === THEME_PREFERENCES.DARK) {
      return value;
    }
    return THEME_PREFERENCES.AUTO;
  }

  function resolveTheme(preference, prefersDark = false) {
    const normalized = normalizeThemePreference(preference);
    if (normalized === THEME_PREFERENCES.AUTO) {
      return prefersDark ? THEME_PREFERENCES.DARK : THEME_PREFERENCES.LIGHT;
    }
    return normalized;
  }

  function getDayStamp(timestamp) {
    const date = new Date(timestamp);
    return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
  }

  function isNewDay(lastReset, now = Date.now()) {
    if (!lastReset) {
      return true;
    }
    return getDayStamp(lastReset) !== getDayStamp(now);
  }

  function normalizeState(rawState) {
    const source = rawState || {};

    return {
      dailyLimit: clamp(Math.floor(toSafeNumber(source.dailyLimit, DEFAULT_STATE.dailyLimit)), 1, 1440),
      usedToday: Math.max(0, Math.floor(toSafeNumber(source.usedToday, DEFAULT_STATE.usedToday))),
      lastReset: Math.max(0, Math.floor(toSafeNumber(source.lastReset, DEFAULT_STATE.lastReset))),
      emergencyCount: clamp(Math.floor(toSafeNumber(source.emergencyCount, DEFAULT_STATE.emergencyCount)), 0, EMERGENCY_LIMIT_PER_DAY),
      emergencyActiveUntil: Math.max(0, Math.floor(toSafeNumber(source.emergencyActiveUntil, DEFAULT_STATE.emergencyActiveUntil)))
    };
  }

  function stateNeedsRepair(rawState, normalizedState) {
    if (!rawState || typeof rawState !== "object") {
      return true;
    }

    return STATE_KEYS.some((key) => rawState[key] !== normalizedState[key]);
  }

  function resetForNewDay(state, now = Date.now()) {
    return {
      ...state,
      usedToday: 0,
      emergencyCount: 0,
      emergencyActiveUntil: 0,
      lastReset: now
    };
  }

  async function safeStorageGet(defaults) {
    try {
      return await chrome.storage.local.get(defaults);
    } catch (_error) {
      return typeof defaults === "object" && defaults ? { ...defaults } : {};
    }
  }

  async function safeStorageSet(values) {
    try {
      await chrome.storage.local.set(values);
      return true;
    } catch (_error) {
      return false;
    }
  }

  async function readState() {
    const stored = await safeStorageGet(DEFAULT_STATE);
    const normalized = normalizeState(stored);

    if (stateNeedsRepair(stored, normalized)) {
      await safeStorageSet(normalized);
    }

    return normalized;
  }

  async function getState(now = Date.now()) {
    const current = await readState();
    if (!isNewDay(current.lastReset, now)) {
      return current;
    }

    const resetState = resetForNewDay(current, now);
    await safeStorageSet(resetState);
    return resetState;
  }

  async function setState(nextState, now = Date.now()) {
    const normalized = normalizeState(nextState);
    const withReset = isNewDay(normalized.lastReset, now) ? resetForNewDay(normalized, now) : normalized;
    await safeStorageSet(withReset);
    return withReset;
  }

  async function updateState(updater, now = Date.now()) {
    const current = await getState(now);
    let candidate = null;

    try {
      candidate = await updater({ ...current });
    } catch (_error) {
      candidate = null;
    }

    const next = candidate ? normalizeState(candidate) : current;

    if (!next.lastReset) {
      next.lastReset = now;
    }

    await safeStorageSet(next);
    return next;
  }

  async function getThemePreference() {
    const stored = await safeStorageGet({ [THEME_STORAGE_KEY]: THEME_PREFERENCES.AUTO });
    const normalized = normalizeThemePreference(stored[THEME_STORAGE_KEY]);

    if (stored[THEME_STORAGE_KEY] !== normalized) {
      await safeStorageSet({ [THEME_STORAGE_KEY]: normalized });
    }

    return normalized;
  }

  async function setThemePreference(nextPreference) {
    const normalized = normalizeThemePreference(nextPreference);
    await safeStorageSet({ [THEME_STORAGE_KEY]: normalized });
    return normalized;
  }

  function isEmergencyActive(state, now = Date.now()) {
    return toSafeNumber(state.emergencyActiveUntil, 0) > now;
  }

  function getDailyLimitMs(state) {
    return Math.max(1, toSafeNumber(state.dailyLimit, DEFAULT_STATE.dailyLimit)) * ONE_MINUTE_MS;
  }

  function getRemainingMs(state) {
    return Math.max(0, getDailyLimitMs(state) - toSafeNumber(state.usedToday, 0));
  }

  function getEmergencyUsesLeft(state) {
    return Math.max(0, EMERGENCY_LIMIT_PER_DAY - toSafeNumber(state.emergencyCount, 0));
  }

  function buildMetrics(state, now = Date.now()) {
    return {
      dailyLimitMs: getDailyLimitMs(state),
      remainingMs: getRemainingMs(state),
      emergencyUsesLeft: getEmergencyUsesLeft(state),
      emergencyActive: isEmergencyActive(state, now),
      emergencyRemainingMs: Math.max(0, toSafeNumber(state.emergencyActiveUntil, 0) - now)
    };
  }

  globalThis.IretardStorage = {
    DEFAULT_STATE,
    THEME_STORAGE_KEY,
    THEME_PREFERENCES,
    EMERGENCY_LIMIT_PER_DAY,
    EMERGENCY_DURATION_MS,
    ONE_MINUTE_MS,
    normalizeThemePreference,
    resolveTheme,
    isNewDay,
    normalizeState,
    resetForNewDay,
    readState,
    getState,
    setState,
    updateState,
    getThemePreference,
    setThemePreference,
    isEmergencyActive,
    getDailyLimitMs,
    getRemainingMs,
    getEmergencyUsesLeft,
    buildMetrics
  };
})();
