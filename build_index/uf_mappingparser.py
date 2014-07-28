

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
        conn = ES(config.ESSERVER)
        print("Retrieving table from database (this could take a little while).")
        try:
            tableData = db.read_table(_table=tablename, columnsonly=True) # onerow=True)
        except:
            tableData = db.read_table_list(_tablelist=tablename, columnsonly=True)
        #tableData = db.read_table(_table=tablename, columnsonly=True) # onerow=True)

        #columnNames = db.read_table(_table=tablename)
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
            print("< DEBUG! > appended 'hashid' to list")

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
        mapping["tablename"]

        newname = mapping_name.replace("/","_")
        print("Creating mapping: %s" % newname)
        if make_files:
            with open('jsonfiles/'+newname+'.json', 'w') as outfile:
                json.dump(mapping, outfile)
        else:
            #conn.indices.put_mapping(str(newname), {'properties':mapping}, [config.ESINDEX])
            print "NAME %s " % newname
            print "MAPPING: %s " % mapping
 
def fill_mapping(mapping_name=None, tablename=None):
    if not mapping_name:
        raise Exception("fill_mapping called without mapping_name")
    elif not tablename:
        raise Exception("fill_mapping called without a table")
    else:
        #conn = ES('127.0.0.1:9200') # Use HTTP
        tableData = db.read_table(_table=tablename, columnsonly=False)
        columnNames = db.read_table(_table=tablename)
        #columnNames = json.dumps(c)


