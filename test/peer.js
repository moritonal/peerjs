"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./setup");
var chai_1 = require("chai");
var peer_1 = require("../lib/peer");
var mock_socket_1 = require("mock-socket");
var enums_1 = require("../lib/enums");
var wrtc_1 = require("wrtc");
var createMockServer = function () {
    var fakeURL = 'ws://localhost:8080/peerjs?key=peerjs&id=1&token=testToken';
    var mockServer = new mock_socket_1.Server(fakeURL);
    mockServer.on('connection', function (socket) {
        //@ts-ignore
        socket.on('message', function (data) {
            socket.send('test message from mock server');
        });
        socket.send(JSON.stringify({ type: enums_1.ServerMessageType.Open }));
    });
    return mockServer;
};
describe("Peer", function () {
    describe("after construct without parameters", function () {
        it("shouldn't contains any connection", function () {
            var peer = new peer_1.Peer();
            chai_1.expect(peer.open).to.be.false;
            chai_1.expect(peer.connections).to.be.empty;
            chai_1.expect(peer.id).to.be.null;
            chai_1.expect(peer.disconnected).to.be.false;
            chai_1.expect(peer.destroyed).to.be.false;
            peer.destroy();
        });
    });
    describe("after construct with parameters", function () {
        it("should contains id and key", function () {
            var peer = new peer_1.Peer('1', { key: 'anotherKey' });
            chai_1.expect(peer.id).to.eq('1');
            chai_1.expect(peer.options.key).to.eq('anotherKey');
            peer.destroy();
        });
    });
    describe("after call to peer #2", function () {
        var mockServer;
        before(function () {
            mockServer = createMockServer();
        });
        it("Peer#1 should has id #1", function (done) {
            var peer1 = new peer_1.Peer('1', { port: 8080, host: 'localhost' });
            chai_1.expect(peer1.open).to.be.false;
            var mediaOptions = {
                metadata: { var: '123' },
                constraints: {
                    mandatory: {
                        OfferToReceiveAudio: true,
                        OfferToReceiveVideo: true
                    }
                }
            };
            var track = new wrtc_1.MediaStreamTrack();
            var mediaStream = new wrtc_1.MediaStream([track]);
            var mediaConnection = peer1.call('2', mediaStream, __assign({}, mediaOptions));
            chai_1.expect(mediaConnection.connectionId).to.be.a('string');
            chai_1.expect(mediaConnection.type).to.eq(enums_1.ConnectionType.Media);
            chai_1.expect(mediaConnection.peer).to.eq('2');
            chai_1.expect(mediaConnection.options).to.include(mediaOptions);
            chai_1.expect(mediaConnection.metadata).to.deep.eq(mediaOptions.metadata);
            // @ts-ignore
            chai_1.expect(mediaConnection.peerConnection.getSenders()[0].track.id).to.eq(track.id);
            peer1.once('open', function (id) {
                chai_1.expect(id).to.be.eq('1');
                //@ts-ignore
                chai_1.expect(peer1._lastServerId).to.be.eq('1');
                chai_1.expect(peer1.disconnected).to.be.false;
                chai_1.expect(peer1.destroyed).to.be.false;
                chai_1.expect(peer1.open).to.be.true;
                peer1.destroy();
                chai_1.expect(peer1.disconnected).to.be.true;
                chai_1.expect(peer1.destroyed).to.be.true;
                chai_1.expect(peer1.open).to.be.false;
                chai_1.expect(peer1.connections).to.be.empty;
                done();
            });
        });
        after(function () {
            mockServer.stop();
        });
    });
    describe("reconnect", function () {
        var mockServer;
        before(function () {
            mockServer = createMockServer();
        });
        it("connect to server => disconnect => reconnect => destroy", function (done) {
            var peer1 = new peer_1.Peer('1', { port: 8080, host: 'localhost' });
            peer1.once('open', function () {
                chai_1.expect(peer1.open).to.be.true;
                peer1.once('disconnected', function () {
                    chai_1.expect(peer1.disconnected).to.be.true;
                    chai_1.expect(peer1.destroyed).to.be.false;
                    chai_1.expect(peer1.open).to.be.false;
                    peer1.once('open', function (id) {
                        chai_1.expect(id).to.be.eq('1');
                        chai_1.expect(peer1.disconnected).to.be.false;
                        chai_1.expect(peer1.destroyed).to.be.false;
                        chai_1.expect(peer1.open).to.be.true;
                        peer1.once('disconnected', function () {
                            chai_1.expect(peer1.disconnected).to.be.true;
                            chai_1.expect(peer1.destroyed).to.be.false;
                            chai_1.expect(peer1.open).to.be.false;
                            peer1.once('close', function () {
                                chai_1.expect(peer1.disconnected).to.be.true;
                                chai_1.expect(peer1.destroyed).to.be.true;
                                chai_1.expect(peer1.open).to.be.false;
                                done();
                            });
                        });
                        peer1.destroy();
                    });
                    peer1.reconnect();
                });
                peer1.disconnect();
            });
        });
        it("disconnect => reconnect => destroy", function (done) {
            mockServer.stop();
            var peer1 = new peer_1.Peer('1', { port: 8080, host: 'localhost' });
            peer1.once('disconnected', function (id) {
                chai_1.expect(id).to.be.eq('1');
                chai_1.expect(peer1.disconnected).to.be.true;
                chai_1.expect(peer1.destroyed).to.be.false;
                chai_1.expect(peer1.open).to.be.false;
                peer1.once('open', function (id) {
                    chai_1.expect(id).to.be.eq('1');
                    chai_1.expect(peer1.disconnected).to.be.false;
                    chai_1.expect(peer1.destroyed).to.be.false;
                    chai_1.expect(peer1.open).to.be.true;
                    peer1.once('disconnected', function () {
                        chai_1.expect(peer1.disconnected).to.be.true;
                        chai_1.expect(peer1.destroyed).to.be.false;
                        chai_1.expect(peer1.open).to.be.false;
                        peer1.once('close', function () {
                            chai_1.expect(peer1.disconnected).to.be.true;
                            chai_1.expect(peer1.destroyed).to.be.true;
                            chai_1.expect(peer1.open).to.be.false;
                            done();
                        });
                    });
                    peer1.destroy();
                });
                mockServer = createMockServer();
                peer1.reconnect();
            });
        });
        it("destroy peer if no id and no connection", function (done) {
            mockServer.stop();
            var peer1 = new peer_1.Peer({ port: 8080, host: 'localhost' });
            peer1.once(enums_1.PeerEventType.Error, function (error) {
                chai_1.expect(error.type).to.be.eq(enums_1.PeerErrorType.ServerError);
                peer1.once(enums_1.PeerEventType.Close, function () {
                    chai_1.expect(peer1.disconnected).to.be.true;
                    chai_1.expect(peer1.destroyed).to.be.true;
                    chai_1.expect(peer1.open).to.be.false;
                    done();
                });
                mockServer = createMockServer();
            });
        });
        after(function () {
            mockServer.stop();
        });
    });
});
