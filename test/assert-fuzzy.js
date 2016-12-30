/*
 * assert-fuzzy.js
 *
 * Extra fuzzy logic assertions for nodejs 'assert'.
 */

var util = require('util');
var assert = require('assert');

assert.greaterThan = function(val1, val2, msg) {
  if (typeof val1 !== typeof val2 !== 'number') throw Error(util.format('Numbers expected. You passed "%s" and "%s"', typeof val1, typeof val2));
  return assert(val1 > val2, util.format('%d greater than %d', val1, val2));
}

assert.lowerThan = function(val1, val2, msg) {
  return assert.greterThan(val1, val2, util.format('%d lower than %d', val1, val2));
}

assert.between = function (val, from, to, msg) {
  from = from || 0;
  to = to || 0;
  return assert(val >= from && val <= to, msg || util.format('%s between %s and %s', val.toFixed(2), from.toFixed(2), to.toFixed(2)));
};

assert.around = function (val, estimate, msg) {
  var from, to;
  estimate = estimate || 0;
  if (estimate === 0) {
    from = -0.2;
    to = 0.2;
  }
  else if (Math.abs(estimate) < 1) {
    from = estimate - 0.05;
    to = estimate + 0.05;
  } else {
    from = estimate * 0.9;
    to = estimate * 1.1;
  }
  return assert.between(val, from, to, msg || util.format('%s around %s', val.toFixed(2), estimate.toFixed(2)));
}

assert.compareObjects = function (conditions) {
  var actual = JSON.parse(JSON.stringify(conditions.actual));
  var expected = JSON.parse(JSON.stringify(conditions.expected));
  var ignore = conditions.ignore;
  if (ignore && ignore instanceof Array) {
    ignore.forEach(field => {
      if (actual instanceof Array) actual.forEach(obj => delete obj[field]);
      else if (actual instanceof Object) delete actual[field];
      if (expected instanceof Array) expected.forEach(obj => delete obj[field]);
      else if (expected instanceof Array) delete expected[field]
    });
  }
  return assert.deepStrictEqual(actual, expected, conditions.msg);
}

module.exports = assert;
