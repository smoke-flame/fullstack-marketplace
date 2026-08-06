# Marketplace

NestJS backend + Next.js frontend monorepo. The backend is structured by modules; the frontend uses a feature-oriented `src` layout (`features`, `entities`, `widgets`, `shared`) with shadcn UI primitives in `shared/ui`.

## Start

1. Install Node 22 LTS and enable pnpm with `corepack enable`.
2. Copy `.env.example` to `.env`, and each app's `.env.example` to `.env`.
3. Run `pnpm install`.
4. Run `pnpm db:generate` then `pnpm dev`, or `docker compose up --build`.

Services: frontend `:3000`, backend `:3001`, PostgreSQL `:5432`, Redis `:6379`, RabbitMQ `:5672` (management `:15672`).

The backend validates all required environment variables before Nest starts and prints each missing/invalid key in a readable error. Docker Compose also rejects missing infrastructure variables.

## Foundations

- One shared ESLint 9 flat config for both apps.
- `@marketplace/contracts` holds Zod schemas and derived TypeScript types shared by frontend and backend.
- Prisma PostgreSQL user model supports multiple roles, so a buyer can also be a seller.
- JWT issuer, Redis/RabbitMQ connection foundations, and a compensating custom saga orchestrator are ready for feature modules.

## Gateway

The backend HTTP app is the only entry point. It adds an `x-correlation-id`, validates JWTs, applies Redis-backed rate limiting, and returns safe gateway errors. Mark routes without authentication using `@Public()` and assign their limit policy with `@RateLimitGroup('auth' | 'catalog')`. Authenticated requests are limited by user ID; public requests by client IP. Configure limits and the default internal-call timeout in `apps/backend/.env`. Internal clients must use their service's `execute()` method so unavailable dependencies and calls exceeding `INTERNAL_CALL_TIMEOUT_MS` become a safe `503 service_unavailable` response.

Every HTTP failure has the shared shape `{ code, message, details?, correlationId }`, with uppercase codes such as `UNAUTHORIZED` and `SERVICE_UNAVAILABLE`. The gateway's complete code list is exported from `@marketplace/contracts` as `gatewayErrorCodes`; consumers must branch on `code`, never on `message`. Each future domain module should add its own error-code list beside its shared contract.

All application-owned IDs use UUID v4. Prisma generates entity IDs with `uuid()`, and the shared `uuidV4Schema` validates IDs at service boundaries. Invalid incoming correlation IDs are replaced with a generated UUID v4.

## Contracts and events

`@marketplace/contracts` is frontend-safe and split by purpose: `common`, `models`, `api`, and `errors`. Import only the subpath you need, for example `@marketplace/contracts/models/user` or `@marketplace/contracts/api/auth/register`. RabbitMQ schemas live separately in backend-only `@marketplace/events`, organised by event domain (`auth`, `orders`, and so on); the shared event envelope is at `@marketplace/events/common/event-envelope`.
