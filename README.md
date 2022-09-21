# lighthouse-performance-test

### Running tests

```sh
yarn install

yarn start
```

### What does it do?

1. Runs a web server to see results of lighthouse scores
2. Runs a cron job to test DXP bundle with lighthouse
    - Downloads latest bundle
    - Unzips bundle
    - Copies over portal-ext.properties
    - Runs bundle
    - Runs lighthouse audit for both desktop and mobile
    - Writes results
    - Stops bundle
    - Removes the downloaded bundle and the unzipped bundle
