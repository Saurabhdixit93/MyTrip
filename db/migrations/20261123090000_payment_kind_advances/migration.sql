-- CreateEnum
CREATE TYPE "PaymentKind" AS ENUM ('SETTLEMENT', 'ADVANCE');

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "kind" "PaymentKind" NOT NULL DEFAULT 'SETTLEMENT',
ADD COLUMN     "paidOn" DATE;

-- CreateIndex
CREATE INDEX "Payment_tripId_kind_idx" ON "Payment"("tripId", "kind");

