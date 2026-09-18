importScripts("shared.js");

const PAUSE_RULE_ID_BASE = 1;
const tabBlocked = new Map();
const pending = { blocked: 0, bytes: 0 };
let flushTimer = 0;
let cachedState = null;

function allResourceTypes() {
  return Clearblock.RESOURCE_TYPES.slice();
}

async function loadState() {
  cachedState = await Clearblock.readState();
  return cachedState;
}

async function getState() {
  if (!cachedState) return loadState();
  return cachedState;
}

function queueFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = 0;
    flushStats();
  }, 800);
}

async function flushStats() {
  const blocked = pending.blocked;
  const bytes = pending.bytes;
  if (!blocked && !bytes) return;
  pending.blocked = 0;
  pending.bytes = 0;
  const state = await loadState();
  const next = {
    lifetimeBlocked: state.lifetimeBlocked + blocked,
    lifetimeBytes: state.lifetimeBytes + bytes,
  };
  await chrome.storage.local.set(next);
  cachedState = { ...state, ...next };
}

function record(tabId, bytes) {
  pending.blocked += 1;
  pending.bytes += bytes;
  if (Number.isInteger(tabId) && tabId >= 0) {
    tabBlocked.set(tabId, (tabBlocked.get(tabId) || 0) + 1);
    updateBadge(tabId);
  }
  queueFlush();
}

async function updateBadge(tabId) {
  const state = await getState();
  const count = tabBlocked.get(tabId) || 0;
  const text = state.enabled && count > 0 ? (count > 999 ? "999+" : String(count)) : "";
  try {
    await chrome.action.setBadgeBackgroundColor({ color: "#0d3b34", tabId });
    await chrome.action.setBadgeTextColor({ color: "#f8fcfa", tabId });
    await chrome.action.setBadgeText({ text, tabId });
  } catch {
    // Tab may already be gone.
  }
}

async function syncEnabled(enabled) {
  const update = enabled
    ? { enableRulesetIds: Clearblock.RULESET_IDS, disableRulesetIds: [] }
    : { enableRulesetIds: [], disableRulesetIds: Clearblock.RULESET_IDS };
  await chrome.declarativeNetRequest.updateEnabledRulesets(update);
}

function pauseRulesFor(hosts) {
  return hosts.map((host, index) => ({
    id: PAUSE_RULE_ID_BASE + index,
    priority: 10000,
    action: { type: "allow" },
    condition: {
      initiatorDomains: [Clearblock.canonicalHost(host)],
      resourceTypes: allResourceTypes(),
    },
  }));
}

async function syncPausedHosts(hosts) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const removeRuleIds = existing.map((rule) => rule.id);
  const addRules = pauseRulesFor(hosts);
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds,
    addRules,
  });
}

async function ensureDefaults() {
  const stored = await chrome.storage.local.get(null);
  const patch = {};
  if (typeof stored.enabled !== "boolean") patch.enabled = true;
  if (!Array.isArray(stored.pausedHosts)) patch.pausedHosts = [];
  if (!Number.isFinite(stored.lifetimeBlocked)) patch.lifetimeBlocked = 0;
  if (!Number.isFinite(stored.lifetimeBytes)) patch.lifetimeBytes = 0;
  if (!Number.isFinite(stored.installedAt) || stored.installedAt <= 0) {
    patch.installedAt = Date.now();
  }
  if (Object.keys(patch).length) {
    await chrome.storage.local.set(patch);
  }
  const state = await loadState();
  await syncEnabled(state.enabled);
  await syncPausedHosts(state.pausedHosts);
}

chrome.runtime.onInstalled.addListener(() => {
  ensureDefaults();
});

chrome.runtime.onStartup.addListener(() => {
  ensureDefaults();
});

ensureDefaults();

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (cachedState) {
    for (const [key, { newValue }] of Object.entries(changes)) {
      cachedState[key] = newValue;
    }
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  tabBlocked.delete(tabId);
});

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    if (details.error !== "net::ERR_BLOCKED_BY_CLIENT") return;
    if (details.tabId < 0) return;
    const bytes = Clearblock.estimateBytes(details.type);
    record(details.tabId, bytes);
  },
  { urls: ["<all_urls>"] }
);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const tabId = sender.tab?.id ?? -1;

  if (message?.type === "getPopupState") {
    (async () => {
      try {
        const state = await loadState();
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const url = tab?.url || "";
        const restricted = Clearblock.isRestrictedUrl(url);
        let host = "";
        if (!restricted) {
          try {
            host = Clearblock.canonicalHost(new URL(url).hostname);
          } catch {
            host = "";
          }
        }
        sendResponse({
          ok: true,
          enabled: state.enabled,
          pausedHosts: state.pausedHosts,
          lifetimeBlocked: state.lifetimeBlocked + pending.blocked,
          lifetimeBytes: state.lifetimeBytes + pending.bytes,
          tabBlocked: tab?.id != null ? tabBlocked.get(tab.id) || 0 : 0,
          host,
          restricted,
          sitePaused: host ? Clearblock.isPaused(state, host) : false,
          installedAt: state.installedAt,
        });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  if (message?.type === "setEnabled") {
    (async () => {
      try {
        const enabled = Boolean(message.enabled);
        await chrome.storage.local.set({ enabled });
        cachedState = { ...(await getState()), enabled };
        await syncEnabled(enabled);
        const tabs = await chrome.tabs.query({});
        for (const tab of tabs) {
          if (tab.id != null) updateBadge(tab.id);
        }
        sendResponse({ ok: true, enabled });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  if (message?.type === "setSitePaused") {
    (async () => {
      try {
        const host = Clearblock.canonicalHost(message.host);
        if (!host) {
          sendResponse({ ok: false, error: "No site to pause on this page." });
          return;
        }
        const state = await loadState();
        const paused = new Set(state.pausedHosts.map(Clearblock.canonicalHost));
        if (message.paused) paused.add(host);
        else paused.delete(host);
        const pausedHosts = [...paused];
        await chrome.storage.local.set({ pausedHosts });
        cachedState = { ...state, pausedHosts };
        await syncPausedHosts(pausedHosts);
        sendResponse({ ok: true, pausedHosts, sitePaused: paused.has(host) });
      } catch (error) {
        sendResponse({ ok: false, error: String(error?.message || error) });
      }
    })();
    return true;
  }

  if (message?.type === "cosmeticBlocked") {
    const count = Math.min(50, Math.max(0, Number(message.count) || 0));
    const bytesEach = Clearblock.estimateBytes("image", "hide");
    for (let i = 0; i < count; i += 1) record(tabId, bytesEach);
    sendResponse({ ok: true });
    return false;
  }

  if (message?.type === "youtubeAd") {
    const bytes = Clearblock.estimateBytes("media", message.kind);
    record(tabId, bytes);
    sendResponse({ ok: true });
    return false;
  }

  return false;
});

chrome.runtime.onSuspend.addListener(() => {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = 0;
  }
  flushStats();
});
