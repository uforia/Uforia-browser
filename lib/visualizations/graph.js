var util = require('./util'),
    async = require('async'),
    _     = require('lodash');

//Generate data for a bar chart
module.exports.generateJSON = function(root, parameters, callback){

  var data = { total : 0, nodes : [], links : []};

  var from_field = parameters.field1;
  var to_fields = parameters.field2;

  //check if a link already exists and returns its position
  // This can be done more efficiently (TODO)
  function linkIndexFor(links, target){
      for(var i = 0; i < links.length; i++){
          var link = links[i];
          if(link.source == target.source && link.target == target.target){
              return i;
          }
      }
      return -1;
  }

  //Fill the nodes array
  root.forEach(function(child){
      data.total += 1;
      var from = util.getEmailFromInput(child._source[from])[0];
      var to = [];

      to_fields.forEach(function(field){
        to = to.concat(util.getEmailFromInput(child._source[field]));
      });

      //Check if the from address already has an entry. If so update it, otherwise create it
      var fromIndex = _.findIndex(data.nodes, 'name', from);
      if(fromIndex > -1){
          data.nodes[fromIndex].sent += 1;
          data.nodes[fromIndex].hashids.push(child._source.hashid);
      } else {
          data.nodes.push({name : from, sent: 1, received : 0, hashids : [child._source.hashid]});
      }

      to.forEach(function(receipient){
          //Check if the to address already has an entry. If so update it, otherwise create it
          var toIndex = _.findIndex(data.nodes, 'name', receipient);
          if(toIndex > -1){
              data.nodes[toIndex].received += 1;
              data.nodes[toIndex].hashids.push(child._source.hashid);
          } else {
              data.nodes.push({name : receipient, sent : 0, received : 1, hashids : [child._source.hashid]});
          } 
      });
  });

  //Fill the links array
  root.forEach(function(child){
      var from = util.getEmailFromInput(child._source[from])[0];
      var to = [];

      to_fields.forEach(function(field){
        to = to.concat(util.getEmailFromInput(child._source[field]));
      });

      var index = _.findIndex(data.nodes, 'name', from);

      //Create a link between the from address and all the receipients of the email
      to.forEach(function(receipient){
          var toIndex = _.findIndex(data.nodes, 'name', receipient);
          var link = {source : index, target : toIndex, value : 1, hashids : [child._source.hashid]};
          var linkIndex = linkIndexFor(data.links, link);
          if(linkIndex > -1){
              data.links[linkIndex].value += 1;
              data.links[linkIndex].hashids.push(child._source.hashid);
          } else {
              data.links.push(link);
          }
      });
  });

  return callback(data);
}