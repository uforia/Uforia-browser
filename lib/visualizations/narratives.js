var util = require('./util'),
    async = require('async'),
    _     = require('lodash');

//Generate data for a bar chart
module.exports.generateJSON = function(root, parameters, callback){

    var data = {total : 0, names : [], scenes : [], hashids : []};

    var from_field = parameters.field1;
    var to_fields = parameters.field2;

    data['x_label'] = from_field;
    data['y_label'] = to_fields;

    async.series([getNamesArray, createLinks, sortScenes, calculateDuration], function(err, results){
        if(err) throw err;

        callback(data);
    });


    function getNamesArray(cb){
        //Add all the emailaddresses to the names array
        async.each(root, function(child, cb){
            data.total += 1;

            //Get the email addresses
            var people = [];

            to_fields.forEach(function(field){
              people = people.concat(util.getEmailFromInput(child._source[field]));
            });

            async.each(people, function(receipient, cb){
                //Check if this receipient alreayd has an entry
                var toIndex = _.findIndex(data.names, 'name', receipient);
                if(toIndex > -1){ //Receipient has entry
                    data.names[toIndex].hashids.push(child._source.hashid);

                    data.names[toIndex].tables[child._source._table] = data.names[toIndex].tables[child._source._table] || [];
                    data.names[toIndex].tables[child._source._table].push(child._source.hashid);
                } else if (receipient) { //New receipient
                    var tables = {};
                    tables[child._source._table] = [child._source.hashid];
                    data.names.push({'id': data.names.length, 'name' : receipient, 'group':data.names.length, 'sent' : 0, 'received' : 1, 'hashids' : [child._source.hashid], 'tables': tables});
                } 
                cb();
            }, function(err){
                cb();
            });
        }, function(err){
            cb();
        });
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

            var chars = fromIndex > -1 ? [fromIndex] : [];

            async.each(to, function(receipient, cb){
                var toIndex = _.findIndex(data.names, 'name', receipient);

                if(toIndex > -1){
                    //Create the link between the from 'address' and this 'to' address
                    chars.push(toIndex);
                }
                cb();
            }, function(err){
                var sceneIndex = _.findIndex(data.scenes, {'date': new Date(child._source['Date']).getTime() || 0, 'chars': chars});
                if(sceneIndex > -1){
                    data.scenes[sceneIndex].received += 1;
                    data.scenes[sceneIndex].hashids.push(child._source.hashid);

                    data.scenes[sceneIndex].tables[child._source._table] = data.scenes[sceneIndex].tables[child._source._table] || [];
                    data.scenes[sceneIndex].tables[child._source._table].push(child._source.hashid);
                }else {
                    var tables = {};
                    tables[child._source._table] = [child._source.hashid];
                    data.scenes.push({duration: 0, start: 0, chars: chars, id: data.scenes.length, date: new Date(child._source['Date']).getTime() || 0, 'tables': tables, 'hashids': [child._source.hashid]})
                }
                cb();
            });
        }, function(err){
            cb();
        });
    }

    function sortScenes(cb){

        data.scenes.sort(function(a, b){
            return a.date - b.date;
        })

        var lastdate = -1, lastindex = -1, last = {};
        data.scenes.forEach(function(scene, index){  

            var add = 0;
            if(scene.date > lastdate){
                lastdate = scene.date;
                lastindex++;
            }
            scene.id = index;
        })

        cb();
    }

    function calculateDuration(cb){
        var start = new Date(data.scenes[0].date);
        var end   = new Date(data.scenes[data.scenes.length-1].date);
        var totalDays = Math.round(Math.abs((end.getTime() - start.getTime())/(24*60*60*1000)));

        async.each(data.scenes, function(scene, cb){
            scene.start = Math.abs((scene.date - start.getTime())/(24*60*60*1000));
            // scene.start = scene.duration;
            cb();
        }, function(err){
            cb();
        });
    }
}

function daydiff(first, second) {
    return (second-first)/(1000*60*60*24);
}