#!/usr/bin/python

import uf_globals

def read_data():
    """
    
    Runs the functions from the database and prints the data to stdout.
    Used as a means to confirm things are working as they should be (for now).

    """
    
   # db = database.Database(config)
    
    print("\nReading the mimetypes table:\n")
    print(uf_globals.db.read_mimetypes()) # print the modules column first
    print(uf_globals.db.read_mimetypes(column="mime_type"))

    print("\nReading the files table:\n")
    print(uf_globals.db.read_filestable()) # just print the column names, files is table rather large


