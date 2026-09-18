const Clearblock = (() => {
  const RULESET_IDS = ["youtube", "ads", "allow", "media"];

  const RESOURCE_TYPES = [
    "main_frame",
    "sub_frame",
    "stylesheet",
    "script",
    "image",
    "font",
    "object",
    "xmlhttprequest",
    "ping",
    "media",
    "websocket",
    "other",
  ];

  const DEFAULT_STATE = {
    enabled: true,
    pausedHosts: [],
    lifetimeBlocked: 0,
    lifetimeBytes: 0,
    installedAt: 0,
  };

  const BYTES_BY_TYPE = {
    script: 45_000,
    image: 28_000,
    media: 180_000,
    sub_frame: 60_000,
    xmlhttprequest: 8_000,
    stylesheet: 12_000,
    font: 40_000,
    ping: 500,
    websocket: 2_000,
    object: 20_000,
    other: 12_000,
    main_frame: 40_000,
  };

  const YT_AD_BYTES = {
    skip: 2_000_000,
    strip: 1_500_000,
    hide: 40_000,
  };

  function canonicalHost(host) {
    if (!host) return "";
    return String(host).toLowerCase().replace(/^www\./, "");
  }

  function hostMatches(pausedHost, pageHost) {
    const paused = canonicalHost(pausedHost);
    const page = canonicalHost(pageHost);
    if (!paused || !page) return false;
    return page === paused || page.endsWith("." + paused);
  }

  function isPaused(state, host) {
    const pausedHosts = state?.pausedHosts || [];
    return pausedHosts.some((paused) => hostMatches(paused, host));
  }

  function shouldBlock(state, host) {
    return Boolean(state?.enabled) && !isPaused(state, host);
  }

  function isRestrictedUrl(url) {
    if (!url) return true;
    try {
      const parsed = new URL(url);
      return !["http:", "https:"].includes(parsed.protocol);
    } catch {
      return true;
    }
  }

  function estimateBytes(resourceType, kind) {
    if (kind && YT_AD_BYTES[kind]) return YT_AD_BYTES[kind];
    return BYTES_BY_TYPE[resourceType] || 15_000;
  }

  function formatCount(n) {
    const value = Number(n) || 0;
    return value.toLocaleString("en-US");
  }

  function formatBytes(n) {
    const value = Number(n) || 0;
    if (value < 1000) return "0 KB";
    const kb = value / 1000;
    if (kb < 1000) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
    const mb = kb / 1000;
    if (mb < 1000) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
    const gb = mb / 1000;
    return `${gb < 10 ? gb.toFixed(2) : gb.toFixed(1)} GB`;
  }

  async function readState() {
    const stored = await chrome.storage.local.get(DEFAULT_STATE);
    return {
      enabled: stored.enabled !== false,
      pausedHosts: Array.isArray(stored.pausedHosts) ? stored.pausedHosts : [],
      lifetimeBlocked: Number(stored.lifetimeBlocked) || 0,
      lifetimeBytes: Number(stored.lifetimeBytes) || 0,
      installedAt: Number(stored.installedAt) || 0,
    };
  }

  return {
    RULESET_IDS,
    RESOURCE_TYPES,
    DEFAULT_STATE,
    canonicalHost,
    hostMatches,
    isPaused,
    shouldBlock,
    isRestrictedUrl,
    estimateBytes,
    formatCount,
    formatBytes,
    readState,
  };
})();

if (typeof globalThis !== "undefined") {
  globalThis.Clearblock = Clearblock;
}
