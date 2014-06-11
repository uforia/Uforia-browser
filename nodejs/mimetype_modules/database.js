//imports
var mysql = require('mysql');

var DATABASE = 'uforia'

var connection = mysql.createConnection({
    host : 'localhost',
    user : 'uforia',
    password : 'uforia'
})

//These function will be public
module.exports = {

  connect: function(){
    connection.connect(function(err){
        if(err){
            console.log("Error connecting to database: " + err.stack());
            return;
        }
    });
    connection.query("use " + DATABASE, function(err, results){
        if(err){
            console.log("Can't use database: " + DATABASE);
            return;
        }
    });
  },

  closeConnection: function(){
    connection.end();
  },

  getTableName: function(mimetype){
    var query = "SELECT * FROM supported_mimetypes";
  },

  select: function(tableName, hashid){
    tableName = "63c5e0bd853105c84a2184539eb245"; //temp for demonstration
    var query = "SELECT * FROM " + tableName + " WHERE hashid = " + hashid;
    connection.query(query, function(err, results){
        if(err){
            console.log("Can't execute query: " + err.stack());
            return;
        }
        return "WHATSUP";
        return results;
    });
  }
};
