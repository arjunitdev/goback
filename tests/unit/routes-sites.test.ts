import { describe, expect, it } from 'vitest';
import { routeFromUrl as facebookRoute } from '../../src/adapters/facebook/routes';
import { routeFromUrl as youtubeRoute } from '../../src/adapters/youtube/routes';

const u = (s: string) => new URL(s);

describe('youtube routes', () => {
  it('matches only https://www.youtube.com', () => {
    expect(youtubeRoute(u('https://www.youtube.com/'))).toBe('home');
    for (const bad of [
      'http://www.youtube.com/',
      'https://youtube.com/',
      'https://m.youtube.com/',
      'https://music.youtube.com/',
      'https://www.youtube.com.evil.test/',
      'https://studio.youtube.com/',
    ]) {
      expect(youtubeRoute(u(bad)), bad).toBeNull();
    }
  });

  it('detects the supported routes', () => {
    expect(youtubeRoute(u('https://www.youtube.com/watch?v=abc'))).toBe('watch');
    expect(youtubeRoute(u('https://www.youtube.com/results?search_query=x'))).toBe('results');
    expect(youtubeRoute(u('https://www.youtube.com/playlist?list=PL1'))).toBe('playlist');
    expect(youtubeRoute(u('https://www.youtube.com/shorts/abc'))).toBe('shorts');
    expect(youtubeRoute(u('https://www.youtube.com/feed/subscriptions'))).toBe('feed');
    for (const p of ['/@someone', '/@someone/videos', '/channel/UC123', '/c/name', '/user/name/']) {
      expect(youtubeRoute(u(`https://www.youtube.com${p}`)), p).toBe('channel');
    }
  });

  it('leaves account, payment, sign-in and policy paths native (FR-012)', () => {
    for (const p of [
      '/account',
      '/premium',
      '/paid_memberships',
      '/signin',
      '/t/terms',
      '/embed/abc',
    ]) {
      expect(youtubeRoute(u(`https://www.youtube.com${p}`)), p).toBeNull();
    }
  });
});

describe('facebook routes', () => {
  it('matches only https://www.facebook.com', () => {
    expect(facebookRoute(u('https://www.facebook.com/'))).toBe('feed');
    for (const bad of [
      'http://www.facebook.com/',
      'https://facebook.com/',
      'https://m.facebook.com/',
      'https://web.facebook.com/',
      'https://www.facebook.com.evil.test/',
    ]) {
      expect(facebookRoute(u(bad)), bad).toBeNull();
    }
  });

  it('detects feed, groups and profile', () => {
    expect(facebookRoute(u('https://www.facebook.com/groups/12345'))).toBe('groups');
    expect(facebookRoute(u('https://www.facebook.com/profile.php?id=1'))).toBe('profile');
    expect(facebookRoute(u('https://www.facebook.com/some.person'))).toBe('profile');
  });

  it('leaves auth, security, privacy, payments, messaging and ads paths native (FR-012)', () => {
    for (const p of [
      '/login',
      '/login/identify',
      '/checkpoint/1234',
      '/recover/initiate',
      '/settings',
      '/privacy/checkup',
      '/security',
      '/payments',
      '/messages/t/1',
      '/messenger',
      '/ads/manager',
      '/adsmanager',
      '/help',
      '/policies',
      '/two_factor',
    ]) {
      expect(facebookRoute(u(`https://www.facebook.com${p}`)), p).toBeNull();
    }
  });
});
