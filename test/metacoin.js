contract('HumanStandardToken', function(accounts) {
    it("should be able to make full sales transaction", function() {

        var token = HumanStandardToken.deployed();
        var market = StandardMarketplace.deployed();
        var dmr = DMR.deployed();
        var car;


        var buyer = accounts[0];
        var seller = accounts[1];

        return token.balanceOf.call(buyer, {from: buyer}).then(function(balance){

            /* checking that the buyers funds are correct */
            assert.equal(balance, 1000000, "buyers balance wasn't 1000000");

        }).then(function(){

            /* Approving a buy on the market for 10000 */
            return token.approve.call(buyer, 10000, {from: buyer}).then(function(success){
                assert.isTrue(success);
                token.approve(market.address, 10000, {from: buyer})
            });

        }).then(function(){

            return token.allowance.call(buyer, market.address, {from: market.address}).then(function(amount){
                assert.equal(amount, 10000, "Allowed amount was not 10000");
            });

        }).then(function(){

            /* Getting vehicle id */
            return dmr.issueVehicle.call("BMW 330d", {from: seller}).then(function(id){

                /* Making the transaction */
                dmr.issueVehicle("BMW 330d", {from: seller});
                car = Vehicle.at(id);

            });

        }).then(function(){

            /* Getting the owner of the car */
            return car.owner.call().then(function(owner){

                /* Checking that the car is issued to the caller */
                assert.equal(owner,seller,"owner of the car was not seller");

            });

        }).then(function(){

            /* Authorizing the market */
            return car.authorizeMarket(market.address, {from: seller});

        }).then(function(){

            /* Checking that extending the offer yields true */
            return market.extendOffer.call(car.address, buyer, 10000, {from: seller}).then(function(success){

                assert.isTrue(success);
                market.extendOffer(car.address, buyer, 10000, {from: seller}); //Making the transaction

            });

        }).then(function(){

            /* Checking that accepting the offer yields true */
            return market.acceptOffer.call(car.address, {from:buyer}).then(function(success){

                assert.isTrue(success);
                market.acceptOffer(car.address, {from:buyer}); //Making the transaction

            });

        }).then(function(){

            /* Checking that buyers balance decreased */
            return token.balanceOf.call(buyer, {from: buyer}).then(function(balance){
                assert.equal(balance, 990000, "buyers balance wasn't 990000");
            });

        }).then(function(){

            /* Checking that markets balance increased */
            return token.balanceOf.call(market.address, {from: market.address}).then(function(balance){
                assert.equal(balance, 10000, "markets balance wasn't 10000");
            });


        }).then(function(){

            /* Checking that completing the transaction yields true */
            return market.completeTransaction.call(car.address, {from:buyer}).then(function(success){
                assert.isTrue(success);
                market.completeTransaction(car.address, {from:buyer}); //Making the transaction
            });

        }).then(function(){

            /* Getting the owner of the car */
            return car.owner.call().then(function(owner){

                /* Checking that the car is issued to the caller */
                assert.equal(owner, buyer, "owner of the car was not buyer");

            });

        }).then(function(){

            /* Checking that sellers balance increased */
            return token.balanceOf.call(seller, {from: seller}).then(function(balance){
                assert.equal(balance, 10000, "sellers balance wasn't 10000");
            });
        });
    });
});
