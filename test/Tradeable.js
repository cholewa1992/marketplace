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

contract("Tradeable", accounts => {

    let owner = accounts[0];
    let buyer = accounts[1];
    let seller = accounts[2];

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

        it("should be possible to authorizeSeller if owner", () => {
            return async(tradeable.authorizeSeller.call(seller, {from: owner})).should.be.fulfilled;
        })

        it("should not be possible to authorizeSeller if not owner", () => {
            return async(tradeable.authorizeSeller.call(seller, {from: buyer})).should.be.rejected;
        })

        it("should return correct values of isAuthorizedToSell", () => {
            return Promise.all([
                async(tradeable.authorizeSeller(seller, {from: owner})),
                async(tradeable.isAuthorizedToSell.call(seller)).should.eventually.equal(true),
                async(tradeable.isAuthorizedToSell.call(accounts[3])).should.eventually.equal(false)
            ])
        })

        it("should allow transferOwnership if seller", () => {
            return Promise.all([
                async(tradeable.transferOwnership(buyer, {from: owner})).should.be.fulfilled,
                async(tradeable.owner.call()).should.eventually.equal(buyer)

            ])
        })

        it("should allow transferOwnership if authorized seller", () => {
            return Promise.all([
                async(tradeable.authorizeSeller(seller, {from: owner})),
                async(tradeable.transferOwnership(buyer, {from: seller})).should.be.fulfilled,
                async(tradeable.owner.call()).should.eventually.equal(buyer)
            ])
        })

        it("should not allow transferOwnership if seller not authorized", () => {
            return Promise.all([
                async(tradeable.transferOwnership(buyer, {from: seller})).should.be.rejected,
                async(tradeable.owner.call()).should.eventually.equal(owner)
            ])
        })

        it("should not allow transferOwnership if not seller or market", () => {
            return Promise.all([
                async(tradeable.transferOwnership(buyer, {from: buyer})).should.be.rejected,
                async(tradeable.owner.call()).should.eventually.equal(owner)
            ])
        })
    })
})
