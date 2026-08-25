describe('Cancel payment E2E', () => {
    const password = 'Password123!';
    const ts = Date.now();
    const sellerEmail = `seller-cancel-${ts}@example.com`;
    const buyerEmail = `buyer-cancel-${ts}@example.com`;
    const productTitle = `Cypress Cancel Product ${ts}`;
    const internalKey = Cypress.env('INTERNAL_API_KEY') || 'replace-with-a-secure-internal-key';

    it('order is cancelled when payment fails and notification is sent', () => {
        // Seller register
        cy.visit('/register');
        cy.get('[data-test-id="register-email"]').type(sellerEmail);
        cy.get('[data-test-id="register-password"]').type(password);
        cy.get('[data-test-id="register-confirm"]').type(password);
        cy.get('[data-test-id="register-seller-checkbox"]').check();
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
        cy.get('[data-test-id="product-description"]').type('A product for cancel payment test');
        cy.get('[data-test-id="product-price"]').type('25');
        cy.get('[data-test-id="product-category"]').then(($select) => {
            const options = Array.from($select.find('option')) as HTMLOptionElement[];
            const opt = options.find((o) => o.value && o.value !== '');
            if (opt) {
                cy.get('[data-test-id="product-category"]').select(opt.value);
            }
        });
        cy.get('[data-test-id="create-product-submit"]').click();

        // Set stock
        cy.get('[data-test-id="nav-inventory"]').click();
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

        // Find product and open it
        cy.get('[data-test-id="search-input"]').clear().type(productTitle);
        cy.intercept('GET', '/search*').as('searchReq');
        cy.get('[data-test-id="search-submit"]').click();
        cy.wait('@searchReq');
        cy.get('a[data-test-id^="product-link-"]').contains(productTitle).click();
        cy.get('[data-test-id="add-to-cart"]').click();

        // Checkout
        cy.get('[data-test-id="nav-cart"]').click();
        cy.url().should('include', '/cart');
        cy.get('[data-test-id="proceed-to-checkout"]').click();
        cy.url().should('include', '/checkout');
        cy.get('[data-test-id="checkout-pay"]').click();

        // Ensure payment will fail for this test run via internal test endpoint
        cy.request({
            url: 'http://localhost:3001/internal/test/payment/failure-probability',
            method: 'POST',
            headers: {
                'x-internal-key': internalKey,
                'content-type': 'application/json',
            },
            body: { probability: 1 },
        }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body.failureProbability).to.eq(1);
        });

        // After payment we should be on orders page
        cy.url().should('include', '/orders');

        // Wait up to 90s for the order to reach CANCELLED status with payment_failed reason
        // This assumes PAYMENT_FAILURE_PROBABILITY=1 is set in backend env
        cy.get('a[data-test-id^="order-link-"]').first().click();
        cy.contains('CANCELLED', { timeout: 90000 }).should('exist');
        cy.contains('payment_failed', { timeout: 90000 }).should('exist');

        // Verify notification was sent in backend console via internal test endpoint
        cy.request({
            url: 'http://localhost:3001/internal/test/notifications',
            headers: {
                'x-internal-key': internalKey,
            },
        }).then((response) => {
            expect(response.status).to.eq(200);
            const notifications = response.body as Array<{ eventType: string; correlationId: string }>;
            const cancelledNotification = notifications.find((n) => n.eventType === 'order.cancelled');
            expect(cancelledNotification).to.exist;
            expect(cancelledNotification!.correlationId).to.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });
    });

    after(() => {
        cy.request({
            url: 'http://localhost:3001/internal/test/payment/failure-probability',
            method: 'POST',
            headers: {
                'x-internal-key': internalKey,
                'content-type': 'application/json',
            },
            body: { probability: 0 },
        });
    });
});
