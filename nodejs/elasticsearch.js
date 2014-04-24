// Set up express
var express = require("express");
var app = express();

//Set up elasticsearch
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200',
  log: 'trace'
});

//'Constants'
var INDEX = 'uforia';
var DEFAULT_TYPE = 'files';
var DEFAULT_SIZE = 10;


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
* collapse (array of values)
* 
*/
app.get("/api/search", function(req, res) {
  search_request = {};
  search_request['index'] = INDEX;
  search_request['type'] = defaultFor(req.param('type'), DEFAULT_TYPE);
  search_request['size'] = defaultFor(req.param('size'), DEFAULT_SIZE);

  if(search_request['size'] === 'all'){
    client.count({
      index : INDEX,
      type : search_request.type
    }).then(function(resp){
      //Search
      search_request.size = resp.count;
      search(search_request, res);
    }, function(err){
      console.trace(err.message);
      search_request.size = DEFAULT_SIZE;
      search(search_request, res);
    });
  }  else {
    search(search_request, res);
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
    res.send(Object.keys(resp[INDEX].mappings[type].properties));
  }, function(err){
    console.log(err.message);
  });
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

//Search and return the result
var search = function(search_request, res){
    client.search(search_request, res).then(function(resp){
    res.send(groupByUser(resp.hits.hits));
  }, function(err){
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
app.on('listening', function(){
    console.trace('Express server started on port %s at %s', app.address().port, app.address().address);
})
app.listen(8888, 'localhost');

