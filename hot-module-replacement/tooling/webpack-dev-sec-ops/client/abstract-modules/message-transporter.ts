export abstract class AbstractClientMessageTransporter {
    public abstract sendMessage(messageString: string): void;
}