// A HUGE bug that is blocking a cleaner implementation is the current lack of a functioning close() API on webpack dev server.
// Because close() does not work, the server always remains running, thus jest breaks. One temp solution is to put it in a
// separate proces then kill the process, but it should in theory be easier to modify WebpackDevServer and make sure it is actually
// closeable. If we wanted to use the thread route, we'd need to figure out a way to spwn a new ts-node thread rather than
// just a generic node thread, which seems to be more time than it's worth.
import {HMRServer} from '../tooling/hmr-server';
import {WebpackUniversalHMRServer} from '../tooling/webpack-universal-hmr-server';
import {PluginHMRServer} from '../tooling/plugin-hmr-server';

import selenium from 'selenium-webdriver';
import firefox from 'selenium-webdriver/firefox';
import path from 'path';
import {promisify} from 'util';
import fs, { write } from 'fs';
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const {By, until} = selenium;
const firefoxOptions = new firefox.Options();
firefoxOptions.addArguments('-headless');
const webdriver = new selenium.Builder()
    .forBrowser('firefox')
    .setFirefoxOptions(firefoxOptions)
    .build();

// Instantiate HMR Server
const HMRServerVersion: number = 2;
let hmrServer: HMRServer;
switch(HMRServerVersion) {
    case 1:
        hmrServer = new WebpackUniversalHMRServer(8080, true);
        break;
    case 2:
        hmrServer = new PluginHMRServer(8080, false);
        break;
}

function assert(condition:boolean, failureMessage:string) {
    if(!condition) throw new Error(failureMessage);
}

interface Color {
    name: string;
    rgb: string;
}
const PEACH_PUFF = {name: "peachpuff", rgb:"rgb(255, 218, 185)"};
const GREY = {name: "grey", rgb:"rgb(128, 128, 128)"};

(async function() {
    async function assertNumber(num: number) {
        const numberContainer = await webdriver.findElement(By.id("number-el"));
        const curNumber = Number.parseInt(await numberContainer.getText());
        assert(curNumber == num, "curNumber should be " + num + ". Is instead " + curNumber);
        console.log("curNumber is " + num);
    }
    async function assertColor(color: Color) {
        const containerElement = await webdriver.findElement(By.id("container-el"));
        const bgColor = await containerElement.getCssValue("background-color");
        assert(bgColor == color.rgb, "bgColor should be " + color.rgb + ". Is instead " + bgColor);
        console.log("bgColor is " + color.name);
    }
    async function increment(times: number) {
        const buttonElement = await webdriver.findElement(By.id("button-el"));
        for(let i = 0; i < times; ++i) await buttonElement.click();
        console.log("incremented " + times + " times.");
    }
    async function replaceCode(path:string,pattern:RegExp,replacement:string) {
        let code = await readFile(path, 'utf8');
        code = code.replace(pattern, replacement);
        await writeFile(path, code, 'utf8');
        console.log("in " + path + ", \"" + pattern.source + "\" replaced by \"" + replacement + "\"");
    }
    async function restUntilHMRDone() {
        await hmrServer.waitUntilNextEmission();
        await webdriver.sleep(500);
        console.log("waited until next HMR emission");
    }
    try {
        await hmrServer.waitUntilNextEmission();
        console.log("emitted");
        // Open localhost:8080 in headless browser
        await webdriver.get('http://localhost:8080'); // Wait until it finished loading.
        console.log("finished loading");
        // Ensure that 0 is in element and bg color is original peachpuff color
        await Promise.all([assertNumber(0), assertColor(PEACH_PUFF)]);
        // Increment 3 times
        await increment(3);
        // Modify hmr-test-style.ts file.
        const styleCodeFilePath = path.resolve('./src/web/hmr-test-style.ts');
        await replaceCode(styleCodeFilePath, /peachpuff/g, GREY.name);
        // Wait until hmr is finished.
        await restUntilHMRDone();
        // Ensure that 3 is in element and bg color matches new value
        await Promise.all([assertNumber(3), assertColor(GREY)]);
        // Modify hmr-test.ts file.
        const mainTestCodeFilePath = path.resolve("./src/web/hmr-test.ts");
        await replaceCode(mainTestCodeFilePath, /HELLO WORLD/g, 'HELLO WORLD modified');
        // Wait until reload is finished.
        await restUntilHMRDone();
        // Ensure that 0 is in element and bg color is new value of grey.
        await Promise.all([assertNumber(0), assertColor(GREY)]);
        // Increment 6 times
        await increment(6);
        // Modify hmr-test-style.ts file.
        await replaceCode(styleCodeFilePath, /grey/g, PEACH_PUFF.name);
        // Wait until reload is finished.
        await restUntilHMRDone();
        // Ensure that 6 is in element and bg color is original peachpuff color
        await Promise.all([assertNumber(6), assertColor(PEACH_PUFF)]);
        // Modify hmr-test.ts file back to original state.
        await replaceCode(mainTestCodeFilePath, /HELLO WORLD modified/g, 'HELLO WORLD');
        // Wait until reload is finished.
        await restUntilHMRDone();
        // Ensure that 0 is in element and bg color is original peachpuff color
        await Promise.all([assertNumber(0), assertColor(PEACH_PUFF)]);
    } catch(e) {
        console.error("ERROR");
        console.log(e);
    } finally {
        console.log("cleaning up.");
        await webdriver.close();
        console.log("webdriver closed.");
        await hmrServer.close();
        console.log("hmrServer closed.");
        process.exit();
    }
})();