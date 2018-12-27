import './send-log';
console.log("index.ts is running");
import { counterElement } from './counter';
document.body.append(counterElement);
if (module.hot) {
    console.log("module is hot");
}