import React, { Component } from 'react';
import { Router, Route, IndexRoute, Link, browserHistory } from 'react-router'
import { App } from './App'
import Cars from './Cars'
import { Register } from './Register'
import { Search } from './Search'

class Routes extends Component {

    constructor(props) {
        super(props);    
    }

    render() {
        return (
            <div className="App">
            <Router history={browserHistory}>
            <Route path="/" component={App}>
                <IndexRoute component={Cars} />
                <Route path="/cars"  component={Cars} />
                <Route path="/search" component={Search}/>
                <Route path="/register" component={Register}/>
            </Route>
            </Router> 
            </div>
        );
    }

}

export default Routes;
