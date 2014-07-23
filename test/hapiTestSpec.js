var assert = require('chai').assert,
    HapiTest = require('../index.js').HapiTest;

describe('hapi-test', function () {

    describe('abc', function () {

        var plugin = {
            register: function (plugin, options, next) {

                plugin.route([
                    {
                        method: 'GET',
                        path: '/one',
                        handler: function (request, reply) {
                            reply(1);
                        }
                    }
                ]);

                next();
            }
        };

        it('assert a number should check the status code', function (done) {
            new HapiTest(plugin)
                .then(function (hapiTest) {

                    hapiTest
                        .get('/one')
                        .assert(200, done);
                });
        });

        it('should pass assertion errors to the end method', function (done) {
            new HapiTest(plugin)
                .then(function (hapiTest) {
                    hapiTest
                        .get('/one')
                        .assert(1000)
                        .end(function (result, errs) {
                            assert(errs);
                            assert.equal(errs[0], 'the status code is: 200 but should be: 1000');
                            done()
                        });
                });
        });

        it('should allow passing in an assertion function', function (done) {
            new HapiTest(plugin)
                .then(function (hapiTest) {
                    hapiTest
                        .get('/one')
                        .assert(function (res) {
                            return res.statusCode === 200;
                        }, done);
                });
        });

        it('should supply get response to end handler', function (done) {

            new HapiTest(plugin)
                .then(function (hapiTest) {

                    hapiTest
                        .get('/one')
                        .end(function (res) {
                            assert(res);
                            assert.equal(res.result, 1);
                            done();
                        });
                });

        });
    });


    it('should trigger queued requests', function (done) {
        var plugin = {
            register: function (plugin, options, next) {

                var persons = [];

                plugin.route([
                    {
                        method: 'POST',
                        path: '/persons',
                        handler: function (request, reply) {
                            persons.push(request.payload);
                            reply(true);
                        }
                    },
                    {
                        method: 'GET',
                        path: '/persons',
                        handler: function (request, reply) {
                            reply(persons);
                        }
                    }
                ]);

                next();
            }
        };


        new HapiTest(plugin)
            .then(function (hapiTest) {
                var max = {name: 'Max', _id: 1},
                    lui = {name: 'Lui', _id: 2};


                hapiTest
                    .post('/persons', max)
                    .post('/persons', lui)
                    .get('/persons')
                    .end(function (res) {
                        assert(res);
                        assert.deepEqual([max, lui], res.result);
                        done();
                    });
            });
    });

});
