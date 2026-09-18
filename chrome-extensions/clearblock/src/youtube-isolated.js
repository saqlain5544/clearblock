(() => {
  const SKIP_SELECTORS = [
    ".ytp-ad-skip-button",
    ".ytp-ad-skip-button-modern",
    ".ytp-skip-ad-button",
    ".ytp-ad-skip-button-container button",
    ".ytp-ad-overlay-close-button",
    "button.ytp-ad-skip-button-slot",
    ".ytp-ad-overlay-close-container",
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
ytd-companion-slot-renderer,
ytd-video-masthead-ad-v3-renderer,
ytd-video-masthead-ad-primary-video-renderer,
ytd-primetime-promo-renderer,
ytd-rich-item-renderer:has(ytd-ad-slot-renderer),
ytd-reel-video-renderer:has(ytd-ad-slot-renderer),
ytd-compact-promoted-video-renderer,
.ytp-ad-overlay-slot,
.ytp-ad-text-overlay,
.ytp-ad-image-overlay,
.ytp-ad-overlay-container,
.ytp-ad-player-overlay-layout,
.video-ads.ytp-ad-module .ytp-ad-player-overlay,
ytd-mealbar-promo-renderer,
tp-yt-paper-dialog.ytd-popup-container ytd-mealbar-promo-renderer,
ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"] {
  display: none !important;
}
.html5-video-player.ad-showing .ytp-ad-player-overlay,
.html5-video-player.ad-showing .ytp-ad-player-overlay-layout {
  opacity: 0 !important;
}
`;

  let enabled = true;
  let lastReport = { skip: 0, hide: 0, strip: 0 };
  let savedRate = 1;
  let savedMuted = false;
  let holdingAd = false;

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
      (player && player.querySelector("video")) ||
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

  function restoreContent(video) {
    if (!video || !holdingAd) return;
    holdingAd = false;
    try {
      video.playbackRate = savedRate || 1;
      video.muted = savedMuted;
    } catch {
      // Player may already have swapped the element.
    }
  }

  function skipIfAdPlaying() {
    if (!enabled) return;
    const player = adPlayer();
    const video = mainVideo(player);
    if (!player || !video) {
      if (holdingAd) restoreContent(document.querySelector("video"));
      return;
    }
    if (!holdingAd) {
      savedRate = video.playbackRate || 1;
      savedMuted = video.muted;
      holdingAd = true;
    }
    clickSkips(player);
    try {
      video.muted = true;
      video.playbackRate = 16;
      if (Number.isFinite(video.duration) && video.duration > 0 && video.currentTime < video.duration - 0.15) {
        video.currentTime = Math.max(0, video.duration - 0.05);
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
    setInterval(tick, 250);
    document.addEventListener("yt-navigate-finish", tick);
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
