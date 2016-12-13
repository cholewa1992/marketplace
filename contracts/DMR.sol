pragma solidity ^0.4.0;
import "Vehicle.sol";
import "IndexedMarketplace.sol";

contract DMR is IndexedMarketplace {

    event VehicleIssued(address addr);

    address[] private vehicles;
    uint private lastPlate = 0;
    mapping(string => address) private index;
    mapping(uint => address) private licensePlates;

    function DMR(Token _token) IndexedMarketplace(_token) { }

    function issueVehicle(string _vin) returns(address) {

        /* Check of the plate number is already in use */
        if(index[_vin] != address(0x0)) throw;

        /* Creating the new vehicle */
        var vehicle = new Vehicle(_vin);

        /* Transferring the ownership to caller */
        vehicle.transferOwnership(msg.sender);

        /* Registering the car */
        vehicles.push(address(vehicle));
        index[_vin] = address(vehicle);
        lastPlate = lastPlate + 1;
        licensePlates[lastPlate] = address(vehicle);

        /* Fireing event */
        VehicleIssued(address(vehicle));
        return address(vehicle);
    }

    /* Search for registered vehicles */
    function lookup(uint _plate) constant returns(address){
        return licensePlates[_plate];
    }

    function isVinRegistered(string _vin) constant returns(bool) {
        return index[_vin] != address(0x0);
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
