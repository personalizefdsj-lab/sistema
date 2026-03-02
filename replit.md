# Gestor de Pedidos - Multi-tenant Order Management SaaS

## Overview
A multi-tenant SaaS platform where multiple companies can manage their orders, clients, finances, and internal communication. Each company has isolated data with its own workspace. Includes public online store per company, shopping cart, checkout, and order tracking.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn/UI + Wouter routing + TanStack Query
- **Backend**: Express.js + TypeScript + Passport.js (local auth) + Express Sessions
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite

## Architecture
- Multi-tenant: Each company's data is isolated by `companyId`
- Role-based: `superadmin` (platform owner), `admin` (company admin)
- Session-based authentication with Passport.js
- Public routes (no auth): `/loja/:slug` (store), `/rastrear/:code` (tracking)

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
- **Products module**: CRUD with categories, variations (size/color/model), physical/digital types, SKU auto-generation
- **Inventory control**: Stock tracking, low stock alerts, movement history (in/out/sale/adjustment), automatic stock reduction on order finish
- **Public online store**: Per-company store at `/loja/:slug`, product listing with search/filter, product detail, responsive design
- **Shopping cart**: Add/remove/update quantities, variation selection, total calculation
- **Checkout flow**: Client info form, automatic order + client creation, order code generation
- **Order tracking**: Public page at `/rastrear/:code`, timeline view of order progress
- **Sales dashboard**: Online sales metrics (monthly total, orders count, average ticket)

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

## Pages
- `/` - Dashboard
- `/orders` - Orders (list + kanban)
- `/clients` - Client management
- `/products` - Product CRUD
- `/stock` - Inventory control
- `/sales` - Online sales dashboard
- `/conversations` - Internal messaging
- `/admin` - Super admin panel
- `/loja/:slug` - Public store (no auth)
- `/rastrear/:code` - Order tracking (no auth)
- `/portal/:slug` - Client portal (no auth, phone-based identification)

## Demo Credentials
- **Super Admin**: username: `superadmin`, password: `admin123`
- **Company Admin (Arte Digital Studio)**: username: `maria`, password: `123456`
- **Company Admin (Print Express)**: username: `joao`, password: `123456`

## Database
- PostgreSQL via Drizzle ORM
- Tables: companies, users, clients, orders, order_history, messages, products, stock_movements, order_items, session
- Schema push: `npm run db:push`
