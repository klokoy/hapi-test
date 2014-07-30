#hapi-test
Test hapi plugins with chaining method calls and assertions.

[![Build Status](https://travis-ci.org/klokoy/hapi-test.svg?branch=master)](https://travis-ci.org/klokoy/hapi-test)

#Assertions
###end(result)
Using the end method you can write your own assertions in anyway you want.
```javascript
//chai assertions
var hapi-test = require('hapi-test'),
    plugin = require('your-plugin'),
    assert = require('chai').assert;
    
hapiTest(plugin)
    .get('/persons')
    .end(function(result) {
        assert(result.statusCode === 200);
    });
```

###Status code
If you want to test status code you can simply assert the statusCode number

```javascript
hapiTest(plugin)
    .get('/persons')
    .assert(200)
```
    
###headers
To test a header value you can do an assert with header name as first parameter and header value as second. Works with strings.

```javascript
//string
hapiTest(plugin)
    .get('/person')
    .assert('connection', 'keep-alive');
```

###Async testing
If you are using mocha you can pass in the done function to any assertion as last parameter.

```javascript

it('should 200 on persons', function(done) {
    hapiTest(plugin)
        .get('/person')
        .assert(200, done)
});
```



