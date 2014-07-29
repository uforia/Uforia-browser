#!/usr/bin/env python

# Copyright (C) 2014 Hogeschool van Amsterdam

# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

# Enable debug output. Prints lots of information about internal workings.
# Note: Debug output is very noisy and should not be used in production.
DEBUG = False

# Database configuration. The name should match the handler providing
# the appropriate Database class with setupMainTable() and setupTable()
# and store() methods. See one of the provided database handlers for more
# information.
# Example: DBTYPE = 'mysql'

DATABASEDIR = './databases/'
DBTYPE = 'mysql'
DBHOST = '127.0.0.1'
DBUSER = 'uforia'
DBPASS = 'uforia'
DBNAME = 'uforia'

# How many simultaneous database connections should we use to handle
# the queue of SQL queries? Warning: setting this too high can overload
# or hamper database performance
DBCONN = 2

# Maximum number of database connection attempts before giving up
DBRETRY = 5

# ELASTICSEARCH SETTINGS
# ElasticSearch index name
ESINDEX = 'uforia'

# Elasticsearch server:port
ESSERVER = '127.0.0.1:9200'
