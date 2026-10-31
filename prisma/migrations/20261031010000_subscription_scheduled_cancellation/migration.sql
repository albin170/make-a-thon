ALTER TABLE "Subscription"
  ADD COLUMN "cancellationRequestedAt" TIMESTAMP(3),
  ADD COLUMN "cancellationEffectiveAt" TIMESTAMP(3),
  ADD COLUMN "cancellationReason" TEXT;

CREATE INDEX "Subscription_cancellationEffectiveAt_idx"
  ON "Subscription"("cancellationEffectiveAt");
