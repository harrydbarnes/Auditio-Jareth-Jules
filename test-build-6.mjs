import fs from 'fs';
const text = fs.readFileSync('dist/assets/index-Dhj2IIil.js', 'utf8');
console.log(text.substring(0, 1000));
console.log('Includes document.getElementById("root"):', text.includes('document.getElementById("root")'));
console.log('Includes document.getElementById("root"):', text.includes('document.getElementById('));
