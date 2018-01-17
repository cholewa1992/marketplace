pragma solidity ^0.4.4;
import "Owned.sol";

contract Tradeable is Owned {

    /* Fields */
    address private seller;

    event SellerWasAuthorized(address addr);

    /* Modifiers */
    modifier isSellerOrOwner() { if(msg.sender == seller || msg.sender == owner) _; else throw; }

    /* Methods */
    function authorizeSeller(address _seller) public isOwner {
        seller = _seller;
    }

    function isAuthorizedToSell(address _seller) constant returns (bool success) {
        return seller == _seller;
    }

    function transferOwnership(address _newOwner) isSellerOrOwner {
        owner = _newOwner;
        seller = address(0x0);
        onTransferOwnership(_newOwner);
    }

    function onTransferOwnership(address _newOwner) internal {}
}





