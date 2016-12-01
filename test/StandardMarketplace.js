"use strict"

const chai = require("chai")
chai.use(require("chai-as-promised"))
chai.use(require("chai-spies"));
chai.should();

function asyncInt(r){
    return new Promise((accept, reject) => {
        r.then(i => accept(i.toNumber())).catch(reject);
    })
}

function async(r){
    return new Promise((accept, reject) => {
        r.then(accept).catch(reject);
    })
}

function asyncEvent(event){
    return new Promise((accept, reject) => {
        event.watch((err,r) => {
            if(!err) accept(r);
            else reject(err);
            event.stopWatching();
        })
    })
}

contract("StandardMarketplace", accounts => {


    let token;
    let initialAmount = 1000;

    let owner = accounts[0];
    let buyer = accounts[1];
    let none = "0x0000000000000000000000000000000000000000";

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
            return async(StandardMarketplace.new(token.address))
                .should.be.fulfilled;
        })
    })

    describe("Public methods", () => {

        let market;
        let tradeable;


        beforeEach(() => {
            return Promise.all([

                async(StandardMarketplace.new(token.address))
                .then(i => market = i),

                async(Tradeable.new({from: owner})
                    .then(i => tradeable = i))

            ]);
        })

        it("should be possible to extend offer if owner", () => {
            return Promise.all([

                /* Allowing tradable to sold on market */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Asserting that the result is true */
                async(market.extendOffer.call(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.eventually.equal(true),

                /* Executing the extendOffer transaction */
                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Asserting that the event was fired */
                asyncEvent(market.SellerAddedOffer(
                    {fromBlock: "latest"}
                )).then(e => e.args["item"])
                .should.eventually.equal(tradeable.address),

                /* Asserting that the offer was correctly added */
                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[0]).should.eventually.equal(owner),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[1]).should.eventually.equal(buyer),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[2].toNumber()).should.eventually.equal(1000),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[3].toNumber()).should.eventually.equal(1)

            ])
        })

        it("should not be possible to extend offer if market not authenticated", () => {
            return async(market.extendOffer.call(
                tradeable.address,      // item address
                buyer,                  // buyers address
                1000,                   // purchase amount
                {from: owner}           // executor
            )).should.be.rejected
        })

        it("should not be possible to extend offer if not owner", () => {
            return Promise.all([

                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor address
                )).should.be.fulfilled,

                async(market.extendOffer.call(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )).should.be.rejected

            ])
        })

        it("should be possible to extend offer with amount equal zero", () => {
            return Promise.all([

                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor address
                )).should.be.fulfilled,

                async(market.extendOffer.call(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    0,                  // purchase amount
                    {from: owner}       // executor
                )).should.eventually.equal(true)

            ])
        })

        // When given -1 as parameter it will be cast to 0 as the amount parameter is uint
        /*
        it("should not be possible to extend offer with amount lower than zero", () => {
            return Promise.all([

                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor address
                )).should.be.fulfilled,

                async(market.extendOffer.call(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    -1,                 // purchase amount
                    {from: owner}       // executor
                )).should.eventually.equal(false)

            ])
        })*/

        it("should be possible to revoke offer", () => {
            return Promise.all([

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Revoking the offer */
                async(market.revokeOffer.call(
                    tradeable.address,  // item address
                    {from: owner}       // executor
                )).should.eventually.equal(true),

                async(market.revokeOffer(
                    tradeable.address,  // item address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Asserting than an event was fired */
                asyncEvent(market.SellerRevokedOffer({fromBlock: "latest"}))
                .then(e => e.args["item"])
                .should.eventually.equal(tradeable.address),

                /* Asserting that the offer was removed from the mapping */
                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[0]).should.eventually.equal(none),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[3].toNumber()).should.eventually.equal(0)

            ])
        })

        it("should not be possible to revoke offer if not owner", () => {
            return Promise.all([

                /* setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* revoking the offer */
                async(market.revokeOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.rejected,

            ])
        })

        it("should not be possible to revoke offer twice", () => {
            return Promise.all([

                /* setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* revoking the offer */
                async(market.revokeOffer(
                    tradeable.address,  // item address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* revoking the offer again */
                async(market.revokeOffer.call(
                    tradeable.address,  // item address
                    {from: owner}       // executor
                )).should.eventually.equal(false)

            ])
        })

        it("should be possible to accept offer if buyer", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer.call(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.eventually.equal(true),

                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                /* Asserting that the event was fired */
                asyncEvent(market.BuyerAcceptedOffer(
                    {fromBlock: "latest"}
                )).then(e => e.args["item"])
                .should.eventually.equal(tradeable.address),

                /* Asserting that the offer was accepted */
                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[3].toNumber()).should.eventually.equal(2),

                /* Asserting that the money was withdrawn from the buyer */
                asyncInt(token.balanceOf(
                    buyer               // buyers address
                )).should.eventually.equal(0),

                /* and deposited at the market */
                asyncInt(token.balanceOf(
                    market.address      // market address
                )).should.eventually.equal(1000)

            ])
        })

        it("should not be possible to accept an offer twice", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer twice */
                async(market.acceptOffer.call(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.eventually.equal(true),

                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                async(market.acceptOffer.call(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.eventually.equal(false),

            ])
        })

        it("should not be possible to accept offer if not buyer", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(market.address, 1000, {from: buyer})),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer.call(
                    tradeable.address,  // item address
                    {from: owner}       // executor
                )).should.be.rejected

            ])
        })

        it("should not be possible to accept offer if insufficient allowance ", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    500,                // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer.call(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.eventually.equal(false),

            ])
        })

        it("should not be possible to accept offer if not extend", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    500,                // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer.call(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.rejected

            ])
        })

        it("should not be possible to accept offer if insufficient funds", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    2000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    2000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer.call(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.rejected

            ])
        })

        it("should return funds to buyer when accepted offer is revoked", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer.call(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.eventually.equal(true),

                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                /* Revoking the offer */
                async(market.revokeOffer(
                    tradeable.address,  // item address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Asserting that the money was paid back to the buyer */
                asyncInt(token.balanceOf(buyer))
                .should.eventually.equal(1000),

                /* and redrawn from the market */
                asyncInt(token.balanceOf(
                    market.address      // market address
                )).should.eventually.equal(0)

            ])
        })

        it("should be possible to completeTransaction", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.completeTransaction.call(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.eventually.equal(true),

                async(market.completeTransaction(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.fulfilled,

                /* Asserting that the event was fired */
                asyncEvent(market.BuyerCompletedTransaction(
                    {fromBlock: "latest"}
                )).then(e => e.args["item"])
                .should.eventually.equal(tradeable.address),

                /* Asserting that the transaction was successful */
                asyncInt(token.balanceOf.call(
                    owner               // owners addressd
                )).should.eventually.equal(1000),

                asyncInt(token.balanceOf.call(
                    market.address      // market address
                )).should.eventually.equal(0),

                async(tradeable.owner.call())
                .should.eventually.equal(buyer),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[0]).should.eventually.equal(none),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[3].toNumber()).should.eventually.equal(0)

            ])
        })

        it("should not be possible to completeTransaction if not buyer", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.completeTransaction.call(
                    tradeable.address,  // item address
                    {from: owner}       // buyers address
                )).should.be.rejected,

            ])
        })

        it("should not be possible to completeTransaction twice", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.completeTransaction(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.fulfilled,

                /* Completing the transaction again */
                async(market.completeTransaction.call(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.rejected
            ])
        })
        it("should not be possible to completeTransaction if offer not accepted", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.completeTransaction.call(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.eventually.equal(false),

                async(market.completeTransaction(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.fulfilled,

                /* Asserting that the transaction was not successful */
                asyncInt(token.balanceOf.call(
                    owner               // owners addressd
                )).should.eventually.equal(0),

                asyncInt(token.balanceOf.call(
                    market.address      // market address
                )).should.eventually.equal(0),

                asyncInt(token.balanceOf.call(
                    buyer               // market address
                )).should.eventually.equal(1000),

                async(tradeable.owner.call())
                .should.eventually.equal(owner)

            ])
        })

        it("should not be possible to completeTransaction if no offer extended", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.completeTransaction(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.rejected,

                /* Asserting that the transaction was not successful */
                asyncInt(token.balanceOf.call(
                    owner               // owners addressd
                )).should.eventually.equal(0),

                asyncInt(token.balanceOf.call(
                    market.address      // market address
                )).should.eventually.equal(0),

                asyncInt(token.balanceOf.call(
                    buyer               // market address
                )).should.eventually.equal(1000),

                async(tradeable.owner.call())
                .should.eventually.equal(owner)

            ])
        })

        it("should be possible to abortTransaction", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.abortTransaction.call(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.eventually.equal(true),

                async(market.abortTransaction(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.fulfilled,

                /* Asserting that the transaction was successful */
                asyncInt(token.balanceOf.call(
                    owner               // owners addressd
                )).should.eventually.equal(0),

                asyncInt(token.balanceOf.call(
                    market.address      // market address
                )).should.eventually.equal(0),

                asyncInt(token.balanceOf.call(
                    buyer               // buyers address
                )).should.eventually.equal(1000),

                async(tradeable.owner.call())
                .should.eventually.equal(owner),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[0]).should.eventually.equal(none),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[3].toNumber()).should.eventually.equal(0)

            ])
        })

        it("should not be possible to abortTransaction if not buyer", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.abortTransaction.call(
                    tradeable.address,  // item address
                    {from: owner}       // buyers address
                )).should.be.rejected

            ])
        })

        it("should not be possible to abortTransaction twice", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Accepting the offer */
                async(market.acceptOffer(
                    tradeable.address,  // item address
                    {from: buyer}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.abortTransaction(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.fulfilled,

                /* Completing the transaction again */
                async(market.abortTransaction.call(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.rejected
            ])
        })

        it("should not be possible to abortTransaction if offer not extend", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.abortTransaction(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.rejected,

            ])
        })

        it("should not be possible to abortTransaction if not accepted", () => {
            return Promise.all([

                /* Allowing the market to withdraw funds from the buyer */
                async(token.approve(
                    market.address,     // market address
                    1000,               // purchase amount
                    {from: buyer}       // executor
                )),

                /* Setting up the offer */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // purchase amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                /* Completing the transaction */
                async(market.abortTransaction.call(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.eventually.equal(false),

                async(market.abortTransaction(
                    tradeable.address,  // item address
                    {from: buyer}       // buyers address
                )).should.be.fulfilled,

                /* Asserting that the transaction was successful */
                asyncInt(token.balanceOf.call(
                    owner               // owners addressd
                )).should.eventually.equal(0),

                asyncInt(token.balanceOf.call(
                    market.address      // market address
                )).should.eventually.equal(0),

                asyncInt(token.balanceOf.call(
                    buyer               // buyers address
                )).should.eventually.equal(1000),

                async(tradeable.owner.call())
                .should.eventually.equal(owner),

                async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[0]).should.eventually.equal(owner),

                 async(market.offers.call(
                    tradeable.address   // item address
                )).then(o => o[3].toNumber()).should.eventually.equal(1)

            ])
        })
    })
})

