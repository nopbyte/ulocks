var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');

// chai.should();

chai.use(chaiAsPromised);

var ULocks = require("../index.js");
var Flow = require("../Flow.js");
var Lock = require("../Lock.js");
var Entity = require("../Entity.js");

var settings = require("./settings.js");

/*before(function(done) {
    ULocks.init(settings).then(
        function() {
            done();
        }, function(e) {
            console.log("Something went wrong during initialization of the ulocks policies. Cannot run tests.");
            console.log(e);
        }
    )});*/

describe("Flow class", function() {
    describe("constructor", function() {
        it("with undefined type", function() {
            var c = function() { var f = new Flow(); };
            expect(c).to.throw();
        });

        it("with invalid source", function() {
            var c = function() { new Flow({ source : { type: "xyz" } }) };
            expect(c).to.throw();
        });

        it("with valid source only", function() {
            var f = new Flow({ source : { type: "/any" } });
            expect(f.source.type).to.equal("/any");
            expect(f.target).to.be.undefined;
            expect(f.op).to.be.equal(Flow.OpTypes.Write);
        });

        it("with valid target only", function() {
            var f = new Flow({ target : { type: "/any" } });
            expect(f.target.type).to.equal("/any");
            expect(f.source).to.be.undefined;
            expect(f.op).to.be.equal(Flow.OpTypes.Read);
        });

        it("with a valid target and empty locks", function() {
            var f = new Flow({ target : { type: "/any" }, locks : [] });
            expect(f.target.type).to.equal("/any");
            expect(f.source).to.be.undefined;
            expect(f.locks).to.be.undefined;
            expect(f.op).to.be.equal(Flow.OpTypes.Read);
        });

        it("with a valid target and a single lock", function() {
            var f = new Flow({ target : { type: "/any" }, locks : { "inTimePeriod": [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] } ] } });
            var l = new Lock({ lock : "inTimePeriod", args : [ "10:00", "11:00" ] });
            expect(f.target.type).to.equal("/any");
            expect(f.source).to.be.undefined;
            /*expect(f.locks.length).to.be.a(1);
              expect(f.locks[0]).toEqual(l);*/
        });

        it("with a valid target and any two locks", function() {
            var f = new Flow({ target : { type: "/any" }, locks : { "inTimePeriod": [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] } ], "hasId": [ { lock : "hasId", args : [ "1", "2" ] } ] } });
            // TODO: check how to properly replace this call with constructor
            var l1 = Lock.createLock({ lock : "inTimePeriod", args : [ "10:00", "11:00" ] });
            var l2 = Lock.createLock({ lock : "hasId", args : [ "1", "2" ] });

            expect(f.target.type).to.equal("/any");
            expect(f.source).to.be.undefined;
            expect(Object.keys(f.locks).length).to.equal(2);
            expect(f.locks.inTimePeriod[0]).to.eql(l1);
            expect(f.locks.hasId[0]).to.eql(l2);
        });
    });

    describe("operation lub", function() {
        it("with identical targets and locks",function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });

            var newFlow = f1.lub(f2);
            var res = newFlow.eq(f2);

            expect(f2).to.eql(newFlow);
            expect(res).to.equal(true);
        });

        it("with identical targets and overlapping time locks",function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "18:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "16:00", "20:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
            var lub_f1_f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "16:00", "18:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var copy = new Flow(f1);

            var newFlow1 = f1.lub(f2);
            var newFlow2 = f2.lub(copy);

            var res1 = newFlow1.eq(lub_f1_f2);
            var res2 = newFlow2.eq(lub_f1_f2);

            expect(res1).to.equal(true);
            expect(newFlow1).to.eql(lub_f1_f2);
            expect(res2).to.equal(true);
            expect(newFlow2).to.eql(lub_f1_f2);
        });

        it("with identical targets, overlapping time locks and one less restrictive flow",function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "18:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "16:00", "20:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
            var lub_f1_f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "16:00", "18:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var copy = new Flow(f1);

            var newFlow1 = f1.lub(f2);
            var newFlow2 = f2.lub(copy);
            var res1 = newFlow1.eq(lub_f1_f2);
            var res2 = newFlow2.eq(lub_f1_f2);

            expect(res1).to.equal(true);
            expect(newFlow1).to.eql(lub_f1_f2);
            expect(res2).to.equal(true);
            expect(newFlow2).to.eql(lub_f1_f2);
        });
    });

    describe("comparison eq", function() {
        it("with equal flows", function() {
            var f = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var r = f.eq(f);

            expect(r).to.equal(true);
            expect(JSON.stringify(f) === JSON.stringify(f)).to.equal(true);
        });

        it("with flows with source and target entities", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ source : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var r = f1.eq(f2);

            expect(r).to.equal(false);
        });

        it("with flows with different target/source entities", function() {
            var f1 = new Flow({ target : { type: "/client" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var f3 = new Flow({ source : { type: "/client" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var f4 = new Flow({ source : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.eq(f2);
            var r2 = f3.eq(f4);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        it("with flows with equal target entities but different locks", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "3" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var r = f1.eq(f2);

            expect(r).to.equal(false);
        });

        it("with flows with equal target entities but different number of locks", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }]});
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { lock : "inTimePeriod", args : [ "10:00", "11:00" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var r1 = f1.eq(f2);
            var r2 = f2.eq(f1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        it("with flows with equal locks but in different order", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:15", "10:45" ] }, { path : "inTimePeriod", args : [ "13:15", "18:45" ] }, { lock : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { lock : "hasId", args : [ "1", "2" ] }, { path : "inTimePeriod", args : [ "13:15", "18:45" ] }, { path : "inTimePeriod", args : [ "10:15", "10:45" ] } ] });

            var r1 = f1.eq(f2);
            var r2 = f2.eq(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(true);
        });
    });

    describe("comparison le", function() {
        it("with equal flows", function() {
            var f = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "20" ] } ] });
            var r = f.le(f);

            expect(r).to.equal(true);
        });

        it("with one flow with time interval starting earlier", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "09:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with one flow with wrapping time interval", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "09:00", "07:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with one flow with negated time interval and one regular time interval contained in 'left' side of negated interval", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "11:15", "12:15"], not: true } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:10", "11:10" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with this flow containing negated time interval and one regular time interval contained in 'right' side of negated interval", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "11:15", "12:15"], not: true } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "12:30", "13:10" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with other flow containing negated time interval and one regular time interval contained in 'right' side of negated interval", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "13:00"] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "12:30", "11:00"], not: true } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with flows with non-overlapping time intervals", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "11:00", "12:00"] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        it("with le and one flow with time interval ending later", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "15:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with le and one flow with time interval starting later and ending later", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:30", "15:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        it("with le and one flow with time interval starting earlier and ending earlier", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "09:00", "10:30" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        it("with le and one flow with time interval overlapping time interval and no userLock", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "09:00", "12:30" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });


        it("with le and one flow with equal time interval and no userLock", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with le and one flow with equal time interval and no userLock", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:15", "10:45" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        // This example is erroneous as it already contains not fulfillable conditions
        it("with le and one flow with two identical users", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "hasId", args : [ "1", "2" ] }, { path : "hasId", args : [ "3", "4" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "hasId", args : [ "1", "2" ] }, { path : "hasId", args : [ "3", "4" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(true);
        });

        it("with flows where there is exactly one pair of locks which are less or equal", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "08:00", "12:00" ] }, { path : "inTimePeriod", args : [ "15:00", "20:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "09:00", "11:00" ] }, { path : "inTimePeriod", args : [ "18:00", "19:00" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with flows where one of the time locks is not smaller than one of the other", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "08:00", "12:00" ] }, { path : "inTimePeriod", args : [ "15:00", "20:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "09:00", "11:00" ] }, { path : "inTimePeriod", args : [ "14:00", "19:00" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        it("with flows where one of the time locks is not smaller than one of the other (different order 1)", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "15:00", "20:00" ] }, { path : "inTimePeriod", args : [ "08:00", "12:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "14:00", "19:00" ] }, { path : "inTimePeriod", args : [ "09:00", "11:00" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        it("with flows where one time lock covers all other locks in the other flow", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "08:00", "20:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "14:00", "19:00" ] }, { path : "inTimePeriod", args : [ "09:00", "11:00" ] }, { path : "inTimePeriod", args : [ "12:00", "13:00" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("with flows where one time lock does not cover all other locks in the other flow", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "08:00", "20:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "14:00", "21:00" ] }, { path : "inTimePeriod", args : [ "09:00", "11:00" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        it("with flows where several time locks are covered by one (similar as before just vice versa", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "08:00", "20:00" ] }, { path : "inTimePeriod", args : [ "10:00", "19:00" ] }, { path : "inTimePeriod", args : [ "12:00", "16:00" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "inTimePeriod", args : [ "14:00", "15:00" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        // Note: the policy f2 should not exist a priori as a user will only have one single ID
        it("with le and one flow with different number of users", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "hasId", args : [ "3", "4" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "hasId", args : [ "1", "2" ] }, { path : "hasId", args : [ "3", "4" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(false);
        });

        // Note: the policy f2 should not exist a priori as a user will only have one single ID
        it("with le and one flow with different number of users", function() {
            var f1 = new Flow({ target : { type: "/any" }, locks : [ { path : "hasId", args : [ "1", "2" ] }, { path : "hasId", args : [ "3", "4" ] } ] });
            var f2 = new Flow({ target : { type: "/any" }, locks : [ { path : "hasId", args : [ "1", "2" ] }, { path : "hasId", args : [ "3", "4" ] } ] });

            var r1 = f1.le(f2);
            var r2 = f2.le(f1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(true);
        });
    });

    describe("getClosedLocks", function() {
        it("with one flow with only one time lock which is open at execution time", function() {
            var currentDate = new Date();
            var hours = currentDate.getHours();
            var dummyContext = { isStatic: false };

            var f = new Flow({ target: { type: "/any" }, locks: [ { lock: "inTimePeriod", args: [ (hours-1)+":00", (hours+1)+":00" ] } ] } );

            return expect(new Promise(function(resolve, reject) {
                f.getClosedLocks(dummyContext).then(function(r) {
                    resolve(r.open);
                }, function(e) {
                    reject(e);
                });
            })).to.eventually.equal(true);
        });

        it("with one flow with only one time lock which is not open at execution time", function() {
            var currentDate = new Date();
            var hours = currentDate.getHours();
            var dummyContext = { isStatic: false };

            var f = new Flow({ target: { type: "/any" }, locks: [ { lock: "inTimePeriod", args: [ (hours-2)+":00", (hours-1)+":00" ] } ] } );

            return expect(new Promise(function(resolve, reject) {
                f.getClosedLocks(dummyContext).then(function(r) {
                    resolve(r.open);
                }, function(e) {
                    reject(e)
                });
            })).to.eventually.equal(false);
        });
    });

    describe("applying flow actions", function() {
        it("ignore dummy data", function() {
            var f = new Flow({ target: { type: "/any" }, locks: [ { lock: "inTimePeriod", args: [ "10:00", "11:00" ] } ], actions: [ { action: "ignore" } ] } );
            var dummyContext = { isStatic: false };
            var data = "This is dummy data.";

            return expect(f.actOn(data)).to.eventually.equal(data);
        });

        it("delete dummy data", function() {
            var f = new Flow({ target: { type: "/any" }, locks: [ { lock: "inTimePeriod", args: [ "10:00", "11:00" ] } ], actions: [ { action: "delete" } ] } );
            var dummyContext = { isStatic: false };
            var data = "This is dummy data.";

            return expect(f.actOn(data)).to.eventually.equal(null);
        });

        // Note: not a good test! Try to compute randomness of string?
        it("randomize dummy data", function() {
            var f = new Flow({ target: { type: "/any" }, locks: [ { lock: "inTimePeriod", args: [ "10:00", "11:00" ] } ], actions: [ { action: "randomize" } ] } );
            var dummyContext = { isStatic: false };
            var data = "This is dummy data.";

            return expect(f.actOn(data)).to.eventually.not.equal(data);
        });

        it("replace dummy data", function() {
            var f = new Flow({ target: { type: "/any" }, locks: [ { lock: "inTimePeriod", args: [ "10:00", "11:00" ] } ], actions: [ { action: "replace", args: [ "fixed", "TEXT" ] } ] } );
            var dummyContext = { isStatic: false };
            var data = "This is dummy data.";

            return expect(f.actOn(data)).to.eventually.equal("TEXT");
        });
    });
});
