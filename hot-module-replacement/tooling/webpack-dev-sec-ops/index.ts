import webpack from 'webpack';
import {CompilerManager} from './compiler-manager';
import {ReadStream} from 'fs';
import {AsyncParallelHook} from 'tapable';

export interface PluginOptions {
    id: string;
    memoryFS?: boolean;
}

export class WebpackDevSecOps {

    public static hooks = {
        onServerMessage: new AsyncParallelHook<string, string>(["id", "message"])
    };

    private static registry: Record<string, CompilerManager> = {};

    public static Plugin = class implements webpack.Plugin {

        private id: string;
        private memoryFS: boolean;
        
        public constructor(options: PluginOptions) {
            this.id = options.id;
            this.memoryFS = !!options.memoryFS;
        }

        public apply(compiler: webpack.Compiler) {
            const {registry, hooks: {onServerMessage}} = WebpackDevSecOps;
            const {id, memoryFS} = this;
            if(registry[id]) {
                throw new Error(`Trying to register compiler with id=${id}, but there is already another compiler registered with that id.`);
            }
            registry[id] = new CompilerManager(compiler, message => {
                onServerMessage.callAsync(id, message);
            }, memoryFS);
        }

    }

    public static async getReadStream(id: string, requestPath: string): Promise<ReadStream | false> {
        const {registry} = WebpackDevSecOps;
        if(!registry[id]) {
            throw new Error(`Trying to get ReadStream from compiler registered with id=${id}, but no compiler is registered with that id.`);
        }
        return await registry[id].getReadStream(requestPath);
    }

    private constructor() {}
}