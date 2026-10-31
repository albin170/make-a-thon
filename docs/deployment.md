# Brightloop SMS — Deployment Guide

## 1. Prerequisites
- Docker Engine & Docker Compose
- Node.js v18+ (for local development)
- PostgreSQL 16
- Redis 7

## 2. Quickstart with Docker Compose

1. Clone the repository:
   ```bash
   git clone https://github.com/albin170/make-a-thon.git
   cd make-a-thon
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

3. Start services via Docker Compose:
   ```bash
   docker compose up -d --build
   ```

4. Run database migrations and seed deterministic reference data:
   ```bash
   docker compose exec api npx prisma migrate deploy
   docker compose exec api npx ts-node prisma/seed.ts
   ```

5. Access the platforms:
   - **Frontend App**: `http://localhost:3000`
   - **Backend API & Swagger Docs**: `http://localhost:3001/api/docs`
   - **MailHog SMTP Inspector**: `http://localhost:8025`
   - **MinIO Storage Console**: `http://localhost:9001`

## 3. Default Seed Credentials
- **Admin**: `admin@brightloop.com` / `Admin@12345`
- **Staff**: `staff1@brightloop.com` / `Staff@12345`
- **Customer**: `customer1@example.com` / `Customer@12345`
