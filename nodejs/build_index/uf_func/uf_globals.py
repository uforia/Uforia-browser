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



import imp,os

def init():

    global config
    global database
    global db

    maindir = os.path.abspath(os.path.join(os.path.dirname(__file__),".."))

    config = imp.load_source('config', maindir + '/include/default_config.py')

    try:
        config = imp.load_source('config', maindir + '/include/config.py')
    except:
        print("< WARNING! > Config file not found in include / or not configured correctly, loading default config.")

    database = imp.load_source(config.DBTYPE, maindir + '/' + config.DATABASEDIR + config.DBTYPE + ".py")
    db = database.Database(config)
 
