import webpack from "webpack";
import webpackDevMiddleware from 'webpack-dev-middleware';
import express from 'express';
import http from 'http';
import sockjs from 'sockjs';

enum ClientLogLevel {
    NONE = 'none',
    INFO = 'info',
    ERROR = 'error',
    WARNING = 'warning'
}

enum ServerLogLevel {
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
class WebpackDevSecOpsServer {

    private sockets: sockjs.Connection[];
    private middleware: webpackDevMiddleware.WebpackDevMiddleware;
    private app: express.Express;
    private _stats: webpack.Stats;
    private listeningApp: http.Server;
    private showProgress: boolean;
    private clientLogLevel: ClientLogLevel;
    private log: any; // Consider submitting typings files for webpack-log.

    private static STATS = {
        all: false,
        hash: true,
        assets: true,
        warnings: true,
        errors: true,
        errorDetails: false
    };

    constructor(compilers: webpack.Compiler | webpack.MultiCompiler, showProgress: boolean, clientLogLevel: ClientLogLevel, options: webpackDevMiddleware.Options) {
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
            compile.tap('webpack-dev-server', invalidPlugin);
            invalid.tap('webpack-dev-server', invalidPlugin);
            done.tap('webpack-dev-server', (stats) => {
                console.log("about to send stats");
                console.log(JSON.stringify(stats));
                const toSend = stats.toJson(WebpackDevSecOpsServer.STATS);
                console.log("stats to send = " + toSend);
                this._sendStats(this.sockets, toSend, false);
                this._stats = stats;
            });
        };
        for(const compiler of webpackCompilers) {
            addHooks(compiler);
        }

        this.app = express();
        // middleware for serving webpack bundle
        this.middleware = webpackDevMiddleware(compilers, {...options, logLevel: 'info'});
        this.app.all('*', (req, res, next) => {
            console.log("incoming request");
            console.log(JSON.stringify(req));
            next();
        });

        // compress is placed last and uses unshift so that it will be the first middleware used
        /*
        if (options.compress) {
            // Enable gzip compression.
            this.app.use(compress());
        }
        */
        this.app.get('*', this.serveMagicHtml);
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
                if (!connection) {
                    return;
                }
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

    public close() {
        this.sockets.forEach((socket) => {
            socket.close();
        });
        this.sockets = [];
        this.middleware.close(() => {
            this.listeningApp.close();
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

    private serveMagicHtml() {

    }

    private _sendStats(sockets: sockjs.Connection[], stats, force) {
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
}