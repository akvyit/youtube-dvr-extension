"use strict";

const isObject = (value) => value != null && typeof value === "object";
const getKeyByPropName = (object, value) => Object.keys(object).find(key => object[key] && object[key][value]);

// Core patch logic (unchanged behavior), now called explicitly instead of
// being triggered via a global Object.prototype accessor.
function patchPlayerResponse(value) {
    if (!isObject(value)) return value;

    const { streamingData, videoDetails, playerConfig, microformat } = value;

    // Only affect live streams
    if (isObject(videoDetails) && videoDetails.isLive) {
        // Enable DVR if it's disabled
        videoDetails.isLiveDvrEnabled = true;

        // Disable server-side ads that block live rewind (Server Driven ABR)
        if (isObject(playerConfig) && playerConfig.mediaCommonConfig) {
            const mcConf = playerConfig.mediaCommonConfig;
            mcConf.useServerDrivenAbr = false;

            if (mcConf.serverPlaybackStartConfig) {
                mcConf.serverPlaybackStartConfig.enable = false;
            }
        }

        if (isObject(streamingData)) {
            // Critical: Remove the stream URL with server-side enforcement
            // This forces the player to use HLS/DASH manifests which often contain the DVR window
            if (streamingData.serverAbrStreamingUrl && (streamingData.hlsManifestUrl || streamingData.dashManifestUrl)) {
                delete streamingData.serverAbrStreamingUrl;
            }

            // Logic to unlock rewind for streams longer than 12 hours
            const maxDefault = 43200; // 12 hours
            const maxDvrSecs = maxDefault * 14; // Up to ~7 days
            let durationSecs = 0;

            const s1 = 'playerMicroformatRenderer';
            const s2 = 'liveBroadcastDetails';
            const s3 = 'html5_max_live_dvr_window_plus_margin_secs';

            if (isObject(microformat) && isObject(microformat[s1]) && isObject(microformat[s1][s2])) {
                const nowSecs = new Date();
                const startSecs = new Date(microformat[s1][s2].startTimestamp);
                durationSecs = Math.floor((nowSecs - startSecs) / 1000);
            }

            // Proceed if the stream is longer than 12 hours
            if (durationSecs > maxDefault) {
                if (isObject(streamingData.adaptiveFormats)) {
                    for (const format of streamingData.adaptiveFormats) {
                        format.maxDvrDurationSec = maxDvrSecs;
                    }
                }

                // Try to find the experiments flags and modify the DVR window limit
                const key = getKeyByPropName(value, 'experiments');
                if (key && value[key] && value[key].experiments && value[key].experiments.flags) {
                    value[key].experiments.flags[s3] = maxDvrSecs;
                }
            }
        }
    }

    return value;
}

/* ----------------------------------------------------------------------
 * 1) Initial page load: YouTube embeds the data as
 *    `var ytInitialPlayerResponse = {...}` directly on `window`.
 *    We only hook this ONE property on `window`, never on Object.prototype,
 *    so no other object on the page is affected.
 * ------------------------------------------------------------------- */
(function hookInitialPlayerResponse() {
    let stored;
    try {
        const existing = Object.getOwnPropertyDescriptor(window, "ytInitialPlayerResponse");
        // If some other script/extension already defined an accessor here, chain through it.
        if (existing && (existing.get || existing.set)) {
            const prevGet = existing.get ?? (() => stored);
            const prevSet = existing.set ?? ((v) => { stored = v; });
            Object.defineProperty(window, "ytInitialPlayerResponse", {
                configurable: true,
                get: prevGet,
                set(v) { prevSet.call(window, patchPlayerResponse(v)); },
            });
            return;
        }
    } catch (e) { /* ignore and fall through to plain definition */ }

    Object.defineProperty(window, "ytInitialPlayerResponse", {
        configurable: true,
        get() { return stored; },
        set(v) { stored = patchPlayerResponse(v); },
    });
})();

/* ----------------------------------------------------------------------
 * 2) SPA navigation (switching videos without a full page reload):
 *    YouTube fetches new player data from the internal
 *    `/youtubei/v1/player` endpoint. We patch only THAT response body,
 *    leaving every other network response (including comments/continuation
 *    endpoints such as `/youtubei/v1/next`) completely untouched.
 * ------------------------------------------------------------------- */
(function hookPlayerFetch() {
    const originalFetch = window.fetch;
    if (typeof originalFetch !== "function") return;

    window.fetch = async function (...args) {
        const response = await originalFetch.apply(this, args);

        try {
            const url = typeof args[0] === "string" ? args[0] : (args[0] && args[0].url) || "";
            if (!url.includes("/youtubei/v1/player")) {
                return response; // not a player-response request, leave untouched
            }

            const cloned = response.clone();
            const json = await cloned.json();
            const patched = patchPlayerResponse(json);

            return new Response(JSON.stringify(patched), {
                status: response.status,
                statusText: response.statusText,
                headers: response.headers,
            });
        } catch (e) {
            // If anything goes wrong parsing/patching, fall back to the
            // original untouched response rather than breaking playback.
            console.warn("[YT Live DVR Unlocker] Failed to patch fetch response:", e);
            return response;
        }
    };
})();

console.log("[YT Live DVR Unlocker] Loaded (scoped hooks only, no Object.prototype patch).");