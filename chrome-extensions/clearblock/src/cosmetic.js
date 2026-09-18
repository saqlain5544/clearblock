(() => {
  const MAX_PER_PAGE = 80;
  let enabled = true;
  let hiddenCount = 0;
  let reported = 0;
  const hidden = new WeakSet();
  let specificSelectors = [];
  let observer = null;

  const BOOTSTRAP_CSS = `
.ad, .ads, .ad-banner, .ad-container, .ad-slot, .adbox, .adsbox,
.advert, .advertisement, .sponsored, .sponsored-slot, .sponsored-unit,
.sponsor, .promo-ad, .promoted, .promoted-post,
[id="ad"], [id="ads"], [id="ad-banner"], [class*="Ad-Container"],
ins.adsbygoogle, .adsbygoogle, #google_ads_iframe,
.trc_rbox, .OUTBRAIN, .taboola, #taboola-below, [id^="taboola-"],
[id*="google_ads"], [id*="div-gpt-ad"], [class*="div-gpt-ad"],
[id^="div-gpt-ad"], .dfp-ad, .gpt-ad, .ad--gpt, .ad-unit, .adUnit,
.leaderboard-ad, .billboard-ad, .mpu-ad, .sticky-ad, .ad-sticky,
.ad-interstitial, .interstitial-ad, .overlay-ad, .popup-ad, .popunder-ad,
.native-ad, .in-article-ad, .inarticle-ad, .affiliate-ad, .newsletter-ad,
.cookie-ad, .consent-ad, .prebid-ad, .amp-ad, .amp-ad-wrapper,
.search-ad, .shopping-ad, .product-ad, .sponsored-result, .sponsored-content,
[aria-label="Sponsored"], [data-ad-comet-preview], [data-testid="fb-sponsored"],
[data-pagelet="FeedAd"], [data-pagelet="RightRailAds"], [data-pagelet="StoryAd"],
.fb-ad, .fbAd, .fb-sponsored, .fb-instream-ad, .story-ad, .marketplace-ad,
.right-rail-ad, .fb-right-rail-ad, .reels-ad,
ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer,
ytd-promoted-sparkles-web-renderer, ytd-companion-slot-renderer,
ytd-video-masthead-ad-v3-renderer, ytd-promoted-video-renderer,
ytd-action-companion-ad-renderer, ytd-banner-promo-renderer,
ytd-mealbar-promo-renderer, ytd-enforcement-message-view-model,
ytd-player-legacy-desktop-watch-ads-renderer,
ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
#masthead-ad, #player-ads, .ytp-ad-module, .video-ads,
[class*="ytp-ad-"], .ytp-flyout-cta, .ytp-paid-content-overlay,
.jw-ad, .video-js-ad, .ima-ad-container, .vast-ad,
iframe[id^="google_ads"], iframe[src*="doubleclick"], iframe[src*="googlesyndication"] {
  display: none !important;
}
`;

  function injectCss(cssText, id) {
    if (!cssText || document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = cssText;
    const root = document.documentElement || document.head;
    if (root) root.appendChild(style);
  }

  const PROTECT_TAGS = new Set(["VIDEO", "AUDIO", "SOURCE", "TRACK", "CANVAS"]);

  function isExplicitAdContainer(node) {
    if (!node || !node.matches) return false;
    try {
      if (
        node.matches(
          '[data-lab-ad], ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer, ytd-companion-slot-renderer, ytd-video-masthead-ad-v3-renderer, ytd-promoted-video-renderer, ins.adsbygoogle, .adsbygoogle, [id*="google_ads"], [id*="div-gpt-ad"], [class*="div-gpt-ad"], .OUTBRAIN, .taboola, [id^="taboola-"], .trc_rbox, [aria-label="Sponsored"], .fb-instream-ad, .ima-ad-container'
        )
      ) {
        return true;
      }
    } catch {
      // Invalid selector in older engines.
    }
    const id = node.id || "";
    const cls = typeof node.className === "string" ? node.className : "";
    return /(?:^|[^a-z])(?:ad|ads|advert|sponsor|sponsored|gpt|dfp|prebid|taboola|outbrain)(?:[^a-z]|$)/i.test(
      `${id} ${cls}`
    );
  }

  function isProtected(node) {
    if (!node || node.nodeType !== 1) return true;
    if (PROTECT_TAGS.has(node.tagName)) return true;
    if (node.id === "movie_player" || node.classList?.contains("html5-video-player")) return true;
    if (isExplicitAdContainer(node)) return false;
    if (node.closest?.("[data-lab-ad], ytd-ad-slot-renderer, .fb-instream-ad, .ima-ad-container")) return false;
    if (node.closest?.("video, audio, ytd-player, #movie_player, .html5-video-player, [data-lab-content='player']")) {
      return true;
    }
    if (node.querySelector?.("video, audio")) return true;
    return false;
  }

  function hideMatches(selectors) {
    if (!enabled || !selectors.length) return;
    for (const selector of selectors) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const node of nodes) {
        if (hidden.has(node) || isProtected(node)) continue;
        hidden.add(node);
        node.style.setProperty("display", "none", "important");
        hiddenCount += 1;
      }
    }
    flushCosmeticCount();
  }

  function flushCosmeticCount() {
    const delta = hiddenCount - reported;
    if (delta <= 0) return;
    const send = Math.min(delta, MAX_PER_PAGE - reported);
    if (send <= 0) return;
    reported += send;
    try {
      chrome.runtime.sendMessage({ type: "cosmeticBlocked", count: send });
    } catch {
      // Extension context invalidated on reload.
    }
  }

  function startObserver() {
    if (observer || !enabled) return;
    observer = new MutationObserver(() => {
      if (specificSelectors.length) hideMatches(specificSelectors);
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }

  async function applySpecific(host) {
    try {
      const url = chrome.runtime.getURL("rules/cosmetic-specific.json");
      const map = await fetch(url).then((res) => res.json());
      const parts = host.split(".");
      const selectors = [];
      for (let i = 0; i < parts.length - 1; i += 1) {
        const candidate = parts.slice(i).join(".");
        if (Array.isArray(map[candidate])) selectors.push(...map[candidate]);
      }
      specificSelectors = [...new Set(selectors)].slice(0, 200);
      if (specificSelectors.length) {
        injectCss(
          specificSelectors.map((sel) => sel + "{display:none!important}").join("\n"),
          "clearblock-specific"
        );
        hideMatches(specificSelectors);
      }
    } catch {
      // Missing map should not break the page.
    }
  }

  async function init() {
    const host = Clearblock.canonicalHost(location.hostname);
    const state = await Clearblock.readState();
    enabled = Clearblock.shouldBlock(state, host);
    document.documentElement?.setAttribute("data-clearblock", enabled ? "on" : "off");
    if (!enabled) return;

    injectCss(BOOTSTRAP_CSS, "clearblock-bootstrap");
    try {
      const css = await fetch(chrome.runtime.getURL("rules/cosmetic-generic.css")).then((res) => res.text());
      injectCss(css, "clearblock-generic");
    } catch {
      // Still apply specific cosmetics if the generic sheet fails.
    }

    await applySpecific(host);
    startObserver();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => hideMatches(specificSelectors), { once: true });
    } else {
      hideMatches(specificSelectors);
    }
  }

  init();
})();
