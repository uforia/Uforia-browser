//imports
var util = require('./util');

/*

PUBLIC FUNCTIONS

*/

//Generate data for a bar chart
module.exports.barChart = function(root, parameters, callback){
	var data = { total : 0, values : []};

	var xParam = parameters.x;
	var yParam = parameters.y;

	data['x_label'] = xParam;
	data['y_label'] = yParam;

	root.forEach(function(child){
		data.total += 1;

		var xValue = child._source[xParam];

		var position = util.arrayObjectIndexOf(data.values, xValue, "x");
		if(position > -1){ //Update entry
			if(yParam == "SUM") {
				data.values[position].y += 1;
			}
			data.values[position].hashids.push(child._source.hashid);
		} else { //Push new entry
			var yValue;
			if(yParam == "SUM") {
				yValue = 1;
			} else {
				yValue = child._source.yParam;
			}
			data.values.push({ "x" : xValue, "y" : yValue, hashids : [child._source.hashid] });
		}

	});

	//return x and y axis data;
	return callback(data);
}


/*

PRIVATE FUCNTIONS

*/