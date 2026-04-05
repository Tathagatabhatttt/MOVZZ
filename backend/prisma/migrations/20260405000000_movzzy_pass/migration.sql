-- MOVZZY Pass — Subscription table

CREATE TABLE "Subscription" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,
  "plan"        TEXT NOT NULL,
  "status"      TEXT NOT NULL DEFAULT 'ACTIVE',
  "discountPct" DOUBLE PRECISION NOT NULL,
  "noSurge"     BOOLEAN NOT NULL DEFAULT true,
  "startDate"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt"   TIMESTAMP(3) NOT NULL,
  "autoRenew"   BOOLEAN NOT NULL DEFAULT true,
  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Subscription_userId_key" ON "Subscription"("userId");
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");
CREATE INDEX "Subscription_expiresAt_idx" ON "Subscription"("expiresAt");

ALTER TABLE "Subscription"
  ADD CONSTRAINT "Subscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
