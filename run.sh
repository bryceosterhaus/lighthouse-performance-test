#!/bin/bash

# Setup temp directory
rm -rf ./tmp
mkdir tmp

# Download and unzip bundle
wget -O "./tmp/bundle.zip" "https://releases-cdn.liferay.com/portal/snapshot-master-private/latest/liferay-portal-tomcat-master-private.zip"
unzip -o "./tmp/bundle.zip" -d "./tmp"

# Add custom portal.properties
cp "./resources/portal-ext.properties" "./tmp/liferay-portal-master-private"

# Start tomcat
bash ./tmp/liferay-portal-master-private/tomcat-9.0.68/bin/startup.sh

# Wait a little bit for startup
sleep 100

# Run tests
node ./lighthouse/index.js

# Teardown
bash ./tmp/liferay-portal-master-private/tomcat-9.0.68/bin/shutdown.sh