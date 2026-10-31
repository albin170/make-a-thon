# Brightloop SMS — System Architecture Documentation

## 1. Executive Overview

Brightloop Subscription Management System (SMS) is an enterprise-grade TypeScript modular monolith engineered for end-to-end subscription lifecycle orchestration, recurring billing execution, automated invoicing, manual payment reconciliation, and real-time financial reporting.

## 2. High-Level Architecture Diagram

```mermaid
flowchart TD
    subgraph ClientLayer["Clients"]
        BrowserAdmin["Admin & Staff Workspace (Next.js 14)"]
        BrowserCustomer["Customer Self-Service Portal (Next.js 14)"]
    end

    subgraph ApiGateway["NestJS Modular Monolith API (/api/v1)"]
        AuthMod["Auth & RBAC (Argon2id + JWT)"]
        ProdMod["Products & Brand Variants"]
        PlanMod["Plans & Policies"]
        QuoMod["Quotations & Templates"]
        SubMod["Subscription Lifecycle Engine"]
        InvMod["Invoices & PDF Generation"]
        PayMod["Payment & Reconciliation"]
        PriceEngine["Server-Side Pricing Engine (BigInt)"]
        BillSched["Billing Scheduler (Cron)"]
        ReportMod["Financial Reporting (Live Aggregation)"]
    end

    subgraph DataQueueStorage["State & Persistence"]
        Postgres[(PostgreSQL 16\nRelational Schema)]
        Redis[(Redis 7\nBullMQ Queues)]
        MinIO[(MinIO / S3\nEncrypted PDF Store)]
        MailHog[(SMTP Mail Server)]
    end

    subgraph WorkerLayer["Async Background Workers"]
        BillWorker["BullMQ Billing Worker"]
        EmailWorker["Transactional Outbox Worker"]
        PdfWorker["Invoice PDF Generator Worker"]
    end

    BrowserAdmin -->|REST / JWT| ApiGateway
    BrowserCustomer -->|REST / JWT| ApiGateway
    ApiGateway --> Postgres
    BillSched -->|Enqueue Period| Redis
    Redis --> BillWorker
    BillWorker -->|Idempotent Billing Tx| Postgres
    BillWorker -->|Outbox Event| Postgres
    EmailWorker -->|Poll Outbox| Postgres
    EmailWorker -->|Dispatch| MailHog
    PdfWorker -->|Upload PDF| MinIO
```

## 3. Technology Stack Breakdown

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Heroicons, Headless UI.
- **Backend**: NestJS 10, Express, TypeScript, class-validator, Helmet, Winston, OpenAPI/Swagger.
- **ORM & Database**: Prisma ORM, PostgreSQL 16 (UUID primary keys, fixed decimal precision 18,4, foreign key constraints).
- **Job Queues & Scheduler**: Redis 7, BullMQ (exponential backoff, deduplication jobId).
- **Document Generation**: PDFKit (server-side streaming) and AWS S3 / MinIO storage.
- **Security**: Argon2id password hashing, HTTP-only JWT sessions, rate limiting, and zero plaintext token persistence.

