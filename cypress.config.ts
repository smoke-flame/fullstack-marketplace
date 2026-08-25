import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'wdg4vu',
  e2e: {
    baseUrl: 'http://localhost:3000',
    specPattern: 'apps/frontend/cypress/e2e/**/*.cy.{js,ts}',
    supportFile: 'apps/frontend/cypress/support/e2e.ts',
    defaultCommandTimeout: 20000,
    pageLoadTimeout: 60000,
    requestTimeout: 15000,
    responseTimeout: 30000,
    setupNodeEvents() {
      // no-op for now
    },
  },
});
