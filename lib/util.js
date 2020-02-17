"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var BinaryPack = require("binarypack");
var supports_1 = require("./supports");
var FileReader = require("filereader");
var wrtc_1 = require("wrtc");
var DEFAULT_CONFIG = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "turn:0.peerjs.com:3478", username: "peerjs", credential: "peerjsp" }
    ],
    sdpSemantics: "unified-plan"
};
exports.util = new /** @class */ (function () {
    function class_1() {
        this.CLOUD_HOST = "0.peerjs.com";
        this.CLOUD_PORT = 443;
        // Browsers that need chunking:
        this.chunkedBrowsers = { Chrome: 1, chrome: 1 };
        this.chunkedMTU = 16300; // The original 60000 bytes setting does not work when sending data from Firefox to Chrome, which is "cut off" after 16384 bytes and delivered individually.
        // Returns browser-agnostic default config
        this.defaultConfig = DEFAULT_CONFIG;
        this.browser = supports_1.Supports.getBrowser();
        this.browserVersion = supports_1.Supports.getVersion();
        // Lists which features are supported
        this.supports = (function () {
            var supported = {
                browser: supports_1.Supports.isBrowserSupported(),
                webRTC: supports_1.Supports.isWebRTCSupported(),
                audioVideo: false,
                data: false,
                binaryBlob: false,
                reliable: false,
            };
            if (!supported.webRTC)
                return supported;
            var pc;
            try {
                pc = new wrtc_1.RTCPeerConnection(DEFAULT_CONFIG);
                supported.audioVideo = true;
                var dc = void 0;
                try {
                    dc = pc.createDataChannel("_PEERJSTEST", { ordered: true });
                    supported.data = true;
                    supported.reliable = !!dc.ordered;
                    // Binary test
                    try {
                        dc.binaryType = "blob";
                        supported.binaryBlob = !supports_1.Supports.isIOS;
                    }
                    catch (e) {
                    }
                }
                catch (e) {
                }
                finally {
                    if (dc) {
                        dc.close();
                    }
                }
            }
            catch (e) {
            }
            finally {
                if (pc) {
                    pc.close();
                }
            }
            return supported;
        })();
        this.pack = BinaryPack.pack;
        this.unpack = BinaryPack.unpack;
        // Binary stuff
        this._dataCount = 1;
    }
    class_1.prototype.noop = function () { };
    // Ensure alphanumeric ids
    class_1.prototype.validateId = function (id) {
        // Allow empty ids
        return !id || /^[A-Za-z0-9]+(?:[ _-][A-Za-z0-9]+)*$/.test(id);
    };
    class_1.prototype.chunk = function (blob) {
        var chunks = [];
        var size = blob.size;
        var total = Math.ceil(size / exports.util.chunkedMTU);
        var index = 0;
        var start = 0;
        while (start < size) {
            var end = Math.min(size, start + exports.util.chunkedMTU);
            var b = blob.slice(start, end);
            var chunk = {
                __peerData: this._dataCount,
                n: index,
                data: b,
                total: total,
            };
            chunks.push(chunk);
            start = end;
            index++;
        }
        this._dataCount++;
        return chunks;
    };
    class_1.prototype.blobToArrayBuffer = function (blob, cb) {
        var fr = new FileReader();
        fr.onload = function (evt) {
            if (evt.target) {
                cb(evt.target.result);
            }
        };
        fr.readAsArrayBuffer(blob);
        return fr;
    };
    class_1.prototype.binaryStringToArrayBuffer = function (binary) {
        var byteArray = new Uint8Array(binary.length);
        for (var i = 0; i < binary.length; i++) {
            byteArray[i] = binary.charCodeAt(i) & 0xff;
        }
        return byteArray.buffer;
    };
    class_1.prototype.randomToken = function () {
        return Math.random()
            .toString(36)
            .substr(2);
    };
    class_1.prototype.isSecure = function () {
        return true;
    };
    return class_1;
}());
