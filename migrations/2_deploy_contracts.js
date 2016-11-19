module.exports = function(deployer) {

    deployer.deploy(HumanStandardToken, 1000000, "Danske Kroner", 0, "DKK").then(function() {
        return deployer.deploy(IndexedMarketplace, HumanStandardToken.address);
    });

    deployer.autolink();
    deployer.deploy(DMR);

};
