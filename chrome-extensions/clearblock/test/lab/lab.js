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
    "https://ads.dailymotion.com/js/ads.js",
    "https://ad.dailymotion.com/js/ads.js",
    "https://csync.smilewanted.com/",
    "https://fundingchoicesmessages.google.com/i/lab.js",
    "https://fishingrodsgalore.com/pixel.gif",
    "https://bounceexchange.com/tag.js",
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
    const health = scanPlayerHealth();
    const bot = document.querySelector("[data-lab-content='bot-check']");
    let botLine = "";
    if (bot) {
      const s = getComputedStyle(bot);
      const r = bot.getBoundingClientRect();
      const vis = s.display !== "none" && s.visibility !== "hidden" && r.height > 8;
      botLine = `<span class="${vis ? "ok" : "fail"}">Bot-check interstitial ${vis ? "visible (not hidden)" : "HIDDEN — player would look stuck"}</span>`;
    }
    el.innerHTML = `
      <span>${document.title}</span>
      <span class="${adsOk ? "ok" : "fail"}">Ads hidden <strong>${ads.hidden}/${ads.total}</strong> · leftover ${ads.visible}</span>
      <span class="${videoOk ? "ok" : "fail"}">Content video ${videoOk ? "playing" : "blocked/failed"}</span>
      <span class="${health.ok ? "ok" : "fail"}">Player ${health.ok ? "unstuck" : health.soughtAway ? "seeked content" : "stuck"} · rate ${health.rate || "–"}</span>
      ${botLine}
      <span class="${netOk ? "ok" : ""}">${netLine}</span>
      ${extra || ""}
    `;
    if (ads.leftover.length) {
      const fail = document.createElement("span");
      fail.className = "fail";
      fail.textContent = "Still visible: " + [...new Set(ads.leftover)].slice(0, 12).join(", ");
      el.appendChild(fail);
    }
    const payload = { source: "clearblock-lab", href: location.href, ads, videos, videoOk, adsOk, health };
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

  function hydrateBypass() {
    const mount = document.getElementById("web-bypass");
    if (mount) {
      setTimeout(() => {
        const delayed = el("div", { class: "qx9zlm", "data-lab-ad": "delayed-obfuscated" }, "Delayed obfuscated creative inserted at 1.2s");
        delayed.style.minHeight = "80px";
        delayed.style.background = "#c81e1e";
        delayed.style.color = "#fff";
        delayed.style.padding = "12px";
        mount.appendChild(delayed);
      }, 1200);
      setTimeout(() => {
        const scripted = el("div", { class: "z-k2", role: "ad", "data-lab-ad": "scripted-first-party", "aria-label": "Advertisement" }, "Scripted first-party slot /sponsor.js");
        scripted.style.minHeight = "72px";
        scripted.style.background = "#8a1010";
        scripted.style.color = "#fff";
        scripted.style.padding = "12px";
        mount.appendChild(scripted);
      }, 2000);
      setTimeout(() => {
        const gpt = document.getElementById("div-gpt-ad-desktop_hero");
        if (gpt) gpt.style.setProperty("display", "block", "important");
        const chrome = document.getElementById("verge-ad-label-chrome");
        if (chrome) chrome.style.setProperty("display", "block", "important");
      }, 1400);
      setTimeout(() => {
        const fox = el("div", {
          class: "ql2uzafsw8vm",
          "data-lab-ad": "fox-adblock-nag-delayed",
          "data-anti-adblock": "1",
        }, "You are seeing this message because ad or script blocking software is interfering with this page. Disable any ad or script blocking software, then reload this page.");
        fox.style.cssText = "position:fixed;left:0;right:0;bottom:40px;z-index:2147483586;background:#faf8e2;color:#111;padding:12px;text-align:center;";
        document.body.appendChild(fox);
      }, 1800);
      setTimeout(() => {
        const usa = el("div", {
          class: "fEy1Z2XT",
          "data-lab-ad": "usatoday-admiral-nag-delayed",
          "data-anti-adblock": "1",
        }, "It looks like you're using an adblocker. Please support us by turning off your adblocker. Disable my Adblocker.");
        usa.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:rgba(0,0,0,.4);color:#111;padding:16px;text-align:center;";
        document.body.appendChild(usa);
      }, 2000);
      setTimeout(() => {
        const imgur = el("div", {
          class: "fEy1Z2XT",
          "data-lab-ad": "imgur-admiral-nag-delayed",
          "data-anti-adblock": "1",
        }, "Ads keep Imgur's lights on. Allow Ads. Powered by Admiral.");
        imgur.style.cssText = "position:fixed;inset:20% 24%;z-index:2147483646;background:#111;color:#fff;padding:16px;text-align:center;";
        document.body.appendChild(imgur);
      }, 2200);
      setTimeout(() => {
        const wrap = el("div", { class: "min-h-[250px]", "data-lab-ad": "gizmodo-optidigital-delayed" });
        wrap.style.cssText = "min-height:250px;display:flex;align-items:center;justify-content:center;background:#eee;color:#888;";
        const slot = el("div", { class: "optidigital-wrapper-div", "data-optidigital-slot": "true" }, "ADVERTISEMENT");
        wrap.appendChild(slot);
        document.body.appendChild(wrap);
      }, 2300);
      setTimeout(() => {
        const card = el("div", { "data-sponsored-id": "lab-wayfair-delayed", "data-lab-ad": "wayfair-sponsored-delayed" });
        card.style.cssText = "max-width:297px;margin:12px auto;min-height:72px;background:#f3e8ff;";
        card.appendChild(el("div", { "data-testid": "sponsored-tag" }, "Sponsored"));
        document.body.appendChild(card);
      }, 2400);
      setTimeout(() => {
        const river = el("cs-responsive-card", {
          id: "nativead-river-lab-delayed",
          "data-lab-ad": "msn-nativead-delayed",
        }, "Delayed MSN nativead river");
        river.style.cssText = "display:block;width:300px;min-height:72px;margin:12px auto;background:#ddd;";
        document.body.appendChild(river);
      }, 2500);
      setTimeout(() => {
        const tile = el("div", {
          "data-comp": "ProductTile ProductTile BaseComponent",
          "data-lab-ad": "sephora-sponsored-delayed",
        });
        tile.style.cssText = "max-width:297px;margin:12px auto;min-height:72px;background:#fde8f0;";
        const content = el("div", { class: "ProductTile-content" });
        content.appendChild(el("span", {}, "Sponsored"));
        content.appendChild(document.createTextNode(" Delayed Sephora sponsored leftover"));
        tile.appendChild(content);
        document.body.appendChild(tile);
      }, 2600);
      setTimeout(() => {
        const li = el("li", {
          class: "cls-stream-ad yahoo-nebula-dense-native-ad",
          "data-lab-ad": "yahoo-nebula-delayed",
        });
        li.style.cssText = "display:block;max-width:552px;margin:12px auto;min-height:72px;background:#e8eef4;";
        li.appendChild(el("div", { class: "yahoo-nebula-ad-placeholder-image" }, "Delayed Yahoo nebula native leftover"));
        document.body.appendChild(li);
      }, 2700);
      setTimeout(() => {
        const rail = el("div", {
          class: "HomepageLayout_dlRRad__lab m-static-gam",
          "data-lab-ad": "aol-rightrail-delayed",
        }, "Delayed AOL right-rail GAM leftover");
        rail.style.cssText = "width:300px;min-height:72px;margin:12px auto;background:#e1e5ea;";
        document.body.appendChild(rail);
      }, 2800);
      setTimeout(() => {
        const sticky = el("div", {
          id: "m-dispatcher-sticky-footer-delayed",
          class: "m-dispatcher m-dispatcher--sticky-footer",
          "data-lab-ad": "aol-sticky-delayed",
        }, "Delayed AOL sticky offer leftover");
        sticky.style.cssText = "position:fixed;left:0;right:0;bottom:110px;z-index:500;height:72px;background:#bbb;";
        document.body.appendChild(sticky);
      }, 2900);
      setTimeout(() => {
        const hill = el("div", {
          class: "header-highlighted-area__container",
          "data-lab-ad": "hill-sponsored-delayed",
        });
        hill.style.cssText = "max-width:280px;margin:12px auto;min-height:40px;background:#eef;";
        hill.appendChild(el("h2", { class: "header-highlighted-area__title hha-sponsored" }, "Sponsored:"));
        hill.appendChild(el("a", { href: "/sponsor-content/delayed" }, "Content from Third Way delayed"));
        document.body.appendChild(hill);
      }, 3000);
      setTimeout(() => {
        const cbs = el("article", {
          class: "item item--type-live item--topic-placeholder",
          "data-lab-ad": "cbs-live-delayed",
        });
        cbs.style.cssText = "width:300px;height:80px;margin:12px auto;background:#111;";
        document.body.appendChild(cbs);
      }, 3100);
      setTimeout(() => {
        const bbc = el("div", {
          "data-testid": "ad-unit",
          "data-component": "ad-slot",
          "data-lab-ad": "bbc-dotcom-delayed",
        });
        bbc.style.cssText = "width:100%;min-height:80px;margin:12px auto;background:#f6f6f6;";
        bbc.appendChild(el("div", { id: "dotcom-top-delayed", class: "dotcom-ad" }, "Delayed BBC leftover masthead"));
        document.body.appendChild(bbc);
      }, 3200);
      setTimeout(() => {
        const bb = el("div", {
          "data-component": "leaderboard-ad",
          class: "media-ui-BaseAd_baseAd-lab media-ui-LeaderboardAd_leaderboard-lab",
          "data-lab-ad": "bloomberg-leaderboard-delayed",
          role: "region",
          "aria-label": "Leaderboard advertisement",
        });
        bb.style.cssText = "width:100%;min-height:80px;margin:12px auto;background:#2b2b2b;";
        document.body.appendChild(bb);
      }, 3300);
      setTimeout(() => {
        const sports = el("div", {
          id: "leader_middle_delayed",
          class: "SportsAd ad-leader-middle SportsAd--leader-middle",
          "data-ad": "leader-middle",
          "data-ad-unit": "leader_middle",
          "data-lab-ad": "cbssports-leader-delayed",
        });
        sports.style.cssText = "width:100%;min-height:72px;margin:12px auto;background:#e8e8e8;";
        document.body.appendChild(sports);
      }, 3400);
      setTimeout(() => {
        const pogo = el("div", {
          class: "mt-12",
          "data-pogo": "footer",
          id: "footer-1",
          "data-lab-ad": "lifehacker-pogo-delayed",
        });
        pogo.style.cssText = "display:grid;width:100%;min-height:72px;margin:12px auto;background:#f7f7f7;";
        document.body.appendChild(pogo);
      }, 3500);
      setTimeout(() => {
        const wrap = el("div", { class: "row-module-and-ad" });
        const widget = el("div", {
          id: "gen-sdk-delayed",
          class: "begenuin-widget gen-sdk-class",
          "data-genuin-host": "true",
          "data-lab-ad": "usmagazine-begenuin-delayed",
        });
        widget.style.cssText = "width:100%;height:96px;margin:12px auto;background:#eee;";
        wrap.appendChild(widget);
        document.body.appendChild(wrap);
      }, 3600);
      setTimeout(() => {
        const wrap = el("div", { class: "zd-featured-deals__card-wrapper" });
        const card = el("a", {
          class: "zd-featured-deals__card",
          "data-lab-ad": "cnet-sponsored-deal-delayed",
          "data-zd-track-item-name": "Sponsored: Switch to Metro by T-Mobile and Get an iPhone 16E",
          rel: "noopener nofollow sponsored",
        });
        const title = el("span", { class: "zd-featured-deals__card-title" });
        title.textContent = "Sponsored: Switch to Metro by T-Mobile and Get an iPhone 16E";
        card.appendChild(title);
        card.style.cssText = "display:block;width:200px;min-height:72px;margin:12px auto;background:#eee;padding:8px;";
        wrap.appendChild(card);
        document.body.appendChild(wrap);
      }, 3700);
      setTimeout(() => {
        const offer = el("div", {
          class: "fairplay-container Offer right-rail-component",
          "data-qa": "fair-play-component",
          "data-lab-ad": "foxsports-betmgm-delayed",
        });
        offer.textContent = "$50 BetMGM Bonus + $1500 CLAIM";
        offer.style.cssText = "width:300px;min-height:72px;margin:12px auto;background:#111;color:#fff;padding:8px;";
        document.body.appendChild(offer);
      }, 3800);
    }
    const feed = document.getElementById("fb-feed");
    if (feed) {
      setTimeout(() => {
        const post = el("article", {
          class: "fb-post",
          "data-lab-ad": "facebook-delayed",
          "aria-label": "Sponsored",
        });
        post.innerHTML = "<header><strong>Delayed sponsored unit</strong><div>Sponsored · just now</div></header><div class='body'>Scripted insertion after the feed painted.</div>";
        feed.appendChild(post);
      }, 1500);
    }
    const grid = document.getElementById("yt-home-grid");
    if (grid) {
      setTimeout(() => {
        const ad = el("ytd-ad-slot-renderer", { "data-lab-ad": "youtube-delayed", class: "yt-card" });
        ad.appendChild(el("div", { class: "lab-fill" }, "Delayed in-feed ad after homepage paint"));
        grid.appendChild(ad);
      }, 1400);
    }
  }

  function scanPlayerHealth() {
    const video = document.querySelector("[data-lab-content='player'] video, video.html5-main-video");
    if (!video) return { ok: true, detail: "no player" };
    const rate = video.playbackRate || 1;
    const expected = window.__labExpectedRate;
    const rateOk = expected ? Math.abs(rate - expected) < 0.05 || rate === 1 : rate > 0 && rate <= 2;
    const stuck = video.paused && !video.ended && video.readyState >= 2 && video.currentTime === 0 && video.videoWidth === 0;
    const soughtAway =
      Number.isFinite(video.duration) &&
      video.duration > 12 &&
      video.currentTime >= video.duration - 0.05 &&
      video.paused;
    return {
      ok: !stuck && !soughtAway && rateOk,
      rate,
      paused: video.paused,
      t: video.currentTime,
      stuck,
      soughtAway,
    };
  }

  async function boot() {
    hydrateYouTube();
    hydrateFacebook();
    hydrateWeb();
    hydrateBypass();
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
