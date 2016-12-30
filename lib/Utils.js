"use strict";

class Utils {

	static random(something, somethingElse) {
		switch (typeof something) {
			case 'number':
				if (isNaN(something)) return something;
				if (typeof somethingElse === 'number') 
					return Math.floor(Math.random() * (somethingElse - something)) + something;
				if (something % 1 === 0) 
					return Math.floor(Math.random() * something);
				return Math.random() * something;
			case 'string':
				return Utils.random(something.split(''));
			case 'function':
				return Utils.random(something());
			case 'object':
				if (something === null) return something;
				if (something instanceof Array) {
					return something[Utils.random(something.length)];
				}
				var keys = Object.keys(something);
				return keys.length ? something[Utils.random(keys)] : undefined;
			default: // boolean, undefined, symbol
				return something;
		}
	}

	// Left-side leaning random number (closer to from than to)
	static randomLHS(from, to, affinity) {
		if (typeof to === 'undefined') {
			to = from;
			from = 0;
		}
		var random = Math.random() * (to - from),
			result = (Math.pow(random, 2) / to) + from;
		if (to < 2) return result;
		return Math.floor(result);
	}

	static timestamp() {
		return new Date().getTime();
	}
}

if (typeof module !== 'undefined') {
  module.exports = Utils;
}
