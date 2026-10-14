// Bundles the hub (with `ws`) into one file, dist/threebrain-hub.mjs, and
// writes the licenses of the bundled packages next to it, as the viewer
// bundle does
import { build } from 'esbuild';
import { readFileSync, writeFileSync } from 'node:fs';

await build({
  entryPoints: ['src/cli.js'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node18',
  outfile: 'dist/threebrain-hub.mjs',
  // optional native speed-ups that `ws` loads inside try/catch
  external: ['bufferutil', 'utf-8-validate'],
  // `ws` is CommonJS and calls require() on Node built-ins; an ES module has
  // no require of its own
  banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  logLevel: 'info',
});

const bundled = ['ws'];
const notices = bundled.map((name) => {
  const { version, homepage } = JSON.parse(readFileSync(`node_modules/${name}/package.json`, 'utf8'));
  return `${name} ${version} (${homepage})\n\n${readFileSync(`node_modules/${name}/LICENSE`, 'utf8').trim()}\n`;
});
writeFileSync('dist/threebrain-hub.mjs.LICENSE.txt',
  `threebrain-hub.mjs includes the following packages:\n\n${notices.join('\n')}`);
