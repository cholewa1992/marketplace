pragma solidity ^0.4.0;
import "Owned.sol";

contract Tradeable is Owned {

    /* Fields */
    address private seller;

    event SellerWasAuthorized(address addr);

    /* Modifiers */
    modifier isMarket() { if(msg.sender == seller) _; else throw; }
    modifier isMarketOrOwner() { if(msg.sender == seller || msg.sender == owner) _; else throw; }

    /* Methods */
    function authorizeMarket(address _seller) public isOwner {
        seller = _seller;
    }

    function isAuthorizedToSell(address _seller) constant returns (bool success) {
        return seller == _seller;
    }

    function transferOwnership(address _newOwner) isMarketOrOwner {
        owner = _newOwner;
    }
}





