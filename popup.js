(() => {
  const rootElement = document.documentElement;
  const dailyLimitInput = document.getElementById("dailyLimit");
  const limitForm = document.getElementById("limitForm");
  const saveBtn = document.getElementById("saveBtn");
  const limitLockNoticeEl = document.getElementById("limitLockNotice");
  const usageProgressEl = document.getElementById("usageProgress");
  const usedTodayEl = document.getElementById("usedToday");
  const remainingEl = document.getElementById("remaining");
  const emergencyLeftEl = document.getElementById("emergencyLeft");
  const statusEl = document.getElementById("status");
  const emergencyBtn = document.getElementById("emergencyBtn");
  const feedbackEl = document.getElementById("feedback");
  const themeToggle = document.getElementById("themeToggle");

  const systemThemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let currentThemePreference = globalThis.IretardStorage.THEME_PREFERENCES.AUTO;

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

  function setFeedback(text, isError = false) {
    feedbackEl.textContent = text;
    feedbackEl.classList.toggle("error", isError);
  }

  async function renderFromLocalState(feedbackMessage = "") {
    const now = Date.now();
    const state = await globalThis.IretardStorage.getState(now);
    const metrics = globalThis.IretardStorage.buildMetrics(state, now);
    renderState(state, metrics);

    if (feedbackMessage) {
      setFeedback(feedbackMessage, true);
    }
  }

  function normalizeStatePayload(state, metrics) {
    const safeState = globalThis.IretardStorage.normalizeState(state);
    const safeMetrics = metrics && typeof metrics === "object"
      ? {
        ...globalThis.IretardStorage.buildMetrics(safeState),
        ...metrics
      }
      : globalThis.IretardStorage.buildMetrics(safeState);

    return {
      state: safeState,
      metrics: safeMetrics
    };
  }

  function applyResolvedTheme(preference) {
    const resolved = globalThis.IretardStorage.resolveTheme(preference, systemThemeQuery.matches);
    rootElement.setAttribute("data-theme", resolved);

    if (themeToggle) {
      themeToggle.setAttribute("aria-pressed", String(resolved === "dark"));
      themeToggle.dataset.mode = resolved;
      themeToggle.title = resolved === "dark" ? "Switch to light" : "Switch to dark";
    }
  }

  async function loadThemePreference() {
    try {
      currentThemePreference = await globalThis.IretardStorage.getThemePreference();
    } catch (_error) {
      currentThemePreference = globalThis.IretardStorage.THEME_PREFERENCES.AUTO;
    }

    applyResolvedTheme(currentThemePreference);
  }

  async function persistThemePreference(nextPreference) {
    try {
      currentThemePreference = await globalThis.IretardStorage.setThemePreference(nextPreference);
      applyResolvedTheme(currentThemePreference);
      setFeedback("Theme updated.");
    } catch (_error) {
      setFeedback("Failed to update theme.", true);
    }
  }

  function updateUsageProgress(state, metrics) {
    const limitMs = Math.max(1, metrics.dailyLimitMs || globalThis.IretardStorage.getDailyLimitMs(state));
    const ratio = Math.max(0, Math.min(1, state.usedToday / limitMs));
    usageProgressEl.style.width = `${Math.round(ratio * 100)}%`;
  }

  function isLimitLockedToday(state) {
    return state.limitLockedDate === globalThis.IretardStorage.getDayStamp(Date.now());
  }

  function renderLimitLockState(state) {
    const locked = isLimitLockedToday(state);
    dailyLimitInput.disabled = locked;
    saveBtn.disabled = locked;
    limitLockNoticeEl.hidden = !locked;
  }

  function renderState(stateInput, metricsInput) {
    const { state, metrics } = normalizeStatePayload(stateInput, metricsInput);

    dailyLimitInput.value = String(state.dailyLimit);
    renderLimitLockState(state);
    usedTodayEl.textContent = formatMinutes(state.usedToday);
    remainingEl.textContent = formatMinutes(metrics.remainingMs);
    emergencyLeftEl.textContent = String(metrics.emergencyUsesLeft);
    updateUsageProgress(state, metrics);

    if (metrics.emergencyActive) {
      statusEl.textContent = `Emergency active (${formatMinutes(metrics.emergencyRemainingMs)} left)`;
      emergencyBtn.disabled = true;
      return;
    }

    const limitExceeded = globalThis.IretardBlocker.isLimitExceeded(state);
    statusEl.textContent = limitExceeded ? "Blocked for today" : "Normal";
    emergencyBtn.disabled = metrics.emergencyUsesLeft < 1;
  }

  async function refreshState() {
    try {
      const response = await sendMessage("GET_STATE", {
        url: "https://www.instagram.com/"
      });

      if (!response || !response.ok || !response.state) {
        await renderFromLocalState(
          response && response.error
            ? `State sync fallback: ${response.error}`
            : "Background unavailable. Loaded local state."
        );
        return;
      }

      renderState(response.state, response.metrics);
    } catch (_error) {
      try {
        await renderFromLocalState("Background unavailable. Loaded local state.");
      } catch (_storageError) {
        setFeedback("Could not load extension state.", true);
      }
    }
  }

  limitForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    setFeedback("");

    const nextLimit = Number(dailyLimitInput.value);
    if (dailyLimitInput.disabled) {
      setFeedback("Locked for today", true);
      return;
    }

    if (!Number.isFinite(nextLimit) || nextLimit < 1 || nextLimit > 1440) {
      setFeedback("Enter a value between 1 and 1440.", true);
      return;
    }

    try {
      const response = await sendMessage("SET_DAILY_LIMIT", { dailyLimit: nextLimit });

      if (!response || !response.ok || !response.state) {
        setFeedback(
          response && response.error
            ? response.error
            : "Background unavailable. Could not save daily limit.",
          true
        );
        return;
      }

      renderState(response.state, response.metrics);
      setFeedback("Daily limit updated.");
    } catch (_error) {
      setFeedback("Failed to save daily limit.", true);
    }
  });

  emergencyBtn.addEventListener("click", async () => {
    setFeedback("");

    try {
      const response = await sendMessage("ACTIVATE_EMERGENCY");
      if (!response || !response.ok || !response.state) {
        setFeedback(
          response && response.error
            ? response.error
            : "Background unavailable. Emergency unlock failed.",
          true
        );
        return;
      }

      renderState(response.state, response.metrics);
      setFeedback(response.alreadyActive ? "Emergency already active." : "Emergency unlocked for 5 minutes.");
    } catch (_error) {
      setFeedback("Emergency unlock failed.", true);
    }
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", async () => {
      const resolved = rootElement.getAttribute("data-theme") || "light";
      const nextPreference = resolved === "dark"
        ? globalThis.IretardStorage.THEME_PREFERENCES.LIGHT
        : globalThis.IretardStorage.THEME_PREFERENCES.DARK;
      await persistThemePreference(nextPreference);
    });
  }

  if (typeof systemThemeQuery.addEventListener === "function") {
    systemThemeQuery.addEventListener("change", () => {
      if (currentThemePreference === globalThis.IretardStorage.THEME_PREFERENCES.AUTO) {
        applyResolvedTheme(currentThemePreference);
      }
    });
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "STATE_UPDATED") {
      return;
    }

    if (message.state) {
      renderState(message.state, message.metrics);
    }
  });

  void loadThemePreference();
  void refreshState();
})();
