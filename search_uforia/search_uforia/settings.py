"""
Django settings for search_uforia project.

For more information on this file, see
https://docs.djangoproject.com/en/1.6/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.6/ref/settings/
"""

# Build paths inside the project like this: os.path.join(BASE_DIR, ...)
import os, sys

# Because we want to upload this file safely into github without turning it into a security hole
# We're leaving most details here blank.

TEMPLATE_DEBUG = DEBUG = False

WWW_PATH         = ''
DBASE_DIR        = ''
TEMPLATE_DIRS    = ''
STATIC_URL       = ''
MEDIA_URL        = ''
STATIC_ROOT      = ''
MEDIA_ROOT       = ''
ROOT_URLCONF     = ''
WSGI_APPLICATION = ''


DATABASES = {
    'default': {
        'ENGINE': '',
        'NAME': '',
        'USER': '',
        'PASSWORD': '',
        'HOST': '',
        'PORT': '',
    }
}
SECRET_KEY      = ''

ALLOWED_HOSTS = []

# Internationalization
# https://docs.djangoproject.com/en/1.6/topics/i18n/

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'

# If you set this to False, Django will make some optimizations so as not
# to load the internationalization machinery.
USE_I18N = True

# If you set this to False, Django will not format dates, numbers and
# calendars according to the current locale
USE_L10N = True

USE_TZ = True

# Application definition

INSTALLED_APPS = (
# Uncomment the next line to enable admin:
#    'django.contrib.admin',
# Uncomment the next line to enable admin documentation:
#    'django.contrib.admindocs',

    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # this is the mockup for searching the uforia db
    # 'searchDB',
    'uforia_demo',

)

MIDDLEWARE_CLASSES = (
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
)

# Load the variables from a local file with tight(er) permissions:

from os.path import expanduser
execfile(expanduser('/var/www/elasticsearch/src/search_uforia/search_uforia/local_settings.py'))

