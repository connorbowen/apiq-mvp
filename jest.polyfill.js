// eslint-disable-next-line no-console
console.log('Jest polyfill URL →', process.env.DATABASE_URL);

// Jest polyfill for Node.js environment
import { TextEncoder, TextDecoder } from 'util';

// Polyfill globalThis for older Node versions
if (typeof globalThis === 'undefined') {
  global.globalThis = global;
}

// Polyfill TextEncoder and TextDecoder
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill crypto for Node.js environment
if (typeof global.crypto === 'undefined') {
  const crypto = require('crypto');
  global.crypto = crypto.webcrypto || crypto;
}

// Polyfill fetch for Node.js environment - use dynamic import to avoid ES module issues
if (typeof global.fetch === 'undefined') {
  // Use a simple fetch implementation for tests
  global.fetch = async (url, options = {}) => {
    const http = require('http');
    const https = require('https');
    const { URL } = require('url');
    
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const client = isHttps ? https : http;
      
      const req = client.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            headers: res.headers,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });
      
      req.on('error', reject);
      if (options.body) req.write(options.body);
      req.end();
    });
  };
}

// Polyfill structuredClone for Node.js environment
if (typeof global.structuredClone === 'undefined') {
  global.structuredClone = (obj) => JSON.parse(JSON.stringify(obj));
}

// Polyfill Request and Response for OpenAI
if (typeof global.Request === 'undefined') {
  global.Request = class Request {
    constructor(input, init = {}) {
      this.url = input;
      this.method = init.method || 'GET';
      this.headers = new Map(Object.entries(init.headers || {}));
      this.body = init.body;
    }
  };
}

if (typeof global.Response === 'undefined') {
  global.Response = class Response {
    constructor(body, init = {}) {
      this.body = body;
      this.status = init.status || 200;
      this.statusText = init.statusText || 'OK';
      this.headers = new Map(Object.entries(init.headers || {}));
    }
    
    async json() {
      return JSON.parse(this.body);
    }
    
    async text() {
      return this.body;
    }
  };
} 