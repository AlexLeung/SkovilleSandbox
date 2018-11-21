console.log("server.ts is running");
import {message} from './wording';
import express from 'express';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import path from 'path';

let curNumber = 0;
let mess = message;
setInterval(function() {
    curNumber++;
    console.log(curNumber, mess);
}, 5000);
console.log(curNumber, mess);


/*
if(module.hot) {
    module.hot.accept('./wording', function() {
        console.log('accepting ./wording');
        const {message} = require('./wording');
        mess = message;
    });
}
*/

const app = express();
app.get('/', (req, res) => {
    res.send(
        renderToStaticMarkup(
            <html>
                <head>
                    <meta charSet="UTF-8" />
                    <title>Universal TypeScript HMR Server</title>
                </head>
                <body>
                    <script type="text/javascript" src="/main.js" />
                </body>
            </html>
        )
    );
});
app.get('/main.js', (req, res) => {
    res.sendFile(path.resolve('./dist/server.js'));
});
app.listen(3000);