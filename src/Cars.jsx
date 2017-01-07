/* Basic react package */
import React, { Component } from 'react';

/* Timer mixin */
import ReactMixin from 'react-mixin';
import TimerMixin from 'react-timer-mixin';

/* Eth contracts */
import CarStore from './CarStore'

/* Reactstrap import */
import { Container, Row, Col } from 'reactstrap';
import { Tag, ListGroup, ListGroupItem } from 'reactstrap';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { Form, FormGroup, Label, Input, FormText, FormFeedback } from 'reactstrap';
import { Card, CardImg, CardText, CardBlock, CardTitle,
    CardSubtitle, Button, CardHeader, CardFooter, Tooltip } from 'reactstrap';


export default class Cars extends Component {

    constructor(props) {
        super(props)

        this.store = new CarStore();
        var cars = this.store.getCars();

        this.state = {
            cars: cars,
            selected: cars.length > 0 ? cars[0] : null
        };

        this.handleSelect = this.handleSelect.bind(this);
        this.updateCars = this.updateCars.bind(this);
    }

    componentWillMount() {
        this.store.addChangeListener(this.updateCars)
    }

    componentWillUnmount() {
        this.store.removeChangeListener(this.updateCars)
    }

    updateCars(){
        var cars = this.store.getCars();
        this.setState({
            cars: cars,
            selected: this.state.selected
            ? this.state.selected
            : cars.length > 0 ? cars[0] : null
        });

    }

    handleSelect(car){
        this.setState({ selected: car});
    }


    render() {

        let cars = this.state.cars.filter(car => car.owner == this.store.acc).map(car => (
            <ListGroupItem
            key={car.vin}
            onClick={e => this.handleSelect(car)}
            active={this.state.selected.vin === car.vin}
            action
            className='text-truncate'
            >
            {car.brand} {car.model} ({car.year})
            </ListGroupItem>
        ));

        let offers = this.state.cars.filter(car => car.buyer == this.store.acc).map(car => (
            <ListGroupItem
            key={car.vin}
            onClick={e => this.handleSelect(car)}
            active={this.state.selected.vin === car.vin}
            action
            className='text-truncate'
            >
            {car.brand} {car.model} ({car.year})
            </ListGroupItem>
        ));

        return (
            <div>
            { offers.length == 0 && cars.length == 0 && <center><h4>You have no cars, and no cars offered to you</h4></center> }
            { offers.length > 0 || cars.length > 0 && ( 
            <Row>
                <Col md='4'>
                { offers.length > 0 && (
                    <Card>
                    <CardHeader>Cars offered to you</CardHeader>
                    <ListGroup className='list-group-flush'>
                    {offers}
                    </ListGroup>
                    </Card>
                )}
                { cars.length > 0 && (
                    <Card>
                    <CardHeader>Your cars</CardHeader>
                    <ListGroup className='list-group-flush'>
                    {cars}
                    </ListGroup>
                    </Card>
                )}
                </Col>
                <Col md='8'>
                {this.state.selected && (<Car id={this.state.selected.vin}/>)}
                </Col>
            </Row>
            )}
            </div>
        );
    }
}

class Car extends Component {

    constructor(props) {
        super(props)

        this.store = new CarStore();
        this.state = this.getStateFromStore();
        this.state.tooltipOpen = false;
        this.state.allowedToSpend = 0;
        this.canBuy = false;
        this.state.authorized = false;


        this.toggle = this.toggle.bind(this);
        this.updateCar = this.updateCar.bind(this);
    }

