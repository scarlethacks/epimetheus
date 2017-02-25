var express = require('express');

var port = process.env.PORT || 4000;
var app  = express();

app.get('/', function (req, res) {
    res.type('application/json');
    res.status(200).json({
        "now": new Date().getTime()
    });
});

app.listen(port, function () {
    console.log('[WEB] Server listening on port ' + port);
});