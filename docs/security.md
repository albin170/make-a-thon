# Brightloop SMS — Security Checklist & Hardening

## 1. Authentication & Session Security
- [x] **Argon2id Hashing**: State-of-the-art password hashing with salt and memory cost.
- [x] **Password Policy**: Minimum 9 characters, uppercase, lowercase, and special characters enforced.
- [x] **Account Enumeration Prevention**: Password reset endpoints return identical generic responses regardless of email existence.
- [x] **Single-Use Hashed Reset Tokens**: Password reset tokens stored as SHA-256 hashes, invalidating all sessions on completion.
- [x] **Rate Limiting**: Throttler limits brute force attempts on `/auth/login` and `/auth/forgot-password`.

## 2. Server-Side Authorization & IDOR Protections
- [x] **JWT Verification**: Strict token signature checks and revocable session tracking.
- [x] **Role Guards**: `@Roles('ADMIN', 'STAFF', 'CUSTOMER')` enforced on all controllers.
- [x] **Customer Resource Scoping**: Customers can only view or interact with their own subscriptions and invoices.
- [x] **Privilege Escalation Block**: Staff cannot create Admin users or grant unauthorized permissions.

## 3. Financial Data Integrity
- [x] **BigInt Minor Unit Pricing**: Zero floating point errors in monetary totals.
- [x] **Immutable Confirmed Invoices**: Once confirmed, invoice lines cannot be edited.
- [x] **Atomic Payment Allocations**: Database transactions prevent over-allocation.
- [x] **Concurrency Locking**: Discount usage limits checked and incremented within database transactions.

