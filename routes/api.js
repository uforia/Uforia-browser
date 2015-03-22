var express   = require('express'),
    c         = require('../lib/common'),
    router    = express.Router(),
    fs        = require('fs'), 
    mime      = require('mime'),
    async     = require('async'),
    _         = require('lodash');

var INDEX = c.config.elasticsearch.index;

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
  var view = data.view || DEFAULT_VIEW;
  var visualizationParams = data.visualization || DEFAULT_VISUALIZATION;

  var query_skeleton = {
    "query": {
      "query_string": {
        "query": data.query
      }
    }
  };

  search_request['index'] = INDEX;
  search_request['type'] = data.type;
  search_request['body'] = query_skeleton;
// console.log(search_request);
  c.elasticsearch.count(search_request).then(function(resp){
    try {
      search_request['size'] = resp.count;
      search(search_request, res, data.type, view, visualizationParams);
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
var search = function(search_request, res, type, view, parameters){
    c.elasticsearch.search(search_request).then(function(resp){
      var vis = require('../lib/visualizations/' + view.toLowerCase());

      c.elasticsearch.search({
        index: INDEX,
        type: type + '_visualizations',
        body: { query: { match: {type: view} } }
      }).then(function(vismapping){
        // if(resp[INDEX].mappings[req.body.type])
        //   res.send({fields: Object.keys(resp[INDEX].mappings[req.body.type].properties)});
        // else
        //   res.send({});

        // console.log(vismapping);

        vismapping = vismapping.hits.hits[0]._source;

        parameters.field1 = vismapping.field1;
        parameters.field2 = vismapping.field2;
        

        vis.generateJSON(resp.hits.hits, parameters, function(data){
          res.send(data);
        });
      });
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

  search_request['index'] = INDEX;
  search_request['type'] = data.type;

  var query_skeleton = {
    "query": {
      "query_string": {
        "query": data.query
      }
    }
  };

  // console.log(JSON.stringify(query_skeleton));
  // console.dir(query_skeleton, {depth: 999});

  search_request['body'] = query_skeleton;

  c.elasticsearch.count(search_request).then(function(resp){
    try {
      res.send(resp);
    } catch(err){
      console.error(err.message);
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
    var visualization_types = [];
    if(resp[INDEX]){
      async.each(Object.keys(resp[INDEX].mappings), function(mapping, cb){
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

        var mapping = exclude.indexOf(last) != -1 ? mapping.slice(0, mapping.indexOf('_' + last)) : mapping;

        if(visualization_types.indexOf(mapping + '_visualizations') == -1){
          visualization_types.push(mapping + '_visualizations');
        }
        cb();
      }, function(err){

        res.send(mappings);
      });

    }
    else {
      res.send({error: true, message: "Elasticsearch INDEX not available. Please check your config file or create the index " + (INDEX) + "."});
    }
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
  // console.log(type);

  c.elasticsearch.indices.getMapping({ 
    index : INDEX,
    type: type
  }).then(function(resp){
    // console.log(resp);
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
    console.error(err.message);
  });
});

/* Return the available view for a type
* url: /api/view_info
* takes params:
* type
*
*/
router.post("/view_info", function(req, res){
  type = req.param('type') || DEFAULT_TYPE;

  c.elasticsearch.search({
    index: INDEX,
    type: type + '_visualizations',
    body: { query: { match_all: {} } },
    size: 999 // all
  }).then(function(resp){
    // console.log(resp.hits.hits);

    var types = {};

    resp.hits.hits.forEach(function(type){
      types[type._source.type] = type._source;
    });

    res.send(types);
  });
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

    results.push({mime_type: 'files', modules: '{"files":"files"}'});

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
          // ©'filled queue ' + queue + ' with ' + results + ' results.');
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

    io.on('connection', function(socket){
      socket.on('pauseFilling', function(data){
        if(queues[0].paused){
          for(var i=0; i<num; i++)
            queues[i].resume();
        }
        else{
          for(var i=0; i<num; i++)
            queues[i].pause();
        }
      });
    });

  });

  function deleteOldMapping(callback){
    c.elasticsearch.indices.deleteMapping({
      index: INDEX,
      type: [mapping.name, mapping.name + '_fields', req.body.type + '_visualizations'],
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
        var type = data._type;
        delete data.queue;
        delete data._type;

        c.elasticsearch.create({
          index: INDEX,
          type: type,
          body: data
        }, function (error, response) {
          if(error){ 
            console.log(data, response);
            throw error;
          }

          // ...
          completed++;
          // Check if queue length is below maxItems, if so get new results from the database
          if(queues[queue].length() < maxItems && !fillingQueue[queue]){
            fillingQueue[queue] = true;
            // console.log('push queue ' + queue);
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

    c.mysql_db.query(queries.join(';') + '; SELECT null AS empty', Object.keys(mapping.tables), function(err, results){
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
    // console.log('results from ' + table);
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
            item._type = mapping.name;
            queues[queue].push(item);
          });
        }
        callback(queue, results.length || 0);
      });
    }
  }

  function emitProgress(){
    var progress = completed/meta.totalRows; //Math.round((completed/meta.totalRows)*100)/100;

    // for(var i=0; i<num; i++){
    //   console.log('Queue ' + i + ': ' + queues[i].length());
    // }
    // console.log('Progress: ' + completed + '/' + meta.totalRows + ' (' + (completed/meta.totalRows)*100 + ' %)');

    io.emit('uforia', {mapping: mapping.name, progress: progress, completed: completed, total: meta.totalRows, started: start});

    // var queuesFinished = 0;
    // for(var i=0; i<num; i++){
    //   if(queues[i].idle())
    //     queuesFinished++;
    // }
  }

  function finishFilling() {
    var now = new Date();
    console.log(completed + ' out of ' + meta.totalRows);
    console.log('Filling took ' + (now-start)/1000 + ' seconds.');
    emitProgress();
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
    type: [req.body.type, req.body.type + '_fields', req.body.type + '_visualizations']
  }, function (error, response) {
    res.send({error: error, response: response});
  });
});

/*
* Save visualizations for a mapping
* url: /api/visualizations/save
* takes body params:
* type - string
* visualizations - object containing visualizations
*/
router.post('/visualizations/save', function(req, res){
  var type = req.body.type;
  var visualizations = req.body.visualizations;

  c.elasticsearch.indices.deleteMapping({
    index: INDEX,
    type: type + '_visualizations',
    ignore: [404] // Ignore not found error
  }, function (error, response) {
    async.each(visualizations, function(vis, callback){
      c.elasticsearch.create({
        index: INDEX,
        type: type + '_visualizations',
        body: vis
      }, function (error, response) {
        if(error) throw error;
        callback();
      });
    }, function(err){
      res.send({err: err});
    });
  });

});


module.exports = router;
