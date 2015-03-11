//imports
var util 	= require('./util'),
    async = require('async'),
    _     = require('lodash');

/*
PUBLIC FUNCTIONS
*/

//Generate data for a bar chart
module.exports.generateJSON = function(root, parameters, callback){
	var data = { total : 0, values : []};

	var xParam = parameters.field1;
	var yParam = parameters.field2;

	data['x_label'] = xParam;
	data['y_label'] = yParam;

	async.each(root, function(child, callback){
		data.total += 1;

		var xValue = child._source[xParam];

		var position = _.findIndex(data.values, 'x', xValue);
		if(position > -1){ //Update entry
			if(yParam == "Count") {
				data.values[position].y += 1;
			}
			data.values[position].hashids.push(child._source.hashid);
			data.values[position].tables[child._source._table] = data.values[position].tables[child._source._table] || [];
			data.values[position].tables[child._source._table].push(child._source.hashid);
		} else { //Push new entry
			var yValue;
			if(yParam == "Count") {
				yValue = 1;
			} else {
				yValue = child._source.yParam;
			}
			var tables = {};
            tables[child._source._table] = [child._source.hashid];
			data.values.push({ "x" : xValue, "y" : yValue, hashids : [child._source.hashid], tables: tables });
		}
		callback();

	}, function(err){
		//return x and y axis data;
		data.values.sort(function(a, b){
			return a.x - b.x;
		});
		return callback(data);
	});
};


/*

PRIVATE FUCNTIONS

*/