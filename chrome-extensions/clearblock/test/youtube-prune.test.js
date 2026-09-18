#!/usr/bin/env node
"use strict";

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const prunePath = path.join(__dirname, "..", "src", "youtube-prune.js");
const sandbox = { globalThis: {} };
sandbox.globalThis = sandbox;
vm.runInNewContext(fs.readFileSync(prunePath, "utf8"), sandbox);
const prune = sandbox.ClearblockYoutubePrune;

function assert(cond, message) {
  if (!cond) {
    console.error("FAIL:", message);
    process.exitCode = 1;
  } else {
    console.log("ok:", message);
  }
}

const playerJson = JSON.stringify({
  videoDetails: { videoId: "abc", title: "Never block me" },
  streamingData: { serverAbrStreamingUrl: "https://googlevideo.com/videoplayback?id=1" },
  adPlacements: [{ playerAttachedAdPlacementRenderer: { adSlotRenderer: { slot: 1 } } }],
  adSlots: [{ getMidroll: true }],
  playerAds: [{ instreamVideoAdRenderer: {} }],
  adBreakHeartbeatParams: { ping: true },
  playerAdvertisement: { instream: true },
  adBreaks: [{ offset: 15 }],
  contents: {
    twoColumnWatchNextResults: {
      results: {
        results: {
          contents: [
            { videoPrimaryInfoRenderer: { title: "ok" } },
            { adSlotRenderer: { adSlot: "sidebar" } },
            { promotedSparklesWebRenderer: { title: "buy" } },
          ],
        },
      },
    },
  },
});

assert(prune.shouldPatchUrl("https://www.youtube.com/youtubei/v1/player?key=1"), "player innertube is patched");
assert(prune.shouldPatchUrl("https://www.youtube.com/youtubei/v1/next?prettyPrint=false"), "next innertube is patched");
assert(!prune.shouldPatchUrl("https://www.youtube.com/s/player/abc/player_ias.vflset/en_US/base.js"), "player script is not patched");

const renamed = prune.renameAdKeys(playerJson);
assert(renamed.includes('"no_ads"'), "ad keys renamed to no_ads");
assert(!renamed.includes('"adPlacements"'), "adPlacements key gone");
assert(!renamed.includes('"adSlots"'), "adSlots key gone");
assert(renamed.includes('"serverAbrStreamingUrl":"https://googlevideo.com/videoplayback?id=1"'), "streaming URL unchanged");
assert(renamed.includes('"videoId":"abc"'), "video id unchanged");
assert(!renamed.includes('"playerAdvertisement"'), "playerAdvertisement key gone");
assert(!renamed.includes('"adBreaks"'), "adBreaks key gone");

const parsed = JSON.parse(playerJson);
prune.prunePlayerObject(parsed, 0);
assert(Array.isArray(parsed.adPlacements) && parsed.adPlacements.length === 0, "adPlacements emptied");
assert(parsed.streamingData.serverAbrStreamingUrl.includes("googlevideo.com"), "prune does not touch streamingData");
assert(parsed.videoDetails.title === "Never block me", "prune does not touch videoDetails");
const items = parsed.contents.twoColumnWatchNextResults.results.results.contents;
assert(items.length === 1 && items[0].videoPrimaryInfoRenderer, "ad renderers spliced out of watch next");

console.log(process.exitCode ? "youtube prune tests failed" : "youtube prune tests passed");
