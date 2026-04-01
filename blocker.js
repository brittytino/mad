(() => {
  const BLOCKED_PATH_PREFIXES = ["/reels", "/reel", "/explore", "/video/unified_cvc"];
  const ALLOWED_PATH_PREFIXES = ["/stories", "/direct/inbox", "/direct/t"];

  function toUrl(input) {
    try {
      if (input instanceof URL) {
        return input;
      }
      return new URL(input);
    } catch (_error) {
      return null;
    }
  }

  function normalizePath(pathname) {
    if (!pathname) {
      return "/";
    }

    const lower = pathname.toLowerCase();
    return lower.endsWith("/") && lower !== "/" ? lower.slice(0, -1) : lower;
  }

  function startsWithPath(pathname, prefix) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }

  function isInstagramUrl(input) {
    const url = toUrl(input);
    return Boolean(url) && url.hostname === "www.instagram.com";
  }

  function isBlockedPath(pathname) {
    const normalized = normalizePath(pathname);
    return BLOCKED_PATH_PREFIXES.some((prefix) => startsWithPath(normalized, prefix));
  }

  function isExplicitlyAllowedPath(pathname) {
    const normalized = normalizePath(pathname);
    return ALLOWED_PATH_PREFIXES.some((prefix) => startsWithPath(normalized, prefix));
  }

  function isLimitExceeded(state, now = Date.now()) {
    if (globalThis.IretardStorage.isEmergencyActive(state, now)) {
      return false;
    }

    return state.usedToday >= globalThis.IretardStorage.getDailyLimitMs(state);
  }

  function getBlockReason(input, state, now = Date.now()) {
    const url = toUrl(input);
    if (!url || !isInstagramUrl(url)) {
      return null;
    }

    if (globalThis.IretardStorage.isEmergencyActive(state, now)) {
      return null;
    }

    if (isBlockedPath(url.pathname)) {
      return "route";
    }

    if (isLimitExceeded(state, now)) {
      return "limit";
    }

    return null;
  }

  function shouldTrackUsage(input, state, now = Date.now()) {
    const url = toUrl(input);
    if (!url || !isInstagramUrl(url)) {
      return false;
    }

    return getBlockReason(url, state, now) === null;
  }

  globalThis.IretardBlocker = {
    BLOCKED_PATH_PREFIXES,
    ALLOWED_PATH_PREFIXES,
    toUrl,
    normalizePath,
    isInstagramUrl,
    isBlockedPath,
    isExplicitlyAllowedPath,
    isLimitExceeded,
    getBlockReason,
    shouldTrackUsage
  };
})();
