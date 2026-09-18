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
      setTimeout(() => {
        const slot = el("fbs-ad", {
          class: "CzQHt",
          "data-lab-ad": "forbes-fbs-ad-delayed",
          position: "topx",
        });
        slot.textContent = "ADVERTISEMENT";
        slot.style.cssText = "display:block;min-height:28px;margin:12px auto;color:#999;letter-spacing:.2em;text-align:center;";
        document.body.appendChild(slot);
      }, 3900);
      setTimeout(() => {
        const card = el("article", { "data-lab-ad": "independent-sponsored-delayed" });
        const label = el("p", { class: "slot-primary" });
        label.textContent = "SPONSORED";
        card.appendChild(label);
        card.appendChild(document.createTextNode(" Celebrate the end of summer with these Labor Day offers"));
        card.style.cssText = "max-width:230px;min-height:72px;margin:12px auto;background:#eee;padding:8px;";
        document.body.appendChild(card);
      }, 4000);
      setTimeout(() => {
        const li = el("li", { "data-lab-ad": "dailybeast-partner-delayed" });
        const ident = el("div", { class: "body-cheat__identifier body-cheat__identifier--branded" });
        ident.textContent = "PARTNER UPDATE";
        li.appendChild(ident);
        li.appendChild(document.createTextNode(" Your Current VPN May Be Spying on You"));
        li.style.cssText = "max-width:320px;min-height:72px;margin:12px auto;background:#eee;padding:8px;";
        document.body.appendChild(li);
      }, 4100);
      setTimeout(() => {
        const aside = el("aside", { class: "bc_right_sidebar" });
        const a = el("a", {
          href: "https://www.bleepingcomputer.com/rd/99/",
          "data-lab-ad": "bc-rd-banner-delayed",
        });
        a.textContent = "Material leftover banner";
        a.style.cssText = "display:block;min-height:48px;margin:12px auto;background:#222;color:#fff;padding:8px;";
        aside.appendChild(a);
        document.body.appendChild(aside);
      }, 4200);
      setTimeout(() => {
        const aside = el("aside", { class: "bc_right_sidebar" });
        const a = el("a", {
          href: "https://ztw.com/?utm_source=bleeping_computer&utm_medium=sponsor",
          "data-lab-ad": "bc-sponsor-banner-delayed",
        });
        a.textContent = "ThreatLocker leftover banner";
        a.style.cssText = "display:block;min-height:48px;margin:12px auto;background:#111;color:#fff;padding:8px;";
        aside.appendChild(a);
        document.body.appendChild(aside);
      }, 4250);
      setTimeout(() => {
        const card = el("li", { "data-lab-ad": "bc-sponsorship-delayed" });
        card.appendChild(document.createTextNode("Shadow AI is everywhere. "));
        const author = el("li", { class: "bc_news_author" });
        author.textContent = "NUDGE SECURITY SPONSORSHIP";
        const inner = el("ul");
        inner.appendChild(author);
        card.appendChild(inner);
        card.style.cssText = "max-width:640px;min-height:72px;margin:12px auto;background:#eee;padding:8px;";
        document.body.appendChild(card);
      }, 4300);
      setTimeout(() => {
        const wrap = el("div", { "data-lab-ad": "athletic-sponsored-delayed" });
        const slug = el("a", { class: "Content_SponsorSlug__IgjWM" });
        slug.textContent = "SPONSORED BY";
        wrap.appendChild(slug);
        wrap.appendChild(document.createTextNode(" FanDuel leftover partner card"));
        wrap.style.cssText = "max-width:320px;min-height:72px;margin:12px auto;background:#eee;padding:8px;";
        document.body.appendChild(wrap);
      }, 4400);
      setTimeout(() => {
        const banner = el("aside", {
          class: "featured-posts-banner",
          "data-lab-ad": "ninefive-banner-delayed",
        });
        banner.textContent = "Studio Display XDR: $330 off Buy from $2,969";
        banner.style.cssText = "display:block;min-height:72px;margin:12px auto;background:#111;color:#fff;padding:8px;";
        document.body.appendChild(banner);
      }, 4500);
      setTimeout(() => {
        const side = el("aside", { class: "sidebar" });
        const slot = el("div", { class: "hide-sm no-sticky", "data-lab-ad": "ninefive-rail-ad-delayed" });
        slot.textContent = "Ad";
        slot.style.cssText = "width:395px;min-height:80px;margin:12px auto;background:#222;color:#fff;padding:8px;";
        side.appendChild(slot);
        document.body.appendChild(side);
      }, 4600);
      setTimeout(() => {
        const ul = el("ul", { class: "styles_unorderedList__ED1tF", "data-lab-content": "target-wellness-carousel-delayed" });
        ul.style.cssText = "display:flex;gap:12px;max-width:1180px;margin:12px auto;list-style:none;padding:0;background:#fff;color:#111;";
        const organic = el("li", { class: "styles_ndsCarouselItem__REyk3", "data-lab-content": "target-organic-tile-delayed" });
        const organicCard = el("div", { "data-test": "item-card-organic-delayed" });
        const organicLink = el("a", { "data-test": "item-link" });
        organicLink.textContent = "Clean Simple Eats Protein Powder · $29.99";
        organicCard.appendChild(organicLink);
        organic.appendChild(organicCard);
        const sponsored = el("li", {
          class: "styles_ndsCarouselItem__REyk3",
          "data-lab-ad": "target-homepage-sponsored-delayed",
        });
        const card = el("div", {
          "data-test": "item-card-1011942840-delayed",
          class: "styles_ndsCard__eTjRe styles_carouselTileWrapper__QmFaj",
        });
        const link = el("a", { "data-test": "item-link", class: "styles_productTileLink__lwb3Y" });
        link.appendChild(document.createTextNode("FED Fitness Pilates Reformer · $119.99 "));
        const slug = el("p", { class: "h-text-sm h-margin-t-tiny" });
        slug.textContent = "Sponsored";
        link.appendChild(slug);
        card.appendChild(link);
        sponsored.appendChild(card);
        ul.appendChild(organic);
        ul.appendChild(sponsored);
        document.body.appendChild(ul);
      }, 4700);
      setTimeout(() => {
        const list = el("div", { id: "firehoselist-delayed", class: "fhroot", "data-lab-content": "slashdot-firehose-delayed" });
        const organicStory = el("article", { class: "fhitem fhitem-story", "data-lab-content": "slashdot-editorial-delayed" });
        organicStory.textContent = "Journalist Calls Out Collective Amnesia of Schools Romance With Big Tech";
        organicStory.style.cssText = "max-width:1037px;margin:12px auto;background:#fff;color:#111;padding:8px;";
        const sponsoredStory = el("article", {
          class: "fhitem fhitem-story article-nel-20469",
          "data-lab-ad": "slashdot-sponsored-delayed",
        });
        const disc = el("div", { class: "ntv-sponsored-disclaimer" });
        disc.textContent = "Sponsored Content";
        sponsoredStory.appendChild(disc);
        sponsoredStory.appendChild(document.createTextNode(" Compare the top business software of 2026"));
        sponsoredStory.style.cssText = "max-width:1037px;min-height:72px;margin:12px auto;background:#5c4a32;color:#fff;padding:8px;";
        list.appendChild(organicStory);
        list.appendChild(sponsoredStory);
        document.body.appendChild(list);
      }, 4800);
      setTimeout(() => {
        const sticky = el("section", {
          id: "auth0-slas-delayed",
          "data-footer-name": "mdb",
          "data-lab-ad": "slashdot-mongo-sticky-delayed",
        });
        sticky.textContent = "Gen AI apps are built with MongoDB Atlas Try Free";
        sticky.style.cssText = "display:block;min-height:90px;margin:12px auto;background:#0b2b26;color:#fff;padding:8px;";
        document.body.appendChild(sticky);
      }, 4900);
      setTimeout(() => {
        const rail = el("section", { class: "b-right-rail", "data-lab-content": "dt-deals-rail-delayed" });
        rail.style.cssText = "max-width:340px;margin:12px auto;background:#fff;color:#111;padding:8px;";
        const organicDeal = el("div", { "data-lab-content": "dt-organic-deal-delayed" });
        organicDeal.textContent = "LATEST DEALS Adobe Acrobat’s latest update could make work easier";
        const sponsored = el("div", {
          class: "b-right-rail-item b-right-rail__item",
          "data-lab-ad": "digitaltrends-sponsored-delayed",
        });
        const slug = el("div", { class: "b-sponsor b-right-rail-item__sponsor" });
        slug.textContent = "Sponsored";
        sponsored.appendChild(slug);
        sponsored.appendChild(document.createTextNode(" The best back-to-school tech deals you can get right now BRANDED CONTENT"));
        sponsored.style.cssText = "min-height:72px;background:#eee;padding:8px;";
        rail.appendChild(organicDeal);
        rail.appendChild(sponsored);
        document.body.appendChild(rail);
      }, 5000);
      setTimeout(() => {
        const river = el("div", { class: "b-river", "data-lab-content": "dt-river-delayed" });
        river.style.cssText = "max-width:1020px;margin:12px auto;background:#fff;color:#111;padding:8px;";
        const organicStory = el("article", { "data-lab-content": "dt-organic-story-delayed" });
        organicStory.textContent = "Gears of War: E-Day PC requirements are here";
        const partners = el("div", {
          class: "b-aside b-river__aside b-river__item",
          "data-lab-ad": "digitaltrends-partners-delayed",
        });
        const heading = el("div", { class: "b-aside__heading" });
        heading.textContent = "FROM OUR PARTNERS";
        const item = el("div", { class: "b-aside__item" });
        const sponsor = el("div", { class: "b-aside__sponsor" });
        sponsor.textContent = "IN PARTNERSHIP WITH METRO BY T-MOBILE";
        item.appendChild(sponsor);
        item.appendChild(document.createTextNode(" How Metro by T-Mobile is making wireless plans simpler"));
        partners.appendChild(heading);
        partners.appendChild(item);
        partners.style.cssText = "min-height:72px;background:#eee;padding:8px;";
        river.appendChild(organicStory);
        river.appendChild(partners);
        document.body.appendChild(river);
      }, 5050);
      setTimeout(() => {
        const row = el("div", { class: "HomepagePromos__row", "data-lab-content": "natgeo-latest-delayed" });
        row.style.cssText = "display:flex;gap:12px;max-width:1020px;margin:12px auto;background:#111;color:#fff;padding:8px;";
        const organicPromo = el("div", { class: "HomepagePromos__promo", "data-lab-content": "natgeo-editorial-delayed" });
        organicPromo.textContent = "The Secret Agent With the Sketchbook HISTORY & CULTURE";
        const paid = el("div", { class: "HomepagePromos__promo ListItemWrapper", "data-lab-ad": "natgeo-paid-delayed" });
        const badge = el("div", { class: "TextBadge promoted" });
        const label = el("div", { class: "label" });
        label.textContent = "Paid Content";
        badge.appendChild(label);
        paid.appendChild(badge);
        paid.appendChild(document.createTextNode(" On Mexico's Riviera Maya, Nature and Humanity Intertwine"));
        paid.style.cssText = "min-height:72px;background:#333;padding:8px;";
        row.appendChild(organicPromo);
        row.appendChild(paid);
        document.body.appendChild(row);
      }, 5100);
      setTimeout(() => {
        const carousel = el("ul", { class: "Carousel__Inner", "data-lab-content": "natgeo-carousel-delayed" });
        carousel.style.cssText = "display:flex;gap:12px;max-width:1020px;margin:12px auto;background:#111;color:#fff;padding:8px;list-style:none;";
        const organicSlide = el("li", { class: "CarouselSlide", "data-lab-content": "natgeo-carousel-editorial-delayed" });
        organicSlide.textContent = "FROM THE ARCHIVES National Geographic’s Vintage Photos of a Young Dolly Parton";
        const paidSlide = el("li", { class: "CarouselSlide", "data-lab-ad": "natgeo-paid-carousel-delayed" });
        const tile = el("div", { class: "RegularStandardPrismTile" });
        const wrap = el("ul", { class: "SectionLabelWrapper RegularStandardPrismTile__SectionLabel" });
        const slug = el("li", { class: "SectionLabel" });
        slug.textContent = "Paid Content";
        wrap.appendChild(slug);
        tile.appendChild(wrap);
        tile.appendChild(document.createTextNode(" On Mexico's Riviera Maya, Nature and Humanity Intertwine"));
        paidSlide.appendChild(tile);
        paidSlide.style.cssText = "min-height:72px;background:#333;padding:8px;";
        carousel.appendChild(organicSlide);
        carousel.appendChild(paidSlide);
        document.body.appendChild(carousel);
      }, 5150);
      setTimeout(() => {
        const section = el("section", { "data-lab-content": "vb-infra-delayed" });
        section.style.cssText = "max-width:1020px;margin:12px auto;background:#fff;color:#111;padding:8px;";
        const grid = el("div", { class: "grid lg:grid-cols-4" });
        const organic = el("article", { "data-lab-content": "vb-organic-delayed" });
        organic.textContent = "Cohere's Model Vault now encrypts AI inference";
        const partner = el("article", {
          class: "flex flex-col gap-12",
          "data-lab-ad": "venturebeat-partner-delayed",
        });
        const slug = el("p", { class: "font-label text-editorial-label-030" });
        slug.textContent = "PARTNER CONTENT";
        partner.appendChild(slug);
        partner.appendChild(document.createTextNode(" AI agents are breaking the batch-era assumptions behind object storage"));
        partner.style.cssText = "min-height:72px;background:#eee;padding:8px;";
        grid.appendChild(organic);
        grid.appendChild(partner);
        section.appendChild(grid);
        document.body.appendChild(section);
      }, 5200);
      setTimeout(() => {
        const river = el("div", { class: "river__posts", "data-lab-content": "ninefivegoogle-river-delayed" });
        river.style.cssText = "max-width:777px;margin:12px auto;background:#fff;color:#111;padding:8px;";
        const organic = el("article", { class: "article standard", "data-lab-content": "ninefivegoogle-editorial-delayed" });
        organic.textContent = "Google Keep update tweaks the homescreen widget on Android Abner Li";
        const sponsored = el("article", {
          class: "article standard",
          "data-lab-ad": "ninefivegoogle-sponsored-delayed",
        });
        sponsored.appendChild(document.createTextNode("I swapped my outdoor lantern bulbs for Linkind’s Smart Light Stick "));
        const meta = el("div", { class: "post-meta flex" });
        const author = el("span", { class: "author__link" });
        author.textContent = "Sponsored Post";
        meta.appendChild(author);
        sponsored.appendChild(meta);
        sponsored.style.cssText = "min-height:72px;background:#eee;padding:8px;";
        river.appendChild(organic);
        river.appendChild(sponsored);
        document.body.appendChild(river);
      }, 5250);
      setTimeout(() => {
        const feed = el("section", { class: "main-content", "data-lab-content": "ign-feed-delayed" });
        feed.style.cssText = "max-width:661px;margin:12px auto;background:#fff;color:#111;padding:8px;";
        const organic = el("div", { class: "content-item", "data-lab-content": "ign-editorial-delayed" });
        organic.textContent = "The Weight Review Ethan Hawke puts the pedal to the metal";
        const promoted = el("div", {
          class: "content-item promoted-item",
          "data-lab-ad": "ign-promoted-delayed",
        });
        promoted.appendChild(document.createTextNode("RAVEN2 - ZERO Lets Players Enter an Apocalyptic MMORPG "));
        const btn = el("button", { class: "sponsor-disclosure" });
        btn.textContent = "PROMOTED";
        promoted.appendChild(btn);
        promoted.style.cssText = "min-height:72px;background:#eee;padding:8px;";
        feed.appendChild(organic);
        feed.appendChild(promoted);
        document.body.appendChild(feed);
      }, 5300);
      setTimeout(() => {
        const grid = el("div", {
          class: "UCCPatternstyles__UCCPatternCardGrid-sc-7uvllb-1",
          "data-lab-content": "thrillist-grid-delayed",
        });
        grid.style.cssText = "max-width:1200px;margin:12px auto;background:#fff;color:#111;padding:8px;";
        const organic = el("div", {
          class: "UniversalContentCardstyles__UCCContainer-sc-zezg1y-8",
          "data-lab-content": "thrillist-editorial-delayed",
        });
        organic.textContent = "The Ultimate Weekend in Atlanta For a Sports Fan";
        const partner = el("div", {
          class: "UniversalContentCardstyles__UCCContainer-sc-zezg1y-8",
          "data-lab-ad": "thrillist-partner-delayed",
        });
        const slug = el("div", { class: "UniversalContentCardstyles__UCCSecondaryTag-sc-zezg1y-6" });
        slug.textContent = "PARTNER CONTENT FROM RING";
        partner.appendChild(slug);
        partner.appendChild(document.createTextNode(" Holiday From Anywhere with Ring"));
        partner.style.cssText = "min-height:72px;background:#eee;padding:8px;";
        grid.appendChild(organic);
        grid.appendChild(partner);
        document.body.appendChild(grid);
      }, 5350);
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
