import {WebpackDevSecOps} from './index';
import express from 'express';
import mime from 'mime';

export class WebpackDevSecOpsServer {

    constructor(port: number) {
        const app = express();
        app.get("*", async (req, res, next) => {
            const stream = await WebpackDevSecOps.getReadStream("web", req.path);
            if(!stream) return next();
            res.setHeader("Content-Type", mime.getType(req.path));
            stream.pipe(res);
        });
        const server = app.listen(port, () => {
            console.log("listening");
        });
        process.on("SIGINT", () => { 
            server.close(() => {
                process.exit(1)
            })
        });
    }

}