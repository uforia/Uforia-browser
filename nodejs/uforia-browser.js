// Config
ELASTIC_SEARCH_HOST = "localhost";
ELASTIC_SEARCH_PORT = "9200";
DATABASE_HOST = "localhost";
DATABASE_USER = "";
DATABASE_PASSWORD = "";
DATABASE_NAME = "";
SERVER_PORT = "8888";

// Set up express
var express = require("express");
var app = express();

//Set up elasticsearch
var elasticsearch = require('elasticsearch');
var client = new elasticsearch.Client({
  host: ELASTIC_SEARCH_HOST + ":" + ELASTIC_SEARCH_PORT
  // log: 'trace'
});

//Mimetype classes requirements
var util = require('./mimetype_modules/util');
var files = require('./mimetype_modules/files');
var message_rfc822 = require('./mimetype_modules/message_rfc822');

//Connect to the Database
var mysql = require('mysql');
var pool = mysql.createPool({
    host : DATABASE_HOST,
    user : DATABASE_USER,
    password : DATABASE_PASSWORD,
    database : DATABASE_NAME
});


//'Constants'
var INDEX = 'uforia';
var DEFAULT_TYPE = 'files';
var DEFAULT_VIEW = 'bubble';
var DEFAULT_SIZE = 10;
var TYPES = {
    message_rfc822: 'Email (message_rfc822)',
    files: 'Files'
};
var VIEWS = {
    files : {bubble : 'Bubble'},
    message_rfc822 : {chord : 'Chord diagram', graph :'Graph', bar_chart : 'Bar Chart'}
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

/* Renders a detail page where more details of a file can be shown
* takes params:
* type
* hashid
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

/* Query elasticsearch
* takes params:
* type
* parameters
*   must(objects with field and a query)
*   must_not(objects with field and a query)
* filters 
*   must(objects with a field, stard_date and end_date)
*   must_not(objects with a field, stard_date and end_date) 
* view
* 
*/
app.get("/api/search", function(req, res) {
  var search_request = {};
  // var query_skeleton = { query : { bool : { must : [], must_not : [], should : [] } }};
  var query_skeleton = { "query": { "filtered": { "query": { "bool": { "must": [], "must_not": [] } }, "filter": { "bool": { "must": [], "must_not": [] } } } } };
  var view = util.defaultFor(req.param('view'), DEFAULT_VIEW);

  search_request['index'] = INDEX;
  search_request['type'] = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  var parameters = util.defaultFor(req.param('parameters'), {});
  var filters = util.defaultFor(req.param('filters'), {});

  if(parameters.must){
    parameters.must.forEach(function(param){
      var query = {};
      util.createNestedObject(query, ['wildcard', param.field], param.query);
      query_skeleton.query.filtered.query.bool.must.push(query);
    });
  }

  if(parameters.must_not){
    parameters.must_not.forEach(function(param){
      var query = {};
      util.createNestedObject(query, ['wildcard', param.field], param.query);
      query_skeleton.query.filtered.query.bool.must_not.push(query);
    }); 
  }

  if(filters.must){
    filters.must.forEach(function(filter){
      var query = {};
      var startDate = new Date(+filter.start_date);
      var endDate = new Date(+filter.end_date);
      util.createNestedObject(query, ['range', filter.field, 'gte'], startDate.toISOString());
      query.range[filter.field].lte = endDate.toISOString();
      query_skeleton.query.filtered.filter.bool.must.push(query);
    }); 
  }

  if(filters.must_not){
    filters.must_not.forEach(function(filter){
      var query = {};
      var startDate = new Date(+filter.start_date);
      var endDate = new Date(+filter.end_date);
      util.createNestedObject(query, ['range', filter.field, 'gte'], startDate.toISOString());
      query.range[filter.field].lte = endDate.toISOString();
      query_skeleton.query.filtered.filter.bool.must_not.push(query);
    }); 
  }

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
* takes params:
* q
* type
* parameters
*   must(objects with field and a query)
*   must_not(objects with field and a query)
* filters 
*   must(objects with a field, stard_date and end_date)
*   must_not(objects with a field, stard_date and end_date) 
* view
* 
*/
app.get("/api/count", function(req, res){
  var search_request = {};
  var query_skeleton = { "query": { "filtered": { "query": { "bool": { "must": [], "must_not": [] } }, "filter": { "bool": { "must": [], "must_not": [] } } } } };

  search_request['index'] = INDEX;
  search_request['type'] = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  var parameters = util.defaultFor(req.param('parameters'), {});
  var filters = util.defaultFor(req.param('filters'), {});

  if(parameters.must){
    parameters.must.forEach(function(param){
      var query = {};
      util.createNestedObject(query, ['wildcard', param.field], param.query);
      query_skeleton.query.filtered.query.bool.must.push(query);
    });
  }

  if(parameters.must_not){
    parameters.must_not.forEach(function(param){
      var query = {};
      util.createNestedObject(query, ['wildcard', param.field], param.query);
      query_skeleton.query.filtered.query.bool.must_not.push(query);
    }); 
  }

  if(filters.must){
    filters.must.forEach(function(filter){
      var query = {};
      var startDate = new Date(+filter.start_date);
      var endDate = new Date(+filter.end_date);
      util.createNestedObject(query, ['range', filter.field, 'gte'], startDate.toISOString());
      query.range[filter.field].lte = endDate.toISOString();
      query_skeleton.query.filtered.filter.bool.must.push(query);
    }); 
  }

  if(filters.must_not){
    filters.must_not.forEach(function(filter){
      var query = {};
      var startDate = new Date(+filter.start_date);
      var endDate = new Date(+filter.end_date);
      util.createNestedObject(query, ['range', filter.field, 'gte'], startDate.toISOString());
      query.range[filter.field].lte = endDate.toISOString();
      query_skeleton.query.filtered.filter.bool.must_not.push(query);
    }); 
  }

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

/*Returns the availabe types and their pretty names
* takes params:
* none
*/
app.get("/api/get_types", function(req, res){
  res.send(TYPES);
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
      res.send(resp[INDEX].mappings[type].properties); 
    } catch(err){
      res.send();
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
* tablenames
* hashids
*/
app.get("/api/get_file_details", function(req, res){
  var type = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  var hashids = util.defaultFor(req.param('hashids'), []);
  var tableName = '63c5e0bd853105c84a2184539eb245'; //temp for demonstration

  //Remove duplicates from the hashids
  hashids = hashids.filter (function (v, i, a) { return a.indexOf (v) == i });

  //Escape the values for safety
  hashids.forEach(function(hashid, index){
    hashids[index] = pool.escape(hashid);
  });

  pool.getConnection(function(err, connection){
    if(err){
      console.log("Coulnd't establish db connection: " + err.stack());
      res.send();
      return;
    } else {
      //Create the query and execute it
      var query = "SELECT * FROM ?? WHERE hashid IN (" + hashids.toString() + ")";
      connection.query(query, [tableName], function(err, results){
        if(err){
          console.log("Can't execute query: " + err.stack());
          res.send();
        } else {
          res.send(results);
        }
        connection.release(); //back to the conn pool
      });
    }
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
            } else if(view == 'bar_chart'){
                try {
                    res.send(message_rfc822.createBarChart(resp.hits.hits));
                } catch(err){
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
var server = app.listen(SERVER_PORT, function(){
  console.log('Listening on port %d', server.address().port);
});

//Gracefully shutdown the server
process.on('SIGTERM', function () {
  console.log("Shutting down");
  pool.destroy();
  server.close();
});
