#hapi-test
Test hapi plugins with a chaining method calls.

#Create an instance
´´´javascript
var hapiTest = require('hapi-test'),
    plugin = require('your-plugin'; //needs to implement register(plugin, options, next);

hapiTest(plugin)
    .get('/')
    .assert(200, done)
´´´
            