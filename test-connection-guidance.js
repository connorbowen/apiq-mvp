const { ConnectionGuidanceService } = require('./src/lib/services/connectionGuidanceService.ts');

console.log('Testing ConnectionGuidanceService...');

try {
  const result = ConnectionGuidanceService.analyzeRequest(
    'Create a workflow that sends a Slack notification when a new GitHub issue is created',
    []
  );
  console.log('Result:', result);
} catch (error) {
  console.error('Error:', error);
}
