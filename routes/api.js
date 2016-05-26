var express   = require('express'),
    c         = require('../lib/common'),
    router    = express.Router(),
    fs        = require('fs'),
    mime      = require('mime'),
    async     = require('async'),
    _         = require('lodash'),
    crypto    = require('crypto'),
    md5       = require('MD5'),
    archiver  = require('archiver'),
    moment    = require('moment'),
    workerFarm = require('worker-farm'),
    config     = require('../config');

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
  var view = data.view;
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

        worker = workerFarm(config.workers, require.resolve('../lib/visualizations/' + view.toLowerCase()), ['generateJSON']);

        worker.generateJSON(resp.hits.hits, parameters, function(data){
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

    var visualizations = [];

    resp.hits.hits.forEach(function(type){
      visualizations.push(type._source);
    });

    res.send(visualizations);
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

  var labelFields = ['Subject', 'Date', 'From', 'Author', 'To'];

  async.each(tables, function(table, callback){
    var hashids = _.uniq(req.body.tables[table]);
    // console.log(table);
    c.mysql_db.query('SHOW COLUMNS FROM ??', [table], function(err, fields){
      for(var i=0; i < labelFields.length; i++){
        if(_.findIndex(fields, {'Field': labelFields[i]}) != -1){
          var test = c.mysql_db.query('SELECT COUNT(*) AS count, hashid FROM ?? WHERE hashid IN (?) GROUP BY hashid; \
          SELECT ??.?? AS label, ??.hashid, ??.fullpath FROM ?? LEFT JOIN ?? ON ??.hashid = ??.hashid WHERE ??.hashid IN (?)',
          [table, _.uniq(hashids),
          table, labelFields[i], filesTable, filesTable, table, filesTable, table, filesTable, table, _.uniq(hashids)], function(err, results){
            if(err) throw err;

            var oneToMany = false;
            _.each(results[0], function(record){
              if(record.count > 1){
                oneToMany = true;
                return false;
              }
            });

            if(oneToMany){
              data.push({hashid: results[1][0].hashid, label: 'Multiple records from one file', fullpath: results[1][0].fullpath});
            } else {
              data = data.concat(results[1]);
            }

            callback();
          });
          break;
        }
        if(i == labelFields-1){
          c.mysql_db.query('SELECT COUNT(*) AS count, hashid FROM ?? WHERE hashid IN (?) GROUP BY hashid; \
          SELECT ??.name AS label, ??.hashid, ??.fullpath FROM ?? LEFT JOIN ?? ON ??.hashid = ??.hashid WHERE ??.hashid IN (?)',
          [table, _.uniq(hashids),
          filesTable, 'name', filesTable, filesTable, table, filesTable, table, filesTable, table, _.uniq(hashids)], function(err, results){
            if(err) throw err;

            var oneToMany = false;
            _.each(results[0], function(record){
              if(record.count > 1){
                oneToMany = true;
                return false;
              }
            });

            if(oneToMany){
              data.push({hashid: results[1][0].hashid, label: 'Multiple records from one file', fullpath: results[1][0].fullpath});
            } else {
              data = data.concat(results[1]);
            }

            callback();
          });
          break;
        }
      }
    });
  }, function(err){
    res.send(data);
  });
});

/* Return the content from a evidence file
* url: /api/file/:hashid
* takes params:
* hashid: hashid of the file
*/
router.get('/file/:hashid', function(req, res){
  c.mysql_db.query('SELECT fullpath, name FROM files WHERE hashid=?', [req.params.hashid], function(err, result){
    if(err) throw err;

    var result = result[0];
    var fullpath = result.fullpath;

    fs.exists(fullpath, function (exists) {
      if (!exists) {
        var totalContent = "";
        c.mysql_db.query('SELECT supported_mimetypes.modules FROM supported_mimetypes INNER JOIN files ON supported_mimetypes.mime_type = files.mtype WHERE files.hashid=?', [req.params.hashid], function(err, result) {
            if (err) throw err;
            var hashednames = JSON.parse(result[0].modules);
            var tables = Object.keys(hashednames);
            async.each(tables, function(table, callback) {
                c.mysql_db.query('SELECT Content FROM ?? WHERE hashid=?', [hashednames[table],req.params.hashid], function(err, result) {
                    if (err) throw err;
                    totalContent += result[0].Content;
                    callback();
                });
            }, function(err) {
                if (totalContent) res.send(totalContent)
                else res.send('No content available, because no module has processed or stored it, and the file is not or no longer available on the filesystem.');
            });
        });
      } else {
        res.download(fullpath, result.filename);
      }
    });
  });
});

