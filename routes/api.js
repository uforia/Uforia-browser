var express   = require('express'),
    c         = require('../lib/common'),
    workers   = require('../lib/workers'),
    router    = express.Router(),
    util      = require('../lib/mimetype_modules/util'),
    fs        = require('fs'), 
    mime      = require('mime'),
    async     = require('async');

//** FOR TESTING
var testdata = require('./testdata/documents');

// ***** move this *****
var TYPES = {
    email: {name : 'Email', mappings : ["message_rfc822"]},
    documents: { name : 'Documents', mappings : ["documents"]}, 
    files: { name : 'Files', mappings : ["files"]}
};
var VIEWS = {
    files : {bubble : 'Bubble'},
    documents : {bar_chart : 'Bar Chart'},
    email : {chord : 'Chord diagram', graph :'Graph', bar_chart : 'Bar Chart'}
};
var INDEX = 'uforia';
var DEFAULT_TYPE = 'files';
var DEFAULT_VIEW = 'bubble';
var DEFAULT_VISUALIZATION = 'bar_chart';
//**********************

router.post('/get_types', function(req, res) {
  res.send(TYPES);
});

/* Query elasticsearch
* url: /api/search
* takes params:
* type
* parameters
*   must(objects with field and a query)
*   must_not(objects with field and a query)
* filters 
*   must(objects with a field, stard_date and end_date)
*   must_not(objects with a field, stard_date and end_date) 
* view
* visualization
* 
*/
router.post("/search", function(req, res) {
  var data = req.body;
  var search_request = {};
  var query_skeleton = { "query": { "filtered": { "query": { "bool": { "must": [], "must_not": [] } }, "filter": { "bool": { "must": [], "must_not": [] } } } } };
  var view = util.defaultFor(data.view, DEFAULT_VIEW);
  var visualizationParams = util.defaultFor(data.visualization, DEFAULT_VISUALIZATION);

  search_request['index'] = INDEX;
  search_request['type'] = TYPES[util.defaultFor(data.type, DEFAULT_TYPE)].mappings.toString();

  var parameters = util.defaultFor(data.parameters, {});
  var filters = util.defaultFor(data.filters, {});

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

  c.elasticsearch.count(search_request).then(function(resp){
    try {
      search_request['size'] = resp.count;
      search(search_request, res, view, visualizationParams);
    } catch(err){
      console.trace(err.message);
      res.send();
    }
  }, function(err){
    console.trace(err.message);
    res.send(err);
  });
});

//Search and return the result
var search = function(search_request, res, view, parameters){
    c.elasticsearch.search(search_request).then(function(resp){
    switch(search_request.type){
      case TYPES.files.mappings.toString():
        try {
          workers.files.createFilesBubble(resp.hits.hits, function(data){
            res.send(data);
          });
        }catch(err){
          res.send();
        }
      break;
      case TYPES.email.mappings.toString():
          if(view == 'chord'){
              try {
                workers.email.createEmailChordDiagram(resp.hits.hits, function(data){
                  res.send(data);
                });
              }catch(err){
                  res.send(err.message);
              }
          } else if (view == 'graph') {
              try {
                workers.email.createEmailGraph(resp.hits.hits, function(data){
                  res.send(data);
                });
              }catch(err){
                  res.send();
              }
          } else if(view == 'bar_chart'){
              try {
                workers.email.createBarChart(resp.hits.hits, function(data){
                  res.send(data);
                });
              } catch(err){
                  res.send();
              }
          }
          break;
      case TYPES.documents.mappings.toString():
        if(view == 'bar_chart'){
          try{
            //TEST DATA REMOVE THIS
            var resp = testdata;

            workers.barChart.barChart(resp.hits.hits, parameters, function(data){
              res.send(data);
            });
          } catch(err){
            console.log(err.message);
            res.send();
          }
        }
        break;
      default: // default is files
        workers.files.createFilesBubble(resp.hits.hits, function(data){
          res.send(data);
        });
      break;
    }
  }, function(err){
    res.send();
    console.trace(err.message);
  });
};

/* Returns the number or results a query will return
* url: /api/count
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
router.post("/count", function(req, res){
  var data = req.body;
  var search_request = {};
  var query_skeleton = { "query": { "filtered": { "query": { "bool": { "must": [], "must_not": [] } }, "filter": { "bool": { "must": [], "must_not": [] } } } } };

  search_request['index'] = INDEX;
  search_request['type'] = TYPES[util.defaultFor(data.type, DEFAULT_TYPE)].mappings.toString();
  var parameters = util.defaultFor(data.parameters, {});
  var filters = util.defaultFor(data.filters, {});

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

  c.elasticsearch.count(search_request).then(function(resp){
    try {
      res.send(resp);
    } catch(err){
      console.log(err.message);
      res.send({count : "Invalid query" });
    }
  }, function(err){
    console.trace(err.message);
    res.send({error: err});
  });
});

/*Returns the availabe types and their pretty names
* url: /api/get_types
* takes params:
* none
*/
router.post("/get_types", function(req, res){
  res.send(TYPES);
});

