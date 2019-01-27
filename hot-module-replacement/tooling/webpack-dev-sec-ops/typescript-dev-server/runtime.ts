import stripAnsi from 'strip-ansi';
import loglevel from 'loglevel';
import hotEmitter from './emitter';
import { MessageType, Message } from '../api-model';

const log = loglevel.getLogger('webpack-dev-server');

// Set the default log level
log.setDefaultLevel('info');

export abstract class ClientRuntime {
    private currentHash: string;
    private hotEnabled: boolean;
    private restartingEnabled: boolean;

    protected abstract restartApplication(): void;

    public handleMessage(messageString: string) {
        const message: Message = JSON.parse(messageString);
        switch(message.type) {
            case MessageType.NoChange:
                log.info('[SWP] Nothing changed.');
                break;
            case MessageType.Recompiling:
                log.info('[SWP] Source changed. Recompiling...');
                break;
            case MessageType.UpdateStrategy:
                this.hotEnabled = message.data.hot;
                log.info(`[SWP] Hot Module Replacement ${this.hotEnabled ? 'enabled' : 'disabled'}.`);
                this.restartingEnabled = message.data.restarting;
                log.info(`[SWP] Application restarting ${this.restartingEnabled ? 'enabled' : 'disabled'}.`);
                break;
            case MessageType.Update:
                if(message.data.errors.length > 0) {
                    log.error('[SWP] Errors while compiling. Hot swap / restart prevented.');
                    message.data.errors
                        .map(error => stripAnsi(error))
                        .forEach(error => {log.error(error)});
                } else {
                    if (message.data.warnings.length > 0) {
                        log.warn('[SWP] Warnings while compiling.');
                        message.data.warnings
                            .map(warning => stripAnsi(warning))
                            .forEach(strippedWarning => {log.warn(strippedWarning)});
                    }
                    // If a hash is registered, then this is not the first hash message, so we can hot swap or restart.
                    if(this.currentHash) this.hotSwapOrRestart();
                }
                this.currentHash = message.data.hash;
                break;
            // I don't currently have the server sending this for any reason.
            // It could be used by others trying to extend the functionality themselves.
            case MessageType.ForceRestart:
                log.info(`[SWP] ${message.data.reason}. Restarting...`);
                this.restartApplication();
                break;
            default:
                log.error(`[SWP] received an unsupported message: "${messageString}"`);
        }
    }

    private hotSwapOrRestart() {
        if(this.hotEnabled) {
            log.info('[SWP] App hot update...');
            hotEmitter.emit('webpackHotUpdate', this.currentHash);
        } else if(this.restartingEnabled) {
            log.info('[SWP] App updated. Restarting...');
            this.restartApplication();
        }
    }

}