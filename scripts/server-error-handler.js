// Global error handler for Next.js server
// This prevents the server from crashing due to unhandled errors

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('🚨 Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  
  // Don't exit the process in test mode
  if (process.env.NODE_ENV === 'test' || process.env.E2E === 'true') {
    console.log('🔄 Test mode: Continuing despite uncaught exception');
    return;
  }
  
  // In production, exit gracefully
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Don't exit the process in test mode
  if (process.env.NODE_ENV === 'test' || process.env.E2E === 'true') {
    console.log('🔄 Test mode: Continuing despite unhandled rejection');
    return;
  }
  
  // In production, exit gracefully
  process.exit(1);
});

// Handle SIGTERM gracefully
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully');
  // Force exit after a short delay to ensure cleanup
  setTimeout(() => process.exit(0), 2000);
});

// Handle SIGINT gracefully
process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully');
  // Force exit after a short delay to ensure cleanup
  setTimeout(() => process.exit(0), 2000);
});

// Handle SIGHUP gracefully
process.on('SIGHUP', () => {
  console.log('🔄 SIGHUP received, shutting down gracefully');
  setTimeout(() => process.exit(0), 2000);
});

console.log('🛡️ Server error handler initialized');
