// Authentication helpers - streamlined version
// Split into focused modules to comply with file size limits

// Re-export from split modules
export type { CreateUserOptions } from './authHelpers.registration';
export { createE2EUser, registerUser, registerUserWithValidation, registerUserToChat, registerUserAndNavigateToProfile, handleEmailVerification, testEmailVerificationResend, testEmailVerificationStatus, testCompleteEmailVerificationFlow } from './authHelpers.registration';

export { setAuthCookies, authenticateE2EPage, updateUserEmailVerification, logoutUser, testPasswordReset, testInvalidLogin } from './authHelpers.utils'; 