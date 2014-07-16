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
            create_mapping( mapping_name = mimetype, tablename = tables_dict[k], make_files = _files )

def find_mime_table(configmime=None, fields=None):
    if not configmime:
        raise Exception("fine_mime_table has no configmime to query the database for.")

    mimedata = db.like_mime(_table="supported_mimetypes", _mime=configmime)

    for line in mimedata:
        mimetype = line[0]
        tables_dict = literal_eval(line[1])

        for k in sorted(tables_dict.keys()):
            create_mapping( mapping_name = mimetype, tablename = tables_dict[k], fieldlist = fields )

def create_mapping(mapping_name=None, tablename=None, fieldlist=None, make_files=False):
    """
    
    create_mapping will create a mapping for the desired index.
    if fieldlist is empty it will assume all fields need to be mapped.

    A mapping is in the URL after the index, for example:

    http://localhost:9200/uforia/image_jpeg

    where image_jpeg is the mapping.
    
    """
    if not mapping_name:
        raise Exception("create_mapping called without a mapping_name")
    elif not tablename:
        raise Exception("create_mapping called without a table")
    else:
        conn = ES(config.ESSERVER)
        print("Retrieving table from database (this could take a little while).")
        try:
            tableData = db.read_table(_table=tablename, columnsonly=True) # onerow=True)
        except:
            tableData = db.read_table_list(_tablelist=tablename, columnsonly=True)
        #tableData = db.read_table(_table=tablename, columnsonly=True) # onerow=True)

        #columnNames = db.read_table(_table=tablename)
        mapping = {}

        if not tableData:
            print("No data returned for table ", tablename)
            return

#        print tableData
#        print tableData[0]
#        print tableData[0][1]
#        print es_coretypes.getType(tableData[0][1])
#        sys.exit(0)

        # if no list was supplied then every field is to be mapped
        # so fieldlist refers to columnNames to ensure iteration can continue
        if not fieldlist:
            fieldlist = tableData
            print("< DEBUG! > no fieldlist supplied.")
        
        # hashid should always be included
        if "hashid" not in fieldlist:
            fieldlist.append("hashid")
            print("< DEBUG! > appended 'hashid' to list")

        for _name in itertools.izip(tableData):
            jsonName = _name[0][0].encode('ascii') # _name is a unicode string
#            jsonName = jsonName.replace('"','') # or it'll give "\""_name"\"" in JSON
            if jsonName not in fieldlist: 
                print("%s is not in fieldlist" % str(jsonName))
                continue
            if _name == "tablename": continue # forcefully added

            submap = { "type" :  es_coretypes.getType(_name[0][1]),
                "store" : "no",
                "index" : "not_analyzed",
            }
            mapping[jsonName] = submap

        

        newname = mapping_name.replace("/","_")
        print("Creating mapping: %s" % newname)
        if make_files:
            with open('jsonfiles/'+newname+'.json', 'w') as outfile:
                json.dump(mapping, outfile)
        else:
            #conn.indices.put_mapping(str(newname), {'properties':mapping}, [config.ESINDEX])
            print "NAME %s " % newname
            print "MAPPING: %s " % mapping
 
def fill_mapping(mapping_name=None, tablename=None):
    if not mapping_name:
        raise Exception("fill_mapping called without mapping_name")
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
        print("< ERROR! > MAPPING Config file not supplied or not configured correctly.")
        sys.exit(1)

    # section titles are also the mapping names
    mapname = mapconfig.sections()

    for name in mapname:
        if (mapconfig.has_option(name, 'modules')):
            modules = mapconfig.get(name, 'modules', 1)
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

def make_custom_mapping():
    """
    Uses the file 'include/custom_uforia_mapping.cfg' to create new mappings
    and fill them accordingly.

    """
    mapconfig = ConfigParser.SafeConfigParser()

    try:
        mapconfig.read('include/custom_uforia_mapping.cfg')
    except:
        print("< ERROR! > MAPPING Config file not supplied or not configured correctly.")
        sys.exit(1)

    mappings = mapconfig.sections()
    fields = None

    for name in mappings:

        # check for the database names
        if (mapconfig.has_option(name, 'modules')):
            modules = mapconfig.get(name, 'modules')
            json_acceptable_string = modules.replace("'", "\"")
            moduledict = json.loads(json_acceptable_string)

        else:
            raise Exception("< ERROR! > There is no 'modules' option in section %s !" % name)

        # check for list of fieldnames
        if(mapconfig.has_option(name, 'fields')):
            fields = mapconfig.get(name, 'fields')
            json_acceptable_string = fields.replace("'", "\"")
            fields = json.loads(json_acceptable_string)
        else:
            raise Exception("< ERROR! > There is no 'fields' option in section %s !" % name)

        tablelist = []
        for table in moduledict:
            tablelist.append(moduledict[table])
            #create_mapping(mapping_name=name, tablename=moduledict[table], fieldlist=fields)


        # send the list of tables and fields on to create_mapping
        #print tablelist
        create_mapping(mapping_name=name, tablename=tablelist, fieldlist=fields)



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
    parser.add_argument("--make-es-mappings", help="Will generate all mappings and send them directly into Elasticsearch.(does not use your custom file)", 
                        action="store_true")
    parser.add_argument("--test-run", help="Reads data from database and outputs it to stdout.",
                        action="store_true")
    parser.add_argument("--delete-index", help="Delete the index set in your config file. (Default is Uforia)", 
                        action="store_true")
    parser.add_argument("--all-modules-config", help="Create a config file with all mimetypes and their respective modules.",
                        action="store_true")
    parser.add_argument("--gen-fields", help="Use the mapping config from 'include/custom_uforia_mapping.cfg' to create a list of fields, added onto the same config.",
                        action="store_true")
    parser.add_argument("--make-custom-mapping", help="Uses the custom_uforia_mapping.cfg file to create mappings and fill them.", action="store_true")

    args = parser.parse_args()
    
    # if no arguments supplied, show the help
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

    elif args.all_modules_config:
        gen_all_modules_config()

    elif args.gen_fields:
        parse_mapping_config()

    elif args.make_custom_mapping:
        make_custom_mapping()
