import webpack from 'webpack';
import path from 'path';
var WebpackDevServer = require('webpack-dev-server');
var config = require('../webpack.config');
import {port} from './client/universal';

const OrigHMREntries = [
    `webpack-dev-server/client?http://localhost:${port}`,
    'webpack/hot/dev-server'
];
const CustomHMREntries = [
    `./tooling/hot_entry_clients/typescript-dev-server/websocket?http://localhost:${port}`,
    './tooling/hot_entry_clients/typescript-dev-server/browser-reload',
];
const serverEntries = [
    './server_sample/server.tsx'
];
const webEntries = [
    './src/index.tsx'
];

function generateWebpackConfig(entries: string[], dev: boolean, target: 'web' | 'node'): webpack.Configuration {
    const config = {
        devtool: 'eval',
        mode: dev ? 'development' : 'production',
        entry: [
            ...(dev ? CustomHMREntries : []),
            ...entries
        ],
        output: {
            path: path.resolve(),
            filename: ''
        },
        module: {
            rules: [
                {
                    test: /\.tsx?$/,
                    use: {
                        loader: 'awesome-typescript-loader'
                    }
                }
            ]
        },
        plugins: [
            ...(hmr ? [new webpack.HotModuleReplacementPlugin(), new webpack.NoEmitOnErrorsPlugin()]: [])
        ],
        resolve: {
            extensions: ['.tsx', '.ts', '.js']
        },
        target
    };
    return config;
}

const webConfig = generateWebpackConfig(webEntries, true, "web");
const serverConfig = generateWebpackConfig(serverEntries, true, 'node');
const web = true;

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