import { ClientRuntime } from './runtime';
import { AbstractClientMessageTransporter } from './abstract-modules/message-transporter';
import { AbstractClientApplicationRestarter } from './abstract-modules/application-restarter';

export class ClientModuleRegistry {
    private static clientRuntime = new ClientRuntime();
    public static getClientRuntime() {
        return this.clientRuntime;
    }
    
    private static messageTransporter: AbstractClientMessageTransporter;
    public static getMessageTransporter() {
        return this.messageTransporter;
    }
    public static setMessageTransporter(newMessageTransporter: AbstractClientMessageTransporter) {
        this.messageTransporter = newMessageTransporter;
    }

    private static applicationRestarter: AbstractClientApplicationRestarter;
    public static getApplicationRestarter() {
        return this.applicationRestarter;
    }
    public static setApplicationRestarter(newApplicationRestarter: AbstractClientApplicationRestarter) {
        this.applicationRestarter = newApplicationRestarter;
    }
}