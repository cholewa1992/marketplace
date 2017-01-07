//import Token from '../../build/contracts/HumanStandardToken.sol.js';
import Web3 from 'web3';
import DMR from '../build/contracts/DMR.sol.js';
import Vehicle from '../build/contracts/Vehicle.sol.js';
import Token from '../build/contracts/HumanStandardToken.sol.js';

let instance = null;

export default class CarStore{

    constructor(){
        if(instance == null) instance = this;
        return instance;
    }

    init(web3) {

        this.cars = {};
        this.allowedToSpend = 0;
        this.changeListeners = [];

        DMR.setProvider(web3.currentProvider);
        Vehicle.setProvider(web3.currentProvider);
        Token.setProvider(web3.currentProvider);

        this.web3 = web3;
        this.dmr = DMR.deployed();
        this.token = Token.deployed();
        this.acc = web3.eth.defaultAccount;
        this.gas = 3400000;


        if(this.acc === undefined)
            this.acc = web3.eth.defaultAccount = web3.eth.accounts[0];

        console.log(this.web3.eth.getBlock("latest"));

        //this.isAccount = Web3.isAccount;
        this.nullAddress = "0x0000000000000000000000000000000000000000";


        this.isAddress = function (address) {
            if (!/^(0x)?[0-9a-f]{40}$/i.test(address)) {
                // check if it has the basic requirements of an address
                return false;
            } else if (/^(0x)?[0-9a-f]{40}$/.test(address) || /^(0x)?[0-9A-F]{40}$/.test(address)) {
                // If it's all small caps or all all caps, return true
                return true;
            } else {
                // Otherwise check each case
                return isChecksumAddress(address);
            }
        };

        /**
         * Checks if the given string is a checksummed address
         *
         * @method isChecksumAddress
         * @param {String} address the given HEX adress
         * @return {Boolean}
         */
        var isChecksumAddress = function (address) {
            // Check each case
            address = address.replace('0x','');
            var addressHash = web3.sha3(address.toLowerCase());
            for (var i = 0; i < 40; i++ ) {
                // the nth letter should be uppercase if the nth digit of casemap is 1
                if ((parseInt(addressHash[i], 16) > 7 && address[i].toUpperCase() !== address[i]) || (parseInt(addressHash[i], 16) <= 7 && address[i].toLowerCase() !== address[i])) {
                    return false;
                }
            }
            return true;
        };

        if(this.acc === undefined)
            this.acc = web3.eth.defaultAccount =  web3.eth.accounts[1];

        Promise.all([
            this.fetchAllCars(),
            this.fetchOfferedCars(),
            this.checkAllowance()
        ]).then(() => {
            this.dmr.BuyerAcceptedOffer({fromBlock: "latest"}).watch((err,e) => {
                this.fetchCar(e.args["item"]).then(() => this.notifyChange());
            });

            this.dmr.SellerAddedOffer({fromBlock: "latest"}).watch((err,e) => {
                this.fetchCar(e.args["item"]).then(() => this.notifyChange());
            });

            this.dmr.SellerRevokedOffer({fromBlock: "latest"}).watch((err,e) => {
                this.fetchCar(e.args["item"]).then(() => this.notifyChange());
            });

            this.dmr.BuyerCompletedTransaction({fromBlock: "latest"}).watch((err,e) => {
                this.fetchCar(e.args["item"]).then(() => this.notifyChange());
            });

            this.token.Approval({fromBlock: "latest"}).watch((err,e) => {
                this.checkAllowance().then(() => this.notifyChange());
            });

        });
    }

    resolveState(i){
        if(i === 1) return 'extended';
        if(i === 2) return 'accepted';
        return 'initial';
    }

    fetchAllCars() {
        return this.dmr.getVehiclesOwnedBy(this.acc).then(cars => {
            let arr = [];

            cars.forEach(car => {
                arr.push(this.fetchCar(car));
            })

            Promise.all(arr).then(() => {
                this.notifyChange();
            })
        })
    }

