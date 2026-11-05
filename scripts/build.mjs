// Deterministic build: node scripts/build.mjs <dev|store|test|release> [--zip]
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
import { PNG } from 'pngjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const flavor = process.argv[2] ?? 'dev';
const wantZip = process.argv.includes('--zip');
if (!['dev', 'store', 'test', 'release'].includes(flavor)) throw new Error(`Unknown flavor: ${flavor}`);

const outDir = join(root, flavor === 'dev' ? 'dist' : `dist-${flavor}`);
const wordmark = flavor !== 'store';
const version = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const src = (p) => join(root, 'src', p);

// PRIVATE assets (archive-derived, git-ignored) are for the user's own machine only.
// They are never read for the store flavor, so a store build cannot contain them.
const privYoutube = join(root, 'src', 'assets', 'private', 'youtube');
const youtubePrivate =
  flavor !== 'store' &&
  existsSync(join(privYoutube, 'sprite.png')) &&
  existsSync(join(privYoutube, 'bg.png'));

const privGoogle = join(root, 'src', 'assets', 'private', 'google');
const googlePrivate = flavor !== 'store' && existsSync(join(privGoogle, 'logo.png'));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

const common = {
  bundle: true,
  format: 'iife',
  target: 'chrome120',
  legalComments: 'none',
  logLevel: 'warning',
  define: {
    __FLAVOR__: JSON.stringify(flavor),
    __WORDMARK__: String(wordmark),
    __YT_PRIVATE__: String(youtubePrivate),
    __G_PRIVATE__: String(googlePrivate),
    __FAST_RETRIES__: String(flavor === 'test' && process.argv.includes('--fast')),
  },
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
  JSON.stringify(manifestModule.buildManifest(flavor, version, { youtubePrivate, googlePrivate }), null, 2) + '\n',
);

// Styles: tokens + base + site rules, concatenated per implemented site.
const sites = manifestModule.IMPLEMENTED_SITES;
mkdirSync(join(outDir, 'styles'), { recursive: true });
const cat = (...files) => files.map((f) => readFileSync(src(f), 'utf8')).join('\n');
for (const site of sites) {
  // Optional generated light-theme pin (YouTube, Google); see scripts/gen-*-theme.mjs.
  const generated = `styles/${site}/theme-light.generated.css`;
  writeFileSync(
    join(outDir, `styles/${site}.css`),
    cat(
      `styles/tokens/${site}.tokens.css`,
      'styles/base/base.css',
      `styles/${site}/${site}.css`,
      ...(existsSync(src(generated)) ? [generated] : []),
    ),
  );
}

// Pages and shared UI.
cpSync(src('popup/popup.html'), join(outDir, 'popup.html'));
cpSync(src('options/options.html'), join(outDir, 'options.html'));
cpSync(src('ui/ui.css'), join(outDir, 'ui.css'));
cpSync(src('assets/icons'), join(outDir, 'icons'), { recursive: true });

// Recreated wordmark: excluded from the store flavor (ADR-011).
if (wordmark) {
  mkdirSync(join(outDir, 'assets'), { recursive: true });
  for (const site of sites) {
    cpSync(src(`styles/${site}/wordmark.css`), join(outDir, `styles/${site}-wordmark.css`));
    cpSync(src(`assets/wordmarks/${site}-2012.svg`), join(outDir, `assets/${site}-2012.svg`));
  }
}

// Private YouTube assets: crop what the stylesheet needs out of the sprite sheet.
if (youtubePrivate) {
  const outAssets = join(outDir, 'assets', 'youtube-private');
  mkdirSync(outAssets, { recursive: true });
  const sprite = PNG.sync.read(readFileSync(join(privYoutube, 'sprite.png')));
  const crop = (name, x, y, w, h) => {
    if (x + w > sprite.width || y + h > sprite.height) {
      throw new Error(
        `crop ${name} (${x},${y} ${w}x${h}) is outside the ${sprite.width}x${sprite.height} sprite`,
      );
    }
    const out = new PNG({ width: w, height: h });
    PNG.bitblt(sprite, out, x, y, w, h, 0, 0);
    writeFileSync(join(outAssets, name), PNG.sync.write(out));
  };
  // Offsets are the background-positions from the archived 2012 stylesheet (docs/evidence).
  crop('logo.png', 114, 146, 100, 40); // #logo
  crop('search.png', 163, 102, 14, 14); // search button magnifier
  cpSync(join(privYoutube, 'bg.png'), join(outAssets, 'bg.png'));
  cpSync(src('styles/youtube/private.css'), join(outDir, 'styles/youtube-private.css'));
}

// Private Google asset: the March-2013 home logo (275x95), used by styles/google/private.css.
if (googlePrivate) {
  const outAssets = join(outDir, 'assets', 'google-private');
  mkdirSync(outAssets, { recursive: true });
  cpSync(join(privGoogle, 'logo.png'), join(outAssets, 'logo.png'));
  cpSync(src('styles/google/private.css'), join(outDir, 'styles/google-private.css'));
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
      // Local components, not a UTC string: the zip format stores local DOS time and rejects
      // anything before 1980, which a UTC midnight becomes in negative-offset timezones.
      { mtime: new Date(1980, 0, 1, 12, 0, 0) },
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
