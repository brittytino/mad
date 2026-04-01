(() => {
  const BLOCK_CONTAINER_ID = "iretard-block-root";
  const BLOCK_TITLE_ID = "iretard-title";
  const BLOCK_SUBTITLE_ID = "iretard-subtitle";
  const BLOCK_REASON_ID = "iretard-reason";
  const BLOCK_USED_ID = "iretard-used";
  const BLOCK_RESET_ID = "iretard-reset";
  let unblockTimer = null;
  let isShowingBlockScreen = false;

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

  async function getResolvedTheme() {
    try {
      const preference = await globalThis.IretardStorage.getThemePreference();
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      return globalThis.IretardStorage.resolveTheme(preference, prefersDark);
    } catch (_error) {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
  }

  function getMsUntilNextMidnight(now = Date.now()) {
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    return Math.max(1000, nextMidnight.getTime() - now);
  }

  function clearUnblockTimer() {
    if (unblockTimer) {
      clearTimeout(unblockTimer);
      unblockTimer = null;
    }
  }

  function buildBlockMarkup() {
    return `
      <style>
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          font-family: "Inter", system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }

        #${BLOCK_CONTAINER_ID} {
          --bg: #ffffff;
          --surface: #ffffff;
          --line: #e3e6ef;
          --text: #11131a;
          --subtle: #5f677a;
          --shadow: 0 12px 28px rgba(15, 20, 34, 0.08);
          min-height: 100vh;
          background: var(--bg);
          color: var(--text);
          display: grid;
          place-items: center;
          padding: 24px 16px;
          box-sizing: border-box;
        }

        #${BLOCK_CONTAINER_ID}[data-theme="dark"] {
          --bg: #0b0b0c;
          --surface: #121215;
          --line: #252a35;
          --text: #f3f5f9;
          --subtle: #9aa3ba;
          --shadow: 0 14px 32px rgba(0, 0, 0, 0.32);
        }

        .iretard-card {
          width: min(560px, 100%);
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 24px;
          background: var(--surface);
          box-shadow: var(--shadow);
        }

        .iretard-title {
          margin: 0;
          font-size: clamp(30px, 5.5vw, 40px);
          font-weight: 600;
          letter-spacing: -0.02em;
          line-height: 1.1;
        }

        .iretard-subtitle {
          margin: 12px 0 18px;
          font-size: clamp(16px, 2.8vw, 20px);
          font-weight: 400;
          color: var(--subtle);
        }

        .iretard-meta {
          margin: 8px 0;
          font-size: 14px;
          color: var(--text);
        }

        .iretard-footer {
          margin-top: 16px;
          font-size: 14px;
          color: var(--subtle);
        }
      </style>
      <div id="${BLOCK_CONTAINER_ID}">
        <div class="iretard-card">
          <h1 id="${BLOCK_TITLE_ID}" class="iretard-title"></h1>
          <p id="${BLOCK_SUBTITLE_ID}" class="iretard-subtitle"></p>
          <p id="${BLOCK_REASON_ID}" class="iretard-meta"></p>
          <p id="${BLOCK_USED_ID}" class="iretard-meta"></p>
          <p id="${BLOCK_RESET_ID}" class="iretard-footer"></p>
        </div>
      </div>
    `;
  }

  function ensureBlockScreenShell() {
    if (document.getElementById(BLOCK_CONTAINER_ID)) {
      return;
    }

    document.documentElement.innerHTML = `<head><title>Instagram blocked - iRetard</title></head><body>${buildBlockMarkup()}</body>`;
  }

  function renderBlockScreen(mode, state, resolvedTheme) {
    ensureBlockScreenShell();

    const root = document.getElementById(BLOCK_CONTAINER_ID);
    const title = document.getElementById(BLOCK_TITLE_ID);
    const subtitle = document.getElementById(BLOCK_SUBTITLE_ID);
    const reasonLine = document.getElementById(BLOCK_REASON_ID);
    const usedLine = document.getElementById(BLOCK_USED_ID);
    const resetLine = document.getElementById(BLOCK_RESET_ID);

    if (!root || !title || !subtitle || !reasonLine || !usedLine || !resetLine) {
      return;
    }

    root.setAttribute("data-theme", resolvedTheme);
    title.textContent = "Not this time.";
    subtitle.textContent = "You didn't come here with a purpose.";
    reasonLine.textContent = mode === "limit"
      ? "Daily limit reached. Instagram is locked for today."
      : "Reels and Explore are blocked by design.";
    usedLine.textContent = `Time used today: ${formatMinutes(state.usedToday)}`;
    resetLine.textContent = `Access resets tomorrow (${getTomorrowLabel()}).`;

    isShowingBlockScreen = true;
  }

  function clearBlockScreenIfNeeded() {
    if (!isShowingBlockScreen) {
      return;
    }

    // A reload is needed to restore the original Instagram DOM once emergency unlock is activated.
    location.reload();
  }

  function scheduleNextCheck(state, reason, now) {
    clearUnblockTimer();

    if (reason === "route") {
      return;
    }

    let waitMs = null;

    if (reason === "limit" && !globalThis.IretardStorage.isEmergencyActive(state, now)) {
      waitMs = getMsUntilNextMidnight(now) + 500;
    } else if (globalThis.IretardStorage.isEmergencyActive(state, now)) {
      waitMs = Math.max(200, state.emergencyActiveUntil - now + 200);
    } else {
      const remainingMs = Math.max(0, globalThis.IretardStorage.getDailyLimitMs(state) - state.usedToday);
      waitMs = Math.max(200, remainingMs + 200);
    }

    unblockTimer = setTimeout(() => {
      void evaluateAndRender("timer");
    }, Math.min(waitMs, 2147483647));
  }

  async function evaluateAndRender(source) {
    try {
      const response = await sendMessage("SYNC_USAGE_AND_EVALUATE", {
        url: location.href,
        source
      });

      if (!response || !response.ok || !response.state) {
        return;
      }

      if (response.reason === "route" || response.reason === "limit") {
        const resolvedTheme = await getResolvedTheme();
        renderBlockScreen(response.reason, response.state, resolvedTheme);
        scheduleNextCheck(response.state, response.reason, response.now);
        return;
      }

      clearBlockScreenIfNeeded();
      scheduleNextCheck(response.state, response.reason, response.now);
    } catch (_error) {
      // Ignore to avoid breaking Instagram when extension messaging is transiently unavailable.
    }
  }

  function patchHistoryForSpaNavigation() {
    if (history.__iretardPatched) {
      return;
    }

    history.__iretardPatched = true;
    const fireUrlEvent = () => window.dispatchEvent(new Event("iretard:urlchange"));

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
    window.addEventListener("iretard:urlchange", () => {
      void evaluateAndRender("urlchange");
    });
  }

  async function notifyPageActivity() {
    const isActive = document.visibilityState === "visible" && document.hasFocus();
    try {
      await sendMessage(isActive ? "PAGE_ACTIVE" : "PAGE_INACTIVE", { url: location.href });
    } catch (_error) {
      // Ignore to keep page stable when service worker is restarting.
    }
  }

  function attachActivityListeners() {
    document.addEventListener("visibilitychange", () => {
      void notifyPageActivity();
    });

    window.addEventListener("focus", () => {
      void notifyPageActivity();
    }, { passive: true });

    window.addEventListener("blur", () => {
      void notifyPageActivity();
    }, { passive: true });

    window.addEventListener("beforeunload", () => {
      void sendMessage("PAGE_INACTIVE", { url: location.href });
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || (message.type !== "STATE_UPDATED" && message.type !== "THEME_UPDATED")) {
      return;
    }

    void evaluateAndRender("state_update");
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local" || !changes[globalThis.IretardStorage.THEME_STORAGE_KEY]) {
      return;
    }

    if (isShowingBlockScreen) {
      void evaluateAndRender("theme_change");
    }
  });

  patchHistoryForSpaNavigation();
  attachActivityListeners();
  void notifyPageActivity();
  void evaluateAndRender("boot");
})();
