"use strict";

const fs = require('fs');
const Observable = require('events');
const Pattern = require('./Pattern');
const config = require('../config');
const Utils = require('./Utils');
const Mind = require('../');

// 
// Queries devices and revises memory.
// 
class ReflectionManager extends Observable {

	constructor(options) {
		console.log('new ReflectionManager()');
		super();
		options = options || {};
		this.memory = options.memory || {};
		this.devices = options.devices || {};
		this.delimiterIn = options.delimiterIn || config.DELIMITER_IN;
		// Attach event listeners
		if (options.listeners) {
			for(var event in options.listeners) {
				this.on(event, options.listeners[event]);
			}
		}
	}

	reflect() {
		console.debug('ReflectionManager.prototype.reflect()');
		// Match input to known patterns
		// Query options for a device
		// Query option for a device (if options known)
		var random = Utils.random(100);
		var noOutputs = this.memory.outputs && Object.keys(this.memory.outputs).length === 0;
		if (random < 10 || noOutputs) {
			// No known outputs for attached devices?
			// This should be a priority, find some
			// Query action examples for random device
			return this.queryActions();
		}
	}

	queryActions(device, action) {
		console.debug('ReflectionManager.prototype.queryActions()', device && device.id, action);
		if (device && device.write) { 
			if (action) {
				return device.write('?' + this.delimiterIn + action);
			}
			return device.write('?')
		} else {
			// If no device requested
			// then pick one at random
			device = Utils.random(this.devices);
			if (device) {
				// If device is available try
				// check one of its actions at random.
				action = Utils.random(Object.keys(device.actions));
				this.queryActions(device, action);
			}
		}
	}

	// Try a new output that hasn't been tried before
	// TODO: This should ideally incorporate trying known outputs  
	// that do not have a strong relationship to any input.
	// (actions that we are aware of, but do not understand what they are for)
	// And when doing this, we should also pick actions that have recently experimented with.
	// (are still in the process of figuring out).
	experiment() {
		console.debug('ReflectionManager.prototype.experiment()');
		var output;
		if (Object.keys(this.devices).length) {
			var device = Utils.random(this.devices);
			var command = device.randomCommand();
			if (device && command) {
				output = device.id + '.' + command;
			}
		}
		if (output) {
			console.debug('ReflectionManager.prototype.experiment().output()', output);
			this.memory.reactions.strengthen(undefined, output);
			this.memory.history.experiments = this.memory.history.experiments || [];
			this.memory.history.experiments.push({
				timestamp: Utils.timestamp(),
				output: output
			});
			this.emit('action', output);
		}
	}

	fulfill() {
		console.debug('ReflectionManager.prototype.fulfill()');
		// Curiosity: Trial option for a device
		// Seek positive patterns / feedback.
		// Needs: Charge battery, gain knowledge, approval
		var random = Utils.random(100);
		if (random < 5) {
			// Lets just try something new..
			this.experiment();
		}
	}

}


if (typeof module !== 'undefined') {
  module.exports = ReflectionManager;
}
