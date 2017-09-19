Uforia-browser
==============

Requirements
------------
Please note that the Uforia-browser currently supports only up to ElasticSearch 2.4.x. ElasticSearch 5.x or higher will NOT work!

Installation
------------
In order to install the application you must run `npm install`. This will download all Node.js dependencies that are required by Uforia-browser. After the `npm install`, run `curl -X PUT localhost:9200/uforia` to create the Uforia default indedx. Subsequently you must run Uforia-browser's installation script by running `./bin/install`. This script will create a user with the administrator role. The credentials that you need in order to log in will be displayed if you run the script.

Recreate admin account
----------------------
If you forgot the credentials of your administrator account, you can run the installation script another time. The installation script will create a new administrator account if there exists no account with the following email address: "admin@example.com". If there exists an account with the email address then the password of that account will be reset.
