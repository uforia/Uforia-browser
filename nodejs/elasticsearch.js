// Set up express
var express = require("express");
var app = express();

//Set up elasticsearch
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200'
  // log: 'trace'
});

//'Constants'
var INDEX = 'uforia';
var DEFAULT_TYPE = 'files';
var DEFAULT_VIEW = 'bubble';
var DEFAULT_SIZE = 10;
var VIEWS = {
    files : {bubble : 'Bubble'},
    message_rfc822 : {chord : 'Chord diagram', graph :'Graph'}
};


//Set the view directory and HTML render engine
app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);

//Set the public files directory
app.use(express.static(__dirname + '/public'));

//Handle requests
app.get('/', function(req, res){
  res.render('index.html');
});

//Api calls
app.get('/api/get_files', function(req, res){
  client.search({
    index : 'uforia',
    type : 'files',
    size : 100
  }).then(function(resp){
    res.send(groupByUser(resp.hits.hits));
  }, function(err){
    console.trace(err.message);
  });
});

/* Query elasticsearch
* takes params:
* q
* type
* size
* view
* 
*/
app.get("/api/search", function(req, res) {
  search_request = {};
  search_request['index'] = INDEX;
  search_request['type'] = defaultFor(req.param('type'), DEFAULT_TYPE);
  search_request['size'] = defaultFor(req.param('size'), DEFAULT_SIZE);
  search_request['q'] = defaultFor(req.param('q'), "*:*");
  var view = defaultFor(req.param('view'), DEFAULT_VIEW);

  if(search_request['size'] === 'all'){
    client.count({
      index : INDEX,
      type : search_request.type
    }).then(function(resp){
      //Search
      search_request.size = resp.count;
      search(search_request, res, view);
    }, function(err){
      console.trace(err.message);
      search_request.size = DEFAULT_SIZE;
      search(search_request, res, view);
    });
  }  else {
    search(search_request, res, view);
  }
});


/*Return the fields each item in a mapping has
* takes params:
* type
*
*/
app.get("/api/mapping_info", function(req, res){
  type = defaultFor(req.param('type'), DEFAULT_TYPE);
  client.indices.getMapping({ 
    index : INDEX,
    type : type
  }).then(function(resp){
    try{
      res.send(Object.keys(resp[INDEX].mappings[type].properties)); 
    } catch(err){
      res.send(["Could not load fields for this mapping"])
    }
  }, function(err){
    console.log(err.message);
  });
});

/* Return the available view for a type
* takes params:
* type
*
*/
app.get("/api/view_info", function(req, res){
    type = defaultFor(req.param('type'), DEFAULT_TYPE);
    res.send(VIEWS[type]);
});

//Util functions

//Group the results according to users preference
function fieldCollapse(data, fields){
  var result = {name : data, children : []};
  var maxDepth = fields.length;

  data.forEach(function(child){
    for(var i = 0; i < maxDepth; i++){
      var field = fields[i];

    }
  });

  function addChildren(child, field, depth){
    var newChild = {name : child.field, children : []};

    child.children.push(newChild);
    if(depth != maxDepth){
      addChildren
    }
  }

  return result;
}

//Group the results by users and mimetype groups for every users
function groupByUser(root) {
    var classes = {name : "files", children : []};

    root.forEach(function(child){
          var index = arrayObjectIndexOf(classes.children, child._source.owner, "name"); 
          if(index > -1){ // Add the child to owner's file list
            var typeIndex = arrayObjectIndexOf(classes.children[index].children, child._source.mtype, "name");
            if(typeIndex > -1) { // add the child to the correct mimetype group
                classes.children[index].children[typeIndex].children.push({name : child._source.name, size : child._source.size, owner : child._source.owner, mtime : child._source.mtime, atime: child._source.mtime, ctime : child._source.ctime, mtype : child._source.mtype});
            } else {
                classes.children[index].children.push({name : child._source.mtype, children : [{name : child._source.name, size : child._source.size, owner : child._source.owner, mtime : child._source.mtime, atime: child._source.mtime, ctime : child._source.ctime, mtype : child._source.mtype}]});
            }
          } else { // Not added yet, push a new item to the list
            classes.children.push({name : child._source.owner, children : [{name : child._source.mtype, children : [{name : child._source.name, size : child._source.size, owner : child._source.owner, mtime : child._source.mtime, atime: child._source.mtime, ctime : child._source.ctime, mtype : child._source.mtype}]}]});
          }
    });
    return classes;
}

