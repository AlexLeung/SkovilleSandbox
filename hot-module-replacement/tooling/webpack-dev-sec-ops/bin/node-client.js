const http = require('http');
http.get("http://localhost:8080/main.js", (res) => {
    var data = '';
    console.log("New Node.js client started!");
    process.stdout.write("downloading...");
    // A chunk of data has been recieved.
    res.on('data', (chunk) => {
        process.stdout.write(".");
        data += chunk;
    });
    // The whole response has been received. Print out the result.
    res.on('end', () => {
        console.log("done!");
        eval(data);
    });
});