contract("IndexedMarketplace", accounts => {

    let token;
    let initialAmount = 1000;

    let owner = accounts[0];
    let buyer = accounts[1];
    let none = "0x0000000000000000000000000000000000000000";

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
            return async(IndexedMarketplace.new(token.address))
                .should.be.fulfilled;
        })
    })

    describe("Public methods", () => {

        let market;
        let tradeable;

        beforeEach(() => {
            return Promise.all([

                async(IndexedMarketplace.new(token.address))
                .then(i => market = i),

                async(Tradeable.new({from: owner})
                    .then(i => tradeable = i))

            ]);
        })

        it("should increase the number of offered items when offer extended", () => {
            return Promise.all([

                asyncInt(market.getNumberOfItemsOffered())
                .should.eventually.equal(0),

                /* Allowing tradable to sold on market */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                asyncInt(market.getNumberOfItemsOffered())
                .should.eventually.equal(1)

            ])
        })

        it("should decrease the number of offered items when offer extended", () => {
            return Promise.all([


                /* Allowing tradable to sold on market */
                async(tradeable.authorizeSeller(
                    market.address,     // market address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                async(market.extendOffer(
                    tradeable.address,  // item address
                    buyer,              // buyers address
                    1000,               // amount
                    {from: owner}       // executor
                )).should.be.fulfilled,

                asyncInt(market.getNumberOfItemsOffered())
                .should.eventually.equal(1),

                async(market.revokeOffer(
                    tradeable.address,  // item address
                    {from: owner}       // executor
                )).should.be.fulfilled,

                asyncInt(market.getNumberOfItemsOffered())
                .should.eventually.equal(0)

            ])
        })

    })
})
// vim: cc=90
