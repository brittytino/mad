importScripts("storage.js", "blocker.js");

const BASE_ALLOW_RULES = [
  {
    id: 1001,
    priority: 5,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/(www|i)\\.instagram\\.com\\/api\\/v1\\/direct_v2\\/",
      resourceTypes: ["xmlhttprequest"]
    }
  },
  {
    id: 1002,
    priority: 5,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/(www|i)\\.instagram\\.com\\/api\\/v1\\/stories\\/",
      resourceTypes: ["xmlhttprequest"]
    }
  }
];

const BLOCK_RULES = [
  {
    id: 1101,
    priority: 4,
    action: { type: "block" },
    condition: {
      regexFilter: "^https:\\/\\/www\\.instagram\\.com\\/reels(\\/|\\?|$)",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1106,
    priority: 4,
    action: { type: "block" },
    condition: {
      regexFilter: "^https:\\/\\/www\\.instagram\\.com\\/explore(\\/|\\?|$)",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1102,
    priority: 4,
    action: { type: "block" },
    condition: {
      regexFilter: "^https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/feed\\/reels",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1103,
    priority: 4,
    action: { type: "block" },
    condition: {
      regexFilter: "^https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/discover\\/explore",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1104,
    priority: 4,
    action: { type: "block" },
    condition: {
      regexFilter: "^https:\\/\\/www\\.instagram\\.com\\/video\\/unified_cvc(\\/|\\?|$)",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1105,
    priority: 4,
    action: { type: "block" },
    condition: {
      regexFilter: "^https:\\/\\/graph\\.instagram\\.com\\/logging_client_events(\\/|\\?|$)",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  }
];

const EMERGENCY_BYPASS_RULES = [
  {
    id: 1201,
    priority: 10,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/www\\.instagram\\.com\\/reels(\\/|\\?|$)",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1202,
    priority: 10,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/www\\.instagram\\.com\\/explore(\\/|\\?|$)",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1203,
    priority: 10,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/feed\\/reels",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1204,
    priority: 10,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/i\\.instagram\\.com\\/api\\/v1\\/discover\\/explore",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1205,
    priority: 10,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/www\\.instagram\\.com\\/video\\/unified_cvc(\\/|\\?|$)",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  },
  {
    id: 1206,
    priority: 10,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/graph\\.instagram\\.com\\/logging_client_events(\\/|\\?|$)",
      resourceTypes: ["main_frame", "xmlhttprequest"]
    }
  }
];

const ALL_DNR_RULE_IDS = [
  ...BASE_ALLOW_RULES,
  ...BLOCK_RULES,
  ...EMERGENCY_BYPASS_RULES
].map((rule) => rule.id);

const tracking = {
  tabId: null,
  windowId: null,
  url: "",
  startedAt: 0
};
let trackingLock = Promise.resolve();
let networkEmergencyMode = null;

function runGuarded(task) {
  void task().catch((error) => {
    console.error("iRetard background error:", error);
  });
}

function withTrackingLock(task) {
  const next = trackingLock.then(() => task(), () => task());
  trackingLock = next.catch(() => {});
  return next;
}

function buildNetworkRules(emergencyActive) {
  return emergencyActive
    ? [...BASE_ALLOW_RULES, ...EMERGENCY_BYPASS_RULES, ...BLOCK_RULES]
    : [...BASE_ALLOW_RULES, ...BLOCK_RULES];
}

async function installNetworkRules(emergencyActive = false) {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ALL_DNR_RULE_IDS,
    addRules: buildNetworkRules(emergencyActive)
  });
}

async function ensureNetworkRulesForState(state, now = Date.now()) {
  const shouldUseEmergencyMode = globalThis.IretardStorage.isEmergencyActive(state, now);
  if (networkEmergencyMode === shouldUseEmergencyMode) {
    return;
  }

  try {
    await installNetworkRules(shouldUseEmergencyMode);
    networkEmergencyMode = shouldUseEmergencyMode;
  } catch (error) {
    console.error("iRetard network rules sync failed:", error);
  }
}

async function syncNetworkRulesToCurrentState() {
  const now = Date.now();
  const state = await globalThis.IretardStorage.getState(now);
  await ensureNetworkRulesForState(state, now);
}

function withInFlightUsage(state, now = Date.now()) {
  if (!tracking.startedAt || !tracking.url) {
    return state;
  }

  if (!globalThis.IretardBlocker.shouldTrackUsage(tracking.url, state, now)) {
    return state;
  }

  return {
    ...state,
    usedToday: state.usedToday + Math.max(0, now - tracking.startedAt)
  };
}

async function broadcastState(state) {
  const payload = {
    type: "STATE_UPDATED",
    state,
    metrics: globalThis.IretardStorage.buildMetrics(state)
  };

  try {
    await chrome.runtime.sendMessage(payload);
  } catch (_error) {
    // Ignore when no extension page is currently listening.
  }

  const tabs = await chrome.tabs.query({ url: ["https://www.instagram.com/*"] });
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id === undefined) {
        return;
      }

      try {
        await chrome.tabs.sendMessage(tab.id, payload);
      } catch (_error) {
        // Ignore when no content script is attached yet.
      }
    })
  );
}

