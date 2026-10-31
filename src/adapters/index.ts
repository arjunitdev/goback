import type { SiteAdapter } from '../shared/types';
import { facebookAdapter } from './facebook';
import { googleAdapter } from './google';
import { youtubeAdapter } from './youtube';

export const ADAPTERS: readonly SiteAdapter[] = [googleAdapter, youtubeAdapter, facebookAdapter];
