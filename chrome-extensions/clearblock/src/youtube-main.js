/**
 * MAIN-world YouTube hooks.
 *
 * Network bodies are patched by renaming ad keys in the raw JSON text so
 * streamingData / player signatures stay byte-identical. Do not JSON.parse
 * a player response and stringify it back — that path produces Error 153.
 *
 * Ads that still reach the player (shared googlevideo.com streams) are
 * skipped invisibly in the isolated world while `.ad-showing` is set.
 */
(() => {
  const prune = globalThis.ClearblockYoutubePrune;
  if (!prune) return;

  let enabled = document.documentElement?.getAttribute("data-clearblock") !== "off";

  window.addEventListener("clearblock:config", (event) => {
    enabled = Boolean(event.detail?.enabled);
  });

  function note(removed) {
    if (removed) window.postMessage({ source: "clearblock-yt", kind: "strip" }, "*");
  }

  function stripObject(value) {
    if (!enabled || !value || typeof value !== "object") return false;
    return prune.prunePlayerObject(value, 0);
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
          note(stripObject(current));
        },
      });
      if (current) note(stripObject(current));
    } catch {
      if (current) note(stripObject(current));
    }
  }

  function patchText(text) {
    if (!enabled || typeof text !== "string") return text;
    const next = prune.renameAdKeys(text);
    if (next !== text) note(true);
    return next;
  }

  function urlOf(input) {
    if (typeof input === "string") return input;
    if (input && typeof input.url === "string") return input.url;
    try {
      if (input instanceof URL) return input.href;
    } catch {
      // Ignore.
    }
    return "";
  }

  const originalFetch = window.fetch;
  if (typeof originalFetch === "function") {
    window.fetch = function clearblockFetch(input, init) {
      const url = urlOf(input);
      const request = originalFetch.call(this, input, init);
      if (!enabled || !prune.shouldPatchUrl(url)) return request;
      return request.then((response) => {
        if (!response || !response.ok) return response;
        return response
          .clone()
          .text()
          .then((text) => {
            const patched = patchText(text);
            if (patched === text) return response;
            const next = new Response(patched, {
              status: response.status,
              statusText: response.statusText,
              headers: response.headers,
            });
            try {
              Object.defineProperty(next, "url", { get: () => response.url });
              Object.defineProperty(next, "redirected", { get: () => response.redirected });
              Object.defineProperty(next, "type", { get: () => response.type });
            } catch {
              // Some engines seal Response instances.
            }
            return next;
          })
          .catch(() => response);
      });
    };
  }

  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function clearblockXhrOpen(method, url) {
    this.__clearblockUrl = typeof url === "string" ? url : String(url || "");
    return xhrOpen.apply(this, arguments);
  };
  XMLHttpRequest.prototype.send = function clearblockXhrSend(body) {
    if (enabled && prune.shouldPatchUrl(this.__clearblockUrl || "")) {
      this.addEventListener("readystatechange", function onReady() {
        if (this.readyState !== 4) return;
        this.removeEventListener("readystatechange", onReady);
        try {
          const raw = this.responseType === "" || this.responseType === "text" ? this.responseText : "";
          if (!raw) return;
          const patched = patchText(raw);
          if (patched === raw) return;
          Object.defineProperty(this, "responseText", { configurable: true, get: () => patched });
          Object.defineProperty(this, "response", { configurable: true, get: () => patched });
        } catch {
          // Leave the original body if the engine sealed the XHR.
        }
      });
    }
    return xhrSend.apply(this, arguments);
  };

  const originalParse = JSON.parse;
  JSON.parse = function clearblockJsonParse(text, reviver) {
    const value = originalParse.call(this, text, reviver);
    if (enabled && value && typeof value === "object") {
      if (value.adPlacements || value.adSlots || value.playerAds || value.playerResponse || value.contents) {
        note(stripObject(value));
      }
    }
    return value;
  };

  function wrapPlayer(player) {
    if (!player || player.__clearblockWrapped) return;
    if (typeof player.getPlayerResponse !== "function") return;
    player.__clearblockWrapped = true;
    const original = player.getPlayerResponse.bind(player);
    player.getPlayerResponse = function clearblockGetPlayerResponse() {
      const response = original();
      note(stripObject(response));
      return response;
    };
  }

  function watchPlayer() {
    wrapPlayer(document.getElementById("movie_player"));
    wrapPlayer(document.querySelector(".html5-video-player"));
  }

  hookInitial("ytInitialPlayerResponse");
  hookInitial("ytInitialData");
  watchPlayer();
  document.addEventListener("yt-navigate-finish", () => {
    note(stripObject(window.ytInitialPlayerResponse));
    note(stripObject(window.ytInitialData));
    watchPlayer();
  });
  const observer = new MutationObserver(watchPlayer);
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
