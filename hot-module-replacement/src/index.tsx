import './send-log';
console.log("index.ts is running");
import { valueToLog } from './exports-string';
import { counterElement } from './counter';
import { texting } from './testing';
import {render} from 'react-dom';
import {App} from './reactTodo/App';
import React from 'react';

const reactAppContainerId = "reactAppContainer";
let reactContainer = document.getElementById(reactAppContainerId);
if(!reactContainer) {
    reactContainer = document.createElement("div");
    reactContainer.id = reactAppContainerId;
    document.body.append(reactContainer);
}
render(<App />, reactContainer);

const mainElementId = "application";
let el = document.getElementById(mainElementId);
if(!el) {
    console.log("creating new element");
    el = document.createElement("div");
    el.id = mainElementId;
    document.body.append(el);
}
let totaled = 0;
while(el.childElementCount > 0) {
    const itemToRemove = el.children.item(0);
    totaled++;
    console.log("length of el's children:", el.childElementCount, "totaled:",totaled,"cur:",itemToRemove);
    el.removeChild(itemToRemove);
}
const textElm = document.createElement("div");
textElm.innerHTML =`Initial valveToLog rawr: ${valueToLog}`;
const texElm2 = document.createElement("div");
texElm2.innerHTML =`Initial value to log2 = ${texting}`;
el.append(textElm);
el.append(texElm2);
el.append(counterElement);

if (module.hot) {
    console.log("module is hot");
    module.hot.accept('./exports-string', () => {
        console.log("accepting ./exports-string.ts");
        const { valueToLog } = require('./exports-string'); // original imported value doesn't update, so you need to import it again
        textElm.innerHTML = `HMR valueToLog hello: ${valueToLog}`;
    });
    module.hot.accept('./testing', () => {
        console.log("accepting ./testing");
        const { texting } = require('./testing');
        texElm2.innerHTML = `HMR value to log 2: ${texting}`;
    });
    module.hot.accept('./reactTodo/App.tsx', () => {
        console.log("accepting ./reactTodo/App.tsx");
        const {App} = require('./reactTodo/App.tsx');
        render(<App />, reactContainer);
    });
    module.hot.accept();
}