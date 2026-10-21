# Reviewed additive schema patches

The repository currently has no Prisma migration baseline. The SQL files here are
reviewable patches for an existing schema, not a replacement for migration history.
Do not use `prisma migrate reset` to apply them.

## 20261020_order_idempotency.sql

Adds nullable `Order.idempotencyKey` and `Order.requestHash` columns and a unique
index on restaurant, session and request key. Historical orders retain NULL values;
no historical data is rewritten. The fingerprint remains available even if menu
administration removes an order's item rows.

Apply once to a disposable staging copy using the team's approved SQL migration
process. The ALTER/CREATE INDEX transaction takes locks: evaluate its duration on
the staging copy before planning rollout. Establish a proper migration baseline
before adopting `prisma migrate deploy`; this patch is not that baseline.

Deploy the schema before the new backend, regenerate Prisma Client, and coordinate
the customer frontend rollout. New order submissions require an Idempotency-Key
header. Old uncertain requests without a stored key need staff reconciliation;
they must not be automatically assigned a new retry identity.

Verify concurrent same-key submissions against PostgreSQL, rollback of failed
nested writes, mismatched payload conflicts, NULL historical orders and recovery
after a lost response. This patch has not been applied by the coding task.
