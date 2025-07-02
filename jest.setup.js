import '@testing-library/jest-dom'

// Polyfill for setImmediate
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args))

// Mock Next.js router
jest.mock('next/router', () => ({
  useRouter() {
    return {
      route: '/',
      pathname: '/',
      query: {},
      asPath: '/',
      push: jest.fn(),
      pop: jest.fn(),
      reload: jest.fn(),
      back: jest.fn(),
      prefetch: jest.fn().mockResolvedValue(undefined),
      beforePopState: jest.fn(),
      events: {
        on: jest.fn(),
        off: jest.fn(),
        emit: jest.fn(),
      },
      isFallback: false,
    }
  },
}))

// Mock Next.js navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  // Uncomment to ignore a specific log level
  // log: jest.fn(),
  // debug: jest.fn(),
  // info: jest.fn(),
  // warn: jest.fn(),
  error: jest.fn(),
}

// Mock environment variables
process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://connorbowen@localhost:5432/apiq'
process.env.OPENAI_API_KEY = 'test-openai-key'
process.env.NEXTAUTH_SECRET = 'test-secret'
process.env.NEXTAUTH_URL = 'http://localhost:3000'
process.env.ENCRYPTION_KEY = 'test-encryption-key-32-chars-long'
process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production'
process.env.JWT_EXPIRES_IN = '24h'

// Mock scrollIntoView for jsdom
Element.prototype.scrollIntoView = jest.fn()

// Global cleanup for any remaining async operations
afterAll(async () => {
  // Clear any remaining timers
  jest.clearAllTimers();
  
  // Wait for any pending promises to resolve
  await new Promise(resolve => setImmediate(resolve));
});
