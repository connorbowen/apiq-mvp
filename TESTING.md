## Unit Test Status (as of 2024-06-30)

- All unit tests pass except for `ChatInterface` component tests.
- The failing tests in `ChatInterface.test.tsx` are documented with TODOs (see file) explaining that the failures are due to the initial state and quick example buttons interfering with form submission. These require a more robust test setup or a component refactor.
- All other unit tests are passing and type-safe.
- Approach: Per project rules, TODOs are left in place with clear context and author/date, and no tests are commented out or disabled. 