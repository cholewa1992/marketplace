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

contract("HumanStandardToken", accounts => {

    let initialAmount = 1000;

    describe("Initiate", () => {
        it("should be possible to create new instance", () => {
            return async(HumanStandardToken.new(
                initialAmount,          //Initial amount of coins
                "Test token",           //Name of the token
                0,                      //Number of decimal points
                "tt",                   //Token symbol
                {from: accounts[0]}     //Executing account
            )).should.be.fulfilled;
        });
    })

    describe("Public methods", () => {

        let token;

        beforeEach(() => {
            return async(HumanStandardToken.new(
                initialAmount,          //Initial amount of coins
                "Test token",           //Name of the token
                0,                      //Number of decimal points
                "tt",                   //Token symbol
                {from: accounts[0]}     //Executing account
            )).then(i => token = i).should.be.fulfilled;
        });

        it("should have transfered initial supply to initiator", () => {
            return asyncInt(token.balanceOf.call(accounts[0]))
                .should.eventually.equal(initialAmount);
        })

        it("should have correct correct total supply", () => {
            return asyncInt(token.totalSupply.call())
                .should.eventually.equal(initialAmount);
        })

        it("should be possible to transfer", () => {
            return Promise.all([
                async(token.transfer.call(  //Testing that the operations is valid
                    accounts[1],            //Receiver
                    initialAmount,          //Amount
                    {from: accounts[0]}     //Executor
                )).should.eventually.equal(true),

                async(token.transfer(  //Executing the operation
                    accounts[1],            //Receiver
                    initialAmount,          //Amount
                    {from: accounts[0]}     //Executor
                )).should.be.fulfilled,
                asyncInt(token.balanceOf.call(accounts[0])).should.eventually.equal(0),
                asyncInt(token.balanceOf.call(accounts[1])).should.eventually.equal(initialAmount)
            ]);
        })

        it("should not be possible to transfer more than owned", () => {
            return Promise.all([
                async(token.transfer.call(  //Testing that the operations is valid
                    accounts[1],            //Receiver
                    initialAmount * 2,      //Amount
                    {from: accounts[0]}     //Executor
                )).should.eventually.equal(false),

                async(token.transfer(  //Executing the operation
                    accounts[1],            //Receiver
                    initialAmount * 2,      //Amount
                    {from: accounts[0]}     //Executor
                )).should.be.fulfilled,
                asyncInt(token.balanceOf.call(accounts[0])).should.eventually.equal(initialAmount),
                asyncInt(token.balanceOf.call(accounts[1])).should.eventually.equal(0)
            ]);
        })

        it("should not be possible to transferFrom without allowance", () => {
            return async(token.transferFrom.call(
                accounts[0],        //From
                accounts[1],        //To
                initialAmount,      //Amount
                {from: accounts[0]} //Executor
            )).should.eventually.equal(false);
        })

        it("should be possible to transferFrom with allowance", () => {
            return Promise.all([
                async(token.approve.call(
                    accounts[1],        //Spender
                    initialAmount,      //Amount
                    {from: accounts[0]} //Executor
                )).should.eventually.equal(true),

                async(token.approve(
                    accounts[1],        //Spender
                    initialAmount,      //Amount
                    {from: accounts[0]} //Executor
                )).should.be.fulfilled,

                async(token.transferFrom.call(
                    accounts[0],        //From
                    accounts[1],        //To
                    initialAmount,      //Amount
                    {from: accounts[1]} //Executor
                )).should.eventually.equal(true),

                async(token.transferFrom(
                    accounts[0],        //From
                    accounts[1],        //To
                    initialAmount,      //Amount
                    {from: accounts[1]} //Executor
                )).should.be.fulfilled,

                asyncInt(token.balanceOf.call(accounts[0])).should.eventually.equal(0),
                asyncInt(token.balanceOf.call(accounts[1])).should.eventually.equal(initialAmount)
            ]);
        })

        it("should not be possible to transferFrom more than allowed", () => {
            return Promise.all([
                async(token.approve.call(
                    accounts[1],        //Spender
                    initialAmount / 2,  //Amount
                    {from: accounts[0]} //Executor
                )).should.eventually.equal(true),

                async(token.approve(
                    accounts[1],        //Spender
                    initialAmount / 2,  //Amount
                    {from: accounts[0]} //Executor
                )).should.be.fulfilled,

                async(token.transferFrom.call(
                    accounts[0],        //From
                    accounts[1],        //To
                    initialAmount,      //Amount
                    {from: accounts[1]} //Executor
                )).should.eventually.equal(false),

                async(token.transferFrom(
                    accounts[0],        //From
                    accounts[1],        //To
                    initialAmount,      //Amount
                    {from: accounts[1]} //Executor
                )),

                asyncInt(token.balanceOf.call(accounts[0])).should.eventually.equal(initialAmount),
                asyncInt(token.balanceOf.call(accounts[1])).should.eventually.equal(0)
            ]);
        })

        it("should not be possible to transferFrom more than owned", () => {
            return Promise.all([
                async(token.approve.call(
                    accounts[1],        //Spender
                    initialAmount * 2,  //Amount
                    {from: accounts[0]} //Executor
                )).should.eventually.equal(true),

                async(token.approve(
                    accounts[1],        //Spender
                    initialAmount * 2,  //Amount
                    {from: accounts[0]} //Executor
                )).should.be.fulfilled,

                async(token.transferFrom.call(
                    accounts[0],        //From
                    accounts[1],        //To
                    initialAmount * 2,  //Amount
                    {from: accounts[1]} //Executor
                )).should.eventually.equal(false),

                async(token.transferFrom(
                    accounts[0],        //From
                    accounts[1],        //To
                    initialAmount * 2,  //Amount
                    {from: accounts[1]} //Executor
                )),

                asyncInt(token.balanceOf.call(accounts[0])).should.eventually.equal(initialAmount),
                asyncInt(token.balanceOf.call(accounts[1])).should.eventually.equal(0)
            ]);
        })
    })
})