    issueVehicle(vin, brand, model, year, color) {
        console.log("ok!");
        return this.dmr.issueVehicle(
            vin,
            brand,
            model,
            year,
            color,
            { from: this.acc, gas: this.gas }
        ).catch(err => console.log(err));
    }

    fetchCar(address) {
        return Promise.all([
            address,
            Vehicle.at(address).vin.call(),
            Vehicle.at(address).owner.call(),
            this.dmr.offers.call(address),
            this.isMarketAuthorized(address),
            Vehicle.at(address).brand.call(),
            Vehicle.at(address).model.call(),
            Vehicle.at(address).year.call(),
            Vehicle.at(address).color.call()
        ]).then(car => {
            let r = ({
                brand: car[5],
                model: car[6], 
                year: car[7],
                color: car[8],
                address: car[0],
                authorized: car[4],
                vin: car[1],
                owner: car[2],
                buyer: car[3][1],
                amount: car[3][2].toNumber(),
                state: this.resolveState(car[3][3].toNumber())
            })
            this.cars[r.vin] = r;
        });
    }

    fetchOfferedCars() {
        return this.dmr.getItemsOfferedTo(this.acc).then(cars => {
            let arr = [];

            cars.forEach(car => {
                arr.push(this.fetchCar(car));
            })

            Promise.all(arr).then(() => {
                this.notifyChange();
            })
        })
    }

    extendOffer(car, buyer, amount) {
        console.log(amount);
        return this.dmr.extendOffer(
            car,
            buyer,
            amount,
            { from: this.acc, gas: this.gas }
        );
    }

    isMarketAuthorized(car) {
        return Vehicle.at(car).isAuthorizedToSell(this.dmr.address);
    }

    authorizeMarket(car) {
        return Vehicle.at(car).authorizeSeller(this.dmr.address, { from: this.acc, gas: this.gas });
    }

    checkAllowance() {
        return  this.token.allowance(this.acc, this.dmr.address)
            .then(r => r.toNumber())
            .then(a => this.allowedToSpend = a);
    }

    balance() {
        return this.token.balanceOf(this.acc).then(r => r.toNumber());
    }

    allowSpending(amount) {
        return this.token.approve(this.dmr.address, amount , { from: this.acc, gas: this.gas });
    }

    tokenSymbol() {
        return this.token.symbol.call();
    }

    revokeOffer(car) {
        return this.dmr.revokeOffer(car, { from: this.acc, gas: this.gas });
    }

    acceptOffer(car) {
        return this.dmr.acceptOffer(car, { from: this.acc, gas: this.gas });
    }

    completeTransaction(car) {
        return this.dmr.completeTransaction(car, { from: this.acc, gas: this.gas });
    }

    abortTransaction(car) {
        console.log(car);
        console.log(this.acc);
        return this.dmr.abortTransaction(car, { from: this.acc, gas: this.gas });
    }


    getCar(id) {
        return this.cars[id];
    }

    getCars() {
        const array = []

        for (const id in this.cars)
            array.push(this.cars[id])

        return array
    }

    isVinValid(vin){
        function transliterate (c) {
            return '0123456789.ABCDEFGH..JKLMN.P.R..STUVWXYZ'.indexOf(c) % 10;
        }

        function get_check_digit (vin) {
            var map = '0123456789X';
            var weights = '8765432X098765432';
            var sum = 0;
            for (var i = 0; i < 17; ++i)
                sum += transliterate(vin[i]) * map.indexOf(weights[i]);
            return map[sum % 11];
        }

        function validate (vin) {
            if (vin.length !== 17) return false;
            return get_check_digit(vin) === vin[8];
        }

        return validate(vin);
    }

    isVinRegistered(vin) {
        return this.dmr.isVinRegistered(vin);

    }

    notifyChange() {
        this.changeListeners.forEach(function (listener) {
            listener()
        })
    }

    addChangeListener(listener) {
        this.changeListeners.push(listener)
    }

    removeChangeListener(listener) {
        this.changeListeners = this.changeListeners.filter(function (l) {
            return listener !== l
        })
    }
}
