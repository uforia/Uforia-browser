var workerFarm = require('worker-farm'),
    config     = require('../config');

//Set up workers processes for longer tasks
var workerOptions = config.workers;

var workers = {};

workers.email = workerFarm(workerOptions, require.resolve('./mimetype_modules/email'), ['createEmailChordDiagram' , 'createEmailGraph', 'createBarChart']);
workers.files = workerFarm(workerOptions, require.resolve('./mimetype_modules/files'), ['createFilesBubble']);
workers.documents = workerFarm(workerOptions, require.resolve('./mimetype_modules/documents'), ['createBarChart']);
workers.barChart = workerFarm(workerOptions, require.resolve('./visualizations/bar_chart'), ['barChart']);

module.exports = workers;