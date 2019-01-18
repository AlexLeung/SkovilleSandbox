import {WebpackDevSecOpsPlugin,WebpackDevSecOpsClusterWSWorkerBuilder} from './webpack-dev-sec-ops';
import { HMRServer } from './hmr-server';
import webpack from 'webpack';
import ClusterWS from 'clusterws';
import HTMLWebpackPlugin from 'html-webpack-plugin';

const workerBuilder = new WebpackDevSecOpsClusterWSWorkerBuilder();
function createConfig(port: number): webpack.Configuration {
    const server = new ClusterWS({
        port,
        worker: workerBuilder.getWorker()
    });
    return {
        devtool: 'eval',
        mode: 'development',
        entry: [
            `./tooling/webpack-dev-sec-ops-plugin/client/web.ts?http://localhost:${port}`,
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
            new webpack.NoEmitOnErrorsPlugin()
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
        const test = new WebpackDevSecOpsPlugin("web", workerBuilder);
        this.compiler = webpack(createConfig(port));
        test.apply(this.compiler);
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