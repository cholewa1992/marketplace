/* React import */

import React, { Component } from 'react';
import { InputGroup, InputGroupButton } from 'reactstrap';
import { Navbar, NavbarBrand, Nav, NavItem, NavLink } from 'reactstrap';
import { Button, Form, FormGroup, Label, Input, FormText, FormFeedback } from 'reactstrap';
import { Container, Row, Col } from 'reactstrap';
import { Media } from 'reactstrap';
import { Link } from 'react-router';
import { Token, Market, DMR, Vehicle, web3 } from './Contracts';

import 'bootstrap/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css'
import './App.css';

export class Search extends Component {

    constructor(props) {
        super(props);

        this.state = {
            loading: false,
            search: "",
            cars: []
        }

        this.handleChange = this.handleChange.bind(this);
        this.handleSubmit = this.handleSubmit.bind(this);
    }

    handleChange(event) {
        this.setState({search: event.target.value});
    }

    handleSubmit(event) {
        this.search(this.state.search);
    }

    search(key){
        if(this.state.search != ""){
            var dmr = DMR.deployed();

            this.setState({ loading: true });

            dmr.getVehicles().then(cars => {
                let arr = [];

                cars.forEach(car => {
                    arr.push(Vehicle.at(car).vin.call())
                })

                Promise.all(arr).then(results => {
                    this.setState({
                        loading: false,
                        cars: results.filter(v => v.indexOf(key) !== -1)
                    })
                })
            })
        }
    }

    render() {

        return (
            <div>
            <Container>
            <Row>
            <h3>Search for vehicles</h3>
            <br />
            </Row>
            <Row>
            <Col md = {{size:8, offset: 2}}>
            <InputGroup>
            <Input value = {this.state.search} placeholder = "Enter a license plate number" onChange={this.handleChange} />
            <InputGroupButton onClick={this.handleSubmit} color="secondary">Search</InputGroupButton>
            </InputGroup>
            </Col>
            </Row>
            </Container>
            <br />
            <Container>
            { !this.state.loading && this.state.cars.length > 0 && this.state.cars.map(car => (
                <Row key = {car}>
                <Col md = {{size:8, offset: 2}}>
                <Media>
                <Media body>
                <Media heading>
                {car}
                </Media>
                Some infromation about the car..
                    </Media>
                </Media>
                </Col>
                </Row>
            ))}


            { !this.state.loading && this.state.cars.length == 0 &&
                <Row>
                <Col md = {{size:8, offset: 2}}>
                Nothing found...
                </Col>
                </Row>
            }

            { this.state.loading &&
                <Row>
                <Col className="center" md = {{size:8, offset: 2}}>
                <i className="fa fa-spinner fa-spin fa-3x fa-fw"></i>
                <span className="sr-only">Loading...</span>
                </Col>
                </Row>
            }

            </Container>
            </div>
        );
    }
}


