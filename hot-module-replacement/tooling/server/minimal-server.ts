import webpack from "webpack";
import express from 'express';
import http from 'http';
import path from 'path';
import sockjs from 'sockjs';
import MemoryFileSystem from 'memory-fs';
import mime from 'mime';

export interface Options {
    logLevel?: string;
    lazy?: boolean;
    watchOptions?: webpack.Options.WatchOptions;
    publicPath: string;
    index?: string | boolean;
    stats?: webpack.Options.Stats;
    serverSideRender?: boolean;
    filename?: string;
    writeToDisk?: boolean | ((filename: string) => boolean);
    mimeTypes?: mime.TypeMap;
}

export enum ClientLogLevel {
    NONE = 'none',
    INFO = 'info',
    ERROR = 'error',
    WARNING = 'warning'
}

export enum ServerLogLevel {
    INFO = "info",
    WARN = "warn",
    ERROR = "error",
    DEBUG = "debug",
    TRACE = "trace",
    SILENT = "silent"
}

function createLogger (options) {
  let level = options.logLevel || 'info';

  if (options.noInfo === true) {
    level = 'warn';
  }

  if (options.quiet === true) {
    level = 'silent';
  }

  return require('webpack-log')({
    name: 'wds',
    level,
    timestamp: options.logTime
  });
}

// Here is an attempt at creating a webpack dev server from scratch without really knowing much about how it should work.
export class WebpackDevSecOpsServer {
    private sockets: sockjs.Connection[];
    private app: express.Express;
    private _stats: webpack.Stats;
    private listeningApp: http.Server;
    private showProgress: boolean;
    private clientLogLevel: ClientLogLevel;
    private log: any; // Consider submitting typings files for webpack-log.
    private watching: webpack.Watching;

    private static STATS = {
        all: false,
        hash: true,
        assets: true,
        warnings: true,
        errors: true,
        errorDetails: false
    };

    constructor(compilers: webpack.Compiler | webpack.MultiCompiler, showProgress: boolean, options: Options, clientLogLevel?: ClientLogLevel) {
        (options as any).hot = true;
        this.log = createLogger(options);
        this.clientLogLevel = clientLogLevel;
        this.sockets = [];
        const webpackCompilers = 'compilers' in compilers ? compilers.compilers : [compilers];
        const invalidPlugin = () => {
            this.sockWrite(this.sockets, 'invalid');
        };
        this.showProgress = showProgress;
        if (showProgress) {
            const progressPlugin = new webpack.ProgressPlugin(
                (percent, msg, addInfo) => {
                    percent = Math.floor(percent * 100);
                    if (percent === 100) msg = 'Compilation completed';
                    if (addInfo) msg = `${msg} (${addInfo})`;
                    this.sockWrite(this.sockets, 'progress-update', { percent, msg });
                }
            );
            for(const compiler of webpackCompilers) {
                progressPlugin.apply(compiler);
            }
        }
        const addHooks = (compiler: webpack.Compiler) => {
            const { compile, invalid, done } = compiler.hooks;
            compile.tap('webpack-dev-server', function() {
                console.log("compilation tap");
                invalidPlugin();
            });
            invalid.tap('webpack-dev-server', function() {
                console.log("invalid tap");
                invalidPlugin();
            });
            done.tap('webpack-dev-server', (stats) => {
                console.log("about to send stats");
                const toSend = stats.toJson(WebpackDevSecOpsServer.STATS);
                console.log("num sockets = " + this.sockets.length);
                console.log("hash = " + stats.hash);
                this._sendStats(this.sockets, toSend, false);
                this._stats = stats;
            });
        };
        for(const compiler of webpackCompilers) {
            if(!compiler.options.plugins.some(plugin => plugin instanceof webpack.HotModuleReplacementPlugin)) {
                throw new Error("Webpack config must contain initialized HotModuleReplacementPlugin");
            }
            addHooks(compiler);
        }
        this.app = express();
        this.app.all('*', (req, res, next) => {
            console.log("incoming request");
            console.log(req.originalUrl);
            console.log(req.method);
            return next();
        });
        const compiler = compilers as webpack.Compiler;
        const fs = compiler.outputFileSystem = new MemoryFileSystem();
        this.watching = compiler.watch({}, (err) => {
            console.log("WATCH");
        });
        this.app.get("*", (req, res, next) => {
            const publicPath = (compiler.options.output && compiler.options.output.publicPath) || "/";
            const outputPath = (compiler as any).outputPath;
            const destination = req.path.endsWith("/") ? req.path+"index.html" : req.path;
            const adjustedPath = path.resolve(outputPath + '/' + (destination.substring(publicPath.length)));
            console.log("adjustedPath = " + adjustedPath);
            if(!fs.existsSync(adjustedPath)) return next();
            res.setHeader('Content-Type', mime.getType(adjustedPath));
            fs.createReadStream(adjustedPath).pipe(res);
        });
        this.listeningApp = http.createServer(this.app);
    }

    public listen(port: number, hostname: string, fn: Function) {
        const returnValue = this.listeningApp.listen(port, hostname, (err) => {
            const socket = sockjs.createServer({
                // Use provided up-to-date sockjs-client
                sockjs_url: '/__webpack_dev_server__/sockjs.bundle.js',
                // Limit useless logs
                log: (severity, line) => {
                    if (severity === 'error') {
                        this.log.error(line);
                    } else {
                        this.log.debug(line);
                    }
                }
            });
            socket.on('connection', (connection) => {
                if (!connection) return;
                this.sockets.push(connection);
                connection.on('close', () => {
                    const idx = this.sockets.indexOf(connection);
                    if (idx >= 0) {
                        this.sockets.splice(idx, 1);
                    }
                });
                if (true/*this.hot*/) {
                    this.sockWrite([ connection ], 'hot');
                }
                if (this.showProgress) {
                    this.sockWrite([ connection ], 'progress', this.showProgress);
                }
                if (this.clientLogLevel) {
                    this.sockWrite([ connection ], 'log-level', this.clientLogLevel);
                }
                if (!this._stats) {
                    return;
                }
                this._sendStats([ connection ], this._stats.toJson(WebpackDevSecOpsServer.STATS), true);
            });
            socket.installHandlers(this.listeningApp, {
                prefix: '/sockjs-node'
            });
            if (fn) {
                fn.call(this.listeningApp, err);
            }
        });
        return returnValue;
    }

    public close(cb: Function) {
        this.sockets.forEach((socket) => {
            socket.close();
        });
        this.sockets = [];
        this.watching.close(() => {
            this.listeningApp.close(function() {
                cb();
            });
        });
    }

    private sockWrite(sockets: sockjs.Connection[], name: string, data?:any) {
        console.log("socketWrite: " + name + ", data: " + JSON.stringify(data));
        sockets.forEach((socket) => {
            socket.write(
                JSON.stringify({ type: name, data })
            );
        });
    }

    private _sendStats(sockets: sockjs.Connection[], stats, force) {
        console.log("SEND STATS");
        if (
            !force && stats && (!stats.errors || stats.errors.length === 0) && stats.assets && 
            stats.assets.every(asset => !asset.emitted)
        ) {
            return this.sockWrite(sockets, 'still-ok');
        }
        this.sockWrite(sockets, 'hash', stats.hash);
        if (stats.errors.length > 0) {
            this.sockWrite(sockets, 'errors', stats.errors);
        } else if (stats.warnings.length > 0) {
            this.sockWrite(sockets, 'warnings', stats.warnings);
        } else {
            this.sockWrite(sockets, 'ok');
        }
    }
};