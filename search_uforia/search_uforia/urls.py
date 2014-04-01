#
# See https://docs.djangoproject.com/en/1.6/topics/http/urls/
# for more information on url configs in Django.
#

from django.conf.urls import patterns, url
from searchDB import views
from django.conf import settings

urlpatterns = patterns('searchDB.views',
                       url(r'^elasticsearch/$', 'index'),
                       url(r'^elasticsearch/search/$', 'search'),
                       url(r'^elasticsearch/facets/$', 'facets'),
                       url(r'^elasticsearch/message/$', 'view_message'),
                      )
# this'll allow access to the static directory and its contents
urlpatterns += patterns('',
                        url(r'^elasticsearch/static/(?P<path>.*)$', 'django.views.static.serve',
                        {'document_root': settings.STATIC_ROOT} ),
                       )
 
