//3rd party Requirements
var elasticsearch = require('elasticsearch');
var express = require("express");
var app = express();
var mysql = require('mysql');
var fs = require('fs');
var python = require('python-shell');
var workerFarm = require('worker-farm');


//Set up workers processes for longer tasks
var workerOptions = { maxCallTime : 10000 } //Kill a process after 10 secs
var workersEmail = workerFarm(workerOptions, require.resolve('./mimetype_modules/email'), ['createEmailChordDiagram' , 'createEmailGraph', 'createBarChart']);
var workersFiles = workerFarm(workerOptions, require.resolve('./mimetype_modules/files'), ['createFilesBubble']);
var workersDocuments = workerFarm(workerOptions, require.resolve('./mimetype_modules/documents'), ['createBarChart']);
var workersBarChart = workerFarm(workerOptions, require.resolve('./visualizations/bar_chart'), ['barChart']);

//Uforia requirements
var config = require('./uforia-config');
var util = require('./mimetype_modules/util');
var files = require('./mimetype_modules/files');
var email = require('./mimetype_modules/email');
var documents = require('./mimetype_modules/documents');

var barChart = require('./visualizations/bar_chart');

//Set up elasticsearch
var client = new elasticsearch.Client({
  host: config.ELASTIC_SEARCH_HOST + ":" + config.ELASTIC_SEARCH_PORT
  // log: 'trace'
});

//Create a database connection pool
var pool = mysql.createPool({
    host : config.DATABASE_HOST,
    user : config.DATABASE_USER,
    password : config.DATABASE_PASSWORD,
    database : config.DATABASE_NAME
});

//'Constants'
var MAPPINGS_SCRIPT = "main.py";
var MAPPING_SCRIPT_OPTIONS = {
  pythonPath : '/usr/bin/python',
  args: ['--parse-admin-file'],
  scriptPath : __dirname + '/build_index',
};
var MAPPINGS_INPUT_FILE = __dirname + '/build_index/include/uforia_admin.cfg';
var MAPPINGS_OUTPUT_FILE = __dirname + '/build_index/admin_output/uforia_admin_output.cfg';
var INDEX = 'uforia';
var DEFAULT_TYPE = 'files';
var DEFAULT_VIEW = 'bubble';
var DEFAULT_VISUALIZATION = 'bar_chart';
var DEFAULT_SIZE = 10;
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

//Set the view directory and HTML render engine
app.set('views', __dirname + '/public/views');
app.engine('html', require('ejs').renderFile);

//Set the public files directory
app.use(express.static(__dirname + '/public'));

//renders index.html
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
    case 'email':
      res.render('email_details.html');
      break;
    default:
      res.render('index.html');
      break; 
  }
});

/* Renders the admin panel
* takes params:
*
*/
app.get('/admin', function(req, res){
    res.render('admin.html');
});


