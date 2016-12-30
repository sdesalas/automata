"use strict";

const fs = require('fs');
const fusspot = require('fusspot');
const Observable = require('events');
const Pattern = require('./Pattern');
const Utils = require('./Utils');
const Brain = require('../');

// 
// Manages the strengthening relationships between inputs and outputs
// (ie learning from positive and negative experiences).
// 
class Conditioning extends Observable {

	constructor(options) {
		super();
		options = options || {};
		this.devices = options.devices || {};
		this.dataPath = options.dataPath;
		this.memory = options.memory || {};
		this.memory.actions = {};
		this.memory.history = { surprises: [], reactions: [], experiments: []};
		this.memory.reactions = new fusspot.Grid();
		this.memory.consequences = new fusspot.Grid({ adaptive: false });
		this.options = options;
		// Attach event listeners
		if (options.listeners) {
			for(var event in options.listeners) {
				this.on(event, options.listeners[event]);
			}
		}
		this.on('action', (cmd) => this.memory.actions[cmd] = Utils.timestamp())
	}

	// Surprise ===> Change in input cycle.
	// Did I do something recently? 
	// Was change in pattern due to own action?
	// If due to own action, is it as expected?
	// Otherwise determine if we should do something.
	surprise(input, update) {
		update = update || {};
		console.debug('Conditioning.prototype.surprise()', input, update.source);
		var source = update.source;
		var grid = this.memory.reactions;
		var timestamp = Utils.timestamp();
		var surprise = {
			timestamp: timestamp,
			source: update.source,
			input: input,
			history: update.history.join(),
			isExpected: this.isExpected(input)
		};
		this.memory.history.surprises.push(surprise);
		if (!surprise.isExpected) {
			// Add every output as a possible action
			Object.keys(this.memory.actions).forEach(cmd => grid.output(cmd));
			var output = grid.predict(input);
			if (output) {
				this.memory.history.reactions.push({
					timestamp: timestamp,
					input: input,
					output: output
				});
				this.emit('action', output);
			}
			this.save();
		}
	}

	isExpected(input) {
		console.debug('Conditioning.prototype.isExpected()', input);
		var expected = false;
		if (input) {
			// Check recent actions (last minute)
			var actions = this.memory.actions;
			var consequences = this.memory.consequences;
			var cutoff = Utils.timestamp() - Utils.randomLHS(60 * 1000);
			var recent = Object.keys(actions).filter(cmd => actions[cmd] > cutoff);
			var index = consequences.output(input);
			if (recent.length) {
				// Check each recent action vs known consequences
				recent.forEach(cmd => {
					consequences.input(cmd);
					if (consequences.predict(cmd) === input) {
						// Yes? Notify caller & strengthen manually.
						// The more recent an action was the more likely 
						// that new input occurred as consequence.
						expected = true;
						var weight = (actions[cmd] - cutoff) / (60 * 1000);
						consequences.strengthen(cmd, input, weight);
					}
				});
			}
		}
		return expected;
	}

	// Save to file
	save() {
		console.debug('Conditioning.prototype.save()');
		if (this.dataPath) {
			fs.writeFile(this.dataPath + '/memory.json', JSON.stringify(this.memory, null, 2));
		}
	}

}

if (typeof module !== 'undefined') {
  module.exports = Conditioning;
}


