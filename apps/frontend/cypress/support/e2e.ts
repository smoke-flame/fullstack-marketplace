// Cypress support for e2e tests
import './commands';

beforeEach(() => {
  cy.clearLocalStorage();
  cy.clearCookies();
});
