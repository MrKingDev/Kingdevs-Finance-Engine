FROM node:22-bookworm-slim AS builder
WORKDIR /app
RUN npm install --global pnpm@12.8.1
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend/package.json ./frontend/package.json
RUN pnpm install --frozen-lockfile
COPY frontend ./frontend
ARG NEXT_PUBLIC_DEMO_MODE=false
ENV NEXT_PUBLIC_DEMO_MODE=$NEXT_PUBLIC_DEMO_MODE
ENV NEXT_TELEMETRY_DISABLED=1 NEXT_PUBLIC_API_URL=/api DOCKER_BACKEND_URL=http://backend:8000
RUN pnpm --dir frontend build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3001 HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/frontend/.next/standalone ./
COPY --from=builder --chown=node:node /app/frontend/.next/static ./frontend/.next/static
COPY --from=builder --chown=node:node /app/frontend/public ./frontend/public
USER node
EXPOSE 3001
CMD ["node", "frontend/server.js"]
