//import {WebpackDevSecOpsServerPlugin} from './webpack-dev-sec-ops-plugin/plugin';
import { HMRServer } from './hmr-server';
import webpack from 'webpack';

const config: webpack.Configuration = {
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
    plugins: [
        //new WebpackDevSecOpsServerPlugin(),
        new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin()
    ]
};

export class PluginHMRServer implements HMRServer {

    private compiler: webpack.Compiler;
    private waitingResolves: ((stats: webpack.Stats) => void)[];
    
    public constructor(port: number) {
        this.compiler = webpack(config);
        this.waitingResolves = [];
        this.compiler.hooks.done.tap(PluginHMRServer.name, (stats: webpack.Stats) => {
            if(this.waitingResolves.length > 0) {
                for(const resolve of this.waitingResolves) {
                    resolve(stats);
                }
                this.waitingResolves = [];
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
        
    }
}