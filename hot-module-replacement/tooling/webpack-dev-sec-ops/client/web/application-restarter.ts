import { AbstractClientApplicationRestarter } from "../abstract-modules/application-restarter";

export class WebClientApplicationRestarter extends AbstractClientApplicationRestarter {
    public restartApplication() {
        window.location.reload();
    }
}