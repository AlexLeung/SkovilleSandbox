console.log("counter.ts is running");
import {appState} from './state';
import {style} from './counter-style';

export const counterElement = document.createElement("div");
counterElement.style.cssText = style;
if(appState.getIntervalId()) {
    clearInterval(appState.getIntervalId());
}
const intId = setInterval(updateCounter, 1000);
function updateCounter() {
    counterElement.innerHTML = ""+appState.getElapsedSeconds();
    appState.setElapsedSeconds(appState.getElapsedSeconds()+1);
}
updateCounter();
appState.setIntervalId(intId);
if(module.hot) {
    module.hot.accept("./counter-style", function() {
        console.log("accepting ./counter-style");
        const {style} = require("./counter-style");
        counterElement.style.cssText = style;
    });
}