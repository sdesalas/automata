"use strict";

const util = require('util');
const crypto = require('crypto');
const Observable = require('events');
const SerialPort = require('serialport');
const readline = SerialPort.parsers.readline('\n');
const config = require('../config');
const Utils = require('./Utils');
const Mind = require('../');

class Device extends Observable {

	// Initializes an attached microcontroller
	constructor(options) {
		super();
		if (!options ||
			!options.port) {
			throw Error('Error initializing Device.');
		}
		console.debug('new Device(port)', options.port.comName);
		this.port = options.port;
		this.id = options.port.id;
		this.delimiterOut = options.delimiterOut || config.DELIMITER_OUT;
		this.delimiterIn = options.delimiterIn || config.DELIMITER_IN;
		this.actions = {};
		this.sensors = [];
		// Connect to serial
		this.connect();
	}

	connect() {
		console.debug('Device.prototype.connect()');
		var device = this;
		var connection = new SerialPort(this.port.comName, { parser: readline, baudRate: this.port.baudRate });
		connection.on('data', this.data.bind(this));
		connection.on('open', function(error) {
			if (error) {
				var msg = util.format('Failed to open connection to %s. %s', device.id, error);
				console.debug(msg);
				device.disconnect(msg);
			} else {
				device.emit('connected', device.id);
			}
		});
		connection.on('disconnect', this.disconnect.bind(this, 'Disconnected'));
		connection.on('close', this.disconnect.bind(this, 'Connection closed'));
		this.connection = connection;
	}

	disconnect(reason) {
		console.debug('Device.prototype.disconnect()', reason);
		if (this.connection && this.connection.isOpen()) {
			this.connection.close(() => { this.connection = null; });
		}
		this.emit('disconnect', this.id, reason);
	}

	write(data) {
		console.debug('Device.prototype.write()', data);
		if (this.connection.isOpen()) {
			this.connection.write(data, console.debug.bind(console, 'Data written to ' + this.port.comName, data));
		} else {
			this.connect(function(connection) {
				connection.write(data);
			});
		}
	}

	randomCommand() {
		var key = Utils.random(Object.keys(this.actions));
		if (key) {
			var action = Utils.random(this.actions[key]);
			if (action) {
				return key + this.delimiterIn + action;
			}
		}
	}

	data(data) {
		// Remove EOL
		data = data.slice(0, -1); 
		// Watch for help commands 
		// and keep available actions updated
		if (data && data.indexOf('?' + this.delimiterIn) === 0) {
			console.debug('Device.prototype.data().help()', data);
			data = data.substr(2);
			if (data.indexOf(this.delimiterOut) === -1) {
				// No output delimiter 
				// (action listing)
				// ie: ?<A|B|C
				console.debug('Device.prototype.data().help().listing()');
				data.split('|').forEach(action => this.actions[action] = []);
			} else {
				// Output delimiter present 
				// (Help about an action)
				// ie: ?<B>5a|*d
				var key = data.split(this.delimiterOut).shift() || '';
				var cmd = data.substr(data.indexOf(this.delimiterOut) + 1);
				var available = this.actions[key];
				console.debug('Device.prototype.data().help().action()', cmd);
				if (available && available.indexOf(cmd) === -1) {
					available.push(cmd);
					//available.push(new Buffer(action));
					//available.push(action.split('').map(chr => chr.charCodeAt(0) & 255));
				}
			}
			this.emit('changed');
		} else {
			if (data && data.indexOf('>') === 1) {
				if (this.sensors.indexOf(data[0]) === -1) {
					this.sensors.push(data[0]);
				}
			}
			this.emit('data', this.id + '.' + data);
		}
	}
}


if (typeof module !== 'undefined') {
	module.exports = Device;
}
