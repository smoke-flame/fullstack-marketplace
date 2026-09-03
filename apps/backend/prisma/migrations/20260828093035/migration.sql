-- DropIndex
DROP INDEX "Payment_orderId_idx";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'UAH';

-- AlterTable
ALTER TABLE "SearchDocument" ADD COLUMN     "currency" VARCHAR(3) NOT NULL DEFAULT 'UAH';
