pragma solidity ^0.4.0;
contract Owned {

    address public owner;

    function Owned() {
        owner = msg.sender;
    }

    modifier isOwner {
        if (msg.sender == owner) _; else throw;
    }

    function transferOwnership(address _newOwner) isOwner {
        owner = _newOwner;
    }
}
