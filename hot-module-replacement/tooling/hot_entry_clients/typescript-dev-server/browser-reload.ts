import hotEmitter from './emitter';
import {RELOAD_SIGNAL} from './hmr';
hotEmitter.on(RELOAD_SIGNAL, function() {
    window.location.reload();
});