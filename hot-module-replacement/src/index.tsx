import './send-log';
console.log("index.tsx is running");
import { containerElement } from './hmr-test';
document.body.append(containerElement);
if (module.hot) {
    console.log("module is hot");
}