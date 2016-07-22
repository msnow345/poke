#!/usr/bin/python
# -*- coding: utf-8 -*-
from pgoapi      import *

config = {
    'LOCALE': 'en',
    'LOCALES_DIR': 'locales',
    'ROOT_PATH': None,
    'ORIGINAL_LATITUDE': None,
    'ORIGINAL_LONGITUDE': None,
    'GMAPS_KEY': None
}

import requests.packages.urllib3
requests.packages.urllib3.disable_warnings()