"use strict"

const chai = require("chai")
chai.use(require("chai-as-promised"))
chai.use(require("chai-spies"));
chai.should();

var asyncInt = function (r) {
    return new Promise((accept, reject) => {
        r.then(i => accept(i.toNumber())).catch(reject);
    })
}

var async = function (r) {
    return new Promise((accept, reject) => {
        r.then(accept).catch(reject);
    })
}

contract("DMR", accounts => {

    let token;
    let initialAmount = 1000;

    let owner = accounts[0];
    let buyer = accounts[1];
    let market = accounts[2];

    beforeEach(() => {
        return async(HumanStandardToken.new(
            initialAmount,  // Initial amount of coins
            "Test token",   // Name of the token
            0,              // Number of decimal points
            "tt",           // Token symbol
            {from: buyer}   // Executing account
        )).then(i => token = i)
    })

    describe("Initiate", () => {
        it("should be possible to create new instance", () => {

            return async(DMR.new(token.address, {from: owner}))
                .should.be.fulfilled;
        })
    })

    describe("Public methods", () => {

        let dmr;

        beforeEach(() => {
            return async(DMR.new(token.address, {from: owner})).then(i => dmr = i);
        })

        it("should be able to issue new car", () => {
            return Promise.all([

                /* Getting the address that car will be deployed to */
                async(dmr.issueVehicle.call(
                    "5GZCZ43D13S812715",// vin
                    { from: owner}      // executor
                )),

                /* Executing the call */
                async(dmr.issueVehicle(
                    "5GZCZ43D13S812715",// vin
                    { from: owner}      // executor
                )).should.be.fulfilled

            ]).then(address => {
                return async(Vehicle.at(address[0]).owner.call())
                    .should.eventually.equal(owner);

            });
        })
    })
})