/* Return the content from a evidence file
* url: /api/get_file_content
* takes params:
*
*/
router.get('/file/:hashid/validate', function(req, res){
  c.mysql_db.query('SELECT fullpath, md5, sha1, sha256 FROM files WHERE hashid=?', [req.params.hashid], function(err, result){
    if(err) throw err;

    var result = result[0];
    var fullpath = result.fullpath;

    fs.readFile(fullpath, function (err, data) {
      if (err)
        res.send({md5: false, sha1: false, sha256: false});
      else {
        validateHashes(data, {md5: result.md5, sha1: result.sha1, sha256: result.sha256}, function(validated){
          res.send(validated);
        });
      }
    });
  });
});

function validateHashes(file, hashes, cb){
  async.parallel([
    function(callback){
      callback(null, {md5: md5(file) == hashes.md5});
    }, function(callback){
      var sha1 = crypto.createHash('sha1');
      sha1.update(file);
      callback(null, {sha1: sha1.digest('hex') == hashes.sha1});
    }, function(callback){
      var sha256 = crypto.createHash('sha256');
      sha256.update(file);
      callback(null, {sha256: sha256.digest('hex') == hashes.sha256});
    }
  ], function(err, results){
    var validated = {md5: false, sha1: false, sha256: false};
    for(var key in results){
      for(var hash in results[key])
        validated[hash] = results[key][hash];
    }
    cb(validated);
  });
}

