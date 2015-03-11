//imports
var util = require('./util');

//These function will be public
//Produces data for the Chord Diagram
module.exports.createVisualization = function(res, view, resp) {
    var thread = threads.create();

    if(view == 'chord'){
        thread.eval(createEmailChordDiagram).eval('createEmailChordDiagram(' + JSON.stringify(resp.hits.hits) +')', function(err, result){
            if(err){
                console.log(err.message);
            }
            console.log(result);
            res.send(result);
        });

        // try {
        //   res.send(email.createEmailChordDiagram(resp.hits.hits));
        // }catch(err){
        //     console.log(err.message);
        //     res.send();
        // }
    } else if (view == 'graph') { 
        try {
            res.send(email.createEmailGraph(resp.hits.hits));
        }catch(err){
            res.send();
        }
    } else if(view == 'bar_chart'){
        try {
            res.send(email.createBarChart(resp.hits.hits));
        } catch(err){
            res.send();
        }
    }
}


module.exports.createEmailChordDiagram = function(root, callback){
    var data = {total : 0, names : [], matrix : [], hashids : []};

    //Add all the emailaddresses to the names array
    root.forEach(function(child){
        data.total += 1;

        //Get the email addresses
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To + " " + child._source.XTo + " " + child._source.Xcc + " " + child._source.Xbcc + " " + child._source.Cc + " " + child._source.Bcc);

        //Check if the from email already has an entry
        var fromIndex = util.arrayObjectIndexOf(data.names, from, "name");
        if(fromIndex > -1){ //Update existing entry
            data.names[fromIndex].sent += 1;
            data.names[fromIndex].hashids.push(child._source.hashid);

            data.names[fromIndex].tables[child._source._table] = data.names[fromIndex].tables[child._source._table] || [];
            data.names[fromIndex].tables[child._source._table].push(child._source.hashid);
        } else if (from !== null) { //No entry for this email yet
            var tables = {};
            tables[child._source._table] = [child._source.hashid];
            data.names.push({'name' : from, 'sent': 1, 'received' : 0, 'hashids' : [child._source.hashid], 'tables': tables });
        }

        to.forEach(function(receipient){
            //Check if this receipient alreayd has an entry
            var toIndex = util.arrayObjectIndexOf(data.names, receipient, "name");
            if(toIndex > -1){ //Receipient has entry
                data.names[toIndex].received += 1;
                data.names[toIndex].hashids.push(child._source.hashid);

                data.names[toIndex].tables[child._source._table] = data.names[toIndex].tables[child._source._table] || [];
                data.names[toIndex].tables[child._source._table].push(child._source.hashid);
            } else if (receipient !== null) { //New receipient
                var tables = {};
                tables[child._source._table] = [child._source.hashid];
                data.names.push({'name' : receipient, 'sent' : 0, 'received' : 1, 'hashids' : [child._source.hashid], 'tables': tables});
            } 
        });
    });

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

    //Create the links between email addresses
    root.forEach(function(child){
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To + " " + child._source.XTo + " " + child._source.Xcc + " " + child._source.Xbcc + " " + child._source.Cc + " " + child._source.Bcc);

        fromIndex = util.arrayObjectIndexOf(data.names, from, "name");
        to.forEach(function(receipient){
            var toIndex = util.arrayObjectIndexOf(data.names, receipient, "name")
            if(toIndex > -1){
                //Create the link between the from 'address' and this 'to' address
                data.matrix[fromIndex][toIndex] += 1;
                data.matrix[toIndex][fromIndex] += 1;
                //Also store the hashids of the email
                data.hashids[fromIndex][toIndex].push(child._source.hashid);
                data.hashids[toIndex][fromIndex].push(child._source.hashid);
            }
        });
    });

    return callback(data);
};

//Modify the result for an email graph
module.exports.createEmailGraph = function(root, callback){
    var data = { total : 0, nodes : [], links : []};

    //check if a link already exists and returns its position
    function linkIndexFor(links, target){
        for(var i = 0; i < links.length; i++){
            var link = links[i];
            if(link.source == target.source && link.target == target.target){
                return i;
            }
        }
        return -1;
    }

    //Fill the nodes array
    root.forEach(function(child){
        data.total += 1;
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To + " " + child._source.Xto + " " + child._source.Xcc + " " + child._source.Xbcc + " " + child._source.Cc + " " + child._source.Bcc);

        //Check if the from address already has an entry. If so update it, otherwise create it
        var fromIndex = util.arrayObjectIndexOf(data.nodes, from, "name"); 
        if(fromIndex > -1){
            data.nodes[fromIndex].sent += 1;
            data.nodes[fromIndex].hashids.push(child._source.hashid);
        } else {
            data.nodes.push({name : from, sent: 1, received : 0, hashids : [child._source.hashid]});
        }

        to.forEach(function(receipient){
            //Check if the to address already has an entry. If so update it, otherwise create it
            var toIndex = util.arrayObjectIndexOf(data.nodes, receipient, "name");
            if(toIndex > -1){
                data.nodes[toIndex].received += 1;
                data.nodes[toIndex].hashids.push(child._source.hashid);
            } else {
                data.nodes.push({name : receipient, sent : 0, received : 1, hashids : [child._source.hashid]});
            } 
        });
    });

    //Fill the links array
    root.forEach(function(child){
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To + " " + child._source.Xto + " " + child._source.Xcc + " " + child._source.Xbcc + " " + child._source.Cc + " " + child._source.Bcc);

        var index = util.arrayObjectIndexOf(data.nodes, from, "name");

        //Create a link between the from address and all the receipients of the email
        to.forEach(function(receipient){
            var toIndex = util.arrayObjectIndexOf(data.nodes, receipient, "name");
            var link = {source : index, target : toIndex, value : 1, hashids : [child._source.hashid]};
            var linkIndex = linkIndexFor(data.links, link);
            if(linkIndex > -1){
                data.links[linkIndex].value += 1;
                data.links[linkIndex].hashids.push(child._source.hashid);
            } else {
                data.links.push(link);
            }
        });
    });

    return callback(data);
}

module.exports.createBarChart = function(root, callback){
    var data = { total : 0, dates : []};

    root.forEach(function(child){
        data.total += 1;

        var date = child._source.Date;

        //Check if date already has an entry in the dates array
        var dateIndex = util.arrayObjectIndexOf(data.dates, date, "date");
        if(dateIndex > -1) { //has entry
            data.dates[dateIndex].total += 1;
            data.dates[dateIndex].hashids.push(child._source.hashid);
        } else { // new date entry
            data.dates.push({ "date" : date, total : 1, hashids : [child._source.hashid] });
        }
    });

    //Sort by date
    data.dates.sort(function(item1, item2){
        var date1 = new Date(item1.date);
        var date2 = new Date(item2.date);
        return date1 - date2;
    });

    return callback(data);
};

//Functions below are private

function getFromEmail(input){
    if(input)
        input = input.toLowerCase();
    try {
      var matches = input.match(/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/gi);
      if(matches.length > 0){
        return matches[0];
     } else {
        return "Unknown";
      }
    } catch(err){
      return "Unknown";
    }
}

function getToEmail(input){
    input = input.toLowerCase();
    try {
      var matches = input.match(/[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*/gi);
      if(matches.length > 0){
        return matches;
      } else {
        return ["Unknown"];
      }
    } catch (err){
     return ["Unknown"];
    }
}