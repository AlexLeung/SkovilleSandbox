console.log("state.ts is running");

class AppState {
    private secondsElapsed = 0;
    private intervalId;

    constructor() {
        console.log("AppState constructor running");
    }

    public setIntervalId(newId) {
        this.intervalId = newId;
    }

    public getIntervalId() {
        return this.intervalId;
    }

    public setElapsedSeconds(newElapsed) {
        this.secondsElapsed = newElapsed;
    }

    public getElapsedSeconds() {
        return this.secondsElapsed;
    }
}
export const appState = new AppState();