import url, { Url } from 'url';
import cp from 'child_process';
import http from 'http';
import https from 'https';
import fs, { write, unlink } from 'fs';
import path from 'path';
import { ProcessCommunicationMessage, ProcessCommunicationMessageType } from './process-communication-api';
import { Logger } from '../loggers/node-logger';
import { promisify } from 'util';

const existsAsync = promisify(fs.exists);
const statAsync = promisify(fs.stat);
const unlinkAsync = promisify(fs.unlink);
const mkdirAsync = promisify(fs.mkdir);
const readdirAsync = promisify(fs.readdir);
const rmdirAsync = promisify(fs.rmdir);

// TODO: develop integ tests for Code Splitting, Lazy Loading, etc.

export class NodeBundleRunner {

    protected bundleEntryPath: string;
    protected bundleEntryDirPath: string;
    private valid: boolean = false;
    protected shouldRestart: boolean = false;

    public async validate(bundleEntryPath: string) {
        console.log("parent validate");
        const STANDARD_VALIDATION_ERROR_MESSAGE = `'${bundleEntryPath}' is not a valid file path`;
        if(!bundleEntryPath) throw new Error(STANDARD_VALIDATION_ERROR_MESSAGE);
        this.bundleEntryPath = path.resolve(bundleEntryPath);
        const fileStats = await statAsync(this.bundleEntryPath);
        if(!fileStats.isFile()) throw new Error(STANDARD_VALIDATION_ERROR_MESSAGE);
        this.bundleEntryDirPath = path.dirname(this.bundleEntryPath);
        this.valid = true;
    }

    public async run() {
        console.log("parent run");
        if(!this.valid) throw new Error("Bundle runner must be validated before running.");
        const bundleProcess = cp.fork(this.bundleEntryPath);
        bundleProcess
            .on("message", (message: string) => {
                this.handleMessage(JSON.parse(message), bundleProcess);
            })
            .on("error", err => {
                Logger.red(err.name + ": " + err.message);
                if(err.stack) {
                    Logger.magenta(err.stack);
                }
            })
            .on("exit", (code, signal) => {
                if(this.shouldRestart) {
                    this.shouldRestart = false;
                    this.run();
                }
                else process.exit(code);
            });
    }

    protected async handleMessage(message: ProcessCommunicationMessage, bundleProcess: cp.ChildProcess) {
        console.log("parent handleMessage");
        switch(message.type) {
            case ProcessCommunicationMessageType.Restart:
                // The application runtime is responsible for killing itself.
                // However this message gives us a way to know when to
                // restart the application versus kill this master process.
                this.shouldRestart = true;
                break;
            case ProcessCommunicationMessageType.UpdateRequest:
                const response: ProcessCommunicationMessage = {
                    type: ProcessCommunicationMessageType.UpdateResponse,
                    data: {
                        sequenceNumber: message.data.sequenceNumber
                    }
                };
                bundleProcess.send(JSON.stringify(response));
                break;
            case ProcessCommunicationMessageType.UpdateResponse:
                throw new Error("The node master process should not be receiving UpdateResponse messages");
            default:
                throw new Error(`Unknown message type '${(message as any).type}'`);
        }
    }

}

export class DownloadingNodeBundleRunner extends NodeBundleRunner {

    private static BUNDLE_STORAGE_PATH = path.resolve('./.scoville');

    private bundleEntryURL: Url;
    private https: boolean;

    public async validate(bundleEntryURL: string) {
        console.log("child validate");
        this.bundleEntryURL = url.parse(bundleEntryURL);
        const {protocol, host, pathname} = this.bundleEntryURL;
        if(!protocol || !host) {
            throw new Error("invalid URL string");
        }
        const filename = path.basename(pathname || "initial-entry.js");
        this.bundleEntryPath = path.join(DownloadingNodeBundleRunner.BUNDLE_STORAGE_PATH, filename);
        switch(protocol) {
            case 'http:':
                this.https = false;
                break;
            case 'https:':
                this.https = true;
                break;
            default:
                throw new Error(`Unsupported protocol '${protocol}'. Use either 'http:' or 'https:'`);
        }
        await this.resetBundleSpace();
        await super.validate(this.bundleEntryPath);
        
    }

    public async run() {
        console.log("child run");
        if(this.shouldRestart) {
            await this.resetBundleSpace();
        }
        await super.run();
    }

    private async download(url: string, outpath: string) {
        const client: typeof http | typeof https = this.https ? https : http;
        await new Promise((resolve, reject) => {
            client
                .get(url, res => {
                    const writeStream = fs.createWriteStream(outpath);
                    res.pipe(writeStream);
                    writeStream.on("finish", () => {
                        writeStream.end(resolve);
                    });
                })
                .on('error', async err => {
                    await unlinkAsync(outpath);
                    reject(err);
                });
        });
    }

    protected async handleMessage(message: ProcessCommunicationMessage, bundleProcess: cp.ChildProcess) {
        console.log("child handleMessage");
        switch(message.type) {
            case ProcessCommunicationMessageType.UpdateRequest:
                const {protocol, host} = this.bundleEntryURL;
                const {assets, publicPath} = message.data;
                const ongoingDownloads = assets
                    .map(asset => {
                        console.log("ASSET: " + asset);
                        return asset;
                    })
                    .map(asset => this.download(
                        // TODO: why doesn't the TypeScript definition expose the 'origin' property to us? 
                        // `url.origin` is preferable to `url.protocol + '//'  + url.host`.
                        url.resolve(url.resolve(protocol + '//' + host, publicPath), asset),
                        path.join(this.bundleEntryDirPath, asset)
                    ));
                await Promise.all(ongoingDownloads);
        }
        await super.handleMessage(message, bundleProcess);
    }

    private async resetBundleSpace() {
        const {BUNDLE_STORAGE_PATH} = DownloadingNodeBundleRunner;
        await this.recursiveRemoval(BUNDLE_STORAGE_PATH);
        await mkdirAsync(BUNDLE_STORAGE_PATH, {recursive: true});
        await this.download(this.bundleEntryURL.href, this.bundleEntryPath);
    }

    // TODO: handle case where someone adds file into folder before complete removal.
    //       Also handle case where someone puts a lock on one of the files (should probably fail immediately).
    private async recursiveRemoval(path: string) {
        const exists = await existsAsync(path);
        if(exists) {
            const stats = await statAsync(path);
            if(stats.isDirectory()) {
                const children = await readdirAsync(path);
                await Promise.all(children.map(this.recursiveRemoval));
                await rmdirAsync(path);
            } else {
                await unlinkAsync(path);
            }
        }
    }

}