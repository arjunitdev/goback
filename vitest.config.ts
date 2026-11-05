import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts'],
    // The suite contains timing checks (engine cost, throttling). Run the files one at a time so they
    // are not starved of CPU by each other: the whole suite still takes only a few seconds.
    fileParallelism: false,
  },
});
