/**
 * MAIN-world stubs so pages that sniff for an ad blocker do not freeze
 * playback or throw a "disable your ad blocker" wall. Does not touch
 * media elements or player APIs.
 *
 * Some publishers (Vox/Admiral) cloak ad class tokens from isolated-world
 * extensions — `m-ad` becomes a random hash — while leaving classList in
 * this world intact. Hide those uncloaked tokens here. Never seek video.
 */
(() => {
  try {
    if (typeof window.canRunAds === "undefined") window.canRunAds = true;
    if (typeof window.isAdBlockActive === "undefined") window.isAdBlockActive = false;
    if (typeof window.adBlockerEnabled === "undefined") window.adBlockerEnabled = false;
  } catch {
    // Page may have frozen those names.
  }

  const CLOAKED_AD_TOKENS = [
    "m-ad",
    "spon-qp",
    "sponsored-quickpost",
    "sponsored-quick-post",
    "admiral-unit",
  ];

  function isMediaProtected(node) {
    if (!node || node.nodeType !== 1) return true;
    const tag = node.tagName;
    if (tag === "VIDEO" || tag === "AUDIO" || tag === "SOURCE" || tag === "TRACK") return true;
    if (node.id === "movie_player" || node.classList?.contains("html5-video-player")) return true;
    return false;
  }

  function hideCloakedAdTokens() {
    let nodes;
    try {
      nodes = document.querySelectorAll("*");
    } catch {
      return;
    }
    for (const node of nodes) {
      const list = node.classList;
      if (!list || !list.length) continue;
      let hit = false;
      for (const token of CLOAKED_AD_TOKENS) {
        try {
          if (list.contains(token)) {
            hit = true;
            break;
          }
        } catch {
          // classList may throw on SVGAnimatedString hosts.
        }
      }
      if (!hit) continue;
      if (isMediaProtected(node)) continue;
      try {
        node.style.setProperty("display", "none", "important");
      } catch {
        // Read-only style on some replaced elements.
      }
    }
  }

  function start() {
    hideCloakedAdTokens();
    setInterval(hideCloakedAdTokens, 500);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", hideCloakedAdTokens, { once: true });
    }
  }

  try {
    start();
  } catch {
    // Page may reject timers; stubs above still apply.
  }
})();
