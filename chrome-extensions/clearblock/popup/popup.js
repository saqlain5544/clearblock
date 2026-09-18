const app = document.getElementById("app");
const enabledInput = document.getElementById("enabled");
const enabledLabel = document.getElementById("enabled-label");
const banner = document.getElementById("status-banner");
const blockedEl = document.getElementById("blocked");
const blockedHint = document.getElementById("blocked-hint");
const savedEl = document.getElementById("saved");
const savedHint = document.getElementById("saved-hint");
const siteHost = document.getElementById("site-host");
const siteCopy = document.getElementById("site-copy");
const pauseBtn = document.getElementById("pause-btn");
const footnote = document.getElementById("footnote");

let snapshot = null;

function showBanner(kind, text) {
  if (!text) {
    banner.hidden = true;
    banner.textContent = "";
    return;
  }
  banner.hidden = false;
  banner.dataset.kind = kind;
  banner.textContent = text;
}

function render(state) {
  snapshot = state;
  app.dataset.state = "ready";
  enabledInput.disabled = false;
  enabledInput.checked = state.enabled;
  enabledLabel.textContent = state.enabled ? "On" : "Off";

  blockedEl.textContent = Clearblock.formatCount(state.lifetimeBlocked);
  savedEl.textContent = Clearblock.formatBytes(state.lifetimeBytes);

  if (!state.enabled) {
    blockedHint.textContent = "Blocking is off, so new ads are not counted.";
    savedHint.textContent = "Turn Clearblock on to start estimating savings again.";
    showBanner("off", "Clearblock is off. Ads can load until you turn it back on.");
  } else if (state.lifetimeBlocked === 0) {
    blockedHint.textContent = "No ads counted yet. Browse as usual — totals show up here.";
    savedHint.textContent = "Estimate uses typical ad sizes, not a packet capture.";
    showBanner("", "");
  } else {
    const tabText =
      state.tabBlocked > 0
        ? `${Clearblock.formatCount(state.tabBlocked)} on this tab.`
        : "None on this tab yet.";
    blockedHint.textContent = `Lifetime total on this device. ${tabText}`;
    savedHint.textContent = "Estimate uses typical ad sizes, not a packet capture.";
    showBanner("", "");
  }

  if (state.restricted) {
    siteHost.textContent = "Chrome system page";
    siteCopy.textContent = "Chrome does not allow extensions to change this page. Open a website to pause blocking there.";
    pauseBtn.disabled = true;
    pauseBtn.textContent = "Pause unavailable";
    return;
  }

  siteHost.textContent = state.host || "Unknown site";
  pauseBtn.disabled = !state.host || !state.enabled;

  if (!state.enabled) {
    siteCopy.textContent = "Site pause is available after you turn blocking back on.";
    pauseBtn.textContent = "Pause on this site";
    return;
  }

  if (state.sitePaused) {
    showBanner("paused", `Paused on ${state.host}. Network and cosmetic filters skip this site until you resume.`);
    siteCopy.textContent = "This site can load ads. Other sites stay blocked.";
    pauseBtn.textContent = "Resume on this site";
    pauseBtn.disabled = false;
    return;
  }

  siteCopy.textContent = "Network filters apply immediately. Reload the page after changing pause or cosmetic hiding.";
  pauseBtn.textContent = "Pause on this site";
}

function renderError(message) {
  app.dataset.state = "error";
  enabledInput.disabled = true;
  pauseBtn.disabled = true;
  blockedEl.textContent = "—";
  savedEl.textContent = "—";
  blockedHint.textContent = "Saved counts could not be read.";
  siteHost.textContent = "Unavailable";
  siteCopy.textContent = "Close this popup and open it again. If it still fails, reload the extension on chrome://extensions.";
  showBanner("error", message || "Couldn't read saved stats from this device.");
}

function send(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        reject(new Error(lastError.message));
        return;
      }
      if (!response?.ok) {
        reject(new Error(response?.error || "The background worker did not respond."));
        return;
      }
      resolve(response);
    });
  });
}

async function refresh() {
  try {
    const state = await send({ type: "getPopupState" });
    render(state);
  } catch (error) {
    renderError(error.message);
  }
}

enabledInput.addEventListener("change", async () => {
  enabledInput.disabled = true;
  try {
    await send({ type: "setEnabled", enabled: enabledInput.checked });
    await refresh();
  } catch (error) {
    renderError(error.message);
  }
});

pauseBtn.addEventListener("click", async () => {
  if (!snapshot?.host) return;
  pauseBtn.disabled = true;
  try {
    await send({ type: "setSitePaused", host: snapshot.host, paused: !snapshot.sitePaused });
    await refresh();
  } catch (error) {
    renderError(error.message);
  }
});

footnote.textContent =
  "Filter lists ship inside the extension, so blocking still works offline. Counts are stored in chrome.storage.local and survive restarts.";

refresh();
