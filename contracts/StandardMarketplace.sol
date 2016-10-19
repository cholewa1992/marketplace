import "Token.sol";
import "Marketplace.sol";

contract StandardMarketplace is Marketplace {

    /* Fields */
    address private owner;
    Token public token;

    /* Mappings */
    address[] indexes;
    mapping(address => Offer) public offers; //Tradeable => Offer
    mapping(address => mapping(address => uint)) balance; //Tradeable => Buyer => Balance

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
        addOffer(_item, Offer({ seller: msg.sender, buyer: _buyer, amount: _price, accepted: false}));
        SellerAddedOffer(_item);
        return true;
    }

    function acceptOffer(Tradeable _item) isBuyerOf(_item) returns (bool success) {
        var offer = offers[_item];

        /* Offer can only be accepted once */
        if(offer.accepted) return false;

        if(offer.amount > 0){
            /* Check if the buyer have sufficient funds */
            if(token.allowance(offer.buyer, this) < offer.amount) return false;

            /* Transfer funds from the buyer to the market */
            if(!token.transferFrom(offer.buyer, this, offer.amount)) throw;
            balance[_item][offer.buyer] += offer.amount;
        }

        /* Accept the offer */
        offer.accepted = true;
        BuyerAcceptedOffer(_item);

        return true;
    }

    function revokeOffer(Tradeable _item) isOwnerOf(_item) returns (bool success) {
        var offer = offers[_item];

        if(offer.accepted) {
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
        if(!offer.accepted) return false;

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
        if(!offer.accepted) return false;

        /* transferring all locked funds back to the buyer */
        var amount = balance[_item][offer.buyer];
        balance[_item][offer.buyer] = 0;
        if(!token.transfer(offer.buyer, amount)) throw;


        /* Cancel sale of the item */
        BuyerAbortedTransaction(_item);
        removeOffer(_item, offers[_item]);

        return true;
    }

    function addOffer(Tradeable _item, Offer _offer) private {

        var found = false;
        for(uint i = 0; i < indexes.length; i++){
           if(indexes[i] == address(_item)){
               found = true;
               break;
           }
        }

        if(!found){
            indexes.push(_item);
        }

        offers[_item] = _offer;
    }

    function removeOffer(Tradeable _item, Offer _offer) private {

        for(uint i = 0; i < indexes.length; i++){
            if(indexes[i] == address(_item)) {
                delete indexes[i];
            }
        }

        delete offers[_item];

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

    struct Offer {
        address seller;
        address buyer;
        uint amount; //The purchase cost
        bool accepted; //Whether or not the offer is accepted
    }

    /* Ether can't be transferred to this account */
    function () { throw; }
}
