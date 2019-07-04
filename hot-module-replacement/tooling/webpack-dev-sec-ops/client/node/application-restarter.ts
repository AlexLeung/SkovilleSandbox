import { AbstractClientApplicationRestarter } from "../abstract-modules/application-restarter";
import { ProcessCommunicationMessageType, ProcessCommunicationMessage } from "../../bin/process-communication-api";
import { ClientModuleRegistry } from "../module-registry";
import { MessageType, Message } from "../../api-model";

// TODO: some of the logic in here seems unrelated to restarting the application.
// I think we need to change it from ApplicationRestarter to something along the
// lines of "PlatformSpecificLogicContainer".
export class NodeClientApplicationRestarter extends AbstractClientApplicationRestarter {

    private pendingMessages: Record<number, {resolve: (success:boolean)=>void, done: boolean}>;
    private allocatedSequenceNumbers: number;
    private appliedSequenceNumber: number;

    public constructor() {
        super();
        this.pendingMessages = [];
        this.allocatedSequenceNumbers = 0;
        this.appliedSequenceNumber = -1;
        ClientModuleRegistry.getClientRuntime().addMessageMiddleware(async message => {
            if(message.type === MessageType.Update) {
                return await new Promise<boolean>(resolve => {
                    // Essentially sequenceNumber becomes a 0-based index.
                    const sequenceNumber = this.allocatedSequenceNumbers;
                    this.allocatedSequenceNumbers++;
                    this.pendingMessages[sequenceNumber] = {resolve, done: false};
                    const { publicPath, assets } = message.data;
                    const nodeBundleRunnerMessage: ProcessCommunicationMessage = {
                        type: ProcessCommunicationMessageType.UpdateRequest,
                        data: { sequenceNumber, publicPath, assets }
                    };
                    process.send(nodeBundleRunnerMessage);
                });
            }
            return true;
        });
        process.on("message", (nodeBundleRunnerResponse: ProcessCommunicationMessage) => {
            if(nodeBundleRunnerResponse.type !== ProcessCommunicationMessageType.UpdateResponse) {
                throw new Error("unexpected message sent to child process of " + nodeBundleRunnerResponse);
            }
            const sequenceNumber = nodeBundleRunnerResponse.data.sequenceNumber;
            const pendingMessage = this.pendingMessages[sequenceNumber];
            if(pendingMessage.done) console.log("getting message for already done sequence number");
            pendingMessage.done = true;
            if(this.appliedSequenceNumber + 1 === sequenceNumber) {
                do {
                    this.pendingMessages[++this.appliedSequenceNumber].resolve(true);
                    delete this.pendingMessages[this.appliedSequenceNumber];
                } while(
                    this.appliedSequenceNumber + 1 < this.allocatedSequenceNumbers &&
                    this.pendingMessages[this.appliedSequenceNumber + 1].done
                );
            }
        });
    }

    public restartApplication() {
        process.send({type: ProcessCommunicationMessageType.Restart}, () => {
            process.exit();
        });
    }
}