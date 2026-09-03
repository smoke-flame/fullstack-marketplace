import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'wdg4vu',
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
    supportFile: 'cypress/support/e2e.ts',
    defaultCommandTimeout: 20000,
    pageLoadTimeout: 60000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    env: {
      INTERNAL_API_KEY: 'secure-internal-key',
    },
    setupNodeEvents() {
      // no-op for now
    },
  },
});
