import {Server} from 'http';
import {WSServer, Socket} from 'clusterws';
import express from 'express';
import webpack from 'webpack';
import MemoryFileSystem from 'memory-fs';
import mime from 'mime';
import path from 'path';

export class WebpackDevSecOpsClusterWSWorkerBuilder {

    private registry: {[key:string]:{compiler?:webpack.Compiler,sockets:Socket[]}};
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
        let sockets: Socket[];
        if(this.registry[id]) {
            const registeryEntry = this.registry[id];
            if(registeryEntry.compiler) {
                throw new Error("Trying to register compiler at id=\"" + id + "\", but compiler already registered with that id");
            }
            registeryEntry.compiler = compiler;
            sockets = registeryEntry.sockets;
        } else {
            sockets = [];
            this.registry[id] = { compiler, sockets };
        }
        const fs = compiler.outputFileSystem = new MemoryFileSystem();
        compiler.hooks.done.tap("WebpackDevSecOps", function(stats) {
            console.log("DONE");
        });
        this.middleware.get("*", function(req, res, next) {
            if(fs instanceof MemoryFileSystem) {
                console.log("an instance");
            } else {
                console.log("not an instance");
            }
            console.log("GET INITIATED: " + req.path);
            // If unable to convert the request url to a path within the memory file system, send nothing.
            const publicPath = (compiler.options.output && compiler.options.output.publicPath) || "/";
            const outputPath = (compiler as any).outputPath;
            if(req.path.indexOf(publicPath) !== -1) {
                //const adjustedPath = fs.normalize(path.resolve(outputPath + '/' + (req.path.substring(publicPath.length))));
                const adjustedPath = path.resolve(outputPath + '/' + (req.path.substring(publicPath.length)));
                console.log("publicPath: " + publicPath + ", outputPath = " + outputPath + ", adjustedPath = " + adjustedPath);
                console.log(fs.existsSync("D:\\"));
                if(fs.existsSync(adjustedPath)) {
                    console.log("EXISTS");
                    res.setHeader("Content-Type", mime.getType(adjustedPath));
                    fs.createReadStream(adjustedPath).pipe(res);
                } else {
                    console.log("DOES NOT EXIST becuase file isn't present");
                    return next();
                }
            } else {
                console.log("DOES NOT EXIST because request is not beneath public path");
                return next();
            }
        });
    }

    public getWorker() {
        return this.worker;
    }
}