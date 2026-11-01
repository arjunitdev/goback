/** Build-time constants injected by scripts/build.mjs (esbuild `define`). */
declare const __WORDMARK__: boolean;
declare const __FLAVOR__: 'dev' | 'store' | 'test';
/** True only for the automated-test build (`--fast`): shortens probe retries to ~0.5s. */
declare const __FAST_RETRIES__: boolean;
/** True only when private YouTube assets were found at build time AND the flavor is not `store`. */
declare const __YT_PRIVATE__: boolean;
declare const __G_PRIVATE__: boolean;
