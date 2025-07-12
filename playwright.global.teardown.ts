import { saveCoverage } from './tests/e2e/helpers/coverageFixture';

async function globalTeardown() {
  try {
    saveCoverage();
    // eslint-disable-next-line no-console
    console.log('Playwright coverage saved.');
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to save Playwright coverage', error);
  }
}

export default globalTeardown;