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

		// cache the original message so we can extract it later
		// if need be.
		message.originalMessage = message.message;
		message.message = message.message.replace(/[^\x00-\x7F]/g, "");
		message.message = message.message.replace(/,/g, "");
		message.message = message.message.replace(/_/g, "");
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

			var messageFrequencies = {};
			var nGramFrequencies = {};

			var tokenizer = new natural.WordTokenizer();

			_.each(messagesInWindow, function(message) {

				// this section will track n-grams
				// var tokens = tokenizer.tokenize(message.message);

				// _.each(tokens, function(token) {
				// 	var obj = {token:JSON.stringify(token), count:0};

				// 	if(token in nGramFrequencies) {
				// 		obj = nGramFrequencies[JSON.stringify(token)];
				// 	}

				// 	obj.count = obj.count+1;
				// 	nGramFrequencies[JSON.stringify(token)] = obj;
				// });

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
				});
			});

			messageFrequencies = _.countBy(messagesInWindow, function(message) {
				return message.message;
			});

			// do the analysis again for bigrams

			var allBigrams = [];
			var allTokens = [];
			_.each(messagesInWindow, function(message) {
				bigrams = natural.NGrams.bigrams(message.message);
				allBigrams.push.apply(allBigrams, bigrams);
				allTokens.push.apply(allTokens, tokenizer.tokenize(message.message));
			});

			biGramFrequencies = _.countBy(allBigrams, function(bigram) {
				return JSON.stringify(bigram);
			});

			var tokenFrequencies = _.countBy(allTokens, function(token) {
				return token;
			});

			var biGramFrequenciesArray = _.sortBy(
				_.pairs(biGramFrequencies), 1).reverse();

			var bigramsOutString = "";
			_.each(biGramFrequenciesArray.slice(0, 5), function(bigram) {
				// for each token in these bigrams, pull it out of the token
				// frequencies list entirely. 

				var pair = bigram;

				pair[0] = JSON.parse(pair[0]).join(" ");

				bigramsOutString += pair[0] + ", " + pair[1] + ", ";

				// now remove each of the tokens from the tokenFrequences list
				_.each(pair[0], function(token) {
					delete tokenFrequencies[token];
				});
			});

			var messageFrequenciesArray = _.sortBy(_.pairs(messageFrequencies), 
				1).reverse();

			var tokenFrequenciesArray = _.sortBy(_.pairs(tokenFrequencies), 1).reverse();

			var tokensOutString = "";
			_.each(tokenFrequenciesArray.slice(0, 5), function(token) {
				var pair = token;
				tokensOutString += pair[0] + ", " + pair[1] + ", ";
			});

			// console.log(JSON.stringify(messageFrequenciesArray.slice(0, 5).map(function(item) {return item[0]})));
			// console.log(JSON.stringify(nGramFrequenciesArray.slice(0, 5)));

			console.log(messagesInWindow.length + ", " + distances.mean + ", " +
				distances.standard_deviation + ", " + verySimilarCounts + ", " +
				duplicatesCount + ", " +
					messageFrequenciesArray.slice(0, 5)
					.map(function(item) {return item[0] + ", " + item[1]})
					.join(", ") + ", "+
					bigramsOutString + tokensOutString
					);


			messagesInWindow = [];
			windowStartTime = message.timestamp;
		}

		messagesInWindow.push(message);
	});
} else {
	console.log("No log file specified.");
}