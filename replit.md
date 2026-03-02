# Gestor de Pedidos - Multi-tenant Order Management SaaS

## Overview
A multi-tenant SaaS platform where multiple companies can manage their orders, clients, finances, and internal communication. Each company has isolated data with its own workspace.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn/UI + Wouter routing + TanStack Query
- **Backend**: Express.js + TypeScript + Passport.js (local auth) + Express Sessions
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite

## Architecture
- Multi-tenant: Each company's data is isolated by `companyId`
- Role-based: `superadmin` (platform owner), `admin` (company admin)
- Session-based authentication with Passport.js

## Key Features
- Company registration & login
- Dashboard with financial stats
- Order management (List + Kanban views)
- Auto-generated order codes: `FDJ-YEAR-NUMBER`
- Client management with phone-based identification
- Financial tracking per order (paid/partial/pending)
- WhatsApp manual integration (wa.me links)
- Internal chat/messaging system
- Super Admin panel for platform management
- Subscription plan structure (basic/professional/premium)

## Project Structure
```
shared/schema.ts     - All DB schemas, types, constants
server/db.ts         - Database connection
server/auth.ts       - Passport + session setup
server/storage.ts    - Data access layer (IStorage interface)
server/routes.ts     - All API endpoints
server/seed.ts       - Seed data for demo
client/src/App.tsx   - Main app with routing
client/src/lib/auth.tsx - Auth context provider
client/src/pages/    - All page components
client/src/components/ - Shared components
```

## Demo Credentials
- **Super Admin**: username: `superadmin`, password: `admin123`
- **Company Admin (Arte Digital Studio)**: username: `maria`, password: `123456`
- **Company Admin (Print Express)**: username: `joao`, password: `123456`

## Database
- PostgreSQL via Drizzle ORM
- Tables: companies, users, clients, orders, order_history, messages, session
- Schema push: `npm run db:push`
