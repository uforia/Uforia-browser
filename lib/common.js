var config        = require('../config'),
    mysql         = require('mysql'),
    elasticsearch = require('elasticsearch'),


	mysql_db 		    = mysql.createPool(config.mysql);
	elasticsearch 		= new elasticsearch.Client({
  		host: config.elasticsearch.host + ":" + config.elasticsearch.port
 		// log: 'trace'
  	});

module.exports = {
  config: config,
  mysql_db: mysql_db,
  elasticsearch: elasticsearch,
};
