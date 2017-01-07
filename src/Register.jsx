/* React import */

import React, { Component } from 'react';
import { InputGroup, InputGroupButton } from 'reactstrap';
import { Navbar, NavbarBrand, Nav, NavItem, NavLink } from 'reactstrap';
import { Button, Form, FormGroup, Label, Input, FormText, FormFeedback } from 'reactstrap';
import { Container, Row, Col } from 'reactstrap';
import { Media } from 'reactstrap';
import { Link } from 'react-router';
import CarStore from './CarStore'

import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css'
import './App.css';

export class Register extends Component {
    constructor(props) {
        super(props);

        this.store = new CarStore();
        this.state = {
            loading: false,
            vin: {
                text: "",
                state: "",
                feedback: "",
                disabled: true
            },
            brand: {
                text: "",
                state: "",
                feedback: "",
                disabled: true
            },
            model: {
                text: "",
                state: "",
                feedback: "",
                disabled: true
            },
            year: {
                text: "",
                state: "",
                feedback: "",
                disabled: true
            },
            color: {
                text: "",
                state: "",
                feedback: "",
                disabled: true
            },
        }

        this.handleVinChange = this.handleVinChange.bind(this);
        this.handleModelChange = this.handleModelChange.bind(this);
        this.handleBrandChange = this.handleBrandChange.bind(this);
        this.handleYearChange = this.handleYearChange.bind(this);
        this.handleColorChange = this.handleColorChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleVinChange(event) {

        let text = event.target.value;
        let isValid = this.store.isVinValid(text);

        let vin = this.state.vin;

        vin.state = isValid ? 'success' : 'warning';
        vin.feedback = isValid ? '' : 'You need to enter a valid vehicle identification number (eg. 5GZCZ43D13S812715)';
        vin.text = text;

        this.setState({ vin: vin });
    }

    handleBrandChange(event) {
        let text = event.target.value;
        let isValid = text == "BMW" || text == "Audi" || text == "Volkswagen"

        let brand = this.state.brand;
        brand.state = isValid ? 'success' : 'warning';
        brand.feedback = isValid ? '' : 'Should be either BMW, Audi or Volkswagen';


        brand.text = text;
        this.setState({ brand: brand});
    }

    handleModelChange(event) {
        let text = event.target.value;
        let isValid = true;

        let model = this.state.model;
        model.state = isValid ? 'success' : 'warning';
        model.feedback = isValid ? '' : '';


        model.text = text;
        this.setState({ model: model});
    }

    handleYearChange(event) {
        let text = event.target.value;
        let value = parseInt(text);
        let isValid = value >= 1900 && value <= new Date().getFullYear();

        let year = this.state.year;
        year.state = isValid ? 'success' : 'warning';
        year.feedback = isValid ? '' : 'The year is not valid';


        year.text = text;
        this.setState({ year: year});
    }

    handleColorChange(event) {
        let text = event.target.value;
        let isValid = true;

        let color = this.state.color;
        color.state = isValid ? 'success' : 'warning';
        color.feedback = isValid ? '' : '';


        color.text = text;
        this.setState({ color: color });
    }

    handleSubmit(event) {

        let vin = this.state.vin;
        let model = this.state.model;
        let brand = this.state.brand;
        let color = this.state.color;
        let year = this.state.year;

        if(vin.state === 'success'){
            this.store.isVinRegistered(vin.text).then(result => {
                if(!result){
                    this.setState({loading: true});
                    this.store.issueVehicle(vin.text, brand.text, model.text, year.text, color.text).then(tx => {
                        this.setState({loading: false});
                        window.location.assign("/cars");
                    }).catch(err => {
                        this.setState({loading: false});
                        console.log(err);
                    });
                } else {
                    vin.state = 'danger';
                    vin.feedback = 'The given vehicle identification number is already registered.'
                    this.setState({vin: vin})
                }
            })
        }
    }

    render() {


        return (
            <div>
            <h3>Register new car</h3>
            <FormGroup row color={this.state.vin.state}>
            <Label for="vin" sm={3}>Vehicle Identification Number</Label>
            <Col sm={9}>
            <Input
            value = {this.state.vin.text}
            state = {this.state.vin.state}
            type = "text"
            name = "vin"
            id = "vin"
            placeholder = "Please enter the vehicles identification number"
            onChange = {this.handleVinChange}
            />
            <FormFeedback>{this.state.vin.feedback}</FormFeedback>
            </Col>
            </FormGroup>
            <FormGroup row color={this.state.brand.state}>
            <Label for="brand" sm={3}>Car brand</Label>
            <Col sm={9}>
            <Input
            value = {this.state.brand.text}
            state = {this.state.brand.state}
            type = "text"
            name = "brand"
            id = "brand"
            placeholder = "Please enter the vehicle brand"
            onChange = {this.handleBrandChange}
            />
            <FormFeedback>{this.state.brand.feedback}</FormFeedback>
            </Col>
            </FormGroup>
            <FormGroup row color={this.state.model.state}>
            <Label for="brand" sm={3}>Car model</Label>
            <Col sm={9}>
            <Input
            value = {this.state.model.text}
            state = {this.state.model.state}
            type = "text"
            name = "model"
            id = "model"
            placeholder = "Please enter the vehicle model"
            onChange = {this.handleModelChange}
            />
            <FormFeedback>{this.state.model.feedback}</FormFeedback>
            </Col>
            </FormGroup>
            <FormGroup row color={this.state.year.state}>
            <Label for="year" sm={3}>Built Year</Label>
            <Col sm={9}>
            <Input
            value = {this.state.year.text}
            state = {this.state.year.state}
            type = "number"
            name = "year"
            id = "year"
            placeholder = "Please enter the built year"
            onChange = {this.handleYearChange}
            />
            <FormFeedback>{this.state.year.feedback}</FormFeedback>
            </Col>
            </FormGroup>
            <FormGroup row color={this.state.color.state}>
            <Label for="brand" sm={3}>Color</Label>
            <Col sm={9}>
            <Input
            value = {this.state.color.text}
            state = {this.state.color.state}
            type = "text"
            name = "color"
            id = "color"
            placeholder = "Please enter the vehicles color"
            onChange = {this.handleColorChange}
            />
            <FormFeedback>{this.state.color.feedback}</FormFeedback>
            </Col>
            </FormGroup>
            <Button
            onClick={this.handleSubmit}
            disabled={
                this.state.vin.state !== 'success' ||
                this.state.brand.state !== 'success' ||
                this.state.model.state !== 'success' ||
                this.state.year.state !== 'success' ||
                this.state.color.state !== 'success'
            } >
            Submit {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
            </Button>
            </div>
        );
    }
}
