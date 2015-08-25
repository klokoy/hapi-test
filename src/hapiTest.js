var Hapi = require('hapi'),
    _ = require('lodash');


module.exports = function(options) {

    return new HapiTest(options);
};

var HapiTest = function(options) {
    var self = this;

    if (options.server) {
        self.server = options.server;
    } else {
        self.plugins = options.plugins;
    }
    //requests can be cleared
    self.requests = [];
    //setup can be kept between calls
    self.setup = {};

    self.options = options;

    return self;
};

HapiTest.prototype._init = function(callback) {
    var self = this;

    if (!self.server) {
        //If I do not have a server create one
        self.server = new Hapi.Server();
        self.server.connection({
            port: 8888
        })

        if (self.options && self.options.before) {
            self.options.before(self.server);
        }

        self.plugins.forEach(function(plugin, index) {
            self.server.register({
                name: 'plugin' + index,
                version: '0.0.1',
                register: plugin.register
            }, function() {
                if (index === self.plugins.length - 1) {
                    callback();
                }
            });
        });
    } else {
        //If I have a server there is nothing to init
        callback();
    }


}

HapiTest.prototype.get = function(url, query) {

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

HapiTest.prototype.delete = function(url) {

    var request = {
        options: {
            method: 'delete',
            url: url
        }
    };

    this.requests.push(request);

    return this;
};

HapiTest.prototype.post = function(url, payload) {

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

HapiTest.prototype.put = function(url, payload) {

    var request = {
        options: {
            method: 'put',
            url: url,
            payload: payload
        }
    };

    this.requests.push(request);

    return this;
};

HapiTest.prototype.patch = function(url, payload) {

    var request = {
        options: {
            method: 'patch',
            url: url,
            payload: payload
        }
    };

    this.requests.push(request);

    return this;
};

HapiTest.prototype.assert = function(a, b, c) {
    var self = this;

    var request = _.last(this.requests);
    if (!request.rejections) {
        request.rejections = [];
    }

    if (_.isNumber(a)) {
        request.rejections.push(function(res) {
            if (res.statusCode === a) {
                return false;
            } else {
                return 'the status code is: ' + res.statusCode + ' but should be: ' + a;
            }
        });
        if (_.isFunction(b)) {
            self.end(function(res, errs) {
                b(errs);
            });
        }
    } else if (_.isString(a)) {
        request.rejections.push(function(res) {
            return !res.headers[a].match(new RegExp(b));
        });
        if (_.isFunction(c)) {
            self.end(function(res, errs) {
                c(errs);
            });
        }
    } else if (_.isFunction(a)) {
        request.rejections.push(function(res) {
            return !a(res);
        });
        if (_.isFunction(b)) {
            self.end(function(res, errs) {
                b(errs);
            });
        }
    }

    return self;
};

//Support hapi-auth-cookie
HapiTest.prototype.auth = function(user) {

    this.credentials = user;
    return this;

};


HapiTest.prototype.end = function(callback) {

    var self = this;

    self._init(function() {

        //run all request, return result in callback for the last request
        function handleRequest(n) {
            var request = self.requests[n];

            var injectOptions = _.merge(request.options, self.setup);
            if (self.credentials) {
                injectOptions.credentials = self.credentials;
            }


            self.server.inject(injectOptions, function(result) {
                //If rejections for this request has been registered run them and collect errs

                if (request.rejections) {
                    request.rejections.forEach(function(rejection) {
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
    })
};
