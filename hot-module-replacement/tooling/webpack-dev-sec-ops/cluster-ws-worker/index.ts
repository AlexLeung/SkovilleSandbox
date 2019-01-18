import {Server} from 'http';
import {WSServer, Socket} from 'clusterws';
import express from 'express';
import webpack from 'webpack';
import MemoryFileSystem from 'memory-fs';
import mime from 'mime';
import path from 'path';
import winston from 'winston';
import {ReadStream} from 'fs';

const PLUGIN_NAME = "WebpackDevSecOps";
const log = winston.createLogger({transports:[new winston.transports.Console()]});

export class WebpackDevSecOpsClusterWSWorkerBuilder {

    private registry: Record<string, BundleManager>;
    private worker: () => void;
    private middleware: express.Express;
    
    public constructor() {
        this.registry = {};
        this.middleware = express();
        const builder = this;
        // This worker will end up being added to a ClusterWS instance, which will bind its own context to the function.
        this.worker = function() {
            const wss: WSServer = this.wss; // From the ClusterWS instance.
            const server: Server = this.server; // From the ClusterWS instance.
            server.on('request', builder.middleware);
            wss.on('connection', (socket) => {
                // send invalidate

                // send hot

                // etc...
            });
        }
    }

    public registerCompiler(id: string, compiler: webpack.Compiler) {
        if(this.registry[id]) {
            throw new Error("Trying to register compiler at id=\"" + id + "\", but compiler already registered with that id");
        }
        const bundleManager = this.registry[id] = new BundleManager(id, compiler);
        this.middleware.get("*", async function(req, res, next) {
            
            const publicPath = WebpackDevSecOpsClusterWSWorkerBuilder.getWebpackPublicPath(compiler);

            // If the request path begins with the publicPath.
            if(req.path.indexOf(publicPath) !== -1) {

                const outputPath = (compiler as any).outputPath;
                const adjustedPath = path.resolve(outputPath + '/' + (req.path.substring(publicPath.length)));
                console.log("publicPath: " + publicPath + ", outputPath = " + outputPath + ", adjustedPath = " + adjustedPath);

                const file = await bundleManager.getFileStream(adjustedPath);
                if(!file) {
                    console.log("DOES NOT EXIST becuase file isn't present");
                    return next();
                } else {
                    console.log("EXISTS");
                    res.setHeader("Content-Type", mime.getType(adjustedPath));
                    file.pipe(res);
                }
            } else {
                console.log("DOES NOT EXIST because request is not beneath public path");
                return next();
            }
        });
    }

    private static getWebpackPublicPath(compiler: webpack.Compiler) {
        const publicPath = (compiler.options.output && compiler.options.output.publicPath) || "/";
        return publicPath.endsWith("/") ? publicPath : publicPath + "/";
    }

    public getWorker() {
        return this.worker;
    }
}

class BundleManager {

    private id: string;
    private compiler: webpack.Compiler;
    private sockets: Socket[];
    private fs: MemoryFileSystem;
    private valid: boolean;
    private compilationCallbacks: Function[];

    public constructor(id: string, compiler: webpack.Compiler) {
        this.id = id;
        this.compiler = compiler;
        this.sockets = [];
        this.fs = new MemoryFileSystem();
        this.valid = false;
        this.compilationCallbacks = [];
        this.addHooks();
    }

    public addSocket(socket: Socket) {
        this.sockets.push(socket);
    }

    public async getFileStream(path: string) {
        // Don't stream the file until compilation is done.
        return await new Promise<ReadStream | false>(resolve => {
            const attemptToRead = () => {
                if(this.fs.existsSync(path)) resolve(this.fs.createReadStream(path));
                else resolve(false);
            };
            if(this.valid) attemptToRead();
            else this.compilationCallbacks.push(attemptToRead);
        });
    }

    private addHooks() {
        this.compiler.hooks.invalid.tap(PLUGIN_NAME, () => {this.invalidate()});
        this.compiler.hooks.run.tap(PLUGIN_NAME, () => {this.invalidate()});
        this.compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {this.invalidate()});
        this.compiler.hooks.done.tap(PLUGIN_NAME, (stats) => {
            this.valid = true;
            // Consider doing the following after the nextTick, which is done in Webpack-Dev-Middleware
            const toStringOptions = this.compiler.options.stats;
            if (toStringOptions) {
                if (stats.hasErrors()) log.error(stats.toString(toStringOptions));
                else if (stats.hasWarnings()) log.warn(stats.toString(toStringOptions));
                else log.info(stats.toString(toStringOptions));
            }
            let message = 'Compiled successfully.';
            if (stats.hasErrors()) {
                message = 'Failed to compile.';
            } else if (stats.hasWarnings()) {
                message = 'Compiled with warnings.';
            }
            log.info(message);
            if(this.compilationCallbacks.length) {
                for(const callback of this.compilationCallbacks) {
                    callback();
                }
            }
        });
    }

    private invalidate() {
        if(this.valid) log.info("Recompiling...");
        this.valid = false;
    }

}