    getStateFromStore(props) {
        const  id  = props ? props.id: this.props.id;
        let car = this.store.getCar(id);
        let ats = this.store.allowedToSpend;
        return { 
            car: car,
            allowedToSpend: ats,
            canBuy: ats >= car.amount

        };
    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.getStateFromStore(nextProps))
    }

    componentDidMount() {
        this.store.addChangeListener(this.updateCar);
    }

    componentWillUnmount() {
        this.store.removeChangeListener(this.updateCar)
    }

    updateCar(){
        this.setState(this.getStateFromStore());
    }

    toggle() {
        this.setState({
            tooltipOpen: !this.state.tooltipOpen
        });
    }

    render() {
        return (
            <Card>
            <CardHeader>
            {this.state.car.brand} {this.state.car.model}
            {this.state.car.state == 'extended' &&
                <Tag color='warning' pill className='float-xs-right'>offer extended</Tag>}
            {this.state.car.state == 'accepted' &&
                <Tag color='success' pill className='float-xs-right'>offer accepted</Tag>}
            </CardHeader>
            <CardBlock>
            <dl className='row'>

            <dt className='col-sm-4 text-truncate'>Brand</dt>
            <dd className='col-sm-8'>{this.state.car.brand}</dd>

            <dt className='col-sm-4 text-truncate'>Model</dt>
            <dd className='col-sm-4'>{this.state.car.model}</dd>

            <dt className='col-sm-4 text-truncate'>Year</dt>
            <dd className='col-sm-8'>{this.state.car.year}</dd>

            <dt className='col-sm-4 text-truncate'>Color</dt>
            <dd className='col-sm-8'>{this.state.car.color}</dd>

            <dt className='col-sm-4 text-truncate'>
            <span id='VinTooltip'>Vehicle Id</span>
            <Tooltip placement='left' isOpen={this.state.tooltipOpen} target='VinTooltip' toggle={this.toggle}>
            Vehicle Indentification Number
            </Tooltip>
            </dt>
            <dd className='col-sm-8'>{this.state.car.vin}</dd>
            </dl>
            </CardBlock>
            <CardFooter className='text-xs-right'>

            {(this.state.car.owner == this.store.acc && !this.state.car.authorized) &&
                <AuthorizeModal car={this.state.car}/>}{' '}

            {(this.state.car.buyer == this.store.acc && this.state.canBuy && this.state.car.state === 'extended') &&
                <AcceptModal car={this.state.car}/>}{' '}

            {(this.state.car.buyer == this.store.acc && !this.state.canBuy && this.state.car.state === 'extended') &&
                <AllowModal car={this.state.car}/>}{' '}

            {(this.state.car.authorized && this.state.car.owner == this.store.acc && this.state.car.state === 'initial') &&
                <SellModal car={this.state.car}/>}{' '}

            {(this.state.car.owner == this.store.acc &&  this.state.car.state !== 'initial') &&
                <RevokeModal car={this.state.car}/>}{' '}

            {(this.state.car.buyer == this.store.acc &&  this.state.car.state === 'accepted') &&
                <CompleteModal car={this.state.car}/>}{' '}

            {(this.state.car.buyer == this.store.acc &&  this.state.car.state === 'accepted') &&
                <AbortModal car={this.state.car}/>}{' '}

            </CardFooter>
            </Card>
        )
    }
}

class CustomInput extends React.Component {
    constructor(props) {
        super(props);

        this.id = props.id;
        this.label = props.label;
        this.placeholder = props.placeholder;
        this.type = props.type ? props.type : 'text';
        this.onChange = props.onChange;
        this.feedback = props.feedback ? props.feedback : state => '';
        this.validator = props.validator ? props.validator : value => '';

        this.state = {
            value: '',
            state: '',
            feedback: '',
            disabled: true
        }

        this.handleChange = this.handleChange.bind(this);
    }

    handleChange(event) {
        let value = event.target.value;
        let state = this.validator(value);
        let feedback = this.feedback(state);
        this.setState({
            value:  value,
            state:  state,
            feedback: feedback
        });

        if(this.onChange) this.onChange(value);
    }

    render() {
        return (
            <FormGroup color={this.state.state}>
            <Label for={this.id}>{this.label}</Label>
            <Input
            id = {this.id}
            type = {this.type}
            value = {this.state.value}
            state = {this.state.state}
            placeholder = {this.placeholder}
            onChange = {this.handleChange}
            />
            <FormFeedback>{this.state.feedback}</FormFeedback>
            </FormGroup>
        )
    }

}

