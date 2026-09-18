/**
 * MAIN-world stubs so pages that sniff for an ad blocker do not freeze
 * playback or throw a "disable your ad blocker" wall. Does not touch
 * media elements or player APIs.
 */
(() => {
  try {
    if (typeof window.canRunAds === "undefined") window.canRunAds = true;
    if (typeof window.isAdBlockActive === "undefined") window.isAdBlockActive = false;
    if (typeof window.adBlockerEnabled === "undefined") window.adBlockerEnabled = false;
  } catch {
    // Page may have frozen those names.
  }
})();
