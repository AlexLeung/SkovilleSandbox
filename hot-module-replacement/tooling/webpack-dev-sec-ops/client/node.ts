console.log("made it here");
import socketio, {Socket} from 'socket.io-client';
import {SOCKET_MESSAGE_EVENT, Message, MessageType} from '../api-model';
import {ClientRuntime} from './runtime';

if(!__resourceQuery) {
    throw new Error("You must add in a resource query with the port in the webpack config.");
}
const url = __resourceQuery.substring(1)

console.log("and another one");

interface ToApply {
    messageString: string;
    ready: boolean;
    hash: string;
}

export class SocketClient extends ClientRuntime {
    private socket: typeof Socket;
    private updateMessagesToApply: ToApply[];
    private currentHashNode: string;

    public constructor() {
        super();
        console.log("keep going");
        this.socket = socketio(url);
        this.socket.on(SOCKET_MESSAGE_EVENT, (messageString: string) => {
            console.log("received message");
            console.log(messageString);
            // TODO: refactor once I decide on an architecture.
            const message: Message = JSON.parse(messageString);
            if(message.type == MessageType.Update) {
                // If on our first hash, nothing to download yet.
                if(!this.currentHashNode) {
                    this.currentHashNode = message.data.hash;
                    this.handleMessage(messageString);
                } else {
                    this.updateMessagesToApply.push({messageString, ready: false, hash: this.currentHashNode});
                    process.send({type:"download",hash:this.currentHashNode},()=>{});
                    this.currentHashNode = message.data.hash;
                    process.on("message", (parentMessage) => {
                        if(parentMessage.type === 'done') {
                            const hash = parentMessage.hash;
                            let found = false;
                            for(const updateToApply of this.updateMessagesToApply) {
                                if(updateToApply.hash === hash) {
                                    updateToApply.ready = true;
                                    found = true;
                                    break;
                                }
                            }
                            if(!found) {
                                throw new Error("got message from parent process for non-queued hash");
                            }
                            while(this.updateMessagesToApply[0].ready) {
                                const updateToApply = this.updateMessagesToApply.splice(0, 1)[0];
                                this.handleMessage(updateToApply.messageString);
                            }
                        }
                    });
                }
            } else {
                this.handleMessage(messageString);
            }
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
        process.send({type:"reload"}, (...args: any[]) => {
            process.exit();
        });
    }
}

new SocketClient();