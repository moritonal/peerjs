"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var util_1 = require("./util");
var peer_1 = require("./peer");
exports.peerjs = {
    Peer: peer_1.Peer,
    util: util_1.util
};
exports.default = peer_1.Peer;
//(<any>window).peerjs = peerjs;
/** @deprecated Should use peerjs namespace */
//(<any>window).Peer = Peer;
