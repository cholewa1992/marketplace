/* React import */

import React, { Component } from 'react';
import { InputGroup, InputGroupButton } from 'reactstrap';
import { Navbar, NavbarBrand, Nav, NavItem, NavLink } from 'reactstrap';
import { Button, Form, FormGroup, Label, Input, FormText, FormFeedback } from 'reactstrap';
import { Container, Row, Col } from 'reactstrap';
import { Media } from 'reactstrap';
import { Link } from 'react-router';
import { Token, Market, DMR, Vehicle, Eth } from './Contracts';

import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css'
import './App.css';

export class Register extends Component {
    constructor(props) {
        super(props);

        this.state = {
            loading: false,
            vin: {
                text: "",
                state: "",
                feedback: "",
                disabled: true
            }
        }

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
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

    isVinRegistered(vin){
        let dmr = DMR.deployed();
        return dmr.isVinRegistered(vin);
    }

    handleChange(event) {

        let text = event.target.value;
        let isValid = this.isVinValid(text);

        let vin = this.state.vin;

        vin.state = isValid ? 'success' : 'warning';
        vin.feedback = isValid ? '' : 'You need to enter a valid vehicle identification number (eg. 5GZCZ43D13S812715)';
        vin.text = text;

        this.setState({ vin: vin });
    }

    handleSubmit(event) {

        let dmr = DMR.deployed();
        let vin = this.state.vin;

        if(vin.state === 'success'){
            this.isVinRegistered(this.state.vin.text).then(result => {
                if(!result){
                    this.setState({loading: true});
                    dmr.issueVehicle(vin.text, {from: Eth.acc}).then(tx => {
                        this.setState({loading: false});
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
            <FormGroup color={this.state.vin.state}>
            <Label for="licensePlate">Vehicle Identification Number</Label>
            <Input
                value = {this.state.vin.text}
                state = {this.state.vin.state}
                type = "text"
                name = "vin"
                id = "licensePlate"
                placeholder = "Please enter the vehicles identification number"
                onChange = {this.handleChange}
            />
            <FormFeedback>{this.state.vin.feedback}</FormFeedback>
            </FormGroup>
            <Button
                onClick={this.handleSubmit}
                disabled={this.state.vin.state !== 'success'} >
                {!this.state.loading && 'Submit'}
                {this.state.loading && <i className="fa fa-spinner fa-spin"></i>}
            </Button>
            </div>
        );
    }
}
