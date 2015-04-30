var assert = require('chai').assert,
    hapiTest = require('../index.js'),
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
            hapiTest(plugin)
                .get('/')
                .assert(200, done);

        });

        it('should support POST', function(done) {
            hapiTest(plugin)
                .post('/', {})
                .assert(200, done);
        });

        it('should support PUT', function(done) {
            hapiTest(plugin)
                .put('/', {})
                .assert(200, done);
        });

        it('should support PATCH', function(done) {
            hapiTest(plugin)
                .patch('/', {})
                .assert(200, done);
        });

        it('should support DELETE', function(done) {
            hapiTest(plugin)
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
            hapiTest(plugin)
                .get('/one')
                .assert(200, done);
        });

        it('should pass assertion errors to the end method', function(done) {
            hapiTest(plugin)
                .get('/one')
                .assert(1000)
                .end(function(result, errs) {
                    assert(errs);
                    assert.equal(errs[0], 'the status code is: 200 but should be: 1000');
                    done()
                });
        });

        it('should allow passing in an assertion function', function(done) {
            hapiTest(plugin)
                .get('/one')
                .assert(function(res) {
                    return res.statusCode === 200;
                }, done);
        });

        it('if called with 2 strings: match headers[string1] with string2 ', function(done) {
            hapiTest(plugin)
                .get('/one')
                .assert('connection', 'keep-alive', done);
        });

        it('convert string to regex when called with 2 strings', function(done) {
            hapiTest(plugin)
                .get('/one')
                .assert('connection', 'keep', done);
        });
        it('should supply get response to end handler', function(done) {

            hapiTest(plugin)
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

            hapiTest([plugin1, plugin2])
                .get('/one')
                .assert(200)
                .get('/two')
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
        hapiTest(plugin)
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
                    path: '/',
                    config: {
                        handler: function(request, reply) {
                            reply(1);
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

                server.route([{
                    method: 'POST',
                    path: '/login',
                    config: {
                        handler: function(request, reply) {

                            var user = {
                                id: 1,
                                name: 'max',
                                password: 'max'
                            };

                            if (request.payload.username !== 'max' || request.payload.password !== 'max') {
                                return reply(Boom.unauthorized('wrong credentials'));
                            }

                            request.auth.session.set(user);
                            return reply.redirect('/')
                        },
                        auth: {
                            mode: 'try',
                            strategy: 'session'
                        },
                        plugins: {
                            'hapi-auth-cookie': {
                                redirectTo: false
                            }
                        }
                    }
                }]);
            });
        };


        it('should support hapi-auth-cookie', function(done) {

            hapiTest(plugin, {
                    before: before
                })
                .auth('/login', 'max', 'max')
                .get('/')
                .end(function(res) {
                    assert.equal(res.payload, 1);
                    done();
                });

        });

        it('should redirect "302" with wrong credentials', function(done) {

            hapiTest(plugin, {
                    before: before
                })
                .auth('/login', 'max', 'p')
                .get('/')
                .assert(302)
                .end(function(res) {
                    assert.match(res.headers.location, /login/);
                    done();
                });

        });

    });
});
