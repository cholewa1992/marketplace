import React, { Component } from 'react';
import { Router, Route, Link, browserHistory } from 'react-router'
import { App } from './App'
import { Cars } from './Cars'
import { Register } from './Register'
import { Search } from './Search'

class Routes extends Component {

    render() {
        return (
            <div className="App">
            <Router history={browserHistory}>
            <Route path="/" component={App}>
            <Route path="/cars" component={Cars} />
            <Route path="/search" component={Search}/>
            <Route path="/register" component={Register}/>
            </Route>
            </Router> 
            </div>
        );
    }

}

export default Routes;
