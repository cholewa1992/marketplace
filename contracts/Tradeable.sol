import "Ownable.sol";

contract Tradeable is Ownable {

    address internal market;
    function authorizeMarket(address _market) public returns (bool success); 
    function isAuthorizedToSell(address _market) public returns (bool success);
	
}
