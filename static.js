const Api = require('./lib/Api.js');
const fs = require('fs');
const opn = require('opn');

var memory = '{}';
var devices = '{}';

try { memory = fs.readFileSync('data/memory.json'); } catch (e) {};
try { devices = fs.readFileSync('data/devices.json'); } catch (e) {};

console.log('Spinning up static site..');
var api = new Api({
    state: {
        memory: JSON.parse(memory),
        devices: JSON.parse(devices)
    },
    listeners: {
        ready: function() {
            console.log('Listening on port ' + api.port);
            opn('http://localhost:' + api.port);
        }
    }
});