class SellModal extends React.Component {
    constructor(props) {
        super(props);

        this.store = new CarStore();
        this.state = {
            modal: false,
            loading: false,
            buyer: '',
            amount: 0
        };

        this.toggle = this.toggle.bind(this);
        this.offer = this.offer.bind(this);
    }

    toggle() {
        this.setState({
            modal: !this.state.modal
        });
    }

    offer() {
        //this.toggle();
        this.setState({loading: true});

        let car = this.props.car.address;
        let buyer = this.state.buyer;
        let amount = this.state.amount;

        this.store.extendOffer(car, buyer, amount).then(() => {
            this.setTimeout(() => {
                this.setState({loading: false});
                this.toggle();
            }, 1000);
        }).catch(err => {
            console.log(err)
            this.setTimeout(() => {
                this.setState({loading: false});
            }, 1000);
        });
    }

    isValidBuyer(address){
        if(address == '') return '';
        return this.store.isAddress(address) ? 'success' : 'warning';
    }

    isValidAmount(amount){
        if(amount == '') return '';
        return parseInt(amount) >= 0 ? 'success' : 'warning';
    }

    buyerFeedback(state){
        if(state != 'success' && state != '')
            return 'The inputet address is not valid (' + this.store.acc + ")";
    }

    render() {
        return (
            <span>
            <Button color='primary' onClick={this.toggle}>Sell</Button>
            <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
            <ModalHeader toggle={this.toggle}>Extend an offer on your car</ModalHeader>
            <ModalBody>
            <CustomInput
            id="buyer"
            label="Buyer"
            validator={address => this.isValidBuyer(address)}
            feedback={state => this.buyerFeedback(state)}
            placeholder="The buyers address"
            onChange={value => this.setState({buyer: value})}
            />
            <CustomInput
            id="amount"
            label="Amount"
            type = "number"
            validator={this.isValidAmount}
            placeholder="The requested amount"
            onChange={value => this.setState({amount: parseInt(value)})}
            />
            </ModalBody>
            <ModalFooter>
            <Button
            color='primary'
            onClick={this.offer}
            disabled={this.state.loading}
            >
            {'Continue'}
            {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
            </Button>{' '}
            <Button color='secondary' onClick={this.toggle}>Cancel</Button>
            </ModalFooter>
            </Modal>
            </span>
        );
    }
}
ReactMixin.onClass(SellModal, TimerMixin);

class RevokeModal extends React.Component {
    constructor(props) {
        super(props);

        this.store = new CarStore();
        this.state = {
            modal: false,
            loading: false,
        };

        this.toggle = this.toggle.bind(this);
        this.revoke = this.revoke.bind(this);
    }

    toggle() {
        this.setState({
            modal: !this.state.modal
        });
    }

    revoke() {
        this.setState({loading: true});
        let car = this.props.car.address;

        this.store.revokeOffer(car).then(() => {
            this.setTimeout(() => {
                this.setState({loading: false});
                this.toggle();
            }, 1000);
        }).catch(err => {
            console.log(err)
            this.setTimeout(() => {
                this.setState({loading: false});
            }, 1000);
        });
    }

    render() {
        return (
            <span>
            <Button color='danger' onClick={this.toggle}>Revoke</Button>
            <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
            <ModalHeader toggle={this.toggle}>Revoke the exteded offer on your car</ModalHeader>
            <ModalBody>
            This action will revoke the offer extended on this car.
            If the offer is already accepted then the frozen assests will be returned to the buyer.
            </ModalBody>
            <ModalFooter>
            <Button
            color='primary'
            onClick={this.revoke}
            disabled={this.state.loading}
            >
            {'Continue'}
            {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
            </Button>{' '}
            <Button color='secondary' onClick={this.toggle}>Cancel</Button>
            </ModalFooter>
            </Modal>
            </span>
        );
    }
}
ReactMixin.onClass(RevokeModal, TimerMixin);

class AcceptModal extends React.Component {
    constructor(props) {
        super(props);

        this.store = new CarStore();
        this.state = {
            modal: false,
            loading: false,
        };

        this.toggle = this.toggle.bind(this);
        this.accept = this.accept.bind(this);
    }

    toggle() {
        this.setState({
            modal: !this.state.modal
        });
    }

