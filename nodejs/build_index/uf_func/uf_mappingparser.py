import itertools, sys, ConfigParser
import uf_globals, es_coretypes
from pyes import *


def make_custom_mapping(fill=False,configfile='include/custom_uforia_mapping.cfg'):
    """
    Uses the file 'include/custom_uforia_mapping.cfg' to create new mappings
    and/or fill them accordingly.
    Fires fill_mapping() for each table in the configfile or just supplies a list
    if all it requires is to create a mapping.

    """
    mapconfig = ConfigParser.SafeConfigParser()
    print("< DEBUG! >Entering custom_mapping func")

    try:
        mapconfig.read(configfile)
    except:
        print("< ERROR! > MAPPING Config file not supplied or not configured correctly.")
        sys.exit(1)

    mappings = mapconfig.sections()
    fields = None
    #print("< DEBUG! > mapconfig %s" % mapconfig)
    #print("< DEBUG! > mappings %s" % mappings)

    for name in mappings:
        print("< DEBUG! > %s" %name)

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
            if fill:
                fill_mapping(mapping_name=name, tablename=moduledict[table], fieldlist=fields)
            else:
                tablelist.append(moduledict[table])


        # send the list of tables and fields on to create_mapping
        #print tablelist
        if not fill:
            create_mapping(mapping_name=name, tablename=tablelist, fieldlist=fields)

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
        conn = ES(uf_globals.config.ESSERVER)
        print("Retrieving table from database (this could take a little while).")
        try:
            tableData = uf_globals.db.read_table(_table=tablename, columnsonly=True) # onerow=True)
        except:
            tableData = uf_globals.db.read_table_list(_tablelist=tablename, columnsonly=True)
        #tableData = uf_globals.db.read_table(_table=tablename, columnsonly=True) # onerow=True)

        #columnNames = uf_globals.db.read_table(_table=tablename)
        mapping = {}

        if not tableData:
            print("No data returned for table ", tablename)
            return

        # if no list was supplied then every field is to be mapped
        # so fieldlist refers to columnNames to ensure iteration can continue
        if not fieldlist:
            fieldlist = tableData
            print("< DEBUG! > no fieldlist supplied.")
        
        # hashid should always be included
        if "hashid" not in fieldlist:
            fieldlist.append("hashid")
            print("< DEBUG! > appended 'hashid' to mapping")

        if "visualization_type" not in fieldlist:
            fieldlist.append("visualization_type")
            print("< DEBUG! > appended 'visualization_type' to mapping")

        for _name in itertools.izip(tableData):
            jsonName = _name[0][0].encode('ascii') # _name is a unicode string
#            jsonName = jsonName.replace('"','') # or it'll give "\""_name"\"" in JSON
            if jsonName not in fieldlist: 
                #print("%s is not in fieldlist" % str(jsonName))
                continue
            if _name == "tablename": continue # forcefully added

            submap = { "type" :  es_coretypes.getType(_name[0][1]),
                "store" : "no",
                "index" : "not_analyzed",
            }
            mapping[jsonName] = submap
            # make sure only new fields get added to the mapping
            fieldlist.remove(jsonName)

        # force add tablename to the mapping
        # required for the frontend so it knows which table to query
        submap = { "type" : "string",
                "store" : "no",
                "index" : "not_analyzed",}
        mapping["tablename"] = submap

        newname = mapping_name.replace("/","_")
        print("Creating mapping: %s" % newname)
        if make_files:
            with open('jsonfiles/'+newname+'.json', 'w') as outfile:
                json.dump(mapping, outfile)
        else:
            conn.indices.put_mapping(str(newname), {'properties':mapping}, [uf_globals.config.ESINDEX])
#            print "NAME %s " % newname
#            print "MAPPING: %s " % mapping
            print("Done.")
 
def fill_mapping(mapping_name=None, tablename=None, fieldlist=None):
    """
    fill_mapping() gets supplied a mapping_name from the config file
    tablename is the hash that doubles as the tablename, telling us which tables to query
    fieldlist contains every field the mapping will have, not all of them have to be filled

    return_dict here returns the queried data back as 'key : value' pairs allowing us
    to query for a value using the fieldlist.

    """
    if not mapping_name:
        raise Exception("fill_mapping called without a mapping_name")
    elif not tablename:
        raise Exception("fill_mapping called without a table")
    else:
        conn = ES([uf_globals.config.ESSERVER]) # ES(['']) is thrift ES('') is HTTP
        print("Retrieving table from database (this could take a little while).")
        tableData = uf_globals.db.read_table(_table=tablename, columnsonly=False, return_dict=True) # onerow=True)

        mapping = {}

        if not tableData:
            print("No data returned for table ", tablename)
            return

        # if no list was supplied then every field is to be mapped
        # so fieldlist refers to columnNames to ensure iteration can continue
        if not fieldlist:
            print("< ERROR! > no fieldlist supplied.")
            sys.exit(1)
        
        # hashid should always be included
        if "hashid" not in fieldlist:
            fieldlist.append("hashid")
            print("< DEBUG! > appended 'hashid' to list")

        if "tablename" not in fieldlist:
            fieldlist.append("tablename")
            print("< DEBUG! > appended 'tablename' to list")

        mapdata = {}
        skip = False

        for row,field in itertools.izip_longest(tableData,fieldlist):
            # for value,field in itertools.izip(row,fieldlist):
            # print "value %s" % value
            # We're using a dict cursor in mySQL
            # meaning we can use the fieldlist supplied from the config file
            # as a key to retrieve data from the dict SQL data
            try:
                mapdata[field] = row[field]
            except:
                # If the key does not exist, we continue anyway
                mapdata[field] = "NULL"
                #pass
       # put the dict with data into our index and mapping

        if mapdata["hashid"] == "NULL":
            skip = True

        if skip:
            #print("No hashid, skipping: %s" % (mapdata))
            return
        else:
            #print ("this would input into ES: %s " % (mapdata))
            #return
        
            try:
                conn.index(mapdata, uf_globals.config.ESINDEX, mapping_name)
                print("Successfully input data into mapping %s for index %s" % (mapping_name, uf_globals.config.ESINDEX))
            except:
                print("Unable to input data into mapping %s for index %s." % (mapping_name, uf_globals.config.ESINDEX))
