from django.template import Context, loader
from django.http import HttpResponse
import json, urllib2
from urllib import unquote

def facets(request):
    if request.method == 'GET' and 'type' in request.GET and 'value' in request.GET:
        type = request.GET['type']
        value = request.GET['value']

        # set facet order count if value is empty
        order = 'term'
        if len(value) == 0:
            order = 'count'

        # Get facets for specific type.
        if type == 'zip_file_names':
            json_data_for_request = {
                "facets" : {
                    "zip_file_names" : {
                        "terms" : {
                            "field" : "files_names",
                        }
                    }
                }
            }
        elif type == 'zip_total_files':
            json_data_for_request = {
                "facets" : {
                    "zip_total_files" : {
                        "terms" : {
                            "field" : "total_files",
                        }
                    }
                }
            }
        elif type == 'zip_stored':
            json_data_for_request = {
                "facets" : {
                    "zip_stored" : {
                        "terms" : {
                            "field" : "zip_stored",
                        }
                    }
                }
            }
        elif type == 'zip_deflated':
            json_data_for_request = {
                "facets" : {
                    "zip_deflated" : {
                        "terms" : {
                            "field" : "zip_deflated",
                        }
                    }
                }
            }
        elif type == 'zip_debug':
            json_data_for_request = {
                "facets" : {
                    "zip_debug" : {
                        "terms" : {
                            "field" : "debug",
                        }
                    }
                }
            }
        elif type == 'zip_comment':
            json_data_for_request = {
                "facets" : {
                    "zip_comment" : {
                        "terms" : {
                            "field" : "comment",
                        }
                    }
                }
            }
        elif type == 'zip_contentInfo':
            json_data_for_request = {
                "facets" : {
                    "zip_contentInfo" : {
                        "terms" : {
                            "field" : "contentInfo",
                        }
                    }
                }
            }

        # Send request to the ElasticSearch server.
        request = urllib2.Request(
                          'http://localhost:9200/uforia/zip/_search/',
                          json.dumps(json_data_for_request), {
                                  'Content-Type' : 'application/json'
                          })
        result = urllib2.urlopen(request).read()

        # Stuur het resultaat terug naar de browser.
        return HttpResponse(result, content_type="application/json")
    else:
        return HttpResponse()    


