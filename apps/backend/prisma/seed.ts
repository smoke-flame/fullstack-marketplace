import { PrismaClient, Role, ProductStatus } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/utils/password.util';

const prisma = new PrismaClient();

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.com';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin12345!';

const categoryDefinitions = [
  { title: 'Electronics', parentTitle: null },
  { title: 'Laptops', parentTitle: 'Electronics' },
  { title: 'Home & Garden', parentTitle: null },
  { title: 'Sports', parentTitle: null },
];

async function findOrCreateCategory(title: string, parentId: string | null) {
  const existing = await prisma.category.findFirst({ where: { title, parentId } });
  if (existing) return existing;
  return prisma.category.create({ data: { title, parentId } });
}

async function main() {
  const hashedPassword = await hashPassword(adminPassword);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { password: hashedPassword, roles: [Role.SELLER] },
    create: { email: adminEmail, password: hashedPassword, roles: [Role.SELLER] },
  });

  const categories = new Map<string, { id: string }>();
  for (const definition of categoryDefinitions) {
    const parentId = definition.parentTitle ? categories.get(definition.parentTitle)?.id ?? null : null;
    categories.set(definition.title, await findOrCreateCategory(definition.title, parentId));
  }

  for (const [categoryTitle, category] of categories) {
    for (let index = 1; index <= 5; index += 1) {
      const title = `${categoryTitle} product ${index}`;
      const existing = await prisma.product.findFirst({ where: { title, categoryId: category.id, sellerId: admin.id } });
      const product = existing
        ? await prisma.product.update({ where: { id: existing.id }, data: { price: index * 100, status: ProductStatus.ACTIVE } })
        : await prisma.product.create({ data: { title, categoryId: category.id, sellerId: admin.id, price: index * 100, description: `Seeded ${categoryTitle} product ${index}`, status: ProductStatus.ACTIVE } });
      await prisma.searchDocument.upsert({
        where: { productId: product.id },
        update: { title: product.title, description: product.description, price: product.price, categoryId: product.categoryId, sellerId: product.sellerId, status: product.status, occurredAt: product.updatedAt },
        create: { productId: product.id, title: product.title, description: product.description, price: product.price, categoryId: product.categoryId, sellerId: product.sellerId, status: product.status, occurredAt: product.updatedAt },
      });
    }
  }

  console.log(`Seeded admin ${adminEmail}, ${categories.size} categories, and ${categories.size * 5} products.`);
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
