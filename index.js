/** 
 * UsageLocks (ulocks) module
 * @module ulocks
 * @author Daniel Schreckling
 * @copyright Daniel Schreckling 2017
 * @license MIT
 */

var w = require("winston");
w.level = process.env.LOG_LEVEL;

var Policy = require("./Policy.js");
var PolicySet = require("./PolicySet.js");
var Entity = require("./Entity.js");
var Flow = require("./Flow.js");
var Lock = require("./Lock.js");
var Action = require("./Action.js");
var Context = require("./Context");

var Promise=require("bluebird");

var initialized = false;

var init = function(settings) {
    return new Promise(function(resolve, reject) {
        
        if(initialized) {
            w.info("ULocks have already been initialized. Ignore.");
            resolve(false);
        }

        if(!settings)
            reject(new Error("Settings expected to initialize ULocks Framework"));
        
        var toInit = [];

        toInit.push(Flow.init(settings));
        toInit.push(Entity.init(settings));
        toInit.push(Lock.init(settings));
        toInit.push(Action.init(settings));

        Promise.all(toInit).then(function() {
            w.info("ULocks initialized successfully.");
            resolve(true);
        }, function(e) {
            w.error("ULocks initialization failed.");
            reject(e);
        });
    });
}

module.exports = {
    Action: Action,
    Context: Context,
    Entity: Entity,
    Flow: Flow,
    Lock: Lock,
    Policy: Policy,
    PolicySet: PolicySet,
    init: init
}
