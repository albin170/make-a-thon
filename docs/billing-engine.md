# Brightloop SMS — Recurring Billing Engine Specification

## 1. Problem Statement & Criticality
In subscription financial systems, double-billing or silently missed charges represent catastrophic failures. The Brightloop Billing Engine is designed with database-enforced idempotency, strict concurrency locks, and deterministic calendar arithmetic.

## 2. Workflow Execution Lifecycle

```
[Billing Scheduler Cron (Hourly)]
        │
        ▼
Identify Subscriptions (Status=ACTIVE, nextBillingDate <= now)
        │
        ▼
Derive Deterministic Period Key: `${subscriptionId}::${format(nextBillingDate, 'yyyy-MM-dd')}`
        │
        ▼
Insert BillingPeriod (status=PENDING)
* Enforces PostgreSQL UNIQUE(subscriptionId, periodKey) constraint *
        │
        ▼
Enqueue BullMQ Job with `jobId = periodKey`
        │
        ▼
[BullMQ Worker Process]
        │
        ├─► Begin PostgreSQL Transaction
        ├─► Verify subscription is still ACTIVE
        ├─► Verify BillingPeriod does not have invoiceId
        ├─► Calculate Line Totals, Taxes, and Discounts via PricingEngine
        ├─► Insert Invoice and InvoiceLines
        ├─► Update BillingPeriod (status=BILLED, invoiceId=INV_ID, billedAt=now)
        ├─► Advance Subscription nextBillingDate to next interval
        ├─► Insert NotificationOutbox record (type=INVOICE_READY)
        └─► Commit Transaction
```

## 3. Crash Recovery & Retries
- Bounded retries: 5 attempts with exponential backoff and jitter.
- If a worker crashes mid-run, the database transaction rolls back. On worker restart, BullMQ re-executes using the exact same `periodKey`.
- If an invoice is already attached to the `BillingPeriod`, the job exits cleanly without creating duplicates.

