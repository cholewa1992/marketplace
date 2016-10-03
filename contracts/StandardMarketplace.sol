import "Token.sol";
import "Marketplace.sol";

contract StandardMarketplace is Marketplace {

    /* Fields */
    address private owner;
    Token public token;

    /* Mappings */
    mapping(address => Offer) public offers; //Tradeable => Offer
    mapping(address => mapping(address => uint)) balance; //Tradeable => Buyer => Balance
    mapping(address => address[]) buyer; //Buyer => Tradeables

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
        offers[_item] = Offer({ seller: msg.sender, buyer: _buyer, amount: _price, accepted: false});
        buyer[_buyer].push(_item);
        SellerAddedOffer(_item);
        return true;
    }

    function acceptOffer(Tradeable _item) isBuyerOf(_item) returns (bool success) {
        var offer = offers[_item];

        /* Offer can only be accepted once */
        if(offer.accepted) return false;

        /* Check if the buyer have sufficient funds */
        if(token.allowance(offer.buyer, this) < offer.amount) return false;

        /* Transfer funds from the buyer to the market */
        if(!token.transferFrom(offer.buyer, this, offer.amount)) throw;
        balance[_item][offer.buyer] += offer.amount;

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
        delete offers[_item];

        return true;
    }

    function completeTransaction(Tradeable _item) isBuyerOf(_item)
    returns (bool success) {

        /* Getting the offer */
        var offer = offers[_item];

        /* Can only complete the transaction if the offer was accepted */
        if(!offer.accepted) return false;

        /* The buyer must have sufficient funds */
        if(balance[_item][offer.buyer] < offer.amount) return false;

        /* Transferring funds to the seller */
        balance[_item][offer.buyer] -= offer.amount;
        if(!token.transfer(offer.seller, offer.amount)) throw;

        /* Transferring ownership to the buyer */
        _item.transferOwnership(offer.buyer);
        BuyerCompletedTransaction(_item);

        delete offers[_item];
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
        delete offers[_item];

        return true;
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
