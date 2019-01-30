console.log("made it here");
import socketio, {Socket} from 'socket.io-client';
import {SOCKET_MESSAGE_EVENT} from '../api-model';
import {ClientRuntime} from './runtime';

if(!__resourceQuery) {
    throw new Error("You must add in a resource query with the port in the webpack config.");
}
const url = __resourceQuery.substring(1)

console.log("and another one");

export class SocketClient extends ClientRuntime {
    private socket: typeof Socket;

    public constructor() {
        super();
        console.log("keep going");
        this.socket = socketio(url);
        this.socket.on(SOCKET_MESSAGE_EVENT, (message: string) => {
            console.log("received message");
            console.log(message);
            this.handleMessage(message);
        });
        // TODO: refactor.
        const socketioErrors = ['connect_error', 'connect_timeout', 'error', 'disconnect', 'reconnect_error', 'reconnect_failed'];
        socketioErrors.forEach(error => {
            this.socket.on(error, (...args: any[]) => {
                console.log("connection error: " + error + ", arguments: " + args);
            })
        });
    }

    public restartApplicationImpl() {
        process.send("reload", (...args: any[]) => {
            process.exit();
        });
    }
}

new SocketClient();