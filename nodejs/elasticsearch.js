// Set up express
var express = require("express");
var app = express();

//Set up elasticsearch
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: 'localhost:9200'
  // log: 'trace'
});

//Mimetype classes requirements
var util = require('./mimetype_modules/util');
var files = require('./mimetype_modules/files');
var message_rfc822 = require('./mimetype_modules/message_rfc822');

//Connect to the Database
var mysql = require('mysql');
var db = mysql.createConnection({
    host : 'localhost',
    user : '',
    password : '',
    database : 'uforia'
});
db.connect(function(err){
    if(err){
        console.log("Error connecting to database: " + err.stack());
    }
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
    res.send(files.groupByUser(resp.hits.hits));
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
// app.get("/api/search", function(req, res) {
//   var search_request = {};
//   search_request['index'] = INDEX;
//   search_request['type'] = util.defaultFor(req.param('type'), DEFAULT_TYPE);
//   search_request['size'] = util.defaultFor(req.param('size'), DEFAULT_SIZE);
//   search_request['q'] = util.defaultFor(req.param('q'), "*:*");
//   var view = util.defaultFor(req.param('view'), DEFAULT_VIEW);

//   if(search_request['size'] === 'all'){
//     client.count({
//       index : INDEX,
//       type : search_request.type
//     }).then(function(resp){
//       //Search
//       search_request.size = resp.count;
//       search(search_request, res, view);
//     }, function(err){
//       console.trace(err.message);
//       search_request.size = DEFAULT_SIZE;
//       search(search_request, res, view);
//     });
//   }  else {
//     search(search_request, res, view);
//   }
// });

app.get("/api/search", function(req, res) {
  var search_request = {};
  var query_skeleton = { query : { bool : { must : [], must_not : [], should : [] } }};
  var view = util.defaultFor(req.param('view'), DEFAULT_VIEW);

  search_request['index'] = INDEX;
  search_request['type'] = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  var must_query = util.defaultFor(req.param('must'), []);
  var must_not_query = util.defaultFor(req.param('must_not'), []);
  var should_query = util.defaultFor(req.param('should'), []);

  must_query.forEach(function(param){
    var query = {};
    util.createNestedObject(query, ['fuzzy_like_this_field', param.field, 'like_text'], param.query);
    query_skeleton.query.bool.must.push(query);
  });

  must_not_query.forEach(function(param){
    var query = {};
    util.createNestedObject(query, ['fuzzy_like_this_field', param.field, 'like_text'], param.query);
    query_skeleton.query.bool.must_not.push(query);
  });

  should_query.forEach(function(param){
    var query = {};
    util.createNestedObject(query, ['fuzzy_like_this_field', param.field, 'like_text'], param.query);
    query_skeleton.query.bool.should.push(query);
  });
  search_request['body'] = query_skeleton;

  client.count(search_request).then(function(resp){
    try {
      search_request['size'] = resp.count;
      search(search_request, res, view)
    } catch(err){
      console.trace(err.message);
      res.send();
    }
  }, function(err){
    console.trace(err.message);
    res.send();
  });
});

/* Returns the number or results a query will return
*
*
*/
app.get("/api/count", function(req, res){
  var search_request = {};
  var query_skeleton = { query : { bool : { must : [], must_not : [], should : [] } }};

  search_request['index'] = INDEX;
  search_request['type'] = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  var must_query = util.defaultFor(req.param('must'), []);
  var must_not_query = util.defaultFor(req.param('must_not'), []);
  var should_query = util.defaultFor(req.param('should'), []);

  must_query.forEach(function(param){
    var query = {};
    util.createNestedObject(query, ['fuzzy_like_this_field', param.field, 'like_text'], param.query);
    query_skeleton.query.bool.must.push(query);
  });

  must_not_query.forEach(function(param){
    var query = {};
    util.createNestedObject(query, ['fuzzy_like_this_field', param.field, 'like_text'], param.query);
    query_skeleton.query.bool.must_not.push(query);
  });

  should_query.forEach(function(param){
    var query = {};
    util.createNestedObject(query, ['fuzzy_like_this_field', param.field, 'like_text'], param.query);
    query_skeleton.query.bool.should.push(query);
  });
  search_request['body'] = query_skeleton;
  
  client.count(search_request).then(function(resp){
    try {
      res.send(resp);
    } catch(err){
      console.log(err.message);
      res.send("Couldn't get count");
    }
  }, function(err){
    console.trace(err.message);
    res.send("Couldn't get count");
  });
});


/*Return the fields each item in a mapping has
* takes params:
* type
*
*/
app.get("/api/mapping_info", function(req, res){
  type = util.defaultFor(req.param('type'), DEFAULT_TYPE);
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
  type = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  res.send(VIEWS[type]);
});

/* Queries database and return the info it has about a file
* takes params:
* type
* hashids
*/

/* Renders a detail page where more details of a file can be shown
* takes params:
* type
*/
app.get('/file_details', function(req, res){
  var type = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  var hashids = util.defaultFor(req.param('hashids'), []);

  switch(type){
    case 'message_rfc822':
      res.render('email_details.html');
      break;
    default:
      res.render('index.html', {title : hashids});
      break; 
  }
})

app.get("/api/get_file_details", function(req, res){
  var type = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  var hashids = util.defaultFor(req.param('hashids'), []);
  var tableName = '63c5e0bd853105c84a2184539eb245'; //temp for demonstration

  //Escape the values for safety
  hashids.forEach(function(hashid, index){
    hashids[index] = db.escape(hashid);
  });

  var query = "SELECT * FROM ?? WHERE hashid IN (" + hashids.toString() + ")";

  db.query(query,[tableName], function(err, results){
      if(err){
          console.log("Can't execute query: " + err.stack());
          return;
      }
      res.send(results);
  });
});

//Search and return the result
var search = function(search_request, res, view){
    client.search(search_request).then(function(resp){
    switch(search_request.type){
        case 'files':
                try {
                    res.send(files.groupByUser(resp.hits.hits));
                }catch(err){
                    res.send();
                }
            break;
        case 'message_rfc822':
            if(view == 'chord'){
                try {
                    res.send(message_rfc822.createEmailChordDiagram(resp.hits.hits));
                }catch(err){
                    res.send();
                }
            } else if (view == 'graph') { 
                try {
                    res.send(message_rfc822.createEmailGraph(resp.hits.hits));
                }catch(err){
                    res.send();
                }
            }
            break;
        default: // default is files
            res.send(files.groupByUser(resp.hits.hits));
            break;
    }
  }, function(err){
    res.send();
    console.trace(err.message);
  });
};

//Start the server
var server = app.listen(8888, function(){
  console.log('Listening on port %d', server.address().port);
});

// process.on('SIGINT', function() {
//     console.log("Shutting down");
//     db.destroy();
//     server.close();
// });

//Gracefully shutdown the server
process.on('SIGTERM', function () {
  console.log("Shutting down");
  db.destroy();
  server.close();
});
