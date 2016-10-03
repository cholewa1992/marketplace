/* React import */
import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

/* Ethereum web3 library */
import Web3 from 'web3'

/* Contracts */
import Token from '../../build/contracts/HumanStandardToken.sol.js';
import Market from '../../build/contracts/StandardMarketplace.sol.js';
import DMR from '../../build/contracts/DMR.sol.js';
import Vehicle from '../../build/contracts/Vehicle.sol.js';

var web3;
var sequence = arr => arr.reduce((p, fn) => p.then(fn), Promise.resolve());
var all = arr => Promise.all(arr);

class App extends Component {

    constructor(props){
        super(props)
        this.state = {
            balance: "Updating...",
            allowance: "Updating...",
            cars: "Updating..."
        }
    }

    componentWillMount() {

        if (typeof web3 !== 'undefined') {
            web3 = new Web3(web3.currentProvider);
        } else {
            // set the provider you want from Web3.providers
            web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
        }

        Vehicle.setProvider(web3.currentProvider);
        Token.setProvider(web3.currentProvider);
        DMR.setProvider(web3.currentProvider);
        Market.setProvider(web3.currentProvider);

        var acc = web3.eth.coinbase;
        var token = Token.deployed();
        var dmr = DMR.deployed();
        var market = Market.deployed();

        token.balanceOf.call(acc).then(i => {
            this.setState({
                balance: i.toNumber()
            });
        })

        /* Function for displaying the number of cars */
        let updateCars = () => dmr.getVehicles().then(arr => this.setState({
            cars: arr.length
        }));

        dmr.issueVehicle("Car" + Math.random(), { from:  acc });
        updateCars();
        dmr.VehicleIssued().watch(() => updateCars());
        dmr.lookup("BMW 330d").then(car => console.log(car));

    }

render() {
    return (
        <div className="App">
        <div className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
        To get started, edit <code>src/App.js</code> and save to reload.
        </p>
        <p>
        Balance is {this.state.balance}
        </p>
        <p>
        Allowance is {this.state.allowance}
        </p>
        <p>
        Cars: {String(this.state.cars)}
        </p>
        </div>
    );
}
}

export default App;
