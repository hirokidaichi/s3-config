var conf = require("./");
var cluster = require("cluster");
var numCPUs = require('os').cpus().length;

conf.observe("live4u-conf", "config-activation.json");

var sendWorkers = function(message) {
    for (var id in cluster.workers) {
        cluster.workers[id].send(message);
    }
};
if (cluster.isMaster) {
    // Fork workers.
    for (var i = 0; i < numCPUs; i++) {
        cluster.fork();
    }
    cluster.on('exit', function(worker, code, signal) {
        console.log('worker ' + worker.process.pid + ' died');
    });

    conf.start(function() {
        sendWorkers("conf started");
    });
} else {
    process.on("message", function() {
        setInterval(function() {
            conf.get("live4u-conf", "config-activation.json");
        }, 10000 * Math.random());
    });
}
