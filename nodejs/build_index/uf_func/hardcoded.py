#!/usr/bin/env python

# Copyright (C) 2013 Hogeschool van Amsterdam

# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.

# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.

import uf_globals

def populate_files_mapping():
    """
    
    Creates (or fills if it exists) the 'files' mapping table.
    This is currently harcoded for convenience but filling the files table
    using the config file should also be possible.

    """
    if(not config.ESINDEX):
        raise Exception("The config file supplied no index!")
    else:
        _filestable = uf_globals.db.read_filestable(_all=True)
        # hashid, fullpath, name, size, owner, group, perm, mtime, 
        # atime, ctime, md5, sha1, sha256, ftype, mtype, btype

        # Only ones interesting at this time are:
        # name, size, owner, mtype, mtime, atime and ctime.
        filesdict = {}

        for row in _filestable:
            filesdict["hashid"]   = row[0]
            filesdict["fullpath"] = row[1]
            filesdict["name"]     = row[2]
            filesdict["size"]     = row[3]
            filesdict["owner"]    = row[4]
            filesdict["group"]    = row[5]
            filesdict["perm"]     = row[6]
            filesdict["mtime"]    = row[7]
            filesdict["atime"]    = row[8]
            filesdict["ctime"]    = row[9]
            filesdict["md5"]      = row[10]
            filesdict["sha1"]     = row[11]
            filesdict["sha256"]   = row[12]
            filesdict["ftype"]    = row[13]
            filesdict["mtype"]    = row[14]
            filesdict["btype"]    = row[15]

            #print ("name: ", name)
            #print ("size: ", size)
            #print ("owner: ", owner)
            #print ("mtype: ", mtype)
            #print ("mtime: ", mtime)

            conn.index(filesdict, uf_globals.config.ESINDEX, "files")