    accept() {
        this.setState({loading: true});
        let car = this.props.car.address;

        this.store.acceptOffer(car).then(() => {
            this.setTimeout(() => {
                this.setState({loading: false});
                this.toggle();
            }, 1000);
        }).catch(err => {
            console.log(err)
            this.setTimeout(() => {
                this.setState({loading: false});
            }, 1000);
        });
    }

    render() {
        return (
            <span>
            <Button color='success' onClick={this.toggle}>Accept</Button>
            <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
            <ModalHeader toggle={this.toggle}>Accept the exteded offer on {this.props.car.brand} {this.props.car.model} ({this.props.car.year}).</ModalHeader>
            <ModalBody>
            <p>This action will accept the offer extended on this car.</p>
            If the offer is accepted then <b>{this.props.car.amount} DKK</b> will be transfered from your account.
            </ModalBody>
            <ModalFooter>
            <Button
            color='primary'
            onClick={this.accept}
            disabled={this.state.loading}
            >
            {'Continue'}
            {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
            </Button>{' '}
            <Button color='secondary' onClick={this.toggle}>Cancel</Button>
            </ModalFooter>
            </Modal>
            </span>
        );
    }
}
ReactMixin.onClass(AcceptModal, TimerMixin);

class CompleteModal extends React.Component {
    constructor(props) {
        super(props);

        this.store = new CarStore();
        this.state = {
            modal: false,
            loading: false,
        };

        this.toggle = this.toggle.bind(this);
        this.complete = this.complete.bind(this);
    }

    toggle() {
        this.setState({
            modal: !this.state.modal
        });
    }

    complete() {
        this.setState({loading: true});
        let car = this.props.car.address;

        this.store.completeTransaction(car).then(() => {
            this.setTimeout(() => {
                this.setState({loading: false});
                this.toggle();
            }, 1000);
        }).catch(err => {
            console.log(err)
            this.setTimeout(() => {
                this.setState({loading: false});
            }, 1000);
        });
    }

    render() {
        return (
            <span>
            <Button color='success' onClick={this.toggle}>Complete</Button>
            <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
            <ModalHeader toggle={this.toggle}>Complete the transaction for {this.props.car.brand} {this.props.car.model} ({this.props.car.year}).</ModalHeader>
            <ModalBody>
            <p>This action will complete the transaction on the car.</p>
            <p>Upon completion <b>{this.props.car.amount} DKK</b> will be transfered to the seller and the ownership of the car will be transfered to you.</p>
            </ModalBody>
            <ModalFooter>
            <Button
            color='primary'
            onClick={this.complete}
            disabled={this.state.loading}
            >
            {'Continue'}
            {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
            </Button>{' '}
            <Button color='secondary' onClick={this.toggle}>Cancel</Button>
            </ModalFooter>
            </Modal>
            </span>
        );
    }
}
ReactMixin.onClass(CompleteModal, TimerMixin);

class AbortModal extends React.Component {
    constructor(props) {
        super(props);

        this.store = new CarStore();
        this.state = {
            modal: false,
            loading: false,
        };

        this.toggle = this.toggle.bind(this);
        this.abort = this.abort.bind(this);
    }

    toggle() {
        this.setState({
            modal: !this.state.modal
        });
    }

    abort() {
        this.setState({loading: true});
        let car = this.props.car.address;

        console.log(this.props.car);

        this.store.abortTransaction(car).then(() => {
            this.setTimeout(() => {
                this.setState({loading: false});
                this.toggle();
            }, 1000);
        }).catch(err => {
            console.log(err)
            this.setTimeout(() => {
                this.setState({loading: false});
            }, 1000);
        });
    }

