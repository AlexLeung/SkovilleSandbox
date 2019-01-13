import webpack from 'webpack';
import {WebpackDevSecOpsClusterWSWorkerBuilder} from '../cluster-ws-worker';

export class WebpackDevSecOpsPlugin implements webpack.Plugin {

    private id: string;
    private workerBuilder: WebpackDevSecOpsClusterWSWorkerBuilder;

    /**
     * Creates a new instance of WebpackDevSecOpsServerPlugin, and registers it to an internal list of plugin instances.
     * 
     * @param id - a unique identifier which should only be assigned to the webpack configuration that this plugin is operating on. If the same `id` is passed to another 
     */
    constructor(id: string, workerBuilder: WebpackDevSecOpsClusterWSWorkerBuilder) {
        this.id = id;
        this.workerBuilder = workerBuilder;
    }

    public apply(compiler: webpack.Compiler) {
        this.workerBuilder.registerCompiler(this.id, compiler);
    }
}