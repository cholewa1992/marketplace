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

    string public plate;
    address public issuer;

    function Vehicle(string _plate) {
        issuer = msg.sender;
        plate = _plate;
    }
}

contract DMR  {

    event VehicleIssued(address addr);

    address[] private vehicles;
    mapping(string => address) private index;

    function issueVehicle(string _plate) returns(address) {

        /* Check of the plate number is already in use */
        if(index[_plate] != address(0x0)) throw;

        /* Creating the new vehicle */
        var vehicle = new Vehicle(_plate);

        /* Transferring the ownership to caller */
        vehicle.transferOwnership(msg.sender);

        /* Registering the car */
        vehicles.push(address(vehicle));
        index[_plate] = address(vehicle);

        /* Fireing event */
        VehicleIssued(address(vehicle));
        return address(vehicle);
    }

    /* Search for registered vehicles */
    function lookup(string _plate) constant returns(address){
        return index[_plate];
    }

    /* Get a complete list of all vehicles */
    function getVehicles() constant returns(address[]){
        return vehicles;
    }

    /* Maybe it is more efficient to return all data and then filtering it? */
    function getVehiclesOwnedBy(address _addr) constant returns(address[]){

        var index = 0;
        address[] memory cars = new address[](2);
        for(uint i = 0; i < vehicles.length; i++){
            if(Vehicle(vehicles[i]).owner() == _addr){

                /* Fuck langauges without dynamic lists... */
                if(index == cars.length){
                    address[] memory n = new address[](cars.length * 2);
                    for(uint j = 0; j < cars.length; j++){
                        n[j] = cars[j];
                    }
                    cars = n;
                }

                cars[index] = vehicles[i];

                index++;
            }
        }

        address[] memory result = new address[](index);

        for(uint k = 0; k < index; k++){
            result[k] = cars[k];
        }

        return result;
    }
}
