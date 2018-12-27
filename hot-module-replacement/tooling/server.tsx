import webpack from 'webpack';
import path from 'path';
var WebpackDevServer = require('webpack-dev-server');
import {config} from './json-intake';

const OrigHMREntries = [
    `webpack-dev-server/client?http://localhost:${config.port}`,
    'webpack/hot/dev-server'
];
const CustomHMREntries = [
    `./tooling/client/typescript-dev-server/websocket?http://localhost:${config.port}`,
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
            ...(dev ? CustomHMREntries : []),
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
const devEntryConfig = generateWebpackConfig(['./tooling/universal.ts'], false, web ? 'web' : 'node', web ? 'web.js' : 'server.js');
console.log(JSON.stringify(devEntryConfig));
webpack(devEntryConfig);
/*
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
*/