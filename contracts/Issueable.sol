import "Ownable.sol";

/* Observer */
contract Issuer { function ownershipChanged(Ownable item); }

/* Observable */
contract Issueable is Ownable {

	Issuer public issuer;

	function Issueable(Issuer _issuer){
		issuer = _issuer;
		transferOwnership(_issuer);
	}

	function transferOwnership(address _newOwner) public returns(bool success){
		issuer.ownershipChanged(this);
	}
}

