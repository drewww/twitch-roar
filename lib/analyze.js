var natural = require('natural'),
	_ = require('underscore')._;


// takes an array of messages, and returns a bunch of metadata about them

module.exports.messages = function(messagesInWindow) {
			var startTime = Date.now();
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

			var out = {}
			_.each(messageFrequencies, function(value, key) {
				out[key] = {score: (value-1)*4 + 1, count: value};

			});
			var messageFrequenciesAdjusted = out;



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

			out = {};
			_.each(biGramFrequencies, function(value, key) {
				out[JSON.parse(key).join(" ")] = {score: (value-1)*2 + 1, count: value};
			});
			var biGramFrequenciesAdjusted = out;


			var tokenFrequencies = _.countBy(allTokens, function(token) {
				return token;
			});

			out = {};
			_.each(tokenFrequencies, function(value, key) {
				out[key] = {score: value, count: value};
			});
			tokenFrequencies = out;

			var biGramFrequenciesArray = _.sortBy(
				_.pairs(biGramFrequenciesAdjusted), function(item) {
					return item[1].score;
				}).reverse();

			_.each(biGramFrequenciesArray.slice(0, 5), function(bigram) {
				// for each token in these bigrams, pull it out of the token
				// frequencies list entirely. 

				var pair = bigram;

				// pair[0] = JSON.parse(pair[0]).join(" ");

				// now remove each of the tokens from the tokenFrequencies list
				_.each(pair[0], function(token) {
					delete tokenFrequencies[token];
				});

				// this will knock out the somewhat unlikely case that a bigram
				// is also the entire message and it's super popular
				delete messageFrequencies[pair[0]];
				delete messageFrequenciesAdjusted[pair[0]];
			});

			// run through top messages and knock out matching tokens
			var messageFrequenciesArray = _.sortBy(_.pairs(messageFrequenciesAdjusted), function(item) {
				return item[1].score;
			}).reverse();

			_.each(messageFrequenciesArray.slice(0, 5), function(message) {
				delete tokenFrequencies[message[0]];
			});

			// now merge together all the messages, bigrams, and tokens
			// and then resort. Take the top 10.

			var allCommonComponentsAdjusted = [];

			allCommonComponentsAdjusted.push.apply(allCommonComponentsAdjusted, biGramFrequenciesArray);
			allCommonComponentsAdjusted.push.apply(allCommonComponentsAdjusted, _.pairs(messageFrequenciesAdjusted));
			allCommonComponentsAdjusted.push.apply(allCommonComponentsAdjusted, _.pairs(tokenFrequencies));

			// var allCommonComponentsRaw = {};


			// _.extend(allCommonComponentsRaw, biGramFrequenciesArray);
			// allCommonComponentsRaw.push.apply(allCommonComponentsRaw, _.pairs(messageFrequencies));
			// allCommonComponentsRaw.push.apply(allCommonComponentsRaw, _.pairs(tokenFrequencies));


			// sort it
			var allCommonComponentsArray = _.sortBy(allCommonComponentsAdjusted, function(item) {
				return item[1].score;
			}).reverse();

			// console.log(JSON.stringify(allCommonComponentsArray.slice(0, 5)));

			// okay, I want some sort of metric that is basically how self-similar messages
			// are within a timing window. I'd sort of like to use the frequency counts
			// for this, but because they're artificially inflated to deal with the rankings
			// I can't rely on that. Options:
			// 	1. Do some sort of re-count that goes back through the window and checks to 
			//	   see what fraction of messages match a top common component. This is 
			//	   sort of weird though.
			//  2. Figure out some way to capture the pre-manipulated count values, and then 
			//     basically add up the top occurence as a fraction of total messages
			//	   		- so a lot of messages that don't have lots of common components would 
			//			  score low on this metric
			//			- the problem is that few messages will score relatively high.
			//			- won't be a huge problem visually, though, because the bar will be so
			//			  low and we'll represent it as a fraction of the total, not a %.
			//			- there are some other issues with this model:
			//				- because of the way we count, we could easily be double-counting
			//				  messages.


			var topComponents = allCommonComponentsArray.slice(0, 5);

			var messagesContainingTopComponent = 0;
			_.each(messagesInWindow, function(message) {
				var matches = false;
				_.each(topComponents, function(component) {
					// skip any component that just has one instance; those aren't
					// really 'top' in any sense.
					if(component[1].count<=3) {
						return;
					}

					if(message.message.indexOf(component[0]) != -1) {
						matches = true;
					}
				});

				if(matches) {
					messagesContainingTopComponent++;
				}
			});

			return {messagesContainingTopComponent:messagesContainingTopComponent,
				duplicatesCount:duplicatesCount,
				allCommonComponentsArray:allCommonComponentsArray,
				time: Date.now() - startTime};
};