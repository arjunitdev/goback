import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { EXCLUDED_SELECTOR_FRAGMENTS as FACEBOOK_EXCLUDED } from '../../src/adapters/facebook/selectors';
import { EXCLUDED_SELECTOR_FRAGMENTS as GOOGLE_EXCLUDED } from '../../src/adapters/google/selectors';
import { EXCLUDED_SELECTOR_FRAGMENTS as YOUTUBE_EXCLUDED } from '../../src/adapters/youtube/selectors';

const stylesDir = join(process.cwd(), 'src', 'styles');

const EXCLUDED: Record<string, readonly string[]> = {
  google: GOOGLE_EXCLUDED,
  youtube: YOUTUBE_EXCLUDED,
  facebook: FACEBOOK_EXCLUDED,
};

/** Shared files (base.css) must respect every site's exclusions. */
const ALL_EXCLUDED = Object.values(EXCLUDED).flat();

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

/** Which exclusion list governs a stylesheet. */
function exclusionsFor(name: string): readonly string[] {
  const site = Object.keys(EXCLUDED).find(
    (s) => name.startsWith(`${s}/`) || name.startsWith(`tokens/${s}.`),
  );
  return site ? (EXCLUDED[site] ?? ALL_EXCLUDED) : ALL_EXCLUDED;
}

const files = cssFiles();
const siteFile = (site: string) => files.find((f) => f.name === `${site}/${site}.css`);

describe('stylesheet safety (docs/03 §3.6, docs/05 §5.4, R10)', () => {
  it('finds a base, tokens, site and wordmark stylesheet for every site', () => {
    expect(files.some((f) => f.name === 'base/base.css')).toBe(true);
    for (const site of Object.keys(EXCLUDED)) {
      for (const name of [
        `${site}/${site}.css`,
        `${site}/wordmark.css`,
        `tokens/${site}.tokens.css`,
      ]) {
        const f = files.find((x) => x.name === name);
        expect(f, name).toBeDefined();
        expect(rules(f?.text ?? '').length, name).toBeGreaterThan(0);
      }
    }
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

  it('scopes each site stylesheet to its own site attribute', () => {
    for (const site of Object.keys(EXCLUDED)) {
      for (const f of files.filter((x) => x.name.startsWith(`${site}/`))) {
        for (const { selector } of rules(f.text)) {
          for (const part of splitSelectors(selector)) {
            expect(part, `${f.name}: ${part}`).toContain(`html[data-retroweb='${site}']`);
          }
        }
      }
    }
  });

  it('never hides, collapses, fades or disables interaction on anything', () => {
    const banned = [
      /display\s*:\s*none/i,
      /visibility\s*:\s*hidden/i,
      /opacity\s*:\s*0(\.0+)?\s*(!important)?\s*(;|$)/i,
      /font-size\s*:\s*0(px)?\s*(!important)?\s*(;|$)/i,
      /(^|;|\s)(height|width|max-height|max-width)\s*:\s*0(px)?\s*(!important)?\s*(;|$)/i,
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

  it('does not target excluded zones (ads, player, consent, auth, dialogs) except inside :not()', () => {
    for (const f of files) {
      const fragments = exclusionsFor(f.name);
      for (const { selector } of rules(f.text)) {
        const withoutNot = selector
          .replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '')
          .replace(/'/g, '"');
        for (const frag of fragments) {
          const message = `${f.name}: ${selector} targets ${frag}`;
          if (/^[a-z][a-z0-9-]*$/i.test(frag)) {
            // A bare tag name (e.g. `video`): match it as a whole selector token only, so
            // `ytd-compact-video-renderer` is not mistaken for the <video> element.
            const asToken = new RegExp(String.raw`(^|[\s>+~(,])${frag}(?![\w-])`);
            expect(withoutNot, message).not.toMatch(asToken);
          } else {
            expect(withoutNot, message).not.toContain(frag);
          }
        }
      }
    }
  });

  it('never uses @import or remote URLs', () => {
    for (const f of files) {
      expect(f.text).not.toMatch(/@import/);
      expect(f.text).not.toMatch(/url\(\s*['"]?https?:/i);
    }
  });

  it('only wordmark stylesheets may reference extension URLs', () => {
    for (const f of files) {
      if (f.name.endsWith('/wordmark.css') || f.name.endsWith('/private.css')) continue;
      expect(f.text, f.name).not.toMatch(/chrome-extension:/);
    }
  });
});

describe('site-specific fences', () => {
  it('google: title/URL rules are fenced away from ad containers', () => {
    const google = siteFile('google');
    expect(google).toBeDefined();
    for (const { selector } of rules(google?.text ?? '')) {
      if (/\bh3\b|\bcite\b/.test(selector)) {
        for (const part of splitSelectors(selector)) {
          expect(part, part).toContain(':not(#tads *');
        }
      }
    }
  });

  it('youtube: the broad font rule is fenced away from the player and popups', () => {
    const yt = siteFile('youtube');
    expect(yt).toBeDefined();
    const broad = rules(yt?.text ?? '').filter(({ selector }) => /ytd-app\s+:not\(/.test(selector));
    expect(broad.length).toBeGreaterThan(0);
    for (const { selector } of broad) {
      for (const needle of ['#movie_player', 'ytd-player', 'ytd-popup-container']) {
        expect(selector, needle).toContain(needle);
      }
    }
  });

  it('facebook: the broad font rule is fenced away from dialogs and alerts', () => {
    const fb = siteFile('facebook');
    expect(fb).toBeDefined();
    const broad = rules(fb?.text ?? '').filter(({ selector }) => /body\s+:not\(/.test(selector));
    expect(broad.length).toBeGreaterThan(0);
    for (const { selector } of broad) {
      for (const needle of [
        "[role='dialog']",
        '[aria-modal]',
        "[role='alertdialog']",
        "[role='alert']",
      ]) {
        expect(selector, needle).toContain(needle);
      }
    }
  });

  it('colour palettes only apply on light pages', () => {
    // Every rule that sets a colour/background must be gated on scheme=light, so dark-theme
    // users never get unreadable combinations. Shape/typography rules are exempt, and so are
    // Facebook's header bar (`[role='banner']`) and the landing bar (`#rw-fbbar`): those rules set
    // the bar's own background and its text/icon colours together, so they read on either theme (ADR-026).
    const ownColours = /[role='banner']|#rw-fbbar/;
    const colour = /(^|;|\s)(color|background(-color|-image)?|border(-bottom|-top)?)\s*:/i;
    for (const site of Object.keys(EXCLUDED)) {
      const f = siteFile(site);
      for (const { selector, body } of rules(f?.text ?? '')) {
        if (!colour.test(body)) continue;
        // Border-only rules for shape (none today) would need an explicit exemption here.
        for (const part of splitSelectors(selector)) {
          if (site === 'facebook' && ownColours.test(part)) continue;
          expect(part, `${site}: ${part}`).toContain("[data-retroweb-scheme='light']");
        }
      }
    }
  });
});
