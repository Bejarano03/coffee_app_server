# syntax=docker/dockerfile:1.6

FROM public.ecr.aws/lambda/nodejs:22 AS base

FROM base AS builder
WORKDIR /var/task

COPY package*.json ./
RUN npm ci

COPY nest-cli.json tsconfig*.json ./
COPY prisma ./prisma
COPY generated ./generated
COPY src ./src

ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV DATABASE_URL=${DATABASE_URL}

RUN npx prisma generate
RUN npm run build
RUN npm prune --omit=dev

FROM base AS runner
WORKDIR /var/task

COPY --from=builder /var/task/node_modules ./node_modules
COPY --from=builder /var/task/dist ./dist
COPY --from=builder /var/task/package*.json ./
COPY --from=builder /var/task/prisma ./prisma
COPY --from=builder /var/task/generated ./generated

ENV NODE_ENV=production

CMD ["dist/lambda.handler"]
