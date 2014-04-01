var irc = require('slate-irc');
var net = require('net');
var logger = require('winston');
var fs = require('fs');

logger.cli();

var stream = net.connect({
  port: process.env['PORT'],
  host: process.env['HOST']
});

var client = irc(stream);


fs.open('logs/' + process.env['ROOM'] + '-' + Date.now() + '.json', 'a', function(err, fd) {
	logger.info('File opened.');

	client.pass(process.env['TOKEN']);
	client.nick(process.env['NICK']);
	client.user(process.env['NICK'], process.env['NICK']);
	client.join('#' + process.env['ROOM']);

	client.on('message', function(evt) {
		evt['timestamp'] = Date.now();
		fs.write(fd, JSON.stringify(evt) + "\n", null, 'utf-8');
	});
});
