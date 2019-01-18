import webpack, { Stats } from 'webpack';
//import WebpackDevServer from 'webpack-dev-server';
import WebpackDevServer from './server/webpack-dev-server/Server';
//import {WebpackDevSecOpsServer} from './server/minimal-server';
import {WebpackDevSecOpsServer} from './server/from-scratch/server';
import {HMRServer} from './hmr-server';
var config = require('../webpack.config');

export class WebpackUniversalHMRServer implements HMRServer {

    private compiler: webpack.Compiler;
    private server: WebpackDevSecOpsServer;
    private waitingResolves: ((stats: Stats) => void)[];

    constructor(port:number,quiet:boolean) {
        this.compiler = webpack(config);
        const options = {
            publicPath: '/',
            hot: true,
            inline: true,
            quiet
            //historyApiFallback: true
        };
        const customServer = true;
        if(customServer) {
            this.server = new WebpackDevSecOpsServer(this.compiler, false, options);
        } else {
            this.server = new WebpackDevServer(this.compiler, options);
        }
        console.log("about to listen");
        this.server.listen(port, 'localhost', function (err: Error) {
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
        console.log("waitUntilNextEmission");
        await new Promise((resolve, reject) => {
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
        await new Promise(function(resolve, reject) {
            self.server.close(function() {
                resolve();
            });
        });
    }
}