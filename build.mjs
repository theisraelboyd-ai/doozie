// Builds docs/index.html: one self-contained file (three.js + game) for GitHub Pages.
// Usage: node build.mjs
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';

const src = readdirSync('src').filter(f => f.endsWith('.js')).sort();
const game = "(() => {\n'use strict';\nconst T = THREE;\n" +
  src.map(f => `// ===== src/${f} =====\n` + readFileSync(`src/${f}`, 'utf8')).join('\n') +
  '\n})();\n';
const three = readFileSync('vendor/three-bundle.min.js', 'utf8');
const net = readFileSync('vendor/net-bundle.min.js', 'utf8');
const html = readFileSync('index.template.html', 'utf8')
  .replace('<script>/*THREE*/</script>', () => `<script>${three}</script>`)
  .replace('<script>/*NET*/</script>', () => `<script>${net}</script>`)
  .replace('<script>/*GAME*/</script>', () => `<script>${game}</script>`);
mkdirSync('docs', { recursive: true });
writeFileSync('docs/index.html', html);
console.log(`Built docs/index.html (${(html.length / 1024).toFixed(0)} KB) from ${src.length} source files`);