async function flushTrackedUsage(stopTracking) {
  if (!tracking.startedAt || !tracking.url || tracking.tabId === null) {
    if (stopTracking) {
      tracking.tabId = null;
      tracking.windowId = null;
      tracking.url = "";
      tracking.startedAt = 0;
    }
    return globalThis.IretardStorage.getState();
  }

  const now = Date.now();
  const elapsed = Math.max(0, now - tracking.startedAt);
  let state = await globalThis.IretardStorage.getState(now);

  if (elapsed > 0 && globalThis.IretardBlocker.shouldTrackUsage(tracking.url, state, now)) {
    state = await globalThis.IretardStorage.updateState((current) => ({
      ...current,
      usedToday: current.usedToday + elapsed,
      lastReset: current.lastReset || now
    }), now);
  }

  if (stopTracking) {
    tracking.tabId = null;
    tracking.windowId = null;
    tracking.url = "";
    tracking.startedAt = 0;
  } else {
    tracking.startedAt = now;
  }

  return state;
}

async function startTrackingIfEligible(tab) {
  if (!tab || tab.id === undefined || !tab.url) {
    tracking.tabId = null;
    tracking.windowId = null;
    tracking.url = "";
    tracking.startedAt = 0;
    return;
  }

  const now = Date.now();
  const state = await globalThis.IretardStorage.getState(now);

  tracking.tabId = tab.id;
  tracking.windowId = tab.windowId;
  tracking.url = tab.url;
  tracking.startedAt = globalThis.IretardBlocker.shouldTrackUsage(tab.url, state, now) ? now : 0;
}

async function syncTrackingToActiveTab() {
  await withTrackingLock(async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    await flushTrackedUsage(true);
    await startTrackingIfEligible(activeTab);
  });
}

async function isForegroundActiveTab(tabId, windowId) {
  if (tabId === undefined || tabId === null) {
    return false;
  }

  const [activeTab] = await chrome.tabs.query({
    active: true,
    lastFocusedWindow: true
  });

  if (!activeTab || activeTab.id !== tabId) {
    return false;
  }

  if (windowId === undefined || windowId === null) {
    return true;
  }

  return activeTab.windowId === windowId;
}

async function evaluateUrl(url) {
  const now = Date.now();
  const persistedState = await globalThis.IretardStorage.getState(now);
  await ensureNetworkRulesForState(persistedState, now);
  const liveState = withInFlightUsage(persistedState, now);
  const reason = globalThis.IretardBlocker.getBlockReason(url, liveState, now);

  return {
    state: liveState,
    metrics: globalThis.IretardStorage.buildMetrics(liveState, now),
    reason,
    now
  };
}

async function setDailyLimit(minutes) {
  const parsed = Math.floor(Number(minutes));
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 1440) {
    throw new Error("Daily limit must be between 1 and 1440 minutes.");
  }

  const now = Date.now();
  const today = globalThis.IretardStorage.getDayStamp(now);

  const state = await withTrackingLock(async () => globalThis.IretardStorage.updateState((current) => {
    if (current.limitLockedDate === today && parsed !== current.dailyLimit) {
      throw new Error("Locked for today");
    }

    return {
      ...current,
      dailyLimit: parsed,
      limitLockedDate: today,
      lastReset: current.lastReset || now
    };
  }, now));

  await broadcastState(state);
  return state;
}

