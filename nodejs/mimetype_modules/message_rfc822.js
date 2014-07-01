//imports
var util = require('./util');

//These function will be public
module.exports = {

  createEmailChordDiagram: function(root){
    var data = {total : 0, names : [], matrix : [], hashids : []};

    root.forEach(function(child){
        data.total += 1;
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To + " " + child._source.XTo + " " + child._source.Xcc + " " + child._source.Xbcc + " " + child._source.Cc + " " + child._source.Bcc);

        var fromIndex = util.arrayObjectIndexOf(data.names, from, "name");
        if(fromIndex > -1){
            data.names[fromIndex].sent += 1;
            data.names[fromIndex].hashids.push(child._source.hashid);
        } else {
            data.names.push({name : from, sent: 1, received : 0, hashids : [child._source.hashid]});
        }

        to.forEach(function(receipient){
            var toIndex = util.arrayObjectIndexOf(data.names, receipient, "name");
            if(toIndex > -1){
                data.names[toIndex].received += 1;
                data.names[toIndex].hashids.push(child._source.hashid);
            } else {
                data.names.push({name : receipient, sent : 0, received : 1, hashids : [child._source.hashid]});
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

    root.forEach(function(child){
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To + " " + child._source.XTo + " " + child._source.Xcc + " " + child._source.Xbcc + " " + child._source.Cc + " " + child._source.Bcc);

        fromIndex = util.arrayObjectIndexOf(data.names, from, "name");
        to.forEach(function(receipient){
            var toIndex = util.arrayObjectIndexOf(data.names, receipient, "name")
            if(toIndex > -1){
                data.matrix[fromIndex][toIndex] += 1;
                data.matrix[toIndex][fromIndex] += 1;
                data.hashids[fromIndex][toIndex].push(child._source.hashid);
                data.hashids[toIndex][fromIndex].push(child._source.hashid);
            }
        });
    });

    return data;
  },

  //Modify the result for an email graph
  createEmailGraph: function(root){
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

        var fromIndex = util.arrayObjectIndexOf(data.nodes, from, "name"); 
        if(fromIndex > -1){
            data.nodes[fromIndex].sent += 1;
            data.nodes[fromIndex].hashids.push(child._source.hashid);
        } else {
            data.nodes.push({name : from, sent: 1, received : 0, hashids : [child._source.hashid]});
        }

        to.forEach(function(receipient){
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

    return data;
  },

  createBarChart: function(root){
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

    return data;
  }
};

//Functions below are private
function getFromEmail(input){
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