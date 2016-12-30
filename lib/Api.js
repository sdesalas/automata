"use strict";

const fsr = require('fs-reverse');
const http = require('http');
const HttpDispatcher = require('httpdispatcher');
const Observable = require('events');

class Api extends Observable {

    constructor(options) {
        super();
        options = options || {};
        this.port = options.port || 8199;
        this.state = options.state || {};
        this.router = new HttpDispatcher();
        this.router.setStatic('/static');
        this.router.setStaticDirname('static');
        // Routes
        this.router.onGet('/', this.getRoot.bind(this));
        this.router.onGet('/memory', this.getMemory.bind(this));
        this.router.onGet('/devices', this.getDevices.bind(this));
        this.router.onGet('/status', this.getStatus.bind(this));
        this.router.onGet('/log', this.getLog.bind(this));
        // Attach event listeners
        this.router.onError(this.onError.bind(this));
        if (options.listeners) {
            for(var event in options.listeners) {
                this.on(event, options.listeners[event]);
            }
        }
        // Start server
        this.server = http.createServer((req, res) => {
            this.router.dispatch(req, res);
        }).listen(this.port, this.emit.bind(this, 'ready'));
    }

    getRoot(req, res) {
        res.writeHead(302, {'Location': 'static/index.html'});
        res.end();
    }

    getMemory(req, res) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(this.state.memory, null, 2));
    }

    getStatus(req, res) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify({
            memory: process.memoryUsage(),
            uptime: process.uptime()
        }, null, 2));
    }


    getDevices(req, res) {
        res.writeHead(200, {'Content-Type': 'application/json'});
        res.end(JSON.stringify(this.state.devices, null, 2));
    }

    getLog(req, res) {
        res.writeHead(200, {'Content-Type': 'text/plain'});
        fsr('brain.log', {matcher: /(\r?\n)/}).pipe(res);
    }

    onError(req, res) {
        if (this.listeners('error').length) {
            this.emit('error', req.url);
        }
        res.writeHead(404);
        res.end('Not Found');
    }

}

if (typeof module !== 'undefined') {
  module.exports = Api;
}