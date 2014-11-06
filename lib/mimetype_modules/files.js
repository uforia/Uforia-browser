//imports
var util = require('./util');

//These function will be public

	//Group the results by users and mimetype groups for every users
module.exports.createFilesBubble = function(root, callback) {
    var classes = {name : "files", children : []};

    root.forEach(function(child){
      var index = util.arrayObjectIndexOf(classes.children, child._source.owner, "name"); 
      if(index > -1){ // Add the child to owner's file list
        var typeIndex = util.arrayObjectIndexOf(classes.children[index].children, child._source.mtype, "name");
        if(typeIndex > -1) { // add the child to the correct mimetype group
            classes.children[index].children[typeIndex].children.push({name : child._source.name, size : child._source.size, owner : child._source.owner, mtime : child._source.mtime, atime: child._source.mtime, ctime : child._source.ctime, mtype : child._source.mtype});
        } else {
            classes.children[index].children.push({name : child._source.mtype, children : [{name : child._source.name, size : child._source.size, owner : child._source.owner, mtime : child._source.mtime, atime: child._source.mtime, ctime : child._source.ctime, mtype : child._source.mtype}]});
        }
      } else { // Not added yet, push a new item to the list
        classes.children.push({name : child._source.owner, children : [{name : child._source.mtype, children : [{name : child._source.name, size : child._source.size, owner : child._source.owner, mtime : child._source.mtime, atime: child._source.mtime, ctime : child._source.ctime, mtype : child._source.mtype}]}]});
      }
    });
	return callback(classes);	
};

//Functions below are private