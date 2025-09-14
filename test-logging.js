#!/usr/bin/env node

const { logInfo, logDebug } = require('./src/utils/logger.ts');

console.log('Testing logging...');

logInfo('🔍 [TEST] This is an info log');
logDebug('🔍 [TEST] This is a debug log');

console.log('Logging test completed');

