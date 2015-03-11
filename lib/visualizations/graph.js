var util = require('./util'),
    async = require('async'),
    _     = require('lodash');

//Generate data for a bar chart
module.exports.generateJSON = function(root, parameters, callback){

  var data = { total : 0, nodes : [], links : []};

  var from_field = parameters.field1;
  var to_fields = parameters.field2;

  async.series([fillNodesArray, fillLinksArray], function(err, results){
      if(err) throw err;
      callback(data);
  });

  function fillNodesArray(cb){
    //Fill the nodes array
    async.each(root, function(child, cb){
      data.total += 1;
      var from = util.getEmailFromInput(child._source[from_field])[0] || 'Unknown';
      var to = [];

      to_fields.forEach(function(field){
        to = to.concat(util.getEmailFromInput(child._source[field]));
      });

      //Check if the from address already has an entry. If so update it, otherwise create it
      var fromIndex = _.findIndex(data.nodes, 'name', from);
      if(fromIndex > -1){
        data.nodes[fromIndex].sent += 1;
        data.nodes[fromIndex].hashids.push(child._source.hashid);

        data.nodes[fromIndex].tables[child._source._table] = data.nodes[fromIndex].tables[child._source._table] || [];
        data.nodes[fromIndex].tables[child._source._table].push(child._source.hashid);
      } else {
        var tables = {};
        tables[child._source._table] = [child._source.hashid];
        data.nodes.push({name : from, sent: 1, received : 0, hashids : [child._source.hashid], tables: tables});
      }

      async.each(to, function(receipient, cb){
        //Check if the to address already has an entry. If so update it, otherwise create it
        var toIndex = _.findIndex(data.nodes, 'name', receipient);
        if(toIndex > -1){
          data.nodes[toIndex].received += 1;
          data.nodes[toIndex].hashids.push(child._source.hashid);

          data.nodes[toIndex].tables[child._source._table] = data.nodes[toIndex].tables[child._source._table] || [];
          data.nodes[toIndex].tables[child._source._table].push(child._source.hashid);
        } else {
          var tables = {};
          tables[child._source._table] = [child._source.hashid];
          data.nodes.push({name : receipient, sent : 0, received : 1, hashids : [child._source.hashid], tables: tables});
        } 
        cb();
      }, function(err){
        cb();
      });


    }, function(err){
      cb();
    });
  }

  function fillLinksArray(cb){
    //Fill the links array
    async.each(root, function(child, cb){
      var from = util.getEmailFromInput(child._source[from_field])[0] || 'Unknown';
      var to = [];

      to_fields.forEach(function(field){
        to = to.concat(util.getEmailFromInput(child._source[field]));
      });

      var index = _.findIndex(data.nodes, 'name', from);

      //Create a link between the from address and all the receipients of the email
      async.each(to, function(receipient, cb){
        var toIndex = _.findIndex(data.nodes, 'name', receipient);
        var linkIndex = _.findIndex(data.links, {'source': index, 'target': toIndex}); //linkIndexFor(data.links, link);
        if(linkIndex > -1){
          data.links[linkIndex].value += 1;
          data.links[linkIndex].hashids.push(child._source.hashid);

          data.links[linkIndex].tables[child._source._table] = data.links[linkIndex].tables[child._source._table] || [];
          data.links[linkIndex].tables[child._source._table].push(child._source.hashid);
        } else {
          var tables = {};
          tables[child._source._table] = [child._source.hashid];
          var link = {source : index, target : toIndex, value : 1, hashids : [child._source.hashid], tables: tables};
          data.links.push(link);
        }
        cb(); 
      }, function(err){
        cb(); 
      });
    }, function(err){
      cb();
    });
  }
}