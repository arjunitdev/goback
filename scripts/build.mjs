// Deterministic build: node scripts/build.mjs <dev|store|test> [--zip]
import { build } from 'esbuild';
import { zipSync } from 'fflate';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const flavor = process.argv[2] ?? 'dev';
const wantZip = process.argv.includes('--zip');
if (!['dev', 'store', 'test'].includes(flavor)) throw new Error(`Unknown flavor: ${flavor}`);

const outDir = join(root, flavor === 'dev' ? 'dist' : `dist-${flavor}`);
const wordmark = flavor !== 'store';
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const src = (p) => join(root, 'src', p);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const common = {
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  legalComments: 'none',
  logLevel: 'warning',
  define: { __FLAVOR__: JSON.stringify(flavor), __WORDMARK__: String(wordmark) },
};

await build({
  ...common,
  entryPoints: {
    background: src('background/index.ts'),
    'content/early': src('content/early.ts'),
    'content/main': src('content/main.ts'),
    popup: src('popup/popup.ts'),
    options: src('options/options.ts'),
  },
  outdir: outDir,
});

// manifest.ts is TypeScript: bundle it in memory and import it.
const manifestBundle = await build({
  entryPoints: [src('manifest.ts')],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  logLevel: 'warning',
});
const manifestModule = await import(
  `data:text/javascript;base64,${Buffer.from(manifestBundle.outputFiles[0].text).toString('base64')}`
);
writeFileSync(
  join(outDir, 'manifest.json'),
  JSON.stringify(manifestModule.buildManifest(flavor, version), null, 2) + '\n',
);

// Styles: tokens + base + site rules, concatenated per site.
mkdirSync(join(outDir, 'styles'), { recursive: true });
const cat = (...files) => files.map((f) => readFileSync(src(f), 'utf8')).join('\n');
writeFileSync(
  join(outDir, 'styles/google.css'),
  cat('styles/tokens/google.tokens.css', 'styles/base/base.css', 'styles/google/google.css'),
);

// Pages and shared UI.
cpSync(src('popup/popup.html'), join(outDir, 'popup.html'));
cpSync(src('options/options.html'), join(outDir, 'options.html'));
cpSync(src('ui/ui.css'), join(outDir, 'ui.css'));
cpSync(src('assets/icons'), join(outDir, 'icons'), { recursive: true });

// Recreated wordmark: excluded from the store flavor (ADR-011).
if (wordmark) {
  mkdirSync(join(outDir, 'assets'), { recursive: true });
  cpSync(src('styles/google/wordmark.css'), join(outDir, 'styles/google-wordmark.css'));
  cpSync(src('assets/wordmarks/google-2012.svg'), join(outDir, 'assets/google-2012.svg'));
}

function listFiles(dir) {
  return readdirSync(dir)
    .sort()
    .flatMap((name) => {
      const full = join(dir, name);
      return statSync(full).isDirectory() ? listFiles(full) : [full];
    });
}

if (wantZip) {
  const files = {};
  for (const f of listFiles(outDir)) {
    files[relative(outDir, f).split('\\').join('/')] = [
      readFileSync(f),
      { mtime: new Date('1980-01-01T00:00:00Z') },
    ];
  }
  const zip = zipSync(files, { level: 9 });
  const name = join(root, `retroweb-2012-${flavor}-${version}.zip`);
  writeFileSync(name, zip);
  const sha = createHash('sha256').update(zip).digest('hex');
  writeFileSync(`${name}.sha256`, `${sha}  ${name.split(/[\\/]/).pop()}\n`);
  console.log(`zip: ${name}\nsha256: ${sha}`);
}

if (!existsSync(join(outDir, 'manifest.json'))) throw new Error('build produced no manifest');
console.log(`built ${flavor} -> ${relative(root, outDir)} (${listFiles(outDir).length} files)`);
