var irc = require('slate-irc');
var net = require('net');
var logger = require('winston');
var fs = require('fs');
var program = require('commander');
var analyze = require('./lib/analyze.js');
var _ = require('underscore')._;


program
  .version('0.1.0')
  .option('-w, --window <n>', 'window size in ms', 10*1000)
  .option('-l, --log', 'log to disk')
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

if(program.log) {
	fs.open('logs/' + room + '-' + Date.now() + '.json', 'a', function(err, fd) {
		logger.info('File opened.');
		connect(fd);
	});
} else {
	connect();
}


function connect(fd) {
	client.pass(process.env['TOKEN']);
	client.nick(process.env['NICK']);
	client.user(process.env['NICK'], process.env['NICK']);

	client.join('#' + room);

	logger.info("Connected to " + process.env['HOST'] + " #" + room);
	client.on('message', function(evt) {
		evt['timestamp'] = Date.now();

		if(program.log) {
			fs.write(fd, JSON.stringify(evt) + "\n", null, 'utf-8');
		}

		messages.push(evt);
	});

	setInterval(function() {
		var processingMessages = messages;
		messages = [];

		var result = analyze.messages(processingMessages);

		var chars = "";

		for(var i=0; i<150; i+=5) {
			if(i < result["messagesContainingTopComponent"]) {
				chars += "o";
			} else if(i<processingMessages.length) {
				chars += "*";
			} else {
				chars += " "
			}
		}

		// top strings 
		var topString = ""
		if(result["messagesContainingTopComponent"] > 5) {
			var allCommonComponentsArray = result["allCommonComponentsArray"];

			_.each(allCommonComponentsArray.slice(0, 3), function(item) {
				topString += item[0] + " (" + item[1].count + ") ";
			});
		}

		logger.info(chars + topString + " (" + processingMessages.length + " in " + result["time"] + "ms)");
	}, program.window);
}
