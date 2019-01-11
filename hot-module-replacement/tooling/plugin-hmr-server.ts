import {WebpackDevSecOpsServerPlugin} from './webpack-dev-sec-ops-plugin/plugin';
import { HMRServer } from './hmr-server';
import webpack from 'webpack';

function createConfig(port: number): webpack.Configuration { return {
    devtool: 'eval',
    mode: 'development',
    entry: [
        `./tooling/webpack-dev-sec-ops-plugin/client/index.ts?http://localhost:${port}`,
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
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        new WebpackDevSecOpsServerPlugin()
    ]
};}

export class PluginHMRServer implements HMRServer {

    private compiler: webpack.Compiler;
    private waitingResolves: ((stats: webpack.Stats) => void)[];
    private watchingInstance: webpack.Compiler.Watching;

    public constructor(port: number) {
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
        this.watchingInstance = this.compiler.watch({}, () => {
            console.log("watch");
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