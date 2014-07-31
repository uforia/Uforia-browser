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

import uf_globals
from ast import literal_eval
import json

def parse_admin_config():
    """
    The admin config file is in full JSON format.

    """
    supmimetable = uf_globals.db.read_table(_table="supported_mimetypes", columnsonly=False)

#    mainkey = 'modules'

    configarray = []
#    ml[mainkey] = {}

    for line in supmimetable:
        ml = {}
       # print line
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


