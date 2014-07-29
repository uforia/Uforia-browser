#!/usr/bin/python

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


