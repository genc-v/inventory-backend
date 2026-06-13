# Product Inventory & Order Management API

A small ecommerce backend for managing a product catalogue and placing orders
against live stock. The point of the exercise is correct ordering under
concurrency: two customers racing for the last item should not both succeed, and
they don't.

Built with NestJS, TypeScript, and PostgreSQL via TypeORM. It runs end-to-end
with `docker compose up`, and JWT auth protects ordering and product writes.

**Live API:** https://inventory.gencvh.com/api

> This repo is the backend only. The frontend is a separate repo that consumes
> this API. They deploy independently, each with its own history and pipeline.

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Why PostgreSQL](#why-postgresql)
- [Quick start](#quick-start)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Concurrency](#concurrency)
- [Tests](#tests)
- [Auth](#auth)
- [API reference](#api-reference)
- [Configuration](#configuration)
- [What I'd do with more time](#what-id-do-with-more-time)

## What it does

- **Products** full CRUD over `name`, `sku`, `price`, `stockQuantity`,
  `category`. The list endpoint supports pagination and filtering by category.
- **Orders** place an order for one or more products. On placement the service
  checks every line is in stock, decrements stock atomically, and computes and
  stores the order total.
- **Order listing** read back orders with their line items and totals.
- **Validation** DTO validation with field-level error messages.
- **Auth** register and login return a JWT. Orders need a valid token; product
  writes need an admin.

## Tech stack

| Concern    | Choice                 |
| ---------- | ---------------------- |
| Framework  | NestJS                 |
| Language   | TypeScript             |
| Database   | PostgreSQL (TypeORM)   |
| Auth       | JWT + Passport, bcrypt |
| Validation | class-validator        |
| Runtime    | Docker + Compose       |

NestJS was chosen mainly for its dependency injection and module boundaries,
which keep routing, business logic, and data access in separate places without
much ceremony.

## Why PostgreSQL

The domain is relational and the consistency requirements are strict, so a
relational database is the obvious fit.

- An order, its line items, and the products they reference form a foreign-key
  graph. A line item means nothing on its own.
- The core requirement is atomic stock decrement under concurrency. Postgres
  gives that directly with real transactions and `SELECT ... FOR UPDATE` row
  locking. Doing the same safely in a document store pushes the locking into
  application code, which is easy to get wrong.
- Money and stock want constraints: a unique `sku`, `numeric` columns for money,
  non-negative quantities.

A document store would be a better fit for a large, loosely structured catalogue.
Here the consistency rules matter more than schema flexibility.

## Quick start

### Docker

Needs Docker with Compose v2. From a clean checkout:

```bash
docker compose up --build
```

This starts Postgres and the API. The API waits for the database healthcheck and
creates the schema on first boot, then listens on http://localhost:3000/api.

```bash
curl http://localhost:3000/api/health
# {"status":"ok","service":"inventory-order-service"}
```

The deployed instance answers on the same path:

```bash
curl https://inventory.gencvh.com/api/health
```

### Without Docker

```bash
cp .env.example .env      # point at a running Postgres
npm install
npm run start:dev
```

## Architecture

The code is organised by layer, one responsibility per file, with dependencies
pointing inward. Business logic does not depend on the framework or the database.

```
src/
├── api/          # Controllers: HTTP only  routing, status codes, guards
├── application/  # Services and use-cases: business rules
├── domain/       # Entities and repository interfaces: the model, framework-free
└── infra/        # TypeORM repositories, Nest modules, config, auth
```

A request flows api → application → domain ← infra.

- Order placement lives in
  `application/orders/use-cases/place-order.use-case.ts` and knows nothing about
  HTTP or TypeORM.
- The `domain` layer declares repository interfaces; `infra` provides the TypeORM
  implementations, wired through DI tokens. The core stays unit-testable and the
  persistence layer stays swappable.
- Controllers translate HTTP to use-case calls and back. No business logic in
  routing.

The layering costs some boilerplate (interfaces plus injection tokens) over a
single service class. I only paid that cost around the order and stock logic,
which is what the exercise is actually about.

## Data model

```
Order (1) ───< (N) OrderItem (N) >─── (1) Product
            (an Order belongs to a User)

users        id, email (unique), passwordHash (select:false), isAdmin, createdAt
products     id, name, sku (unique), price numeric(12,2), stockQuantity, category (idx), timestamps
orders       id, userId (fk, idx), total numeric(12,2), status, createdAt
order_items  id, orderId (fk), productId (fk), quantity, unitPrice, lineTotal
```

- `order_items.unitPrice` and `lineTotal` snapshot the price at purchase time, so
  old orders stay accurate when a product's price changes later.
- `orders.total` is computed once and stored at creation.
- Money is `numeric(12,2)` to avoid float rounding; a transformer surfaces it to
  the app as a JS number.
- Unique constraints on `sku` and `email`; indexes on `category` and
  `orders.userId`. `passwordHash` is `select: false` so it never leaks through
  ordinary reads.

## Concurrency

I used pessimistic row locking inside a single transaction.

Order placement runs in one transaction. For each product it issues a
`SELECT ... FOR UPDATE`:

```ts
manager.findOne(Product, {
  where: { id: productId },
  lock: { mode: 'pessimistic_write' },
});
```

That takes a write lock on the product row. A second order trying to lock the
same row waits until the first transaction commits or rolls back. Because stock
is validated and decremented while the lock is held, two orders for the last unit
can't both win: the second one wakes up, sees the lower stock, and gets a
`409 Conflict`. If any line in an order fails, the whole transaction rolls back
and no stock changes.

Two details that matter:

- Products are locked in id-sorted order, so two multi-item orders can't deadlock
  by grabbing rows in opposite sequence.
- Repeated `productId`s in one request are summed before locking and validation.

I picked pessimistic locking over the alternatives because "last item in stock"
is high-contention by nature, and optimistic concurrency (a version column plus
retry) tends to thrash under contention. A conditional
`UPDATE ... WHERE stockQuantity >= qty` would also be correct, but locking reads
more clearly and keeps all the validation for a multi-line order in one place.
The cost is that locks are held for the transaction's duration, which is fine at
this scale.

## Tests

Unit tests cover the business logic with mocked repositories, so they run fast
and need no database.

```bash
npm test
npm run test:cov
```

Most of the coverage is on `PlaceOrderUseCase`:

- stock is decremented and the total computed with correct per-line price
  snapshots,
- insufficient stock returns `409` and saves nothing,
- a missing product returns `404`,
- products are locked in id-sorted order,
- duplicate line items for one product are aggregated before validation.

There's also coverage on `ProductsService` (not-found, pagination clamping) and
`GetOrderUseCase` (ownership, not-found). The one thing these can't prove is that
the real database lock stops a race; that's the first item under
[What I'd do with more time](#what-id-do-with-more-time).

## Auth

Stateless JWTs (Passport strategy), passwords hashed with bcrypt.

- Reads are public anyone can browse the catalogue.
- Orders need a valid JWT, and a user only sees their own orders.
- Product writes need an admin. The JWT strategy re-reads `isAdmin` from the DB,
  so it stays authoritative even with a stale token.

There's no self-service admin endpoint on purpose that would be a privilege
escalation. Promote a user in the database when you need one.

## API reference

Base URL `/api`. JSON in and out.

| Method | Path             | Auth  | Notes                                                      |
| ------ | ---------------- | ----- | ---------------------------------------------------------- |
| GET    | `/health`        |       | Liveness check                                             |
| POST   | `/auth/register` |       | `{ email, password }` → `{ accessToken, user }`            |
| POST   | `/auth/login`    |       | `{ email, password }` → `{ accessToken, user }`            |
| GET    | `/products`      |       | `?category=&page=&limit=` → `{ data, total, page, limit }` |
| GET    | `/products/:id`  |       | `404` if missing                                           |
| POST   | `/products`      | admin | `{ name, sku, price, stockQuantity, category }`            |
| PUT    | `/products/:id`  | admin | Partial update                                             |
| DELETE | `/products/:id`  | admin | `204`                                                      |
| POST   | `/orders`        | user  | `{ items: [{ productId, quantity }] }`                     |
| GET    | `/orders`        | user  | Current user's orders with line items and totals           |
| GET    | `/orders/:id`    | user  | `404` if not the user's order                              |

Status codes: `200/201` success, `204` delete, `400` validation, `401`
unauthenticated, `403` forbidden, `404` not found, `409` insufficient stock or
duplicate email.

Errors use Nest's standard shape:

```json
{
  "message": "Insufficient stock for \"Widget\": requested 99, available 3",
  "error": "Conflict",
  "statusCode": 409
}
```

### Example flow

```bash
B=http://localhost:3000/api

TOKEN=$(curl -s -X POST $B/auth/register -H 'Content-Type: application/json' \
  -d '{"email":"shop@example.com","password":"password123"}' | jq -r .accessToken)

PID=$(curl -s -X POST $B/products -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Widget","sku":"W-1","price":9.99,"stockQuantity":5,"category":"tools"}' | jq -r .id)

curl -s -X POST $B/orders -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d "{\"items\":[{\"productId\":\"$PID\",\"quantity\":2}]}"
```

## Configuration

Environment variables (see `.env.example`; Compose ships defaults):

| Variable                      | Default              | Purpose                         |
| ----------------------------- | -------------------- | ------------------------------- |
| `PORT`                        | `3000`               | API port                        |
| `DB_HOST` / `DB_PORT`         | `localhost` / `5432` | Postgres connection             |
| `DB_USERNAME` / `DB_PASSWORD` | `postgres`           | Postgres credentials            |
| `DB_NAME`                     | `inventory`          | Database name                   |
| `JWT_SECRET`                  | dev fallback         | Token signing secret            |
| `JWT_EXPIRES_IN`              | `1h`                 | Access-token lifetime           |
| `NODE_ENV`                    | `development`        | Turns `synchronize` off in prod |

Also in the repo: a multi-stage `Dockerfile`, `docker-compose.yml`, Kubernetes
manifests under `k8s/`, and a GitHub Actions workflow under `.github/`.

## What I'd do with more time

In rough priority order:

1. **A database-backed concurrency test.** The order logic is unit-tested with
   mocks. The next step is an integration test that starts Postgres, fires N
   concurrent real orders at the last unit, and asserts exactly one succeeds
   proving the row lock end to end rather than just the application logic.
2. **Migrations.** Replace `synchronize` (dev only) with versioned TypeORM
   migrations for safe schema changes in production.
3. **Hardening.** A global exception filter for one consistent error shape,
   structured logging with request IDs, statement and lock timeouts, rate
   limiting on auth, and a `CHECK (stockQuantity >= 0)` constraint as a backstop.
