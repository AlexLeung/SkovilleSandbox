'use strict';
import mime from 'mime';
import { setFs, toDisk } from './lib/fs';
import { getFilenameFromUrl, noop, ready, handleRequest, handleRangeHeaders } from './lib/util';
import webpack from 'webpack';
import {Logger} from 'loglevel';
import {reporter} from './lib/reporter';
import {createContext} from './lib/context';
import MemoryFileSystem from 'memory-fs';
import { NextFunction, Request, Response } from 'express';
import path from 'path';
import {DevMiddlewareError} from './lib/DevMiddlewareError';

type Reporter = (middlewareOptions: Options, reporterOptions: ReporterOptions) => void;

export interface Options {
    logLevel?: string;
    lazy?: boolean;
    watchOptions?: webpack.Options.WatchOptions;
    publicPath: string;
    index?: string | boolean;
    headers?: {
        [name: string]: string;
    };
    stats?: webpack.Options.Stats;
    reporter?: Reporter | null;
    serverSideRender?: boolean;
    logger?: Logger;
    filename?: string;
    writeToDisk?: boolean | ((filename: string) => boolean);
    mimeTypes?: mime.TypeMap;
}

interface ReporterOptions {
    state: boolean;
    stats?: webpack.Stats;
    log: Logger;
}

export class WebpackDevMiddleware {

    private context;

    public fileSystem: MemoryFileSystem;

    private static DEFAULTS = {
        logLevel: 'info',
        logTime: false,
        logger: null,
        mimeTypes: null,
        reporter,
        stats: {
          colors: true,
          context: process.cwd()
        },
        watchOptions: {
          aggregateTimeout: 200
        },
        writeToDisk: false,
    };

    constructor(compiler: webpack.Compiler | webpack.MultiCompiler, opts: Options) {
        const options: Options = {...WebpackDevMiddleware.DEFAULTS, ...opts};
        // defining custom MIME type
        if (options.mimeTypes) {
            mime.define(options.mimeTypes);
        }
        this.context = createContext(compiler, options);
        // start watching
        if (!options.lazy) {
            const watching = compiler.watch(options.watchOptions, (err) => {
                if (err) {
                    this.context.log.error(err.stack || err);
                    if ((err as any).details) {
                        this.context.log.error((err as any).details);
                    }
                }
            });
            this.context.watching = watching;
        } else {
            this.context.state = true;
        }
        if (options.writeToDisk) {
            toDisk(this.context);
        }
        setFs(this.context, compiler);
        this.fileSystem = this.context.fs;
    }

    public close(callback: Function) {
        callback = callback || noop;
        if (this.context.watching) {
            this.context.watching.close(callback);
        } else {
            callback();
        }
    }

    public getFilenameFromUrl(url: string): string | false {
        return getFilenameFromUrl.bind(this, this.context.options.publicPath, this.context.compiler);
    }
  
    public invalidate(callback) {
        callback = callback || noop;
        if (this.context.watching) {
          ready(this.context, callback, {});
          this.context.watching.invalidate();
        } else {
          callback();
        }
    }
  
    public waitUntilValid(callback) {
        callback = callback || noop;
        ready(this.context, callback, {});
    }

    public getMiddleware() {
        const context = this.context;
        return function(req: Request, res: Response, next: NextFunction) {
            // fixes #282. credit @cexoso. in certain edge situations res.locals is
            // undefined.
            res.locals = res.locals || {};
        
            function goNext(): void | Promise<void> {
                if (!context.options.serverSideRender) {
                    return next();
                }
                return new Promise(((resolve) => {
                    ready(context, () => {
                        res.locals.webpackStats = context.webpackStats;
                        res.locals.fs = context.fs;
                        resolve(next());
                    }, req);
                }));
            }
        
            const acceptedMethods = context.options.methods || ['GET'];
            if (acceptedMethods.indexOf(req.method) === -1) {
                return goNext();
            }
        
            let filename = getFilenameFromUrl(context.options.publicPath, context.compiler, req.url);
        
            if (filename === false) {
            return goNext();
            }
        
            return new Promise<any>(((resolve) => {
            handleRequest(context, filename, processRequest, req);
            function processRequest() {
                try {
                let stat = context.fs.statSync(filename);
        
                if (!stat.isFile()) {
                    if (stat.isDirectory()) {
                    let { index } = context.options;
        
                    if (index === undefined || index === true) {
                        index = 'index.html';
                    } else if (!index) {
                        throw new DevMiddlewareError('next');
                    }
        
                    filename = path.posix.join(filename, index);
                    stat = context.fs.statSync(filename);
                    if (!stat.isFile()) {
                        throw new DevMiddlewareError('next');
                    }
                    } else {
                    throw new DevMiddlewareError('next');
                    }
                }
                } catch (e) {
                return resolve(goNext());
                }
        
                // server content
                let content = context.fs.readFileSync(filename);
                content = handleRangeHeaders(content, req, res);
        
                let contentType = mime.getType(filename);
        
                // do not add charset to WebAssembly files, otherwise compileStreaming will fail in the client
                if (!/\.wasm$/.test(filename)) {
                contentType += '; charset=UTF-8';
                }
        
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Length', content.length);
        
                const { headers } = context.options;
                if (headers) {
                for (const name in headers) {
                    if ({}.hasOwnProperty.call(headers, name)) {
                    res.setHeader(name, context.options.headers[name]);
                    }
                }
                }
                // Express automatically sets the statusCode to 200, but not all servers do (Koa).
                res.statusCode = res.statusCode || 200;
                if (res.send) res.send(content);
                else res.end(content);
                resolve();
            }
            }));
        };
    };
}