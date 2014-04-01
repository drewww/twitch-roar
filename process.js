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

	log.on('line', function(line) {
		console.log(line);
	});
} else {
	console.log("No log file specified.");
}