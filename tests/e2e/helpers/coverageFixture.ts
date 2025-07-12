// @ts-nocheck
import { test as base, BrowserContext } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import v8toIstanbul from 'v8-to-istanbul';
import { createCoverageMap } from 'istanbul-lib-coverage';

const coverageDir = path.resolve(process.cwd(), 'coverage-playwright');
const coverageMap = createCoverageMap({});

export const test = base.extend<{}>({
  context: async ({ context }, use) => {
    // Wrap all pages in context to start coverage when created
    context.on('page', async page => {
      await page.coverage.startJSCoverage();
    });

    await use(context);

    // After the context (after test), stop coverage on pages and aggregate
    for (const page of context.pages()) {
      try {
        const jsCov = await page.coverage.stopJSCoverage();
        for (const entry of jsCov) {
          const converter = v8toIstanbul('', 0, { source: entry.source });
          await converter.load();
          converter.applyCoverage(entry.functions);
          const istanbulCoverage = converter.toIstanbul();
          coverageMap.merge(istanbulCoverage);
        }
      } catch (e) {
        // ignore if coverage not available
      }
    }
  },
});

export const saveCoverage = () => {
  if (!fs.existsSync(coverageDir)) {
    fs.mkdirSync(coverageDir, { recursive: true });
  }
  const outFile = path.join(coverageDir, `coverage-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(coverageMap.toJSON()));
  // Optionally merge into .nyc_output for tools like nyc
  const nycDir = path.join(process.cwd(), '.nyc_output');
  if (!fs.existsSync(nycDir)) {
    fs.mkdirSync(nycDir);
  }
  fs.writeFileSync(path.join(nycDir, `playwright-${Date.now()}.json`), JSON.stringify(coverageMap.toJSON()));
};