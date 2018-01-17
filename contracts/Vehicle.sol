pragma solidity ^0.4.4;
import "Tradeable.sol";

contract Vehicle is Tradeable {

    string public vin;
    address public issuer;
    string public brand;
    string public model;
    string public year;
    string public color;

    function Vehicle(string _vin, string _brand, string _model, string _year, string _color) {
        issuer = msg.sender;
        vin = _vin;
        brand = _brand;
        model = _model;
        year = _year;
        color = _color;
    }

    function onTransferOwnership(address _newOwner) internal {

    }
}


