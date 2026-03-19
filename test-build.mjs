import fs from 'fs';
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
pkg.build = {
  appId: "com.jareth.app",
  productName: "Jareth",
  directories: {
    output: "release"
  },
  files: [
    "dist/**/*",
    "electron/**/*",
    "package.json"
  ],
  win: {
    target: "nsis"
  }
};
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
