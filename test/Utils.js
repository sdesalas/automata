var os = require('os');
var util = require('util');
var assert = require('./assert-fuzzy');
var Utils = require('../lib/Utils');

describe('class Utils', function() {
  it('Utils.random()', function() {
 	assert.equal(typeof Utils.random, 'function', 'Utils.random is a function');
  });

  it('Utils.randomLHS()', function() {
    assert.equal(typeof Utils.randomLHS, 'function', 'Utils.randomLHS is a function');
    assert.equal(typeof Utils.randomLHS(), 'number', 'Utils.randomLHS() is a number');
    assert.between(Utils.randomLHS(60 * 1000), 1, 60000);
  });
});