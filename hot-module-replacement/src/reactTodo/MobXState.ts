console.log("MobXState.ts is running");
import {observable} from 'mobx';
class MobXState {
    @observable someText = "54321go";
    @observable enabled = true;

    constructor() {
    }

    async toggle() {
        this.enabled = !this.enabled;
    }
}
export const mobXState = new MobXState();