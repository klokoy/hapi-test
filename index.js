var Promise = require('es6-promise').Promise,
    Hapi = require('hapi'),
    _ = require('lodash');

var HapiTest = function (plugin) {
    var self = this;

    return new Promise(function (resolve, reject) {

        self.plugin = plugin;
        //options can be cleared
        self.requests = [];
        //setup can be keept between calls
        self.setup = {};

        self.server = new Hapi.Server();

        self.server.pack.register({
            name: 'plugin',
            version: '0.0.1',
            register: self.plugin.register
        }, function () {
            resolve(self);
        });
    });

};

HapiTest.prototype.get = function (url, query) {

    var request = {
        options: {
            method: 'get',
            url: url
        }
    };

    if (query) {
        request.options.query = query;
    }

    this.requests.push(request);

    return this;
};

HapiTest.prototype.post = function (url, payload) {

    var request = {
        options: {
            method: 'post',
            url: url,
            payload: payload
        }
    };

    this.requests.push(request);

    return this;
};

HapiTest.prototype.assert = function (a, b, c) {
    var self = this;

    var request = _.last(this.requests);
    if (!request.rejections) {
        request.rejections = [];
    }

    if (_.isNumber(a)) {
        request.rejections.push(function (res) {
            if (res.statusCode === a) {
                return false;
            } else {
                return 'the status code is: ' + res.statusCode + ' but should be: ' + a;
            }
        });
        if (_.isFunction(b)) {
            self.end(function (res, errs) {
                b(errs);
            });
        }
    } else if (_.isFunction(a)) {
        request.rejections.push(function(res) {
            return !a(res);
        });
        if (_.isFunction(b)) {
            self.end(function (res, errs) {
                b(errs);
            });
        }
    }

    return self;
};

HapiTest.prototype.end = function (callback) {

    var self = this;

    //run all request, return result in callback for the last request
    function handleRequest(n) {
        var request = self.requests[n];
        self.server.inject(_.merge(request.options, self.setup), function (result) {
            //If rejections for this request has been registered run them and collect errs
            if (request.rejections) {
                request.rejections.forEach(function (rejection) {
                    var failed = rejection(result);

                    if (failed) {
                        if (!request.errs) {
                            request.errs = [];
                        }
                        request.errs.push(failed);
                    }
                })
            }

            if (n === self.requests.length - 1) {
                //If this is the last request fire the callback
                callback(result, request.errs);
            } else {
                handleRequest(n + 1);
            }
        });
    }

    handleRequest(0);
};

exports.HapiTest = HapiTest;