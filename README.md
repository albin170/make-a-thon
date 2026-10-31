# Brightloop Subscription Management System

A subscription and recurring-billing management platform for Brightloop Software. The project is organized as a TypeScript monorepo with a web dashboard, REST API, background worker, and shared PostgreSQL data model.

> **Project status:** This README documents the repository structure and intended setup. Configure real credentials and verify all integrations before using the system in production.

## Overview

Brightloop is designed to bring subscription operations into one place instead of relying on spreadsheets and manual invoice processing.

Core areas of the application include:

- **Products and variants** — manage product details, prices, costs, and variant price adjustments.
- **Subscription plans** — define recurring billing intervals and plan availability.
- **Subscriptions and quotations** — manage customer subscriptions and their lifecycle.
- **Recurring billing** — schedule billing work through a background worker.
- **Invoices and payments** — track invoice status, payment records, and outstanding balances.
- **Taxes and discounts** — centralize pricing calculations and discount rules.
- **Reporting** — provide a view of subscription and billing activity.
- **Authentication and access control** — support protected API routes and role-based access.
- **Email and invoice files** — support email delivery and invoice document/storage integrations.

Availability and completeness of individual features depend on their current implementation and configuration.

## Technology Stack

| Area | Technologies |
| --- | --- |
| Web application | Next.js 14, React 18, TypeScript |
| UI | Tailwind CSS, Headless UI, Heroicons |
| API | NestJS, REST, Swagger/OpenAPI |
| Database | PostgreSQL 16, Prisma ORM |
| Background jobs | Redis, Bull |
| Authentication and security | JWT/Passport, Argon2, Helmet, request throttling |
| Forms and validation | React Hook Form, Zod, class-validator |
| Charts | Recharts |
| Documents and email | PDFKit, Nodemailer |
| Local infrastructure | Docker Compose, MinIO, MailHog |

## Architecture

```text
make-a-thon/
├── apps/
│   ├── web/          # Next.js frontend
│   ├── api/          # NestJS REST API
│   └── worker/       # Background job processing
├── prisma/           # Prisma schema and database seed
├── infra/docker/     # Database initialization assets
├── docker-compose.yml
├── .env.example
└── package.json      # npm workspaces and root scripts
```

The web application communicates with the API. The API and worker use PostgreSQL for persistent records and Redis for queued background work. Docker Compose provides local supporting services, including MinIO for S3-compatible object storage and MailHog for capturing development email.

## Prerequisites

Install the following before starting:

- Node.js compatible with the project dependencies (Node.js 20 LTS is a sensible starting point)
- npm
- Docker Desktop with Docker Compose
- Git

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/albin170/make-a-thon.git
cd make-a-thon
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Copy the example configuration and edit it for your environment.

**Windows PowerShell**
```powershell
Copy-Item .env.example .env
```

**macOS / Linux**
```bash
cp .env.example .env
```

Set the database URL, Redis URL, JWT/session secrets, frontend/API URLs, email settings, and storage settings as needed. Do not commit your real `.env` file or production secrets.

### 4. Start local infrastructure

Start the supporting services defined in Docker Compose:

```bash
docker compose up -d postgres redis minio mailhog
```

Useful local service addresses:

| Service | Address |
| --- | --- |
| Web app (when running) | http://localhost:3000 |
| API (when running) | http://localhost:3001 |
| MailHog inbox | http://localhost:8025 |
| MinIO console | http://localhost:9001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

The credentials in the repository's Compose file are for local development only. Replace them for any non-local environment.

### 5. Prepare the database

Review the Prisma schema and migration files before applying changes. Then run:

```bash
npm run db:migrate
npm run db:seed
```

If the seed command or migration fails, check the `DATABASE_URL`, confirm PostgreSQL is healthy, and follow any setup instructions defined by the current Prisma schema. The seed script may create development/sample records.

### 6. Run the application

Start the web app, API, and worker together:

```bash
npm run dev
```

Or run a component separately:

```bash
npm run dev:web
npm run dev:api
npm run dev:worker
```

The root `dev` command starts all three processes concurrently. Run it in a terminal from the repository root.

### 7. Explore the database

To open Prisma Studio:

```bash
npm run db:studio
```

## Environment Configuration

The `.env.example` file documents the project's expected configuration. Important variables include:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_URL` | Redis connection used by queued jobs |
| `JWT_SECRET`, `REFRESH_TOKEN_SECRET`, `SESSION_SECRET` | Authentication/session secrets |
| `NEXT_PUBLIC_API_URL` | API base URL used by the frontend |
| `SMTP_HOST`, `SMTP_PORT`, `EMAIL_FROM` | Outgoing email configuration |
| `STORAGE_ENDPOINT`, `STORAGE_BUCKET` | S3-compatible document storage |
| `APP_URL`, `FRONTEND_URL` | Application URLs used in links and messages |

Use unique, strong secrets outside local development. Never put private credentials in client-side variables or source control.

## Available Scripts

Run these from the repository root:

| Command | Description |
| --- | --- |
| `npm run dev` | Start web, API, and worker in parallel |
| `npm run dev:web` | Start the Next.js web application |
| `npm run dev:api` | Start the NestJS API in watch mode |
| `npm run dev:worker` | Start the background worker |
| `npm run build` | Build configured workspaces |
| `npm test` | Run available workspace tests |
| `npm run lint` | Run available workspace lint scripts |
| `npm run db:migrate` | Run Prisma development migrations |
| `npm run db:seed` | Run the database seed script |
| `npm run db:studio` | Open Prisma Studio |

Some scripts depend on the relevant workspace and infrastructure being configured. Check each workspace's `package.json` for its exact scripts.

## Security Notes

- Keep `.env` and all production credentials out of Git.
- Replace the development secrets and default service passwords before deployment.
- Use HTTPS and secure cookie/session settings in production.
- Restrict administrative and staff actions through server-side authorization.
- Validate input at API boundaries and apply least-privilege database and storage permissions.
- Test password reset, authorization, billing retries, and invoice access before release.
- Use backups and verify that database restoration works.

## Testing and Quality Checks

Before submitting changes, run the checks available in the repository:

```bash
npm test
npm run lint
npm run build
```

For billing-related changes, also test recurring billing across retries, duplicate job delivery, partial payments, tax/discount calculations, and invoice status transitions. Do not treat a successful build alone as proof that every integration works.

## Contributing

1. Create a feature branch.
2. Make a focused change and add or update tests.
3. Run the relevant lint, test, and build commands.
4. Commit with a descriptive message.
5. Open a pull request describing the change and its verification.

## License

No license is currently specified in the repository. Unless a license is added, standard copyright restrictions apply to reuse and redistribution.
