const _window: any = window;
if(!_window.updatedLog) {
    const origConsoleLog = console.log;
    (_window.console as any).log = function log(body: string) {
        fetch('http://localhost:8000/',{
            body,
            method:'post',
            headers: new Headers({'Content-Type':'text/plain'})
        }).then(res => origConsoleLog(body));
    }
    _window.updatedLog = true;
    console.log("\n\nNEW SESSION");
}