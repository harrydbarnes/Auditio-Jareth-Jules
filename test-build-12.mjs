import asar from '@electron/asar';
import fs from 'fs';
const text = asar.extractFile('release/linux-unpacked/resources/app.asar', 'dist/index.html');
console.log(text.toString());
