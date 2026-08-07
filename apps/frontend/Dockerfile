FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY packages/eslint-config/package.json packages/eslint-config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN pnpm install --frozen-lockfile=false
COPY apps/frontend apps/frontend
COPY packages/eslint-config packages/eslint-config
COPY packages/contracts packages/contracts
RUN pnpm --filter @marketplace/contracts build
WORKDIR /app/apps/frontend
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm install
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]
