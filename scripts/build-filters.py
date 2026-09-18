#!/usr/bin/env python3
"""Compile bundled EasyList into MV3 declarativeNetRequest + cosmetic files."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "chrome-extensions" / "clearblock"
EASYLIST = ROOT / "filters" / "easylist.txt"
RULES = ROOT / "rules"

MAX_BLOCK_RULES = 26_000
MAX_ALLOW_RULES = 400
MAX_GENERIC_SELECTORS = 20_000
MAX_SPECIFIC_SELECTORS = 20_000
PRIORITY_COSMETIC_HOSTS = ("youtube.com", "m.youtube.com", "youtube-nocookie.com", "youtu.be")

# Generic EasyList blocks never include `media`. Blocking media on a shared
# CDN is how ad blockers accidentally kill HTML5 / HLS / DASH playback.
RESOURCE_TYPES = [
    "sub_frame",
    "stylesheet",
    "script",
    "image",
    "font",
    "object",
    "xmlhttprequest",
    "ping",
    "websocket",
    "other",
]

# Known ad networks may still block media — those hosts serve ad creatives, not
# the video the user asked to watch.
AD_NETWORK_RESOURCE_TYPES = RESOURCE_TYPES + ["media"]

NEVER_BLOCK_DOMAINS = {
    "google.com",
    "googleapis.com",
    "gstatic.com",
    "googleusercontent.com",
    "gvt1.com",
    "gvt2.com",
    "youtube.com",
    "youtu.be",
    "youtube-nocookie.com",
    "ytimg.com",
    "ggpht.com",
    "googlevideo.com",
    "youtubekids.com",
    "youtube.googleapis.com",
    "jnn-pa.googleapis.com",
    "wide-vine.com",
    "widevine.com",
    "recaptcha.net",
    "g.co",
    "googleadservices.com",  # blocked via dedicated youtube ruleset, not generic
    "vimeo.com",
    "vimeocdn.com",
    "ttvnw.net",
    "jtvnw.net",
    "twitch.tv",
    "twitchcdn.net",
    "video.twimg.com",
    "pscp.tv",
    "dailymotion.com",
    "dmcdn.net",
    "cloudflarestream.com",
    "mux.com",
    "mux.dev",
    "cloudflare.com",
    "jsdelivr.net",
    "unpkg.com",
    "cdnjs.cloudflare.com",
    "jquery.com",
    "wikipedia.org",
    "wikimedia.org",
    "github.com",
    "githubusercontent.com",
    "mozilla.org",
    "apple.com",
    "microsoft.com",
    "windowsupdate.com",
}

# Highest-priority DNR allows. These beat every block ruleset.
MEDIA_ALLOW_DOMAINS = [
    "googlevideo.com",
    "ytimg.com",
    "ggpht.com",
    "googleusercontent.com",
    "gvt1.com",
    "gvt2.com",
    "gstatic.com",
    "youtube.googleapis.com",
    "jnn-pa.googleapis.com",
    "widevine.com",
    "vimeo.com",
    "vimeocdn.com",
    "ttvnw.net",
    "jtvnw.net",
    "twitchcdn.net",
    "video.twimg.com",
    "pscp.tv",
    "dailymotion.com",
    "dmcdn.net",
    "cloudflarestream.com",
    "mux.com",
    "mux.dev",
    "mozilla.net",
    "mozilla.org",
    "media.cnn.com",
    "cdn.cnn.com",
]

MEDIA_ALLOW_PATHS = [
    "||youtube.com/s/player",
    "||youtube.com/embed",
    "||youtube.com/iframe_api",
    "||youtube.com/get_video_info",
    "||youtube.com/api/stats/watchtime",
    "||youtube-nocookie.com/s/player",
    "||youtube-nocookie.com/embed",
    "||youtube-nocookie.com/iframe_api",
    "||youtu.be/",
]

VIDEO_PATH_RE = re.compile(
    r"videoplayback|\.m3u8|\.mpd|\.m4s(\b|$)|/hls/|/dash/|\.webm|\.m4v\b",
    re.I,
)

AD_NETWORK_ALLOW_DENY = re.compile(
    r"doubleclick|googlesyndication|googleadservices|adservice\.google|"
    r"pagead|2mdn\.net|googletagservices|ads\.youtube",
    re.I,
)

# Always-on high-priority network filters. YouTube video bytes live on
# googlevideo.com, so we never block that host — only known ad endpoints.
YOUTUBE_AND_CORE = [
    "||doubleclick.net^",
    "||googleadservices.com^",
    "||googlesyndication.com^",
    "||googletagservices.com^",
    "||adservice.google.com^",
    "||2mdn.net^",
    "||ads.youtube.com^",
    "||youtube.com/pagead",
    "||youtube.com/ptracking",
    "||youtube.com/api/stats/ads",
    "||youtube.com/api/stats/atr",
    "||youtube.com/get_midroll_",
    "||youtube.com/pcs/activeview",
    "||youtube.com/pcs/view",
    "||youtube.com/pagead/",
    "||s.youtube.com/api/stats/ads",
    "||youtube.com/youtubei/v1/player/ad",
    "||youtube.com/youtubei/v1/player/ad_break",
    "||youtube.com/generate_204?ctia=",
    "||google.com/pagead",
    "||google.com/pagead/",
    "||youtube.com/get_midroll",
    "||fwmrm.net^",
    "||innovid.com^",
    "||serving-sys.com^",
    "||adsafeprotected.com^",
    "||moatads.com^",
    "||scorecardresearch.com^",
    "||amazon-adsystem.com^",
    "||advertising.com^",
    "||adsystem.com^",
    "||adnxs.com^",
    "||adsrvr.org^",
    "||adform.net^",
    "||criteo.com^",
    "||criteo.net^",
    "||taboola.com^",
    "||outbrain.com^",
    "||mgid.com^",
    "||revcontent.com^",
    "||zedo.com^",
    "||rubiconproject.com^",
    "||pubmatic.com^",
    "||openx.net^",
    "||casalemedia.com^",
    "||bidswitch.net^",
    "||smartadserver.com^",
    "||indexww.com^",
    "||quantserve.com^",
    "||quantcount.com^",
    "||media.net^",
    "||contextweb.com^",
    "||bluekai.com^",
    "||exelator.com^",
    "||krxd.net^",
    "||rlcdn.com^",
    "||agkn.com^",
    "||ads-twitter.com^",
    "||ads.linkedin.com^",
    "||connect.facebook.net^*/fbevents.js",
    "||facebook.com/tr?",
    "||hotjar.com^",
    "||hotjar.io^",
    "||clarity.ms^",
    "||sentry-cdn.com^/clarity",
    "||branch.io^",
    "||appsflyer.com^",
    "||adjust.com^",
    "||popads.net^",
    "||popcash.net^",
    "||propellerads.com^",
    "||propellerclick.com^",
    "||adcash.com^",
    "||adsterra.com^",
    "||exoclick.com^",
    "||juicyads.com^",
    "||hilltopads.com^",
    "||ad-maven.com^",
    "||mgid.com^",
    "||yandex.ru/ads",
    "||an.yandex.ru^",
    "||mc.yandex.ru^",
    "||advertising.yandex.ru^",
    "||pagead2.googlesyndication.com^",
    "||tpc.googlesyndication.com^",
    "||googleads.g.doubleclick.net^",
    "||static.doubleclick.net^",
    "||ad.doubleclick.net^",
    "||cm.g.doubleclick.net^",
    "||g.doubleclick.net^",
    "||partner.googleadservices.com^",
    "||www.googleadservices.com^",
    "||pagead.googlesyndication.com^",
    "||adtrafficquality.google^",
    "||an.facebook.com^",
    "||pixel.facebook.com^",
    "||ads.twitter.com^",
    "||snap.licdn.com^",
    "||ads.yieldmo.com^",
    "||yieldmo.com^",
    "||s.yimg.com/rq/darla",
    "||bat.bing.com^",
    "||googletagmanager.com/gtag/js?id=AW",
    "||google-analytics.com^",
    "||facebook.com/tr",
    "||fundingchoicesmessages.google.com^",
    "||fundingchoices.google.com^",
    "||ad.dailymotion.com^",
    "||ads.dailymotion.com^",
    "||smilewanted.com^",
]

KEYWORD_RE = re.compile(
    r"(ads?|adsrvr|adnxs|doubleclick|syndication|sponsor|banner|popup|popunder|"
    r"track(ing|er)?|pixel|affiliat|advert|adserv|adsys|adimg|adbox|adframe|"
    r"prebid|taboola|outbrain|criteo|pubmatic|openx|rubicon|moat|innovid|fwmrm)",
    re.I,
)
HEX_LABEL_RE = re.compile(r"^[0-9a-f]{8,}$", re.I)
DOMAIN_RE = re.compile(r"^[a-z0-9.-]+\.[a-z]{2,}$", re.I)

SKIP_OPTIONS = {
    "redirect",
    "redirect-rule",
    "csp",
    "removeparam",
    "cookie",
    "replace",
    "hls",
    "jsonprune",
    "header",
    "permissions",
    "rewrite",
}

TYPE_MAP = {
    "script": "script",
    "image": "image",
    "stylesheet": "stylesheet",
    "object": "object",
    "object-subrequest": "object",
    "subdocument": "sub_frame",
    "xmlhttprequest": "xmlhttprequest",
    "xhr": "xmlhttprequest",
    "ping": "ping",
    "websocket": "websocket",
    "media": "media",
    "font": "font",
    "other": "other",
}


def never_block(domain: str) -> bool:
    host = domain.lower().rstrip(".")
    for banned in NEVER_BLOCK_DOMAINS:
        if host == banned or host.endswith("." + banned):
            return True
    return False


def valid_url_filter(url_filter: str) -> bool:
    if not url_filter or len(url_filter) > 900:
        return False
    if url_filter.count("*") > 5:
        return False
    if url_filter in {"*", "||", "||*", "||^", "|", "^"}:
        return False
    try:
        url_filter.encode("ascii")
    except UnicodeEncodeError:
        return False
    return True


def parse_options(raw: str) -> dict | None:
    types: list[str] = []
    excluded_types: set[str] = set()
    domain_type = None
    initiator: list[str] = []
    excluded_initiator: list[str] = []
    if not raw:
        return {
            "resourceTypes": list(RESOURCE_TYPES),
            "domainType": None,
            "initiatorDomains": None,
            "excludedInitiatorDomains": None,
        }
    for part in raw.split(","):
        part = part.strip()
        if not part:
            continue
        key = part.split("=", 1)[0].lstrip("~").lower()
        if key in SKIP_OPTIONS or key in {
            "elemhide",
            "generichide",
            "specifichide",
            "inline-script",
            "inline-font",
            "popup",
            "document",
            "genericblock",
            "important",
            "match-case",
            "empty",
            "mp4",
            "all",
        }:
            if key in SKIP_OPTIONS:
                return None
            if key in {"popup", "document", "elemhide", "generichide", "specifichide"}:
                return None
            continue
        negated = part.startswith("~")
        if part in {"third-party", "~first-party"}:
            domain_type = "thirdParty"
            continue
        if part in {"first-party", "~third-party"}:
            domain_type = "firstParty"
            continue
        if key == "domain" and "=" in part:
            _, value = part.split("=", 1)
            for item in value.split("|"):
                item = item.strip().lower()
                if not item:
                    continue
                if item.startswith("~"):
                    host = item[1:]
                    if DOMAIN_RE.match(host):
                        excluded_initiator.append(host)
                elif DOMAIN_RE.match(item):
                    initiator.append(item)
            continue
        mapped = TYPE_MAP.get(key)
        if mapped:
            if negated:
                excluded_types.add(mapped)
            else:
                types.append(mapped)
            continue
        # Unknown option — skip the filter rather than guess.
        return None

    resource_types = types or list(RESOURCE_TYPES)
    resource_types = [t for t in resource_types if t not in excluded_types]
    if not resource_types:
        return None
    if initiator and len(initiator) > 40:
        return None
    if excluded_initiator and len(excluded_initiator) > 40:
        return None
    return {
        "resourceTypes": resource_types,
        "domainType": domain_type,
        "initiatorDomains": initiator or None,
        "excludedInitiatorDomains": excluded_initiator or None,
    }


def to_url_filter(body: str) -> str | None:
    body = body.strip()
    if not body or body.startswith("/") and body.endswith("/") and body.count("/") == 2:
        return None
    if body.startswith("||"):
        rest = body[2:]
        if rest.startswith("*") or not rest:
            return None
        return body
    if body.startswith("|http"):
        return body
    # Path / token filters become substring urlFilters.
    if "*" in body or body.startswith(".") or body.startswith("-") or body.startswith("/"):
        return "*" + body if not body.startswith("*") else body
    return body


def domain_from_hostname_filter(body: str) -> str | None:
    if not body.startswith("||"):
        return None
    rest = body[2:]
    host = re.split(r"[/^]", rest, 1)[0].lower()
    if "*" in host or not DOMAIN_RE.match(host):
        return None
    return host


def selector_ok(selector: str) -> bool:
    if not selector or len(selector) > 300:
        return False
    if any(ch in selector for ch in ("'", '"', "\\", "{", "}")):
        return False
    # Procedural cosmetic filters (EasyList `:has` is OK in Chrome; ABP `:style` is not).
    if ":style(" in selector or ":remove()" in selector or ":xpath(" in selector:
        return False
    return True


def iter_sections(text: str):
    current = "header"
    for line in text.splitlines():
        if line.startswith("! ***"):
            current = line.strip()
        yield current, line


def build() -> None:
    if not EASYLIST.exists():
        raise SystemExit(f"Missing {EASYLIST}")

    text = EASYLIST.read_text(encoding="utf-8", errors="replace")
    version_line = next((ln[2:].strip() for ln in text.splitlines() if ln.startswith("! Version:")), "unknown")

    block_domains: dict[str, int] = {}
    path_rules: list[tuple[int, str, dict]] = []
    allow_rules: list[tuple[str, dict]] = []
    generic_selectors: list[str] = []
    specific: dict[str, list[str]] = {}

    def score_domain(domain: str, section: str) -> int:
        score = 10
        if KEYWORD_RE.search(domain):
            score += 80
        if "adservers" in section:
            score += 40
        if "thirdparty" in section:
            score += 30
        if "general_block" in section:
            score += 20
        label = domain.split(".")[0]
        if HEX_LABEL_RE.match(label):
            score -= 50
        if any(ch in label for ch in "aeiou") and not label.isdigit():
            score += 5
        return score

    for section, raw in iter_sections(text):
        line = raw.strip()
        if not line or line.startswith("!"):
            continue

        if line.startswith("@@"):
            body_opts = line[2:]
            body, _, opt = body_opts.partition("$")
            parsed = parse_options(opt)
            url_filter = to_url_filter(body)
            if parsed and url_filter and valid_url_filter(url_filter):
                allow_rules.append((url_filter, parsed))
            continue

        if "#@#" in line or "#?#" in line:
            continue

        if line.startswith("##"):
            selector = line[2:]
            if selector_ok(selector):
                generic_selectors.append(selector)
            continue

        if "##" in line:
            host_part, selector = line.split("##", 1)
            if not selector_ok(selector):
                continue
            if not host_part:
                generic_selectors.append(selector)
            else:
                for host in host_part.split(","):
                    host = host.strip().lower().lstrip("~")
                    if not host or not DOMAIN_RE.match(host):
                        continue
                    specific.setdefault(host, []).append(selector)
            continue

        if line.startswith("||") or line.startswith("|") or line[:1] in ".-/*&":
            body, _, opt = line.partition("$")
            parsed = parse_options(opt)
            if not parsed:
                continue
            url_filter = to_url_filter(body)
            if not url_filter or not valid_url_filter(url_filter):
                continue
            host = domain_from_hostname_filter(body)
            if host and never_block(host) and "/" not in url_filter.replace("||", ""):
                continue
            if VIDEO_PATH_RE.search(body):
                continue
            if host and "^" in body and "/" not in body.split("$")[0]:
                # Pure domain block — keep the best score per domain.
                block_domains[host] = max(block_domains.get(host, -999), score_domain(host, section))
            else:
                priority = 8 if "general_block" in section else 4
                path_rules.append((priority, url_filter, parsed))

    ranked_domains = sorted(block_domains.items(), key=lambda kv: (-kv[1], kv[0]))

    youtube_rules = []
    seen_filters = set()
    rid = 1
    for url_filter in YOUTUBE_AND_CORE:
        if url_filter in seen_filters or not valid_url_filter(url_filter):
            continue
        seen_filters.add(url_filter)
        youtube_rules.append(
            {
                "id": rid,
                "priority": 20,
                "action": {"type": "block"},
                "condition": {"urlFilter": url_filter, "resourceTypes": list(AD_NETWORK_RESOURCE_TYPES)},
            }
        )
        rid += 1

    ads_rules = []
    rid = 1
    for domain, _score in ranked_domains:
        if rid > MAX_BLOCK_RULES - 1500:
            break
        if never_block(domain):
            continue
        url_filter = f"||{domain}^"
        if url_filter in seen_filters:
            continue
        seen_filters.add(url_filter)
        ads_rules.append(
            {
                "id": rid,
                "priority": 1,
                "action": {"type": "block"},
                "condition": {"urlFilter": url_filter, "resourceTypes": list(RESOURCE_TYPES)},
            }
        )
        rid += 1

    for _prio, url_filter, parsed in sorted(path_rules, key=lambda x: -x[0]):
        if rid > MAX_BLOCK_RULES:
            break
        if url_filter in seen_filters:
            continue
        seen_filters.add(url_filter)
        condition = {"urlFilter": url_filter, "resourceTypes": [t for t in parsed["resourceTypes"] if t != "media"] or list(RESOURCE_TYPES)}
        if parsed["domainType"]:
            condition["domainType"] = parsed["domainType"]
        if parsed["initiatorDomains"]:
            condition["initiatorDomains"] = parsed["initiatorDomains"]
        if parsed["excludedInitiatorDomains"]:
            condition["excludedInitiatorDomains"] = parsed["excludedInitiatorDomains"]
        ads_rules.append({"id": rid, "priority": 2, "action": {"type": "block"}, "condition": condition})
        rid += 1

    allow_out = []
    rid = 1
    seen_allow = set()
    for url_filter, parsed in allow_rules:
        if rid > MAX_ALLOW_RULES:
            break
        if AD_NETWORK_ALLOW_DENY.search(url_filter):
            continue
        key = (url_filter, tuple(parsed["resourceTypes"]), parsed["domainType"])
        if key in seen_allow:
            continue
        seen_allow.add(key)
        resource_types = [t for t in parsed["resourceTypes"] if t != "media"] or list(RESOURCE_TYPES)
        condition = {"urlFilter": url_filter, "resourceTypes": resource_types}
        if parsed["domainType"]:
            condition["domainType"] = parsed["domainType"]
        if parsed["initiatorDomains"]:
            condition["initiatorDomains"] = parsed["initiatorDomains"]
        if parsed["excludedInitiatorDomains"]:
            condition["excludedInitiatorDomains"] = parsed["excludedInitiatorDomains"]
        allow_out.append({"id": rid, "priority": 50, "action": {"type": "allow"}, "condition": condition})
        rid += 1

    media_rules = []
    mid = 1
    all_types = list(AD_NETWORK_RESOURCE_TYPES)
    media_rules.append(
        {
            "id": mid,
            "priority": 500,
            "action": {"type": "allow"},
            "condition": {"requestDomains": list(MEDIA_ALLOW_DOMAINS), "resourceTypes": all_types},
        }
    )
    mid += 1
    media_rules.append(
        {
            "id": mid,
            "priority": 500,
            "action": {"type": "allow"},
            "condition": {
                "requestDomains": ["youtube.com", "youtube-nocookie.com", "youtu.be", "youtubekids.com"],
                "resourceTypes": ["media"],
            },
        }
    )
    mid += 1
    for url_filter in MEDIA_ALLOW_PATHS:
        if not valid_url_filter(url_filter):
            continue
        media_rules.append(
            {
                "id": mid,
                "priority": 500,
                "action": {"type": "allow"},
                "condition": {"urlFilter": url_filter, "resourceTypes": all_types},
            }
        )
        mid += 1

    # Deduplicate generic selectors, keep EasyList order (usually higher-signal first).
    seen_sel = set()
    generic_unique = []
    for sel in generic_selectors:
        if sel in seen_sel:
            continue
        seen_sel.add(sel)
        generic_unique.append(sel)
        if len(generic_unique) >= MAX_GENERIC_SELECTORS:
            break

    css_chunks = [sel + "{display:none!important}" for sel in generic_unique]
    generic_css = (
        f"/* EasyList generic cosmetics — bundled snapshot {version_line} */\n"
        + "\n".join(css_chunks)
        + "\n"
    )

    specific_trim: dict[str, list[str]] = {}
    count_spec = 0

    def add_specific(host: str, sels: list[str]) -> None:
        nonlocal count_spec
        if host in specific_trim or count_spec >= MAX_SPECIFIC_SELECTORS:
            return
        uniq = []
        seen: set[str] = set()
        for sel in sels:
            if sel in seen:
                continue
            seen.add(sel)
            uniq.append(sel)
        if not uniq:
            return
        specific_trim[host] = uniq
        count_spec += len(uniq)

    for host in PRIORITY_COSMETIC_HOSTS:
        if host in specific:
            add_specific(host, specific[host])
    for host, sels in specific.items():
        add_specific(host, sels)

    RULES.mkdir(exist_ok=True)
    (RULES / "dnr-youtube.json").write_text(json.dumps(youtube_rules, separators=(",", ":")), encoding="utf-8")
    (RULES / "dnr-ads.json").write_text(json.dumps(ads_rules, separators=(",", ":")), encoding="utf-8")
    (RULES / "dnr-allow.json").write_text(json.dumps(allow_out, separators=(",", ":")), encoding="utf-8")
    (RULES / "dnr-media.json").write_text(json.dumps(media_rules, separators=(",", ":")), encoding="utf-8")
    (RULES / "cosmetic-generic.css").write_text(generic_css, encoding="utf-8")
    (RULES / "cosmetic-specific.json").write_text(json.dumps(specific_trim, separators=(",", ":")), encoding="utf-8")
    (RULES / "manifest-meta.json").write_text(
        json.dumps(
            {
                "easylistVersion": version_line,
                "youtubeRules": len(youtube_rules),
                "adRules": len(ads_rules),
                "allowRules": len(allow_out),
                "mediaAllowRules": len(media_rules),
                "genericSelectors": len(generic_unique),
                "specificHosts": len(specific_trim),
                "specificSelectors": count_spec,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(json.loads((RULES / "manifest-meta.json").read_text()), indent=2))


if __name__ == "__main__":
    build()
