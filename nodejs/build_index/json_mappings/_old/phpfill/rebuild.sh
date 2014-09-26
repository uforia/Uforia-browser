#!/bin/bash

curl -XDELETE http://localhost:9200/uforia/message_rfc822/_mapping && php fill_rfc822.php~HEAD
