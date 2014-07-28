#!/usr/bin/env python

# Copyright (C) 2013 Hogeschool van Amsterdam

# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

import MySQLdb
import traceback
import sys
import warnings

class Database(object):
    """
    This is a MySQL implementation of Uforia's data storage facility.
    """

    def __init__(self, config):
        """
        Initializes a MySQL database connection using the specified Uforia
        configuration.

        config - The uforia configuration object
        """
        if (not config.DBHOST or not config.DBUSER
                or not config.DBPASS or not config.DBNAME):
            raise ValueError("""Cannot initialize a database
                            connection without valid credentials.""")
        else:
            hostname = config.DBHOST
            username = config.DBUSER
            password = config.DBPASS
            self.database = config.DBNAME
            self.connection = None
            attempts = 0
            retries = config.DBRETRY
        while not self.connection:
            try:
                attempts += 1
                self.connection = MySQLdb.connect(host=hostname,
                                                  user=username,
                                                  passwd=password,
                                                  db=self.database,
                                                  charset='utf8',
                                                  use_unicode=True)
            except MySQLdb.OperationalError, e:
                print("Could not connect to the MySQL server: " + str(e))
                print("Sleeping for 3 seconds...")
                time.sleep(3)
                if attempts > retries:
                    print("The MySQL server didn't respond after "
                          + str(retries) +
                          """ requests; you might be flooding it
                          with connections.""")
                    print("""Consider raising the maximum amount of
                            connections on your MySQL server or lower
                            the amount of concurrent Uforia threads!""")
                    traceback.print_exc(file=sys.stderr)
                    break
        try:
            self.cursor = self.connection.cursor()
        except:
            traceback.print_exc(file=sys.stderr)

    def execute_query(self, query, params=None):
        """
        Executes a query and doesn't return data.
        Handling of executed query is done in the def itself.

        query - The query string
        """
        try:
            warnings.filterwarnings('ignore', category=self.connection.Warning)
            #print "query is %s " % query
            self.cursor.execute(query, params)
            warnings.resetwarnings()
        except:
            traceback.print_exc(file=sys.stderr)

    def read_mimetypes(self, column="modules"):
        """
        Grabs a column from the supported_mimetypes table.
        columns: mime_type & modules

        Default is the modules column which is the table
        name for the related mime_type.

        """

        query = "SELECT "+column+" FROM supported_mimetypes;"
        self.execute_query(query)

        return self.cursor.fetchall()

    def read_filestable(self, _all=False):
        """
        Reads the 'files' table depending on the boolean flag.
        By default it only returns the column names for 
        the purpose of JSON index generation.

        _all - Boolean flag
        """

        if(_all):
            query = """
            SELECT 
            `hashid`, `fullpath`, `name`, `size`, 
            `owner`, `group`, `perm`, 
            `mtime`, `atime`, `ctime`, 
            `md5`, `sha1`, `sha256`, 
            `ftype`, `mtype`, `btype`
            FROM files;
            """
        else:
            query = """
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = '"""+ self.database +"""'
            AND table_name = 'files';
            """

        result = self.execute_query(query)
        return self.cursor.fetchall()

    def read_table(self, _table, columnsonly=True, onerow=False, return_dict=False):
        """
        Generic func to read either only the columns or the entire table.
        If there is no table, will raise an exception.


        data_type is used to determine if it should be an int/float/string
        column_type simply returns the name of the column
        """

        if(not _table):
            raise Exception("No table specified for read_table!")

        if(columnsonly):
            query = """
            SELECT column_name,data_type
            FROM information_schema.columns
            WHERE table_schema = '""" + self.database + """'
            AND table_name = '"""+ _table +"""';
            """
        else:
            query = """
            SELECT * FROM """+ _table +""";
            """

        if return_dict:
            self.cursor = self.connection.cursor(cursorclass=MySQLdb.cursors.DictCursor)

        self.execute_query(query)
 
        if(onerow):
            result = self.cursor.fetchone()
        else:
            result = self.cursor.fetchall()
        return result

    def read_table_list(self, _tablelist, columnsonly=True):
        """
        Generic func to read either only the columns or the entire table.
        If there is no table, will raise an exception.


        data_type is used to determine if it should be an int/float/string
        column_type simply returns the name of the column
        """

        if(not _tablelist):
            raise Exception("No table specified for read_tablelist!")

        if(columnsonly):
            query = """
            SELECT column_name,data_type
            FROM information_schema.columns
            WHERE table_schema = '""" + self.database + """'
            AND table_name = '""" +  _tablelist[0] + """'"""
            
            # skip first and last in list
            for table in _tablelist[1:-1]:
                query += """
                OR table_name = '"""+ table +"""'
                """
            # add last and end query
            query += "OR table_name = '" + _tablelist[-1] + "';"
        else:
            query = """
            SELECT * FROM """
            for table in _tablelist[:-1]:
                query += "'" + table + "',"
            query += "'" + _tablelist[-1] + "';"
            
        self.execute_query(query)
        result = self.cursor.fetchall()
 
        return result


    def like_mime(self, _mime=None,  _table="supported_mimetypes"):
        """
        like_mime queries the database using a LIKE query
        this is done under the assumption that whatever the config file reads is not 100% accurate
        but close enough to still produce a hit in the database.

        """
        if(not _mime):
            raise Exception("No mime supplied. Cannot query database.")

        query = "SELECT * from "+ _table +" WHERE mime_type LIKE '%"+_mime+"%';"
        self.execute_query(query)
        result = self.cursor.fetchall()
        return result

    def get_modules_column(self):
        """
        Returns only the 'modules' column from the supported_mimetypes table.
        """

        query = "SELECT modules from supported_mimetypes;"
        self.execute_query(query)
        result = self.cursor.fetchall()
        return result

