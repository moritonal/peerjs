"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// import { webRTCAdapter } from './adapter';
var wrtc_1 = require("wrtc");
exports.Supports = new /** @class */ (function () {
    function class_1() {
        this.isIOS = ['iPad', 'iPhone', 'iPod'].includes("Node");
        this.supportedBrowsers = ['firefox', 'chrome', 'safari'];
        this.minFirefoxVersion = 59;
        this.minChromeVersion = 72;
        this.minSafariVersion = 605;
    }
    class_1.prototype.isWebRTCSupported = function () {
        return true;
    };
    ;
    class_1.prototype.isBrowserSupported = function () {
        var browser = this.getBrowser();
        var version = this.getVersion();
        var validBrowser = this.supportedBrowsers.includes(browser);
        if (!validBrowser)
            return false;
        if (browser === 'chrome')
            return version >= this.minChromeVersion;
        if (browser === 'firefox')
            return version >= this.minFirefoxVersion;
        if (browser === 'safari')
            return !this.isIOS && version >= this.minSafariVersion;
        return false;
    };
    class_1.prototype.getBrowser = function () {
        return "Node";
    };
    class_1.prototype.getVersion = function () {
        return 1000 || 0;
    };
    class_1.prototype.isUnifiedPlanSupported = function () {
        var browser = this.getBrowser();
        var version = 1000 || 0;
        if (browser === 'chrome' && version < 72)
            return false;
        if (browser === 'firefox' && version >= 59)
            return true;
        var tempPc;
        var supported = false;
        try {
            tempPc = new wrtc_1.RTCPeerConnection();
            tempPc.addTransceiver('audio');
            supported = true;
        }
        catch (e) { }
        finally {
            if (tempPc) {
                tempPc.close();
            }
        }
        return supported;
    };
    class_1.prototype.toString = function () {
        return "Supports: \n    browser:" + this.getBrowser() + " \n    version:" + this.getVersion() + " \n    isIOS:" + this.isIOS + " \n    isWebRTCSupported:" + this.isWebRTCSupported() + " \n    isBrowserSupported:" + this.isBrowserSupported() + " \n    isUnifiedPlanSupported:" + this.isUnifiedPlanSupported();
    };
    return class_1;
}());
