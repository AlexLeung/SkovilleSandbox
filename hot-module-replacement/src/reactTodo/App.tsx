console.log("App.tsx running");
import React from 'react';
import {AnotherVisual} from './AnotherVisual';
import {observer} from 'mobx-react';
import {mobXState} from './MobXState';
import { observable, toJS } from 'mobx';

@observer
export class App extends React.Component {

    @observable styling: React.CSSProperties = {
        background: 'blue',
        padding: 20,
        color: 'white'
    };

    constructor(props) {
        super(props);
        this.onClickHandler = this.onClickHandler.bind(this);
    }

    onClickHandler() {
        console.log("changing testing to false");
        mobXState.enabled = !mobXState.enabled;
        this.styling.color = "rgb("+Array(3).fill(0).map(n => Math.floor(Math.random()*256)).join(",")+")";
    }

    render() {
        return (
            <div style={toJS(this.styling)}>
                {mobXState.enabled ? "hello world!!!" : "off"} <input type="button" value="Click Me!" onClick={this.onClickHandler} />
                <br/>
                <AnotherVisual />
            </div>
        );
    }
}