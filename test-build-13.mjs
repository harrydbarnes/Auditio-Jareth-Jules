import asar from '@electron/asar';
import fs from 'fs';
const text = asar.extractFile('release/linux-unpacked/resources/app.asar', 'dist/assets/index-Dhj2IIil.js');
console.log(text.toString().substring(0, 500));
console.log("react is in bundle:", text.toString().includes('react'));
