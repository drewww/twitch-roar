var program = require('commander'),
	_ = require('underscore')._,
	carrier = require('carrier'),
	natural = require('natural'),
	analyze = require('./lib/analyze.js');
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
	var windowCount = 0;

	log.on('line', function(line) {
		var message = JSON.parse(line);

		// cache the original message so we can extract it later
		// if need be.
		message.originalMessage = message.message;
		message.message = message.message.replace(/[^\x00-\x7F]/g, "");
		message.message = message.message.replace(/,/g, "");
		message.message = message.message.replace(/_/g, "");
		message.message = message.message.toLowerCase();

		// strip out links. anything starting with http.
		message.message = message.message.replace(/https?:[^\s]*/g, "");

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

			var results = analyze.messages(messagesInWindow);

			var outputFields = [windowCount*windowSize/1000, messagesInWindow.length];

			var messagesContainingTopComponent = results["messagesContainingTopComponent"];
			var allCommonComponentsArray = results["allCommonComponentsArray"];

			outputFields.push(messagesContainingTopComponent);
			outputFields.push(messagesInWindow.length - messagesContainingTopComponent);

			var finalFields = [];
			var containingTopString = 0;
			_.each(allCommonComponentsArray.slice(0, 10), function(item, index) {
				finalFields.push(item[0]);
				finalFields.push(item[1].score);				
				finalFields.push(item[1].count);				
			});

			// outputFields.push(topCount);
			outputFields.push.apply(outputFields, finalFields)


			console.log(outputFields.join(", "));
			
			messagesInWindow = [];
			windowStartTime = message.timestamp;
			windowCount++;
		}

		messagesInWindow.push(message);
	});
} else {
	console.log("No log file specified.");
}