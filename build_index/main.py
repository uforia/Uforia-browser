#!/usr/bin/env python

# Copyright (C) 2014 Hogeschool van Amsterdam

import os, sys, imp, inspect
import json
from ast import literal_eval
import itertools

# add pyes from the libraries subfolder
# this will also force python to use the included module instead of the ones installed on the system
pyes_libfolder =  os.path.realpath(os.path.abspath(os.path.join(os.path.split(inspect.getfile( inspect.currentframe() ))[0],"./libraries/pyes/src")))
if pyes_libfolder not in sys.path:
    sys.path.insert(0, pyes_libfolder)

from pyes import *
# PyES - Python Elastic Search
# https://pyes.readthedocs.org/en/latest/

config = imp.load_source('config', 'include/default_config.py')

try:
    config = imp.load_source('config', 'include/config.py')
except:
    print("< WARNING! > Config file not found in include/ or not configured correctly, loading default config.")

database = imp.load_source(config.DBTYPE, config.DATABASEDIR + config.DBTYPE + ".py")

db = database.Database(config)


def read_data():
    """
    
    Runs the functions from the database and prints the data to stdout.
    Used as a means to confirm things are working as they should be (for now).

    """
    
   # db = database.Database(config)
    
    print("\nReading the mimetypes table:\n")
    print(db.read_mimetypes()) # print the modules column first
    print(db.read_mimetypes(column="mime_type"))

    print("\nReading the files table:\n")
    print(db.read_filestable()) # just print the column names, files is table rather large

def populate_files_mapping(_index, jsondata):
    """
    
    Creates (or fills if it exists) the elasticsearch index

    """
    if(not _index):
        raise Exception("The _index in populate_index is empty!")
    if(not jsondata):
        raise Exception("populate_index is being called without any json to fill the index! Sure this is correct? You can fill this manually")
    else:
        _filestable = db.read_filestable(_all=True)
        # hashid, fullpath, name, size, owner, group, perm, mtime, 
        # atime, ctime, md5, sha1, sha256, ftype, mtype, btype

        # Only ones interesting at this time are:
        # name, size, owner, mtype, mtime, atime and ctime.

        for row in _filestable:
            hashid      = row[0]
            fullpath    = row[1]
            name        = row[2]
            size        = row[3]
            owner       = row[4]
            group       = row[5]
            perm        = row[6]
            mtime       = row[7]
            atime       = row[8]
            ctime       = row[9]
            md5         = row[10]
            sha1        = row[11]
            sha256      = row[12]
            ftype       = row[13]
            mtype       = row[14]
            btype       = row[15]

            #print ("name: ", name)
            #print ("size: ", size)
            #print ("owner: ", owner)
            #print ("mtype: ", mtype)
            #print ("mtime: ", mtime)

def generate_table_list():
    """

    Will grab the modules column from the supported_mimetypes table
    and use the referenced tables there to generate a list of tables to call
    per mapping.

    """
    alldata = db.read_table(_table="supported_mimetypes", columnsonly=False)

    for line in alldata:
        mimetype = line[0] # mime_type
        tables_dict = literal_eval(line[1])
        #print tables_dict.keys()

        for k in sorted(tables_dict.keys()):
            #print _mime 
            #print tables_dict[k]
            create_mapping( mime = mimetype, tablename = tables_dict[k] )

def coreType(value=None):
    """
    
    elasticsearch has the following coretypes:
    string, integer/long, float/double, boolean, and null

    python floats are almost always c doubles, so there is no check for double.
    
    """

    if isinstance(value, int):
        return str("integer")
    elif isinstance(value, long):
        return str("long")
    elif isinstance(value, str):
        return str("string")
    elif isinstance(value, float):
        return str("float")
    elif isinstance(value, bool):
        return str("boolean")
    else:
        return str("string")


def create_mapping(mime=None, tablename=None):
    """
    
    create_mapping will do as the name suggests for the uforia index.
    A mapping is in the URL after the index, for example:

    http://localhost:9200/uforia/image_jpeg

    where image_jpeg is the mapping.
    
    """
    if not mime:
        raise Exception("fill_mapping called without a mimetype")
    elif not tablename:
        raise Exception("fill_mapping called without a table")
    else:
        conn = ES('127.0.0.1:9200') # Use HTTP
        tableData = db.read_table(_table=tablename, columnsonly=False, onerow=True)
        columnNames = db.read_table(_table=tablename)

        mapping = {}

        if not tableData:
            print("No data returned for table ", tablename)
            return

        for _data, _name in itertools.izip(tableData, columnNames):
            jsonName = json.dumps(_name)
            submap = { "type" :  coreType(_data),
                "store" : "no",
                "index" : "not_analyzed",
            }
            mapping[jsonName[1:-1]] = submap

        #print mapping
        #print mime
        newmime = mime.replace("/","_")
        print newmime
        conn.indices.put_mapping(str(newmime), {'properties':mapping}, ["uforia"])

def fill_mapping(mime=None, tablename=None):
    if not mime:
        raise Exception("fill_mapping called without a mimetype")
    elif not tablename:
        raise Exception("fill_mapping called without a table")
    else:
        #conn = ES('127.0.0.1:9200') # Use HTTP
        tableData = db.read_table(_table=tablename, columnsonly=False)
        columnNames = db.read_table(_table=tablename)
       #columnNames = json.dumps(c)

        for row in tableData:
            i = 0
            while i < len(columnNames):
                jsonstring = json.dumps(columnNames[i])
                print jsonstring[1:-1], row[i], coreType(row[i])
                i += 1
        

if __name__ == "__main__":
    #read_data()
    #populate_files_mapping("a", "a")
    generate_table_list()
