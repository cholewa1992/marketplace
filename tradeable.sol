import "token.sol";
import "marketplace.sol";

contract Tradeable {
	address public owner; Marketplace public market;
	function makeOffer(address _buyer, uint amount) returns (bool success);
	function setMarket(Marketplace _market) returns (bool success);
	function transferContract(address _to) returns (bool success);
	function cancelSale() returns (bool success);
}

contract StandardTradeable is Tradeable {

	bool private forSale;

	modifier isOwner() { if(msg.sender == owner) _ else throw; }
	modifier isMarket() { if(msg.sender == address(market)) _ else throw; }

	function makeOffer(address _buyer, uint _amount) isOwner returns (bool success) {

		/* Cannot sell things already for sale */
		if(forSale) throw;

		/* Added an offer of sale to the market */
		forSale = market.makeOffer(this, _buyer, _amount);

		return forSale == true;
	}

	function cancelSale() returns (bool success) {

		/* Cannot cancel if not for sale */
		if(!forSale) throw;

		/* Different behavior for market and owner */
		if(msg.sender == owner) forSale = !market.revokeOffer(this);
		else if (msg.sender == address(market)) forSale = false;
		else throw; /* If not owner or market, this action is not allowed */

		return forSale == false;
	}

	function setMarket(Marketplace _market) isOwner returns (bool success) {
		market = _market;
	}

	function transferContract(address _to) isMarket returns (bool success) {
		owner = _to;
		return true;
	}

	/* Don't transfer ether to this account */
	function () { throw; }
}

