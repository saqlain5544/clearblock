/**
 * MAIN-world YouTube hooks.
 *
 * Do not rewrite fetch/XHR bodies or wrap JSON.parse — that produces
 * YouTube "Error 153" / player configuration failures. Ads that share
 * googlevideo.com with the video are skipped in the isolated world when
 * the player actually has the ad-showing class.
 */
(() => {
  const AD_KEYS = ["adPlacements", "adSlots", "playerAds"];

  let enabled = document.documentElement?.getAttribute("data-clearblock") !== "off";

  window.addEventListener("clearblock:config", (event) => {
    enabled = Boolean(event.detail?.enabled);
  });

  function stripAdArrays(value, depth) {
    if (!enabled || !value || typeof value !== "object" || depth > 8) return false;
    let removed = false;
    if (Array.isArray(value)) {
      for (const item of value) {
        if (stripAdArrays(item, depth + 1)) removed = true;
      }
      return removed;
    }
    for (const key of AD_KEYS) {
      if (Array.isArray(value[key]) && value[key].length) {
        value[key] = [];
        removed = true;
      }
    }
    if (value.adBreakHeartbeatParams) {
      delete value.adBreakHeartbeatParams;
      removed = true;
    }
    if (value.playerResponse && stripAdArrays(value.playerResponse, depth + 1)) removed = true;
    return removed;
  }

  function note(removed) {
    if (removed) window.postMessage({ source: "clearblock-yt", kind: "strip" }, "*");
  }

  function hookInitial(name) {
    let current = window[name];
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get() {
          return current;
        },
        set(value) {
          current = value;
          note(stripAdArrays(current, 0));
        },
      });
      if (current) note(stripAdArrays(current, 0));
    } catch {
      if (current) note(stripAdArrays(current, 0));
    }
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

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function clearblockFetch(input, init) {
      const url = typeof input === "string" ? input : input && input.url;
      if (enabled && typeof url === "string" && url.includes("/youtubei/v1/player")) {
        init = stripAdSignals(init);
      }
      return originalFetch.call(this, input, init);
    };
  }

  hookInitial("ytInitialPlayerResponse");
  hookInitial("ytInitialData");
})();
