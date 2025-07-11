// @ts-nocheck
import base from './playwright.config';
import { defineConfig } from '@playwright/test';

export default defineConfig({
  ...base,
  name: 'smoke',
  grep: /@critical|@smoke/,
  retries: 0,
  reporter: 'list',
  timeout: 15000,
  fullyParallel: true,
});