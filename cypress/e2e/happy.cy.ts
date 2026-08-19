describe('Happy path UI E2E', () => {
    const password = 'Password123!';
    const ts = Date.now();
    const sellerEmail = `seller+${ts}@example.com`;
    const buyerEmail = `buyer+${ts}@example.com`;
    const productTitle = `Cypress Product ${ts}`;

    it('seller creates category, product and sets stock; buyer purchases and reviews', () => {
        // Seller register
        cy.visit('/register');
        cy.get('[data-test-id="register-email"]').type(sellerEmail);
        cy.get('[data-test-id="register-password"]').type(password);
        cy.get('[data-test-id="register-confirm"]').type(password);
        cy.get('[data-test-id="register-seller-checkbox"]').check(); // become seller
        cy.get('[data-test-id="register-submit"]').click();

        // Login as seller
        cy.visit('/login');
        cy.get('[data-test-id="login-email"]').type(sellerEmail);
        cy.get('[data-test-id="login-password"]').type(password);
        cy.get('[data-test-id="login-submit"]').click();
        cy.url().should('include', '/search');

        // Create a category
        cy.get('[data-test-id="new-category"]').click();
        cy.get('[data-test-id="category-title"]').type(`Category ${ts}`);
        cy.get('[data-test-id="create-category-submit"]').click();

        // Create a product
        cy.get('[data-test-id="sell-item"]').click();
        cy.get('[data-test-id="product-title-input"]').type(productTitle);
        cy.get('[data-test-id="product-description"]').type('A product created by Cypress');
        cy.get('[data-test-id="product-price"]').type('25');
        // select first non-empty category
        cy.get('[data-test-id="product-category"]').then(($select) => {
            const options = Array.from($select.find('option')) as HTMLOptionElement[];
            const opt = options.find((o) => o.value && o.value !== '');
            if (opt) {
                cy.get('[data-test-id="product-category"]').select(opt.value);
            }
        });
        cy.get('[data-test-id="create-product-submit"]').click();

        // Go to inventory and set stock
        cy.get('[data-test-id="nav-inventory"]').click();
        // find the row with product title and set stock
        cy.contains(productTitle).closest('tr').within(() => {
            cy.contains('Set Stock').click();
            cy.get('[data-test-id="stock-onhand-input"]').clear().type('10');
            cy.get('[data-test-id="save-stock"]').click();
        });

        // Log out
        cy.get('[data-test-id="nav-logout"]').click();

        // Buyer register
        cy.visit('/register');
        cy.get('[data-test-id="register-email"]').type(buyerEmail);
        cy.get('[data-test-id="register-password"]').type(password);
        cy.get('[data-test-id="register-confirm"]').type(password);
        cy.get('[data-test-id="register-submit"]').click();

        // Login as buyer
        cy.visit('/login');
        cy.get('[data-test-id="login-email"]').type(buyerEmail);
        cy.get('[data-test-id="login-password"]').type(password);
        cy.get('[data-test-id="login-submit"]').click();
        cy.url().should('include', '/search');

        // Find product on search page and open it: type title, wait for search request, then open card
        cy.get('[data-test-id="search-input"]').clear().type(productTitle);
        cy.intercept('GET', '/search*').as('searchReq');
        cy.get('[data-test-id="search-submit"]').click();
        cy.wait('@searchReq');
        cy.get('a[data-test-id^="product-link-"]').contains(productTitle).click();
        cy.get('[data-test-id="add-to-cart"]').click();

        // Proceed to checkout: nav goes to cart; click proceed to checkout
        cy.get('[data-test-id="nav-cart"]').click();
        cy.url().should('include', '/cart');
        cy.get('[data-test-id="proceed-to-checkout"]').click();
        cy.url().should('include', '/checkout');
        cy.get('[data-test-id="checkout-pay"]').click();

        // After payment we should be on orders page and open the most recent order
        cy.url().should('include', '/orders');
        cy.get('a[data-test-id^="order-link-"]').first().click();

        // Wait up to 60s for the order to reach COMPLETED status
        cy.contains('COMPLETED', { timeout: 60000 }).should('exist');

        ;
        // Go back to search and open product page to add a review — perform search first
        cy.get('[data-test-id="nav-search"]').click();
        cy.get('[data-test-id="search-input"]').clear().type(productTitle);
        cy.intercept('GET', '/search*').as('searchReq2');
        cy.get('[data-test-id="search-submit"]').click();
        cy.wait('@searchReq2');
        cy.get('a[data-test-id^="product-link-"]').contains(productTitle).click();

        // Submit a 5-star review
        cy.get('[data-test-id="star-5"]').click();
        cy.get('[data-test-id="review-text"]').type('Excellent product (Cypress)');
        cy.get('[data-test-id="submit-review"]').click();

        // Verify rating updated to 5.0 (may take a few seconds)
        cy.get('[data-test-id="rating-value"]', { timeout: 10000 }).should('have.text', '5.0');
    });
});
