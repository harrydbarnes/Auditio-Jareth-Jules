const asar = require('@electron/asar');
console.log(asar.listPackage('release/linux-unpacked/resources/app.asar').includes('/dist/index.html'));
