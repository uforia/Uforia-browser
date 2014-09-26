import os,sys,pwd
import inspect

print pwd.getpwuid(os.getuid())[0]
print("home %s" % os.environ['HOME'])
print sys.prefix

pyes_libfolder =  os.path.realpath(os.path.abspath(os.path.join(os.path.split(inspect.getfile( inspect.currentframe() ))[0],"./libraries/pyes")))
if pyes_libfolder not in sys.path:
    sys.path.insert(0, pyes_libfolder)

from pyes import *
#
print "imported pyes"
print os.path.dirname(os.path.realpath(__file__))
