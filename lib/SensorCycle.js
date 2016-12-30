"use strict";

const config = require('../config');
const Mind = require('../');

//
// Manages the sensor cycle and detects pattern changes
//
class SensorCycle {

	constructor(options) {
		//super();
		console.debug('new SensorCycle()');
		// Buffer contains raw data input
		this.buffer = []; // raw data input
		this.pattern = []; // looping array of sensor ids (last is last)
		this.history = {}; // indexed by sensor ids and contains array of payloads
		this.patternExists = false;
		this.options = options = options || {};
		this.options.bufferSize = (options.size || 256) / 8;
		this.options.historySize = this.options.bufferSize / 2;
		this.options.delimiterOut = options.delimiterOut || config.DELIMITER_OUT;
		// Initialize
		if (options.data) {
			options.data.forEach(this.update.bind(this));
		}
	}

	update(data) {
		var options = this.options;
		var deviation = 1, surprise = 0;
		// "S7L>0" --> sensor="S7L", payload="0"
		var dataparts = data.split(options.delimiterOut);
		if (dataparts.length !== 2) {
			console.debug('Warning: Delimiter "%s" missing in message "%s"', options.delimiterOut, data);
			return this;
		}
		var source = dataparts.shift();
		var payload = dataparts.join('');
		// History is hashed by source, it contains payloads only 
		// (ie detects deviation in sensor input)
		var history = this.history[source] = this.history[source] || [];
		var expectedPayload = history[0];
		if (expectedPayload === payload) {
			deviation = 0;
		} else if (expectedPayload === undefined) {
			deviation = 1;
		} else {
			deviation = this.compare(payload, history);
			if (deviation > 0.33) surprise = 1;
		}
		// Pattern contains sources only 
		// (ie. detects cycle changes)
		var expectedSource = this.patternExists ? this.pattern[0] : undefined;
		if (this.patternExists && expectedSource !== source) {
			// Sensor input intermittent
			surprise = 1;
			expectedPayload = this.history[expectedSource][0];
		}
		var index = this.pattern.indexOf(source);
		if (index !== -1) {
			// Found a match in the pattern
			// Make sure anything in front of it is removed
			this.patternExists = true;
			this.pattern.splice(0, index + 1);
		}
		// Pattern is appended to as the current
		// source forms parts of it.
		this.pattern.push(source);
		// History always contains last item at beginning
		// this is to make it easier to regognize patterns
		// when comparing histories of different lengths
		history.unshift(payload); 
		history.splice(options.historySize);
		// Buffer is appended to and kept at required length
		this.buffer.push(data);
		while (this.buffer.length > options.bufferSize) {	this.buffer.shift(); }
		// Save update result
		this.lastUpdate = {
			data: data,
			source: source,
			payload: payload,
			expected: expectedSource ? [expectedSource, options.delimiterOut, expectedPayload].join('') : undefined,
			history: history,
			deviation: deviation,
			surprise: surprise
		};
		return this;
	}

	// Compare two strings and returns a deviation between 0 and 1
	// 'abcd' vs 'abcd' = 0;
	// 'abcd' vs 'abdd' = 0.25;
	// 'abcd' vs 'abdc' = 0.5;
	// 'abdc' vs 'bdca' = 1;
	compare(actual, expected) {
		if (!actual || !expected) return 1;
		if (actual === expected) return 0;
		var history = expected instanceof Array ? expected : [expected],
				expected = history[0],
				deviation = 0,
				lenMax = actual.length;
		history.forEach(pastValue => { if (pastValue.length > lenMax) lenMax = pastValue.length; });
		var step = 1/(lenMax*history.length);
		history.forEach(pastValue => {
			for (var i = 0; i < lenMax; i++) {
				if (pastValue.charCodeAt(i) !== actual.charCodeAt(i))
					deviation += step;
			}
		});
		return deviation;
	}

	clear() {
		this.buffer = [];
		this.pattern = [];
		this.history = {};
		delete this.lastUpdate;
	}

}

if (typeof module !== 'undefined') {
	module.exports = SensorCycle;
}
