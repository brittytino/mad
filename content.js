(() => {
  const BLOCK_CONTAINER_ID = "iretard-block-root";
  const BLOCK_STYLE_ID = "iretard-block-style";
  const PREBLOCK_STYLE_ID = "iretard-preblock-style";
  const CHALLENGE_CONTAINER_ID = "iretard-challenge-root";
  const CHALLENGE_STYLE_ID = "iretard-challenge-style";
  const HARD_BLOCK_CLASS = "iretard-hard-block";
  const DIRECT_INBOX_URL = "https://www.instagram.com/direct/inbox/";
  const FEUR_HOOKS_KEY = "FeurHooks";

  function normalizePath(pathname) {
    const lower = String(pathname || "/").toLowerCase();
    return lower.endsWith("/") && lower !== "/" ? lower.slice(0, -1) : lower;
  }

  function startsWithPath(pathname, prefix) {
    return pathname === prefix || pathname.startsWith(`${prefix}/`);
  }

  function isStrictBlockedPath(pathname) {
    try {
      return globalThis.IretardBlocker.isBlockedPath(pathname);
    } catch (_error) {
      const normalizedPath = normalizePath(pathname);
      return startsWithPath(normalizedPath, "/reels")
        || startsWithPath(normalizedPath, "/reel")
        || startsWithPath(normalizedPath, "/video/unified_cvc");
    }
  }

  function getRedirectUrlForInput(input) {
    try {
      const url = input instanceof URL ? input : new URL(String(input || location.href), location.origin);
      if (!globalThis.IretardBlocker.shouldRedirectToDirectTab(url.href)) {
        return null;
      }

      return DIRECT_INBOX_URL;
    } catch (_error) {
      return null;
    }
  }

  function redirectToDirectInbox(reason) {
    if (location.href === DIRECT_INBOX_URL) {
      return false;
    }

    try {
      location.replace(DIRECT_INBOX_URL);
      return true;
    } catch (_error) {
      return false;
    }
  }

  function createIOException(requestUri, reason) {
    const error = new Error(`Blocked Instagram request: ${reason} :: ${requestUri}`);
    error.name = "IOException";
    return error;
  }

  function ensureFeurHooks() {
    if (globalThis[FEUR_HOOKS_KEY]) {
      return globalThis[FEUR_HOOKS_KEY];
    }

    const hooks = {
      getBlockReason(uri) {
        const redirectTarget = getRedirectUrlForInput(uri);
        if (redirectTarget) {
          return "fragment_clips";
        }

        return globalThis.IretardBlocker.getNetworkBlockReason(uri);
      },
      throwIfBlocked(uri) {
        const reason = this.getBlockReason(uri);
        if (!reason) {
          return null;
        }

        if (reason === "fragment_clips") {
          redirectToDirectInbox("fragment_clips");
        }

        throw createIOException(String(uri || "unknown"), reason);
      }
    };

    globalThis[FEUR_HOOKS_KEY] = hooks;
    return hooks;
  }

  function isStrictBlockedUrl(input) {
    try {
      const url = input instanceof URL ? input : new URL(String(input || location.href), location.origin);
      return isStrictBlockedPath(url.pathname);
    } catch (_error) {
      return isStrictBlockedPath(location.pathname);
    }
  }

  function ensurePreBlockStyle() {
    if (document.getElementById(PREBLOCK_STYLE_ID)) {
      return;
    }

    const preStyle = document.createElement("style");
    preStyle.id = PREBLOCK_STYLE_ID;
    preStyle.textContent = `
      html.${HARD_BLOCK_CLASS},
      html.${HARD_BLOCK_CLASS} body {
        overflow: hidden !important;
      }

      html.${HARD_BLOCK_CLASS} body {
        visibility: hidden !important;
      }

      #${BLOCK_CONTAINER_ID} {
        visibility: visible !important;
      }
    `;
    document.documentElement.appendChild(preStyle);
  }

  if (getRedirectUrlForInput(location.href)) {
    redirectToDirectInbox("preboot");
  }

  if (isStrictBlockedUrl(location.href)) {
    ensurePreBlockStyle();
    document.documentElement.classList.add(HARD_BLOCK_CLASS);
  }

  let unblockTimer = null;
  let observer = null;
  let mutationQueued = false;
  let currentReason = null;
  let lastKnownState = globalThis.IretardStorage.normalizeState({});
  let applyingBlockUi = false;
  let challengeTickTimer = null;
  let challengeActiveMs = 0;
  let challengeVisible = false;
  let challengeAnswer = null;

  ensureFeurHooks();

  function clearPreBlockOnly() {
    const preStyle = document.getElementById(PREBLOCK_STYLE_ID);
    if (preStyle) {
      preStyle.remove();
    }

    document.documentElement.classList.remove(HARD_BLOCK_CLASS);
  }

  function isEmergencyOverride(state = lastKnownState, now = Date.now()) {
    return globalThis.IretardStorage.isEmergencyActive(state, now);
  }

  function sendMessage(type, payload = {}) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type, ...payload }, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response || null);
        });
      } catch (_error) {
        resolve(null);
      }
    });
  }

  function installNetworkInterceptors() {
    const hooks = ensureFeurHooks();

    if (typeof window.fetch === "function" && !window.fetch.__iretardPatched) {
      const originalFetch = window.fetch.bind(window);
      const patchedFetch = function patchedFetch(input, init) {
        const requestUri = input instanceof Request ? input.url : input;

        try {
          hooks.throwIfBlocked(requestUri);
        } catch (error) {
          return Promise.reject(error);
        }

        return originalFetch(input, init);
      };

      patchedFetch.__iretardPatched = true;
      window.fetch = patchedFetch;
    }

    if (typeof XMLHttpRequest !== "undefined" && !XMLHttpRequest.prototype.__iretardPatched) {
      const originalOpen = XMLHttpRequest.prototype.open;
      const originalSend = XMLHttpRequest.prototype.send;

      XMLHttpRequest.prototype.open = function patchedOpen(method, url, ...rest) {
        try {
          this.__iretardRequestUri = new URL(String(url || ""), location.origin).href;
        } catch (_error) {
          this.__iretardRequestUri = String(url || "");
        }

        return originalOpen.call(this, method, url, ...rest);
      };

      XMLHttpRequest.prototype.send = function patchedSend(body) {
        hooks.throwIfBlocked(this.__iretardRequestUri || "");
        return originalSend.call(this, body);
      };

      XMLHttpRequest.prototype.__iretardPatched = true;
    }

    if (navigator && typeof navigator.sendBeacon === "function" && !navigator.sendBeacon.__iretardPatched) {
      const originalSendBeacon = navigator.sendBeacon.bind(navigator);
      const patchedSendBeacon = function patchedSendBeacon(url, data) {
        try {
          hooks.throwIfBlocked(url);
        } catch (_error) {
          return false;
        }

        return originalSendBeacon(url, data);
      };

      patchedSendBeacon.__iretardPatched = true;
      try {
        navigator.sendBeacon = patchedSendBeacon;
      } catch (_error) {
        // Ignore when browser marks sendBeacon as non-writable.
      }
    }
  }

  function formatMinutes(ms) {
    const totalMinutes = Math.max(0, Math.ceil(ms / globalThis.IretardStorage.ONE_MINUTE_MS));
    if (totalMinutes >= 60) {
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    return `${totalMinutes}m`;
  }

  function getTomorrowLabel() {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    return tomorrow.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function getMsUntilNextMidnight(now = Date.now()) {
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    return Math.max(1000, nextMidnight.getTime() - now);
  }

  async function getResolvedTheme() {
    try {
      const preference = await globalThis.IretardStorage.getThemePreference();
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return globalThis.IretardStorage.resolveTheme(preference, prefersDark);
    } catch (_error) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  }

  function ensureBlockStyles() {
    if (document.getElementById(BLOCK_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = BLOCK_STYLE_ID;
    style.textContent = `
      #${BLOCK_CONTAINER_ID} {
        --bg: #ffffff;
        --surface: #ffffff;
        --line: #d9deea;
        --text: #151925;
        --subtle: #5f6980;
        --shadow: 0 18px 44px rgba(20, 28, 48, 0.12);
        position: fixed;
        inset: 0;
        z-index: 2147483647;
        background: radial-gradient(1200px 500px at 20% -20%, rgba(114, 134, 180, 0.14), transparent 65%),
          radial-gradient(900px 400px at 95% 120%, rgba(122, 169, 152, 0.12), transparent 60%),
          var(--bg);
        color: var(--text);
        display: none;
        align-items: center;
        justify-content: center;
        padding: 24px;
        box-sizing: border-box;
        font-family: "Avenir Next", "Manrope", "SF Pro Display", "Segoe UI", sans-serif;
      }

      #${BLOCK_CONTAINER_ID}[data-theme="dark"] {
        --bg: #0d1018;
        --surface: #151a24;
        --line: #2a3242;
        --text: #f2f5fb;
        --subtle: #a2aec6;
        --shadow: 0 18px 44px rgba(0, 0, 0, 0.34);
      }

      #${BLOCK_CONTAINER_ID} .iretard-card {
        width: min(640px, 100%);
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 32px;
        background: var(--surface);
        box-shadow: var(--shadow);
      }

      #${BLOCK_CONTAINER_ID} .iretard-title {
        margin: 0;
        font-size: clamp(34px, 6vw, 46px);
        font-weight: 640;
        letter-spacing: -0.02em;
        line-height: 1.06;
      }

      #${BLOCK_CONTAINER_ID} .iretard-subtitle {
        margin: 14px 0 22px;
        font-size: clamp(17px, 3vw, 21px);
        color: var(--subtle);
      }

      #${BLOCK_CONTAINER_ID} .iretard-meta {
        margin: 10px 0;
        font-size: 15px;
        line-height: 1.45;
      }

      #${BLOCK_CONTAINER_ID} .iretard-footer {
        margin-top: 18px;
        font-size: 14px;
        color: var(--subtle);
      }

      @media (max-width: 720px) {
        #${BLOCK_CONTAINER_ID} {
          padding: 16px;
        }

        #${BLOCK_CONTAINER_ID} .iretard-card {
          padding: 24px;
        }
      }
    `;
    document.documentElement.appendChild(style);
  }

  function ensureChallengeStyles() {
    if (document.getElementById(CHALLENGE_STYLE_ID)) {
      return;
    }

    const style = document.createElement("style");
    style.id = CHALLENGE_STYLE_ID;
    style.textContent = `
      #${CHALLENGE_CONTAINER_ID} {
        position: fixed;
        inset: 0;
        z-index: 2147483646;
        display: none;
        align-items: center;
        justify-content: center;
        padding: 20px;
        background: rgba(9, 14, 24, 0.64);
        backdrop-filter: blur(5px);
        font-family: "Avenir Next", "Manrope", "SF Pro Display", "Segoe UI", sans-serif;
      }

      #${CHALLENGE_CONTAINER_ID} .iretard-challenge-card {
        width: min(460px, 100%);
        background: #ffffff;
        border: 1px solid #d8deea;
        border-radius: 18px;
        box-shadow: 0 22px 48px rgba(15, 22, 38, 0.28);
        padding: 24px;
      }

      #${CHALLENGE_CONTAINER_ID} .iretard-challenge-title {
        margin: 0;
        font-size: clamp(25px, 6vw, 32px);
        line-height: 1.08;
        letter-spacing: -0.02em;
        color: #131a2a;
      }

      #${CHALLENGE_CONTAINER_ID} .iretard-challenge-subtitle {
        margin: 10px 0 0;
        color: #51607e;
        font-size: 15px;
        line-height: 1.45;
      }

      #${CHALLENGE_CONTAINER_ID} .iretard-challenge-expression {
        margin: 16px 0 12px;
        font-size: clamp(26px, 7vw, 34px);
        font-weight: 700;
        letter-spacing: -0.02em;
        color: #0f1628;
      }

      #${CHALLENGE_CONTAINER_ID} .iretard-challenge-row {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 8px;
      }

      #${CHALLENGE_CONTAINER_ID} input {
        width: 100%;
        border: 1px solid #ced6e8;
        border-radius: 12px;
        padding: 11px 12px;
        font-size: 16px;
        font-weight: 600;
        color: #101727;
        background: #f7f9ff;
      }

      #${CHALLENGE_CONTAINER_ID} button {
        border: none;
        border-radius: 12px;
        padding: 0 14px;
        background: #2e446b;
        color: #ffffff;
        font-size: 14px;
        font-weight: 650;
        cursor: pointer;
      }

      #${CHALLENGE_CONTAINER_ID} .iretard-challenge-feedback {
        min-height: 18px;
        margin: 10px 0 0;
        font-size: 13px;
        color: #7d2d39;
      }
    `;

    document.documentElement.appendChild(style);
  }

  function ensureChallengeRoot() {
    let root = document.getElementById(CHALLENGE_CONTAINER_ID);
    if (root) {
      return root;
    }

    ensureChallengeStyles();
    root = document.createElement("div");
    root.id = CHALLENGE_CONTAINER_ID;
    root.innerHTML = `
      <div class="iretard-challenge-card" role="dialog" aria-modal="true" aria-label="Focus challenge">
        <h2 class="iretard-challenge-title">Break the scroll loop.</h2>
        <p class="iretard-challenge-subtitle">Still doomscrolling? Solve this fast to unlock the next stretch.</p>
        <p class="iretard-challenge-expression" data-el="expression"></p>
        <form data-el="form" autocomplete="off">
          <div class="iretard-challenge-row">
            <input data-el="answer" type="number" inputmode="numeric" placeholder="Enter answer" required>
            <button type="submit">Continue</button>
          </div>
        </form>
        <p class="iretard-challenge-feedback" data-el="feedback"></p>
      </div>
    `;

    document.documentElement.appendChild(root);
    return root;
  }

  function buildChallengeExpression() {
    const operators = ["+", "-", "*"];
    const op = operators[Math.floor(Math.random() * operators.length)];
    const left = 4 + Math.floor(Math.random() * 14);
    const rightBase = 2 + Math.floor(Math.random() * 10);

    if (op === "-") {
      const right = Math.min(left - 1, rightBase);
      return {
        text: `${left} - ${right}`,
        answer: left - right
      };
    }

    if (op === "*") {
      const right = 2 + Math.floor(Math.random() * 8);
      return {
        text: `${left} * ${right}`,
        answer: left * right
      };
    }

    return {
      text: `${left} + ${rightBase}`,
      answer: left + rightBase
    };
  }

  function hideChallengeModal() {
    const root = document.getElementById(CHALLENGE_CONTAINER_ID);
    if (root) {
      root.style.display = "none";
    }

    challengeVisible = false;
    challengeAnswer = null;
    challengeActiveMs = 0;
  }

  function showChallengeModal() {
    const root = ensureChallengeRoot();
    const expression = buildChallengeExpression();
    const form = root.querySelector('[data-el="form"]');
    const answerInput = root.querySelector('[data-el="answer"]');
    const expressionEl = root.querySelector('[data-el="expression"]');
    const feedbackEl = root.querySelector('[data-el="feedback"]');

    challengeVisible = true;
    challengeAnswer = expression.answer;
    expressionEl.textContent = expression.text;
    feedbackEl.textContent = "";
    answerInput.value = "";

    if (!form.__iretardBound) {
      form.__iretardBound = true;
      form.addEventListener("submit", (event) => {
        event.preventDefault();

        const userValue = Number(answerInput.value);
        if (!Number.isFinite(userValue)) {
          feedbackEl.textContent = "Enter a number to continue.";
          return;
        }

        if (userValue !== challengeAnswer) {
          feedbackEl.textContent = "Wrong. Focus up and solve it correctly.";
          return;
        }

        hideChallengeModal();
      });
    }

    root.style.display = "flex";
    answerInput.focus();
  }

  function tickChallengeGate() {
    if (challengeVisible || currentReason) {
      return;
    }

    if (document.visibilityState !== "visible" || !document.hasFocus()) {
      return;
    }

    challengeActiveMs += 1000;
    if (challengeActiveMs >= globalThis.IretardStorage.CHALLENGE_INTERVAL_MS) {
      showChallengeModal();
    }
  }

  function startChallengeTicker() {
    if (challengeTickTimer) {
      return;
    }

    challengeTickTimer = setInterval(() => {
      tickChallengeGate();
    }, 1000);
  }

  function ensureBlockRoot() {
    let root = document.getElementById(BLOCK_CONTAINER_ID);
    if (root) {
      return root;
    }

    ensureBlockStyles();

    root = document.createElement("div");
    root.id = BLOCK_CONTAINER_ID;
    root.innerHTML = `
      <div class="iretard-card">
        <h1 class="iretard-title" data-el="title"></h1>
        <p class="iretard-subtitle" data-el="subtitle"></p>
        <p class="iretard-meta" data-el="reason"></p>
        <p class="iretard-meta" data-el="used"></p>
        <p class="iretard-footer" data-el="reset"></p>
      </div>
    `;

    document.documentElement.appendChild(root);
    return root;
  }

  function getBlockText(reason, state) {
    const safeState = globalThis.IretardStorage.normalizeState(state || lastKnownState);

    if (reason === "limit") {
      return {
        title: "Not this time.",
        subtitle: "You didn't come here with a purpose.",
        reasonLine: "Daily limit reached. Instagram is locked for today.",
        usedLine: `Time used today: ${formatMinutes(safeState.usedToday)}`,
        resetLine: `Access resets tomorrow (${getTomorrowLabel()}).`
      };
    }

    return {
      title: "Not this time.",
      subtitle: "You didn't come here with a purpose.",
      reasonLine: "Reels are redirected to direct messages. Home feed posts are blocked at network level.",
      usedLine: `Time used today: ${formatMinutes(safeState.usedToday)}`,
      resetLine: `Use stories, direct messages, profile, search, and notifications.`
    };
  }

  async function showBlockOverlay(reason, state) {
    applyingBlockUi = true;
    if (challengeVisible) {
      hideChallengeModal();
    }

    const root = ensureBlockRoot();
    const resolvedTheme = await getResolvedTheme();
    const text = getBlockText(reason, state);

    root.setAttribute("data-theme", resolvedTheme);
    root.style.display = "flex";

    root.querySelector('[data-el="title"]').textContent = text.title;
    root.querySelector('[data-el="subtitle"]').textContent = text.subtitle;
    root.querySelector('[data-el="reason"]').textContent = text.reasonLine;
    root.querySelector('[data-el="used"]').textContent = text.usedLine;
    root.querySelector('[data-el="reset"]').textContent = text.resetLine;

    ensurePreBlockStyle();
    document.documentElement.classList.add(HARD_BLOCK_CLASS);
    currentReason = reason;
    applyingBlockUi = false;
  }

  function hideBlockOverlay() {
    applyingBlockUi = true;
    const root = document.getElementById(BLOCK_CONTAINER_ID);
    if (root) {
      root.style.display = "none";
    }

    const preStyle = document.getElementById(PREBLOCK_STYLE_ID);
    if (preStyle) {
      preStyle.remove();
    }

    document.documentElement.classList.remove(HARD_BLOCK_CLASS);
    currentReason = null;
    applyingBlockUi = false;
  }

  function clearUnblockTimer() {
    if (unblockTimer) {
      clearTimeout(unblockTimer);
      unblockTimer = null;
    }
  }

  function scheduleNextCheck(state, reason, now) {
    clearUnblockTimer();

    if (reason === "route") {
      return;
    }

    let waitMs = 500;

    if (reason === "limit" && !globalThis.IretardStorage.isEmergencyActive(state, now)) {
      waitMs = getMsUntilNextMidnight(now) + 500;
    } else if (globalThis.IretardStorage.isEmergencyActive(state, now)) {
      waitMs = Math.max(250, state.emergencyActiveUntil - now + 200);
    } else {
      const remainingMs = Math.max(0, globalThis.IretardStorage.getDailyLimitMs(state) - state.usedToday);
      waitMs = Math.max(250, remainingMs + 200);
    }

    unblockTimer = setTimeout(() => {
      void evaluateAndRender("timer");
    }, Math.min(waitMs, 2147483647));
  }

  function routeRequiresHardBlock() {
    return isStrictBlockedUrl(location.href) && !isEmergencyOverride();
  }

  function redirectRouteIfNeeded(source = "route") {
    const redirectTarget = getRedirectUrlForInput(location.href);
    if (!redirectTarget) {
      return false;
    }

    return redirectToDirectInbox(source);
  }

  function hardRouteGuard() {
    if (redirectRouteIfNeeded("hard_route_guard")) {
      return true;
    }

    if (!routeRequiresHardBlock()) {
      if (currentReason === "route") {
        hideBlockOverlay();
      }
      return false;
    }

    void showBlockOverlay("route", lastKnownState);
    return true;
  }

  async function evaluateAndRender(source) {
    if (redirectRouteIfNeeded(source)) {
      return;
    }

    if (isStrictBlockedUrl(location.href) && !isEmergencyOverride()) {
      void showBlockOverlay("route", lastKnownState);
    }

    const routeBlockedNow = hardRouteGuard();

    try {
      const response = await sendMessage("SYNC_USAGE_AND_EVALUATE", {
        url: location.href,
        source
      });

      if (!response || !response.ok || !response.state) {
        return;
      }

      lastKnownState = globalThis.IretardStorage.normalizeState(response.state);

      if (isEmergencyOverride(lastKnownState, response.now)) {
        hideBlockOverlay();
        scheduleNextCheck(response.state, null, response.now);
        return;
      }

      if (response.reason === "limit") {
        await showBlockOverlay("limit", response.state);
        scheduleNextCheck(response.state, response.reason, response.now);
        return;
      }

      if (routeBlockedNow || response.reason === "route") {
        await showBlockOverlay("route", response.state);
        scheduleNextCheck(response.state, "route", response.now);
        return;
      }

      hideBlockOverlay();
      scheduleNextCheck(response.state, response.reason, response.now);
    } catch (_error) {
      if (routeBlockedNow) {
        void showBlockOverlay("route", lastKnownState);
      }
    }
  }

  function scheduleMutationGuard() {
    if (mutationQueued) {
      return;
    }

    mutationQueued = true;
    queueMicrotask(() => {
      mutationQueued = false;

      if (redirectRouteIfNeeded("mutation")) {
        return;
      }

      if (applyingBlockUi || !routeRequiresHardBlock()) {
        return;
      }

      void showBlockOverlay("route", lastKnownState);
    });
  }

  function startMutationObserver() {
    if (observer) {
      return;
    }

    observer = new MutationObserver(() => {
      scheduleMutationGuard();
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  function patchHistoryForSpaNavigation() {
    if (history.__iretardPatched) {
      return;
    }

    history.__iretardPatched = true;
    const fireUrlEvent = () => {
      window.dispatchEvent(new Event("iretard:urlchange"));
    };

    const originalPushState = history.pushState;
    history.pushState = function patchedPushState(...args) {
      const result = originalPushState.apply(this, args);
      fireUrlEvent();
      return result;
    };

    const originalReplaceState = history.replaceState;
    history.replaceState = function patchedReplaceState(...args) {
      const result = originalReplaceState.apply(this, args);
      fireUrlEvent();
      return result;
    };

    window.addEventListener("popstate", fireUrlEvent, { passive: true });
    window.addEventListener("hashchange", fireUrlEvent, { passive: true });
    window.addEventListener("pageshow", fireUrlEvent, { passive: true });
    window.addEventListener("iretard:urlchange", () => {
      if (redirectRouteIfNeeded("urlchange")) {
        return;
      }

      if (isStrictBlockedUrl(location.href) && !isEmergencyOverride()) {
        void showBlockOverlay("route", lastKnownState);
      }
      void evaluateAndRender("urlchange");
    });
  }

  async function notifyPageActivity() {
    const isActive = document.visibilityState === "visible" && document.hasFocus();
    await sendMessage(isActive ? "PAGE_ACTIVE" : "PAGE_INACTIVE", { url: location.href });
  }

  function attachActivityListeners() {
    document.addEventListener("visibilitychange", () => {
      void notifyPageActivity();
      void evaluateAndRender("visibility");
    });

    window.addEventListener("focus", () => {
      void notifyPageActivity();
      void evaluateAndRender("focus");
    }, { passive: true });

    window.addEventListener("blur", () => {
      void notifyPageActivity();
    }, { passive: true });

    window.addEventListener("beforeunload", () => {
      void sendMessage("PAGE_INACTIVE", { url: location.href });
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "STATE_UPDATED") {
      return;
    }

    if (message.state) {
      lastKnownState = globalThis.IretardStorage.normalizeState(message.state);
    }

    void evaluateAndRender("state_update");
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[globalThis.IretardStorage.THEME_STORAGE_KEY]) {
      return;
    }

    if (currentReason) {
      void evaluateAndRender("theme_change");
    }
  });

  patchHistoryForSpaNavigation();
  installNetworkInterceptors();
  attachActivityListeners();
  startMutationObserver();
  startChallengeTicker();

  void globalThis.IretardStorage.getState(Date.now()).then((state) => {
    lastKnownState = globalThis.IretardStorage.normalizeState(state);
    if (isEmergencyOverride(lastKnownState)) {
      clearPreBlockOnly();
    }

    redirectRouteIfNeeded("boot");
    hardRouteGuard();
    void notifyPageActivity();
    void evaluateAndRender("boot");
  }).catch(() => {
    redirectRouteIfNeeded("boot_error");
    hardRouteGuard();
    void notifyPageActivity();
    void evaluateAndRender("boot");
  });
})();
