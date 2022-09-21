#!/bin/bash

# Download and unzip bundle
wget -O "./tmp/bundle.zip" "https://releases-cdn.liferay.com/portal/snapshot-master-private/latest/liferay-portal-tomcat-master-private.zip"
unzip "./tmp/bundle.zip" -d "./tmp"

# Add custom portal.properties
cp "./resources/portal-ext.properties" "./tmp/liferay-portal-master-private"

# Start tomcat
bash ./tmp/liferay-portal-master-private/tomcat-9.0.56/bin/startup.sh

# Run tests
node ./lighthouse/index.js

# Teardown
bash ./tmp/liferay-portal-master-private/tomcat-9.0.56/bin/shutdown.sh
rm -rf ./tmp