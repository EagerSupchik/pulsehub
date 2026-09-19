FROM node:22.13-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM dependencies AS build
WORKDIR /app
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build \
    BETTER_AUTH_URL=http://localhost:3000 \
    BETTER_AUTH_SECRET=build-only-secret-not-used-at-runtime-32chars
RUN npm run build

FROM node:22.13-alpine AS production
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 pulsehub
COPY --from=build --chown=pulsehub:nodejs /app/package.json /app/package-lock.json /app/.npmrc ./
COPY --from=build --chown=pulsehub:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=pulsehub:nodejs /app/.next ./.next
COPY --from=build --chown=pulsehub:nodejs /app/public ./public
COPY --from=build --chown=pulsehub:nodejs /app/drizzle ./drizzle
COPY --from=build --chown=pulsehub:nodejs /app/db ./db
COPY --from=build --chown=pulsehub:nodejs /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=build --chown=pulsehub:nodejs /app/scripts ./scripts
USER pulsehub
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate:production && npm run start"]
