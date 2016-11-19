import Web3 from 'web3';
import React from 'react';
import ReactDOM from 'react-dom';
import Routes from './Routes';
import './index.css';
import CarStore from './CarStore';
declare var web3;

window.addEventListener('load', function() {

    var web3Provided;
    if (typeof web3 !== 'undefined') {
        web3Provided = new Web3(web3.currentProvider);
    } else {
        web3Provided = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'))
    }

    new CarStore().init(web3Provided);

    ReactDOM.render(
        <Routes/>,
        document.getElementById('root')
    )
});
