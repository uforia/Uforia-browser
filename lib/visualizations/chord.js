var util = require('./util'),
    async = require('async'),
    _     = require('lodash');

//Generate data for a bar chart
module.exports.generateJSON = function(root, parameters, callback){

    var data = {total : 0, names : [], matrix : [], hashids : []};

    var from_field = parameters.field1;
    var to_fields = parameters.field2;

    async.series([getNamesArray, fillMatrix, createLinks], function(err, results){
        if(err) throw err;
        callback(data);
    });


    function getNamesArray(cb){
        //Add all the emailaddresses to the names array
        async.each(root, function(child, cb){
            data.total += 1;

            //Get the email addresses
            var from = util.getEmailFromInput(child._source[from_field])[0] || 'Unknown';
            var to = [];

            to_fields.forEach(function(field){
              to = to.concat(util.getEmailFromInput(child._source[field]));
            });

            //Check if the from email already has an entry
            var fromIndex = _.findIndex(data.names, 'name', from);
            if(fromIndex > -1){ //Update existing entry
                data.names[fromIndex].sent += 1;
                data.names[fromIndex].hashids.push(child._source.hashid);

                data.names[fromIndex].tables[child._source._table] = data.names[fromIndex].tables[child._source._table] || [];
                data.names[fromIndex].tables[child._source._table].push(child._source.hashid);
            } else { //No entry for this email yet
                var tables = {};
                tables[child._source._table] = [child._source.hashid];
                data.names.push({'name' : from, 'sent': 1, 'received' : 0, 'hashids' : [child._source.hashid], 'tables': tables });
            }

            async.each(to, function(receipient, cb){
                //Check if this receipient alreayd has an entry
                var toIndex = _.findIndex(data.names, 'name', receipient);
                if(toIndex > -1){ //Receipient has entry
                    data.names[toIndex].received ++;
                    data.names[toIndex].hashids.push(child._source.hashid);

                    data.names[toIndex].tables[child._source._table] = data.names[toIndex].tables[child._source._table] || [];
                    data.names[toIndex].tables[child._source._table].push(child._source.hashid);
                } else if (receipient) { //New receipient
                    var tables = {};
                    tables[child._source._table] = [child._source.hashid];
                    data.names.push({'name' : receipient, 'sent' : 0, 'received' : 1, 'hashids' : [child._source.hashid], 'tables': tables});
                } 
                cb();
            }, function(err){
                cb();
            });
        }, function(err){
            cb();
        });
    }

    function fillMatrix(cb){
        //Fill the matrix with empty values
        for(var i = 0; i < data.names.length; i++){
            data.matrix.push([]);
            data.hashids.push([]);
            //Set initial matrix values to zero
            for(var j = 0; j < data.names.length; j++){
                data.matrix[i].push(0);            
                data.hashids[i].push([]);
            }
        }
        cb();
    }

    function createLinks(cb){
        //Create the links between email addresses
        async.each(root, function(child, cb){
            var from = util.getEmailFromInput(child._source[from_field])[0];
            var to = [];

            to_fields.forEach(function(field){
              to = to.concat(util.getEmailFromInput(child._source[field]));
            });

            fromIndex = _.findIndex(data.names, 'name', from);

            async.each(to, function(receipient, cb){
                var toIndex = _.findIndex(data.names, 'name', receipient);

                if(toIndex > -1){
                    //Create the link between the from 'address' and this 'to' address
                    data.matrix[fromIndex][toIndex] += 1;
                    data.matrix[toIndex][fromIndex] += 1;
                    //Also store the hashids of the email
                    data.hashids[fromIndex][toIndex].push(child._source.hashid);
                    data.hashids[toIndex][fromIndex].push(child._source.hashid);
                }
                cb();
            }, function(err){
                cb();
            });
        }, function(err){
            cb();
        });
    }
}