/*********************
**** START API *******
*********************/

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
* visualization
* 
*/
app.get("/api/search", function(req, res) {
  var search_request = {};
  var query_skeleton = { "query": { "filtered": { "query": { "bool": { "must": [], "must_not": [] } }, "filter": { "bool": { "must": [], "must_not": [] } } } } };
  var view = util.defaultFor(req.param('view'), DEFAULT_VIEW);
  var visualizationParams = util.defaultFor(req.param('visualization'), DEFAULT_VISUALIZATION);

  search_request['index'] = INDEX;
  search_request['type'] = TYPES[util.defaultFor(req.param('type'), DEFAULT_TYPE)].mappings.toString();
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
      search(search_request, res, view, visualizationParams);
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
  search_request['type'] = TYPES[util.defaultFor(req.param('type'), DEFAULT_TYPE)].mappings.toString();
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
      res.send({count : "Invalid query" });
    }
  }, function(err){
    console.trace(err.message);
    res.send({count : "Invalid query" });
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
  type = TYPES[util.defaultFor(req.param('type'), DEFAULT_TYPE)].mappings.toString();
  client.indices.getMapping({ 
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
* takes params:
* type
*
*/
app.get("/api/view_info", function(req, res){
  type = util.defaultFor(req.param('type'), DEFAULT_TYPE);
  res.send(VIEWS[type]);
});

/* Queries database and return the full path of a file
* takes params:
* type
* tablenames
* hashids
*/
app.get("/api/get_file_details", function(req, res){
  var type = TYPES[util.defaultFor(req.param('type'), DEFAULT_TYPE)].mappings.toString();
  var hashids = util.defaultFor(req.param('hashids'), []);
  var filesTable = 'files';
  var tableName = '63c5e0bd853105c84a2184539eb245'; //temp for demonstration

  //Remove duplicates from the hashids
  hashids = hashids.filter (function (v, i, a) { return a.indexOf (v) == i });

  //Escape the values for safety
  hashids.forEach(function(hashid, index){
    hashids[index] = pool.escape(hashid);
  });

  pool.getConnection(function(err, connection){
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
* takes params:
* 
*/
app.get("/api/get_mappings", function(req, res){
  fs.readFile(MAPPINGS_INPUT_FILE, 'utf8', function (err, data) {
    if (err) {
      console.log("File read err " + err.message);
      res.send();
    };
    res.send(data);
  });
});

/*
* Writes a costom mapping format to a file and starts the mapping script
* takes params:
* name
* modules - object
* fields - array
*/
app.get("/api/create_mapping", function(req, res){
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
      console.log(results);
      res.send("Elasticsearch is now filling the mapping in the background.");
    });
  });
});

//Search and return the result
var search = function(search_request, res, view, parameters){
    client.search(search_request).then(function(resp){
    switch(search_request.type){
        case TYPES.files.mappings.toString():
                try {
                  workersFiles.createFilesBubble(resp.hits.hits, function(data){
                    res.send(data);
                  });
                }catch(err){
                    res.send();
                }
            break;
        case TYPES.email.mappings.toString():
            if(view == 'chord'){
                try {
                  workersEmail.createEmailChordDiagram(resp.hits.hits, function(data){
                    res.send(data);
                  });
                }catch(err){
                    console.log(err.message);
                    res.send();
                }
            } else if (view == 'graph') {
                try {
                  workersEmail.createEmailGraph(resp.hits.hits, function(data){
                    res.send(data);
                  });
                }catch(err){
                    res.send();
                }
            } else if(view == 'bar_chart'){
                try {
                  workersEmail.createBarChart(resp.hits.hits, function(data){
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
              var resp = {
                          "took": 2,
                          "timed_out": false,
                          "_shards": {
                              "total": 5,
                              "successful": 5,
                              "failed": 0
                          },
                          "hits": {
                              "total": 1,
                              "max_score": 1,
                              "hits": [
                                  {
                                      "_index": "uforia",
                                      "_type": "documents",
                                      "_id": "qq-Kt0gCTBO6aEARJF7_fA",
                                      "_score": 1,
                                      "_source": {
                                          "cookies": "NULL",
                                          "producer": "NULL",
                                          "page_count": "NULL",
                                          "word_count": "NULL",
                                          "creation_date": "21-9-2014",
                                          "revision_number": "NULL",
                                          "hashid": 39,
                                          "keywords": "NULL",
                                          "null": "Arnim",
                                          "subject": "NULL",
                                          "object_count": "NULL",
                                          "author": "Arnim",
                                          "tablename": "NULL",
                                          "save_date": "NULL",
                                          "content": "# Copyright (C) 2001, 2002  Earnie Boyd  <earnie@users.sf.net>\n# This file is part of the Minimal SYStem.\n#   http://www.mingw.org/msys.shtml\n# \n#         File:\tprofile\n#  Description:\tShell environment initialization script\n# Last Revised:\t2002.05.04\n\nif [ -z \"$MSYSTEM\" ]; then\n  MSYSTEM=MINGW32\nfi\n\n# My decision to add a . to the PATH and as the first item in the path list\n# is to mimick the Win32 method of finding executables.\n#\n# I filter the PATH value setting in order to get ready for self hosting the\n# MSYS runtime and wanting different paths searched first for files.\nif [ $MSYSTEM == MINGW32 ]; then\n  export PATH=\".:/usr/local/bin:/mingw/bin:/bin:$PATH\"\nelse\n  export PATH=\".:/usr/local/bin:/bin:/mingw/bin:$PATH\"\nfi\n\nif [ -z \"$USERNAME\" ]; then\n  LOGNAME=\"`id -un`\"\nelse\n  LOGNAME=\"$USERNAME\"\nfi\n\n# Set up USER's home directory\nif [ -z \"$HOME\" ]; then\n  HOME=\"/home/$LOGNAME\"\nfi\n\nif [ ! -d \"$HOME\" ]; then\n  mkdir -p \"$HOME\"\n  cp /etc/inputrc.default \"$HOME\"/.inputrc\nfi\n\nif [ \"x$HISTFILE\" == \"x/.bash_history\" ]; then\n  HISTFILE=$HOME/.bash_history\nfi\n\nexport HOME LOGNAME MSYSTEM HISTFILE\n\nfor i in /etc/profile.d/*.sh ; do\n  if [ -f $i ]; then\n    . $i\n  fi\ndone\n\nexport MAKE_MODE=unix\nexport PS1='\\[\\033]0;$MSYSTEM:\\w\\007\n\\033[32m\\]\\u@\\h \\[\\033[33m\\w\\033[0m\\]\n$ '\n\nalias clear=clsb\n\ncd \"$HOME\"\n\n",
                                          "table_count": "NULL",
                                          "template": "NULL",
                                          "character_count": "NULL",
                                          "last_author": "NULL",
                                          "modified_date": "NULL",
                                          "company": "NULL",
                                          "paragraph_count": "NULL",
                                          "title": "NULL",
                                          "messages": "NULL",
                                          "image_count": "NULL"
                                      }
                                  },
                                                                    {
                                      "_index": "uforia",
                                      "_type": "documents",
                                      "_id": "qq-Kt0gCTBO6aEARJF7_fA",
                                      "_score": 1,
                                      "_source": {
                                          "cookies": "NULL",
                                          "producer": "NULL",
                                          "page_count": "NULL",
                                          "word_count": "NULL",
                                          "creation_date": "21-9-2014",
                                          "revision_number": "NULL",
                                          "hashid": 39,
                                          "keywords": "NULL",
                                          "null": "NULL",
                                          "subject": "NULL",
                                          "object_count": "NULL",
                                          "author": "Arnim",
                                          "tablename": "NULL",
                                          "save_date": "NULL",
                                          "content": "# Copyright (C) 2001, 2002  Earnie Boyd  <earnie@users.sf.net>\n# This file is part of the Minimal SYStem.\n#   http://www.mingw.org/msys.shtml\n# \n#         File:\tprofile\n#  Description:\tShell environment initialization script\n# Last Revised:\t2002.05.04\n\nif [ -z \"$MSYSTEM\" ]; then\n  MSYSTEM=MINGW32\nfi\n\n# My decision to add a . to the PATH and as the first item in the path list\n# is to mimick the Win32 method of finding executables.\n#\n# I filter the PATH value setting in order to get ready for self hosting the\n# MSYS runtime and wanting different paths searched first for files.\nif [ $MSYSTEM == MINGW32 ]; then\n  export PATH=\".:/usr/local/bin:/mingw/bin:/bin:$PATH\"\nelse\n  export PATH=\".:/usr/local/bin:/bin:/mingw/bin:$PATH\"\nfi\n\nif [ -z \"$USERNAME\" ]; then\n  LOGNAME=\"`id -un`\"\nelse\n  LOGNAME=\"$USERNAME\"\nfi\n\n# Set up USER's home directory\nif [ -z \"$HOME\" ]; then\n  HOME=\"/home/$LOGNAME\"\nfi\n\nif [ ! -d \"$HOME\" ]; then\n  mkdir -p \"$HOME\"\n  cp /etc/inputrc.default \"$HOME\"/.inputrc\nfi\n\nif [ \"x$HISTFILE\" == \"x/.bash_history\" ]; then\n  HISTFILE=$HOME/.bash_history\nfi\n\nexport HOME LOGNAME MSYSTEM HISTFILE\n\nfor i in /etc/profile.d/*.sh ; do\n  if [ -f $i ]; then\n    . $i\n  fi\ndone\n\nexport MAKE_MODE=unix\nexport PS1='\\[\\033]0;$MSYSTEM:\\w\\007\n\\033[32m\\]\\u@\\h \\[\\033[33m\\w\\033[0m\\]\n$ '\n\nalias clear=clsb\n\ncd \"$HOME\"\n\n",
                                          "table_count": "NULL",
                                          "template": "NULL",
                                          "character_count": "NULL",
                                          "last_author": "NULL",
                                          "modified_date": "NULL",
                                          "company": "NULL",
                                          "paragraph_count": "NULL",
                                          "title": "NULL",
                                          "messages": "NULL",
                                          "image_count": "NULL"
                                      }
                                  },
                                                                    {
                                      "_index": "uforia",
                                      "_type": "documents",
                                      "_id": "qq-Kt0gCTBO6aEARJF7_fA",
                                      "_score": 1,
                                      "_source": {
                                          "cookies": "NULL",
                                          "producer": "NULL",
                                          "page_count": "NULL",
                                          "word_count": "NULL",
                                          "creation_date": "21-9-2014",
                                          "revision_number": "NULL",
                                          "hashid": 39,
                                          "keywords": "NULL",
                                          "null": "NULL",
                                          "subject": "NULL",
                                          "object_count": "NULL",
                                          "author": "Sijmen",
                                          "tablename": "NULL",
                                          "save_date": "NULL",
                                          "content": "# Copyright (C) 2001, 2002  Earnie Boyd  <earnie@users.sf.net>\n# This file is part of the Minimal SYStem.\n#   http://www.mingw.org/msys.shtml\n# \n#         File:\tprofile\n#  Description:\tShell environment initialization script\n# Last Revised:\t2002.05.04\n\nif [ -z \"$MSYSTEM\" ]; then\n  MSYSTEM=MINGW32\nfi\n\n# My decision to add a . to the PATH and as the first item in the path list\n# is to mimick the Win32 method of finding executables.\n#\n# I filter the PATH value setting in order to get ready for self hosting the\n# MSYS runtime and wanting different paths searched first for files.\nif [ $MSYSTEM == MINGW32 ]; then\n  export PATH=\".:/usr/local/bin:/mingw/bin:/bin:$PATH\"\nelse\n  export PATH=\".:/usr/local/bin:/bin:/mingw/bin:$PATH\"\nfi\n\nif [ -z \"$USERNAME\" ]; then\n  LOGNAME=\"`id -un`\"\nelse\n  LOGNAME=\"$USERNAME\"\nfi\n\n# Set up USER's home directory\nif [ -z \"$HOME\" ]; then\n  HOME=\"/home/$LOGNAME\"\nfi\n\nif [ ! -d \"$HOME\" ]; then\n  mkdir -p \"$HOME\"\n  cp /etc/inputrc.default \"$HOME\"/.inputrc\nfi\n\nif [ \"x$HISTFILE\" == \"x/.bash_history\" ]; then\n  HISTFILE=$HOME/.bash_history\nfi\n\nexport HOME LOGNAME MSYSTEM HISTFILE\n\nfor i in /etc/profile.d/*.sh ; do\n  if [ -f $i ]; then\n    . $i\n  fi\ndone\n\nexport MAKE_MODE=unix\nexport PS1='\\[\\033]0;$MSYSTEM:\\w\\007\n\\033[32m\\]\\u@\\h \\[\\033[33m\\w\\033[0m\\]\n$ '\n\nalias clear=clsb\n\ncd \"$HOME\"\n\n",
                                          "table_count": "NULL",
                                          "template": "NULL",
                                          "character_count": "NULL",
                                          "last_author": "NULL",
                                          "modified_date": "NULL",
                                          "company": "NULL",
                                          "paragraph_count": "NULL",
                                          "title": "NULL",
                                          "messages": "NULL",
                                          "image_count": "NULL"
                                      }
                                  },
                                                                    {
                                      "_index": "uforia",
                                      "_type": "documents",
                                      "_id": "qq-Kt0gCTBO6aEARJF7_fA",
                                      "_score": 1,
                                      "_source": {
                                          "cookies": "NULL",
                                          "producer": "NULL",
                                          "page_count": "NULL",
                                          "word_count": "NULL",
                                          "creation_date": "21-9-2014",
                                          "revision_number": "NULL",
                                          "hashid": 39,
                                          "keywords": "NULL",
                                          "null": "NULL",
                                          "subject": "NULL",
                                          "object_count": "NULL",
                                          "author": "Bart",
                                          "tablename": "NULL",
                                          "save_date": "NULL",
                                          "content": "# Copyright (C) 2001, 2002  Earnie Boyd  <earnie@users.sf.net>\n# This file is part of the Minimal SYStem.\n#   http://www.mingw.org/msys.shtml\n# \n#         File:\tprofile\n#  Description:\tShell environment initialization script\n# Last Revised:\t2002.05.04\n\nif [ -z \"$MSYSTEM\" ]; then\n  MSYSTEM=MINGW32\nfi\n\n# My decision to add a . to the PATH and as the first item in the path list\n# is to mimick the Win32 method of finding executables.\n#\n# I filter the PATH value setting in order to get ready for self hosting the\n# MSYS runtime and wanting different paths searched first for files.\nif [ $MSYSTEM == MINGW32 ]; then\n  export PATH=\".:/usr/local/bin:/mingw/bin:/bin:$PATH\"\nelse\n  export PATH=\".:/usr/local/bin:/bin:/mingw/bin:$PATH\"\nfi\n\nif [ -z \"$USERNAME\" ]; then\n  LOGNAME=\"`id -un`\"\nelse\n  LOGNAME=\"$USERNAME\"\nfi\n\n# Set up USER's home directory\nif [ -z \"$HOME\" ]; then\n  HOME=\"/home/$LOGNAME\"\nfi\n\nif [ ! -d \"$HOME\" ]; then\n  mkdir -p \"$HOME\"\n  cp /etc/inputrc.default \"$HOME\"/.inputrc\nfi\n\nif [ \"x$HISTFILE\" == \"x/.bash_history\" ]; then\n  HISTFILE=$HOME/.bash_history\nfi\n\nexport HOME LOGNAME MSYSTEM HISTFILE\n\nfor i in /etc/profile.d/*.sh ; do\n  if [ -f $i ]; then\n    . $i\n  fi\ndone\n\nexport MAKE_MODE=unix\nexport PS1='\\[\\033]0;$MSYSTEM:\\w\\007\n\\033[32m\\]\\u@\\h \\[\\033[33m\\w\\033[0m\\]\n$ '\n\nalias clear=clsb\n\ncd \"$HOME\"\n\n",
                                          "table_count": "NULL",
                                          "template": "NULL",
                                          "character_count": "NULL",
                                          "last_author": "NULL",
                                          "modified_date": "NULL",
                                          "company": "NULL",
                                          "paragraph_count": "NULL",
                                          "title": "NULL",
                                          "messages": "NULL",
                                          "image_count": "NULL"
                                      }
                                  },
                                                                    {
                                      "_index": "uforia",
                                      "_type": "documents",
                                      "_id": "qq-Kt0gCTBO6aEARJF7_fA",
                                      "_score": 1,
                                      "_source": {
                                          "cookies": "NULL",
                                          "producer": "NULL",
                                          "page_count": "NULL",
                                          "word_count": "NULL",
                                          "creation_date": "21-9-2014",
                                          "revision_number": "NULL",
                                          "hashid": 39,
                                          "keywords": "NULL",
                                          "null": "NULL",
                                          "subject": "NULL",
                                          "object_count": "NULL",
                                          "author": "Bart",
                                          "tablename": "NULL",
                                          "save_date": "NULL",
                                          "content": "# Copyright (C) 2001, 2002  Earnie Boyd  <earnie@users.sf.net>\n# This file is part of the Minimal SYStem.\n#   http://www.mingw.org/msys.shtml\n# \n#         File:\tprofile\n#  Description:\tShell environment initialization script\n# Last Revised:\t2002.05.04\n\nif [ -z \"$MSYSTEM\" ]; then\n  MSYSTEM=MINGW32\nfi\n\n# My decision to add a . to the PATH and as the first item in the path list\n# is to mimick the Win32 method of finding executables.\n#\n# I filter the PATH value setting in order to get ready for self hosting the\n# MSYS runtime and wanting different paths searched first for files.\nif [ $MSYSTEM == MINGW32 ]; then\n  export PATH=\".:/usr/local/bin:/mingw/bin:/bin:$PATH\"\nelse\n  export PATH=\".:/usr/local/bin:/bin:/mingw/bin:$PATH\"\nfi\n\nif [ -z \"$USERNAME\" ]; then\n  LOGNAME=\"`id -un`\"\nelse\n  LOGNAME=\"$USERNAME\"\nfi\n\n# Set up USER's home directory\nif [ -z \"$HOME\" ]; then\n  HOME=\"/home/$LOGNAME\"\nfi\n\nif [ ! -d \"$HOME\" ]; then\n  mkdir -p \"$HOME\"\n  cp /etc/inputrc.default \"$HOME\"/.inputrc\nfi\n\nif [ \"x$HISTFILE\" == \"x/.bash_history\" ]; then\n  HISTFILE=$HOME/.bash_history\nfi\n\nexport HOME LOGNAME MSYSTEM HISTFILE\n\nfor i in /etc/profile.d/*.sh ; do\n  if [ -f $i ]; then\n    . $i\n  fi\ndone\n\nexport MAKE_MODE=unix\nexport PS1='\\[\\033]0;$MSYSTEM:\\w\\007\n\\033[32m\\]\\u@\\h \\[\\033[33m\\w\\033[0m\\]\n$ '\n\nalias clear=clsb\n\ncd \"$HOME\"\n\n",
                                          "table_count": "NULL",
                                          "template": "NULL",
                                          "character_count": "NULL",
                                          "last_author": "NULL",
                                          "modified_date": "NULL",
                                          "company": "NULL",
                                          "paragraph_count": "NULL",
                                          "title": "NULL",
                                          "messages": "NULL",
                                          "image_count": "NULL"
                                      }
                                  },
                                                                    {
                                      "_index": "uforia",
                                      "_type": "documents",
                                      "_id": "qq-Kt0gCTBO6aEARJF7_fA",
                                      "_score": 1,
                                      "_source": {
                                          "cookies": "NULL",
                                          "producer": "NULL",
                                          "page_count": "NULL",
                                          "word_count": "NULL",
                                          "creation_date": "22-9-2014",
                                          "revision_number": "NULL",
                                          "hashid": 39,
                                          "keywords": "NULL",
                                          "null": "NULL",
                                          "subject": "NULL",
                                          "object_count": "NULL",
                                          "author": "Corne",
                                          "tablename": "NULL",
                                          "save_date": "NULL",
                                          "content": "# Copyright (C) 2001, 2002  Earnie Boyd  <earnie@users.sf.net>\n# This file is part of the Minimal SYStem.\n#   http://www.mingw.org/msys.shtml\n# \n#         File:\tprofile\n#  Description:\tShell environment initialization script\n# Last Revised:\t2002.05.04\n\nif [ -z \"$MSYSTEM\" ]; then\n  MSYSTEM=MINGW32\nfi\n\n# My decision to add a . to the PATH and as the first item in the path list\n# is to mimick the Win32 method of finding executables.\n#\n# I filter the PATH value setting in order to get ready for self hosting the\n# MSYS runtime and wanting different paths searched first for files.\nif [ $MSYSTEM == MINGW32 ]; then\n  export PATH=\".:/usr/local/bin:/mingw/bin:/bin:$PATH\"\nelse\n  export PATH=\".:/usr/local/bin:/bin:/mingw/bin:$PATH\"\nfi\n\nif [ -z \"$USERNAME\" ]; then\n  LOGNAME=\"`id -un`\"\nelse\n  LOGNAME=\"$USERNAME\"\nfi\n\n# Set up USER's home directory\nif [ -z \"$HOME\" ]; then\n  HOME=\"/home/$LOGNAME\"\nfi\n\nif [ ! -d \"$HOME\" ]; then\n  mkdir -p \"$HOME\"\n  cp /etc/inputrc.default \"$HOME\"/.inputrc\nfi\n\nif [ \"x$HISTFILE\" == \"x/.bash_history\" ]; then\n  HISTFILE=$HOME/.bash_history\nfi\n\nexport HOME LOGNAME MSYSTEM HISTFILE\n\nfor i in /etc/profile.d/*.sh ; do\n  if [ -f $i ]; then\n    . $i\n  fi\ndone\n\nexport MAKE_MODE=unix\nexport PS1='\\[\\033]0;$MSYSTEM:\\w\\007\n\\033[32m\\]\\u@\\h \\[\\033[33m\\w\\033[0m\\]\n$ '\n\nalias clear=clsb\n\ncd \"$HOME\"\n\n",
                                          "table_count": "NULL",
                                          "template": "NULL",
                                          "character_count": "NULL",
                                          "last_author": "NULL",
                                          "modified_date": "NULL",
                                          "company": "NULL",
                                          "paragraph_count": "NULL",
                                          "title": "NULL",
                                          "messages": "NULL",
                                          "image_count": "NULL"
                                      }
                                  },
                                                                    {
                                      "_index": "uforia",
                                      "_type": "documents",
                                      "_id": "qq-Kt0gCTBO6aEARJF7_fA",
                                      "_score": 1,
                                      "_source": {
                                          "cookies": "NULL",
                                          "producer": "NULL",
                                          "page_count": "NULL",
                                          "word_count": "NULL",
                                          "creation_date": "23-9-2014",
                                          "revision_number": "NULL",
                                          "hashid": 39,
                                          "keywords": "NULL",
                                          "null": "NULL",
                                          "subject": "NULL",
                                          "object_count": "NULL",
                                          "author": "Arnim",
                                          "tablename": "NULL",
                                          "save_date": "NULL",
                                          "content": "# Copyright (C) 2001, 2002  Earnie Boyd  <earnie@users.sf.net>\n# This file is part of the Minimal SYStem.\n#   http://www.mingw.org/msys.shtml\n# \n#         File:\tprofile\n#  Description:\tShell environment initialization script\n# Last Revised:\t2002.05.04\n\nif [ -z \"$MSYSTEM\" ]; then\n  MSYSTEM=MINGW32\nfi\n\n# My decision to add a . to the PATH and as the first item in the path list\n# is to mimick the Win32 method of finding executables.\n#\n# I filter the PATH value setting in order to get ready for self hosting the\n# MSYS runtime and wanting different paths searched first for files.\nif [ $MSYSTEM == MINGW32 ]; then\n  export PATH=\".:/usr/local/bin:/mingw/bin:/bin:$PATH\"\nelse\n  export PATH=\".:/usr/local/bin:/bin:/mingw/bin:$PATH\"\nfi\n\nif [ -z \"$USERNAME\" ]; then\n  LOGNAME=\"`id -un`\"\nelse\n  LOGNAME=\"$USERNAME\"\nfi\n\n# Set up USER's home directory\nif [ -z \"$HOME\" ]; then\n  HOME=\"/home/$LOGNAME\"\nfi\n\nif [ ! -d \"$HOME\" ]; then\n  mkdir -p \"$HOME\"\n  cp /etc/inputrc.default \"$HOME\"/.inputrc\nfi\n\nif [ \"x$HISTFILE\" == \"x/.bash_history\" ]; then\n  HISTFILE=$HOME/.bash_history\nfi\n\nexport HOME LOGNAME MSYSTEM HISTFILE\n\nfor i in /etc/profile.d/*.sh ; do\n  if [ -f $i ]; then\n    . $i\n  fi\ndone\n\nexport MAKE_MODE=unix\nexport PS1='\\[\\033]0;$MSYSTEM:\\w\\007\n\\033[32m\\]\\u@\\h \\[\\033[33m\\w\\033[0m\\]\n$ '\n\nalias clear=clsb\n\ncd \"$HOME\"\n\n",
                                          "table_count": "NULL",
                                          "template": "NULL",
                                          "character_count": "NULL",
                                          "last_author": "NULL",
                                          "modified_date": "NULL",
                                          "company": "NULL",
                                          "paragraph_count": "NULL",
                                          "title": "NULL",
                                          "messages": "NULL",
                                          "image_count": "NULL"
                                      }
                                  }
                              ]
                          }
                      };



              workersBarChart.barChart(resp.hits.hits, parameters, function(data){
                res.send(data);
              });
            } catch(err){
              console.log(err.message);
              res.send();
            }
          }
          break;
        default: // default is files
          workersFiles.createFilesBubble(resp.hits.hits, function(data){
            res.send(data);
          });
        break;
    }
  }, function(err){
    res.send();
    console.trace(err.message);
  });
};

//Start the server
var server = app.listen(config.SERVER_PORT, function(){
  console.log('Listening on port %d', server.address().port);
});

//Gracefully shutdown the server on termination signal
process.on('SIGTERM', function () {
  
    console.log("Shutting down");
    console.log("Closing MySQL connections");
  pool.destroy();
  console.log("Shutting down express");
  server.close();
  console.log("Closing worker threads");
  workerFarm.end();
});
