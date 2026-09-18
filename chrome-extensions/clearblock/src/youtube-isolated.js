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
ytd-promoted-sparkles-web-renderer,
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
.ytp-error:has(.ytp-error-content-wrap-reason),
ytm-promoted-sparkles-text-search-renderer,
ytm-promoted-sparkles-web-renderer,
.ytd-watch-flexy ytd-ad-slot-renderer,
.ytp-suggested-action {
  display: none !important;
}
.html5-video-player.ad-showing .html5-video-container,
#movie_player.ad-showing .html5-video-container {
  visibility: hidden !important;
}
.html5-video-player.ad-showing .ytp-chrome-top,
#movie_player.ad-showing .ytp-chrome-top,
.html5-video-player.ad-showing .ytp-cards-teaser,
.html5-video-player.ad-showing .ytp-skip-ad,
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
    const style = document.createElement("style");
    style.id = "clearblock-youtube";
    style.textContent = HIDE_CSS;
    (document.documentElement || document.head).appendChild(style);
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

  function dismissAntiAdblock() {
    const wall = document.querySelector("ytd-enforcement-message-view-model, tp-yt-paper-dialog:has(ytd-enforcement-message-view-model)");
    if (wall) {
      wall.remove();
      const video = document.querySelector("#movie_player video, video.html5-main-video");
      if (video && video.paused) video.play().catch(() => {});
    }
  }

  function restoreContent() {
    if (!holdingAd) return;
    const video = heldVideo || document.querySelector("video.html5-main-video, #movie_player video, video");
    holdingAd = false;
    heldVideo = null;
    if (!video) return;
    try {
      const rate = savedRate > 0 && savedRate <= 2 ? savedRate : 1;
      video.playbackRate = rate;
      video.muted = savedMuted;
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
      holdingAd = true;
      heldVideo = video;
    }
    clickSkips(player);
    try {
      video.muted = true;
      if (Number.isFinite(video.duration) && video.duration > 0) {
        if (video.currentTime < video.duration - 0.05) {
          video.currentTime = video.duration;
        }
      } else {
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
    const host = Clearblock.canonicalHost(location.hostname);
    const state = await Clearblock.readState();
    enabled = Clearblock.shouldBlock(state, host);
    document.documentElement?.setAttribute("data-clearblock", enabled ? "on" : "off");
    window.dispatchEvent(new CustomEvent("clearblock:config", { detail: { enabled } }));
    if (!enabled) return;
    injectCss();
    tick();
    setInterval(tick, 50);
    document.addEventListener("yt-navigate-finish", tick);
    document.addEventListener("yt-player-updated", tick);
    const observer = new MutationObserver(tick);
    observer.observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== "clearblock-yt") return;
    if (!enabled) return;
    report(event.data.kind || "strip");
  });

  init();
})();
