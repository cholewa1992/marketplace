pragma solidity ^0.4.0;
import "StandardMarketplace.sol";

contract IndexedMarketplace is StandardMarketplace {

    address[] private indexes;

    function IndexedMarketplace(Token _token) StandardMarketplace(_token) {

    }

    function onOfferAdded(Tradeable _item, Offer _offer) internal {

        int256 index = -1;  // Index of the item
        int256 free = -1;   // Index of first free slot in indexes

        for(uint i = 0; i < indexes.length; i++){

            if(indexes[i] == address(0x0) && free < 0){
                free = int256(i);
            }

            if(indexes[i] == address(_item)){
                index = int256(i);
                break;
            }

        }

        if(index < 0){
            if(free < 0) {
                indexes.push(_item);
            } else {
                indexes[uint256(free)] = _item;
            }
        }
    }

    function onOfferRemoved(Tradeable _item, Offer _offer) internal {

        for(uint i = 0; i < indexes.length; i++){
            if(indexes[i] == address(_item)) {
                delete indexes[i];
            }
        }
    }

    function getNumberOfItemsOffered() constant returns(uint){

        var size = 0;

        for(uint i = 0; i < indexes.length; i++){
            if(indexes[i] != address(0x0)){
                size++;
            }
        }

        return size;
    }

    function getItemsOfferedTo(address _addr) constant returns(address[]){

        var index = 0;
        address[] memory items = new address[](2);
        for(uint i = 0; i < indexes.length; i++){
            if(offers[indexes[i]].buyer == _addr){
                if(index == items.length){
                    address[] memory n = new address[](items.length * 2);
                    for(uint j = 0; j < items.length; j++){
                        n[j] = items[j];
                    }
                    delete items;
                    items = n;
                }

                items[index] = indexes[i];
                index++;
            }
        }

        address[] memory result = new address[](index);

        for(uint k = 0; k < index; k++){
            result[k] = items[k];
        }
        return result;
    }

}
