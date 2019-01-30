import webpack from 'webpack';
import MemoryFileSystem from 'memory-fs';
import {ReadStream} from 'fs';
import path from 'path';
import fs from 'fs';
import {PluginOptions} from './';
import {MessageType, Message} from './api-model';
import Logger from 'js-logger';

const PLUGIN_NAME = "WebpackDevSecOps";

const log = Logger;
Logger.useDefaults();

type MessageHandler = (message:string) => void;

export class CompilerManager {

    private compiler: webpack.Compiler;
    private emitMessage: MessageHandler;
    private fs: typeof fs;
    private valid: boolean;
    private compilationCallbacks: Function[];
    private publicPath: string;

    private latestUpdateMessage: string;
    private updateStrategyMessage: string;

    public constructor(compiler: webpack.Compiler, onMessage: MessageHandler, options: PluginOptions) {
        if(options.memoryFS) {
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
        this.latestUpdateMessage = null;

        // TODO: consider refactoring.
        const updateStrategyMessage: Message = {
            type: MessageType.UpdateStrategy,
            data: {
                hot: options.hot,
                restarting: options.restarting
            }
        };
        this.updateStrategyMessage = JSON.stringify(updateStrategyMessage);

        this.addHooks();
    }

    public getLatestUpdateMessage(): string | null {
        return this.latestUpdateMessage;
    }

    public getUpdateStrategyMessage(): string {
        return this.updateStrategyMessage;
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
            log.info("(publicPath: '" + this.publicPath + "', requestPath:'" + requestPath + "', compiler.outputPath:'" + outputPath + "') => '" + adjustedPath + "'");
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
        this.compiler.hooks.compile.tap(PLUGIN_NAME, () => {console.log("inner compile hook");this.sendMessage({type:MessageType.Recompiling});});
        this.compiler.hooks.invalid.tap(PLUGIN_NAME, () => {console.log("inner invalid hook");this.invalidate();this.sendMessage({type:MessageType.Recompiling});});
        this.compiler.hooks.run.tap(PLUGIN_NAME, () => {console.log("inner run hook");this.invalidate()});
        this.compiler.hooks.watchRun.tap(PLUGIN_NAME, () => {console.log("inner watchRun hook");this.invalidate()});
        this.compiler.hooks.done.tap(PLUGIN_NAME, stats => {
            const {compilation} = stats;
            if(compilation.errors.length === 0 && Object.values(compilation.assets).every(asset => !(asset as any).emitted)) {
                this.sendMessage({type:MessageType.NoChange});
            } else {
                this.sendUpdateMessage(stats);
            }
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

    private sendUpdateMessage(stats: webpack.Stats) {
        const statsJSON = stats.toJson({
            all: false,
            hash: false,
            assets: false,
            warnings: true,
            errors: true,
            errorDetails: false
        });
        const updateMessage: Message = {
            type: MessageType.Update,
            data: {
                hash: stats.hash,
                errors: statsJSON.errors,
                warnings: statsJSON.warnings
            }
        };
        this.sendMessage(updateMessage);
    }

    private sendMessage(message:Message) {
        const messageString = JSON.stringify(message);
        if(message.type === MessageType.Update) {
            this.latestUpdateMessage = messageString;
        }
        this.emitMessage(messageString);
    }

    private invalidate() {
        if(this.valid) log.info("Recompiling...");
        this.valid = false;
    }

}