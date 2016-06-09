Uforia-browser
==============

Installation
------------
In order to install the application you must run `npm install`. This will download all Node.js dependencies that are required by Uforia-browser. Subsequently you must run Uforia-browser's installation script by running `./bin/install`. This script will create a user with the administrator role. The credentials that you need in order to log in will be displayed if you run the script.

Recreate admin account
----------------------
If you forgot the credentials of your administrator account, you can run the installation script another time. The installation script will create a new administrator account if there exists no account with the following email address: "admin@example.com". If there exists an account with the email address then the password of that account will be reset.