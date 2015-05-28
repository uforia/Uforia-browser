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

		//http://stackoverflow.com/a/979325/1150302
		var sort_by = function(field, reverse, primer){
		 var key = function (x) {return primer ? primer(x[field]) : x[field]};

		 return function (a,b) {
		  var A = key(a), B = key(b);
		  return ( (A < B) ? -1 : ((A > B) ? 1 : 0) ) * [-1,1][+!!reverse];                  
		 }
		}

  		data.values.sort(sort_by('x', true, function(d){return d.toLowerCase();}));
		
		return callback(data);
	});
};


/*

PRIVATE FUNCTIONS

*/

