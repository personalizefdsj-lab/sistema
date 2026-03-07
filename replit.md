# Gestor de Pedidos - Multi-tenant Order Management SaaS

## Overview
A multi-tenant SaaS platform where multiple companies can manage their orders, clients, finances, and internal communication. Each company has isolated data with its own workspace. Includes public online store per company, shopping cart, checkout, and order tracking.

## Tech Stack
- **Frontend**: React + TypeScript + Tailwind CSS + Shadcn/UI + Wouter routing + TanStack Query
- **Backend**: Express.js + TypeScript + Passport.js (local auth) + Express Sessions + Multer (file uploads)
- **Database**: PostgreSQL with Drizzle ORM
- **Build**: Vite

## Architecture
- Multi-tenant: Each company's data is isolated by `companyId`
- Role-based: `superadmin` (platform owner), `admin` (company admin), `employee` (limited access with permissions)
- Session-based authentication with Passport.js
- Public routes (no auth): `/loja/:slug` (store), `/rastrear/:code` (tracking), `/portal/:slug` (client portal)
- Process-level error handlers for stability (uncaughtException, unhandledRejection)

## Key Features
- Company registration & login
- Dashboard with rich stats (revenue cards, quick stats, monthly revenue comparison, financial breakdown bar, status distribution bar, recent orders list)
- Order management (List + Kanban views) with order/quotation types
- Quotation system: create quotations (ORC-YEAR-NUMBER), convert to orders (FDJ-YEAR-NUMBER)
- Auto-generated order codes: `FDJ-YEAR-NNNN` for orders, `ORC-YEAR-NNNN` for quotations
- Client management with expanded fields (person type, document/CPF/CNPJ, address, phone optional)
- Financial tracking per order (paid/partial/pending)
- Financial expense control (income/expense entries with categories)
- Auto-alert for late orders (red "Atrasado" badge when delivery date passed)
- Auto-remove urgent flag when order status changed to "finished"
- Employee management with permission-based access control
- Company profile/settings with logo upload, CNPJ, address fields
- Password change (self) and admin password reset for employees
- Order/quotation printing with company branding
- PDV (Point of Sale) for quick counter sales
- WhatsApp manual integration (wa.me links)
- Internal chat/messaging system
- Super Admin panel for platform management
- Subscription plan structure (basic/professional/premium)
- **Products module**: CRUD with categories, parent/child product hierarchy, automatic sub-product generation from variations (size/color/model), wholesale + retail pricing, physical/digital types, SKU auto-generation (`PRD-NNNNN`)
- **Inventory control**: Stock tracking per product/variation, low stock alerts, movement history
- **Public online store**: Per-company store at `/loja/:slug` (professional/premium plans only)
- **Shopping cart + Checkout**: Client info form, automatic order creation
- **Order tracking**: Public page at `/rastrear/:code`
- **Client portal**: `/portal/:slug` (phone-based identification)

## Project Structure
```
shared/schema.ts     - All DB schemas, types, constants (ALL_PERMISSIONS, EXPENSE_CATEGORIES, etc.)
server/db.ts         - Database connection
server/auth.ts       - Passport + session setup (includes permissions in session)
server/storage.ts    - Data access layer (IStorage interface)
server/routes.ts     - All API endpoints
server/seed.ts       - Seed data for demo
server/index.ts      - Express app setup + process error handlers
client/src/App.tsx   - Main app with routing
client/src/lib/auth.tsx - Auth context provider (user type includes permissions)
client/src/pages/    - All page components
client/src/components/ - Shared components (order-detail, app-sidebar)
uploads/             - Company logo uploads
```

## Pages
- `/` - Dashboard
- `/orders` - Orders + Quotations (list + kanban, tabs for type)
- `/clients` - Client management (expanded form with address/document fields)
- `/products` - Product CRUD
- `/stock` - Inventory control
- `/financial` - Financial expense control (income/expense entries)
- `/pdv` - Point of Sale
- `/sales` - Online sales dashboard
- `/conversations` - Internal messaging
- `/employees` - Employee management with permissions (admin only)
- `/settings` - Company profile, logo upload, password change
- `/admin` - Super admin panel
- `/loja/:slug` - Public store (no auth)
- `/rastrear/:code` - Order tracking (no auth)
- `/portal/:slug` - Client portal (no auth, phone-based identification)

## Password Recovery
- **Super Admin reset**: Super admin can reset any company admin's password from the admin panel (key icon button per company)
- **Self-service forgot password**: Email-based recovery with 6-digit code (15-min expiry)
  - Flow: Enter email → receive code → enter code + new password → success
  - Backend: POST /api/auth/forgot-password, POST /api/auth/reset-password
  - Email sent via nodemailer (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM env vars)
  - Falls back to console logging if SMTP not configured
- **Email field**: Users can set recovery email during registration or in Settings page
  - Users table has `email`, `resetToken`, `resetTokenExpiry` columns

## Permission System
- Admins and superadmins bypass all permission checks
- Employees have explicit permissions stored as JSON array: `["orders","clients","products","stock","financial","conversations","settings","pdv"]`
- Server-side enforcement via `requirePermission()` middleware in `server/auth.ts`
- Sidebar dynamically hides pages based on permissions (client-side)
- Employee management routes scoped by `companyId` to prevent cross-tenant access

## Database
- PostgreSQL via Drizzle ORM
- Tables: companies, users, clients, orders, order_history, messages, products, stock_movements, order_items, expenses, session
- Schema migrations done via ALTER TABLE SQL (avoid drizzle-kit push to preserve session table)
- Companies have: cnpj, address, neighborhood, city, state, zipCode fields
- Clients have: personType, document, neighborhood, streetNumber, city, state fields (phone is optional)
- Users have: permissions (jsonb array)
- Orders have: type field ("order"|"quotation")

## Demo Credentials
- **Super Admin**: username: `superadmin`, password: `admin123`
- **Company Admin (Arte Digital Studio, professional plan)**: username: `maria`, password: `123456`
- **Company Admin (Print Express)**: username: `joao`, password: `123456`
- **Basic plan test**: username: `teste`, password: `123456`
