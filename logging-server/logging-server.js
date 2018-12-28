var http = require('http');
// Eventually we want to utilize sequence numbers so that messages that arrive out-of-order are printed
// in-order, but we will wait to add in this fix until the logging server is more integrated into an actual
// solution.
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