import Web3 from 'web3';
import Token from '../../build/contracts/HumanStandardToken.sol.js';
import Market from '../../build/contracts/IndexedMarketplace.sol.js';
import DMR from '../../build/contracts/DMR.sol.js';
import Vehicle from '../../build/contracts/Vehicle.sol.js';

class EthWrapper {

    constructor(){
        
        if(typeof web3 !== 'undefined') {
            console.info('Web3 already initialized, re-using provider.');
            this.web3 = new Web3(web3.currentProvider);
        } else {
            console.info('Web3 not yet initialized, doing so now with HttpProvider.');
            this.web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
        }

        this.isConnected = this.web3.isConnected;
        this.acc = () => this.web3.eth.defaultAccount = this.web3.eth.accounts[0];
        this.nullAddress = "0x0000000000000000000000000000000000000000";
        this.isAddress = this.web3.isAddress;

        Vehicle.setProvider(this.web3.currentProvider);
        Token.setProvider(this.web3.currentProvider);
        DMR.setProvider(this.web3.currentProvider);
        Market.setProvider(this.web3.currentProvider);
    }
}

let Eth = new EthWrapper();

export { Eth, Token, Market, DMR, Vehicle }









