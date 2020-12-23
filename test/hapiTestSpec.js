var assert = require('chai').assert,
    hapiTest = require('../index.js'),
    Hapi = require('@hapi/hapi'),
    Boom = require('@hapi/boom'),
    _ = require('lodash');

describe('hapi-test', function () {

    describe('All verbs are supported', function () {

        //simple plugin with all supported verbs
        const plugin = {
            name: 'test',
            register: function (plugin, options) {
                plugin.route([{
                    method: '*',
                    path: '/',
                    handler: () => 1
                }]);
            }
        };


        it('should support GET', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .get('/')
                .assert(200);
        });

        it('should support POST', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .post('/', {})
                .assert(200);
        });

        it('should support PUT', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .put('/', {})
                .assert(200);
        });

        it('should support PATCH', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .patch('/', {})
                .assert(200);
        });

        it('should support DELETE', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .delete('/')
                .assert(200);
        })
    });

    describe('assertions', function () {

        const plugin = {
            name: 'test',
            register: function (plugin, options) {

                plugin.route([{
                    method: 'GET',
                    path: '/one',
                    handler: () => 1
                }]);
            }
        };

        it('assert a number should check the status code', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .get('/one')
                .assert(200);
        });

        it('should reject when using assertions with thenables', async function () {
            try {
                await hapiTest({
                    plugins: [plugin]
                })
                    .get('/one')
                    .assert(1000)
                    .then(() => {});
                throw new Error('Promise was resolved when a rejection was expected');
            } catch (err) {
                assert.equal(err.message, 'the status code is: 200 but should be: 1000');
            }
        });

        it('should pass assertion errors to the end method', async function () {
            try {
                await hapiTest({ plugins: [plugin] })
                    .get('/one')
                    .assert(1000)
                    .end()
            } catch (errs) {
                assert(errs);
                assert.equal(errs[0], 'the status code is: 200 but should be: 1000');
            }
        });

        it('should allow passing in an assertion function', function () {
            return hapiTest({ plugins: [plugin] })
                .get('/one')
                .assert(function (res) {
                    return res.statusCode === 200;
                });
        });

        it('if called with 2 strings: match headers[string1] with string2 ', function () {
            return hapiTest({ plugins: [plugin] })
                .get('/one')
                .assert('connection', 'keep-alive');
        });

        it('convert string to regex when called with 2 strings', function () {
            return hapiTest({ plugins: [plugin] })
                .get('/one')
                .assert('connection', 'keep');
        });
        it('should supply get response to end handler', async function () {
            const res = await hapiTest({ plugins: [plugin] })
                .get('/one')
                .end();

            assert(res);
            assert.equal(res.result, 1);
        });
    });

    describe('plugins', function () {
        it('should support multiple plugins', function () {
            const plugin1 = {
                name: 'testPlugin1',
                register: function (plugin, options) {

                    plugin.route([{
                        method: 'GET',
                        path: '/one',
                        handler: () => 1
                    }]);
                }
            };

            const plugin2 = {
                name: 'testPlugin2',
                register: function (plugin, options) {

                    plugin.route([{
                        method: 'GET',
                        path: '/two',
                        handler: () => 2
                    }]);
                }
            };

            return hapiTest({ plugins: [plugin1, plugin2] })
                .get('/one')
                .assert(200)
                .get('/two')
                .assert(200);
        })
    });

    describe('construction with a server object', function () {

        var server;

        before(function () {

            server = new Hapi.Server({
                port: 8888
            });

            const plugin = {
                name: 'plugin',
                version: '0.0.1',
                register: function (plugin, options) {
                    plugin.route([{
                        method: '*',
                        path: '/',
                        handler: () => 2
                    }]);
                }
            };

            return server.register({ plugin });
        })

        it('should support GET', function () {
            return hapiTest({ server: server })
                .get('/')
                .assert(200);
        });

        it('should support POST', function () {
            return hapiTest({ server: server })
                .post('/', {})
                .assert(200);
        });

        it('should support PUT', function () {
            return hapiTest({ server: server })
                .put('/', {})
                .assert(200);
        });

        it('should support PATCH', function () {
            return hapiTest({ server: server })
                .patch('/', {})
                .assert(200);
        });

        it('should support DELETE', function () {
            return hapiTest({ server: server })
                .delete('/')
                .assert(200);
        })


    });

    it('should trigger queued requests', async function () {
        const plugin = {
            name: 'test',
            register: function (plugin, options) {

                var persons = [];

                plugin.route([{
                    method: 'POST',
                    path: '/persons',
                    handler: request => {
                        persons.push(request.payload);
                        return true;
                    }
                }, {
                    method: 'GET',
                    path: '/persons',
                    handler: () => persons
                }]);
            }
        };

        var max = {
            name: 'Max',
            _id: 1
        },
            lui = {
                name: 'Lui',
                _id: 2
            };

        const res = await hapiTest({ plugins: [plugin] })
            .post('/persons', max)
            .post('/persons', lui)
            .get('/persons')
            .end();

        assert(res);
        assert.deepEqual([max, lui], res.result);
    });

    describe('hapi-auth-cookie', function () {
        const plugin = {
            name: 'test',
            register: function (plugin, options) {

                plugin.route([{
                    method: 'GET',
                    path: '/user',
                    config: {
                        handler: request => request.auth.credentials,
                        auth: 'session'
                    }
                }]);
            }
        };

        //function to setup auth on the server
        const before = async function (server) {
            await server.register(require('@hapi/cookie'))

            server.auth.strategy('session', 'cookie', {
                cookie: {
                    name: 'session',
                    password: 'hapi-test-insecure-password',
                    isSecure: false
                },
                redirectTo: '/login',
            });
        };

        it('should bypass authentication with credentials given to auth', async function () {
            const user = { name: 'max', age: 8 };

            const res = await hapiTest({ plugins: [plugin], before })
                .auth({ credentials: user, strategy: 'session' })
                .get('/user')
                .assert(200)
                .end();

            const authenticatedUser = JSON.parse(res.payload);

            assert.equal(authenticatedUser.name, user.name);
            assert.equal(authenticatedUser.age, user.age);
        });

    });

    describe('request headers', function () {
        const customHeader = { 'special-header': 'special-value' };
        const plugin = {
            name: 'test',
            register: function (plugin, options) {
                plugin.route([{
                    method: 'GET',
                    path: '/specialUrl',
                    handler: request => _.isMatch(request.headers, customHeader) ? 1 : Boom.badRequest('I want special headers!')
                }]);
            }
        };

        it('should pass given request headers to hapi server inject', function () {
            return hapiTest({ plugins: [plugin] })
                .get('/specialUrl')
                .setRequestHeader(customHeader)
                .assert(200);
        });

        it('should give bad request when headers not given', function () {
            return hapiTest({ plugins: [plugin] })
                .get('/specialUrl')
                .assert(400);
        });
    });

    describe('promises', function () {

        const plugin = {
            name: 'test',
            register: function (plugin, options) {

                plugin.route([{
                    method: 'GET',
                    path: '/one',
                    handler: () => 1,
                }]);
            }
        };

        it('should return a promise for request completion', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .get('/one')
                .assert(200)
                .then(function (response) {
                    assert.equal(response.result, 1);
                });
        });

        it('should support thenable with (function(response), function(error)) signature', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .get('/one')
                .assert(1000)
                .then(function (response) {
                    console.log('bla')
                    assert.fail('Should not succeed');
                }, function (error) {
                    assert.instanceOf(error, Error, 'Should be inscance of error');
                    assert.equal(error.message, 'the status code is: 200 but should be: 1000');
                });
        });

        it('should support catch error handling', function () {
            return hapiTest({
                plugins: [plugin]
            })
                .get('/one')
                .assert(1000)
                .catch(function (error) {
                    assert.instanceOf(error, Error, 'Should be inscance of error');
                    assert.equal(error.message, 'the status code is: 200 but should be: 1000');
                });
        });

    })
});
