var assert = require('chai').assert,
    hapiTest = require('../index.js'),
    Hapi = require('hapi'),
    Boom = require('boom');

describe('hapi-test', function() {

    //Test that all verbs are supported
    describe('verbs', function() {

        //simple plugin with all supported verbs
        var plugin = {
            register: function(plugin, options, next) {
                plugin.route([{
                    method: '*',
                    path: '/',
                    handler: function(request, reply) {
                        reply(1);
                    }
                }]);

                next();
            }
        };

        plugin.register.attributes = {
            name: 'test'
        };


        it('should support GET', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .get('/')
                .assert(200, done);
        });

        it('should support POST', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .post('/', {})
                .assert(200, done);
        });

        it('should support PUT', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .put('/', {})
                .assert(200, done);
        });

        it('should support PATCH', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .patch('/', {})
                .assert(200, done);
        });

        it('should support DELETE', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .delete('/')
                .assert(200, done);
        })
    });

    describe('assertions', function() {

        var plugin = {
            register: function(plugin, options, next) {

                plugin.route([{
                    method: 'GET',
                    path: '/one',
                    handler: function(request, reply) {
                        reply(1);
                    }
                }]);

                next();
            }
        };

        plugin.register.attributes = {
            name: 'test'
        };

        it('assert a number should check the status code', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .get('/one')
                .assert(200, done);
        });

        it('should pass assertion errors to the end method', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .get('/one')
                .assert(1000)
                .end(function(result, errs) {
                    assert(errs);
                    assert.equal(errs[0], 'the status code is: 200 but should be: 1000');
                    done()
                });
        });

        it('should allow passing in an assertion function', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .get('/one')
                .assert(function(res) {
                    return res.statusCode === 200;
                }, done);
        });

        it('if called with 2 strings: match headers[string1] with string2 ', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .get('/one')
                .assert('connection', 'keep-alive', done);
        });

        it('convert string to regex when called with 2 strings', function(done) {
            hapiTest({
                    plugins: [plugin]
                })
                .get('/one')
                .assert('connection', 'keep', done);
        });
        it('should supply get response to end handler', function(done) {

            hapiTest({
                    plugins: [plugin]
                })
                .get('/one')
                .end(function(res) {
                    assert(res);
                    assert.equal(res.result, 1);
                    done();
                });

        });
    });

    describe('plugins', function() {
        it('should support multiple plugins', function(done) {
            var plugin1 = {
                register: function(plugin, options, next) {

                    plugin.route([{
                        method: 'GET',
                        path: '/one',
                        handler: function(request, reply) {
                            reply(1);
                        }
                    }]);

                    next();
                }
            };
            plugin1.register.attributes = {
                name: 'testPlugin1'
            };

            var plugin2 = {
                register: function(plugin, options, next) {

                    plugin.route([{
                        method: 'GET',
                        path: '/two',
                        handler: function(request, reply) {
                            reply(2);
                        }
                    }]);

                    next();
                }
            };

            plugin2.register.attributes = {
                name: 'testPlugin2'
            };

            hapiTest({
                    plugins: [plugin1, plugin2]
                })
                .get('/one')
                .assert(200)
                .get('/two')
                .assert(200, done);

        })
    });

    describe('construction with a server object', function() {

        var server;

        before(function(done) {

            server = new Hapi.Server();

            server.connection({
                port: 8888
            });

            var plugin = {
                register: function(plugin, options, next) {
                    plugin.route([{
                        method: '*',
                        path: '/',
                        handler: function(request, reply) {
                            reply(1);
                        }
                    }]);

                    next();
                }
            };

            plugin.register.attributes = {
                name: 'test'
            };

            server.register({
                name: 'plugin',
                version: '0.0.1',
                register: plugin.register
            }, done);
        })

        it('should support GET', function(done) {
            hapiTest({
                    server: server
                })
                .get('/')
                .assert(200, done);
        });

        it('should support POST', function(done) {
            hapiTest({
                    server: server
                })
                .post('/', {})
                .assert(200, done);
        });

        it('should support PUT', function(done) {
            hapiTest({
                    server: server
                })
                .put('/', {})
                .assert(200, done);
        });

        it('should support PATCH', function(done) {
            hapiTest({
                    server: server
                })
                .patch('/', {})
                .assert(200, done);
        });

        it('should support DELETE', function(done) {
            hapiTest({
                    server: server
                })
                .delete('/')
                .assert(200, done);
        })


    });

    it('should trigger queued requests', function(done) {
        var plugin = {
            register: function(plugin, options, next) {

                var persons = [];

                plugin.route([{
                    method: 'POST',
                    path: '/persons',
                    handler: function(request, reply) {
                        persons.push(request.payload);
                        reply(true);
                    }
                }, {
                    method: 'GET',
                    path: '/persons',
                    handler: function(request, reply) {
                        reply(persons);
                    }
                }]);

                next();
            }
        };

        plugin.register.attributes = {
            name: 'test'
        };


        var max = {
                name: 'Max',
                _id: 1
            },
            lui = {
                name: 'Lui',
                _id: 2
            };
        hapiTest({
                plugins: [plugin]
            })
            .post('/persons', max)
            .post('/persons', lui)
            .get('/persons')
            .end(function(res) {
                assert(res);
                assert.deepEqual([max, lui], res.result);
                done();
            });
    });

    describe('hapi-auth-cookie', function() {
        var plugin = {
            register: function(plugin, options, next) {

                plugin.route([{
                    method: 'GET',
                    path: '/user',
                    config: {
                        handler: function(request, reply) {

                            reply(request.auth.credentials);
                        },
                        auth: 'session'
                    }
                }]);

                next();
            }
        };

        plugin.register.attributes = {
            name: 'test'
        };

        //function to setup auth on the server
        var before = function(server) {
            server.register(require('hapi-auth-cookie'), function(err) {

                server.auth.strategy('session', 'cookie', {
                    password: 'secret',
                    cookie: 'session',
                    redirectTo: '/login',
                    isSecure: false
                });

            });
        };



        it('should bypass authentication with credentials given to auth', function(done) {

            var user = {
                name: 'max',
                age: 8
            };

            hapiTest({
                    plugins: [plugin],
                    before: before
                })
                .auth(user)
                .get('/user')
                .assert(200)
                .end(function(res) {
                    var authenticatedUser = JSON.parse(res.payload);

                    assert.equal(authenticatedUser.name, user.name);
                    assert.equal(authenticatedUser.age, user.age);

                    done();
                });

        });

    });
});
