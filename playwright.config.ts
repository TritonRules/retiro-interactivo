import { defineConfig, devices } from '@playwright/test';

const fixtureBase = 'http://127.0.0.1:4177/retiro-interactivo/';
const candidateBase = 'http://127.0.0.1:4178/retiro-interactivo/';

export default defineConfig({
  testDir: './e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  webServer: [
    {
      command: 'node e2e/static-server.mjs dist-e2e 4177',
      url: fixtureBase,
      reuseExistingServer: false,
      timeout: 30_000,
    },
    {
      command: 'node e2e/static-server.mjs dist 4178',
      url: candidateBase,
      reuseExistingServer: false,
      timeout: 30_000,
    },
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testMatch: /agenda\.spec\.ts|sw\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], baseURL: fixtureBase, serviceWorkers: 'allow' },
    },
    {
      name: 'webkit',
      testMatch: /agenda\.spec\.ts/,
      use: { ...devices['Desktop Safari'], baseURL: fixtureBase },
    },
    {
      name: 'firefox-smoke',
      testMatch: /smoke\.spec\.ts/,
      use: { ...devices['Desktop Firefox'], baseURL: candidateBase },
    },
  ],
});
