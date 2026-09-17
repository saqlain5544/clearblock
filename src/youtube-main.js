/**
 * Runs in the page's MAIN world so it can see YouTube's own fetch/XHR/player objects.
 * YouTube often serves ads from the same googlevideo.com hosts as the video, so
 * network blocking alone cannot strip prerolls. This patches player JSON instead.
 */
(() => {
  const AD_RENDERERS = new Set([
    "adSlotRenderer",
    "adPlacementRenderer",
    "adsEngagementPanelContentRenderer",
    "displayAdRenderer",
    "inFeedAdLayoutRenderer",
    "promotedSparklesWebRenderer",
    "promotedSparklesTextSearchRenderer",
    "promotedVideoRenderer",
    "actionCompanionAdRenderer",
    "bannerPromoRenderer",
    "adHovercardContainerRenderer",
    "promotedSparklesWebRenderer",
  ]);

  let enabled = document.documentElement?.getAttribute("data-clearblock") !== "off";
  let lastStrip = 0;

  window.addEventListener("clearblock:config", (event) => {
    enabled = Boolean(event.detail?.enabled);
  });

  function isAdRenderer(value) {
    if (!value || typeof value !== "object") return false;
    const key = Object.keys(value)[0] || "";
    return AD_RENDERERS.has(key) || /^(adPlacement|adSlot|promotedSparkles|inFeedAdLayout)/.test(key);
  }

  function stripAds(value, depth) {
    if (!enabled || !value || typeof value !== "object" || depth > 12) return value;
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i -= 1) {
        if (isAdRenderer(value[i])) value.splice(i, 1);
        else stripAds(value[i], depth + 1);
      }
      return value;
    }
    if (value.adPlacements) value.adPlacements = [];
    if (value.adSlots) value.adSlots = [];
    if (value.playerAds) value.playerAds = [];
    if (value.adBreakHeartbeatParams) delete value.adBreakHeartbeatParams;
    if (value.streamingData && value.streamingData.serverAbrStreamingUrl) {
      delete value.streamingData.serverAbrStreamingUrl;
    }
    if (value.playerConfig?.audioConfig) {
      value.playerConfig.audioConfig.enableHifiOnPremiumOnly = false;
    }
    if (value.auxiliaryUi?.messageRenderers?.upsellDialogRenderer) {
      delete value.auxiliaryUi.messageRenderers.upsellDialogRenderer;
    }
    if (value.playerResponse) stripAds(value.playerResponse, depth + 1);
    return value;
  }

  function noteStrip() {
    const now = Date.now();
    if (now - lastStrip < 4000) return;
    lastStrip = now;
    window.postMessage({ source: "clearblock-yt", kind: "strip" }, "*");
  }

  function patchIfPlayer(data) {
    if (!data || typeof data !== "object") return data;
    const looksLikePlayer =
      Array.isArray(data.adPlacements) ||
      Array.isArray(data.adSlots) ||
      Array.isArray(data.playerAds) ||
      (data.videoDetails && data.streamingData) ||
      data.playerResponse;
    if (looksLikePlayer) {
      stripAds(data, 0);
      noteStrip();
    }
    return data;
  }

  function hookJsonParse() {
    const original = JSON.parse;
    JSON.parse = function clearblockParse(text, reviver) {
      const parsed = original.call(this, text, reviver);
      try {
        return patchIfPlayer(parsed);
      } catch {
        return parsed;
      }
    };
  }

  function hookFetch() {
    const original = window.fetch;
    if (typeof original !== "function") return;
    window.fetch = function clearblockFetch(input, init) {
      const url = typeof input === "string" ? input : input && input.url;
      const request = original.call(this, input, init);
      if (typeof url !== "string" || !/\/youtubei\/v1\/(player|next|reel\/reel_item_watch)/.test(url)) {
        return request;
      }
      return request.then(async (response) => {
        try {
          const data = await response.clone().json();
          patchIfPlayer(data);
          return new Response(JSON.stringify(data), {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
          });
        } catch {
          return response;
        }
      });
    };
  }

  function hookXhr() {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function clearblockOpen(method, url, ...rest) {
      this.__clearblockUrl = String(url || "");
      return origOpen.call(this, method, url, ...rest);
    };
    XMLHttpRequest.prototype.send = function clearblockSend(body) {
      if (/\/youtubei\/v1\/(player|next)/.test(this.__clearblockUrl || "")) {
        this.addEventListener("readystatechange", function onReady() {
          if (this.readyState !== 4) return;
          try {
            const data = JSON.parse(this.responseText);
            patchIfPlayer(data);
            Object.defineProperty(this, "responseText", { value: JSON.stringify(data) });
            Object.defineProperty(this, "response", { value: JSON.stringify(data) });
          } catch {
            // Leave the original payload in place.
          }
        });
      }
      return origSend.call(this, body);
    };
  }

  function hookInitialPlayer() {
    let current = window.ytInitialPlayerResponse;
    try {
      Object.defineProperty(window, "ytInitialPlayerResponse", {
        configurable: true,
        enumerable: true,
        get() {
          return current;
        },
        set(value) {
          current = patchIfPlayer(value);
        },
      });
      if (current) current = patchIfPlayer(current);
    } catch {
      if (current) patchIfPlayer(current);
    }

    let next = window.ytInitialData;
    try {
      Object.defineProperty(window, "ytInitialData", {
        configurable: true,
        enumerable: true,
        get() {
          return next;
        },
        set(value) {
          next = patchIfPlayer(value);
        },
      });
      if (next) next = patchIfPlayer(next);
    } catch {
      if (next) patchIfPlayer(next);
    }
  }

  hookJsonParse();
  hookFetch();
  hookXhr();
  hookInitialPlayer();
})();
