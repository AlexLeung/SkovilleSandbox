var webpack = require('webpack');
var WebpackDevServer = require('webpack-dev-server');
var config = require('../webpack.config');

const port = 8080;
new WebpackDevServer(webpack(config), {
  publicPath: '/',
  hot: true,
  inline: true
  //historyApiFallback: true
}).listen(port, 'localhost', function (err, result) {
  if (err) {
    console.log(err);
  }
  console.log(`Listening at localhost:${port}`);
});