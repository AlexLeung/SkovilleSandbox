/* global __resourceQuery */

import socketio, {Socket} from 'socket.io-client';
import {SOCKET_MESSAGE_EVENT} from '../api-model';
import {ClientRuntime} from './runtime';

if(!__resourceQuery) {
    throw new Error("You must add in a resource query with the port in the webpack config.");
}
const url = __resourceQuery.substring(1)

export class SocketClient extends ClientRuntime {
    private socket: typeof Socket;

    public constructor() {
        super();
        this.socket = socketio(url);
        this.socket.on(SOCKET_MESSAGE_EVENT, (message: string) => {
            console.log("received event");
            console.log(message);
            this.handleMessage(message);
        });
        // TODO: refactor.
        const socketioErrors = ['connect_error', 'connect_timeout', 'error', 'disconnect', 'reconnect_error', 'reconnect_failed'];
        socketioErrors.forEach(error => {
            console.log("connection error: " + error);
        });
    }

    protected restartApplication() {
        window.location.reload();
    }
}