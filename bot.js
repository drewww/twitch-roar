var irc = require('slate-irc');
var net = require('net');
var logger = require('winston');

logger.cli();

var stream = net.connect({
  port: process.env['PORT'],
  host: process.env['HOST']
});

var client = irc(stream);

client.pass(process.env['TOKEN']);
client.nick(process.env['NICK']);
client.user(process.env['NICK'], process.env['NICK']);

client.join('#' + process.env['ROOM']);

client.on('message', function(evt) {
	logger.info('<' + evt.from + '> ' + evt.message);
});