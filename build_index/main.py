#!/usr/bin/env python

# Copyright (C) 2014 Hogeschool van Amsterdam

import os, sys, imp, inspect

# add pyes from the libraries subfolder
# this will also force python to use the included module instead of the ones installed on the system
pyes_libfolder =  os.path.realpath(os.path.abspath(os.path.join(os.path.split(inspect.getfile( inspect.currentframe() ))[0],"./libraries/pyes/src")))
if pyes_libfolder not in sys.path:
    print pyes_libfolder
    sys.path.insert(0, pyes_libfolder)
    print sys.path

from pyes import *
# PyES - Python Elastic Search
# https://pyes.readthedocs.org/en/latest/

config = imp.load_source('config', 'include/default_config.py')

try:
    config = imp.load_source('config', 'include/config.py')
except:
    print("< WARNING! > Config file not found in include/ or not configured correctly, loading default config.")

database = imp.load_source(config.DBTYPE, config.DATABASEDIR + config.DBTYPE + ".py")

def read_data():
    """
    Runs the functions from the database and prints the data to stdout.
    Used as a means to confirm things are working as they should be (for now).

    """
    
    db = database.Database(config)
    
    print("\nReading the mimetypes table:\n")
    print(db.read_mimetypes()) # print the modules column first
    print(db.read_mimetypes(column="mime_type"))

    print("\nReading the files table:\n")
    print(db.read_filestable()) # just print the column names, files is table rather large

def populate_files_index(_index, jsondata):
    """
    Creates (or fills if it exists) the elasticsearch index

    """
    db = database.Database(config)

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

if __name__ == "__main__":
    #read_data()
    populate_files_index("a", "a")
