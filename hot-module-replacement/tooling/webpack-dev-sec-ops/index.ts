import webpack from 'webpack';
import {CompilerManager} from './compiler-manager';
import {ReadStream} from 'fs';

export interface PluginOptions {
    hot: boolean;
    restarting: boolean;
    memoryFS: boolean;
}

type MessageSubscriber = (id: string, message: string) => void;

export class WebpackDevSecOps {

    private static messageSubscribers: MessageSubscriber[] = [];
    private static registry: Record<string, CompilerManager> = {};
    private static registeredIds: string[] = [];

    public static Plugin = class implements webpack.Plugin {

        private id: string;
        private options: PluginOptions;
        
        public constructor(id: string, options: PluginOptions) {
            const {registeredIds} = WebpackDevSecOps;
            if(registeredIds[id]) {
                throw new Error(`Trying to register compiler with id=${id}, but there is already another compiler registered with that id.`);
            }
            registeredIds.push(id);
            this.id = id;
            this.options = options;
        }

        public apply(compiler: webpack.Compiler) {
            const {registry, messageSubscribers} = WebpackDevSecOps;
            const {id, options} = this;
            if(options.hot) {
                // If there is no HotModuleReplacement plugin, throw error.
                const hmrPluginPresent = compiler.options.plugins.some(plugin => plugin instanceof webpack.HotModuleReplacementPlugin);
                if(!hmrPluginPresent) throw new Error(`The "hot" option was set to true for compiler with id=${id}, but the webpack config does not contain an instance of webpack.HotModuleReplacementPlugin`);
            }
            registry[id] = new CompilerManager(compiler, message => {
                messageSubscribers.forEach(async subscriber => {subscriber(id, message);});
            }, options);
        }

    }

    public static subscribeToMessages(subscriber: MessageSubscriber) {
        const {messageSubscribers} = WebpackDevSecOps;
        messageSubscribers.push(subscriber);
        return function unsubscribe() {
            const index = messageSubscribers.indexOf(subscriber);
            if(index !== -1) messageSubscribers.splice(index, 1);
        }
    }

    public static async getReadStream(id: string, requestPath: string): Promise<ReadStream | false> {
        WebpackDevSecOps.ensureCompilerExists(id, "get ReadStream");
        return await WebpackDevSecOps.registry[id].getReadStream(requestPath);
    }

    public static getLatestUpdateMessage(id: string) {
        WebpackDevSecOps.ensureCompilerExists(id, "get the latest update message");
        return WebpackDevSecOps.registry[id].getLatestUpdateMessage();
    }

    public static getUpdateStrategyMessage(id: string) {
        WebpackDevSecOps.ensureCompilerExists(id, "get the update strategy message");
        return WebpackDevSecOps.registry[id].getUpdateStrategyMessage();
    }

    private static ensureCompilerExists(id: string, tryingTo: string) {
        const {registry} = WebpackDevSecOps;
        if(!registry[id]) {
            throw new Error(`Trying to ${tryingTo} from compiler registered with id=${id}, but no compiler is registered with that id.`);
        }
    }

    private constructor() {}
}