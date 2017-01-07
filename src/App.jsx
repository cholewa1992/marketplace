/* React import */

import React, { Component } from 'react';
import { InputGroup, InputGroupButton } from 'reactstrap';
import { Navbar, NavbarBrand, Nav, NavItem, NavLink, NavbarToggler, Collapse } from 'reactstrap';
import { Button, Form, FormGroup, Label, Input, FormText, FormFeedback } from 'reactstrap';
import { Container, Row, Col } from 'reactstrap';
import { Media } from 'reactstrap';
import { Link } from 'react-router';
import { Token, Market, DMR, Vehicle, web3 } from './Contracts';

import 'bootstrap-v4-dev/dist/css/bootstrap.css';
import 'font-awesome/css/font-awesome.min.css'
import './App.css';

export class App extends Component {

    constructor(props) {
        super(props);

        this.toggleNavbar = this.toggleNavbar.bind(this);
        this.state = {
            collapsed: true
        };
    }

    toggleNavbar() {
        this.setState({
            collapsed: !this.state.collapsed
        });
    }

    render() {
        return (
            <Container>
            <div className="header clearfix">
            <Navbar light>
            <Link to={'/'} className="navbar-brand">Danish Motor Register</Link>
            <Nav className="float-xs-right" navbar>
            <NavItem>
            <Link to={'register'} activeClassName="active" className="nav-link">Register</Link>
            </NavItem>
            <NavItem>
            <Link to={'cars'} activeClassName="active" className="nav-link">Your cars</Link>
            </NavItem>
            </Nav>
            </Navbar>
            </div>
            <Container fluid className="content">
            {this.props.children}
            </Container>
            <footer className="footer">
            <p>© IT University at Copenhagen 2016</p>
            </footer>
            </Container>
        );
    }
}
