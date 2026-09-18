(() => {
  const SKIP_SELECTORS = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button-container button",
    ".ytp-ad-overlay-close-button",
    "button.ytp-ad-skip-button-slot",
    ".ytp-ad-overlay-close-container",
    ".ytp-skip-ad-button__text",
    ".ytp-ad-skip-button-slot button",
  ];

  const WALL_SELECTORS = [
    "ytd-enforcement-message-view-model",
    "tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)",
    ".yt-playability-error-supported-renderers",
    "ytd-popup-container:has(ytd-enforcement-message-view-model)",
  ];

  const NAG_RE =
    /ad blockers? (are|is) not allowed|disable (your )?ad.?block|turn off (your )?ad.?block|whitelist (this|our) (site|ad)|allowed on youtube/i;

  const AD_SRC_RE =
    /[?&](oad=1|ctier=L|ctia=)|\/pagead|doubleclick|googlesyndication|\/ptracking|\/api\/stats\/ads/i;

  const HIDE_CSS = `
#masthead-ad,
#player-ads,
#offer-module,
#premium-yoodle,
ytd-ad-slot-renderer,
ytd-display-ad-renderer,
ytd-in-feed-ad-layout-renderer,
ytd-banner-promo-renderer,
ytd-promoted-sparkles-web-renderer,
ytd-promoted-sparkles-text-search-renderer,
ytd-action-companion-ad-renderer,
ytd-player-legacy-desktop-watch-ads-renderer,
ytd-promoted-video-renderer,
ytd-companion-slot-renderer,
ytd-video-masthead-ad-v3-renderer,
ytd-video-masthead-ad-primary-video-renderer,
ytd-primetime-promo-renderer,
ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
ytd-reel-video-renderer:has(ytd-ad-slot-renderer),
ytd-compact-promoted-video-renderer,
ytd-ad-hovercard-button-renderer,
ad-slot-renderer,
.ytp-ad-overlay-slot,
.ytp-ad-text-overlay,
.ytp-ad-image-overlay,
.ytp-ad-overlay-container,
.ytp-ad-player-overlay-layout,
.ytp-ad-player-overlay,
.ytp-ad-player-overlay-instream-info,
.ytp-ad-text,
.ytp-ad-preview-container,
.ytp-ad-preview-image,
.ytp-ad-preview-text,
.ytp-ad-message-container,
.ytp-ad-info-dialog-container,
.ytp-ad-progress-list,
.ytp-ad-progress,
.ytp-ad-timed-pie-countdown-container,
.ytp-ad-skip-button-container,
.ytp-flyout-cta,
.ytp-ad-action-interstitial,
.ytp-ad-action-interstitial-slot,
.ytp-ad-action-interstitial-background,
.ytp-ad-module,
.ytp-ad-duration-remaining,
.ytp-paid-content-overlay,
.video-ads.ytp-ad-module,
ytd-mealbar-promo-renderer,
yt-mealbar-promo-renderer,
tp-yt-paper-dialog.ytd-popup-container ytd-mealbar-promo-renderer,
ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"],
ytd-enforcement-message-view-model,
tp-yt-paper-dialog:has(ytd-enforcement-message-view-model),
ytm-promoted-sparkles-text-search-renderer,
ytm-promoted-sparkles-web-renderer,
.ytd-watch-flexy ytd-ad-slot-renderer,
.ytp-suggested-action {
  display: none !important;
}
.html5-video-player.ad-showing .ytp-chrome-top,
#movie_player.ad-showing .ytp-chrome-top,
.html5-video-player.ad-showing .ytp-cards-teaser,
.html5-video-player.ad-showing [class*="ytp-ad-"] {
  display: none !important;
  opacity: 0 !important;
}
`;

  let enabled = true;
  let lastReport = { skip: 0, hide: 0, strip: 0 };
  let savedRate = 1;
  let savedMuted = false;
  let holdingAd = false;
  let heldVideo = null;
  let soughtThisAd = false;
  let savedTime = 0;

  function report(kind) {
    const now = Date.now();
    if (now - (lastReport[kind] || 0) < 3500) return;
    lastReport[kind] = now;
    try {
      chrome.runtime.sendMessage({ type: "youtubeAd", kind });
    } catch {
      // Ignore invalidated extension context.
    }
  }

  function injectCss() {
    if (document.getElementById("clearblock-youtube")) return;
    const root = document.documentElement || document.head;
    if (!root) {
      document.addEventListener("DOMContentLoaded", injectCss, { once: true });
      return;
    }
    const style = document.createElement("style");
    style.id = "clearblock-youtube";
    style.textContent = HIDE_CSS;
    root.appendChild(style);
  }

  function adPlayer() {
    return document.querySelector(".html5-video-player.ad-showing, #movie_player.ad-showing");
  }

  function mainVideo(player) {
    return (
      (player && player.querySelector("video.html5-main-video, video")) ||
      document.querySelector("video.html5-main-video, ytd-player video, #movie_player video")
    );
  }

  function clickSkips(player) {
    const root = player || document;
    for (const selector of SKIP_SELECTORS) {
      for (const button of root.querySelectorAll(selector)) {
        button.click();
        report("skip");
      }
    }
  }

  function isLabContentVideo(video) {
    if (!video || !video.closest) return false;
    return Boolean(video.closest("[data-lab-content='player'], .lab-content-player"));
  }

  function isLikelyInstreamAd(player, video) {
    if (!player || !video) return false;
    if (isLabContentVideo(video)) return false;
    const src = video.currentSrc || video.src || "";
    if (AD_SRC_RE.test(src)) return true;
    const duration = video.duration;
    const t = video.currentTime || 0;
    const hasSkip = SKIP_SELECTORS.some((selector) => player.querySelector(selector));
    if (hasSkip && Number.isFinite(duration) && duration > 0 && duration <= 45 && t < 2) return true;
    return false;
  }

  function playIfStuck(video) {
    if (!video) return;
    try {
      if (video.paused && !video.ended && video.readyState >= 2) {
        video.play().catch(() => {});
      }
    } catch {
      // Player swapped the element.
    }
  }

  function dismissAntiAdblock() {
    for (const selector of WALL_SELECTORS) {
      let nodes;
      try {
        nodes = document.querySelectorAll(selector);
      } catch {
        continue;
      }
      for (const wall of nodes) {
        wall.remove();
        report("hide");
      }
    }
    for (const node of document.querySelectorAll(".ytp-error, tp-yt-paper-dialog, ytd-popup-container")) {
      const text = (node.textContent || "").slice(0, 400);
      if (NAG_RE.test(text)) {
        node.remove();
        report("hide");
      }
    }
    const video = document.querySelector("#movie_player video, video.html5-main-video");
    playIfStuck(video);
  }

  function restoreContent() {
    if (!holdingAd) return;
    const video = heldVideo || document.querySelector("video.html5-main-video, #movie_player video, video");
    holdingAd = false;
    heldVideo = null;
    soughtThisAd = false;
    if (!video) return;
    try {
      const rate = savedRate > 0 && savedRate <= 2 ? savedRate : 1;
      video.playbackRate = rate;
      video.muted = savedMuted;
      if (
        Number.isFinite(savedTime) &&
        savedTime > 1 &&
        Number.isFinite(video.duration) &&
        video.currentTime >= video.duration - 0.2 &&
        savedTime < video.duration - 0.5
      ) {
        video.currentTime = savedTime;
      }
      playIfStuck(video);
    } catch {
      // Player may already have swapped the element.
    }
  }

  function skipIfAdPlaying() {
    if (!enabled) return;
    dismissAntiAdblock();
    const player = adPlayer();
    if (!player) {
      restoreContent();
      return;
    }
    const video = mainVideo(player);
    if (!video) return;
    if (!holdingAd) {
      const rate = video.playbackRate || 1;
      savedRate = rate > 0 && rate <= 2 ? rate : 1;
      savedMuted = video.muted;
      savedTime = video.currentTime || 0;
      holdingAd = true;
      heldVideo = video;
      soughtThisAd = false;
    }
    clickSkips(player);
    if (!player.classList.contains("ad-showing")) {
      restoreContent();
      report("skip");
      return;
    }
    if (!isLikelyInstreamAd(player, video)) {
      player.classList.remove("ad-showing");
      restoreContent();
      playIfStuck(video);
      report("skip");
      return;
    }
    try {
      video.muted = true;
      if (!soughtThisAd && Number.isFinite(video.duration) && video.duration > 0) {
        if (video.currentTime < video.duration - 0.05) {
          video.currentTime = video.duration;
          soughtThisAd = true;
        }
      } else if (!soughtThisAd) {
        video.playbackRate = 16;
      }
      report("skip");
    } catch {
      // Skip button still runs.
    }
  }

  function tick() {
    skipIfAdPlaying();
  }

  async function init() {
    try {
      if (typeof Clearblock !== "undefined") {
        const host = Clearblock.canonicalHost(location.hostname);
        const state = await Clearblock.readState();
        enabled = Clearblock.shouldBlock(state, host);
      }
    } catch {
      enabled = true;
    }
    document.documentElement?.setAttribute("data-clearblock", enabled ? "on" : "off");
    window.dispatchEvent(new CustomEvent("clearblock:config", { detail: { enabled } }));
    if (!enabled) return;
    injectCss();
    tick();
    setInterval(tick, 50);
    document.addEventListener("yt-navigate-finish", tick);
    document.addEventListener("yt-player-updated", tick);
    const root = document.documentElement;
    if (root) {
      const observer = new MutationObserver(tick);
      observer.observe(root, {
        subtree: true,
        attributes: true,
        attributeFilter: ["class"],
      });
    } else {
      document.addEventListener("DOMContentLoaded", init, { once: true });
    }
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== "clearblock-yt") return;
    if (!enabled) return;
    report(event.data.kind || "strip");
  });

  init();
})();
