from django.template import Context, loader
from django.http import HttpResponse
import json, urllib2
from urllib import unquote

def search(request):

    # debug logging, uncomment to enable
    #logging.basicConfig(filename='/var/www/elasticsearch/logs/search.log', level=logging.INFO)

    results_per_page = 120

    # calculate offset based on page number
    if request.method == 'GET' and 'p' in request.GET:
        p = int(request.GET['p'])
        if p > 0:
            query_offset = p * results_per_page
        else:
            query_offset = 0
    else:
        query_offset = 0

    # get the search query from the url
    if request.method == 'GET' and 'q' in request.GET:
        q = request.GET['q']
        q = unquote(q)
        if len(q) > 0:
            query_string = q
        else:
            query_string = '*'
    else:
        query_string = '*'

    # default json object for searching through zip files
    # this is temporary until we can get it to work dynamically
    json_data_for_request = {
            "from" : query_offset,
            "size" : results_per_page,
            "query" : {
                "filtered" : {
                    "query" : {
                        "query_string" : {
                            "query" : query_string
                        }
                    },
                    "filter" : {
                    }
                }
            },
            "facets" : {
                "zip_file_names" : {
                    "terms" : {
                        "field" : "files_names",
                    }
                },
                "zip_total_files" : {
                    "terms" : {
                        "field" : "total_files",
                    }
                },
                "zip_stored" : {
                    "terms" : {
                        "field" : "zip_stored",
                    }
                },
                "zip_deflated" : {
                    "terms" : {
                        "field" : "zip_deflated",
                    }
                },
                "zip_debug" : {
                    "terms" : {
                        "field" : "debug",
                    }
                },
                "zip_comment" : {
                    "terms" : {
                        "field" : "comment",
                    }
                },
                "zip_contentInfo" : {
                    "terms" : {
                        "field" : "contentInfo",
                    }
                },
            }

    }
    # json_dumps formats the data into JSON format
    uforia_json = json.dumps(json_data_for_request)
    # make a request, using the JSON data to the local elasticsearch host
    request = urllib2.Request('http://localhost:9200/uforia/zip/_search/',
                            uforia_json, {
                            'Content-Type' : 'application/json'
                            })
    reqinfo = request.get_full_url()
    # after getting a reply, read this
    result = urllib2.urlopen(request).read()

    # and then serve the results back to the nginx server via django
    return HttpResponse(result,content_type="application/json")


