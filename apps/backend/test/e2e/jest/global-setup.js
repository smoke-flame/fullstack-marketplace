const { PrismaClient } = require('@prisma/client');

module.exports = async () => {
  const prisma = new PrismaClient();
  try {
    const tables = [
      'Outbox',
      'ProcessedEvent',
      'SagaState',
      'Payment',
      'OrderTimeline',
      'OrderItem',
      'Order',
      'Reservation',
      'Purchase',
      'Review',
      'ProductRating',
      'SearchDocument',
      'Stock',
      'Product',
      'Category',
      'User',
    ];
    for (const t of tables) {
      const modelName = t.charAt(0).toLowerCase() + t.slice(1);
      await prisma[modelName].deleteMany({});
    }
    console.log('[jest globalSetup] Cleared shared test database');
  } finally {
    await prisma.$disconnect();
  }
};
