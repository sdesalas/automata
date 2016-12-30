var os = require('os');
var util = require('util');
var assert = require('./assert-fuzzy');
var SensorCycle = require('../lib/SensorCycle');

describe('class SensorCycle', function() {
  it('new SensorCycle()', function() {
    var options = {
      size: 64
    };
    var sensorCycle = new SensorCycle(options);

    assert(sensorCycle !== undefined, 'new SensorCycle()');
    assert(sensorCycle instanceof SensorCycle, 'new SensorCycle()');
    assert(sensorCycle.options instanceof Object, 'sensorCycle.options');
    assert(sensorCycle.options === options, 'sensorCycle.options');
    assert(sensorCycle.update instanceof Function, 'sensorCycle.update()');
    assert(sensorCycle.clear instanceof Function, 'sensorCycle.clear()');
    assert(sensorCycle.compare instanceof Function, 'sensorCycle.compare()');
    assert(sensorCycle.pattern instanceof Array, 'sensorCycle.pattern');
    assert(sensorCycle.pattern.length === 0, 'sensorCycle.pattern');
    assert(sensorCycle.buffer instanceof Array, 'sensorCycle.buffer');
    assert(sensorCycle.buffer.length === 0, 'sensorCycle.buffer');

  });

  describe('sensorCycle.compare(expected, actual)', function() {
    var sensorCycle = new SensorCycle();

    it('Compares two strings and returns deviation', function() {
      assert.around(sensorCycle.compare('a', 'a'), 0);
      assert.around(sensorCycle.compare('a', 'b'), 1);
      assert.around(sensorCycle.compare('aa', 'ab'), 0.5);
      assert.around(sensorCycle.compare('aaa', 'abc'), 2/3);
      assert.around(sensorCycle.compare('abc', 'abd'), 1/3);
      assert.around(sensorCycle.compare('abc', 'ab'), 1/3);
      assert.around(sensorCycle.compare('abc', 'abcd'), 1/4);
      assert.around(sensorCycle.compare('abc', 'abcde'), 2/5);
      assert.around(sensorCycle.compare('ab', 'abcde'), 3/5);
      assert.around(sensorCycle.compare('abc', 'abcdef'), 1/2);
      assert.around(sensorCycle.compare('abc', 'xazxp'), 1);
      assert.around(sensorCycle.compare('', 'abc'), 1);
    });

    it('Compares two strings and uses history to return deviation', function() {
      assert.around(sensorCycle.compare('a', ['a', 'a']), 0);
      assert.around(sensorCycle.compare('a', ['b', 'b']), 1);
      assert.around(sensorCycle.compare('a', ['b', 'a']), 0.5);
      assert.around(sensorCycle.compare('a', ['b', 'a', 'b']), 2/3);
      assert.around(sensorCycle.compare('a', ['b', 'b', 'a', 'b']), 3/4);
      assert.around(sensorCycle.compare('ab', ['aa', 'aa', 'aa']), 0.5);
      assert.around(sensorCycle.compare('ab', ['aa', 'ab', 'aa']), 2/6);
      assert.around(sensorCycle.compare('aaa', ['abc', 'aba', 'aaa', '']), 1/2);
      assert.around(sensorCycle.compare('aaa', ['abc', 'aba', 'aa', 'vsad']), 10/16);
      assert.around(sensorCycle.compare('aaa', ['xzr', 'xAg', '', 'xif']), 1);
    });

  });

  describe('sensorCycle.update()', function() {

    it('Can be chained', () => {
      var sensorCycle = new SensorCycle();
      assert(sensorCycle.update('one') === sensorCycle);
    });

    it('Tracks cycles, detects changes', () => {
      var sensorCycle = new SensorCycle({ delimiter : '>'});
      sensorCycle.update('one>1');
      assert.deepEqual(sensorCycle.buffer, ['one>1']);
      assert.deepEqual(sensorCycle.pattern, ['one']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'one>1', source: 'one', payload: '1', expected: undefined, deviation: 1, surprise: 0});
      assert.deepEqual(sensorCycle.history['one'], ['1']);
      sensorCycle.update('two>2');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2']);
      assert.deepEqual(sensorCycle.pattern, ['one', 'two']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'two>2', source: 'two', payload: '2', expected: undefined, deviation: 1, surprise: 0});
      assert.deepEqual(sensorCycle.history['two'], ['2']);
      sensorCycle.update('three>3');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3']);
      assert.deepEqual(sensorCycle.pattern, ['one', 'two', 'three']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'three>3', source: 'three', payload: '3', expected: undefined, deviation: 1, surprise: 0});
      assert.deepEqual(sensorCycle.history['three'], ['3']);
      sensorCycle.update('one>1');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3', 'one>1']);
      assert.deepEqual(sensorCycle.pattern, ['two', 'three', 'one']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'one>1', source: 'one', payload: '1', expected: undefined, deviation: 0, surprise: 0});
      assert.deepEqual(sensorCycle.history['one'], ['1', '1']);
      sensorCycle.update('two>2');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3', 'one>1', 'two>2']);
      assert.deepEqual(sensorCycle.pattern, ['three', 'one', 'two']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'two>2', source: 'two', payload: '2', expected: 'two>2', deviation: 0, surprise: 0});
      assert.deepEqual(sensorCycle.history['two'], ['2', '2']);
      sensorCycle.update('three>XX');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3', 'one>1', 'two>2', 'three>XX']);
      assert.deepEqual(sensorCycle.pattern, ['one', 'two', 'three']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'three>XX', source: 'three', payload: 'XX', expected: 'three>3', deviation: 1, surprise: 1});
      assert.deepEqual(sensorCycle.history['three'], ['XX', '3']);
      sensorCycle.update('four>4');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3', 'one>1', 'two>2', 'three>XX', 'four>4']);
      assert.deepEqual(sensorCycle.pattern, ['one', 'two', 'three', 'four']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'four>4', source: 'four', payload: '4', expected: 'one>1', deviation: 1, surprise: 1});
      assert.deepEqual(sensorCycle.history['four'], ['4']);
      sensorCycle.update('one>1');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3', 'one>1', 'two>2', 'three>XX', 'four>4', 'one>1']);
      assert.deepEqual(sensorCycle.pattern, ['two', 'three', 'four', 'one']);
      assert.deepEqual(sensorCycle.lastUpdate, {data: 'one>1', source: 'one', payload: '1', expected: 'one>1', deviation: 0, surprise: 0});
      assert.deepEqual(sensorCycle.history['one'], ['1', '1', '1']);
      sensorCycle.update('two>2');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3', 'one>1', 'two>2', 'three>XX', 'four>4', 'one>1', 'two>2']);
      assert.deepEqual(sensorCycle.pattern, ['three', 'four', 'one', 'two']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'two>2', source: 'two', payload: '2', expected: 'two>2', deviation: 0, surprise: 0});
      assert.deepEqual(sensorCycle.history['two'], ['2', '2', '2']);
      sensorCycle.update('three>3');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3', 'one>1', 'two>2', 'three>XX', 'four>4', 'one>1', 'two>2', 'three>3']);
      assert.deepEqual(sensorCycle.pattern, ['four', 'one', 'two', 'three']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'three>3', source: 'three', payload: '3', expected: 'three>XX', deviation: 0.75, surprise: 1});
      assert.deepEqual(sensorCycle.history['three'], ['3', 'XX','3']);
      sensorCycle.update('one>1');
      assert.deepEqual(sensorCycle.buffer, ['one>1', 'two>2', 'three>3', 'one>1', 'two>2', 'three>XX', 'four>4', 'one>1', 'two>2', 'three>3', 'one>1']);
      assert.deepEqual(sensorCycle.pattern, ['two', 'three', 'one']);
      assert.deepEqual(sensorCycle.lastUpdate , {data: 'one>1', source: 'one', payload: '1', expected: 'four>4', deviation: 0, surprise: 1});
      assert.deepEqual(sensorCycle.history['one'], ['1', '1', '1', '1']);
    });

    function filterChanges(sensorCycle, cycles) {
      return cycles.map(cycle =>
        cycle
          .map(data => sensorCycle.update(data).lastUpdate)
          .filter(update => update.surprise)
      ).reduce((last, next) => last.concat(next));
    }

    it('Detects single DIGITAL sensor changes during repetitive cycles.', () => {
      var cycles = [
        ['C>0', 'D>0', 'X>1', 'b>0', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>0', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>0', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>1', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>1', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>1', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>1', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>1', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>1', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>1', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>1', 'R>1'],
        ['C>0', 'D>0', 'X>1', 'b>0', 'R>1']
      ], sensorCycle = new SensorCycle();

      var result = filterChanges(sensorCycle, cycles);

      assert.compareObjects({
        actual: result,
        expected: [
          {data: 'b>1', source: 'b', payload: '1', expected: 'b>0', deviation: 1, surprise: 1},
          {data: 'b>0', source: 'b', payload: '0', expected: 'b>1', deviation: 0.75, surprise: 1}
        ], ignore: ['deviation']
      });
      assert.around(result[0].deviation, 1);
      assert.around(result[1].deviation, 0.75);

    });

    it('Detects single ANALOG sensor changes during repetitive cycles', () => {
      var cycles = [
        ['C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>8', 'R>0'],
        ['C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>3', 'R>0'],
        ['C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0']
      ], sensorCycle = new SensorCycle({ size: 64 }); // 64/16 = 4 items in history

      var result = filterChanges(sensorCycle, cycles);

      assert.compareObjects({
        actual: result,
        expected: [
          {data: 'L>8', source: 'L', payload: '8', expected: 'L>7', deviation: 1, surprise: 1},
          {data: 'L>7', source: 'L', payload: '7', expected: 'L>8', deviation: 0.5, surprise: 1},
          {data: 'L>3', source: 'L', payload: '3', expected: 'L>7', deviation: 1, surprise: 1}
        ]
      });

    });

    it('Detects multiple ANALOG sensor changes during repetitive cycles', () => {
      var cycles = [
        ['C>0', 'D>12', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>12', 'X>1', 'a>0', 'b>0', 'L>8', 'R>0'],
        ['C>0', 'D>5', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>4', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>13', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>12', 'X>1', 'a>0', 'b>0', 'L>3', 'R>0'],
        ['C>0', 'D>12', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0'],
        ['C>0', 'D>12', 'X>1', 'a>0', 'b>0', 'L>7', 'R>0']
      ], sensorCycle = new SensorCycle({ size: 64 }); // 64/16 = 4 items in history

      var result = filterChanges(sensorCycle, cycles);

      assert.compareObjects({
        actual: result,
        expected: [
          {data: 'L>8', source: 'L', payload: '8', expected: 'L>7', deviation: 1, surprise: 1},
          {data: 'D>5', source: 'D', payload: '5', expected: 'D>12', deviation: 1, surprise: 1},
          {data: 'L>7', source: 'L', payload: '7', expected: 'L>8', deviation: 0.5, surprise: 1},
          {data: 'D>4', source: 'D', payload: '4', expected: 'D>5', deviation: 1, surprise: 1},
          {data: 'D>13', source: 'D', payload: '13', expected: 'D>4', deviation: 1, surprise: 1},
          {data: 'D>12', source: 'D', payload: '12', expected: 'D>13', deviation: 0.125, surprise: 1},
          {data: 'L>3', source: 'L', payload: '3', expected: 'L>7', deviation: 1, surprise: 1}
        ],
        ignore: ['deviation']
      });

      assert.around(result[0].deviation, 1);
      assert.around(result[1].deviation, 1);
      assert.around(result[2].deviation, 0.5);
      assert.around(result[3].deviation, 1);
      assert.around(result[4].deviation, 0.75);
      assert.around(result[5].deviation, 0.625);
      assert.around(result[6].deviation, 1);

    });

    //console.log('ARGS->', process.argv);

    describe('Performance', () => {
      var cycle = [ 'C>0', 'D>0', 'X>1', 'a>0', 'b>0', 'L>121', 'R>0', 'G>0'],
          sensorCycle,
          limitMB = 30,
          startRAM = os.freemem() / os.totalmem();

      beforeEach(() => {
        sensorCycle = new SensorCycle();
      });

      function executeUpdates(data) {
        //sensorCycle, cycle, runs, showlog
        data = data || {};
        var timeout = (data.secs || 5) * 1000
        if (data.debug) console.log('executeUpdates() x %d', runs);
        var message = util.format('%d updates in %ds and uses <%dMB of RAM', data.runs, data.secs, data.limitMB);
        it(message, function() {
          this.timeout(timeout);
          for(var i = 0; i < data.runs; i++) {
            cycle.forEach(item => {
              if (Math.random() > 0.9) item = item + '2';
              sensorCycle.update(item);
            });
            if (data.debug && i % (data.runs /10) === 0) {
              console.log("free:%s%, rss:%d", (os.freemem() / os.totalmem() * 100).toFixed(2), process.memoryUsage().rss / 1024 / 1024);
            }
          }
          var rss = process.memoryUsage().rss / 1024 / 1024;
          assert(rss < data.limitMB, util.format('Uses less than %dMB of RAM (actual %sMB)', data.limitMB, rss.toFixed()));
        });

      }

      if (os.platform() === 'win32' && os.cpus()[0].speed > 2000) {
        // Dev PC is 50 times faster 
        executeUpdates({ runs: 50 * 1000, secs: 5, limitMB: 30 });
        executeUpdates({ runs: 50 * 5000, secs: 10, limitMB: 30 });
        executeUpdates({ runs: 50 * 10000, secs: 15, limitMB: 30 });
        //executeUpdates({ runs: 45 * 50000, secs: 60, limitMB: 30 });
      } else {
        executeUpdates({ runs: 1000, secs: 5, limitMB: 30 });
        executeUpdates({ runs: 5000, secs: 10, limitMB: 30 });
        executeUpdates({ runs: 10000, secs: 15, limitMB: 30 });
        executeUpdates({ runs: 50000, secs: 60, limitMB: 30 });
      }

    });

  });

});
