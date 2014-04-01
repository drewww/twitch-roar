var program = require('commander'),
	_ = require('underscore')._,
	carrier = require('carrier'),
	fs = require('fs');

program
  .version('0.1.0')
  .usage('[options] <file>')
  .parse(process.argv);


if(program.args.length==1) {
	var fd = fs.createReadStream(program.args[0],
		{ flags: 'r',
		  encoding: null,
		  fd: null,
		  mode: 0666,
		  autoClose: true
		});

	var log = carrier.carry(fd);

	var messagesInWindow = 0;

	var windowSize = 10*1000; // 10 secnds
	var windowStartTime = -1;
	log.on('line', function(line) {
		var message = JSON.parse(line);

		if(windowStartTime==-1) {
			// we're starting out.
			windowStartTime = message.timestamp;
			messagesInWindow = 0;
		}

		if(message.timestamp - windowStartTime > windowSize) {
			// move to next window.
			console.log(messagesInWindow);
			messagesInWindow = 0;
			windowStartTime = message.timestamp;
		}

		messagesInWindow++;
	});
} else {
	console.log("No log file specified.");
}