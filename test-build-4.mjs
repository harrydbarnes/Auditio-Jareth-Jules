import fs from 'fs';
const text = fs.readFileSync('dist/index.html', 'utf8');
console.log(text);
