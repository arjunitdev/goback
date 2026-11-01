import { describe, expect, it } from 'vitest';
import { matchesGoogle, routeFromUrl } from '../../src/adapters/google/routes';

const u = (s: string) => new URL(s);

describe('google routes', () => {
  it('matches only https://www.google.com', () => {
    expect(matchesGoogle(u('https://www.google.com/'))).toBe(true);
    expect(matchesGoogle(u('http://www.google.com/'))).toBe(false);
    expect(matchesGoogle(u('https://google.com/'))).toBe(false);
    expect(matchesGoogle(u('https://www.google.co.uk/'))).toBe(false);
    expect(matchesGoogle(u('https://www.google.com.evil.test/'))).toBe(false);
    expect(matchesGoogle(u('https://accounts.google.com/'))).toBe(false);
  });

  it('detects home, results and images', () => {
    expect(routeFromUrl(u('https://www.google.com/'))).toBe('home');
    // The results page's "Google" link goes to /webhp with tracking parameters.
    expect(
      routeFromUrl(u('https://www.google.com/webhp?hl=en&ictx=2&sa=X&ved=2ahUKEwjOmILm3-eXAxVDDTQIHcNODvAQPXoECAcQBg')),
    ).toBe('home');
    expect(routeFromUrl(u('https://www.google.com/webhp/'))).toBe('home');
    // Not the same thing: Images has its own home and stays native.
    expect(routeFromUrl(u('https://www.google.com/imghp'))).toBeNull();
    expect(routeFromUrl(u('https://www.google.com/search?q=cats'))).toBe('results');
    expect(routeFromUrl(u('https://www.google.com/search?q=cats&tbm=isch'))).toBe('images');
    expect(routeFromUrl(u('https://www.google.com/search/?q=cats'))).toBe('results');
  });

  it('leaves auth, consent, settings and everything else native (FR-012)', () => {
    for (const p of [
      '/signin',
      '/ServiceLogin',
      '/consent',
      '/preferences',
      '/maps',
      '/setprefs',
    ]) {
      expect(routeFromUrl(u(`https://www.google.com${p}`))).toBeNull();
    }
  });
});
