"use strict";

class Pattern extends Array {

  static generate(array) {
    var pattern = new Pattern();
    pattern.push.apply(pattern, array);
    return pattern;
  }

  // fast 32-bit hash code (ie 'b3a801a')
  get hash() {
    var str = this.filter(s => !(typeof s === 'string' && s.length === 0)).join('|');
    var char, num = 0,
      hash = '00000000';
    if (str.length == 0) return hash;
    for (var i = 0; i < str.length; i++) {
      char = str.charCodeAt(i);
      num = ((num << 5) - num) + char;
      num = num & num; // Convert to 32bit integer
    }
    hash = Math.abs(num).toString(16);
    while (hash.length < 8) {
      hash = '0' + hash;
    }
    return hash;
  }

  // vector-based encoding algorithm
  // used to match patterns based on (x,y) direction
  //
  // ie, these are much the same
  // -> new Pattern(6,8,12,12,12,12,12,12,12).vectorCode === 12540
  // -> new Pattern(6,12,12,12,12,12,12,12,12).vectorCode === 12540
  // -> new Pattern(6,7,9,12,12,12,12,12,12).vectorCode === 12540
  //
  // however when vector changes it magnifies ripple
  // -> new Pattern(6,12,12,9,12,12,12,12,12).vectorCode === 37614
  //
  // and yet the ripple can occur elsewhere and end up the same
  // -> new Pattern(6,12,12,12,12,9,12,12,12).vectorCode === 37614
  // 
  get vectorCode() {
    var getCode = (item) => String(item).split('').reduce((val, chr) => (val << 8) + chr.charCodeAt(0), 0);
    var lastValue = getCode(this.slice().pop());
    return this.reduceRight((accum, item, index) => {
      var value = getCode(item),
          diff = Math.abs(lastValue - value);
      lastValue = value;
      return accum + diff;
    }, 0);
  }

  // Mutates pattern (by factor between 0 and 1)
  //
  // This creates a new pattern with random differences
  //
  mutate(factor) {
    factor = (factor >= 0 && factor <= 1) ? factor : 0.1;
    var pattern = new Pattern();
    do {
      pattern.length = 0;
      this.forEach((item, index) => {
        var rand = Math.random(),
          range = Math.floor(Math.random() * factor * 20);
        // Randomize charcode
        if (rand <= factor / 2)
          pattern.push(
            String(item)
            .split('')
            .map((chr, index) => String.fromCharCode(
              String(item).charCodeAt(index) + range * 2 - range
            ))
            .join('')
          );
        // Swap with another item from same array
        else if (rand <= factor) pattern.push(this[index + range * 2 - range] || this[index]);
        // Or just return as is
        else pattern.push(item)
      });
    } while (pattern.hash === this.hash)
    return pattern;
  }

}

if (typeof module !== 'undefined') {
  module.exports = Pattern;
}
