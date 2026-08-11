const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
let filesModified = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  // Match "dark:..." and remove it. Be careful about leading/trailing spaces.
  // We can just remove the word dark:[a-zA-Z0-9\-\/\[\]]+
  // A safer regex: \bdark:[^\s'"]+\s?
  const regex = /\s*dark:[a-zA-Z0-9\-\/\[\]\.]+/g;
  
  if (regex.test(content)) {
    const newContent = content.replace(regex, '');
    fs.writeFileSync(file, newContent, 'utf8');
    filesModified++;
    console.log(`Modified: ${file}`);
  }
});

console.log(`\nRemoved dark mode classes from ${filesModified} files.`);
