import cp from 'child_process';
function startClient() {
    const child = cp.fork(__dirname + '/node-client.js');
    child.on("message", (message, sendHandler) => {
        if(message === "reload") {
            setTimeout(function() {
                startClient();
            })
        }
    });
}
startClient();