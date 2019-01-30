import {WebpackDevSecOps} from './webpack-dev-sec-ops';
import {WebpackDevSecOpsServer} from './webpack-dev-sec-ops/server';
import { HMRServer } from './hmr-server';
import webpack from 'webpack';
import HTMLWebpackPlugin from 'html-webpack-plugin';

function createConfig(port: number, node: boolean): webpack.Configuration {
    return {
        devtool: 'eval',
        mode: 'development',
        entry: node ? 
        [
            `./tooling/webpack-dev-sec-ops/client/node?http://localhost:${port}`,
            './src/node/server.ts'
        ]
        :
        [
            `./tooling/webpack-dev-sec-ops/client/socket?http://localhost:${port}`,
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
        plugins: [
            ...(node ? [] : [new HTMLWebpackPlugin()]),
            new webpack.HotModuleReplacementPlugin(),
            new webpack.NoEmitOnErrorsPlugin(),
            new WebpackDevSecOps.Plugin("web", {hot: true, restarting: true, memoryFS: false})
        ],
        stats: {
            colors: true,
        },
        target: node ? "node" : "web"
    };
}

export class PluginHMRServer implements HMRServer {

    private compiler: webpack.Compiler;
    private waitingResolves: ((stats: webpack.Stats) => void)[];
    private watchingInstance: webpack.Compiler.Watching;

    public constructor(port: number, node: boolean) {
        new WebpackDevSecOpsServer(port);
        this.compiler = webpack(createConfig(port, node));
        this.waitingResolves = [];
        this.compiler.hooks.done.tap(PluginHMRServer.name, (stats: webpack.Stats) => {
            if(this.waitingResolves.length > 0) {
                for(const resolve of this.waitingResolves) {
                    resolve(stats);
                }
                this.waitingResolves = [];
            }
        });
        this.watchingInstance = this.compiler.watch({}, (err, stats) => {
            if (err) {
                console.log("WATCH ERROR START");
                console.error(err.stack || err);
                if ((err as any).details) {
                    console.error((err as any).details);
                }
                console.log("WATCH ERROR END");
            } else {
                console.log("testing testing 1234");
                if(stats.hasErrors()) {
                    console.log("STATS HAS ERRORS");
                } else if(stats.hasWarnings()) {
                    console.log("STATS HAS WARNINGS");
                } else {
                    console.log("NO APPARENT PROBLEM");
                }
            }
        });
    }

    public async waitUntilNextEmission() {
        console.log("waitUntilNextEmission");
        await new Promise((resolve, reject) => {
            this.waitingResolves.push((stats: webpack.Stats) => {
                if(stats.hasErrors()) {
                    reject(stats.compilation.errors.join("\n"));
                } else {
                    resolve();
                }
            });
        });
    }

    public async close() {
        await new Promise((resolve, reject) => {
            this.watchingInstance.close(() => {
                console.log("watchingInstance close callback");
                resolve();
            })
        });
    }
}