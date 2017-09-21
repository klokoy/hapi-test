# hapi-test
Test hapi plugins with chaining method calls and assertions.

[![Build Status](https://travis-ci.org/klokoy/hapi-test.svg?branch=master)](https://travis-ci.org/klokoy/hapi-test)

### Assertions

Using the end method you can write your own assertions in anyway you want.

```javascript
//chai assertions
var hapiTest = require('hapi-test'),
    plugin = require('your-plugin'),
    assert = require('chai').assert;

hapiTest({ plugins: [ plugin ] })
    .get('/persons')
    .end(function (result) {
        assert(result.statusCode === 200);
    });
```

### Status code
If you want to test status code you can simply assert the statusCode number

```javascript
hapiTest({ plugins: [ plugin ] })
    .get('/persons')
    .assert(200)
```

### Headers
To test a header value you can do an assert with header name as first parameter and header value as second. Works with strings.

```javascript
//string
hapiTest({plugins: [ plugin ] })
    .get('/person')
    .assert('connection', 'keep-alive');
```

## Async testing
If you are using mocha you can pass in the done function to any assertion as last parameter.

```javascript

it('should 200 on persons', function(done) {
    hapiTest({ plugins: [ plugin ] })
        .get('/person')
        .assert(200, done)
});
```

Mocha also supports promises.

```javascript

it('should 200 on persons', function() {
    return hapiTest({ plugins: [ plugin ] })
        .get('/person')
        .assert(200)
});
```

## Keep instance of server to speed up tests
If you have multiple tests on the same server / plugins you can create an instance of the server and use this in the constructor. This will speed up the tests as it does not need to create a new server and initialize the plugins for each test.

```javascript
// example using mocha
var hapiTest = require('hapi-test'),
    Hapi = require('Hapi'),
    plugin = require('your-plugin'),
    assert = require('chai').assert;

var server;

before(function (done) {

    server = new Hapi.Server();
    server.connection({
        port: 8888
    })

    server.register({
        name: 'plugin',
        version: '0.0.1',
        register: plugin.register
    }, done);

});

it('can now be used', function (done) {
    hapiTest({ server: server })
        .get('/person')
        .assert(200, done);
});

```
