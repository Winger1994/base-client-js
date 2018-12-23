#!/bin/bash

pushd .
<<<<<<< HEAD
npm install
# node remove-bitcore-lib-dep.js
npm run preBuild
npm run build

#cp ./dist/Base.js* example/public/base-lib/base/
#cp ./dist/Base.js* ./widget
#cp -rf ./dist/src/* example/public/base-lib/@types/base/

cp ./src/repository/offer/Purchase.json ./dist/src/repository/offer/
cp ./dist/Bitclave-Base.js* example/public/base-lib/bitclave-base/
#cp ./dist/Bitclave-Base.js* ./widget
cp -rf ./dist/src/* example/public/base-lib/@types/bitclave-base/
mv ./example/public/base-lib/@types/bitclave-base/Base.d.ts ./example/public/base-lib/@types/bitclave-base/index.d.ts
cd example/

cp -rf public/base-lib/* node_modules/
node ../remove-bitcore-lib-dep.js
=======
# cleanup lib folder
rm -rf ./lib/*
rm -rf dist
rm -rf example/public

npm install       #postinstall: node remove-bitcore-lib-dep.js
npm run preBuild  #tsc --outDir dist -d
npm run build     # webpack

mkdir -p example/public/base-lib/bitclave-base
mkdir -p example/public/base-lib/@types/bitclave-base


cp ./dist/Bitclave-Base.js* example/public/base-lib/bitclave-base
cp -R ./dist/lib/* example/public/base-lib/@types/bitclave-base
mv ./example/public/base-lib/@types/bitclave-base/Base.d.ts ./example/public/base-lib/@types/bitclave-base/index.d.ts
cp example/package.json example/public/base-lib/bitclave-base/

cd base-client-js-bundle && make build && cd ..

cp -R ./dist/docs ./lib
cp -R ./base-client-js-bundle/dist/BitclaveBase.* ./lib

rm -rf example/public

echo base-client-js is ready for publishing

>>>>>>> 6790ea3592901c065c2fd6a39daca1b4346d43f5
popd