async function activateEmergency() {
  const now = Date.now();
  let state = await globalThis.IretardStorage.getState(now);

  if (globalThis.IretardStorage.isEmergencyActive(state, now)) {
    return {
      ok: true,
      alreadyActive: true,
      state,
      metrics: globalThis.IretardStorage.buildMetrics(state, now)
    };
  }

  if (state.emergencyCount >= globalThis.IretardStorage.EMERGENCY_LIMIT_PER_DAY) {
    return {
      ok: false,
      error: "No emergency unlocks left today.",
      state,
      metrics: globalThis.IretardStorage.buildMetrics(state, now)
    };
  }

  state = await withTrackingLock(async () => globalThis.IretardStorage.updateState((current) => ({
    ...current,
    emergencyCount: current.emergencyCount + 1,
    emergencyActiveUntil: now + globalThis.IretardStorage.EMERGENCY_DURATION_MS,
    lastReset: current.lastReset || now
  }), now));

  await ensureNetworkRulesForState(state, now);

  await broadcastState(state);
  return {
    ok: true,
    alreadyActive: false,
    state,
    metrics: globalThis.IretardStorage.buildMetrics(state, now)
  };
}

chrome.runtime.onInstalled.addListener(() => {
  runGuarded(async () => {
    await syncNetworkRulesToCurrentState();
    await syncTrackingToActiveTab();
  });
});

chrome.runtime.onStartup.addListener(() => {
  runGuarded(async () => {
    await syncNetworkRulesToCurrentState();
    await syncTrackingToActiveTab();
  });
});

chrome.tabs.onActivated.addListener((activeInfo) => {
  runGuarded(async () => {
    await withTrackingLock(async () => {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      await flushTrackedUsage(true);
      await startTrackingIfEligible(tab);
    });
  });
});

chrome.windows.onFocusChanged.addListener((windowId) => {
  runGuarded(async () => {
    await withTrackingLock(async () => {
      if (windowId === chrome.windows.WINDOW_ID_NONE) {
        await flushTrackedUsage(true);
        return;
      }

      const [activeTab] = await chrome.tabs.query({ active: true, windowId });
      await flushTrackedUsage(true);
      await startTrackingIfEligible(activeTab);
    });
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  runGuarded(async () => {
    await withTrackingLock(async () => {
      if (tracking.tabId !== tabId) {
        return;
      }

      if (changeInfo.url) {
        await flushTrackedUsage(true);
        await startTrackingIfEligible(tab);
      }
    });
  });
});

chrome.tabs.onRemoved.addListener((tabId) => {
  runGuarded(async () => {
    await withTrackingLock(async () => {
      if (tracking.tabId === tabId) {
        await flushTrackedUsage(true);
      }
    });
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (!message || !message.type) {
      sendResponse({ ok: false, error: "Invalid message." });
      return;
    }

    if (message.type === "GET_STATE") {
      const url = message.url || tracking.url || "https://www.instagram.com/";
      const evaluated = await evaluateUrl(url);
      sendResponse({ ok: true, ...evaluated });
      return;
    }

    if (message.type === "EVALUATE_URL") {
      const evaluated = await evaluateUrl(message.url);
      sendResponse({ ok: true, ...evaluated });
      return;
    }

    if (message.type === "SET_DAILY_LIMIT") {
      const state = await setDailyLimit(message.dailyLimit);
      const now = Date.now();
      sendResponse({
        ok: true,
        state,
        metrics: globalThis.IretardStorage.buildMetrics(state, now)
      });
      return;
    }

    if (message.type === "ACTIVATE_EMERGENCY") {
      const result = await activateEmergency();
      sendResponse(result);
      return;
    }

    if (message.type === "PAGE_ACTIVE") {
      let ignored = false;
      await withTrackingLock(async () => {
        if (sender.tab && sender.tab.id !== undefined) {
          const isForeground = await isForegroundActiveTab(sender.tab.id, sender.tab.windowId);
          if (!isForeground) {
            ignored = true;
            return;
          }

          if (tracking.tabId !== sender.tab.id) {
            await flushTrackedUsage(true);
          }

          await startTrackingIfEligible({
            ...sender.tab,
            url: message.url || sender.tab.url
          });
        }
      });

      sendResponse({ ok: true, ignored });
      return;
    }

    if (message.type === "PAGE_INACTIVE") {
      await withTrackingLock(async () => {
        if (sender.tab && sender.tab.id !== undefined && tracking.tabId === sender.tab.id) {
          await flushTrackedUsage(true);
        }
      });

      sendResponse({ ok: true });
      return;
    }

    if (message.type === "SYNC_USAGE_AND_EVALUATE") {
      await withTrackingLock(async () => {
        await flushTrackedUsage(false);
      });
      const evaluated = await evaluateUrl(message.url);
      sendResponse({ ok: true, ...evaluated });
      return;
    }

    sendResponse({ ok: false, error: "Unknown message type." });
  })().catch((error) => {
    sendResponse({
      ok: false,
      error: error && error.message ? error.message : "Unknown background error."
    });
  });

  return true;
});
