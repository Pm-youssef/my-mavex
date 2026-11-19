# Mavex — T-shirt store

A full online store for an Egyptian clothing brand: catalogue, cart, favourites, coupons, checkout with **Paymob**, customer accounts, reviews, and an admin dashboard for orders, products, shipping, customers and analytics. Arabic-first UI.

Built with Next.js 14 (App Router), TypeScript, Prisma + PostgreSQL, Tailwind and Radix UI. Status: portfolio project (2025), not in production.

## Run it locally

Requires Node 18+ and Docker (for PostgreSQL).

```bash
docker run --name tshirt-db -e POSTGRES_PASSWORD=password -e POSTGRES_DB=tshirtstore -p 5432:5432 -d postgres:15
cp env.example .env        # set DATABASE_URL and ADMIN_PASSWORD (change the default)
npm install
npm run db:push            # create the tables
npm run db:seed            # sample products
npm run dev                # http://localhost:3000  ·  admin: /admin
```

Payments, email, Google/Facebook login and analytics stay off until their keys are set in `.env` (see [`env.example`](env.example)).

## What is inside

- **Store**: products and categories, cart, favourites, coupons, contact form, reviews, account pages, sitemap, maintenance mode.
- **Checkout**: Paymob iframe + webhook (`src/lib/paymob.ts`, `src/app/api/checkout`, `src/app/api/webhook/paymob`).
- **Admin** (`src/app/admin`): orders, products, categories, coupons, customers, reviews, messages, shipping, settings, analytics.
- **Auth**: JWT for customers and admins, bcrypt passwords, Cloudflare Turnstile on forms.
- **Tests**: Vitest unit tests (`npm test`) and Playwright end-to-end (`npm run test:e2e`).

Deploys on Vercel or Netlify (`vercel.json`, `netlify.toml`) or with Docker (`Dockerfile`, `docker-compose.yml`).
