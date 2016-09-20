contract Ownable {
	address public owner;
	function transferOwnership(address _newOwner) public returns(bool success);
	event OwnershipChanged(address _oldOwner, address _newOwner);
}
