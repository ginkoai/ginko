const fs = require('fs');
const glob = require('glob');

const files = glob.sync('api/**/*.ts');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let updated = false;
  
  // Update @ginko/mcp-server imports
  if (content.includes('@ginko/mcp-server')) {
    content = content.replace(
      /@ginko\/mcp-server\/([\w-]+)\.js/g,
      '../packages/mcp-server/dist/$1.js'
    );
    updated = true;
  }
  
  // Update @ginko/shared imports (already done in _utils.ts)
  if (content.includes('@ginko/shared')) {
    content = content.replace(
      /@ginko\/shared/g,
      '../packages/shared/dist/index.js'
    );
    updated = true;
  }
  
  if (updated) {
    fs.writeFileSync(file, content);
    console.log(`✅ Updated: ${file}`);
  }
});

console.log('Done updating imports!');