import {WebpackDevSecOps} from './webpack-dev-sec-ops';
import {WebpackDevSecOpsServer} from './webpack-dev-sec-ops/server';
import { HMRServer } from './hmr-server';
import webpack from 'webpack';
import HTMLWebpackPlugin from 'html-webpack-plugin';

function createConfig(port: number): webpack.Configuration {
    return {
        devtool: 'eval',
        mode: 'development',
        entry: [
            `./tooling/webpack-dev-sec-ops/client/web.ts?http://localhost:${port}`,
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
            new HTMLWebpackPlugin(),
            new webpack.HotModuleReplacementPlugin(),
            new webpack.NoEmitOnErrorsPlugin(),
            new WebpackDevSecOps.Plugin({id: "web"})
        ],
        stats: {
            colors: true,
        }
    };
}

export class PluginHMRServer implements HMRServer {

    private compiler: webpack.Compiler;
    private waitingResolves: ((stats: webpack.Stats) => void)[];
    private watchingInstance: webpack.Compiler.Watching;

    public constructor(port: number) {
        new WebpackDevSecOpsServer(port);
        this.compiler = webpack(createConfig(port));
        this.waitingResolves = [];
        this.compiler.hooks.done.tap(PluginHMRServer.name, (stats: webpack.Stats) => {
            if(this.waitingResolves.length > 0) {
                for(const resolve of this.waitingResolves) {
                    resolve(stats);
                }
                this.waitingResolves = [];
            }
        });
        this.watchingInstance = this.compiler.watch({}, (err) => {
            if (err) {
                console.log("WATCH ERROR START");
                console.error(err.stack || err);
                if ((err as any).details) {
                    console.error((err as any).details);
                }
                console.log("WATCH ERROR END");
            } else {
                console.log("NO WATCH ERROR");
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