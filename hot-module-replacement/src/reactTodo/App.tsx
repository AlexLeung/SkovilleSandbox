console.log("App.tsx running");
import React from 'react';
import {AnotherVisual} from './AnotherVisual';
import {observer} from 'mobx-react';
import {mobXState} from './MobXState';

export const styling: React.CSSProperties = {
    background: 'black',
    padding: 20,
    color: 'white'
};

@observer
export class App extends React.Component {

    constructor(props) {
        super(props);
        this.onClickHandler = this.onClickHandler.bind(this);
    }

    setStyle(newStyle: React.CSSProperties) {
        mobXState.toggle();
    }

    onClickHandler() {
        console.log("changing testing to false");
    }

    render() {
        return (
            <div style={styling}>
                {mobXState.enabled ? "hello world!!!" : "off"} <input type="button" value="Click Me!" onClick={this.onClickHandler} />
                <br/>
                <AnotherVisual />
            </div>
        );
    }
}