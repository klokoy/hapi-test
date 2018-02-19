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

HapiTest.prototype._init = async function() {
    if (this.server) return Promise.resolve();

    var self = this;

    //If I do not have a server create one
    self.server = new Hapi.Server({
        port: 8888
    });

    if (self.options && self.options.before) {
        await self.options.before(self.server);
    }

    return self.plugins ? self.server.register(self.plugins.map(plugin => ({plugin}))) : Promise.resolve()
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
    } else if (_.isString(a)) {
        request.rejections.push(function (res) {
            return !res.headers[a].match(new RegExp(b));
        });
    } else if (_.isFunction(a)) {
        request.rejections.push(function(res) {
            return !a(res);
        });
    }

    return self;
};

//Support hapi-auth-cookie
HapiTest.prototype.auth = function(user) {

    this.credentials = user;
    return this;

};

//Support any request headers
HapiTest.prototype.setRequestHeader = function(header) {
    this.requestHeader = header;
    return this;
};


HapiTest.prototype.end = async function() {

    var self = this;

    await self._init();

    //run all request, return result in callback for the last request
    async function handleRequest(n) {
        var request = self.requests[n];

        var injectOptions = _.merge(request.options, self.setup, {headers: self.requestHeader});
        if (self.credentials) {
            injectOptions.credentials = self.credentials;
        }

        // todo: catch inject errors
        const result = await self.server.inject(injectOptions);

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
            //If this is the last request settle the promise
            if (request.errs) {
                throw request.errs;
            } else {
                return result;
            }
        } else {
            return handleRequest(n + 1);
        }
    }

    return handleRequest(0);
};

HapiTest.prototype.then = function (callbackSuccess, callbackError) {
    return this.end().then(callbackSuccess, errors => callbackError(getFirstError(errors)));
};

HapiTest.prototype.catch = function (callbackError) {
    return this.end().catch(errors => callbackError(getFirstError(errors)));
};

function getFirstError(any) {
    var error = Array.isArray(any) ? any[0] : any;

    if (!(error instanceof Error)) {
        error = new Error(error);
    }

    return error;
}
