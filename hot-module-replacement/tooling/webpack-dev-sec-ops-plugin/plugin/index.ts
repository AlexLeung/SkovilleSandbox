import webpack from 'webpack';

export class WebpackDevSecOpsServerPlugin implements webpack.Plugin {
    public apply(compiler: webpack.Compiler) {
        console.log("hello world");
    }
}