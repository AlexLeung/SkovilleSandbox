const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
    devtool: 'eval',
    mode: 'development',
    entry: [
        'webpack-dev-server/client?http://localhost:8080',
        'webpack/hot/only-dev-server',
        './src/index.tsx',
    ],
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
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    plugins: [new HtmlWebpackPlugin(), new webpack.HotModuleReplacementPlugin(), new webpack.NoEmitOnErrorsPlugin()]
};
