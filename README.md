# Clearblock

Local-first **Manifest V3** Chrome extension that blocks ads in the browser. Filter lists ship inside the package, so it works offline. There is no account, no backend, and no required remote update.

On a Mac the unpacked folder belongs at **`~/chrome-extensions/clearblock`**. Install it by cloning this GitHub repo (script below).

Blocking is a mix of:

- **Network rules** (`declarativeNetRequest`) compiled from a bundled [EasyList](https://easylist.to/) snapshot, plus a high-priority set for common ad networks.
- **Cosmetic hiding** for leftover ad slots in the page.
- **YouTube-specific protection**, because preroll and in-player ads often share `googlevideo.com` with the video itself. Clearblock does **not** block that host, or other playback CDNs. It strips ad payloads from player responses, hides in-feed/sidebar/companion slots, and skips leftover prerolls **only** while the player has the `ad-showing` class — it will not seek or speed up ordinary playback.

Two invariants:

1. **Never block video.** HTML5, HLS, DASH, YouTube streams, embeds, manifests, segments, and in-player thumbnails are allowlisted. A rule that would take down media is treated as a false positive.
2. **No ads.** Network filters plus cosmetics, including YouTube preroll, mid-roll, overlay, homepage, sidebar, and companion slots.

Counts and settings live in `chrome.storage.local` on this device and survive Chrome restarts.

## Put it on your Mac

The folder Chrome loads is `chrome-extensions/clearblock` (the directory that contains `manifest.json`). Repo: [saqlain5544/clearblock](https://github.com/saqlain5544/clearblock).

Paste this in Terminal:

```bash
REPO_URL='https://github.com/saqlain5544/clearblock.git'
WORKDIR="$(mktemp -d)"
git clone --depth 1 --filter=blob:none --sparse "$REPO_URL" "$WORKDIR"
git -C "$WORKDIR" sparse-checkout set chrome-extensions/clearblock
mkdir -p ~/chrome-extensions
rm -rf ~/chrome-extensions/clearblock
cp -R "$WORKDIR/chrome-extensions/clearblock" ~/chrome-extensions/clearblock
rm -rf "$WORKDIR"
echo "Installed ~/chrome-extensions/clearblock"
```

SSH works the same if you swap in `git@github.com:saqlain5544/clearblock.git`.

If you already have a clone of this repo:

```bash
bash scripts/install-from-git.sh
```

That leaves the unpacked extension at **`~/chrome-extensions/clearblock`**.

## Load unpacked in Chrome

1. Open Chrome and go to `chrome://extensions`.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked**.
4. Select **`~/chrome-extensions/clearblock`** (the folder that contains `manifest.json`).
5. Pin Clearblock from the puzzle-piece menu so the popup is easy to open.

The popup shows lifetime ads blocked, estimated data saved, a global on/off switch, and an optional pause for the current site. Estimated savings use typical ad sizes (larger for YouTube prerolls), not a packet capture.

Network blocking applies as soon as you toggle the extension. Reload the tab after changing site pause if cosmetic hiding or YouTube hooks were already injected.

## What is bundled

Paths below are relative to `chrome-extensions/clearblock`.

| Path | Role |
| --- | --- |
| `filters/easylist.txt` | EasyList snapshot used to compile rules |
| `rules/dnr-youtube.json` | High-priority YouTube / ad-network network rules |
| `rules/dnr-ads.json` | EasyList-derived domain and path blocks |
| `rules/dnr-allow.json` | EasyList exception rules that DNR can express |
| `rules/dnr-media.json` | High-priority allows for video CDNs and player assets |
| `rules/cosmetic-generic.css` | Generic element hiding |
| `rules/cosmetic-specific.json` | Per-site element hiding |

Rebuild compiled rules after replacing the EasyList snapshot (run from the repo root):

```bash
python3 scripts/build-filters.py
python3 scripts/make-icons.py
```

Chrome allows a limited number of static DNR rules, so the compiler keeps the highest-signal domain blocks instead of every EasyList line.

EasyList is copyright the EasyList authors and licensed under the GNU GPLv3. The bundled snapshot is `chrome-extensions/clearblock/filters/easylist.txt`.

## Permissions

- `declarativeNetRequest` — block ad requests before they download.
- `webRequest` — count requests Chrome reports as `net::ERR_BLOCKED_BY_CLIENT`.
- `storage` — persist totals, the on/off switch, and per-site pauses.
- `tabs` — show the current site in the popup.
- `<all_urls>` — apply rules on ordinary websites (Chrome still blocks extensions from `chrome://` pages).

Nothing is sent to a Clearblock server. Visiting a website still talks to that website; Clearblock only cancels known ad requests and hides known ad UI.

## Local labs

The stress fixture is `chrome-extensions/clearblock/test/lab/index.html` (YouTube, Facebook, and a news/search/shop web zoo). Serve the extension folder and open `/test/lab/`:

```bash
python3 -m http.server 43180 --bind 127.0.0.1
# http://127.0.0.1:43180/test/lab/
```

Each page paints a scoreboard: ad slots hidden vs leftover, whether content video still plays, and whether the player was seeked or left frozen. The fixtures include delayed/obfuscated insertions and “disable your ad blocker” nags. Network probes hit real ad hosts (they should fail with the extension on).

`test/youtube-player-lab.html` remains a focused preroll harness.
