import webpack, { compilation } from 'webpack';
import path from 'path';
var WebpackDevServer = require('webpack-dev-server');
import {port} from './constants';

const OrigHMREntries = [
    `webpack-dev-server/client?http://localhost:${port}`,
    'webpack/hot/dev-server'
];
const CustomHMREntries = [
    `./tooling/client/typescript-dev-server/websocket?http://localhost:${port}`,
    './tooling/client/typescript-dev-server/browser-reload',
];
const serverEntries = [
    './server_sample/server.tsx'
];
const webEntries = [
    './src/index.tsx'
];

function generateWebpackConfig(entries: string[], dev: boolean, target: 'web' | 'node', bundleName: string): webpack.Configuration {
    const outPath = path.resolve('./dist');
    const config: webpack.Configuration = {
        devtool: 'eval',
        mode: dev ? 'development' : 'production',
        entry: [
            ...(dev ? OrigHMREntries : []),
            ...entries
        ],
        output: {
            path: path.resolve('./dist'),
            filename: bundleName
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
            ...(dev ? [new webpack.HotModuleReplacementPlugin(), new webpack.NoEmitOnErrorsPlugin()]: [])
        ],
        resolve: {
            extensions: ['.tsx', '.ts', '.js']
        },
        target,
    };
    return config;
}

const webConfig = generateWebpackConfig(webEntries, true, "web", 'web.js');
const serverConfig = generateWebpackConfig(serverEntries, true, 'node', 'server.js');

const web = true;

const applicationConfig = web ? webConfig : serverConfig;

// We want to write out a static file whose job is to reference the webpack dev server for the real code.
const devEntryConfig = generateWebpackConfig(['./tooling/client/universal.ts'], false, web ? 'web' : 'node', web ? 'web.js' : 'server.js');
webpack(devEntryConfig).run(function(err, stats) {
    if(stats.hasErrors()) {
        console.log("errors");
        console.error(stats.compilation.errors);
    } else {
        console.log("done");
    }
});

new WebpackDevServer(webpack(applicationConfig), {
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