#!/bin/bash

CWD=$(pwd)
PYDIR="$CWD/build_index"

nohup /usr/bin/python $PYDIR/main.py --parse-admin-file 2>> $PYDIR/admin_output/error.log >> $PYDIR/admin_output/output.log &
