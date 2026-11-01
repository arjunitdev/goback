import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { buildManifest } from '../../src/manifest';
import { privateAllowed, registrationsFor, siteCss } from '../../src/shared/registration';

/**
 * The real 2012 logo and paper texture are archive-derived: trademark/copyright material
 * for the user's OWN machine only. These tests pin the guarantees that they can never be
 * committed, pushed or packaged for the store.
 */
describe('private (archive-derived) assets', () => {
  it('are never allowed in the store flavor, whatever the caller asks for', () => {
    expect(privateAllowed('store', { youtubePrivate: true })).toEqual({});
    expect(privateAllowed('dev', { youtubePrivate: true })).toEqual({ youtubePrivate: true });
  });

  it('store registrations and stylesheets never reference them', () => {
    expect(siteCss('youtube', 'store', { youtubePrivate: true })).toEqual(['styles/youtube.css']);
    const [early] = registrationsFor('youtube', 'store', { youtubePrivate: true });
    expect(JSON.stringify(early)).not.toMatch(/private/);
  });

  it('store manifest exposes no web-accessible resources even if asked', () => {
    const m = buildManifest('store', '1.0.0', { youtubePrivate: true });
    expect(m.web_accessible_resources).toBeUndefined();
  });

  it('dev registers the private stylesheet last so it wins ties, and only for YouTube', () => {
    const css = siteCss('youtube', 'dev', { youtubePrivate: true });
    expect(css.at(-1)).toBe('styles/youtube-private.css');
    expect(siteCss('google', 'dev', { youtubePrivate: true })).not.toContain(
      'styles/youtube-private.css',
    );
    expect(siteCss('youtube', 'dev', {})).not.toContain('styles/youtube-private.css');
  });

  it('dev exposes the private files to YouTube only', () => {
    const m = buildManifest('dev', '1.0.0', { youtubePrivate: true });
    const war = m.web_accessible_resources as { resources: string[]; matches: string[] }[];
    const priv = war.filter((w) => w.resources.some((r) => r.includes('youtube-private')));
    expect(priv).toHaveLength(1);
    expect(priv[0]?.matches).toEqual(['https://www.youtube.com/*']);
  });

  it('are ignored by git, and nothing under them is tracked', () => {
    const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' });
    // check-ignore exits non-zero (throws) if the path is NOT ignored.
    for (const p of [
      'src/assets/private/youtube/sprite.png',
      'src/assets/private/youtube/bg.png',
      'evidence-vault/youtube/anything.png',
    ]) {
      expect(() => git('check-ignore', '-q', p), `${p} must be git-ignored`).not.toThrow();
    }
    const tracked = git('ls-files', 'src/assets/private', 'evidence-vault').trim();
    expect(tracked).toBe('');
  });
});
