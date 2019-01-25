import socketio, {Socket} from 'socket.io-client';
import {SOCKET_MESSAGE_EVENT} from '../api-model';

interface ScovilleEvent {
    type: any;
    data: any;
}

export class SocketClient {
    
    private socket: typeof Socket;

    public constructor(url: string, handlers: any) {
        this.socket = socketio(url);
        this.socket.on(SOCKET_MESSAGE_EVENT, (message: string) => {
            console.log(message);
            const event: ScovilleEvent = JSON.parse(message);
            if(handlers[event.type]) {
                handlers[event.type](event.data);
            } else {
                console.log("no handler for event.type " + event.type);
            }
        });
    }

}