console.log("hmr-test.ts is running");
import {appState} from './hmr-test-state';
import {style} from './hmr-test-style';

export const containerElement = document.createElement("div");
containerElement.style.cssText = style;

const numberElement = document.createElement("div");
containerElement.append(numberElement);
function updateNumber() {
    numberElement.innerHTML = ""+appState.getCurNumber();
    appState.setNumber(appState.getCurNumber()+1);
}
updateNumber();

const buttonElement = document.createElement("input");
buttonElement.setAttribute("type", "button");
buttonElement.setAttribute("id", "button-el");
buttonElement.setAttribute("value", "Increment");
buttonElement.onclick = updateNumber;
containerElement.append(buttonElement);

if(module.hot) {
    module.hot.accept("./hmr-test-style", function() {
        console.log("accepting ./hmr-test-style");
        const {style} = require("./hmr-test-style");
        containerElement.style.cssText = style;
    });
}