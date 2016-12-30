"use strict";

const fs = require('fs');
const util = require('util');
const config = require('./config');
const Observable = require('events');
const Pattern = require('./lib/Pattern');
const SensorCycle = require('./lib/SensorCycle');
const Conditioning = require('./lib/Conditioning');
const ReflectionManager = require('./lib/ReflectionManager');
const DeviceManager = require('./lib/DeviceManager');
const Api = require('./lib/Api');

class Brain extends Observable {

	constructor(options) {
		console.debug('new Brain()', options);
		super();
		options = options || {};
		options.dataPath = options.dataPath || config.DATA_PATH;
		options.delimiterIn = options.delimiterIn || config.DELIMITER_IN;
		options.delimiterOut = options.delimiterOut || config.DELIMITER_OUT;
		options.memSize = options.memSize || config.MEMSIZE;
		// Attach event listeners
		if (options.listeners) {
			for(var event in options.listeners) {
				this.on(event, options.listeners[event]);
			}
		}
		// Internal fields
		Brain.debugMode = options.debug;
		this.devices = {};
		this.memory = {};
		this.options = options;
	}

	// YAWN! Time to wake up!
	wakeUp() {
		console.debug('Brain.prototype.wakeUp()', this.options);
		var options = this.options;
		this.cycle = new SensorCycle({ 
			size: options.memSize,
			delimiterOut: options.delimiterOut,
			listeners: {
				'surprise': this.emit.bind(this, 'surprise')
			}
		});
		this.deviceManager = new DeviceManager({
			manufacturers: options.manufacturers,
			baudRate: options.baudRate,
			delimiterIn: options.delimiterIn,
			delimiterOut: options.delimiterOut,
			devices: this.devices,
			dataPath: options.dataPath,
			listeners: {
				'ready': this.emit.bind(this, 'ready'),
				'deviceready': this.emit.bind(this, 'deviceready'),
				'deviceremoved': this.emit.bind(this, 'deviceremoved'),
				'offline': this.emit.bind(this, 'offline'),
				'data': this.emit.bind(this, 'data'),
			}
		});
		this.conditioning = new Conditioning({
			memory: this.memory,
			devices: this.devices,
			dataPath: options.dataPath,
			listeners: {
				'action': this.emit.bind(this, 'action')
			}
		});
		this.reflectionManager = new ReflectionManager({
			memory: this.memory,
			devices: this.devices,
			delimiterIn: options.delimiterIn,
			listeners: {
				'action': this.emit.bind(this, 'action')
			}
		});
		this.api = new Api({
			state: this,
			dataPath: options.dataPath
		});
		this.on('data', this.data.bind(this));
		this.on('surprise', this.conditioning.surprise.bind(this.conditioning));
		this.on('action', this.action.bind(this));
		this.idle();
		return this;
	}

	// Reflection loop
	idle() {
		this.reflectionManager.reflect();
		this.reflectionManager.fulfill();
		setTimeout(this.idle.bind(this), 500);
	}

	// Aggregated incoming data pipeline for all the sensors.
	// This gets called pretty frequently so should be optimised!
	data(data) {
		console.debug('Brain.prototype.data()', data);
		if (data.indexOf(this.options.delimiterOut) !== -1) {
			var update = this.cycle.update(data).lastUpdate;
			if (update && update.surprise) { 
				var pattern = Pattern.generate(update.history);
				var input = update.source + this.options.delimiterOut + pattern.vectorCode;
				this.emit('surprise', input, update);
			}
		}
		return this;
	}

	// An action is a string that contains information about
	// the device, virtual pin (actuator), and data to send to it
	// for example:
	// this.action("mf.r<1"); 		//--> {device: "mf", vpin: "r", data: "1" } // Turns on Red LED
	// this.action("yA.b<&a|63"); 	//--> {device: "yA", vpin: "b", data: "&a|63" } // Runs 2 tones on buzzer
	action(action) {
		console.warn('Brain.prototype.action()', action);
		var delimiterIn = this.options.delimiterIn;
		if (action && action.indexOf(delimiterIn)) {
			// Find device & write to it
			var deviceId = Object.keys(this.devices).filter(id => action.indexOf(id) === 0).pop();
			if (deviceId) {
				this.devices[deviceId].write(action.substr(3));
				//console.log('device.write()', action.substr(3));
			}
		}
	}
}

console.debug = function() {
	if (config.DEBUG) {
		console.log.apply(console, arguments);
	}
}


if (typeof module !== 'undefined') {
	module.exports = Brain;
}

