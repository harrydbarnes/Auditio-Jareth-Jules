import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
console.log(JSON.stringify(pkg.build, null, 2));
