import asar from '@electron/asar';
const files = asar.listPackage('release/linux-unpacked/resources/app.asar');
console.log(files.find(f => f.includes('index.html')));
