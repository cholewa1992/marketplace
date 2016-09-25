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
