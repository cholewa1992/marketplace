pragma solidity ^0.4.0;
import "Owned.sol";

contract Tradeable is Owned {

    /* Fields */
    address private market;

    /* Modifiers */
    modifier isMarket() { if(msg.sender == market) _; else throw; }
    modifier isMarketOrOwner() { if(msg.sender == market || msg.sender == owner) _; else throw; }

    /* Methods */
    function authorizeMarket(address _market) public isOwner {
        market = _market;
    }

    function isAuthorizedToSell(address _market) public returns (bool success) {
        return market == _market;
    }

    function transferOwnership(address _newOwner) isMarketOrOwner {
        owner = _newOwner;
    }
}





