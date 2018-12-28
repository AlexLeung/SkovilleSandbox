import webpack, { Stats } from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
var config = require('../webpack.config');

export class WebpackUniversalHMRServer {

    private compiler: webpack.Compiler;
    private server: WebpackDevServer;
    private waitingResolves: ((stats: Stats) => void)[];

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
        this.waitingResolves = [];
        this.compiler.hooks.done.tap(WebpackUniversalHMRServer.name, (stats: Stats) => {
            if(this.waitingResolves.length > 0) {
                for(const resolve of this.waitingResolves) {
                    resolve(stats);
                }
                this.waitingResolves = [];
            }
        });
    }

    async waitUntilNextEmission() {
        return new Promise((resolve, reject) => {
            this.waitingResolves.push((stats: Stats) => {
                if(stats.hasErrors()) {
                    reject(stats.compilation.errors.join("\n"));
                } else {
                    resolve();
                }
            });
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