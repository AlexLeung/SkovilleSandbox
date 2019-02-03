import yargs from 'yargs';
import {Logger} from '../loggers/node-logger';
import {NodeBundleRunner, DownloadingNodeBundleRunner} from './node-bundle-runner';

export class CLI {

    private file: string;
    private url: string;

    public constructor() {
        this.buildYargs();
        this.validate()
            .then(nodeBundleRunner => {
                nodeBundleRunner.run();
            });
    }

    private buildYargs() {
        const args = yargs
            .option("file", {
                describe: 'Run bundle stored at specified file path',
                string: true,
                conflicts: 'url',
                coerce: file => {
                    if(Array.isArray(file)) {
                        throw new Error("No more than one file argument allowed");
                    }
                    return file;
                }
            })
            .option("url", {
                describe: 'Run bundle hosted at specified url',
                string: true,
                conflicts: 'file',
                coerce: url => {
                    if(Array.isArray(url)) {
                        throw new Error("No more than one url argument allowed");
                    }
                    return url;
                }
            })
            .example('$0 -f ./dist/server.js', '')
            .example('$0 --url=http://localhost:8080/server.js', '')
            .alias({
                f: 'file',
                u: 'url',
                h: 'help',
                v: 'version'
            })
            .group(['f', 'u'], 'Run Options:')
            .group(['h', 'v'], 'Help Options:')
            .strict()
            .help()
            .fail(message => {
                this.printCLIError(message);
            })
            .argv;
        this.file = args.file;
        this.url = args.url;
    }

    private async validate() {
        const {file, url} = this;
        const fileNotGiven = file === undefined;
        const urlNotGiven = url === undefined;
        if(fileNotGiven && urlNotGiven) this.printCLIError("One CLI argument is required");
        if(fileNotGiven) {
            const downloadingNodeBundleRunner = new DownloadingNodeBundleRunner();
            try { await downloadingNodeBundleRunner.validate(url); }
            catch(e) { this.printCLIError("url error: " + e.message); }
            return downloadingNodeBundleRunner;
        } else {
            const nodeBundleRunner = new NodeBundleRunner();
            try { await nodeBundleRunner.validate(file); }
            catch(e) { this.printCLIError("file error: " + e.message); }
            return nodeBundleRunner;
        }
    }

    private printCLIError(message: string) {
        Logger.red(message);
        console.log();
        yargs.showHelp();
        process.exit();
    }

}