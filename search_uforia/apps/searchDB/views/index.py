#from django.shortcuts import render
from django.template import Context, loader
from django.http import HttpResponse
import json, urllib2
from urllib import unquote

# import logging
# Template dir is /var/www/elasticsearch/src/search_uforia/templates/
# this is where get_template will look for the specified file(s).


# the other views are in seperate files

def index(request):
    template = loader.get_template('index.html')
    context = Context({})
    return HttpResponse(template.render(context))

