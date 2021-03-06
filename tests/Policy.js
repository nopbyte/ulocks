var clone = require('clone');
var chai = require('chai');
var expect = chai.expect;
var chaiAsPromised = require('chai-as-promised');

chai.use(chaiAsPromised);

var Promise = require('bluebird');

var ULocks = require("../index.js");
var Policy = ULocks.Policy;
var Flow = ULocks.Flow;
var Lock = require("../Lock.js");
var Entity = require("../Entity.js");
var Context = require("../Context.js");
var settings = require("./settings.js");

function lz(h) {
    if(h < 10)
        return "0" + h;
    else
        return "" + h;
}

describe("Policy class must handle", function() {

    beforeEach(function() {
        this.f1 = new Flow({ op: "read", locks : [ { path : "inTimePeriod", args : [ "10:00", "11:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
        this.f2 = new Flow({ op: "read", locks : [ { path : "inTimePeriod", args : [ "09:00", "15:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });
        this.glb_f1_f2 = new Flow({ op: "read", locks : [ { path : "inTimePeriod", args : [ "09:00", "15:00" ] }, { path : "hasId", args : [ "1", "2" ] } ] });

        this.lock_inTime_10_11 = { path : "inTimePeriod", args : [ "10:00", "11:00" ] };
        this.lock_inTime_08_18 = { path : "inTimePeriod", args : [ "08:00", "18:00" ] };
        this.lock_inTime_15_20 = { path : "inTimePeriod", args : [ "15:00", "20:00" ] };
        this.lock_inTime_13_16 = { path : "inTimePeriod", args : [ "13:00", "16:00" ] };
        this.lock_inTime_12_14 = { path : "inTimePeriod", args : [ "12:00", "14:00" ] };
        this.lock_inTime_13_14 = { path : "inTimePeriod", args : [ "13:00", "14:00" ] };

        this.f_fromany = new Flow({ op: "write" } );
        this.f_toany = new Flow({ op: "read" } );

        this.f_toapp1_in1 = new Flow({ op: "read", locks: [
            {lock: "hasType", args: [ "/client" ] },
            {lock: "hasId", args: [ "1in1" ] } ] } );
        this.f_toapp1_in2 = new Flow({ op: "read", locks: [
            {lock: "hasType", args: [ "/client" ] },
            {lock: "hasId", args: [ "1in2" ] } ] } );
        this.f_fromapp1_out1 = new Flow({ op: "write", locks: [
            {lock: "hasType", args: [ "/client" ] },
            {lock: "hasId", args: [ "1out1" ] } ] });
        this.f_fromapp1_out2 = new Flow({ op: "write", locks: [
            {lock: "hasType", args: [ "/client" ] },
            {lock: "hasId", args: [ "1out2" ] } ] } );

        // TODO: rewrite flows and use hasID and some new hasType lock
        this.f_touser1 = new Flow({ op: "read", locks: [ {lock: "hasType", args: [ "/user" ] },
                                                         {lock: "hasId", args: [ "1" ] } ] });
        this.f_fromuser1 = new Flow({ op: "write", locks: [ {lock: "hasType", args: [ "/user" ] },
                                                          {lock: "hasId", args: [ "1" ] } ] });
        this.f_touser2 = new Flow({ op: "read", locks: [ {lock: "hasType", args: [ "/user" ] },
                                                         {lock: "hasId", args: [ "2" ] } ] });
        this.f_fromuser2 = new Flow({ op: "write", locks: [ {lock: "hasType", args: [ "/user" ] },
                                                          {lock: "hasId", args: [ "2" ] } ] });

        this.f_touser1_inTime_10_11 = new Flow({ op: "read", locks : [
            this.lock_inTime_10_11,
            {lock: "hasType", args: [ "/user" ] },
            {lock: "hasId", args: [ "1" ] }] });
        this.f_touser1_inTime_08_18 = new Flow({ op: "read", locks : [
            this.lock_inTime_08_18,
            {lock: "hasType", args: [ "/user" ] },
            {lock: "hasId", args: [ "1" ] }] });
        this.f_touser1_inTime_15_20 = new Flow({ op: "read", locks : [
            this.lock_inTime_15_20,
            {lock: "hasType", args: [ "/user" ] },
            {lock: "hasId", args: [ "1" ] } ] });
        this.f_fromuser1_inTime_10_11 = new Flow({ op: "write", locks : [
            this.lock_inTime_10_11,
            {lock: "hasType", args: [ "/user" ] },
            {lock: "hasId", args: [ "1" ] } ] });
        this.f_fromuser1_inTime_08_18 = new Flow({ op: "write", locks : [
            this.lock_inTime_08_18,
            {lock: "hasType", args: [ "/user" ] },
            {lock: "hasId", args: [ "1" ] } ] });
        this.f_fromuser1_inTime_15_20 = new Flow({ op: "write", locks : [
            this.lock_inTime_15_20,
            {lock: "hasType", args: [ "/user" ] },
            {lock: "hasId", args: [ "1" ] } ] });
        this.f_toany_inTime_13_16 = new Flow({ op: "read", locks : [
            this.lock_inTime_13_16,
            {lock: "hasType", args: [ "/any" ] } ] });
        this.f_toany_inTime_12_14 = new Flow({ op: "read", locks : [
            this.lock_inTime_12_14,
            {lock: "hasType", args: [ "/any" ] } ] });
        this.f_toany_inTime_13_14 = new Flow({ op: "read", locks : [
            this.lock_inTime_13_14,
            {lock: "hasType", args: [ "/any" ] } ] });

        this.f_touser2_inTime_10_11 = new Flow({ op: "read", locks : [
            this.lock_inTime_10_11,
            {lock: "hasType", args: [ "/user" ] },
            {lock: "hasId", args: [ "2" ] }] });
        this.f_fromuser2_inTime_10_11 = new Flow({ op: "write", locks : [
            this.lock_inTime_10_11,
            {lock: "hasType", args: [ "/user" ] },
            {lock: "hasId", args: [ "2" ] }] });

        this.e_any = new Entity({ type : "/any" });
        this.e_app1_in1 = new Entity({ type : "/client", id : "1in1" });
        this.e_app1_in2 = new Entity({ type : "/client", id : "1in2" });
        this.e_app1_out1 = new Entity({ type : "/client", id : "1out1" });
        this.e_app1_out2 = new Entity({ type : "/client", id : "1out2" });

        this.anyone = new Entity();
        this.user1 = new Entity({type : "/user", id : "1" });
        this.user2 = new Entity({type : "/user", id : "2" });
        this.anyuser = new Entity({type : "/user" });
        this.app1 = new Entity({type : "/client", id : "1" });
        this.anyapp = new Entity({type : "/client" });
        this.so1 = new Entity({type : "/sensor", id : "1" });
        this.anyso = new Entity({type : "/sensor" });
    });

    describe("bottom element", function() {
        it("must be smaller than any other policy", function() {
            var bot = Policy.bot();
            var p1 = new Policy([this.f1]);
            var p2 = new Policy([this.f1], this.e_app1_in1);

            var r0 = bot.le(bot);
            var r11 = bot.le(p1);
            var r12 = p1.le(bot);
            var r21 = bot.le(p2);
            var r22 = p2.le(bot);

            expect(r0).to.equal(true);

            expect(r11).to.equal(true);
            expect(r12).to.equal(false);

            expect(r21).to.equal(true);
            expect(r22).to.equal(false);
        });

        it("must not change lub of any policy", function() {
            var bot = Policy.bot();
            var p1 = new Policy([this.f1]);
            var p2 = new Policy([this.f1], this.e_app1_in1);
            var p3 = new Policy([this.f1, this.f2], this.e_app1_in1);

            var bot2 = new Policy(bot);
            var newPol = bot.lub(bot2);
            var res = newPol.eq(bot);
            expect(res).to.equal(true);

            bot = Policy.bot();
            var p1_copy = new Policy(p1);

            var newPol = bot.lub(p1);
            var res = newPol.eq(p1, true);
            expect(res).to.equal(true);

            // bot is rewritten while lub is computed ... not good ... rewrite lub
            bot = Policy.bot();
            var newPol = bot.lub(p3);
            var res = newPol.eq(p3);
            expect(res).to.equal(true);
        });

        it("must not change lub of any policy", function() {
            var bot = Policy.bot();

            var newPol = bot.lub(bot);
            var res = newPol.eq(bot);

            expect(res).to.equal(true);
        });
    });

    describe("top element", function() {
        it("must be greater than any other policy", function() {
            var bot = Policy.bot();
            var top = Policy.top();
            var p1 = new Policy([this.f1]);
            var p2 = new Policy([this.f1], this.e_app1_in1);
            var p3 = new Policy([this.f1, this.f2], this.e_app1_in1);

            var res1 = top.le(top);
            expect(res1).to.equal(true);

            var res21 = bot.le(top);
            var res22 = top.le(bot);
            expect(res21).to.equal(true);
            expect(res22).to.equal(false);

            var res31 = p1.le(top);
            var res32 = top.le(p1);
            expect(res31).to.equal(true);
            expect(res32).to.equal(false);

            var res41 = p2.le(top);
            var res42 = top.le(p2);
            expect(res41).to.equal(true);
            expect(res42).to.equal(false);

            var res51 = p3.le(top);
            var res52 = top.le(p3);
            expect(res51).to.equal(true);
            expect(res52).to.equal(false);
        });

        it("reduces lub to the top element itself", function() {
            var bot = Policy.bot();
            var top = Policy.top();
            var p1 = new Policy([this.f1]);
            var p2 = new Policy([this.f1], this.e_app1_in1);
            var p3 = new Policy([this.f1, this.f2], this.e_app1_in1);

            var pol1 = bot.lub(top);
            var res1 = pol1.eq(top);
            expect(res1).to.equal(true);

            var pol2 = top.lub(top);
            var res2 = pol2.eq(top);
            expect(res2).to.equal(true);

            var pol3 = top.lub(bot);
            var res3 = pol3.eq(top);
            expect(res3).to.equal(true);

            var pol4 = p1.lub(top);
            var res4 = pol4.eq(top);
            expect(res4).to.equal(true);

            var pol5 = p2.lub(top);
            var res5 = pol5.eq(top);
            expect(res5).to.equal(true);

            var pol6 = p3.lub(top);
            var res6 = pol6.eq(top);
            expect(res6).to.equal(true);
        });

        it("reduces glb to the other element", function() {
            var bot = Policy.bot();
            var top = Policy.top();
            var p1 = new Policy([this.f1]);
            var p2 = new Policy([this.f1], this.e_app1_in1);
            var p3 = new Policy([this.f1, this.f2], this.e_app1_in1);

            var pol1 = bot.glb(top);
            var res1 = pol1.eq(bot);
            expect(res1).to.equal(true);

            var pol2 = top.lub(top);
            var res2 = pol2.eq(top);
            expect(res2).to.equal(true);

            var pol3 = top.lub(bot);
            var res3 = pol3.eq(top);
            expect(res3).to.equal(true);

            var pol4 = p1.lub(top);
            var res4 = pol4.eq(top);
            expect(res4).to.equal(true);

            var pol5 = p2.lub(top);
            var res5 = pol5.eq(top);
            expect(res5).to.equal(true);

            var pol6 = p3.lub(top);
            var res6 = pol6.eq(top);
            expect(res6).to.equal(true);
        });
    });

    describe("constructor", function() {
        it("with undefined flow and undefined entity", function() {
            var c = function() { new Policy(); };

            expect(c).to.throw();
        });

        it("with defined flow array and undefined entity (data policy)", function() {
            var p;
            var c = function() {
                var f = new Flow({ op: "read", locks : [] });
                p = new Policy([f]);
            };
            expect(c).to.not.throw();
            expect(p.isDataPolicy()).to.equal(true);
            expect(p.entity).to.equal(undefined);
        });

        it("with defined flow array and defined entity", function() {
            var p;
            var e = new Entity();

            var c = function() {
                var f = new Flow({ op: "read", locks : [] });
                p = new Policy([f], e);
            };

            expect(c).to.not.throw();
            var cmp = e.eq(p.entity);
            expect(cmp).to.equal(true)
        });

        it("with a regular entity policy", function() {
            var e = new Entity();
            var f = new Flow({ op: "read", locks : [] });
            var p = new Policy([f], e);
            var p2;

            var c = function() {
                p2 = new Policy(p);
            };

            expect(c).to.not.throw();

            var cmp = p2.entity.eq(p.entity);
            expect(cmp).to.equal(true)
        });

        it("with a regular data policy", function() {
            var f = new Flow({ op: "read", locks : [] });
            var p = new Policy([f]);
            var p2;

            var c = function() {
                p2 = new Policy(p);
            };

            expect(c).to.not.throw();
            expect(p.isDataPolicy()).to.equal(true);
            expect(p2.entity).to.equal(undefined)
        });

        it("with several flows", function() {
            var f = new Flow({ op: "read", locks : [] });
            var p = new Policy([f, f, f, f, f]);
            var p2;

            var c = function() {
                p2 = new Policy(p);
            };

            expect(c).to.not.throw();
            expect(p2.flows.length).to.equal(p.flows.length);
            expect(p2.entity).to.equal(undefined);
        });

        it("with filtering identical incoming and outgoing flows", function() {
            var inF = new Flow({ op: "write", locks : [] });
            var outF = new Flow({ op: "read", locks : [] });
            var p = new Policy([inF, inF, outF, outF, outF]);
            var p2 = new Policy(p);

            var incoming = [];
            var allFlows = p2.getFlows();
            for(var f in allFlows)
                if(allFlows[f].hasSrc())
                    incoming.push(allFlows[f]);
            var outgoing = [];
            for(var f in allFlows)
                if(allFlows[f].hasTrg())
                    outgoing.push(allFlows[f]);

            expect(incoming.length).to.equal(1);
            expect(outgoing.length).to.equal(1);
            expect(p2.entity).to.equal(undefined);
        });

        it("with different incoming and outgoing flows", function() {
            var inF1 = new Flow({ op: "write", locks : [this.lock_inTime_10_11] });
            var inF2 = new Flow({ op: "write", locks : [this.lock_inTime_12_14] });
            var outF1 = new Flow({ op: "read", locks : [this.lock_inTime_15_20] });
            var outF2 = new Flow({ op: "read", locks : [this.lock_inTime_10_11] });
            var outF3 = new Flow({ op: "read", locks : [this.lock_inTime_12_14] });
            var p = new Policy([inF1, inF2, outF1, outF2, outF3]);
            var p2 = new Policy(p);

            var incoming = [];
            var allFlows = p2.getFlows();
            for(var f in allFlows)
                if(allFlows[f].hasSrc())
                    incoming.push(allFlows[f]);
            var outgoing = [];
            for(var f in allFlows)
                if(allFlows[f].hasTrg())
                    outgoing.push(allFlows[f]);

            expect(incoming.length).to.equal(2);
            expect(outgoing.length).to.equal(3);
            expect(p2.entity).to.equal(undefined);
        });
    });

    describe("operation lub with", function() {
        it("two policies with any target and overlapping time constraints", function() {
            var pol1 = new Policy([this.f_toany_inTime_13_16], new Entity());
            var pol2 = new Policy([this.f_toany_inTime_12_14], new Entity());
            var pol3 = new Policy([this.f_toany_inTime_13_14], new Entity());

            var polr = pol1.lub(pol2);

            expect(polr.eq(pol3)).to.equal(true);
        });

        /*        it("two policies with any target and overlapping hasAttributeLt locks", function() {
                  var l1 = Lock.createLock({ path : "hasAttributeLt", args: [ "attrName", "group", 4 ] });
                  var l2 = Lock.createLock({ path : "hasAttributeLt", args: [ "attrName", "group", 6 ] });

                  var f1 = new Flow({ source : { type : '/any' }, locks: [ l1 ] });
                  var f2 = new Flow({ source : { type : '/any' }, locks: [ l2 ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1).toEqual(pol1);
                  expect(polr2).toEqual(pol1);
                  });

                  it("two policies with any target and overlapping hasAttributeLt and hasAttributeGt locks", function() {
                  var l1 = Lock.createLock({ path : "hasAttributeGt", args: [ "attrName", "group", 4 ] });
                  var l2 = Lock.createLock({ path : "hasAttributeLt", args: [ "attrName", "group", 6 ] });

                  var f1 = new Flow({ source : { type : 'any' }, locks: [ l1 ] });
                  var f2 = new Flow({ source : { type : 'any' }, locks: [ l2 ] });
                  var fr = new Flow({ source : { type : 'any' }, locks: [ l2, l1 ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);
                  var polr = new Policy([fr]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1.eq(polr)).to.equal(true);
                  expect(polr2.eq(polr)).to.equal(true);
                  });

                  it("two policies with any target and non-overlapping hasAttributeLt and hasAttributeGt locks", function() {
                  var l1 = Lock.createLock({ path : "hasAttributeLt", args: [ "attrName", "group", 4 ] });
                  var l2 = Lock.createLock({ path : "hasAttributeGt", args: [ "attrName", "group", 6 ] });

                  var f1 = new Flow({ source : { type : 'any' }, locks: [ l1 ] });
                  var f2 = new Flow({ source : { type : 'any' }, locks: [ l2 ] });
                  var fr = new Flow({ source : { type : 'any' }, locks: [ Lock.closedLock() ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);
                  var polr = new Policy([fr]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1).toEqual(polr);
                  expect(polr2).toEqual(polr);
                  });

                  it("two policies with any target and overlapping hasAttributeLt and hasAttributeEq locks", function() {
                  var l1 = Lock.createLock({ path : "hasAttributeEq", args: [ "attrName", "group", 4 ] });
                  var l2 = Lock.createLock({ path : "hasAttributeLt", args: [ "attrName", "group", 6 ] });

                  var f1 = new Flow({ source : { type : 'any' }, locks: [ l1 ] });
                  var f2 = new Flow({ source : { type : 'any' }, locks: [ l2 ] });
                  var fr = new Flow({ source : { type : 'any' }, locks: [ l1 ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);
                  var polr = new Policy([fr]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1).toEqual(polr);
                  expect(polr2).toEqual(polr);
                  });

                  it("two policies with any target and non-overlapping hasAttributeLt and hasAttributeEq locks", function() {
                  var l1 = Lock.createLock({ path : "hasAttributeEq", args: [ "attrName", "group", 4 ] });
                  var l2 = Lock.createLock({ path : "hasAttributeLt", args: [ "attrName", "group", 3 ] });

                  var f1 = new Flow({ source : { type : 'any' }, locks: [ l1 ] });
                  var f2 = new Flow({ source : { type : 'any' }, locks: [ l2 ] });
                  var fr = new Flow({ source : { type : 'any' }, locks: [ Lock.closedLock() ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);
                  var polr = new Policy([fr]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1).toEqual(polr);
                  expect(polr2).toEqual(polr);
                  });

                  it("two policies with any target and non-overlapping two hasAttributeEq locks", function() {
                  var l1 = Lock.createLock({ path : "hasAttributeEq", args: [ "attrName", "group", 4 ] });
                  var l2 = Lock.createLock({ path : "hasAttributeEq", args: [ "attrName", "group", 5 ] });

                  var f1 = new Flow({ source : { type : 'any' }, locks: [ l1 ] });
                  var f2 = new Flow({ source : { type : 'any' }, locks: [ l2 ] });
                  var fr = new Flow({ source : { type : 'any' }, locks: [ Lock.closedLock() ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);
                  var polr = new Policy([fr]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1).toEqual(polr);
                  expect(polr2).toEqual(polr);
                  });

                  it("two policies with any target and two attribute Locks with different names", function() {
                  var l1 = Lock.createLock({ path : "hasAttribute", args: [ "attrName1", "group" ] });
                  var l2 = Lock.createLock({ path : "hasAttribute", args: [ "attrName2", "group" ] });

                  var f1 = new Flow({ source : { type : 'any' }, locks: [ l1 ] });
                  var f2 = new Flow({ source : { type : 'any' }, locks: [ l2 ] });
                  var fr = new Flow({ source : { type : 'any' }, locks: [ l1, l2 ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);
                  var polr = new Policy([fr]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1.eq(polr)).to.equal(true);
                  expect(polr2.eq(polr)).to.equal(true);
                  });

                  it("two policies with any target and overlapping hasReputationLt locks", function() {
                  var f1 = new Flow({ source : { type : 'any' }, locks: [ this.lock_repLt_5 ] });
                  var f2 = new Flow({ source : { type : 'any' }, locks: [ this.lock_repLt_8 ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1).toEqual(pol1);
                  expect(polr2).toEqual(pol1);
                  });

                  it("two policies with any target and two mutually exclusive reputation locks", function() {
                  var f1 = new Flow({ source : { type : 'any' }, locks: [ this.lock_repLt_5 ] });
                  var f2 = new Flow({ source : { type : 'any' }, locks: [ this.lock_repGt_8 ] });

                  var pol1 = new Policy([f1]);
                  var pol2 = new Policy([f2]);
                  var polr = new Policy([{ source : { type : 'any' }, locks : [ { path : 'closed' } ] }]);

                  var polr1 = pol1.lub(pol2);
                  var polr2 = pol2.lub(pol1);

                  expect(polr1).toEqual(polr);
                  expect(polr2).toEqual(polr);
                  });*/

        it("two policies with any target and overlapping time constraints constructed from parsed string", function() {
            var pol1 = new Policy([this.f_toany_inTime_13_16], new Entity());
            var pol2 = new Policy([this.f_toany_inTime_12_14], new Entity());

            var polr = pol1.lub(JSON.parse(JSON.stringify(pol2)));
        });

        it("two bot policies", function() {
            var bot1 = Policy.bot();
            var bot2 = Policy.bot();

            var b = bot1.lub(bot2);
            var res = b.eq(bot1);

            expect(res).to.equal(true);
        });

        it("one bot policy and one policy which only allows target flows", function() {
            var bot = Policy.bot();
            var trg = new Policy([ { op: "read" } ], { type : '/any' });

            var newPol1 = bot.lub(trg);
            var res1 = newPol1.eq(trg);

            var newPol2 = trg.lub(bot);
            var res2 = newPol2.eq(trg);

            expect(res1).to.equal(true);
            expect(res2).to.equal(true);
        });

        it("bot policy and policy with two target flows with time constraints", function() {
            var p1 = new Policy([this.f_touser1_inTime_08_18, this.f_touser1_inTime_15_20], this.e_any);
            var bot = Policy.bot();

            var newPol = p1.lub(bot);
            var r1 = newPol.eq(p1);

            expect(r1).to.equal(true);
        });

        it("bot policy and policy with two source flows with time constraints", function() {
            var p1 = new Policy([this.f_fromuser1_inTime_08_18, this.f_fromuser1_inTime_15_20], this.e_any);
            var bot = Policy.bot();

            var newPol = p1.lub(bot);
            var r1 = newPol.eq(p1);

            expect(r1).to.equal(true);
        });
    });

    describe("operation glb", function() {
        it("with two identical policies", function() {
            var p1 = new Policy([this.f1], this.e_app1_in1);
            var p2 = new Policy([this.f1], this.e_app1_in1);

            var pol1 = p1.glb(p2);
            var r1 = pol1.eq(p2);

            expect(r1).to.equal(true);
        });

        it("with two policies on same entity with slightly different flows", function() {
            var p1 = new Policy([this.f1], this.e_app1_in1);
            var p2 = new Policy([this.f2], this.e_app1_in1);
            var p3 = new Policy([this.f1, this.f2], this.e_app1_in1);
            // TODO: should also be equal to glb_f1_f2

            var pol1 = p1.glb(p2);
            var r1 = pol1.eq(p3);

            expect(r1).to.equal(true);
        });

        it("with two policies on different entities", function() {
            var p1 = new Policy([this.f1], this.e_app1_in2);
            var p2 = new Policy([this.f2], this.e_app1_in1);

            var newPolA = p1.glb(p2);
            var polA = [ p1, p2 ];
            var res = true;
            for(var p in newPolA) {
                res = res && newPolA[p].eq(polA[p]);
            }

            expect(res).to.equal(true);
        });

        it("with two policies, one with an entity one without", function() {
            var p1 = new Policy([this.f1], this.e_app1_in2);
            var p2 = new Policy([this.f2]);
            var glb_p1_p2 = new Policy([this.f1, this.f2], this.e_app1_in2);

            var newPolA = p1.glb(p2);
            var res = newPolA.eq(glb_p1_p2);

            expect(res).to.equal(true);
        });
    });

    describe("comparison le with", function() {
        it("bot policy smaller than policy with time constraints", function() {
            var bot = Policy.bot();
            var f = new Flow({op: "read","locks":[{"path":"inTimePeriod","args":["08:00","16:00"]}]});
            var pol1 = new Policy([f], new Entity({"type": "/any"}));

            var r1 = bot.le(pol1);
            expect(r1).to.equal(true);
            var r2 = pol1.le(bot);
            expect(r2).to.equal(false);
        });
        
        it("two equal policies", function() {
            var p1 = new Policy([this.f1], this.e_app1_in1);
            var p2 = new Policy([this.f1], this.e_app1_in1);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);
            expect(r1).to.equal(true);
            expect(r2).to.equal(true);
        });

        it("Policy which has a longer time interval", function() {
            var p1 = new Policy([this.f1], this.e_app1_in1);
            var p2 = new Policy([this.f2], this.e_app1_in1);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);
            expect(r1).to.equal(false);
            expect(r2).to.equal(true);
        });

        it("policies that have identical default policies", function() {
            var p1 = new Policy([this.f_touser1, this.f_fromuser1], this.user1);
            var p2 = new Policy([this.f_fromuser1, this.f_touser1], this.user1);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);
            expect(r1).to.equal(true);
            expect(r2).to.equal(true);
        });

        it("one policy that only allows outgoing flows", function() {
            var p1 = new Policy([this.f_touser1], this.user1);
            var p2 = new Policy([this.f_fromuser1, this.f_touser1], this.user1);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);
            expect(r1).to.equal(true);  // for reading both policies are equivalent
            expect(r2).to.equal(true);

            r1 = p1.le(p2, "write");
            r2 = p2.le(p1, "write");
            expect(r1).to.equal(false);  // for writing p2 <= p1
            expect(r2).to.equal(true);
        });

        it("one policy that only allows incoming flows", function() {
            var p1 = new Policy([this.f_fromuser1], this.user1);
            var p2 = new Policy([this.f_fromuser1, this.f_touser1], this.user1);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);
            expect(r1).to.equal(false);
            expect(r2).to.equal(true);
        });

        it("one policy that has additional time restriction", function() {
            var p1 = new Policy([this.f_fromuser1_inTime_10_11, this.f_touser1], this.user1);
            var p2 = new Policy([this.f_fromuser1, this.f_touser1], this.user1);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);
            expect(r1).to.equal(true); // for reading both policies are equivalent
            expect(r2).to.equal(true);

            r1 = p1.le(p2, "write");
            r2 = p2.le(p1, "write");
            expect(r1).to.equal(false); // for writing p2 <= p1
            expect(r2).to.equal(true);
        });

        it("one or two policies that have additional time restriction", function() {
            var p1 = new Policy([this.f_fromuser1_inTime_10_11], this.user1);
            var p2 = new Policy([this.f_fromuser1, this.f_touser1], this.user1);
            var p3 = new Policy([this.f_touser1_inTime_10_11, this.f_fromuser1], this.user1);
            var p4 = new Policy([this.f_fromuser1_inTime_10_11, this.f_touser1_inTime_10_11], this.user1);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);
            var r3 = p3.le(p1);
            var r4 = p3.le(p4);
            var r5 = p4.le(p3);
            expect(r1).to.equal(false);
            expect(r2).to.equal(true);
            expect(r3).to.equal(true);
            expect(r4).to.equal(true);
            expect(r5).to.equal(true);

            r1 = p1.le(p2, "write");
            r2 = p2.le(p1, "write");
            r3 = p3.le(p1, "write");
            r4 = p3.le(p4, "write");
            r5 = p4.le(p3, "write");
            expect(r1).to.equal(false);
            expect(r2).to.equal(true);
            expect(r3).to.equal(true);
            expect(r4).to.equal(true);
            expect(r5).to.equal(false);


        });

        it("one policy has unlimited target flows and the other has time constraint on source flow", function() {
            var p1 = new Policy([this.f_fromuser1_inTime_10_11], this.user1);
            var p2 = new Policy([this.f_toany], this.e_any);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);
            expect(r1).to.equal(false);
            expect(r2).to.equal(true);

            r1 = p1.le(p2, "write");
            r2 = p2.le(p1, "write");
            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });

        it("one policy has unlimited target flows and the other has time constraint on target flow", function() {
            var p1 = new Policy([this.f_touser1_inTime_10_11], this.user1);
            var p2 = new Policy([this.f_toany], this.e_any);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);

            expect(r1).to.equal(false);
            expect(r2).to.equal(true);
        });

        it("two policies, one which only has a target and the other only with source", function() {
            var p1 = new Policy([this.f_toany], this.e_any);
            var p2 = new Policy([this.f_fromany], this.e_any);

            var r1 = p1.le(p2);
            var r2 = p2.le(p1);

            expect(r1).to.equal(true);
            expect(r2).to.equal(false);
        });
    });

    describe("checkAccess", function() {
        it("with error when context is null", function() {
            var ent3 = new Entity({ type : "/user", id : "56"});
            var p3 = new Policy({"object":{"type":"so","id":"123"},"flows":
                                 [
                                     {op: "write"},
                                     {op: "write","locks":[
                                         {"path":"actsFor","args":[
                                             {"type":"/any","id":"{$src.id}"},
                                             56
                                         ]}
                                     ]},
                                     {op: "read"},
                                     {op: "read","locks":[
                                         {"path":"actsFor","args":[{"type":"/any","id":"{$trg.id}"},
                                                                   56
                                                                  ]
                                         }
                                     ]}
                                 ]});

            var p = p3.checkAccess(Policy.bot(), null, "read");

            return expect(p).to.eventually.be.rejected;
        });

        it("entity accesses service object", function() {
            var sensor = new Entity({type:"/sensor", id:"123"});
            var user = new Entity({type: "/user", id: "56"});

            var c = new Context({ type: user.type, data: user },
                                { type: sensor.type, data: sensor });

            // TODO: generate test case in which order of flows 3 and 4 is swapped
            var p3 = new Policy([{op: "write", locks: [ { lock: "hasId", args: [ "56" ] } ] },
                                 {op: "write", "locks": [
                                     {"path":"actsFor","args":[ 0, "56" ] } ]},
                                 {op: "read", locks: [ { lock: "hasId", args: [ "56" ] } ] },
                                 {op: "read","locks":[
                                     {"path":"actsFor","args":[ 0, "56" ]}]}]);

            var p = new Promise(function(resolve, reject) {
                p3.checkAccess(Policy.bot(), c, "read").then(function(r) {
                    resolve(r.grant);
                }, function(e) {
                    reject(e);
                });
            });

            return expect(p).to.eventually.equal(true);
        });

        it("allowing write access for specific user only", function() {
            var sPol1 = new Policy([this.f_toany, this.f_fromany], this.user1);
            var sPol2 = new Policy([this.f_toany, this.f_fromany], this.user2);

            var p1 = new Policy([this.f_fromuser1], this.e_app1_in1);
            var p2 = new Policy([this.f_fromuser2], this.e_app1_in1);
            var p3 = new Policy([this.f_fromuser1, this.f_fromuser2], this.e_app1_in1);

            var doAll = Policy.bot();

            var c_u1_app1 = new Context({ type: this.user1.type,
                                          data: this.user1 },
                                        { type: this.e_app1_in1.type,
                                          data: this.e_app1_in1 });

            var c_u2_app1 = new Context({ type: this.user2.type,
                                          data: this.user2 },
                                        { type: this.e_app1_in1.type,
                                          data: this.e_app1_in1 });

            var r1 = p1.checkAccess(doAll, c_u1_app1, "write");
            var r2 = p1.checkAccess(doAll, c_u2_app1, "write");
            var r3 = p2.checkAccess(doAll, c_u1_app1, "write");
            var r4 = p2.checkAccess(doAll, c_u2_app1, "write");
            var r5 = p3.checkAccess(doAll, c_u1_app1, "write");
            var r6 = p3.checkAccess(doAll, c_u2_app1, "write");

            var conflictLock1 = Lock.createLock({lock: "hasId", args: [ "1" ]});
            var conflictLock2 = Lock.createLock({lock: "hasId", args: [ "2" ]});

            return Promise.all([
                expect(r1).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r2).to.eventually.eql({grant: false, cond: false,
                                              conflicts:[conflictLock1], result: false}),
                expect(r3).to.eventually.eql({grant: false, cond: false,
                                              conflicts: [conflictLock2], result: false}),
                expect(r4).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r5).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r6).to.eventually.eql({grant: true, cond: false, result: true})]);
        });

        it("allowing read access for specific user only", function() {
            var sPol1 = new Policy([this.f_toany, this.f_fromany], this.user1);
            var sPol2 = new Policy([this.f_toany, this.f_fromany], this.user2);

            var p1 = new Policy([this.f_touser1], this.e_app1_in1);
            var p2 = new Policy([this.f_touser2], this.e_app1_in1);
            var p3 = new Policy([this.f_touser1, this.f_touser2], this.e_app1_in1);

            var doAll = Policy.bot();

            var c_u1_app1 = new Context({ type: this.user1.type,
                                          data: this.user1 },
                                        { type: this.e_app1_in1.type,
                                          data: this.e_app1_in1 }
                                       );

            var c_u2_app1 = new Context({ type: this.user2.type,
                                          data: this.user2 },
                                        { type: this.e_app1_in1.type,
                                          data: this.e_app1_in1 }
                                       );

            var r1 = p1.checkAccess(doAll, c_u1_app1, "read");
            var r2 = p1.checkAccess(doAll, c_u2_app1, "read");
            var r3 = p2.checkAccess(doAll, c_u1_app1, "read");
            var r4 = p2.checkAccess(doAll, c_u2_app1, "read");
            var r5 = p3.checkAccess(doAll, c_u1_app1, "read");
            var r6 = p3.checkAccess(doAll, c_u2_app1, "read");

            var conflictLock1 = Lock.createLock({lock: "hasId", args: [ "1" ]});
            var conflictLock2 = Lock.createLock({lock: "hasId", args: [ "2" ]});

            return Promise.all([
                expect(r1).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r2).to.eventually.eql({grant: false, cond: false,
                                              conflicts: [ conflictLock1 ], result: false } ),
                expect(r3).to.eventually.eql({grant: false, cond: false,
                                              conflicts: [ conflictLock2 ], result: false } ),
                expect(r4).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r5).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r6).to.eventually.eql({grant: true, cond: false, result: true})]);
        });

        it("allowing read access from specific port only", function() {
            var sPol1 = new Policy([this.f_toapp1_in1], this.anyone);
            var sPol2 = new Policy([this.f_toapp1_in2], this.anyone);
            var sPol3 = new Policy([this.f_toapp1_in1, this.f_toapp1_in2], this.anyone);

            var c_app1i1_any = new Context({ type: this.e_app1_in1.type,
                                             data: this.e_app1_in1 },
                                           { type: this.anyone.type,
                                             data: this.anyone });

            var c_app1i2_any = new Context({ type: this.e_app1_in2.type,
                                             data: this.e_app1_in2 },
                                           { type: this.anyone.type,
                                             data: this.anyone });

            var c_app1o2_any = new Context({ type: this.e_app1_out2.type,
                                             data: this.e_app1_out2 },
                                           { type: this.anyone.type,
                                             data: this.anyone });

            var doAll = Policy.bot();

            var r1 = sPol1.checkAccess(doAll, c_app1i1_any, "read");
            var r2 = sPol2.checkAccess(doAll, c_app1i1_any, "read");
            var r3 = sPol2.checkAccess(doAll, c_app1i2_any, "read");
            var r4 = sPol3.checkAccess(doAll, c_app1i1_any, "read");
            var r5 = sPol3.checkAccess(doAll, c_app1i2_any, "read");
            var r6 = sPol3.checkAccess(doAll, c_app1o2_any, "read");

            var conflictLock0 = {lock: "hasType", args: [ "/client" ]}
            var conflictLock1 = Lock.createLock({lock: "hasId", args: [ "1in1" ]});
            var conflictLock2 = Lock.createLock({lock: "hasId", args: [ "1in2" ]});

            return Promise.all([
                expect(r1).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r2).to.eventually.eql({grant: false, cond: false,
                                              conflicts: [ conflictLock2 ], result: false }),
                expect(r3).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r4).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r5).to.eventually.eql({grant: true, cond: false, result: true}),
                expect(r6).to.eventually.eql({grant: false, cond: false,
                                              conflicts: [ conflictLock1, conflictLock2 ], result: false } ) ] );
        });

        it("allowing read access from specific port only", function() {
            var sPol1 = new Policy([this.f_fromapp1_out1], this.anyone);
            var sPol2 = new Policy([this.f_fromapp1_out2], this.anyone);
            var sPol3 = new Policy([this.f_fromapp1_out1, this.f_fromapp1_out2], this.anyone);

            var doAll = Policy.bot();

            var c1 = new Context({ type: this.e_app1_out1.type,
                                   data: this.e_app1_out1 },
                                 { type: this.anyone.type,
                                   data: this.anyone });

            var c2 = new Context({ type: this.e_app1_out2.type,
                                   data: this.e_app1_out2 },
                                 { type: this.anyone.type,
                                   data: this.anyone });

            var c3 = new Context({ type: this.e_app1_in1.type,
                                   data: this.e_app1_in1 },
                                 { type: this.anyone.type,
                                   data: this.anyone });


            var r1 = sPol1.checkAccess(doAll, c1, "write");
            var r2 = sPol1.checkAccess(doAll, c2, "write");
            var r3 = sPol2.checkAccess(doAll, c2, "write");
            var r4 = sPol2.checkAccess(doAll, c3, "write");
            var r5 = sPol3.checkAccess(doAll, c1, "write");
            var r6 = sPol3.checkAccess(doAll, c2, "write");

            var conflictLock1 = Lock.createLock({lock: "hasId", args: [ "1out1" ]});
            var conflictLock2 = Lock.createLock({lock: "hasId", args: [ "1out2" ]});

            return Promise.all([
                expect(r1).to.eventually.eql({ grant: true, cond: false, result: true }),
                expect(r2).to.eventually.eql({ grant: false, cond: false, conflicts: [ conflictLock1 ], result: false }),
                expect(r3).to.eventually.eql({ grant: true, cond: false, result: true }),
                expect(r4).to.eventually.eql({ grant: false, cond: false, conflicts: [ conflictLock2 ], result: false }),
                expect(r5).to.eventually.eql({ grant: true, cond: false, result: true }),
                expect(r6).to.eventually.eql({ grant: true, cond: false, result: true })]);
        });

        it("allowing write access from anyone without conditions", function() {
            var sPol1 = new Policy([this.f_toany], this.anyone);
            var sPol2 = new Policy([this.f_toany], this.anyuser);
            var sPol3 = new Policy([this.f_toany], this.user1);
            var sPol4 = new Policy([this.f_toany], this.anyapp);
            var sPol5 = new Policy([this.f_toany], this.app1);
            var sPol6 = new Policy([this.f_toany], this.so1);
            var sPol7 = new Policy([this.f_toany], this.anyso);

            var p1 = new Policy([this.f_toany], this.e_app1_in1);
            var p2 = new Policy([this.f_fromany], this.e_app1_in1);
            var p3 = new Policy([this.f_fromany, this.f_toany], this.e_app1_in1);

            var doAll = Policy.bot();

            var receiver = { type: this.e_app1_in1.type,
                             data: this.e_app1_in1 };

            var c1 = new Context({type: this.anyone.type, data: this.anyone}, receiver);
            var c2 = new Context({type: this.anyuser.type, data: this.anyuser}, receiver);
            var c3 = new Context({type: this.user1.type, data: this.user1}, receiver);
            var c4 = new Context({type: this.anyapp.type, data: this.anyapp}, receiver);
            var c5 = new Context({type: this.app1.type, data: this.app1}, receiver);
            var c6 = new Context({type: this.so1.type, data: this.so1}, receiver);
            var c7 = new Context({type: this.anyso.type, data: this.anyso}, receiver);


            var r11 = p1.checkAccess(sPol1, c1, "write");
            var r21 = p1.checkAccess(sPol2, c2, "write");
            var r31 = p1.checkAccess(sPol3, c3, "write");
            var r41 = p1.checkAccess(sPol4, c4, "write");
            var r51 = p1.checkAccess(sPol5, c5, "write");
            var r61 = p1.checkAccess(sPol6, c6, "write");
            var r71 = p1.checkAccess(sPol7, c7, "write");

            var r12 = p2.checkAccess(sPol1, c1, "write");
            var r22 = p2.checkAccess(sPol2, c2, "write");
            var r32 = p2.checkAccess(sPol3, c3, "write");
            var r42 = p2.checkAccess(sPol4, c4, "write");
            var r52 = p2.checkAccess(sPol5, c5, "write");
            var r62 = p2.checkAccess(sPol6, c6, "write");
            var r72 = p2.checkAccess(sPol7, c7, "write");

            var r13 = p3.checkAccess(sPol1, c1, "write");
            var r23 = p3.checkAccess(sPol2, c2, "write");
            var r33 = p3.checkAccess(sPol3, c3, "write");
            var r43 = p3.checkAccess(sPol4, c4, "write");
            var r53 = p3.checkAccess(sPol5, c5, "write");
            var r63 = p3.checkAccess(sPol6, c6, "write");
            var r73 = p3.checkAccess(sPol7, c7, "write");

            var grant = { grant: true, cond: false, result: true };
            var deny = {grant: false, cond: false, conflicts: [], result: false };

            return Promise.all([
                // no conflicts as p1 does not have any flows generating conflicts
                expect(r11).to.eventually.eql(deny),
                expect(r21).to.eventually.eql(deny),
                expect(r31).to.eventually.eql(deny),
                expect(r41).to.eventually.eql(deny),
                expect(r51).to.eventually.eql(deny),
                expect(r61).to.eventually.eql(deny),
                expect(r71).to.eventually.eql(deny),

                expect(r12).to.eventually.eql(grant),
                expect(r22).to.eventually.eql(grant),
                expect(r32).to.eventually.eql(grant),
                expect(r42).to.eventually.eql(grant),
                expect(r52).to.eventually.eql(grant),
                expect(r62).to.eventually.eql(grant),
                expect(r72).to.eventually.eql(grant),

                expect(r13).to.eventually.eql(grant),
                expect(r23).to.eventually.eql(grant),
                expect(r33).to.eventually.eql(grant),
                expect(r43).to.eventually.eql(grant),
                expect(r53).to.eventually.eql(grant),
                expect(r63).to.eventually.eql(grant),
                expect(r73).to.eventually.eql(grant)]);
        });

        it("check access between conflicting policies", function() {
            var subjectPolicy = new Policy([this.f_fromany], this.anyone);
            var targetPolicy = new Policy([this.f_toany], this.anyone);

            var doAll = Policy.bot();

            var sender = { type: this.anyone.type,
                           data: this.anyone };
            var receiver = { type: this.anyone.type,
                             data: this.anyone };

            var c = new Context(sender, receiver);

            var r = targetPolicy.checkAccess(subjectPolicy, c, "write");

            return expect(r).to.eventually.eql({grant: false, cond: false, conflicts: [], result: false}); 
        });

        it("check access of manually generated Policies", function() {
            var currentDate = new Date();
            var hours = currentDate.getHours();
            
            var outputPol = new Policy({
                "entity": {"type": "/client", "id": "69426370.b44304" },
                "flows": [ { op: "read", "locks": [ { "path": "inTimePeriod", "args": [ lz(hours)+":00", lz(hours+2)+":00" ] } ] } ] });
            var inputPol = new Policy({
                "entity": {"type": "/client", "id": "490fd2de.ab6a94", "input": "0" },
                "flows": [ { op: "write", "locks": [ { "path": "inTimePeriod", "args": [ lz(hours-1)+":00", lz(hours+4)+":00" ] } ] } ] });

            var input = new Entity({"type": "/client", "id": "490fd2de.ab6a94", "input": "0" });
            var output =  new Entity({"type": "/client", "id": "69426370.b44304" });

            var c = new Context({type: output.type, data: output},
                                {type: input.type, data:input});

            var result = inputPol.checkAccess(outputPol, c, "write");

            return expect(result).to.eventually.eql({"grant": true, "cond": false, "result": true});

        });

        it("allowing read access from anyone without conditions", function() {
            var sPol1 = new Policy([this.f_fromany], this.anyone);
            var sPol2 = new Policy([this.f_fromany], this.anyuser);
            var sPol3 = new Policy([this.f_fromany], this.user1);
            var sPol4 = new Policy([this.f_fromany], this.anyapp);
            var sPol5 = new Policy([this.f_fromany], this.app1);
            var sPol6 = new Policy([this.f_fromany], this.so1);
            var sPol7 = new Policy([this.f_fromany], this.anyso);

            var p1 = new Policy([this.f_toany], this.e_app1_in1);
            var p2 = new Policy([this.f_fromany], this.e_app1_in1);
            var p3 = new Policy([this.f_fromany, this.f_toany], this.e_app1_in1);

            var e1 = this.anyone;
            var e2 = this.anyuser;
            var e3 = this.user1;
            var e4 = this.anyapp;
            var e5 = this.app1;
            var e6 = this.so1;
            var e7 = this.anyso;

            var c1 = new Context({type: this.e_app1_in1.type, data: this.e_app1_in1}, { type: e1.type, data: e1 });
            var c2 = new Context({type: this.e_app1_in1.type, data: this.e_app1_in1}, { type: e2.type, data: e2 });
            var c3 = new Context({type: this.e_app1_in1.type, data: this.e_app1_in1}, { type: e3.type, data: e3 });
            var c4 = new Context({type: this.e_app1_in1.type, data: this.e_app1_in1}, { type: e4.type, data: e4 });
            var c5 = new Context({type: this.e_app1_in1.type, data: this.e_app1_in1}, { type: e5.type, data: e5 });
            var c6 = new Context({type: this.e_app1_in1.type, data: this.e_app1_in1}, { type: e6.type, data: e6 });
            var c7 = new Context({type: this.e_app1_in1.type, data: this.e_app1_in1}, { type: e7.type, data: e7 });

            var r11 = p1.checkAccess(sPol1, c1, "read");
            var r21 = p1.checkAccess(sPol2, c2, "read");
            var r31 = p1.checkAccess(sPol3, c3, "read");
            var r41 = p1.checkAccess(sPol4, c4, "read");
            var r51 = p1.checkAccess(sPol5, c5, "read");
            var r61 = p1.checkAccess(sPol6, c6, "read");
            var r71 = p1.checkAccess(sPol7, c7, "read");

            var r12 = p2.checkAccess(sPol1, c1, "read");
            var r22 = p2.checkAccess(sPol2, c2, "read");
            var r32 = p2.checkAccess(sPol3, c3, "read");
            var r42 = p2.checkAccess(sPol4, c4, "read");
            var r52 = p2.checkAccess(sPol5, c5, "read");
            var r62 = p2.checkAccess(sPol6, c6, "read");
            var r72 = p2.checkAccess(sPol7, c7, "read");

            var r13 = p3.checkAccess(sPol1, c1, "read");
            var r23 = p3.checkAccess(sPol2, c2, "read");
            var r33 = p3.checkAccess(sPol3, c3, "read");
            var r43 = p3.checkAccess(sPol4, c4, "read");
            var r53 = p3.checkAccess(sPol5, c5, "read");
            var r63 = p3.checkAccess(sPol6, c6, "read");
            var r73 = p3.checkAccess(sPol7, c7, "read");

            var grant = { grant: true, cond: false, result: true };
            var deny = {grant: false, cond: false, conflicts: [], result: false };

            return Promise.all([
                expect(r11).to.eventually.eql(grant),
                expect(r21).to.eventually.eql(grant),
                expect(r31).to.eventually.eql(grant),
                expect(r41).to.eventually.eql(grant),
                expect(r51).to.eventually.eql(grant),
                expect(r61).to.eventually.eql(grant),
                expect(r71).to.eventually.eql(grant),

                expect(r12).to.eventually.eql(deny),
                expect(r22).to.eventually.eql(deny),
                expect(r32).to.eventually.eql(deny),
                expect(r42).to.eventually.eql(deny),
                expect(r52).to.eventually.eql(deny),
                expect(r62).to.eventually.eql(deny),
                expect(r72).to.eventually.eql(deny),

                expect(r13).to.eventually.eql(grant),
                expect(r23).to.eventually.eql(grant),
                expect(r33).to.eventually.eql(grant),
                expect(r43).to.eventually.eql(grant),
                expect(r53).to.eventually.eql(grant),
                expect(r63).to.eventually.eql(grant),
                expect(r73).to.eventually.eql(grant)
            ]);
        });
    });

    describe("checkFlow", function() {
        it("with incoming public message allowed to flow to any type", function() {
            // var mPol = new Policy([ this.f_touser1_inTime_10_11, this.f_fromany]);
            var mPol = new Policy([ this.f_toany, this.f_fromany]);

            var inputPortPol = new Policy([ { op: "write" } ],
                                          { type : '/sensor', id : 'f68766b0.a1594', input : 0 });

            var sender = { type: this.anyone.type,
                           data: this.anyone };
            var receiver = { type : '/sensor', data: { type : '/sensor', id : 'f68766b0.a1594', input : 0 } };
            var context = new Context(sender, receiver);

            var eval = mPol.checkFlow(inputPortPol, Policy.Direction.INCOMING, context);

            return expect(eval).to.eventually.eql({ grant: true, cond: false});
        });

        it("with incoming public message and a time restricted input policy", function() {
            var mPol = new Policy([this.f_toany, this.f_fromany]);
            var inputPortPol = new Policy([{ op: "write",
                                             locks : [ { path : 'inTimePeriod', args : ["00:00" , "23:59"] } ] }],
                                          { type : '/sensor', id : 'f68766b0.a1594', input : 0 });

            var input = new Entity({ type : '/sensor', id : 'f68766b0.a1594', input : 0 });
            var c = new Context({ type: this.anyone.type, data: this.anyone },
                                { type: input.type, data: input });

            var lubPol = mPol.checkFlow(inputPortPol, Policy.Direction.INCOMING, c);

            return Promise.all([
                expect(lubPol).to.eventually.eql({grant: true, cond: false})]);
        });

        // TODO: Enhance tests, minimum specify some test one the message itself

        it("with incoming message which can only flow to a specific sensor", function() {
            var mPol_good = new Policy([{ op: "read", locks: [ { lock: "hasId", args: [ 'f68766b0.a1594' ] } ] }, this.f_fromany ]);
            var mPol_bad = new Policy([{ op: "read", locks: [ { lock: "hasId", args: [ 'x' ] } ] }, this.f_fromany ]);

            var inputPortPol = new Policy([{ op: "write" }],
                                          { type : '/sensor', id : 'f68766b0.a1594', input : 0 });

            var input = new Entity({ type : '/sensor', id : 'f68766b0.a1594', input : 0 });
            var c = new Context({ type: this.anyone.type, data: this.anyone },
                                { type: input.type, data: input });

            var r1 = mPol_good.checkFlow(inputPortPol, Policy.Direction.INCOMING, c);
            var r2 = mPol_bad.checkFlow(inputPortPol, Policy.Direction.INCOMING, c);

            return Promise.all([
                expect(r1).to.eventually.eql({grant: true, cond: false}),
                expect(r2).to.eventually.eql({grant: false, cond: false, conflicts: [ Lock.createLock({ lock: "hasId", args: [ "x" ]}) ] })]);
        });

        it("with incoming message which can only flow to entities with a specific type and id", function() {
            var mPol_good = new Policy([{ op: "read", locks: [ { lock: "hasId", args: [ 'f68766b0.a1594' ] }, { lock: "hasType", args: [ '/sensor'] } ] }, this.f_fromany ]);
            var mPol_bad1 = new Policy([{ op: "read", locks: [ { lock: "hasId", args: [ 'f68766b0.a1594' ] }, { lock: "hasType", args: [ '/client'] } ] }, this.f_fromany ]);
            var mPol_bad2 = new Policy([{ op: "read", locks: [ { lock: "hasId", args: [ 'f68766b0.a159' ] }, { lock: "hasType", args: [ '/client'] } ] }, this.f_fromany ]);

            var inputPortPol = new Policy([{ op: "write" }],
                                          { type : '/sensor', id : 'f68766b0.a1594', input : 0 });

            var input = new Entity({ type : '/sensor', id : 'f68766b0.a1594', input : 0 });
            var c = new Context({ type: this.anyone.type, data: this.anyone },
                                { type: input.type, data: input });

            var r1 = mPol_good.checkFlow(inputPortPol, Policy.Direction.INCOMING, c);
            var r2 = mPol_bad1.checkFlow(inputPortPol, Policy.Direction.INCOMING, c);
            var r3 = mPol_bad2.checkFlow(inputPortPol, Policy.Direction.INCOMING, c);

            return Promise.all([
                expect(r1).to.eventually.eql({grant: true, cond: false}),
                expect(r2).to.eventually.eql({grant: false, cond: false, conflicts: [ Lock.createLock({ lock: "hasType", args: [ "/client" ]}) ] }),

                // TODO: check lubLock of Policy, lock seems to be elliminated erroneously
                expect(r3).to.eventually.eql({grant: false, cond: false, conflicts: [ Lock.createLock({ lock: "hasId", args: [ "f68766b0.a159" ]}),
                                                                                      Lock.createLock({ lock: "hasType", args: [ "/client" ]})] }) ]);
        });

    });

    describe("operation types", function() {
        it("checks whether invalid operation is recognized correctly.", function() {
            function c() { var inF1 = new Flow({ op: "xyz", locks : [this.lock_inTime_10_11] }); }

            expect(c).to.throw();
        });

        it("execute and read should not be allowed as only a write policy has been defined.", function() {
            var p = new Policy([this.f_fromuser1]);
            var doAll = Policy.bot();
            
            var c_u2_app1 = new Context({ type: this.user2.type,
                                          data: this.user2 },
                                        { type: this.e_app1_in1.type,
                                          data: this.e_app1_in1 });
            
            var r1 = p.checkAccess(doAll, c_u2_app1, "execute");
            var r2 = p.checkAccess(doAll, c_u2_app1, "read");
            var r3 = p.checkAccess(doAll, c_u2_app1, "write");
            
            var conflictLock1 = Lock.createLock({lock: "hasId", args: [ "1" ]});
            
            return Promise.all([
                expect(r1).to.eventually.eql({grant: false, cond: false, result: false, conflicts: []}),
                expect(r2).to.eventually.eql({grant: false, cond: false, result: false, conflicts: []}),
                expect(r3).to.eventually.eql({grant: false, cond: false, result: false, conflicts: [conflictLock1] })]);
                
        });
    });

    describe("le of Policy inside function when setting msg property", function() {
        it("checks le wit the two given functions", function() {

            var thisPolicy =  new Policy({"entity":{"type":"/sensor","id":"66ab1cb3.39ab8c","output":0},"flows":[{op: "read","locks":[{"path":"hasId","args":["6c5cec44-f4a0-44e5-b9ce-a63d6f50c69d"],"not":false}]},{op: "read","locks":[{"path":"actsFor","args":["6c5cec44-f4a0-44e5-b9ce-a63d6f50c69d"],"not":false}]},{op: "write","locks":[{"path":"hasId","args":["6c5cec44-f4a0-44e5-b9ce-a63d6f50c69d"],"not":false}]},{op: "write","locks":[{"path":"actsFor","args":["6c5cec44-f4a0-44e5-b9ce-a63d6f50c69d"],"not":false}]}]});
            var varPolicy = new Policy(
                {"entity":{"type":"/sensor","id":"66ab1cb3.39ab8c","output":0},
                 "flows":[
                     { op: "write","locks":[{"path":"hasId","args":["6c5cec44-f4a0-44e5-b9ce-a63d6f50c69d"],"not":false}]},
                     {op: "read","locks":[{"path":"hasId","args":["6c5cec44-f4a0-44e5-b9ce-a63d6f50c69d"],"not":false}]},
                     {op: "write","locks":[{"path":"actsFor","args":["6c5cec44-f4a0-44e5-b9ce-a63d6f50c69d"],"not":false}]},
                     {op: "read","locks":[{"path":"actsFor","args":["6c5cec44-f4a0-44e5-b9ce-a63d6f50c69d"],"not":false}]}]});

            var r = thisPolicy.le(varPolicy);
            expect(r).to.equal(true);
        });

        it("policy generation with two users", function() {
            var pol = new Policy([
                {op: "write","locks":[{"path":"hasId","args":["6603691f-6fc5-495b-81d5-ec9eb2a9648c"],"not":false}]},
                {op: "write","locks":[{"path":"actsFor","args":["6603691f-6fc5-495b-81d5-ec9eb2a9648c"],"not":false}]},
                {op: "read","locks":[{"path":"hasId","args":["6603691f-6fc5-495b-81d5-ec9eb2a9648c"],"not":false}]},
                {op: "read","locks":[{"path":"actsFor","args":["6603691f-6fc5-495b-81d5-ec9eb2a9648c"],"not":false}]},
                {op: "write","locks":[{"path":"hasId","args":["09c9129e-e5d7-4b8d-845b-cae6d90858c6"],"not":false}]},
                {op: "write","locks":[{"path":"actsFor","args":["09c9129e-e5d7-4b8d-845b-cae6d90858c6"],"not":false}]},
                {op: "read","locks":[{"path":"hasId","args":["09c9129e-e5d7-4b8d-845b-cae6d90858c6"],"not":false}]},
                {op: "read","locks":[{"path":"actsFor","args":["09c9129e-e5d7-4b8d-845b-cae6d90858c6"],"not":false}]}], {"type":"/sensor","id":"144848004447043dfd1f633c541d087db898766ac13ae"});

            var r0 = pol.getFlows("read").length + pol.getFlows("write").length;
            var r1 = pol.getFlows("read").length;
            expect(r0).to.equal(8);
            expect(r1).to.equal(4);
        });
    });

    describe("applying actions", function() {
        it("ignore dummy data", function() {
            var currentDate = new Date();
            var hours = currentDate.getHours();
            
            var s = new Entity({"type": "/user", "id": "490fd2de.ab6a94"});
            var o =  new Entity({"type": "/sensor", "id": "69426370.b44304" });
            var c = new Context({type: s.type, data: s},
                                {type: o.type, data:o});
            var op = new Policy({ flows: [ { op: "read", locks: [ { lock: "inTimePeriod", args: [ lz(hours-2)+":00", lz(hours-1)+":00" ] } ] } ], actions: { "read": [ { action: "ignore" } ] } });
            var sp = new Policy({ flows: [ { op: "read" }, { op: "write" } ] } );
            var data = "This is dummy data.";
            
            var r = op.checkAccess(sp, c, "read").then(Policy.enforce.bind(null, data, c, "/user"));

            return expect(r).to.eventually.equal(data);
        });

        it("delete dummy data", function() {
            var currentDate = new Date();
            var hours = currentDate.getHours();
            
            var s = new Entity({"type": "/user", "id": "490fd2de.ab6a94"});
            var o =  new Entity({"type": "/sensor", "id": "69426370.b44304" });
            var c = new Context({type: s.type, data: s},
                                {type: o.type, data:o});
            var op = new Policy({ flows: [ { op: "read", locks: [ { lock: "inTimePeriod", args: [ lz(hours-2)+":00", lz(hours-1)+":00" ] } ] } ], actions: { "read": [ { action: "delete" } ] } });
            var sp = new Policy({ flows: [ { op: "read" }, { op: "write" } ] } );
            var data = "This is dummy data.";
            
            var r = op.checkAccess(sp, c, "read").then(Policy.enforce.bind(null, data, c, "/user"));

            return expect(r).to.eventually.equal(null);
        });

        // Note: not a good test! Try to compute randomness of string?
        it("randomize dummy data", function() {
            var currentDate = new Date();
            var hours = currentDate.getHours();
            
            var s = new Entity({"type": "/user", "id": "490fd2de.ab6a94"});
            var o =  new Entity({"type": "/sensor", "id": "69426370.b44304" });
            var c = new Context({type: s.type, data: s},
                                {type: o.type, data:o});
            var op = new Policy({ flows: [ { op: "read", locks: [ { lock: "inTimePeriod", args: [ lz(hours-2)+":00", lz(hours-1)+":00" ] } ] } ], actions: { "read": [ { action: "randomize" } ] } });
            var sp = new Policy({ flows: [ { op: "read" }, { op: "write" } ] } );
            var data = "This is dummy data.";
            
            var r = op.checkAccess(sp, c, "read").then(Policy.enforce.bind(null, data, c, "/user"));

            return expect(r).to.eventually.not.equal(data);
        });

        it("replace dummy data", function() {
            var currentDate = new Date();
            var hours = currentDate.getHours();
            
            var s = new Entity({"type": "/user", "id": "490fd2de.ab6a94"});
            var o =  new Entity({"type": "/sensor", "id": "69426370.b44304" });
            var c = new Context({type: s.type, data: s},
                                {type: o.type, data:o});
            var op = new Policy({ flows: [ { op: "read", locks: [ { lock: "inTimePeriod", args: [ lz(hours-2)+":00", lz(hours-1)+":00" ] } ] } ], actions: { "read": [ { action: "replace", args: ["fixed", "TEXT"] } ] } });
            var sp = new Policy({ flows: [ { op: "read" }, { op: "write" } ] } );
            var data = "This is dummy data.";
            
            var r = op.checkAccess(sp, c, "read").then(Policy.enforce.bind(null, data, c, "/user"));

            return expect(r).to.eventually.equal("TEXT");
        });
    });

    describe("be backwards compatible", function() {
        it("generate old policy format", function() {
            var p1 = new Policy({ flows: [ { op: "read", locks: [ { lock: "inTimePeriod", args: [ "10:00", "11:00" ] } ] }, {op: "write","locks":[{"path":"hasId","args":["09c9129e-e5d7-4b8d-845b-cae6d90858c6"],"not":false}]} ], actions: { "read": [ { action: "replace", args: ["fixed", "TEXT"] } ] } });

            pjson = JSON.stringify(p1.getSimpleFlows());

            return expect(pjson).to.equal(JSON.stringify([ { op: "read", locks: [ { lock: "inTimePeriod", args: [ "10:00", "11:00" ], not:false } ] }, {op: "write","locks":[ {lock:"hasId","args":["09c9129e-e5d7-4b8d-845b-cae6d90858c6"],"not":false}]} ]));
        });
    });
});
