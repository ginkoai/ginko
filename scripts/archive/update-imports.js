const fs = require('fs');
const path = require('path');
const glob = require('glob');

const updates = [
  { from: /from ['"]\.\.\/\.\.\/\.\.\/mcp-server\/dist\//g, to: "from '@ginko/mcp-server/" },
  { from: /from ['"]\.\.\/mcp-server\/dist\//g, to: "from '@ginko/mcp-server/" },
  { from: /from ['"]\.\.\/src\//g, to: "from '@ginko/mcp-server/" },
];

const files = glob.sync('packages/api/**/*.ts');
console.log(`Found ${files.length} TypeScript files to update`);

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  updates.forEach(({ from, to }) => {
    if (from.test(content)) {
      content = content.replace(from, to);
      updated = true;
    }
  });
  
  if (updated) {
    fs.writeFileSync(file, content);
    console.log(`✅ Updated: ${file}`);
  }
});

// Also update to use shared package
const sharedImport = "import { validateEnv } from '@ginko/shared';\n";
const utilsFile = 'packages/api/_utils.ts';
if (fs.existsSync(utilsFile)) {
  let content = fs.readFileSync(utilsFile, 'utf8');
  if (!content.includes('@ginko/shared')) {
    content = sharedImport + content;
    fs.writeFileSync(utilsFile, content);
    console.log(`✅ Added shared import to ${utilsFile}`);
  }
}