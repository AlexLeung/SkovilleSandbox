import hotEmitter from '../webpack/emitter';
import {RELOAD_SIGNAL} from './hmr';
hotEmitter.on(RELOAD_SIGNAL, function() {
    window.location.reload();
});