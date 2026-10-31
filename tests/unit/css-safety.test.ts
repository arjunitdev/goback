import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXCLUDED_SELECTOR_FRAGMENTS } from '../../src/adapters/google/selectors';

const stylesDir = join(process.cwd(), 'src', 'styles');

function cssFiles(): { name: string; text: string }[] {
  const out: { name: string; text: string }[] = [];
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full, `${prefix}${entry.name}/`);
      else if (entry.name.endsWith('.css'))
        out.push({ name: prefix + entry.name, text: readFileSync(full, 'utf8') });
    }
  };
  walk(stylesDir, '');
  return out;
}

function rules(text: string): { selector: string; body: string }[] {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, '');
  const result: { selector: string; body: string }[] = [];
  for (const m of clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    result.push({ selector: (m[1] ?? '').trim(), body: (m[2] ?? '').trim() });
  }
  return result;
}

/** Split a selector list on top-level commas only (commas inside :not(...) stay put). */
function splitSelectors(list: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of list) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth--;
    if (ch === ',' && depth === 0) {
      parts.push(current.trim());
      current = '';
    } else current += ch;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

const files = cssFiles();

describe('stylesheet safety (docs/03 §3.6, docs/05 §5.4, R10)', () => {
  it('finds the stylesheets', () => {
    expect(files.length).toBeGreaterThanOrEqual(4);
    for (const f of files) expect(rules(f.text).length).toBeGreaterThan(0);
  });

  it('scopes every selector to html[data-retroweb…]', () => {
    for (const f of files) {
      for (const { selector } of rules(f.text)) {
        for (const part of splitSelectors(selector)) {
          expect(part, `${f.name}: ${part}`).toMatch(/^html\[data-retroweb/);
        }
      }
    }
  });

  it('never hides, collapses, fades or disables interaction on anything', () => {
    const banned = [
      /display\s*:\s*none/i,
      /visibility\s*:\s*hidden/i,
      /opacity\s*:\s*0(\.0+)?\s*(;|$)/i,
      /font-size\s*:\s*0(px)?\s*(;|$)/i,
      /(^|;|\s)(height|width|max-height|max-width)\s*:\s*0(px)?\s*(;|$)/i,
      /pointer-events\s*:\s*none/i,
      /clip(-path)?\s*:/i,
      /left\s*:\s*-\d{3,}/i,
    ];
    for (const f of files) {
      for (const { selector, body } of rules(f.text)) {
        for (const re of banned) expect(body, `${f.name}: ${selector}`).not.toMatch(re);
      }
    }
  });

  it('does not target ads, consent, SafeSearch, auth or dialogs (except inside :not())', () => {
    for (const f of files) {
      for (const { selector } of rules(f.text)) {
        const withoutNot = selector.replace(/:not\([^)]*\)/g, '').replace(/'/g, '"');
        for (const frag of EXCLUDED_SELECTOR_FRAGMENTS) {
          expect(withoutNot, `${f.name}: ${selector} targets ${frag}`).not.toContain(frag);
        }
      }
    }
  });

  it('keeps title/URL rules fenced away from ad containers', () => {
    const google = files.find((f) => f.name === 'google/google.css');
    expect(google).toBeDefined();
    for (const { selector } of rules(google?.text ?? '')) {
      if (/\bh3\b|\bcite\b/.test(selector)) {
        for (const part of splitSelectors(selector)) {
          expect(part, part).toContain(':not(#tads *');
        }
      }
    }
  });

  it('does not use @import or remote URLs', () => {
    for (const f of files) {
      expect(f.text).not.toMatch(/@import/);
      expect(f.text).not.toMatch(/url\(\s*['"]?https?:/i);
    }
  });
});
