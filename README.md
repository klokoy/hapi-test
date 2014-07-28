#hapi-test
Test hapi plugins with a chaining method calls.

#Create an instance
´´´javascript
var HapiTest = require('hapi-test').HapiTest,
    plugin = require('your-plugin'; //needs to implement register(plugin, options, next);

new HapiTest(plugin)
    .then(function(hapiTest) {
        hapiTest
            .get('/')
            .assert(200, done)
        });
´´´
            