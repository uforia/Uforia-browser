#!/usr/bin/env python

# Copyright (C) 2014 Hogeschool van Amsterdam

import os,sys,imp

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

def populate_index(_index, jsondata):
    """
    Creates (or fills if it exists) the elasticsearch index

    """
    if(_index):
        raise Exception("The _index in populate_index is empty!")
    if(jsondata is empty):
        raise Exception("populate_index is being called without any json to fill the index! Sure this is correct? You can fill this manually")
    else:
       print ("Unfinished") 


if __name__ == "__main__":
    read_data()    
