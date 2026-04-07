(() => {
  const dailyCapEl = document.getElementById("dailyCap");
  const usageProgressEl = document.getElementById("usageProgress");
  const usedTodayEl = document.getElementById("usedToday");
  const remainingEl = document.getElementById("remaining");
  const statusEl = document.getElementById("status");
  const feedbackEl = document.getElementById("feedback");
  let refreshTimer = null;
  let countdownTimer = null;
  let latestSnapshot = null;

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

  function formatClock(ms) {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
    }

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function setFeedback(text, isError = false) {
    feedbackEl.textContent = text;
    feedbackEl.classList.toggle("error", isError);
  }

  function updateUsageProgress(usedTodayMs, limitMs) {
    const safeLimit = Math.max(1, Number(limitMs) || 1);
    const ratio = Math.max(0, Math.min(1, usedTodayMs / safeLimit));
    usageProgressEl.style.width = `${Math.round(ratio * 100)}%`;
  }

  function computeLiveMetrics(snapshot) {
    const state = globalThis.IretardStorage.normalizeState(snapshot.state || {});
    const baseMetrics = snapshot.metrics && typeof snapshot.metrics === "object"
      ? {
        ...globalThis.IretardStorage.buildMetrics(state),
        ...snapshot.metrics
      }
      : globalThis.IretardStorage.buildMetrics(state);

    const limitMs = Math.max(1, Number(baseMetrics.dailyLimitMs) || globalThis.IretardStorage.getDailyLimitMs(state));
    const snapshotTime = Math.max(0, Number(snapshot.now) || Date.now());
    const trackingActive = Boolean(snapshot.tracking && snapshot.tracking.active);
    const extraElapsed = trackingActive ? Math.max(0, Date.now() - snapshotTime) : 0;
    const usedToday = Math.min(limitMs, Math.max(0, state.usedToday + extraElapsed));
    const remainingMs = Math.max(0, limitMs - usedToday);

    return {
      state: {
        ...state,
        usedToday
      },
      metrics: {
        ...baseMetrics,
        dailyLimitMs: limitMs,
        remainingMs
      },
      trackingActive
    };
  }

  function renderSnapshot(snapshot) {
    const live = computeLiveMetrics(snapshot);
    const state = live.state;
    const metrics = live.metrics;

    dailyCapEl.textContent = formatClock(metrics.dailyLimitMs);
    usedTodayEl.textContent = formatClock(state.usedToday);
    remainingEl.textContent = formatClock(metrics.remainingMs);
    updateUsageProgress(state.usedToday, metrics.dailyLimitMs);

    if (metrics.remainingMs <= 0) {
      statusEl.textContent = "Locked until tomorrow";
      return;
    }

    statusEl.textContent = live.trackingActive ? "Watching now" : "Policy enforced";
  }

  function updateSnapshot(stateInput, metricsInput, nowInput, trackingInput) {
    latestSnapshot = {
      state: globalThis.IretardStorage.normalizeState(stateInput),
      metrics: metricsInput && typeof metricsInput === "object"
        ? metricsInput
        : null,
      now: Number(nowInput) || Date.now(),
      tracking: trackingInput && typeof trackingInput === "object"
        ? trackingInput
        : { active: false }
    };

    renderSnapshot(latestSnapshot);
  }

  function renderState(stateInput, metricsInput) {
    const state = globalThis.IretardStorage.normalizeState(stateInput);
    const metrics = metricsInput && typeof metricsInput === "object" ? metricsInput : globalThis.IretardStorage.buildMetrics(state);
    updateSnapshot(state, metrics, Date.now(), { active: false });
  }

  async function refreshState() {
    try {
      const response = await sendMessage("GET_STATE", {
        url: "https://www.instagram.com/"
      });

      if (!response || !response.ok || !response.state) {
        const now = Date.now();
        const fallbackState = await globalThis.IretardStorage.getState(now);
        renderState(fallbackState, globalThis.IretardStorage.buildMetrics(fallbackState, now));
        setFeedback(response && response.error ? response.error : "Background unavailable. Loaded local state.", true);
        return;
      }

      updateSnapshot(response.state, response.metrics, response.now, response.tracking);
      setFeedback("");
    } catch (_error) {
      try {
        const now = Date.now();
        const fallbackState = await globalThis.IretardStorage.getState(now);
        renderState(fallbackState, globalThis.IretardStorage.buildMetrics(fallbackState, now));
        setFeedback("Background unavailable. Loaded local state.", true);
      } catch (_storageError) {
        setFeedback("Could not load extension state.", true);
      }
    }
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (!message || message.type !== "STATE_UPDATED") {
      return;
    }

    if (message.state) {
      updateSnapshot(message.state, message.metrics, message.now, message.tracking);
    }
  });

  void refreshState();

  refreshTimer = setInterval(() => {
    void refreshState();
  }, 5000);

  countdownTimer = setInterval(() => {
    if (latestSnapshot) {
      renderSnapshot(latestSnapshot);
    }
  }, 1000);

  window.addEventListener("unload", () => {
    if (refreshTimer) {
      clearInterval(refreshTimer);
      refreshTimer = null;
    }

    if (countdownTimer) {
      clearInterval(countdownTimer);
      countdownTimer = null;
    }
  });
})();
