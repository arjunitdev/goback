// Audits the built STORE artifact (docs/08 §8.5, docs/09 §9.4 "bundle scan, permissions diff").
// Usage: node scripts/audit-package.mjs [dir]   (default: dist-store)
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dir = join(root, process.argv[2] ?? 'dist-store');
const failures = [];
const fail = (msg) => failures.push(msg);

function walk(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

if (!existsSync(join(dir, 'manifest.json'))) {
  console.error(`No manifest in ${dir}. Run the build first.`);
  process.exit(2);
}

const manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
const files = walk(dir).map((f) => relative(dir, f).split('\\').join('/'));

// 1. Permissions are exactly the reviewed set (any change must be a deliberate, reviewed edit).
const ALLOWED_PERMISSIONS = ['storage', 'scripting'];
const ALLOWED_OPTIONAL_HOSTS = [
  'https://www.google.com/*',
  'https://www.youtube.com/*',
  'https://www.facebook.com/*',
];
const same = (a = [], b = []) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
if (!same(manifest.permissions, ALLOWED_PERMISSIONS))
  fail(`permissions changed: ${manifest.permissions}`);
if (!same(manifest.optional_host_permissions, ALLOWED_OPTIONAL_HOSTS))
  fail(`optional_host_permissions changed: ${manifest.optional_host_permissions}`);
if (manifest.host_permissions) fail('store build must not declare install-time host_permissions');
if (manifest.content_scripts)
  fail('store build must use dynamic registration, not static content_scripts');
if (manifest.web_accessible_resources) fail('store build must not expose web_accessible_resources');
if (!/unofficial/i.test(manifest.name)) fail('manifest name must say unofficial');

// 2. Every file the manifest references exists.
const referenced = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  ...Object.values(manifest.icons ?? {}),
];
for (const f of referenced) if (!files.includes(f)) fail(`manifest references missing file: ${f}`);

// 3. No wordmark / archived-asset leakage (ADR-011, docs/08 §8.4).
for (const f of files) {
  if (/wordmark|google-2012|\.svg$/i.test(f)) fail(`asset must not ship in store build: ${f}`);
}
// Private / archive-derived assets are for the user's own machine only (ADR-011/016).
for (const f of files) {
  if (/private|^assets\//i.test(f))
    fail(`private or non-icon asset must not ship in store build: ${f}`);
  if (f.endsWith('.png') && !f.startsWith('icons/')) fail(`only icons/*.png may ship: ${f}`);
}
const allowedExt = new Set(['.js', '.css', '.html', '.json', '.png']);
for (const f of files) {
  const ext = f.slice(f.lastIndexOf('.'));
  if (!allowedExt.has(ext)) fail(`unexpected file type: ${f}`);
}

// 4. Code scan: no remote code, eval, or network primitives (docs/03 §3.6).
const bannedCode = [
  [/\beval\s*\(/, 'eval'],
  [/new\s+Function\s*\(/, 'new Function'],
  [/\bfetch\s*\(/, 'fetch'],
  [/XMLHttpRequest/, 'XMLHttpRequest'],
  [/WebSocket/, 'WebSocket'],
  [/sendBeacon/, 'sendBeacon'],
  [/\.innerHTML\s*=/, 'innerHTML assignment'],
  [/insertAdjacentHTML/, 'insertAdjacentHTML'],
  [/document\.write/, 'document.write'],
  [/importScripts\s*\(/, 'importScripts'],
  [/<script[^>]+src=["']https?:/i, 'remote script tag'],
];
for (const f of files.filter((n) => n.endsWith('.js') || n.endsWith('.html'))) {
  const text = readFileSync(join(dir, f), 'utf8');
  for (const [re, label] of bannedCode) if (re.test(text)) fail(`${f}: contains ${label}`);
}
for (const f of files.filter((n) => n.endsWith('.css'))) {
  const text = readFileSync(join(dir, f), 'utf8');
  if (/@import|url\(\s*['"]?https?:/i.test(text)) fail(`${f}: remote CSS reference`);
}

if (failures.length > 0) {
  console.error(`AUDIT FAILED (${dir})\n - ${failures.join('\n - ')}`);
  process.exit(1);
}
console.log(`audit passed: ${files.length} files in ${relative(root, dir)}`);
