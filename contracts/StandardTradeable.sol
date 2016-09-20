import "Token.sol";
import "Tradeable.sol";

contract StandardTradeable is Tradeable {

    modifier isOwner() { if(msg.sender == owner) _ else throw; }
    modifier isMarket() { if(msg.sender == market) _ else throw; }

    function authorizeMarket(address _market) returns (bool success){
        market = _market;
        return true;
    }

    function isAuthorizedToSell(address _market) public returns (bool success) {
        return market == _market;
    }

    function transferOwnership(address _to) isMarket returns (bool success) {
        owner = _to;
        return true;
    }

    /* Ether can't be transferred to this account */
    function () { throw; }
}