    render() {
        return (
            <span>
            <Button color='danger' onClick={this.toggle}>Abort</Button>
            <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
            <ModalHeader toggle={this.toggle}>Abort transaction on {this.props.car.brand} {this.props.car.model} ({this.props.car.year})</ModalHeader>
            <ModalBody>
            <p>This action will abort the transaction on the car.</p>
            <p>The frozen assests (<b>{this.props.car.amount} DKK</b>) will be returned to you.</p>
                </ModalBody>
                <ModalFooter>
                <Button
                color='primary'
                onClick={this.abort}
                disabled={this.state.loading}
                >
                {'Continue'}
                {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
                </Button>{' '}
                <Button color='secondary' onClick={this.toggle}>Cancel</Button>
                </ModalFooter>
                </Modal>
                </span>
            );
    }
}
ReactMixin.onClass(AbortModal, TimerMixin);

class AllowModal extends React.Component {
    constructor(props) {
        super(props);

        this.store = new CarStore();
        this.state = {
            modal: false,
            loading: false,
            symbol: "",
            balance: 0
        };

        this.toggle = this.toggle.bind(this);
        this.allow= this.allow.bind(this);
    }

    componentDidMount() {
        this.store.tokenSymbol().then(s => this.setState({ symbol: s }));
        this.store.balance().then(b => this.setState({ balance: b }));
    }

    toggle() {
        this.setState({
            modal: !this.state.modal
        });
    }

    allow() {
        this.setState({loading: true});
        this.store.allowSpending(this.props.car.amount).then(() => {
            this.setTimeout(() => {
                this.setState({loading: false});
                this.toggle();
            }, 1000);
        }).catch(err => {
            console.log(err)
            this.setTimeout(() => {
                this.setState({loading: false});
            }, 1000);
        });
    }

    render() {
        return (
            <span>
            <Button color='secondary' onClick={this.toggle}>Allow</Button>
            <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
            <ModalHeader toggle={this.toggle}>Allow this market to withdraw from your account.</ModalHeader>
            <ModalBody>
            <p>This action will allow this market to withdraw {this.props.car.amount} {this.state.symbol} ( Total balance: {this.state.balance} {this.state.symbol}) from your account. You have to allow the market to withdraw money from your account in order to accept offers on cars.</p>
            </ModalBody>
            <ModalFooter>
            <Button
            color='primary'
            onClick={this.allow}
            disabled={this.state.loading}
            >
            {'Continue'}
            {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
            </Button>{' '}
            <Button color='secondary' onClick={this.toggle}>Cancel</Button>
            </ModalFooter>
            </Modal>
            </span>
        );
    }
}
ReactMixin.onClass(AllowModal, TimerMixin);

class AuthorizeModal extends React.Component {
    constructor(props) {
        super(props);

        this.store = new CarStore();
        this.state = {
            modal: false,
            loading: false,
            symbol: "",
            balance: 0
        };

        this.toggle = this.toggle.bind(this);
        this.allow= this.allow.bind(this);
    }

    componentDidMount() {
        this.store.tokenSymbol().then(s => this.setState({ symbol: s }));
        this.store.balance().then(b => this.setState({ balance: b }));
    }

    toggle() {
        this.setState({
            modal: !this.state.modal
        });
    }

    allow() {
        this.setState({loading: true});
        this.store.authorizeMarket(this.props.car.address).then(() => {
            this.setTimeout(() => {
                this.setState({loading: false});
                this.toggle();
                window.location.reload();
            }, 1000);
        }).catch(err => {
            console.log(err)
            this.setTimeout(() => {
                this.setState({loading: false});
            }, 1000);
        });
    }

    render() {
        return (
            <span>
            <Button color='secondary' onClick={this.toggle}>Authorize</Button>
            <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
            <ModalHeader toggle={this.toggle}>Allow this market to extend an offer of your car.</ModalHeader>
            <ModalBody>
            <p>This action will allow this market to reregister your vehicle as a part of the transaction. The ownership will only change if the sale is successful and will happend in conjunction with you recieving money for the car.</p>
            </ModalBody>
            <ModalFooter>
            <Button
            color='primary'
            onClick={this.allow}
            disabled={this.state.loading}
            >
            {'Continue'}
            {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
            </Button>{' '}
            <Button color='secondary' onClick={this.toggle}>Cancel</Button>
            </ModalFooter>
            </Modal>
            </span>
        );
    }
}
ReactMixin.onClass(AuthorizeModal, TimerMixin);

