var express   = require('express'),
    c         = require('../lib/common'),
    workers   = require('../lib/workers'),
    router    = express.Router(),
    util      = require('../lib/mimetype_modules/util'),
    fs        = require('fs'), 
    mime      = require('mime'),
    async     = require('async'),
    _         = require('lodash');

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
  var view = data.view || DEFAULT_VIEW;
  var visualizationParams = data.visualization || DEFAULT_VISUALIZATION;

  search_request['index'] = INDEX;
  search_request['type'] = data.type;

  var parameters = data.parameters || {};
  var filters = data.filters || {};

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
// console.log(search_request);
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
  // var query_skeleton = { "query": { "filtered": { "query": { "bool": { "must": [], "must_not": [] } }, "filter": { "bool": { "must": [], "must_not": [] } } } } };
  var query_skeleton = { "query": {} };

  search_request['index'] = INDEX;
  search_request['type'] = data.type;
  var parameters = util.defaultFor(data.parameters, {});
  var filters = util.defaultFor(data.filters, {});

  query_skeleton.query.filtered = {query: { wildcard: {} } };
  query_skeleton.query.filtered.query.wildcard[parameters.must[0].field] = parameters.must[0].query;
  delete parameters.must[0];

  query_skeleton.query.filtered.filter = { or: [], and: [] };

  // Loop through all must parameters and add them to the filters
  parameters.must.forEach(function(param){
    if(param.andOr == 'and'){
      q = { query: {bool: { must: { wildcard: {  } } } } };
      q.query.bool.must.wildcard[param.field] = param.query;
      query_skeleton.query.filtered.filter.and.push(q);
    }
    else {
      q = { query: {bool: { must: { wildcard: {  } } } } };
      q.query.bool.must.wildcard[param.field] = param.query;
      query_skeleton.query.filtered.filter.or.push(q);
    }
  });

  // Loop through all must_not parameters and add them to the filters
  parameters.must_not.forEach(function(param){
    if(param.andOr == 'and'){
      q = { query: {bool: { must_not: { wildcard: {  } } } } };
      q.query.bool.must_not.wildcard[param.field] = param.query;
      query_skeleton.query.filtered.filter.and.push(q);
    }
    else {
      q = { query: {bool: { must_not: { wildcard: {  } } } } };
      q.query.bool.must_not.wildcard[param.field] = param.query;
      query_skeleton.query.filtered.filter.or.push(q);
    }
  });

  // if there are no AND operators, delete the empty array (otherwhise bad request)
  if(query_skeleton.query.filtered.filter.and.length == 0)
    delete query_skeleton.query.filtered.filter.and;
  
  // if there are no OR operators, delete the empty array (otherwhise bad request)
  if(query_skeleton.query.filtered.filter.or.length == 0)
    delete query_skeleton.query.filtered.filter.or;

  
  console.dir(query_skeleton, {depth: 999});
  // return;

  // if(parameters.must){
  //   parameters.must.forEach(function(param){
  //     var query = {};
  //     util.createNestedObject(query, ['wildcard', param.field], param.query);
  //     query_skeleton.query.filtered.query.bool.must.push(query);
  //   });
  // }

  // if(parameters.must_not){
  //   parameters.must_not.forEach(function(param){
  //     var query = {};
  //     util.createNestedObject(query, ['wildcard', param.field], param.query);
  //     query_skeleton.query.filtered.query.bool.must_not.push(query);
  //   }); 
  // }

  // if(filters.must){
  //   filters.must.forEach(function(filter){
  //     var query = {};
  //     var startDate = new Date(+filter.start_date);
  //     var endDate = new Date(+filter.end_date);
  //     util.createNestedObject(query, ['range', filter.field, 'gte'], startDate.toISOString());
  //     query.range[filter.field].lte = endDate.toISOString();
  //     query_skeleton.query.filtered.filter.bool.must.push(query);
  //   }); 
  // }

  // if(filters.must_not){
  //   filters.must_not.forEach(function(filter){
  //     var query = {};
  //     var startDate = new Date(+filter.start_date);
  //     var endDate = new Date(+filter.end_date);
  //     util.createNestedObject(query, ['range', filter.field, 'gte'], startDate.toISOString());
  //     query.range[filter.field].lte = endDate.toISOString();
  //     query_skeleton.query.filtered.filter.bool.must_not.push(query);
  //   }); 
  // }
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
    if(resp[INDEX]){
      for(var mapping in resp[INDEX].mappings){
        var last = mapping.split('_');
        last = last[last.length-1];

        var exclude = ['fields', 'visualizations'];

        if(mappings.indexOf(mapping) == -1 && exclude.indexOf(last) == -1){
          mappings.push(mapping);
        }
        // If there are empty mappings, show the mapping in the UI anyways
        else if(exclude.indexOf(last) != -1 && mappings.indexOf(mapping.slice(0, mapping.indexOf('_' + last))) == -1){
          mappings.push(mapping.slice(0, mapping.indexOf('_' + last)));
        }
      }
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
      // If the mapping exists
      if(resp[INDEX].mappings[type]){
        var data = resp[INDEX].mappings[type].properties;
        if(data['_table']);
          delete data['_table'];

        res.send(data); 
      }
      else { // Else send empty data, could be that the mapping isn't filled yet
        res.send([]);
      }
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
  var hashids = req.body.hashids || [];
  var tables = Object.keys(req.body.tables);

  var filesTable = 'files'; // Todo: get this from config
  
  var data = [];

  async.each(tables, function(table, callback){
    var hashids = _.uniq(req.body.tables[table]);
    c.mysql_db.query('SELECT ??.*, ??.fullpath FROM ?? LEFT JOIN ?? ON ??.hashid = ??.hashid WHERE ??.hashid IN (?)', 
      [table, filesTable, table, filesTable, table, filesTable, table, hashids], function(err, results){
      if(err) throw err;

      data = data.concat(results);
      callback();
    });
  }, function(err){
    res.send(data);
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
      var mime_type = result.mime_type;

      modules[mime_type] = {
        tables: {},
        fields: []
      };

      result.modules = JSON.parse(result.modules);

      // for(var key in result.modules)
      // modules[mime.extension(result.mime_type)].meme_types = result.modules;

      for(var module in result.modules){
        if(result.modules[module].length > 0)
          modules[mime_type].tables[result.modules[module]] = [];
      }

      async.each(Object.keys(modules[mime_type].tables), function(table, callback){
        c.mysql_db.query('SHOW COLUMNS FROM ??', [table], function(err, fields){
          if(err) throw err;

          fields.forEach(function(field){
            modules[mime_type].tables[table].push(field.Field);

            if(modules[mime_type].fields.indexOf(field.Field) == -1)
              modules[mime_type].fields.push(field.Field);
          });

          // modules[mime_type].table = table;

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
  var fillingQueue = new Array(num);
  var completed = 0;
  var tableIndex = 0;
  var start = new Date();
  var maxItems = 10000;

  var meta = {
    tables: Object.keys(mapping.tables)
  };

  var loadDivider = async.queue(function(queue, callback){

    if(meta.hashids[meta.tables[tableIndex]]){

      if(meta.hashids[meta.tables[tableIndex]].length > 0){
        
        var hashids = meta.hashids[meta.tables[tableIndex]].slice(0, maxItems);
        meta.hashids[meta.tables[tableIndex]] = meta.hashids[meta.tables[tableIndex]].slice(maxItems);

        fillQueue(queue, hashids, function(queue, results){
          console.log('filled queue ' + queue + ' with ' + results + ' results.');
          fillingQueue[queue] = false;
        });
      }
      else{
        tableIndex++;
        loadDivider.push(queue);
      }
    }
    else if(loadDivider.length() == 0) {
      finishFilling();
    }

    callback();
  }, 1);

  //queue for index

  if(!mapping.name){
    return res.send({error: 'Please define a mapping name.'});
  }

  res.send({error: false, message: "Elasticsearch is now filling " + meta.totalRows + " rows into the mapping with index '" + mapping.name + "'."})

  async.series([deleteOldMapping, getMetaData, getHashIds, setupWorkers, setFieldInfo], function(err){
    if(err) throw err;

    emitInterval = setInterval(emitProgress, 1000);

    // c.io.on('pauseFilling', function(data){
    //   console.log(data);
    // });

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
          // Check if queue length is below maxItems, if so get new results from the database
          if(queues[queue].length() < maxItems && !fillingQueue[queue]){
            fillingQueue[queue] = true;
            console.log('push queue ' + queue);
            loadDivider.push(queue);
          }
          callback();

        });
      }, 1));

      loadDivider.push(i);
    }
    callback();
  }

  function getHashIds(callback){
    var queries = [];
    var tables = Object.keys(mapping.tables);

    meta.hashids = {};

    for(var table in mapping.tables){
      queries.push('SELECT hashid FROM ??');
    }

    c.mysql_db.query(queries.join(';'), Object.keys(mapping.tables), function(err, results){
      if(err) throw err;

      for(var i=0; i< tables.length; i++){
        meta.hashids[tables[i]] = [];
        results[i].forEach(function(result){
          meta.hashids[tables[i]].push(result.hashid);
        });
      }

      callback();
    });
  }

  function getMetaData(callback){
    var query = 'SELECT ';
    var tables = Object.keys(mapping.tables);

    for(var i=0; i < tables.length; i++){
      query += '(SELECT COUNT(*) FROM ??)';
      if(i<tables.length-1)
        query += ' + ';
    }
    query+=' AS count;';

    c.mysql_db.query(query, tables, function(err, result){
      if(err) throw err;

      meta.totalRows = result[0].count;
      callback();
    });
  }

  function setFieldInfo(callback){
    for(var table in mapping.tables){
        c.elasticsearch.create({
        index: INDEX,
        type: mapping.name + '_fields',
        body: {table: table, fields: mapping.tables[table].fields.join(','), mime_type: mapping.tables[table].mime_type}
      }, function (error, response) {
        if(error) throw error;
      });
    }

    callback();
  }

  function fillQueue(queue, hashids, callback){
    var table = meta.tables[tableIndex];
    console.log('results from ' + table);
    if(table){
      c.mysql_db.query('SELECT * FROM ?? WHERE hashid IN (?)', [table, hashids], function(err, results){
        if(err) throw err;
        // Divide results over queues
        if(results && results.length > 0){
          var item = {};
          results.forEach(function(result){
            // console.log(mapping.tables);
            // console.log(mapping.tables[meta.tables[tmpIndex]]);
            // console.log(mapping.tables[meta.tables[tmpIndex]].fields);
            var item = _.pick(result, mapping.tables[table].fields, null);
            item.queue = queue;
            item._table = table;
            queues[queue].push(item);
          });
        }
        callback(queue, results.length || 0);
      });
    }
  }

  function emitProgress(){
    var progress = completed/meta.totalRows; //Math.round((completed/meta.totalRows)*100)/100;

    for(var i=0; i<num; i++){
      console.log('Queue ' + i + ': ' + queues[i].length());
    }
    console.log('Progress: ' + completed + '/' + meta.totalRows + ' (' + (completed/meta.totalRows)*100 + ' %)');

    c.io.emit('uforia', {mapping: mapping.name, progress: progress, completed: completed, total: meta.totalRows, started: start});

    // var queuesFinished = 0;
    // for(var i=0; i<num; i++){
    //   if(queues[i].idle())
    //     queuesFinished++;
    // }
  }

  function finishFilling() {
    var now = new Date();
    console.log('Filling took ' + (now-start)/1000 + ' seconds.');
    clearTimeout(emitInterval);
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
