(() => {
  const MAX_PER_PAGE = 80;
  let enabled = true;
  let hiddenCount = 0;
  let reported = 0;
  const hidden = new WeakSet();
  let specificSelectors = [];
  let observer = null;

  const BOOTSTRAP_CSS = `
.ad, .ads, .ad-banner, .ad-container, .ad-slot, .adbox,
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
iframe[id^="google_ads"], iframe[src*="doubleclick"], iframe[src*="googlesyndication"],
iframe[id^="google_ads_iframe"], [id*="google_ads_iframe"], [id^="div-gpt-ad"],
.dfp_ad--rendered, .dfp_ad--is-filled, .dfp_ad--held-area,
.fave-ad-playing #overlay-root, .fave-player-container.fave-ad-playing #overlay-root,
.fave-ad-playing .pui_ad, .fave-ad-slate,
.s-item--ad, .s-item__ad, .s-item--sponsored, .s-card--ad, .promoted-listing,
.s-result-item:has(.puis-sponsored-label-text),
.s-result-item:has(.sponsored-brand-label-info-desktop),
.sbv-video-container, .sb-video-creative, .rush-component.sbv-video-single-product,
.sbv-video-player, .AdHolder,
.s-widget-sponsored-label-text,
.s-widget-container:has(.s-widget-sponsored-label-text),
.atwb-carousel, .sbb-carousel-l:has(.attribution-text-l),
.plp-ninja-carousel:has(.attribution-text-l),
.attribution-text-l,
iframe[id^="google_ads_iframe"],
.np_AdSlot, .dailymotion-ad, .promoted-post, [data-promoted="true"],
.fc-ab-root, .fc-dialog, .fc-whitelist-blocking, [class^="fc-ab"],
.adblock-wall, .adblock-overlay, .adblock-modal, .adb-overlay, .adb-wall,
#adblock-notify, .please-disable-adblock, [class*="adblock-wall"],
[id*="adblock-wall"], [class*="disable-adblock"], .anti-adblock, .antiadblock,
[data-anti-adblock], .adblock-msg, .adblocker-msg, .ad-block-msg,
#blockadblock, .blockadblock, .fuckadblock, .adsbox-clone,
.spon-qp, [class*="sponsored-quick"], .sponsored-quick-post, .sponsored-quickpost,
[class*="sponsored-quickpost"],
.m-ad, .m-ad__dynamic_ad_unit, [class*="m-ad__dynamic"], [class*="m-ad__desktop"],
[class*="m-ad__medium_rectangle"], [class*="m-ad__sponsored"],
[class*="duet--ad-container"],
[class*="admiral"], .admiral-unit,
[data-lab-ad] {
  display: none !important;
}
`;

  const EXTRA_HIDE = [
    "[data-lab-ad]",
    ".fc-ab-root",
    ".fc-dialog",
    ".adblock-wall",
    ".adblock-overlay",
    ".adblock-modal",
    ".adb-overlay",
    ".please-disable-adblock",
    "[data-anti-adblock]",
    "ytd-enforcement-message-view-model",
    ".fave-ad-playing #overlay-root",
    ".fave-player-container.fave-ad-playing #overlay-root",
    ".s-item--ad",
    ".s-item--sponsored",
    ".promoted-listing",
    ".promoted-post",
    "[data-promoted='true']",
    ".np_AdSlot",
    ".dailymotion-ad",
    ".s-result-item:has(.puis-sponsored-label-text)",
    ".s-result-item:has(.sponsored-brand-label-info-desktop)",
    ".sbv-video-container",
    ".sb-video-creative",
    ".sbv-video-player",
    ".AdHolder",
    ".s-widget-sponsored-label-text",
    ".s-widget-container:has(.s-widget-sponsored-label-text)",
    ".atwb-carousel",
    ".sbb-carousel-l:has(.attribution-text-l)",
    ".plp-ninja-carousel:has(.attribution-text-l)",
    ".attribution-text-l",
    "iframe[id^='google_ads']",
    "iframe[id^='google_ads_iframe']",
    "[id^='google_ads_iframe']",
    "[id*='google_ads_iframe']",
    "[id^='div-gpt-ad']",
    ".dfp_ad--is-filled",
    ".dfp_ad--rendered",
    ".dfp_ad--held-area",
    ".spon-qp",
    "[class*='sponsored-quick']",
    ".sponsored-quickpost",
    "[class*='sponsored-quickpost']",
    ".m-ad",
    ".m-ad__dynamic_ad_unit",
    "[class*='m-ad__dynamic']",
    "[class*='m-ad__desktop']",
    "[class*='m-ad__medium_rectangle']",
    "[class*='m-ad__sponsored']",
    "[class*='duet--ad-container']",
    "[class*='admiral']",
    ".admiral-unit",
  ];

  const NAG_RE =
    /disable (your )?ad.?block|turn off (your )?ad.?block|whitelist (this|our|the) (site|ad)|allowlist .{0,48}|ad blockers? (are|is) not allowed|please (disable|turn off|whitelist).{0,24}ad.?block|allowed on youtube|allowing ads|using your ad blocker|continue using your ad blocker|support .{0,40}by allowing ads/i;

  const PROTECT_TAGS = new Set(["VIDEO", "AUDIO", "SOURCE", "TRACK", "CANVAS"]);

  function injectCss(cssText, id) {
    if (!cssText || document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = cssText;
    const root = document.documentElement || document.head;
    if (root) root.appendChild(style);
  }

  function isExplicitAdContainer(node) {
    if (!node || !node.matches) return false;
    try {
      if (
        node.matches(
          '[data-lab-ad], ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer, ytd-companion-slot-renderer, ytd-video-masthead-ad-v3-renderer, ytd-promoted-video-renderer, ins.adsbygoogle, .adsbygoogle, [id*="google_ads"], [id*="div-gpt-ad"], [class*="div-gpt-ad"], .OUTBRAIN, .taboola, [id^="taboola-"], .trc_rbox, [aria-label="Sponsored"], .fb-instream-ad, .ima-ad-container, .adblock-wall, .fc-ab-root, [data-anti-adblock], .s-item--ad, .AdHolder, .sbv-video-container, .puis-sponsored-label-text'
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
    if (node.id === "clearblock-bait") return true;
    if (isExplicitAdContainer(node)) return false;
    if (node.closest?.("[data-lab-ad], ytd-ad-slot-renderer, .fb-instream-ad, .ima-ad-container, .adblock-wall, .fc-ab-root")) {
      return false;
    }
    if (node.closest?.("video, audio, ytd-player, #movie_player, .html5-video-player, [data-lab-content='player']")) {
      return true;
    }
    if (node.querySelector?.("video, audio")) return true;
    return false;
  }

  function hideNode(node, force) {
    if (!node) return;
    if (!force && isProtected(node)) return;
    node.style.setProperty("display", "none", "important");
    if (hidden.has(node)) return;
    hidden.add(node);
    hiddenCount += 1;
  }

  function hideMatches(selectors, force) {
    if (!enabled || !selectors.length) return;
    for (const selector of selectors) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const node of nodes) hideNode(node, force);
    }
    flushCosmeticCount();
  }

  function dismissNags() {
    if (!enabled) return;
    const candidates = document.querySelectorAll(
      "div, aside, section, dialog, [role='dialog'], [role='alertdialog']"
    );
    for (const node of candidates) {
      if (isProtected(node)) continue;
      if (node.closest?.("[data-lab-content], #movie_player, video, article.web-article, .fb-post[data-lab-content]")) {
        continue;
      }
      const text = (node.innerText || node.textContent || "").replace(/\s+/g, " ").slice(0, 420);
      if (!NAG_RE.test(text)) continue;
      if (/sign in to confirm you.?re not a bot|confirm you.?re not a bot/i.test(text)) continue;
      const style = node.ownerDocument.defaultView.getComputedStyle(node);
      const position = style.position;
      const covers =
        position === "fixed" ||
        position === "sticky" ||
        /modal|overlay|wall|dialog|paywall|adblock|admiral/i.test(`${node.className} ${node.id}`);
      if (!covers) continue;
      hideNode(node, true);
    }
    flushCosmeticCount();
    const html = document.documentElement;
    const body = document.body;
    if (html && html.style.overflow === "hidden" && !document.querySelector(".adblock-wall:not([style*='display: none'])")) {
      html.style.removeProperty("overflow");
    }
    if (body && body.style.overflow === "hidden") {
      body.style.removeProperty("overflow");
    }
  }

  function plantBait() {
    if (document.getElementById("clearblock-bait")) return;
    const root = document.documentElement || document.body;
    if (!root) return;
    const bait = document.createElement("div");
    bait.id = "clearblock-bait";
    bait.className = "adsbox";
    bait.setAttribute("aria-hidden", "true");
    bait.style.cssText = "position:absolute;left:-10000px;top:auto;width:1px;height:1px;overflow:hidden;";
    bait.style.setProperty("display", "block", "important");
    bait.style.setProperty("visibility", "visible", "important");
    bait.style.setProperty("opacity", "1", "important");
    root.appendChild(bait);
  }

  function hideRetailSponsored() {
    if (!enabled) return;
    const nodes = document.querySelectorAll(
      "[data-test='container-cdui-item-wrapper'], [data-test='text-quill-insert-0'], .attribution-text-l, .s-widget-sponsored-label-text, .puis-sponsored-label-text"
    );
    for (const node of nodes) {
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (!/^sponsored\b/i.test(text)) continue;
      const card =
        node.closest(".atwb-carousel") ||
        node.closest(".plp-ninja-carousel") ||
        node.closest(".sbb-carousel-l") ||
        node.closest(".s-widget-container") ||
        node.closest(".s-result-item") ||
        node.closest("[data-test='ListingPageProductListing']") ||
        node.closest("a[data-test='content']") ||
        node.closest("[data-test='container-cdui']") ||
        node.parentElement;
      if (card && !card.querySelector?.("video.html5-main-video, #movie_player")) {
        hideNode(card, true);
      }
    }
  }

  function hidePublisherAdChrome() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll("*");
    } catch {
      return;
    }
    for (const node of nodes) {
      if (node.nodeType !== 1) continue;
      const cls = typeof node.className === "string" ? node.className : node.getAttribute?.("class") || "";
      if (!cls) continue;
      if (/(?:^|\s)(?:m-ad__|duet--ad-container)/.test(cls) || /(?:^|\s)m-ad(?:\s|$)/.test(cls)) {
        hideNode(node, true);
      }
    }
  }

  function hideAdvertisingContentCards() {
    if (!enabled) return;
    const nodes = document.querySelectorAll("div, article, aside, section");
    for (const node of nodes) {
      const raw = node.textContent;
      if (!raw || raw.length > 1600) continue;
      if (!/advertising content from/i.test(raw)) continue;
      const text = raw.replace(/\s+/g, " ").trim();
      if (!/\badvertising content from\b/i.test(text.slice(0, 120))) continue;
      hideNode(node, true);
    }
  }

  function hideBareAdLabels() {
    if (!enabled) return;
    const nodes = document.querySelectorAll("span, div, small, p, aside, figcaption");
    for (const node of nodes) {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      if (!/^(advertisement|advertisements)$/i.test(text)) continue;
      hideNode(node, true);
      let parent = node.parentElement;
      for (let i = 0; i < 4 && parent && parent !== document.body; i += 1) {
        const ptext = (parent.textContent || "").replace(/\s+/g, " ").trim();
        if (!/^(advertisement|advertisements)(\s+(advertisement|advertisements))*$/i.test(ptext)) break;
        hideNode(parent, true);
        parent = parent.parentElement;
      }
    }
  }

  function sweep() {
    document.documentElement?.setAttribute("data-clearblock", enabled ? "on" : "off");
    hideMatches(EXTRA_HIDE, true);
    hideMatches(specificSelectors, false);
    hideRetailSponsored();
    hidePublisherAdChrome();
    hideAdvertisingContentCards();
    hideBareAdLabels();
    dismissNags();
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
    const root = document.documentElement;
    if (!root) {
      document.addEventListener("DOMContentLoaded", startObserver, { once: true });
      return;
    }
    observer = new MutationObserver(() => sweep());
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "class", "id"],
    });
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
        hideMatches(specificSelectors, false);
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
    plantBait();
    try {
      const css = await fetch(chrome.runtime.getURL("rules/cosmetic-generic.css")).then((res) => res.text());
      injectCss(css, "clearblock-generic");
    } catch {
      // Still apply specific cosmetics if the generic sheet fails.
    }

    await applySpecific(host);
    startObserver();
    sweep();
    setInterval(sweep, 500);
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        plantBait();
        sweep();
      }, { once: true });
    }
  }

  init();
})();
