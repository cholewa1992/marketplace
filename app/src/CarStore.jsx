import { Token, Market, DMR, Vehicle, Eth } from './Contracts';

let _cars = {};
let _initCalled = false
let _changeListeners = []
let dmr = DMR.deployed();
let market = Market.deployed();

const CarStore = {

    init: () => {
        if(_initCalled){
            return;
        }

        Promise.all([
            CarStore.fetchAllCars(),
            CarStore.fetchOfferedCars()
        ]).then(() => {
            market.BuyerAcceptedOffer({fromBlock: "latest"}).watch((err,e) => {
                CarStore.fetchCar(e.args["item"]);
                CarStore.notifyChange()
            });

            market.SellerAddedOffer({fromBlock: "latest"}).watch((err,e) => {
                console.log("event!");
                CarStore.fetchCar(e.args["item"]).then(() => CarStore.notifyChange());
            });

            market.SellerRevokedOffer({fromBlock: "latest"}).watch((err,e) => {
                CarStore.fetchCar(e.args["item"]).then(() => CarStore.notifyChange());
            });

            market.BuyerCompletedTransaction({fromBlock: "latest"}).watch((err,e) => {
                CarStore.fetchCar(e.args["item"]).then(() => CarStore.notifyChange());
            });

            market.BuyerAbortedTransaction({fromBlock: "latest"}).watch((err,e) => {
                CarStore.fetchCar(e.args["item"]).then(() => CarStore.notifyChange());
            });

            dmr.VehicleIssued({fromBlock: "latest"}).watch((err,e) => {
                CarStore.fetchAllCars();
            });
        });
    },

    fetchAllCars: () => {
        return dmr.getVehiclesOwnedBy(Eth.acc).then(cars => {
            let arr = [];

            cars.forEach(car => {
                arr.push(CarStore.fetchCar(car));
            })

            Promise.all(arr).then(() => {
                console.log(_cars);
                CarStore.notifyChange();
            })
        })
    },

    fetchCar: address => {
        return Promise.all([
            address,
            Vehicle.at(address).vin.call(),
            Vehicle.at(address).owner.call(),
            market.offers.call(address)
        ]).then(car => {
            let r = ({
                brand: 'BMW',
                model: '330d',
                year: '2015',
                color: 'Black',
                plate: 'AZ 50 100',
                address: car[0],
                vin: car[1],
                owner: car[2],
                buyer: car[3][1],
                amount: car[3][2].c[0],
                state: car[3][1] == Eth.nullAddress
                ? 'initial'
                : car[3][3].c[0] == 1 ?  'accepted' : 'extended'
            })
            _cars[r.vin] = r;
        });
    },

    fetchOfferedCars: () => {
        return market.getItemsOfferedTo(Eth.acc).then(cars => {
            let arr = [];

            cars.forEach(car => {
                arr.push(CarStore.fetchCar(car));
            })

            Promise.all(arr).then(() => {
                console.log(_cars);
                CarStore.notifyChange();
            })
        })
    },

    extendOffer: (car, buyer, amount) => {

        let market = Market.deployed();
        return Vehicle.at(car).isAuthorizedToSell.call(market.address).then(result => {
            var arr = [];
            if(!result) arr.push(Vehicle.at(car).authorizeMarket(market.address, {from: Eth.acc}));
            arr.push(market.extendOffer(
                car,
                buyer,
                amount,
                {from: Eth.acc})
            );
            return Promise.all(arr);
        });
    },

    revokeOffer: car => {
        let market = Market.deployed();
        return market.revokeOffer(car, {from: Eth.acc});
    },

    getCar: id => {
        return _cars[id];
    },

    getCars: () => {
        const array = []

        for (const id in _cars)
            array.push(_cars[id])

        return array
    },

    notifyChange: () => {
        _changeListeners.forEach(function (listener) {
            listener()
        })
    },

    addChangeListener: listener => {
        _changeListeners.push(listener)
    },

    removeChangeListener: listener => {
        _changeListeners = _changeListeners.filter(function (l) {
            return listener !== l
        })
    }

}

export default CarStore