router.get('/files', function(req, res){
  var hashids = req.query.hashids.split(',');
  c.mysql_db.query('SELECT fullpath, name FROM files WHERE hashid IN (?)', [hashids], function(err, results){
    if(err) throw err;

    var archive = archiver('zip');

    archive.on('error', function(err) {
      res.status(500).send({error: err.message});
    });

    //on stream closed we can end the request
    res.on('close', function() {
      console.log('Archive wrote %d bytes', archive.pointer());
      return res.status(200).send('OK').end();
    });

    //set the archive name
    res.attachment(moment().format('YYYYMMDDHHmmss')+'.zip');

    //this is the streaming magic
    archive.pipe(res);

    async.each(results, function(file, cb){
      fs.exists(file.fullpath, function(exists){
        if(exists){
          archive.append(fs.createReadStream(file.fullpath), { name: file.name });
        } else {
          archive.append('Content not available, missing from source directory.', {name: file.name});
          // We could add an empty file to the archive saying 'No content available'??
        }
        cb();
      });
    }, function(err){
      archive.finalize();
    });
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

      mime_types[mime_type] = {
        modules: {}
      };

      result.modules = JSON.parse(result.modules);

      // for(var key in result.modules)
      // modules[mime.extension(result.mime_type)].meme_types = result.modules;

      for(var module in result.modules){
        if(result.modules[module].length > 0){
          mime_types[mime_type].modules[module] =  mime_types[mime_type].modules[module] || {tables: {}, fields: []};
          mime_types[mime_type].modules[module].tables[result.modules[module]] = [];
        }
      }
      async.each(Object.keys(mime_types[mime_type].modules), function(module, callback){
        async.each(Object.keys(mime_types[mime_type].modules[module].tables), function(table, callback){
          c.mysql_db.query('SHOW COLUMNS FROM ??', [table], function(err, fields){
            if(err) throw err;

            fields.forEach(function(field){
              mime_types[mime_type].modules[module].tables[table].push(field.Field);

              if(mime_types[mime_type].modules[module].fields.indexOf(field.Field) == -1)
                mime_types[mime_type].modules[module].fields.push(field.Field);
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
        callback();
      });
    }, function(err){
      if(err) throw err;
// console.log(mime_types);
      res.send(mime_types);
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
            console.error(error);
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
        body: {table: table, fields: mapping.tables[table].fields, mime_types: mapping.tables[table].mime_types, modules: mapping.tables[table].modules}
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

    var queuesFinished = 0;
    for(var i=0; i<num; i++){
      if(queues[i].idle())
        queuesFinished++;
    }

    if(queuesFinished == num){
      var now = new Date();
      console.log(completed + ' out of ' + meta.totalRows);
      console.log('Filling took ' + (now-start)/1000 + ' seconds.');
      clearTimeout(emitInterval);
      emitProgress();
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

/**
 * Save user
 * url: /api/save_user
 * Takes user object with firstname, lastname, email, password and isDeleted
 */
router.post('/save_user', function(req, res){
  var user = req.body;
  var username = user.email;

  function isDef(v) {
    return v !== undefined && v !== null;
  }

  if(isDef(user.firstName) && isDef(user.lastName) && isDef(user.password) && isDef(user.email) && isDef(user.isDeleted)){
    c.elasticsearch.search({
      index: c.config.elasticsearch.index,
      type: 'users',
      size: 1,
      body: {
        query: {
          filtered: {
            filter: {
              term: {
                email: username
              }
            }
          }
        }
      }
    }).then(function(response) {
      if (response.hits.total != 0) {
        res.send({
          error: {
            message: 'Email address already exists'
          }
        });
      }
      else {
        var bcrypt = require('bcrypt-nodejs');

        bcrypt.hash(user['password'], null, null, function(err, hash){
          user.password = hash;

          c.elasticsearch.create({
            index: INDEX,
            type: 'users',
            refresh: true,
            body: user
          }, function (error, response) {
            res.send({error: error, response: response});
          });
        })
      }
    });
  }
  else {
    res.send({
      error: {
        message: 'Variable is undefined'
      }
    });
  }
});

router.post('/edit_user', function(req, res){
  var bcrypt = require('bcrypt-nodejs');
  var user = req.body;
  var id = user.id;
  delete user.id;

  bcrypt.hash(user['password'], null, null, function(err, hash){
    if (user.password != null){
      user.password = hash;
    }

    c.elasticsearch.update({
      index: INDEX,
      type: 'users',
      id: id,
      refresh: true,
      body: {
        "doc" : user
      }
    }, function (error, response) {
      res.send({error: error, response: response});
    });
  })
});


router.post('/archive_user', function(req, res){
  var user = req.body;
  var id = user.id;

  c.elasticsearch.update({
    index: INDEX,
    type: 'users',
    id: id,
    refresh: true,
    body: {
      doc: {
        isDeleted: true
      }
    }
  }, function (error, response) {
    res.send({error: error, response: response});
  });
});

router.post('/unarchive_user', function(req, res){
  var user = req.body;
  var id = user.id;

  c.elasticsearch.update({
    index: INDEX,
    type: 'users',
    id: id,
    refresh: true,
    body: {
      doc: {
        isDeleted: 0
      }
    }
  }, function (error, response) {
    res.send({error: error, response: response});
  });

});

/**
 * Get all users
 * url: /api/get_users
 */
router.get('/get_users', function(req, res){

  c.elasticsearch.search({
    index: INDEX,
    type: 'users',
    body: { query: { match_all: {}}},
    _source: ["id", "firstName", "lastName", "email", "isDeleted", "role"],
    size: 999 // all
  }, function (error, response) {
    res.send({error: error, response: response});
  });
});

router.get('/get_filtered_users', function(req, res){
  var filter = req.body.filter;
  c.elasticsearch.search({
    index: INDEX,
    type: 'users',
    body: { query: { match: {'role': 'user'},}},
    _source: ["id", "firstName", "lastName", "email", "isDeleted", "role"],
    size: 999 // all
  }, function (error, response) {
    res.send({error: error, response: response});
  });
});

/**
 * Get one user
 * url: /api/get_user
 */
router.get('/get_user', function(req, res){
  getUser(req.query.id, function (error, response) {
    res.send({error: error, response: response});
  });
});

router.get('/get_logged_in_user', function(req, res){
  getUser(req.user.id, function (error, response) {
    res.send({error: error, response: response});
  });
});


function getUser (userId, cb) {
  c.elasticsearch.search({
    index: INDEX,
    type: 'users',
    body: {
      query: {
        "ids" : {
          "values" : [userId]
        }
      }
    },
    _source: ["id", "firstName", "lastName", "email", "isDeleted", "role"],
  }, cb);
}

/**
 * Edit an existing user
 * url: /api/edit_user
 */
router.post('/edit_user', function(req, res){
  var bcrypt = require('bcrypt-nodejs');
  var user = req.body;
  var id = user.id;
  delete user.id;

  bcrypt.hash(user['password'], null, null, function(err, hash){
    if (user.password != null){
      user.password = hash;
    }

    c.elasticsearch.update({
      index: INDEX,
      type: 'users',
      id: id,
      body: {
        "doc" : user
      }
    }, function (error, response) {
      res.send({error: error, response: response});
    });
  })
});

/**
 * Save case
 * url: /api/save_case
 * Takes user object with name, caseStarted, caseClosed, leadInvestigator, investigators
 */
router.post('/save_case', function(req, res){
  var cases = req.body;
  var name = cases.name;

  function isDef(v) {
    return v !== undefined && v !== null;
  }

  if(isDef(name)){
    c.elasticsearch.search({
      index: c.config.elasticsearch.index,
      type: 'cases',
      size: 1,
      body: {
        query: {
          filtered: {
            filter: {
              term: {
                name: name
              }
            }
          }
        }
      }
    }).then(function(response) {
      if (response.hits.total != 0) {
        res.send({
          error: {
            message: 'Case already exists'
          }
        });
      }
      else {
        c.elasticsearch.create({
          index: INDEX,
          type: 'cases',
          refresh: true,
          body: cases
        }, function (error, response) {
          res.send({error: error, response: response});
        });
      }
    });
  }
  else {
    res.send({
      error: {
        message: 'Variable is undefined'
      }
    });
  }
});


module.exports = router;
