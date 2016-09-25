"use strict"

const chai = require("chai")
chai.use(require("chai-as-promised"))
chai.use(require("chai-spies"));
chai.should();

var asyncInt = function (r) {
    return new Promise((accept, reject) => {
        r.then(i => accept(i.c[0])).catch(reject);
    })
}

var async = function (r) {
    return new Promise((accept, reject) => {
        r.then(accept).catch(reject);
    })
}

contract("Tradeable", accounts => {

    let owner = accounts[0]; 
    let buyer = accounts[1];
    let market = accounts[2];

    describe("Initiate", () => {
        it("should be possible to create new instance", () => {
            return async(Tradeable.new({from: owner}))
                .should.be.fulfilled;
        })
    })

    describe("Public methods", () => {

        let tradeable;


        beforeEach(() => {
            return async(Tradeable.new({from: owner})).then(i => tradeable = i);
        })

        it("should be owned by initiator", () => {
            return async(tradeable.owner.call()).should.eventually.equal(owner)
        })

        it("should be possible to authorizeMarket if owner", () => {
            return async(tradeable.authorizeMarket.call(market, {from: owner})).should.be.fulfilled;
        })

        it("should not be possible to authorizeMarket if not owner", () => {
            return async(tradeable.authorizeMarket.call(market, {from: buyer})).should.be.rejected;
        })

        it("should return correct values of isAuthorizedToSell", () => {
            return Promise.all([
                async(tradeable.authorizeMarket(market, {from: owner})),
                async(tradeable.isAuthorizedToSell.call(market)).should.eventually.equal(true),
                async(tradeable.isAuthorizedToSell.call(accounts[3])).should.eventually.equal(false)
            ])
        })

        it("should allow transferOwnership if market", () => {
            return Promise.all([
                async(tradeable.transferOwnership(buyer, {from: owner})).should.be.fulfilled,
                async(tradeable.owner.call()).should.eventually.equal(buyer)

            ])
        })

        it("should allow transferOwnership if authorized market", () => {
            return Promise.all([
                async(tradeable.authorizeMarket(market, {from: owner})),
                async(tradeable.transferOwnership(buyer, {from: market})).should.be.fulfilled,
                async(tradeable.owner.call()).should.eventually.equal(buyer)
            ])
        })

        it("should not allow transferOwnership if not market or owner", () => {
            return Promise.all([
                async(tradeable.authorizeMarket(market, {from: owner})),
                async(tradeable.transferOwnership(buyer, {from: buyer})).should.be.rejected,
                async(tradeable.owner.call()).should.eventually.equal(owner)
            ])
        })
    })
})
