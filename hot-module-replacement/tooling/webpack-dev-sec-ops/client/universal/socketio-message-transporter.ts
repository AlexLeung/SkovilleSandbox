import { AbstractClientMessageTransporter } from "../abstract-modules/message-transporter";
import socketio, {Socket} from 'socket.io-client';
import { SOCKET_MESSAGE_EVENT } from "../../api-model";
import { ClientModuleRegistry } from "../module-registry";

export class SocketIOClientMessageTransporter extends AbstractClientMessageTransporter {

    private socket: typeof Socket;
    
    public constructor(url: string) {
        super();
        this.socket = socketio(url);
        this.socket.on(SOCKET_MESSAGE_EVENT, (message: string) => {
            console.log("received message");
            console.log(message);
            ClientModuleRegistry.getClientRuntime().handleMessage(message);
        });
        // TODO: refactor.
        const socketioErrors = ['connect_error', 'connect_timeout', 'error', 'disconnect', 'reconnect_error', 'reconnect_failed'];
        socketioErrors.forEach(error => {
            this.socket.on(error, (...args: any[]) => {
                console.log("connection error: " + error + ", arguments: " + args);
            })
        });
    }

    public sendMessage(messageString: string) {
        this.socket.emit(SOCKET_MESSAGE_EVENT, messageString);
    }

}