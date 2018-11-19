var http = require('http');
var httpServer = http.createServer(function(req, res) {
    var headers = {};
    res.setHeader('Access-Control-Allow-Origin', '*');
    var body = "";
    req.on('readable', function() {
        var nextAddition = req.read();
        if(nextAddition) {
            body += nextAddition;
        }
    });
    req.on('end', function() {
        console.log(body);
        res.writeHead(200, headers);
        res.end();
    });
}).listen(8000);