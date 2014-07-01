#!/usr/bin/env python

# Copyright (C) 2014 Hogeschool van Amsterdam

import os, sys, imp, inspect
import json
import itertools
import ConfigParser
from ast import literal_eval

#custom files
import es_coretypes

# add pyes from the libraries subfolder
# this will also force python to use the included module instead of the ones installed on the system
pyes_libfolder =  os.path.realpath(os.path.abspath(os.path.join(os.path.split(inspect.getfile( inspect.currentframe() ))[0],"./libraries/pyes")))
if pyes_libfolder not in sys.path:
    sys.path.insert(0, pyes_libfolder)

from pyes import *
# PyES - Python Elastic Search
# https://pyes.readthedocs.org/en/latest/

config = imp.load_source('config', 'include/default_config.py')

try:
    config = imp.load_source('config', 'include/config.py')
except:
    print("< WARNING! > Config file not found in include / or not configured correctly, loading default config.")

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

    For each mapping it will then call create_mapping() which will create an *EMPTY* mapping entry.

    """
    alldata = db.read_table(_table="supported_mimetypes", columnsonly=False)

    for line in alldata:
        mimetype = line[0]
        tables_dict = literal_eval(line[1])
       #print tables_dict.keys()

        for k in sorted(tables_dict.keys()):
            #print _mime 
            #print tables_dict[k]
            create_mapping( mime = mimetype, tablename = tables_dict[k] )

def find_mime_table(configmime=None, fields=None):
    if not configmime:
        raise Exception("fine_mime_table has no configmime to query the database for.")

    mimedata = db.like_mime(_table="supported_mimetypes", _mime=configmime)

    for line in mimedata:
        mimetype = line[0]
        tables_dict = literal_eval(line[1])

        for k in sorted(tables_dict.keys()):
            create_mapping( mime = mimetype, tablename = tables_dict[k], mappinglist = fields )

def create_mapping(mime=None, tablename=None, mappinglist=None):
    """
    
    create_mapping will create a mapping for the desired index.
    if mappinglist is empty it will assume all fields need to be mapped.

    A mapping is in the URL after the index, for example:

    http://localhost:9200/uforia/image_jpeg

    where image_jpeg is the mapping.
    
    """
    if not mime:
        raise Exception("create_mapping called without a mimetype")
    elif not tablename:
        raise Exception("create_mapping called without a table")
    else:
        conn = ES(config.ESSERVER)
        print("Retrieving table from database (this could take a little while).")
        tableData = db.read_table(_table=tablename, columnsonly=False, onerow=True)
        columnNames = db.read_table(_table=tablename)
        mapping = {}

        if not tableData:
            print("No data returned for table ", tablename)
            return

        for _data, _name in itertools.izip(tableData, columnNames):
            if( (mappinglist) and (_name in list(mappinglist)) ): 
                print "skipping field %s" % (_name)
                continue
            jsonName = json.dumps(_name)
            submap = { "type" :  coreType(_data),
                "store" : "no",
                "index" : "not_analyzed",
            }
            mapping[jsonName[1:-1]] = submap

        newmime = mime.replace("/","_")
        print("Creating mapping: %s" % newmime)
        print mapping
        #conn.indices.put_mapping(str(newmime), {'properties':mapping}, ["uforia"])


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

def del_index():
    """
    Erases the entire index set in the configuration file.
    """
    conn = ES(config.ESSERVER)
    try:
        conn.indices.delete_index(config.ESINDEX)
        print("Successfully deleted the ElasticSearch index: %s" % config.ESINDEX)
    except:
        print("Could not delete the index: %s" % config.ESINDEX)
        raise

def parse_mapping_config(mapfile=None):
    """
    parse_mapping_config will treat the mapfile var as a file when supplied.
    If nothing is supplied it wil default to attempt to the file default_mapping_config.cfg

    mapconfig is declared at the top and uses ConfigParser.SafeConfigParser()
    """
    mapconfig = ConfigParser.SafeConfigParser()

    mapconfig.read('include/default_mapping_config.cfg')
    try:
        mapconfig.read(mapfile)
    except:
        print("< WARNING! > MAPPING Config file not supplied or not configured correctly, loading default config.")

    # section titles are also the mimetype names
    mimetypes = mapconfig.sections()

    for mime in mimetypes:
        if (mapconfig.has_option(mime, 'map')):
            mapping_fields = mapconfig.get(mime, 'map')
            if(mime is 'files'): 
                continue
            else:
                find_mime_table(mime, mapping_fields)

def generate_conf_file():
    """
    Uses the supported_mimetypes table to grab the mimetypes and their respective modules
    it'll then make a list of fields per module and throw them into a dict
    the dict will be written to file.

    this same file can be used to create mappings

    """
    mapconfig = ConfigParser.SafeConfigParser()

    print("Retrieving table supported_mimetypes from database.")

    supmimetable = db.read_table(_table="supported_mimetypes", columnsonly=False)
    for line in supmimetable:
        mimetype = line[0]
        tables_dict = literal_eval(line[1])

        for k in sorted(tables_dict.keys()):
            #print mimetype

            mimetype = mimetype.replace("/","_")
            if(not mapconfig.has_section(mimetype)):
                mapconfig.add_section(mimetype)

            modulecolumns = db.read_table(_table = tables_dict[k], columnsonly=True)
            fields = []
            for row in modulecolumns:
                fields.append(row)
            fields = json.dumps(fields, ensure_ascii=False)
            mapconfig.set(mimetype, tables_dict[k], str(fields))
            with open('test.cfg', 'wb') as configfile:
                mapconfig.write(configfile)

    print "Done. Config is written to file as test.cfg."

if __name__ == "__main__":
    #read_data()
    #populate_files_mapping("a", "a")
    #generate_table_list()
    #parse_mapping_config()
    generate_conf_file()
