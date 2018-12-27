const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    devtool: 'eval',
    mode: 'development',
    entry: [
        //'webpack-dev-server/client?http://localhost:8080',
        './tooling/hot_entry_clients/typescript-dev-server/websocket?http://localhost:8080',
        //'webpack/hot/dev-server',
        './tooling/hot_entry_clients/typescript-dev-server/browser-reload',
        './src/web/index.ts',
    ],
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'awesome-typescript-loader',
                    options: {
                        silent: true
                    }
                }
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    plugins: [new HtmlWebpackPlugin(), new webpack.HotModuleReplacementPlugin(), new webpack.NoEmitOnErrorsPlugin()]
};
