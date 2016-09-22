contract Owned {

    address public owner;

    function Owned() {
        owner = msg.sender;
    }

    modifier isOwner {
        if (msg.sender != owner) throw;
        _
    }

    function transferOwnership(address _newOwner) isOwner {
        owner = _newOwner;
    }

}

contract Tradeable is Owned {

    /* Fields */
    address private market;

    /* Modifiers */
    modifier isMarket() { if(msg.sender == market) _ else throw; }
    modifier isMarketOrOwner() { if(msg.sender == market || msg.sender == owner) _ else throw; }

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


contract Vehicle is Tradeable {

    string public name;

    function Vehicle(DMR _dmr) {

    }
}

contract DMR  {

    function issueVehicle(string _name) returns(Vehicle issued) {
        var vehicle = new Vehicle(this);
        vehicle.transferOwnership(msg.sender);
        return vehicle;
    }

}
