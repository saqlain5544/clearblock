(() => {
  const SKIP_SELECTORS = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button-container button",
    ".ytp-ad-overlay-close-button",
    "button.ytp-ad-skip-button-slot",
  ];

  const HIDE_CSS = `
#masthead-ad,
#player-ads,
#offer-module,
ytd-ad-slot-renderer,
ytd-display-ad-renderer,
ytd-in-feed-ad-layout-renderer,
ytd-banner-promo-renderer,
ytd-promoted-sparkles-web-renderer,
ytd-promoted-sparkles-text-search-renderer,
ytd-action-companion-ad-renderer,
ytd-player-legacy-desktop-watch-ads-renderer,
ytd-promoted-video-renderer,
ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
ytd-reel-video-renderer:has(ytd-ad-slot-renderer),
ytd-compact-promoted-video-renderer,
.ytp-ad-overlay-slot,
.ytp-ad-text-overlay,
.ytp-ad-player-overlay-layout,
ytd-mealbar-promo-renderer,
tp-yt-paper-dialog.ytd-popup-container ytd-mealbar-promo-renderer,
ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"] {
  display: none !important;
}
.html5-video-player.ad-showing .ytp-ad-player-overlay {
  opacity: 0 !important;
}
`;

  let enabled = true;
  let lastReport = { skip: 0, hide: 0, strip: 0 };

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

  function clickSkips() {
    for (const selector of SKIP_SELECTORS) {
      for (const button of document.querySelectorAll(selector)) {
        button.click();
        report("skip");
      }
    }
  }

  function speedThroughAd() {
    const player = document.querySelector(".html5-video-player");
    const video = document.querySelector("video.html5-main-video, ytd-player video, #movie_player video, video");
    const adShowing =
      player?.classList.contains("ad-showing") ||
      document.querySelector(".ytp-ad-player-overlay, .ytp-ad-module .ytp-ad-player-overlay-layout");
    if (!adShowing || !video) return;
    try {
      video.muted = true;
      video.playbackRate = 16;
      if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.2) {
        video.currentTime = video.duration;
      }
      report("skip");
    } catch {
      // Some ads reject seeking; skip button still runs.
    }
  }

  function tick() {
    if (!enabled) return;
    clickSkips();
    speedThroughAd();
  }

  async function init() {
    const host = Clearblock.canonicalHost(location.hostname);
    const state = await Clearblock.readState();
    enabled = Clearblock.shouldBlock(state, host);
    document.documentElement?.setAttribute("data-clearblock", enabled ? "on" : "off");
    window.dispatchEvent(new CustomEvent("clearblock:config", { detail: { enabled } }));
    if (!enabled) return;
    injectCss();
    setInterval(tick, 250);
    document.addEventListener("yt-navigate-finish", tick);
  }

  window.addEventListener("message", (event) => {
    if (event.source !== window) return;
    if (event.data?.source !== "clearblock-yt") return;
    if (!enabled) return;
    report(event.data.kind || "strip");
  });

  init();
})();
