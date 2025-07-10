import { OAuth2Service } from '../../../../src/lib/auth/oauth2';

describe('Test OAuth2 Provider', () => {
  let oauth2Service: OAuth2Service;

  beforeEach(() => {
    // Ensure test environment is set
    process.env.ENABLE_TEST_OAUTH2 = 'true';
    process.env.NEXT_PUBLIC_BASE_URL = 'http://localhost:3000';
    
    oauth2Service = new OAuth2Service();
  });

  afterEach(() => {
    // Clean up global test OAuth2 codes
    if (global.testOAuth2Codes) {
      global.testOAuth2Codes.clear();
    }
  });

  it('should have test provider available in test environment', () => {
    const config = oauth2Service.getProviderConfig('test');
    
    expect(config).toBeDefined();
    expect(config?.name).toBe('Test OAuth2 Provider');
    expect(config?.authorizationUrl).toBe('http://localhost:3000/api/test-oauth2/authorize');
    expect(config?.tokenUrl).toBe('http://localhost:3000/api/test-oauth2/token');
    expect(config?.userInfoUrl).toBe('http://localhost:3000/api/test-oauth2/userinfo');
    expect(config?.scope).toBe('read write');
  });

  it('should generate authorization URL for test provider', () => {
    const config = {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      authorizationUrl: 'http://localhost:3000/api/test-oauth2/authorize',
      tokenUrl: 'http://localhost:3000/api/test-oauth2/token',
      redirectUri: 'http://localhost:3000/callback',
      scope: 'read write',
      state: 'test-state'
    };

    const url = oauth2Service.generateAuthorizationUrl('test-user-id', 'test-connection-id', 'test', config);
    
    expect(url).toContain('http://localhost:3000/api/test-oauth2/authorize');
    expect(url).toContain('response_type=code');
    expect(url).toContain('client_id=test-client-id');
    expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fcallback');
    // Accept both %20 and + as valid encodings for the space in the scope parameter
    expect(url).toMatch(/scope=read(%20|\+)write/);
  });

  it('should list test provider in available providers', () => {
    const providers = oauth2Service.getSupportedProviders();
    
    expect(providers).toContain('test');
    expect(providers).toContain('github');
    expect(providers).toContain('google');
    expect(providers).toContain('slack');
  });
}); 