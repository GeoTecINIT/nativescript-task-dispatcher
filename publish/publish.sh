#!/bin/bash

if [ ! -v $NP_AUTH_TOKEN ]; then
    echo "registry=https://registry.npmjs.com/" >> ~/.npmrc
    echo "//registry.npmjs.com/:_authToken=$NPM_AUTH_TOKEN" >> ~/.npmrc
fi

PACK_DIR=package;

publish() {
    cd $PACK_DIR
    echo 'Publishing to npm...'
    npm publish *.tgz
}

./pack.sh && publish