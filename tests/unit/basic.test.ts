import fs from 'fs';
import path from 'path';

describe('Basic Test Setup', () => {
  it('should run basic tests', () => {
    expect(1 + 1).toBe(2)
  })

  it('should handle async operations', async () => {
    const result = await Promise.resolve('test')
    expect(result).toBe('test')
  })

  it('should handle environment variables', () => {
    expect(process.env.NODE_ENV).toBe('test')
  })
})

describe('Repository Integrity', () => {
  describe('Mock File Detection', () => {
    it('should not contain any OpenAPI spec mock files', () => {
      const foundMockFiles: string[] = [];

      // Search for mock files in the project directory
      const searchForMockFiles = (dir: string, depth = 0) => {
        if (depth > 10) return; // Prevent infinite recursion
        
        try {
          const items = fs.readdirSync(dir);
          
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            // Skip node_modules and .git directories
            if (item === 'node_modules' || item === '.git') continue;
            
            if (stat.isDirectory()) {
              searchForMockFiles(fullPath, depth + 1);
            } else if (stat.isFile()) {
              // Check for mock file patterns
              const fileName = item.toLowerCase();
              const relativePath = path.relative(process.cwd(), fullPath);
              
              if (
                fileName.includes('.mock.json') ||
                fileName.includes('.spec.mock.json') ||
                (relativePath.includes('__mocks__') && fileName.endsWith('.json'))
              ) {
                foundMockFiles.push(relativePath);
              }
            }
          }
        } catch (error) {
          // Ignore permission errors or other issues
          console.warn(`Warning: Could not search directory ${dir}:`, error);
        }
      };

      // Start search from project root
      searchForMockFiles(process.cwd());

      // Filter out any legitimate files that might match the pattern
      const legitimateFiles: string[] = [
        // Add any legitimate files that might match the pattern
        // For example, if you have documentation files with "mock" in the name
      ];

      const actualMockFiles = foundMockFiles.filter(file => 
        !legitimateFiles.includes(file)
      );

      if (actualMockFiles.length > 0) {
        console.error('Found mock files that should not exist:');
        actualMockFiles.forEach(file => console.error(`  - ${file}`));
        throw new Error(`Found ${actualMockFiles.length} mock file(s) that should not exist in the repository. Please remove them and use real HTTP calls instead.`);
      }

      // If we get here, no mock files were found
      expect(actualMockFiles.length).toBe(0);
    });

    it('should not contain any hardcoded mock OpenAPI specs in test files', () => {
      const testFiles = [
        'tests/integration/api/connections.test.ts',
        'tests/integration/api/auth.test.ts'
      ].filter(file => fs.existsSync(file));
      if (testFiles.length === 0) {
        // No files to check, skip test
        return;
      }

      const mockSpecPatterns = [
        /mock.*spec.*json/i,
        /spec.*mock.*json/i,
        /"openapi".*"3\.0\.0"/,
        /"swagger".*"2\.0"/,
        /"paths".*\{/,
        /"info".*\{/
      ];

      const foundMockSpecs: Array<{ file: string; line: number; content: string }> = [];

      for (const testFile of testFiles) {
        try {
          const content = fs.readFileSync(testFile, 'utf8');
          const lines = content.split('\n');

          lines.forEach((line, index) => {
            const lineNumber = index + 1;
            
            // Skip comments and legitimate imports
            if (line.trim().startsWith('//') || line.trim().startsWith('import')) {
              return;
            }

            // Check for mock spec patterns
            for (const pattern of mockSpecPatterns) {
              if (pattern.test(line)) {
                // Additional check: make sure it's not just a URL or legitimate code
                if (
                  !line.includes('https://') && 
                  !line.includes('http://') &&
                  !line.includes('parseOpenApiSpec') &&
                  !line.includes('jest.mock') &&
                  line.length > 20 // Likely not just a simple variable name
                ) {
                  foundMockSpecs.push({
                    file: testFile,
                    line: lineNumber,
                    content: line.trim()
                  });
                }
              }
            }
          });
        } catch (error) {
          console.warn(`Warning: Could not check file ${testFile}:`, error);
        }
      }

      if (foundMockSpecs.length > 0) {
        console.error('Found potential hardcoded mock OpenAPI specs:');
        foundMockSpecs.forEach(({ file, line, content }) => {
          console.error(`  - ${file}:${line}: ${content}`);
        });
        throw new Error(`Found ${foundMockSpecs.length} potential hardcoded mock OpenAPI spec(s). Please use real HTTP calls instead.`);
      }

      expect(foundMockSpecs.length).toBe(0);
    });
  });
}); 