/*Return the fields each item in a mapping has
* url: /api/mapping_info
* takes params:
* type
*
*/
router.post("/mapping_info", function(req, res){
  var type = TYPES[req.body.type].mappings.toString();

  c.elasticsearch.indices.getMapping({ 
    index : INDEX,
    type : type,
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
* url: /api/view_info
* takes params:
* type
*
*/
router.post("/view_info", function(req, res){
  type = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  res.send(VIEWS[type]);
});

/* Queries database and return the full path of a file
* url: /api/get_file_details
* takes params:
* type
* tablenames
* hashids
*/
router.post("/get_file_details", function(req, res){
  var type = TYPES[util.defaultFor(req.body.type, DEFAULT_TYPE)].mappings.toString();
  var hashids = util.defaultFor(req.body.hashids, []);
  var filesTable = 'files';
  var tableName = '63c5e0bd853105c84a2184539eb245'; //temp for demonstration

  //Remove duplicates from the hashids
  hashids = hashids.filter (function (v, i, a) { return a.indexOf (v) == i });

  //Escape the values for safety
  hashids.forEach(function(hashid, index){
    hashids[index] = c.mysql_db.escape(hashid);
  });

  c.mysql_db.getConnection(function(err, connection){
    if(err){
      console.log("Couldn't establish db connection: " + err.stack());
      res.send();
      return;
    } else {
      //Create the query and execute it
      var query = "SELECT ??.*, ??.fullpath FROM ?? LEFT JOIN ?? ON ??.hashid = ??.hashid WHERE ??.hashid IN (" + hashids.toString() + ")";
      connection.query(query, [tableName, filesTable, tableName, filesTable, tableName, filesTable, tableName], function(err, results){
        if(err){
          console.log("Error executing query: " + err.stack());
          res.send();
        } else {
          res.send(results);
        }
        connection.release(); //back to the conn pool
      });
    }
  });
});

/* Return the indexed mappings for a type
* url: /api/get_mappings
* takes params:
* 
*/
router.post("/get_mappings", function(req, res){
  c.mysql_db.query('SELECT * FROM supported_mimetypes', function(err, results){
    if(err) throw err;    

    var modules = {};
    var mime_types = {};

    async.each(results, function(result, callback){
      if(mime.extension(result.mime_type)){
        modules[mime.extension(result.mime_type)] = modules[mime.extension(result.mime_type)] || {
          meme_types: [],
          fields: []
        };

        result.modules = JSON.parse(result.modules);

        // for(var key in result.modules)
        modules[mime.extension(result.mime_type)].meme_types = result.modules;

        var tables = [];
        for(var mime_type in result.modules)
          tables.push(result.modules[mime_type]);

        async.each(tables, function(table, callback){
          c.mysql_db.query('SHOW COLUMNS FROM ??', [table], function(err, fields){
            if(err) throw err;

            fields.forEach(function(field){
              modules[mime.extension(result.mime_type)].fields.push(field.Field);
            });

            callback();
          });
        }, function(err){
          if(err) throw err;
          callback();
        });

      } else {
        console.log('Cannot find extension for mime type: ' + result.mime_type);
        callback();
      }
    }, function(err){
      if(err) throw err;
      res.send(modules);
    });
        

      // if(mime.extension(result.mime_type)){
      //   modules.push({
      //     name: mime.extension(result.mime_type),
      //     tables: table_names
      //   })
      // }

      // mime_types[mime.extension(result.mime_type)] = mime_types[mime.extension(result.mime_type)] || [];
      // mime_types[mime.extension(result.mime_type)] = result.modules;
  });
});

/*
* Writes a costom mapping format to a file and starts the mapping script
* url: /api/create_mapping
* takes params:
* name
* modules - object
* fields - array
*/
router.post("/create_mapping", function(req, res){
  var name = util.defaultFor(req.param('name'), "");
  var modules = util.defaultFor(req.param('modules'), {});
  var fields = util.defaultFor(req.param('fields'), []);

  if(name == "" || modules == {} || fields == []){
    res.send("Unsuccessful");
    return;
  }

  //Create or truncate the file
  fs.openSync(MAPPINGS_OUTPUT_FILE, 'w');
  fs.chmodSync(MAPPINGS_OUTPUT_FILE, 0666);

  //Write it
  var stream = fs.createWriteStream(MAPPINGS_OUTPUT_FILE);
  stream.once('open', function(fd) {
    stream.write('[' + name + ']\n');
    stream.write('modules = '+ JSON.stringify(modules) + '\n');
    stream.write('fields = '+ JSON.stringify(fields) + '\n');
    stream.end();

    python.run(MAPPINGS_SCRIPT, MAPPING_SCRIPT_OPTIONS, function(err, results){
      if(err) {
        console.log("Can't start mapping script: " + err.stack);
        res.send("Written mapping file but couldn't start mapping script");
        return;
      }
      // console.log(results);
      res.send("Elasticsearch is now filling the mapping in the background.");
    });
  });
});

module.exports = router;
