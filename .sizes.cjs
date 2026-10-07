const fs = require('fs');
const path = require('path');
function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name.startsWith('.') || ['node_modules', 'dist', '.next', '.wrangler', 'build', 'vendor', '.vinext', '.sites-runtime', '.openai'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(tsx?|css|mjs)$/.test(e.name)) {
      const n = fs.readFileSync(p, 'utf8').split('\n').length;
      console.log(String(n).padStart(6), p);
    }
  }
}
walk('.');
