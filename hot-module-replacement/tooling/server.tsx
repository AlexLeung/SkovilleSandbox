var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var config = require('../webpack.config');
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

const port = 8080;
new WebpackDevServer(webpack(config), {
    publicPath: '/',
    hot: true,
    inline: true,
    headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
        "Access-Control-Allow-Headers": "X-Requested-With, content-type, Authorization"
    }
}).listen(port, 'localhost', function (err, result) {
    if (err) {
        console.log(err);
    }
    console.log(`Listening at localhost:${port}`);
});