import { defineConfig } from 'cypress';

export default defineConfig({
  projectId: 'wdg4vu',
    e2e: {
        baseUrl: 'http://localhost:3000',
        specPattern: 'cypress/e2e/**/*.cy.{js,ts}',
        supportFile: 'cypress/support/e2e.ts',
        // Increase default timeouts to accommodate slower redirects/page loads in local env
        defaultCommandTimeout: 20000,
        pageLoadTimeout: 60000,
        requestTimeout: 15000,
        responseTimeout: 30000,
        setupNodeEvents() {
            // no-op for now
        },
    },
});
