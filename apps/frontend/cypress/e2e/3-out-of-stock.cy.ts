describe('Out of stock E2E', () => {
    const password = 'Password123!';
    const ts = Date.now();
    const sellerEmail = `seller-stock-${ts}@example.com`;
    const buyerEmail = `buyer-stock-${ts}@example.com`;
    const productTitle = `Cypress Stock Product ${ts}`;
    const internalKey = Cypress.env('INTERNAL_API_KEY') || 'secure-internal-key';

    it('order is cancelled when inventory is rejected and notification is sent', () => {
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
        cy.get('[data-test-id="product-description"]').type('A product for out of stock test');
        cy.get('[data-test-id="product-price"]').type('25');
        cy.get('[data-test-id="product-category"]').then(($select) => {
            const options = Array.from($select.find('option')) as HTMLOptionElement[];
            const opt = options.find((o) => o.value && o.value !== '');
            if (opt) {
                cy.get('[data-test-id="product-category"]').select(opt.value);
            }
        });
        cy.get('[data-test-id="create-product-submit"]').click();

        // Set stock to 1
        cy.get('[data-test-id="nav-inventory"]').click();
        cy.contains(productTitle).closest('tr').within(() => {
            cy.contains('Set Stock').click();
            cy.get('[data-test-id="stock-onhand-input"]').clear().type('1');
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

        // Go to cart and change quantity to 2
        cy.get('[data-test-id="nav-cart"]').click();
        cy.url().should('include', '/cart');
        cy.intercept('PUT', '/cart/items/*').as('updateCart');
        cy.get(`input[id^="qty-"]`).type('{selectall}2');
        cy.wait('@updateCart');

        // Proceed to checkout and pay
        cy.get('[data-test-id="proceed-to-checkout"]').click();
        cy.url().should('include', '/checkout');
        cy.get('[data-test-id="checkout-pay"]').click();

        // After payment we should be on orders page
        cy.url().should('include', '/orders');

        // Wait up to 90s for the order to reach CANCELLED status with inventory_rejected reason
        cy.get('a[data-test-id^="order-link-"]', { timeout: 10000 }).should('exist');
        cy.get('a[data-test-id^="order-link-"]').first().then(($link) => cy.visit($link.prop('href')));
        cy.contains('CANCELLED', { timeout: 90000 }).should('exist');
        cy.contains('inventory_rejected', { timeout: 90000 }).should('exist');

        // Wait for notification consumer to process order.cancelled
        cy.wait(10000);

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

});
