(() => {
  const VIDEO = new URL("../sample.mp4", document.currentScript.src).href;
  const REMOTE_VIDEO = "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4";

  const NETWORK_URLS = [
    "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js",
    "https://securepubads.g.doubleclick.net/tag/js/gpt.js",
    "https://googleads.g.doubleclick.net/pagead/id",
    "https://static.doubleclick.net/instream/ad_status.js",
    "https://www.googleadservices.com/pagead/conversion.js",
    "https://adservice.google.com/adsid/google/ui",
    "https://tpc.googlesyndication.com/sodar/sodar2.js",
    "https://www.googletagservices.com/tag/js/gpt.js",
    "https://ads.youtube.com/api/stats/ads",
    "https://www.youtube.com/pagead/adview",
    "https://www.facebook.com/tr?id=lab&ev=PageView",
    "https://connect.facebook.net/en_US/fbevents.js",
    "https://an.facebook.com/v3/plugins/like.php",
    "https://pixel.facebook.com/tr",
    "https://amazon-adsystem.com/aax2/amzn_ads.js",
    "https://s.amazon-adsystem.com/iu3",
    "https://taboola.com/libtrc/unip/123/tfa.js",
    "https://cdn.taboola.com/libtrc/impl.2019.js",
    "https://widgets.outbrain.com/outbrain.js",
    "https://odb.outbrain.com/utils/get",
    "https://ads.twitter.com/uwt.js",
    "https://static.ads-twitter.com/uwt.js",
    "https://ads.linkedin.com/px/lisn",
    "https://snap.licdn.com/li.lms-analytics/insight.min.js",
    "https://sb.scorecardresearch.com/beacon.js",
    "https://b.scorecardresearch.com/b",
    "https://static.criteo.net/js/ld/publishertag.js",
    "https://sslwidget.criteo.com/event",
    "https://ad.doubleclick.net/ddm/trackimp/",
    "https://secure.adnxs.com/px",
    "https://ib.adnxs.com/ut/v3/prebid",
    "https://as-sec.casalemedia.com/cygnus",
    "https://fastlane.rubiconproject.com/a/api/fastlane.json",
    "https://hbopenbid.pubmatic.com/translator",
    "https://htlb.casalemedia.com/openrtb/2.5/pbjs",
    "https://js-sec.indexww.com/ht/p/openrtb.js",
    "https://ads.yieldmo.com/exchange/openrtb",
    "https://adserver.adtechus.com/addyn/3.0",
    "https://acdn.adnxs.com/video/outstream/web/v1/img/nas.jpg",
    "https://ads.yahoo.com/pixel",
    "https://s.yimg.com/rq/darla/4-1-0/js/g-r-min.js",
    "https://adsafeprotected.com/main.js",
    "https://pixel.moatads.com/pixel.gif",
    "https://px.ads.linkedin.com/collect",
    "https://bat.bing.com/action/0",
    "https://www.googletagmanager.com/gtag/js?id=AW-lab",
    "https://hotjar.com/c/hotjar-lab.js",
    "https://script.hotjar.com/modules.js",
    "https://clarity.ms/tag/lab",
    "https://www.google-analytics.com/plugins/ua/linkid.js",
  ];

  function isVisible(el) {
    if (!el || !el.getBoundingClientRect) return false;
    const s = getComputedStyle(el);
    if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width > 2 && r.height > 2;
  }

  function scanAds() {
    const nodes = [...document.querySelectorAll("[data-lab-ad]")];
    const visible = nodes.filter(isVisible);
    return {
      total: nodes.length,
      visible: visible.length,
      hidden: nodes.length - visible.length,
      leftover: visible.map((el) => el.getAttribute("data-lab-ad")),
    };
  }

  function scanVideo() {
    const videos = [...document.querySelectorAll("[data-lab-content='player'] video, .lab-content-player video, video.html5-main-video")];
    return videos.map((v) => ({
      src: (v.currentSrc || v.src || "").slice(0, 80),
      paused: v.paused,
      error: v.error && v.error.code,
      t: v.currentTime,
      w: v.videoWidth,
    }));
  }

  async function probeNetwork() {
    const results = await Promise.all(
      NETWORK_URLS.map((url) =>
        fetch(url, { mode: "no-cors", cache: "no-store", credentials: "omit" })
          .then(() => ({ url, issued: true }))
          .catch(() => ({ url, issued: false }))
      )
    );
    return results;
  }

  let netLine = "Network probes…";
  let netOk = false;

  function paintScoreboard(extra) {
    const el = document.getElementById("lab-scoreboard");
    if (!el) return scanAds();
    const ads = scanAds();
    const videos = scanVideo();
    const videoOk = videos.length === 0 || videos.some((v) => !v.error && (v.t > 0 || v.w > 0 || !v.paused));
    const adsOk = ads.visible === 0;
    el.innerHTML = `
      <span>${document.title}</span>
      <span class="${adsOk ? "ok" : "fail"}">Ads hidden <strong>${ads.hidden}/${ads.total}</strong> · leftover ${ads.visible}</span>
      <span class="${videoOk ? "ok" : "fail"}">Content video ${videoOk ? "playing" : "blocked/failed"}</span>
      <span class="${netOk ? "ok" : ""}">${netLine}</span>
      ${extra || ""}
    `;
    if (ads.leftover.length) {
      const fail = document.createElement("span");
      fail.className = "fail";
      fail.textContent = "Still visible: " + [...new Set(ads.leftover)].slice(0, 12).join(", ");
      el.appendChild(fail);
    }
    const payload = { source: "clearblock-lab", href: location.href, ads, videos, videoOk, adsOk };
    try {
      window.parent.postMessage(payload, "*");
    } catch {
      // Not embedded.
    }
    return payload;
  }

  function firePixels() {
    for (const url of NETWORK_URLS.slice(0, 24)) {
      const img = document.createElement("img");
      img.className = "lab-pixel";
      img.width = 1;
      img.height = 1;
      img.alt = "";
      img.src = url;
      document.body.appendChild(img);
    }
    const s = document.createElement("script");
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js";
    s.async = true;
    s.onerror = () => {};
    document.head.appendChild(s);
  }

  function el(tag, attrs, html) {
    const node = document.createElement(tag);
    Object.entries(attrs || {}).forEach(([k, v]) => {
      if (k === "class") node.className = v;
      else node.setAttribute(k, v);
    });
    if (html) node.innerHTML = html;
    return node;
  }

  function hydrateYouTube() {
    const grid = document.getElementById("yt-home-grid");
    if (grid) {
      const titles = [
        "Ocean documentary 4K", "Chess speedrun", "City walking tour", "Jazz live",
        "How jet engines work", "Sourdough primer", "F1 onboard", "Rain for sleep",
      ];
      for (let i = 0; i < 36; i += 1) {
        if (i % 5 === 3) {
          const ad = el("ytd-ad-slot-renderer", { "data-lab-ad": "youtube-infeed", class: "yt-card" });
          ad.appendChild(el("div", { class: "lab-fill" }, `In-feed Promoted · slot ${i}`));
          grid.appendChild(ad);
          continue;
        }
        const card = el("article", { class: "yt-card", "data-lab-content": "video-card" });
        const media = el("div", { class: "thumb lab-content-player", "data-lab-content": "player" });
        const v = el("video", { muted: "", playsinline: "", loop: "" });
        v.src = VIDEO;
        media.appendChild(v);
        card.appendChild(media);
        card.appendChild(el("h3", {}, titles[i % titles.length] + " #" + (i + 1)));
        card.appendChild(el("p", {}, "Clearblock Lab · 128K views"));
        grid.appendChild(card);
        v.play().catch(() => {});
      }
    }
    const side = document.getElementById("yt-related");
    if (side) {
      for (let i = 0; i < 16; i += 1) {
        if (i === 2 || i === 7 || i === 11) {
          const ad = el("ytd-ad-slot-renderer", { "data-lab-ad": "youtube-sidebar" });
          ad.appendChild(el("div", { class: "lab-fill" }, "Sidebar companion / PYV " + i));
          side.appendChild(ad);
          continue;
        }
        const row = el("a", { class: "yt-related", href: "#", "data-lab-content": "related" });
        row.appendChild(el("div", { class: "thumb" }));
        row.appendChild(el("div", {}, `<strong>Related cut ${i + 1}</strong><p>Lab channel · 4:12</p>`));
        side.appendChild(row);
      }
    }
  }

  function hydrateFacebook() {
    const feed = document.getElementById("fb-feed");
    if (!feed) return;
    const names = ["Maya Chen", "Oak Park Library", "Diego Ruiz", "Northside FC", "Priya Shah", "River Press"];
    for (let i = 0; i < 28; i += 1) {
      const sponsored = i % 3 === 1;
      const post = el("article", {
        class: sponsored ? "fb-post fb-sponsored" : "fb-post",
        role: "article",
        ...(sponsored
          ? { "data-lab-ad": i % 6 === 1 ? "facebook-instream" : "facebook-feed", "data-testid": "fb-sponsored", "aria-label": "Sponsored" }
          : { "data-lab-content": "post" }),
      });
      post.innerHTML = `<header><div class="fb-avatar"></div><div><strong>${names[i % names.length]}</strong><div>${sponsored ? "Sponsored · " : ""}${i + 1}h</div></div></header>`;
      const body = el("div", { class: "body" });
      body.appendChild(document.createTextNode(sponsored ? "Shop dropship headphones — limited offer." : "Neighborhood notes from the weekend market and the river trail."));
      if (sponsored && i % 6 === 1) {
        post.classList.add("fb-instream-ad");
        const wrap = el("div", { class: "fb-instream-ad" });
        const v = el("video", { muted: "", playsinline: "", loop: "" });
        v.src = VIDEO;
        wrap.appendChild(v);
        wrap.appendChild(el("div", { class: "lab-fill" }, "Facebook in-stream video ad"));
        body.appendChild(wrap);
        v.play().catch(() => {});
      }
      post.appendChild(body);
      feed.appendChild(post);
    }
  }

  function hydrateWeb() {
    const native = document.getElementById("web-native");
    if (native) {
      for (let i = 0; i < 10; i += 1) {
        native.appendChild(el("div", { class: "amp-card native-ad in-article-ad", "data-lab-ad": "native-inarticle" }, `Around the web · Taboola/Outbrain card ${i + 1}`));
      }
    }
    const shop = document.getElementById("web-shop");
    if (shop) {
      for (let i = 0; i < 12; i += 1) {
        const ad = i % 4 === 0;
        shop.appendChild(
          el(
            "div",
            { class: ad ? "shop-card shopping-ad product-ad" : "shop-card", ...(ad ? { "data-lab-ad": "shopping" } : { "data-lab-content": "product" }) },
            ad ? `Sponsored listing ${i + 1}` : `Canvas tote ${i + 1} · $24`
          )
        );
      }
    }
    const serp = document.getElementById("web-serp");
    if (serp) {
      for (let i = 0; i < 8; i += 1) {
        if (i < 3) {
          serp.appendChild(el("div", { class: "search-ad sponsored-result", "data-lab-ad": "search-ad" }, `<small>Sponsored</small><div><a href="#">Buy lab-grade filters ${i + 1}</a></div><p>Ad network result · ads.google</p>`));
        } else {
          serp.appendChild(el("div", { class: "organic", "data-lab-content": "search" }, `<a href="#">How ad blockers parse EasyList ${i}</a><p>https://example.org/research/${i}</p>`));
        }
      }
    }
    const gpt = document.getElementById("web-gpt-stack");
    if (gpt) {
      const sizes = ["leaderboard-ad 728x90", "mpu-ad 300x250", "billboard-ad 970x250", "sticky footer", "amp 300x100"];
      sizes.forEach((label, i) => {
        gpt.appendChild(
          el("div", {
            id: `div-gpt-ad-lab-${i}`,
            class: "dfp-ad gpt-ad ad--gpt lab-fill",
            "data-lab-ad": "gpt-display",
          }, `GPT ${label}`)
        );
      });
    }
  }

  async function boot() {
    hydrateYouTube();
    hydrateFacebook();
    hydrateWeb();
    firePixels();
    const first = paintScoreboard();
    probeNetwork().then((rows) => {
      const failed = rows.filter((r) => !r.issued).length;
      const issued = rows.length - failed;
      netOk = failed >= rows.length * 0.4;
      netLine = `Ad hosts: ${failed} blocked/fail · ${issued} issued of ${rows.length}`;
      paintScoreboard();
    });
    setInterval(() => paintScoreboard(), 800);
    document.querySelectorAll("[data-lab-content='player'] video, video.html5-main-video").forEach((v) => {
      v.play().catch(() => {});
    });
    return first;
  }

  window.ClearblockLab = { VIDEO, REMOTE_VIDEO, scanAds, scanVideo, probeNetwork, paintScoreboard, boot };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
