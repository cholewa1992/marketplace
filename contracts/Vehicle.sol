pragma solidity ^0.4.0;
import "Tradeable.sol";

contract Vehicle is Tradeable {

    string public vin;
    address public issuer;

    function Vehicle(string _vin) {
        issuer = msg.sender;
        vin = _vin;
    }

    function onTransferOwnership(address _newOwner) internal {

    }
}


