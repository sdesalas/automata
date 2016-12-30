const Api = require('./lib/Api.js');
const fs = require('fs');
const opn = require('opn');

console.log('Spinning up static site..');
var api = new Api({
    state: {
        memory: JSON.parse(fs.readFileSync('data/memory.json')),
        devices: JSON.parse(fs.readFileSync('data/devices.json'))
    },
    listeners: {
        ready: function() {
            console.log('Listening on port ' + api.port);
            opn('http://localhost:' + api.port);
        }
    }
});

