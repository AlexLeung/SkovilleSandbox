import http from 'http';
import express from 'express';
import {message} from './wording';

var theMessage = message;

const app = express();
app.get("/hello-world", (req, res) => {
    res.type("html");
    res.send(theMessage);
});
app.listen(8000, () => {
    console.log("listening");
});

if(module.hot) {
    console.log("module is hot");
    module.hot.accept("./wording", () => {
        theMessage = require('./wording').message;
    });
}