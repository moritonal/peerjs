"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var logger_1 = require("./logger");
var negotiator_1 = require("./negotiator");
var enums_1 = require("./enums");
var baseconnection_1 = require("./baseconnection");
var encodingQueue_1 = require("./encodingQueue");
var node_blob_1 = require("node-blob");
/**
 * Wraps a DataChannel between two Peers.
 */
var DataConnection = /** @class */ (function (_super) {
    __extends(DataConnection, _super);
    function DataConnection(peerId, provider, options) {
        var _this = _super.call(this, peerId, provider, options) || this;
        _this.stringify = JSON.stringify;
        _this.parse = JSON.parse;
        _this._buffer = [];
        _this._bufferSize = 0;
        _this._buffering = false;
        _this._chunkedData = {};
        _this._encodingQueue = new encodingQueue_1.EncodingQueue();
        _this.connectionId =
            _this.options.connectionId || DataConnection.ID_PREFIX + util_1.util.randomToken();
        _this.label = _this.options.label || _this.connectionId;
        _this.serialization = _this.options.serialization || enums_1.SerializationType.Binary;
        _this.reliable = !!_this.options.reliable;
        _this._encodingQueue.on('done', function (ab) {
            _this._bufferedSend(ab);
        });
        _this._encodingQueue.on('error', function () {
            logger_1.default.error("DC#" + _this.connectionId + ": Error occured in encoding from blob to arraybuffer, close DC");
            _this.close();
        });
        _this._negotiator = new negotiator_1.Negotiator(_this);
        _this._negotiator.startConnection(_this.options._payload || {
            originator: true
        });
        return _this;
    }
    Object.defineProperty(DataConnection.prototype, "type", {
        get: function () {
            return enums_1.ConnectionType.Data;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataConnection.prototype, "dataChannel", {
        get: function () {
            return this._dc;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(DataConnection.prototype, "bufferSize", {
        get: function () { return this._bufferSize; },
        enumerable: true,
        configurable: true
    });
    /** Called by the Negotiator when the DataChannel is ready. */
    DataConnection.prototype.initialize = function (dc) {
        this._dc = dc;
        this._configureDataChannel();
    };
    DataConnection.prototype._configureDataChannel = function () {
        var _this = this;
        if (!util_1.util.supports.binaryBlob || util_1.util.supports.reliable) {
            this.dataChannel.binaryType = "arraybuffer";
        }
        this.dataChannel.onopen = function () {
            logger_1.default.log("DC#" + _this.connectionId + " dc connection success");
            _this._open = true;
            _this.emit(enums_1.ConnectionEventType.Open);
        };
        this.dataChannel.onmessage = function (e) {
            logger_1.default.log("DC#" + _this.connectionId + " dc onmessage:", e.data);
            _this._handleDataMessage(e);
        };
        this.dataChannel.onclose = function () {
            logger_1.default.log("DC#" + _this.connectionId + " dc closed for:", _this.peer);
            _this.close();
        };
    };
    // Handles a DataChannel message.
    DataConnection.prototype._handleDataMessage = function (_a) {
        var _this = this;
        var data = _a.data;
        var datatype = data.constructor;
        var isBinarySerialization = this.serialization === enums_1.SerializationType.Binary ||
            this.serialization === enums_1.SerializationType.BinaryUTF8;
        var deserializedData = data;
        if (isBinarySerialization) {
            if (datatype === node_blob_1.default) {
                // Datatype should never be blob
                util_1.util.blobToArrayBuffer(data, function (ab) {
                    var unpackedData = util_1.util.unpack(ab);
                    _this.emit(enums_1.ConnectionEventType.Data, unpackedData);
                });
                return;
            }
            else if (datatype === ArrayBuffer) {
                deserializedData = util_1.util.unpack(data);
            }
            else if (datatype === String) {
                // String fallback for binary data for browsers that don't support binary yet
                var ab = util_1.util.binaryStringToArrayBuffer(data);
                deserializedData = util_1.util.unpack(ab);
            }
        }
        else if (this.serialization === enums_1.SerializationType.JSON) {
            deserializedData = this.parse(data);
        }
        // Check if we've chunked--if so, piece things back together.
        // We're guaranteed that this isn't 0.
        if (deserializedData.__peerData) {
            this._handleChunk(deserializedData);
            return;
        }
        _super.prototype.emit.call(this, enums_1.ConnectionEventType.Data, deserializedData);
    };
    DataConnection.prototype._handleChunk = function (data) {
        var id = data.__peerData;
        var chunkInfo = this._chunkedData[id] || {
            data: [],
            count: 0,
            total: data.total
        };
        chunkInfo.data[data.n] = data.data;
        chunkInfo.count++;
        this._chunkedData[id] = chunkInfo;
        if (chunkInfo.total === chunkInfo.count) {
            // Clean up before making the recursive call to `_handleDataMessage`.
            delete this._chunkedData[id];
            // We've received all the chunks--time to construct the complete data.
            var data_1 = new node_blob_1.default(chunkInfo.data);
            this._handleDataMessage({ data: data_1 });
        }
    };
    /**
     * Exposed functionality for users.
     */
    /** Allows user to close connection. */
    DataConnection.prototype.close = function () {
        this._buffer = [];
        this._bufferSize = 0;
        this._chunkedData = {};
        if (this._negotiator) {
            this._negotiator.cleanup();
            this._negotiator = null;
        }
        if (this.provider) {
            this.provider._removeConnection(this);
            this.provider = null;
        }
        if (this.dataChannel) {
            this.dataChannel.onopen = null;
            this.dataChannel.onmessage = null;
            this.dataChannel.onclose = null;
            this._dc = null;
        }
        if (this._encodingQueue) {
            this._encodingQueue.destroy();
            this._encodingQueue.removeAllListeners();
            this._encodingQueue = null;
        }
        if (!this.open) {
            return;
        }
        this._open = false;
        _super.prototype.emit.call(this, enums_1.ConnectionEventType.Close);
    };
    /** Allows user to send data. */
    DataConnection.prototype.send = function (data, chunked) {
        if (!this.open) {
            _super.prototype.emit.call(this, enums_1.ConnectionEventType.Error, new Error("Connection is not open. You should listen for the `open` event before sending messages."));
            return;
        }
        if (this.serialization === enums_1.SerializationType.JSON) {
            this._bufferedSend(this.stringify(data));
        }
        else if (this.serialization === enums_1.SerializationType.Binary ||
            this.serialization === enums_1.SerializationType.BinaryUTF8) {
            var blob = util_1.util.pack(data);
            if (!chunked && blob.size > util_1.util.chunkedMTU) {
                this._sendChunks(blob);
                return;
            }
            if (!util_1.util.supports.binaryBlob) {
                // We only do this if we really need to (e.g. blobs are not supported),
                // because this conversion is costly.
                this._encodingQueue.enque(blob);
            }
            else {
                this._bufferedSend(blob);
            }
        }
        else {
            this._bufferedSend(data);
        }
    };
    DataConnection.prototype._bufferedSend = function (msg) {
        if (this._buffering || !this._trySend(msg)) {
            this._buffer.push(msg);
            this._bufferSize = this._buffer.length;
        }
    };
    // Returns true if the send succeeds.
    DataConnection.prototype._trySend = function (msg) {
        var _this = this;
        if (!this.open) {
            return false;
        }
        if (this.dataChannel.bufferedAmount > DataConnection.MAX_BUFFERED_AMOUNT) {
            this._buffering = true;
            setTimeout(function () {
                _this._buffering = false;
                _this._tryBuffer();
            }, 50);
            return false;
        }
        try {
            this.dataChannel.send(msg);
        }
        catch (e) {
            logger_1.default.error("DC#:" + this.connectionId + " Error when sending:", e);
            this._buffering = true;
            this.close();
            return false;
        }
        return true;
    };
    // Try to send the first message in the buffer.
    DataConnection.prototype._tryBuffer = function () {
        if (!this.open) {
            return;
        }
        if (this._buffer.length === 0) {
            return;
        }
        var msg = this._buffer[0];
        if (this._trySend(msg)) {
            this._buffer.shift();
            this._bufferSize = this._buffer.length;
            this._tryBuffer();
        }
    };
    DataConnection.prototype._sendChunks = function (blob) {
        var e_1, _a;
        var blobs = util_1.util.chunk(blob);
        logger_1.default.log("DC#" + this.connectionId + " Try to send " + blobs.length + " chunks...");
        try {
            for (var blobs_1 = __values(blobs), blobs_1_1 = blobs_1.next(); !blobs_1_1.done; blobs_1_1 = blobs_1.next()) {
                var blob_1 = blobs_1_1.value;
                this.send(blob_1, true);
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (blobs_1_1 && !blobs_1_1.done && (_a = blobs_1.return)) _a.call(blobs_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
    };
    DataConnection.prototype.handleMessage = function (message) {
        var payload = message.payload;
        switch (message.type) {
            case enums_1.ServerMessageType.Answer:
                this._negotiator.handleSDP(message.type, payload.sdp);
                break;
            case enums_1.ServerMessageType.Candidate:
                this._negotiator.handleCandidate(payload.candidate);
                break;
            default:
                logger_1.default.warn("Unrecognized message type:", message.type, "from peer:", this.peer);
                break;
        }
    };
    DataConnection.ID_PREFIX = "dc_";
    DataConnection.MAX_BUFFERED_AMOUNT = 8 * 1024 * 1024;
    return DataConnection;
}(baseconnection_1.BaseConnection));
exports.DataConnection = DataConnection;
