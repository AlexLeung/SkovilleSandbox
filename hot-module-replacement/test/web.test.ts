// A HUGE bug that is blocking a cleaner implementation is the current lack of a functioning close() API on webpack dev server.
// Because close() does not work, the server always remains running, thus jest breaks. One temp solution is to put it in a
// separate proces then kill the process, but it should in theory be easier to modify WebpackDevServer and make sure it is actually
// closeable.
import {WebpackUniversalHMRServer} from '../tooling/webpack-universal-hmr-server';
import { Stats } from 'webpack';
const Browser = require('zombie');
const hmrServer = new WebpackUniversalHMRServer(8080, true);
// Instantiate Webpack Universal HMR Server
const finishedEmitting = new Promise(function(resolve, reject) {
    let runOnce = false;
    // Wait until built.
    hmrServer.registerLoadedHandler(function(stats: Stats) {
        if(stats.hasErrors()) {
            reject(stats.compilation.errors.join("\n"));
        } else {
            if(!runOnce) {
                runOnce = true;
                resolve();
            }
        }
    });
});

// Instantiate headless browser
const browser = new Browser();

(async function() {
    try {
        await finishedEmitting;
        console.log("emitted");
        // Open localhost:8080 in headless browser
        Browser.localhost('localhost', 8080);
        // Wait until it finished loading.
        //await browser.visit("/"); <---- THIS IS CURRENTLY FAILING. likely because of some problem with Zombie not supporting latest browser APIs.
        console.log("finished loading");
        console.log(browser.source);
    } catch(e) {
        console.log(e);
        console.log("time to cleanup");
    }
    await browser.tabs.closeAll();
    await hmrServer.close();
    process.exit();
})()



// Ensure that 0 is in element and bg color is original peachpuff color
// Increment 3 times
// Modify hmr-test-style.ts file.
// Ensure that 3 is in element and bg color matches new value
// Modify hmr-test.ts file.
// Expect reload event to occur.
// Wait until reload is finished.
// Ensure that 0 is in element and bg color is new value of grey.
// Increment 6 times
// Modify hmr-test-style.ts file.
// Ensure that 6 is in element and bg color is original peachpuff color
// Modify hmr-test.ts file back to original state.
// Expect reload event to occur.
// Wait until reload is finished.
// Ensure that 0 is in element and bg color is original peachpuff color
