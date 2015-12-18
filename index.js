var fs = require('fs');
var esprima = require('esprima');
var glob = require('glob');
var parseArgs = require('minimist');
var utils = require('./utils.js');

var args = parseArgs(process.argv.slice(2));

if (args.help) {
  showUsage();
}

var pattern = args.p;
if (!pattern) {
  showUsage();
  process.exit(1);
}

glob(pattern, null, function (er, files) {
  if (er) {
    console.log(er);
    process.exit(1);
  }
  console.log(JSON.stringify(files));
  var overallFiles = files.length;
  console.log(overallFiles + ' file(s) found.');
  console.time('Execution time');
  var output = '';
  for (var i = 0; i < overallFiles; i++) {
    var file = files[i];
    console.log('processing [' + (i + 1) + ' of ' + overallFiles + '] ' + file);
    var tree = esprima.parse(fs.readFileSync(file)).body;
    var parsedTree = utils.parseDescribes(tree);
    output += utils.outputTable(file, parsedTree);
  }
  if (args.f) {
    fs.writeFileSync(args.f, output);
  }
  else {
    console.log(output);
  }
  console.timeEnd('Execution time');

});

function showUsage() {
  console.log('Usage: \nnode ' + process.argv[1] + ' -p GLOB_PATTERN [-f OUTPUT_FILE] [--no-color]');
  console.log('Options:');
  console.log('-p         - (required) glob-pattern for files that should be parsed');
  console.log('-f         - (optional) filename to save results. Should be used with option "--no-color"');
  console.log('--no-color - (optional) avoid highlight usage');
  console.log('--help     - output this text');
  process.exit(0);
}