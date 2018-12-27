import webpack, { Stats } from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
var config = require('../webpack.config');

export class WebpackUniversalHMRServer {

    private compiler: webpack.Compiler;
    private server: WebpackDevServer;

    constructor(port:number,quiet:boolean) {
        this.compiler = webpack(config);
        this.server = new WebpackDevServer(this.compiler, {
            publicPath: '/',
            hot: true,
            inline: true,
            quiet
            //historyApiFallback: true
        }).listen(port, 'localhost', function (err: Error) {
            if (err) {
                console.log(err);
            }
            if(!quiet) {
                console.log(`${WebpackUniversalHMRServer.name} listening at localhost:${port}`);
            }
        });
    }

    registerLoadedHandler(f: (stats:Stats)=>void) {
        this.compiler.hooks.done.tap(WebpackUniversalHMRServer.name, function(stats: Stats) {
            f(stats);
        });
    }

    async close() {
        const self = this;
        return new Promise(function(resolve, reject) {
            self.server.close(function() {
                resolve();
            });
        });
    }
}