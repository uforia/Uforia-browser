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


import sys, json, ConfigParser
from ast import literal_eval
import uf_globals

class mdict(dict):

    def __setitem__(self, key, value):
        """add the given value to the list of values for this key"""
        self.setdefault(key, []).append(value)


def parse_mapping_config(configfile="include/custom_uforia_mapping.cfg"):
    """
    What it'll do is add a 'fields' option to the configuration file.
    It grabs all the fields for each module within the config file, removes doubles
    and writes it to a list.

    """
    mapconfig = ConfigParser.SafeConfigParser()

    try:
        mapconfig.read(configfile)
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
                columns = uf_globals.db.read_table(_table=moduledict[key]) # returns columns only by default
                fields.append([x[0].encode('ascii') for x in columns]) # mysql returns it in unicode format which we don't want
            
            # merge the lists
            fields = [item for sublist in fields for item in sublist]
            fields = list(set(fields)) # remove duplications
        #write to new option    
        mapconfig.set(name, "fields", str(fields))

        with open('include/custom_uforia_mapping.cfg', 'wb') as configfile:
            mapconfig.write(configfile)

        print("Successfully added 'fields' option to the config file for %s" % name)

def gen_admin_config():
    """
    The admin config file is in full JSON format.

    """
    supmimetable = uf_globals.db.read_table(_table="supported_mimetypes", columnsonly=False)

#    mainkey = 'modules'
    ml = {}
    configarray = []
#    ml[mainkey] = {}

    for line in supmimetable:
        mimetype = line[0]
        tables_dict = literal_eval(line[1])

        mimetype = mimetype.replace("/","_")
        ml['name'] = mimetype.encode('ascii')
        ml['modules'] = tables_dict

        #print ml
        #sys.exit(0)

        fields = []

        for table in tables_dict:
            columns = uf_globals.db.read_table(_table=tables_dict[table]) # returns columns only by default
            fields.append([x[0].encode('ascii') for x in columns]) # mysql returns it in unicode format which we don't want
        
        # merge the lists
        fields = [item for sublist in fields for item in sublist]
        fields = list(set(fields)) # remove duplications

        ml['fields'] = fields 
        configarray.append(ml)


    with open('include/uforia_admin.cfg', 'wb') as outfile:
       json.dump(configarray, outfile, indent=4, sort_keys=True)

    print("File intluce/uforia_admin.cfg has been successfully created.")


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

    supmimetable = uf_globals.db.read_table(_table="supported_mimetypes", columnsonly=False)
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


