#!/usr/bin/env python

# Copyright (C) 2014 Hogeschool van Amsterdam

import os, sys, imp, inspect
import json
import itertools
import ConfigParser, argparse
from ast import literal_eval

#custom files
import es_coretypes
import build_tests

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

def generate_table_list(_files = False):
    """

    Will grab the modules column from the supported_mimetypes table
    and use the referenced tables there to generate a list of tables to call
    per mapping.

    For each mapping it will then call create_mapping() which will create an *EMPTY* mapping entry.

    If _files is True then create_mapping will skip sending the entries to Elasticsearch and instead
    create JSON files and put them in a directory.

    """
    alldata = db.read_table(_table="supported_mimetypes", columnsonly=False)

    for line in alldata:
        mimetype = line[0]
        tables_dict = literal_eval(line[1])
       #print tables_dict.keys()

        for k in sorted(tables_dict.keys()):
            #print _mime 
            #print tables_dict[k]
            create_mapping( mime = mimetype, tablename = tables_dict[k], make_files = _files )

def find_mime_table(configmime=None, fields=None):
    if not configmime:
        raise Exception("fine_mime_table has no configmime to query the database for.")

    mimedata = db.like_mime(_table="supported_mimetypes", _mime=configmime)

    for line in mimedata:
        mimetype = line[0]
        tables_dict = literal_eval(line[1])

        for k in sorted(tables_dict.keys()):
            create_mapping( mime = mimetype, tablename = tables_dict[k], mappinglist = fields )

def create_mapping(mime=None, tablename=None, mappinglist=None, make_files=False):
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
            jsonName = json.dumps(_name) # _name is a unicode string
            jsonName = jsonName.replace('"','') # or it'll give "\""_name"\"" in JSON
            submap = { "type" :  es_coretypes.getType(_data),
                "store" : "no",
                "index" : "not_analyzed",
            }
            mapping[jsonName[1:-1]] = submap

        newmime = mime.replace("/","_")
        print("Creating mapping: %s" % newmime)
        if make_files:
            with open('jsonfiles/'+newmime+'.json', 'w') as outfile:
                json.dump(mapping, outfile)
        else:
            conn.indices.put_mapping(str(newmime), {'properties':mapping}, [config.ESINDEX])
 
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

def parse_mapping_config():
    """
    parse_mapping_config will treat the mapfile var as a file when supplied.
    If nothing is supplied it wil not run.

    What it'll do is add a 'fields' option to the configuration file.

    """
    mapconfig = ConfigParser.SafeConfigParser()

    try:
        mapconfig.read('include/custom_uforia_mapping.cfg')
    except:
        print("< WARNING! > MAPPING Config file not supplied or not configured correctly, loading default config.")
        sys.exit(1)

    # section titles are also the mapping names
    mapname = mapconfig.sections()

    for name in mapname:
        if (mapconfig.has_option(name, 'modules')):
            modules = mapconfig.get(name, 'modules', 1)
            #print mapping_fields
            #for x in literal_eval(mapping_fields):
            #    print x
            json_acceptable_string = modules.replace("'", "\"")
            moduledict = json.loads(json_acceptable_string)
            fields = []
            for key in moduledict:
                columns = db.read_table(_table=moduledict[key]) # returns columns only by default
                fields.append([x[0].encode('ascii') for x in columns]) # mysql returns it in unicode format which we don't want
            
            # merge the lists
            fields = [item for sublist in fields for item in sublist]
            fields = list(set(fields)) # remove duplications
        #write to new option    
        mapconfig.set(name, "fields", str(fields))

        with open('include/custom_uforia_mapping.cfg', 'wb') as configfile:
            mapconfig.write(configfile)

        print("Successfully added 'fields' option to the config file for %s" % name)


def gen_all_modules_config():
    """
    Uses the supported_mimetypes table to grab the modules columns
    this column is then written to file for each mimetype.

    this in turn will allow custom mappings to be created.

    """
    mapconfig = ConfigParser.SafeConfigParser()

    print("Retrieving table supported_mimetypes from database.")

    supmimetable = db.read_table(_table="supported_mimetypes", columnsonly=False)
    for line in supmimetable:
        mimetype = line[0]
        tables_dict = literal_eval(line[1])

        mimetype = mimetype.replace("/","_")
        if(not mapconfig.has_section(mimetype)):
            mapconfig.add_section(mimetype)

        mapconfig.set(mimetype, "modules", str(tables_dict))
 
    with open('uforia_modules.cfg', 'wb') as configfile:
        mapconfig.write(configfile)

    print "Done. Everything is written to the following file: uforia_modules.cfg."

      
if __name__ == "__main__":
    #read_data()
    #populate_files_mapping("a", "a")
    #generate_table_list()
    #parse_mapping_config()
    #generate_conf_file()

    parser = argparse.ArgumentParser(description='Interface between Elasticsearch and Uforia frontend.')
    
    parser.add_argument("--make-big-config", help="Generate a config file that contains fields for each individual module.", 
                        action="store_true")
    parser.add_argument("--make-map-files", help="When set this will create JSON mapping files INSTEAD of sending them to Elasticsearch.",
                        action="store_true")
    parser.add_argument("--make-es-mappings", help="Will generate all mappings and send them directly into Elasticsearch.", 
                        action="store_true")
    parser.add_argument("--test-run", help="Reads data from database and outputs it to stdout.",
                        action="store_true")
    parser.add_argument("--delete-index", help="Delete the index set in your config file. (Default is Uforia)", 
                        action="store_true")
    parser.add_argument("--all-fields-config", help="Create a config file with all fields for each module.",
                        action="store_true")
    parser.add_argument("--gen-mappings", help="Use the mapping config from 'include/custom_uforia_mapping.cfg' to create mappings.",
                        action="store_true")

    args = parser.parse_args()
    
    if len(sys.argv)==1:
        parser.print_help()
        sys.exit(1)

    if args.make_big_config:
        generate_conf_file()

    elif args.make_map_files:
        generate_table_list( _files = True )

    elif args.make_es_mappings:
        generate_table_list()

    elif args.test_run:
        build_tests.read_data()

    elif args.delete_index:
        del_index()

    elif args.all_fields_config:
        gen_all_fields_config()

    elif args.gen_mappings:
        parse_mapping_config()
