import "Token.sol";
import "Tradeable.sol";

contract Marketplace {

    function extendOffer(Tradeable _item, address _buyer, uint price) returns (bool success);
    function revokeOffer(Tradeable _item) returns (bool success);
    function acceptOffer(Tradeable _item) returns (bool success);
    function completeTransaction(Tradeable _item) returns (bool success);
    function abortTransaction(Tradeable _item) returns (bool success);

    event BuyerAcceptedOffer(address item);
    event SellerAddedOffer(address item);
    event SellerRevokedOffer(address item);
    event BuyerCompletedTransaction(address item);
    event BuyerAbortedTransaction(address item);

}

contract StandardMarketplace is Marketplace {

    /* Fields */
    address private owner;
    Token public token;

    /* Mappings */
    mapping(address => Offer) public offers; //Tradeable => Offer
    mapping(address => mapping(address => uint)) private balance; //Tradeable => Buyer => Balance

    /* Modifiers */
    modifier isBuyerOf(Tradeable _item) { if(offers[_item].buyer == msg.sender) _ else throw; }
    modifier isOwnerOf(Tradeable _item) { if(msg.sender == _item.owner()) _ else throw; }
    modifier isAuthorizedToSell(Tradeable _item) { if(_item.isAuthorizedToSell(this)) _ else throw; }

    function StandardMarketplace(Token _token) {
        token = _token;
        if(token.totalSupply() <= 0) throw; //This seams to be an invalid contract
        if(token.balanceOf(this) != 0) throw;
    }

    function extendOffer(Tradeable _item, address _buyer, uint _price)
    isOwnerOf(_item)
    isAuthorizedToSell(_item)
    returns (bool success) {
        addOffer(_item, Offer({ seller: msg.sender, buyer: _buyer, amount: _price, state: OfferStates.Extended}));
        SellerAddedOffer(_item);
        return true;
    }

    function acceptOffer(Tradeable _item) isBuyerOf(_item) returns (bool success) {
        var offer = offers[_item];

        /* Offer can only be accepted once */
        if(offer.state != OfferStates.Extended) return false;

        if(offer.amount > 0){
            /* Check if the buyer have sufficient funds */
            if(token.allowance(offer.buyer, this) < offer.amount) return false;

            /* Transfer funds from the buyer to the market */
            if(!token.transferFrom(offer.buyer, this, offer.amount)) throw;
            balance[_item][offer.buyer] += offer.amount;
        }

        /* Accept the offer */
        offer.state = OfferStates.Accepted;
        BuyerAcceptedOffer(_item);

        return true;
    }

    function revokeOffer(Tradeable _item) isOwnerOf(_item) returns (bool success) {
        var offer = offers[_item];

        if(offer.state == OfferStates.Accepted) { 
            /* transferring all locked funds back to the buyer */
            var amount = balance[_item][offer.buyer];
            balance[_item][offer.buyer] = 0;
            if(!token.transfer(offer.buyer, amount)) throw;
        }

        /* Revoke offer */
        SellerRevokedOffer(_item);
        removeOffer(_item, offers[_item]);

        return true;
    }

    function completeTransaction(Tradeable _item) isBuyerOf(_item)
    returns (bool success) {

        /* Getting the offer */
        var offer = offers[_item];

        /* Can only complete the transaction if the offer was accepted */
        if(offer.state != OfferStates.Accepted) return false;

        if(offer.amount > 0){
            /* The buyer must have sufficient funds */
            if(balance[_item][offer.buyer] < offer.amount) return false;

            /* Transferring funds to the seller */
            balance[_item][offer.buyer] -= offer.amount;
            if(!token.transfer(offer.seller, offer.amount)) throw;
        }

        /* Transferring ownership to the buyer */
        _item.transferOwnership(offer.buyer);
        BuyerCompletedTransaction(_item);

        removeOffer(_item, offers[_item]);
        return true;
    }

    function abortTransaction(Tradeable _item) isBuyerOf(_item) returns (bool success) {

        /* Getting the offer */
        var offer = offers[_item];

        /* Can only abort the transaction if the offer was accepted */
        if(offer.state != OfferStates.Accepted) return false;

        /* Transferring all locked funds back to the buyer */
        var amount = balance[_item][offer.buyer];
        balance[_item][offer.buyer] = 0;
        if(!token.transfer(offer.buyer, amount)) throw;

        /* Cancel sale of the item */
        BuyerAbortedTransaction(_item);
        removeOffer(_item, offers[_item]);

        return true;
    }

    function addOffer(Tradeable _item, Offer _offer) internal {

        offers[_item] = _offer;
    }

    function removeOffer(Tradeable _item, Offer _offer) internal {

        delete offers[_item];

    }

    enum OfferStates { Extended, Accepted }
    struct Offer {
        address seller;
        address buyer;
        uint amount; //The purchase cost
        OfferStates state; //Whether or not the offer is accepted
    }

    /* Ether can't be transferred to this account */
    function () { throw; }
}


contract IndexedMarketplace is StandardMarketplace {

    address[] private indexes;

    function IndexedMarketplace(Token _token) StandardMarketplace(_token) {

    }

    function addOffer(Tradeable _item, Offer _offer) internal {

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

        super.addOffer(_item,_offer);

    }

    function removeOffer(Tradeable _item, Offer _offer) internal {

        for(uint i = 0; i < indexes.length; i++){
            if(indexes[i] == address(_item)) {
                delete indexes[i];
            }
        }

        super.removeOffer(_item,_offer);

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
