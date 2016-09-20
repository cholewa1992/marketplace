module.exports = function(deployer) {
  deployer.deploy(StandardTradeable);
  deployer.autolink();
  deployer.deploy(StandardMarketplace);
};
