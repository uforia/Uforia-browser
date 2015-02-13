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
    email: {name : 'email', mappings : ["email"]},
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
  console.log(req.body);
  var search_request = {};
  var query_skeleton = { "query": { "filtered": { "query": { "bool": { "must": [], "must_not": [] } }, "filter": { "bool": { "must": [], "must_not": [] } } } } };
  var view = util.defaultFor(data.view, DEFAULT_VIEW);
  var visualizationParams = util.defaultFor(data.visualization, DEFAULT_VISUALIZATION);

  search_request['index'] = INDEX;
  search_request['type'] = data.type;

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
console.log(search_request);
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
  search_request['type'] = data.type;
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
    console.trace(err);
    res.send({error: err});
  });
});

/*Returns the availabe types and their pretty names
* url: /api/get_types
* takes params:
* none
*/
router.post("/get_types", function(req, res){
  c.elasticsearch.indices.getMapping({
    index: INDEX
  }).then(function(resp){
    var mappings = [];
    for(var mapping in resp[INDEX].mappings){
      var last = mapping.split('_');
      last = last[last.length-1];

      var exclude = ['fields', 'visualizations'];

      if(exclude.indexOf(last) == -1)
        mappings.push(mapping);
    }

    res.send(mappings);
  });
});

/*Return the fields each item in a mapping has
* url: /api/mapping_info
* takes params:
* type
*
*/
router.post("/mapping_info", function(req, res){
  var type = req.body.type;
  console.log(type);

  c.elasticsearch.indices.getMapping({ 
    index : INDEX
  }).then(function(resp){
    console.log(resp);
    try{
      res.send(resp[INDEX].mappings[type].properties); 
    } catch(err){
      console.trace(err);
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
  var type = req.body.type;
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
* url: /api/get_modules
* takes params:
* 
*/
router.post("/get_modules", function(req, res){
  c.mysql_db.query('SELECT * FROM supported_mimetypes', function(err, results){
    if(err) throw err;    

    var modules = {};
    var mime_types = {};

    async.each(results, function(result, callback){
      modules[result.mime_type] = {
        table: undefined,
        fields: []
      };

      result.modules = JSON.parse(result.modules);

      // for(var key in result.modules)
      // modules[mime.extension(result.mime_type)].meme_types = result.modules;

      var tables = [];
      for(var mime_type in result.modules){
        if(result.modules[mime_type].length > 0)
          tables.push(result.modules[mime_type]);
      }

      async.each(tables, function(table, callback){
        c.mysql_db.query('SHOW COLUMNS FROM ??', [table], function(err, fields){
          if(err) throw err;

          fields.forEach(function(field){
            modules[result.mime_type].fields.push(field.Field);
          });

          modules[result.mime_type].table = table;

          callback();
        });
      }, function(err){
        if(err) throw err;
        callback();
      });
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

/* Return the indexed mapping
* url: /api/get_mapping
* takes params:
* type - string
*/
router.post("/get_mapping", function(req, res){
  c.elasticsearch.search({
    index: INDEX,
    type: req.body.type + '_fields',
    body: { query: { match_all: {} } },
    size: 999 // all
  }).then(function(resp){
    // if(resp[INDEX].mappings[req.body.type])
    //   res.send({fields: Object.keys(resp[INDEX].mappings[req.body.type].properties)});
    // else
    //   res.send({});
    res.send(resp.hits.hits);
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
  var mapping = req.body;
  var num = 4;
  var queues = [];
  var completed = 0;
  var tableIndex = 0;
  var tableOffset = -1;
  var start = new Date();
  var maxItems = 10000;
  var mysqlIterateVar = start.getTime();
  var meta = {
    tables: Object.keys(mapping.tables)
  };

  if(!mapping.name){
    return res.send({error: 'Please define a mapping name.'});
  }

  async.series([deleteOldMapping, setupWorkers, getMetaData, setFieldInfo], function(err){
    if(err) throw err;

    res.send({error: false, message: "Elasticsearch is now filling " + meta.totalRows + " rows into the mapping with index '" + mapping.name + "'."})

    emitInterval = setInterval(emitProgress, 1000);

    console.log(c.io);

    c.io.on('pauseFilling', function(data){
      console.log(data);
    });

  });

  function deleteOldMapping(callback){
    c.elasticsearch.indices.deleteMapping({
      index: INDEX,
      type: [mapping.name, mapping.name + '_fields'],
      ignore: [404] // Ignore not found error
    }, function (error, response) {
      if(error)
        throw error;
  
      callback();
    });
  }

  function setupWorkers(callback){
    //Create worker queues to fill elasticsearch
    for(var i=0; i<num; i++){
      queues.push(async.queue(function (data, callback) {
        var queue = data.queue;
        delete data.queue;

        c.elasticsearch.create({
          index: INDEX,
          type: mapping.name,
          body: data
        }, function (error, response) {
          if(error) throw error;
          // ...
          completed++;
          // Check if queue length is below 10, if so get new results from the database
          if(queues[queue] && queues[queue].length() < maxItems){
            fillQueue(queue, function(queue, results){
              console.log('filled queue ' + queue + ' with ' + results + ' results.');
              callback();
            });
          }
          else {
            callback();
          }

        });
      }, 1));

      // Fill initial rows into queue
      fillQueue(i, function(queue, results){
        console.log('filled queue ' + queue + ' with ' + results + ' results.');
      });
    }

    callback();
  }

  function getMetaData(callback){
    var query = 'SELECT ';
    var data = Object.keys(mapping.tables);

    for(var i=0; i < data.length; i++){
      query += '(SELECT COUNT(*) FROM ??)';
      if(i<data.length-1)
        query += ' + ';
    }
    query+=' AS count;';

    c.mysql_db.query(query, data, function(err, result){
      if(err) throw err;

      meta.totalRows = result[0].count;
      callback();
    });
  }

  function setFieldInfo(callback){
    for(var field in mapping.fields){
        c.elasticsearch.create({
        index: INDEX,
        type: mapping.name + '_fields',
        body: {field: field, types: mapping.fields[field].join(',')}
      }, function (error, response) {
        if(error) throw error;
      });
    }

    callback();
  }

  function fillQueue(queue, callback){
    tableOffset++;
    if(meta.tables[tableIndex]){
      console.log('results from ' + meta.tables[tableIndex]);
      c.mysql_db.query('SELECT ? AS _table, ? AS queue, ?? FROM ?? LIMIT ? OFFSET ? ', [meta.tables[tableIndex], queue, mapping.tables[meta.tables[tableIndex]], meta.tables[tableIndex], maxItems, maxItems*tableOffset], function(err, result){
        if(err) throw err;
        // Divide results over queues
        if(result && result.length > 0){
          queues[queue].push(result);
        }
        else {
          tableIndex++;
          tableOffset = -1;
        }
        callback(queue, result.length || 0);
      });
    }
    else{
      callback(queue, 0);
    }
  }

  function emitProgress(){
    var progress = completed/meta.totalRows; //Math.round((completed/meta.totalRows)*100)/100;

    for(var i=0; i<num; i++){
      console.log('Queue ' + i + ': ' + queues[i].length());
    }

    c.io.emit('uforia', {mapping: mapping.name, progress: progress, completed: completed, total: meta.totalRows, started: start});

    var queuesFinished = 0;
    for(var i=0; i<num; i++){
      if(queues[i].idle())
        queuesFinished++;
    }
    if(queuesFinished == num){
      var now = new Date();
      console.log('Filling took ' + (now-start)/1000 + ' seconds.');
      clearTimeout(emitInterval);
    }
  }
});

/*
* Delete's a mapping from elasticsearch
* url: /api/delete_mapping
* takes params:
* type - string
*/
router.post('/delete_mapping', function(req, res){
  c.elasticsearch.indices.deleteMapping({
    index: INDEX,
    type: [req.body.type, req.body.type + '_fields']
  }, function (error, response) {
    res.send({error: error, response: response});
  });
});


module.exports = router;
