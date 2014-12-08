var fs = require("fs");
var aws = require('aws-sdk');
var debug = require('debug')('s3-config');

var ETAG = {};
var MTIME = {};
var CONTENT = {};

var conf = module.exports = {
    s3: new aws.S3(),
    cycle: 1500,
    target: []
};

var getFileName = function(bucket, key) {
    return "/var/tmp/" + [bucket, key].join("--");
};

conf.setOption = function(option) {
    conf.s3 = new aws.S3(option);
};
conf.observe = function(bucket, key) {
    conf.target.push({
        Bucket: bucket,
        Key: key
    });
};

conf.sync = function(cb) {
    var length = conf.target.length;
    var finished = function() {
        if (length === 0) {
            (cb || function() {})();
        }
    };
    conf.target.forEach(function(e) {
        var file = getFileName(e.Bucket, e.Key);
        conf.s3.getObject(e, function(err, res) {
            length--;
            if (err) {
                debug(err);
                finished();
                return;
            }
            if (ETAG[file] && ETAG[file] == res.ETag) {
                /* dummy */
            } else {
                fs.writeFileSync(file, res.Body);
                ETAG[file] = res.ETag;
                debug("updated :" + file);
            }
            finished();
        });
    });
};

conf.start = function(cb) {
    conf._id = setInterval(conf.sync, conf.cycle);
    conf.sync(cb);
};

conf.get = function(bucket, key) {
    var fileName = getFileName(bucket, key);
    var stats = fs.statSync(fileName);
    if (MTIME[fileName] && MTIME[fileName].getTime() === stats.mtime.getTime()) {
        debug("from content:" + fileName);
        return CONTENT[fileName];
    }
    MTIME[fileName] = stats.mtime;
    var json = CONTENT[fileName] = JSON.parse(fs.readFileSync(fileName));
    debug("from file:" + fileName);
    return json;
};