function createEmailChordDiagram(root){
    var data = {total : 0, names : [], count : [], matrix : []};

    function getFromEmail(input){
        if(input == null) {
          return "Unknown";
        }

        input = input.toLowerCase();
        try {
          var matches = input.match(/\<([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)\>/gi);
          if(matches.length > 0){
            return matches[0].substring(1, matches[0].length -1);
         } else {
            return "Unknown";
          }
        } catch(err){
          return "Unknown";
        }
    }

    function getToEmail(input){
        if(input == null){
          return ["Unknown"];
        }

        input = input.toLowerCase();
        try {
          var matches = input.match(/\<([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)\>/gi);
          if(matches.length > 0){
            result = [];
            matches.forEach(function(match){
                result.push(match.substring(1, match.length -1));
            });
            return result;
          } else {
            return ["Unknown"];
          }
        } catch (err){
         return ["Unknown"]; 
        } 
    }

    root.forEach(function(child){
        data.total += 1;
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To);

        //Add the emailaddress to the list of names
        if(data.names.indexOf(from) < 0){
            data.names.push(from);
            data.count.push(1);
        } else { //Add another email to the total emails sent by an address
            data.count[data.names.indexOf(from)] += 1;
        }

        to.forEach(function(receipient){
            if(data.names.indexOf(receipient) < 0){
                data.names.push(receipient);
                data.count.push(0);
            }
        });       
    });

    //Fill the matrix with empty values
    for(var i = 0; i < data.names.length; i++){
        data.matrix.push([]);
        //Set initial matrix values to zero
        for(var j = 0; j < data.names.length; j++){
            data.matrix[i].push(0);
        }
    }

    //Fill the matrix with useful data
    root.forEach(function(child){
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To);

        fromIndex = data.names.indexOf(from);
        to.forEach(function(receipient){
            if(data.names.indexOf(receipient) > -1){
                data.matrix[fromIndex][data.names.indexOf(receipient)] += 1;
            }
        });
    });

    return data;
}

//Modify the result for an email graph
function createEmailGraph(root){
    var data = { total : 0, nodes : [], links : []};

    function getFromEmail(input){
        if(input == null) {
          return "Unknown";
        }

        input = input.toLowerCase();
        try {
          var matches = input.match(/\<([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)\>/gi);
          if(matches.length > 0){
            return matches[0].substring(1, matches[0].length -1);
         } else {
            return "Unknown";
          }
        } catch(err){
          return "Unknown";
        }
    }

    function getToEmail(input){
        if(input == null){
          return ["Unknown"];
        }

        input = input.toLowerCase();
        try {
          var matches = input.match(/\<([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)\>/gi);
          if(matches.length > 0){
            result = [];
            matches.forEach(function(match){
                result.push(match.substring(1, match.length -1));
            });
            return result;
          } else {
            return ["Unknown"];
          }
        } catch (err){
         return ["Unknown"]; 
        } 
    }

    //check if a link already exists in the link array
    function containsLink(links, target){
        var found = false;
        for(var i = 0; i < links.length; i++){
            var link = links[i];
            if(link.source == target.source && link.target == target.target){
                found = true;
                break;
            }
        }
        return found;
    }

    //Fill the nodes array
    root.forEach(function(child){
        data.total += 1;
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To);

        var fromIndex = arrayObjectIndexOf(data.nodes, from, "name"); 
        if(fromIndex > -1){
            data.nodes[fromIndex].sent += 1;
        } else {
            data.nodes.push({name : from, sent: 1, received : 0});
        }

        to.forEach(function(receipient){
            var toIndex = arrayObjectIndexOf(data.nodes, receipient, "name");
            if(toIndex > -1){
                data.nodes[toIndex].received += 1;
            } else {
                data.nodes.push({name : receipient, sent : 0, received : 1});
            } 
        });
    });

    //Fill the links array
    root.forEach(function(child){
        var from = getFromEmail(child._source.From);
        var to = getToEmail(child._source.To);

        var index = arrayObjectIndexOf(data.nodes, from, "name");

        // console.log("index out loop: " + index);
        to.forEach(function(receipient){
            var toIndex = arrayObjectIndexOf(data.nodes, receipient, "name");
            var link = {source : index, target : toIndex, value : 1};
            // console.log("index in loop: " + index);
            if(containsLink(data.links, link)){
                data.links[index].value += 1;
            } else {
                data.links.push(link);
            }
        });
    });

  return data;
}

//Search and return the result
var search = function(search_request, res, view){
    client.search(search_request, res).then(function(resp){
    switch(search_request.type){
        case 'files':
                try {
                    res.send(groupByUser(resp.hits.hits));
                }catch(err){
                    res.send();
                }
            break;
        case 'message_rfc822':
            if(view == 'chord'){
                try {
                    res.send(createEmailChordDiagram(resp.hits.hits));
                }catch(err){
                    res.send();
                }
            } else if (view == 'graph') { 
                try {
                    res.send(createEmailGraph(resp.hits.hits));
                }catch(err){
                    res.send();
                }
            }
            break;
        default: // default is files
            res.send(groupByUser(resp.hits.hits));
            break;
    }
  }, function(err){
    res.send();
    console.trace(err.message);
  });
};

//Returns the number of entries in a mapping, then re-runs the function it came from
var count = function(type) {
  client.count({
    index : INDEX,
    type : type
  }).then(function(resp){
    console.log(resp.count);
    return resp.count;
  }, function(err){
    console.trace(err.message);
    return DEFAULT_SIZE;
  });
}

//Returns a default value for undefined values
function defaultFor(arg, val) { 
  return typeof arg !== 'undefined' ? arg : val; 
}

//Find the index of an item in an array
function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}

//Start the server
var server = app.listen(8888, function(){
  console.log('Listening on port %d', server.address().port);
});

//Gracefully shutdown the server
process.on('SIGTERM', function () {
  console.log("Closing");
  server.close();
});
