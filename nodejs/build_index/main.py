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


import os, sys, imp, inspect
import json, time
import itertools
import ConfigParser, argparse
from ast import literal_eval

# add pyes from the libraries subfolder
# this will also force python to use the included module instead of the ones installed on the system
pyes_libfolder =  os.path.realpath(os.path.abspath(os.path.join(os.path.split(inspect.getfile( inspect.currentframe() ))[0],"./libraries/pyes")))
if pyes_libfolder not in sys.path:
    sys.path.insert(0, pyes_libfolder)

from pyes import *
# PyES - Python Elastic Search
# https://pyes.readthedocs.org/en/latest/


#custom files
import build_tests

# from uf_func folder
from uf_func import hardcoded
from uf_func import es_coretypes
from uf_func import uf_mappingparser as ufm
from uf_func import uf_configparser as ufc
from uf_func import uf_globals
from uf_func import uf_admin as ufa

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


      
if __name__ == "__main__":
    #read_data()
    #populate_files_mapping("a", "a")
    #generate_table_list()
    #parse_mapping_config()
    #generate_conf_file()

    parser = argparse.ArgumentParser(description='Interface between Elasticsearch and Uforia.')
    
    parser.add_argument("--make-map-files", help="When set this will create JSON mapping files INSTEAD of sending them to Elasticsearch.",
                        action="store_true")
    parser.add_argument("--make-es-mappings", help="Will generate all mappings and send them directly into Elasticsearch.(does not use your custom file)", 
                        action="store_true")
#    parser.add_argument("--test-run", help="Reads data from database and outputs it to stdout.",
#                        action="store_true")
    parser.add_argument("--delete-index", help="Delete the index set in your config file. (Default is Uforia)", 
                        action="store_true")
    parser.add_argument("--all-modules-config", help="Create a config file with all mimetypes and their respective modules.",
                        action="store_true")
    parser.add_argument("--gen-fields", help="Use the mapping config from 'include/custom_uforia_mapping.cfg' to create a list of fields, added onto the same config.",
                        action="store_true")
    parser.add_argument("--make-custom-mapping", help="Uses the custom_uforia_mapping.cfg file to create mappings.", action="store_true")
    parser.add_argument("--fill-custom-mapping", help="Uses the custom_uforia_mapping.cfg file to fill mappings.", action="store_true")
    parser.add_argument("--fill-files", help="Uses the hardcoded format of the files table to fill it.", action="store_true")
    parser.add_argument("--gen-admin-file", help="Generates a new file for use by the front-end admin interface.", action="store_true")
    parser.add_argument("--parse-admin-file", help="Uses the file admin_output/uforia_admin_output.cfg to make mappings.", action="store_true")

    args = parser.parse_args()
    
    # if no arguments supplied, show the help
    if len(sys.argv)==1:
        parser.print_help()
        sys.exit(1)

    uf_globals.init() # calls global config / db loading

    if args.make_map_files:
        generate_table_list( _files = True )

    elif args.make_es_mappings:
        generate_table_list()

#    elif args.test_run:
#        build_tests.read_data()

    elif args.delete_index:
        del_index()

    elif args.all_modules_config:
        ufc.gen_all_modules_config()

    elif args.gen_fields:
        ufc.parse_mapping_config()

    elif args.make_custom_mapping:
        ufm.make_custom_mapping()

    elif args.fill_files:
        hardcoded.populate_files_mapping()

    elif args.fill_custom_mapping:
        ufm.make_custom_mapping(fill = True)

    elif args.gen_admin_file:
        ufc.gen_admin_config()

    elif args.parse_admin_file:
        #time.sleep(5) # nodejs async, temp fix
        #print("< DEBUG! >Starting custom_mapping function")
        ufm.make_custom_mapping(configfile="build_index/admin_output/uforia_admin_output.cfg")
