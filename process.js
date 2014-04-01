var program = require('commander'),
	_ = require('underscore')._,
	carrier = require('carrier'),
	natural = require('natural'),
	fs = require('fs');

require('descriptive-statistics');

program
  .version('0.1.0')
  .usage('[options] <file>')
  .option('-w, --window <n>', 'window size in ms', 10*1000)
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

	var messagesInWindow = [];

	var windowSize = program.window; // 10 secnds
	var windowStartTime = -1;

	log.on('line', function(line) {
		var message = JSON.parse(line);

		message.message = message.message.replace(/[^\x00-\x7F]/g, "");
		message.message = message.message.toLowerCase();
		message.message = message.message.trim();

		if(windowStartTime==-1) {
			// we're starting out.
			windowStartTime = message.timestamp;
			messagesInWindow = [];
		}

		if(message.timestamp - windowStartTime > windowSize) {
			// move to next window.

			// do post window processing

			// 1. Calculate inter-message distances
			var distances = [];
			var duplicatesCount = 0;
			var verySimilarCounts = 0;
			_.each(messagesInWindow, function(message) {
				_.each(messagesInWindow, function(otherMessage) {
					// throw out self-tests.
					if(message.timestamp==otherMessage.timestamp &&
						message.message==otherMessage.message) {
						return;
					}

					// okay, now compare the message texts.
					var distance = natural.JaroWinklerDistance(
							message.message, otherMessage.message);
					distances.push(distance);

					if(distance==1) {
						duplicatesCount++;
					} 

					if(distance > 0.95) {
						verySimilarCounts++;
					}
					// console.log("\t" + distance + " " + message.message + " ?== " + otherMessage.message)
				});
			});

			console.log(messagesInWindow.length + "," + distances.mean + "," + distances.standard_deviation + "," + verySimilarCounts + ", " + duplicatesCount);
			messagesInWindow = [];
			windowStartTime = message.timestamp;
		}

		messagesInWindow.push(message);
	});
} else {
	console.log("No log file specified.");
}