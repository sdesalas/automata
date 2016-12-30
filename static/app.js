
// app Vue instance
var app = new Vue({

    el: '#app',

    // app initial state
    data: {
        ready: false,
        paused: false,
        devices: {},
        memory: {},
        status: {}
    },

    // computed properties
    // http://vuejs.org/guide/computed.html
    computed: {
        deviceCount: function () {
            return Object.keys(this.devices).length
        },
        sensorCount: function() {
            var device, sensor, sensors = [];
            for (var device in this.devices) {
                sensors = sensors.concat(this.devices[device].sensors);
            }
            return sensors.length;
        },
        actuatorCount: function () {
            var device, action, actions = [];
            for (var device in this.devices) {
                for (var action in this.devices[device].actions) {
                    actions.push(action);
                }
            }
            return actions.length;
        },
        commandCount: function () {
            var device, action, commands = [];
            for (var device in this.devices) {
                for (var action in this.devices[device].actions) {
                    commands = commands.concat(this.devices[device].actions[action]);
                }
            }
            return commands.length;
        },
        vectorCount: function () {
            var inputs = this.memory && this.memory.reactions && this.memory.reactions.inputs;
            return Object.keys(inputs || {}).length;
        },
        ramUsage: function() {
            var rss = this.status && this.status.memory && this.status.memory.rss;
            return Math.round(rss / 1024 / 1024 || '?')
        },
        topReactionsChartData: function() {
            var reactions = this.memory && this.memory.reactions || {};
            var top = this.topReactions('input');
            if (!reactions.inputs || !reactions.outputs) return [];
            return top.map((input) => {
                return {
                    data: reactions.inputs[input],
                    backgroundColor: this.color(reactions.outputs),
                    label: input
                }
            });
        },
        topConsequencesChartData: function() {
            var consequences = this.memory && this.memory.consequences || {};
            var top = this.topReactions('output');
            if (!consequences.inputs || !consequences.outputs) return [];
            return top.map((output) => {
                return {
                    data: consequences.inputs[output],
                    backgroundColor: this.color(consequences.outputs),
                    label: output
                }
            });
        },
        reactionsChartData: function() {
            var inputs = this.memory && this.memory.reactions && this.memory.reactions.inputs || {};
            return Object.keys(inputs).reduce((data, input, i1) => {
                inputs[input].forEach((weight, i2) => {
                    data.push({ x: i1 * 2, y: i2 * 2, r: weight * 400 });
                });
                return data;
            }, []);
        },
        consequencesChartData: function() {
            var inputs = this.memory && this.memory.consequences && this.memory.consequences.inputs || {};
            return Object.keys(inputs).reduce((data, input, i1) => {
                inputs[input].forEach((weight, i2) => {
                    data.push({ x: (i2 * 2) + 1, y: (i1 * 2) + 1, r: weight * 400 });
                });
                return data;
            }, []);
        },
        reactionsActivityData: function() {
            var cutoff = new Date().getTime() - 30 * 1000;
            var history = this.memory && this.memory.history && this.memory.history.reactions || [];
            return Array.from(Array(30).keys()).map(secs => {
                return history.filter(i => {
                    var diff = (i.timestamp - cutoff);
                    return Math.floor(diff / 1000) === secs;
                }).length;
            });
        },
        surprisesActivityData: function() {
            var cutoff = new Date().getTime() - 30 * 1000;
            var history = this.memory && this.memory.history && this.memory.history.surprises || [];
            return Array.from(Array(30).keys()).map(secs => {
                return history.filter(i => {
                    var diff = (i.timestamp - cutoff);
                    return Math.floor(diff / 1000) === secs;
                }).length;
            });
        },
        experimentsActivityData: function() {
            var cutoff = new Date().getTime() - 30 * 1000;
            var history = this.memory && this.memory.history && this.memory.history.experiments || [];
            return Array.from(Array(30).keys()).map(secs => {
                return history.filter(i => {
                    var diff = (i.timestamp - cutoff);
                    return Math.floor(diff / 1000) === secs;
                }).length;
            });
        },
        uptime: function() {
            var uptime = this.status && this.status.uptime || 0;
            var hours = Math.floor(uptime / 3600);
            uptime = uptime - (hours * 3600);
            var minutes = Math.floor(uptime / 60);
            uptime = uptime - (minutes * 60);
            var seconds = Math.round(uptime);
            return `${hours}:${minutes}:${seconds}`;
        }
    },

    // methods that implement data logic.
    methods: {

        tickUptime: function() {
            this.status.uptime += 1;
        },

        getMemory: function () {
            //console.log('app.getMemory()');
            return axios.get('/memory').then(response => {
                this.memory = response.data;
                //this.charts.data.grid.datasets[0].data = this.reactionsChartData;
                //this.charts.data.grid.datasets[1].data = this.consequencesChartData;
                //this.charts.grid.update();
                if (Math.random() < 0.3) {
                    var topReactionsChartData = this.topReactionsChartData;
                    topReactionsChartData.forEach((dataset, i) => this.charts.data.topReactions.datasets[i] = dataset);
                    this.charts.data.topReactions.labels = this.memory.reactions.outputs;
                    this.charts.topReactions.update();
                    var topConsequencesChartData = this.topConsequencesChartData;
                    topConsequencesChartData.forEach((dataset, i) => this.charts.data.topConsequences.datasets[i] = dataset);
                    this.charts.data.topConsequences.labels = this.memory.consequences.outputs;
                    this.charts.topConsequences.update();
                }
                this.charts.data.history.datasets[0].data = this.surprisesActivityData;
                this.charts.data.history.datasets[1].data = this.reactionsActivityData;
                this.charts.data.history.datasets[2].data = this.experimentsActivityData;
                this.charts.history.update();
            });
        },

        getDevices: function () {
            //console.log('app.getDevices()');
            return axios.get('/devices').then(response => {
                this.devices = response.data;
            });
        },

        getStatus: function () {
            //console.log('app.getStatus()');
            return axios.get('/status').then(response => this.status = response.data);
        },

        getAll: function () {
            console.log('app.getAll()');
            axios.all([
                this.getMemory(), 
                this.getDevices(), 
                this.getStatus()
            ]).then(axios.spread((acct) => {
                // All requests are now complete
                console.log('app.getall().complete()');
                this.ready = true;
            }));
        },

        init: function() {
            console.log('app.init()');
            this.getAll();
            this.play();
        },

        pause: function() {
            this.intervals = this.intervals || {};
            Object.keys(this.intervals).forEach(k => clearInterval(this.intervals[k]));
            this.paused = true;
        },

        play: function() {
            this.intervals = this.intervals || {};
            this.intervals.getDevices = setInterval(() => this.getDevices(), 3300);
            this.intervals.getMemory = setInterval(() => this.getMemory(), 1000);
            this.intervals.getStatus = setInterval(() => this.getStatus(), 2280);
            this.intervals.tickUptime = setInterval(() => this.tickUptime(), 990);
            this.paused = false;
        },

        color: function(arr) {
            var isString = false;
            if (typeof arr === 'string') {
                isString = true;
                arr = [arr];
            }
            var result = arr.map(function(str) {
                var char, num = 0,
                  hash = '#000000';
                if (!str || str.length == 0) return hash;
                for (var i = 0; i < str.length; i++) {
                  char = str.charCodeAt(i);
                  num = ((num << 5) - num) + Math.pow(char,4);
                  num = num & num; // Convert to 32bit integer
                }
                hash = Math.abs(num).toString(16);
                while (hash.length < 6) {
                  hash = '0' + hash;
                }
                return '#' + hash.substr(-6);
            });
            return (isString) ? result[0] : result;
        },

        topReactions: function(io, n) {
            io = io || 'input';
            var history = this.memory.history && this.memory.history.reactions || [];
            var frequency = history.filter((r, i) => i >= history.length - 100) // last 100
                .reduce((obj, reaction) => { 
                    var key = reaction[io];
                    obj[key] = obj[key] || 0; 
                    obj[key]++; 
                    return obj;
                }, {});
            return Object.keys(frequency)
                        .sort((i1, i2) => frequency[i2] - frequency[i1])
                        .filter((i, index) => index < (n || 5));
        }
    }

});

