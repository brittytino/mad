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
  },
  {
    id: 1003,
    priority: 6,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/(www|i)\\.instagram\\.com\\/api\\/v1\\/notifications\\/",
      resourceTypes: ["xmlhttprequest"]
    }
  },
  {
    id: 1004,
    priority: 6,
    action: { type: "allow" },
    condition: {
      regexFilter: "^https:\\/\\/(www|i)\\.instagram\\.com\\/api\\/v1\\/users\\/",
      resourceTypes: ["xmlhttprequest"]
    }
  }
];

const BLOCK_RULES = [
  {
    id: 1101,
    priority: 8,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: "https://www.instagram.com/direct/inbox/"
      }
    },
    condition: {
      regexFilter: "^https:\\/\\/www\\.instagram\\.com\\/reels(\\/|\\?|$)",
      resourceTypes: ["main_frame"]
    }
  },
  {
    id: 1102,
    priority: 8,
    action: {
      type: "redirect",
      redirect: {
        regexSubstitution: "https://www.instagram.com/direct/inbox/"
      }
    },
    condition: {
      regexFilter: "^https:\\/\\/www\\.instagram\\.com\\/reel(\\/|\\?|$)",
      resourceTypes: ["main_frame"]
    }
  },
  {
    id: 1103,
    priority: 7,
    action: { type: "block" },
    condition: {
      regexFilter: "^https:\\/\\/(www|i)\\.instagram\\.com\\/.+fragment_clips",
      resourceTypes: ["xmlhttprequest", "main_frame"]
    }
  },
  {
    id: 1104,
    priority: 7,
    action: { type: "block" },
    condition: {
      regexFilter: "^https:\\/\\/(www|i)\\.instagram\\.com\\/.*feed\\/timeline(\\/|\\?|$)",
      resourceTypes: ["xmlhttprequest"]
    }
  }
];

const STALE_RULE_IDS = [
  1105,
  1106,
  1107,
  1108,
  1109,
  1110,
  1111,
  1112,
  1113,
  1114,
  1115,
  1116,
  1117,
  1118,
  1119,
  1201,
  1202,
  1203,
  1204,
  1205,
  1206
];

const ALL_DNR_RULE_IDS = [
  ...BASE_ALLOW_RULES,
  ...BLOCK_RULES,
  ...STALE_RULE_IDS.map((id) => ({ id }))
].map((rule) => rule.id);

const tracking = {
  tabId: null,
  windowId: null,
  url: "",
  startedAt: 0
};
let trackingLock = Promise.resolve();
let networkRulesInstalled = false;

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

function buildNetworkRules() {
  return [...BASE_ALLOW_RULES, ...BLOCK_RULES];
}

async function installNetworkRules() {
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: ALL_DNR_RULE_IDS,
    addRules: buildNetworkRules()
  });
}

async function ensureNetworkRulesForState(state, now = Date.now()) {
  if (networkRulesInstalled) {
    return;
  }

  try {
    await installNetworkRules();
    networkRulesInstalled = true;
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
  const now = Date.now();
  const state = await globalThis.IretardStorage.getState(now);

  await broadcastState(state);
  return state;
}

async function activateEmergency() {
  const now = Date.now();
  const state = await globalThis.IretardStorage.getState(now);

  await broadcastState(state);
  return {
    ok: false,
    error: "Strict mode enabled. Emergency unlock is disabled.",
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
