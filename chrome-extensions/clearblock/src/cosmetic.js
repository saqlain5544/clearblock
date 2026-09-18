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
.s-widget-container:has([class*="ad-feedback-text"]),
.s-widget-container:has([class*="adFeedback"]),
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
[data-optidigital-slot], [id^="optidigital-adslot-"], .optidigital-wrapper-div,
.min-h-\\[250px\\]:has([data-optidigital-slot]),
.min-h-\\[350px\\]:has([data-optidigital-slot]),
.min-h-\\[250px\\]:has(.optidigital-wrapper-div),
.min-h-\\[350px\\]:has(.optidigital-wrapper-div),
[data-testid="sponsored-tag"], [data-sponsored-id],
.cls-stream-ad, .yahoo-nebula-dense-native-ad, .yahoo-nebula-ad-placeholder-image,
[class*="dlRRad"], .m-static-gam, .dl__slide--ad, [data-type="benji:placeholder"],
.m-dispatcher--sticky-footer, #m-dispatcher-sticky-footer,
iframe[src*="dispatcher.aol.com/offers"],
a.me-stripe-tile-button:has(.me-stripe-title-subtitle),
.me-stripe-title-subtitle,
#displayAdCard, #displayAdBanner,
[id^="nativead-"],
.ad-banner-wrapper, .display-ads-container,
.ad-slug, .sponsored-text.ad-label, a.ad-label-text,
.hha-sponsored, .header-highlighted-area__container:has(.hha-sponsored),
.header-highlighted-area__container:has(a[href*="sponsor-content"]),
.item--topic-placeholder,
[data-testid="ad-unit"], [data-component="ad-slot"], .dotcom-ad, #dotcom-top,
[data-component="leaderboard-ad"], [data-component="box-ad"], [data-component="immersive-ad"],
[class*="media-ui-BaseAd_"], [class*="media-ui-BoxAd_"],
[class*="media-ui-ImmersiveAd_"], [class*="media-ui-FullWidthAd_fullWidthAd"],
[class*="BaseAd_adPlaceholder"],
[role="region"][aria-label="Advertisement"],
[role="region"][aria-label*="advertisement" i],
.SportsAd, [class*="SportsAd--"], .ad-leader-middle, .ad-leader-plus-top,
.ad-skybox-sticky, .ad-intromercial, .ad-gambling-partner,
#leader_middle, #leader_plus_top, #skybox_sticky, #intromercial,
[data-ad-unit="leader_middle"], [data-ad="leader-middle"],
[data-pogo], [data-pogo="main"], [data-pogo="footer"], [data-pogo="top"], [data-pogo="sidebar"],
.begenuin-widget, .gen-sdk-class, [id^="gen-sdk"], [data-genuin-host],
a.zd-featured-deals__card[data-zd-track-item-name^="Sponsored:"],
a.zd-featured-deals__card[data-zd-track-item-name^="sponsored:"],
.zd-featured-deals__card[data-zd-track-item-name^="Sponsored:"],
.zd-featured-deals__card[data-zd-track-item-name^="sponsored:"],
.fairplay-container, .fairplay-container.Offer, [data-qa="fair-play-component"],
oc-connect-widget,
fbs-ad, .fbs-ad--top-wrapper, [class*="fbs-ad--"],
.body-cheat__identifier--branded,
.bc_right_sidebar a[href*="/rd/"],
.bc_right_sidebar a[href*="utm_medium=sponsor"],
.featured-posts-banner, .featured-posts-banner-container,
[class*="Content_SponsorSlug"],
[data-lab-ad] {
  display: none !important;
}
.aol-grid:has(> [class*="dlRRad"]) > .dl-container {
  grid-column: 1 / -1 !important;
  width: 100% !important;
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
    ".s-widget-container:has([class*='ad-feedback-text'])",
    ".s-widget-container:has([class*='adFeedback'])",
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
    "[data-optidigital-slot]",
    "[id^='optidigital-adslot-']",
    ".optidigital-wrapper-div",
    ".min-h-\\[250px\\]:has([data-optidigital-slot])",
    ".min-h-\\[350px\\]:has([data-optidigital-slot])",
    ".min-h-\\[250px\\]:has(.optidigital-wrapper-div)",
    ".min-h-\\[350px\\]:has(.optidigital-wrapper-div)",
    "[data-testid='sponsored-tag']",
    "[data-sponsored-id]",
    ".cls-stream-ad",
    ".yahoo-nebula-dense-native-ad",
    ".yahoo-nebula-ad-placeholder-image",
    "[class*='dlRRad']",
    ".m-static-gam",
    ".dl__slide--ad",
    "[data-type='benji:placeholder']",
    ".m-dispatcher--sticky-footer",
    "#m-dispatcher-sticky-footer",
    "iframe[src*='dispatcher.aol.com/offers']",
    "a.me-stripe-tile-button:has(.me-stripe-title-subtitle)",
    ".me-stripe-title-subtitle",
    "#displayAdCard",
    "#displayAdBanner",
    "[id^='nativead-']",
    ".ad-banner-wrapper",
    ".display-ads-container",
    ".ad-slug",
    ".sponsored-text.ad-label",
    "a.ad-label-text",
    ".hha-sponsored",
    ".header-highlighted-area__container:has(.hha-sponsored)",
    ".header-highlighted-area__container:has(a[href*='sponsor-content'])",
    ".item--topic-placeholder",
    "[data-testid='ad-unit']",
    "[data-component='ad-slot']",
    ".dotcom-ad",
    "#dotcom-top",
    '[data-component="leaderboard-ad"]',
    '[data-component="box-ad"]',
    '[data-component="immersive-ad"]',
    '[class*="media-ui-BaseAd_"]',
    '[class*="media-ui-BoxAd_"]',
    '[class*="media-ui-ImmersiveAd_"]',
    '[class*="media-ui-FullWidthAd_fullWidthAd"]',
    '[class*="BaseAd_adPlaceholder"]',
    '[role="region"][aria-label="Advertisement"]',
    '[role="region"][aria-label*="advertisement" i]',
    ".SportsAd",
    '[class*="SportsAd--"]',
    ".ad-leader-middle",
    ".ad-leader-plus-top",
    ".ad-skybox-sticky",
    ".ad-intromercial",
    ".ad-gambling-partner",
    "#leader_middle",
    "#leader_plus_top",
    "#skybox_sticky",
    "#intromercial",
    '[data-ad-unit="leader_middle"]',
    '[data-ad="leader-middle"]',
    "[data-pogo]",
    '[data-pogo="main"]',
    '[data-pogo="footer"]',
    '[data-pogo="top"]',
    '[data-pogo="sidebar"]',
    ".begenuin-widget",
    ".gen-sdk-class",
    '[id^="gen-sdk"]',
    "[data-genuin-host]",
    'a.zd-featured-deals__card[data-zd-track-item-name^="Sponsored:"]',
    'a.zd-featured-deals__card[data-zd-track-item-name^="sponsored:"]',
    '.zd-featured-deals__card[data-zd-track-item-name^="Sponsored:"]',
    '.zd-featured-deals__card[data-zd-track-item-name^="sponsored:"]',
    ".fairplay-container",
    ".fairplay-container.Offer",
    '[data-qa="fair-play-component"]',
    "oc-connect-widget",
    "fbs-ad",
    ".fbs-ad--top-wrapper",
    '[class*="fbs-ad--"]',
    ".body-cheat__identifier--branded",
    '.bc_right_sidebar a[href*="/rd/"]',
    '.bc_right_sidebar a[href*="utm_medium=sponsor"]',
    ".featured-posts-banner",
    ".featured-posts-banner-container",
    '[class*="Content_SponsorSlug"]',
  ];

  const NAG_RE =
    /disable (your |my |any )?ad.?block|disabl(?:e|ing) .{0,40}ad.?block|turn(?:ing)? off .{0,40}ad.?block|whitelist (this|our|the) (site|ad)|allowlist .{0,48}|ad blockers? (are|is) not allowed|please (disable|turn off|whitelist).{0,24}ad.?block|allowed on youtube|allowing ads|\ballow ads\b|using (an |your |a )?ad.?block|continue using your ad blocker|support .{0,40}by allowing ads|ad or script blocking|script blocking software|interfering with this page|disable .{0,40}blocking software|it looks like you.?re using an ad.?block|powered by admiral/i;

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
          '[data-lab-ad], ytd-ad-slot-renderer, ytd-display-ad-renderer, ytd-in-feed-ad-layout-renderer, ytd-promoted-sparkles-web-renderer, ytd-companion-slot-renderer, ytd-video-masthead-ad-v3-renderer, ytd-promoted-video-renderer, fbs-ad, ins.adsbygoogle, .adsbygoogle, [id*="google_ads"], [id*="div-gpt-ad"], [class*="div-gpt-ad"], .OUTBRAIN, .taboola, [id^="taboola-"], .trc_rbox, [aria-label="Sponsored"], .fb-instream-ad, .ima-ad-container, .adblock-wall, .fc-ab-root, [data-anti-adblock], .s-item--ad, .AdHolder, .sbv-video-container, .puis-sponsored-label-text'
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
    forEachRoot((root) => hideMatchesInRoot(root, selectors, force));
    flushCosmeticCount();
  }

  function hideMatchesInRoot(root, selectors, force) {
    for (const selector of selectors) {
      let nodes;
      try {
        nodes = root.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const node of nodes) hideNode(node, force);
    }
  }

  function shadowRootOf(node) {
    if (!node || node.nodeType !== 1) return null;
    try {
      if (node.shadowRoot) return node.shadowRoot;
    } catch {
      // Closed or forbidden.
    }
    try {
      if (typeof chrome !== "undefined" && chrome.dom?.openOrClosedShadowRoot) {
        return chrome.dom.openOrClosedShadowRoot(node);
      }
    } catch {
      // API missing in this world.
    }
    return null;
  }

  function forEachRoot(fn) {
    const seen = new Set();
    const walk = (root) => {
      if (!root || seen.has(root)) return;
      seen.add(root);
      try {
        fn(root);
      } catch {
        // A detached root should not abort the sweep.
      }
      let nodes;
      try {
        nodes = root.querySelectorAll("*");
      } catch {
        return;
      }
      for (const n of nodes) {
        const sr = shadowRootOf(n);
        if (sr) walk(sr);
      }
    };
    walk(document);
  }

  const SHADOW_HIDE_CSS = `
a.me-stripe-tile-button:has(.me-stripe-title-subtitle),
.me-stripe-title-subtitle,
#displayAdCard, #displayAdBanner,
[id^="nativead-"],
.ad-banner-wrapper, .display-ads-container,
.ad-slug, .sponsored-text.ad-label, a.ad-label, a.ad-label-text
{ display: none !important; }
`;

  function injectCssInRoot(root, cssText, id) {
    if (!root || !cssText) return;
    try {
      if (root.getElementById && root.getElementById(id)) return;
    } catch {
      return;
    }
    const style = document.createElement("style");
    style.id = id;
    style.textContent = cssText;
    const mount = root.head || root;
    try {
      mount.appendChild(style);
    } catch {
      // Some roots reject styles.
    }
  }

  function hideMsnNativeAds() {
    if (!enabled) return;
    forEachRoot((root) => {
      injectCssInRoot(root, SHADOW_HIDE_CSS, "clearblock-msn");
      hideMatchesInRoot(
        root,
        [
          "a.me-stripe-tile-button:has(.me-stripe-title-subtitle)",
          "#displayAdCard",
          "#displayAdBanner",
          "[id^='nativead-']",
          ".ad-banner-wrapper",
          ".display-ads-container",
        ],
        true
      );
      let tiles;
      try {
        tiles = root.querySelectorAll("a.me-stripe-tile-button");
      } catch {
        tiles = [];
      }
      for (const tile of tiles) {
        const text = (tile.innerText || "").replace(/\s+/g, " ").trim();
        if (/\bad$/i.test(text) && !/outlook|facebook|rewards|microsoft 365/i.test(text)) {
          hideNode(tile, true);
        }
      }
      let slugs;
      try {
        slugs = root.querySelectorAll(".ad-slug, .sponsored-text.ad-label, a.ad-label, a.ad-label-text");
      } catch {
        slugs = [];
      }
      for (const slug of slugs) {
        const card =
          slug.closest?.("cs-content-card") ||
          slug.closest?.("cs-responsive-card") ||
          slug.closest?.("[id^='nativead-']");
        if (card && !card.querySelector?.("video, audio, #movie_player")) hideNode(card, true);
        else hideNode(slug, true);
      }
    });
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
      "[data-test='container-cdui-item-wrapper'], [data-test='text-quill-insert-0'], .attribution-text-l, .s-widget-sponsored-label-text, .puis-sponsored-label-text, [class*='ad-feedback-text'], [class*='adFeedback'], [data-testid='sponsored-tag'], .ProductTile-content span, [data-comp*='ProductTile'] span, [data-comp*='ProductTile'], p.h-text-sm.h-margin-t-tiny, [data-test='item-link'] p"
    );
    for (const node of nodes) {
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (!/^sponsored\b/i.test(text)) continue;
      const itemCard = node.closest("[data-test^='item-card-']");
      const carouselItem = itemCard?.closest("li") || node.closest("[data-test='item-link']")?.closest("li");
      const card =
        carouselItem ||
        itemCard ||
        node.closest("[data-comp*='ProductTile']") ||
        node.closest("[data-sponsored-id]") ||
        node.closest(".atwb-carousel") ||
        node.closest(".plp-ninja-carousel") ||
        node.closest(".sbb-carousel-l") ||
        node.closest(".s-widget-container") ||
        node.closest(".s-result-item") ||
        node.closest("[data-test='ListingPageProductListing']") ||
        node.closest("a[data-test='content']") ||
        node.closest("[data-test='container-cdui']") ||
        node.parentElement;
      if (!card || card === document.body) continue;
      if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER|UL|OL)$/i.test(card.tagName)) continue;
      if (card.querySelector?.("video.html5-main-video, #movie_player")) continue;
      hideNode(card, true);
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
    const nodes = document.querySelectorAll("div, article, aside, section, li");
    for (const node of nodes) {
      const raw = node.textContent;
      if (!raw || raw.length > 1600) continue;
      const text = raw.replace(/\s+/g, " ").trim();
      if (/^trending:/i.test(text)) continue;
      if (!/^(?:advertising content from|sponsored:\s*content from)\b/i.test(text)) continue;
      if (node.querySelector?.("video, audio, #movie_player, .hha-trending")) continue;
      hideNode(node, true);
    }
    for (const node of document.querySelectorAll(".hha-sponsored, a[href*='sponsor-content']")) {
      const card =
        node.closest(".header-highlighted-area__container") ||
        node.closest("li") ||
        node;
      if (card?.querySelector?.(".hha-trending, video, audio, #movie_player")) continue;
      if (card) hideNode(card, true);
    }
    for (const node of document.querySelectorAll(".item--topic-placeholder")) {
      const video = node.querySelector?.("video");
      if (video && video.videoWidth > 0) continue;
      hideNode(node, true);
    }
  }

  function isAdvertisementLabelText(value) {
    const text = String(value || "")
      .replace(/["']/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (!text || /^(none|normal|auto)$/i.test(text)) return false;
    return /^(advertisement|advertisements)$/i.test(text);
  }

  function pseudoContent(node, which) {
    try {
      return getComputedStyle(node, which).content || "";
    } catch {
      return "";
    }
  }

  function hideBareAdLabels() {
    if (!enabled) return;
    const nodes = document.querySelectorAll("span, div, small, p, aside, figcaption, section, fbs-ad");
    for (const node of nodes) {
      const text = (node.textContent || "").replace(/\s+/g, " ").trim();
      const before = pseudoContent(node, "::before");
      const after = pseudoContent(node, "::after");
      if (
        !isAdvertisementLabelText(text) &&
        !isAdvertisementLabelText(before) &&
        !isAdvertisementLabelText(after)
      ) {
        continue;
      }
      if (text.length > 80 && !isAdvertisementLabelText(text)) continue;
      if (node.querySelector?.("video, audio, #movie_player")) continue;
      hideNode(node, true);
      let parent = node.parentElement;
      for (let i = 0; i < 4 && parent && parent !== document.body; i += 1) {
        if (parent.querySelector?.("video, audio, #movie_player")) break;
        if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER)$/i.test(parent.tagName)) break;
        const ptext = (parent.textContent || "").replace(/\s+/g, " ").trim();
        const cls = typeof parent.className === "string" ? parent.className : parent.getAttribute?.("class") || "";
        const wrapper = /media-ui-(?:BaseAd|BoxAd|ImmersiveAd|FullWidthAd_fullWidthAd)|adPlaceholder/i.test(cls);
        if (ptext.length > 200) break;
        if (ptext && !isAdvertisementLabelText(ptext) && !wrapper) break;
        hideNode(parent, true);
        parent = parent.parentElement;
      }
    }
  }

  function hidePogoSlots() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll("[data-pogo]");
    } catch {
      return;
    }
    for (const node of nodes) {
      const video = node.querySelector?.("video");
      if (video && video.videoWidth > 0) continue;
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (text.length > 80) continue;
      hideNode(node, true);
      let parent = node.parentElement;
      for (let i = 0; i < 3 && parent && parent !== document.body; i += 1) {
        if (parent.querySelector?.("video, audio, #movie_player")) break;
        if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER)$/i.test(parent.tagName)) break;
        const ptext = (parent.innerText || "").replace(/\s+/g, " ").trim();
        if (ptext.length > 40) break;
        hideNode(parent, true);
        parent = parent.parentElement;
      }
    }
  }

  function hideBegeninSlots() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll(".begenuin-widget, .gen-sdk-class, [id^='gen-sdk'], [data-genuin-host]");
    } catch {
      return;
    }
    for (const node of nodes) {
      const video = node.querySelector?.("video");
      if (video && video.videoWidth > 0) continue;
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (text.length > 80) continue;
      hideNode(node, true);
      const wrap = node.closest?.(".row-module-and-ad");
      if (wrap && wrap !== node && !(wrap.querySelector?.("video")?.videoWidth > 0)) {
        const wtext = (wrap.innerText || "").replace(/\s+/g, " ").trim();
        if (wtext.length <= 40) hideNode(wrap, true);
      }
    }
  }

  function isCNetSponsoredDealCard(card) {
    if (!card || card.nodeType !== 1) return false;
    if (card.matches?.(".zd-featured-deals, .zd-featured-deals__grid, .zd-featured-deals__header")) return false;
    const name = (card.getAttribute?.("data-zd-track-item-name") || "").trim();
    if (/^sponsored\s*:/i.test(name)) return true;
    let title = "";
    try {
      title = (card.querySelector?.(":scope .zd-featured-deals__card-title")?.innerText || "").replace(/\s+/g, " ").trim();
    } catch {
      title = (card.querySelector?.(".zd-featured-deals__card-title")?.innerText || "").replace(/\s+/g, " ").trim();
    }
    return /^sponsored\s*:/i.test(title);
  }

  function hideCNetSponsoredDeals() {
    if (!enabled) return;
    let cards;
    try {
      cards = document.querySelectorAll("a.zd-featured-deals__card, .zd-featured-deals__card");
    } catch {
      return;
    }
    for (const card of cards) {
      if (!isCNetSponsoredDealCard(card)) continue;
      if (card.querySelector?.("video")?.videoWidth > 0) continue;
      hideNode(card, true);
      const wrap = card.closest?.(".zd-featured-deals__card-wrapper");
      if (!wrap || wrap === card) continue;
      if (wrap.matches?.(".zd-featured-deals, .zd-featured-deals__grid, .zd-featured-deals__header")) continue;
      if (wrap.querySelector?.("video")?.videoWidth > 0) continue;
      const organic = [...(wrap.querySelectorAll?.(".zd-featured-deals__card") || [])].filter(
        (other) => other !== card && !isCNetSponsoredDealCard(other)
      );
      if (organic.length) continue;
      hideNode(wrap, true);
    }
  }

  function hideFoxSportsBetOffers() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll(
        '.fairplay-container, [data-qa="fair-play-component"], oc-connect-widget'
      );
    } catch {
      return;
    }
    for (const node of nodes) {
      if (node.querySelector?.("video")?.videoWidth > 0) continue;
      const cls = typeof node.className === "string" ? node.className : node.getAttribute?.("class") || "";
      if (/headlines-comp|newsletter|layout-content-container|right-rail-content|fscom-main|featured/i.test(cls)) continue;
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (/featured stories/i.test(text) && text.length > 120) continue;
      hideNode(node, true);
      const wrap = node.parentElement;
      if (!wrap || wrap === document.body) continue;
      const wcls = typeof wrap.className === "string" ? wrap.className : wrap.getAttribute?.("class") || "";
      if (/right-rail-content|layout-content-container|fscom-main-content|body-content|home wide/i.test(wcls)) continue;
      if (wrap.querySelector?.("video")?.videoWidth > 0) continue;
      const wtext = (wrap.innerText || "").replace(/\s+/g, " ").trim();
      if (/featured stories/i.test(wtext)) continue;
      if (/fairplay|\bOffer\b/i.test(wcls) || wrap.getAttribute?.("data-qa") === "fair-play-component") {
        hideNode(wrap, true);
      }
    }
  }

  function hideIndependentSponsoredCards() {
    if (!enabled) return;
    let cards;
    try {
      cards = document.querySelectorAll("article");
    } catch {
      return;
    }
    for (const card of cards) {
      if (card.querySelector?.("video")?.videoWidth > 0) continue;
      const text = (card.innerText || "").replace(/\s+/g, " ").trim();
      if (!/^sponsored\b/i.test(text) || text.length > 400) continue;
      let labeled = false;
      try {
        labeled = [...card.querySelectorAll("p, div, span, small")].some((n) =>
          /^sponsored$/i.test((n.innerText || "").replace(/\s+/g, " ").trim())
        );
      } catch {
        labeled = false;
      }
      if (!labeled) continue;
      hideNode(card, true);
      const wrap = card.parentElement;
      if (!wrap || wrap === document.body) continue;
      if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER)$/i.test(wrap.tagName)) continue;
      if (wrap.querySelector?.("video")?.videoWidth > 0) continue;
      const wtext = (wrap.innerText || "").replace(/\s+/g, " ").trim();
      if (/latest videos|travel\b|politics|midterms/i.test(wtext)) continue;
      const organic = [...(wrap.querySelectorAll?.("article") || [])].filter((other) => {
        if (other === card) return false;
        const ot = (other.innerText || "").replace(/\s+/g, " ").trim();
        return ot && !/^sponsored\b/i.test(ot);
      });
      if (organic.length) continue;
      if (wtext.length > 500) continue;
      hideNode(wrap, true);
    }
    let headings;
    try {
      headings = document.querySelectorAll("h1, h2, h3, h4, div, section, header");
    } catch {
      headings = [];
    }
    for (const node of headings) {
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (!/^partner content$/i.test(text)) continue;
      if (node.querySelector?.("video")?.videoWidth > 0) continue;
      if (node.querySelector?.("article")) continue;
      hideNode(node, true);
    }
  }

  function hideDailyBeastPartnerCards() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll(".body-cheat__identifier--branded");
    } catch {
      return;
    }
    for (const node of nodes) {
      if (node.querySelector?.("video")?.videoWidth > 0) continue;
      const card = node.closest("li") || node.parentElement;
      if (!card || card === document.body) continue;
      if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER|UL|OL)$/i.test(card.tagName) && card.tagName !== "LI") continue;
      if (card.querySelector?.("video")?.videoWidth > 0) continue;
      const text = (card.innerText || "").replace(/\s+/g, " ").trim();
      if (/shop with scouted/i.test(text) && !/partner update/i.test(text)) continue;
      hideNode(card, true);
    }
  }

  function hideBleepingComputerLeftovers() {
    if (!enabled) return;
    let banners;
    try {
      banners = document.querySelectorAll(
        ".bc_right_sidebar a[href*='/rd/'], .bc_right_sidebar a[href*='utm_medium=sponsor']"
      );
    } catch {
      banners = [];
    }
    for (const a of banners) {
      if (a.querySelector?.("video")?.videoWidth > 0) continue;
      hideNode(a, true);
      let wrap = a.parentElement;
      for (let i = 0; i < 3 && wrap && wrap !== document.body; i += 1) {
        const wcls = typeof wrap.className === "string" ? wrap.className : wrap.getAttribute?.("class") || "";
        const wid = wrap.id || "";
        if (/bc_right_sidebar|bc_main_content|bc_wrapper|container|\brow\b|pop_stories/i.test(wcls + " " + wid)) break;
        if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER)$/i.test(wrap.tagName)) break;
        if (wrap.querySelector?.("video")?.videoWidth > 0) break;
        const wtext = (wrap.innerText || "").replace(/\s+/g, " ").trim();
        if (/popular stories|latest articles/i.test(wtext)) break;
        if (wtext.length > 80) break;
        hideNode(wrap, true);
        wrap = wrap.parentElement;
      }
    }
    try {
      for (const n of document.querySelectorAll(".bc_right_sidebar > div")) {
        if ((n.id || "") === "pop_stories") continue;
        if (n.querySelector?.("video")?.videoWidth > 0) continue;
        const t = (n.innerText || "").replace(/\s+/g, " ").trim();
        if (/^sponsor posts$/i.test(t)) hideNode(n, true);
      }
    } catch {
      /* ignore */
    }
    let authors;
    try {
      authors = document.querySelectorAll("li.bc_news_author");
    } catch {
      return;
    }
    for (const author of authors) {
      const t = (author.innerText || "").replace(/\s+/g, " ").trim();
      if (!/\bsponsorship\b/i.test(t)) continue;
      let card = author.parentElement;
      while (card && card !== document.body) {
        if (card.tagName === "LI" && !card.classList?.contains("bc_news_author")) break;
        card = card.parentElement;
      }
      if (!card || card === document.body) continue;
      if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER|UL|OL)$/i.test(card.tagName) && card.tagName !== "LI") continue;
      if (card.querySelector?.("video")?.videoWidth > 0) continue;
      const ctext = (card.innerText || "").replace(/\s+/g, " ").trim();
      if (/popular stories/i.test(ctext) && ctext.length > 160) continue;
      hideNode(card, true);
    }
  }

  function hideAthleticSponsorSlugs() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll('[class*="Content_SponsorSlug"]');
    } catch {
      return;
    }
    for (const node of nodes) {
      if (node.querySelector?.("video")?.videoWidth > 0) continue;
      hideNode(node, true);
      const card = node.closest("article, li") || node.parentElement;
      if (!card || card === document.body) continue;
      if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER|UL|OL)$/i.test(card.tagName) && card.tagName !== "LI" && card.tagName !== "ARTICLE") continue;
      if (card.querySelector?.("video")?.videoWidth > 0) continue;
      const text = (card.innerText || "").replace(/\s+/g, " ").trim();
      if (text.length > 400) continue;
      if (!/sponsored by/i.test(text)) continue;
      hideNode(card, true);
    }
  }

  function hideNineToFiveLeftovers() {
    if (!enabled) return;
    let banners;
    try {
      banners = document.querySelectorAll(".featured-posts-banner, .featured-posts-banner-container");
    } catch {
      banners = [];
    }
    for (const node of banners) {
      if (node.querySelector?.("video")?.videoWidth > 0) continue;
      if (node.matches?.("#river, .river, .river__posts, main, header, nav, footer")) continue;
      hideNode(node, true);
    }
    let slots;
    try {
      slots = document.querySelectorAll(".sidebar .hide-sm.no-sticky, aside.sidebar .hide-sm.no-sticky");
    } catch {
      return;
    }
    for (const node of slots) {
      if (node.querySelector?.("video")?.videoWidth > 0) continue;
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (!/^ad\b/i.test(text) || text.length > 200) continue;
      hideNode(node, true);
    }
  }

  function hideForbesAdSlots() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll("fbs-ad, .fbs-ad--top-wrapper, [class*='fbs-ad--']");
    } catch {
      return;
    }
    for (const node of nodes) {
      if (node.querySelector?.("video")?.videoWidth > 0) continue;
      hideNode(node, true);
      const wrap = node.parentElement;
      if (!wrap || wrap === document.body) continue;
      if (/^(MAIN|ARTICLE|HEADER|NAV|FOOTER)$/i.test(wrap.tagName)) continue;
      if (wrap.querySelector?.("video")?.videoWidth > 0) continue;
      const wcls = typeof wrap.className === "string" ? wrap.className : wrap.getAttribute?.("class") || "";
      const wtext = (wrap.innerText || "").replace(/\s+/g, " ").trim();
      if (/billionaires|money & markets|daily cover|read the full story/i.test(wtext) && wtext.length > 80) continue;
      if (/fbs-ad/i.test(wcls) && (wtext.length < 80 || /^(advertisement)?$/i.test(wtext))) {
        hideNode(wrap, true);
      }
    }
  }

  function hideBloombergAdSlots() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll(
        '[data-component="leaderboard-ad"], [data-component="box-ad"], [data-component="immersive-ad"], [class*="media-ui-BaseAd_"], [class*="media-ui-BoxAd_"], [class*="media-ui-ImmersiveAd_"], [class*="media-ui-FullWidthAd_fullWidthAd"]'
      );
    } catch {
      return;
    }
    for (const node of nodes) {
      const video = node.querySelector?.("video");
      if (video && video.videoWidth > 0) continue;
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (text.length > 80 && /we.?ve updated our terms|terms of service/i.test(text)) continue;
      hideNode(node, true);
      let parent = node.parentElement;
      for (let i = 0; i < 3 && parent && parent !== document.body; i += 1) {
        if (parent.querySelector?.("video, audio, #movie_player")) break;
        const ptext = (parent.innerText || "").replace(/\s+/g, " ").trim();
        if (/we.?ve updated our terms/i.test(ptext)) break;
        const cls = typeof parent.className === "string" ? parent.className : parent.getAttribute?.("class") || "";
        const wrapper = /media-ui-(?:BaseAd|BoxAd|ImmersiveAd|FullWidthAd_fullWidthAd)/i.test(cls);
        if (ptext.length > 200) break;
        if (!wrapper && ptext && ptext.length > 40) break;
        if (!wrapper && ptext) break;
        hideNode(parent, true);
        parent = parent.parentElement;
      }
    }
  }

  function hideSportsAdSlots() {
    if (!enabled) return;
    let nodes;
    try {
      nodes = document.querySelectorAll(
        ".SportsAd, [class*='SportsAd--'], .ad-leader-middle, .ad-leader-plus-top, .ad-skybox-sticky, .ad-intromercial, #leader_middle, #leader_plus_top, [data-ad-unit='leader_middle'], [data-ad='leader-middle']"
      );
    } catch {
      return;
    }
    for (const node of nodes) {
      const video = node.querySelector?.("video");
      if (video && video.videoWidth > 0) continue;
      const text = (node.innerText || "").replace(/\s+/g, " ").trim();
      if (text.length > 80) continue;
      hideNode(node, true);
      const wrap = node.closest?.(".leaderboard-wrap, .AdBlock");
      if (wrap && wrap !== node && !(wrap.querySelector?.("video")?.videoWidth > 0)) {
        const wtext = (wrap.innerText || "").replace(/\s+/g, " ").trim();
        if (wtext.length <= 40) hideNode(wrap, true);
      }
    }
  }

  function hideOptidigitalSlots() {
    if (!enabled) return;
    const nodes = document.querySelectorAll(
      "[data-optidigital-slot], [id^='optidigital-adslot-'], .optidigital-wrapper-div"
    );
    for (const node of nodes) {
      if (node.tagName === "SCRIPT" || node.tagName === "STYLE") continue;
      hideNode(node, true);
      let parent = node.parentElement;
      for (let i = 0; i < 5 && parent && parent !== document.body; i += 1) {
        if (parent.id === "app" || parent.id === "main" || parent.tagName === "BODY") break;
        if (parent.querySelector?.("video, audio, #movie_player")) break;
        const text = (parent.innerText || "").replace(/\s+/g, " ").trim();
        const cls = typeof parent.className === "string" ? parent.className : parent.getAttribute?.("class") || "";
        const empty = !text || /^(advertisement|advertisements)$/i.test(text);
        const placeholder = /min-h-\[(?:250|350)px\]|optidigital|bg-neutral-100|bg-neutral-800/.test(cls);
        if (!empty) break;
        if (i === 0 || placeholder) hideNode(parent, true);
        else break;
        parent = parent.parentElement;
      }
    }
  }

  function hideAolLeftovers() {
    if (!enabled) return;
    for (const grid of document.querySelectorAll(".aol-grid")) {
      const rail = grid.querySelector(":scope > [class*='dlRRad'], :scope > .m-static-gam");
      if (!rail) continue;
      hideNode(rail, true);
      const dl = grid.querySelector(":scope > .dl-container");
      if (!dl || dl.querySelector?.("video, audio, #movie_player")) continue;
      dl.style.setProperty("grid-column", "1 / -1", "important");
      dl.style.setProperty("width", "100%", "important");
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
    hidePogoSlots();
    hideBegeninSlots();
    hideCNetSponsoredDeals();
    hideFoxSportsBetOffers();
    hideForbesAdSlots();
    hideIndependentSponsoredCards();
    hideDailyBeastPartnerCards();
    hideBleepingComputerLeftovers();
    hideAthleticSponsorSlugs();
    hideNineToFiveLeftovers();
    hideBloombergAdSlots();
    hideSportsAdSlots();
    hideOptidigitalSlots();
    hideMsnNativeAds();
    hideAolLeftovers();
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

  const observedRoots = new WeakSet();

  function startObserver() {
    if (observer || !enabled) return;
    const root = document.documentElement;
    if (!root) {
      document.addEventListener("DOMContentLoaded", startObserver, { once: true });
      return;
    }
    observer = new MutationObserver(() => {
      observeShadowRoots();
      sweep();
    });
    observeShadowRoots();
  }

  function observeShadowRoots() {
    if (!observer) return;
    forEachRoot((root) => {
      const target = root === document ? document.documentElement : root;
      if (!target || observedRoots.has(target)) return;
      observedRoots.add(target);
      try {
        observer.observe(target, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ["style", "class", "id"],
        });
      } catch {
        // Some shadow roots reject observers.
      }
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
