var os = require('os');
var util = require('util');
var assert = require('./assert-fuzzy');
var Pattern = require('../lib/Pattern');

describe('class Pattern', function() {

  it('new Pattern()', function() {
    assert.equal(typeof Pattern, 'function', 'Pattern is a function')
    assert(new Pattern() instanceof Array, 'new Pattern() instanceof Array');
    assert(Pattern.generate() instanceof Array, 'Pattern.generate() instanceof Array');
    assert.equal(JSON.stringify(new Pattern()), '[]', 'new Pattern()');
    assert.equal(JSON.stringify(new Pattern(2)), '[null,null]', 'new Pattern(2)');
    assert.equal(JSON.stringify(new Pattern([])), '[[]]', 'new Pattern([])');
    assert.equal(JSON.stringify(new Pattern('a')), '["a"]', 'new Pattern("a")');
    assert.equal(JSON.stringify(new Pattern('a', 'b')), '["a","b"]', 'new Pattern("a", "b")');
    assert.equal(JSON.stringify(new Pattern('a', 'b', undefined)), '["a","b",null]', 'new Pattern("a", "b", undefined)');
    assert.equal(JSON.stringify(new Pattern(['a'])), '[["a"]]', 'new Pattern(["a"])');
    assert.equal(JSON.stringify(new Pattern(['a', 'b'])), '[["a","b"]]', 'new Pattern(["a", "b"])');
  });

  it('pattern.hash', function() {
    assert.equal(new Pattern().hash, '00000000', 'new Pattern().hash');
    assert.equal(new Pattern('2134').hash, '001778e0', 'new Pattern("2134").hash');
    assert.equal(new Pattern('999','x','b').hash, '2be4d87b', 'new Pattern("999","x","b").hash');
    assert.equal(new Pattern([undefined,'zi953']).hash, '51fd065c', 'new Pattern([undefined,"zi953"]).hash');
  });

  it('pattern.vectorCode', function() {
    assert.equal(new Pattern().vectorCode, '0', 'new Pattern().vectorCode');
    assert.equal(new Pattern('1', '1', '7').vectorCode, '6', 'new Pattern("1", "1", "7").vectorCode');
    assert.equal(new Pattern('1', '1', '7').vectorCode, new Pattern('1', 7, 7).vectorCode, 'new Pattern("1", "1", "7").vectorCode');
    assert.equal(new Pattern('1', '1', '7').vectorCode, new Pattern('7', '1', 1, 1, 1, '1').vectorCode, 'new Pattern("1", "1", "7").vectorCode');
    assert.equal(new Pattern('999','x','b').vectorCode, '3750103', 'new Pattern("999","x","b").vectorCode');
  });

  function mutateDiff(pattern, factor, iterations) {
    var average = 0;
    iterations = iterations || 100;
    for (var i = 0; i < iterations; i++) {
      diff = pattern.mutate(factor).filter((item, index) => item !== pattern[index]).length;
      average += diff/iterations;
    }
    return average / pattern.length;
  }

  it('pattern.mutate()', function() {
    var mutated, diff, pattern = new Pattern('3', '4', '7', '7', '8', '7', '7', '7', '7', '7');
    mutated = pattern.mutate();
    assert(mutated instanceof Pattern, 'pattern.mutate() instanceof Pattern');
    assert.notEqual(JSON.stringify(mutated), JSON.stringify(pattern), 'pattern.mutate() always generates a difference');
    // 10%
    diff = mutateDiff(pattern, 0.10);
    assert.around(diff, 0.12);
    // 25%
    diff = mutateDiff(pattern, 0.25);
    assert.around(diff, 0.18);
    // 50%
    diff = mutateDiff(pattern, 0.50);
    assert.around(diff, 0.29);
  });

});
