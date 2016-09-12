import "tradeable.sol";

contract Marketplace {
    function makeOffer(Tradeable _item, address _buyer, uint price) returns (bool success);
    function revokeOffer(Tradeable _item) returns (bool success);
    function acceptOffer(Tradeable _item) returns (bool success);
    function completeTransaction(Tradeable _item) returns (bool success);
    function abortTransaction(Tradeable _item) returns (bool success);

    event BuyerAcceptedOffer(Tradeable item);
    event SellerAddedOffer(Tradeable item);
    event SellerRevokedOffer(Tradeable item);
    event BuyerCompletedTransaction(Tradeable item);
    event BuyerAbortedTransaction(Tradeable item);
}


contract StandardMarketplace is Marketplace {

    /* Fields */
    address private owner;
    Token public token;

    /* Mappings */
    mapping(address => Offer) offers; //Tradeable => Offer
    mapping(address => mapping(address => uint)) balance; //Tradeable => Buyer => Balance


    /* Modifiers */
    modifier isBuyerOf(Tradeable _item) { if(offers[_item].buyer == msg.sender) _ else throw; }
    modifier onlyBy(address _addr) { if(msg.sender == _addr) _ else throw; }


    function makeOffer(Tradeable _item, address _buyer, uint _price) onlyBy(_item) 
    returns (bool success) {
        offers[_item] = Offer({ seller: _item.owner(), buyer: _buyer, amount: _price });
        SellerAddedOffer(_item);
        return true;
    }

    function acceptOffer(Tradeable _item) isBuyerOf(_item) returns (bool success) {
        var offer = offers[_item];

        /* Check if the buyer have sufficent funds */
        if(token.allowance(msg.sender, this) < offer.amount) throw; 

        /* Transfer funds from the buyer to the market */
        if(!token.transferFrom(offer.buyer, this, offer.amount)) throw; 
        balance[_item][offer.buyer] += offer.amount;

        BuyerAcceptedOffer(_item);
        return true;
    }

    function revokeOffer(Tradeable _item) onlyBy(_item) returns (bool success) {
        SellerRevokedOffer(_item);
        delete offers[_item];
        return true;
    }

    function completeTransaction(Tradeable _item) isBuyerOf(_item) returns (bool success) {

        /* Getting the offer */
        var offer = offers[_item];

        /* The buyer must have sufficient funds */
        if(balance[_item][offer.buyer] < offer.amount) throw; 

        /* Transfering funds to the seller */
        if(!token.transfer(offer.seller, offer.amount)) throw; 
        balance[_item][offer.buyer] -= offer.amount;

        /* Transfering ownership to the buyer */
        if(!_item.transferContract(offer.buyer)) throw;
        BuyerCompletedTransaction(_item);

        delete offers[_item];
        return true;
    }

    function abortTransaction(Tradeable _item) isBuyerOf(_item) returns (bool success) {

        /* Getting the offer */
        var offer = offers[_item];

        /* Transfering all locked funds back to the buyer */
        if(!token.transfer(offer.buyer, balance[_item][offer.buyer])) throw; 
        balance[_item][offer.buyer] = 0;

        /* Cancel sale of the item */
        if(!_item.cancelSale()) throw;
        BuyerAbortedTransaction(_item);
        delete offers[_item];
        return true;
    }

    struct Offer {
        address seller;
        address buyer;
        uint amount;
    }

    /* Ether can't be transferred to this account */
    function () { throw; }
}
