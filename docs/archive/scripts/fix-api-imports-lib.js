const fs = require('fs');
const glob = require('glob');

const files = glob.sync('api/**/*.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  // Update ../packages/mcp-server/dist/ imports to ./_lib/
  if (content.includes('../packages/mcp-server/dist/')) {
    content = content.replace(
      /\.\.\/packages\/mcp-server\/dist\//g,
      './_lib/'
    );
    updated = true;
  }
  
  // Update ../packages/shared/dist/ imports to ./_lib/
  if (content.includes('../packages/shared/dist/')) {
    content = content.replace(
      /\.\.\/packages\/shared\/dist\//g,
      './_lib/'
    );
    updated = true;
  }
  
  // Fix nested paths
  content = content.replace(/\.\.\/\/_lib\//g, '../_lib/');
  content = content.replace(/\.\.\/\.\.\/\/_lib\//g, '../../_lib/');
  
  if (updated) {
    fs.writeFileSync(file, content);
    console.log(`✅ Updated: ${file}`);
  }
});

console.log('Done updating imports to use _lib!');