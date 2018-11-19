console.log("AnotherVisual.tsx is running");
import React from 'react';
import {observer} from 'mobx-react';
import {mobXState} from './MobXState';
import {styling2} from './appStyling';
import { observable, toJS } from 'mobx';

@observer
export class AnotherVisual extends React.Component {

    @observable private styling = styling2;

    constructor(props) {
        super(props);
        this.hello = this.hello.bind(this);
        this.onClickHandler = this.onClickHandler.bind(this);
        module.hot.accept('./appStyling', () => {
            console.log("accepting ./appStyling");
            const {styling2} = require('./appStyling');
            this.updateStyling(styling2);
        });
    }

    private updateStyling(newStyling) {
        this.styling = newStyling
    }

    hello(e: React.ChangeEvent<HTMLInputElement>) {
        mobXState.someText = e.target.value
    }

    onClickHandler() {
        mobXState.toggle();
    }

    render() {
        return (
            <div style={toJS(this.styling)}>
                {mobXState.someText}
                <br />
                <input type="text" value={mobXState.someText} onChange={this.hello} />
                <br />
                {mobXState.enabled?"enabled":"disabled"}<input type="button" value="diable" onClick={this.onClickHandler} />
            </div>
        );
    }
}