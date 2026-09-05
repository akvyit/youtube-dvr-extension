"use strict";

// Interop with "Simple YouTube Age Restriction Bypass" and native YouTube player logic
const {
    get: getter,
    set: setter,
} = Object.getOwnPropertyDescriptor(Object.prototype, "playerResponse") ?? {
    set(value) {
        this[Symbol.for("YTBetter")] = value;
    },
    get() {
        return this[Symbol.for("YTBetter")];
    },
};

const isObject = (value) => value != null && typeof value === "object";
const getKeyByPropName = (object, value) => Object.keys(object).find(key => object[key] && object[key][value]);

// Hook into the playerResponse setter to modify stream data before the player sees it
Object.defineProperty(Object.prototype, "playerResponse", {
    set(value) {
        if (isObject(value)) {
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
                        const key = getKeyByPropName(this, 'experiments');
                        if (key && this[key] && this[key].experiments && this[key].experiments.flags) {
                            this[key].experiments.flags[s3] = maxDvrSecs;
                        }
                    }
                }
            }
        }
        // Call the original setter to let YouTube process the data
        setter.call(this, value);
    },
    get() {
        return getter.call(this);
    },
    configurable: true,
});

console.log("[YT Live DVR Unlocker] Loaded and hooked into playerResponse.");