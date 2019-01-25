import {WebpackDevSecOps} from './index';
import express from 'express';
import mime from 'mime';
import http from 'http';
import socketio from 'socket.io';

export class WebpackDevSecOpsServer {

    private server: http.Server;
    private sockets: socketio.Socket[];

    public constructor(port: number) {
        this.sockets = [];
        const app = express();
        app.get("*", async (req, res, next) => {
            const stream = await WebpackDevSecOps.getReadStream("web", req.path === "/" ? "/index.html" : req.path);
            if(!stream) return next();
            res.setHeader("Content-Type", mime.getType(req.path));
            stream.pipe(res);
        });
        this.server = new http.Server(app);
        const io = socketio(this.server);
        io.on('connection', socket => {
            this.sockets.push(socket);
            socket.on("disconnect", () => {
                this.sockets.splice(this.sockets.indexOf(socket), 1);
            });
        });
        this.server.listen(port, () => {
            console.log("listening");
        });
        WebpackDevSecOps.hooks.onServerMessage.tap(
            WebpackDevSecOps.name,
            (id, message) => {
                this.sockets.forEach(socket => socket.send(message));
            }
        );
    }

    public close(cb: Function) {
        this.sockets.forEach(socket => socket.disconnect(true));
        this.sockets = [];
        this.server.close(() => {
            cb();
        });
    }

}