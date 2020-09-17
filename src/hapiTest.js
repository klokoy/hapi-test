const Hapi = require('@hapi/hapi');
const _ = require('lodash');

module.exports = options => new HapiTest(options);

class HapiTest {
    constructor(options) {
        if (options.server) {
            this.server = options.server;
        } else {
            this.plugins = options.plugins;
        }
        //requests can be cleared
        this.requests = [];
        //setup can be kept between calls
        this.setup = {};

        this.options = options;
    }

    async _init() {
        if (this.server) return Promise.resolve();

        //If I do not have a server create one
        this.server = new Hapi.Server({ port: 8888 });

        if (this.options && this.options.before) {
            await this.options.before(this.server);
        }

        return this.plugins ? this.server.register(this.plugins.map(plugin => ({
            plugin
        }))) : Promise.resolve()
    }

    get(url, query) {
        const request = { options: { method: 'get', url } };
        if (query) {
            request.options.query = query;
        }
        this.requests.push(request);
        return this;
    }

    delete(url) {
        const request = { options: { method: 'delete', url } };
        this.requests.push(request);
        return this;
    }

    post(url, payload) {
        const request = { options: { method: 'post', url, payload } };
        this.requests.push(request);
        return this;
    }

    put(url, payload) {
        const request = { options: { method: 'put', url, payload } };
        this.requests.push(request);
        return this;
    }

    patch(url, payload) {
        const request = { options: { method: 'patch', url, payload } };
        this.requests.push(request);
        return this;
    }

    assert(a, b) {
        const request = _.last(this.requests);
        if (!request.rejections) {
            request.rejections = [];
        }

        if (_.isNumber(a)) {
            request.rejections.push(res => {
                if (res.statusCode === a) {
                    return false;
                } else {
                    return 'the status code is: ' + res.statusCode + ' but should be: ' + a;
                }
            });
        } else if (_.isString(a)) {
            request.rejections.push(res => {
                return !res.headers[a].match(new RegExp(b));
            });
        } else if (_.isFunction(a)) {
            request.rejections.push(res => {
                return !a(res);
            });
        }

        return this;
    }

    auth(injectAuth) {
        this.injectAuth = injectAuth;
        return this;
    }

    //Support any request headers
    setRequestHeader(header) {
        this.requestHeader = header;
        return this;
    }

    async end() {
        await this._init();

        //run all request, return result in callback for the last request
        const handleRequest = async n => {
            const request = this.requests[n];

            const injectOptions = _.merge(request.options, this.setup, {
                headers: this.requestHeader
            });
            if (this.injectAuth) {
                injectOptions.auth = this.injectAuth;
            }

            // todo: catch inject errors
            const result = await this.server.inject(injectOptions);

            //If rejections for this request has been registered run them and collect errs
            if (request.rejections) {
                request.rejections.forEach(rejection => {
                    const failed = rejection(result);

                    if (failed) {
                        if (!request.errs) {
                            request.errs = [];
                        }
                        request.errs.push(failed);
                    }
                })
            }

            if (n === this.requests.length - 1) {
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
    }

    then(callbackSuccess, callbackError) {
        return this.end().then(callbackSuccess, errors => callbackError && callbackError(getFirstError(errors)));
    }

    catch(callbackError) {
        return this.end().catch(errors => callbackError && callbackError(getFirstError(errors)));
    }
};

function getFirstError(any) {
    let error = Array.isArray(any) ? any[0] : any;

    if (!(error instanceof Error)) {
        error = new Error(error);
    }

    return error;
}
