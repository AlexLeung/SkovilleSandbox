import webpack from 'webpack';
import MemoryFileSystem from 'memory-fs';
import {ReadStream} from 'fs';
import path from 'path';
import winston from 'winston';
import fs from 'fs';

const PLUGIN_NAME = "WebpackDevSecOps";
const log = winston.createLogger({
    format: winston.format.printf(info => (info.level == "error" ? "ERROR: " : "") + info.message),
    transports: [new winston.transports.Console()]
});

type MessageHandler = (message:string) => void;

export class CompilerManager {

    private compiler: webpack.Compiler;
    private emitMessage: MessageHandler;
    private fs: typeof fs;
    private valid: boolean;
    private compilationCallbacks: Function[];
    private publicPath: string;

    public constructor(compiler: webpack.Compiler, onMessage: MessageHandler, memoryFS: boolean) {
        if(memoryFS) {
            this.fs = new MemoryFileSystem() as any;
            compiler.outputFileSystem = this.fs as any;
        } else {
            this.fs = fs;
        }
        this.compiler = compiler;
        this.emitMessage = onMessage;
        this.valid = false;
        this.compilationCallbacks = [];
        this.publicPath = this.getPublicPath();
        this.addHooks();
    }

    public async getReadStream(requestPath: string) {
        const fsPath = this.getFsPathFromRequestPath(requestPath);
        if(!fsPath) return false;
        // Don't stream the file until compilation is done.
        return await new Promise<ReadStream | false>(resolve => {
            const attemptToRead = () => {
                this.fs.exists(fsPath, exists => {
                    if(exists) {
                        this.fs.stat(fsPath, (err, stats) => {
                            if(stats.isFile()) {
                                log.info("File located. Returning ReadStream.");
                                resolve(this.fs.createReadStream(fsPath));
                            } else {
                                log.error("Path exists, but is not a file.");
                                resolve(false);
                            }
                        })
                    } else {
                        log.error("File does not exist.");
                        resolve(false);
                    }
                });
            };
            if(this.valid) attemptToRead();
            else this.compilationCallbacks.push(attemptToRead);
        });
    }

    private getFsPathFromRequestPath(requestPath: string) {
        if(requestPath.indexOf(this.publicPath) !== -1) {
            const outputPath = (this.compiler as any).outputPath;
            const adjustedPath = path.resolve(outputPath + '/' + (requestPath.substring(this.publicPath.length)));
            log.info("(requestPath:'" + this.publicPath + "', compiler.outputPath:'" + outputPath + "') => '" + adjustedPath + "'");
            return adjustedPath;
        } else {
            log.error("Request path '" + requestPath + "' will not be served because it is not under webpack.config.output.publicPath of '" + this.publicPath + "'");
            return false;
        }
    }

    private getPublicPath() {
        const {compiler} = this;
        const publicPath = (compiler.options.output && compiler.options.output.publicPath) || "/";
        return publicPath.endsWith("/") ? publicPath : publicPath + "/";
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
                this.compilationCallbacks = [];
            }
        });
    }

    private invalidate() {
        if(this.valid) log.info("Recompiling...");
        this.valid = false;
    }

}