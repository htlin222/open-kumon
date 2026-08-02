import { defineConfig } from '@playwright/test'
import { A4 } from './src/print/units'

export default defineConfig({
  testDir: 'tests/audit',
  outputDir: 'audits/results',
  snapshotDir: 'audits/baseline',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],

  use: {
    baseURL: 'http://localhost:5173',
    // 視窗就是一張 A4，避免版面被視窗寬度影響
    viewport: { width: Math.round(A4.width), height: Math.round(A4.height) },
    deviceScaleFactor: 2,
  },

  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
})