setTimeout(function() {app.init()}, 100);

/*
var colors = {
    green: '#3e9a79',
    blue: '#3e6b9a',
    red: '#d02800',
    purple: '#ad3978'
}*/

var colors = {
    red: 'rgb(255, 99, 132)',
    orange: 'rgb(255, 159, 64)',
    yellow: 'rgb(255, 205, 86)',
    green: 'rgb(75, 192, 192)',
    blue: 'rgb(54, 162, 235)',
    purple: 'rgb(153, 102, 255)',
    grey: 'rgb(231,233,237)'
}


// Initialise chart config
app.charts = {};
app.charts.data = {
    history: {
        labels: Array.from(Array(30).keys()).reverse(),
        datasets: [{
            label: 'Surprises',
            backgroundColor: 'rgba(208,40,0,0.5)',
            borderColor: Chart.helpers.color(colors.red).rgbString(),
            borderWidth: 1,
            data: [12, 0, 3, 15, 7, 2, 0]
        }, {
            label: 'Reactions',
            backgroundColor: Chart.helpers.color(colors.green).alpha(0.5).rgbString(),
            borderColor: Chart.helpers.color(colors.green).rgbString(),
            borderWidth: 1,
            data: [11, 3, 9, 2, 19, 5, 2]
        }, {
            label: 'Experiments',
            backgroundColor: 'rgba(62,107,154,0.5)',
            borderColor: Chart.helpers.color(colors.blue).rgbString(),
            borderWidth: 1,
            data: [3, 0, 2, 6, 1, 2, 7]
        }]
    },
    grid: {
        labels: ['10s', '20s', '30s', '40s', '50s', '60s'],
        datasets: [{
            label: 'Reactions',
            data: [
                { x: 23, y: 44, r: 44 },
                { x: 14, y: 67, r: 1 },
                { x: 5, y: 19, r: 11 }
            ],
            backgroundColor: colors.green,
            hoverBackgroundColor: colors.green,
        },{
            label: 'Consequences',
            data: [
                { x: 45, y: 23, r: 15 },
                { x: 22, y: 57, r: 1 },
                { x: 19, y: 8, r: 8 }
            ],
            backgroundColor: colors.purple,
            hoverBackgroundColor: colors.purple,
        }]
    },
    topReactions: {
        datasets: [{
            data: [
                12,
                5,
                55
            ],
            backgroundColor: [
                colors.grey,
                colors.grey,
                colors.grey
            ],
            label: 'Dataset 1'
        },{
            data: [
                1,
                25,
                6
            ],
            backgroundColor: [
                colors.grey,
                colors.grey,
                colors.grey
            ],
            label: 'Dataset 1'
        }],
        labels: [
            'n/a',
            'n/a',
            'n/a'
        ]
    },
    topConsequences: {
        datasets: [{
            data: [
                12,
                5,
                55
            ],
            backgroundColor: [
                colors.grey,
                colors.grey,
                colors.grey
            ],
            label: 'Dataset 1'
        },{
            data: [
                1,
                25,
                6
            ],
            backgroundColor: [
                colors.grey,
                colors.grey,
                colors.grey
            ],
            label: 'Dataset 1'
        }],
        labels: [
            'n/a',
            'n/a',
            'n/a'
        ]
    }
};

