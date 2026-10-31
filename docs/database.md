# Brightloop SMS — Database Schema Documentation

## 1. Schema Conventions
- **Primary Keys**: UUID v4 (`@default(uuid())`).
- **Precision**: Monetary quantities use fixed decimal precision `Decimal(18, 4)`. Floating point numeric types are strictly prohibited in financial tables.
- **Normalizations**: User email addresses are normalized to lowercase in `emailNormalized` with a unique database constraint.

## 2. Core Entities Summary

### 2.1 Users & Authentication
- `User`: Global accounts across roles (`ADMIN`, `STAFF`, `CUSTOMER`). Stores Argon2id password hashes.
- `UserSession`: Active refresh tokens with expiration and instant revocation support.
- `PasswordResetToken`: Cryptographically secure single-use hashed reset tokens.

### 2.2 Customers & Products
- `Customer`: Associated 1-to-1 with a `User`, containing billing metadata and default currency.
- `Product`: Catalog items (SERVICE, PHYSICAL, DIGITAL, SUBSCRIPTION) with sales price and cost price.
- `ProductVariant`: Brand-based pricing adjustments (e.g., Odoo brand adding +$560.00).

### 2.3 Plans & Lifecycle
- `Plan`: Defines `DAILY`, `WEEKLY`, `MONTHLY`, `YEARLY` intervals, interval count, pause rules, early closure rules, and renewals.
- `Quotation`: Templates and customer-specific quotes with status `DRAFT`, `SENT`, `ACCEPTED`, `REJECTED`, `EXPIRED`.
- `Subscription`: Active lifecycle instances (`DRAFT` → `ACTIVE` → `PAUSED` → `CLOSED`), tracking `nextBillingDate`.
- `SubscriptionAuditEvent`: Immutable audit trail for every status transition.

### 2.4 Billing Engine & Invoicing
- `BillingRun`: Execution runs tracking totals processed, succeeded, and failed.
- `BillingPeriod`: Idempotent billing period record with unique key `${subscriptionId}::${YYYY-MM-DD}`.
- `Invoice`: Financial statement with status `DRAFT`, `CONFIRMED`, `PAID`, `CANCELLED` and `PaymentStatus` (`UNPAID`, `PARTIALLY_PAID`, `PAID`, `OVERDUE`).
- `Payment` & `PaymentAllocation`: Multi-invoice payment tracking and balance settlement.
- `NotificationOutbox`: Transactional email outbox pattern.

