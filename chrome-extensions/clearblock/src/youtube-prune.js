/**
 * Rename YouTube ad keys in raw JSON text (uBO-style).
 * Mutating the key names keeps streamingData / signatures intact and avoids
 * JSON.parse+stringify (that path caused player Error 153).
 */
(function attachClearblockYoutubePrune(global) {
  const PLAYER_URL =
    /\/youtubei\/v1\/(?:player|next|get_watch|browse|search|reel\/reel_item_watch|reel\/reel_watch_sequence)|\/(?:watch|playlist)\?|\/get_watch\?/i;

  const AD_KEY_RE =
    /"(adPlacements|adSlots|playerAds|adBreakHeartbeatParams|playerAdvertisement|adBreaks)"/g;

  const AD_RENDERER_RE =
    /"(adSlotRenderer|adsEngagementPanelContentRenderer|bannerPromoRenderer|displayAdRenderer|endScreenAdRenderer|filmstripAdRenderer|inFeedAdLayoutRenderer|instreamVideoAdRenderer|playerLegacyDesktopWatchAdsRenderer|promotedSparklesTextSearchRenderer|promotedSparklesWebRenderer|promotedVideoRenderer|reelPlayerAdRenderer|adActionInterstitialRenderer)"/g;

  const OBJECT_AD_KEYS = [
    "adPlacements",
    "adSlots",
    "playerAds",
    "adBreakHeartbeatParams",
    "playerAdvertisement",
    "adBreaks",
  ];

  const AD_RENDERER_KEYS = [
    "adSlotRenderer",
    "adsEngagementPanelContentRenderer",
    "bannerPromoRenderer",
    "displayAdRenderer",
    "endScreenAdRenderer",
    "filmstripAdRenderer",
    "inFeedAdLayoutRenderer",
    "instreamVideoAdRenderer",
    "playerLegacyDesktopWatchAdsRenderer",
    "promotedSparklesTextSearchRenderer",
    "promotedSparklesWebRenderer",
    "promotedVideoRenderer",
    "reelPlayerAdRenderer",
    "adActionInterstitialRenderer",
  ];

  const SKIP_WALK_KEYS = new Set([
    "streamingData",
    "videoDetails",
    "playbackTracking",
    "captions",
    "storyboards",
    "microformat",
    "attestation",
    "signatureCipher",
    "adaptiveFormats",
    "formats",
    "serverAbrStreamingUrl",
    "playbackId",
  ]);

  function shouldPatchUrl(url) {
    return typeof url === "string" && PLAYER_URL.test(url);
  }

  function renameAdKeys(text) {
    if (typeof text !== "string" || text.length < 16) return text;
    if (text.indexOf('"ad') === -1 && text.indexOf('"playerAds"') === -1 && text.indexOf('"promoted') === -1) {
      return text;
    }
    return text.replace(AD_KEY_RE, '"no_ads"').replace(AD_RENDERER_RE, '"no_adRenderer"');
  }

  function isAdRenderer(value) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return false;
    for (const key of AD_RENDERER_KEYS) {
      if (value[key]) return true;
    }
    return false;
  }

  function prunePlayerObject(value, depth) {
    if (!value || typeof value !== "object" || depth > 10) return false;
    let removed = false;
    if (Array.isArray(value)) {
      for (let i = value.length - 1; i >= 0; i -= 1) {
        if (isAdRenderer(value[i])) {
          value.splice(i, 1);
          removed = true;
        } else if (prunePlayerObject(value[i], depth + 1)) {
          removed = true;
        }
      }
      return removed;
    }
    for (const key of OBJECT_AD_KEYS) {
      if (key in value && value[key] != null) {
        if (Array.isArray(value[key])) value[key] = [];
        else delete value[key];
        removed = true;
      }
    }
    for (const key of AD_RENDERER_KEYS) {
      if (key in value) {
        delete value[key];
        removed = true;
      }
    }
    for (const [key, nested] of Object.entries(value)) {
      if (SKIP_WALK_KEYS.has(key)) continue;
      if (nested && typeof nested === "object" && prunePlayerObject(nested, depth + 1)) removed = true;
    }
    return removed;
  }

  global.ClearblockYoutubePrune = {
    shouldPatchUrl,
    renameAdKeys,
    prunePlayerObject,
    OBJECT_AD_KEYS,
    AD_RENDERER_KEYS,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
