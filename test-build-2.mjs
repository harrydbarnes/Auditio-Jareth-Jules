import asar from '@electron/asar';
import fs from 'fs';
const files = asar.listPackage('release/linux-unpacked/resources/app.asar');
console.log(files.filter(f => f.startsWith('/dist/')).length);
