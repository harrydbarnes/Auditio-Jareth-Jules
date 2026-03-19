import asar from '@electron/asar';
const files = asar.listPackage('release/linux-unpacked/resources/app.asar');
const mainPath = files.find(f => f.includes('main.tsx') || f.includes('main.js') && !f.includes('node_modules'));
console.log('mainPath', mainPath);
