import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke tests run against the deployed GitHub Pages site.
 * No webServer, no Ensembl mocks — this verifies the live deployment.
 */
export default defineConfig({
  testDir: './tests',
  testMatch: /live\.spec\.ts$/,
  timeout: 60_000,
  expect: { timeout: 12_000 },
  fullyParallel: false,
  retries: 1,
  reporter: [['list']],
  use: {
    baseURL: 'https://tristola.github.io/dna-dive-visualization/',
    trace: 'retain-on-failure',
    launchOptions: {
      args: [
        '--use-gl=swiftshader',
        '--use-angle=swiftshader',
        '--enable-unsafe-swiftshader',
        '--ignore-gpu-blocklist',
        '--enable-webgl',
      ],
    },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
