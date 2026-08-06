FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/backend/package.json apps/backend/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile=false
COPY apps/backend apps/backend
COPY packages/eslint-config packages/eslint-config
COPY packages/contracts packages/contracts
RUN pnpm --filter @marketplace/contracts build
WORKDIR /app/apps/backend
RUN pnpm prisma:generate && pnpm build
EXPOSE 3001
CMD ["sh", "-c", "pnpm prisma migrate deploy && node dist/main.js"]
