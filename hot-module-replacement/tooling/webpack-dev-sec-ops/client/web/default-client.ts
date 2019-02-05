import { ClientModuleRegistry } from "../module-registry";
import { SocketIOClientMessageTransporter } from "../universal/socketio-message-transporter";
import { WebClientApplicationRestarter } from "./application-restarter";

/*globals __resourceQuery*/

if(!__resourceQuery) {
    throw new Error("You must add in a resource query with the port in the webpack config.");
}
const url = __resourceQuery.substring(1)

ClientModuleRegistry.setMessageTransporter(new SocketIOClientMessageTransporter(url));
ClientModuleRegistry.setApplicationRestarter(new WebClientApplicationRestarter());