Chart.defaults.global.animation.duration = 200;

app.charts.history = new Chart('historyChart', {
    type: 'bar',
    data: app.charts.data.history,
    options: {
        responsive: true,
        legend: {
            position: 'top',
        },
        title: {
            display: true,
            text: 'Activity'
        },
        scales: {
            xAxes: [{
                gridLines: {
                display: false,
                drawBorder: false
            }
            }],
            yAxes: [{
                gridLines: {
                display: false,
                drawBorder: false
            }
            }]
        }
    }
});

app.charts.topReactions = new Chart('topReactionsChart', {
    type: 'doughnut',
    data: app.charts.data.topReactions,
    options: {
        responsive: true,
        legend: {
            display: false,
        },
        title: {
            display: true,
            text: 'Top Reactions'
        },
        animation: {
            animateScale: true,
            animateRotate: true
        }
    }
});

app.charts.topConsequences = new Chart('topConsequencesChart', {
    type: 'doughnut',
    data: app.charts.data.topConsequences,
    options: {
        responsive: true,
        legend: {
            display: false,
        },
        title: {
            display: true,
            text: 'Top Consequences'
        },
        animation: {
            animateScale: true,
            animateRotate: true
        }
    }
});
/*
app.charts.grid = new Chart('gridChart', {
    type: 'bubble',
    data: app.charts.data.grid,
    options: {
        tooltips: {
            custom: function(tooltip) {
                // tooltip will be false if tooltip is not visible or should be hidden
                if (!tooltip) {
                    return;
                }

                // Otherwise, tooltip will be an object with all tooltip properties like:

                tooltip.text = 'blah';
                // tooltip.caretSize
                // tooltip.caretPadding
                // tooltip.chart
                // tooltip.cornerRadius
                // tooltip.fillColor
                // tooltip.font...
                // tooltip.text
                // tooltip.x
                // tooltip.y
                // tooltip.caretX
                // tooltip.caretY
                // etc...
            }
        }
    }
});*/