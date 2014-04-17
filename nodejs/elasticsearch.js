// Set up express
var express = require("express");
var app = express();

//Set up elasticsearch
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
 	host: 'localhost:9200',
	log: 'trace'
});

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



});

//Util functions

//Find the index of an item in an array
function arrayObjectIndexOf(myArray, searchTerm, property) {
    for(var i = 0, len = myArray.length; i < len; i++) {
        if (myArray[i][property] === searchTerm) return i;
    }
    return -1;
}


//Start the server
app.listen(8888, 'localhost');
app.on('listening', function(){
    console.log('Express server started on port %s at %s', app.address().port, app.address().address);
})
