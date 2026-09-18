/**
 * MAIN-world YouTube hooks.
 *
 * Video bytes live on googlevideo.com alongside ads, so network blocking
 * cannot take down prerolls without also killing the video. This script
 * strips ad payloads from player JSON and leaves streamingData intact
 * unless a classic DASH/HLS fallback is already present.
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
    "companionAdRenderer",
    "adDurationRemainingRenderer",
    "instreamAdPlayerOverlayRenderer",
    "playerLegacyDesktopWatchAdsRenderer",
    "adInfoRenderer",
    "adPrimaryVideoRenderer",
  ]);

  let enabled = document.documentElement?.getAttribute("data-clearblock") !== "off";

  window.addEventListener("clearblock:config", (event) => {
    enabled = Boolean(event.detail?.enabled);
  });

  function isAdRenderer(value) {
    if (!value || typeof value !== "object") return false;
    const key = Object.keys(value)[0] || "";
    return AD_RENDERERS.has(key) || /^(adPlacement|adSlot|promotedSparkles|inFeedAdLayout|companionAd)/.test(key);
  }

  function hasClassicFormats(streaming) {
    if (!streaming || typeof streaming !== "object") return false;
    return (
      (Array.isArray(streaming.adaptiveFormats) && streaming.adaptiveFormats.length > 0) ||
      (Array.isArray(streaming.formats) && streaming.formats.length > 0)
    );
  }

  function stripAds(value, depth) {
    if (!enabled || !value || typeof value !== "object" || depth > 14) return false;
    let removed = false;
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i -= 1) {
        if (isAdRenderer(value[i])) {
          value.splice(i, 1);
          removed = true;
        } else if (stripAds(value[i], depth + 1)) {
          removed = true;
        }
      }
      return removed;
    }
    if (Array.isArray(value.adPlacements) && value.adPlacements.length) {
      value.adPlacements = [];
      removed = true;
    }
    if (Array.isArray(value.adSlots) && value.adSlots.length) {
      value.adSlots = [];
      removed = true;
    }
    if (Array.isArray(value.playerAds) && value.playerAds.length) {
      value.playerAds = [];
      removed = true;
    }
    if (value.adBreakHeartbeatParams) {
      delete value.adBreakHeartbeatParams;
      removed = true;
    }
    if (value.adBreakParams) {
      delete value.adBreakParams;
      removed = true;
    }
    if (value.streamingData && hasClassicFormats(value.streamingData) && value.streamingData.serverAbrStreamingUrl) {
      // Drop SABR only when DASH/HLS formats already exist so playback still has a path.
      delete value.streamingData.serverAbrStreamingUrl;
      removed = true;
    }
    if (value.auxiliaryUi?.messageRenderers?.upsellDialogRenderer) {
      delete value.auxiliaryUi.messageRenderers.upsellDialogRenderer;
      removed = true;
    }
    if (value.playerResponse && stripAds(value.playerResponse, depth + 1)) removed = true;
    return removed;
  }

  function looksLikePlayer(data) {
    if (!data || typeof data !== "object") return false;
    return (
      Array.isArray(data.adPlacements) ||
      Array.isArray(data.adSlots) ||
      Array.isArray(data.playerAds) ||
      (data.videoDetails && data.streamingData) ||
      (data.playerResponse && typeof data.playerResponse === "object")
    );
  }

  function patchIfPlayer(data) {
    if (!looksLikePlayer(data)) return data;
    const removed = stripAds(data, 0);
    if (removed) {
      window.postMessage({ source: "clearblock-yt", kind: "strip" }, "*");
    }
    return data;
  }

  function playerApiUrl(url) {
    return typeof url === "string" && /\/youtubei\/v1\/(player|next|browse|reel\/reel_item_watch)/.test(url);
  }

  function stripAdSignals(init) {
    if (!init || typeof init.body !== "string") return init;
    try {
      const body = JSON.parse(init.body);
      let changed = false;
      if (body.adSignalsInfo) {
        delete body.adSignalsInfo;
        changed = true;
      }
      if (body.playbackContext?.adPlaybackContext) {
        delete body.playbackContext.adPlaybackContext;
        changed = true;
      }
      if (!changed) return init;
      return Object.assign({}, init, { body: JSON.stringify(body) });
    } catch {
      return init;
    }
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
      if (playerApiUrl(url)) init = stripAdSignals(init);
      const request = original.call(this, input, init);
      if (!playerApiUrl(url)) return request;
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
      if (playerApiUrl(this.__clearblockUrl || "")) {
        this.addEventListener("readystatechange", function onReady() {
          if (this.readyState !== 4) return;
          try {
            const data = JSON.parse(this.responseText);
            patchIfPlayer(data);
            Object.defineProperty(this, "responseText", { value: JSON.stringify(data) });
            Object.defineProperty(this, "response", { value: JSON.stringify(data) });
          } catch {
            // Leave the original payload in place so playback can continue.
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
