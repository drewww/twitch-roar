var irc = require('slate-irc');
var net = require('net');
var logger = require('winston');
var fs = require('fs');
var program = require('commander');
var analyze = require('./lib/analyze.js');


program
  .version('0.1.0')
  .parse(process.argv);

logger.cli();

var stream = net.connect({
  port: process.env['PORT'],
  host: process.env['HOST']
});

var client = irc(stream);

var room;

room = program.args.length==1 ? program.args[0] : process.env['ROOM'];

var messages = [];

fs.open('logs/' + room + '-' + Date.now() + '.json', 'a', function(err, fd) {
	logger.info('File opened.');

	client.pass(process.env['TOKEN']);
	client.nick(process.env['NICK']);
	client.user(process.env['NICK'], process.env['NICK']);

	client.join('#' + room);

	client.on('message', function(evt) {
		evt['timestamp'] = Date.now();
		fs.write(fd, JSON.stringify(evt) + "\n", null, 'utf-8');
		messages.push(evt);
	});

	setInterval(function() {
		var processingMessages = messages;
		messages = [];

		var result = analyze.messages(processingMessages);

		var chars = "";

		for(var i=0; i<processingMessages.length; i+=5) {
			if(i < result["messagesContainingTopComponent"]) {
				chars += "o";
			} else {
				chars += "*";
			}
		}

		// 

		logger.info(chars + " (" + processingMessages.length + ")");
	}, 10*1000);
});
