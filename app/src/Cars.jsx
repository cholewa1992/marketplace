/* Basic react package */
import React, { Component } from 'react';

/* Timer mixin */
import ReactMixin from 'react-mixin';
import TimerMixin from 'react-timer-mixin';

/* Eth contracts */
import { Eth } from './Contracts';
import CarStore from './CarStore'

/* Reactstrap import */
import { Container, Row, Col } from 'reactstrap';
import { Tag, ListGroup, ListGroupItem } from 'reactstrap';
import { Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { Form, FormGroup, Label, Input, FormText, FormFeedback } from 'reactstrap';
import { Card, CardImg, CardText, CardBlock, CardTitle,
    CardSubtitle, Button, CardHeader, CardFooter, Tooltip } from 'reactstrap';


export class Cars extends Component {

    constructor(props) {
        super(props)

        var cars = CarStore.getCars();
        this.state = {
            cars: cars,
            selected: cars.length > 0 ? cars[0] : null
        };

        this.handleSelect = this.handleSelect.bind(this);
        this.updateCars = this.updateCars.bind(this);
    }

    componentWillMount() {
        CarStore.addChangeListener(this.updateCars)
        CarStore.init();
    }

    componentWillUnmount() {
        CarStore.removeChangeListener(this.updateCars)
    }

    updateCars(){
        var cars = CarStore.getCars();
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

        let cars = this.state.cars.filter(car => car.owner == Eth.acc).map(car => (
            <ListGroupItem
            key={car.vin}
            onClick={e => this.handleSelect(car)}
            active={this.state.selected.vin === car.vin}
            action
            className='text-truncate'
            >
            {car.brand} {car.model} ({car.plate})
            </ListGroupItem>
        ));

        let offers = this.state.cars.filter(car => car.buyer == Eth.acc).map(car => (
            <ListGroupItem
            key={car.vin}
            onClick={e => this.handleSelect(car)}
            active={this.state.selected.vin === car.vin}
            action
            className='text-truncate'
            >
            {car.brand} {car.model} ({car.plate})
            </ListGroupItem>
        ));

        return (
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
            <Card>
            <CardHeader>Your cars</CardHeader>
            <ListGroup className='list-group-flush'>
            {cars}
            </ListGroup>
            </Card>
            </Col>
            <Col md='8'>
            {this.state.selected && (<Car id={this.state.selected.vin}/>)}
            </Col>
            </Row>
        );
    }
}

class Car extends Component {

    constructor(props) {
        super(props)

        this.state = this.getStateFromStore();
        this.state.tooltipOpen = false;

        this.toggle = this.toggle.bind(this);
        this.updateCar = this.updateCar.bind(this);
    }

    getStateFromStore(props) {
        const  id  = props ? props.id: this.props.id;
        return { car: CarStore.getCar(id) };
    }

    componentWillReceiveProps(nextProps) {
        this.setState(this.getStateFromStore(nextProps))
    }

    componentDidMount() {
        CarStore.addChangeListener(this.updateCar)
    }

    componentWillUnmount() {
        CarStore.removeChangeListener(this.updateCar)
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

            <dt className='col-sm-4 text-truncate'>License plate</dt>
            <dd className='col-sm-8'>{this.state.car.plate}</dd>

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
            {(this.state.car.buyer == Eth.acc && this.state.car.state === 'extended') &&
            <Button color='primary'>Accept</Button>}{' '}
            { this.state.car.state === 'initial' &&
            <SellModal car={this.state.car}/>}{' '}
            { this.state.car.state !== 'initial' &&
            <RevokeModal car={this.state.car}/>}{' '}
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

       CarStore.extendOffer(car, buyer, amount).then(() => {
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
        return Eth.isAddress(address) ? 'success' : 'warning';
    }

    isValidAmount(amount){
        if(amount == '') return '';
        return parseInt(amount) > 0 ? 'success' : 'warning';
    }

    buyerFeedback(state){
        if(state != 'success' && state != '')
            return 'The inputet address is not valid (' + Eth.acc + ")";
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
            validator={this.isValidBuyer}
            feedback={this.buyerFeedback}
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

       CarStore.revokeOffer(car).then(() => {
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

export default Cars

